/* ============ ماژول تقویم شمسی - آبنر ============ */

const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const HIJRI_MONTHS = ['محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی','رجب','شعبان','رمضان','شوال','ذی‌القعده','ذی‌الحجه'];
const MILADI_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const GREGORIAN_FA = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];

/* ---------- الگوریتم جلالی ---------- */
function div(a,b){return ~~(a/b);}
function mod(a,b){return a-~~(a/b)*b;}
function jalCal(jy){
  const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  const bl=breaks.length;let gy=jy+621,leapJ=-14,jp=breaks[0],jm,jump=0,leap,leapG,march,n,i;
  for(i=1;i<bl;i+=1){jm=breaks[i];jump=jm-jp;if(jy<jm)break;leapJ=leapJ+div(jump,33)*8+div(mod(jump,33),4);jp=jm;}
  n=jy-jp;leapJ=leapJ+div(n,33)*8+div(mod(n,33)+3,4);
  if(mod(jump,33)===4&&jump-n===4)leapJ+=1;
  leapG=div(gy,4)-div((div(gy,100)+1)*3,4)-150;
  march=20+leapJ-leapG;
  if(jump-n<6)n=n-jump+div(jump+4,33)*33;
  leap=mod(mod(n+1,33)-1,4);if(leap===-1)leap=4;
  return{leap,gy,march};
}
function g2d(gy,gm,gd){
  let d=div((gy+div(gm-8,6)+100100)*1461,4)+div(153*mod(gm+9,12)+2,5)+gd-34840408;
  d=d-div(div(gy+100100+div(gm-8,6),100)*3,4)+752;return d;
}
function d2g(jdn){
  let j,i,gd,gm,gy;
  j=4*jdn+139361631;j=j+div(div(4*jdn+183187720,146097)*3,4)*4-3908;
  i=div(mod(j,1461),4)*5+308;gd=div(mod(i,153),5)+1;gm=mod(div(i,153),12)+1;
  gy=div(j,1461)-100100+div(8-gm,6);return{gy,gm,gd};
}
function j2d(jy,jm,jd){const r=jalCal(jy);return g2d(r.gy,3,r.march)+(jm-1)*31-div(jm,7)*(jm-7)+jd-1;}
function d2j(jdn){
  const gy=d2g(jdn).gy;let jy=gy-621;const r=jalCal(jy),jdn1f=g2d(gy,3,r.march);let jd,jm,k;
  k=jdn-jdn1f;
  if(k>=0){if(k<=185){jm=1+div(k,31);jd=mod(k,31)+1;return{jy,jm,jd};}else k-=186;}
  else{jy-=1;k+=179;if(r.leap===1)k+=1;}
  jm=7+div(k,30);jd=mod(k,30)+1;
  return{jy,jm,jd};
}
function toJalaali(gy,gm,gd){return d2j(g2d(gy,gm,gd));}
function toGregorian(jy,jm,jd){return d2g(j2d(jy,jm,jd));}

/* ---------- هجری قمری ---------- */
function toHijri(date){
  try{
    const parts=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{
      year:'numeric',month:'numeric',day:'numeric'
    }).formatToParts(date);
    const g=t=>(parts.find(p=>p.type===t)||{}).value||'';
    return{
      y:parseInt(g('year').replace(/[^\d]/g,'')),
      m:parseInt(g('month').replace(/[^\d]/g,'')),
      d:parseInt(g('day').replace(/[^\d]/g,''))
    };
  }catch(_){return null;}
}

const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

/* ---------- JDN هجری قمری ---------- */
const HIJRI_EPOCH = 1948439.5;
function hijriToJDN(hy, hm, hd) {
  return hd + Math.ceil(29.5 * (hm - 1)) + (hy - 1) * 354 + Math.floor((3 + 11 * hy) / 30) + HIJRI_EPOCH;
}
function jdnToHijri(jdn) {
  let y = Math.floor((30 * (jdn - HIJRI_EPOCH) + 10646) / 10631);
  let m = Math.min(12, Math.ceil((jdn - (29 + hijriToJDN(y, 1, 1))) / 29.5) + 1);
  if (m < 1) m = 1;
  let d = Math.floor(jdn - hijriToJDN(y, m, 1) + 1);
  if (d < 1) d = 1;
  return { y, m, d };
}

/* ---------- دیتابیس مناسبت‌ها ---------- */

const SHAMSI_EVENTS = {
  '1-1':[{t:'عید نوروز',e:'🌸',h:1,imp:1},{t:'آغاز سال نو',e:'🎉',imp:1}],
  '1-2':[{t:'عید نوروز',e:'🌸',h:1,imp:1}],
  '1-3':[{t:'عید نوروز',e:'🌸',h:1,imp:1}],
  '1-4':[{t:'عید نوروز',e:'🌸',h:1,imp:1}],
  '1-6':[{t:'روز امید',e:'🌱'}],
  '1-12':[{t:'روز جمهوری اسلامی ایران',e:'🇮🇷',h:1,imp:1}],
  '1-13':[{t:'روز طبیعت (سیزده‌بدر)',e:'🌿',h:1,imp:1}],
  '1-25':[{t:'روز بزرگداشت عطار نیشابوری',e:'📜'}],
  '2-1':[{t:'روز بزرگداشت سعدی',e:'📜'}],
  '2-10':[{t:'روز ملی خلیج فارس',e:'🌊',imp:1}],
  '2-25':[{t:'روز بزرگداشت فردوسی',e:'📜',imp:1}],
  '3-1':[{t:'روز بهره‌وری',e:'⚡'}],
  '3-14':[{t:'رحلت حضرت امام خمینی (ره)',e:'🕌',h:1,imp:1}],
  '3-15':[{t:'قیام خونین ۱۵ خرداد',e:'🕌',h:1,imp:1}],
  '4-7':[{t:'روز جهانی محیط زیست',e:'🌍'}],
  '5-5':[{t:'روز بزرگداشت خیام',e:'📜'}],
  '5-14':[{t:'روز جهانی جمعیت',e:'👥'}],
  '5-25':[{t:'روز دختر',e:'👧',imp:1}],
  '5-28':[{t:'روز جهانی شیر مادر',e:'🍼'}],
  '6-5':[{t:'روز بزرگداشت شهریار',e:'📜'}],
  '6-13':[{t:'روز بزرگداشت ابوریحان بیرونی',e:'📜'}],
  '7-1':[{t:'روز آتش‌نشان',e:'🚒'}],
  '7-14':[{t:'روز ملی محیط‌بان',e:'🌳'}],
  '7-20':[{t:'روز بزرگداشت حافظ',e:'📜',imp:1}],
  '7-30':[{t:'روز جهانی ناشنوایان',e:'👂'}],
  '8-1':[{t:'روز بزرگداشت ابوعلی سینا و روز پزشک',e:'⚕️',imp:1}],
  '8-8':[{t:'روز بزرگداشت خواجه نصیرالدین طوسی',e:'📜'}],
  '8-14':[{t:'روز جهانی دیابت',e:'💉'}],
  '9-16':[{t:'روز دانشجو',e:'🎓',imp:1}],
  '10-5':[{t:'روز خانواده',e:'👨‍👩‍👧'}],
  '12-29':[{t:'روز ملی شدن صنعت نفت',e:'🛢️',h:1,imp:1}]
};

const HIJRI_EVENTS = {
  '1-9':[{t:'تاسوعای حسینی',e:'🌙',h:1,imp:1}],
  '1-10':[{t:'عاشورای حسینی',e:'🌙',h:1,imp:1}],
  '1-11':[{t:'شام غریبان',e:'🕌'}],
  '2-20':[{t:'اربعین حسینی',e:'🌙',h:1,imp:1}],
  '2-28':[{t:'رحلت پیامبر اکرم و شهادت امام حسن مجتبی',e:'🕌',h:1,imp:1}],
  '2-30':[{t:'شهادت امام رضا (ع)',e:'🕌',h:1,imp:1}],
  '3-8':[{t:'شهادت امام حسن عسکری (ع)',e:'🕌',h:1,imp:1}],
  '3-17':[{t:'میلاد پیامبر اکرم و امام جعفر صادق',e:'🌙',h:1,imp:1}],
  '6-3':[{t:'شهادت حضرت فاطمه زهرا (س)',e:'🕌',h:1,imp:1}],
  '7-13':[{t:'ولادت امام علی (ع)',e:'🌙',h:1,imp:1}],
  '7-27':[{t:'مبعث پیامبر اکرم',e:'🌙',h:1,imp:1}],
  '8-15':[{t:'ولادت حضرت مهدی (عج)',e:'🌙',h:1,imp:1}],
  '9-21':[{t:'شهادت حضرت علی (ع)',e:'🕌',h:1,imp:1}],
  '10-1':[{t:'عید سعید فطر',e:'🌙',h:1,imp:1}],
  '10-2':[{t:'تعطیلات عید فطر',e:'🌙',h:1,imp:1}],
  '10-25':[{t:'شهادت امام جعفر صادق (ع)',e:'🕌',h:1,imp:1}],
  '12-10':[{t:'عید سعید قربان',e:'🌙',h:1,imp:1}],
  '12-18':[{t:'عید سعید غدیر خم',e:'🌙',h:1,imp:1}]
};

const MILADI_EVENTS = {
  '1-1':[{t:'سال نو میلادی',e:'🎉',imp:1},{t:'روز جهانی صلح',e:'🕊️'}],
  '1-6':[{t:'شب عید پادشاهان (اسپانیا)',e:'👑'}],
  '1-15':[{t:'روز مارتین لوتر کینگ',e:'✊'}],
  '2-2':[{t:'روز جهانی تالاب‌ها',e:'🦆'}],
  '2-3':[{t:'ستسوبون (ژاپن)',e:'👹'}],
  '2-4':[{t:'روز جهانی سرطان',e:'🎗️'}],
  '2-11':[{t:'روز جهانی زنان در علم',e:'🔬'}],
  '2-14':[{t:'ولنتاین',e:'💕',imp:1}],
  '2-21':[{t:'روز جهانی زبان مادری',e:'🗣️'}],
  '3-3':[{t:'هیناماتسوری (روز دختر ژاپن)',e:'🎎',imp:1}],
  '3-8':[{t:'روز جهانی زن',e:'♀️',imp:1}],
  '3-14':[{t:'روز عدد پی',e:'🥧'}],
  '3-15':[{t:'روز جهانی حقوق مصرف‌کننده',e:'🛡️'}],
  '3-20':[{t:'روز جهانی خوشحالی',e:'😊'}],
  '3-21':[{t:'نوروز جهانی',e:'🌷',imp:1}],
  '3-22':[{t:'روز جهانی آب',e:'💧'}],
  '4-1':[{t:'دروغ اول آوریل',e:'🤡'}],
  '4-2':[{t:'روز جهانی کتاب کودک',e:'📚'}],
  '4-7':[{t:'روز جهانی سلامت',e:'⚕️'}],
  '4-22':[{t:'روز زمین',e:'🌍',imp:1}],
  '5-1':[{t:'روز جهانی کارگر',e:'👷',imp:1}],
  '5-3':[{t:'روز جهانی آزادی مطبوعات',e:'📰'}],
  '5-5':[{t:'روز کودکان (ژاپن)',e:'🎏',imp:1}],
  '5-8':[{t:'روز جهانی صلیب سرخ',e:'✚'}],
  '5-12':[{t:'روز جهانی پرستار',e:'💉'}],
  '5-17':[{t:'روز جهانی ارتباطات',e:'📡'}],
  '5-21':[{t:'روز جهانی تنوع فرهنگی',e:'🌏'}],
  '5-31':[{t:'روز جهانی بدون دخانیات',e:'🚭'}],
  '6-1':[{t:'روز جهانی کودک',e:'🧒',imp:1}],
  '6-5':[{t:'روز جهانی محیط زیست',e:'🌍',imp:1}],
  '6-8':[{t:'روز جهانی اقیانوس‌ها',e:'🌊'}],
  '6-12':[{t:'روز جهانی مبارزه با کار کودک',e:'🚫'}],
  '6-20':[{t:'روز جهانی پناهندگان',e:'🕊️'}],
  '6-21':[{t:'روز جهانی یوگا',e:'🧘'}],
  '7-7':[{t:'تاناباتا (جشن ستارگان ژاپن)',e:'⭐',imp:1}],
  '7-11':[{t:'روز جهانی جمعیت',e:'👥'}],
  '7-30':[{t:'روز جهانی دوستی',e:'🤝'}],
  '8-6':[{t:'هیروشیما',e:'🕊️'}],
  '8-9':[{t:'ناگازاکی',e:'🕊️'}],
  '8-12':[{t:'روز جهانی جوانان',e:'🌱'}],
  '8-15':[{t:'جشن اوبون (ژاپن)',e:'🏮',imp:1},{t:'روز آزادی کره',e:'🇰🇷'}],
  '8-19':[{t:'روز جهانی عکاسی',e:'📷'}],
  '9-5':[{t:'روز جهانی خیریه',e:'🤲'}],
  '9-8':[{t:'روز جهانی سوادآموزی',e:'📖'}],
  '9-21':[{t:'روز جهانی صلح',e:'🕊️',imp:1}],
  '9-27':[{t:'روز جهانی گردشگری',e:'✈️'}],
  '10-1':[{t:'روز جهانی سالمندان',e:'👴',imp:1}],
  '10-3':[{t:'روز ملی کره',e:'🇰🇷'}],
  '10-5':[{t:'روز جهانی معلم',e:'👨‍🏫',imp:1}],
  '10-9':[{t:'روز هانگول (کره)',e:'📝'}],
  '10-10':[{t:'روز جهانی سلامت روان',e:'🧠'}],
  '10-11':[{t:'روز جهانی دختر',e:'👧',imp:1}],
  '10-16':[{t:'روز جهانی غذا',e:'🍽️'}],
  '10-24':[{t:'روز سازمان ملل متحد',e:'🇺🇳'}],
  '10-31':[{t:'هالووین',e:'🎃',imp:1}],
  '11-14':[{t:'روز جهانی دیابت',e:'💉'}],
  '11-20':[{t:'روز جهانی کودک (سازمان ملل)',e:'🧒'}],
  '11-25':[{t:'روز جهانی مبارزه با خشونت علیه زنان',e:'♀️'}],
  '12-1':[{t:'روز جهانی ایدز',e:'🎗️'}],
  '12-3':[{t:'روز جهانی معلولان',e:'♿'}],
  '12-10':[{t:'روز جهانی حقوق بشر',e:'⚖️',imp:1}],
  '12-21':[{t:'شب یلدا (انقلاب زمستانی)',e:'🔥',imp:1}],
  '12-24':[{t:'شب کریسمس',e:'🎄'}],
  '12-25':[{t:'کریسمس',e:'🎄',imp:1}],
  '12-31':[{t:'شب سال نو',e:'🎆',imp:1}]
};

let viewJy, viewJm;
let todayJy, todayJm, todayJd;

function getDayEvents(jy, jm, jd, gy, gm, gd){
  const key1 = `${jm}-${jd}`;
  const key2 = `${gm}-${gd}`;
  let hijri = null, hijriKey = null;
  try {
    const date = new Date(gy, gm - 1, gd);
    hijri = toHijri(date);
    if (hijri) hijriKey = `${hijri.m}-${hijri.d}`;
  } catch (_) {}
  const events = [];
  (SHAMSI_EVENTS[key1] || []).forEach(ev => events.push({...ev, src:'shamsi'}));
  if (hijriKey) (HIJRI_EVENTS[hijriKey] || []).forEach(ev => events.push({...ev, src:'hijri'}));
  (MILADI_EVENTS[key2] || []).forEach(ev => events.push({...ev, src:'miladi'}));
  return { events, hijri };
}

function getDaysInJalaliMonth(jy, jm){
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const d29 = j2d(jy, 12, 29);
  const dNext = j2d(jy + 1, 1, 1);
  return (dNext - d29 === 1) ? 29 : 30;
}

function positionPicker(){
  const cal = document.getElementById('abCalendar');
  const picker = document.getElementById('calPicker');
  if (!cal || !picker) return;
  const r = cal.getBoundingClientRect();
  picker.style.top = (r.top + 42) + 'px';
  picker.style.left = (r.left + 10) + 'px';
  picker.style.width = (r.width - 20) + 'px';
}

function positionEventsPopup(){
  const cal = document.getElementById('abCalendar');
  const popup = document.getElementById('calEventsPopup');
  if (!cal || !popup) return;
  const r = cal.getBoundingClientRect();
  popup.style.top = (r.top + 46) + 'px';
  popup.style.left = (r.left + 10) + 'px';
  popup.style.width = (r.width - 20) + 'px';
}

function positionConvResult(){
  const cal = document.getElementById('abCalendar');
  const popup = document.getElementById('convResult');
  if (!cal || !popup) return;
  const r = cal.getBoundingClientRect();
  popup.style.top = (r.top + 40) + 'px';
  popup.style.left = (r.left + 10) + 'px';
  popup.style.width = (r.width - 20) + 'px';
}

function render(){
  const titleEl = document.getElementById('calTitleText');
  if (titleEl) titleEl.textContent = `${JALALI_MONTHS[viewJm - 1]} ${toFa(viewJy)}`;

  const daysInMonth = getDaysInJalaliMonth(viewJy, viewJm);
  const firstGreg = toGregorian(viewJy, viewJm, 1);
  const lastGreg = toGregorian(viewJy, viewJm, daysInMonth);

  const miladiLine = document.getElementById('calSubMiladi');
  if (miladiLine){
    const m1 = MILADI_MONTHS[firstGreg.gm - 1];
    const m2 = MILADI_MONTHS[lastGreg.gm - 1];
    if (firstGreg.gm === lastGreg.gm && firstGreg.gy === lastGreg.gy){
      miladiLine.textContent = `${m1} ${firstGreg.gy}`;
    } else if (firstGreg.gy === lastGreg.gy){
      miladiLine.textContent = `${m1} — ${m2} ${firstGreg.gy}`;
    } else {
      miladiLine.textContent = `${m1} ${firstGreg.gy} — ${m2} ${lastGreg.gy}`;
    }
  }

  const shamsiLine = document.getElementById('calSubShamsi');
  if (shamsiLine){
    try {
      const h1 = toHijri(new Date(firstGreg.gy, firstGreg.gm - 1, firstGreg.gd));
      const h2 = toHijri(new Date(lastGreg.gy, lastGreg.gm - 1, lastGreg.gd));
      if (h1 && h2){
        const t1 = HIJRI_MONTHS[h1.m - 1];
        const t2 = HIJRI_MONTHS[h2.m - 1];
        if (h1.m === h2.m && h1.y === h2.y){
          shamsiLine.textContent = `${t1} ${toFa(h1.y)}`;
        } else {
          shamsiLine.textContent = `${t1} — ${t2} ${toFa(h2.y)}`;
        }
      }
    } catch (_) {}
  }

  const grid = document.getElementById('calGridDays');
  if (!grid) return;

  const firstDate = new Date(firstGreg.gy, firstGreg.gm - 1, firstGreg.gd);
  const jsDay = firstDate.getDay();
  const persianWeekday = (jsDay + 1) % 7;

  let html = '';
  for (let i = 0; i < persianWeekday; i++) {
    html += `<div class="cal-day cal-day-empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const g = toGregorian(viewJy, viewJm, d);
    const { events } = getDayEvents(viewJy, viewJm, d, g.gy, g.gm, g.gd);

    const isToday = (viewJy === todayJy && viewJm === todayJm && d === todayJd);
    const isHoliday = events.some(ev => ev.h);
    const isImportant = events.some(ev => ev.imp || ev.h);

    const cls = 'cal-day' +
      (isToday ? ' is-today' : '') +
      (isHoliday ? ' is-holiday' : '');

    html += `<div class="${cls}" data-jy="${viewJy}" data-jm="${viewJm}" data-jd="${d}" data-gy="${g.gy}" data-gm="${g.gm}" data-gd="${g.gd}">` +
              `<span class="cal-day-num">${toFa(d)}</span>` +
              (isImportant ? `<span class="cal-day-dot"></span>` : '') +
            `</div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.cal-day:not(.cal-day-empty)').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      showDayEvents(el.dataset);
    });
  });
}

function showDayEvents(ds){
  const jy = +ds.jy, jm = +ds.jm, jd = +ds.jd;
  const gy = +ds.gy, gm = +ds.gm, gd = +ds.gd;
  const { events, hijri } = getDayEvents(jy, jm, jd, gy, gm, gd);

  const popup = document.getElementById('calEventsPopup');
  const dateEl = document.getElementById('calEventsDate');
  const listEl = document.getElementById('calEventsList');
  if (!popup || !dateEl || !listEl) return;

  const miladiStr = `${gd} ${MILADI_MONTHS[gm - 1]} ${gy}`;
  const shamsiStr = `${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
  const hijriStr = hijri ? `${toFa(hijri.d)} ${HIJRI_MONTHS[hijri.m - 1]} ${toFa(hijri.y)}` : '';

  dateEl.innerHTML =
    `<div class="ced-row"><span class="ced-lbl">شمسی</span><span class="ced-val">${shamsiStr}</span></div>` +
    `<div class="ced-row"><span class="ced-lbl">میلادی</span><span class="ced-val">${miladiStr}</span></div>` +
    (hijriStr ? `<div class="ced-row"><span class="ced-lbl">قمری</span><span class="ced-val">${hijriStr}</span></div>` : '');

  if (events.length === 0) {
    listEl.innerHTML = `<div class="cal-events-empty">مناسبتی برای این روز ثبت نشده است</div>`;
  } else {
    listEl.innerHTML = events.map(ev =>
      `<div class="cal-events-item ${ev.h ? 'is-holiday' : ''}">` +
        `<span class="cei-icon">${ev.e || '•'}</span>` +
        `<span class="cei-text">${ev.t}</span>` +
      `</div>`
    ).join('');
  }

  popup.classList.remove('hidden');
  positionEventsPopup();
}

function openPicker(){
  const picker = document.getElementById('calPicker');
  if (!picker) return;
  picker.classList.remove('hidden');
  renderPicker();
  positionPicker();
}

function closePicker(){
  document.getElementById('calPicker')?.classList.add('hidden');
}

function renderPicker(){
  const yearCol = document.getElementById('calYearCol');
  const monthCol = document.getElementById('calMonthCol');
  if (!yearCol || !monthCol) return;

  const baseYear = todayJy || viewJy;
  const years = [];
  for (let y = baseYear - 100; y <= baseYear + 100; y++) years.push(y);

  yearCol.innerHTML = years.map(y =>
    `<div class="cal-picker-item ${y === viewJy ? 'active' : ''}" data-year="${y}">${toFa(y)}</div>`
  ).join('');

  monthCol.innerHTML = JALALI_MONTHS.map((m, i) =>
    `<div class="cal-picker-item ${i + 1 === viewJm ? 'active' : ''}" data-month="${i + 1}">${m}</div>`
  ).join('');

  setTimeout(() => {
    yearCol.querySelector('.active')?.scrollIntoView({ block: 'center' });
    monthCol.querySelector('.active')?.scrollIntoView({ block: 'center' });
  }, 30);

  yearCol.querySelectorAll('.cal-picker-item').forEach(el => {
    el.addEventListener('click', () => {
      yearCol.querySelectorAll('.cal-picker-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      updatePickerConfirm();
    });
  });
  monthCol.querySelectorAll('.cal-picker-item').forEach(el => {
    el.addEventListener('click', () => {
      monthCol.querySelectorAll('.cal-picker-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      updatePickerConfirm();
    });
  });

  updatePickerConfirm();
}

function updatePickerConfirm(){
  const y = document.querySelector('#calYearCol .cal-picker-item.active');
  const m = document.querySelector('#calMonthCol .cal-picker-item.active');
  const btn = document.getElementById('calPickerConfirm');
  if (!y || !m || !btn) return;
  btn.textContent = `نمایش ${JALALI_MONTHS[(+m.dataset.month) - 1]} ${toFa(+y.dataset.year)}`;
}

function goPrevMonth(){
  viewJm--;
  if (viewJm < 1) { viewJm = 12; viewJy--; }
  render();
}
function goNextMonth(){
  viewJm++;
  if (viewJm > 12) { viewJm = 1; viewJy++; }
  render();
}
function goToday(){
  viewJy = todayJy;
  viewJm = todayJm;
  render();
}

export function initCalendar(){
  const now = new Date();
  const t = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  todayJy = t.jy;
  todayJm = t.jm;
  todayJd = t.jd;
  viewJy = todayJy;
  viewJm = todayJm;

  render();

  document.getElementById('calPrev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    goPrevMonth();
    closePicker();
  });

  document.getElementById('calNext')?.addEventListener('click', (e) => {
    e.stopPropagation();
    goNextMonth();
    closePicker();
  });

  document.getElementById('calTitle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const picker = document.getElementById('calPicker');
    if (picker && picker.classList.contains('hidden')) openPicker();
    else closePicker();
  });

  document.getElementById('calPickerConfirm')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const y = document.querySelector('#calYearCol .cal-picker-item.active');
    const m = document.querySelector('#calMonthCol .cal-picker-item.active');
    if (y && m) {
      viewJy = +y.dataset.year;
      viewJm = +m.dataset.month;
      render();
    }
    closePicker();
  });

  document.getElementById('calPickerToday')?.addEventListener('click', (e) => {
    e.stopPropagation();
    goToday();
    closePicker();
  });

  document.getElementById('calEventsClose')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('calEventsPopup')?.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    const cal = document.getElementById('abCalendar');
    const picker = document.getElementById('calPicker');
    const popup = document.getElementById('calEventsPopup');
    const inside = (el) => el && el.contains(e.target);
    if (inside(cal) || inside(picker) || inside(popup)) return;
    closePicker();
    popup?.classList.add('hidden');
  });

  window.addEventListener('resize', () => {
    const picker = document.getElementById('calPicker');
    if (picker && !picker.classList.contains('hidden')) positionPicker();
    const popup = document.getElementById('calEventsPopup');
    if (popup && !popup.classList.contains('hidden')) positionEventsPopup();
  });
}

/* ============================================================
   مبدل تاریخ
============================================================ */

let convSource = 'jalali';
let convValues = { jalali: null, hijri: null, gregorian: null };

function renderConvPicker() {
  const yearCol = document.getElementById('convYearCol');
  const monthCol = document.getElementById('convMonthCol');
  const dayCol = document.getElementById('convDayCol');
  if (!yearCol || !monthCol || !dayCol) return;

  const now = new Date();
  let curY, curM, curD, monthsArr, maxDay;

  if (convSource === 'jalali') {
    const t = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    curY = t.jy; curM = t.jm; curD = t.jd;
    monthsArr = JALALI_MONTHS;
    maxDay = 31;
  } else if (convSource === 'hijri') {
    const t = toHijri(now);
    curY = t ? t.y : 1446;
    curM = t ? t.m : 1;
    curD = t ? t.d : 1;
    monthsArr = HIJRI_MONTHS;
    maxDay = 30;
  } else {
    curY = now.getFullYear(); curM = now.getMonth() + 1; curD = now.getDate();
    monthsArr = GREGORIAN_FA;
    maxDay = 31;
  }

  const saved = convValues[convSource];
  if (saved) { curY = saved.y; curM = saved.m; curD = saved.d; }

  let yearHTML = '';
  for (let y = curY - 500; y <= curY + 500; y++) {
    yearHTML += `<div class="conv-item ${y === curY ? 'active' : ''}" data-val="${y}">${toFa(y)}</div>`;
  }
  yearCol.innerHTML = yearHTML;

  let monthHTML = '';
  for (let m = 1; m <= 12; m++) {
    monthHTML += `<div class="conv-item ${m === curM ? 'active' : ''}" data-val="${m}">${monthsArr[m - 1]}</div>`;
  }
  monthCol.innerHTML = monthHTML;

  let dayHTML = '';
  for (let d = 1; d <= maxDay; d++) {
    dayHTML += `<div class="conv-item ${d === curD ? 'active' : ''}" data-val="${d}">${toFa(d)}</div>`;
  }
  dayCol.innerHTML = dayHTML;

  setTimeout(() => {
    [yearCol, monthCol, dayCol].forEach(col => {
      const active = col.querySelector('.conv-item.active');
      if (active) col.scrollTop = active.offsetTop - col.clientHeight / 2 + active.offsetHeight / 2;
    });
  }, 30);

  [yearCol, monthCol, dayCol].forEach(col => {
    col.querySelectorAll('.conv-item').forEach(el => {
      el.addEventListener('click', () => {
        col.querySelectorAll('.conv-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        col.scrollTop = el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2;
      });
    });

    let scrollTimer = null;
    col.addEventListener('scroll', () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const center = col.scrollTop + col.clientHeight / 2;
        let closest = null, closestDist = Infinity;
        col.querySelectorAll('.conv-item').forEach(item => {
          const ic = item.offsetTop + item.offsetHeight / 2;
          const dist = Math.abs(ic - center);
          if (dist < closestDist) { closestDist = dist; closest = item; }
        });
        if (closest) {
          col.querySelectorAll('.conv-item').forEach(x => x.classList.remove('active'));
          closest.classList.add('active');
        }
      }, 80);
    }, { passive: true });
  });

  document.querySelectorAll('.conv-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.src === convSource);
  });
}

function getActiveValue(colId) {
  const col = document.getElementById(colId);
  const el = col?.querySelector('.conv-item.active');
  return el ? +el.dataset.val : null;
}

function performConversion() {
  const y = getActiveValue('convYearCol');
  const m = getActiveValue('convMonthCol');
  const d = getActiveValue('convDayCol');
  if (!y || !m || !d) return;

  convValues[convSource] = { y, m, d };

  let jdn;
  if (convSource === 'jalali') {
    jdn = j2d(y, m, d);
  } else if (convSource === 'hijri') {
    jdn = hijriToJDN(y, m, d);
  } else {
    jdn = g2d(y, m, d);
  }

  const jal = d2j(jdn);
  const greg = d2g(jdn);
  const hij = jdnToHijri(jdn);

  const dateObj = new Date(Math.floor(greg.gy), greg.gm - 1, greg.gd);
  const dayNames = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
  const weekday = dayNames[dateObj.getDay()];

  const now = new Date();
  const todayJdn = g2d(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const diff = jdn - todayJdn;

  const body = document.getElementById('convResultBody');
  if (!body) return;

  body.innerHTML = `
    <div class="conv-row">
      <span class="conv-row-label">شمسی</span>
      <span class="conv-row-value">${toFa(jal.jd)} ${JALALI_MONTHS[jal.jm - 1]} ${toFa(jal.jy)}</span>
    </div>
    <div class="conv-row">
      <span class="conv-row-label">قمری</span>
      <span class="conv-row-value">${toFa(hij.d)} ${HIJRI_MONTHS[hij.m - 1]} ${toFa(hij.y)}</span>
    </div>
    <div class="conv-divider"></div>
    <div class="conv-row">
      <span class="conv-row-label">میلادی</span>
      <span class="conv-row-value">${greg.gd} ${GREGORIAN_FA[greg.gm - 1]} ${greg.gy}</span>
    </div>
    <div class="conv-divider"></div>
    <div class="conv-weekday">${weekday}</div>
    <div class="conv-divider"></div>
    <div class="conv-diff">
      <span>فاصله زمانی (سن)</span>
      <span>${toFa(Math.abs(diff))} روز${diff < 0 ? ' پیش' : diff > 0 ? ' بعد' : ''}</span>
    </div>
  `;

  const result = document.getElementById('convResult');
  if (result) {
    result.classList.remove('hidden');
    positionConvResult();
  }
}

function openConverter() {
  document.getElementById('calMainView')?.classList.add('hidden');
  document.getElementById('calConverter')?.classList.remove('hidden');
  convSource = 'jalali';
  renderConvPicker();
}

function closeConverter() {
  document.getElementById('calMainView')?.classList.remove('hidden');
  document.getElementById('calConverter')?.classList.add('hidden');
  document.getElementById('convResult')?.classList.add('hidden');
}

export function initConverter() {
  document.getElementById('calConvertBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openConverter();
  });

  document.getElementById('convClose')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeConverter();
  });

  document.querySelectorAll('.conv-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      convSource = tab.dataset.src;
      renderConvPicker();
    });
  });

  document.getElementById('convSubmit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    performConversion();
  });

  document.getElementById('convResultClose')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeConverter();
  });

  document.getElementById('convResultNew')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('convResult')?.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    const result = document.getElementById('convResult');
    if (result && !result.classList.contains('hidden')) {
      if (!result.contains(e.target) && !document.getElementById('calConvertBtn')?.contains(e.target)) {
        closeConverter();
      }
    }
  });

  window.addEventListener('resize', () => {
    const result = document.getElementById('convResult');
    if (result && !result.classList.contains('hidden')) positionConvResult();
  });
}