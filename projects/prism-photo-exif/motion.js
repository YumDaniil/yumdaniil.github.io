/* Prism Photo EXIF v3 — light motion layer.
   Adds ambience and feedback without touching the metadata pipeline. */
(() => {
  'use strict';

  const root = document.documentElement;
  const shell = document.querySelector('.app-shell');
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  let reduced = Boolean(reduceQuery && reduceQuery.matches);
  let progressFrame = null;

  root.classList.add('v3-js');

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* Reading progress: a quiet line above the header. */
  const progressBar = document.getElementById('pageProgressBar');
  const updateProgress = () => {
    if (!progressBar) return;
    const scrolling = document.scrollingElement || root;
    const max = Math.max(1, (scrolling.scrollHeight || 0) - (window.innerHeight || 0));
    const value = clamp((window.scrollY || scrolling.scrollTop || 0) / max, 0, 1);
    progressBar.style.width = `${(value * 100).toFixed(2)}%`;
    progressBar.style.opacity = value > 0.012 ? '1' : '0.28';
  };
  const scheduleProgress = () => {
    if (progressFrame !== null) return;
    progressFrame = window.requestAnimationFrame(() => {
      progressFrame = null;
      updateProgress();
    });
  };
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress, { passive: true });
  updateProgress();

  /* A soft pointer light, never a custom cursor. */
  if (shell && finePointer) {
    let pointerFrame = null;
    let px = 50;
    let py = 24;
    const applyPointer = () => {
      pointerFrame = null;
      shell.style.setProperty('--pointer-x', `${px.toFixed(2)}%`);
      shell.style.setProperty('--pointer-y', `${py.toFixed(2)}%`);
    };
    window.addEventListener('pointermove', (event) => {
      if (reduced || event.pointerType === 'touch') return;
      px = clamp((event.clientX / Math.max(1, window.innerWidth)) * 100, 0, 100);
      py = clamp((event.clientY / Math.max(1, window.innerHeight)) * 100, 0, 100);
      if (pointerFrame === null) pointerFrame = window.requestAnimationFrame(applyPointer);
    }, { passive: true });
  }

  /* Reveal below-the-fold pieces without hiding them when JS is absent. */
  const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && !reduced) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  /* Hero tilt, deliberately tiny. */
  const heroScan = document.querySelector('.hero-scan');
  if (heroScan && finePointer) {
    let heroFrame = null;
    let tx = 0;
    let ty = 0;
    const applyHero = () => {
      heroFrame = null;
      heroScan.style.setProperty('--hero-tilt-x', `${tx.toFixed(2)}deg`);
      heroScan.style.setProperty('--hero-tilt-y', `${ty.toFixed(2)}deg`);
    };
    heroScan.addEventListener('pointermove', (event) => {
      if (reduced || event.pointerType === 'touch') return;
      const rect = heroScan.getBoundingClientRect();
      tx = clamp((event.clientY - (rect.top + rect.height / 2)) / rect.height * -5, -4, 4);
      ty = clamp((event.clientX - (rect.left + rect.width / 2)) / rect.width * 6, -5, 5);
      if (heroFrame === null) heroFrame = window.requestAnimationFrame(applyHero);
    }, { passive: true });
    heroScan.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      if (heroFrame === null) heroFrame = window.requestAnimationFrame(applyHero);
    }, { passive: true });
  }

  /* A photo card gets a state class only after a real preview appears. */
  const photoPreview = document.getElementById('photoPreview');
  const photoCard = document.querySelector('.photo-card');
  const syncPhotoState = () => {
    if (!photoPreview || !photoCard) return;
    const loaded = !photoPreview.hidden && Boolean(photoPreview.querySelector('img[src]'));
    photoCard.classList.toggle('has-photo', loaded);
  };
  syncPhotoState();
  if (photoPreview) {
    new MutationObserver(syncPhotoState).observe(photoPreview, {
      attributes: true,
      attributeFilter: ['hidden'],
      subtree: true,
      childList: true,
    });
  }

  /* A quiet meter for the cleanup panel: categories chosen, not a fake byte count. */
  const cleanMeter = document.getElementById('cleanMeter');
  const cleanOptions = document.getElementById('cleanOptions');
  const syncCleanMeter = () => {
    if (!cleanMeter || !cleanOptions) return;
    const boxes = Array.from(cleanOptions.querySelectorAll('input[type="checkbox"]'));
    const checked = boxes.filter((box) => box.checked).length;
    const all = document.getElementById('optAll');
    const ratio = all && all.checked ? 1 : (boxes.length ? checked / boxes.length : 0);
    cleanMeter.style.width = `${(ratio * 100).toFixed(1)}%`;
    cleanMeter.classList.toggle('is-active', checked > 0);
  };
  syncCleanMeter();
  if (cleanOptions) {
    cleanOptions.addEventListener('change', syncCleanMeter);
    new MutationObserver(syncCleanMeter).observe(cleanOptions, {
      attributes: true,
      attributeFilter: ['checked', 'disabled'],
      subtree: true,
    });
  }

  /* A restrained press ripple on buttons. */
  document.addEventListener('pointerdown', (event) => {
    if (reduced || event.pointerType === 'touch') return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ripple = document.createElement('span');
    ripple.className = 'v3-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    ripple.style.setProperty('--ripple-size', `${Math.max(rect.width, rect.height) * 1.6}px`);
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 600);
  }, { passive: true });

  const syncMotionPreference = () => {
    reduced = Boolean(reduceQuery && reduceQuery.matches);
    root.classList.toggle('v3-reduced', reduced);
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

  window.requestAnimationFrame(() => root.classList.add('v3-ready'));
})();
