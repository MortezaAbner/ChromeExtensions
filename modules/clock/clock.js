export function initClock() {
  const elTime = document.getElementById('clockTime');
  const elDay  = document.getElementById('clockDay');
  const elJ    = document.getElementById('dateJalali');
  const elM    = document.getElementById('dateMiladi');
  const elQ    = document.getElementById('dateQamari');
  const elMJ   = document.getElementById('monthJalali');
  const elMM   = document.getElementById('monthMiladi');
  const elMQ   = document.getElementById('monthQamari');

  function fmt(now, calendar, type) {
    try {
      const parts = new Intl.DateTimeFormat('fa-IR-u-ca-' + calendar, {
        year: 'numeric', month: type === 'month' ? 'long' : '2-digit', day: '2-digit'
      }).formatToParts(now);
      const get = t => (parts.find(p => p.type === t) || {}).value || '';
      if (type === 'month') return get('month');
      const y = get('year').replace(/[^\u06F0-\u06F9\d]/g, '');
      const m = get('month').replace(/[^\u06F0-\u06F9\d]/g, '');
      const d = get('day').replace(/[^\u06F0-\u06F9\d]/g, '');
      return `${y}/${m}/${d}`;
    } catch (e) { return ''; }
  }

  function update() {
    const now = new Date();
    if (elTime) elTime.textContent = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    if (elDay)  elDay.textContent  = now.toLocaleDateString('fa-IR', { weekday: 'long' });

    if (elJ)  elJ.textContent  = fmt(now, 'persian', 'date');
    if (elMJ) elMJ.textContent = fmt(now, 'persian', 'month');

    if (elM)  elM.textContent  = fmt(now, 'gregory', 'date');
    if (elMM) elMM.textContent = fmt(now, 'gregory', 'month');

    if (elQ)  elQ.textContent  = fmt(now, 'islamic', 'date');
    if (elMQ) elMQ.textContent = fmt(now, 'islamic', 'month');
  }

  update();
  setInterval(update, 1000);
}
