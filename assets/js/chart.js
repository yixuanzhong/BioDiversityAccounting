/* Grouped bar chart (baseline vs post-development units per ecosystem), plain SVG. */
(function (root) {
  'use strict';
  var UI = root.UI;

  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / p;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }

  // Bar with 4px rounded data-end, square at the baseline.
  function barPath(x, y, w, h) {
    var r = Math.min(4, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }

  function grouped(groups, opts) {
    opts = opts || {};
    var W = 340, H = 190, m = { t: 10, r: 6, b: 34, l: 44 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var max = niceMax(Math.max.apply(null, groups.map(function (g) { return Math.max(g.baseline, g.post); }).concat([0.0001])));
    var ticks = [0, max / 2, max];
    var gw = iw / Math.max(groups.length, 1);
    var bw = Math.min(34, (gw - 18) / 2);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(opts.label || 'Biodiversity units before and after development') + '">';
    ticks.forEach(function (t) {
      var y = m.t + ih - (t / max) * ih;
      svg += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y + '" y2="' + y + '" stroke="var(--grid)" stroke-width="1"/>';
      svg += '<text x="' + (m.l - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="var(--ink-3)">' + UI.fmt(t, t < 10 && t > 0 ? 1 : 0) + '</text>';
    });
    groups.forEach(function (g, i) {
      var cx = m.l + gw * i + gw / 2;
      [['baseline', 'var(--series-1)', 'Baseline'], ['post', 'var(--series-2)', 'Post-development']].forEach(function (s, j) {
        var v = g[s[0]];
        var h = Math.max(0, (v / max) * ih);
        var x = cx - bw - 1 + j * (bw + 2); // 2px gap between the pair
        var y = m.t + ih - h;
        var tip = g.label + ' · ' + s[2] + ': ' + UI.fmt(v) + ' units';
        // Hit target covers the full column so small bars stay hoverable
        svg += '<rect x="' + x + '" y="' + m.t + '" width="' + bw + '" height="' + ih + '" fill="transparent" data-tip="' + UI.esc(tip) + '"/>';
        if (h > 0.5) svg += '<path d="' + barPath(x, y, bw, h) + '" fill="' + s[1] + '" pointer-events="none"/>';
      });
      svg += '<text x="' + cx + '" y="' + (H - m.b + 16) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink-2)">' + UI.esc(g.short || g.label) + '</text>';
    });
    svg += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ih) + '" y2="' + (m.t + ih) + '" stroke="var(--axis)" stroke-width="1"/>';
    svg += '</svg>';
    return '<div class="chart" data-chart>' +
      '<div class="legend"><span><i style="background:var(--series-1)"></i>Baseline</span><span><i style="background:var(--series-2)"></i>Post-development</span></div>' +
      svg + '<div class="tooltip" role="tooltip"></div></div>';
  }

  // One delegated hover handler for every chart on the page
  function onMove(e) {
    var chart = e.target.closest && e.target.closest('[data-chart]');
    document.querySelectorAll('[data-chart] .tooltip.on').forEach(function (t) {
      if (!chart || !chart.contains(t)) t.classList.remove('on');
    });
    if (!chart) return;
    var tip = chart.querySelector('.tooltip');
    var target = e.target.closest('[data-tip]');
    if (!target) { tip.classList.remove('on'); return; }
    var r = chart.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    tip.textContent = target.getAttribute('data-tip');
    tip.style.left = (p.clientX - r.left) + 'px';
    tip.style.top = (p.clientY - r.top) + 'px';
    tip.classList.add('on');
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchstart', onMove, { passive: true });

  root.Charts = { grouped: grouped };
})(this);
