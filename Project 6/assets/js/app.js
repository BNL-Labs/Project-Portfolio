(function () {
  const cfg = window.UPDOFUS || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sendEvent(eventName, payload) {
    const data = { event: eventName, payload: payload || {} };

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload || {});
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: eventName }, payload || {}));
    }

    if (!cfg.eventEndpoint) {
      return;
    }

    const body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(cfg.eventEndpoint, blob);
      return;
    }

    fetch(cfg.eventEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(function () {});
  }

  function sendOfferClick(offerId) {
    if (!offerId || !cfg.clickEndpoint) {
      return;
    }

    fetch(cfg.clickEndpoint + '?offer=' + encodeURIComponent(offerId), {
      method: 'GET',
      keepalive: true
    }).catch(function () {});
  }

  function initUserMenu() {
    const menu = document.querySelector('[data-user-menu]');
    if (!menu) return;

    const toggle = menu.querySelector('[data-user-toggle]');
    const dropdown = menu.querySelector('[data-user-dropdown]');
    if (!toggle || !dropdown) return;

    function closeMenu() {
      toggle.setAttribute('aria-expanded', 'false');
      dropdown.hidden = true;
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      dropdown.hidden = expanded;
    });

    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target)) {
        closeMenu();
      }
    });

    menu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
        toggle.focus();
      }
    });
  }

  function initCardSearch() {
    document.querySelectorAll('[data-search]').forEach(function (input) {
      const root = input.closest('section, .section, .container, body');
      const cards = root.querySelectorAll('[data-card]');

      function applyFilter() {
        const query = input.value.trim().toLowerCase();
        cards.forEach(function (card) {
          const hay = (card.getAttribute('data-hay') || '').toLowerCase();
          card.style.display = !query || hay.indexOf(query) !== -1 ? '' : 'none';
        });
      }

      input.addEventListener('input', applyFilter);
      applyFilter();
    });
  }

  function initFeedbackFilters() {
    const search = document.querySelector('[data-feedback-search]');
    const grid = document.querySelector('[data-feedback-grid]');
    if (!search || !grid) return;

    const chips = Array.from(document.querySelectorAll('[data-stars-filter]'));
    let threshold = 'all';

    function apply() {
      const query = search.value.trim().toLowerCase();
      grid.querySelectorAll('[data-feedback-card]').forEach(function (card) {
        const hay = (card.getAttribute('data-hay') || '').toLowerCase();
        const stars = parseInt(card.getAttribute('data-stars') || '5', 10);
        const byText = !query || hay.indexOf(query) !== -1;
        let byStars = true;

        if (threshold === '5') byStars = stars === 5;
        if (threshold === '4') byStars = stars >= 4;
        if (threshold === '3') byStars = stars >= 3;

        card.style.display = byText && byStars ? '' : 'none';
      });
    }

    search.addEventListener('input', apply);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (item) { item.classList.remove('active'); });
        chip.classList.add('active');
        threshold = chip.getAttribute('data-stars-filter') || 'all';
        apply();
      });
    });

    apply();
  }

  function initTrackedClicks() {
    document.addEventListener('click', function (event) {
      const target = event.target.closest('[data-track], [data-offer-id]');
      if (!target) return;

      const offerId = target.getAttribute('data-offer-id');
      if (offerId) {
        sendOfferClick(offerId);
      }

      const eventName = target.getAttribute('data-track');
      if (!eventName) return;

      const payload = {};
      Object.keys(target.dataset).forEach(function (key) {
        if (key === 'track') return;
        payload[key] = target.dataset[key];
      });
      sendEvent(eventName, payload);
    });
  }

  function initTrackedForms() {
    document.querySelectorAll('[data-track-submit]').forEach(function (form) {
      form.addEventListener('submit', function () {
        const eventName = form.getAttribute('data-track-submit');
        if (!eventName) return;
        sendEvent(eventName, { path: window.location.pathname });
      });
    });
  }

  function initFocusedOffer() {
    const focusContainer = document.querySelector('[data-focus]');
    if (!focusContainer) return;

    const focusId = focusContainer.getAttribute('data-focus');
    if (!focusId) return;

    const target = Array.from(document.querySelectorAll('[data-offer-id]')).find(function (item) {
      return item.getAttribute('data-offer-id') === focusId;
    });
    if (!target) return;

    const card = target.closest('.offer-card') || target;
    card.classList.add('pulse-focus');

    if (!reduceMotion) {
      setTimeout(function () {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }

  initUserMenu();
  initCardSearch();
  initFeedbackFilters();
  initTrackedClicks();
  initTrackedForms();
  initFocusedOffer();
})();
