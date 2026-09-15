/* КЭТАЛИЗАТОР · интерактив и моушен.
   Без библиотек: IntersectionObserver, CSS-анимации, pointer-события.
   Скролл-листенеров нет: состояние шапки, активный раздел и появления
   считаются через IntersectionObserver. */
(() => {
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  root.classList.add('is-ready');

  /* ---------- пословная разбивка заголовков ---------- */
  const split = el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = d.createElement('span');
            w.className = 'w';
            const inner = d.createElement('span');
            inner.style.setProperty('--wi', i++);
            inner.textContent = part;
            w.append(inner);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  };
  if (!reduce) $$('[data-split]').forEach(split);

  /* ---------- появление при скролле ---------- */
  const revealTargets = $$('[data-reveal],[data-split],.chart,.flow,.chain,.plan,.method-media,.app-stage');
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  revealTargets.forEach(el => revealIO.observe(el));

  /* ---------- шапка: фон после начала скролла ---------- */
  const sentinel = $('#scroll-sentinel');
  if (sentinel) {
    new IntersectionObserver(([e]) => root.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);
  }

  /* ---------- активный раздел в навигации ---------- */
  const nav = $('.nav');
  const indicator = $('.nav-indicator');
  const navLinks = $$('.nav a[href^="#"], .sheet-nav a[href^="#"]');
  const moveIndicator = link => {
    if (!indicator) return;
    if (!link) { indicator.style.opacity = '0'; return; }
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
    indicator.style.opacity = '1';
  };
  let current = null;
  const setActive = id => {
    if (id === current) return;
    current = id;
    navLinks.forEach(a => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    moveIndicator(nav && id ? $(`a[href="#${id}"]`, nav) : null);
  };
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setActive(e.target.dataset.nav || null); });
  }, { rootMargin: '-42% 0px -56% 0px' });
  $$('main > section').forEach(s => navIO.observe(s));
  addEventListener('resize', () => nav && current && moveIndicator($(`a[href="#${current}"]`, nav)), { passive: true });

  /* ---------- мобильная шторка ---------- */
  const sheet = $('#menu');
  const menuBtn = $('.menu-btn');
  let lastFocus = null;
  const focusables = () => $$('a[href], button:not([disabled])', sheet).filter(el => !el.hidden);
  const setSheet = (open, restore = true) => {
    sheet.classList.toggle('is-open', open);
    sheet.setAttribute('aria-hidden', String(!open));
    sheet.inert = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    root.classList.toggle('is-locked', open);
    if (open) setTimeout(() => focusables()[0]?.focus(), 60);
    else if (restore) menuBtn.focus();
  };
  if (sheet && menuBtn) {
    setSheet(false, false);
    menuBtn.addEventListener('click', () => setSheet(!sheet.classList.contains('is-open')));
    $$('[data-close]', sheet).forEach(el => el.addEventListener('click', () => setSheet(false)));
    $$('a', sheet).forEach(a => a.addEventListener('click', () => setSheet(false, false)));
    sheet.addEventListener('keydown', e => {
      if (e.key === 'Escape') setSheet(false);
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    matchMedia('(min-width: 1024px)').addEventListener('change', e => e.matches && setSheet(false, false));
  }

  /* ---------- мобильный док: виден между hero и блоком записи ---------- */
  const dock = $('.dock');
  const hero = $('.hero');
  const trial = $('#trial');
  if (dock && hero && trial) {
    const seen = new Map([[hero, true], [trial, false]]);
    const sync = () => {
      const show = !seen.get(hero) && !seen.get(trial);
      dock.classList.toggle('is-visible', show);
      dock.inert = !show;
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => seen.set(e.target, e.isIntersecting));
      sync();
    });
    io.observe(hero);
    io.observe(trial);
    sync();
  }

  /* ---------- счётчики ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const to = +el.dataset.count;
      if (reduce) return;
      const t0 = performance.now();
      const tick = t => {
        const p = Math.min((t - t0) / 1100, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- тарифы: точки занятий ---------- */
  $$('.dots').forEach(box => {
    const base = +box.dataset.base;
    const bonus = +box.dataset.bonus;
    const frag = d.createDocumentFragment();
    for (let i = 0; i < base + bonus; i++) {
      const dot = d.createElement('i');
      if (i >= base) dot.className = 'bonus';
      dot.style.setProperty('--i', i);
      frag.append(dot);
    }
    box.append(frag);
  });

  /* ---------- цепочка «Мой подход»: линия через все атомы ---------- */
  const chain = $('.chain');
  const chainSvg = chain && $('.chain-svg', chain);
  const drawChain = () => {
    // offset* не учитывают transform, поэтому линия не «съезжает»,
    // пока карточки ещё в стартовой позиции анимации появления.
    const box = { width: chain.clientWidth, height: chain.clientHeight };
    const pts = $$('.atom', chain).map(a => {
      const s = a.offsetParent;
      return [s.offsetLeft + a.offsetLeft + a.offsetWidth / 2, s.offsetTop + a.offsetTop + a.offsetHeight / 2];
    });
    if (pts.length < 2) return;
    // Соединяем только соседей по строке или по колонке: переход на новую
    // строку сетки не рисуем, иначе линия режет карточки по диагонали.
    let path = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const aligned = Math.abs(y0 - y1) < 1 || Math.abs(x0 - x1) < 1;
      path += `${aligned ? ' L' : ' M'}${x1},${y1}`;
    }
    chainSvg.setAttribute('width', box.width);
    chainSvg.setAttribute('height', box.height);
    chainSvg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    $('path', chainSvg).setAttribute('d', path);
  };
  // ResizeObserver срабатывает сразу после первой раскладки и при смене
  // шрифтов/ширины, поэтому отдельный синхронный вызов не нужен.
  if (chainSvg) new ResizeObserver(drawChain).observe(chain);

  /* ---------- материалы: колода + просмотр ---------- */
  const deck = $('.deck');
  if (deck) {
    const cards = $$('.deck-card', deck);
    const tabs = $$('.mat-tab');
    const caption = $('.mat-caption');
    const lightbox = $('#lightbox');
    const lbImg = lightbox && $('img', lightbox);
    let active = 0;
    const show = idx => {
      active = (idx + cards.length) % cards.length;
      cards.forEach((c, i) => {
        const pos = (i - active + cards.length) % cards.length;
        c.dataset.pos = pos;
        c.tabIndex = pos === 0 ? 0 : -1;
        c.setAttribute('aria-hidden', String(pos !== 0));
      });
      tabs.forEach((t, i) => {
        t.setAttribute('aria-selected', String(i === active));
        t.tabIndex = i === active ? 0 : -1;
      });
      if (caption) caption.textContent = cards[active].dataset.caption || '';
    };
    const open = () => {
      if (!lightbox?.showModal) return;
      const c = cards[active];
      lbImg.src = c.dataset.full;
      lbImg.alt = $('img', c).alt;
      lightbox.showModal();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        show(active + (e.key === 'ArrowRight' ? 1 : -1));
        tabs[active].focus();
      });
    });
    cards.forEach((c, i) => c.addEventListener('click', () => (i === active ? open() : show(i))));
    $('.deck-zoom')?.addEventListener('click', open);
    lightbox?.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
    show(0);
  }

  /* ---------- маскот реагирует на CTA пробного урока ---------- */
  const trialCard = $('.trial-card');
  if (trialCard) {
    if (fine) {
      let t;
      $$('.trial-cta .btn', trialCard).forEach(b => {
        const on = () => { clearTimeout(t); trialCard.classList.add('is-react'); };
        const off = () => { t = setTimeout(() => trialCard.classList.remove('is-react'), 500); };
        b.addEventListener('pointerenter', on);
        b.addEventListener('focus', on);
        b.addEventListener('pointerleave', off);
        b.addEventListener('blur', off);
      });
    } else {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        setTimeout(() => trialCard.classList.add('is-react'), 700);
        io.disconnect();
      }, { threshold: 0.5 });
      io.observe(trialCard);
    }
  }

  /* ---------- pointer-эффекты: только мышь и без reduced motion ---------- */
  if (fine && !reduce) {
    const layers = $$('[data-depth]');
    if (hero && layers.length) {
      let raf = 0, nx = 0, ny = 0;
      const apply = () => {
        raf = 0;
        layers.forEach(l => {
          const k = +l.dataset.depth;
          l.style.transform = `translate3d(${(nx * k).toFixed(1)}px,${(ny * k).toFixed(1)}px,0)`;
        });
      };
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        nx = (e.clientX - r.left) / r.width - 0.5;
        ny = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(apply);
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { nx = ny = 0; if (!raf) raf = requestAnimationFrame(apply); });
    }

    $$('.spot').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });
    });

    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--bx', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
        el.style.setProperty('--by', `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
      }, { passive: true });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--bx', '0px');
        el.style.setProperty('--by', '0px');
      });
    });
  }

  /* ---------- цели аналитики для записи ---------- */
  $$('[data-booking]').forEach(a => a.addEventListener('click', () => {
    const goal = `booking_${a.dataset.booking}`;
    try { window.ym?.(112295779, 'reachGoal', goal); } catch (_) {}
    try { window.gtag?.('event', goal); } catch (_) {}
  }));

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- ссылки из data.json (владелец может поменять их там) ---------- */
  const loadLinks = () => fetch('/data.json').then(r => (r.ok ? r.json() : null)).then(data => {
    const L = data?.links;
    if (!L) return;
    const ok = u => u && u !== '#';
    const social = { max: L.max, telegram: L.telegramChannel, vk: L.vk, youtube: L.youtube };
    const booking = { telegram: L.telegramBooking || L.trialBot, max: L.maxBooking || L.max };
    $$('[data-social]').forEach(a => {
      const u = social[a.dataset.social];
      if (ok(u)) { a.href = u; a.hidden = false; }
    });
    $$('[data-booking]').forEach(a => { const u = booking[a.dataset.booking]; if (ok(u)) a.href = u; });
  }).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(loadLinks, { timeout: 3000 });
  else setTimeout(loadLinks, 1500);
})();
