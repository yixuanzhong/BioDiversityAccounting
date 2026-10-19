/* App shell: tabs, theme toggle, and restoring shared links (#view=…&s=… / &c=…). */
(function (root) {
  'use strict';
  var UI = root.UI;
  var VIEWS = ['calculator', 'terrestrial', 'freshwater', 'guide', 'learn'];
  var assessors = {};
  var rendered = {};

  function show(view, opts) {
    if (VIEWS.indexOf(view) < 0) view = 'calculator';
    VIEWS.forEach(function (v) {
      document.getElementById('view-' + v).hidden = v !== view;
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.setAttribute('aria-selected', t.getAttribute('data-view') === view ? 'true' : 'false');
    });
    if ((view === 'terrestrial' || view === 'freshwater') && !assessors[view]) {
      assessors[view] = new root.ConditionAssessor(document.getElementById('cond-' + view), view, opts || {});
    } else if (opts && assessors[view]) {
      assessors[view].select(opts.habitat, opts.answers);
    }
    if (view === 'guide' && !rendered.guide) { root.Guide.render(document.getElementById('guide')); rendered.guide = true; }
    if (view === 'learn' && !rendered.learn) { root.Learn.render(document.getElementById('learn')); rendered.learn = true; }
    if (!(opts && opts.keepScroll)) window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }

  function openCondition(eco, habitat) {
    show(eco, { habitat: habitat });
  }

  function parseHash() {
    var out = {};
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) out[kv.slice(0, i)] = kv.slice(i + 1);
    });
    return out;
  }

  function initTheme() {
    var btn = document.getElementById('themeToggle');
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
    });
  }

  function init() {
    initTheme();
    document.querySelector('.tabs').addEventListener('click', function (e) {
      var t = e.target.closest('.tab');
      if (t) show(t.getAttribute('data-view'));
    });

    var h = parseHash();
    var initial = null;
    if (h.s) {
      initial = root.Calculator.unpackState(root.Share.decode(h.s));
      if (initial) setTimeout(function () { UI.toast('Loaded the shared assessment'); }, 300);
    }
    if (!initial) {
      var d = new Date();
      initial = { project: { date: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } };
    }
    root.Calculator.init(initial);

    var view = h.view || 'calculator';
    var opts = null;
    if (h.c && (view === 'terrestrial' || view === 'freshwater')) {
      var c = root.Share.decode(h.c);
      if (c) opts = { habitat: c.h, answers: c.a };
    }
    show(view, opts);
    // Shared state is now in memory; drop it from the address bar so reloads start clean.
    if (h.s || h.c) history.replaceState(null, '', location.pathname + location.search);
  }

  root.App = { show: show, openCondition: openCondition };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(this);
