// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/js/engine.js');
const presets = (() => { const ctx = {}; require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../assets/js/presets.js', 'utf8'), ctx); return ctx.SGBA_PRESETS; })();

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
const T = (name) => 'terrestrial:' + name;
const F = (name) => 'freshwater:' + name;
const M = (name) => 'marine:' + name;
const scenario = (ecosystems, formula = 'excel') => E.compute({ ecosystems, settings: { enhancementFormula: formula } });

test('lookup tables match Metric 1.1', () => {
  assert.equal(E.DATA.habitats.length, 42);
  assert.deepEqual(E.DATA.distinctivenessValues, { 'Very high': 8, High: 6, Moderate: 4, Low: 2, 'Very low': 1, 'Extremely low': 0.5, 'No value': 0 });
  assert.deepEqual(E.DATA.conditionValues, { Good: 3, Moderate: 2, Poor: 1 });
  assert.equal(E.distinctiveness(E.habitat(T('Turf'))), 0.5);
  assert.equal(E.habitat(M('Lower reef')).createMultiplier, 0.6);
  assert.equal(E.DATA.conditionSheets.length, 30);
});

test('baseline: units, retained, enhanced and lost', () => {
  const r = E.baselineRow({ habitat: T('Native dominated secondary forest'), area: 4, condition: 'Moderate', retained: 1, enhanced: 0.5 });
  close(r.units, 4 * 6 * 2);
  close(r.retainedUnits, 12);
  close(r.enhancedUnits, 6);
  close(r.lostArea, 2.5);
  close(r.lostUnits, 30);
  const bad = E.baselineRow({ habitat: T('Turf'), area: 1, condition: 'Poor', retained: 1, enhanced: 0.5 });
  assert.ok(bad.areaError);
  assert.equal(bad.lostUnits, 0);
});

test('creation: multiplier and "not possible"', () => {
  const r = E.creationRow({ habitat: F('Freshwater marsh'), area: 2, condition: 'Good' });
  close(r.units, 2 * 8 * 3 * 0.67);
  assert.equal(r.years, 5);
  assert.equal(E.creationRow({ habitat: T('Lowland dipterocarp primary forest'), area: 2, condition: 'Poor' }).units, 0);
  assert.equal(E.creationRow({ habitat: M('Coral reef'), area: 1, condition: 'Good' }).units, 0); // Good not achievable
  assert.equal(E.creationRow({ habitat: T('Developed land'), area: 5, condition: '' }).units, 0);
});

test('enhancement: Excel formula and corrected formula', () => {
  const base = { id: 'b', habitat: T('Exotic-dominated secondary forest'), area: 3, condition: 'Good', retained: 0, enhanced: 2 };
  const enh = { target: T('Native dominated secondary forest'), condition: 'Poor' };
  const xl = E.enhancementRow(base, enh, 'excel');
  // L*N*P - L*F*G*U + L*F*G with L=2, N=6, P=1, F=4, G=3, U=0.67
  close(xl.units, 2 * 6 * 1 - 2 * 4 * 3 * 0.67 + 2 * 4 * 3);
  assert.equal(xl.years, 25);
  const fixed = E.enhancementRow(base, enh, 'corrected');
  close(fixed.units, 24 + (12 - 24) * 0.67);
  assert.match(fixed.status, /Moderate → High/);
});

test('enhancement: blocked changes deliver 0 units', () => {
  const base = { id: 'b', habitat: T('Golf course'), area: 1, condition: 'Moderate', enhanced: 1 };
  const r = E.enhancementRow(base, { target: T('Lowland dipterocarp primary forest'), condition: 'Good' }, 'excel');
  assert.equal(r.years, E.NOT_POSSIBLE);
  assert.equal(r.units, 0);
  const river = E.enhancementRow({ id: 'r', habitat: F('Naturalised river'), area: 1, condition: 'Poor', enhanced: 1 }, { target: F('Naturalised river'), condition: 'Good' }, 'excel');
  assert.equal(river.units, 0);
  assert.ok(river.issues.some((i) => /missing from the Metric 1.1 enhancement table/.test(i.text)));
});

test('enhancement options only list allowed transitions', () => {
  const opts = E.enhancementOptions(T('Turf'), 'Poor');
  assert.ok(opts.length > 0);
  assert.ok(opts.every((o) => E.enhancementYears(E.habitat(T('Turf')), 'Poor', E.habitat(o.habitat), o.condition) !== E.NOT_POSSIBLE));
  assert.deepEqual(E.enhancementOptions(T('Lowland dipterocarp primary forest'), 'Good'), []);
});

test('results: ecosystems are kept separate and area check uses 0.01 ha tolerance', () => {
  const r = scenario({
    terrestrial: { baseline: [{ id: 'a', habitat: T('Golf course'), area: 10, condition: 'Moderate', retained: 2, enhanced: 0 }], creation: [{ id: 'c', habitat: T('Developed land'), area: 8.005, condition: '' }], enhancement: {} },
    freshwater: { baseline: [{ id: 'f', habitat: F('Hard bank pond'), area: 1, condition: 'Good', retained: 1, enhanced: 0 }], creation: [], enhancement: {} }
  });
  close(r.ecosystems.terrestrial.baseline, 20);
  close(r.ecosystems.terrestrial.post, 4);
  close(r.ecosystems.terrestrial.pct, -0.8);
  assert.ok(r.ecosystems.terrestrial.areaBalanced);
  close(r.ecosystems.freshwater.net, 0);
  close(r.combined.baseline, 23);
});

test('Case Study 4 (reclamation with seagrass) reproduces the published units', () => {
  const p = presets.find((x) => x.key === 'reclamation');
  const r = E.compute({ ecosystems: p.ecosystems });
  close(r.ecosystems.marine.baseline, 64.208, 1e-3);   // published: 64.21
  close(r.combined.post, 75.4587, 1e-3);               // published: 75.46
  close(r.combined.net, 11.2507, 1e-3);                // published: +11.25
  assert.equal(r.ecosystems.marine.areaBalanced, false); // reclamation → N, as the handbook says
});

test('condition assessment bands match each criteria sheet', () => {
  E.DATA.conditionSheets.forEach((s) => {
    const n = s.criteria.length;
    assert.ok(s.goodMin > s.poorMax, s.sheet);
    const at = (total) => {
      // build answers that sum to `total`
      const a = Array(n).fill(1); let left = total - n;
      for (let i = 0; i < n && left > 0; i++) { const add = Math.min(2, left); a[i] += add; left -= add; }
      return E.assessCondition(s, a).result;
    };
    assert.equal(at(n), 'Poor', s.sheet);
    assert.equal(at(3 * n), 'Good', s.sheet);
    assert.equal(at(s.goodMin), 'Good', s.sheet);
    assert.equal(at(s.poorMax), 'Poor', s.sheet);
    if (s.goodMin - 1 > s.poorMax) assert.equal(at(s.goodMin - 1), 'Moderate', s.sheet);
  });
  const s = E.conditionSheet('Lowland dipterocarp primary forest');
  assert.equal(E.assessCondition(s, [3, 3]).complete, false);
});

test('presets compute without errors', () => {
  presets.forEach((p) => {
    const r = E.compute({ ecosystems: p.ecosystems });
    assert.ok(isFinite(r.combined.baseline) && isFinite(r.combined.post), p.key);
  });
});

// Cases recalculated in the official Metric 1.1 workbook (LibreOffice) by scripts/excel-parity,
// limited to rows that do not hit the workbook's own lookup errors.
test('matches the Metric 1.1 Excel workbook on recalculated scenarios', () => {
  const cases = require('./fixtures/excel-parity.json');
  assert.ok(cases.length >= 50);
  cases.forEach((c) => {
    const r = E.compute({ ecosystems: { [c.eco]: c.input }, settings: { enhancementFormula: 'excel' } }).ecosystems[c.eco];
    close(r.baseline, c.excel.baseline);
    close(r.post, c.excel.post);
    assert.equal(r.areaBalanced ? 'Y' : 'N', c.excel.areaCheck, `scenario ${c.scenario} ${c.eco}`);
  });
});
