/* ============ ماژول تسک و یادداشت - آبنر v6 ============ */

const STORAGE_KEY = 'abner_tasks_v2';

const DEFAULT_TAGS = [
  { id: 'personal', name: 'شخصی', color: '#38bdf8' },
  { id: 'work', name: 'کار', color: '#a78bfa' },
  { id: 'secret', name: 'سکرت', color: '#f87171' },
  { id: 'shopping', name: 'خرید', color: '#fbbf24' },
];

const PRIORITIES = {
  high:   { label: 'بالا',   color: '#ef4444', emoji: '🔴' },
  med:    { label: 'متوسط',  color: '#f59e0b', emoji: '🟠' },
  low:    { label: 'پایین',  color: '#22c55e', emoji: '🟢' },
};

const FA_WEEKDAYS = [
  { id: 0, label: 'شنبه' },
  { id: 1, label: 'یکشنبه' },
  { id: 2, label: 'دوشنبه' },
  { id: 3, label: 'سه‌شنبه' },
  { id: 4, label: 'چهارشنبه' },
  { id: 5, label: 'پنجشنبه' },
  { id: 6, label: 'جمعه' },
];

const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

const EMPTY_STATES = {
  tasks: {
    icon: `<svg viewBox="0 0 64 64" width="56" height="56" fill="none">
      <rect x="10" y="14" width="44" height="44" rx="10" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" stroke-width="2"/>
      <polyline points="22 36 30 44 44 28" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    title: 'هنوز تسکی ثبت نکردی!',
    suggestions: ['کارهای روزانه', 'لیست خرید', 'یادآوری‌های پرداخت'],
  },
  notes: {
    icon: `<svg viewBox="0 0 64 64" width="56" height="56" fill="none">
      <rect x="12" y="10" width="40" height="46" rx="6" fill="rgba(250,204,21,0.18)" stroke="#facc15" stroke-width="2"/>
      <line x1="22" y1="24" x2="42" y2="24" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="22" y1="32" x2="42" y2="32" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="22" y1="40" x2="34" y2="40" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,
    title: 'هنوز یادداشتی ثبت نکردی!',
    suggestions: ['ژورنال روزانه', 'برنامه‌ریزی برای ماه جدید', 'نوشتن لیست اهداف'],
  },
};

/* ---------- State ---------- */
let state = {
  tasks: [],
  notes: [],
  activeTab: 'tasks',
  hidden: false,
  showCompleted: false,
  sortBy: 'created',
  filter: { due: null, priority: null, tags: [] },
  customTags: [],
};

let inputDraft = {
  title: '',
  desc: '',
  dueDate: null,
  priority: null,
  tags: [],
  recurring: null,
};

let recurringDraft = {
  frequency: 'daily',
  interval: 1,
  weekDays: [],
  monthDays: [],
  months: [],
};

let openPanel = null;
let currentPopover = null;
let globalClickBound = false;

/* ---------- ذخیره / بازیابی ---------- */
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks: state.tasks,
      notes: state.notes,
      customTags: state.customTags,
    }));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('tasks-updated'));
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.tasks = data.tasks || [];
    state.notes = data.notes || [];
    state.customTags = data.customTags || [];
  } catch (_) {}
}

/* ---------- توابع کمکی ---------- */
const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

function toJalali(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-persian', { year:'numeric', month:'numeric', day:'numeric' }).formatToParts(date);
    const g = t => (parts.find(p => p.type === t) || {}).value || '';
    return {
      y: parseInt(g('year').replace(/\D/g,'')),
      m: parseInt(g('month').replace(/\D/g,'')),
      d: parseInt(g('day').replace(/\D/g,'')),
    };
  } catch (_) { return null; }
}

function formatDueDate(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const j = toJalali(date);
  if (!j) return '';
  const today = new Date();
  const todayJ = toJalali(today);
  if (todayJ && todayJ.y === j.y && todayJ.m === j.m && todayJ.d === j.d) return 'امروز';
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tJ = toJalali(tomorrow);
  if (tJ && tJ.y === j.y && tJ.m === j.m && tJ.d === j.d) return 'فردا';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const yJ = toJalali(yesterday);
  if (yJ && yJ.y === j.y && yJ.m === j.m && yJ.d === j.d) return 'دیروز';
  return `${toFa(j.d)} ${FA_MONTHS[j.m - 1]}`;
}

function formatRecurring(rec) {
  if (!rec) return '';
  const freqMap = { daily: 'روز', weekly: 'هفته', monthly: 'ماه', yearly: 'سال' };
  const freq = freqMap[rec.frequency] || '';
  const interval = rec.interval > 1 ? `${toFa(rec.interval)} ` : 'هر ';
  return `هر ${interval}${freq}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- فیلتر و مرتب‌سازی ---------- */
function applyFilter(list) {
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
  const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
  const endOfWeek = new Date(); endOfWeek.setDate(endOfWeek.getDate() + 7);

  return list.filter(item => {
    if (state.filter.priority) {
      if (state.filter.priority === 'none') {
        if (item.priority) return false;
      } else if (item.priority !== state.filter.priority) return false;
    }
    if (state.filter.due) {
      if (state.filter.due === 'past') {
        if (!item.dueDate || item.dueDate >= startOfToday.getTime()) return false;
      } else if (state.filter.due === 'today') {
        if (!item.dueDate || item.dueDate < startOfToday.getTime() || item.dueDate > endOfToday.getTime()) return false;
      } else if (state.filter.due === 'week') {
        if (!item.dueDate || item.dueDate < now || item.dueDate > endOfWeek.getTime()) return false;
      } else if (state.filter.due === 'none') {
        if (item.dueDate) return false;
      }
    }
    if (state.filter.tags.length > 0) {
      const itemTags = item.tags || [];
      if (!state.filter.tags.some(t => itemTags.includes(t))) return false;
    }
    return true;
  });
}

function applySort(list) {
  const sorted = [...list];
  if (state.sortBy === 'created') {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  } else if (state.sortBy === 'due') {
    sorted.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  } else if (state.sortBy === 'priority') {
    const order = { high: 1, med: 2, low: 3 };
    sorted.sort((a, b) => {
      const pa = order[a.priority] || 99;
      const pb = order[b.priority] || 99;
      if (pa !== pb) return pa - pb;
      return b.createdAt - a.createdAt;
    });
  }
  return sorted;
}

/* ---------- رندر ---------- */
function render() {
  const list = document.getElementById('tasksList');
  if (!list) return;

  list.classList.toggle('is-hidden', state.hidden);

  const tab = state.activeTab;
  const items = tab === 'tasks' ? state.tasks : state.notes;

  let filtered = applyFilter(items);
  if (tab === 'tasks' && !state.showCompleted) {
    filtered = filtered.filter(t => !t.completed);
  }

  const sorted = applySort(filtered);

  if (sorted.length === 0) {
    renderEmpty(list, tab);
    return;
  }

  if (tab === 'tasks') {
    list.innerHTML = sorted.map(t => renderTaskItem(t)).join('');
  } else {
    list.innerHTML = sorted.map(n => renderNoteItem(n)).join('');
  }

  attachItemEvents(list);
}

function renderEmpty(list, tab) {
  const e = EMPTY_STATES[tab];
  list.innerHTML = `
    <div class="task-empty-state">
      <div class="tes-icon">${e.icon}</div>
      <div class="tes-title">${e.title}</div>
      <div class="tes-sub">موضوعات پیشنهادی:</div>
      <ul class="tes-suggestions">
        ${e.suggestions.map(s => `<li data-suggest="${s}">• ${s}</li>`).join('')}
      </ul>
    </div>
  `;
  list.querySelectorAll('[data-suggest]').forEach(el => {
    el.addEventListener('click', () => {
      const t = document.getElementById('tnTitle');
      if (t) { t.value = el.dataset.suggest; t.focus(); }
    });
  });
}

function renderTaskItem(t) {
  const p = t.priority ? PRIORITIES[t.priority] : null;
  const dueTxt = t.dueDate ? formatDueDate(t.dueDate) : '';
  const isPast = t.dueDate && t.dueDate < Date.now() && !t.completed;
  const recurTxt = t.recurring ? formatRecurring(t.recurring) : '';

  return `
    <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
      <div class="ti-main">
        <button class="ti-check" data-act="toggle" title="${t.completed ? 'برگردان' : 'انجام شد'}">
          ${t.completed
            ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : ''}
        </button>
        <div class="ti-content">
          <div class="ti-title">${escapeHtml(t.title)}</div>
          ${t.description ? `<div class="ti-desc">${escapeHtml(t.description)}</div>` : ''}
          <div class="ti-badges">
            ${p ? `<span class="ti-badge prio" style="--prio-color:${p.color}">${p.emoji} ${p.label}</span>` : ''}
            ${dueTxt ? `<span class="ti-badge due ${isPast ? 'past' : ''}">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${dueTxt}
            </span>` : ''}
            ${(t.tags || []).map(tagId => {
              const tag = [...DEFAULT_TAGS, ...state.customTags].find(x => x.id === tagId);
              if (!tag) return '';
              return `<span class="ti-badge tag" style="--tag-color:${tag.color}">${tag.name}</span>`;
            }).join('')}
            ${recurTxt ? `<span class="ti-badge recur">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
              ${recurTxt}
            </span>` : ''}
          </div>
        </div>
        <button class="ti-action" data-act="delete" title="حذف">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function renderNoteItem(n) {
  return `
    <div class="task-item note-item ${n.pinned ? 'pinned' : ''}" data-id="${n.id}">
      <div class="ti-main">
        <div class="ti-content">
          <div class="ti-title">${escapeHtml(n.title || 'بدون عنوان')}</div>
          ${n.content ? `<div class="ti-desc">${escapeHtml(n.content)}</div>` : ''}
          <div class="ti-badges">
            <span class="ti-badge due">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${formatDueDate(n.createdAt)}
            </span>
          </div>
        </div>
        <button class="ti-action" data-act="pin" title="پین">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${n.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>
        </button>
        <button class="ti-action" data-act="delete" title="حذف">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function attachItemEvents(list) {
  list.querySelectorAll('.task-item').forEach(el => {
    const id = el.dataset.id;
    el.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (state.activeTab === 'tasks') {
          if (act === 'toggle') toggleTask(id);
          else if (act === 'delete') deleteTask(id);
        } else {
          if (act === 'delete') deleteNote(id);
          else if (act === 'pin') togglePin(id);
        }
      });
    });
  });
}

/* ---------- عملیات ---------- */
function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  persist();
  render();
}
function deleteTask(id) {
  state.tasks = state.tasks.filter(x => x.id !== id);
  persist();
  render();
}
function deleteNote(id) {
  state.notes = state.notes.filter(x => x.id !== id);
  persist();
  render();
}
function togglePin(id) {
  const n = state.notes.find(x => x.id === id);
  if (!n) return;
  n.pinned = !n.pinned;
  persist();
  render();
}

/* ---------- افزودن آیتم جدید ---------- */
function submitNew() {
  const titleEl = document.getElementById('tnTitle');
  const descEl = document.getElementById('tnDesc');
  const title = (titleEl?.value || '').trim();
  const desc = (descEl?.value || '').trim();
  if (!title) return;

  if (state.activeTab === 'tasks') {
    state.tasks.push({
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title,
      description: desc,
      completed: false,
      createdAt: Date.now(),
      dueDate: inputDraft.dueDate,
      priority: inputDraft.priority,
      tags: [...inputDraft.tags],
      recurring: inputDraft.recurring,
    });
  } else {
    state.notes.push({
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title,
      content: desc,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    });
  }

  if (titleEl) titleEl.value = '';
  if (descEl) descEl.value = '';
  inputDraft = { title:'', desc:'', dueDate:null, priority:null, tags:[], recurring:null };
  updateToolbarState();

  persist();
  render();
}

function updateToolbarState() {
  const map = {
    tnRecurring: !!inputDraft.recurring,
    tnPriority: !!inputDraft.priority,
    tnDue: !!inputDraft.dueDate,
    tnCalendar: false,
    tnTag: inputDraft.tags.length > 0,
  };
  Object.entries(map).forEach(([id, active]) => {
    document.getElementById(id)?.classList.toggle('active', active);
  });
}

/* ---------- پاپ‌آور ساده ---------- */
function closePopover() {
  document.getElementById('tnPopover')?.classList.add('hidden');
  currentPopover = null;
}

function openPopover(kind) {
  const pop = document.getElementById('tnPopover');
  if (!pop) return;

  if (kind === 'recurring') {
    closePopover();
    openRecurringModal();
    return;
  }

  if (currentPopover === kind) { closePopover(); return; }
  currentPopover = kind;

  let html = '';
  if (kind === 'priority') {
    html = `
      <div class="tn-pop-title">اولویت</div>
      <div class="tn-pop-row">
        ${Object.entries(PRIORITIES).map(([k,v]) => `
          <button class="tn-chip ${inputDraft.priority === k ? 'active' : ''}" data-prio="${k}">
            ${v.emoji} ${v.label}
          </button>
        `).join('')}
        <button class="tn-chip ${!inputDraft.priority ? 'active' : ''}" data-prio="none">
          بدون اولویت
        </button>
      </div>
    `;
  } else if (kind === 'due') {
    const today = new Date(); today.setHours(12,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    html = `
      <div class="tn-pop-title">تاریخ سررسید</div>
      <div class="tn-pop-row">
        <button class="tn-chip" data-due="${today.getTime()}">امروز</button>
        <button class="tn-chip" data-due="${tomorrow.getTime()}">فردا</button>
        <button class="tn-chip" data-due="${nextWeek.getTime()}">هفته بعد</button>
        <button class="tn-chip ${!inputDraft.dueDate ? 'active' : ''}" data-due="none">بدون سررسید</button>
      </div>
    `;
  } else if (kind === 'tag') {
    const allTags = [...DEFAULT_TAGS, ...state.customTags];
    html = `
      <div class="tn-pop-title">برچسب‌ها</div>
      <div class="tn-pop-row">
        ${allTags.map(t => `
          <button class="tn-chip ${inputDraft.tags.includes(t.id) ? 'active' : ''}" data-tag="${t.id}" style="--tag-color:${t.color}">
            ${t.name}
          </button>
        `).join('')}
      </div>
    `;
  } else if (kind === 'calendar') {
    html = `
      <div class="tn-pop-title">تاریخ دلخواه</div>
      <div class="tn-pop-row">
        <input type="date" class="tn-date-input" id="tnCustomDate">
      </div>
      <button class="tn-chip" style="width:100%;margin-top:6px;" id="tnCustomDateSubmit">ذخیره</button>
    `;
  }

  pop.innerHTML = html;
  pop.classList.remove('hidden');
  attachPopoverEvents(kind);
}

function attachPopoverEvents(kind) {
  const pop = document.getElementById('tnPopover');
  if (!pop) return;

  pop.querySelectorAll('[data-prio]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.prio;
      inputDraft.priority = v === 'none' ? null : v;
      updateToolbarState();
      closePopover();
    });
  });
  pop.querySelectorAll('[data-due]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.due;
      inputDraft.dueDate = v === 'none' ? null : parseInt(v);
      updateToolbarState();
      closePopover();
    });
  });
  pop.querySelectorAll('[data-tag]').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.dataset.tag;
      const idx = inputDraft.tags.indexOf(id);
      if (idx >= 0) inputDraft.tags.splice(idx, 1);
      else inputDraft.tags.push(id);
      b.classList.toggle('active');
      updateToolbarState();
    });
  });
  if (kind === 'calendar') {
    document.getElementById('tnCustomDateSubmit')?.addEventListener('click', () => {
      const v = document.getElementById('tnCustomDate')?.value;
      if (v) {
        const d = new Date(v);
        inputDraft.dueDate = d.getTime();
        updateToolbarState();
      }
      closePopover();
    });
  }
}

/* ============================================================
   مودال تکرار
============================================================ */

function openRecurringModal() {
  if (inputDraft.recurring) {
    recurringDraft = {
      frequency: inputDraft.recurring.frequency || 'daily',
      interval: inputDraft.recurring.interval || 1,
      weekDays: [...(inputDraft.recurring.weekDays || [])],
      monthDays: [...(inputDraft.recurring.monthDays || [])],
      months: [...(inputDraft.recurring.months || [])],
    };
  } else {
    recurringDraft = {
      frequency: 'daily',
      interval: 1,
      weekDays: [],
      monthDays: [],
      months: [],
    };
  }

  // حذف منوی قدیمی از body
  document.getElementById('rdMenu')?.remove();

  let overlay = document.getElementById('recurringOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'recurringOverlay';
    overlay.className = 'recurring-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');

  renderRecurringModal();

  // رویداد کلیک بیرون روی overlay
  overlay.onclick = (e) => {
    if (e.target === overlay) closeRecurringModal();
  };

  // ============================================================
  // لیسنر سراسری برای کلیک بیرون از دراپ‌دان — فقط یک‌بار اضافه میشه
  // ============================================================
  if (!globalClickBound) {
    globalClickBound = true;
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('rdMenu');
      if (!menu || menu.classList.contains('hidden')) return;

      const trigger = document.getElementById('rdTrigger');
      if (trigger && trigger.contains(e.target)) return;
      if (menu.contains(e.target)) return;

      menu.classList.add('hidden');
    });
  }
}

function closeRecurringModal() {
  document.getElementById('recurringOverlay')?.classList.add('hidden');
  document.getElementById('rdMenu')?.classList.add('hidden');
}

function renderRecurringModal() {
  const overlay = document.getElementById('recurringOverlay');
  if (!overlay) return;

  const freqLabels = { daily: 'روز', weekly: 'هفته', monthly: 'ماه', yearly: 'سال' };

  overlay.innerHTML = `
    <div class="recurring-modal">
      <h3 class="recurring-title">تکرار</h3>

      <div class="recurring-row">
        <span class="recurring-label">هر چند وقت یکبار؟</span>
        <div class="recurring-interval-wrap">
          <button type="button" class="ri-btn" data-act="dec">−</button>
          <input type="text" class="ri-input" value="${toFa(recurringDraft.interval)}" readonly>
          <button type="button" class="ri-btn" data-act="inc">+</button>
        </div>
        <div class="recurring-dropdown">
          <button type="button" class="rd-trigger" id="rdTrigger">
            <span id="rdTriggerText">${freqLabels[recurringDraft.frequency]}</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <div class="recurring-divider"></div>

      ${recurringDraft.frequency === 'weekly' ? `
        <div class="recurring-row recurring-row-col">
          <span class="recurring-label">چه روزهایی؟</span>
          <div class="recur-weekdays" id="recurWeekdays">
            ${FA_WEEKDAYS.map(w => `
              <button type="button" class="recur-pill recur-pill-day ${recurringDraft.weekDays.includes(w.id) ? 'active' : ''}" data-wday="${w.id}">${w.label}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${recurringDraft.frequency === 'monthly' ? `
        <div class="recurring-row recurring-row-col">
          <span class="recurring-label">چه روزهایی از ماه؟</span>
          <div class="recur-days-grid" id="recurMonthDays">
            ${Array.from({length: 31}, (_, i) => i + 1).map(d => `
              <button type="button" class="recur-pill recur-pill-num ${recurringDraft.monthDays.includes(d) ? 'active' : ''}" data-mday="${d}">${toFa(d)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${recurringDraft.frequency === 'yearly' ? `
        <div class="recurring-row recurring-row-col">
          <span class="recurring-label">چه ماه‌هایی؟</span>
          <div class="recur-months-grid" id="recurMonths">
            ${FA_MONTHS.map((m, i) => `
              <button type="button" class="recur-pill recur-pill-month ${recurringDraft.months.includes(i) ? 'active' : ''}" data-month="${i}">${m}</button>
            `).join('')}
          </div>
        </div>
        <div class="recurring-row recurring-row-col">
          <span class="recurring-label">چه روزهایی از ماه؟</span>
          <div class="recur-days-grid" id="recurYearDays">
            ${Array.from({length: 31}, (_, i) => i + 1).map(d => `
              <button type="button" class="recur-pill recur-pill-num ${recurringDraft.monthDays.includes(d) ? 'active' : ''}" data-mday="${d}">${toFa(d)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="recurring-actions">
        <button type="button" class="recur-btn-cancel" id="recurCancel">بیخیال</button>
        <button type="button" class="recur-btn-confirm" id="recurConfirm">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          تایید
        </button>
      </div>
    </div>

    <div class="rd-menu hidden" id="rdMenu">
      <button type="button" class="rd-item ${recurringDraft.frequency==='daily'?'active':''}" data-freq="daily">
        <span>روز</span>
        ${recurringDraft.frequency==='daily' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <button type="button" class="rd-item ${recurringDraft.frequency==='weekly'?'active':''}" data-freq="weekly">
        <span>هفته</span>
        ${recurringDraft.frequency==='weekly' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <button type="button" class="rd-item ${recurringDraft.frequency==='monthly'?'active':''}" data-freq="monthly">
        <span>ماه</span>
        ${recurringDraft.frequency==='monthly' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <button type="button" class="rd-item ${recurringDraft.frequency==='yearly'?'active':''}" data-freq="yearly">
        <span>سال</span>
        ${recurringDraft.frequency==='yearly' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
    </div>
  `;

  // ✅ انتقال منو به body بعد از رندر
  const menu = document.getElementById('rdMenu');
  if (menu) document.body.appendChild(menu);

  attachRecurringEvents();
}

function attachRecurringEvents() {
  const overlay = document.getElementById('recurringOverlay');
  if (!overlay) return;

  // بازه
  overlay.querySelectorAll('.ri-btn').forEach(b => {
    b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'inc' && recurringDraft.interval < 99) recurringDraft.interval++;
      if (act === 'dec' && recurringDraft.interval > 1) recurringDraft.interval--;
      const inp = overlay.querySelector('.ri-input');
      if (inp) inp.value = toFa(recurringDraft.interval);
    });
  });

  // دراپ‌دان trigger
  const trigger = document.getElementById('rdTrigger');
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('rdMenu');
      if (!menu) return;

      const isHidden = menu.classList.contains('hidden');

      if (isHidden) {
        // موقعیت‌دهی
        const rect = trigger.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 6) + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.width = rect.width + 'px';
        menu.classList.remove('hidden');
      } else {
        menu.classList.add('hidden');
      }
    });
  }

  // آیتم‌های دراپ‌دان
  const menu = document.getElementById('rdMenu');
  menu?.querySelectorAll('[data-freq]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      recurringDraft.frequency = b.dataset.freq;
      menu.classList.add('hidden');
      renderRecurringModal();
    });
  });

  // روزهای هفته
  overlay.querySelectorAll('[data-wday]').forEach(b => {
    b.addEventListener('click', () => {
      const d = +b.dataset.wday;
      const idx = recurringDraft.weekDays.indexOf(d);
      if (idx >= 0) recurringDraft.weekDays.splice(idx, 1);
      else recurringDraft.weekDays.push(d);
      b.classList.toggle('active');
    });
  });

  // روزهای ماه
  overlay.querySelectorAll('[data-mday]').forEach(b => {
    b.addEventListener('click', () => {
      const d = +b.dataset.mday;
      const idx = recurringDraft.monthDays.indexOf(d);
      if (idx >= 0) recurringDraft.monthDays.splice(idx, 1);
      else recurringDraft.monthDays.push(d);
      b.classList.toggle('active');
    });
  });

  // ماه‌ها
  overlay.querySelectorAll('[data-month]').forEach(b => {
    b.addEventListener('click', () => {
      const m = +b.dataset.month;
      const idx = recurringDraft.months.indexOf(m);
      if (idx >= 0) recurringDraft.months.splice(idx, 1);
      else recurringDraft.months.push(m);
      b.classList.toggle('active');
    });
  });

  // تایید
  document.getElementById('recurConfirm')?.addEventListener('click', () => {
    inputDraft.recurring = {
      frequency: recurringDraft.frequency,
      interval: recurringDraft.interval,
      weekDays: [...recurringDraft.weekDays],
      monthDays: [...recurringDraft.monthDays],
      months: [...recurringDraft.months],
    };
    updateToolbarState();
    closeRecurringModal();
  });

  // بیخیال
  document.getElementById('recurCancel')?.addEventListener('click', () => {
    closeRecurringModal();
  });
}

/* ---------- پنل‌های بالا ---------- */
function closeAllPanels() {
  document.querySelectorAll('.task-panel-pop').forEach(el => el.remove());
  openPanel = null;
}

function getActionBarRect(btnId) {
  const btn = document.getElementById(btnId);
  return btn?.getBoundingClientRect();
}

function positionPanel(panel, rect) {
  panel.style.position = 'fixed';
  panel.style.top = (rect.bottom + 8) + 'px';
  panel.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 300)) + 'px';
  panel.style.zIndex = '99999';
}

function openMorePanel() {
  const rect = getActionBarRect('taskActionMore');
  if (!rect) return;
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop';
  panel.innerHTML = `
    <label class="tp-more-item">
      <span>نمایش انجام شده‌ها</span>
      <span class="tp-checkbox ${state.showCompleted ? 'checked' : ''}" id="tpShowCompleted"></span>
    </label>
    <div class="tp-divider"></div>
    <button class="tp-more-item danger" id="tpDeleteAll">
      <span>حذف همه تسک‌ها</span>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
    </button>
  `;
  document.body.appendChild(panel);
  positionPanel(panel, rect);
  openPanel = 'more';

  document.getElementById('tpShowCompleted')?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    state.showCompleted = !state.showCompleted;
    document.getElementById('tpShowCompleted')?.classList.toggle('checked', state.showCompleted);
    render();
  });

  document.getElementById('tpDeleteAll')?.addEventListener('click', () => {
    const key = state.activeTab === 'tasks' ? 'tasks' : 'notes';
    const label = key === 'tasks' ? 'تسک‌ها' : 'یادداشت‌ها';
    if (confirm(`همه ${label} حذف شوند؟`)) {
      state[key] = [];
      persist();
      render();
    }
    closeAllPanels();
  });
}

function openFilterPanel() {
  const rect = getActionBarRect('taskActionFilter');
  if (!rect) return;
  const allTags = [...DEFAULT_TAGS, ...state.customTags];
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop filter-panel';
  panel.innerHTML = `
    <div class="tp-section">
      <div class="tp-section-title">تاریخ سررسید</div>
      <div class="tp-chip-row">
        <button class="tp-chip ${state.filter.due==='past'?'active':''}" data-fdue="past">گذشته</button>
        <button class="tp-chip ${state.filter.due==='today'?'active':''}" data-fdue="today">امروز</button>
        <button class="tp-chip ${state.filter.due==='week'?'active':''}" data-fdue="week">این هفته</button>
        <button class="tp-chip ${state.filter.due==='none'?'active':''}" data-fdue="none">بدون سررسید</button>
      </div>
    </div>
    <div class="tp-section">
      <div class="tp-section-title">اولویت</div>
      <div class="tp-chip-row">
        ${Object.entries(PRIORITIES).map(([k,v]) => `
          <button class="tp-chip ${state.filter.priority===k?'active':''}" data-fprio="${k}">${v.emoji} ${v.label}</button>
        `).join('')}
        <button class="tp-chip ${state.filter.priority==='none'?'active':''}" data-fprio="none">بدون اولویت</button>
      </div>
    </div>
    <div class="tp-section">
      <div class="tp-section-title">برچسب‌ها</div>
      <div class="tp-chip-row">
        ${allTags.map(t => `
          <button class="tp-chip ${state.filter.tags.includes(t.id)?'active':''}" data-ftag="${t.id}">${t.name}</button>
        `).join('')}
      </div>
    </div>
    <button class="tp-clear-btn" id="tpClearFilter">پاک کردن همه فیلترها</button>
  `;
  document.body.appendChild(panel);
  positionPanel(panel, rect);
  openPanel = 'filter';

  panel.querySelectorAll('[data-fdue]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.fdue;
      state.filter.due = state.filter.due === v ? null : v;
      render(); closeAllPanels(); openFilterPanel();
    });
  });
  panel.querySelectorAll('[data-fprio]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.fprio;
      state.filter.priority = state.filter.priority === v ? null : v;
      render(); closeAllPanels(); openFilterPanel();
    });
  });
  panel.querySelectorAll('[data-ftag]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.ftag;
      const idx = state.filter.tags.indexOf(v);
      if (idx >= 0) state.filter.tags.splice(idx, 1);
      else state.filter.tags.push(v);
      render(); closeAllPanels(); openFilterPanel();
    });
  });
  document.getElementById('tpClearFilter')?.addEventListener('click', () => {
    state.filter = { due: null, priority: null, tags: [] };
    render();
    closeAllPanels();
  });
}

function openSortPanel() {
  const rect = getActionBarRect('taskActionSort');
  if (!rect) return;
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop sort-panel';
  const opts = [
    { key: 'created', label: 'تاریخ ساخت' },
    { key: 'due', label: 'تاریخ سررسید' },
    { key: 'priority', label: 'اولویت' },
  ];
  panel.innerHTML = `
    <div class="tp-section-title" style="padding:6px 10px;">مرتب‌سازی بر اساس</div>
    ${opts.map(o => `
      <button class="tp-more-item" data-sort="${o.key}">
        <span>${o.label}</span>
        <span class="tp-radio ${state.sortBy === o.key ? 'active' : ''}"></span>
      </button>
    `).join('')}
  `;
  document.body.appendChild(panel);
  positionPanel(panel, rect);
  openPanel = 'sort';

  panel.querySelectorAll('[data-sort]').forEach(b => {
    b.addEventListener('click', () => {
      state.sortBy = b.dataset.sort;
      render();
      closeAllPanels();
    });
  });
}

/* ---------- INIT ---------- */
export function initTasks() {
  restore();

  document.querySelectorAll('.task-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      state.activeTab = tab;
      document.querySelectorAll('.task-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      const title = document.getElementById('tnTitle');
      const desc = document.getElementById('tnDesc');
      if (title) title.placeholder = tab === 'tasks' ? 'نوشتن تسک جدید...' : 'نوشتن یادداشت جدید...';
      if (desc) desc.placeholder = tab === 'tasks' ? 'توضیحات...' : 'متن یادداشت...';

      document.querySelectorAll('.tn-toolbar .tn-icon').forEach(el => {
        const hideForNotes = ['tnRecurring','tnPriority','tnDue','tnCalendar','tnTag'].includes(el.id);
        el.style.display = (tab === 'notes' && hideForNotes) ? 'none' : '';
      });

      render();
    });
  });

  document.getElementById('taskActionMore')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = openPanel === 'more';
    closeAllPanels();
    if (!wasOpen) openMorePanel();
  });
  document.getElementById('taskActionHide')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.hidden = !state.hidden;
    document.getElementById('taskActionHide')?.classList.toggle('active', state.hidden);
    render();
  });
  document.getElementById('taskActionFilter')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = openPanel === 'filter';
    closeAllPanels();
    if (!wasOpen) openFilterPanel();
  });
  document.getElementById('taskActionSort')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = openPanel === 'sort';
    closeAllPanels();
    if (!wasOpen) openSortPanel();
  });

  const titleEl = document.getElementById('tnTitle');
  const descEl = document.getElementById('tnDesc');
  titleEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitNew(); }
  });
  descEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitNew(); }
  });
  document.getElementById('tnSubmit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    submitNew();
  });

  document.getElementById('tnRecurring')?.addEventListener('click', (e) => {
    e.stopPropagation(); openPopover('recurring');
  });
  document.getElementById('tnPriority')?.addEventListener('click', (e) => {
    e.stopPropagation(); openPopover('priority');
  });
  document.getElementById('tnDue')?.addEventListener('click', (e) => {
    e.stopPropagation(); openPopover('due');
  });
  document.getElementById('tnCalendar')?.addEventListener('click', (e) => {
    e.stopPropagation(); openPopover('calendar');
  });
  document.getElementById('tnTag')?.addEventListener('click', (e) => {
    e.stopPropagation(); openPopover('tag');
  });

  document.addEventListener('click', (e) => {
    const inPanel = e.target.closest('.task-panel-pop');
    const inAction = e.target.closest('.task-action-bar');
    if (!inPanel && !inAction) closeAllPanels();

    const inPop = e.target.closest('#tnPopover');
    const inTool = e.target.closest('.tn-toolbar');
    if (!inPop && !inTool) closePopover();
  });

  window.addEventListener('resize', () => closeAllPanels());

  updateToolbarState();
  render();
}