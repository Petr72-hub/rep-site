(() => {
  const mq = window.matchMedia('(max-width:1100px)');

  /* ------------------------------------------------------------------
     Мобильное меню.
     Кроме открытия/закрытия по кнопке: Esc, клик мимо меню, поворот
     экрана и переход на десктопную ширину. Пока меню открыто, фон
     не прокручивается, а закрытое меню недоступно с клавиатуры.
     ------------------------------------------------------------------ */
  const menuBtn = document.querySelector('.menu-button');
  const mobileMenu = document.querySelector('.mobile-menu');

  const setMenu = open => {
    if (!menuBtn || !mobileMenu) return;
    menuBtn.classList.toggle('active', open);
    mobileMenu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mobileMenu.setAttribute('aria-hidden', String(!open));
    // Закрытое меню не должно ловить фокус табом.
    mobileMenu.querySelectorAll('a').forEach(a => a.tabIndex = open ? 0 : -1);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  if (menuBtn && mobileMenu) {
    setMenu(false);
    menuBtn.addEventListener('click', () => setMenu(!menuBtn.classList.contains('active')));
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menuBtn.classList.contains('active')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    document.addEventListener('click', e => {
      if (!menuBtn.classList.contains('active')) return;
      if (mobileMenu.contains(e.target) || menuBtn.contains(e.target)) return;
      setMenu(false);
    });
    mq.addEventListener('change', e => { if (!e.matches) setMenu(false); });
  }

  /* ------------------------------------------------------------------
     Состояние шапки и подсветка активного раздела.
     Считаем по getBoundingClientRect (а не offsetTop): секции лежат
     внутри разных обёрток, и offsetTop у них отсчитывается от разных
     родителей. Пересчёт — раз в кадр.
     ------------------------------------------------------------------ */
  const siteHeader = document.querySelector('.site-header');
  const navLinks = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
  const navTargets = navLinks
    .map(link => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter(item => item.section);

  let ticking = false;
  const updateHeaderState = () => {
    ticking = false;
    siteHeader?.classList.toggle('scrolled', window.scrollY > 28);

    const marker = Math.min(window.innerHeight * 0.32, 260);
    let current = null;
    navTargets.forEach(item => {
      if (item.section.getBoundingClientRect().top <= marker) current = item;
    });
    navLinks.forEach(link => link.classList.remove('active'));
    current?.link.classList.add('active');
  };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateHeaderState);
  };
  updateHeaderState();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  /* ---------------------- Появление блоков при скролле ---------------- */
  const revealEls = [...document.querySelectorAll('.reveal')];
  revealEls.forEach(el => {
    const delay = el.dataset.delay || 0;
    el.style.transitionDelay = `${delay}ms`;
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));

  /* ---------------------- Лента материалов ---------------------------- */
  const rail = document.querySelector('.materials-rail');
  const prev = document.querySelector('.rail-prev');
  const next = document.querySelector('.rail-next');
  const moveRail = direction => {
    if (!rail) return;
    const card = rail.querySelector('.material-card');
    if (!card) return;
    rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + 20), behavior: 'smooth' });
  };
  prev?.addEventListener('click', () => moveRail(-1));
  next?.addEventListener('click', () => moveRail(1));
  // Стрелки бесполезны, когда прокручивать нечего.
  const syncRailButtons = () => {
    if (!rail || !prev || !next) return;
    const max = rail.scrollWidth - rail.clientWidth - 1;
    prev.disabled = rail.scrollLeft <= 0;
    next.disabled = rail.scrollLeft >= max;
  };
  rail?.addEventListener('scroll', syncRailButtons, { passive: true });
  window.addEventListener('resize', syncRailButtons, { passive: true });
  syncRailButtons();

  /* ---------------------- Подсветка за курсором ----------------------- */
  const glow = document.querySelector('.cursor-glow');
  if (glow && matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', e => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }, { passive: true });
  } else if (glow) {
    glow.remove();
  }

  /* ------------------------------------------------------------------
     Ссылки из data.json (нужен локальный или обычный веб-сервер).
     Весь контент уже есть в index.html, поэтому при открытии файла
     напрямую сайт работает — просто без переопределения ссылок.
     ------------------------------------------------------------------ */
  const applyLink = (el, url) => {
    if (!url || url === '#') return;
    el.href = url;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  };

  // Абсолютный путь: со страниц в подпапках (/blog/...) относительный
  // 'data.json' резолвился бы в /blog/data.json и всегда давал 404.
  fetch('/data.json').then(r => r.ok ? r.json() : null).then(data => {
    if (!data?.links) return;
    const L = data.links;

    // Важно: якоря "#trial" — это внутренняя прокрутка к блоку записи.
    // Их подменять на внешний адрес нельзя, иначе кнопки в шапке и в
    // hero перестанут вести к секции пробного урока.
    const socialMap = { max: L.max, telegram: L.telegramChannel, vk: L.vk, youtube: L.youtube };
    const bookingMap = { telegram: L.telegramBooking || L.trialBot, max: L.maxBooking || L.max };

    document.querySelectorAll('[data-social]').forEach(el => applyLink(el, socialMap[el.dataset.social]));
    document.querySelectorAll('[data-booking]').forEach(el => applyLink(el, bookingMap[el.dataset.booking]));

    document.querySelectorAll('.footer-links a').forEach(a => {
      const label = a.textContent.trim();
      if (label === 'Telegram-канал') applyLink(a, L.telegramChannel);
      if (label === 'Бот для записи') applyLink(a, L.trialBot);
      if (label === 'Написать Петру') applyLink(a, L.contact);
    });

    // Соцсеть без ссылки просто не показываем — «мёртвая» иконка хуже,
    // чем её отсутствие.
    document.querySelectorAll('[data-social]').forEach(el => {
      if (el.getAttribute('href') === '#') el.hidden = true;
    });
  }).catch(() => {});
})();
