/*
 * Habitat condition assessment (Terrestrial / Freshwater Condition Criteria 1.1 workbooks).
 * Each criterion scores 3, 2 or 1 points; the total maps to Good / Moderate / Poor using
 * the score ranges printed on each habitat's sheet.
 */
(function (root) {
  'use strict';
  var E = root.SGBAEngine, UI = root.UI;

  function sheetsFor(eco) {
    return E.DATA.conditionSheets.filter(function (s) { return s.eco === eco; });
  }

  function Assessor(container, eco, opts) {
    this.el = container;
    this.eco = eco;
    this.opts = opts || {};
    var first = this.opts.habitat || sheetsFor(eco)[0].habitat;
    this.select(first, this.opts.answers);
  }

  Assessor.prototype.select = function (habitatName, answers) {
    this.sheet = E.conditionSheet(habitatName) || sheetsFor(this.eco)[0];
    this.answers = (answers || []).slice(0, this.sheet.criteria.length);
    this.render();
  };

  Assessor.prototype.metricHabitat = function () {
    var eco = this.eco, name = this.sheet.habitat;
    return E.DATA.habitats.filter(function (h) { return h.eco === eco && h.name === name; })[0];
  };

  Assessor.prototype.render = function () {
    var self = this, s = this.sheet, h = this.metricHabitat();
    var uid = this.opts.idPrefix || ('c-' + this.eco);
    var picker = this.opts.lockHabitat
      ? '<p><strong>' + UI.esc(s.habitat) + '</strong></p>'
      : '<label class="field">Habitat type<select data-role="sheet">' + sheetsFor(this.eco).map(function (x) {
          return '<option value="' + UI.esc(x.habitat) + '"' + (x === s ? ' selected' : '') + '>' + UI.esc(x.habitat) + '</option>';
        }).join('') + '</select></label>';

    var crit = s.criteria.map(function (c, i) {
      return '<fieldset class="criterion"><legend class="sr-only">' + UI.esc(c.name) + '</legend>' +
        '<h4><span class="n">' + (i + 1) + '</span>' + UI.esc(c.name) + '</h4>' +
        (c.description ? '<div class="desc">' + UI.esc(c.description) + '</div>' : '') +
        '<div class="options">' + c.options.map(function (o) {
          var id = uid + '-' + i + '-' + o.points;
          return '<label class="option" for="' + id + '"><input type="radio" id="' + id + '" name="' + uid + '-' + i + '" value="' + o.points + '"' +
            (self.answers[i] === o.points ? ' checked' : '') + ' data-crit="' + i + '"><span><b>' + o.points + ' point' + (o.points > 1 ? 's' : '') + '</b>' + UI.esc(o.text) + '</span></label>';
        }).join('') + '</div>' +
        (c.source ? '<div class="src">Data source: ' + UI.esc(c.source.replace(/\n/g, ' · ')) + '</div>' : '') +
        '</fieldset>';
    }).join('');

    this.el.innerHTML =
      '<div class="cond-layout">' +
      '<div>' +
      '<div class="card">' + picker +
      '<p class="muted" style="margin:8px 0 0">' + UI.esc(s.includes) + '</p>' +
      (h ? '<p style="margin:8px 0 0;font-size:.88rem">Distinctiveness ' + UI.chip(h.category) + ' · ' + UI.esc(h.broad) + '</p>' : '') +
      '</div>' + crit + '</div>' +
      '<aside class="cond-side"><div class="card" data-role="summary"></div></aside>' +
      '</div>';

    var sel = this.el.querySelector('[data-role="sheet"]');
    if (sel) sel.addEventListener('change', function () { self.select(sel.value); self.changed(); });
    this.el.querySelectorAll('input[type="radio"]').forEach(function (r) {
      r.addEventListener('change', function () {
        self.answers[+r.getAttribute('data-crit')] = +r.value;
        self.renderSummary();
        self.changed();
      });
    });
    this.renderSummary();
  };

  Assessor.prototype.changed = function () {
    if (this.opts.onChange) this.opts.onChange(this);
  };

  Assessor.prototype.result = function () {
    return E.assessCondition(this.sheet, this.answers);
  };

  Assessor.prototype.renderSummary = function () {
    var self = this, s = this.sheet, r = this.result();
    var span = r.max - r.min;
    var pos = function (v) { return ((v - r.min) / span) * 100; };
    var poorW = pos(s.poorMax + 0.5), goodStart = pos(s.goodMin - 0.5);
    var cls = r.result ? r.result.toLowerCase() : '';
    var multiplier = r.result ? E.conditionScore(r.result) : null;
    var box = this.el.querySelector('[data-role="summary"]');
    box.innerHTML =
      '<h3 style="margin-bottom:4px">Condition result</h3>' +
      '<div class="progress" aria-hidden="true"><div style="width:' + (r.answered / r.count * 100) + '%"></div></div>' +
      '<p class="muted" style="margin:0 0 6px;font-size:.85rem">' + r.answered + ' of ' + r.count + ' criteria scored</p>' +
      '<div class="cond-result ' + cls + '">' + (r.result || (r.answered ? 'In progress' : 'Not scored')) + '</div>' +
      '<p style="margin:0">Total score <strong>' + r.total + '</strong> <span class="muted">(range ' + r.min + '–' + r.max + ')</span></p>' +
      '<div class="scale" aria-hidden="true"><div class="bar">' +
      '<div class="seg-poor" style="width:' + poorW + '%"></div><div class="seg-mod" style="width:' + (goodStart - poorW) + '%"></div><div class="seg-good" style="flex:1"></div>' +
      (r.answered ? '<div class="marker" style="left:' + Math.max(0, Math.min(100, pos(r.complete ? r.total : r.total + (r.count - r.answered) * 1))) + '%"></div>' : '') +
      '</div><div class="ticks"><span>' + r.min + '</span><span>' + r.max + '</span></div></div>' +
      '<table class="bands"><tbody>' +
      '<tr><td>Good</td><td style="text-align:right">≥ ' + s.goodMin + '</td><td style="text-align:right">×3</td></tr>' +
      '<tr><td>Moderate</td><td style="text-align:right">' + (s.poorMax + 1) + '–' + (s.goodMin - 1) + '</td><td style="text-align:right">×2</td></tr>' +
      '<tr><td>Poor</td><td style="text-align:right">≤ ' + s.poorMax + '</td><td style="text-align:right">×1</td></tr>' +
      '</tbody></table>' +
      (r.complete ? '<p style="margin:10px 0 0;font-size:.88rem">In the metric this parcel scores <strong>×' + multiplier + '</strong> for condition.</p>' :
        r.answered ? '<p class="muted" style="margin:10px 0 0;font-size:.85rem">The marker assumes 1 point for unscored criteria (the worst case).</p>' : '') +
      '<div class="share-row">' +
      (this.opts.onApply ? '<button class="btn primary" type="button" data-role="apply"' + (r.complete ? '' : ' disabled') + '>Use ' + (r.result || 'result') + ' in calculator</button>' : '') +
      '<button class="btn" type="button" data-role="share"' + (r.answered ? '' : ' disabled') + '>Export &amp; share</button>' +
      '<button class="btn ghost" type="button" data-role="reset">Reset</button>' +
      '</div>';
    var apply = box.querySelector('[data-role="apply"]');
    if (apply) apply.addEventListener('click', function () { self.opts.onApply(r.result, self); });
    box.querySelector('[data-role="reset"]').addEventListener('click', function () { self.answers = []; self.render(); self.changed(); });
    box.querySelector('[data-role="share"]').addEventListener('click', function () { self.share(); });
  };

  Assessor.prototype.share = function () {
    var self = this, s = this.sheet, r = this.result();
    var grade = r.result || 'Incomplete';
    var color = { Good: '#006300', Moderate: '#7a5200', Poor: '#a32424' }[r.result] || '#4a5244';
    root.Share.open({
      title: s.habitat + ' condition: ' + grade,
      filename: 'condition-' + UI.slug(s.habitat),
      text: 'Habitat condition assessment for ' + s.habitat + ': ' + grade + ' (' + r.total + '/' + r.max + ' points) using the Singapore Biodiversity Accounting Metric 1.1 criteria. #biodiversity #Singapore #NatureBasedSolutions',
      link: function () {
        return root.Share.baseUrl() + '#view=' + self.eco + '&c=' + root.Share.encode({ h: s.habitat, a: self.answers });
      },
      card: function (format) {
        var rows = s.criteria.map(function (c, i) {
          return '<div><span>' + UI.esc(c.name) + '</span><b>' + (self.answers[i] ? self.answers[i] + ' / 3' : '–') + '</b></div>';
        });
        var maxRows = format === 'square' ? 12 : 6;
        return '<div class="sc-top"><div><div class="sc-kicker">Habitat condition assessment</div>' +
          '<div class="sc-title">' + UI.esc(s.habitat) + '</div><div class="sc-sub">' + (self.eco === 'terrestrial' ? 'Terrestrial' : 'Freshwater') + ' condition criteria 1.1</div></div></div>' +
          '<div class="sc-body"><div class="sc-cond"><div><div class="grade" style="color:' + color + '">' + grade + '</div>' +
          '<div style="font-size:24px;color:#4a5244;margin-top:8px">' + r.total + ' of ' + r.max + ' points · ' + r.answered + '/' + r.count + ' criteria</div></div>' +
          '<div class="sc-crit" style="flex:1">' + rows.slice(0, maxRows).join('') + (rows.length > maxRows ? '<div><span>+ ' + (rows.length - maxRows) + ' more criteria</span><b></b></div>' : '') + '</div></div></div>' +
          '<div class="sc-foot"><span>Scored with the <b>SG Biodiversity Accounting Metric 1.1</b> criteria</span><span>AECOM &amp; Camphora (2024)</span></div>';
      }
    });
  };

  root.ConditionAssessor = Assessor;
  root.ConditionSheetsFor = sheetsFor;
})(this);
