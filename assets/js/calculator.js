/* Metric calculator: baseline, creation and enhancement steps for each ecosystem, plus results. */
(function (root) {
  'use strict';
  var E = root.SGBAEngine, UI = root.UI, esc = UI.esc, fmt = UI.fmt;

  var ECO_SHORT = { terrestrial: 'Terrestrial', freshwater: 'Freshwater', marine: 'Marine' };
  var ECO_KEY_SHORT = { terrestrial: 't', freshwater: 'f', marine: 'm' };
  var seq = 0;
  function newId() { return 'r' + (++seq).toString(36) + Date.now().toString(36).slice(-3); }

  function emptyEcosystems() {
    return {
      terrestrial: { baseline: [], creation: [], enhancement: {} },
      freshwater: { baseline: [], creation: [], enhancement: {} },
      marine: { baseline: [], creation: [], enhancement: {} }
    };
  }

  var state = {
    project: { name: '', stage: '', assessor: '', reviewer: '', date: '' },
    ecosystems: emptyEcosystems(),
    settings: { enhancementFormula: 'excel' },
    active: 'terrestrial'
  };
  var result = null;
  var enhSignature = '';

  function eco() { return state.ecosystems[state.active]; }
  function findRow(list, id) { return eco()[list].filter(function (r) { return r.id === id; })[0]; }

  /* ---------------- rendering ---------------- */
  function renderSwitch() {
    var el = document.getElementById('ecoSwitch');
    el.innerHTML = E.ECOSYSTEMS.map(function (e) {
      var m = state.ecosystems[e.key];
      var n = m.baseline.length + m.creation.length;
      return '<button type="button" data-eco="' + e.key + '" aria-pressed="' + (state.active === e.key) + '">' +
        ECO_SHORT[e.key] + (n ? ' <span class="badge">' + n + '</span>' : '') + '</button>';
    }).join('');
  }

  function stepHead(n, title, text) {
    return '<div class="step-head"><div class="step-num">' + n + '</div><div><h3>' + title + '</h3><p>' + text + '</p></div></div>';
  }

  function renderPanel() {
    var html = '';
    html += '<section class="step">' + stepHead(1, 'Baseline habitats',
      'Every habitat parcel inside the site boundary before development. Split each parcel\'s area into what is <b>retained</b>, <b>enhanced</b> and (by difference) <b>lost</b>.') +
      '<div class="table-wrap"><table class="parcels" data-list="baseline"><thead><tr>' +
      '<th class="col-ref">Ref</th><th class="col-hab">Habitat type</th><th class="col-area num">Area (ha)</th><th class="col-cond">Condition</th>' +
      '<th class="num">Units</th><th class="col-area num">Retained (ha)</th><th class="col-area num">Enhanced (ha)</th><th class="num">Lost</th><th class="col-act"><span class="sr-only">Remove</span></th>' +
      '</tr></thead><tbody>' + eco().baseline.map(baselineRowHtml).join('') + '</tbody><tfoot data-out="baseline-foot"></tfoot></table>' +
      (eco().baseline.length ? '' : '<div class="empty">No baseline parcels yet.</div>') + '</div>' +
      '<div class="toolbar" style="margin-top:8px"><button class="btn small" type="button" data-add="baseline">+ Add baseline parcel</button></div></section>';

    html += '<section class="step">' + stepHead(2, 'Habitat creation',
      'New habitats in the post-development scenario, including buildings and hardstanding. Units = area × distinctiveness × target condition × difficulty multiplier.') +
      '<div class="table-wrap"><table class="parcels" data-list="creation"><thead><tr>' +
      '<th class="col-ref">Ref</th><th class="col-hab">Proposed habitat</th><th class="col-area num">Area (ha)</th><th class="col-cond">Target condition</th>' +
      '<th>Time to target</th><th>Difficulty</th><th class="num">Units</th><th class="col-act"><span class="sr-only">Remove</span></th>' +
      '</tr></thead><tbody>' + eco().creation.map(creationRowHtml).join('') + '</tbody><tfoot data-out="creation-foot"></tfoot></table>' +
      (eco().creation.length ? '' : '<div class="empty">No created habitats yet.</div>') + '</div>' +
      '<div class="toolbar" style="margin-top:8px"><button class="btn small" type="button" data-add="creation">+ Add created habitat</button></div></section>';

    html += '<section class="step">' + stepHead(3, 'Habitat enhancement',
      'Baseline parcels with an <b>enhanced</b> area appear here. Choose what each becomes. Only changes the metric\'s time-to-target table allows are listed.') +
      '<div data-out="enhancement"></div></section>';

    document.getElementById('ecoPanel').innerHTML = html;
    enhSignature = '';
    refresh();
  }

  function numInput(list, row, key, label) {
    return '<input type="number" inputmode="decimal" min="0" step="0.0001" data-list="' + list + '" data-row="' + row.id + '" data-k="' + key + '" value="' + esc(row[key] === 0 && key !== 'area' ? '' : row[key]) + '" aria-label="' + label + '" placeholder="0">';
  }

  function baselineRowHtml(r) {
    var h = E.habitat(r.habitat);
    return '<tr data-row="' + r.id + '">' +
      '<td class="col-ref" data-label="Ref"><input data-list="baseline" data-row="' + r.id + '" data-k="ref" value="' + esc(r.ref) + '" aria-label="Reference"></td>' +
      '<td class="col-hab" data-label="Habitat type"><select data-list="baseline" data-row="' + r.id + '" data-k="habitat" aria-label="Habitat type">' + UI.habitatOptions(state.active, r.habitat) + '</select><div data-out="meta"></div></td>' +
      '<td class="col-area num" data-label="Area (ha)">' + numInput('baseline', r, 'area', 'Area in hectares') + '</td>' +
      '<td class="col-cond" data-label="Condition"><select data-list="baseline" data-row="' + r.id + '" data-k="condition" aria-label="Condition"' + (h && !E.needsCondition(h) ? ' disabled' : '') + '>' + UI.conditionOptions(r.condition, h && !E.needsCondition(h)) + '</select><div data-out="assess"></div></td>' +
      '<td class="num" data-label="Units" data-out="units"></td>' +
      '<td class="col-area num" data-label="Retained (ha)">' + numInput('baseline', r, 'retained', 'Area retained in hectares') + '</td>' +
      '<td class="col-area num" data-label="Enhanced (ha)">' + numInput('baseline', r, 'enhanced', 'Area enhanced in hectares') + '</td>' +
      '<td class="num" data-label="Lost" data-out="lost"></td>' +
      '<td class="col-act" data-label=""><button class="btn ghost small danger" type="button" data-remove="baseline" data-row="' + r.id + '" aria-label="Remove parcel">✕</button></td>' +
      '</tr>';
  }

  function creationRowHtml(r) {
    var h = E.habitat(r.habitat);
    return '<tr data-row="' + r.id + '">' +
      '<td class="col-ref" data-label="Ref"><input data-list="creation" data-row="' + r.id + '" data-k="ref" value="' + esc(r.ref) + '" aria-label="Reference"></td>' +
      '<td class="col-hab" data-label="Proposed habitat"><select data-list="creation" data-row="' + r.id + '" data-k="habitat" aria-label="Proposed habitat">' + UI.habitatOptions(state.active, r.habitat) + '</select><div data-out="meta"></div></td>' +
      '<td class="col-area num" data-label="Area (ha)">' + numInput('creation', r, 'area', 'Area in hectares') + '</td>' +
      '<td class="col-cond" data-label="Target condition"><select data-list="creation" data-row="' + r.id + '" data-k="condition" aria-label="Target condition"' + (h && !E.needsCondition(h) ? ' disabled' : '') + '>' + UI.conditionOptions(r.condition, h && !E.needsCondition(h)) + '</select></td>' +
      '<td data-label="Time to target" data-out="years"></td>' +
      '<td data-label="Difficulty" data-out="difficulty"></td>' +
      '<td class="num" data-label="Units" data-out="units"></td>' +
      '<td class="col-act" data-label=""><button class="btn ghost small danger" type="button" data-remove="creation" data-row="' + r.id + '" aria-label="Remove habitat">✕</button></td>' +
      '</tr>';
  }

  function unitsCell(v) {
    return '<span class="out' + (v ? '' : ' zero') + '">' + fmt(v) + '</span>';
  }

  function setOut(tr, key, html) {
    var el = tr.querySelector('[data-out="' + key + '"]');
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  function syncConditionSelect(tr, list, row, h) {
    var sel = tr.querySelector('select[data-k="condition"]');
    if (!sel) return;
    var noValue = h && !E.needsCondition(h);
    if (noValue !== sel.disabled) {
      sel.disabled = noValue;
      sel.innerHTML = UI.conditionOptions(row.condition, noValue);
    }
  }

  function refreshTables(R) {
    var panel = document.getElementById('ecoPanel');
    R.rows.baseline.forEach(function (b) {
      var tr = panel.querySelector('table[data-list="baseline"] tr[data-row="' + b.input.id + '"]');
      if (!tr) return;
      var o = b.out, h = o.habitat;
      syncConditionSelect(tr, 'baseline', b.input, h);
      setOut(tr, 'meta', h ? '<span class="sub">' + UI.chip(h.category) + ' ×' + o.distinctiveness + (o.condition ? ' · condition ×' + o.condition : '') +
        (o.trading ? ' · <span title="Compensation requirement if lost">' + esc(o.trading) + '</span>' : '') + '</span>' + UI.issuesHtml(o.issues) : UI.issuesHtml(o.issues));
      setOut(tr, 'assess', h && E.conditionSheet(h.name) && h.eco !== 'marine' ? '<button type="button" class="assess-link" data-assess="baseline" data-row="' + b.input.id + '">Assess condition</button>' : '');
      setOut(tr, 'units', unitsCell(o.units));
      setOut(tr, 'lost', o.areaError ? '<span class="lvl-error">Error in areas</span>' : fmt(o.lostArea, 4) + ' ha<span class="sub">' + fmt(o.lostUnits) + ' units</span>');
    });
    var bf = panel.querySelector('[data-out="baseline-foot"]');
    if (bf) bf.innerHTML = R.rows.baseline.length ? '<tr><td></td><td>Total</td><td class="num">' + fmt(R.baselineArea, 4) + '</td><td></td><td class="num">' + fmt(R.baseline) + '</td>' +
      '<td class="num">' + fmt(sum(R.rows.baseline, function (b) { return +b.input.retained || 0; }), 4) + '</td>' +
      '<td class="num">' + fmt(sum(R.rows.baseline, function (b) { return +b.input.enhanced || 0; }), 4) + '</td>' +
      '<td class="num">' + fmt(R.lostArea, 4) + ' ha<span class="sub">' + fmt(R.lost) + ' units</span></td><td></td></tr>' : '';

    R.rows.creation.forEach(function (c) {
      var tr = panel.querySelector('table[data-list="creation"] tr[data-row="' + c.input.id + '"]');
      if (!tr) return;
      var o = c.out, h = o.habitat;
      syncConditionSelect(tr, 'creation', c.input, h);
      setOut(tr, 'meta', h ? '<span class="sub">' + UI.chip(h.category) + ' ×' + o.distinctiveness + '</span>' + UI.issuesHtml(o.issues) : UI.issuesHtml(o.issues));
      setOut(tr, 'years', h ? (E.needsCondition(h) ? UI.years(o.years) : 'n/a') : '–');
      setOut(tr, 'difficulty', h ? (typeof o.multiplier === 'number' ? esc(o.difficulty) + ' <span class="muted">×' + o.multiplier + '</span>' : esc(o.multiplier)) : '–');
      setOut(tr, 'units', unitsCell(o.units));
    });
    var cf = panel.querySelector('[data-out="creation-foot"]');
    if (cf) cf.innerHTML = R.rows.creation.length ? '<tr><td></td><td>Total</td><td class="num">' + fmt(R.createdArea, 4) + '</td><td></td><td></td><td></td><td class="num">' + fmt(R.created) + '</td><td></td></tr>' : '';

    // Enhancement section: rebuild only when the set of enhanced parcels changes
    var sig = R.rows.enhancement.map(function (e) { return [e.input.id, e.input.ref, e.input.habitat, e.input.condition].join('/'); }).join('|');
    var box = panel.querySelector('[data-out="enhancement"]');
    if (sig !== enhSignature) {
      enhSignature = sig;
      box.innerHTML = enhancementTableHtml(R);
    }
    R.rows.enhancement.forEach(function (e) {
      var tr = box.querySelector('tr[data-row="' + e.input.id + '"]');
      if (!tr) return;
      var o = e.out;
      setOut(tr, 'area', fmt(o.area, 4));
      setOut(tr, 'status', (o.status ? '<span class="sub" style="margin:0">' + esc(o.status) + '</span>' : '') + UI.issuesHtml(o.issues));
      setOut(tr, 'years', o.to ? UI.years(o.years) : '–');
      setOut(tr, 'difficulty', o.to && typeof o.multiplier === 'number' ? esc(o.difficulty) + ' <span class="muted">×' + o.multiplier + '</span>' : '–');
      setOut(tr, 'units', unitsCell(o.units));
    });
    var ef = box.querySelector('[data-out="enh-foot"]');
    if (ef) ef.innerHTML = '<tr><td></td><td>Total</td><td class="num">' + fmt(sum(R.rows.enhancement, function (e) { return e.out.area; }), 4) + '</td><td></td><td></td><td></td><td class="num">' + fmt(R.enhancement) + '</td></tr>';
  }

  function enhancementTableHtml(R) {
    if (!R.rows.enhancement.length) {
      return '<div class="table-wrap"><div class="empty">Enter an <b>Enhanced (ha)</b> area on a baseline parcel to plan its enhancement.</div></div>';
    }
    return '<div class="table-wrap"><table class="parcels" data-list="enhancement"><thead><tr>' +
      '<th class="col-ref">Ref</th><th>Baseline parcel</th><th class="num">Area (ha)</th><th class="col-hab">Proposed habitat &amp; target condition</th>' +
      '<th>Time to target</th><th>Difficulty</th><th class="num">Units</th></tr></thead><tbody>' +
      R.rows.enhancement.map(function (e) {
        var b = e.input, o = e.out;
        var opts = E.enhancementOptions(b.habitat, b.condition);
        var cur = e.enh.target ? e.enh.target + '|' + e.enh.condition : '';
        var known = opts.some(function (x) { return x.habitat + '|' + x.condition === cur; });
        var select = '<select data-list="enhancement" data-row="' + b.id + '" data-k="target" aria-label="Proposed habitat and target condition">' +
          '<option value="">' + (opts.length ? 'Choose an enhancement…' : 'No enhancement pathway available') + '</option>' +
          (cur && !known ? '<option value="' + esc(cur) + '" selected>' + esc(E.habitat(e.enh.target) ? E.habitat(e.enh.target).name : e.enh.target) + ' – ' + esc(e.enh.condition) + ' (not possible)</option>' : '') +
          opts.map(function (x) {
            var h = E.habitat(x.habitat), v = x.habitat + '|' + x.condition;
            return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(h.name) + ' – ' + x.condition + ' (' + UI.years(x.years) + ')</option>';
          }).join('') + '</select>';
        return '<tr data-row="' + b.id + '">' +
          '<td class="col-ref" data-label="Ref">' + esc(b.ref || '–') + '</td>' +
          '<td data-label="Baseline parcel">' + esc(o.from ? o.from.name : '') + '<span class="sub">' + esc(b.condition || 'no condition') + ' · ' + UI.chip(o.from && o.from.category) + '</span></td>' +
          '<td class="num" data-label="Area (ha)" data-out="area"></td>' +
          '<td class="col-hab wide" data-label="Proposed habitat">' + select + '<div data-out="status"></div></td>' +
          '<td data-label="Time to target" data-out="years"></td>' +
          '<td data-label="Difficulty" data-out="difficulty"></td>' +
          '<td class="num" data-label="Units" data-out="units"></td></tr>';
      }).join('') + '</tbody><tfoot data-out="enh-foot"></tfoot></table></div>';
  }

  function sum(arr, f) { return arr.reduce(function (s, x) { return s + f(x); }, 0); }

  /* ---------------- results ---------------- */
  function verdictFor(res) {
    var ecos = E.ECOSYSTEMS.filter(function (e) { return res.ecosystems[e.key].hasData; });
    if (!ecos.length) return { cls: 'neutral', icon: 'ℹ️', title: 'Start by adding baseline habitats', sub: 'Or load one of the examples above.' };
    var losers = ecos.filter(function (e) { return res.ecosystems[e.key].net < -1e-9; });
    if (losers.length) {
      return { cls: 'bad', icon: '▼', title: 'Net loss of biodiversity units', sub: 'In ' + losers.map(function (e) { return ECO_SHORT[e.key].toLowerCase(); }).join(' and ') + ' habitats. Each ecosystem must be balanced on its own.' };
    }
    var gainAll = ecos.every(function (e) { return res.ecosystems[e.key].net > 1e-9 || !res.ecosystems[e.key].baseline; });
    return gainAll ? { cls: 'good', icon: '▲', title: 'Net gain in biodiversity units', sub: 'Every assessed ecosystem gains units.' }
      : { cls: 'good', icon: '●', title: 'No net loss', sub: 'Post-development units match or exceed the baseline.' };
  }

  function renderResults() {
    var res = result;
    var v = verdictFor(res);
    var ecos = E.ECOSYSTEMS.filter(function (e) { return res.ecosystems[e.key].hasData; });
    var c = res.combined;
    var html = '<header><h3>Results</h3><span class="muted" style="font-size:.8rem">Metric 1.1</span></header>';
    html += '<div class="verdict ' + v.cls + '"><span class="icon" aria-hidden="true">' + v.icon + '</span><div>' + esc(v.title) + '<small>' + esc(v.sub) + '</small></div></div>';
    if (ecos.length) {
      html += '<table class="results"><thead><tr><th>Units</th><th>Baseline</th><th>Post-dev</th><th>Change</th></tr></thead><tbody>' +
        ecos.map(function (e) {
          var r = res.ecosystems[e.key];
          var cls = r.net > 1e-9 ? 'up' : r.net < -1e-9 ? 'down' : '';
          return '<tr><td>' + ECO_SHORT[e.key] + '</td><td>' + fmt(r.baseline) + '</td><td>' + fmt(r.post) + '</td><td class="' + cls + '"><b>' + UI.fmtSigned(r.net) + '</b><br><small class="' + cls + '">' + UI.pct(r.pct) + '</small></td></tr>';
        }).join('') +
        (ecos.length > 1 ? '<tr class="total"><td>Combined*</td><td>' + fmt(c.baseline) + '</td><td>' + fmt(c.post) + '</td><td>' + UI.fmtSigned(c.net) + '<br><small>' + UI.pct(c.pct) + '</small></td></tr>' : '') +
        '</tbody></table>' +
        (ecos.length > 1 ? '<p class="muted" style="font-size:.76rem;margin:4px 0 0">*Shown for reference only. Good practice is never to sum or trade units between ecosystems (except unavoidable reclamation).</p>' : '');
      html += '<div style="margin-top:12px">' + root.Charts.grouped(ecos.map(function (e) {
        var r = res.ecosystems[e.key];
        return { label: ECO_SHORT[e.key], short: ECO_SHORT[e.key], baseline: r.baseline, post: r.post };
      })) + '</div>';

      // Targets
      html += '<h4 style="margin:14px 0 6px;font-size:.92rem">Units still needed</h4><ul class="checks">' + ecos.filter(function (e) { return res.ecosystems[e.key].baseline > 0; }).map(function (e) {
        var r = res.ecosystems[e.key];
        var nnl = E.shortfall(r, 0), g10 = E.shortfall(r, 0.1);
        return '<li><span class="pill ' + (nnl ? 'n' : 'y') + '" aria-hidden="true">' + (nnl ? '!' : '✓') + '</span><span><b>' + ECO_SHORT[e.key] + ':</b> ' +
          (nnl ? fmt(nnl) + ' units for no net loss, ' : 'no net loss achieved, ') + (g10 ? fmt(g10) + ' units for a 10% net gain' : '10% net gain achieved') + '</span></li>';
      }).join('') + '</ul>';

      // Error checks (RESULTS rows 29-33)
      html += '<h4 style="margin:14px 0 6px;font-size:.92rem">Error check: baseline habitat lost = habitat created</h4><ul class="checks">' +
        ecos.map(function (e) {
          var r = res.ecosystems[e.key];
          return '<li><span class="pill ' + (r.areaBalanced ? 'y' : 'n') + '">' + (r.areaBalanced ? 'Y' : 'N') + '</span><span><b>' + ECO_SHORT[e.key] + ':</b> lost ' + fmt(r.lostArea, 4) + ' ha, created ' + fmt(r.createdArea, 4) + ' ha' +
            (r.areaBalanced ? '' : ' (difference ' + UI.fmtSigned(r.areaDiff, 4) + ' ha)') + '</span></li>';
        }).join('') + '</ul>' +
        (ecos.some(function (e) { return !res.ecosystems[e.key].areaBalanced; }) ? '<p class="muted" style="font-size:.8rem;margin:6px 0 0">An <b>N</b> usually means a data-entry error, mixed decimal places, or different site boundaries. It is expected for living walls and roof greenery above other habitats, and for reclamation. Justify it in your report.</p>' : '');

      // Trading requirements for lost habitats
      var lost = [];
      ecos.forEach(function (e) {
        res.ecosystems[e.key].rows.baseline.forEach(function (b) {
          if (b.out.lostUnits > 0 && b.out.habitat && E.distinctiveness(b.out.habitat) >= 2) lost.push(b);
        });
      });
      if (lost.length) {
        html += '<details class="more"><summary>Compensation requirements for habitats lost (' + lost.length + ')</summary><ul class="checks" style="margin-top:8px">' +
          lost.map(function (b) {
            return '<li><span aria-hidden="true">' + (b.out.habitat.category === 'Very high' ? '⛔' : '↺') + '</span><span><b>' + esc(b.out.habitat.name) + '</b> (' + fmt(b.out.lostUnits) + ' units lost): ' + esc(b.out.trading) + '</span></li>';
          }).join('') + '</ul></details>';
      }
    }

    html += '<details class="more"><summary>Calculation settings</summary><div style="margin-top:8px;font-size:.86rem">' +
      '<p style="margin-bottom:6px">Enhancement units formula</p>' +
      '<label style="display:flex;gap:8px;margin-bottom:6px"><input type="radio" name="enhFormula" value="excel" style="width:auto;min-height:0"' + (state.settings.enhancementFormula === 'excel' ? ' checked' : '') + '> <span>As in the Metric 1.1 Excel tool: <code>A·Dnew·Cnew − A·Dold·Cold·m + A·Dold·Cold</code></span></label>' +
      '<label style="display:flex;gap:8px"><input type="radio" name="enhFormula" value="corrected" style="width:auto;min-height:0"' + (state.settings.enhancementFormula === 'corrected' ? ' checked' : '') + '> <span>Difficulty multiplier applied to the uplift only: <code>A·Dold·Cold + (A·Dnew·Cnew − A·Dold·Cold)·m</code>. This matches the handbook\'s description that difficult enhancements remove units.</span></label>' +
      '</div></details>';

    html += '<div class="share-row"><button class="btn primary" type="button" id="shareResults"' + (ecos.length ? '' : ' disabled') + '>Export &amp; share</button>' +
      '<button class="btn" type="button" id="csvResults"' + (ecos.length ? '' : ' disabled') + '>CSV</button></div>';
    document.getElementById('resultsCard').innerHTML = html;
  }

  function refresh() {
    result = E.compute(state);
    refreshTables(result.ecosystems[state.active]);
    renderResults();
    renderSwitch();
  }

  /* ---------------- events ---------------- */
  function onField(e) {
    var t = e.target;
    var list = t.getAttribute('data-list'), id = t.getAttribute('data-row'), k = t.getAttribute('data-k');
    if (!list || !id || !k) return;
    if (list === 'enhancement') {
      var parts = t.value ? t.value.split('|') : ['', ''];
      eco().enhancement[id] = { target: parts[0], condition: parts[1] };
      refresh();
      return;
    }
    var row = findRow(list, id);
    if (!row) return;
    row[k] = t.type === 'number' ? (t.value === '' ? 0 : parseFloat(t.value)) : t.value;
    if (k === 'habitat') {
      var h = E.habitat(row.habitat);
      if (h && !E.needsCondition(h)) row.condition = '';
    }
    refresh();
  }

  function addRow(list) {
    var m = eco();
    var prefix = list === 'baseline' ? 'B' : 'C';
    var r = { id: newId(), ref: prefix + (m[list].length + 1), habitat: '', area: 0, condition: '' };
    if (list === 'baseline') { r.retained = 0; r.enhanced = 0; }
    m[list].push(r);
    renderPanel();
    var sel = document.querySelector('#ecoPanel tr[data-row="' + r.id + '"] select[data-k="habitat"]');
    if (sel) sel.focus();
  }

  function removeRow(list, id) {
    var m = eco();
    m[list] = m[list].filter(function (r) { return r.id !== id; });
    if (list === 'baseline') delete m.enhancement[id];
    renderPanel();
  }

  function openAssessment(list, id) {
    var row = findRow(list, id);
    var h = row && E.habitat(row.habitat);
    if (!h) return;
    document.getElementById('condDlgTitle').textContent = 'Assess condition · ' + (row.ref ? row.ref + ' · ' : '') + h.name;
    var body = document.getElementById('condDialogBody');
    UI.openDialog('condDialog');
    new root.ConditionAssessor(body, h.eco, {
      habitat: h.name,
      lockHabitat: true,
      idPrefix: 'dlg',
      answers: row.conditionAnswers,
      onChange: function (a) { row.conditionAnswers = a.answers.slice(); },
      onApply: function (cond) {
        row.condition = cond;
        UI.closeDialog('condDialog');
        renderPanel();
        UI.toast('Condition set to ' + cond);
      }
    });
  }

  function bind() {
    var panel = document.getElementById('ecoPanel');
    panel.addEventListener('input', function (e) { if (e.target.type === 'number' || e.target.tagName === 'INPUT') onField(e); });
    panel.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') onField(e); });
    panel.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]');
      if (add) return addRow(add.getAttribute('data-add'));
      var rm = e.target.closest('[data-remove]');
      if (rm) return removeRow(rm.getAttribute('data-remove'), rm.getAttribute('data-row'));
      var as = e.target.closest('[data-assess]');
      if (as) return openAssessment(as.getAttribute('data-assess'), as.getAttribute('data-row'));
    });
    document.getElementById('ecoSwitch').addEventListener('click', function (e) {
      var b = e.target.closest('[data-eco]');
      if (!b) return;
      state.active = b.getAttribute('data-eco');
      renderPanel();
    });
    document.getElementById('resultsCard').addEventListener('change', function (e) {
      if (e.target.name === 'enhFormula') { state.settings.enhancementFormula = e.target.value; refresh(); }
    });
    document.getElementById('resultsCard').addEventListener('click', function (e) {
      if (e.target.id === 'shareResults') share();
      if (e.target.id === 'csvResults') UI.download(new Blob([csv()], { type: 'text/csv' }), fileBase() + '.csv');
    });
    ['name', 'stage', 'assessor', 'reviewer', 'date'].forEach(function (k) {
      var el = document.getElementById('p' + k.charAt(0).toUpperCase() + k.slice(1));
      el.addEventListener('input', function () { state.project[k] = el.value; });
    });
    var ps = document.getElementById('presetSelect');
    ps.innerHTML += root.SGBA_PRESETS.map(function (p) { return '<option value="' + p.key + '">' + esc(p.title) + ' (' + esc(p.source) + ')</option>'; }).join('');
    ps.addEventListener('change', function () {
      if (!ps.value) return;
      loadPreset(ps.value);
      ps.value = '';
    });
    document.getElementById('resetBtn').addEventListener('click', function () {
      if (!confirm('Clear all parcels and project details?')) return;
      load({ project: {}, ecosystems: emptyEcosystems() });
    });
  }

  function syncProjectFields() {
    ['name', 'stage', 'assessor', 'reviewer', 'date'].forEach(function (k) {
      document.getElementById('p' + k.charAt(0).toUpperCase() + k.slice(1)).value = state.project[k] || '';
    });
  }

  function load(s) {
    var keepDate = state.project.date;
    state.project = Object.assign({ name: '', stage: '', assessor: '', reviewer: '', date: '' }, s.project || {});
    if (!state.project.date) state.project.date = keepDate || '';
    state.ecosystems = JSON.parse(JSON.stringify(s.ecosystems || emptyEcosystems()));
    E.ECOSYSTEMS.forEach(function (e) {
      var m = state.ecosystems[e.key] = state.ecosystems[e.key] || {};
      m.baseline = m.baseline || []; m.creation = m.creation || []; m.enhancement = m.enhancement || {};
    });
    if (s.settings) state.settings = Object.assign({}, state.settings, s.settings);
    state.active = s.active || E.ECOSYSTEMS.filter(function (e) {
      var m = state.ecosystems[e.key]; return m.baseline.length || m.creation.length;
    }).map(function (e) { return e.key; })[0] || 'terrestrial';
    syncProjectFields();
    renderPanel();
  }

  function loadPreset(key) {
    var p = root.SGBA_PRESETS.filter(function (x) { return x.key === key; })[0];
    if (!p) return;
    load({ project: p.project, ecosystems: p.ecosystems });
    UI.toast('Loaded example: ' + p.title);
    if (root.App) root.App.show('calculator');
  }

  /* ---------------- share / export ---------------- */
  function fileBase() {
    return 'sg-ba-metric' + (state.project.name ? '-' + UI.slug(state.project.name) : '');
  }

  function packState() {
    var e = {};
    E.ECOSYSTEMS.forEach(function (x) {
      var m = state.ecosystems[x.key];
      if (!m.baseline.length && !m.creation.length) return;
      var name = function (id) { var h = E.habitat(id); return h ? h.name : ''; };
      e[ECO_KEY_SHORT[x.key]] = {
        b: m.baseline.map(function (r) {
          var en = m.enhancement[r.id];
          return [r.ref, name(r.habitat), +r.area || 0, r.condition || '', +r.retained || 0, +r.enhanced || 0].concat(en && en.target ? [name(en.target), en.condition] : []);
        }),
        c: m.creation.map(function (r) { return [r.ref, name(r.habitat), +r.area || 0, r.condition || '']; })
      };
    });
    return { v: 1, p: state.project, e: e, f: state.settings.enhancementFormula === 'corrected' ? 1 : 0 };
  }

  function unpackState(o) {
    if (!o || o.v !== 1) return null;
    var ecos = emptyEcosystems();
    E.ECOSYSTEMS.forEach(function (x) {
      var src = (o.e || {})[ECO_KEY_SHORT[x.key]];
      if (!src) return;
      var id = function (n) { return n ? x.key + ':' + n : ''; };
      (src.b || []).forEach(function (a) {
        var r = { id: newId(), ref: a[0], habitat: id(a[1]), area: a[2], condition: a[3], retained: a[4], enhanced: a[5] };
        ecos[x.key].baseline.push(r);
        if (a[6]) ecos[x.key].enhancement[r.id] = { target: id(a[6]), condition: a[7] };
      });
      (src.c || []).forEach(function (a) {
        ecos[x.key].creation.push({ id: newId(), ref: a[0], habitat: id(a[1]), area: a[2], condition: a[3] });
      });
    });
    return { project: o.p || {}, ecosystems: ecos, settings: { enhancementFormula: o.f ? 'corrected' : 'excel' } };
  }

  function summaryText() {
    var parts = E.ECOSYSTEMS.filter(function (e) { return result.ecosystems[e.key].hasData && result.ecosystems[e.key].baseline > 0; }).map(function (e) {
      var r = result.ecosystems[e.key];
      return ECO_SHORT[e.key] + ' ' + UI.pct(r.pct);
    });
    var name = state.project.name ? state.project.name + ': ' : '';
    return name + 'biodiversity net change ' + (parts.length ? parts.join(', ') : UI.fmtSigned(result.combined.net) + ' units') +
      ', calculated with the Singapore Biodiversity Accounting Metric 1.1. #biodiversity #netgain #Singapore';
  }

  function shareCard(format) {
    var v = verdictFor(result);
    var ecos = E.ECOSYSTEMS.filter(function (e) { return result.ecosystems[e.key].hasData; });
    var c = result.combined;
    var heroColor = v.cls === 'bad' ? '#a32424' : v.cls === 'good' ? '#006300' : '#4a5244';
    var hero = ecos.length === 1 ? result.ecosystems[ecos[0].key] : c;
    var maxU = Math.max.apply(null, ecos.map(function (e) { var r = result.ecosystems[e.key]; return Math.max(r.baseline, r.post); }).concat([1e-9]));
    var rows = ecos.map(function (e) {
      var r = result.ecosystems[e.key];
      var col = r.net > 1e-9 ? '#006300' : r.net < -1e-9 ? '#a32424' : '#12160f';
      var change = r.pct === null ? UI.fmtSigned(r.net, 1) + '<span style="font-size:15px"> units</span>' : UI.pct(r.pct);
      return '<div class="sc-row"><div class="eco">' + ECO_SHORT[e.key] + '</div>' +
        '<div class="v"><small>Baseline</small>' + fmt(r.baseline, 1) + '</div>' +
        '<div class="v"><small>Post-dev</small>' + fmt(r.post, 1) + '</div>' +
        '<div class="v" style="color:' + col + '"><small>Change</small>' + change + '</div>' +
        '<div class="sc-bars"><div style="width:' + (r.baseline / maxU * 100) + '%;background:#2a78d6"></div><div style="width:' + (r.post / maxU * 100) + '%;background:#eb6834"></div></div></div>';
    }).join('');
    var date = state.project.date ? new Date(state.project.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
    return '<div class="sc-top"><div><div class="sc-kicker">Biodiversity accounting result</div>' +
      '<div class="sc-title">' + esc(state.project.name || 'Biodiversity net change assessment') + '</div>' +
      '<div class="sc-sub">' + esc([state.project.stage, date].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div class="sc-hero"><div class="big" style="color:' + heroColor + '">' + (hero.pct === null ? UI.fmtSigned(hero.net, 1) : UI.pct(hero.pct)) + '</div>' +
      '<div class="lbl">' + esc(v.title) + (ecos.length > 1 ? ' (combined)' : '') + '</div></div></div>' +
      '<div class="sc-body"><div class="sc-rows">' + rows + '<div class="sc-legend"><span><i style="background:#2a78d6"></i>Baseline units</span><span><i style="background:#eb6834"></i>Post-development units</span></div></div></div>' +
      '<div class="sc-foot"><span>Calculated with the <b>Singapore Biodiversity Accounting Metric 1.1</b>' + (state.project.assessor ? ' · Assessor: ' + esc(state.project.assessor) : '') + '</span><span>AECOM &amp; Camphora (2024)</span></div>';
  }

  function share() {
    root.Share.open({
      title: (state.project.name || 'Biodiversity assessment') + ': SG Biodiversity Accounting Metric',
      filename: fileBase(),
      allowInputs: true,
      text: summaryText(),
      link: function (includeInputs) {
        return root.Share.baseUrl() + '#view=calculator' + (includeInputs ? '&s=' + root.Share.encode(packState()) : '');
      },
      card: shareCard,
      csv: csv
    });
  }

  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function csv() {
    var lines = [];
    var row = function (a) { lines.push(a.map(csvCell).join(',')); };
    row(['SG Biodiversity Accounting Metric 1.1: interactive edition export']);
    row(['Project', state.project.name]); row(['Stage', state.project.stage]); row(['Assessor', state.project.assessor]);
    row(['Reviewer', state.project.reviewer]); row(['Date', state.project.date]);
    row(['Enhancement formula', state.settings.enhancementFormula]);
    row([]);
    row(['RESULTS', 'Baseline units', 'Post-development units', 'Net change', 'Net % change', 'Area lost (ha)', 'Area created (ha)', 'Lost = created?']);
    E.ECOSYSTEMS.forEach(function (e) {
      var r = result.ecosystems[e.key];
      row([ECO_SHORT[e.key], r.baseline.toFixed(4), r.post.toFixed(4), r.net.toFixed(4), r.pct === null ? '' : (r.pct * 100).toFixed(2) + '%', r.lostArea.toFixed(4), r.createdArea.toFixed(4), r.areaBalanced ? 'Y' : 'N']);
    });
    row(['Combined', result.combined.baseline.toFixed(4), result.combined.post.toFixed(4), result.combined.net.toFixed(4), result.combined.pct === null ? '' : (result.combined.pct * 100).toFixed(2) + '%']);
    E.ECOSYSTEMS.forEach(function (e) {
      var r = result.ecosystems[e.key];
      if (!r.hasData) return;
      row([]);
      row([ECO_SHORT[e.key].toUpperCase() + ' BASELINE', 'Habitat', 'Area (ha)', 'Distinctiveness', 'Condition', 'Units', 'Retained (ha)', 'Enhanced (ha)', 'Lost (ha)', 'Units retained', 'Units enhanced', 'Units lost']);
      r.rows.baseline.forEach(function (b) {
        var o = b.out;
        row([b.input.ref, o.habitat ? o.habitat.name : '', b.input.area, o.habitat ? o.habitat.category : '', b.input.condition, o.units.toFixed(4), b.input.retained, b.input.enhanced, o.lostArea.toFixed(4), o.retainedUnits.toFixed(4), o.enhancedUnits.toFixed(4), o.lostUnits.toFixed(4)]);
      });
      row([ECO_SHORT[e.key].toUpperCase() + ' CREATION', 'Habitat', 'Area (ha)', 'Distinctiveness', 'Target condition', 'Time to target', 'Difficulty multiplier', 'Units']);
      r.rows.creation.forEach(function (c) {
        var o = c.out;
        row([c.input.ref, o.habitat ? o.habitat.name : '', c.input.area, o.habitat ? o.habitat.category : '', c.input.condition, o.years, o.multiplier, o.units.toFixed(4)]);
      });
      row([ECO_SHORT[e.key].toUpperCase() + ' ENHANCEMENT', 'Baseline habitat', 'Baseline condition', 'Area (ha)', 'Proposed habitat', 'Target condition', 'Change', 'Time to target', 'Difficulty multiplier', 'Units']);
      r.rows.enhancement.forEach(function (x) {
        var o = x.out;
        row([x.input.ref, o.from ? o.from.name : '', x.input.condition, o.area, o.to ? o.to.name : '', x.enh.condition || '', o.status, o.years, o.multiplier, o.units.toFixed(4)]);
      });
    });
    return lines.join('\n');
  }

  function init(initial) {
    bind();
    if (initial) load(initial); else { syncProjectFields(); renderPanel(); }
  }

  root.Calculator = { init: init, load: load, loadPreset: loadPreset, unpackState: unpackState, state: function () { return state; } };
})(this);
