/* Habitat guide: the Z1/Z2/Z7/Z8 reference tables as a searchable catalogue. */
(function (root) {
  'use strict';
  var E = root.SGBAEngine, UI = root.UI, esc = UI.esc, D = E.DATA;
  var filter = { eco: 'all', q: '', sort: 'class' };

  function dots(n) {
    var s = '<span class="dots" aria-label="' + n + ' of 3">';
    for (var i = 1; i <= 3; i++) s += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
    return s + '</span>';
  }

  function card(h) {
    var sheet = E.conditionSheet(h.name);
    var hasSheet = sheet && h.eco !== 'marine';
    var cy = h.createYears;
    var crit = D.distinctivenessCriteria.map(function (c, i) {
      return '<dt>' + esc(c.name) + '</dt><dd>' + dots(h.criteriaScores[i]) + '</dd>';
    }).join('');
    return '<article class="hab-card">' +
      '<div class="meta">' + esc({ terrestrial: 'Terrestrial', freshwater: 'Freshwater', marine: 'Marine' }[h.eco]) + ' · ' + esc(h.broad) + '</div>' +
      '<h3>' + esc(h.name) + '</h3>' +
      '<div>' + UI.chip(h.category) + ' <span class="muted" style="font-size:.8rem">score ' + h.criteriaTotal + '/12 → ×' + E.distinctiveness(h) + ' in the metric</span></div>' +
      '<p>' + esc(h.definition) + '</p>' +
      '<dl>' + crit + '</dl>' +
      '<dl>' +
      '<dt>Creation</dt><dd>' + (typeof h.createMultiplier === 'number' ? esc(h.createDifficulty) + ' difficulty · ×' + h.createMultiplier : 'Not possible') + '</dd>' +
      '<dt>Years to target</dt><dd>' + (E.needsCondition(h) ? ['Good', 'Moderate', 'Poor'].map(function (c) { return c + ': ' + esc(UI.years(cy[c]).replace('Not possible', 'not possible')); }).join('<br>') : 'n/a') + '</dd>' +
      '<dt>Enhancement</dt><dd>' + (typeof h.enhanceMultiplier === 'number' ? esc(h.enhanceDifficulty) + ' difficulty · ×' + h.enhanceMultiplier : 'Not possible') + '</dd>' +
      '<dt>If lost</dt><dd>' + esc(D.tradingRules[h.category] || '') + '</dd>' +
      '</dl>' +
      '<div class="actions">' + (hasSheet ? '<button class="btn small" type="button" data-assess-hab="' + esc(h.eco + '|' + h.name) + '">Assess condition</button>' : '<span class="muted" style="font-size:.78rem">' + (h.eco === 'marine' ? 'Marine condition criteria are in development.' : E.needsCondition(h) ? '' : 'No condition criteria: no biodiversity value.') + '</span>') + '</div>' +
      '</article>';
  }

  function list() {
    var q = filter.q.toLowerCase();
    var items = D.habitats.filter(function (h) {
      if (filter.eco !== 'all' && h.eco !== filter.eco) return false;
      return !q || (h.name + ' ' + h.definition + ' ' + h.broad + ' ' + h.group + ' ' + h.category).toLowerCase().indexOf(q) >= 0;
    });
    if (filter.sort === 'dist') items = items.slice().sort(function (a, b) { return b.criteriaTotal - a.criteriaTotal; });
    return items;
  }

  function renderList() {
    var items = list();
    document.getElementById('habGrid').innerHTML = items.length ? items.map(card).join('') : '<div class="empty">No habitats match.</div>';
    document.getElementById('habCount').textContent = items.length + ' habitat' + (items.length === 1 ? '' : 's');
  }

  function render(el) {
    el.innerHTML =
      '<div class="card"><div class="filters">' +
      '<div class="seg" role="group" aria-label="Ecosystem filter" id="habEco">' +
      [['all', 'All'], ['terrestrial', 'Terrestrial'], ['freshwater', 'Freshwater'], ['marine', 'Marine']].map(function (x) {
        return '<button type="button" data-eco="' + x[0] + '" aria-pressed="' + (filter.eco === x[0]) + '">' + x[1] + '</button>';
      }).join('') + '</div>' +
      '<input type="search" id="habSearch" placeholder="Search habitats, e.g. mangrove" aria-label="Search habitats">' +
      '<label class="field" style="display:flex;align-items:center;gap:6px;font-weight:600">Sort<select id="habSort" style="width:auto"><option value="class">Classification order</option><option value="dist">Distinctiveness (high→low)</option></select></label>' +
      '<span class="muted" id="habCount"></span></div>' +
      '<div class="hab-grid" id="habGrid"></div></div>' +

      '<div class="grid-2">' +
      '<div class="card"><h3>Distinctiveness categories</h3><p class="muted" style="font-size:.88rem">' + esc(D.intro) + '</p>' +
      '<div class="table-wrap"><table class="ref"><thead><tr><th>Category</th><th>Score</th><th>Metric value</th><th>Description</th></tr></thead><tbody>' +
      D.distinctivenessCategories.map(function (c) {
        var key = { 'V. High': 'Very high', 'V. Low': 'Very low' }[c.name] || c.name.charAt(0) + c.name.slice(1).toLowerCase();
        return '<tr><td>' + UI.chip(key) + '</td><td>' + esc(c.scoreRange) + '</td><td>×' + D.distinctivenessValues[key] + '</td><td>' + esc(c.description) + '<span class="sub">' + esc(c.action) + '</span></td></tr>';
      }).join('') + '</tbody></table></div></div>' +

      '<div class="card"><h3>How distinctiveness is scored</h3><p class="muted" style="font-size:.88rem">Each habitat scores 0–3 on four criteria. The total (0–12) sets its category.</p>' +
      '<div class="table-wrap"><table class="ref"><thead><tr><th>Criterion</th><th>3 (High)</th><th>2 (Medium)</th><th>1 (Low)</th><th>0 (Zero)</th></tr></thead><tbody>' +
      D.distinctivenessCriteria.map(function (c) {
        return '<tr><td><b>' + esc(c.name) + '</b><span class="sub">' + esc(c.definition) + '</span></td>' + c.levels.map(function (l) { return '<td>' + esc(l) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<h3 style="margin-top:16px">Condition multipliers</h3><p style="font-size:.9rem">Good ×3 · Moderate ×2 · Poor ×1, set from each habitat\'s condition criteria sheet.</p>' +
      '<h3 style="margin-top:16px">Difficulty multipliers</h3><p style="font-size:.9rem">Low ×1 · Medium ×0.75 · High ×0.67 · Very high ×0.6. Harder habitats deliver fewer units, to reflect the real risk that creation or enhancement fails.</p>' +
      '</div></div>';

    el.querySelector('#habEco').addEventListener('click', function (e) {
      var b = e.target.closest('[data-eco]');
      if (!b) return;
      filter.eco = b.getAttribute('data-eco');
      el.querySelectorAll('#habEco button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      renderList();
    });
    el.querySelector('#habSearch').addEventListener('input', function (e) { filter.q = e.target.value; renderList(); });
    el.querySelector('#habSort').addEventListener('change', function (e) { filter.sort = e.target.value; renderList(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-assess-hab]');
      if (!b) return;
      var p = b.getAttribute('data-assess-hab').split('|');
      root.App.openCondition(p[0], p[1]);
    });
    renderList();
  }

  root.Guide = { render: render };
})(this);
