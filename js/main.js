/* =========================================================
   FIRESTONE — UI, scroll animation & 3D interactions
   ========================================================= */
(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGSAP || reduceMotion) root.classList.add('no-anim');
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Preloader ---------- */
  const preloader = $('#preloader');
  let introPlayed = false;
  function hidePreloader() {
    if (introPlayed) return;
    introPlayed = true;
    preloader && preloader.classList.add('is-done');
    playHeroIntro();
  }
  window.addEventListener('hero3d:ready', () => setTimeout(hidePreloader, 250));
  window.addEventListener('load', () => setTimeout(hidePreloader, 900));
  setTimeout(hidePreloader, 3500);

  /* ---------- Hero intro ---------- */
  function playHeroIntro() {
    if (!hasGSAP || reduceMotion) { startCounters(); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__title .line > span', { yPercent: 110, rotate: 4, duration: 1.3, stagger: 0.09 })
      .from('.hero .eyebrow', { opacity: 0, x: -20, duration: 1 }, 0.1)
      .from('.hero__lead', { opacity: 0, y: 24, duration: 1.1 }, 0.35)
      .from('.hero__actions > *', { opacity: 0, y: 20, duration: 1, stagger: 0.08 }, 0.45)
      .from('.status-panel', { opacity: 0, x: 40, rotateY: -30, duration: 1.4 }, 0.6)
      .from('.status-list li', { opacity: 0, x: 16, duration: 0.6, stagger: 0.07 }, 0.9)
      .from('.hero__stats .stat', { opacity: 0, y: 30, duration: 1, stagger: 0.08, onStart: startCounters }, 0.7);
  }

  /* ---------- Counters ---------- */
  let countersStarted = false;
  function startCounters() {
    if (countersStarted) return;
    countersStarted = true;
    $$('[data-count]').forEach((el) => {
      const to = +el.dataset.count;
      const from = el.dataset.from ? +el.dataset.from : 0;
      if (reduceMotion) { el.textContent = to; return; }
      const dur = 1800;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Status panel: clock + live waveform ---------- */
  const clock = $('#clock');
  const wave = $('#wave');
  const pressure = $('[data-flicker]');
  function pad(n) { return String(n).padStart(2, '0'); }
  setInterval(() => {
    const d = new Date();
    if (clock) clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    if (pressure) {
      const vals = pressure.dataset.flicker.split(',');
      pressure.textContent = vals[Math.floor(Math.random() * vals.length)] + ' BAR';
    }
  }, 1000);
  if (wave && !reduceMotion) {
    let p = 0;
    const draw = () => {
      p += 0.06;
      let d = 'M0 20';
      for (let x = 0; x <= 300; x += 6) {
        const spike = (Math.abs(((x + p * 40) % 120) - 60) < 4) ? -14 : 0;
        const y = 20 + Math.sin(x * 0.06 + p) * 5 + Math.sin(x * 0.17 + p * 1.7) * 2 + spike;
        d += ` L${x} ${y.toFixed(1)}`;
      }
      wave.setAttribute('d', d);
      requestAnimationFrame(draw);
    };
    draw();
  }

  /* ---------- Header ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  const burger = $('#burger');
  const nav = $('#nav');
  function setNav(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
  }
  burger.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setNav(false)));

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.nav a[href^="#"]');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));

  /* ---------- Placeholder links ---------- */
  $$('[data-todo]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  /* ---------- Scroll reveals ---------- */
  if (hasGSAP && !reduceMotion) {
    $$('[data-reveal]').forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    // service + office cards flip up in 3D
    ['.svc-grid', '.office-grid'].forEach((sel) => {
      const cards = $$(sel + ' > *');
      gsap.fromTo(cards,
        { rotateX: -35, y: 80, opacity: 0, transformOrigin: '50% 100%' },
        {
          rotateX: 0, y: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1,
          scrollTrigger: { trigger: sel, start: 'top 82%', once: true },
          clearProps: 'transform'
        });
    });

    // hero copy drifts away as you scroll into the page
    gsap.to('.hero__inner', {
      yPercent: -18, opacity: 0.1, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // photo stack opens up in 3D as it scrolls through
    const stack = $('#photoStack');
    if (stack) {
      const st = { trigger: stack, start: 'top 85%', end: 'bottom 20%', scrub: 1 };
      gsap.fromTo('.pc-1', { rotateY: 22, rotateX: 8, z: 0, x: -40 }, { rotateY: -8, rotateX: -2, z: 120, x: 0, ease: 'none', scrollTrigger: st });
      gsap.fromTo('.pc-2', { rotateY: 22, rotateX: 8, z: -40, x: -60 }, { rotateY: -8, rotateX: -2, z: 20, x: 20, ease: 'none', scrollTrigger: st });
      gsap.fromTo('.pc-3', { rotateY: 22, rotateX: 8, z: -140, y: 40 }, { rotateY: -8, rotateX: -2, z: -60, y: -20, ease: 'none', scrollTrigger: st });
      gsap.fromTo('.photo-stack__badge', { y: 60, rotate: 6 }, { y: -20, rotate: -4, ease: 'none', scrollTrigger: st });
    }

    // timeline rail fills on scroll
    if ($('#railFill')) {
      gsap.to('#railFill', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: '#timeline', start: 'top 75%', end: 'bottom 55%', scrub: 0.6 }
      });
      $$('.step__dot').forEach((dot, i, arr) => {
        gsap.fromTo(dot, { scale: 0.5, borderColor: '#2a3530' }, {
          scale: 1, borderColor: i > arr.length * 0.6 ? '#ff5a1f' : '#22c55e', ease: 'back.out(3)',
          scrollTrigger: { trigger: '#timeline', start: () => `top+=${i * 30} 75%`, toggleActions: 'play none none reverse' }
        });
      });
    }

    // CTA background parallax
    gsap.fromTo('.cta__bg', { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    // giant footer word
    gsap.from('.footer__giant', {
      yPercent: 40, opacity: 0, ease: 'expo.out', duration: 1.6,
      scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true }
    });
  } else {
    $$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------- 3D tilt cards ---------- */
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduceMotion) {
    $$('.tilt').forEach((card) => {
      let raf = null;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transition = 'transform .1s linear, border-color .4s, box-shadow .5s';
          card.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 12}deg) rotateY(${(px - 0.5) * 14}deg) translateZ(10px)`;
          card.style.setProperty('--mx', px * 100 + '%');
          card.style.setProperty('--my', py * 100 + '%');
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        card.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1), border-color .4s, box-shadow .5s';
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
      });
    });

    // Why-us layered parallax
    const wv = $('#whyVisual');
    if (wv) {
      const layers = [
        [$('.why__layer--img', wv), 10, 0],
        [$('.why__layer--card', wv), 26, 80],
        [$('.why__layer--ring', wv), -18, -40]
      ];
      wv.addEventListener('pointermove', (e) => {
        const r = wv.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        layers.forEach(([el, amt, z]) => {
          if (!el) return;
          el.style.transition = 'transform .15s linear';
          el.style.transform = `translate3d(${x * amt}px, ${y * amt}px, ${z}px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
        });
      });
      wv.addEventListener('pointerleave', () => layers.forEach(([el]) => {
        if (!el) return;
        el.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1)';
        el.style.transform = '';
      }));
    }
  }

  /* ---------- Mission/Vision flip on tap (touch) ---------- */
  $$('.flip').forEach((f) => {
    f.addEventListener('click', () => { if (!finePointer) f.classList.toggle('is-flipped'); });
    f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('is-flipped'); } });
  });

  /* ---------- Accordion: one open at a time ---------- */
  const accItems = $$('.acc__item');
  accItems.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) accItems.forEach((o) => { if (o !== d) o.open = false; });
  }));

  /* ---------- 3D photo ring ---------- */
  const ring = $('#ring');
  const stage = $('#ringStage');
  if (ring && stage) {
    const figs = $$('figure', ring);
    const N = figs.length;
    let radius = 0;
    function placeRing() {
      const w = figs[0].getBoundingClientRect().width || 280;
      radius = Math.round((w / 2) / Math.tan(Math.PI / N)) + 40;
      figs.forEach((f, i) => { f.style.transform = `rotateY(${(360 / N) * i}deg) translateZ(${radius}px)`; });
    }
    placeRing();
    window.addEventListener('resize', placeRing);

    let angle = 0, vel = reduceMotion ? 0 : 0.12, dragging = false, lastX = 0, tiltX = -6;
    let inView = false;
    new IntersectionObserver((e) => { inView = e[0].isIntersecting; }).observe(stage);

    stage.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      vel = dx * 0.25;
      angle += dx * 0.25;
    });
    const end = () => { dragging = false; };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    (function spin() {
      requestAnimationFrame(spin);
      if (!inView) return;
      if (!dragging) {
        const base = reduceMotion ? 0 : 0.12;
        vel += (base - vel) * 0.03;
        angle += vel;
      }
      ring.style.transform = `translateZ(${-radius}px) rotateX(${tiltX}deg) rotateY(${angle}deg)`;
    })();
  }

  /* ---------- Scroll safety bar + mobile action bar ---------- */
  const safetyBar = $('#safetyBar');
  const mbar = $('.mbar');
  let barTick = false;
  function updateBars() {
    barTick = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    if (safetyBar) safetyBar.style.transform = `scaleX(${p.toFixed(4)})`;
    if (mbar) mbar.classList.toggle('is-visible', window.scrollY > 240);
  }
  window.addEventListener('scroll', () => { if (!barTick) { barTick = true; requestAnimationFrame(updateBars); } }, { passive: true });
  updateBars();

  /* ---------- Fire → Safe scroll story ---------- */
  const story = $('#story');
  if (story) {
    const bld = $('#bld');
    const flames = $('#flames');
    const glowEl = $('.fire-glow', bld);
    const smokeEl = $('.smoke', bld);
    const steps = $$('.story__step', story);
    const dots = $$('.story__dots li', story);
    const arc = $('#gaugeArc');
    const needle = $('#needle');
    const safetyVal = $('#safetyVal');
    const safetyLabel = $('#safetyLabel');
    const tempVal = $('#tempVal');
    const smokeVal = $('#smokeVal');
    const statusVal = $('#statusVal');
    const storyBar = $('#storyBar');
    const STATUS = ['NORMAL', 'SMOKE DETECTED', 'ALARM · CD ALERTED', 'SUPPRESSING', 'ALL CLEAR'];
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    let lastStage = -1;
    let ticking = false;

    function renderStory() {
      ticking = false;
      const r = story.getBoundingClientRect();
      const total = story.offsetHeight - window.innerHeight;
      const p = reduceMotion ? 1 : Math.min(1, Math.max(0, -r.top / Math.max(1, total)));

      const fire = ss(0.03, 0.3, p) * (1 - ss(0.52, 0.8, p));
      const smoke = ss(0.08, 0.34, p) * (1 - ss(0.6, 0.9, p));
      const stage = p < 0.2 ? 0 : p < 0.34 ? 1 : p < 0.5 ? 2 : p < 0.85 ? 3 : 4;

      flames.setAttribute('transform', `translate(100 246) scale(${Math.max(0.001, fire).toFixed(3)}) translate(-100 -246)`);
      glowEl.style.opacity = (fire * 0.95).toFixed(3);
      smokeEl.style.opacity = smoke.toFixed(3);

      bld.classList.toggle('is-detect', p > 0.2 && p < 0.85);
      bld.classList.toggle('is-alarm', p > 0.34 && p < 0.85);
      bld.classList.toggle('is-spray', p > 0.5 && p < 0.86);
      bld.classList.toggle('is-safe', p >= 0.85);

      const level = Math.round(100 - 84 * Math.max(fire, smoke * 0.7));
      arc.style.strokeDashoffset = String(100 - level);
      needle.style.transform = `rotate(${(-90 + 180 * level / 100).toFixed(1)}deg)`;
      needle.style.transformOrigin = '100px 100px';
      safetyVal.textContent = level;
      const lv = level < 40 ? 'danger' : level < 75 ? 'warn' : 'safe';
      story.dataset.level = lv;
      safetyLabel.textContent = lv === 'danger' ? 'DANGER' : lv === 'warn' ? 'WARNING' : 'SAFE';
      tempVal.textContent = Math.round(24 + 540 * fire) + '°C';
      smokeVal.textContent = Math.round(smoke * 100) + '%';
      if (storyBar) storyBar.style.transform = `scaleX(${p.toFixed(4)})`;

      if (stage !== lastStage) {
        lastStage = stage;
        story.dataset.stage = stage;
        statusVal.textContent = STATUS[stage];
        steps.forEach((s, i) => { s.classList.toggle('is-active', i === stage); s.classList.toggle('is-past', i < stage); });
        dots.forEach((d, i) => d.classList.toggle('is-on', i === stage));
      }
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(renderStory); } }, { passive: true });
    window.addEventListener('resize', renderStory);
    renderStory();
  }

  /* ---------- Quote modal ---------- */
  const modal = $('#quoteModal');
  const form = $('#quoteForm');
  let lastFocus = null;
  function openQuote(service) {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-locked');
    if (service) {
      const sel = form.elements.service;
      const opt = Array.from(sel.options).find((o) => o.text === service);
      if (opt) sel.value = opt.value;
    }
    setTimeout(() => form.elements.name.focus(), 50);
  }
  function closeQuote() {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    lastFocus && lastFocus.focus();
  }
  $$('[data-open-quote]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    setNav(false);
    openQuote(b.dataset.openQuote || '');
  }));
  $$('[data-close-quote]').forEach((b) => b.addEventListener('click', closeQuote));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeQuote(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const subject = `Quote request — ${f.service.value} (${f.emirate.value})`;
    const body = [
      `Name: ${f.name.value}`,
      `Phone: ${f.phone.value}`,
      `Email: ${f.email.value}`,
      `Service: ${f.service.value}`,
      `Emirate: ${f.emirate.value}`,
      '',
      f.message.value
    ].join('\n');
    window.location.href = `mailto:sales@firestonefs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    closeQuote();
  });
})();
