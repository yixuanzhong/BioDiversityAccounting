/* Small DOM and formatting helpers shared by every view. */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmt(n, dp) {
    if (n === null || n === undefined || n === '' || !isFinite(n)) return '–';
    var d = dp === undefined ? 2 : dp;
    return Number(n).toLocaleString('en-SG', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function fmtSigned(n, dp) {
    if (!isFinite(n)) return '–';
    var s = fmt(Math.abs(n), dp);
    return (n > 1e-9 ? '+' : n < -1e-9 ? '−' : '') + s;
  }

  function pct(p) {
    if (p === null || p === undefined || !isFinite(p)) return '–';
    return fmtSigned(p * 100, 1) + '%';
  }

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function chip(category) {
    if (!category) return '';
    return '<span class="chip d-' + slug(category) + '">' + esc(category) + '</span>';
  }

  function years(v) {
    if (v === '' || v === null || v === undefined) return '–';
    if (v === 'Not possible') return 'Not possible';
    if (typeof v === 'number') return v === 0 ? 'Immediate' : v + (v === 1 ? ' year' : ' years');
    return v + ' years';
  }

  function issuesHtml(issues) {
    if (!issues || !issues.length) return '';
    var icon = { error: '⛔', warn: '⚠️', info: 'ℹ️' };
    return '<ul class="row-issues">' + issues.map(function (i) {
      return '<li class="lvl-' + i.level + '"><span aria-hidden="true">' + icon[i.level] + '</span><span>' + esc(i.text) + '</span></li>';
    }).join('') + '</ul>';
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2600);
  }

  function openDialog(id) {
    var d = document.getElementById(id);
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    return d;
  }
  function closeDialog(id) {
    var d = document.getElementById(id);
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-close]');
    if (btn) closeDialog(btn.closest('dialog').id);
    if (e.target.tagName === 'DIALOG') closeDialog(e.target.id); // click on backdrop
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
    return Promise.resolve();
  }

  function download(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function habitatOptions(eco, selected, placeholder) {
    var E = root.SGBAEngine;
    var groups = {};
    var order = [];
    E.habitatsFor(eco).forEach(function (h) {
      var g = h.broad + (h.group && h.group !== h.broad ? ' · ' + h.group : '');
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(h);
    });
    return '<option value="">' + esc(placeholder || 'Select habitat…') + '</option>' + order.map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (h) {
        return '<option value="' + esc(h.id) + '"' + (h.id === selected ? ' selected' : '') + '>' + esc(h.name) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  function conditionOptions(selected, disabled) {
    if (disabled) return '<option value="">N/A</option>';
    return '<option value="">Condition…</option>' + root.SGBAEngine.CONDITIONS.map(function (c) {
      return '<option' + (c === selected ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
  }

  root.UI = {
    esc: esc, fmt: fmt, fmtSigned: fmtSigned, pct: pct, slug: slug, chip: chip, years: years,
    issuesHtml: issuesHtml, toast: toast, openDialog: openDialog, closeDialog: closeDialog,
    copyText: copyText, download: download, habitatOptions: habitatOptions, conditionOptions: conditionOptions
  };
})(this);
