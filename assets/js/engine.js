/*
 * SG Biodiversity Accounting Metric 1.1 calculation engine.
 *
 * A direct port of the formulas in the published Excel tool:
 *   - Baseline sheets (A1/B1/C1): units = area x distinctiveness x condition
 *   - Creation sheets (A2/B2/C2): units = area x distinctiveness x condition x difficulty multiplier
 *   - Enhancement sheets (A3/B3/C3): see enhancementUnits()
 *   - RESULTS sheet: totals, net change, % change and the area error check
 * Pure functions only, so it runs in the browser and under Node for tests.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./data.js'));
  else root.SGBAEngine = factory(root.SGBA_DATA);
})(this, function (DATA) {
  'use strict';

  var ECOSYSTEMS = [
    { key: 'terrestrial', label: 'Terrestrial', unit: 'Terrestrial units' },
    { key: 'freshwater', label: 'Freshwater', unit: 'Freshwater units' },
    { key: 'marine', label: 'Marine (intertidal & subtidal)', unit: 'Marine units' }
  ];
  var CONDITIONS = ['Good', 'Moderate', 'Poor'];
  var NOT_POSSIBLE = 'Not possible';
  // RESULTS!E30:E32 flag a mismatch when |created area - lost area| > 0.01 ha
  var AREA_TOLERANCE = 0.01;

  var covered = {};
  DATA.enhanceCovered.forEach(function (n) { covered[n] = true; });

  var byId = {};
  DATA.habitats.forEach(function (h) { byId[h.id] = h; });

  function habitat(id) { return byId[id] || null; }

  function habitatsFor(eco) {
    return DATA.habitats.filter(function (h) { return h.eco === eco; });
  }

  function num(v) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  function distinctiveness(h) {
    return h ? DATA.distinctivenessValues[h.category] : 0;
  }

  function conditionScore(c) {
    return DATA.conditionValues[c] || 0;
  }

  // Habitats with "No value" distinctiveness (developed land, bare ground) carry no condition.
  function needsCondition(h) {
    return !!h && distinctiveness(h) > 0;
  }

  function isNumber(v) { return typeof v === 'number' && isFinite(v); }

  /* ---------- Baseline ---------- */
  function baselineRow(row) {
    var h = habitat(row.habitat);
    var area = num(row.area), retained = num(row.retained), enhanced = num(row.enhanced);
    var d = distinctiveness(h), c = conditionScore(row.condition);
    var issues = [];
    if (!h) issues.push({ level: 'info', text: 'Choose a habitat type.' });
    if (h && needsCondition(h) && !c) issues.push({ level: 'warn', text: 'Select a condition, otherwise this parcel scores 0 units.' });
    var areaError = retained + enhanced > area + 1e-9;
    if (areaError) issues.push({ level: 'error', text: 'Errors in areas: retained + enhanced is larger than the parcel area.' });
    var lost = areaError ? 0 : area - retained - enhanced;
    var score = d * c;
    return {
      habitat: h,
      distinctiveness: d,
      condition: c,
      units: area * score,
      retainedUnits: retained * score,
      enhancedUnits: enhanced * score,
      lostArea: lost,
      lostUnits: lost * score,
      areaError: areaError,
      trading: h ? DATA.tradingRules[h.category] || '' : '',
      issues: issues
    };
  }

  /* ---------- Creation ---------- */
  function creationRow(row) {
    var h = habitat(row.habitat);
    var area = num(row.area);
    var d = distinctiveness(h), c = conditionScore(row.condition);
    var issues = [];
    var years = h && row.condition ? h.createYears[row.condition] : '';
    var mult = h ? h.createMultiplier : '';
    var possible = !!h && years !== NOT_POSSIBLE && isNumber(mult);
    if (!h) issues.push({ level: 'info', text: 'Choose a habitat type.' });
    else if (!needsCondition(h)) issues.push({ level: 'info', text: 'No biodiversity value: counted for area balance only.' });
    else if (!c) issues.push({ level: 'warn', text: 'Select a target condition.' });
    else if (!possible) issues.push({ level: 'error', text: 'Creating ' + h.name + ' at ' + row.condition.toLowerCase() + ' condition is not possible, so it delivers 0 units.' });
    var units = possible && needsCondition(h) && c ? area * d * c * mult : 0;
    return {
      habitat: h,
      distinctiveness: d,
      condition: c,
      years: needsCondition(h) ? years : '',
      multiplier: mult,
      difficulty: h ? h.createDifficulty : '',
      possible: possible,
      units: units,
      issues: issues
    };
  }

  /* ---------- Enhancement ---------- */
  function enhancementKey(name, cond) {
    return (name + '/' + cond).toUpperCase();
  }

  function enhancementYears(fromHab, fromCond, toHab, toCond) {
    var row = DATA.enhance[enhancementKey(fromHab.name, fromCond)];
    if (!row) return NOT_POSSIBLE;
    var v = row[enhancementKey(toHab.name, toCond)];
    return v === undefined ? NOT_POSSIBLE : v;
  }

  // Which (habitat, condition) targets the Z8 matrix allows for a baseline parcel.
  function enhancementOptions(fromId, fromCond) {
    var from = habitat(fromId);
    if (!from || !fromCond) return [];
    var out = [];
    habitatsFor(from.eco).forEach(function (h) {
      CONDITIONS.forEach(function (c) {
        var y = enhancementYears(from, fromCond, h, c);
        if (y !== NOT_POSSIBLE) out.push({ habitat: h.id, condition: c, years: y });
      });
    });
    return out;
  }

  /*
   * Excel (A3/B3/C3 column W):  L*N*P - L*F*G*U + L*F*G
   *   L area, N/P proposed distinctiveness/condition, F/G baseline distinctiveness/condition,
   *   U difficulty-of-enhancement multiplier.
   * "corrected" applies the multiplier to the uplift instead, which is what the handbook
   * describes ("removes some units" for difficult habitats):  L*F*G + (L*N*P - L*F*G)*U
   */
  function enhancementUnits(area, fromScore, toScore, mult, formula) {
    var before = area * fromScore, after = area * toScore;
    if (formula === 'corrected') return before + (after - before) * mult;
    return after - before * mult + before;
  }

  function enhancementRow(baseRow, enh, formula) {
    var from = habitat(baseRow.habitat);
    var to = habitat(enh && enh.target);
    var area = num(baseRow.enhanced);
    var F = distinctiveness(from), G = conditionScore(baseRow.condition);
    var N = distinctiveness(to), P = conditionScore(enh && enh.condition);
    var issues = [];
    var status = '';
    var years = '';
    var mult = to ? to.enhanceMultiplier : '';
    var units = 0;

    if (!needsCondition(from) || (to && !needsCondition(to))) {
      // The Excel tool cannot score a "No value" habitat here (its lookup excludes that class) and returns an error.
      issues.push({ level: 'error', text: 'Habitats with no distinctiveness value cannot be enhanced. Record this as habitat lost plus habitat created instead.' });
    } else if (!G) {
      issues.push({ level: 'warn', text: 'Set the baseline condition of this parcel first.' });
    } else if (!to || !P) {
      issues.push({ level: 'warn', text: 'Choose the proposed habitat and target condition. Until then this enhanced area delivers 0 units.' });
    } else {
      // Columns J/K of the enhancement sheets
      if (from.id === to.id && G >= P) status = 'Error - No enhancement';
      else if (from.id === to.id) status = 'Acceptable (condition uplift)';
      else if (F > N) status = 'Trading down - unacceptable change';
      else if (F === N && G === P) status = 'Error - No enhancement';
      else if (F === N && G > P) status = 'Error - Cannot reduce condition';
      else if (F === N) status = 'Error - No enhancement';
      else status = from.category + ' → ' + to.category;
      if (/^Error|unacceptable/.test(status)) issues.push({ level: 'error', text: status + '.' });

      years = enhancementYears(from, baseRow.condition, to, enh.condition);
      var missing = [from, to].filter(function (h) { return !covered[h.name.toUpperCase()]; });
      if (missing.length) {
        years = NOT_POSSIBLE;
        issues.push({ level: 'error', text: missing[0].name + ' is missing from the Metric 1.1 enhancement table (the Excel tool returns #N/A), so this row delivers 0 units. Record it as loss + creation instead.' });
      } else if (years === NOT_POSSIBLE) {
        issues.push({ level: 'error', text: 'This change is not possible according to the time-to-target table, so it delivers 0 units.' });
      } else if (!isNumber(mult)) {
        issues.push({ level: 'error', text: 'No enhancement multiplier exists for ' + to.name + '.' });
      } else {
        units = enhancementUnits(area, F * G, N * P, mult, formula);
      }
    }
    return {
      from: from,
      to: to,
      area: area,
      fromScore: F * G,
      toScore: N * P,
      years: years,
      multiplier: mult,
      difficulty: to ? to.enhanceDifficulty : '',
      status: status,
      units: units,
      issues: issues
    };
  }

  /* ---------- Results ---------- */
  function computeEcosystem(eco, model, formula) {
    var base = (model.baseline || []).map(function (r) { return { input: r, out: baselineRow(r) }; });
    var created = (model.creation || []).map(function (r) { return { input: r, out: creationRow(r) }; });
    var enhanced = base
      .filter(function (b) { return b.out.habitat && num(b.input.enhanced) > 0 && !b.out.areaError; })
      .map(function (b) {
        var e = (model.enhancement || {})[b.input.id] || {};
        return { input: b.input, enh: e, out: enhancementRow(b.input, e, formula) };
      });

    var sum = function (arr, f) { return arr.reduce(function (s, x) { return s + f(x); }, 0); };
    var baselineUnits = sum(base, function (b) { return b.out.units; });
    var retainedUnits = sum(base, function (b) { return b.out.retainedUnits; });
    var lostUnits = sum(base, function (b) { return b.out.lostUnits; });
    var enhancedBaseUnits = sum(base, function (b) { return b.out.enhancedUnits; });
    var createdUnits = sum(created, function (c) { return c.out.units; });
    var enhancementUnitsTotal = sum(enhanced, function (e) { return e.out.units; });
    var post = retainedUnits + createdUnits + enhancementUnitsTotal;

    var baselineArea = sum(base, function (b) { return num(b.input.area); });
    var lostArea = sum(base, function (b) { return b.out.lostArea; });
    var createdArea = sum(created, function (c) { return num(c.input.area); });
    var areaDiff = createdArea - lostArea;
    var hasData = base.length > 0 || created.length > 0;

    return {
      eco: eco,
      rows: { baseline: base, creation: created, enhancement: enhanced },
      baseline: baselineUnits,
      post: post,
      retained: retainedUnits,
      lost: lostUnits,
      enhancedBase: enhancedBaseUnits,
      created: createdUnits,
      enhancement: enhancementUnitsTotal,
      net: post - baselineUnits,
      pct: baselineUnits > 0 ? (post - baselineUnits) / baselineUnits : null,
      baselineArea: baselineArea,
      lostArea: lostArea,
      createdArea: createdArea,
      areaDiff: areaDiff,
      areaBalanced: Math.abs(areaDiff) <= AREA_TOLERANCE,
      hasData: hasData
    };
  }

  function compute(state) {
    var formula = (state.settings && state.settings.enhancementFormula) || 'excel';
    var per = {};
    ECOSYSTEMS.forEach(function (e) {
      per[e.key] = computeEcosystem(e.key, (state.ecosystems || {})[e.key] || {}, formula);
    });
    var keys = ECOSYSTEMS.map(function (e) { return e.key; });
    var total = function (f) { return keys.reduce(function (s, k) { return s + per[k][f]; }, 0); };
    var baseline = total('baseline'), post = total('post'), areaDiff = total('areaDiff');
    return {
      ecosystems: per,
      combined: {
        baseline: baseline,
        post: post,
        net: post - baseline,
        pct: baseline > 0 ? (post - baseline) / baseline : null,
        areaDiff: areaDiff,
        areaBalanced: Math.abs(areaDiff) <= AREA_TOLERANCE
      }
    };
  }

  // Units still needed to reach a target uplift (0 = no net loss, 0.1 = 10% net gain).
  function shortfall(eco, target) {
    if (!eco.baseline) return 0;
    return Math.max(0, eco.baseline * (1 + target) - eco.post);
  }

  /* ---------- Condition assessment (criteria workbooks) ---------- */
  function conditionSheet(habitatName) {
    for (var i = 0; i < DATA.conditionSheets.length; i++) {
      if (DATA.conditionSheets[i].habitat === habitatName) return DATA.conditionSheets[i];
    }
    return null;
  }

  function assessCondition(sheet, answers) {
    var answered = 0, total = 0;
    sheet.criteria.forEach(function (c, i) {
      var p = answers[i];
      if (isNumber(p)) { answered++; total += p; }
    });
    var complete = answered === sheet.criteria.length;
    var result = null;
    if (complete) result = total >= sheet.goodMin ? 'Good' : total <= sheet.poorMax ? 'Poor' : 'Moderate';
    return {
      total: total,
      answered: answered,
      count: sheet.criteria.length,
      min: sheet.criteria.length,
      max: sheet.criteria.length * 3,
      complete: complete,
      result: result
    };
  }

  return {
    DATA: DATA,
    ECOSYSTEMS: ECOSYSTEMS,
    CONDITIONS: CONDITIONS,
    NOT_POSSIBLE: NOT_POSSIBLE,
    habitat: habitat,
    habitatsFor: habitatsFor,
    distinctiveness: distinctiveness,
    conditionScore: conditionScore,
    needsCondition: needsCondition,
    baselineRow: baselineRow,
    creationRow: creationRow,
    enhancementRow: enhancementRow,
    enhancementOptions: enhancementOptions,
    enhancementYears: enhancementYears,
    enhancementUnits: enhancementUnits,
    compute: compute,
    shortfall: shortfall,
    conditionSheet: conditionSheet,
    assessCondition: assessCondition
  };
});
