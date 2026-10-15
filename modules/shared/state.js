/* ============ State مشترک بین تسک و یادداشت ============ */

export const STORAGE_KEY = 'abner_tasks_v2';
export const SYNC_QUEUE_KEY = 'abner_sync_queue';
export const PENDING_DELETES_KEY = 'abner_pending_deletes';
export const GOOGLE_TASKS_LIST_ID = '@default';
export const UNDO_DELAY_MS = 8000;

export const DEFAULT_TAGS = [
  { id: 'personal', name: 'شخصی',  color: '#38bdf8' },
  { id: 'work',     name: 'کار',   color: '#a78bfa' },
  { id: 'secret',   name: 'سکرت',  color: '#f87171' },
  { id: 'shopping', name: 'خرید',  color: '#fbbf24' },
];

export const sharedState = {
  tasks: [],
  notes: [],
  allTags: [],
};

export function loadAllState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      sharedState.allTags = DEFAULT_TAGS.slice();
      return;
    }
    const data = JSON.parse(raw);
    sharedState.tasks = data.tasks || [];
    sharedState.notes = data.notes || [];
    sharedState.allTags = (data.allTags && data.allTags.length) ? data.allTags : DEFAULT_TAGS.slice();
  } catch (_) {
    sharedState.allTags = DEFAULT_TAGS.slice();
  }
}

export function saveAllState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks: sharedState.tasks,
      notes: sharedState.notes,
      allTags: sharedState.allTags,
    }));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('tasks-updated'));
}

export function getTags() {
  if (!sharedState.allTags || !sharedState.allTags.length) {
    sharedState.allTags = DEFAULT_TAGS.slice();
  }
  return sharedState.allTags;
}

export function findTag(id) {
  return getTags().find(t => t.id === id);
}

/* ============ Undo Toast ============ */
let undoToastTimer = null;

export function showUndoToast(message, onUndo, delayMs = UNDO_DELAY_MS) {
  hideUndoToast();
  const toast = document.createElement('div');
  toast.id = 'abnerUndoToast';
  toast.className = 'abner-undo-toast';
  toast.innerHTML = `
    <span class="undo-toast-message">${message}</span>
    <button type="button" class="undo-toast-action" id="undoToastBtn">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      <span>بگرداندن</span>
      <span class="undo-toast-key">CTRL + Z</span>
    </button>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const doUndo = () => {
    onUndo();
    hideUndoToast();
    document.removeEventListener('keydown', ctrlZHandler);
  };
  const ctrlZHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'ض' || e.key === 'ظ')) {
      e.preventDefault();
      doUndo();
    }
  };
  document.addEventListener('keydown', ctrlZHandler);
  toast._ctrlZHandler = ctrlZHandler;
  document.getElementById('undoToastBtn').onclick = doUndo;

  undoToastTimer = setTimeout(() => {
    hideUndoToast();
    document.removeEventListener('keydown', ctrlZHandler);
  }, delayMs);
}

export function hideUndoToast() {
  const existing = document.getElementById('abnerUndoToast');
  if (existing) {
    if (existing._ctrlZHandler) document.removeEventListener('keydown', existing._ctrlZHandler);
    existing.classList.remove('show');
    setTimeout(() => existing.remove(), 250);
  }
  if (undoToastTimer) { clearTimeout(undoToastTimer); undoToastTimer = null; }
}

/* ============ Sync Queue ============ */
let syncQueue = [];

export function loadQueue() {
  try { syncQueue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); } catch (_) { syncQueue = []; }
}
export function saveQueue() {
  try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue)); } catch (_) {}
}
export function getQueue() { return syncQueue; }
export function setQueue(list) { syncQueue = list; }
export function removeFromQueue(predicate) {
  syncQueue = syncQueue.filter(q => !predicate(q));
  saveQueue();
  dispatchSyncStatus();
}
export function dispatchSyncStatus() {
  window.dispatchEvent(new CustomEvent('abner-sync-status', {
    detail: { pending: syncQueue.length, online: navigator.onLine }
  }));
}

/* ============ Pending Deletes ============ */
export function loadPendingDeletes() {
  try { return JSON.parse(localStorage.getItem(PENDING_DELETES_KEY) || '[]'); } catch (_) { return []; }
}
export function savePendingDeletes(list) {
  try { localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(list)); } catch (_) {}
}
export function addPendingDelete(task) {
  if (!task || (!task.calendarEventId && !task.tasksApiId)) return;
  const list = loadPendingDeletes();
  if (list.find(t => t.id === task.id)) return;
  list.push({
    id: task.id, title: task.title || '',
    calendarEventId: task.calendarEventId || null,
    tasksApiId: task.tasksApiId || null,
    ts: Date.now(),
    processAfter: Date.now() + UNDO_DELAY_MS,
  });
  savePendingDeletes(list);
}
export function removePendingDelete(id) {
  savePendingDeletes(loadPendingDeletes().filter(t => t.id !== id));
}