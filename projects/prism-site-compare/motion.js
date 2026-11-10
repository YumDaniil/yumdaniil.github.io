/* Prism Site Compare v4 — visual motion layer.
   No dependencies. All effects are decorative and removable. */
(() => {
  'use strict';

  const root = document.documentElement;
  const shell = document.getElementById('appShell');
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  let reduced = Boolean(reduceQuery && reduceQuery.matches);
  let frame = null;

  root.classList.add('v4-js');

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* Scroll progress in the fixed hairline above the header. */
  const progressBar = document.getElementById('pageProgressBar');
  const updateProgress = () => {
    if (!progressBar) return;
    const scrolling = document.scrollingElement || root;
    const max = Math.max(1, (scrolling.scrollHeight || 0) - (window.innerHeight || 0));
    const value = clamp((window.scrollY || scrolling.scrollTop || 0) / max, 0, 1);
    progressBar.style.width = `${(value * 100).toFixed(2)}%`;
    progressBar.style.opacity = value > 0.015 ? '1' : '0.35';
  };

  const scheduleProgress = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      updateProgress();
    });
  };

  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress, { passive: true });
  updateProgress();

  /* Soft light follows the pointer, but never becomes a custom cursor. */
  if (shell && finePointer) {
    let pointerFrame = null;
    let pointerX = 50;
    let pointerY = 30;
    const applyPointer = () => {
      pointerFrame = null;
      shell.style.setProperty('--pointer-x', `${pointerX.toFixed(2)}%`);
      shell.style.setProperty('--pointer-y', `${pointerY.toFixed(2)}%`);
    };
    window.addEventListener('pointermove', (event) => {
      if (reduced || event.pointerType === 'touch') return;
      pointerX = clamp((event.clientX / Math.max(1, window.innerWidth)) * 100, 0, 100);
      pointerY = clamp((event.clientY / Math.max(1, window.innerHeight)) * 100, 0, 100);
      if (pointerFrame === null) pointerFrame = window.requestAnimationFrame(applyPointer);
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      pointerX = 50;
      pointerY = 30;
      if (pointerFrame === null) pointerFrame = window.requestAnimationFrame(applyPointer);
    }, { passive: true });
  }

  /* Reveal sections as they enter the viewport. */
  const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && !reduced) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  /* Mark a drop card when it actually has a decoded file. */
  const fileBindings = [
    ['beforeDropZone', 'beforeFileName'],
    ['afterDropZone', 'afterFileName'],
  ];
  const syncFileCards = () => {
    fileBindings.forEach(([zoneId, nameId]) => {
      const zone = document.getElementById(zoneId);
      const name = document.getElementById(nameId);
      if (!zone || !name) return;
      const filled = name.textContent.trim() !== 'Файл не выбран';
      zone.classList.toggle('has-file', filled);
    });
  };
  syncFileCards();
  const nameObserver = new MutationObserver(syncFileCards);
  fileBindings.forEach(([, nameId]) => {
    const node = document.getElementById(nameId);
    if (node) nameObserver.observe(node, { childList: true, characterData: true, subtree: true });
  });

  /* A restrained press ripple on real buttons. */
  document.addEventListener('pointerdown', (event) => {
    if (reduced || event.pointerType === 'touch') return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ripple = document.createElement('span');
    ripple.className = 'v4-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    ripple.style.setProperty('--ripple-size', `${Math.max(rect.width, rect.height) * 1.5}px`);
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 620);
  }, { passive: true });

  /* Pointer parallax for the small compare motif. */
  const orbit = document.querySelector('.compare-orbit');
  if (orbit && finePointer) {
    let orbitFrame = null;
    let targetX = 0;
    let targetY = 0;
    const setOrbit = () => {
      orbitFrame = null;
      orbit.style.setProperty('--orbit-x', `${targetX.toFixed(2)}px`);
      orbit.style.setProperty('--orbit-y', `${targetY.toFixed(2)}px`);
    };
    window.addEventListener('pointermove', (event) => {
      if (reduced || event.pointerType === 'touch') return;
      const rect = orbit.getBoundingClientRect();
      targetX = clamp((event.clientX - (rect.left + rect.width / 2)) / rect.width * 12, -8, 8);
      targetY = clamp((event.clientY - (rect.top + rect.height / 2)) / rect.height * 10, -7, 7);
      if (orbitFrame === null) orbitFrame = window.requestAnimationFrame(setOrbit);
    }, { passive: true });
  }

  const syncMotionPreference = () => {
    reduced = Boolean(reduceQuery && reduceQuery.matches);
    root.classList.toggle('v4-reduced', reduced);
    if (reduced) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
    }
  };
  if (reduceQuery) {
    if (typeof reduceQuery.addEventListener === 'function') {
      reduceQuery.addEventListener('change', syncMotionPreference);
    } else if (typeof reduceQuery.addListener === 'function') {
      reduceQuery.addListener(syncMotionPreference);
    }
  }
  syncMotionPreference();

  window.requestAnimationFrame(() => root.classList.add('v4-ready'));
})();
