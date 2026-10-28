(() => {
  'use strict';

  const start = () => {
    const byId = (id) => document.getElementById(id);

    let source = "screenshots";
    let liveReady = false;
    const liveStage = byId("liveStage");
    const isReady = () => source === "live" ? liveReady : Boolean(slots.before && slots.after);
    const live = {
      before: byId('liveUrlBefore'),
      after: byId('liveUrlAfter'),
      open: byId('liveOpenButton'),
      clear: byId('liveClearButton'),
      frameBefore: byId('liveFrameBefore'),
      frameAfter: byId('liveFrameAfter'),
      status: byId('liveStatus'),
    };
    if (Object.values(live).every(Boolean)) {
      const parseLiveUrl = (value) => {
        const input = value.trim();
        if (!/^https?:\/\//i.test(input)) return null;
        try {
          const url = new URL(input);
          if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
          return url.href;
        } catch (_error) {
          return null;
        }
      };
      live.open.type = 'button';
      live.clear.type = 'button';
      live.status.setAttribute('role', 'status');
      live.status.setAttribute('aria-live', 'polite');
      live.open.addEventListener('click', () => {
        const before = parseLiveUrl(live.before.value);
        const after = parseLiveUrl(live.after.value);
        if (!before || !after) {
          live.status.textContent = 'Введите два корректных адреса с http:// или https://, без логина и пароля.';
          return;
        }
        live.frameBefore.setAttribute('src', before);
        live.frameAfter.setAttribute('src', after);
        liveReady = true;
        refresh();
        live.status.textContent = 'Страницы открываются во фреймах. Некоторые сайты блокируют встраивание; браузер может не показать причину блокировки.';
      });
      live.clear.addEventListener('click', () => {
        live.before.value = '';
        live.after.value = '';
        live.frameBefore.removeAttribute('src');
        live.frameAfter.removeAttribute('src');
        liveReady = false;
        refresh();
        live.status.textContent = 'Адреса и фреймы очищены. Некоторые сайты блокируют встраивание.';
      });
    }

    const ui = {
      beforeInput: byId('beforeInput'),
      afterInput: byId('afterInput'),
      beforeDropZone: byId('beforeDropZone'),
      afterDropZone: byId('afterDropZone'),
      beforeFileName: byId('beforeFileName'),
      afterFileName: byId('afterFileName'),
      beforeDimensions: byId('beforeDimensions'),
      afterDimensions: byId('afterDimensions'),
      compareStage: byId('compareStage'),
      emptyState: byId('emptyState'),
      comparisonArea: byId('comparisonArea'),
      beforeView: byId('beforeView'),
      afterView: byId('afterView'),
      beforeImage: byId('beforeImage'),
      afterImage: byId('afterImage'),
      wipeRange: byId('wipeRange'),
      wipeValue: byId('wipeValue'),
      wipeControls: byId('wipeControls'),
      demoButton: byId('demoButton'),
      clearButton: byId('clearButton'),
      swapButton: byId('swapButton'),
      blinkToggle: byId('blinkToggle'),
      blinkControls: byId('blinkControls'),
      blinkStepButton: byId('blinkStepButton'),
      beforePickButton: byId('beforePickButton'),
      afterPickButton: byId('afterPickButton'),
      statusMessage: byId('statusMessage'),
    };
    const optionalKeys = new Set([
      'beforeView', 'afterView', 'blinkControls', 'blinkStepButton', 'beforePickButton', 'afterPickButton',
    ]);
    const required = Object.entries(ui)
      .filter(([key]) => !optionalKeys.has(key))
      .map(([, element]) => element);
    if (required.some((element) => !element)) return;

    const slots = { before: null, after: null };
    const pending = { before: false, after: false };
    const pendingUrls = { before: null, after: null };
    const requestIds = { before: 0, after: 0 };
    const images = { before: ui.beforeImage, after: ui.afterImage };
    const views = { before: ui.beforeView, after: ui.afterView };
    const names = { before: ui.beforeFileName, after: ui.afterFileName };
    const dimensions = { before: ui.beforeDimensions, after: ui.afterDimensions };
    const inputs = { before: ui.beforeInput, after: ui.afterInput };
    const dropZones = { before: ui.beforeDropZone, after: ui.afterDropZone };
    const activeObjectUrls = new Set();
    const modeButtons = Array.from(
      document.querySelectorAll('[data-mode="side"], [data-mode="overlay"], [data-mode="blink"]'),
    ).filter((element) =>
      element !== ui.compareStage &&
      (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button'),
    );

    let mode = 'side';
    let blinkShow = 'before';
    let blinkPaused = false;
    let blinkTimer = null;
    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    const setHidden = (element, hidden) => {
      if (!element) return;
      element.hidden = hidden;
      if (hidden) element.setAttribute('aria-hidden', 'true');
      else element.removeAttribute('aria-hidden');
    };

    const setStatus = (message) => {
      ui.statusMessage.textContent = message;
    };

    const releaseObjectUrl = (url) => {
      if (!url || !activeObjectUrls.has(url)) return;
      URL.revokeObjectURL(url);
      activeObjectUrls.delete(url);
    };

    const clearSlotContent = (key) => {
      const slot = slots[key];
      if (slot && slot.objectUrl) releaseObjectUrl(slot.objectUrl);
      if (pendingUrls[key]) releaseObjectUrl(pendingUrls[key]);
      slots[key] = null;
      pendingUrls[key] = null;
      images[key].removeAttribute('src');
      images[key].alt = key === 'before' ? 'Изображение до изменений' : 'Изображение после изменений';
    };

    const stopBlinkTimer = () => {
      if (blinkTimer !== null) {
        window.clearInterval(blinkTimer);
        blinkTimer = null;
      }
    };

    const prefersReducedMotion = () => Boolean(motionQuery && motionQuery.matches);

    const applyBlinkVisibility = () => {
      const manualView = mode === 'blink' && prefersReducedMotion();
      for (const key of ['before', 'after']) {
        const view = views[key];
        if (!view) continue;
        const show = !manualView || key === blinkShow;
        setHidden(view, !show);
        if (manualView && show) view.style.setProperty('grid-column', '1 / -1', 'important');
        else view.style.removeProperty('grid-column');
      }
    };

    const updateBlinkButton = () => {
      const reducedMotion = prefersReducedMotion();
      if (reducedMotion) {
        const nextLabel = blinkShow === 'before' ? 'после' : 'до';
        ui.blinkToggle.textContent = `Показать «${nextLabel}»`;
        ui.blinkToggle.setAttribute('aria-label', `Показать изображение «${nextLabel}»`);
        ui.blinkToggle.setAttribute('aria-pressed', blinkShow === 'after' ? 'true' : 'false');
      } else {
        ui.blinkToggle.textContent = blinkPaused ? 'Продолжить мигание' : 'Пауза мигания';
        ui.blinkToggle.setAttribute(
          'aria-label',
          blinkPaused ? 'Продолжить автоматическое переключение изображений' : 'Приостановить автоматическое переключение изображений',
        );
        ui.blinkToggle.setAttribute('aria-pressed', blinkPaused ? 'true' : 'false');
      }
    };

    const setBlinkShow = (which) => {
      blinkShow = which === 'after' ? 'after' : 'before';
      ui.compareStage.dataset.blinkShow = blinkShow;
      liveStage.dataset.blinkShow = blinkShow;
      applyBlinkVisibility();
      updateBlinkButton();
    };

    const startBlinkTimer = () => {
      if (
        blinkTimer !== null ||
        mode !== 'blink' ||
        !isReady() ||
        blinkPaused ||
        prefersReducedMotion() ||
        document.visibilityState === 'hidden'
      ) return;
      blinkTimer = window.setInterval(() => {
        if (mode !== 'blink' || !isReady() || document.visibilityState === 'hidden') {
          stopBlinkTimer();
          return;
        }
        setBlinkShow(blinkShow === 'before' ? 'after' : 'before');
      }, 1000);
    };

    const updateWipe = () => {
      const parsed = Number.parseFloat(ui.wipeRange.value);
      const position = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 50;
      const formatted = String(position);
      ui.compareStage.style.setProperty('--wipe-position', `${formatted}%`);
      liveStage.style.setProperty('--wipe-position', `${formatted}%`);
      ui.wipeValue.textContent = `${formatted}%`;
    };

    const refresh = () => {
      const ready = isReady();
      const screenshotMode = source === 'screenshots';
      setHidden(byId('screenshotSources'), !screenshotMode);
      setHidden(byId('liveSources'), screenshotMode);
      setHidden(byId('screenshotActions'), !screenshotMode);
      setHidden(ui.statusMessage, !screenshotMode);
      setHidden(liveStage, screenshotMode || !ready);
      document.querySelectorAll('[data-source]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.source === source)));

      for (const key of ['before', 'after']) {
        const slot = slots[key];
        if (slot) {
          if (images[key].getAttribute('src') !== slot.src) images[key].setAttribute('src', slot.src);
          const demoPrefix = slot.demo ? 'Демо-пример: ' : '';
          names[key].textContent = `${demoPrefix}${slot.fileName}`;
          dimensions[key].textContent = `${slot.width} × ${slot.height} px`;
          const sideName = key === 'before' ? 'До' : 'После';
          images[key].alt = `${sideName}: ${slot.demo ? 'встроенный демо-пример, ' : ''}${slot.fileName} (${slot.width} × ${slot.height})`;
        } else {
          if (images[key].hasAttribute('src')) images[key].removeAttribute('src');
          names[key].textContent = 'Файл не выбран';
          dimensions[key].textContent = '—';
          images[key].alt = key === 'before' ? 'Изображение до изменений' : 'Изображение после изменений';
        }
      }

      setHidden(ui.emptyState, !screenshotMode || ready);
      setHidden(ui.comparisonArea, false);
      setHidden(ui.compareStage, !screenshotMode || !ready);
      setHidden(ui.wipeControls, !ready || mode !== 'overlay');
      setHidden(ui.blinkControls, !ready || mode !== 'blink');
      setHidden(ui.blinkToggle, !ready || mode !== 'blink');

      ui.compareStage.dataset.mode = mode;
      liveStage.dataset.mode = mode;
      ui.compareStage.dataset.blinkShow = blinkShow;
      liveStage.dataset.blinkShow = blinkShow;
      applyBlinkVisibility();
      updateWipe();
      modeButtons.forEach((button) => {
        const selected = button.dataset.mode === mode;
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        button.disabled = !ready;
      });
      ui.wipeRange.disabled = !ready;
      ui.swapButton.disabled = !ready;
      ui.clearButton.disabled = !ready && !slots.before && !slots.after && !pending.before && !pending.after;
      updateBlinkButton();

      if (!ready || mode !== 'blink') stopBlinkTimer();
      else startBlinkTimer();
    };

    const isSvgFile = (file, header) => {
      const type = String(file.type || '').toLowerCase();
      if (type.includes('svg') || /\.svg$/i.test(String(file.name || ''))) return true;
      let prefix = '';
      try {
        prefix = new TextDecoder('utf-8').decode(header).replace(/\0/g, '').replace(/^\uFEFF/, '');
      } catch (_error) {
        return false;
      }
      return /<svg\b/i.test(prefix.slice(0, 8192));
    };

    const decodeImage = async (image, source) => {
      image.setAttribute('src', source);
      if (typeof image.decode === 'function') {
        await image.decode();
      } else {
        await new Promise((resolve, reject) => {
          if (image.complete) {
            if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve();
            else reject(new Error('Изображение не декодировано'));
            return;
          }
          const cleanup = () => {
            image.removeEventListener('load', onLoad);
            image.removeEventListener('error', onError);
          };
          const onLoad = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error('Изображение не декодировано'));
          };
          image.addEventListener('load', onLoad, { once: true });
          image.addEventListener('error', onError, { once: true });
        });
      }
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        throw new Error('У изображения нет доступных размеров');
      }
      return { width: image.naturalWidth, height: image.naturalHeight };
    };

    const loadedStatus = (key, slot) => {
      if (slots.before && slots.after) {
        setStatus('Обе картинки декодированы и готовы к сравнению в этой вкладке.');
      } else {
        const side = key === 'before' ? 'до' : 'после';
        setStatus(`Изображение «${slot.fileName}» декодировано (${slot.width} × ${slot.height}). Добавьте картинку для стороны «${side === 'до' ? 'после' : 'до'}».`);
      }
    };

    const loadFile = async (key, file) => {
      if (!file) return;
      const requestId = ++requestIds[key];
      clearSlotContent(key);
      pending[key] = true;
      refresh();
      setStatus(`Проверяю, является ли файл «${file.name}» изображением, в браузере…`);

      let objectUrl = null;
      try {
        if (file.size === 0) throw new Error('empty-file');
        const header = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
        if (requestId !== requestIds[key]) return;
        if (isSvgFile(file, header)) throw new Error('svg-file');

        objectUrl = URL.createObjectURL(file);
        activeObjectUrls.add(objectUrl);
        pendingUrls[key] = objectUrl;
        const decoded = await decodeImage(images[key], objectUrl);
        if (requestId !== requestIds[key]) {
          releaseObjectUrl(objectUrl);
          return;
        }

        const slot = {
          fileName: String(file.name || 'Изображение'),
          src: objectUrl,
          objectUrl,
          width: decoded.width,
          height: decoded.height,
          demo: false,
        };
        slots[key] = slot;
        pendingUrls[key] = null;
        pending[key] = false;
        objectUrl = null;
        refresh();
        loadedStatus(key, slot);
      } catch (error) {
        if (objectUrl) {
          if (requestId === requestIds[key] && images[key].getAttribute('src') === objectUrl) {
            images[key].removeAttribute('src');
          }
          releaseObjectUrl(objectUrl);
        }
        if (requestId !== requestIds[key]) return;
        pendingUrls[key] = null;
        pending[key] = false;
        slots[key] = null;
        refresh();
        if (error && error.message === 'svg-file') {
          setStatus('SVG-файлы не поддерживаются. Выберите растровое изображение.');
        } else if (error && error.message === 'empty-file') {
          setStatus('Выбран пустой файл. Выберите корректное изображение.');
        } else {
          setStatus(`Файл «${file.name}» не удалось декодировать как изображение. Выберите корректную картинку.`);
        }
      }
    };

    const demoSvg = (label, color, accent) => {
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><rect width="960" height="600" fill="${color}"/><rect x="48" y="48" width="864" height="504" rx="28" fill="#ffffff" opacity=".92"/><circle cx="250" cy="300" r="112" fill="${accent}"/><path d="M430 240h330M430 300h250M430 360h290" stroke="#334155" stroke-width="22" stroke-linecap="round"/><text x="480" y="485" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" fill="#0f172a">${label}</text></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    };

    const loadDemo = async () => {
      const returnFocusToComparison = document.activeElement === ui.demoButton;
      stopBlinkTimer();
      mode = 'side';
      blinkPaused = false;
      setBlinkShow('before');
      for (const key of ['before', 'after']) {
        requestIds[key] += 1;
        clearSlotContent(key);
        pending[key] = true;
        inputs[key].value = '';
      }
      refresh();
      setStatus('Подготавливаю встроенный демо-пример; изображения создаются локально в этой вкладке…');

      const sources = {
        before: demoSvg('Демо · исходное состояние', '#dbeafe', '#3b82f6'),
        after: demoSvg('Демо · обновлённый вариант', '#dcfce7', '#22c55e'),
      };
      const capturedIds = { before: requestIds.before, after: requestIds.after };
      try {
        const decoded = await Promise.all([
          decodeImage(images.before, sources.before),
          decodeImage(images.after, sources.after),
        ]);
        if (capturedIds.before !== requestIds.before || capturedIds.after !== requestIds.after) return;
        slots.before = {
          fileName: 'Демо-пример — до.svg',
          src: sources.before,
          objectUrl: null,
          width: decoded[0].width,
          height: decoded[0].height,
          demo: true,
        };
        slots.after = {
          fileName: 'Демо-пример — после.svg',
          src: sources.after,
          objectUrl: null,
          width: decoded[1].width,
          height: decoded[1].height,
          demo: true,
        };
        pending.before = false;
        pending.after = false;
        refresh();
        setStatus('Встроенный демо-пример декодирован локально. Обе картинки готовы к сравнению.');
        if (returnFocusToComparison && (document.activeElement === document.body || ui.emptyState.contains(document.activeElement))) {
          ui.compareStage.focus({ preventScroll: true });
        }
      } catch (_error) {
        if (capturedIds.before !== requestIds.before || capturedIds.after !== requestIds.after) return;
        for (const key of ['before', 'after']) {
          slots[key] = null;
          pending[key] = false;
          images[key].removeAttribute('src');
        }
        refresh();
        setStatus('Не удалось декодировать встроенный демо-пример в этом браузере.');
      }
    };

    const clearAll = () => {
      stopBlinkTimer();
      for (const key of ['before', 'after']) {
        requestIds[key] += 1;
        clearSlotContent(key);
        pending[key] = false;
        inputs[key].value = '';
      }
      for (const url of Array.from(activeObjectUrls)) releaseObjectUrl(url);
      mode = 'side';
      blinkPaused = false;
      setBlinkShow('before');
      refresh();
      setStatus('Сравнение очищено. Добавьте две картинки, чтобы начать заново.');
    };

    const setMode = (nextMode) => {
      if (!['side', 'overlay', 'blink'].includes(nextMode) || !isReady()) return;
      if (mode !== nextMode) {
        stopBlinkTimer();
        mode = nextMode;
        if (mode === 'blink') {
          blinkPaused = false;
          setBlinkShow('before');
        }
      }
      refresh();
      if (mode === 'side') setStatus('Режим сравнения рядом включён.');
      else if (mode === 'overlay') setStatus('Режим наложения включён. Положение разделителя меняется ползунком.');
      else if (prefersReducedMotion()) setStatus('Режим мигания включён без автопереключения: используйте кнопку для смены изображения.');
      else if (blinkPaused) setStatus('Режим мигания приостановлен. Нажмите кнопку «Продолжить мигание», чтобы возобновить переключение.');
      else setStatus('Режим мигания включён: изображения чередуются примерно раз в секунду.');
    };

    const swapImages = () => {
      if (!slots.before || !slots.after) return;
      [slots.before, slots.after] = [slots.after, slots.before];
      inputs.before.value = '';
      inputs.after.value = '';
      refresh();
      setStatus('Изображения поменяны местами.');
    };

    for (const key of ['before', 'after']) {
      inputs[key].setAttribute('accept', 'image/*');
      inputs[key].addEventListener('change', (event) => {
        const input = event.currentTarget;
        const file = input.files && input.files[0];
        input.value = '';
        if (file) void loadFile(key, file);
      });

      const zone = dropZones[key];
      zone.addEventListener('dragenter', (event) => {
        event.preventDefault();
        zone.classList.add('is-dragover');
      });
      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        zone.classList.add('is-dragover');
      });
      zone.addEventListener('dragleave', (event) => {
        if (!event.relatedTarget || !zone.contains(event.relatedTarget)) zone.classList.remove('is-dragover');
      });
      zone.addEventListener('drop', (event) => {
        event.preventDefault();
        zone.classList.remove('is-dragover');
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) void loadFile(key, file);
        else setStatus('Перетащите сюда файл изображения.');
      });
    }

    modeButtons.forEach((button) => {
      button.type = 'button';
      button.addEventListener('click', () => setMode(button.dataset.mode));
    });
    for (const button of [
      ui.demoButton,
      ui.clearButton,
      ui.swapButton,
      ui.blinkToggle,
      ui.blinkStepButton,
      ui.beforePickButton,
      ui.afterPickButton,
    ].filter(Boolean)) {
      button.type = 'button';
    }
    if (ui.beforePickButton) ui.beforePickButton.addEventListener('click', () => inputs.before.click());
    if (ui.afterPickButton) ui.afterPickButton.addEventListener('click', () => inputs.after.click());
    ui.demoButton.addEventListener('click', () => void loadDemo());
    ui.clearButton.addEventListener('click', clearAll);
    ui.swapButton.addEventListener('click', swapImages);
    document.querySelectorAll('[data-source]').forEach(button => button.addEventListener('click', () => {
      stopBlinkTimer();
      source = button.dataset.source;
      refresh();
    }));
    document.querySelectorAll('.wipe-handle').forEach(handle => {
      let pointer = null;
      const move = event => {
        const rect = handle.parentElement.getBoundingClientRect();
        if (!rect.width) return;
        ui.wipeRange.value = String(Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))));
        updateWipe();
      };
      handle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || mode !== 'overlay') return;
        event.preventDefault();
        pointer = event.pointerId;
        handle.parentElement.classList.add('dragging-divider');
        handle.setPointerCapture(pointer);
        move(event);
      });
      handle.addEventListener('pointermove', event => { if (event.pointerId === pointer) move(event); });
      const end = event => { if (event.pointerId === pointer) { pointer = null; handle.parentElement.classList.remove('dragging-divider'); } };
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
      handle.addEventListener('lostpointercapture', end);
    });
    ui.wipeRange.addEventListener('input', updateWipe);
    ui.wipeRange.addEventListener('change', updateWipe);
    ui.blinkToggle.addEventListener('click', () => {
      if (mode !== 'blink' || !isReady()) return;
      if (prefersReducedMotion()) {
        setBlinkShow(blinkShow === 'before' ? 'after' : 'before');
        setStatus(`Показан снимок «${blinkShow === 'before' ? 'до' : 'после'}». Автоматическое переключение отключено настройкой уменьшения движения.`);
      } else if (blinkPaused) {
        blinkPaused = false;
        updateBlinkButton();
        startBlinkTimer();
        setStatus('Автоматическое переключение изображений возобновлено.');
      } else {
        blinkPaused = true;
        stopBlinkTimer();
        updateBlinkButton();
        setStatus('Автоматическое переключение изображений приостановлено.');
      }
    });
    if (ui.blinkStepButton) {
      ui.blinkStepButton.addEventListener('click', () => {
        if (mode === 'blink' && isReady()) {
          setBlinkShow(blinkShow === 'before' ? 'after' : 'before');
          setStatus(`Показан снимок «${blinkShow === 'before' ? 'до' : 'после'}».`);
        }
      });
    }

    ui.statusMessage.setAttribute('role', ui.statusMessage.getAttribute('role') || 'status');
    ui.statusMessage.setAttribute('aria-live', 'polite');

    const handleMotionChange = () => {
      if (prefersReducedMotion()) stopBlinkTimer();
      else startBlinkTimer();
      applyBlinkVisibility();
      updateBlinkButton();
      if (mode === 'blink' && isReady()) {
        if (prefersReducedMotion()) setStatus('Автоматическое переключение отключено настройкой уменьшения движения; снимок можно менять кнопкой вручную.');
        else if (blinkPaused) setStatus('Мигание остаётся приостановленным.');
        else setStatus('Автоматическое переключение изображений возобновлено.');
      }
    };
    if (motionQuery) {
      if (typeof motionQuery.addEventListener === 'function') motionQuery.addEventListener('change', handleMotionChange);
      else if (typeof motionQuery.addListener === 'function') motionQuery.addListener(handleMotionChange);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') stopBlinkTimer();
      else startBlinkTimer();
    });

    window.addEventListener('pagehide', () => {
      stopBlinkTimer();
      for (const key of ['before', 'after']) {
        requestIds[key] += 1;
        clearSlotContent(key);
        pending[key] = false;
      }
      for (const url of Array.from(activeObjectUrls)) releaseObjectUrl(url);
      mode = 'side';
      blinkPaused = false;
      setBlinkShow('before');
      refresh();
    }, { once: true });

    setStatus('Добавьте по одному изображению для каждой стороны. Файлы обрабатываются локально в браузере.');
    updateWipe();
    refresh();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
