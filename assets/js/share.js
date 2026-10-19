/*
 * Export & share: renders an off-screen result card, captures it to PNG with html2canvas,
 * and hands it to the Web Share API (mobile: Instagram, Threads, WhatsApp…) or to
 * each network's public share URL.
 */
(function (root) {
  'use strict';
  var UI = root.UI;
  var current = null;   // options passed to open()
  var imageBlob = null;
  var renderToken = 0;

  var LEAF = '<svg class="leaf" width="420" height="420" viewBox="0 0 64 64"><path d="M10 56c0-26 18-44 46-46-3 28-21 46-46 46z" fill="#1f6b46"/></svg>';

  function cardFrame(format, inner) {
    return '<div class="sc' + (format === 'square' ? ' square' : '') + '">' + LEAF + inner + '</div>';
  }

  function waitForHtml2canvas() {
    return new Promise(function (resolve, reject) {
      var tries = 0;
      (function check() {
        if (root.html2canvas) return resolve(root.html2canvas);
        if (++tries > 100) return reject(new Error('Image library failed to load (are you offline?)'));
        setTimeout(check, 100);
      })();
    });
  }

  function renderImage(format) {
    var token = ++renderToken;
    var stage = document.getElementById('shareStage');
    stage.innerHTML = cardFrame(format, current.card(format));
    var node = stage.firstElementChild;
    return waitForHtml2canvas().then(function (h2c) {
      return h2c(node, { scale: 1, backgroundColor: '#f6f7f3', logging: false, useCORS: true });
    }).then(function (canvas) {
      return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
    }).then(function (blob) {
      if (token !== renderToken) return null;
      stage.innerHTML = '';
      imageBlob = blob;
      return blob;
    });
  }

  function filename() {
    return (current.filename || 'sg-biodiversity-metric') + '.png';
  }

  function shareUrl() {
    var include = document.getElementById('shareIncludeInputs');
    return current.link(include ? include.checked : false);
  }

  function shareText() {
    return current.text;
  }

  var NETWORKS = [
    { key: 'facebook', label: 'Facebook', url: function (u) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u); } },
    { key: 'linkedin', label: 'LinkedIn', url: function (u) { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(u); } },
    { key: 'x', label: 'X', url: function (u, t) { return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent(u); } },
    { key: 'threads', label: 'Threads', url: function (u, t) { return 'https://www.threads.net/intent/post?text=' + encodeURIComponent(t + '\n' + u); } },
    { key: 'instagram', label: 'Instagram' },
    { key: 'whatsapp', label: 'WhatsApp', url: function (u, t) { return 'https://wa.me/?text=' + encodeURIComponent(t + '\n' + u); } },
    { key: 'telegram', label: 'Telegram', url: function (u, t) { return 'https://t.me/share/url?url=' + encodeURIComponent(u) + '&text=' + encodeURIComponent(t); } },
    { key: 'reddit', label: 'Reddit', url: function (u, t) { return 'https://www.reddit.com/submit?url=' + encodeURIComponent(u) + '&title=' + encodeURIComponent(t); } },
    { key: 'email', label: 'Email', url: function (u, t) { return 'mailto:?subject=' + encodeURIComponent(current.title) + '&body=' + encodeURIComponent(t + '\n\n' + u); } }
  ];

  function canShareFiles() {
    if (!navigator.canShare || !imageBlob) return false;
    try { return navigator.canShare({ files: [new File([imageBlob], filename(), { type: 'image/png' })] }); }
    catch (e) { return false; }
  }

  function nativeShare(withFile) {
    var data = { title: current.title, text: shareText(), url: shareUrl() };
    if (withFile && canShareFiles()) data.files = [new File([imageBlob], filename(), { type: 'image/png' })];
    return navigator.share(data).catch(function (e) { if (e.name !== 'AbortError') UI.toast('Sharing was cancelled or failed.'); });
  }

  function instagram() {
    // Instagram has no web share URL: use the native share sheet with the image when possible.
    if (canShareFiles()) return nativeShare(true);
    if (imageBlob) UI.download(imageBlob, filename());
    UI.copyText(shareText() + '\n' + shareUrl());
    UI.toast('Image downloaded and caption copied. Post them from Instagram.');
    window.open('https://www.instagram.com/', '_blank', 'noopener');
  }

  function bodyHtml() {
    var o = current;
    return '' +
      '<div style="display:grid;gap:12px">' +
      '<div class="seg" role="group" aria-label="Image format" id="shareFormat">' +
      '<button type="button" aria-pressed="true" data-format="landscape">Landscape 1200×630</button>' +
      '<button type="button" aria-pressed="false" data-format="square">Square 1080×1080 (Instagram)</button></div>' +
      '<div class="share-preview" id="sharePreview"><span class="muted">Rendering image…</span></div>' +
      (o.allowInputs ? '<label style="display:flex;gap:8px;align-items:flex-start;font-size:.88rem"><input type="checkbox" id="shareIncludeInputs" style="width:auto;min-height:0;margin-top:3px"> <span>Include my inputs in the share link, so whoever opens it sees the same assessment. They are packed into the link itself and never stored on a server.</span></label>' : '') +
      '<div class="toolbar">' +
      '<button class="btn primary" type="button" data-act="png">⬇ Download PNG</button>' +
      '<button class="btn" type="button" data-act="copyimg">Copy image</button>' +
      (navigator.share ? '<button class="btn" type="button" data-act="native">Share…</button>' : '') +
      (o.csv ? '<button class="btn" type="button" data-act="csv">Download CSV</button>' : '') +
      '<button class="btn" type="button" data-act="print">Print / PDF</button>' +
      '</div>' +
      '<div><h3 style="font-size:.95rem;margin:4px 0 8px">Share to</h3><div class="share-grid">' +
      NETWORKS.map(function (n) { return '<button class="btn" type="button" data-net="' + n.key + '">' + n.label + '</button>'; }).join('') +
      '</div><p class="muted" style="font-size:.8rem;margin:8px 0 0">Facebook and LinkedIn only accept a link, so download the image to attach it to your post. Instagram has no web share link. On a phone, the image goes to the share sheet; on a computer, it downloads and the caption is copied.</p></div>' +
      '<div class="toolbar"><button class="btn small" type="button" data-act="copylink">Copy link</button><button class="btn small" type="button" data-act="copytext">Copy caption</button></div>' +
      '</div>';
  }

  function refreshPreview(format) {
    var prev = document.getElementById('sharePreview');
    prev.innerHTML = '<span class="muted">Rendering image…</span>';
    imageBlob = null;
    renderImage(format).then(function (blob) {
      if (!blob) return;
      var img = new Image();
      img.alt = 'Preview of the shareable image';
      img.src = URL.createObjectURL(blob);
      prev.innerHTML = '';
      prev.appendChild(img);
    }).catch(function (e) {
      prev.innerHTML = '<span class="muted" style="padding:12px">' + UI.esc(e.message) + '</span>';
    });
  }

  function open(options) {
    current = options;
    var body = document.getElementById('shareDialogBody');
    body.innerHTML = bodyHtml();
    UI.openDialog('shareDialog');
    refreshPreview('landscape');
  }

  document.addEventListener('click', function (e) {
    if (!current || !e.target.closest('#shareDialog')) return;
    var f = e.target.closest('[data-format]');
    if (f) {
      document.querySelectorAll('#shareFormat button').forEach(function (b) { b.setAttribute('aria-pressed', b === f ? 'true' : 'false'); });
      refreshPreview(f.getAttribute('data-format'));
      return;
    }
    var net = e.target.closest('[data-net]');
    if (net) {
      var key = net.getAttribute('data-net');
      if (key === 'instagram') return instagram();
      var n = NETWORKS.filter(function (x) { return x.key === key; })[0];
      var href = n.url(shareUrl(), shareText());
      if (key === 'email') location.href = href; else window.open(href, '_blank', 'noopener,width=640,height=640');
      return;
    }
    var act = e.target.closest('[data-act]');
    if (!act) return;
    switch (act.getAttribute('data-act')) {
      case 'png':
        if (imageBlob) UI.download(imageBlob, filename()); else UI.toast('Image is still rendering…');
        break;
      case 'copyimg':
        if (!imageBlob || !root.ClipboardItem || !navigator.clipboard) { UI.toast('Copying images is not supported here. Download it instead.'); break; }
        navigator.clipboard.write([new root.ClipboardItem({ 'image/png': imageBlob })])
          .then(function () { UI.toast('Image copied to clipboard'); }, function () { UI.toast('Could not copy the image'); });
        break;
      case 'native': nativeShare(true); break;
      case 'csv': UI.download(new Blob([current.csv()], { type: 'text/csv' }), (current.filename || 'sg-biodiversity-metric') + '.csv'); break;
      case 'print': UI.closeDialog('shareDialog'); setTimeout(function () { window.print(); }, 150); break;
      case 'copylink': UI.copyText(shareUrl()).then(function () { UI.toast('Link copied'); }); break;
      case 'copytext': UI.copyText(shareText() + '\n' + shareUrl()).then(function () { UI.toast('Caption copied'); }); break;
    }
  });

  /* ---- URL-safe encoding of state for share links (no server involved) ---- */
  function encode(obj) {
    var json = JSON.stringify(obj);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    try {
      var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }
  function baseUrl() {
    return location.href.split('#')[0];
  }

  root.Share = { open: open, encode: encode, decode: decode, baseUrl: baseUrl };
})(this);
