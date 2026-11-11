/* Prism Renew — local-first subscription control. */
(function () {
  'use strict';

  const STORAGE_KEY = 'prism-renew-subscriptions-v1';
  const CATEGORIES = {
    entertainment: { label: 'Развлечения', color: '#e8c486' },
    work: { label: 'Работа', color: '#9bc5be' },
    study: { label: 'Обучение', color: '#df9b83' },
    health: { label: 'Здоровье', color: '#91c9a5' },
    software: { label: 'Софт', color: '#b9a7d0' },
    other: { label: 'Другое', color: '#aaa79b' }
  };
  const PERIODS = {
    month: { label: 'в месяц', months: 1 },
    year: { label: 'в год', months: 12 },
    quarter: { label: 'за квартал', months: 3 },
    week: { label: 'в неделю', weeks: 1 }
  };
  const ICONS = {
    pay: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m4 10 3.2 3.2L16 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m4 14.5-.5 2 2-.5L15.8 5.7a1.3 1.3 0 0 0-1.8-1.8L4 14.5Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7 4v12M13 4v12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    restore: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 6.5A7 7 0 1 1 4.1 13M4 6.5V2.8M4 6.5h3.7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 6h10M8 6V4h4v2m-5.5 0 .6 9h5.8l.6-9M8.3 9v4M11.7 9v4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const ui = {
    app: document.getElementById('appShell'),
    progress: document.getElementById('progressBar'),
    heroMonthly: document.getElementById('heroMonthly'),
    heroMonthlySub: document.getElementById('heroMonthlySub'),
    heroYearly: document.getElementById('heroYearly'),
    statMonthly: document.getElementById('statMonthly'),
    statMonthlySub: document.getElementById('statMonthlySub'),
    statYearly: document.getElementById('statYearly'),
    statNext: document.getElementById('statNext'),
    statNextSub: document.getElementById('statNextSub'),
    statActive: document.getElementById('statActive'),
    statActiveSub: document.getElementById('statActiveSub'),
    list: document.getElementById('subscriptionList'),
    empty: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptyCopy: document.getElementById('emptyCopy'),
    emptyAdd: document.getElementById('emptyAddButton'),
    emptyDemo: document.getElementById('emptyDemoButton'),
    listNote: document.getElementById('listNote'),
    search: document.getElementById('searchInput'),
    sort: document.getElementById('sortSelect'),
    filterTabs: Array.from(document.querySelectorAll('[data-filter]')),
    filterActive: document.getElementById('filterActiveCount'),
    filterAll: document.getElementById('filterAllCount'),
    filterCancelled: document.getElementById('filterCancelledCount'),
    upcoming: document.getElementById('upcomingList'),
    upcomingNote: document.getElementById('upcomingNote'),
    upcomingBadge: document.getElementById('upcomingBadge'),
    categoryChart: document.getElementById('categoryChart'),
    yearChart: document.getElementById('yearChart'),
    yearTotal: document.getElementById('yearTotal'),
    formModal: document.getElementById('formModal'),
    form: document.getElementById('subscriptionForm'),
    formTitle: document.getElementById('formTitle'),
    formEyebrow: document.getElementById('formEyebrow'),
    editId: document.getElementById('editId'),
    name: document.getElementById('nameInput'),
    price: document.getElementById('priceInput'),
    count: document.getElementById('countInput'),
    countHint: document.getElementById('countHint'),
    period: document.getElementById('periodInput'),
    date: document.getElementById('dateInput'),
    dateHint: document.getElementById('dateHint'),
    category: document.getElementById('categoryInput'),
    autoRenew: document.getElementById('autoRenewInput'),
    autoRenewHint: document.getElementById('autoRenewHint'),
    paidField: document.getElementById('paidField'),
    paid: document.getElementById('paidInput'),
    notes: document.getElementById('notesInput'),
    formError: document.getElementById('formError'),
    deleteButton: document.getElementById('deleteButton'),
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmCopy: document.getElementById('confirmCopy'),
    confirmButton: document.getElementById('confirmButton'),
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    importInput: document.getElementById('importInput'),
    footerYear: document.getElementById('footerYear')
  };

  let state = {
    items: loadItems(),
    filter: 'active',
    search: '',
    sort: 'next'
  };
  let confirmAction = null;
  let formCloseTimer = null;
  let confirmCloseTimer = null;
  let toastTimer = null;

  if (ui.footerYear) ui.footerYear.textContent = String(new Date().getFullYear());
  root.classList.add('js');

  init();

  function init() {
    bind();
    setupReveal();
    setupPointer();
    setupProgress();
    render();
  }

  /* Data ------------------------------------------------------------ */

  function loadItems() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeItem).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function saveItems() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (error) {
      showToast('Не удалось сохранить данные в браузере.', true);
    }
  }

  function normalizeItem(item) {
    if (!item || typeof item !== 'object') return null;
    const name = String(item.name || '').trim();
    const price = Number(String(item.price).replace(',', '.'));
    if (!name || !Number.isFinite(price) || price <= 0) return null;
    const period = Object.hasOwn(PERIODS, item.period) ? item.period : 'month';
    const category = Object.hasOwn(CATEGORIES, item.category) ? item.category : 'other';
    const intervalCount = Math.min(36, Math.max(1, Math.trunc(Number(item.intervalCount) || 1)));
    const autoRenew = item.autoRenew !== false;
    return {
      id: String(item.id || uid()),
      name,
      price: Math.round(price * 100) / 100,
      period,
      intervalCount,
      autoRenew,
      paid: autoRenew ? false : item.paid === true,
      category,
      nextDate: validIso(item.nextDate) ? item.nextDate : defaultDate(),
      notes: String(item.notes || '').slice(0, 180),
      active: item.active !== false,
      createdAt: item.createdAt || new Date().toISOString(),
      history: Array.isArray(item.history) ? item.history.slice(-24) : []
    };
  }

  function seedDemo() {
    const today = startOfDay(new Date());
    const demo = [
      { name: 'Яндекс Плюс', price: 399, period: 'month', intervalCount: 1, autoRenew: true, category: 'entertainment', nextDate: isoWithOffset(today, 3), notes: 'Музыка и кино' },
      { name: 'Spotify', price: 299, period: 'month', intervalCount: 1, autoRenew: true, category: 'entertainment', nextDate: isoWithOffset(today, 7), notes: '' },
      { name: 'Notion Plus', price: 960, period: 'year', intervalCount: 1, autoRenew: true, category: 'software', nextDate: isoWithOffset(today, 19), notes: 'Личные заметки' },
      { name: 'Figma Professional', price: 2_400, period: 'month', intervalCount: 2, autoRenew: true, category: 'work', nextDate: isoWithOffset(today, 12), notes: 'Оплата за два месяца' },
      { name: 'Duolingo Super', price: 789, period: 'year', intervalCount: 1, autoRenew: true, category: 'study', nextDate: isoWithOffset(today, 31), notes: '' },
      { name: 'iCloud+ 200 ГБ', price: 149, period: 'month', intervalCount: 1, autoRenew: true, category: 'software', nextDate: isoWithOffset(today, 24), notes: '' },
      { name: 'Практикум', price: 2_990, period: 'year', intervalCount: 1, autoRenew: false, paid: true, category: 'study', nextDate: isoWithOffset(today, 52), notes: 'Курс оплачен разово' }
    ];
    state.items = demo.map((item) => normalizeItem({
      ...item,
      id: uid(),
      active: true,
      createdAt: new Date().toISOString()
    })).filter(Boolean);
    saveItems();
  }

  /* Dates and money ------------------------------------------------ */

  function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function isoWithOffset(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return toIso(copy);
  }

  function toIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseIso(value) {
    if (!validIso(value)) return startOfDay(new Date());
    return new Date(`${value}T00:00:00`);
  }

  function validIso(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
  }

  function defaultDate() {
    return isoWithOffset(startOfDay(new Date()), 30);
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function addMonths(date, months) {
    const copy = new Date(date);
    const day = copy.getDate();
    copy.setDate(1);
    copy.setMonth(copy.getMonth() + months);
    const max = new Date(copy.getFullYear(), copy.getMonth() + 1, 0).getDate();
    copy.setDate(Math.min(day, max));
    return copy;
  }

  function addPeriod(date, period, intervalCount = 1) {
    const count = Math.max(1, Math.trunc(Number(intervalCount) || 1));
    if (period === 'week') return addDays(date, 7 * count);
    if (period === 'year') return addMonths(date, 12 * count);
    if (period === 'quarter') return addMonths(date, 3 * count);
    return addMonths(date, count);
  }

  function periodMonths(period, intervalCount = 1) {
    const count = Math.max(1, Math.trunc(Number(intervalCount) || 1));
    if (period === 'week') return count * (12 / 52);
    if (period === 'year') return count * 12;
    if (period === 'quarter') return count * 3;
    return count;
  }

  function intervalMonths(item) {
    return periodMonths(item.period, item.intervalCount);
  }

  function isPaidManual(item) {
    return item.autoRenew === false && item.paid === true;
  }

  function daysUntil(iso) {
    const target = parseIso(iso);
    const today = startOfDay(new Date());
    return Math.round((target - today) / 86400000);
  }

  function formatDate(iso) {
    const date = parseIso(iso);
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date).replace('.', '');
  }

  function formatDateFull(iso) {
    if (!validIso(iso)) return '—';
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseIso(iso));
  }

  function relativeLabel(iso) {
    const days = daysUntil(iso);
    if (days === 0) return 'сегодня';
    if (days === 1) return 'завтра';
    if (days > 1) return `через ${days} дн.`;
    if (days === -1) return 'вчера';
    return `просрочено на ${Math.abs(days)} дн.`;
  }

  function monthlyAmount(item) {
    return item.price / Math.max(intervalMonths(item), 1 / 31);
  }

  function annualAmount(item) {
    return monthlyAmount(item) * 12;
  }

  function money(value) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(Math.round(value));
  }

  function setMoney(element, value) {
    if (!element) return;
    const numeric = Math.round(Number(value) || 0);
    const previous = Number(element.dataset.value || 0);
    element.dataset.value = String(numeric);
    if (reduceMotion || previous === numeric) {
      element.textContent = money(numeric);
      return;
    }
    const started = performance.now();
    const duration = 650;
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = previous + (numeric - previous) * eased;
      element.textContent = money(current);
      if (progress < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function activeItems() {
    return state.items.filter((item) => item.active);
  }

  function billableItems() {
    return activeItems().filter((item) => !isPaidManual(item));
  }

  function upcomingItems(limit) {
    const sorted = billableItems()
      .filter((item) => item.autoRenew && validIso(item.nextDate))
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }

  function monthlyTotal(items) {
    return items.reduce((sum, item) => sum + monthlyAmount(item), 0);
  }

  function scheduledMonths(count) {
    const today = startOfDay(new Date());
    const months = [];
    for (let index = 0; index < count; index += 1) {
      const start = new Date(today.getFullYear(), today.getMonth() + index, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + index + 1, 0);
      months.push({
        date: start,
        label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(start).replace('.', ''),
        total: 0
      });
    }

    billableItems().forEach((item) => {
      let cursor = parseIso(item.nextDate);
      const firstMonth = months[0].date;
      const lastEnd = new Date(months[months.length - 1].date.getFullYear(), months[months.length - 1].date.getMonth() + 1, 0);

      if (!item.autoRenew) {
        if (cursor < firstMonth || cursor > lastEnd) return;
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        const bucket = months.find((month) => `${month.date.getFullYear()}-${month.date.getMonth()}` === key);
        if (bucket) bucket.total += item.price;
        return;
      }

      let guard = 0;
      while (cursor < firstMonth && guard < 48) {
        cursor = addPeriod(cursor, item.period, item.intervalCount);
        guard += 1;
      }
      guard = 0;
      while (cursor.getTime() <= lastEnd.getTime() && guard < 96) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        const bucket = months.find((month) => `${month.date.getFullYear()}-${month.date.getMonth()}` === key);
        if (bucket) bucket.total += item.price;
        cursor = addPeriod(cursor, item.period, item.intervalCount);
        guard += 1;
      }
    });

    return months;
  }

  /* Rendering ------------------------------------------------------ */

  function render() {
    const active = activeItems();
    const billable = billableItems();
    const paidManual = active.filter(isPaidManual).length;
    const monthly = monthlyTotal(billable);
    const schedule = scheduledMonths(12);
    const yearly = schedule.reduce((sum, month) => sum + month.total, 0);
    const next = upcomingItems(1)[0];
    const weekly = billable.filter((item) => item.period === 'week').length;

    setMoney(ui.heroMonthly, monthly);
    setMoney(ui.heroYearly, yearly);
    setMoney(ui.statMonthly, monthly);
    setMoney(ui.statYearly, yearly);
    if (ui.heroMonthlySub) {
      ui.heroMonthlySub.textContent = active.length
        ? `${active.length} ${plural(active.length, 'подписка', 'подписки', 'подписок')}${paidManual ? ` · ${paidManual} оплачено` : weekly ? ` · ${weekly} ${plural(weekly, 'недельная', 'недельные', 'недельных')}` : ' · всё под контролем'}`
        : 'Добавьте первую подписку';
    }
    if (ui.statMonthlySub) ui.statMonthlySub.textContent = monthly ? `≈ ${money(monthly / 30)} в день` : active.length ? 'нет регулярных списаний' : 'пока ничего';
    if (ui.statNext) ui.statNext.textContent = next ? formatDate(next.nextDate) : '—';
    if (ui.statNextSub) ui.statNextSub.textContent = next ? `${next.name} · ${relativeLabel(next.nextDate)}` : active.length ? 'все ближайшие оплачены' : 'нет активных подписок';
    if (ui.statActive) ui.statActive.textContent = String(active.length);
    if (ui.statActiveSub) ui.statActiveSub.textContent = `из ${state.items.length} в списке${paidManual ? ` · ${paidManual} оплачено` : ''}`;

    ui.filterActive.textContent = String(active.length);
    ui.filterAll.textContent = String(state.items.length);
    ui.filterCancelled.textContent = String(state.items.length - active.length);

    renderList();
    renderUpcoming();
    renderCategories(billable);
    renderYear(schedule);
  }

  function renderList() {
    if (!ui.list || !ui.empty) return;
    const query = state.search.trim().toLowerCase();
    const paidCount = state.items.filter((item) => item.active && isPaidManual(item)).length;
    const filtered = state.items
      .filter((item) => {
        if (state.filter === 'active') return item.active;
        if (state.filter === 'cancelled') return !item.active;
        return true;
      })
      .filter((item) => {
        if (!query) return true;
        const category = CATEGORIES[item.category]?.label || '';
        return `${item.name} ${category} ${item.notes}`.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (state.sort === 'price') return monthlyAmount(b) - monthlyAmount(a);
        if (state.sort === 'name') return a.name.localeCompare(b.name, 'ru');
        return (a.nextDate || '').localeCompare(b.nextDate || '');
      });

    ui.list.textContent = '';
    filtered.forEach((item, index) => {
      ui.list.appendChild(createRow(item, index));
    });

    if (!filtered.length) {
      ui.list.hidden = true;
      ui.empty.hidden = false;
      const hasQuery = Boolean(query);
      const hasAny = state.items.length > 0;
      ui.emptyTitle.textContent = hasQuery ? 'Ничего не найдено' : state.filter === 'cancelled' ? 'Нет отменённых' : 'Пока пусто';
      ui.emptyCopy.textContent = hasQuery
        ? 'Попробуйте другое название или очистите поиск.'
        : hasAny
          ? 'В этом фильтре пока нет подписок. Измените фильтр или добавьте новую запись.'
          : 'Добавьте подписку — Prism Renew покажет, сколько она стоит в месяц и когда спишутся деньги.';
      ui.emptyDemo.hidden = hasAny;
      ui.listNote.textContent = hasQuery
        ? 'Поиск по названию, категории и заметке.'
        : 'Показаны подписки по выбранному фильтру.';
    } else {
      ui.list.hidden = false;
      ui.empty.hidden = true;
      ui.listNote.textContent = `${filtered.length} ${plural(filtered.length, 'запись', 'записи', 'записей')} в текущем виде. Напоминания работают локально.${paidCount ? ` ${paidCount} оплачено и не входит в расходы.` : ''}`;
    }
  }

  function createRow(item, index) {
    const category = CATEGORIES[item.category] || CATEGORIES.other;
    const active = item.active;
    const paidManual = active && isPaidManual(item);
    const days = daysUntil(item.nextDate);
    const dateClass = paidManual ? '' : days < 0 ? 'is-overdue' : days <= 7 ? 'is-soon' : '';
    const article = document.createElement('article');
    article.className = `subscription-row${active ? '' : ' is-cancelled'}${paidManual ? ' is-paid' : ''}`;
    article.dataset.id = item.id;
    article.style.setProperty('--category-color', category.color);
    article.style.setProperty('--row-index', String(Math.min(index, 10)));
    const initial = (item.name.trim()[0] || '•').toUpperCase();
    const note = item.notes ? `<span>${escapeHtml(item.notes)}</span>` : '';
    let statusClass = 'subscription-row__status--auto';
    let statusText = 'авто';
    if (!active) {
      statusClass = '';
      statusText = 'отменена';
    } else if (item.autoRenew === false) {
      statusClass = item.paid ? 'subscription-row__status--paid' : 'subscription-row__status--manual';
      statusText = item.paid ? 'оплачена' : 'ждёт оплаты';
    }
    const status = `<span class="subscription-row__status ${statusClass}">${statusText}</span>`;
    const payAction = !active
      ? ''
      : item.autoRenew
        ? iconButton('pay', 'Отметить оплату', ICONS.pay, item.id)
        : iconButton('pay', item.paid ? 'Снять отметку оплаты' : 'Отметить оплаченной', item.paid ? ICONS.restore : ICONS.pay, item.id);
    const dateCaption = !active ? 'на паузе' : !item.autoRenew ? (paidManual ? 'оплачено' : 'разово') : relativeLabel(item.nextDate);
    const dateValue = item.autoRenew ? formatDate(item.nextDate) : '—';
    article.innerHTML = `
      <span class="subscription-row__icon" aria-hidden="true">${escapeHtml(initial)}</span>
      <div class="subscription-row__main">
        <div class="subscription-row__title-line">
          <span class="subscription-row__name">${escapeHtml(item.name)}</span>
          ${status}
        </div>
        <div class="subscription-row__meta">
          <span><i aria-hidden="true"></i>${category.label}</span>
          <span>${cadenceLabel(item)}</span>
          ${note}
        </div>
      </div>
      <div class="subscription-row__price">
        <strong>${money(item.price)}</strong>
        <span>${pricePeriodLabel(item)}</span>
      </div>
      <div class="subscription-row__date ${dateClass}">
        <strong>${dateValue}</strong>
        <span>${dateCaption}</span>
      </div>
      <div class="row-actions">
        ${payAction}
        <button class="icon-button" type="button" data-action="edit" data-id="${escapeHtml(item.id)}" aria-label="Редактировать ${escapeHtml(item.name)}">${ICONS.edit}</button>
        ${active ? iconButton('toggle', 'Отменить подписку', ICONS.pause, item.id) : iconButton('toggle', 'Восстановить подписку', ICONS.restore, item.id)}
        <button class="icon-button icon-button--danger" type="button" data-action="delete" data-id="${escapeHtml(item.id)}" aria-label="Удалить ${escapeHtml(item.name)}">${ICONS.trash}</button>
      </div>
    `;
    return article;
  }

  function iconButton(action, title, icon, id) {
    return `<button class="icon-button" type="button" data-action="${action}" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}">${icon}</button>`;
  }

  function renderUpcoming() {
    if (!ui.upcoming) return;
    const items = upcomingItems(5);
    ui.upcomingBadge.textContent = String(items.length);
    ui.upcoming.textContent = '';
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'upcoming-empty';
      const hasBillable = billableItems().some((item) => item.autoRenew);
      empty.textContent = !state.items.length
        ? 'Пока нет списаний.'
        : hasBillable
          ? 'Все списания на паузе.'
          : 'Все ближайшие оплачены.';
      ui.upcoming.appendChild(empty);
      ui.upcomingNote.textContent = !state.items.length
        ? 'Ближайшие списания появятся после первой подписки.'
        : hasBillable
          ? 'Включите подписку или добавьте новую, чтобы увидеть календарь.'
          : 'У разовых подписок нет следующего списания — дата не нужна.';
      return;
    }
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'upcoming-item';
      const date = parseIso(item.nextDate);
      row.innerHTML = `
        <span class="upcoming-item__date">
          <strong>${date.getDate()}</strong>
          <span>${new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date).replace('.', '')}</span>
        </span>
        <span class="upcoming-item__copy">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${relativeLabel(item.nextDate)}</span>
        </span>
        <span class="upcoming-item__price">${money(item.price)}</span>
      `;
      ui.upcoming.appendChild(row);
    });
    ui.upcomingNote.textContent = `Ближайшее: ${formatDateFull(items[0].nextDate).replace(/\.$/, '')}.`;
  }

  function renderCategories(items) {
    if (!ui.categoryChart) return;
    const totals = {};
    items.forEach((item) => {
      const key = item.category;
      totals[key] = (totals[key] || 0) + monthlyAmount(item);
    });
    const max = Math.max(...Object.values(totals), 1);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    ui.categoryChart.textContent = '';
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'category-empty';
      empty.textContent = 'Появится, когда добавите подписки.';
      ui.categoryChart.appendChild(empty);
      return;
    }
    entries.forEach(([key, value]) => {
      const category = CATEGORIES[key] || CATEGORIES.other;
      const line = document.createElement('div');
      line.className = 'category-line';
      line.style.setProperty('--category-color', category.color);
      line.innerHTML = `
        <span class="category-line__label"><i class="category-line__dot" aria-hidden="true"></i>${category.label}</span>
        <span class="category-line__amount">${money(value)}</span>
        <span class="category-line__track"><i style="--category-percent:${Math.round((value / max) * 100)}"></i></span>
      `;
      ui.categoryChart.appendChild(line);
    });
  }

  function renderYear(months) {
    if (!ui.yearChart) return;
    const schedule = Array.isArray(months) ? months : scheduledMonths(12);
    const max = Math.max(...schedule.map((month) => month.total), 1);
    const total = schedule.reduce((sum, month) => sum + month.total, 0);
    ui.yearChart.textContent = '';
    schedule.forEach((month) => {
      const bar = document.createElement('span');
      bar.className = 'year-bar';
      bar.style.setProperty('--bar-height', String(Math.max(3, (month.total / max) * 100)));
      bar.title = `${month.label}: ${money(month.total)}`;
      bar.innerHTML = `<i aria-hidden="true"></i><span>${month.label}</span>`;
      ui.yearChart.appendChild(bar);
    });
    ui.yearTotal.textContent = `${money(total)} за год`;
  }

  /* Interactions --------------------------------------------------- */

  function bind() {
    [
      document.getElementById('addButton'),
      document.getElementById('headerAddButton'),
      document.getElementById('listAddButton'),
      ui.emptyAdd
    ].forEach((button) => {
      if (button) button.addEventListener('click', () => openForm());
    });

    [document.getElementById('demoButton'), ui.emptyDemo].forEach((button) => {
      if (button) button.addEventListener('click', handleDemo);
    });

    ui.filterTabs.forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.filter;
        ui.filterTabs.forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        renderList();
      });
    });

    ui.search.addEventListener('input', () => {
      state.search = ui.search.value;
      renderList();
    });

    ui.sort.addEventListener('change', () => {
      state.sort = ui.sort.value;
      renderList();
    });

    ui.list.addEventListener('click', handleListAction);

    ui.form.addEventListener('submit', handleSubmit);
    ui.deleteButton.addEventListener('click', handleFormDelete);
    if (ui.autoRenew) ui.autoRenew.addEventListener('change', updateAutoRenewHint);
    if (ui.count) ui.count.addEventListener('input', updateCountHint);
    if (ui.period) ui.period.addEventListener('change', updateCountHint);

    document.querySelectorAll('[data-close-modal]').forEach((element) => {
      element.addEventListener('click', closeForm);
    });
    document.querySelectorAll('[data-confirm-close]').forEach((element) => {
      element.addEventListener('click', closeConfirm);
    });
    ui.confirmButton.addEventListener('click', () => {
      const action = confirmAction;
      confirmAction = null;
      closeConfirm();
      if (action) action();
    });

    document.getElementById('exportButton').addEventListener('click', exportJson);
    document.getElementById('importButton').addEventListener('click', () => ui.importInput.click());
    ui.importInput.addEventListener('change', importJson);
    document.getElementById('resetButton').addEventListener('click', requestReset);
    document.getElementById('reminderButton').addEventListener('click', checkReminder);

    document.addEventListener('keydown', handleKeydown);
  }

  function handleListAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    if (button.dataset.action === 'edit') openForm(item);
    if (button.dataset.action === 'pay') markPaid(item);
    if (button.dataset.action === 'toggle') toggleItem(item);
    if (button.dataset.action === 'delete') requestDelete(item);
  }

  function handleDemo() {
    if (!state.items.length) {
      seedDemo();
      render();
      showToast('Пример загружен. Замените его своими подписками.');
      return;
    }
    openConfirm('Загрузить пример?', 'Текущий список будет заменён демонстрационными подписками.', () => {
      seedDemo();
      render();
      showToast('Пример загружен.');
    });
  }

  function openForm(item) {
    const editing = Boolean(item);
    ui.editId.value = editing ? item.id : '';
    ui.name.value = editing ? item.name : '';
    ui.price.value = editing ? String(item.price) : '';
    ui.count.value = editing ? String(item.intervalCount || 1) : '1';
    ui.period.value = editing ? item.period : 'month';
    ui.date.value = editing ? item.nextDate : defaultDate();
    ui.category.value = editing ? item.category : 'entertainment';
    ui.autoRenew.checked = editing ? item.autoRenew !== false : true;
    ui.paid.checked = editing ? item.paid === true : false;
    ui.notes.value = editing ? item.notes : '';
    updateAutoRenewHint();
    updateCountHint();
    ui.formTitle.textContent = editing ? 'Редактировать подписку' : 'Добавить подписку';
    ui.formEyebrow.textContent = editing ? 'Редактирование' : 'Новая запись';
    ui.deleteButton.hidden = !editing;
    ui.formError.hidden = true;
    ui.formError.textContent = '';
    showModal(ui.formModal);
    window.requestAnimationFrame(() => ui.name.focus({ preventScroll: true }));
  }

  function updateAutoRenewHint() {
    if (!ui.autoRenewHint || !ui.autoRenew) return;
    const auto = ui.autoRenew.checked;
    ui.autoRenewHint.textContent = auto
      ? 'Платёж будет повторяться автоматически.'
      : 'Разовая оплата: после отметки «оплачено» не входит в расходы.';
    if (ui.paidField) ui.paidField.hidden = auto;
    if (auto && ui.paid) ui.paid.checked = false;
    if (ui.date) {
      ui.date.disabled = !auto;
      ui.date.required = auto;
      const field = ui.date.closest('.field');
      if (field) field.classList.toggle('field--disabled', !auto);
    }
    if (ui.dateHint) {
      ui.dateHint.textContent = auto
        ? 'Когда спишутся деньги.'
        : 'У разовой подписки нет следующего списания.';
    }
  }

  function updateCountHint() {
    if (!ui.countHint) return;
    const count = Math.max(1, Math.trunc(Number(ui.count.value) || 1));
    const period = Object.hasOwn(PERIODS, ui.period.value) ? ui.period.value : 'month';
    ui.countHint.textContent = `${count} ${periodUnit(period, count)}`;
  }

  function closeForm() {
    closeModal(ui.formModal);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name = ui.name.value.trim();
    const rawPrice = ui.price.value.replace(/\s/g, '').replace(',', '.');
    const price = Number(rawPrice);
    const date = ui.date.value;
    const intervalCount = Math.trunc(Number(ui.count.value));
    if (!name) return showFormError('Введите название подписки.');
    if (!Number.isFinite(price) || price <= 0) return showFormError('Укажите стоимость больше нуля.');
    if (!Number.isInteger(intervalCount) || intervalCount < 1 || intervalCount > 36) {
      return showFormError('Количество периодов должно быть от 1 до 36.');
    }
    const autoRenew = Boolean(ui.autoRenew.checked);
    if (autoRenew && !validIso(date)) return showFormError('Выберите дату следующего списания.');
    const paid = autoRenew ? false : Boolean(ui.paid.checked);
    const data = {
      name,
      price: Math.round(price * 100) / 100,
      period: ui.period.value,
      intervalCount,
      autoRenew,
      paid,
      nextDate: validIso(date) ? date : defaultDate(),
      category: ui.category.value,
      notes: ui.notes.value.trim().slice(0, 180)
    };
    const id = ui.editId.value;
    if (id) {
      const nextPaid = autoRenew ? false : Boolean(paid);
      state.items = state.items.map((item) => item.id === id ? { ...item, ...data, paid: nextPaid } : item);
      showToast(autoRenew ? 'Подписка обновлена.' : 'Подписка обновлена без автопродления.');
    } else {
      state.items.push(normalizeItem({ ...data, id: uid(), active: true, createdAt: new Date().toISOString() }));
      showToast(autoRenew ? 'Подписка добавлена.' : paid ? 'Добавлено как оплаченная разовая подписка.' : 'Добавлено без автопродления. Отметьте оплату, чтобы исключить из расходов.');
    }
    saveItems();
    render();
    closeForm();
  }

  function showFormError(text) {
    ui.formError.textContent = text;
    ui.formError.hidden = false;
    ui.formError.focus?.();
  }

  function handleFormDelete() {
    const id = ui.editId.value;
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    closeForm();
    window.setTimeout(() => requestDelete(item), 270);
  }

  function markPaid(item) {
    const today = startOfDay(new Date());

    if (!item.autoRenew) {
      item.paid = !item.paid;
      item.history = Array.isArray(item.history) ? item.history : [];
      if (item.paid) item.history.push({ paidAt: toIso(today), amount: item.price, nextDate: item.nextDate, manual: true });
      item.history = item.history.slice(-24);
      saveItems();
      render();
      showToast(item.paid
        ? `«${item.name}» оплачена и исключена из расходов.`
        : `«${item.name}» снова учитывается в расходах.`);
      return;
    }

    let next = addPeriod(parseIso(item.nextDate), item.period, item.intervalCount);
    let guard = 0;
    while (next <= today && guard < 48) {
      next = addPeriod(next, item.period, item.intervalCount);
      guard += 1;
    }
    item.nextDate = toIso(next);
    item.history = Array.isArray(item.history) ? item.history : [];
    item.history.push({ paidAt: toIso(today), amount: item.price, nextDate: item.nextDate });
    item.history = item.history.slice(-24);
    saveItems();
    render();
    showToast(`«${item.name}» продлена до ${formatDateFull(item.nextDate).replace(/\.$/, '')}.`);
  }

  function toggleItem(item) {
    item.active = !item.active;
    saveItems();
    render();
    showToast(item.active ? 'Подписка снова активна.' : 'Подписка отменена. Запись сохранена.');
  }

  function requestDelete(item) {
    openConfirm('Удалить подписку?', `«${item.name}» будет удалена из списка. Это действие нельзя отменить.`, () => {
      state.items = state.items.filter((entry) => entry.id !== item.id);
      saveItems();
      render();
      showToast('Подписка удалена.');
    });
  }

  /* Modals and confirmation ---------------------------------------- */

  function showModal(modal) {
    if (!modal) return;
    if (ui.toast) ui.toast.classList.remove('is-visible');
    if (modal === ui.formModal && formCloseTimer) {
      window.clearTimeout(formCloseTimer);
      formCloseTimer = null;
    }
    if (modal === ui.confirmModal && confirmCloseTimer) {
      window.clearTimeout(confirmCloseTimer);
      confirmCloseTimer = null;
    }
    modal.hidden = false;
    document.body.classList.add('modal-open');
    window.requestAnimationFrame(() => {
      modal.classList.add('is-open');
      const focusTarget = modal.querySelector('input, select, textarea, button');
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    });
  }

  function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    const timer = window.setTimeout(() => {
      modal.hidden = true;
      if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
    }, 260);
    if (modal === ui.formModal && formCloseTimer) window.clearTimeout(formCloseTimer);
    if (modal === ui.formModal) formCloseTimer = timer;
    if (modal === ui.confirmModal && confirmCloseTimer) window.clearTimeout(confirmCloseTimer);
    if (modal === ui.confirmModal) confirmCloseTimer = timer;
  }

  function openConfirm(title, copy, action) {
    ui.confirmTitle.textContent = title;
    ui.confirmCopy.textContent = copy;
    confirmAction = action;
    showModal(ui.confirmModal);
    window.requestAnimationFrame(() => ui.confirmButton.focus({ preventScroll: true }));
  }

  function closeConfirm() {
    closeModal(ui.confirmModal);
    confirmAction = null;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      if (!ui.confirmModal.hidden) {
        closeConfirm();
        event.preventDefault();
        return;
      }
      if (!ui.formModal.hidden) {
        closeForm();
        event.preventDefault();
        return;
      }
    }
    if (event.key !== 'Tab') return;
    const modal = !ui.confirmModal.hidden ? ui.confirmModal : !ui.formModal.hidden ? ui.formModal : null;
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.offsetWidth > 0 || element.offsetHeight > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* Import and export ---------------------------------------------- */

  function exportJson() {
    const payload = JSON.stringify({
      app: 'Prism Renew',
      version: 2,
      exportedAt: new Date().toISOString(),
      subscriptions: state.items
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prism-renew-${toIso(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('JSON-копия сохранена.');
  }

  function importJson(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.subscriptions) ? parsed.subscriptions : null;
        if (!list) throw new Error('bad shape');
        const items = list.map(normalizeItem).filter(Boolean);
        if (!items.length) throw new Error('empty');
        openConfirm('Импортировать список?', `Будет загружено ${items.length} ${plural(items.length, 'подписка', 'подписки', 'подписок')}. Текущий список заменится.`, () => {
          state.items = items;
          saveItems();
          render();
          showToast('Список импортирован.');
        });
      } catch (error) {
        showToast('Не удалось прочитать JSON-файл.', true);
      }
    };
    reader.onerror = () => showToast('Не удалось открыть файл.', true);
    reader.readAsText(file);
  }

  function requestReset() {
    if (!state.items.length) {
      showToast('Список уже пуст.');
      return;
    }
    openConfirm('Очистить всё?', 'Все подписки будут удалены из этого браузера. Экспортированная копия останется у вас.', () => {
      state.items = [];
      saveItems();
      render();
      showToast('Список очищен.');
    });
  }

  async function checkReminder() {
    const next = upcomingItems(1)[0];
    if (!next) {
      showToast(billableItems().length ? 'Нет ближайших списаний для напоминания.' : 'Все ближайшие подписки оплачены.');
      return;
    }
    if (!('Notification' in window)) {
      showToast('Этот браузер не поддерживает уведомления.', true);
      return;
    }
    try {
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission !== 'granted') {
        showToast('Уведомления не разрешены в браузере.', true);
        return;
      }
      new Notification('Prism Renew', {
        body: `${next.name}: ${money(next.price)} — ${relativeLabel(next.nextDate)} (${formatDateFull(next.nextDate)}).`
      });
      showToast('Напоминание отправлено.');
    } catch (error) {
      showToast('Браузер не позволил показать уведомление.', true);
    }
  }

  /* UI helpers ----------------------------------------------------- */

  function showToast(text, isError) {
    if (!ui.toast || !ui.toastText) return;
    ui.toastText.textContent = text;
    ui.toast.classList.toggle('is-error', Boolean(isError));
    ui.toast.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      ui.toast.classList.remove('is-visible');
      toastTimer = null;
    }, 3900);
  }

  function periodLabel(period) {
    return PERIODS[period]?.label || PERIODS.month.label;
  }

  const UNIT_FORMS = {
    month: ['месяц', 'месяца', 'месяцев'],
    year: ['год', 'года', 'лет'],
    quarter: ['квартал', 'квартала', 'кварталов'],
    week: ['неделю', 'недели', 'недель']
  };

  function periodUnit(period, count) {
    const forms = UNIT_FORMS[period] || UNIT_FORMS.month;
    return plural(count, forms[0], forms[1], forms[2]);
  }

  function pricePeriodLabel(item) {
    const count = Math.max(1, Math.trunc(Number(item.intervalCount) || 1));
    if (count === 1) return periodLabel(item.period);
    return `за ${count} ${periodUnit(item.period, count)}`;
  }

  function cadenceLabel(item) {
    const count = Math.max(1, Math.trunc(Number(item.intervalCount) || 1));
    if (count > 1) return `каждые ${count} ${periodUnit(item.period, count)}`;
    return {
      month: 'каждый месяц',
      year: 'каждый год',
      quarter: 'каждый квартал',
      week: 'каждую неделю'
    }[item.period] || 'каждый месяц';
  }

  function plural(number, one, few, many) {
    const abs = Math.abs(number) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;
    return many;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setupReveal() {
    const items = Array.from(document.querySelectorAll('[data-reveal]'));
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
    items.forEach((item) => observer.observe(item));
  }

  function setupProgress() {
    if (!ui.progress) return;
    const update = () => {
      const scrolling = document.scrollingElement || root;
      const max = Math.max(1, (scrolling.scrollHeight || 0) - window.innerHeight);
      const value = Math.min(1, Math.max(0, (window.scrollY || scrolling.scrollTop || 0) / max));
      ui.progress.style.width = `${(value * 100).toFixed(2)}%`;
      ui.progress.style.opacity = value > .01 ? '1' : '.35';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  function setupPointer() {
    if (!ui.app || !window.matchMedia('(pointer: fine)').matches || reduceMotion) return;
    let frame = null;
    let x = 50;
    let y = 20;
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      x = (event.clientX / Math.max(1, window.innerWidth)) * 100;
      y = (event.clientY / Math.max(1, window.innerHeight)) * 100;
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        ui.app.style.setProperty('--pointer-x', `${x.toFixed(2)}%`);
        ui.app.style.setProperty('--pointer-y', `${y.toFixed(2)}%`);
      });
    }, { passive: true });
  }
})();
