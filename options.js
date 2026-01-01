const DEFAULT_CFG = {
  enableFetch: false,
  enableXHR: false,
  enableBeacon: false,
  enableWebSocket: false,
  enableEventSource: false,
  enableWorker: false,
  enableSharedWorker: false,
  enableWebRTC: false,
  enablePOResource: true,
  enableCSPViolation: false,
  enableServiceWorker: false,
  enableHTMLElements: false,
  enableDNSPrefetch: false,
  enableCSSResources: false,
  enableManifest: false,
};

const DEFAULT_COLLAPSE_MODE = 'auto';

const DEFAULT_FORMAT = 'keen';

const DEFAULT_DOMAIN_FILTER = 'all';

const KEYS_M1 = [
  "enableFetch","enableXHR","enableBeacon","enableWebSocket",
  "enableEventSource","enableWorker","enableSharedWorker","enableWebRTC"
];
const KEYS_M2 = ["enablePOResource","enableCSPViolation"];
const KEYS_M3 = ["enableServiceWorker","enableHTMLElements","enableDNSPrefetch","enableCSSResources","enableManifest"];

const $ = (id) => document.getElementById(id);
const saveState = $("saveState");
let ACTIVE_PROFILE_ID = null;

function showSaved() {
  saveState.textContent = "Сохранено ✓";
  saveState.classList.add("ok");
  setTimeout(() => { saveState.textContent = "Изменений нет"; saveState.classList.remove("ok"); }, 1500);
}

function showModal(title, message, options = {}) {
  return new Promise((resolve) => {
    const overlay = $('modalOverlay');
    const modalTitle = $('modalTitle');
    const modalMessage = $('modalMessage');
    const modalInput = $('modalInput');
    const modalCancel = $('modalCancel');
    const modalOk = $('modalOk');
    
    if (!overlay || !modalTitle || !modalMessage || !modalInput || !modalCancel || !modalOk) {
      resolve(null);
      return;
    }
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    if (options.input) {
      modalInput.style.display = 'block';
      modalInput.value = options.defaultValue || '';
      modalInput.placeholder = options.placeholder || '';
      modalCancel.style.display = 'inline-block';
    } else {
      modalInput.style.display = 'none';
      modalCancel.style.display = options.showCancel ? 'inline-block' : 'none';
    }
    
    overlay.style.display = 'flex';
    
    let resolved = false;
    
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      overlay.style.display = 'none';
      modalInput.value = '';
      modalOk.onclick = null;
      modalCancel.onclick = null;
      overlay.onclick = null;
    };
    
    const handleOk = () => {
      if (resolved) return;
      const value = options.input ? modalInput.value : true;
      cleanup();
      resolve(value);
    };
    
    const handleCancel = () => {
      if (resolved) return;
      const value = options.input ? null : false;
      cleanup();
      resolve(value);
    };
    
    if (options.input) {
      setTimeout(() => {
        modalInput.focus();
        modalInput.select();
        const inputEnterHandler = (e) => {
          if (e.key === 'Enter' && !resolved) {
            e.preventDefault();
            handleOk();
            modalInput.removeEventListener('keydown', inputEnterHandler);
          }
        };
        modalInput.addEventListener('keydown', inputEnterHandler);
      }, 100);
    }
    
    modalOk.onclick = handleOk;
    modalCancel.onclick = handleCancel;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        handleCancel();
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape' && overlay.style.display === 'flex' && !resolved) {
        e.preventDefault();
        handleCancel();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    const handleEnter = (e) => {
      if (e.key === 'Enter' && overlay.style.display === 'flex' && !resolved) {
        if (options.input && document.activeElement === modalInput) {
          e.preventDefault();
          handleOk();
          document.removeEventListener('keydown', handleEnter);
        } else if (!options.input) {
          e.preventDefault();
          handleOk();
          document.removeEventListener('keydown', handleEnter);
        }
      }
    };
    document.addEventListener('keydown', handleEnter);
  });
}

function customPrompt(message, defaultValue = '') {
  return showModal('Ввод', message, {
    input: true,
    defaultValue: defaultValue,
    placeholder: 'Введите значение'
  });
}

function customConfirm(message) {
  return showModal('Подтверждение', message, {
    showCancel: true
  });
}

function customAlert(message) {
  return showModal('Уведомление', message, {
    showCancel: false
  });
}

function initCustomSelect(selectElement) {
  if (!selectElement || selectElement.dataset.customized === 'true') return;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  
  const customSelect = document.createElement('div');
  customSelect.className = 'custom-select';
  
  const trigger = document.createElement('div');
  trigger.className = 'custom-select-trigger';
  
  const selectedText = document.createElement('span');
  selectedText.className = 'selected-text';
  
  const arrow = document.createElement('div');
  arrow.className = 'arrow';
  arrow.innerHTML = '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 7.5l4.5 5 4.5-5"/></svg>';
  
  trigger.appendChild(selectedText);
  trigger.appendChild(arrow);
  
  const options = document.createElement('div');
  options.className = 'custom-select-options';
  
  Array.from(selectElement.options).forEach((option, index) => {
    const optionEl = document.createElement('div');
    optionEl.className = 'custom-select-option';
    optionEl.dataset.value = option.value;
    optionEl.textContent = option.text;
    if (option.selected) {
      optionEl.classList.add('selected');
      selectedText.textContent = option.text;
    }
    optionEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectElement.value = option.value;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      options.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
      optionEl.classList.add('selected');
      selectedText.textContent = option.text;
      
      trigger.classList.remove('active');
      options.classList.remove('show');
    });
    options.appendChild(optionEl);
  });
  
  customSelect.appendChild(trigger);
  customSelect.appendChild(options);
  wrapper.appendChild(customSelect);
  
  selectElement.parentNode.insertBefore(wrapper, selectElement);
  selectElement.classList.add('hidden-select');
  selectElement.dataset.customized = 'true';
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = trigger.classList.contains('active');
    
    document.querySelectorAll('.custom-select-trigger.active').forEach(t => {
      if (t !== trigger) {
        t.classList.remove('active');
        t.nextElementSibling.classList.remove('show');
      }
    });
    
    if (isActive) {
      trigger.classList.remove('active');
      options.classList.remove('show');
    } else {
      trigger.classList.add('active');
      options.classList.add('show');
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      trigger.classList.remove('active');
      options.classList.remove('show');
    }
  });
  
  const syncCustomSelect = () => {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    if (selectedOption) {
      selectedText.textContent = selectedOption.text;
      options.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.value === selectedOption.value) {
          opt.classList.add('selected');
        }
      });
    }
  };
  
  selectElement.addEventListener('change', syncCustomSelect);
  
  const observer = new MutationObserver(syncCustomSelect);
  observer.observe(selectElement, { childList: true, attributes: true, attributeFilter: ['selected'] });
  
  let lastValue = selectElement.value;
  const checkValue = () => {
    if (selectElement.value !== lastValue) {
      lastValue = selectElement.value;
      syncCustomSelect();
    }
  };
  
  const valueCheckInterval = setInterval(checkValue, 100);
  
  wrapper._cleanup = () => {
    clearInterval(valueCheckInterval);
    observer.disconnect();
  };
  
  return wrapper;
}

function initAllCustomSelects() {
  document.querySelectorAll('select.input:not(.hidden-select)').forEach(select => {
    if (!select.dataset.customized) {
      initCustomSelect(select);
    }
  });
}

async function loadCfg() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ di_cfg: DEFAULT_CFG }, (res) => {
      resolve({ ...DEFAULT_CFG, ...(res?.di_cfg || {}) });
    });
  });
}

function readUi() {
  const cfg = {};
  for (const k of Object.keys(DEFAULT_CFG)) cfg[k] = !!$(k).checked;
  return cfg;
}

function applyUi(cfg) {
  for (const k of Object.keys(DEFAULT_CFG)) {
    const el = $(k);
    if (el) el.checked = !!cfg[k];
  }
}

const DESCRIPTIONS = {
  enableFetch: "Перехват вызовов window.fetch(). Позволяет фиксировать хосты всех HTTP(S) запросов, сделанных через современный Fetch API.",
  enableXHR: "Перехват XMLHttpRequest.open(). Покрывает «старый» AJAX и скрипты, использующие XHR вместо fetch.",
  enableBeacon: "Перехват navigator.sendBeacon(). Браузеры используют Beacon для фона/телеметрии; помогает увидеть домены аналитики.",
  enableWebSocket: "Перехват new WebSocket(). Сохраняет адреса WS/WSS-подключений (чаты, лайв-обновления и пр.).",
  enableEventSource: "Перехват new EventSource(). Source EventStream (SSE) — односторонние серверные события.",
  enableWorker: "Перехват new Worker(). Фиксирует URL скриптов Web Worker — фоновые потоки страницы.",
  enableSharedWorker: "Перехват new SharedWorker(). Аналог Worker, но общий для нескольких вкладок/фреймов.",
  enableWebRTC: "Анализ конфигурации RTCPeerConnection. Извлекает адреса ICE-серверов (STUN/TURN), используемых WebRTC.",
  enablePOResource: "Непрерывное наблюдение через PerformanceObserver('resource'). Собирает хосты всех загруженных ресурсов (скрипты, изображения, стили и т.д.).",
  enableCSPViolation: "Слушает события securitypolicyviolation (CSP). Показывает заблокированные политикой загрузки адреса.",
  enableServiceWorker: "Перехват navigator.serviceWorker.register(). Фиксирует домены, с которых регистрируются Service Worker для офлайн-работы и кэширования.",
  enableHTMLElements: "Сканирование DOM для извлечения доменов из атрибутов src/href/data/action (img, iframe, script, link, video, audio, form и т.д.).",
  enableDNSPrefetch: "Анализ <link rel=\"dns-prefetch\"> и <link rel=\"preconnect\">. Показывает домены, которые браузер предварительно резолвит для ускорения загрузки.",
  enableCSSResources: "Парсинг CSS для поиска внешних ресурсов в url() и @import. Находит домены фоновых изображений, шрифтов и других CSS-ресурсов.",
  enableManifest: "Парсинг веб-манифеста (manifest.json). Извлекает домены из start_url, иконок и скриншотов PWA-приложений."
};

const METHOD_DESCRIPTIONS = {
  m1: "Перехватывает сетевые запросы на уровне JavaScript API. Метод работает в реальном времени, перехватывая вызовы функций браузера (fetch, XHR, WebSocket и др.) до их выполнения. Эффективен для отслеживания динамических запросов, но может быть обойден при прямом использовании нативных методов браузера.",
  m2: "Использует встроенные механизмы браузера для непрерывного мониторинга загружаемых ресурсов. PerformanceObserver отслеживает все загруженные ресурсы через Performance API, а CSP события показывают заблокированные запросы. Работает автоматически и не требует перехвата кода, но показывает только успешно загруженные или заблокированные ресурсы.",
  m3: "Анализирует статический и динамический контент страницы: DOM-элементы, CSS-файлы, манифесты и другие ресурсы. Метод сканирует структуру страницы и извлекает домены из атрибутов, стилей и конфигурационных файлов. Полезен для обнаружения скрытых доменов, но может пропускать домены, загружаемые динамически через JavaScript."
};

function addInfoIcons() {
  document.querySelectorAll('.opt').forEach(opt => {
    const input = opt.querySelector('input[type="checkbox"]');
    const label = opt.querySelector('label');
    if (!input || !label) return;
    const id = input.id;
    const txt = DESCRIPTIONS[id];
    if (!txt) return;

    if (opt.querySelector('.info-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'info-btn';
    btn.setAttribute('aria-label', 'Описание');
    btn.setAttribute('title', 'Описание');
    btn.textContent = 'i';
    opt.appendChild(btn);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = txt;
    opt.appendChild(hint);

    const openHint = () => {
      const optRect = opt.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      hint.style.display = 'block';
      hint.style.visibility = 'hidden';
      const hintWidth = hint.offsetWidth;
      hint.style.display = '';
      hint.style.visibility = '';

      let desiredLeft = (btnRect.left - optRect.left) - hintWidth / 2 + btnRect.width / 2;
      const minLeft = 10;
      const maxLeft = opt.clientWidth - hintWidth - 10;
      const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
      hint.style.left = left + 'px';

      const arrowX = (btnRect.left - optRect.left) - left + btnRect.width / 2;
      hint.style.setProperty('--arrow-x', arrowX + 'px');

      opt.classList.add('open');
    };

    const closeHint = () => { opt.classList.remove('open'); };

    let hoverTimer;
    btn.addEventListener('mouseenter', () => { clearTimeout(hoverTimer); openHint(); });
    btn.addEventListener('mouseleave', () => { hoverTimer = setTimeout(closeHint, 80); });

    btn.addEventListener('click', (e) => { e.preventDefault(); });
  });
}

function saveCfg(cfg) {
  chrome.storage.sync.set({ di_cfg: cfg }, () => {
    updateActiveProfile(({ item, data }) => {
      if (!item) return;
      item.di_cfg = { ...cfg };
      return { item, data };
    });
    showSaved();
  });
}


const profileElems = {
  select: $("profileSelect"),
  addBtn: $("profileAddBtn"),
  renameBtn: $("profileRenameBtn"),
  deleteBtn: $("profileDeleteBtn"),
  exportBtn: $("exportBtn"),
  exportLink: $("exportLink"),
  copyExportBtn: $("copyExportBtn"),
  importBtn: $("importBtn"),
};

function uuid() {
  return (crypto?.randomUUID?.() || ('xxxyxxyx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
    const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8); return v.toString(16);
  })));
}

async function loadProfiles() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ profiles_v1: null, defaultCollapseMode: DEFAULT_COLLAPSE_MODE, defaultFormat: DEFAULT_FORMAT, defaultDomainFilter: DEFAULT_DOMAIN_FILTER }, async (res) => {
      const data = res.profiles_v1;
      if (data && Array.isArray(data.items) && data.items.length) {
        data.items.forEach(p => { 
          if (!p.defaultCollapseMode) p.defaultCollapseMode = res.defaultCollapseMode || DEFAULT_COLLAPSE_MODE; 
          if (!p.defaultFormat) p.defaultFormat = (res.defaultFormat || DEFAULT_FORMAT); 
          if (p.defaultFormat === 'plain') p.defaultFormat = 'keen';
          if (!p.defaultDomainFilter) p.defaultDomainFilter = res.defaultDomainFilter || DEFAULT_DOMAIN_FILTER;
        });
        resolve({ data, defaultCollapseMode: res.defaultCollapseMode || DEFAULT_COLLAPSE_MODE });
      } else {
        const di_cfg = await loadCfg();
        const item = { id: uuid(), name: "Основной", di_cfg, defaultCollapseMode: res.defaultCollapseMode || DEFAULT_COLLAPSE_MODE, defaultFormat: res.defaultFormat || DEFAULT_FORMAT, defaultDomainFilter: res.defaultDomainFilter || DEFAULT_DOMAIN_FILTER };
        const init = { activeId: item.id, items: [item] };
        chrome.storage.sync.set({ profiles_v1: init }, () => resolve({ data: init, defaultCollapseMode: item.defaultCollapseMode }));
      }
    });
  });
}

function saveProfiles(data) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ profiles_v1: data }, resolve);
  });
}

function renderProfilesSelect(data) {
  const sel = profileElems.select;
  sel.innerHTML = "";
  data.items.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    sel.appendChild(o);
  });
  sel.value = data.activeId;
  
  if (!sel.dataset.customized) {
    initCustomSelect(sel);
  }
  
  let wrapper = sel.previousElementSibling;
  if (!wrapper || !wrapper.classList.contains('custom-select-wrapper')) {
    wrapper = sel.parentElement?.querySelector('.custom-select-wrapper');
  }
  if (wrapper) {
    const selectedText = wrapper.querySelector('.selected-text');
    const options = wrapper.querySelector('.custom-select-options');
    if (selectedText && options) {
      const selectedOption = sel.options[sel.selectedIndex];
      if (selectedOption) {
        selectedText.textContent = selectedOption.text;
      }
      options.innerHTML = '';
      Array.from(sel.options).forEach(option => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-select-option';
        optionEl.dataset.value = option.value;
        optionEl.textContent = option.text;
        if (option.selected) {
          optionEl.classList.add('selected');
        }
        optionEl.addEventListener('click', (e) => {
          e.stopPropagation();
          sel.value = option.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          options.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
          optionEl.classList.add('selected');
          selectedText.textContent = option.text;
          const trigger = wrapper.querySelector('.custom-select-trigger');
          if (trigger) {
            trigger.classList.remove('active');
            options.classList.remove('show');
          }
        });
        options.appendChild(optionEl);
      });
    }
  }
}

function getActiveProfile(data) {
  return data.items.find(x => x.id === data.activeId) || data.items[0];
}

async function applyProfile(item) {
  ACTIVE_PROFILE_ID = item?.id || null;
  applyUi(item.di_cfg || DEFAULT_CFG);    
  const modeSel = $("defaultCollapseMode");
  if (modeSel) modeSel.value = item.defaultCollapseMode || DEFAULT_COLLAPSE_MODE;
  const fmtSel = $("defaultFormat");
  if (fmtSel) fmtSel.value = item.defaultFormat || DEFAULT_FORMAT;
  const filterSel = $("defaultDomainFilter");
  if (filterSel) filterSel.value = item.defaultDomainFilter || DEFAULT_DOMAIN_FILTER;
  chrome.storage.sync.set({ di_cfg: item.di_cfg || DEFAULT_CFG, defaultCollapseMode: item.defaultCollapseMode || DEFAULT_COLLAPSE_MODE, defaultFormat: item.defaultFormat || DEFAULT_FORMAT, defaultDomainFilter: item.defaultDomainFilter || DEFAULT_DOMAIN_FILTER }, showSaved);
  try {
    const key = 'keen_hosts__' + (ACTIVE_PROFILE_ID || 'default');
    chrome.storage.local.get(['keen_hosts', key], (res) => {
      const legacy = Array.isArray(res.keen_hosts) ? res.keen_hosts : null;
      const prof = Array.isArray(res[key]) ? res[key] : null;
      if (legacy && !prof) {
        chrome.storage.local.set({ [key]: legacy });
      }
      loadKeenHosts().then(renderKeenList);
    });
  } catch(_) { loadKeenHosts().then(renderKeenList); }
}

function updateActiveProfile(mutator) {
  loadProfiles().then(async ({ data }) => {
    const item = getActiveProfile(data);
    const next = mutator({ item, data });
    if (next) {
      await saveProfiles(next.data);
      renderProfilesSelect(next.data);
    }
  });
}

const keenElems = {
  name: $("keenName"),
  url: $("keenUrl"),
  user: $("keenUser"),
  pass: $("keenPass"),
  addBtn: $("keenAddBtn"),
  cancelBtn: $("keenCancelBtn"),
  addState: $("keenAddState"),
  list: $("keenList"),
};

let editingRouterId = null; // ID редактируемого роутера

function resetKeenForm() {
  keenElems.name.value = '';
  keenElems.url.value = '';
  keenElems.user.value = '';
  keenElems.pass.value = '';
  keenElems.pass.type = 'password'; // Сбрасываем тип на password
  editingRouterId = null;
  keenElems.addBtn.textContent = 'Добавить роутер';
  if (keenElems.cancelBtn) keenElems.cancelBtn.style.display = 'none';
  
  const passwordToggle = document.getElementById('keenPassToggle');
  if (passwordToggle) {
    const eyeOpen = passwordToggle.querySelector('.eye-open');
    const eyeClosed = passwordToggle.querySelector('.eye-closed');
    if (eyeOpen) eyeOpen.style.display = 'block';
    if (eyeClosed) eyeClosed.style.display = 'none';
    passwordToggle.setAttribute('aria-label', 'Показать пароль');
    passwordToggle.setAttribute('title', 'Показать пароль');
  }
}

function normalizeOrigin(input) {
  let s = String(input || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    return u.origin;
  } catch {
    return '';
  }
}

async function loadKeenHosts(profileId) {
  const id = profileId || ACTIVE_PROFILE_ID || 'default';
  const key = 'keen_hosts__' + id;
  return new Promise((resolve) => {
    chrome.storage.local.get({ [key]: [] }, (res) => resolve(Array.isArray(res[key]) ? res[key] : []));
  });
}
function saveKeenHosts(list, profileId) {
  const id = profileId || ACTIVE_PROFILE_ID || 'default';
  const key = 'keen_hosts__' + id;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: list }, resolve);
  });
}

function mask(s, keep=2) {
  if (!s) return '';
  return '•'.repeat(Math.max(0, s.length - keep)) + s.slice(-keep);
}

function renderKeenList(items) {
  const root = keenElems.list;
  root.innerHTML = '';
  if (!items.length) {
    const d = document.createElement('div');
    d.className = 'muted';
    d.textContent = 'Список пуст. Добавьте первый роутер выше.';
    root.appendChild(d);
    return;
  }
  items.forEach((h) => {
    const row = document.createElement('div');
    row.className = 'k-item';

    const meta = document.createElement('div');
    meta.className = 'k-meta';
    const title = document.createElement('div');
    title.className = 'k-title';
    const displayName = h.name || h.origin;
    title.textContent = displayName + (h.name ? ` (${h.origin} — ${h.user})` : ` — ${h.user}`);
    const sub = document.createElement('div');
    sub.className = 'k-sub';
    sub.textContent = `Пароль: ${mask(h.pass)}${h.lastOkTs ? ` • проверен: ${new Date(h.lastOkTs).toLocaleString()}` : ''}`;
    meta.appendChild(title); meta.appendChild(sub);

    const status = document.createElement('div');
    status.className = 'k-status ' + (h.lastOk ? 'ok' : (h.lastOk === false ? 'err' : ''));
    status.textContent = h.lastOk ? 'OK' : (h.lastOk === false ? (h.lastErr || 'Ошибка') : '—');

    const actions = document.createElement('div');
    actions.className = 'k-actions';
    const btnTest = document.createElement('button');
    btnTest.className = 'btn';
    btnTest.textContent = 'Проверить';
    btnTest.onclick = async () => {
      btnTest.disabled = true; btnTest.textContent = 'Проверяем…';
      try {
        const info = await keenProbe(h);
        h.lastOk = true; h.lastOkTs = Date.now(); h.lastErr = '';
        status.className = 'k-status ok'; status.textContent = 'OK';
        sub.textContent = `Пароль: ${mask(h.pass)} • проверен: ${new Date(h.lastOkTs).toLocaleString()}`;
        await commitUpdate(h);
      } catch (e) {
        h.lastOk = false; h.lastErr = String(e?.message || e || 'Ошибка');
        status.className = 'k-status err'; status.textContent = 'Ошибка';
        await commitUpdate(h);
      } finally {
        btnTest.disabled = false; btnTest.textContent = 'Проверить';
      }
    };

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn';
    btnEdit.textContent = 'Редактировать';
    btnEdit.onclick = async () => {
      editingRouterId = h.id;
      keenElems.name.value = h.name || '';
      keenElems.url.value = h.origin || '';
      keenElems.user.value = h.user || '';
      keenElems.pass.value = h.pass || '';
      keenElems.addBtn.textContent = 'Сохранить изменения';
      if (keenElems.cancelBtn) keenElems.cancelBtn.style.display = 'inline-block';
      
      keenElems.name.focus();
      keenElems.name.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const btnDel = document.createElement('button');
    btnDel.className = 'btn';
    btnDel.textContent = 'Удалить';
    btnDel.onclick = async () => {
      const confirmed = await customConfirm(`Удалить роутер "${h.name || h.origin}"?`);
      if (!confirmed) return;
      const list = await loadKeenHosts();
      const next = list.filter(x => x.id !== h.id);
      await saveKeenHosts(next);
      renderKeenList(next);
    };

    actions.appendChild(btnTest);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    row.appendChild(meta);
    row.appendChild(status);
    row.appendChild(actions);
    root.appendChild(row);
  });
}

async function commitUpdate(item) {
  const list = await loadKeenHosts();
  const idx = list.findIndex(x => x.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
    await saveKeenHosts(list);
  }
}

async function keenProbe(h) {
  const headers = {
    'Authorization': 'Basic ' + btoa(`${h.user}:${h.pass}`),
    'Accept': 'application/json'
  };
  const url1 = h.origin.replace(/\/+$/,'') + '/rci/show/system';
  const r1 = await fetch(url1, { method: 'GET', headers });
  if (r1.ok) {
    const js = await r1.json().catch(()=> ({}));
    return js;
  }
}

function validateKeenInput() {
  const name = (keenElems.name.value || '').trim();
  const origin = normalizeOrigin(keenElems.url.value);
  const user = (keenElems.user.value || '').trim();
  const pass = (keenElems.pass.value || '').trim();
  if (!origin) throw new Error('Укажите корректный адрес (http/https).');
  if (!user) throw new Error('Укажите пользователя.');
  if (!pass) throw new Error('Укажите пароль.');
  return { name: name || null, origin, user, pass };
}

function encodeB64(jsonObj) {
  const bytes = new TextEncoder().encode(JSON.stringify(jsonObj));
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}
function decodeB64(b64) {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array([...bin].map(ch => ch.charCodeAt(0)));
  const str = new TextDecoder().decode(bytes);
  return JSON.parse(str);
}

function buildShareUrl(profile) {
  const payload = { ver:1, name: profile.name, di_cfg: profile.di_cfg, defaultCollapseMode: profile.defaultCollapseMode || DEFAULT_COLLAPSE_MODE, defaultFormat: profile.defaultFormat || DEFAULT_FORMAT, defaultDomainFilter: profile.defaultDomainFilter || DEFAULT_DOMAIN_FILTER };
  const b64 = encodeB64(payload);
  const base = chrome.runtime.getURL('options.html');
  return `${base}#import=${b64}`;
}

function parseImportInput(raw) {
  let s = String(raw || '').trim();
  if (!s) throw new Error('Пустая строка.');
  const m1 = s.match(/[#?](?:import|data)=([^&]+)/i);
  if (m1) s = m1[1];
  return decodeB64(s);
}

function addMethodInfoIcons() {
  document.querySelectorAll('.method-info-btn').forEach(btn => {
    const methodId = btn.getAttribute('data-method');
    const description = METHOD_DESCRIPTIONS[methodId];
    if (!description) return;

    const header = btn.closest('.method-header');
    if (!header) return;

    if (header.querySelector('.method-hint')) return;

    const hint = document.createElement('div');
    hint.className = 'method-hint';
    hint.textContent = description;
    header.appendChild(hint);

    const openHint = () => {
      header.classList.add('open');
    };

    const closeHint = () => {
      header.classList.remove('open');
    };

    let hoverTimer;
    btn.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      openHint();
    });
    btn.addEventListener('mouseleave', () => {
      hoverTimer = setTimeout(closeHint, 80);
    });
    header.addEventListener('mouseleave', () => {
      hoverTimer = setTimeout(closeHint, 80);
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (header.classList.contains('open')) {
        closeHint();
      } else {
        openHint();
      }
    });
  });
}

// Theme management
async function loadTheme() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ theme: 'dark' }, (res) => {
      resolve(res.theme || 'dark');
    });
  });
}

async function saveTheme(theme) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ theme }, resolve);
  });
}

async function applyTheme(theme) {
  const body = document.body;
  const themeToggle = $('themeToggle');
  
  if (theme === 'light') {
    body.classList.add('light');
    if (themeToggle) themeToggle.textContent = '☀️';
  } else {
    body.classList.remove('light');
    if (themeToggle) themeToggle.textContent = '🌙';
  }
}

async function initTheme() {
  const themeToggle = $('themeToggle');
  if (!themeToggle) return;
  
  const currentTheme = await loadTheme();
  await applyTheme(currentTheme);
  
  themeToggle.addEventListener('click', async () => {
    const currentTheme = await loadTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await saveTheme(newTheme);
    await applyTheme(newTheme);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();
  
  addInfoIcons();
  addMethodInfoIcons();

  const cfg = await loadCfg();
  applyUi(cfg);

  const { data: profData0 } = await loadProfiles();
  renderProfilesSelect(profData0);
  await applyProfile(getActiveProfile(profData0));
  
  setTimeout(() => {
    initAllCustomSelects();
  }, 100);

  for (const k of Object.keys(DEFAULT_CFG)) {
    $(k).addEventListener("change", () => saveCfg(readUi()));
  }

  document.querySelectorAll("button[data-group]").forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.getAttribute("data-group");
      const mode = btn.getAttribute("data-mode");
      const keys = group === "m1" ? KEYS_M1 : (group === "m2" ? KEYS_M2 : KEYS_M3);
      const newCfg = readUi();
      keys.forEach(k => newCfg[k] = (mode === "all"));
      applyUi(newCfg);
      saveCfg(newCfg);
    });
  });

  $("btnAllOn").onclick = () => { const c = {}; for (const k in DEFAULT_CFG) c[k] = true; applyUi(c); saveCfg(c); };
  $("btnAllOff").onclick = () => { const c = {}; for (const k in DEFAULT_CFG) c[k] = false; applyUi(c); saveCfg(c); };
  $("btnDefaults").onclick = () => { const c = { ...DEFAULT_CFG }; applyUi(c); saveCfg(c); };

  const collapseSel = $("defaultCollapseMode");
  const formatSel = $("defaultFormat");
  chrome.storage.sync.get({ defaultCollapseMode: DEFAULT_COLLAPSE_MODE, defaultFormat: DEFAULT_FORMAT }, (res) => {
    collapseSel.value = res.defaultCollapseMode || DEFAULT_COLLAPSE_MODE;
    let fmt = res.defaultFormat || DEFAULT_FORMAT;
    if (fmt === 'plain') { fmt = 'keen'; chrome.storage.sync.set({ defaultFormat: fmt }); }
    if (formatSel) formatSel.value = fmt;
    
    setTimeout(() => {
      initAllCustomSelects();
      document.querySelectorAll('select.input.hidden-select').forEach(sel => {
        const wrapper = sel.previousElementSibling;
        if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
          const selectedText = wrapper.querySelector('.selected-text');
          const selectedOption = sel.options[sel.selectedIndex];
          if (selectedText && selectedOption) {
            selectedText.textContent = selectedOption.text;
            wrapper.querySelectorAll('.custom-select-option').forEach(opt => {
              opt.classList.remove('selected');
              if (opt.dataset.value === selectedOption.value) {
                opt.classList.add('selected');
              }
            });
          }
        }
      });
    }, 150);
  });
  collapseSel.addEventListener('change', (e) => {
    const val = e.target.value || DEFAULT_COLLAPSE_MODE;
    chrome.storage.sync.set({ defaultCollapseMode: val }, () => {
      updateActiveProfile(({ item, data }) => {
        if (!item) return;
        item.defaultCollapseMode = val;
        return { item, data };
      });
      showSaved();
    });
  });

  formatSel?.addEventListener('change', (e) => {
    const val = e.target.value || DEFAULT_FORMAT;
    chrome.storage.sync.set({ defaultFormat: val }, () => {
      updateActiveProfile(({ item, data }) => {
        if (!item) return;
        item.defaultFormat = val;
        return { item, data };
      });
      showSaved();
    });
  });

  const filterSel = $("defaultDomainFilter");
  chrome.storage.sync.get({ defaultDomainFilter: DEFAULT_DOMAIN_FILTER }, (res) => {
    if (filterSel) filterSel.value = res.defaultDomainFilter || DEFAULT_DOMAIN_FILTER;
    
    setTimeout(() => {
      initAllCustomSelects();
      document.querySelectorAll('select.input.hidden-select').forEach(sel => {
        const wrapper = sel.previousElementSibling;
        if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
          const selectedText = wrapper.querySelector('.selected-text');
          const selectedOption = sel.options[sel.selectedIndex];
          if (selectedText && selectedOption) {
            selectedText.textContent = selectedOption.text;
            wrapper.querySelectorAll('.custom-select-option').forEach(opt => {
              opt.classList.remove('selected');
              if (opt.dataset.value === selectedOption.value) {
                opt.classList.add('selected');
              }
            });
          }
        }
      });
    }, 150);
  });
  filterSel?.addEventListener('change', (e) => {
    const val = e.target.value || DEFAULT_DOMAIN_FILTER;
    chrome.storage.sync.set({ defaultDomainFilter: val }, () => {
      updateActiveProfile(({ item, data }) => {
        if (!item) return;
        item.defaultDomainFilter = val;
        return { item, data };
      });
      showSaved();
    });
  });

  profileElems.select.addEventListener('change', async () => {
    const id = profileElems.select.value;
    const { data } = await loadProfiles();
    data.activeId = id;
    await saveProfiles(data);
    renderProfilesSelect(data);
    const item = getActiveProfile(data);
    await applyProfile(item);
    const list = await loadKeenHosts(id);
    renderKeenList(list);
  });

  profileElems.addBtn.addEventListener('click', async () => {
    try {
      const name = await customPrompt('Название нового профиля:', 'Профиль');
      if (name === null || name === undefined) {
        return;
      }
      const trimmedName = name ? name.trim() : '';
      if (!trimmedName) {
        await customAlert('Имя профиля не может быть пустым');
        return;
      }
      const { data } = await loadProfiles();
      let _fmt = $("defaultFormat").value || DEFAULT_FORMAT; if (_fmt === 'plain') _fmt = 'keen';
      const item = { id: uuid(), name: trimmedName, di_cfg: readUi(), defaultCollapseMode: $("defaultCollapseMode").value || DEFAULT_COLLAPSE_MODE, defaultFormat: _fmt, defaultDomainFilter: $("defaultDomainFilter").value || DEFAULT_DOMAIN_FILTER };
      data.items.push(item);
      data.activeId = item.id;
      await saveProfiles(data);
      renderProfilesSelect(data);
      await applyProfile(item);
      showSaved();
    } catch (e) {
      saveState.textContent = `Ошибка: ${e?.message || e}`;
      saveState.classList.remove('ok');
      setTimeout(() => {
        saveState.textContent = 'Изменений нет';
      }, 3000);
    }
  });

  profileElems.renameBtn.addEventListener('click', async () => {
    const { data } = await loadProfiles();
    const cur = getActiveProfile(data);
    const name = await customPrompt('Новое имя профиля:', cur.name);
    if (!name || !name.trim()) return;
    cur.name = name.trim();
    await saveProfiles(data);
    renderProfilesSelect(data);
    showSaved();
  });

  profileElems.deleteBtn.addEventListener('click', async () => {
    const { data } = await loadProfiles();
    if (data.items.length <= 1) {
      await customAlert('Нельзя удалить единственный профиль.');
      return;
    }
    const cur = getActiveProfile(data);
    const confirmed = await customConfirm(`Удалить профиль «${cur.name}»?`);
    if (!confirmed) return;
    data.items = data.items.filter(x => x.id !== cur.id);
    data.activeId = data.items[0].id;
    await saveProfiles(data);
    renderProfilesSelect(data);
    await applyProfile(getActiveProfile(data));
    showSaved();
  });

  profileElems.exportBtn.addEventListener('click', async () => {
    const { data } = await loadProfiles();
    const cur = getActiveProfile(data);
    const url = buildShareUrl(cur);
    profileElems.exportLink.value = url;
    profileElems.exportLink.select();
    showSaved();
  });

  profileElems.copyExportBtn.addEventListener('click', () => {
    const v = profileElems.exportLink.value;
    if (!v) return;
    navigator.clipboard.writeText(v).then(() => {
      profileElems.copyExportBtn.textContent = '✅ Скопировано';
      setTimeout(() => profileElems.copyExportBtn.textContent = 'Копировать ссылку', 1000);
    });
  });

  profileElems.importBtn.addEventListener('click', async () => {
    try {
      const raw = await customPrompt('Вставьте ссылку или строку base64 для импорта:', '');
      if (!raw || !raw.trim()) return;
      const data = parseImportInput(raw);
      if (!data || !data.di_cfg) throw new Error('Некорректные данные.');
      const { data: store } = await loadProfiles();
      let name = (data.name || 'Импортированный профиль').trim();
      const exists = new Set(store.items.map(p => p.name));
      let n = 2;
      while (exists.has(name)) { name = (data.name || 'Импортированный профиль') + ' ' + (n++); }
          const item = { id: uuid(), name, di_cfg: data.di_cfg, defaultCollapseMode: data.defaultCollapseMode || DEFAULT_COLLAPSE_MODE, defaultFormat: (data.defaultFormat === 'plain' ? 'keen' : (data.defaultFormat || DEFAULT_FORMAT)), defaultDomainFilter: data.defaultDomainFilter || DEFAULT_DOMAIN_FILTER };
      store.items.push(item);
      store.activeId = item.id;
      await saveProfiles(store);
      renderProfilesSelect(store);
      await applyProfile(item);
      
      showSaved();
      saveState.textContent = `Профиль «${name}» импортирован ✓`;
      saveState.classList.add('ok');
      setTimeout(() => {
        saveState.textContent = 'Изменений нет';
        saveState.classList.remove('ok');
      }, 3000);
    } catch (e) {
      saveState.textContent = `Ошибка импорта: ${e?.message || e}`;
      saveState.classList.remove('ok');
      setTimeout(() => {
        saveState.textContent = 'Изменений нет';
      }, 3000);
    }
  });

  try {
    const h = location.hash || '';
    const m = h.match(/#import=([^&]+)/);
    if (m && m[1]) {
      const importHash = m[1];
      
      try {
        const payload = decodeB64(decodeURIComponent(importHash));
        if (payload && payload.di_cfg) {
          const { data: store } = await loadProfiles();
          let name = (payload.name || 'Импортированный профиль').trim();
          const exists = new Set(store.items.map(p => p.name));
          let n = 2;
          while (exists.has(name)) { name = (payload.name || 'Импортированный профиль') + ' ' + (n++); }
          const item = { id: uuid(), name, di_cfg: payload.di_cfg, defaultCollapseMode: payload.defaultCollapseMode || DEFAULT_COLLAPSE_MODE, defaultFormat: (payload.defaultFormat === 'plain' ? 'keen' : (payload.defaultFormat || DEFAULT_FORMAT)), defaultDomainFilter: payload.defaultDomainFilter || DEFAULT_DOMAIN_FILTER };
          store.items.push(item);
          store.activeId = item.id;
          await saveProfiles(store);
          renderProfilesSelect(store);
          await applyProfile(item);
          
          history.replaceState(null, '', location.pathname);
          
          showSaved();
          saveState.textContent = `Профиль «${name}» импортирован ✓`;
          saveState.classList.add('ok');
          setTimeout(() => {
            saveState.textContent = 'Изменений нет';
            saveState.classList.remove('ok');
          }, 3000);
        }
      } catch (e) {
        history.replaceState(null, '', location.pathname);
        saveState.textContent = `Ошибка импорта: ${e?.message || e}`;
        saveState.classList.remove('ok');
        setTimeout(() => {
          saveState.textContent = 'Изменений нет';
        }, 3000);
      }
    }
  } catch (e) {
    console.error(e);
  }

  const list = await loadKeenHosts();
  renderKeenList(list);

  keenElems.addBtn?.addEventListener('click', async () => {
    keenElems.addBtn.disabled = true;
    keenElems.addState.textContent = editingRouterId ? 'Сохраняем изменения…' : 'Сохраняем…';
    try {
      const { name, origin, user, pass } = validateKeenInput();
      const cur = await loadKeenHosts();
      
      let item;
      if (editingRouterId) {
        const existing = cur.find(x => x.id === editingRouterId);
        if (existing) {
          item = { ...existing, name, origin, user, pass };
          keenElems.addState.textContent = 'Проверяю доступность…';
          try {
            await keenProbe(item);
            item.lastOk = true;
            item.lastOkTs = Date.now();
            item.lastErr = '';
          } catch (e) {
            if (existing.lastOk !== undefined) {
              item.lastOk = existing.lastOk;
              item.lastOkTs = existing.lastOkTs;
              item.lastErr = existing.lastErr;
            } else {
              item.lastOk = false;
              item.lastErr = String(e?.message || e || 'Ошибка');
            }
          }
          const index = cur.findIndex(x => x.id === editingRouterId);
          cur[index] = item;
        } else {
          throw new Error('Роутер для редактирования не найден');
        }
      } else {
        item = { id: uuid(), name, origin, user, pass, lastOk: null, lastOkTs: 0, lastErr: '' };
        keenElems.addState.textContent = 'Пробный запрос к CLI…';
        try {
          await keenProbe(item);
          item.lastOk = true;
          item.lastOkTs = Date.now();
        } catch (e) {
          item.lastOk = false;
          item.lastErr = String(e?.message || e || 'Ошибка');
        }
        cur.push(item);
      }

      await saveKeenHosts(cur);
      renderKeenList(cur);

      keenElems.addState.textContent = editingRouterId 
        ? (item.lastOk ? 'Изменения сохранены ✓' : 'Изменения сохранены ✓ (CLI недоступен)')
        : (item.lastOk ? 'Добавлено ✓ (CLI доступен)' : 'Добавлено ✓ (но CLI не ответил)');
      keenElems.addState.classList.toggle('ok', true);

      resetKeenForm();
    } catch (e) {
      keenElems.addState.textContent = String(e?.message || e || 'Ошибка');
      keenElems.addState.classList.toggle('ok', false);
    } finally {
      setTimeout(() => { keenElems.addState.textContent = '—'; keenElems.addState.classList.remove('ok'); }, 2500);
      keenElems.addBtn.disabled = false;
    }
  });

  if (keenElems.cancelBtn) {
    keenElems.cancelBtn.addEventListener('click', () => {
      resetKeenForm();
    });
  }

  const passwordToggle = document.getElementById('keenPassToggle');
  if (passwordToggle && keenElems.pass) {
    passwordToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isPassword = keenElems.pass.type === 'password';
      keenElems.pass.type = isPassword ? 'text' : 'password';
      
      const eyeOpen = passwordToggle.querySelector('.eye-open');
      const eyeClosed = passwordToggle.querySelector('.eye-closed');
      
      if (isPassword) {
        if (eyeOpen) eyeOpen.style.display = 'none';
        if (eyeClosed) eyeClosed.style.display = 'block';
        passwordToggle.setAttribute('aria-label', 'Скрыть пароль');
        passwordToggle.setAttribute('title', 'Скрыть пароль');
      } else {
        if (eyeOpen) eyeOpen.style.display = 'block';
        if (eyeClosed) eyeClosed.style.display = 'none';
        passwordToggle.setAttribute('aria-label', 'Показать пароль');
        passwordToggle.setAttribute('title', 'Показать пароль');
      }
    });
  }
});

