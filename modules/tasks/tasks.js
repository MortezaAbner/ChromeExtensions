/* ============ ماژول تسک — آبنر v18 ============ */

import { getToken, getUser, refreshToken } from '../auth/auth.js';
import {
  sharedState, loadAllState, saveAllState, getTags, findTag,
  showUndoToast, hideUndoToast, addPendingDelete, removePendingDelete,
  loadPendingDeletes, savePendingDeletes, getQueue, setQueue, loadQueue,
  saveQueue, removeFromQueue, dispatchSyncStatus,
  GOOGLE_TASKS_LIST_ID, UNDO_DELAY_MS,
} from '../shared/state.js';

const PRIORITIES = {
  high: { label: 'بالا',  color: '#ef4444' },
  med:  { label: 'متوسط', color: '#f97316' },
  low:  { label: 'پایین', color: '#22c55e' },
};

const BOARD_OPTIONS = {
  default: { label: 'پیش‌فرض',    color: '#94a3b8' },
  todo:    { label: 'درست اقدام', color: '#3b82f6' },
  done:    { label: 'انجام شده',  color: '#22c55e' },
};

const FA_WEEKDAYS = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

/* ============ تقویم جلالی ============ */
function _div(a,b){return ~~(a/b);}
function _mod(a,b){return a-~~(a/b)*b;}
function _jalCal(jy){
  const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  let gy=jy+621,leapJ=-14,jp=breaks[0],jm,jump=0,leap,leapG,march,n,i;
  for(i=1;i<breaks.length;i+=1){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ=leapJ+_div(jump,33)*8+_div(_mod(jump,33),4);jp=jm;}
  n=jy-jp;leapJ=leapJ+_div(n,33)*8+_div(_mod(n,33)+3,4);
  if(_mod(jump,33)===4&&jump-n===4)leapJ+=1;
  leapG=_div(gy,4)-_div((_div(gy,100)+1)*3,4)-150;
  march=20+leapJ-leapG;
  if(jump-n<6)n=n-jump+_div(jump+4,33)*33;
  leap=_mod(_mod(n+1,33)-1,4);if(leap===-1)leap=4;
  return{leap,gy,march};
}
function _g2d(gy,gm,gd){
  let d=_div((gy+_div(gm-8,6)+100100)*1461,4)+_div(153*_mod(gm+9,12)+2,5)+gd-34840408;
  d=d-_div(_div(gy+100100+_div(gm-8,6),100)*3,4)+752;return d;
}
function _d2g(jdn){
  let j=4*jdn+139361631;j=j+_div(_div(4*jdn+183187720,146097)*3,4)*4-3908;
  let i=_div(_mod(j,1461),4)*5+308;let gd=_div(_mod(i,153),5)+1;let gm=_mod(_div(i,153),12)+1;
  let gy=_div(j,1461)-100100+_div(8-gm,6);return{gy,gm,gd};
}
function _j2d(jy,jm,jd){const r=_jalCal(jy);return _g2d(r.gy,3,r.march)+(jm-1)*31-_div(jm,7)*(jm-7)+jd-1;}
function _d2j(jdn){
  const gy=_d2g(jdn).gy;let jy=gy-621;const r=_jalCal(jy),jdn1f=_g2d(gy,3,r.march);let jd,jm,k;
  k=jdn-jdn1f;
  if(k>=0){if(k<=185){jm=1+_div(k,31);jd=_mod(k,31)+1;return{jy,jm,jd};}else k-=186;}
  else{jy-=1;k+=179;if(r.leap===1)k+=1;}
  jm=7+_div(k,30);jd=_mod(k,30)+1;
  return{jy,jm,jd};
}
function toJalaali(gy,gm,gd){return _d2j(_g2d(gy,gm,gd));}
function toGregorian(jy,jm,jd){return _d2g(_j2d(jy,jm,jd));}
function getDaysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const d29 = _j2d(jy, 12, 29);
  const dNext = _j2d(jy + 1, 1, 1);
  return (dNext - d29 === 1) ? 29 : 30;
}
function todayJalali() {
  const now = new Date();
  const j = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { y: j.jy, m: j.jm, d: j.jd };
}
const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

/* ============ State داخلی تسک ============ */
let state = {
  activeTab: 'tasks',
  hidden: false,
  showCompleted: false,
  sortBy: 'created',
  filter: { due: null, priority: null, tags: [] },
};

let inputDraft = {
  title: '', desc: '', dueDate: null, dueTime: null,
  priority: null, tags: [], recurring: null, board: null,
};
let editDraft = null;
let editTaskId = null;
let isEditMode = false;

function getActiveDraft() {
  return (isEditMode && editDraft) ? editDraft : inputDraft;
}

let recurringDraft = { frequency: 'daily', interval: 1, weekDays: [], monthDays: [], months: [] };
let dateView = { year: 0, month: 0 };
let selectedDateInPicker = null;
let timeDraft = { h: 12, m: 0 };
let currentPopoverKind = null;
let deletedBackup = null;
let isProcessingQueue = false;
let isProcessingDeletes = false;

const tasks = () => sharedState.tasks;

/* ============ Helper: retry ============ */
async function fetchWithRetry(makeRequest) {
  let token = await getToken();
  if (!token) return { ok: false, status: 0, reason: 'no-token' };
  let res = await makeRequest(token);
  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) res = await makeRequest(newToken);
  }
  return res;
}

/* ============ Sync تسک به Calendar ============ */
async function syncTaskToCalendar(task) {
  if (!task || !task.dueDate) return { ok: true, skipped: true };
  const user = getUser();
  if (!user) return { ok: false, reason: 'no-user' };
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let event;
    if (task.dueTime) {
      const date = new Date(task.dueDate);
      const [hh, mm] = task.dueTime.split(':').map(Number);
      date.setHours(hh || 0, mm || 0, 0, 0);
      const endDate = new Date(date.getTime() + 30 * 60 * 1000);
      event = { summary: task.title, description: task.description || '',
        start: { dateTime: date.toISOString(), timeZone },
        end:   { dateTime: endDate.toISOString(), timeZone } };
    } else {
      const d = new Date(task.dueDate);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
      const nextDateStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth()+1).padStart(2,'0')}-${String(nextDay.getDate()).padStart(2,'0')}`;
      event = { summary: task.title, description: task.description || '',
        start: { date: dateStr }, end: { date: nextDateStr } };
    }
    if (task.recurring) {
      const rec = task.recurring;
      const freqMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
      let rrule = `RRULE:FREQ=${freqMap[rec.frequency] || 'DAILY'}`;
      if (rec.interval > 1) rrule += `;INTERVAL=${rec.interval}`;
      if (rec.weekDays && rec.weekDays.length) {
        const dayMap = { 0: 'SA', 1: 'SU', 2: 'MO', 3: 'TU', 4: 'WE', 5: 'TH', 6: 'FR' };
        rrule += `;BYDAY=${rec.weekDays.map(d => dayMap[d]).join(',')}`;
      }
      if (rec.monthDays && rec.monthDays.length) rrule += `;BYMONTHDAY=${rec.monthDays.join(',')}`;
      event.recurrence = [rrule];
    }
    const makeRequest = (token) => {
      const url = task.calendarEventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.calendarEventId}`
        : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      const method = task.calendarEventId ? 'PUT' : 'POST';
      return fetch(url, { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
    };
    let res = await fetchWithRetry(makeRequest);
    if (res.status === 404 && task.calendarEventId) {
      delete task.calendarEventId; saveAllState();
      res = await fetchWithRetry(makeRequest);
    }
    if (res.ok) {
      const data = await res.json();
      if (data.id) { task.calendarEventId = data.id; saveAllState(); }
      return { ok: true };
    }
    return { ok: false, reason: 'http-' + res.status };
  } catch (e) { return { ok: false, reason: 'exception', error: e }; }
}

async function deleteTaskCalendarEvent(task) {
  if (!task || !task.calendarEventId) return { ok: true, skipped: true };
  try {
    const makeRequest = (token) => fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.calendarEventId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
    );
    const res = await fetchWithRetry(makeRequest);
    return { ok: res.ok || res.status === 404 };
  } catch (_) { return { ok: false }; }
}

async function syncTaskToGoogleTasks(task) {
  if (!task) return { ok: false };
  const user = getUser();
  if (!user) return { ok: false, reason: 'no-user' };
  try {
    const taskBody = {
      title: task.title, notes: task.description || '',
      status: task.completed ? 'completed' : 'needsAction',
    };
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      d.setUTCHours(0, 0, 0, 0);
      taskBody.due = d.toISOString();
    }
    const makeRequest = (token) => {
      const url = task.tasksApiId
        ? `https://tasks.googleapis.com/tasks/v1/lists/${GOOGLE_TASKS_LIST_ID}/tasks/${task.tasksApiId}`
        : `https://tasks.googleapis.com/tasks/v1/lists/${GOOGLE_TASKS_LIST_ID}/tasks`;
      const method = task.tasksApiId ? 'PATCH' : 'POST';
      return fetch(url, { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(taskBody) });
    };
    let res = await fetchWithRetry(makeRequest);
    if (res.status === 404 && task.tasksApiId) {
      delete task.tasksApiId; saveAllState();
      res = await fetchWithRetry(makeRequest);
    }
    if (res.ok) {
      const data = await res.json();
      if (data.id) { task.tasksApiId = data.id; saveAllState(); }
      return { ok: true };
    }
    return { ok: false, reason: 'http-' + res.status };
  } catch (e) { return { ok: false, reason: 'exception', error: e }; }
}

async function deleteTaskFromGoogleTasks(task) {
  if (!task || !task.tasksApiId) return { ok: true, skipped: true };
  try {
    const makeRequest = (token) => fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${GOOGLE_TASKS_LIST_ID}/tasks/${task.tasksApiId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
    );
    const res = await fetchWithRetry(makeRequest);
    return { ok: res.ok || res.status === 404 };
  } catch (_) { return { ok: false }; }
}

async function syncTaskEverywhere(task) {
  if (!task) return;
  if (!navigator.onLine) {
    enqueue('sync', task);
    return;
  }
  const results = await Promise.allSettled([syncTaskToCalendar(task), syncTaskToGoogleTasks(task)]);
  const hasFailure = results.some(r =>
    r.status === 'rejected' || (r.value && r.value.ok === false && r.value.reason !== 'skipped')
  );
  if (hasFailure) enqueue('sync', task);
}

function enqueue(action, taskSnapshot) {
  const q = getQueue();
  q.push({
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    action, task: JSON.parse(JSON.stringify(taskSnapshot)), ts: Date.now(),
  });
  setQueue(q);
  saveQueue();
  dispatchSyncStatus();
}

async function processQueue() {
  if (isProcessingQueue) return;
  if (!navigator.onLine) return;
  const q = getQueue();
  if (q.length === 0) return;
  isProcessingQueue = true;
  const items = [...q];
  for (const item of items) {
    try {
      if (item.action === 'delete') {
        await deleteTaskCalendarEvent(item.task);
        await deleteTaskFromGoogleTasks(item.task);
      } else {
        const current = tasks().find(t => t.id === item.task.id);
        if (current) {
          await Promise.allSettled([syncTaskToCalendar(current), syncTaskToGoogleTasks(current)]);
        } else {
          await deleteTaskCalendarEvent(item.task);
          await deleteTaskFromGoogleTasks(item.task);
        }
      }
      removeFromQueue(x => x.id === item.id);
    } catch (e) { console.warn('Queue item failed:', e); }
  }
  isProcessingQueue = false;
}

/* ============ Pending Deletes ============ */
export async function processPendingDeletes() {
  if (isProcessingDeletes) return;
  if (!navigator.onLine) return;
  const list = loadPendingDeletes();
  if (list.length === 0) return;
  const now = Date.now();
  const ready = list.filter(item => !item.processAfter || item.processAfter <= now);
  if (ready.length === 0) return;
  isProcessingDeletes = true;
  for (const item of ready) {
    try {
      if (item.calendarEventId) await deleteTaskCalendarEvent({ calendarEventId: item.calendarEventId });
      if (item.tasksApiId) await deleteTaskFromGoogleTasks({ tasksApiId: item.tasksApiId });
      removePendingDelete(item.id);
    } catch (_) {}
  }
  isProcessingDeletes = false;
}

/* ============ فرمت‌دهی ============ */
function formatDueDate(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const j = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const today = todayJalali();
  if (today.y === j.jy && today.m === j.jm && today.d === j.jd) return 'امروز';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tJ = toJalaali(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
  if (tJ.jy === j.jy && tJ.jm === j.jm && tJ.jd === j.jd) return 'فردا';
  return `${toFa(j.jd)} ${FA_MONTHS[j.jm - 1]}`;
}
function formatRecurring(rec) {
  if (!rec) return '';
  const freqMap = { daily: 'روزانه', weekly: 'هفتگی', monthly: 'ماهانه', yearly: 'سالانه' };
  const base = freqMap[rec.frequency] || '';
  if (!base) return '';
  if (rec.interval && rec.interval > 1) return `${base} · ${toFa(rec.interval)}×`;
  return base;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============ فیلتر و مرتب‌سازی ============ */
function applyFilter(list) {
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
  const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
  const endOfWeek = new Date(); endOfWeek.setDate(endOfWeek.getDate() + 7);
  return list.filter(item => {
    if (state.filter.priority) {
      if (state.filter.priority === 'none') { if (item.priority) return false; }
      else if (item.priority !== state.filter.priority) return false;
    }
    if (state.filter.due) {
      if (state.filter.due === 'past') { if (!item.dueDate || item.dueDate >= startOfToday.getTime()) return false; }
      else if (state.filter.due === 'today') { if (!item.dueDate || item.dueDate < startOfToday.getTime() || item.dueDate > endOfToday.getTime()) return false; }
      else if (state.filter.due === 'week') { if (!item.dueDate || item.dueDate < now || item.dueDate > endOfWeek.getTime()) return false; }
      else if (state.filter.due === 'none') { if (item.dueDate) return false; }
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
  if (state.sortBy === 'created') sorted.sort((a, b) => b.createdAt - a.createdAt);
  else if (state.sortBy === 'due') {
    sorted.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  } else if (state.sortBy === 'priority') {
    const order = { high: 1, med: 2, low: 3 };
    sorted.sort((a, b) => {
      const pa = order[a.priority] || 99, pb = order[b.priority] || 99;
      if (pa !== pb) return pa - pb;
      return b.createdAt - a.createdAt;
    });
  }
  return sorted;
}

/* ============ رندر ============ */
export function renderTasks() {
  const list = document.getElementById('tasksList');
  if (!list) return;
  list.classList.toggle('is-hidden', state.hidden);
  let filtered = applyFilter(tasks());
  if (!state.showCompleted) filtered = filtered.filter(t => !t.completed);
  const sorted = applySort(filtered);
  if (sorted.length === 0) { renderEmptyTasks(list); return; }
  list.innerHTML = sorted.map(t => renderTaskItem(t)).join('');
  attachTaskEvents(list);
}

function renderEmptyTasks(list) {
  list.innerHTML = `
    <div class="task-empty-state">
      <div class="tes-icon"><svg viewBox="0 0 64 64" width="56" height="56" fill="none"><rect x="10" y="14" width="44" height="44" rx="10" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" stroke-width="2"/><polyline points="22 36 30 44 44 28" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></div>
      <div class="tes-title">هنوز تسکی ثبت نکردی!</div>
      <div class="tes-sub">موضوعات پیشنهادی:</div>
      <ul class="tes-suggestions">
        ${['کارهای روزانه', 'لیست خرید', 'یادآوری‌های پرداخت'].map(s => `<li data-suggest="${s}">• ${s}</li>`).join('')}
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
  const b = t.board ? BOARD_OPTIONS[t.board] : null;
  const dueTxt = t.dueDate ? formatDueDate(t.dueDate) : '';
  const isPast = t.dueDate && t.dueDate < Date.now() && !t.completed;
  const recurTxt = t.recurring ? formatRecurring(t.recurring) : '';
  const timeTxt = t.dueTime || '';

  return `
    <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
      <div class="ti-main">
        <button class="ti-check" data-act="toggle">
          ${t.completed ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
        <div class="ti-content">
          <div class="ti-title">${escapeHtml(t.title)}</div>
          ${t.description ? `<div class="ti-desc">${escapeHtml(t.description)}</div>` : ''}
          <div class="ti-badges">
            ${b ? `<span class="ti-badge board" style="--board-color:${b.color}"><span class="ti-dot" style="background:${b.color}"></span>${b.label}</span>` : ''}
            ${p ? `<span class="ti-badge prio"><span class="ti-dot" style="background:${p.color}"></span>${p.label}</span>` : ''}
            ${dueTxt ? `<span class="ti-badge due ${isPast ? 'past' : ''}">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${dueTxt}
              <button class="ti-badge-x" data-act="clear-date">×</button>
            </span>` : ''}
            ${timeTxt ? `<span class="ti-badge time">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${timeTxt}
              <button class="ti-badge-x" data-act="clear-time">×</button>
            </span>` : ''}
            ${(t.tags || []).map(tagId => {
              const tag = findTag(tagId); if (!tag) return '';
              return `<span class="ti-badge tag" style="--tag-color:${tag.color}">
                <span class="ti-dot" style="background:${tag.color}"></span>${tag.name}
              </span>`;
            }).join('')}
            ${recurTxt ? `<span class="ti-badge recur">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
              ${recurTxt}
            </span>` : ''}
          </div>
        </div>
        <button class="ti-action" data-act="edit" title="ویرایش">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="ti-action" data-act="delete" title="حذف">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function attachTaskEvents(list) {
  list.querySelectorAll('.task-item').forEach(el => {
    const id = el.dataset.id;
    el.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'toggle') toggleTask(id);
        else if (act === 'delete') deleteTask(id);
        else if (act === 'edit') openEditModal(id);
        else if (act === 'clear-time') clearTaskTime(id);
        else if (act === 'clear-date') clearTaskDate(id);
      });
    });
  });
}

function toggleTask(id) {
  const t = tasks().find(x => x.id === id); if (!t) return;
  t.completed = !t.completed; saveAllState(); renderTasks();
  syncTaskEverywhere(t);
}

function deleteTask(id) {
  const idx = tasks().findIndex(x => x.id === id);
  if (idx === -1) return;
  const [removed] = sharedState.tasks.splice(idx, 1);
  deletedBackup = { task: removed, index: idx };
  addPendingDelete(removed);
  saveAllState();
  renderTasks();
  window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
  showUndoToast('تسک حذف شد!', () => {
    if (!deletedBackup) return;
    sharedState.tasks.splice(deletedBackup.index, 0, deletedBackup.task);
    removeFromQueue(q => q.task?.id === deletedBackup.task.id);
    removePendingDelete(deletedBackup.task.id);
    deletedBackup = null;
    saveAllState(); renderTasks();
    window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
  });
  setTimeout(() => {
    if (!deletedBackup || deletedBackup.task.id !== removed.id) processPendingDeletes();
  }, UNDO_DELAY_MS);
}

function clearTaskTime(id) {
  const t = tasks().find(x => x.id === id); if (!t) return;
  t.dueTime = null; saveAllState(); renderTasks();
  syncTaskEverywhere(t);
}
function clearTaskDate(id) {
  const t = tasks().find(x => x.id === id); if (!t) return;
  t.dueDate = null; saveAllState(); renderTasks();
  if (t.calendarEventId) { deleteTaskCalendarEvent(t); delete t.calendarEventId; saveAllState(); }
  syncTaskToGoogleTasks(t);
}

function submitNew() {
  const titleEl = document.getElementById('tnTitle');
  const descEl = document.getElementById('tnDesc');
  const title = (titleEl?.value || '').trim();
  const desc = (descEl?.value || '').trim();
  if (!title) return;
  sharedState.tasks.push({
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title, description: desc, completed: false, createdAt: Date.now(),
    dueDate: inputDraft.dueDate, dueTime: inputDraft.dueTime,
    priority: inputDraft.priority, tags: [...inputDraft.tags],
    recurring: inputDraft.recurring, board: inputDraft.board,
  });
  if (titleEl) titleEl.value = '';
  if (descEl) { descEl.value = ''; descEl.style.height = 'auto'; }
  inputDraft = { title:'', desc:'', dueDate:null, dueTime:null, priority:null, tags:[], recurring:null, board:null };
  updateToolbarState();
  saveAllState(); renderTasks();
  const lastTask = tasks()[tasks().length - 1];
  if (lastTask) syncTaskEverywhere(lastTask);
}

function updateToolbarState() {
  const d = inputDraft;
  const prioBtn = document.getElementById('tnPriority');
  if (prioBtn) {
    prioBtn.classList.toggle('active', !!d.priority);
    if (d.priority) prioBtn.style.color = PRIORITIES[d.priority]?.color || '';
    else prioBtn.style.color = '';
  }
  document.getElementById('tnTime')?.classList.toggle('active', !!d.dueTime);
  document.getElementById('tnCalendar')?.classList.toggle('active', !!d.dueDate);
  document.getElementById('tnRecurring')?.classList.toggle('active', !!d.recurring);
  const tagBtn = document.getElementById('tnTag');
  if (tagBtn) {
    const has = d.tags.length > 0;
    tagBtn.classList.toggle('active', has);
    if (has) tagBtn.style.color = findTag(d.tags[0])?.color || '#3b82f6';
    else tagBtn.style.color = '';
  }
}

function updateEditToolbarState() {
  if (!editDraft) return;
  const d = editDraft;
  const prioBtn = document.getElementById('editPriority');
  if (prioBtn) {
    prioBtn.classList.toggle('active', !!d.priority);
    if (d.priority) prioBtn.style.color = PRIORITIES[d.priority]?.color || '';
    else prioBtn.style.color = '';
  }
  const boardBtn = document.getElementById('editBoard');
  if (boardBtn) {
    boardBtn.classList.toggle('active', !!d.board);
    const label = boardBtn.querySelector('.tn-label');
    if (label) label.textContent = d.board ? BOARD_OPTIONS[d.board].label : 'بورد';
    if (d.board) boardBtn.style.color = BOARD_OPTIONS[d.board]?.color || '';
    else boardBtn.style.color = '';
  }
  document.getElementById('editTime')?.classList.toggle('active', !!d.dueTime);
  document.getElementById('editCalendar')?.classList.toggle('active', !!d.dueDate);
  document.getElementById('editRecurring')?.classList.toggle('active', !!d.recurring);
  const tagBtn = document.getElementById('editTag');
  if (tagBtn) {
    const has = d.tags.length > 0;
    tagBtn.classList.toggle('active', has);
    if (has) tagBtn.style.color = findTag(d.tags[0])?.color || '#3b82f6';
    else tagBtn.style.color = '';
  }
}

/* ============ Edit Modal ============ */
function openEditModal(taskId) {
  const task = tasks().find(t => t.id === taskId);
  if (!task) return;
  editTaskId = taskId;
  isEditMode = true;
  editDraft = {
    title: task.title || '', desc: task.description || '',
    dueDate: task.dueDate || null, dueTime: task.dueTime || null,
    priority: task.priority || null, tags: [...(task.tags || [])],
    recurring: task.recurring ? { ...task.recurring } : null,
    board: task.board || null,
    calendarEventId: task.calendarEventId || null,
    tasksApiId: task.tasksApiId || null,
  };
  closePopover();
  let overlay = document.getElementById('editTaskOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'editTaskOverlay';
    overlay.className = 'edit-task-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) closeEditModal(); };
  renderEditModal();
  bindEditModalEvents();
  updateEditToolbarState();
  setTimeout(() => document.getElementById('editTaskTitle')?.focus(), 80);
}
function closeEditModal() {
  document.getElementById('editTaskOverlay')?.classList.add('hidden');
  closePopover();
  closeRecurringModal();
  isEditMode = false;
  editDraft = null;
  editTaskId = null;
}
function renderEditModal() {
  const overlay = document.getElementById('editTaskOverlay');
  if (!overlay || !editDraft) return;
  overlay.innerHTML = `
    <div class="edit-task-modal">
      <button type="button" class="edit-task-close" id="editTaskClose">×</button>
      <h3 class="edit-task-title">ویرایش تسک</h3>
      <div class="edit-task-inputs">
        <input type="text" id="editTaskTitle" class="edit-task-title-input" placeholder="عنوان تسک" value="${escapeHtml(editDraft.title)}">
        <textarea id="editTaskDesc" class="edit-task-desc-input" placeholder="توضیحات..." rows="3">${escapeHtml(editDraft.desc)}</textarea>
      </div>
      <div class="edit-task-toolbar">
        <button type="button" class="tn-icon" id="editRecurring"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg><span class="tn-label">تکرار</span></button>
        <button type="button" class="tn-icon" id="editBoard"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="10" rx="1.5"/></svg><span class="tn-label">بورد</span></button>
        <button type="button" class="tn-icon" id="editPriority"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg><span class="tn-label">اولویت</span></button>
        <button type="button" class="tn-icon" id="editTime"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="tn-label">ساعت</span></button>
        <button type="button" class="tn-icon" id="editCalendar"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span class="tn-label">سررسید</span></button>
        <button type="button" class="tn-icon" id="editTag"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg><span class="tn-label">برچسب‌ها</span></button>
      </div>
      <div class="edit-task-actions">
        <button type="button" class="edit-task-btn edit-task-btn-delete" id="editTaskDelete">حذف</button>
        <button type="button" class="edit-task-btn edit-task-btn-save" id="editTaskSave">ویرایش تسک</button>
      </div>
    </div>`;
}
function bindEditModalEvents() {
  document.getElementById('editTaskClose')?.addEventListener('click', closeEditModal);
  document.getElementById('editRecurring')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('recurring', e.currentTarget); });
  document.getElementById('editBoard')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('board', e.currentTarget); });
  document.getElementById('editPriority')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('priority', e.currentTarget); });
  document.getElementById('editTime')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('time', e.currentTarget); });
  document.getElementById('editCalendar')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('date', e.currentTarget); });
  document.getElementById('editTag')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('tag', e.currentTarget); });
  document.getElementById('editTaskDelete')?.addEventListener('click', () => {
    if (!editTaskId) return;
    const id = editTaskId;
    closeEditModal();
    deleteTask(id);
  });
  document.getElementById('editTaskSave')?.addEventListener('click', submitEdit);
}
function submitEdit() {
  const task = tasks().find(t => t.id === editTaskId);
  if (!task || !editDraft) return;
  const titleEl = document.getElementById('editTaskTitle');
  const descEl = document.getElementById('editTaskDesc');
  const title = (titleEl?.value || '').trim();
  const desc = (descEl?.value || '').trim();
  if (!title) { titleEl?.focus(); return; }
  task.title = title;
  task.description = desc;
  task.dueDate = editDraft.dueDate;
  task.dueTime = editDraft.dueTime;
  task.priority = editDraft.priority;
  task.tags = [...editDraft.tags];
  task.recurring = editDraft.recurring;
  task.board = editDraft.board;
  task.calendarEventId = editDraft.calendarEventId;
  task.tasksApiId = editDraft.tasksApiId;
  task.updatedAt = Date.now();
  saveAllState();
  closeEditModal();
  renderTasks();
  syncTaskEverywhere(task);
  if (!task.dueDate && task.calendarEventId) {
    deleteTaskCalendarEvent(task);
    delete task.calendarEventId;
    saveAllState();
  }
}

/* ============ Popovers ============ */
function closePopover() {
  document.querySelectorAll('.tasks-inline-popover').forEach(el => el.remove());
  currentPopoverKind = null;
}
function positionPopover(pop, triggerOrId) {
  const trigger = typeof triggerOrId === 'string' ? document.getElementById(triggerOrId) : triggerOrId;
  if (!trigger) return;
  pop.style.visibility = 'hidden';
  pop.style.position = 'fixed';
  pop.style.top = '-9999px';
  pop.style.left = '-9999px';
  void pop.offsetHeight;
  const tRect = trigger.getBoundingClientRect();
  const pRect = pop.getBoundingClientRect();
  const pW = pRect.width, pH = pRect.height;
  const vpH = window.innerHeight, vpW = window.innerWidth;
  let left = tRect.left + (tRect.width / 2) - (pW / 2);
  if (left < 10) left = 10;
  if (left + pW > vpW - 10) left = vpW - pW - 10;
  let top = tRect.top - pH - 10;
  if (top < 10) {
    const spaceBelow = vpH - tRect.bottom - 10;
    if (spaceBelow >= pH + 10) top = tRect.bottom + 10;
    else top = 10;
  }
  if (top + pH > vpH - 10) top = vpH - pH - 10;
  if (top < 10) top = 10;
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';
  pop.style.visibility = 'visible';
}
function openPopover(kind, triggerEl) {
  const triggerIdMap = {
    'priority': isEditMode ? 'editPriority' : 'tnPriority',
    'board': isEditMode ? 'editBoard' : 'tnBoard',
    'tag': isEditMode ? 'editTag' : 'tnTag',
    'time': isEditMode ? 'editTime' : 'tnTime',
    'date': isEditMode ? 'editCalendar' : 'tnCalendar',
    'recurring': isEditMode ? 'editRecurring' : 'tnRecurring',
  };
  const trigger = triggerEl || document.getElementById(triggerIdMap[kind]);
  if (kind === 'recurring') { closePopover(); openRecurringModal(); return; }
  if (kind === 'time') { closePopover(); openTimePicker(trigger); return; }
  if (kind === 'date') { closePopover(); openDatePicker(trigger); return; }
  if (currentPopoverKind === kind) { closePopover(); return; }
  closePopover();
  currentPopoverKind = kind;
  const pop = document.createElement('div');
  pop.className = 'tasks-inline-popover';
  pop.setAttribute('data-kind', kind);
  if (kind === 'priority') {
    const d = getActiveDraft();
    pop.innerHTML = `
      <div class="ip-title">اولویت</div>
      <div class="ip-list">
        <button class="ip-item ${!d.priority ? 'active' : ''}" data-prio="none"><span class="ip-dot" style="background:#94a3b8"></span><span>بدون اولویت</span></button>
        ${Object.entries(PRIORITIES).map(([k,v]) => `<button class="ip-item ${d.priority===k?'active':''}" data-prio="${k}"><span class="ip-dot" style="background:${v.color}"></span><span>${v.label}</span></button>`).join('')}
      </div>`;
  } else if (kind === 'board') {
    const d = getActiveDraft();
    pop.innerHTML = `<div class="ip-title">بورد</div><div class="ip-list">${Object.entries(BOARD_OPTIONS).map(([k,v]) => `<button class="ip-item ${d.board===k?'active':''}" data-board="${k}"><span class="ip-dot" style="background:${v.color}"></span><span>${v.label}</span></button>`).join('')}</div>`;
  } else if (kind === 'tag') {
    pop.innerHTML = renderTagPopoverHTML();
  }
  document.body.appendChild(pop);
  positionPopover(pop, trigger);
  if (kind === 'priority') {
    pop.querySelectorAll('[data-prio]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = b.dataset.prio;
        getActiveDraft().priority = v === 'none' ? null : v;
        if (isEditMode) updateEditToolbarState(); else updateToolbarState();
        closePopover();
      });
    });
  } else if (kind === 'board') {
    pop.querySelectorAll('[data-board]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        getActiveDraft().board = b.dataset.board;
        if (isEditMode) updateEditToolbarState(); else updateToolbarState();
        closePopover();
      });
    });
  } else if (kind === 'tag') {
    bindTagPopover(pop);
  }
}
function renderTagPopoverHTML() {
  const d = getActiveDraft();
  return `
    <div class="ip-title">برچسب‌ها</div>
    <div class="ip-tag-list">
      ${getTags().map(t => `
        <div class="ip-tag-row ${d.tags.includes(t.id) ? 'active' : ''}" data-tag-id="${t.id}">
          <button type="button" class="ip-tag-del" data-tag-del="${t.id}" title="حذف">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
          <span class="ip-tag-name">${escapeHtml(t.name)}</span>
          <span class="ip-tag-icon" style="background:${t.color}">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="2.4"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </span>
        </div>
      `).join('')}
    </div>
    <div class="ip-tag-add-row">
      <span class="ip-tag-add-icon">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
      <input type="text" class="ip-tag-add-input" id="ipTagInput" placeholder="افزودن برچسب جدید">
    </div>`;
}
function bindTagPopover(pop) {
  pop.querySelectorAll('.ip-tag-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-tag-del]')) return;
      const id = row.dataset.tagId;
      const draft = getActiveDraft();
      const idx = draft.tags.indexOf(id);
      if (idx >= 0) draft.tags.splice(idx, 1); else draft.tags.push(id);
      row.classList.toggle('active');
      if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    });
  });
  pop.querySelectorAll('[data-tag-del]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.tagDel;
      sharedState.allTags = getTags().filter(t => t.id !== id);
      getActiveDraft().tags = getActiveDraft().tags.filter(t => t !== id);
      sharedState.tasks.forEach(t => { if (t.tags) t.tags = t.tags.filter(x => x !== id); });
      sharedState.notes.forEach(t => { if (t.tags) t.tags = t.tags.filter(x => x !== id); });
      state.filter.tags = state.filter.tags.filter(x => x !== id);
      saveAllState(); renderTasks();
      pop.innerHTML = renderTagPopoverHTML();
      bindTagPopover(pop);
      pop.querySelector('#ipTagInput')?.focus();
      if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    });
  });
  const input = pop.querySelector('#ipTagInput');
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addNewTag(pop); }
  });
  input?.focus();
}
function addNewTag(pop) {
  const input = pop.querySelector('#ipTagInput');
  const name = input?.value.trim();
  if (!name) return;
  const palette = ['#38bdf8','#a78bfa','#f87171','#fbbf24','#22c55e','#f472b6','#60a5fa','#facc15','#fb923c'];
  const id = 'tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  const color = palette[getTags().length % palette.length];
  getTags().push({ id, name, color });
  getActiveDraft().tags.push(id);
  saveAllState();
  if (isEditMode) updateEditToolbarState(); else updateToolbarState();
  pop.innerHTML = renderTagPopoverHTML();
  bindTagPopover(pop);
  pop.querySelector('#ipTagInput')?.focus();
}

/* ============ Time Picker ============ */
function openTimePicker(triggerEl) {
  const d = getActiveDraft();
  if (d.dueTime) {
    const [hh, mm] = d.dueTime.split(':').map(Number);
    timeDraft = { h: isNaN(hh) ? 12 : hh, m: isNaN(mm) ? 0 : mm };
  } else {
    const now = new Date();
    timeDraft = { h: now.getHours(), m: now.getMinutes() };
  }
  const trigger = triggerEl || document.getElementById(isEditMode ? 'editTime' : 'tnTime');
  if (!trigger) return;
  const pop = document.createElement('div');
  pop.className = 'tasks-inline-popover time-picker-popover';
  const hoursHTML = Array.from({length: 24}, (_, i) => `<div class="tp-item ${i === timeDraft.h ? 'active' : ''}" data-h="${i}">${toFa(String(i).padStart(2,'0'))}</div>`).join('');
  const minsHTML = Array.from({length: 60}, (_, i) => `<div class="tp-item ${i === timeDraft.m ? 'active' : ''}" data-m="${i}">${toFa(String(i).padStart(2,'0'))}</div>`).join('');
  pop.innerHTML = `
    <div class="tp-labels"><div class="tp-label">ساعت</div><div class="tp-label">دقیقه</div></div>
    <div class="tp-cols">
      <div class="tp-col" id="tpHours"><div class="tp-scroll">${hoursHTML}</div></div>
      <div class="tp-col" id="tpMins"><div class="tp-scroll">${minsHTML}</div></div>
    </div>
    <div class="tp-actions"><button class="tp-confirm" id="tpConfirm">تایید</button></div>
    ${d.dueTime ? `<button class="tp-clear" id="tpClear">حذف ساعت</button>` : ''}`;
  document.body.appendChild(pop);
  positionPopover(pop, trigger);
  bindTimePicker();
}
function bindTimePicker() {
  const pop = document.querySelector('.time-picker-popover');
  if (!pop) return;
  const hoursCol = pop.querySelector('#tpHours');
  const minsCol = pop.querySelector('#tpMins');
  setTimeout(() => {
    const hA = hoursCol.querySelector('.tp-item.active');
    const mA = minsCol.querySelector('.tp-item.active');
    if (hA) hoursCol.scrollTop = hA.offsetTop - hoursCol.clientHeight / 2 + hA.offsetHeight / 2;
    if (mA) minsCol.scrollTop = mA.offsetTop - minsCol.clientHeight / 2 + mA.offsetHeight / 2;
  }, 30);
  hoursCol.querySelectorAll('.tp-item').forEach(it => {
    it.addEventListener('click', () => {
      hoursCol.querySelectorAll('.tp-item').forEach(x => x.classList.remove('active'));
      it.classList.add('active');
      timeDraft.h = +it.dataset.h;
      hoursCol.scrollTop = it.offsetTop - hoursCol.clientHeight / 2 + it.offsetHeight / 2;
    });
  });
  minsCol.querySelectorAll('.tp-item').forEach(it => {
    it.addEventListener('click', () => {
      minsCol.querySelectorAll('.tp-item').forEach(x => x.classList.remove('active'));
      it.classList.add('active');
      timeDraft.m = +it.dataset.m;
      minsCol.scrollTop = it.offsetTop - minsCol.clientHeight / 2 + it.offsetHeight / 2;
    });
  });
  pop.querySelector('#tpConfirm')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getActiveDraft().dueTime = `${String(timeDraft.h).padStart(2,'0')}:${String(timeDraft.m).padStart(2,'0')}`;
    if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    closePopover();
  });
  pop.querySelector('#tpClear')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getActiveDraft().dueTime = null;
    if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    closePopover();
  });
}

/* ============ Date Picker ============ */
function openDatePicker(triggerEl) {
  const d = getActiveDraft();
  const today = todayJalali();
  if (d.dueDate) {
    const dt = new Date(d.dueDate);
    const j = toJalaali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    dateView = { year: j.jy, month: j.jm };
    selectedDateInPicker = { y: j.jy, m: j.jm, d: j.jd };
  } else {
    dateView = { year: today.y, month: today.m };
    selectedDateInPicker = null;
  }
  const trigger = triggerEl || document.getElementById(isEditMode ? 'editCalendar' : 'tnCalendar');
  if (!trigger) return;
  document.querySelectorAll('.date-picker-popover').forEach(el => el.remove());
  const pop = document.createElement('div');
  pop.className = 'tasks-inline-popover date-picker-popover';
  document.body.appendChild(pop);
  renderDatePicker();
  positionPopover(pop, trigger);
}
function renderDatePicker() {
  const pop = document.querySelector('.date-picker-popover');
  if (!pop) return;
  const d = getActiveDraft();
  const today = todayJalali();
  const daysInMonth = getDaysInJalaliMonth(dateView.year, dateView.month);
  const firstGreg = toGregorian(dateView.year, dateView.month, 1);
  const firstDate = new Date(firstGreg.gy, firstGreg.gm - 1, firstGreg.gd);
  const jsDay = firstDate.getDay();
  const persianWeekday = (jsDay + 1) % 7;
  let cells = '';
  for (let i = 0; i < persianWeekday; i++) cells += `<div class="dp-cell dp-empty"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = (today.y === dateView.year && today.m === dateView.month && today.d === day);
    const isSelected = selectedDateInPicker && selectedDateInPicker.y === dateView.year && selectedDateInPicker.m === dateView.month && selectedDateInPicker.d === day;
    const cls = 'dp-cell' + (isToday ? ' dp-today' : '') + (isSelected ? ' dp-selected' : '');
    cells += `<button type="button" class="${cls}" data-d="${day}">${toFa(day)}</button>`;
  }
  pop.innerHTML = `
    <div class="dp-header">
      <button class="dp-nav" id="dpPrev"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg></button>
      <div class="dp-title">${FA_MONTHS[dateView.month - 1]} ${toFa(dateView.year)}</div>
      <button class="dp-nav" id="dpNext"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg></button>
    </div>
    <div class="dp-weekdays">${FA_WEEKDAYS.map(w => `<div class="dp-wd">${w}</div>`).join('')}</div>
    <div class="dp-grid">${cells}</div>
    <div class="dp-actions">
      <button class="dp-btn dp-btn-today" id="dpToday">برو به امروز</button>
      ${d.dueDate ? `<button class="dp-btn dp-btn-clear" id="dpClear">حذف تاریخ</button>` : ''}
      <button class="dp-btn dp-btn-confirm" id="dpConfirm">تایید</button>
    </div>`;
  bindDatePicker();
}
function bindDatePicker() {
  const pop = document.querySelector('.date-picker-popover');
  if (!pop) return;
  pop.querySelector('#dpNext')?.addEventListener('click', (e) => {
    e.stopPropagation(); dateView.month++;
    if (dateView.month > 12) { dateView.month = 1; dateView.year++; }
    renderDatePicker();
  });
  pop.querySelector('#dpPrev')?.addEventListener('click', (e) => {
    e.stopPropagation(); dateView.month--;
    if (dateView.month < 1) { dateView.month = 12; dateView.year--; }
    renderDatePicker();
  });
  pop.querySelectorAll('.dp-cell[data-d]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedDateInPicker = { y: dateView.year, m: dateView.month, d: +btn.dataset.d };
      renderDatePicker();
    });
  });
  pop.querySelector('#dpToday')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const t = todayJalali();
    dateView = { year: t.y, month: t.m };
    selectedDateInPicker = { y: t.y, m: t.m, d: t.d };
    renderDatePicker();
  });
  pop.querySelector('#dpClear')?.addEventListener('click', (e) => {
    e.stopPropagation();
    getActiveDraft().dueDate = null;
    selectedDateInPicker = null;
    if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    closePopover();
  });
  pop.querySelector('#dpConfirm')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedDateInPicker) {
      const g = toGregorian(selectedDateInPicker.y, selectedDateInPicker.m, selectedDateInPicker.d);
      getActiveDraft().dueDate = new Date(g.gy, g.gm - 1, g.gd, 12, 0, 0).getTime();
    }
    if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    closePopover();
  });
}

/* ============ Recurring ============ */
function openRecurringModal() {
  const d = getActiveDraft();
  if (d.recurring) {
    recurringDraft = {
      frequency: d.recurring.frequency || 'daily',
      interval: d.recurring.interval || 1,
      weekDays: [...(d.recurring.weekDays || [])],
      monthDays: [...(d.recurring.monthDays || [])],
      months: [...(d.recurring.months || [])],
    };
  } else {
    recurringDraft = { frequency: 'daily', interval: 1, weekDays: [], monthDays: [], months: [] };
  }
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
  overlay.onclick = (e) => { if (e.target === overlay) closeRecurringModal(); };
}
function closeRecurringModal() {
  document.getElementById('recurringOverlay')?.classList.add('hidden');
  document.getElementById('rdMenu')?.classList.add('hidden');
}
function renderRecurringModal() {
  const overlay = document.getElementById('recurringOverlay');
  if (!overlay) return;
  const freqLabels = { daily: 'روز', weekly: 'هفته', monthly: 'ماه', yearly: 'سال' };
  const hasRecurring = !!getActiveDraft().recurring;
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
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>
      <div class="recurring-divider"></div>
      ${recurringDraft.frequency === 'weekly' ? `<div class="recurring-row recurring-row-col"><span class="recurring-label">چه روزهایی؟</span><div class="recur-weekdays">${FA_WEEKDAYS.map((label, id) => `<button type="button" class="recur-pill recur-pill-day ${recurringDraft.weekDays.includes(id) ? 'active' : ''}" data-wday="${id}">${label}</button>`).join('')}</div></div>` : ''}
      ${recurringDraft.frequency === 'monthly' ? `<div class="recurring-row recurring-row-col"><span class="recurring-label">چه روزهایی از ماه؟</span><div class="recur-days-grid">${Array.from({length: 31}, (_, i) => i + 1).map(d => `<button type="button" class="recur-pill recur-pill-num ${recurringDraft.monthDays.includes(d) ? 'active' : ''}" data-mday="${d}">${toFa(d)}</button>`).join('')}</div></div>` : ''}
      ${recurringDraft.frequency === 'yearly' ? `
        <div class="recurring-row recurring-row-col"><span class="recurring-label">چه ماه‌هایی؟</span><div class="recur-months-grid">${FA_MONTHS.map((m, i) => `<button type="button" class="recur-pill recur-pill-month ${recurringDraft.months.includes(i) ? 'active' : ''}" data-month="${i}">${m}</button>`).join('')}</div></div>
        <div class="recurring-row recurring-row-col"><span class="recurring-label">چه روزهایی از ماه؟</span><div class="recur-days-grid">${Array.from({length: 31}, (_, i) => i + 1).map(d => `<button type="button" class="recur-pill recur-pill-num ${recurringDraft.monthDays.includes(d) ? 'active' : ''}" data-mday="${d}">${toFa(d)}</button>`).join('')}</div></div>` : ''}
      <div class="recurring-actions ${hasRecurring ? 'has-clear' : ''}">
        <button type="button" class="recur-btn-cancel" id="recurCancel">بیخیال</button>
        ${hasRecurring ? `<button type="button" class="recur-btn-clear" id="recurClear">حذف تکرار</button>` : ''}
        <button type="button" class="recur-btn-confirm" id="recurConfirm">تایید</button>
      </div>
    </div>
    <div class="rd-menu hidden" id="rdMenu">
      ${['daily','weekly','monthly','yearly'].map(k => `<button type="button" class="rd-item ${recurringDraft.frequency===k?'active':''}" data-freq="${k}"><span>${freqLabels[k]}</span></button>`).join('')}
    </div>`;
  const menu = document.getElementById('rdMenu');
  if (menu) document.body.appendChild(menu);
  attachRecurringEvents();
}
function attachRecurringEvents() {
  const overlay = document.getElementById('recurringOverlay');
  if (!overlay) return;
  overlay.querySelectorAll('.ri-btn').forEach(b => {
    b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'inc' && recurringDraft.interval < 99) recurringDraft.interval++;
      if (act === 'dec' && recurringDraft.interval > 1) recurringDraft.interval--;
      const inp = overlay.querySelector('.ri-input');
      if (inp) inp.value = toFa(recurringDraft.interval);
    });
  });
  const trigger = document.getElementById('rdTrigger');
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('rdMenu');
      if (!menu) return;
      if (menu.classList.contains('hidden')) {
        const rect = trigger.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 6) + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.width = rect.width + 'px';
        menu.classList.remove('hidden');
      } else menu.classList.add('hidden');
    });
  }
  const menu = document.getElementById('rdMenu');
  menu?.querySelectorAll('[data-freq]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      recurringDraft.frequency = b.dataset.freq;
      menu.classList.add('hidden');
      renderRecurringModal();
    });
  });
  overlay.querySelectorAll('[data-wday]').forEach(b => {
    b.addEventListener('click', () => {
      const dd = +b.dataset.wday;
      const idx = recurringDraft.weekDays.indexOf(dd);
      if (idx >= 0) recurringDraft.weekDays.splice(idx, 1); else recurringDraft.weekDays.push(dd);
      b.classList.toggle('active');
    });
  });
  overlay.querySelectorAll('[data-mday]').forEach(b => {
    b.addEventListener('click', () => {
      const dd = +b.dataset.mday;
      const idx = recurringDraft.monthDays.indexOf(dd);
      if (idx >= 0) recurringDraft.monthDays.splice(idx, 1); else recurringDraft.monthDays.push(dd);
      b.classList.toggle('active');
    });
  });
  overlay.querySelectorAll('[data-month]').forEach(b => {
    b.addEventListener('click', () => {
      const m = +b.dataset.month;
      const idx = recurringDraft.months.indexOf(m);
      if (idx >= 0) recurringDraft.months.splice(idx, 1); else recurringDraft.months.push(m);
      b.classList.toggle('active');
    });
  });
  document.getElementById('recurConfirm')?.addEventListener('click', () => {
    getActiveDraft().recurring = {
      frequency: recurringDraft.frequency,
      interval: recurringDraft.interval,
      weekDays: [...recurringDraft.weekDays],
      monthDays: [...recurringDraft.monthDays],
      months: [...recurringDraft.months],
    };
    if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    closeRecurringModal();
  });
  document.getElementById('recurClear')?.addEventListener('click', () => {
    getActiveDraft().recurring = null;
    if (isEditMode) updateEditToolbarState(); else updateToolbarState();
    closeRecurringModal();
  });
  document.getElementById('recurCancel')?.addEventListener('click', closeRecurringModal);
}

/* ============ Panels ============ */
function closeAllPanels() {
  document.querySelectorAll('.task-panel-pop').forEach(el => el.remove());
}
function positionPanel(panel, rect) {
  panel.style.position = 'fixed';
  panel.style.top = (rect.bottom + 8) + 'px';
  panel.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 300)) + 'px';
  panel.style.zIndex = '99999';
}
function openMorePanel() {
  const rect = document.getElementById('taskActionMore')?.getBoundingClientRect();
  if (!rect) return;
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop';
  if (state.activeTab === 'tasks') {
    panel.innerHTML = `
      <label class="tp-more-item"><span>نمایش انجام شده‌ها</span><span class="tp-checkbox ${state.showCompleted ? 'checked' : ''}" id="tpShowCompleted"></span></label>
      <div class="tp-divider"></div>
      <button class="tp-more-item danger" id="tpDeleteAll"><span>حذف همه تسک‌ها</span></button>`;
  } else {
    panel.innerHTML = `<button class="tp-more-item danger" id="tpDeleteAllNotes"><span>حذف همه یادداشت‌ها</span></button>`;
  }
  document.body.appendChild(panel);
  positionPanel(panel, rect);
  document.getElementById('tpShowCompleted')?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    state.showCompleted = !state.showCompleted;
    document.getElementById('tpShowCompleted')?.classList.toggle('checked', state.showCompleted);
    renderTasks();
  });
  document.getElementById('tpDeleteAll')?.addEventListener('click', () => {
    if (confirm('همه تسک‌ها حذف شوند؟')) { sharedState.tasks = []; saveAllState(); renderTasks(); }
    closeAllPanels();
  });
  document.getElementById('tpDeleteAllNotes')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('notes-delete-all'));
    closeAllPanels();
  });
}
function openFilterPanel() {
  const rect = document.getElementById('taskActionFilter')?.getBoundingClientRect();
  if (!rect) return;
  if (state.activeTab === 'notes') {
    window.dispatchEvent(new CustomEvent('notes-open-filter', { detail: { rect } }));
    return;
  }
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop filter-panel';
  panel.innerHTML = `
    <div class="tp-section"><div class="tp-section-title">تاریخ سررسید</div><div class="tp-chip-row">
      <button class="tp-chip ${state.filter.due==='past'?'active':''}" data-fdue="past">گذشته</button>
      <button class="tp-chip ${state.filter.due==='today'?'active':''}" data-fdue="today">امروز</button>
      <button class="tp-chip ${state.filter.due==='week'?'active':''}" data-fdue="week">این هفته</button>
      <button class="tp-chip ${state.filter.due==='none'?'active':''}" data-fdue="none">بدون سررسید</button>
    </div></div>
    <div class="tp-section"><div class="tp-section-title">اولویت</div><div class="tp-chip-row">
      ${Object.entries(PRIORITIES).map(([k,v]) => `<button class="tp-chip ${state.filter.priority===k?'active':''}" data-fprio="${k}"><span class="tp-dot" style="background:${v.color}"></span>${v.label}</button>`).join('')}
      <button class="tp-chip ${state.filter.priority==='none'?'active':''}" data-fprio="none">بدون اولویت</button>
    </div></div>
    <div class="tp-section"><div class="tp-section-title">برچسب‌ها</div><div class="tp-chip-row">
      ${getTags().map(t => `<button class="tp-chip ${state.filter.tags.includes(t.id)?'active':''}" data-ftag="${t.id}"><span class="tp-dot" style="background:${t.color}"></span>${t.name}</button>`).join('')}
    </div></div>
    <button class="tp-clear-btn" id="tpClearFilter">پاک کردن همه فیلترها</button>`;
  document.body.appendChild(panel);
  positionPanel(panel, rect);
  panel.querySelectorAll('[data-fdue]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.fdue;
      state.filter.due = state.filter.due === v ? null : v;
      renderTasks(); closeAllPanels(); openFilterPanel();
    });
  });
  panel.querySelectorAll('[data-fprio]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.fprio;
      state.filter.priority = state.filter.priority === v ? null : v;
      renderTasks(); closeAllPanels(); openFilterPanel();
    });
  });
  panel.querySelectorAll('[data-ftag]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.ftag;
      const idx = state.filter.tags.indexOf(v);
      if (idx >= 0) state.filter.tags.splice(idx, 1); else state.filter.tags.push(v);
      renderTasks(); closeAllPanels(); openFilterPanel();
    });
  });
  document.getElementById('tpClearFilter')?.addEventListener('click', () => {
    state.filter = { due: null, priority: null, tags: [] };
    renderTasks(); closeAllPanels();
  });
}
function openSortPanel() {
  const rect = document.getElementById('taskActionSort')?.getBoundingClientRect();
  if (!rect) return;
  if (state.activeTab === 'notes') {
    window.dispatchEvent(new CustomEvent('notes-open-sort', { detail: { rect } }));
    return;
  }
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop sort-panel';
  const opts = [
    { key: 'created', label: 'تاریخ ساخت' },
    { key: 'due', label: 'تاریخ سررسید' },
    { key: 'priority', label: 'اولویت' },
  ];
  panel.innerHTML = `
    <div class="tp-section-title" style="padding:6px 10px;">مرتب‌سازی بر اساس</div>
    ${opts.map(o => `<button class="tp-more-item" data-sort="${o.key}"><span>${o.label}</span><span class="tp-radio ${state.sortBy === o.key ? 'active' : ''}"></span></button>`).join('')}`;
  document.body.appendChild(panel);
  positionPanel(panel, rect);
  panel.querySelectorAll('[data-sort]').forEach(b => {
    b.addEventListener('click', () => {
      state.sortBy = b.dataset.sort;
      renderTasks(); closeAllPanels();
    });
  });
}

/* ============ INIT ============ */
export function initTasks() {
  loadAllState();

  document.querySelectorAll('.task-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      state.activeTab = tab;
      document.querySelectorAll('.task-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      const titleEl = document.getElementById('tnTitle');
      const descEl = document.getElementById('tnDesc');
      const inputWrap = document.querySelector('.task-new-input-wrap');
      const toolbar = document.querySelector('.tn-toolbar');

      if (tab === 'tasks') {
        if (titleEl) titleEl.style.display = '';
        if (descEl) descEl.style.display = '';
        if (toolbar) toolbar.style.display = '';
        if (inputWrap) {
          inputWrap.classList.remove('note-mode');
          inputWrap.onclick = null;
        }
        renderTasks();
      } else {
        if (titleEl) titleEl.style.display = 'none';
        if (descEl) descEl.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if (inputWrap) {
          inputWrap.classList.add('note-mode');
          inputWrap.onclick = (e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('notes-open-editor'));
          };
        }
        window.dispatchEvent(new CustomEvent('notes-render'));
      }
    });
  });

  document.getElementById('taskActionMore')?.addEventListener('click', (e) => { e.stopPropagation(); closeAllPanels(); openMorePanel(); });
  document.getElementById('taskActionHide')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.hidden = !state.hidden;
    document.getElementById('taskActionHide')?.classList.toggle('active', state.hidden);
    if (state.activeTab === 'notes') {
      window.dispatchEvent(new CustomEvent('notes-hide-toggle', { detail: state.hidden }));
    } else {
      renderTasks();
    }
  });
  document.getElementById('taskActionFilter')?.addEventListener('click', (e) => { e.stopPropagation(); closeAllPanels(); openFilterPanel(); });
  document.getElementById('taskActionSort')?.addEventListener('click', (e) => { e.stopPropagation(); closeAllPanels(); openSortPanel(); });

  const titleEl = document.getElementById('tnTitle');
  const descEl = document.getElementById('tnDesc');
  titleEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitNew(); } });
  descEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNew(); }
  });
  descEl?.addEventListener('input', () => {
    descEl.style.height = 'auto';
    descEl.style.height = Math.min(descEl.scrollHeight, 80) + 'px';
  });
  document.getElementById('tnSubmit')?.addEventListener('click', (e) => { e.stopPropagation(); submitNew(); });

  document.getElementById('tnRecurring')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('recurring', e.currentTarget); });
  document.getElementById('tnPriority')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('priority', e.currentTarget); });
  document.getElementById('tnTime')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('time', e.currentTarget); });
  document.getElementById('tnCalendar')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('date', e.currentTarget); });
  document.getElementById('tnTag')?.addEventListener('click', (e) => { e.stopPropagation(); openPopover('tag', e.currentTarget); });

  document.addEventListener('click', (e) => {
    const inPanel = e.target.closest('.task-panel-pop');
    const inAction = e.target.closest('.task-action-bar');
    if (!inPanel && !inAction) closeAllPanels();
    const inPop = e.target.closest('.tasks-inline-popover');
    const inTool = e.target.closest('.tn-toolbar');
    const inEditTool = e.target.closest('.edit-task-toolbar');
    const inEditModal = e.target.closest('.edit-task-modal');
    if (!inPop && !inTool && !inEditTool && !inEditModal) closePopover();
  });

  window.addEventListener('resize', () => closeAllPanels());

  loadQueue();
  dispatchSyncStatus();

  window.addEventListener('online', () => {
    setTimeout(() => { processQueue(); processPendingDeletes(); }, 1500);
  });
  window.addEventListener('user-signed-in', () => {
    setTimeout(() => { processQueue(); processPendingDeletes(); }, 2000);
  });
  window.addEventListener('abner-check-pending-deletes', () => processPendingDeletes());
  if (navigator.onLine && getUser()) {
    setTimeout(() => { processQueue(); processPendingDeletes(); }, 3000);
  }
  setInterval(() => {
    if (navigator.onLine && getUser()) processPendingDeletes();
  }, 30 * 1000);

  updateToolbarState();
  renderTasks();
}