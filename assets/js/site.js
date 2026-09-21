(function () {
  'use strict';

  var CFG = window.VANCLOD || {};
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- wordmark scramble ----------
     Each letter of the logo cycles random glyphs, then resolves into the real
     logo artwork, left to right. Same idea as Motion+'s scrambleText, but that
     works on live text and the title here is artwork, so it is done by hand. */
  var LOGO_W = 1367;
  var CELLS = [[0, 360, 2], [360, 581, 1], [581, 812, 1], [812, 968, 1], [968, 1172, 1], [1172, 1367, 1]]; // [from, to, glyphs]
  var GLYPHS = 'ABCDEFGHJKLMNOPRSTUVXYZ0123456789/\\<>+=#';

  function buildMark(mark) {
    var src = $('img', mark);
    var holder = document.createElement('div');
    holder.className = 'cells';
    holder.setAttribute('aria-hidden', 'true');
    var cells = CELLS.map(function (c) {
      var w = c[1] - c[0];
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.width = (w / LOGO_W * 100) + '%';
      var img = document.createElement('img');
      img.src = src.currentSrc || src.src;
      img.alt = '';
      img.style.width = (LOGO_W / w * 100) + '%';
      img.style.left = (-c[0] / w * 100) + '%';
      var g = document.createElement('span');
      g.className = 'g';
      for (var i = 0; i < c[2]; i++) g.appendChild(document.createElement('span'));
      cell.appendChild(img); cell.appendChild(g);
      holder.appendChild(cell);
      return cell;
    });
    mark.appendChild(holder);
    src.style.visibility = 'hidden';
    return cells;
  }

  function scramble(cells, duration) {
    var start = performance.now(), last = 0;
    var lead = duration * 0.35, step = (duration - lead) / (cells.length - 1);
    cells.forEach(function (c) { c.classList.add('live'); });
    (function tick(now) {
      var t = now - start, busy = false;
      var swap = now - last > 48;
      if (swap) last = now;
      cells.forEach(function (c, i) {
        if (!c.classList.contains('live')) return;
        if (t >= lead + i * step) { c.classList.remove('live'); return; }
        busy = true;
        if (swap) $$('.g span', c).forEach(function (s) { s.textContent = GLYPHS[Math.random() * GLYPHS.length | 0]; });
      });
      if (busy) requestAnimationFrame(tick);
    })(start);
  }

  var mark = $('.hero-mark');
  if (mark) {
    if (!reduced && window.CSS && CSS.supports('font-size', '1cqw')) {
      var cells = buildMark(mark), running = false;
      var run = function () {
        if (running) return;
        running = true; scramble(cells, 1000);
        setTimeout(function () { running = false; }, 1100);
      };
      setTimeout(run, 380);
      if (matchMedia('(hover:hover)').matches) mark.addEventListener('mouseenter', run);
    }
    mark.classList.add('ready');
  }

  /* ---------- nav ---------- */
  var nav = $('#nav'), toggle = $('#toggle'), links = $('#links');
  function closeMenu() {
    if (!links) return;
    links.classList.remove('open'); document.body.classList.remove('locked');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle) {
    $$('a', links).forEach(function (a, i) { a.style.setProperty('--n', i); a.addEventListener('click', closeMenu); });
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      document.body.classList.toggle('locked', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    matchMedia('(min-width:821px)').addEventListener('change', closeMenu);
  }

  // which section are we in
  var spy = $$('#links a[href^="#"]');
  if (spy.length && 'IntersectionObserver' in window) {
    var byId = {};
    spy.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        spy.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = byId[e.target.id]; if (a && !a.classList.contains('btn')) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- reveals ---------- */
  var revealables = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { ro.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- statement: words light up with scroll ---------- */
  var st = $('.statement p'), words = [];
  if (st) {
    var hot = (st.getAttribute('data-hot') || '').split('|');
    var parts = st.textContent.trim().split(/\s+/);
    st.textContent = '';
    parts.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w' + (hot.indexOf(w.replace(/[^\w]/g, '')) > -1 ? ' hot' : '');
      s.textContent = w;
      st.appendChild(s);
      if (i < parts.length - 1) st.appendChild(document.createTextNode(' '));
      words.push(s);
    });
    if (reduced) words.forEach(function (w) { w.classList.add('on'); });
  }

  /* ---------- chapters: pinned horizontal scroll on large screens ---------- */
  var chap = $('.chapters'), track = $('.ch-track'), chLen = 0, chPinned = false;
  var chNow = $('#chNow'), chBar = $('.ch-bar i'), chCount = chap ? $$('.ch', chap).length : 0;
  var wide = matchMedia('(min-width:900px) and (min-height:620px)');
  function measureChapters() {
    var h = $('.hero'); if (h) h.style.setProperty('--hero-top', Math.min(0, innerHeight - h.offsetHeight) + 'px');
    if (!chap) return;
    chPinned = wide.matches && !reduced;
    chap.classList.toggle('pinned', chPinned);
    track.style.transform = '';
    if (chPinned) {
      chLen = Math.max(0, track.scrollWidth - innerWidth);
      chap.style.setProperty('--ch-len', chLen + 'px');
    }
  }
  if (chap && !chPinned) {
    track.addEventListener('scroll', function () {
      if (chPinned) return;
      var p = track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth);
      setChapter(Math.round(p * (chCount - 1)));
    }, { passive: true });
  }

  /* ---------- one scroll loop ---------- */
  var hero = $('.hero'), prog = $('.nav-progress'), secs = $$('[data-sec]'), chs = $$('.ch'), ticking = false;
  function setChapter(i) {
    if (chNow) chNow.textContent = '0' + (i + 1);
    chs.forEach(function (c, n) { c.classList.toggle('on', n <= i); });
  }
  if (reduced) setChapter(chs.length - 1); else setChapter(0);
  function frame() {
    ticking = false;
    var y = scrollY, vh = innerHeight;
    if (nav && !nav.classList.contains('solid')) nav.classList.toggle('scrolled', y > 40);
    if (prog) prog.style.transform = 'scaleX(' + clamp(y / Math.max(1, document.documentElement.scrollHeight - vh), 0, 1) + ')';
    if (reduced) return;

    if (hero && y < vh * 1.6) hero.style.setProperty('--hp', clamp(y / vh, 0, 1).toFixed(3));

    // each section gets --p (0 to 1 while it enters) and --q (0 to 1 across its whole pass); its CSS does the rest
    secs.forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (b.bottom < -vh || b.top > vh * 2) return;
      el.style.setProperty('--p', clamp((vh - b.top) / vh, 0, 1).toFixed(3));
      el.style.setProperty('--q', clamp((vh - b.top) / (vh + b.height), 0, 1).toFixed(3));
    });

    if (st) {
      var r = st.getBoundingClientRect();
      var p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.42), 0, 1);
      var lit = Math.round(p * words.length);
      words.forEach(function (w, i) { w.classList.toggle('on', i < lit); });
    }

    if (chPinned) {
      var cp = clamp(-chap.getBoundingClientRect().top / Math.max(1, chLen), 0, 1);
      track.style.transform = 'translate3d(' + (-cp * chLen).toFixed(1) + 'px,0,0)';
      if (chBar) chBar.style.transform = 'scaleX(' + cp + ')';
      setChapter(Math.round(cp * (chCount - 1)));
    }

  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { measureChapters(); onScroll(); });
  wide.addEventListener('change', measureChapters);
  addEventListener('load', function () { measureChapters(); frame(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureChapters(); frame(); });
  measureChapters(); frame();

  /* ---------- SoundCloud: load the player only when asked ---------- */
  var facade = $('.player-facade');
  if (facade) facade.addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.title = 'Vanclod on SoundCloud';
    f.allow = 'autoplay';
    f.loading = 'lazy';
    f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent('https://api.soundcloud.com/users/' + (CFG.soundcloudUserId || '')) +
      '&color=%23c8172b&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';
    facade.parentNode.replaceChild(f, facade);
  });

  /* ---------- dates ---------- */
  var list = $('#shows'), empty = $('#showsEmpty');
  if (list) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var shows = (CFG.shows || []).map(function (s) { return { s: s, d: new Date(s.date + 'T00:00:00') }; })
      .filter(function (x) { return !isNaN(x.d) && x.d >= today; })
      .sort(function (a, b) { return a.d - b.d; });
    var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    shows.forEach(function (x) {
      var li = el('li', 'show');
      var d = el('div', 'd num', x.d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      d.appendChild(el('small', '', x.d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric' })));
      li.appendChild(d);
      li.appendChild(el('div', 'e', x.s.event || x.s.venue || ''));
      li.appendChild(el('div', 'v', [x.s.event ? x.s.venue : '', x.s.city].filter(Boolean).join(' · ')));
      if (/^https?:\/\//.test(x.s.link || '')) {
        var a = el('a', 'tlink', 'Details ↗'); a.href = x.s.link; a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a);
      } else li.appendChild(el('span'));
      list.appendChild(li);
    });
    list.hidden = !shows.length;
    if (empty) empty.hidden = !!shows.length;
  }

  /* ---------- booking form ---------- */
  var email = CFG.bookingEmail || '';
  if (email) $$('[data-email]').forEach(function (a) { a.href = 'mailto:' + email; var t = $('[data-email-text]', a); if (t) t.textContent = email; });
  var form = $('#booking');
  if (form) {
    var note = $('#b-note'), copyBtn = $('#b-copy'), send = $('#b-send');
    var dateEl = $('#b-date');
    if (dateEl) { var n = new Date(); dateEl.min = new Date(n - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }

    var val = function (id) { return ($('#' + id).value || '').trim(); };
    var rules = {
      'b-name': function (v) { return v ? '' : 'Add your name.'; },
      'b-email': function (v) { return !v ? 'Add an email so we can reply.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'That email doesn’t look right.'); }
    };
    function check(id) {
      var input = $('#' + id), msg = rules[id](val(id)), slot = $('#' + id + '-err');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      slot.textContent = msg;
      return !msg;
    }
    Object.keys(rules).forEach(function (id) {
      $('#' + id).addEventListener('blur', function () { check(id); });
      $('#' + id).addEventListener('input', function () { if ($('#' + id).getAttribute('aria-invalid') === 'true') check(id); });
    });
    function lines() {
      return ['Name: ' + val('b-name'), 'Email: ' + val('b-email'), 'Phone: ' + (val('b-phone') || '—'),
        'Event type: ' + (val('b-type') || '—'), 'Event date: ' + (val('b-date') || '—'), '', 'Details:', val('b-details') || '—'].join('\n');
    }
    function say(text, isErr) { note.className = 'form-note' + (isErr ? ' err' : ''); note.textContent = text; }
    function copy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
      return new Promise(function (ok, no) {
        var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy') ? ok() : no(); } catch (e) { no(e); }
        document.body.removeChild(t);
      });
    }
    function viaEmail() {
      location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Booking enquiry — ' + val('b-name')) + '&body=' + encodeURIComponent(lines());
      say('Opening your email app with the enquiry filled in. Nothing opened? Copy the enquiry and send it to ' + email + '.');
      copyBtn.hidden = false;
    }
    copyBtn.addEventListener('click', function () {
      copy(lines()).then(function () { say('Enquiry copied. Paste it into an email to ' + email + '.'); },
        function () { say('Couldn’t copy automatically. Write to ' + email + '.', true); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = Object.keys(rules).map(check).every(Boolean);
      if (!ok) { say('Check the highlighted fields.', true); $('[aria-invalid="true"]', form).focus(); return; }
      if (!CFG.formEndpoint) return viaEmail();
      send.disabled = true; say('Sending…');
      var data = new FormData(form); data.append('_subject', 'Booking enquiry — ' + val('b-name'));
      fetch(CFG.formEndpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
        .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); say('Enquiry sent. The team will get back to you.'); })
        .catch(function () { say('That didn’t go through. Opening an email draft instead.', true); setTimeout(viaEmail, 900); })
        .then(function () { send.disabled = false; });
    });
  }

  /* ---------- press kit: copy a bio ---------- */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = $$('p', $('#' + b.getAttribute('data-copy'))).map(function (p) { return p.textContent.trim(); }).join('\n\n');
      var done = function (t) { var was = b.textContent; b.textContent = t; setTimeout(function () { b.textContent = was; }, 1800); };
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(function () { done('Copied'); }, function () { done('Select and copy manually'); });
    });
  });

  $$('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
