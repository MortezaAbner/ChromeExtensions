/* ============ ماژول یادداشت — آبنر v1 ============ */

import {
  sharedState, loadAllState, saveAllState, getTags, findTag,
  showUndoToast, hideUndoToast, UNDO_DELAY_MS,
} from '../shared/state.js';

const NOTE_COLORS = [
  { id: 'default', bg: 'rgba(255,255,255,0.04)',   border: 'rgba(255,255,255,0.12)', label: 'پیش‌فرض' },
  { id: 'red',     bg: 'rgba(239,68,68,0.14)',     border: 'rgba(239,68,68,0.35)',    label: 'قرمز' },
  { id: 'pink',    bg: 'rgba(244,114,182,0.14)',   border: 'rgba(244,114,182,0.35)',  label: 'صورتی' },
  { id: 'purple',  bg: 'rgba(167,139,250,0.14)',   border: 'rgba(167,139,250,0.35)',  label: 'بنفش' },
  { id: 'blue',    bg: 'rgba(59,130,246,0.14)',    border: 'rgba(59,130,246,0.35)',   label: 'آبی' },
  { id: 'teal',    bg: 'rgba(20,184,166,0.14)',    border: 'rgba(20,184,166,0.35)',   label: 'فیروزه' },
  { id: 'green',   bg: 'rgba(34,197,94,0.14)',     border: 'rgba(34,197,94,0.35)',    label: 'سبز' },
  { id: 'yellow',  bg: 'rgba(250,204,21,0.14)',    border: 'rgba(250,204,21,0.35)',   label: 'زرد' },
  { id: 'orange',  bg: 'rgba(249,115,22,0.14)',    border: 'rgba(249,115,22,0.35)',   label: 'نارنجی' },
  { id: 'brown',   bg: 'rgba(180,83,9,0.14)',      border: 'rgba(180,83,9,0.35)',     label: 'قهوه‌ای' },
];

const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

let notesState = {
  activeTab: 'tasks',
  hidden: false,
  sortBy: 'updated',
  filter: { due: null, color: null, tags: [] },
};

let noteEditorDraft = null;
let noteEditorId = null;
let isNoteEditorOpen = false;
let deletedBackup = null;

const notes = () => sharedState.notes;

/* ============ تاریخ شمسی ============ */
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
function _d2j(jdn){
  const gy=_d2g(jdn).gy;let jy=gy-621;const r=_jalCal(jy),jdn1f=_g2d(gy,3,r.march);let jd,jm,k;
  k=jdn-jdn1f;
  if(k>=0){if(k<=185){jm=1+_div(k,31);jd=_mod(k,31)+1;return{jy,jm,jd};}else k-=186;}
  else{jy-=1;k+=179;if(r.leap===1)k+=1;}
  jm=7+_div(k,30);jd=_mod(k,30)+1;
  return{jy,jm,jd};
}
function toJalaali(gy,gm,gd){return _d2j(_g2d(gy,gm,gd));}
const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

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
function findNoteColor(id) { return NOTE_COLORS.find(c => c.id === id) || NOTE_COLORS[0]; }

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
  else if (notesState.sortBy === 'title') {
    sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fa'));
  }
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

function renderNoteItem(n) {
  const color = findNoteColor(n.color || 'default');
  const tags = (n.tags || []).map(tid => findTag(tid)).filter(Boolean);
  const updatedTxt = n.updatedAt && n.updatedAt !== n.createdAt
    ? `ویرایش: ${formatNoteDate(n.updatedAt)}`
    : formatNoteDate(n.createdAt);

  return `
    <div class="task-item note-item ${n.pinned ? 'pinned' : ''}"
         data-note-id="${n.id}"
         style="--note-bg:${color.bg}; --note-border:${color.border};">
      <div class="ti-main">
        <div class="ti-content">
          <div class="ti-title">${escapeHtml(n.title || 'بدون عنوان')}</div>
          ${n.content ? `<div class="ti-desc">${escapeHtml(n.content)}</div>` : ''}
          <div class="ti-badges">
            <span class="ti-badge due">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${updatedTxt}
            </span>
            ${n.reminder ? `<span class="ti-badge recur">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              ${formatDateTimeShort(n.reminder)}
            </span>` : ''}
            ${tags.map(tag => `
              <span class="ti-badge tag" style="--tag-color:${tag.color}">
                <span class="ti-dot" style="background:${tag.color}"></span>${tag.name}
              </span>
            `).join('')}
          </div>
        </div>
        <button class="ti-action" data-act="pin">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${n.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>
        </button>
        <button class="ti-action" data-act="delete">
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
}

/* ============ حذف با Ctrl+Z ============ */
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

/* ============ Note Editor ============ */
function openNoteEditor(initialData = null, editId = null) {
  isNoteEditorOpen = true;
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
      pinned: !!note.pinned,
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
      pinned: false,
      createdAt: Date.now(),
    };
  }
  let overlay = document.getElementById('noteEditorOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'noteEditorOverlay';
    overlay.className = 'note-editor-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) closeNoteEditor(); };
  renderNoteEditor();
  setTimeout(() => document.getElementById('noteEditorTitle')?.focus(), 100);
}

function closeNoteEditor() {
  document.getElementById('noteEditorOverlay')?.classList.add('hidden');
  isNoteEditorOpen = false;
  noteEditorDraft = null;
  noteEditorId = null;
}

function renderNoteEditor() {
  const overlay = document.getElementById('noteEditorOverlay');
  if (!overlay || !noteEditorDraft) return;
  const color = findNoteColor(noteEditorDraft.color);

  overlay.innerHTML = `
    <div class="note-editor-modal" style="--note-current-bg:${color.bg}; --note-current-border:${color.border};">
      <button type="button" class="note-editor-close" id="noteEditorClose" title="بستن">×</button>
      <button type="button" class="note-editor-new" id="noteEditorNew" title="یادداشت جدید">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <div class="note-editor-body">
        <input type="text" id="noteEditorTitle" class="note-editor-title" placeholder="عنوان یادداشت" value="${escapeHtml(noteEditorDraft.title)}" autocomplete="off" maxlength="200">
        <textarea id="noteEditorContent" class="note-editor-content" placeholder="متن یادداشت...">${escapeHtml(noteEditorDraft.content)}</textarea>
      </div>
      <div class="note-editor-toolbar">
        <div class="net-left">
          <button type="button" class="note-editor-save" id="noteEditorSave" title="ذخیره">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button type="button" class="note-editor-icon" id="noteEditorColor" title="رنگ">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="10" r="1.2" fill="currentColor"/><circle cx="15.5" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/></svg>
          </button>
          <button type="button" class="note-editor-icon" id="noteEditorText" title="متن">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          </button>
          <button type="button" class="note-editor-icon" id="noteEditorCheck" title="چک‌لیست">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="3.5 8 5 9.5 8.5 6"/><line x1="13" y1="8" x2="21" y2="8"/><rect x="3" y="13" width="6" height="6" rx="1"/><line x1="13" y1="16" x2="21" y2="16"/></svg>
          </button>
          <button type="button" class="note-editor-icon" id="noteEditorReminder" title="یادآور">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </button>
          <button type="button" class="note-editor-icon" id="noteEditorTag" title="برچسب">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </button>
        </div>
        <div class="net-right">
          ${noteEditorId ? `<button type="button" class="note-editor-delete" id="noteEditorDelete" title="حذف">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
            حذف
          </button>` : ''}
        </div>
      </div>
      <div class="note-editor-popover hidden" id="noteEditorPopover"></div>
    </div>
  `;

  document.getElementById('noteEditorClose')?.addEventListener('click', closeNoteEditor);
  document.getElementById('noteEditorNew')?.addEventListener('click', () => {
    document.getElementById('noteEditorTitle').value = '';
    document.getElementById('noteEditorContent').value = '';
    noteEditorId = null;
    noteEditorDraft.title = '';
    noteEditorDraft.content = '';
    noteEditorDraft.color = 'default';
    noteEditorDraft.tags = [];
    noteEditorDraft.reminder = null;
    noteEditorDraft.pinned = false;
    const modal = document.querySelector('.note-editor-modal');
    if (modal) {
      const c = findNoteColor('default');
      modal.style.setProperty('--note-current-bg', c.bg);
      modal.style.setProperty('--note-current-border', c.border);
    }
  });
  document.getElementById('noteEditorSave')?.addEventListener('click', saveNoteEditor);
  document.getElementById('noteEditorDelete')?.addEventListener('click', () => {
    if (!noteEditorId) return;
    const id = noteEditorId;
    closeNoteEditor();
    deleteNote(id);
  });
  document.getElementById('noteEditorColor')?.addEventListener('click', (e) => { e.stopPropagation(); openNoteEditorPopover('color'); });
  document.getElementById('noteEditorText')?.addEventListener('click', (e) => { e.stopPropagation(); openNoteEditorPopover('text'); });
  document.getElementById('noteEditorCheck')?.addEventListener('click', (e) => { e.stopPropagation(); insertChecklist(); });
  document.getElementById('noteEditorReminder')?.addEventListener('click', (e) => { e.stopPropagation(); openNoteEditorPopover('reminder'); });
  document.getElementById('noteEditorTag')?.addEventListener('click', (e) => { e.stopPropagation(); openNoteEditorPopover('tag'); });
}

function insertChecklist() {
  const ta = document.getElementById('noteEditorContent');
  if (!ta) return;
  const pos = ta.selectionStart || ta.value.length;
  const before = ta.value.substring(0, pos);
  const after = ta.value.substring(pos);
  const insertion = (before && !before.endsWith('\n') ? '\n' : '') + '☐ ';
  ta.value = before + insertion + after;
  ta.focus();
  const newPos = pos + insertion.length;
  ta.setSelectionRange(newPos, newPos);
  noteEditorDraft.content = ta.value;
}

function openNoteEditorPopover(kind) {
  const pop = document.getElementById('noteEditorPopover');
  if (!pop) return;
  const isHidden = pop.classList.contains('hidden');
  if (!isHidden && pop.dataset.kind === kind) { pop.classList.add('hidden'); return; }
  pop.dataset.kind = kind;
  pop.classList.remove('hidden');

  if (kind === 'color') {
    pop.innerHTML = `
      <div class="nep-title">رنگ یادداشت</div>
      <div class="nep-color-grid">
        ${NOTE_COLORS.map(c => `
          <button type="button" class="nep-color-swatch ${noteEditorDraft.color === c.id ? 'active' : ''}" data-color="${c.id}" style="background:${c.bg}; border-color:${c.border};" title="${c.label}">
            ${noteEditorDraft.color === c.id ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </button>
        `).join('')}
      </div>`;
    pop.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        noteEditorDraft.color = btn.dataset.color;
        const modal = document.querySelector('.note-editor-modal');
        const c = findNoteColor(noteEditorDraft.color);
        if (modal) {
          modal.style.setProperty('--note-current-bg', c.bg);
          modal.style.setProperty('--note-current-border', c.border);
        }
        pop.querySelectorAll('[data-color]').forEach(b => {
          b.classList.toggle('active', b.dataset.color === noteEditorDraft.color);
          if (b.dataset.color === noteEditorDraft.color) {
            if (!b.querySelector('svg')) b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>');
          } else {
            b.querySelector('svg')?.remove();
          }
        });
      });
    });
  } else if (kind === 'text') {
    pop.innerHTML = `
      <div class="nep-title">قالب متن</div>
      <div class="nep-list">
        <button type="button" class="nep-item" data-text="bold">متن پررنگ</button>
        <button type="button" class="nep-item" data-text="italic">متن ایتالیک</button>
        <button type="button" class="nep-item" data-text="underline">زیرخط</button>
      </div>`;
    pop.querySelectorAll('[data-text]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyTextStyle(btn.dataset.text);
        pop.classList.add('hidden');
      });
    });
  } else if (kind === 'reminder') {
    const reminder = noteEditorDraft.reminder;
    let html = `<div class="nep-title">یادآور</div><div class="nep-list">`;
    html += `<button type="button" class="nep-item" data-remind="1h">۱ ساعت دیگر</button>`;
    html += `<button type="button" class="nep-item" data-remind="3h">۳ ساعت دیگر</button>`;
    html += `<button type="button" class="nep-item" data-remind="tomorrow9">فردا ساعت ۹</button>`;
    html += `<button type="button" class="nep-item" data-remind="tomorrow18">فردا ساعت ۱۸</button>`;
    html += `<button type="button" class="nep-item" data-remind="week">یک هفته دیگر</button>`;
    if (reminder) html += `<div class="nep-divider"></div><button type="button" class="nep-item danger" data-remind="clear">حذف یادآور</button>`;
    html += `</div>`;
    pop.innerHTML = html;
    pop.querySelectorAll('[data-remind]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = btn.dataset.remind;
        if (v === 'clear') noteEditorDraft.reminder = null;
        else if (v === '1h') noteEditorDraft.reminder = Date.now() + 60*60*1000;
        else if (v === '3h') noteEditorDraft.reminder = Date.now() + 3*60*60*1000;
        else if (v === 'tomorrow9') { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); noteEditorDraft.reminder = d.getTime(); }
        else if (v === 'tomorrow18') { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(18,0,0,0); noteEditorDraft.reminder = d.getTime(); }
        else if (v === 'week') noteEditorDraft.reminder = Date.now() + 7*24*60*60*1000;
        pop.classList.add('hidden');
      });
    });
  } else if (kind === 'tag') {
    pop.innerHTML = `
      <div class="nep-title">برچسب‌ها</div>
      <div class="nep-tag-list">
        ${getTags().map(t => `
          <button type="button" class="nep-tag-item ${noteEditorDraft.tags.includes(t.id) ? 'active' : ''}" data-tag="${t.id}">
            <span class="nep-tag-dot" style="background:${t.color}"></span>
            <span class="nep-tag-name">${escapeHtml(t.name)}</span>
            ${noteEditorDraft.tags.includes(t.id) ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </button>
        `).join('')}
      </div>`;
    pop.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.tag;
        const idx = noteEditorDraft.tags.indexOf(id);
        if (idx >= 0) noteEditorDraft.tags.splice(idx, 1);
        else noteEditorDraft.tags.push(id);
        openNoteEditorPopover('tag');
      });
    });
  }
}

function applyTextStyle(style) {
  const ta = document.getElementById('noteEditorContent');
  if (!ta) return;
  const start = ta.selectionStart || 0;
  const end = ta.selectionEnd || start;
  if (start === end) return;
  const selected = ta.value.substring(start, end);
  let wrapped = selected;
  if (style === 'bold') wrapped = `**${selected}**`;
  else if (style === 'italic') wrapped = `*${selected}*`;
  else if (style === 'underline') wrapped = `__${selected}__`;
  ta.value = ta.value.substring(0, start) + wrapped + ta.value.substring(end);
  ta.setSelectionRange(start + 2, end + 2);
  ta.focus();
  noteEditorDraft.content = ta.value;
}

function saveNoteEditor() {
  const titleEl = document.getElementById('noteEditorTitle');
  const contentEl = document.getElementById('noteEditorContent');
  const title = (titleEl?.value || '').trim();
  const content = (contentEl?.value || '').trim();
  if (!title && !content) { closeNoteEditor(); return; }

  if (noteEditorId) {
    const note = notes().find(n => n.id === noteEditorId);
    if (note) {
      note.title = title || 'بدون عنوان';
      note.content = content;
      note.color = noteEditorDraft.color;
      note.tags = [...noteEditorDraft.tags];
      note.reminder = noteEditorDraft.reminder;
      note.pinned = noteEditorDraft.pinned;
      note.updatedAt = Date.now();
    }
  } else {
    sharedState.notes.push({
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: title || 'بدون عنوان',
      content,
      color: noteEditorDraft.color,
      tags: [...noteEditorDraft.tags],
      reminder: noteEditorDraft.reminder,
      pinned: noteEditorDraft.pinned,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  saveAllState();
  closeNoteEditor();
  renderNotes();
  window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
}

/* ============ Panels مستقل ============ */
export function openNotesFilterPanel(rect) {
  document.querySelectorAll('.task-panel-pop').forEach(el => el.remove());
  const panel = document.createElement('div');
  panel.className = 'task-panel-pop filter-panel';
  panel.innerHTML = `
    <div class="tp-section"><div class="tp-section-title">تاریخ</div><div class="tp-chip-row">
      <button class="tp-chip ${notesState.filter.due==='past'?'active':''}" data-ndue="past">گذشته</button>
      <button class="tp-chip ${notesState.filter.due==='today'?'active':''}" data-ndue="today">امروز</button>
      <button class="tp-chip ${notesState.filter.due==='week'?'active':''}" data-ndue="week">این هفته</button>
    </div></div>
    <div class="tp-section"><div class="tp-section-title">رنگ</div><div class="tp-chip-row">
      ${NOTE_COLORS.map(c => `<button class="tp-chip ${notesState.filter.color===c.id?'active':''}" data-ncolor="${c.id}" style="background:${c.bg}; border-color:${c.border};">${c.label}</button>`).join('')}
    </div></div>
    <div class="tp-section"><div class="tp-section-title">برچسب‌ها</div><div class="tp-chip-row">
      ${getTags().map(t => `<button class="tp-chip ${notesState.filter.tags.includes(t.id)?'active':''}" data-ntag="${t.id}"><span class="tp-dot" style="background:${t.color}"></span>${t.name}</button>`).join('')}
    </div></div>
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

export function setNotesTabActive() {
  notesState.activeTab = 'notes';
}

/* ============ INIT ============ */
export function initNotes() {
  loadAllState();

  window.addEventListener('notes-render', () => {
    notesState.activeTab = 'notes';
    renderNotes();
  });
  window.addEventListener('notes-open-editor', () => {
    openNoteEditor();
  });
  window.addEventListener('notes-hide-toggle', (e) => {
    notesState.hidden = !!e.detail;
    renderNotes();
  });
  window.addEventListener('notes-open-filter', (e) => {
    openNotesFilterPanel(e.detail.rect);
  });
  window.addEventListener('notes-open-sort', (e) => {
    openNotesSortPanel(e.detail.rect);
  });
  window.addEventListener('notes-delete-all', () => {
    if (confirm('همه یادداشت‌ها حذف شوند؟')) {
      sharedState.notes = [];
      saveAllState();
      renderNotes();
      window.dispatchEvent(new CustomEvent('abner-urgent-upload'));
    }
  });
}