/* Prism Site v14 — project cards and app downloads. */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var projects = {
    compare: {
      index: '01',
      kind: 'ИНСТРУМЕНТ',
      status: 'Доступен',
      title: 'Prism Site Compare',
      description: 'Сравнивайте снимки экранов и веб-страницы — рядом, в наложении или переключаясь между ними.',
      features: ['Снимки экрана', 'Веб-страницы', 'Три режима сравнения'],
      url: 'https://prism.net.ru/projects/prism-site-compare/',
      downloads: {
        macOS: 'https://prism.net.ru/projects/prism-site-compare/downloads/Prism-Site-Compare-macOS-2.0.zip',
        Windows: 'https://prism.net.ru/projects/prism-site-compare/downloads/Prism-Site-Compare-Windows-2.0.zip'
      }
    },
    exif: {
      index: '02',
      kind: 'ИНСТРУМЕНТ',
      status: 'Доступен',
      title: 'Prism Photo EXIF',
      description: 'Смотрите EXIF, GPS и служебные данные фотографии. Убирайте лишнее перед публикацией — оригинал остаётся нетронутым.',
      features: ['Просмотр EXIF и GPS', 'Очистка JPEG и PNG', 'Локально, без загрузки'],
      url: 'https://prism.net.ru/projects/prism-photo-exif/',
      downloads: {
        macOS: 'https://prism.net.ru/projects/prism-photo-exif/downloads/Prism-Photo-EXIF-macOS-1.0.zip',
        Windows: 'https://prism.net.ru/projects/prism-photo-exif/downloads/Prism-Photo-EXIF-Windows-1.0.zip'
      }
    },
    renew: {
      index: '03',
      kind: 'ТРЕКЕР',
      status: 'Сайт доступен',
      title: 'Prism Renew',
      description: 'Локальный трекер подписок: автопродления, разовые оплаты, периоды оплаты и реальная сумма списаний.',
      features: ['Автопродление', 'Периоды оплаты', 'Без банка и облака'],
      url: 'https://prism.net.ru/projects/prism-renew/',
      downloads: null
    }
  };

  var modal = document.getElementById('project-modal');
  var panel = modal ? modal.querySelector('.project-modal__panel') : null;
  var closeButton = modal ? modal.querySelector('.project-modal__close') : null;
  var title = document.getElementById('project-modal-title');
  var description = document.getElementById('project-modal-description');
  var features = document.getElementById('project-modal-features');
  var index = document.getElementById('project-modal-index');
  var kind = document.getElementById('project-modal-kind');
  var status = document.getElementById('project-modal-status');
  var siteLink = document.getElementById('project-modal-site');
  var demoButton = document.getElementById('project-modal-demo');
  var menu = document.getElementById('project-download-menu');
  var note = document.getElementById('project-modal-note');
  var downloadBlock = demoButton ? demoButton.closest('.project-modal__download') : null;
  var openButtons = Array.prototype.slice.call(document.querySelectorAll('[data-project-open]'));
  var lastTrigger = null;
  var currentProject = null;
  var menuOpen = false;
  var closeTimer = null;

  if (!modal || !panel || !title || !description || !features || !siteLink || !demoButton || !menu || !note) return;

  function focusableElements() {
    return Array.prototype.slice.call(panel.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (element) {
      return element.offsetWidth > 0 || element.offsetHeight > 0;
    });
  }

  function setOpenState(open) {
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('project-modal-open', open);
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (open) {
      modal.hidden = false;
      window.requestAnimationFrame(function () {
        modal.classList.add('is-open');
        if (closeButton) closeButton.focus({ preventScroll: true });
      });
    } else {
      modal.classList.remove('is-open');
      closeTimer = window.setTimeout(function () {
        modal.hidden = true;
        closeTimer = null;
      }, 260);
    }
  }

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    menu.hidden = false;
    demoButton.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector('[role="menuitem"]');
    if (first) first.focus({ preventScroll: true });
  }

  function closeMenu(restoreFocus) {
    if (!menuOpen) return;
    menuOpen = false;
    menu.hidden = true;
    demoButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) demoButton.focus({ preventScroll: true });
  }

  function openProject(key, trigger) {
    var project = projects[key];
    if (!project) return;
    lastTrigger = trigger || null;
    currentProject = project;
    index.textContent = project.index;
    kind.textContent = project.kind;
    status.textContent = project.status;
    title.textContent = project.title;
    description.textContent = project.description;
    features.textContent = '';
    project.features.forEach(function (feature) {
      var item = document.createElement('li');
      item.textContent = feature;
      features.appendChild(item);
    });
    siteLink.href = project.url;
    siteLink.setAttribute('aria-label', 'Открыть сайт проекта ' + project.title);
    var hasDownloads = Boolean(project.downloads);
    if (downloadBlock) downloadBlock.hidden = !hasDownloads;
    demoButton.disabled = !hasDownloads;
    demoButton.setAttribute('aria-expanded', 'false');
    note.textContent = hasDownloads
      ? 'Выберите систему — начнётся скачивание архива.'
      : 'Приложения для macOS и Windows в разработке.';
    closeMenu(false);
    openButtons.forEach(function (button) {
      button.setAttribute('aria-expanded', String(button === trigger));
    });
    setOpenState(true);
  }

  function closeProject() {
    closeMenu(false);
    setOpenState(false);
    openButtons.forEach(function (button) {
      button.setAttribute('aria-expanded', 'false');
    });
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus({ preventScroll: true });
    }
  }

  openButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      openProject(button.getAttribute('data-project-open'), button);
    });
  });

  Array.prototype.forEach.call(modal.querySelectorAll('[data-project-close]'), function (element) {
    element.addEventListener('click', closeProject);
  });

  if (closeButton) closeButton.addEventListener('click', closeProject);

  demoButton.addEventListener('click', function () {
    if (menuOpen) closeMenu(true);
    else openMenu();
  });

  menu.addEventListener('click', function (event) {
    var choice = event.target.closest('[data-platform]');
    if (!choice) return;
    var platform = choice.getAttribute('data-platform');
    var project = currentProject;
    var url = project && project.downloads ? project.downloads[platform] : null;
    if (!url) return;
    note.textContent = 'Скачивание для ' + platform + ' начинается…';
    closeMenu(false);
    var link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    demoButton.focus({ preventScroll: true });
  });

  document.addEventListener('pointerdown', function (event) {
    if (menuOpen && !menu.contains(event.target) && !demoButton.contains(event.target)) {
      closeMenu(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (modal.hidden) return;

    if (event.key === 'Escape' || event.key === 'Esc') {
      if (menuOpen) {
        event.preventDefault();
        closeMenu(true);
      } else {
        event.preventDefault();
        closeProject();
      }
      return;
    }

    if (event.key !== 'Tab') return;
    var focusable = focusableElements();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  menu.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
    if (!items.length) return;
    event.preventDefault();
    var current = items.indexOf(document.activeElement);
    var next = event.key === 'ArrowDown'
      ? (current + 1) % items.length
      : (current - 1 + items.length) % items.length;
    items[next].focus();
  });
})();
