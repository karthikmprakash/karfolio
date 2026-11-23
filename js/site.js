/* KarFolio — interactions & motion
   GSAP + ScrollTrigger (reveals, parallax, counters), Lenis (smooth scroll),
   plus a dependency-free canvas "data network" hero. Everything degrades
   gracefully: if the CDN libs fail, content stays visible. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  $('#year').textContent = new Date().getFullYear();

  /* ---- Nav: stuck state, mobile menu, active link ---------------------- */
  var nav = $('#nav');
  var menuBtn = $('.menu-btn');
  var menu = $('#menu');
  function onScrollNav() { nav.classList.toggle('is-stuck', window.scrollY > 40); }
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  menuBtn.addEventListener('click', function () {
    var open = menu.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
  });
  $$('a', menu).forEach(function (a) {
    a.addEventListener('click', function () {
      menu.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
    });
  });

  var links = $$('.nav-links a');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['about', 'skills', 'services', 'work', 'writing', 'contact'].forEach(function (id) {
      var el = document.getElementById(id); if (el) spy.observe(el);
    });
  }

  /* ---- Cursor glow ------------------------------------------------------ */
  var glow = $('.glow');
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      glow.style.setProperty('--mx', e.clientX + 'px');
      glow.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });
  } else { glow.style.display = 'none'; }

  /* ---- Typed role rotator ---------------------------------------------- */
  var typed = $('.typed');
  if (typed && !reduce) {
    var words = JSON.parse(typed.getAttribute('data-words'));
    var w = 0, c = words[0].length, del = true;
    (function tick() {
      var word = words[w];
      c += del ? -1 : 1;
      typed.textContent = word.slice(0, c);
      var t = del ? 38 : 70;
      if (!del && c === word.length) { del = true; t = 1700; }
      else if (del && c === 0) { del = false; w = (w + 1) % words.length; t = 260; }
      setTimeout(tick, t);
    })();
  }

  /* ---- Hero canvas: drifting data network ------------------------------ */
  var cv = $('#net');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d');
    var pts = [], W, H, dpr, mouse = { x: -999, y: -999 }, running = true;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(110, (W * H) / 15000));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.4 + 0.6, hot: Math.random() < 0.12
      });
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d, m;
      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        if (!reduce) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
          dx = a.x - mouse.x; dy = a.y - mouse.y; m = dx * dx + dy * dy;
          if (m < 22000) { a.x += dx * 0.004; a.y += dy * 0.004; }
        }
        for (j = i + 1; j < pts.length; j++) {
          b = pts[j]; dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
          if (d < 17000) {
            ctx.strokeStyle = 'rgba(236,233,226,' + (0.16 * (1 - d / 17000)) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = a.hot ? 'rgba(255,180,84,0.95)' : 'rgba(236,233,226,0.55)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.hot ? a.r + 0.8 : a.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', size);
    $('.hero').addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    $('.hero').addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    // pause when hero is offscreen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        var vis = e[0].isIntersecting;
        if (vis && !running) { running = true; frame(); } else if (!vis) { running = false; }
      }).observe(cv);
    }
    frame();
  }

  /* ---- Quote carousel (no deps) ---------------------------------------- */
  var qs = $$('.q'), dots = $$('.dots button'), qi = 0, qt;
  function showQ(n) {
    qi = (n + qs.length) % qs.length;
    qs.forEach(function (q, i) { q.classList.toggle('is-on', i === qi); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === qi); });
  }
  function autoQ() { clearInterval(qt); if (!reduce) qt = setInterval(function () { showQ(qi + 1); }, 6500); }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { showQ(i); autoQ(); }); });
  autoQ();

  /* ---- Project filter --------------------------------------------------- */
  var filters = $$('.filter'), cards = $$('.card');
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      var key = f.getAttribute('data-filter');
      filters.forEach(function (x) { x.setAttribute('aria-pressed', x === f); });
      cards.forEach(function (c) {
        var show = key === 'all' || c.getAttribute('data-cat') === key;
        c.classList.toggle('is-hidden', !show);
        if (show && window.gsap && !reduce) {
          gsap.fromTo(c, { opacity: 0, y: 24, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform' });
        }
      });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ---- Card tilt + magnetic buttons (pointer devices only) ------------- */
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateY(' + px * 7 + 'deg) rotateX(' + -py * 7 + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.22 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.3 + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---- GSAP layer ------------------------------------------------------- */
  function boot() {
    if (!window.gsap || !window.ScrollTrigger) return; // content stays visible
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('gsap-on');
    if (reduce) { gsap.set('[data-reveal], .hero-title .line > span, .hero-meta, .hero-foot', { clearProps: 'all' }); return; }

    // Lenis smooth scroll, driven by GSAP's ticker
    if (window.Lenis) {
      var lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var id = a.getAttribute('href');
          if (id.length < 2) { e.preventDefault(); lenis.scrollTo(0); return; }
          var t = $(id); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -60 }); }
        });
      });
    }

    // Hero intro
    gsap.set('.hero-title .line > span', { yPercent: 110 });
    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('.hero-meta', { opacity: 1, duration: 0.8 }, 0.1)
      .to('.hero-title .line > span', { yPercent: 0, duration: 1.4, stagger: 0.12 }, 0.15)
      .to('.hero-foot', { opacity: 1, duration: 1 }, 0.7);

    // Hero parallax on scroll
    gsap.to('.hero .container', {
      yPercent: -12, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // Reveal on scroll (batched for a natural stagger)
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true });
      }
    });

    // Portrait parallax
    $$('[data-parallax]').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Marquee speeds up with scroll velocity
    var track = $('.marquee-track');
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 800, 4);
        track.style.animationDuration = (38 / (1 + v)) + 's';
      }
    });

    // Counters
    $$('[data-count]').forEach(function (el) {
      var end = parseInt(el.getAttribute('data-count'), 10), plain = el.hasAttribute('data-plain');
      var o = { v: plain ? end - 40 : 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(o, { v: end, duration: 2.2, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
        }
      });
      el.textContent = Math.round(o.v);
    });

    // Scroll progress bar
    gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

    // Big contact headline drifts slightly
    gsap.fromTo('.contact-big', { xPercent: -2 }, {
      xPercent: 2, ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  // Scripts are deferred and execute in order, so libs are ready here.
  boot();
})();
