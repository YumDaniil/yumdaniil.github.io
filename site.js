/* Prism Site v6 — optimized scroll motion and a bounded, dissolving pulse. */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var root = document.documentElement;
  if (!root) return;
  if (root.classList) root.classList.add('js');

  var menuToggle = document.getElementById('menu-toggle');
  var siteNav = document.getElementById('site-nav');
  var siteHeader = document.getElementById('site-header');
  var backToTop = document.getElementById('back-to-top');
  var pageProgress = document.getElementById('page-progress');
  var prism = document.getElementById('scroll-prism');
  var beamPath = document.getElementById('beam-path');
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var menuOpen = false;
  var frameRequest = null;
  var revealObserver = null;
  var beamLength = 0;
  var prismProgress = 0;
  var targetPrismProgress = 0;
  var prismCanScroll = false;
  var prismMotionFrame = null;
  var prismMotionLastTime = 0;
  var motionQuery = getMediaQuery('(prefers-reduced-motion: reduce)');
  var mobileQuery = getMediaQuery('(max-width: 680px)');
  var reducedMotion = Boolean(motionQuery && motionQuery.matches);
  var backToTopThreshold = 48;

  if (backToTop) {
    backToTop.setAttribute('aria-hidden', 'true');
    backToTop.tabIndex = -1;
  }

  function getMediaQuery(query) {
    if (typeof window.matchMedia !== 'function') return null;
    try {
      return window.matchMedia(query);
    } catch (error) {
      return null;
    }
  }

  function isMobileViewport() {
    return mobileQuery
      ? Boolean(mobileQuery.matches)
      : typeof window.innerWidth === 'number' && window.innerWidth <= 680;
  }

  function syncMenuVisibility() {
    if (!menuToggle || !siteNav) return;
    siteNav.hidden = isMobileViewport() && !menuOpen;
  }

  function setMenuOpen(open, restoreFocus) {
    if (!menuToggle || !siteNav) return;
    menuOpen = Boolean(open);
    menuToggle.setAttribute('aria-expanded', String(menuOpen));
    menuToggle.setAttribute('aria-label', menuOpen ? 'Закрыть меню' : 'Открыть меню');
    siteNav.classList.toggle('is-open', menuOpen);
    syncMenuVisibility();
    if (!menuOpen && restoreFocus && typeof menuToggle.focus === 'function') {
      menuToggle.focus();
    }
  }

  if (menuToggle && siteNav) {
    setMenuOpen(false, false);
    menuToggle.addEventListener('click', function () {
      setMenuOpen(!menuOpen, false);
    });

    siteNav.addEventListener('click', function (event) {
      var target = event.target;
      while (target && target !== siteNav) {
        if (target.tagName && target.tagName.toLowerCase() === 'a' && target.hasAttribute('href')) {
          setMenuOpen(false, false);
          return;
        }
        target = target.parentElement;
      }
    });

    document.addEventListener('keydown', function (event) {
      if ((event.key === 'Escape' || event.key === 'Esc') && menuOpen) {
        setMenuOpen(false, true);
      }
    });
  }

  function revealAll() {
    revealItems.forEach(function (item) {
      item.classList.add('is-visible');
    });
  }

  function setReducedMotionOverrides(enabled) {
    var targets = revealItems.slice();
    if (prism) targets.push(prism);
    if (pageProgress) targets.push(pageProgress);

    targets.forEach(function (element) {
      if (!element.style) return;
      if (enabled) {
        element.style.setProperty('transition', 'none', 'important');
        element.style.setProperty('animation', 'none', 'important');
      } else {
        element.style.removeProperty('transition');
        element.style.removeProperty('animation');
      }
    });
  }

  function setupRevealObserver() {
    if (revealObserver) {
      try {
        revealObserver.disconnect();
      } catch (error) {
        // Keep the fallback path available if an observer implementation fails.
      }
      revealObserver = null;
    }

    if (reducedMotion || typeof window.IntersectionObserver !== 'function') {
      revealAll();
      return;
    }

    try {
      revealObserver = new window.IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });

      revealItems.forEach(function (item) {
        if (!item.classList.contains('is-visible')) revealObserver.observe(item);
      });
    } catch (error) {
      if (revealObserver) {
        try {
          revealObserver.disconnect();
        } catch (disconnectError) {
          // Content is still made visible below.
        }
        revealObserver = null;
      }
      revealAll();
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readProgress() {
    var scrollingElement = document.scrollingElement || root;
    var body = document.body;
    var documentHeight = Math.max(
      scrollingElement ? scrollingElement.scrollHeight || 0 : 0,
      body ? body.scrollHeight || 0 : 0
    );
    var viewportHeight = window.innerHeight || root.clientHeight || 0;
    var maxScroll = Math.max(0, documentHeight - viewportHeight);
    var scrollTop = typeof window.scrollY === 'number'
      ? window.scrollY
      : (scrollingElement ? scrollingElement.scrollTop || 0 : 0);

    return {
      value: maxScroll > 1 ? clamp(scrollTop / maxScroll, 0, 1) : 0,
      canScroll: maxScroll > 1,
      scrollTop: scrollTop,
      maxScroll: maxScroll
    };
  }

  function setScrollVariable(name, value) {
    root.style.setProperty(name, value);
    if (prism && prism.style !== root.style) prism.style.setProperty(name, value);
  }

  function setPrismState(progress, canScroll) {
    if (!prism) return;

    if (reducedMotion || !canScroll) {
      setScrollVariable('--scroll-x', '0px');
      setScrollVariable('--scroll-y', '0px');
      setScrollVariable('--scroll-rotation', '-11deg');
      setScrollVariable('--scroll-scale', '1');
      setScrollVariable('--scroll-opacity', '1');
      return;
    }

    var phase = progress * Math.PI * 2;
    var x = Math.sin(phase * 1.5) * 46;
    var y = Math.cos(phase * 2) * 30 - progress * 38;
    var rotation = progress * 540 + Math.sin(phase * 2.5) * 24;
    var scale = 0.76 + 0.24 * (0.5 + 0.5 * Math.sin(phase * 3));
    var opacity = 0.42 + 0.58 * Math.sin(Math.PI * progress);

    setScrollVariable('--scroll-x', x.toFixed(2) + 'px');
    setScrollVariable('--scroll-y', y.toFixed(2) + 'px');
    setScrollVariable('--scroll-rotation', rotation.toFixed(2) + 'deg');
    setScrollVariable('--scroll-scale', scale.toFixed(3));
    setScrollVariable('--scroll-opacity', opacity.toFixed(3));
  }

  function setBeamState(progress, canScroll) {
    if (!beamPath) return;
    beamPath.style.setProperty('--beam-progress', String(progress));
    if (beamLength > 0) {
      beamPath.style.strokeDasharray = String(beamLength);
      beamPath.style.strokeDashoffset = reducedMotion || !canScroll
        ? '0'
        : String(beamLength * (1 - progress));
    }
  }

  function updateScrollState() {
    var pageState = readProgress();
    var state = reducedMotion
      ? { value: 0, canScroll: false }
      : pageState;
    var progress = state.value;
    var value = progress.toFixed(4);

    if (siteHeader) {
      siteHeader.classList.toggle('is-scrolled', pageState.scrollTop > 0);
    }

    if (backToTop) {
      var distanceToBottom = Math.max(0, pageState.maxScroll - pageState.scrollTop);
      var backToTopVisible = pageState.maxScroll > backToTopThreshold
        && distanceToBottom <= backToTopThreshold;
      backToTop.classList.toggle('is-visible', backToTopVisible);
      backToTop.setAttribute('aria-hidden', String(!backToTopVisible));
      backToTop.tabIndex = backToTopVisible ? 0 : -1;
    }

    root.style.setProperty('--page-progress', value);
    if (pageProgress) pageProgress.style.setProperty('--page-progress', value);
    targetPrismProgress = progress;
    prismCanScroll = state.canScroll;
    if (reducedMotion || !prismCanScroll) {
      prismProgress = targetPrismProgress;
      prismMotionLastTime = 0;
      if (prismMotionFrame !== null) {
        if (typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(prismMotionFrame);
        } else {
          window.clearTimeout(prismMotionFrame);
        }
        prismMotionFrame = null;
      }
      setPrismState(prismProgress, state.canScroll);
    } else {
      schedulePrismMotion();
    }
    setBeamState(progress, state.canScroll);
  }

  function animatePrism(timestamp) {
    prismMotionFrame = null;
    if (!prism) return;
    if (reducedMotion || !prismCanScroll) {
      prismProgress = targetPrismProgress;
      prismMotionLastTime = 0;
      setPrismState(prismProgress, prismCanScroll);
      return;
    }

    var now = typeof timestamp === 'number' ? timestamp : Date.now();
    var delta = prismMotionLastTime
      ? clamp((now - prismMotionLastTime) / 1000, 0, 0.05)
      : 1 / 60;
    prismMotionLastTime = now;
    var difference = targetPrismProgress - prismProgress;
    var blend = 1 - Math.exp(-delta * 14);
    var maxStep = Math.min(0.03, delta * 2.1);
    prismProgress += clamp(difference * blend, -maxStep, maxStep);
    setPrismState(prismProgress, true);

    if (Math.abs(targetPrismProgress - prismProgress) > 0.0005) {
      prismMotionFrame = requestFrame(animatePrism);
    } else {
      prismProgress = targetPrismProgress;
      prismMotionLastTime = 0;
      setPrismState(prismProgress, true);
    }
  }

  function schedulePrismMotion() {
    if (!prism || reducedMotion || !prismCanScroll || prismMotionFrame !== null) return;
    prismMotionLastTime = 0;
    prismMotionFrame = requestFrame(animatePrism);
  }

  function requestFrame(callback) {
    if (typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(callback, 16);
  }

  function scheduleScrollUpdate() {
    if (frameRequest !== null) return;
    frameRequest = requestFrame(function () {
      frameRequest = null;
      updateScrollState();
    });
  }

  function applyMotionPreference(nextReducedMotion) {
    reducedMotion = Boolean(nextReducedMotion);
    root.style.scrollBehavior = reducedMotion ? 'auto' : 'smooth';
    setReducedMotionOverrides(reducedMotion);
    setupRevealObserver();
    scheduleScrollUpdate();
  }

  if (beamPath && typeof beamPath.getTotalLength === 'function') {
    try {
      beamLength = beamPath.getTotalLength();
    } catch (error) {
      beamLength = 0;
    }
  }
  if (beamPath && beamPath.style) beamPath.style.animation = 'none';

  applyMotionPreference(reducedMotion);

  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', function (event) {
        applyMotionPreference(event.matches);
      });
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(function (event) {
        applyMotionPreference(event.matches);
      });
    }
  }

  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  if (backToTop) {
    backToTop.addEventListener('click', function () {
      if (typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      } else {
        root.scrollTop = 0;
      }
    });
  }
  window.addEventListener('resize', function () {
    syncMenuVisibility();
    scheduleScrollUpdate();
  }, { passive: true });
})();

/* A procedural canvas scene turns the whole page into one changing prism. */
(function () {
  'use strict';

  var root = document.documentElement;
  var canvas = document.getElementById('prism-scene');
  if (!root || !canvas || typeof canvas.getContext !== 'function') return;

  var motionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  var reduced = Boolean(motionQuery && motionQuery.matches);
  var context;
  try {
    context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  } catch (error) {
    context = null;
  }
  if (!context) return;

  var replay = document.getElementById('scene-replay');
  var scene = {
    width: 0,
    height: 0,
    scrollRange: 0,
    ratio: 1,
    time: 0,
    progress: 0,
    targetProgress: 0,
    pointerX: 0,
    pointerY: 0,
    targetX: 0,
    targetY: 0,
    particles: [],
    trail: [],
    pulse: 0,
    pulseActive: false,
    pulseX: 0,
    pulseY: 0,
    lastTime: 0,
    frame: null,
    running: false
  };

  var palette = ['#e8c486', '#d89a88', '#a9c6c3', '#d8b6c6', '#f0eee7'];
  var prismVertices = [
    [-0.78, -0.58, 0.52], [0.78, -0.58, 0.52], [0, 0.88, 0.52],
    [-0.78, -0.58, -0.52], [0.78, -0.58, -0.52], [0, 0.88, -0.52]
  ];
  var prismFaces = [
    { ids: [0, 1, 2], color: 'rgba(232,196,134,.105)' },
    { ids: [0, 3, 5, 2], color: 'rgba(169,198,195,.075)' },
    { ids: [1, 4, 5, 2], color: 'rgba(216,154,136,.085)' },
    { ids: [0, 1, 4, 3], color: 'rgba(240,238,231,.035)' }
  ];
  var reducedMobileQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 680px)')
    : null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(value, start, end) {
    var position = clamp((value - start) / (end - start), 0, 1);
    return position * position * (3 - 2 * position);
  }

  function seeded(index) {
    var value = Math.sin((index + 1) * 127.1) * 43758.5453123;
    return value - Math.floor(value);
  }

  function resize() {
    scene.width = Math.max(1, window.innerWidth || root.clientWidth || 1);
    scene.height = Math.max(1, window.innerHeight || root.clientHeight || 1);
    scene.ratio = Math.min(1.25, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(scene.width * scene.ratio);
    canvas.height = Math.round(scene.height * scene.ratio);
    canvas.style.width = scene.width + 'px';
    canvas.style.height = scene.height + 'px';
    context.setTransform(scene.ratio, 0, 0, scene.ratio, 0, 0);
    scene.pointerX = scene.targetX = scene.width * 0.72;
    scene.pointerY = scene.targetY = scene.height * 0.5;

    var mobile = reducedMobileQuery ? reducedMobileQuery.matches : scene.width <= 680;
    var amount = Math.min(mobile ? 32 : 84, Math.round(scene.width * scene.height / (mobile ? 11500 : 14000)));
    scene.particles = [];
    for (var i = 0; i < amount; i += 1) {
      scene.particles.push({
        x: seeded(i * 4 + 1),
        y: seeded(i * 4 + 2),
        speed: 0.025 + seeded(i * 4 + 3) * 0.09,
        phase: seeded(i * 4 + 4) * Math.PI * 2,
        size: 0.45 + seeded(i * 5 + 7) * 1.2,
        color: i % palette.length
      });
    }
    refreshScrollRange();
  }

  function refreshScrollRange() {
    var scrolling = document.scrollingElement || root;
    scene.scrollRange = Math.max(
      0,
      (scrolling ? scrolling.scrollHeight || 0 : 0) - (window.innerHeight || root.clientHeight || 0)
    );
    scene.targetProgress = readProgress();
  }

  function readProgress() {
    var scrolling = document.scrollingElement || root;
    var range = Math.max(1, scene.scrollRange);
    var y = typeof window.scrollY === 'number' ? window.scrollY : scrolling.scrollTop || 0;
    return clamp(y / range, 0, 1);
  }

  function addPointer(event) {
    if (event.pointerType === 'touch' || typeof event.clientX !== 'number') return;
    scene.targetX = clamp(event.clientX, 0, scene.width);
    scene.targetY = clamp(event.clientY, 0, scene.height);
    scene.trail.push({ x: scene.targetX, y: scene.targetY, life: 1 });
    if (scene.trail.length > 22) scene.trail.shift();
  }

  function addPulse(event) {
    if (event && typeof event.clientX === 'number') {
      scene.pulseX = clamp(event.clientX, 0, scene.width);
      scene.pulseY = clamp(event.clientY, 0, scene.height);
    } else {
      scene.pulseX = scene.width * 0.72;
      scene.pulseY = scene.height * 0.5;
    }
    scene.pulse = 0;
    scene.pulseActive = true;
  }

  function drawParticles(intensity) {
    var w = scene.width;
    var h = scene.height;
    var p = scene.progress;
    for (var i = 0; i < scene.particles.length; i += 1) {
      var particle = scene.particles[i];
      var x = (particle.x * w + scene.time * particle.speed * 24 + p * w * 0.09) % w;
      var y = (particle.y * h + Math.sin(scene.time * 0.45 + particle.phase) * 13 + p * h * 0.07) % h;
      var shimmer = 0.09 + 0.13 * (0.5 + 0.5 * Math.sin(scene.time * 1.1 + particle.phase));
      context.beginPath();
      context.fillStyle = palette[particle.color];
      context.globalAlpha = shimmer * intensity;
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();

      if (i % 5 === 0) {
        var dx = w * 0.5 + Math.sin(particle.phase + scene.time * 0.2) * w * 0.08;
        var dy = y + Math.cos(particle.phase + scene.time * 0.3) * 21;
        var distance = Math.hypot(dx - x, dy - y);
        if (distance < 150) {
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(dx, dy);
          context.strokeStyle = palette[(particle.color + 1) % palette.length];
          context.globalAlpha = (1 - distance / 150) * 0.11 * intensity;
          context.lineWidth = 0.6;
          context.stroke();
        }
      }
    }
    context.globalAlpha = 1;
  }

  function drawOrbit(cx, cy, radius, progress, intensity) {
    for (var i = 0; i < 5; i += 1) {
      var spread = radius * (1.5 + i * 0.32 + progress * 0.22);
      var squash = 0.42 + i * 0.055;
      var tilt = scene.time * (0.09 + i * 0.012) + i * 0.58 + progress * 1.7;
      context.beginPath();
      context.ellipse(cx, cy, spread, spread * squash, tilt, 0, Math.PI * 2);
      context.strokeStyle = palette[i % palette.length];
      context.globalAlpha = (0.095 - i * 0.011) * intensity;
      context.lineWidth = i === 0 ? 1.3 : 0.8;
      context.setLineDash(i === 2 ? [2, 7] : []);
      context.stroke();
    }
    context.setLineDash([]);
    context.globalAlpha = 1;
  }

  function drawPrism(cx, cy, radius, progress, intensity) {
    var cosineY = Math.cos(scene.time * 0.22 + progress * 2.3);
    var sineY = Math.sin(scene.time * 0.22 + progress * 2.3);
    var cosineX = Math.cos(scene.time * 0.13 + 0.25);
    var sineX = Math.sin(scene.time * 0.13 + 0.25);
    var cosineZ = Math.cos(scene.time * 0.1 - progress * 1.4);
    var sineZ = Math.sin(scene.time * 0.1 - progress * 1.4);
    var points = prismVertices.map(function (vertex) {
      var x = vertex[0];
      var y = vertex[1];
      var z = vertex[2];
      var rx = x * cosineY + z * sineY;
      var rz = -x * sineY + z * cosineY;
      var ry = y * cosineX - rz * sineX;
      rz = y * sineX + rz * cosineX;
      var fx = rx * cosineZ - ry * sineZ;
      var fy = rx * sineZ + ry * cosineZ;
      var perspective = 3.8 / (3.8 + rz * 0.72);
      return { x: cx + fx * radius * perspective, y: cy + fy * radius * perspective };
    });
    context.save();
    context.globalAlpha = intensity;
    context.shadowColor = 'rgba(232,196,134,.33)';
    context.shadowBlur = radius * 0.08;
    var edge = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    edge.addColorStop(0, 'rgba(240,238,231,.72)');
    edge.addColorStop(0.5, 'rgba(169,198,195,.7)');
    edge.addColorStop(1, 'rgba(216,154,136,.72)');
    prismFaces.forEach(function (face) {
      context.beginPath();
      context.moveTo(points[face.ids[0]].x, points[face.ids[0]].y);
      for (var j = 1; j < face.ids.length; j += 1) {
        context.lineTo(points[face.ids[j]].x, points[face.ids[j]].y);
      }
      context.closePath();
      context.fillStyle = face.color;
      context.fill();
      context.strokeStyle = edge;
      context.globalAlpha = 0.74 * intensity;
      context.lineWidth = 1.1;
      context.stroke();
    });

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    context.lineTo(points[4].x, points[4].y);
    context.moveTo(points[1].x, points[1].y);
    context.lineTo(points[3].x, points[3].y);
    context.moveTo(points[2].x, points[2].y);
    context.lineTo(points[5].x, points[5].y);
    context.strokeStyle = 'rgba(240,238,231,.3)';
    context.lineWidth = 0.7;
    context.stroke();

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    context.lineTo(points[1].x, points[1].y);
    context.lineTo(points[2].x, points[2].y);
    context.closePath();
    context.fillStyle = 'rgba(240,238,231,.025)';
    context.fill();
    context.restore();
    context.globalAlpha = 1;
  }

  function drawLightPaths(cx, cy, radius, progress, intensity) {
    var w = scene.width;
    var spread = radius * (0.2 + progress * 0.85);
    var beam = context.createLinearGradient(0, cy, w, cy);
    beam.addColorStop(0, 'rgba(240,238,231,0)');
    beam.addColorStop(Math.max(0.05, cx / w - 0.12), 'rgba(240,238,231,.42)');
    beam.addColorStop(Math.min(0.97, cx / w + 0.18), 'rgba(232,196,134,.62)');
    beam.addColorStop(1, 'rgba(169,198,195,0)');
    context.beginPath();
    context.moveTo(0, cy + Math.sin(scene.time * 0.7) * radius * 0.045);
    context.bezierCurveTo(cx - radius * 1.9, cy - radius * 0.12, cx - radius * 1.2, cy + radius * 0.16, cx - radius * 0.58, cy);
    context.strokeStyle = beam;
    context.lineWidth = 1.2;
    context.shadowColor = 'rgba(240,238,231,.5)';
    context.shadowBlur = 8;
    context.globalAlpha = intensity;
    context.stroke();
    context.shadowBlur = 0;

    for (var i = 0; i < 5; i += 1) {
      var lane = i - 2;
      var endY = cy + lane * spread * 0.58 + Math.sin(scene.time * 0.46 + i * 0.9) * radius * 0.12;
      context.beginPath();
      context.moveTo(cx + radius * 0.48, cy + lane * radius * 0.08);
      context.bezierCurveTo(
        cx + radius * 1.12,
        cy + lane * radius * 0.34 + Math.sin(scene.time * 0.25 + i) * radius * 0.3,
        w * (0.72 + progress * 0.11),
        endY - lane * radius * 0.34,
        w + radius * 0.55,
        endY
      );
      context.strokeStyle = palette[(i + 1) % palette.length];
      context.globalAlpha = (0.18 + (2 - Math.abs(lane)) * 0.065) * intensity;
      context.lineWidth = i === 2 ? 1.45 : 0.8;
      context.shadowColor = palette[(i + 1) % palette.length];
      context.shadowBlur = 7 + (2 - Math.abs(lane)) * 2;
      context.stroke();
    }
    context.shadowBlur = 0;
    context.globalAlpha = 1;

    var pulseX = ((scene.time * 0.19 + progress * 0.77) % 1) * Math.max(cx - radius * 0.55, 1);
    context.beginPath();
    context.arc(pulseX, cy, 2.1, 0, Math.PI * 2);
    context.fillStyle = '#f0eee7';
    context.shadowColor = '#e8c486';
    context.shadowBlur = 14;
    context.globalAlpha = intensity;
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = 1;
  }

  function drawShards(cx, cy, radius, progress, intensity) {
    for (var i = 0; i < 11; i += 1) {
      var angle = (Math.PI * 2 * i) / 11 + scene.time * 0.12 + progress * 2.6;
      var orbit = radius * (1.45 + 0.28 * Math.sin(scene.time * 0.26 + i));
      var x = cx + Math.cos(angle) * orbit * 1.28;
      var y = cy + Math.sin(angle) * orbit * 0.77;
      var size = radius * (0.035 + 0.018 * (0.5 + 0.5 * Math.sin(scene.time + i)));
      context.save();
      context.translate(x, y);
      context.rotate(angle + scene.time * 0.08);
      context.beginPath();
      context.moveTo(0, -size * 1.9);
      context.lineTo(size * 0.78, size * 0.7);
      context.lineTo(-size * 0.72, size * 1.05);
      context.closePath();
      context.fillStyle = palette[i % palette.length];
      context.globalAlpha = (0.28 + 0.17 * (0.5 + 0.5 * Math.sin(scene.time * 0.8 + i))) * intensity;
      context.shadowColor = palette[i % palette.length];
      context.shadowBlur = 5;
      context.fill();
      context.restore();
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }

  function drawPointerTrail(delta, intensity) {
    for (var i = scene.trail.length - 1; i >= 0; i -= 1) {
      scene.trail[i].life -= delta * 0.9;
      if (scene.trail[i].life <= 0) scene.trail.splice(i, 1);
    }
    if (scene.trail.length < 2) return;
    context.beginPath();
    context.moveTo(scene.trail[0].x, scene.trail[0].y);
    for (var j = 1; j < scene.trail.length; j += 1) {
      context.lineTo(scene.trail[j].x, scene.trail[j].y);
    }
    var gradient = context.createLinearGradient(
      scene.trail[0].x, scene.trail[0].y,
      scene.trail[scene.trail.length - 1].x, scene.trail[scene.trail.length - 1].y
    );
    gradient.addColorStop(0, 'rgba(232,196,134,0)');
    gradient.addColorStop(0.55, 'rgba(232,196,134,.48)');
    gradient.addColorStop(1, 'rgba(169,198,195,.72)');
    context.strokeStyle = gradient;
    context.lineWidth = 1.1;
    context.shadowColor = 'rgba(232,196,134,.6)';
    context.shadowBlur = 7;
    context.globalAlpha = scene.trail[scene.trail.length - 1].life * intensity;
    context.stroke();
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }

  function drawPulse(intensity) {
    if (!scene.pulseActive) return;
    var expand = smoothstep(scene.pulse, 0, 0.3);
    var dissolve = smoothstep(scene.pulse, 0.24, 1);
    var radius = Math.min(58, Math.min(scene.width, scene.height) * 0.12) * expand;
    var alpha = 0.28 * (1 - dissolve);
    context.beginPath();
    context.arc(scene.pulseX, scene.pulseY, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(232,196,134,' + (alpha * intensity) + ')';
    context.lineWidth = 1.2 + dissolve * 0.4;
    context.shadowColor = 'rgba(232,196,134,.45)';
    context.shadowBlur = 3 + dissolve * 11;
    context.stroke();
    context.shadowBlur = 0;
  }

  function draw(delta) {
    var w = scene.width;
    var h = scene.height;
    var p = scene.progress;
    var mobile = reducedMobileQuery ? reducedMobileQuery.matches : w <= 680;
    var parallaxX = mobile ? 0 : (scene.pointerX / w - 0.5) * 30;
    var parallaxY = mobile ? 0 : (scene.pointerY / h - 0.5) * 24;
    var travel = smoothstep(p, 0.04, 0.62);
    var cx = w * (mobile ? 0.73 - travel * 0.14 : 0.73 - travel * 0.4) + parallaxX;
    var cy = h * (mobile ? 0.74 - p * 0.06 : 0.51 + Math.sin(p * Math.PI) * 0.07) + parallaxY;
    var radius = Math.min(w, h) * (0.16 + 0.045 * Math.sin(p * Math.PI) + p * 0.055);
    var firstGap = smoothstep(p, 0.12, 0.33) * (1 - smoothstep(p, 0.42, 0.56));
    var secondGap = smoothstep(p, 0.7, 0.82) * (1 - smoothstep(p, 0.9, 0.99));
    var coreAlpha = 1 - firstGap * (mobile ? 0.88 : 0.82);
    coreAlpha *= 1 - secondGap * (mobile ? 0.9 : 0.78);
    var lightAlpha = mobile ? 0.3 + coreAlpha * 0.46 : 0.5 + coreAlpha * 0.42;

    context.clearRect(0, 0, w, h);
    drawParticles(1);
    drawOrbit(cx, cy, radius, p, coreAlpha * 0.9);
    drawLightPaths(cx, cy, radius, p, lightAlpha);
    drawShards(cx, cy, radius, p, coreAlpha);
    drawPrism(cx, cy, radius, p, coreAlpha);
    drawPointerTrail(delta, 1);
    drawPulse(1);
  }

  function animate(now) {
    if (!scene.running) return;
    var delta = scene.lastTime ? Math.min(0.05, (now - scene.lastTime) / 1000) : 0.016;
    scene.lastTime = now;
    scene.time += delta;
    var progressDifference = scene.targetProgress - scene.progress;
    var progressBlend = 1 - Math.exp(-delta * 14);
    var maxProgressStep = Math.min(0.03, delta * 2.1);
    scene.progress += clamp(progressDifference * progressBlend, -maxProgressStep, maxProgressStep);
    var pointerBlend = 1 - Math.exp(-delta * 7.5);
    scene.pointerX += (scene.targetX - scene.pointerX) * pointerBlend;
    scene.pointerY += (scene.targetY - scene.pointerY) * pointerBlend;
    if (scene.pulseActive) {
      scene.pulse = Math.min(1, scene.pulse + delta / 0.88);
      if (scene.pulse >= 1) scene.pulseActive = false;
    }
    draw(delta);
    scene.frame = window.requestAnimationFrame(animate);
  }

  function setEnabled(enabled) {
    if (enabled && !reduced && !document.hidden) {
      root.classList.add('motion-ready');
      if (!scene.running) {
        scene.running = true;
        scene.lastTime = 0;
        scene.frame = window.requestAnimationFrame(animate);
      }
      return;
    }
    root.classList.remove('motion-ready');
    scene.running = false;
    if (scene.frame !== null) {
      window.cancelAnimationFrame(scene.frame);
      scene.frame = null;
    }
  }

  resize();
  scene.targetProgress = readProgress();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', function () {
    scene.targetProgress = readProgress();
  }, { passive: true });
  window.addEventListener('pointermove', addPointer, { passive: true });
  window.addEventListener('pointerdown', addPulse, { passive: true });
  document.addEventListener('visibilitychange', function () {
    setEnabled(!reduced);
  });
  if (replay) replay.addEventListener('click', function () { addPulse(null); });

  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', function (event) {
        reduced = Boolean(event.matches);
        setEnabled(!reduced);
      });
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(function (event) {
        reduced = Boolean(event.matches);
        setEnabled(!reduced);
      });
    }
  }
  setEnabled(!reduced);
})();
