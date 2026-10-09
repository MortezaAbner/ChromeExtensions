/**
 * ماژول رسمی بوکمارک و پوشه‌های آبنر
 */
export function initBookmarks() {
  const STORAGE_KEY = 'abner_full_bookmarks_v3';
  const MAX_FOLDERS = 6;

  const defaultData = {
    folders: [
      {
        id: 'f_main',
        name: 'صفحه اصلی',
        color: 'blue',
        items: [
          { id: 'b_1', title: 'گوگل', url: 'https://google.com' },
          { id: 'b_2', title: 'تلگرام', url: 'https://web.telegram.org' },
          { id: 'b_3', title: 'اینستاگرام', url: 'https://instagram.com' },
          { id: 'b_4', title: 'دیجی‌کالا', url: 'https://digikala.com' },
          { id: 'b_5', title: 'دیوار', url: 'https://divar.ir' },
          { id: 'b_6', title: 'ب', url: 'https://ble.ir' }
        ]
      },
      { id: 'f_pers', name: 'شخصی', color: 'teal', items: [] }
    ],
    activeFolderId: 'f_main'
  };

  let store = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData;
  const container = document.getElementById('abnerBookmarksContainer');
  if (!container) return;

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function getMaxBookmarksForFolder(folderId) {
    return folderId === 'f_main' ? 23 : 24;
  }

  function getFavicon(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
    } catch {
      return '';
    }
  }

  // ۱. رندر پوشه‌ها و شبکه بوکمارک‌ها با سایز پایدار
  function renderAll() {
    const curFolder = store.folders.find(f => f.id === store.activeFolderId) || store.folders[0];
    if (curFolder) store.activeFolderId = curFolder.id;

    const items = [...(curFolder?.items || [])];
    const canAddFolder = store.folders.length < MAX_FOLDERS;
    const maxBm = getMaxBookmarksForFolder(store.activeFolderId);
    const canAddBookmark = items.length < maxBm;

    container.innerHTML = `
      <div class="abner-bookmarks-wrapper">
        <!-- نوار پوشه‌ها -->
        <div class="ab-folders-bar">
          ${store.folders.map((f, idx) => `
            <div class="ab-folder-pill ${f.id === store.activeFolderId ? 'active' : ''}" data-folder-id="${f.id}">
              <span>📁 ${f.name}</span>${idx > 0 ? `<button type="button" class="ab-folder-more-btn" data-folder-edit="${f.id}" title="مدیریت پوشه">⋮</button>` : ''}
            </div>
          `).join('')}

          ${canAddFolder ? `
            <div class="ab-folder-pill add-folder-btn" id="btnAddFolderPill" title="افزودن پوشه جدید">
              <span>+ پوشه جدید</span>
            </div>
          ` : ''}
        </div>

        <!-- شبکه بوکمارک‌ها -->
        <div class="ab-bm-grid-matrix">
          <!-- ایندکس ۰: بوکمارک ثابت دم‌دستی -->
          <div class="ab-bm-slot fixed-quick-card" id="btnFixedQuickAccess" title="باز کردن دم دستی">
            <div class="ab-bm-slot-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="5" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/></svg>
            </div>
            <span class="ab-bm-slot-title">دم دستی</span>
          </div>

          <!-- بوکمارک‌های این پوشه -->
          ${items.map((item) => `
            <div class="ab-bm-slot" data-slot-id="${item.id}" data-url="${item.url}">
              <button type="button" class="ab-bm-dots-btn" data-bm-dots="${item.id}">⋮</button>
              <div class="ab-bm-slot-icon">
                <img src="${getFavicon(item.url)}" alt="${item.title}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
              </div>
              <span class="ab-bm-slot-title">${item.title}</span>
            </div>
          `).join('')}

          <!-- فقط یک دکمه افزودن تا سقف تعیین‌شده -->
          ${canAddBookmark ? `
            <div class="ab-bm-slot add-new-slot" id="btnSingleAddSlot" title="افزودن بوکمارک جدید">
              <div class="ab-bm-slot-icon" style="font-size: 26px; color: rgba(255,255,255,0.75);">+</div>
              <span class="ab-bm-slot-title">افزودن</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    attachEvents(canAddFolder, canAddBookmark);
  }

  // ۲. مدیریت رویدادها
  function attachEvents(canAddFolder, canAddBookmark) {
    const quickBtn = document.getElementById('btnFixedQuickAccess');
    if (quickBtn) {
      quickBtn.onclick = triggerQuickAccess;
    }

    container.querySelectorAll('[data-folder-id]').forEach(pill => {
      pill.onclick = (e) => {
        if (e.target.dataset.folderEdit) return;
        store.activeFolderId = pill.dataset.folderId;
        persist();
        renderAll();
      };
    });

    const addFolderBtn = document.getElementById('btnAddFolderPill');
    if (addFolderBtn && canAddFolder) {
      addFolderBtn.onclick = () => openAddModal('folder');
    }

    container.querySelectorAll('[data-folder-edit]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openFolderContextMenu(e, btn.dataset.folderEdit);
      };
    });

    container.querySelectorAll('.ab-bm-slot[data-url]').forEach(slot => {
      slot.onclick = (e) => {
        if (e.target.dataset.bmDots) return;
        const url = slot.dataset.url;
        window.location.href = url.startsWith('http') ? url : `https://${url}`;
      };
    });

    const singleAddBtn = document.getElementById('btnSingleAddSlot');
    if (singleAddBtn && canAddBookmark) {
      singleAddBtn.onclick = () => openAddModal('bookmark');
    }

    container.querySelectorAll('[data-bm-dots]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openBookmarkContextMenu(e, btn.dataset.bmDots);
      };
    });
  }

  function triggerQuickAccess() {
    const dockQuickBtn = document.getElementById('btnDockQuick') || document.querySelector('[data-dock="quick"]');
    if (dockQuickBtn) {
      dockQuickBtn.click();
    } else {
      alert('بخش دسترسی سریع «دم دستی» باز شد.');
    }
  }

  // ۳. منوی سه‌نقطه بوکمارک با استایل شیشه‌ای
  function openBookmarkContextMenu(e, bmId) {
    closeAllMenus();
    const curFolder = store.folders.find(f => f.id === store.activeFolderId);
    const item = curFolder?.items.find(i => i.id === bmId);
    if (!item) return;

    const menu = document.createElement('div');
    menu.className = 'ab-context-menu';
    menu.id = 'activeContextMenu';
    menu.innerHTML = `
      <button type="button" class="ab-context-item" id="ctxOpen">
        <span>🔗</span> <span>باز کردن</span>
      </button>
      <button type="button" class="ab-context-item" id="ctxOpenNewTab">
        <span>↗</span> <span>باز کردن در تب جدید</span>
      </button>
      <button type="button" class="ab-context-item" id="ctxCopy">
        <span>📋</span> <span>کپی لینک</span>
      </button>
      <button type="button" class="ab-context-item" id="ctxEdit">
        <span>✏️</span> <span>ویرایش نام</span>
      </button>
      <div class="ab-submenu-wrapper">
        <button type="button" class="ab-context-item">
          <span>📁</span> <span>انتقال به پوشه</span> <span style="margin-right:auto;">›</span>
        </button>
        <div class="ab-submenu">
          ${store.folders.map(f => `
            <div class="ab-sub-item ${f.id === store.activeFolderId ? 'current-folder' : ''}" data-move-to="${f.id}">
              <span>${f.name}</span>${f.id === store.activeFolderId ? '<span>✓</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="ab-context-divider"></div>
      <button type="button" class="ab-context-item danger" id="ctxDelete">
        <span>🗑️</span> <span>حذف</span>
      </button>
    `;

    document.body.appendChild(menu);
    positionMenu(e, menu);

    document.getElementById('ctxOpen').onclick = () => {
      window.location.href = item.url.startsWith('http') ? item.url : `https://${item.url}`;
      closeAllMenus();
    };

    document.getElementById('ctxOpenNewTab').onclick = () => {
      window.open(item.url.startsWith('http') ? item.url : `https://${item.url}`, '_blank');
      closeAllMenus();
    };

    document.getElementById('ctxCopy').onclick = () => {
      navigator.clipboard.writeText(item.url);
      closeAllMenus();
    };

    document.getElementById('ctxEdit').onclick = () => {
      closeAllMenus();
      openEditBookmarkModal(item);
    };

    menu.querySelectorAll('[data-move-to]').forEach(sub => {
      sub.onclick = () => {
        const targetFId = sub.dataset.moveTo;
        if (targetFId !== store.activeFolderId) {
          const targetF = store.folders.find(f => f.id === targetFId);
          const maxTarget = getMaxBookmarksForFolder(targetFId);
          if (targetF && targetF.items.length >= maxTarget) {
            alert(`ظرفیت پوشه مقصد (${maxTarget} بوکمارک) تکمیل است.`);
            closeAllMenus();
            return;
          }
          curFolder.items = curFolder.items.filter(i => i.id !== item.id);
          if (targetF) targetF.items.push(item);
          persist();
          renderAll();
        }
        closeAllMenus();
      };
    });

    document.getElementById('ctxDelete').onclick = () => {
      curFolder.items = curFolder.items.filter(i => i.id !== item.id);
      persist();
      closeAllMenus();
      renderAll();
    };
  }

  // ۴. منوی سه‌نقطه پوشه با استایل شیشه‌ای
  function openFolderContextMenu(e, folderId) {
    closeAllMenus();
    const folder = store.folders.find(f => f.id === folderId);
    if (!folder) return;

    const menu = document.createElement('div');
    menu.className = 'ab-context-menu';
    menu.id = 'activeContextMenu';
    menu.innerHTML = `
      <button type="button" class="ab-context-item" id="ctxEditFolder">
        <span>✏️</span> <span>ویرایش نام پوشه</span>
      </button>
      <div class="ab-context-divider"></div>
      <button type="button" class="ab-context-item danger" id="ctxDeleteFolder">
        <span>🗑️</span> <span>حذف پوشه و محتوا</span>
      </button>
    `;

    document.body.appendChild(menu);
    positionMenu(e, menu);

    document.getElementById('ctxEditFolder').onclick = () => {
      closeAllMenus();
      openEditFolderModal(folder);
    };

    document.getElementById('ctxDeleteFolder').onclick = (ev) => {
      ev.stopPropagation();
      closeAllMenus();

      if (folderId === 'f_main' || folder.name === 'صفحه اصلی') {
        alert('پوشه «صفحه اصلی» قابل حذف نیست.');
        return;
      }

      store.folders = store.folders.filter(f => f.id !== folderId);
      store.activeFolderId = store.folders[0]?.id || 'f_main';
      persist();
      renderAll();
    };
  }

  // ۵. پاپ‌آپ شیشه‌ای ویرایش پوشه
  function openEditFolderModal(folder) {
    closeAllModals();

    const overlay = document.createElement('div');
    overlay.className = 'ab-popup-overlay';
    overlay.id = 'activeModal';

    overlay.innerHTML = `
      <div class="ab-popup-card">
        <h3 class="ab-popup-title">ویرایش نام پوشه</h3>
        <div class="ab-popup-inputs">
          <input type="text" id="popEditFolderName" class="ab-popup-input" value="${folder.name}">
        </div>
        <div class="ab-popup-actions">
          <button type="button" class="ab-popup-btn primary" id="popSaveFoldName">تایید</button>
          <button type="button" class="ab-popup-btn secondary" id="popCancelFoldName">انصراف</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const input = document.getElementById('popEditFolderName');
    input.focus();
    input.select();

    function doSave() {
      const val = input.value.trim();
      if (val) {
        folder.name = val;
        persist();
        renderAll();
      }
      closeAllModals();
    }

    document.getElementById('popSaveFoldName').onclick = doSave;
    document.getElementById('popCancelFoldName').onclick = closeAllModals;

    overlay.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSave(); }
      if (e.key === 'Escape') { e.preventDefault(); closeAllModals(); }
    };
  }

  // ۶. پاپ‌آپ افزودن شیشه‌ای
  function openAddModal(defaultTab = 'bookmark') {
    closeAllModals();

    const overlay = document.createElement('div');
    overlay.className = 'ab-popup-overlay';
    overlay.id = 'activeModal';

    overlay.innerHTML = `
      <div class="ab-popup-card">
        <h3 class="ab-popup-title">افزودن به آبنر</h3>
        <div class="ab-popup-tabs">
          <button type="button" class="ab-popup-tab ${defaultTab === 'bookmark' ? 'active' : ''}" id="tabBm">لینک / بوکمارک</button>
          <button type="button" class="ab-popup-tab ${defaultTab === 'folder' ? 'active' : ''}" id="tabFolder">پوشه جدید</button>
        </div>

        <div class="ab-popup-inputs">
          <input type="text" id="popTitle" class="ab-popup-input" placeholder="عنوان">
          <input type="text" id="popUrl" class="ab-popup-input" placeholder="آدرس سایت (...//:https)" style="${defaultTab === 'folder' ? 'display:none;' : ''}">
        </div>

        <div class="ab-popup-actions">
          <button type="button" class="ab-popup-btn primary" id="popSubmit">افزودن</button>
          <button type="button" class="ab-popup-btn secondary" id="popCancel">انصراف</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let currentMode = defaultTab;
    const tabBm = document.getElementById('tabBm');
    const tabFolder = document.getElementById('tabFolder');
    const inputUrl = document.getElementById('popUrl');
    const inputTitle = document.getElementById('popTitle');
    inputTitle.focus();

    tabBm.onclick = () => {
      currentMode = 'bookmark';
      tabBm.classList.add('active');
      tabFolder.classList.remove('active');
      inputUrl.style.display = 'block';
      inputTitle.focus();
    };

    tabFolder.onclick = () => {
      currentMode = 'folder';
      tabFolder.classList.add('active');
      tabBm.classList.remove('active');
      inputUrl.style.display = 'none';
      inputTitle.focus();
    };

    function doSubmit() {
      const title = inputTitle.value.trim();
      if (!title) return;

      if (currentMode === 'bookmark') {
        const curFolder = store.folders.find(f => f.id === store.activeFolderId);
        if (curFolder) {
          const maxAllowed = getMaxBookmarksForFolder(store.activeFolderId);
          if (curFolder.items.length >= maxAllowed) {
            alert(`حداکثر ${maxAllowed} بوکمارک در این پوشه می‌توانید بسازید.`);
            closeAllModals();
            return;
          }
          let url = inputUrl.value.trim() || 'https://google.com';
          if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
          curFolder.items.push({ id: 'b_' + Date.now(), title, url });
          persist();
          renderAll();
        }
      } else {
        if (store.folders.length >= MAX_FOLDERS) {
          alert('حداکثر ۶ پوشه مجاز است.');
          closeAllModals();
          return;
        }
        const newFolder = { id: 'f_' + Date.now(), name: title, color: 'blue', items: [] };
        store.folders.push(newFolder);
        store.activeFolderId = newFolder.id;
        persist();
        renderAll();
      }
      closeAllModals();
    }

    document.getElementById('popSubmit').onclick = doSubmit;
    document.getElementById('popCancel').onclick = closeAllModals;

    overlay.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSubmit(); }
      if (e.key === 'Escape') { e.preventDefault(); closeAllModals(); }
    };
  }

  // ۷. پاپ‌آپ ویرایش بوکمارک
  function openEditBookmarkModal(item) {
    closeAllModals();
    const overlay = document.createElement('div');
    overlay.className = 'ab-popup-overlay';
    overlay.id = 'activeModal';

    overlay.innerHTML = `
      <div class="ab-popup-card">
        <h3 class="ab-popup-title">ویرایش بوکمارک</h3>
        <div class="ab-popup-inputs">
          <input type="text" id="editTitle" class="ab-popup-input" value="${item.title}">
          <input type="text" id="editUrl" class="ab-popup-input" value="${item.url}">
        </div>
        <div class="ab-popup-actions">
          <button type="button" class="ab-popup-btn primary" id="editSubmit">تایید</button>
          <button type="button" class="ab-popup-btn secondary" id="editCancel">انصراف</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const inputTitle = document.getElementById('editTitle');
    inputTitle.focus();

    function doSave() {
      const title = inputTitle.value.trim();
      let url = document.getElementById('editUrl').value.trim();
      if (title && url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        item.title = title;
        item.url = url;
        persist();
        renderAll();
      }
      closeAllModals();
    }

    document.getElementById('editSubmit').onclick = doSave;
    document.getElementById('editCancel').onclick = closeAllModals;

    overlay.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSave(); }
      if (e.key === 'Escape') { e.preventDefault(); closeAllModals(); }
    };
  }

  function positionMenu(e, menu) {
    let x = e.clientX;
    let y = e.clientY;
    if (x + 210 > window.innerWidth) x = window.innerWidth - 220;
    if (y + 240 > window.innerHeight) y = window.innerHeight - 250;
    menu.style.left = `${Math.max(10, x)}px`;
    menu.style.top = `${Math.max(10, y)}px`;
  }

  function closeAllMenus() {
    document.querySelectorAll('.ab-context-menu').forEach(m => m.remove());
  }

  function closeAllModals() {
    document.querySelectorAll('.ab-popup-overlay').forEach(m => m.remove());
  }

  document.addEventListener('click', closeAllMenus);

  renderAll();
}