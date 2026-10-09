/* ============ تایمر ============ */

const STORAGE_KEY = 'abner_timer_state';

let state = { h: 0, m: 0, s: 0, running: false, paused: false, endTime: 0, remaining: 0 };
let intervalId = null;

function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} }
function restore() { try { const r = localStorage.getItem(STORAGE_KEY); if (r) state = { ...state, ...JSON.parse(r) }; } catch (_) {} }

function toFa(n) { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]).padStart(2, '۰'); }

function renderNumbers() {
  const eh = document.getElementById('timerH');
  const em = document.getElementById('timerM');
  const es = document.getElementById('timerS');
  if (eh) eh.value = toFa(state.h);
  if (em) em.value = toFa(state.m);
  if (es) es.value = toFa(state.s);
}

function renderState() {
  const startBtn = document.getElementById('timerStart');
  const pauseBtn = document.getElementById('timerPause');
  if (!startBtn || !pauseBtn) return;
  if (!state.running && !state.paused) {
    startBtn.textContent = 'شروع';
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
  } else if (state.running) {
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    pauseBtn.textContent = 'مکث';
  } else if (state.paused) {
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    pauseBtn.textContent = 'ادامه';
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001, now + i * 0.4);
      g.gain.exponentialRampToValueAtTime(0.3, now + i * 0.4 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.4 + 0.35);
      o.start(now + i * 0.4); o.stop(now + i * 0.4 + 0.4);
    }
  } catch (_) {}
}

function tick() {
  if (!state.running) return;
  const remaining = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  const eh = document.getElementById('timerH');
  const em = document.getElementById('timerM');
  const es = document.getElementById('timerS');
  if (eh) eh.value = toFa(h);
  if (em) em.value = toFa(m);
  if (es) es.value = toFa(s);

  const danger = remaining <= 10;
  [eh, em, es].forEach(el => el && el.classList.toggle('danger', danger));

  if (remaining <= 0) stopTimer(true);
}

function startTimer() {
  let total = state.h * 3600 + state.m * 60 + state.s;
  if (state.paused && state.remaining > 0) total = state.remaining;
  if (total <= 0) return;
  state.running = true; state.paused = false;
  state.endTime = Date.now() + total * 1000;
  state.remaining = total;
  save(); renderState();
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(tick, 250);
  tick();
}

function pauseTimer() {
  if (!state.running) return;
  state.remaining = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
  state.running = false; state.paused = true;
  if (intervalId) clearInterval(intervalId);
  save(); renderState();
}

function stopTimer(finished = false) {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  state.running = false; state.paused = false; state.remaining = 0;
  ['timerH','timerM','timerS'].forEach(id => document.getElementById(id)?.classList.remove('danger'));
  if (finished) playBeep();
  renderNumbers(); renderState(); save();
}

function adjust(unit, dir) {
  if (state.running) return;
  const max = { h: 23, m: 59, s: 59 }[unit];
  let val = state[unit] + (dir === 'up' ? 1 : -1);
  if (val < 0) val = max;
  if (val > max) val = 0;
  state[unit] = val;
  state.paused = false; state.remaining = 0;
  renderNumbers(); renderState(); save();
}

function parseFa(str) {
  return String(str).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

function setupInput(el, unit) {
  // تایپ
  el.addEventListener('input', () => {
    if (state.running) { renderNumbers(); return; }
    let v = parseInt(parseFa(el.value), 10);
    if (isNaN(v)) v = 0;
    const max = { h: 23, m: 59, s: 59 }[unit];
    if (v < 0) v = 0;
    if (v > max) v = max;
    state[unit] = v;
    state.paused = false; state.remaining = 0;
    save(); renderState();
  });

  el.addEventListener('blur', () => { renderNumbers(); save(); });

  // اسکرول با ماوس
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (state.running) return;
    adjust(unit, e.deltaY < 0 ? 'up' : 'down');
  }, { passive: false });

  // فقط عدد و حروف فارسی
  el.addEventListener('keydown', (e) => {
    if (['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) return;
    if (!/^[0-9۰-۹]$/.test(e.key)) e.preventDefault();
  });

  // انتخاب کامل هنگام فوکوس
  el.addEventListener('focus', () => el.select());
}

export function initTimer() {
  restore();
  renderNumbers();
  renderState();

  if (state.running && state.endTime > Date.now()) {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 250);
    tick();
  } else if (state.running) {
    stopTimer(true);
  }

  document.getElementById('btnTimer')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById('timerPanel');
    if (!panel) return;
    const willOpen = panel.classList.contains('hidden');
    ['weatherForecastPanel', 'prayerPanel', 'timerPanel'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    if (willOpen) {
      panel.classList.remove('hidden');
      renderNumbers(); renderState();
    }
  });

  document.querySelectorAll('.timer-arrow').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); adjust(btn.dataset.unit, btn.dataset.dir); });
  });

  const ih = document.getElementById('timerH');
  const im = document.getElementById('timerM');
  const is = document.getElementById('timerS');
  if (ih) setupInput(ih, 'h');
  if (im) setupInput(im, 'm');
  if (is) setupInput(is, 's');

  document.getElementById('timerStart')?.addEventListener('click', (e) => { e.stopPropagation(); startTimer(); });
  document.getElementById('timerPause')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.running) pauseTimer();
    else if (state.paused) startTimer();
  });
}
