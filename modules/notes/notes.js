/* ============ ماژول یادداشت — آبنر v4 ============ */

import {
  sharedState, loadAllState, saveAllState, getTags, findTag,
  showUndoToast, UNDO_DELAY_MS,
} from '../shared/state.js';

const NOTE_COLORS = [
  { id: 'default', color: '#94a3b8', label: 'پیش‌فرض' },
  { id: 'red',     color: '#ef4444', label: 'قرمز' },
  { id: 'pink',    color: '#f472b6', label: 'صورتی' },
  { id: 'purple',  color: '#a78bfa', label: 'بنفش' },
  { id: 'blue',    color: '#3b82f6', label: 'آبی' },
  { id: 'teal',    color: '#14b8a6', label: 'فیروزه' },
  { id: 'green',   color: '#22c55e', label: 'سبز' },
  { id: 'yellow',  color: '#facc15', label: 'زرد' },
  { id: 'orange',  color: '#f97316', label: 'نارنجی' },
  { id: 'brown',   color: '#b45309', label: 'قهوه‌ای' },
];

const NOTE_COLOR_MAP = {
  default: { bg: 'rgba(255,255,255,0.04)',   border: 'rgba(255,255,255,0.12)' },
  red:     { bg: 'rgba(239,68,68,0.14)',     border: 'rgba(239,68,68,0.35)' },
  pink:    { bg: 'rgba(244,114,182,0.14)',   border: 'rgba(244,114,182,0.35)' },
  purple:  { bg: 'rgba(167,139,250,0.14)',   border: 'rgba(167,139,250,0.35)' },
  blue:    { bg: 'rgba(59,130,246,0.14)',    border: 'rgba(59,130,246,0.35)' },
  teal:    { bg: 'rgba(20,184,166,0.14)',    border: 'rgba(20,184,166,0.35)' },
  green:   { bg: 'rgba(34,197,94,0.14)',     border: 'rgba(34,197,94,0.35)' },
  yellow:  { bg: 'rgba(250,204,21,0.14)',    border: 'rgba(250,204,21,0.35)' },
  orange:  { bg: 'rgba(249,115,22,0.14)',    border: 'rgba(249,115,22,0.35)' },
  brown:   { bg: 'rgba(180,83,9,0.14)',      border: 'rgba(180,83,9,0.35)' },
};

const FA_WEEKDAYS = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const FIRED_KEY = 'abner_fired_reminders';
const MAX_ATTACH_SIZE = 10 * 1024 * 1024; // 10MB

const notesState = {
  activeTab: 'tasks',
  hidden: false,
  sortBy: 'updated',
  filter: { due: null, color: null, tags: [] },
};

let noteEditorDraft = null;
let noteEditorId = null;
let deletedBackup = null;
let reminderInterval = null;
let pendingAttachments = [];
let dateView = { year: 0, month: 0 };
let selectedDateInPicker = null;

const notes = () => sharedState.notes;

/* ============ جلالی ============ */
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

/* ============ فرمت‌دهی ============ */
function formatNoteDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const now = new Date();
  const nj = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  if (nj.jy === j.jy && nj.jm === j.jm && nj.jd === j.jd) {
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `امروز · ${toFa(hh)}:${toFa(mm)}`;
  }
  return `${toFa(j.jd)} ${FA_MONTHS[j.jm - 1]}`;
}
function formatDateTimeShort(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${toFa(j.jd)} ${FA_MONTHS[j.jm - 1]} · ${toFa(hh)}:${toFa(mm)}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function getNoteColorStyle(id) { return NOTE_COLOR_MAP[id] || NOTE_COLOR_MAP.default; }
function findNoteColor(id) { return NOTE_COLORS.find(c => c.id === id) || NOTE_COLORS[0]; }
function fileSizeFmt(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(2) + ' MB';
}
function isHtmlContent(s) { return /<\/?[a-z][\s\S]*>/i.test(s || ''); }
function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

/* ============ فیلتر و مرتب‌سازی ============ */
function applyFilter(list) {
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
  const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
  const endOfWeek = new Date(); endOfWeek.setDate(endOfWeek.getDate() + 7);
  return list.filter(item => {
    if (notesState.filter.color) {
      if (notesState.filter.color === 'default') {
        if (item.color && item.color !== 'default') return false;
      } else if (item.color !== notesState.filter.color) return false;
    }
    if (notesState.filter.due) {
      const ts = item.updatedAt || item.createdAt;
      if (notesState.filter.due === 'past') { if (!ts || ts >= startOfToday.getTime()) return false; }
      else if (notesState.filter.due === 'today') { if (!ts || ts < startOfToday.getTime() || ts > endOfToday.getTime()) return false; }
      else if (notesState.filter.due === 'week') { if (!ts || ts < now || ts > endOfWeek.getTime()) return false; }
    }
    if (notesState.filter.tags.length > 0) {
      const itemTags = item.tags || [];
      if (!notesState.filter.tags.some(t => itemTags.includes(t))) return false;
    }
    return true;
  });
}
function applySort(list) {
  const sorted = [...list];
  if (notesState.sortBy === 'created') sorted.sort((a, b) => b.createdAt - a.createdAt);
  else if (notesState.sortBy === 'updated') sorted.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  else if (notesState.sortBy === 'title') sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fa'));
  const pinned = sorted.filter(n => n.pinned);
  const others = sorted.filter(n => !n.pinned);
  return [...pinned, ...others];
}

/* ============ رندر ============ */
export function renderNotes() {
  if (notesState.activeTab !== 'notes') return;
  const list = document.getElementById('tasksList');
  if (!list) return;
  list.classList.toggle('is-hidden', notesState.hidden);
  const filtered = applyFilter(notes());
  const sorted = applySort(filtered);
  if (sorted.length === 0) { renderEmptyNotes(list); return; }
  list.innerHTML = sorted.map(n => renderNoteItem(n)).join('');
  attachNoteEvents(list);
}

function renderEmptyNotes(list) {
  list.innerHTML = `
    <div class="task-empty-state">
      <div class="tes-icon"><svg viewBox="0 0 64 64" width="56" height="56" fill="none"><rect x="12" y="10" width="40" height="46" rx="6" fill="rgba(250,204,21,0.18)" stroke="#facc15" stroke-width="2"/><line x1="22" y1="24" x2="42" y2="24" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/><line x1="22" y1="32" x2="42" y2="32" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/><line x1="22" y1="40" x2="34" y2="40" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/></svg></div>
      <div class="tes-title">هنوز یادداشتی ثبت نکردی!</div>
      <div class="tes-sub">موضوعات پیشنهادی:</div>
      <ul class="tes-suggestions">
        ${['ژورنال روزانه', 'برنامه‌ریزی برای ماه جدید', 'نوشتن لیست اهداف'].map(s => `<li data-note-suggest="${s}">• ${s}</li>`).join('')}
      </ul>
    </div>
  `;
  list.querySelectorAll('[data-note-suggest]').forEach(el => {
    el.addEventListener('click', () => openNoteEditor({ title: el.dataset.noteSuggest }));
  });
}

function previewContent(n) {
  const c = n.content || '';
  if (!c) return '';
  if (isHtmlContent(c)) {
    const tmp = document.createElement('div');
    tmp.innerHTML = c;
    return tmp.textContent || '';
  }
  return c;
}

function renderNoteItem(n) {
  const colorStyle = getNoteColorStyle(n.color || 'default');
  const tags = (n.tags || []).map(tid => findTag(tid)).filter(Boolean);
  const updatedTxt = n.updatedAt && n.updatedAt !== n.createdAt
    ? `ویرایش: ${formatNoteDate(n.updatedAt)}`
    : formatNoteDate(n.createdAt);
  const preview = previewContent(n);
  const attachCount = (n.attachments || []).length;

  return `
    <div class="task-item note-item ${n.pinned ? 'pinned' : ''}"
         data-note-id="${n.id}"
         style="--note-bg:${colorStyle.bg}; --note-border:${colorStyle.border};">
      <div class="ti-main">
        <div class="ti-content">
          <div class="ti-title">${escapeHtml(n.title || 'بدون عنوان')}</div>
          ${preview ? `<div class="ti-desc">${escapeHtml(preview)}</div>` : ''}
          <div class="ti-badges">
            <span class="ti-badge due">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${updatedTxt}
            </span>
            ${n.reminder ? `<span class="ti-badge recur">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              ${formatDateTimeShort(n.reminder)}
            </span>` : ''}
            ${attachCount > 0 ? `<span class="ti-badge attach">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              ${toFa(attachCount)} پیوست
            </span>` : ''}
            ${tags.map(tag => `
              <span class="ti-badge tag" style="--tag-color:${tag.color}">
                <span class="ti-dot" style="background:${tag.color}"></span>${tag.name}
              </span>
            `).join('')}
          </div>
        </div>
        <button class="ti-action" data-act="pin" title="${n.pinned ? 'برداشتن سنجاق' : 'سنجاق'}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${n.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>
        </button>
        <button class="ti-action" data-act="delete" title="حذف">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function attachNoteEvents(list) {
  list.querySelectorAll('.note-item').forEach(el => {
    const id = el.dataset.noteId;
    el.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'delete') deleteNote(id);
        else if (act === 'pin') togglePin(id);
      });
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-act]')) return;
      openNoteEditor(null, id);
    });
  });
}

function togglePin(id) {
  const n = notes().find(x => x.id === id); if (!n) return;
  n.pinned = !n.pinned;
  saveAllState();
  renderNotes();
  window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
}

function deleteNote(id) {
  const idx = notes().findIndex(x => x.id === id);
  if (idx === -1) return;
  const [removed] = sharedState.notes.splice(idx, 1);
  deletedBackup = { note: removed, index: idx };
  saveAllState();
  renderNotes();
  window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
  showUndoToast('یادداشت حذف شد!', () => {
    if (!deletedBackup) return;
    sharedState.notes.splice(deletedBackup.index, 0, deletedBackup.note);
    deletedBackup = null;
    saveAllState();
    renderNotes();
    window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
  });
}

/* ============================================================
   Note Editor
============================================================ */
function openNoteEditor(initialData = null, editId = null) {
  if (editId) {
    const note = notes().find(n => n.id === editId);
    if (!note) return;
    noteEditorId = editId;
    noteEditorDraft = {
      title: note.title || '',
      content: note.content || '',
      color: note.color || 'default',
      tags: [...(note.tags || [])],
      reminder: note.reminder || null,
      dueDate: note.dueDate || null,
      pinned: !!note.pinned,
      attachments: [...(note.attachments || [])],
      createdAt: note.createdAt,
    };
  } else {
    noteEditorId = null;
    noteEditorDraft = {
      title: initialData?.title || '',
      content: initialData?.content || '',
      color: 'default',
      tags: [],
      reminder: null,
      dueDate: null,
      pinned: false,
      attachments: [],
      createdAt: Date.now(),
    };
  }
  pendingAttachments = [...noteEditorDraft.attachments];

  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch (_) {}
  }

  let overlay = document.getElementById('noteEditorOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'noteEditorOverlay';
    overlay.className = 'note-editor-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => {
    if (e.target === overlay) { closeNoteEditor(); return; }
    const pop = document.getElementById('activeNotePopover');
    if (pop) {
      if (pop.contains(e.target)) return;
      if (e.target.closest('[data-note-tool]')) return;
      pop.remove();
    }
  };
  renderNoteEditor();
  setTimeout(() => document.getElementById('noteEditorTitle')?.focus(), 100);
}

function closeNoteEditor() {
  closeNotePopover();
  document.getElementById('noteEditorOverlay')?.classList.add('hidden');
  noteEditorDraft = null;
  noteEditorId = null;
  pendingAttachments = [];
}

function renderNoteEditor() {
  const overlay = document.getElementById('noteEditorOverlay');
  if (!overlay || !noteEditorDraft) return;
  const colorStyle = getNoteColorStyle(noteEditorDraft.color);

  overlay.innerHTML = `
    <div class="note-editor-modal" style="--note-current-bg:${colorStyle.bg}; --note-current-border:${colorStyle.border};">
      <button type="button" class="note-editor-close" id="noteEditorClose" title="بستن">×</button>

      <div class="note-editor-body">
        <input type="text" id="noteEditorTitle" class="note-editor-title" placeholder="عنوان یادداشت" value="${escapeHtml(noteEditorDraft.title)}" autocomplete="off" maxlength="200">
        <div id="noteEditorContent" class="note-editor-content" contenteditable="true" data-placeholder="متن یادداشت...">${isHtmlContent(noteEditorDraft.content) ? sanitizeHtml(noteEditorDraft.content) : escapeHtml(noteEditorDraft.content)}</div>
      </div>

      <div class="note-attachments-list" id="noteAttachmentsList">
        ${pendingAttachments.length ? pendingAttachments.map((a, i) => `
          <div class="note-attach-item" data-attach-idx="${i}">
            <div class="note-attach-icon">
              ${a.type && a.type.startsWith('image/')
                ? `<img src="${a.data}" alt="">`
                : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`}
            </div>
            <div class="note-attach-info">
              <div class="note-attach-name">${escapeHtml(a.name)}</div>
              <div class="note-attach-size">${fileSizeFmt(a.size)}</div>
            </div>
            <button type="button" class="note-attach-remove" data-remove-attach="${i}" title="حذف پیوست">×</button>
          </div>
        `).join('') : ''}
      </div>

      <div class="note-editor-toolbar">
        <button type="button" class="note-editor-tool-btn" data-note-tool="color" title="رنگ">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor"/><circle cx="15.5" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/></svg>
          <span>رنگ</span>
        </button>
        <button type="button" class="note-editor-tool-btn" data-note-tool="tag" title="برچسب">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <span>برچسب</span>
        </button>
        <button type="button" class="note-editor-tool-btn ${noteEditorDraft.dueDate ? 'active' : ''}" data-note-tool="date" title="سررسید">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${noteEditorDraft.dueDate ? formatDateTimeShort(noteEditorDraft.dueDate) : 'سررسید'}</span>
        </button>
        <button type="button" class="note-editor-tool-btn ${noteEditorDraft.reminder ? 'active' : ''}" data-note-tool="reminder" title="یادآور">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span>${noteEditorDraft.reminder ? formatDateTimeShort(noteEditorDraft.reminder) : 'یادآور'}</span>
        </button>
        <button type="button" class="note-editor-tool-btn" data-note-tool="font" title="فونت">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          <span>فونت</span>
        </button>
        <button type="button" class="note-editor-tool-btn" data-note-tool="attach" title="پیوست">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <span>پیوست</span>
        </button>
        <button type="button" class="note-editor-tool-btn ${noteEditorDraft.pinned ? 'active' : ''}" data-note-tool="pin" title="سنجاق">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="${noteEditorDraft.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>
          <span>سنجاق</span>
        </button>
        <button type="button" class="note-editor-save" id="noteEditorSave" title="ذخیره">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>ذخیره</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById('noteEditorClose')?.addEventListener('click', closeNoteEditor);
  document.getElementById('noteEditorSave')?.addEventListener('click', saveNoteEditor);

  overlay.querySelectorAll('[data-note-tool]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kind = btn.dataset.noteTool;
      if (kind === 'pin') {
        noteEditorDraft.pinned = !noteEditorDraft.pinned;
        renderNoteEditor();
        return;
      }
      if (kind === 'attach') {
        openAttachPicker();
        return;
      }
      openNotePopover(kind, btn);
    });
  });

  overlay.querySelectorAll('[data-remove-attach]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.removeAttach;
      pendingAttachments.splice(idx, 1);
      noteEditorDraft.attachments = [...pendingAttachments];
      renderNoteEditor();
    });
  });

  const contentEl = document.getElementById('noteEditorContent');
  contentEl?.addEventListener('click', (e) => {
    const box = e.target.closest('.ncb-box');
    if (!box) return;
    e.preventDefault();
    const line = box.parentElement;
    const checked = line.classList.toggle('checked');
    box.textContent = checked ? '☑' : '☐';
  });
}

/* ============================================================
   🎯 Popover System — using SAME classes as tasks
============================================================ */
function closeNotePopover() {
  const pop = document.getElementById('activeNotePopover');
  if (pop) pop.remove();
}

function positionNotePopover(pop, trigger) {
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

function openNotePopover(kind, triggerBtn) {
  const existing = document.getElementById('activeNotePopover');
  if (existing) {
    const existingKind = existing.dataset.kind;
    existing.remove();
    if (existingKind === kind) return;
  }

  const pop = document.createElement('div');
  pop.id = 'activeNotePopover';
  pop.dataset.kind = kind;

  if (kind === 'date') {
    pop.className = 'tasks-inline-popover date-picker-popover';
    pop.innerHTML = renderNoteDatePickerHTML();
  } else if (kind === 'tag') {
    pop.className = 'tasks-inline-popover';
    pop.innerHTML = renderNoteTagPopoverHTML();
  } else if (kind === 'color') {
    pop.className = 'tasks-inline-popover';
    pop.innerHTML = renderNoteColorPopoverHTML();
  } else if (kind === 'reminder') {
    pop.className = 'tasks-inline-popover';
    pop.innerHTML = renderNoteReminderPopoverHTML();
  } else if (kind === 'font') {
    pop.className = 'tasks-inline-popover';
    pop.innerHTML = renderNoteFontPopoverHTML();
  } else {
    return;
  }

  document.body.appendChild(pop);
  positionNotePopover(pop, triggerBtn);
  bindNotePopoverEvents(pop, kind);
}

/* ---------- Tag Popover (same as tasks) ---------- */
function renderNoteTagPopoverHTML() {
  const d = noteEditorDraft;
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
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </span>
        </div>
      `).join('')}
    </div>
    <div class="ip-tag-add-row">
      <span class="ip-tag-add-icon">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
      <input type="text" class="ip-tag-add-input" id="ipNoteTagInput" placeholder="افزودن برچسب جدید" autocomplete="off">
    </div>`;
}

/* ---------- Color Popover (list like tasks) ---------- */
function renderNoteColorPopoverHTML() {
  const d = noteEditorDraft;
  return `
    <div class="ip-title">رنگ یادداشت</div>
    <div class="ip-list">
      ${NOTE_COLORS.map(c => `
        <button class="ip-item ${d.color === c.id ? 'active' : ''}" data-note-color="${c.id}">
          <span class="ip-dot" style="background:${c.color}"></span>
          <span>${c.label}</span>
        </button>
      `).join('')}
    </div>`;
}

/* ---------- Reminder Popover ---------- */
function renderNoteReminderPopoverHTML() {
  const r = noteEditorDraft.reminder;
  return `
    <div class="ip-title">یادآور</div>
    <div class="ip-list">
      <button class="ip-item" data-remind="30m">
        <span class="ip-dot" style="background:#fbbf24"></span>
        <span>۳۰ دقیقه دیگر</span>
      </button>
      <button class="ip-item" data-remind="1h">
        <span class="ip-dot" style="background:#fbbf24"></span>
        <span>۱ ساعت دیگر</span>
      </button>
      <button class="ip-item" data-remind="3h">
        <span class="ip-dot" style="background:#fbbf24"></span>
        <span>۳ ساعت دیگر</span>
      </button>
      <button class="ip-item" data-remind="tomorrow9">
        <span class="ip-dot" style="background:#60a5fa"></span>
        <span>فردا ساعت ۹ صبح</span>
      </button>
      <button class="ip-item" data-remind="tomorrow18">
        <span class="ip-dot" style="background:#60a5fa"></span>
        <span>فردا ساعت ۱۸</span>
      </button>
      <button class="ip-item" data-remind="week">
        <span class="ip-dot" style="background:#22c55e"></span>
        <span>یک هفته دیگر</span>
      </button>
    </div>
    ${r ? `<div class="ip-divider"></div>
      <div class="ip-list">
        <button class="ip-item" data-remind="clear" style="color:#fca5a5">
          <span class="ip-dot" style="background:#f87171"></span>
          <span>حذف یادآور فعلی</span>
        </button>
      </div>` : ''}`;
}

/* ---------- Font Popover ---------- */
function renderNoteFontPopoverHTML() {
  return `
    <div class="ip-title">سایز فونت</div>
    <div class="ip-list">
      <button class="ip-item" data-fsize="2"><span>کوچک</span></button>
      <button class="ip-item" data-fsize="3"><span>معمولی</span></button>
      <button class="ip-item" data-fsize="4"><span>متوسط</span></button>
      <button class="ip-item" data-fsize="5"><span>بزرگ</span></button>
      <button class="ip-item" data-fsize="6"><span>خیلی بزرگ</span></button>
    </div>
    <div class="ip-divider"></div>
    <div class="ip-title">قالب متن</div>
    <div class="ip-list">
      <button class="ip-item" data-fmt="bold"><span><b>B</b> پررنگ</span></button>
      <button class="ip-item" data-fmt="italic"><span><i>I</i> ایتالیک</span></button>
      <button class="ip-item" data-fmt="underline"><span><u>U</u> زیرخط</span></button>
      <button class="ip-item" data-fmt="strikeThrough"><span><s>S</s> خط‌خورده</span></button>
    </div>
    <div class="ip-divider"></div>
    <div class="ip-title">لیست و چک</div>
    <div class="ip-list">
      <button class="ip-item" data-fmt="insertOrderedList"><span>۱. فهرست شماره‌دار</span></button>
      <button class="ip-item" data-fmt="insertUnorderedList"><span>• فهرست نقطه‌ای</span></button>
      <button class="ip-item" data-fmt="checkbox"><span>☐ چک‌باکس</span></button>
      <button class="ip-item" data-fmt="removeFormat"><span>پاک کردن قالب</span></button>
    </div>`;
}

/* ---------- Date Picker (same as tasks) ---------- */
function renderNoteDatePickerHTML() {
  const today = todayJalali();
  if (noteEditorDraft.dueDate) {
    const dt = new Date(noteEditorDraft.dueDate);
    const j = toJalaali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    dateView = { year: j.jy, month: j.jm };
    selectedDateInPicker = { y: j.jy, m: j.jm, d: j.jd };
  } else {
    dateView = { year: today.y, month: today.m };
    selectedDateInPicker = null;
  }
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
  return `
    <div class="dp-header">
      <button class="dp-nav" id="dpPrevNote"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
      <div class="dp-title">${FA_MONTHS[dateView.month - 1]} ${toFa(dateView.year)}</div>
      <button class="dp-nav" id="dpNextNote"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
    </div>
    <div class="dp-weekdays">${FA_WEEKDAYS.map(w => `<div class="dp-wd">${w}</div>`).join('')}</div>
    <div class="dp-grid">${cells}</div>
    <div class="dp-actions">
      <button class="dp-btn dp-btn-today" id="dpTodayNote">برو به امروز</button>
      ${noteEditorDraft.dueDate ? `<button class="dp-btn dp-btn-clear" id="dpClearNote">حذف تاریخ</button>` : ''}
      <button class="dp-btn dp-btn-confirm" id="dpConfirmNote">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        تایید
      </button>
    </div>`;
}

/* ---------- Bind Popover Events ---------- */
function bindNotePopoverEvents(pop, kind) {
  if (kind === 'tag') {
    pop.querySelectorAll('.ip-tag-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-tag-del]')) return;
        const id = row.dataset.tagId;
        const idx = noteEditorDraft.tags.indexOf(id);
        if (idx >= 0) noteEditorDraft.tags.splice(idx, 1); else noteEditorDraft.tags.push(id);
        row.classList.toggle('active');
      });
    });
    pop.querySelectorAll('[data-tag-del]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.tagDel;
        sharedState.allTags = getTags().filter(t => t.id !== id);
        noteEditorDraft.tags = noteEditorDraft.tags.filter(t => t !== id);
        sharedState.tasks.forEach(t => { if (t.tags) t.tags = t.tags.filter(x => x !== id); });
        sharedState.notes.forEach(t => { if (t.tags) t.tags = t.tags.filter(x => x !== id); });
        saveAllState();
        pop.innerHTML = renderNoteTagPopoverHTML();
        bindNotePopoverEvents(pop, 'tag');
        pop.querySelector('#ipNoteTagInput')?.focus();
      });
    });
    const input = pop.querySelector('#ipNoteTagInput');
    const addNew = () => {
      const name = input?.value.trim();
      if (!name) return;
      const palette = ['#38bdf8','#a78bfa','#f87171','#fbbf24','#22c55e','#f472b6','#60a5fa','#facc15','#fb923c'];
      const id = 'tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
      const color = palette[getTags().length % palette.length];
      getTags().push({ id, name, color });
      noteEditorDraft.tags.push(id);
      saveAllState();
      pop.innerHTML = renderNoteTagPopoverHTML();
      bindNotePopoverEvents(pop, 'tag');
      pop.querySelector('#ipNoteTagInput')?.focus();
    };
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addNew(); }
    });
    input?.focus();
  } else if (kind === 'color') {
    pop.querySelectorAll('[data-note-color]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        noteEditorDraft.color = btn.dataset.noteColor;
        const modal = document.querySelector('.note-editor-modal');
        const c = getNoteColorStyle(noteEditorDraft.color);
        if (modal) {
          modal.style.setProperty('--note-current-bg', c.bg);
          modal.style.setProperty('--note-current-border', c.border);
        }
        pop.querySelectorAll('[data-note-color]').forEach(b => {
          b.classList.toggle('active', b.dataset.noteColor === noteEditorDraft.color);
        });
      });
    });
  } else if (kind === 'reminder') {
    pop.querySelectorAll('[data-remind]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = btn.dataset.remind;
        if (v === 'clear') noteEditorDraft.reminder = null;
        else if (v === '30m') noteEditorDraft.reminder = Date.now() + 30*60*1000;
        else if (v === '1h') noteEditorDraft.reminder = Date.now() + 60*60*1000;
        else if (v === '3h') noteEditorDraft.reminder = Date.now() + 3*60*60*1000;
        else if (v === 'tomorrow9') { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); noteEditorDraft.reminder = d.getTime(); }
        else if (v === 'tomorrow18') { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(18,0,0,0); noteEditorDraft.reminder = d.getTime(); }
        else if (v === 'week') noteEditorDraft.reminder = Date.now() + 7*24*60*60*1000;
        closeNotePopover();
        renderNoteEditor();
      });
    });
  } else if (kind === 'font') {
    pop.querySelectorAll('[data-fsize]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('noteEditorContent')?.focus();
        document.execCommand('fontSize', false, b.dataset.fsize);
        closeNotePopover();
      });
    });
    pop.querySelectorAll('[data-fmt]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const fmt = b.dataset.fmt;
        const contentEl = document.getElementById('noteEditorContent');
        if (fmt === 'checkbox') {
          contentEl?.focus();
          document.execCommand('insertHTML', false, '<div class="ncb"><span class="ncb-box" contenteditable="false">☐</span><span class="ncb-text"> متن جدید</span></div>');
        } else {
          contentEl?.focus();
          document.execCommand(fmt, false, null);
        }
        closeNotePopover();
      });
    });
  } else if (kind === 'date') {
    const redraw = () => {
      pop.innerHTML = renderNoteDatePickerHTML();
      bindNotePopoverEvents(pop, 'date');
    };
    pop.querySelector('#dpPrevNote')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dateView.month--;
      if (dateView.month < 1) { dateView.month = 12; dateView.year--; }
      redraw();
    });
    pop.querySelector('#dpNextNote')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dateView.month++;
      if (dateView.month > 12) { dateView.month = 1; dateView.year++; }
      redraw();
    });
    pop.querySelectorAll('.dp-cell[data-d]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDateInPicker = { y: dateView.year, m: dateView.month, d: +btn.dataset.d };
        redraw();
      });
    });
    pop.querySelector('#dpTodayNote')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = todayJalali();
      dateView = { year: t.y, month: t.m };
      selectedDateInPicker = { y: t.y, m: t.m, d: t.d };
      redraw();
    });
    pop.querySelector('#dpClearNote')?.addEventListener('click', (e) => {
      e.stopPropagation();
      noteEditorDraft.dueDate = null;
      selectedDateInPicker = null;
      closeNotePopover();
      renderNoteEditor();
    });
    pop.querySelector('#dpConfirmNote')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedDateInPicker) {
        const g = toGregorian(selectedDateInPicker.y, selectedDateInPicker.m, selectedDateInPicker.d);
        noteEditorDraft.dueDate = new Date(g.gy, g.gm - 1, g.gd, 12, 0, 0).getTime();
      }
      closeNotePopover();
      renderNoteEditor();
    });
  }
}

/* ============ پیوست ============ */
function openAttachPicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '*/*';
  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (f.size > MAX_ATTACH_SIZE) {
        alert(`فایل «${f.name}» بزرگتر از ۱۰ مگابایت است و ذخیره نشد.`);
        continue;
      }
      try {
        const data = await readFileAsDataURL(f);
        pendingAttachments.push({
          id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
          name: f.name,
          type: f.type || 'application/octet-stream',
          size: f.size,
          data,
        });
      } catch (err) {
        alert(`خطا در خواندن فایل «${f.name}»`);
      }
    }
    noteEditorDraft.attachments = [...pendingAttachments];
    renderNoteEditor();
  };
  input.click();
}
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(file);
  });
}

/* ============ ذخیره ============ */
function saveNoteEditor() {
  const titleEl = document.getElementById('noteEditorTitle');
  const contentEl = document.getElementById('noteEditorContent');
  const title = (titleEl?.value || '').trim();
  const rawHtml = contentEl?.innerHTML || '';
  const cleanHtml = sanitizeHtml(rawHtml);
  const textOnly = (contentEl?.textContent || '').trim();
  if (!title && !textOnly && pendingAttachments.length === 0) { closeNoteEditor(); return; }

  const payload = {
    title: title || 'بدون عنوان',
    content: cleanHtml,
    color: noteEditorDraft.color,
    tags: [...noteEditorDraft.tags],
    reminder: noteEditorDraft.reminder,
    dueDate: noteEditorDraft.dueDate,
    pinned: noteEditorDraft.pinned,
    attachments: [...pendingAttachments],
    updatedAt: Date.now(),
  };

  try {
    if (noteEditorId) {
      const note = notes().find(n => n.id === noteEditorId);
      if (note) Object.assign(note, payload);
    } else {
      sharedState.notes.push({
        id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        createdAt: Date.now(),
        ...payload,
      });
    }
    saveAllState();
    closeNoteEditor();
    renderNotes();
    window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
  } catch (e) {
    alert('خطا در ذخیره‌سازی. احتمالاً حجم پیوست‌ها از حافظه بیشتر است.');
    console.warn('Save error:', e);
  }
}

/* ============ یادآور ============ */
function checkReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  const fired = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
  let changed = false;
  notes().forEach(n => {
    if (!n.reminder) return;
    if (n.reminder > now) return;
    if (fired[n.id] === n.reminder) return;
    fired[n.id] = n.reminder;
    changed = true;
    try {
      new Notification('یادآور یادداشت', {
        body: n.title || 'بدون عنوان',
        icon: 'icon-192.png',
        tag: 'note-' + n.id,
      });
    } catch (_) {}
  });
  if (changed) { try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired)); } catch (_) {} }
}
function startReminderCheck() {
  checkReminders();
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(checkReminders, 30 * 1000);
}

/* ============ Panels ============ */
export function openNotesFilterPanel(rect) {
  document.querySelectorAll('.task-panel-pop').forEach(el => el.remove());
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop filter-panel';
  panel.innerHTML = `
    <div class="tp-section">
      <div class="tp-section-title">تاریخ</div>
      <div class="tp-chip-row">
        <button class="tp-chip ${notesState.filter.due==='past'?'active':''}" data-ndue="past">گذشته</button>
        <button class="tp-chip ${notesState.filter.due==='today'?'active':''}" data-ndue="today">امروز</button>
        <button class="tp-chip ${notesState.filter.due==='week'?'active':''}" data-ndue="week">این هفته</button>
      </div>
    </div>
    <div class="tp-section">
      <div class="tp-section-title">رنگ</div>
      <div class="nep-color-row">
        ${NOTE_COLORS.map(c => `
          <button class="nep-color-chip ${notesState.filter.color===c.id?'active':''}"
                  data-ncolor="${c.id}"
                  style="--swatch-color:${c.color};"
                  title="${c.label}"></button>
        `).join('')}
      </div>
    </div>
    <div class="tp-section">
      <div class="tp-section-title">برچسب‌ها</div>
      <div class="tp-chip-row">
        ${getTags().map(t => `
          <button class="tp-chip ${notesState.filter.tags.includes(t.id)?'active':''}" data-ntag="${t.id}">
            <span class="tp-dot" style="background:${t.color}"></span>${t.name}
          </button>
        `).join('')}
      </div>
    </div>
    <button class="tp-clear-btn" id="tpClearNotesFilter">پاک کردن همه فیلترها</button>`;
  document.body.appendChild(panel);
  panel.style.position = 'fixed';
  panel.style.top = (rect.bottom + 8) + 'px';
  panel.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 300)) + 'px';
  panel.style.zIndex = '99999';

  panel.querySelectorAll('[data-ndue]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.ndue;
      notesState.filter.due = notesState.filter.due === v ? null : v;
      renderNotes(); panel.remove(); openNotesFilterPanel(rect);
    });
  });
  panel.querySelectorAll('[data-ncolor]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.ncolor;
      notesState.filter.color = notesState.filter.color === v ? null : v;
      renderNotes(); panel.remove(); openNotesFilterPanel(rect);
    });
  });
  panel.querySelectorAll('[data-ntag]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.ntag;
      const idx = notesState.filter.tags.indexOf(v);
      if (idx >= 0) notesState.filter.tags.splice(idx, 1); else notesState.filter.tags.push(v);
      renderNotes(); panel.remove(); openNotesFilterPanel(rect);
    });
  });
  document.getElementById('tpClearNotesFilter')?.addEventListener('click', () => {
    notesState.filter = { due: null, color: null, tags: [] };
    renderNotes(); panel.remove();
  });
}

export function openNotesSortPanel(rect) {
  document.querySelectorAll('.task-panel-pop').forEach(el => el.remove());
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop sort-panel';
  const opts = [
    { key: 'updated', label: 'آخرین تغییر' },
    { key: 'created', label: 'تاریخ ساخت' },
    { key: 'title',   label: 'عنوان' },
  ];
  panel.innerHTML = `
    <div class="tp-section-title" style="padding:6px 10px;">مرتب‌سازی بر اساس</div>
    ${opts.map(o => `<button class="tp-more-item" data-nsort="${o.key}"><span>${o.label}</span><span class="tp-radio ${notesState.sortBy === o.key ? 'active' : ''}"></span></button>`).join('')}`;
  document.body.appendChild(panel);
  panel.style.position = 'fixed';
  panel.style.top = (rect.bottom + 8) + 'px';
  panel.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 300)) + 'px';
  panel.style.zIndex = '99999';
  panel.querySelectorAll('[data-nsort]').forEach(b => {
    b.addEventListener('click', () => {
      notesState.sortBy = b.dataset.nsort;
      renderNotes();
      panel.remove();
    });
  });
}

/* ============ INIT ============ */
export function initNotes() {
  loadAllState();

  window.addEventListener('notes-render', () => {
    notesState.activeTab = 'notes';
    renderNotes();
  });
  window.addEventListener('notes-open-editor', () => openNoteEditor());
  window.addEventListener('notes-hide-toggle', (e) => {
    notesState.hidden = !!e.detail;
    renderNotes();
  });
  window.addEventListener('notes-open-filter', (e) => openNotesFilterPanel(e.detail.rect));
  window.addEventListener('notes-open-sort', (e) => openNotesSortPanel(e.detail.rect));
  window.addEventListener('notes-delete-all', () => {
    if (confirm('همه یادداشت‌ها حذف شوند؟')) {
      sharedState.notes = [];
      saveAllState();
      renderNotes();
      window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
    }
  });

  document.addEventListener('click', (e) => {
    const pop = document.getElementById('activeNotePopover');
    if (!pop) return;
    if (pop.contains(e.target)) return;
    if (e.target.closest('[data-note-tool]')) return;
    pop.remove();
  });

  startReminderCheck();
}