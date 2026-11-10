(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const ui = {
    fileInput: $('fileInput'),
    dropZone: $('dropZone'),
    dropEmpty: $('dropEmpty'),
    photoPreview: $('photoPreview'),
    photoImage: $('photoImage'),
    previewFallback: $('previewFallback'),
    previewBadge: $('previewBadge'),
    replaceButton: $('replaceButton'),
    pickButton: $('pickButton'),
    demoButton: $('demoButton'),
    emptyDemoButton: $('emptyDemoButton'),
    cleanDemoButton: $('cleanDemoButton'),
    metaName: $('metaName'),
    metaSize: $('metaSize'),
    metaType: $('metaType'),
    fileKind: $('fileKind'),
    loadError: $('loadError'),
    modeHint: $('modeHint'),
    modeSwitch: document.querySelector('.mode-switch'),
    dataCard: document.querySelector('.data-card'),
    tabView: $('tabView'),
    tabClean: $('tabClean'),
    emptyData: $('emptyData'),
    viewPane: $('viewPane'),
    cleanPane: $('cleanPane'),
    cleanEmpty: $('cleanEmpty'),
    cleanWorkspace: $('cleanWorkspace'),
    diagnostics: $('diagnostics'),
    diagnosticsToggle: $('diagnosticsToggle'),
    diagnosticsBody: $('diagnosticsBody'),
    diagnosticsText: $('diagnosticsText'),
    diagnosticsFacts: $('diagnosticsFacts'),
    privacyBanner: $('privacyBanner'),
    privacyIcon: $('privacyIcon'),
    privacyTitle: $('privacyTitle'),
    privacyText: $('privacyText'),
    privacyCount: $('privacyCount'),
    sumDevice: $('sumDevice'),
    sumDeviceSub: $('sumDeviceSub'),
    sumDate: $('sumDate'),
    sumDateSub: $('sumDateSub'),
    sumPlace: $('sumPlace'),
    sumPlaceSub: $('sumPlaceSub'),
    sumFile: $('sumFile'),
    sumFileSub: $('sumFileSub'),
    exposureStrip: $('exposureStrip'),
    exposureItems: $('exposureItems'),
    locationCard: $('locationCard'),
    locCoords: $('locCoords'),
    locAltitude: $('locAltitude'),
    locDirection: $('locDirection'),
    locMapLink: $('locMapLink'),
    tagSearch: $('tagSearch'),
    tagGroup: $('tagGroup'),
    tagBody: $('tagBody'),
    tagCount: $('tagCount'),
    tagFilterNote: $('tagFilterNote'),
    tagEmpty: $('tagEmpty'),
    cleanFormatNote: $('cleanFormatNote'),
    cleanOptions: $('cleanOptions'),
    optGps: $('optGps'),
    optCamera: $('optCamera'),
    optDates: $('optDates'),
    optAuthor: $('optAuthor'),
    optSoftware: $('optSoftware'),
    optAll: $('optAll'),
    countGps: $('countGps'),
    countCamera: $('countCamera'),
    countDates: $('countDates'),
    countAuthor: $('countAuthor'),
    countSoftware: $('countSoftware'),
    countAll: $('countAll'),
    cleanList: $('cleanList'),
    cleanCount: $('cleanCount'),
    exportButton: $('exportButton'),
    cleanNote: $('cleanNote'),
    exportResult: $('exportResult'),
    exportResultTitle: $('exportResultTitle'),
    exportResultText: $('exportResultText'),
    cleanLimitNote: $('cleanLimitNote'),
    footerYear: $('footerYear')
  };

  const PARSE_OPTS = {
    tiff: true,
    ifd0: true,
    exif: true,
    gps: true,
    interop: true,
    ifd1: true,
    iptc: true,
    xmp: true,
    icc: true,
    jfif: true,
    ihdr: true
  };

  const GROUP_LABELS = {
    jfif: 'JFIF',
    ifd0: 'EXIF · изображение',
    exif: 'EXIF · съёмка',
    gps: 'GPS',
    iptc: 'IPTC',
    xmp: 'XMP',
    icc: 'Цветовой профиль',
    ihdr: 'PNG',
    interop: 'Interop'
  };

  const SUPPORTED_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'heic', 'heif', 'tif', 'tiff', 'webp', 'avif',
    'dng', 'cr2', 'nef', 'arw', 'raf', 'orf', 'rw2'
  ]);

  const RAW_EXTENSIONS = new Set(['dng', 'cr2', 'nef', 'arw', 'raf', 'orf', 'rw2']);

  const CAMERA_TAGS = new Set([
    'Make', 'Model', 'LensMake', 'LensModel', 'LensSerialNumber',
    'BodySerialNumber', 'SerialNumber', 'OwnerName', 'CameraOwnerName',
    'MakerNote', 'LensSpecification'
  ]);

  const DATE_TAGS = new Set([
    'DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTimeDigitized',
    'GPSDateStamp', 'GPSTimeStamp', 'OffsetTime', 'OffsetTimeOriginal',
    'OffsetTimeDigitized', 'SubSecTime', 'SubSecTimeOriginal', 'SubSecTimeDigitized'
  ]);

  const AUTHOR_TAGS = new Set([
    'Artist', 'Copyright', 'XPAuthor', 'UserComment', 'ImageDescription', 'OwnerName',
    'Creator', 'creator', 'Author', 'author', 'Description', 'description'
  ]);

  const SOFTWARE_TAGS = new Set([
    'Software', 'HostComputer', 'ProcessingSoftware'
  ]);

  const CLEAN_LABELS = {
    gps: 'Геоданные',
    camera: 'Камера и устройство',
    dates: 'Даты съёмки',
    author: 'Автор и подпись',
    software: 'Программа обработки',
    all: 'Все метаданные'
  };

  const state = {
    file: null,
    objectUrl: null,
    name: '',
    type: '',
    size: 0,
    imageWidth: 0,
    imageHeight: 0,
    merged: {},
    groups: {},
    flat: new Map(),
    diagnostics: null,
    rows: [],
    mode: 'view',
    loading: false,
    parseError: false,
    loadToken: 0
  };

  function init() {
    if (ui.footerYear) ui.footerYear.textContent = String(new Date().getFullYear());
    if (ui.fileKind) ui.fileKind.hidden = true;

    ui.pickButton.addEventListener('click', () => ui.fileInput.click());
    ui.replaceButton.addEventListener('click', (event) => {
      event.stopPropagation();
      ui.fileInput.click();
    });
    ui.demoButton.addEventListener('click', loadDemo);
    ui.emptyDemoButton.addEventListener('click', loadDemo);
    ui.cleanDemoButton.addEventListener('click', loadDemo);
    ui.fileInput.addEventListener('change', () => {
      const file = ui.fileInput.files && ui.fileInput.files[0];
      ui.fileInput.value = '';
      if (file) loadFile(file);
    });

    ui.dropZone.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      ui.fileInput.click();
    });
    ui.dropZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        ui.fileInput.click();
      }
    });
    ['dragenter', 'dragover'].forEach((type) => {
      ui.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        ui.dropZone.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      ui.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        ui.dropZone.classList.remove('is-dragging');
      });
    });
    ui.dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) loadFile(file);
    });

    ui.tabView.addEventListener('click', () => setMode('view'));
    ui.tabClean.addEventListener('click', () => setMode('clean'));
    ui.diagnosticsToggle.addEventListener('click', () => {
      const expanded = ui.diagnosticsToggle.getAttribute('aria-expanded') === 'true';
      ui.diagnosticsToggle.setAttribute('aria-expanded', String(!expanded));
      ui.diagnosticsBody.hidden = expanded;
      ui.diagnostics.classList.toggle('is-open', !expanded);
    });

    ui.photoImage.addEventListener('load', () => {
      state.imageWidth = ui.photoImage.naturalWidth || 0;
      state.imageHeight = ui.photoImage.naturalHeight || 0;
      ui.photoImage.hidden = false;
      ui.previewFallback.hidden = true;
      updateFileMeta();
      if (state.rows.length) {
        state.rows = buildRows();
        renderSummary();
        renderTags();
      }
    });
    ui.photoImage.addEventListener('error', () => {
      ui.photoImage.hidden = true;
      ui.previewFallback.hidden = false;
    });

    ui.tagSearch.addEventListener('input', renderTags);
    ui.tagGroup.addEventListener('change', renderTags);

    [ui.optGps, ui.optCamera, ui.optDates, ui.optAuthor, ui.optSoftware, ui.optAll].forEach((input) => {
      input.addEventListener('change', onCleanupChange);
    });

    ui.exportButton.addEventListener('click', exportClean);

    setMode('view');
  }

  function showLoadError(message) {
    if (!message) {
      ui.loadError.hidden = true;
      ui.loadError.textContent = '';
      return;
    }
    ui.loadError.hidden = false;
    ui.loadError.textContent = message;
  }

  function extensionOf(name) {
    const parts = String(name || '').split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  function isSupported(file) {
    if (!file) return false;
    const ext = extensionOf(file.name);
    if (SUPPORTED_EXTENSIONS.has(ext)) return true;
    return /^image\/(jpeg|png|webp|heic|heif|tiff|avif|x-adobe-dng|x-canon-cr2|x-nikon-nef|x-sony-arw)$/i.test(file.type || '');
  }

  function mimeFromName(name) {
    const ext = extensionOf(name);
    const map = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      avif: 'image/avif',
      dng: 'image/x-adobe-dng',
      cr2: 'image/x-canon-cr2',
      nef: 'image/x-nikon-nef',
      arw: 'image/x-sony-arw',
      raf: 'image/x-fuji-raf',
      orf: 'image/x-olympus-orf',
      rw2: 'image/x-panasonic-rw2'
    };
    return map[ext] || '';
  }

  function getFormat() {
    const type = (state.type || '').toLowerCase();
    const ext = extensionOf(state.name);
    if (type.includes('jpeg') || /^jpe?g$/.test(ext)) return 'JPEG';
    if (type.includes('png') || ext === 'png') return 'PNG';
    if (type.includes('heic') || type.includes('heif') || ext === 'heic' || ext === 'heif') return 'HEIC';
    if (type.includes('tiff') || ext === 'tif' || ext === 'tiff') return 'TIFF';
    if (type.includes('webp') || ext === 'webp') return 'WebP';
    if (type.includes('avif') || ext === 'avif') return 'AVIF';
    if (RAW_EXTENSIONS.has(ext) || type.includes('raw') || type.includes('dng')) return ext.toUpperCase();
    return 'Файл';
  }

  function isJpeg() {
    return getFormat() === 'JPEG';
  }

  function isPng() {
    return getFormat() === 'PNG';
  }

  function loadFile(file) {
    if (!file) return;
    if (!isSupported(file)) {
      showLoadError('Поддерживаются JPEG, PNG, HEIC, TIFF, WebP, AVIF и RAW (DNG, CR2, NEF, ARW, RAF, ORF, RW2). Другой файл открыть нельзя.');
      return;
    }

    showLoadError('');
    const token = ++state.loadToken;
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);

    state.file = file;
    state.name = file.name || 'photograph.jpg';
    state.type = file.type || mimeFromName(state.name);
    state.size = file.size || 0;
    state.imageWidth = 0;
    state.imageHeight = 0;
    state.merged = {};
    state.groups = {};
    state.flat = new Map();
    state.diagnostics = null;
    state.rows = [];
    state.loading = true;
    state.parseError = false;
    state.objectUrl = URL.createObjectURL(file);
    ui.dataCard.classList.add('is-scanning');
    ui.photoPreview.classList.add('is-scanning');

    ui.photoImage.hidden = false;
    ui.previewFallback.hidden = true;
    ui.photoImage.src = state.objectUrl;
    ui.photoImage.alt = 'Предпросмотр фотографии ' + state.name;
    ui.dropEmpty.hidden = true;
    ui.photoPreview.hidden = false;
    ui.metaName.textContent = state.name;
    ui.metaSize.textContent = formatBytes(state.size);
    ui.metaType.textContent = getFormat();
    ui.fileKind.textContent = getFormat();
    updateFileMeta();
    ui.emptyData.hidden = true;
    ui.cleanEmpty.hidden = true;
    ui.cleanWorkspace.hidden = false;
    ui.tagSearch.value = '';
    ui.tagGroup.value = 'all';
    renderLoadingState();
    setMode('view');
    parsePhoto(file, token);
  }

  async function parsePhoto(file, token) {
    let merged = {};
    let groups = {};
    const attempts = [];

    try {
      merged = (await exifr.parse(file, PARSE_OPTS)) || {};
      attempts.push({ name: 'full', ok: true });
    } catch (error) {
      attempts.push({ name: 'full', ok: false, error: String(error) });
    }

    // Always try the grouped pass, even when the merged pass failed.
    try {
      groups = (await exifr.parse(file, { ...PARSE_OPTS, mergeOutput: false })) || {};
      attempts.push({ name: 'groups', ok: true });
    } catch (error) {
      groups = {};
      attempts.push({ name: 'groups', ok: false, error: String(error) });
    }

    let flat = buildFlat(merged, groups);
    if (!hasInterestingMetadata(flat)) {
      try {
        const fallback = (await exifr.parse(file, true)) || {};
        attempts.push({ name: 'fallback', ok: true });
        merged = { ...fallback, ...merged };
        flat = buildFlat(merged, groups);
      } catch (error) {
        attempts.push({ name: 'fallback', ok: false, error: String(error) });
      }
    }

    if (!Object.keys(merged).length && Object.keys(groups).length) {
      merged = flattenGroupsToObject(groups);
      flat = buildFlat(merged, groups);
    }

    if (token !== state.loadToken) return;

    ui.dataCard.classList.remove('is-scanning');
    ui.photoPreview.classList.remove('is-scanning');
    state.merged = merged && typeof merged === 'object' ? merged : {};
    state.groups = groups && typeof groups === 'object' ? groups : {};
    state.flat = flat;
    state.diagnostics = {
      attempts,
      groupKeys: Object.keys(state.groups),
      mergedKeys: Object.keys(state.merged).length,
      flatKeys: Array.from(flat.keys()).length
    };
    state.loading = false;
    state.parseError = false;

    if (!state.imageWidth || !state.imageHeight) {
      const metaWidth = firstNumber(
        flatGet(flat, ['ImageWidth', 'ExifImageWidth']),
        state.groups.ifd0 && state.groups.ifd0.ImageWidth
      );
      const metaHeight = firstNumber(
        flatGet(flat, ['ImageHeight', 'ExifImageHeight']),
        state.groups.ifd0 && state.groups.ifd0.ImageHeight
      );
      state.imageWidth = state.imageWidth || metaWidth || 0;
      state.imageHeight = state.imageHeight || metaHeight || 0;
    }

    state.rows = buildRows();
    updateFileMeta();
    renderAll();
  }

  function hasInterestingMetadata(flat) {
    return ['Make', 'Model', 'CameraModel', 'DateTimeOriginal', 'CreateDate', 'latitude', 'GPSLatitude', 'GPSCoordinates', 'LensModel']
      .some((key) => flatGet(flat, [key]) != null);
  }

  function flattenGroupsToObject(groups) {
    const result = {};
    Object.keys(groups).forEach((groupKey) => {
      const group = groups[groupKey];
      if (!group || typeof group !== 'object') return;
      flattenLeafValues(group, (key, value) => {
        if (!(key in result)) result[key] = value;
      });
    });
    return result;
  }

  function flattenLeafValues(source, visit, prefix) {
    const base = prefix || '';
    Object.keys(source).forEach((key) => {
      const value = source[key];
      const path = base ? base + '.' + key : key;
      if (isPlainObject(value)) {
        flattenLeafValues(value, visit, path);
      } else {
        visit(key, value);
        if (path !== key) visit(path, value);
      }
    });
  }

  function buildFlat(merged, groups) {
    const flat = new Map();
    const put = (key, value) => {
      if (value == null) return;
      const normalized = String(key).toLowerCase();
      if (!flat.has(normalized)) flat.set(normalized, value);
    };

    if (merged && typeof merged === 'object') {
      Object.keys(merged).forEach((key) => {
        const value = merged[key];
        if (isPlainObject(value)) {
          flattenLeafValues(value, (leaf, leafValue) => put(leaf, leafValue));
        } else {
          put(key, value);
        }
      });
    }

    if (groups && typeof groups === 'object') {
      Object.keys(groups).forEach((groupKey) => {
        const group = groups[groupKey];
        if (!group || typeof group !== 'object') return;
        Object.keys(group).forEach((key) => {
          const value = group[key];
          if (isPlainObject(value)) {
            flattenLeafValues(value, (leaf, leafValue) => put(leaf, leafValue));
          } else {
            put(key, value);
          }
        });
      });
    }

    return flat;
  }

  function flatGet(flat, names) {
    if (!flat) return null;
    for (const name of names) {
      const key = String(name).toLowerCase();
      if (flat.has(key)) {
        const value = flat.get(key);
        if (value != null && value !== '') return value;
      }
    }
    for (const name of names) {
      const suffix = '.' + String(name).toLowerCase();
      for (const [key, value] of flat) {
        if (key.endsWith(suffix) && value != null && value !== '') return value;
      }
    }
    return null;
  }

  function renderLoadingState() {
    ui.privacyBanner.className = 'privacy-banner';
    ui.privacyIcon.textContent = '…';
    ui.privacyTitle.textContent = 'Читаем данные…';
    ui.privacyText.textContent = 'Это займёт мгновение. Файл остаётся на этом Mac.';
    ui.privacyCount.textContent = '…';
    ui.sumDevice.textContent = '…';
    ui.sumDeviceSub.textContent = '—';
    ui.sumDate.textContent = '…';
    ui.sumDateSub.textContent = '—';
    ui.sumPlace.textContent = '…';
    ui.sumPlaceSub.textContent = '—';
    ui.sumFile.textContent = dimensionsText();
    ui.sumFileSub.textContent = getFormat() + (state.size ? ' · ' + formatBytes(state.size) : '');
    ui.exposureStrip.hidden = true;
    ui.locationCard.hidden = true;
    clearNode(ui.tagBody);
    ui.tagCount.textContent = 'Читаем данные…';
    ui.tagFilterNote.textContent = '';
    ui.tagEmpty.hidden = true;
    resetCleanupUi();
    ui.modeHint.textContent = 'Читаем данные фотографии…';
  }

  function renderAll() {
    renderSummary();
    renderPrivacy();
    renderDiagnostics();
    renderLocation();
    renderTags();
    renderCleanup();
    updateModeHint();
    ui.viewPane.classList.remove('is-revealed');
    requestAnimationFrame(() => ui.viewPane.classList.add('is-revealed'));
  }

  function renderDiagnostics() {
    if (!state.file) {
      ui.diagnostics.hidden = true;
      return;
    }
    const metadataCount = state.rows.filter((row) => row.group !== 'Файл').length;
    const flat = state.flat || new Map();
    const hasMake = flatGet(flat, ['Make', 'CameraMake', 'DeviceMake', 'tiff:Make']) != null;
    const hasModel = flatGet(flat, ['Model', 'CameraModel', 'DeviceModel', 'tiff:Model']) != null;
    const hasDate = flatGet(flat, ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTime', 'DateCreated', 'CreationDate', 'xmp:CreateDate']) != null;
    const hasCore = hasMake || hasModel || hasDate || Boolean(getGps());

    if (metadataCount > 0 && hasCore) {
      ui.diagnostics.hidden = true;
      return;
    }

    ui.diagnostics.hidden = false;
    ui.diagnosticsText.textContent = metadataCount
      ? 'В файле есть технические теги, но нет камеры, даты или GPS. Приложение читает только то, что реально записано в файле; если на телефоне данные есть, копия могла потерять их при отправке или экспорте.'
      : 'В файле нет читаемых EXIF/GPS-данных. Если на телефоне они есть, эта копия, скорее всего, была сохранена без метаданных — например, после отправки через мессенджер.';

    clearNode(ui.diagnosticsFacts);
    addDiagnosticFact('Формат', getFormat());
    addDiagnosticFact('Размер', formatBytes(state.size));
    addDiagnosticFact('Группы', (state.diagnostics && state.diagnostics.groupKeys && state.diagnostics.groupKeys.length)
      ? state.diagnostics.groupKeys.join(', ')
      : 'не найдены');
    addDiagnosticFact('Тегов', String(metadataCount));
    const errors = state.diagnostics && state.diagnostics.attempts
      ? state.diagnostics.attempts.filter((attempt) => !attempt.ok).map((attempt) => attempt.name)
      : [];
    addDiagnosticFact('Парсер', errors.length ? 'ошибки: ' + errors.join(', ') : 'без ошибок');
  }

  function addDiagnosticFact(term, value) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    ui.diagnosticsFacts.append(dt, dd);
  }

  function renderSummary() {
    const flat = state.flat || new Map();
    const make = cleanString(flatGet(flat, ['Make', 'CameraMake', 'DeviceMake', 'tiff:Make']));
    const model = cleanString(flatGet(flat, ['Model', 'CameraModel', 'DeviceModel', 'UniqueCameraModel', 'tiff:Model']));
    const lens = cleanString(flatGet(flat, ['LensModel', 'Lens', 'LensInfo', 'LensType']));

    if (make || model) {
      const main = model || make;
      let sub = 'Камера записана';
      if (lens) sub = lens;
      else if (make && main !== make) sub = make;
      ui.sumDevice.textContent = main;
      ui.sumDeviceSub.textContent = sub;
    } else if (lens) {
      ui.sumDevice.textContent = lens;
      ui.sumDeviceSub.textContent = 'Объектив';
    } else {
      ui.sumDevice.textContent = 'Не записано';
      ui.sumDeviceSub.textContent = 'Модель камеры отсутствует';
    }

    const dateValue = flatGet(flat, [
      'DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTime',
      'DateCreated', 'CreationDate', 'xmp:CreateDate', 'exif:DateTimeOriginal',
      'DateTimeDigitized'
    ]);
    const date = firstDate(dateValue);
    if (date) {
      ui.sumDate.textContent = formatDate(date);
      const time = formatTime(date);
      const extra = [];
      const iso = flatGet(flat, ['ISO', 'ISOSpeedRatings']);
      if (iso != null) extra.push('ISO ' + formatNumber(iso, 0));
      ui.sumDateSub.textContent = [time, ...extra].filter(Boolean).join(' · ');
    } else {
      const gpsDate = dateFromGps(flat);
      if (gpsDate) {
        ui.sumDate.textContent = formatDate(gpsDate);
        ui.sumDateSub.textContent = formatTime(gpsDate) + ' · по GPS';
      } else {
        ui.sumDate.textContent = 'Не записано';
        ui.sumDateSub.textContent = 'Дата съёмки отсутствует';
      }
    }

    const gps = getGps();
    if (gps) {
      ui.sumPlace.textContent = 'Есть координаты';
      ui.sumPlaceSub.textContent = formatCoords(gps.latitude, gps.longitude);
    } else {
      ui.sumPlace.textContent = 'Геоданных нет';
      ui.sumPlaceSub.textContent = 'Место не записано';
    }

    ui.sumFile.textContent = dimensionsText();
    ui.sumFileSub.textContent = getFormat() + (state.size ? ' · ' + formatBytes(state.size) : '');
    updateFileMeta();
    renderExposure(flat);
  }

  function renderExposure(flat) {
    const chips = [];
    const fNumber = flatGet(flat, ['FNumber', 'ApertureValue']);
    const exposure = flatGet(flat, ['ExposureTime', 'ShutterSpeedValue']);
    const iso = flatGet(flat, ['ISO', 'ISOSpeedRatings']);
    const focal = flatGet(flat, ['FocalLength']);
    const lens = flatGet(flat, ['LensModel']);
    if (fNumber != null) chips.push('f/' + formatNumber(fNumber, 1));
    if (exposure != null) chips.push(formatShutter(exposure));
    if (iso != null) chips.push('ISO ' + formatNumber(iso, 0));
    if (focal != null) chips.push(formatNumber(focal, 0) + ' мм');
    if (lens) chips.push(String(lens));
    if (!chips.length) {
      ui.exposureStrip.hidden = true;
      return;
    }
    ui.exposureStrip.hidden = false;
    clearNode(ui.exposureItems);
    chips.forEach((text) => {
      const chip = document.createElement('span');
      chip.className = 'exposure-chip';
      chip.textContent = text;
      ui.exposureItems.append(chip);
    });
  }

  function renderPrivacy() {
    const labels = getSensitiveLabels();
    const metadataCount = state.rows.filter((row) => row.group !== 'Файл').length;

    if (!state.file) return;

    if (state.parseError) {
      ui.privacyBanner.className = 'privacy-banner';
      ui.privacyIcon.textContent = '?';
      ui.privacyTitle.textContent = 'Метаданные не прочитаны';
      ui.privacyText.textContent = 'Файл открыт, но служебные данные не удалось разобрать.';
      ui.privacyCount.textContent = '0 тегов';
      return;
    }

    if (!metadataCount) {
      ui.privacyBanner.className = 'privacy-banner is-clean';
      ui.privacyIcon.textContent = '✓';
      ui.privacyTitle.textContent = 'Метаданных не найдено';
      ui.privacyText.textContent = 'В этом файле нет читаемых EXIF, GPS или IPTC-данных.';
      ui.privacyCount.textContent = '0 тегов';
      return;
    }

    if (labels.length) {
      ui.privacyBanner.className = 'privacy-banner is-warning';
      ui.privacyIcon.textContent = '!';
      ui.privacyTitle.textContent = 'В фото есть личные данные';
      ui.privacyText.textContent = 'Найдено: ' + labels.join(', ') + '.';
      ui.privacyCount.textContent = plural(state.rows.length, ['тег', 'тега', 'тегов']);
    } else {
      ui.privacyBanner.className = 'privacy-banner is-clean';
      ui.privacyIcon.textContent = '✓';
      ui.privacyTitle.textContent = 'Личных данных не найдено';
      ui.privacyText.textContent = 'Остались только технические параметры съёмки.';
      ui.privacyCount.textContent = plural(state.rows.length, ['тег', 'тега', 'тегов']);
    }
  }

  function getSensitiveLabels() {
    const labels = [];
    if (getGps()) labels.push('геоданные');

    const tags = new Set(state.rows.map((row) => row.tag));
    if (['SerialNumber', 'BodySerialNumber', 'LensSerialNumber'].some((tag) => tags.has(tag))) {
      labels.push('серийные номера');
    }
    if (['Artist', 'Copyright', 'OwnerName', 'CameraOwnerName', 'Creator', 'creator', 'Author', 'author'].some((tag) => tags.has(tag))) {
      labels.push('подпись автора');
    }
    if (tags.has('UserComment')) labels.push('комментарий');
    if (tags.has('ImageDescription')) labels.push('описание');
    return labels;
  }

  function renderLocation() {
    const gps = getGps();
    if (!gps || !state.file) {
      ui.locationCard.hidden = true;
      return;
    }

    ui.locationCard.hidden = false;
    ui.locCoords.textContent = formatCoords(gps.latitude, gps.longitude);
    ui.locAltitude.textContent = gps.altitude == null ? '—' : formatNumber(gps.altitude, 0) + ' м';
    ui.locDirection.textContent = gps.direction == null ? '—' : formatNumber(gps.direction, 0) + '°';
    ui.locMapLink.href = 'https://www.openstreetmap.org/?mlat=' +
      encodeURIComponent(gps.latitude.toFixed(6)) +
      '&mlon=' + encodeURIComponent(gps.longitude.toFixed(6)) +
      '#map=13/' + gps.latitude.toFixed(4) + '/' + gps.longitude.toFixed(4);
  }

  function getGps() {
    const flat = state.flat || new Map();
    const gpsGroup = state.groups && state.groups.gps ? state.groups.gps : {};
    let latitude = firstNumber(
      flatGet(flat, ['latitude', 'GPSLatitudeDecimal']),
      gpsGroup.latitude
    );
    let longitude = firstNumber(
      flatGet(flat, ['longitude', 'GPSLongitudeDecimal']),
      gpsGroup.longitude
    );

    if (latitude == null) {
      latitude = parseCoordinate(
        flatGet(flat, ['GPSLatitude', 'GPSLatitudeDecimal']),
        flatGet(flat, ['GPSLatitudeRef'])
      );
    }
    if (longitude == null) {
      longitude = parseCoordinate(
        flatGet(flat, ['GPSLongitude', 'GPSLongitudeDecimal']),
        flatGet(flat, ['GPSLongitudeRef'])
      );
    }

    if (latitude == null || longitude == null) {
      const pair = parseCoordinatePair(flatGet(flat, ['GPSCoordinates', 'GPSPosition', 'Location']));
      if (pair) {
        latitude = pair.latitude;
        longitude = pair.longitude;
      }
    }

    if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const altitudeRaw = firstNumber(
      flatGet(flat, ['GPSAltitude', 'GPSAltitudeMeters']),
      gpsGroup.GPSAltitude
    );
    const altitudeRef = flatGet(flat, ['GPSAltitudeRef']) != null
      ? flatGet(flat, ['GPSAltitudeRef'])
      : gpsGroup.GPSAltitudeRef;
    const belowSeaLevel = altitudeRef === 1 ||
      (Array.isArray(altitudeRef) && altitudeRef[0] === 1) ||
      (altitudeRef && typeof altitudeRef === 'object' && altitudeRef['0'] === 1);
    const directionRaw = firstNumber(
      flatGet(flat, ['GPSImgDirection', 'GPSImageDirection']),
      gpsGroup.GPSImgDirection
    );

    return {
      latitude,
      longitude,
      altitude: altitudeRaw == null ? null : (belowSeaLevel ? -altitudeRaw : altitudeRaw),
      direction: directionRaw
    };
  }

  function dateFromGps(flat) {
    const date = flatGet(flat, ['GPSDateStamp']);
    const time = flatGet(flat, ['GPSTimeStamp']);
    if (!date || !time) return null;
    const dateText = String(date).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const timeParts = Array.isArray(time) ? time : String(time).split(':');
    const timeText = timeParts
      .map((part) => String(Number(part) || 0).padStart(2, '0'))
      .join(':');
    const parsed = new Date(dateText + 'T' + timeText + 'Z');
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function buildRows() {
    const rows = [];
    const width = state.imageWidth || 0;
    const height = state.imageHeight || 0;

    rows.push({ group: 'Файл', tag: 'Имя файла', value: state.name || '—' });
    rows.push({ group: 'Файл', tag: 'Размер', value: formatBytes(state.size) });
    rows.push({ group: 'Файл', tag: 'Тип', value: getFormat() });
    if (width && height) {
      rows.push({ group: 'Файл', tag: 'Размер изображения', value: width + ' × ' + height + ' px' });
    }

    Object.keys(state.groups).forEach((groupKey) => {
      const group = state.groups[groupKey];
      if (!group || typeof group !== 'object') return;
      const label = GROUP_LABELS[groupKey] || 'Прочее';
      flattenGroup(group, label, rows);
    });

    if (!rows.some((row) => row.group !== 'Файл')) {
      Object.keys(state.merged).forEach((key) => {
        if (key === 'latitude' || key === 'longitude') return;
        rows.push({
          group: 'Прочее',
          tag: key,
          value: formatTagValue(key, state.merged[key])
        });
      });
    }

    return rows;
  }

  function flattenGroup(group, label, rows, prefix) {
    const keyPrefix = prefix || '';
    Object.keys(group).forEach((key) => {
      const value = group[key];
      const fullKey = keyPrefix ? keyPrefix + '.' + key : key;
      if (isPlainObject(value)) {
        flattenGroup(value, label, rows, fullKey);
        return;
      }
      if (key === 'thumbnail') return;
      rows.push({
        group: label,
        tag: fullKey,
        value: formatTagValue(fullKey, value)
      });
    });
  }

  function renderTags() {
    if (!state.file) return;

    const query = (ui.tagSearch.value || '').trim().toLowerCase();
    const groupFilter = ui.tagGroup.value || 'all';
    const groups = [...new Set(state.rows.map((row) => row.group))];
    rebuildGroupOptions(groups);

    const filtered = state.rows.filter((row) => {
      if (groupFilter !== 'all' && row.group !== groupFilter) return false;
      if (!query) return true;
      return (row.tag + ' ' + row.value + ' ' + row.group).toLowerCase().includes(query);
    });

    ui.tagCount.textContent = plural(filtered.length, ['тег', 'тега', 'тегов']);
    ui.tagFilterNote.textContent = query || groupFilter !== 'all'
      ? 'Показано ' + filtered.length + ' из ' + state.rows.length
      : 'Показаны все найденные данные';

    clearNode(ui.tagBody);
    if (!filtered.length) {
      ui.tagEmpty.hidden = false;
      return;
    }
    ui.tagEmpty.hidden = true;

    const fragment = document.createDocumentFragment();
    filtered.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.style.setProperty('--row-index', String(Math.min(index, 14)));

      const tagCell = document.createElement('td');
      const tagName = document.createElement('span');
      tagName.className = 'tag-name';
      tagName.textContent = row.tag;
      tagName.title = row.tag;
      tagCell.append(tagName);

      const valueCell = document.createElement('td');
      const valueText = document.createElement('span');
      valueText.className = 'tag-value';
      valueText.textContent = row.value;
      valueCell.append(valueText);

      const groupCell = document.createElement('td');
      groupCell.className = 'tag-group';
      groupCell.textContent = row.group;

      const actionCell = document.createElement('td');
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'tag-copy';
      copyButton.textContent = '⧉';
      copyButton.setAttribute('aria-label', 'Копировать значение тега ' + row.tag);
      copyButton.addEventListener('click', () => copyValue(row.value, copyButton));

      actionCell.append(copyButton);
      tr.append(tagCell, valueCell, groupCell, actionCell);
      fragment.append(tr);
    });
    ui.tagBody.append(fragment);
  }

  function rebuildGroupOptions(groups) {
    const current = ui.tagGroup.value || 'all';
    const wanted = ['all', ...groups];
    const existing = [...ui.tagGroup.options].map((option) => option.value);
    if (existing.length === wanted.length && wanted.every((value, index) => existing[index] === value)) {
      return;
    }
    clearNode(ui.tagGroup);
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Все группы';
    ui.tagGroup.append(allOption);
    groups.forEach((group) => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      ui.tagGroup.append(option);
    });
    ui.tagGroup.value = wanted.includes(current) ? current : 'all';
  }

  function renderCleanup() {
    if (!state.file) {
      resetCleanupUi();
      return;
    }

    const format = getFormat();
    const canSelective = format === 'JPEG';
    const canAll = format === 'JPEG' || format === 'PNG';
    const counts = getCleanupCounts();

    ui.cleanFormatNote.textContent = format === 'JPEG'
      ? 'JPEG · выборочная очистка'
      : format === 'PNG'
        ? 'PNG · все метаданные'
        : format + ' · только просмотр';

    const rows = [
      [ui.optGps, ui.countGps, counts.gps, canSelective],
      [ui.optCamera, ui.countCamera, counts.camera, canSelective],
      [ui.optDates, ui.countDates, counts.dates, canSelective],
      [ui.optAuthor, ui.countAuthor, counts.author, canSelective],
      [ui.optSoftware, ui.countSoftware, counts.software, canSelective]
    ];

    rows.forEach(([input, countNode, count, available]) => {
      countNode.textContent = String(count);
      input.disabled = !available || count === 0;
      if (input.disabled) input.checked = false;
    });

    ui.optAll.disabled = !canAll || counts.all === 0;
    ui.countAll.textContent = counts.all ? String(counts.all) : '—';
    if (ui.optAll.disabled) ui.optAll.checked = false;

    const allChecked = ui.optAll.checked;
    rows.forEach(([input]) => {
      if (allChecked) input.disabled = true;
    });

    ui.cleanLimitNote.hidden = canAll;
    if (!canAll) {
      ui.cleanLimitNote.textContent = 'В первой версии очистка доступна для JPEG и PNG. Для HEIC, TIFF и WebP можно посмотреть данные, но не сохранить очищенную копию.';
    } else if (canAll && !canSelective) {
      ui.cleanLimitNote.hidden = false;
      ui.cleanLimitNote.textContent = 'Для PNG доступна очистка всех метаданных. Выборочная очистка появится позже.';
    }

    updateCleanPreview();
  }

  function resetCleanupUi() {
    [ui.optGps, ui.optCamera, ui.optDates, ui.optAuthor, ui.optSoftware, ui.optAll].forEach((input) => {
      input.checked = false;
      input.disabled = true;
    });
    ui.countGps.textContent = '0';
    ui.countCamera.textContent = '0';
    ui.countDates.textContent = '0';
    ui.countAuthor.textContent = '0';
    ui.countSoftware.textContent = '0';
    ui.countAll.textContent = '—';
    ui.exportButton.disabled = true;
    ui.exportResult.hidden = true;
    ui.cleanLimitNote.hidden = true;
    ui.cleanList.innerHTML = '<li class="clean-list-empty">Ничего не выбрано</li>';
    ui.cleanCount.textContent = '0';
  }

  function getCleanupCounts() {
    const tags = state.rows.filter((row) => row.group !== 'Файл');
    return {
      gps: tags.filter((row) => row.group === 'GPS' || /^GPS/i.test(row.tag)).length,
      camera: tags.filter((row) => CAMERA_TAGS.has(row.tag)).length,
      dates: tags.filter((row) => DATE_TAGS.has(row.tag)).length,
      author: tags.filter((row) => AUTHOR_TAGS.has(row.tag)).length,
      software: tags.filter((row) => SOFTWARE_TAGS.has(row.tag)).length,
      all: tags.length
    };
  }

  function getSelectedOptions() {
    if (ui.optAll.checked) return ['all'];
    return [
      ['gps', ui.optGps],
      ['camera', ui.optCamera],
      ['dates', ui.optDates],
      ['author', ui.optAuthor],
      ['software', ui.optSoftware]
    ].filter(([, input]) => input.checked).map(([key]) => key);
  }

  function onCleanupChange(event) {
    const target = event.target;
    const all = ui.optAll;
    const individual = [ui.optGps, ui.optCamera, ui.optDates, ui.optAuthor, ui.optSoftware];

    if (target === all && all.checked) {
      individual.forEach((input) => { input.checked = false; });
    } else if (target !== all && target.checked) {
      all.checked = false;
    }

    ui.exportResult.hidden = true;
    renderCleanup();
  }

  function updateCleanPreview() {
    const selected = getSelectedOptions();
    const counts = getCleanupCounts();
    clearNode(ui.cleanList);
    let total = 0;

    if (!selected.length) {
      const empty = document.createElement('li');
      empty.className = 'clean-list-empty';
      empty.textContent = 'Ничего не выбрано';
      ui.cleanList.append(empty);
    } else if (selected.includes('all')) {
      const item = document.createElement('li');
      item.textContent = 'Все метаданные: EXIF, GPS, IPTC, XMP и служебные блоки';
      ui.cleanList.append(item);
      total = counts.all;
    } else {
      selected.forEach((key) => {
        const item = document.createElement('li');
        item.textContent = CLEAN_LABELS[key];
        ui.cleanList.append(item);
        total += counts[key] || 0;
      });
    }

    ui.cleanCount.textContent = String(total);
    const format = getFormat();
    const can = format === 'JPEG' || format === 'PNG';
    ui.exportButton.disabled = !can || !selected.length;
    ui.cleanNote.textContent = selected.includes('all')
      ? 'Ориентация и цветовой профиль сохранятся. Оригинал не меняется.'
      : 'Ориентация и цветовой профиль сохраняются. XMP/IPTC удаляются вместе с выбранными данными.';
    if (!can) {
      ui.cleanNote.textContent = 'Для этого формата очистка пока недоступна; данные можно только просмотреть.';
    }
  }

  async function exportClean() {
    const options = getSelectedOptions();
    if (!state.file || !options.length || ui.exportButton.disabled) return;

    ui.exportButton.disabled = true;
    ui.exportButton.textContent = 'Готовим копию…';
    ui.exportResult.hidden = true;

    try {
      const blob = await cleanFile(state.file, options);
      if (!blob || !blob.size) throw new Error('Не удалось получить очищенный файл.');

      const fileName = cleanFileName(state.file.name, blob.type);
      downloadBlob(blob, fileName);
      const verification = await verifyClean(blob, options);
      showExportResult('Готово', 'Скачано: ' + fileName + '. ' + verification, false);
    } catch (error) {
      showExportResult('Не получилось', error && error.message ? error.message : 'Не удалось очистить файл.', true);
    } finally {
      ui.exportButton.textContent = 'Скачать чистую копию';
      ui.exportButton.disabled = false;
      updateCleanPreview();
    }
  }

  function showExportResult(title, text, isError) {
    ui.exportResult.hidden = false;
    ui.exportResult.classList.toggle('is-error', Boolean(isError));
    ui.exportResult.querySelector('.result-icon').textContent = isError ? '!' : '✓';
    ui.exportResultTitle.textContent = title;
    ui.exportResultText.textContent = text;
  }

  async function cleanFile(file, options) {
    const format = getFormat();
    if (format === 'JPEG') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const binary = bytesToBinary(bytes);
      const output = options.includes('all')
        ? stripAllJpeg(binary)
        : stripSelectedJpeg(binary, options);
      return new Blob([binaryToBytes(output)], { type: 'image/jpeg' });
    }

    if (format === 'PNG') {
      if (!options.includes('all')) {
        throw new Error('Для PNG в первой версии доступна только очистка всех метаданных.');
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      return new Blob([stripPngMetadata(bytes)], { type: 'image/png' });
    }

    throw new Error('Очистка этого формата пока не поддерживается.');
  }

  function stripAllJpeg(binary) {
    const orientation = readJpegOrientation(binary);
    let result = binary;

    try {
      if (orientation != null) {
        const minimal = {
          '0th': { [piexif.ImageIFD.Orientation]: orientation },
          'Exif': {},
          'GPS': {},
          'Interop': {},
          '1st': {},
          'thumbnail': null
        };
        result = piexif.insert(piexif.dump(minimal), binary);
      } else {
        result = piexif.remove(binary);
      }
    } catch (error) {
      result = binary;
    }

    return stripJpegSegments(result);
  }

  function stripSelectedJpeg(binary, options) {
    const selected = new Set(options);
    let result = binary;

    try {
      const exifObj = piexif.load(binary);
      exifObj['0th'] = exifObj['0th'] || {};
      exifObj['Exif'] = exifObj['Exif'] || {};
      exifObj['GPS'] = exifObj['GPS'] || {};
      exifObj['Interop'] = {};
      exifObj['1st'] = {};
      exifObj['thumbnail'] = null;

      if (selected.has('gps')) {
        exifObj['GPS'] = {};
      }

      if (selected.has('camera')) {
        deleteMany(exifObj['0th'], [0x010F, 0x0110]);
        deleteMany(exifObj['Exif'], [
          0xA430, 0xA431, 0xA432, 0xA433, 0xA434, 0xA435, 0x927C
        ]);
      }

      if (selected.has('dates')) {
        deleteMany(exifObj['0th'], [0x0132]);
        deleteMany(exifObj['Exif'], [
          0x9003, 0x9004, 0x9010, 0x9011, 0x9012,
          0x9290, 0x9291, 0x9292
        ]);
        deleteMany(exifObj['GPS'], [0x0007, 0x001D]);
      }

      if (selected.has('author')) {
        deleteMany(exifObj['0th'], [0x010E, 0x013B, 0x8298, 0x9C9D, 0x9C9E, 0x9C9F]);
        deleteMany(exifObj['Exif'], [0x9286, 0xA430]);
      }

      if (selected.has('software')) {
        deleteMany(exifObj['0th'], [0x000B, 0x0131, 0x013C]);
      }

      result = piexif.insert(piexif.dump(exifObj), binary);
    } catch (error) {
      result = binary;
    }

    return stripJpegSegments(result);
  }

  function deleteMany(ifd, tags) {
    tags.forEach((tag) => {
      delete ifd[tag];
    });
  }

  function readJpegOrientation(binary) {
    try {
      const exifObj = piexif.load(binary);
      const value = exifObj && exifObj['0th'] ? exifObj['0th'][piexif.ImageIFD.Orientation] : null;
      return typeof value === 'number' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function stripJpegSegments(binary) {
    if (!binary || binary.length < 4 || binary.charCodeAt(0) !== 0xFF || binary.charCodeAt(1) !== 0xD8) {
      return binary;
    }

    let output = '\xFF\xD8';
    let index = 2;

    while (index < binary.length) {
      if (binary.charCodeAt(index) !== 0xFF) {
        output += binary.slice(index);
        break;
      }

      const markerStart = index;
      while (index < binary.length && binary.charCodeAt(index) === 0xFF) index++;
      if (index >= binary.length) break;
      const marker = binary.charCodeAt(index++);

      if (marker === 0xD9 || marker === 0xDA) {
        output += binary.slice(markerStart);
        break;
      }

      if (index + 2 > binary.length) {
        output += binary.slice(markerStart);
        break;
      }

      const length = (binary.charCodeAt(index) << 8) | binary.charCodeAt(index + 1);
      if (length < 2 || index + length > binary.length) {
        output += binary.slice(markerStart);
        break;
      }

      const end = index + length;
      const payloadStart = index + 2;
      let drop = false;

      if (marker === 0xE1) {
        const head = binary.slice(payloadStart, Math.min(payloadStart + 29, end));
        if (head.startsWith('http://ns.adobe.com/xap/1.0/') || head.startsWith('http://ns.adobe.com/xmp/extension/')) {
          drop = true;
        }
      } else if (marker === 0xED || marker === 0xFE) {
        drop = true;
      }

      if (!drop) output += binary.slice(markerStart, end);
      index = end;
    }

    return output;
  }

  function stripPngMetadata(bytes) {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 8 || signature.some((value, index) => bytes[index] !== value)) {
      throw new Error('Файл не похож на PNG.');
    }

    const remove = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);
    const chunks = [new Uint8Array(signature)];
    let offset = 8;

    while (offset + 12 <= bytes.length) {
      const length = readUint32(bytes, offset);
      const typeBytes = bytes.subarray(offset + 4, offset + 8);
      const type = String.fromCharCode(...typeBytes);
      const total = 12 + length;
      if (offset + total > bytes.length) break;
      if (!remove.has(type)) {
        chunks.push(bytes.subarray(offset, offset + total));
      }
      offset += total;
      if (type === 'IEND') break;
    }

    return concatBytes(chunks);
  }

  async function verifyClean(blob, options) {
    let merged = null;
    let groups = null;
    try {
      merged = await exifr.parse(blob, PARSE_OPTS);
      groups = await exifr.parse(blob, { ...PARSE_OPTS, mergeOutput: false });
    } catch (error) {
      merged = null;
      groups = null;
    }

    const gps = groups && groups.gps;
    const hasGps = Boolean(gps && (gps.latitude != null || gps.longitude != null));
    const hasCamera = Boolean(merged && (merged.Make || merged.Model || merged.SerialNumber || merged.BodySerialNumber || merged.LensModel || merged.LensSerialNumber));
    const hasDates = Boolean(merged && (merged.DateTimeOriginal || merged.CreateDate || merged.ModifyDate || merged.DateTimeDigitized));
    const hasAuthor = Boolean(merged && (merged.Artist || merged.Copyright || merged.OwnerName));
    const hasSoftware = Boolean(merged && merged.Software);

    if (options.includes('all')) {
      if (hasGps || hasCamera || hasDates || hasAuthor || hasSoftware) {
        return 'Проверьте теги: часть служебных данных могла остаться.';
      }
      return 'Проверено: личные метаданные не найдены.';
    }

    const remaining = [];
    if (options.includes('gps') && hasGps) remaining.push('геоданные');
    if (options.includes('camera') && hasCamera) remaining.push('камера');
    if (options.includes('dates') && hasDates) remaining.push('даты');
    if (options.includes('author') && hasAuthor) remaining.push('автор');
    if (options.includes('software') && hasSoftware) remaining.push('программа');

    if (remaining.length) {
      return 'Внимание: остались ' + remaining.join(', ') + '. Проверьте теги.';
    }
    return 'Проверено: выбранные данные не найдены.';
  }

  function setMode(mode) {
    state.mode = mode;
    const isView = mode === 'view';
    document.body.classList.toggle('is-clean-mode', !isView);
    if (ui.modeSwitch) ui.modeSwitch.style.setProperty('--mode-index', isView ? '0' : '1');
    ui.tabView.classList.toggle('is-active', isView);
    ui.tabClean.classList.toggle('is-active', !isView);
    ui.tabView.setAttribute('aria-selected', String(isView));
    ui.tabClean.setAttribute('aria-selected', String(!isView));

    if (!state.file) {
      ui.emptyData.hidden = !isView;
      ui.viewPane.hidden = true;
      ui.cleanPane.hidden = isView;
      ui.cleanEmpty.hidden = false;
      ui.cleanWorkspace.hidden = true;
      ui.modeHint.textContent = isView
        ? 'Загрузите фотографию, чтобы увидеть её данные'
        : 'Загрузите фотографию, чтобы выбрать, что убрать';
      return;
    }

    ui.emptyData.hidden = true;
    ui.viewPane.hidden = !isView;
    ui.cleanPane.hidden = isView;
    ui.cleanEmpty.hidden = true;
    ui.cleanWorkspace.hidden = false;
    if (!isView) renderCleanup();
    updateModeHint();
  }

  function updateModeHint() {
    if (!state.file) return;
    if (state.loading) {
      ui.modeHint.textContent = 'Читаем данные фотографии…';
      return;
    }
    const count = state.rows.length;
    const hasGps = Boolean(getGps());
    ui.modeHint.textContent = count
      ? plural(count, ['тег', 'тега', 'тегов']) + ' · ' + (hasGps ? 'есть геоданные' : 'без геоданных')
      : 'Метаданные не найдены';
  }

  function updateFileMeta() {
    if (!state.file) return;
    ui.metaName.textContent = state.name || 'Без имени';
    ui.metaSize.textContent = formatBytes(state.size);
    ui.metaType.textContent = getFormat();
    ui.fileKind.hidden = false;
    ui.fileKind.textContent = getFormat();
    const dims = dimensionsText();
    ui.previewBadge.textContent = getFormat() + (dims !== '—' ? ' · ' + dims : '');
  }

  function dimensionsText() {
    return state.imageWidth && state.imageHeight
      ? state.imageWidth + ' × ' + state.imageHeight
      : '—';
  }

  async function loadDemo() {
    const demo = window.PRISM_DEMO_PHOTO;
    if (!demo || !demo.base64) {
      showLoadError('Демо-фото не найдено в этой сборке.');
      return;
    }
    try {
      const bytes = base64ToBytes(demo.base64);
      const file = new File([bytes], demo.name || 'prism-altai.jpg', { type: demo.type || 'image/jpeg' });
      loadFile(file);
    } catch (error) {
      showLoadError('Не удалось открыть демо-фото.');
    }
  }

  function copyValue(text, button) {
    const done = () => {
      const previous = button.textContent;
      button.textContent = '✓';
      setTimeout(() => { button.textContent = previous; }, 900);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      done();
    } catch (error) {
      // Clipboard is optional; the value stays visible in the table.
    }
    textarea.remove();
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function cleanFileName(name, type) {
    const base = String(name || 'photo').replace(/\.[^.]+$/, '');
    return base + '-clean.' + (type === 'image/png' ? 'png' : 'jpg');
  }

  function bytesToBinary(bytes) {
    let result = '';
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      result += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
    }
    return result;
  }

  function binaryToBytes(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index) & 0xFF;
    }
    return bytes;
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function concatBytes(chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  function readUint32(bytes, offset) {
    return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
  }

  function dmsToDecimal(value, ref) {
    return parseCoordinate(value, ref);
  }

  function parseCoordinate(value, ref) {
    if (value == null) return null;

    if (typeof value === 'number') {
      return Number.isFinite(value) ? applyDirection(value, ref) : null;
    }

    if (Array.isArray(value)) {
      const numbers = value
        .map((part) => Number(String(part).replace(',', '.')))
        .filter((part) => Number.isFinite(part));
      if (!numbers.length) return null;
      if (numbers.length >= 3) {
        return applyDirection(numbers[0] + numbers[1] / 60 + numbers[2] / 3600, ref);
      }
      if (numbers.length === 2) {
        return applyDirection(numbers[0] + numbers[1] / 60, ref);
      }
      return applyDirection(numbers[0], ref);
    }

    if (typeof value === 'object') {
      return parseCoordinatePair(value)?.latitude ?? null;
    }

    let text = String(value).trim();
    if (!text) return null;

    const hasDmsMarkers = /[°º'′"″]|(?:deg|d)\b/i.test(text);
    const hemisphereMatch = text.match(/[NSEW]/i);
    const hemisphere = hemisphereMatch ? hemisphereMatch[0].toUpperCase() : String(ref || '').toUpperCase();
    text = text
      .replace(/[NSEW]/gi, '')
      .replace(/deg/gi, ' ')
      .replace(/[°º]/g, ' ')
      .replace(/['′]/g, ' ')
      .replace(/["″]/g, ' ')
      .trim();

    let numbers = [];

    if (hasDmsMarkers) {
      numbers = (text.match(/[-+]?\d+(?:[.,]\d+)?/g) || [])
        .map((part) => Number(part.replace(',', '.')))
        .filter((part) => Number.isFinite(part));
    } else if (text.includes(',')) {
      const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 3) {
        numbers = parts.map((part) => Number(part.replace(',', '.'))).filter((part) => Number.isFinite(part));
      } else if (parts.length === 2) {
        const degrees = Number(parts[0].replace(',', '.'));
        const minutes = Number(parts[1].replace(',', '.'));
        if (Number.isFinite(degrees) && Number.isFinite(minutes) && Math.abs(minutes) <= 60 && Math.abs(degrees) <= 180) {
          numbers = [degrees, minutes];
        } else {
          numbers = [Number(parts.join('.').replace(',', '.'))].filter((part) => Number.isFinite(part));
        }
      }
    } else {
      numbers = text
        .split(/\s+/)
        .map((part) => Number(part.replace(',', '.')))
        .filter((part) => Number.isFinite(part));
    }

    if (numbers.length >= 3) {
      return applyDirection(numbers[0] + numbers[1] / 60 + numbers[2] / 3600, hemisphere);
    }
    if (numbers.length === 2) {
      return applyDirection(numbers[0] + numbers[1] / 60, hemisphere);
    }
    if (numbers.length === 1) {
      return applyDirection(numbers[0], hemisphere);
    }
    return null;
  }

  function parseCoordinatePair(value) {
    if (value == null) return null;

    if (typeof value === 'object' && !Array.isArray(value)) {
      const latitude = numberOrNull(value.latitude != null ? value.latitude : value.lat);
      const longitude = numberOrNull(value.longitude != null ? value.longitude : value.lon);
      if (latitude != null && longitude != null) return { latitude, longitude };
    }

    const text = String(value);
    const nsIndex = text.search(/[NS]/i);
    const ewIndex = text.search(/[EW]/i);

    if (nsIndex >= 0 && ewIndex > nsIndex) {
      const latText = text.slice(0, nsIndex + 1);
      const lonText = text.slice(nsIndex + 1, ewIndex + 1).replace(/^[\s,;]+/, '');
      const latitude = parseCoordinate(latText);
      const longitude = parseCoordinate(lonText);
      if (latitude != null && longitude != null) return { latitude, longitude };
    }

    const numbers = (text.match(/[-+]?\d+(?:[.,]\d+)?/g) || [])
      .map((part) => Number(part.replace(',', '.')))
      .filter((part) => Number.isFinite(part));
    if (numbers.length >= 2) {
      return { latitude: numbers[0], longitude: numbers[1] };
    }
    return null;
  }

  function applyDirection(value, ref) {
    const direction = String(ref || '').toUpperCase();
    return direction === 'S' || direction === 'W' ? -Math.abs(value) : value;
  }

  function formatTagValue(key, value) {
    if (value == null) return '—';
    if (key === 'MakerNote' || key === 'Thumbnail') {
      return value && value.length ? '[двоичные данные, ' + value.length + ' байт]' : '—';
    }
    if (value instanceof Date) return formatDate(value) + ', ' + formatTime(value);
    if (value instanceof Uint8Array) {
      if (!value.length) return '—';
      if (value.length > 32) return '[двоичные данные, ' + value.length + ' байт]';
      return Array.from(value).join(', ');
    }
    if (Array.isArray(value)) {
      if (!value.length) return '—';
      return value.map((item) => {
        if (item instanceof Date) return formatDate(item) + ' ' + formatTime(item);
        if (item && typeof item === 'object') return JSON.stringify(item);
        return String(item);
      }).join(', ');
    }
    if (typeof value === 'object') {
      try {
        const json = JSON.stringify(value);
        return json.length > 300 ? json.slice(0, 300) + '…' : json;
      } catch (error) {
        return '—';
      }
    }
    const text = String(value).replace(/\u0000/g, '').trim();
    if (!text) return '—';
    return text.length > 300 ? text.slice(0, 300) + '…' : text;
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '—';
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let value = Number(bytes);
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    const decimals = index === 0 ? 0 : 1;
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: decimals }).format(value) + ' ' + units[index];
  }

  function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  function formatTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatNumber(value, decimals) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0
    }).format(number);
  }

  function formatShutter(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return '—';
    if (number < 1) {
      return '1/' + Math.round(1 / number) + ' с';
    }
    return formatNumber(number, number < 10 ? 1 : 0) + ' с';
  }

  function formatCoords(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '—';
    const lat = Math.abs(latitude).toFixed(6) + '° ' + (latitude >= 0 ? 'N' : 'S');
    const lon = Math.abs(longitude).toFixed(6) + '° ' + (longitude >= 0 ? 'E' : 'W');
    return lat + ', ' + lon;
  }

  function firstDate(...values) {
    for (const value of values) {
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
      if (typeof value === 'string' && value.trim()) {
        const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        const date = new Date(normalized);
        if (!Number.isNaN(date.getTime())) return date;
      }
    }
    return null;
  }

  function firstNumber(...values) {
    for (const value of values) {
      const number = numberOrNull(value);
      if (number != null) return number;
    }
    return null;
  }

  function numberOrNull(value) {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function cleanString(value) {
    if (value == null) return '';
    return String(value).replace(/\u0000/g, '').trim();
  }

  function plural(number, forms) {
    const value = Math.abs(Number(number)) % 100;
    const last = value % 10;
    if (value > 10 && value < 20) return number + ' ' + forms[2];
    if (last === 1) return number + ' ' + forms[0];
    if (last >= 2 && last <= 4) return number + ' ' + forms[1];
    return number + ' ' + forms[2];
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Uint8Array);
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  init();
})();
