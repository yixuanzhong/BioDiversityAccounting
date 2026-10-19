// node scripts/excel-parity/compare.js WORKDIR
const path = require('path');
const E = require('../../assets/js/engine.js');
const work = process.argv[2];
const scen = require(path.resolve(work, 'scenarios.json'));
const xl = require(path.resolve(work, 'excel_results.json'));
const close = (a, b) => Math.abs((+a || 0) - (+b || 0)) < 1e-6 * Math.max(1, Math.abs(+a || 0));
let ok = 0, explained = 0, bad = 0;
scen.forEach((s, i) => {
  const r = E.compute({ ecosystems: s, settings: { enhancementFormula: 'excel' } });
  [['terrestrial', 'tb', 'tp', 'te'], ['freshwater', 'fb', 'fp', 'fe'], ['marine', 'mb', 'mp', 'me']].forEach(([k, b, p, e]) => {
    const R = r.ecosystems[k], x = xl[i];
    [['baseline', R.baseline, x[b]], ['post', R.post, x[p]], ['areaCheck', R.areaBalanced ? 'Y' : 'N', x[e]]].forEach(([name, mine, theirs]) => {
      if (typeof mine === 'string' ? mine === theirs : close(mine, theirs)) { ok++; return; }
      // Differences are acceptable only where the workbook itself has a lookup error
      const rows = R.rows.enhancement.map((en) => ({ out: en.out, xl: x.enh[k][s[k].baseline.indexOf(en.input)] }))
        .filter((z) => !close(z.out.units, z.xl && z.xl[2]));
      const missingTable = theirs === '#N/A' && R.rows.enhancement.some((en) => en.out.issues.some((q) => /missing from the Metric 1.1/.test(q.text)));
      const quirk = rows.length && rows.every((z) => z.xl && (z.xl[2] === 'Error' || z.xl[1] !== z.out.multiplier));
      if (missingTable || quirk) explained++; else bad++;
      console.log(`s${i} ${k} ${name}: engine=${mine} excel=${theirs} ${missingTable ? '[Excel #N/A: habitat missing from enhancement table]' : quirk ? '[Excel multiplier lookup error]' : 'UNEXPLAINED'}`);
    });
  });
});
console.log({ ok, explained, unexplained: bad });
process.exit(bad ? 1 : 0);
