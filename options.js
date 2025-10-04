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
};

const KEYS_M1 = [
  "enableFetch","enableXHR","enableBeacon","enableWebSocket",
  "enableEventSource","enableWorker","enableSharedWorker","enableWebRTC"
];
const KEYS_M2 = ["enablePOResource","enableCSPViolation"];

const $ = (id) => document.getElementById(id);
const saveState = $("saveState");

function showSaved() {
  saveState.textContent = "Сохранено ✓";
  saveState.classList.add("ok");
  setTimeout(() => { saveState.textContent = "Изменений нет"; saveState.classList.remove("ok"); }, 1500);
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
  enableCSPViolation: "Слушает события securitypolicyviolation (CSP). Показывает заблокированные политикой загрузки адреса."
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
  chrome.storage.sync.set({ di_cfg: cfg }, showSaved);
}

const keenElems = {
  url: $("keenUrl"),
  user: $("keenUser"),
  pass: $("keenPass"),
  addBtn: $("keenAddBtn"),
  addState: $("keenAddState"),
  list: $("keenList"),
};

function uuid() {
  return (crypto?.randomUUID?.() || ('xxxyxxyx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
    const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8); return v.toString(16);
  })));
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

async function loadKeenHosts() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ keen_hosts: [] }, (res) => resolve(Array.isArray(res.keen_hosts) ? res.keen_hosts : []));
  });
}
function saveKeenHosts(list) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ keen_hosts: list }, resolve);
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
    title.textContent = `${h.origin} — ${h.user}`;
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

    const btnDel = document.createElement('button');
    btnDel.className = 'btn';
    btnDel.textContent = 'Удалить';
    btnDel.onclick = async () => {
      const list = await loadKeenHosts();
      const next = list.filter(x => x.id !== h.id);
      await saveKeenHosts(next);
      renderKeenList(next);
    };

    actions.appendChild(btnTest);
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
  const origin = normalizeOrigin(keenElems.url.value);
  const user = (keenElems.user.value || '').trim();
  const pass = (keenElems.pass.value || '').trim();
  if (!origin) throw new Error('Укажите корректный адрес (http/https).');
  if (!user) throw new Error('Укажите пользователя.');
  if (!pass) throw new Error('Укажите пароль.');
  return { origin, user, pass };
}

document.addEventListener("DOMContentLoaded", async () => {
  addInfoIcons();

  const cfg = await loadCfg();
  applyUi(cfg);

  for (const k of Object.keys(DEFAULT_CFG)) {
    $(k).addEventListener("change", () => saveCfg(readUi()));
  }

  document.querySelectorAll("button[data-group]").forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.getAttribute("data-group");
      const mode = btn.getAttribute("data-mode");
      const keys = group === "m1" ? KEYS_M1 : KEYS_M2;
      const newCfg = readUi();
      keys.forEach(k => newCfg[k] = (mode === "all"));
      applyUi(newCfg);
      saveCfg(newCfg);
    });
  });

  $("btnAllOn").onclick = () => { const c = {}; for (const k in DEFAULT_CFG) c[k] = true; applyUi(c); saveCfg(c); };
  $("btnAllOff").onclick = () => { const c = {}; for (const k in DEFAULT_CFG) c[k] = false; applyUi(c); saveCfg(c); };
  $("btnDefaults").onclick = () => { const c = { ...DEFAULT_CFG }; applyUi(c); saveCfg(c); };

  const list = await loadKeenHosts();
  renderKeenList(list);

  keenElems.addBtn?.addEventListener('click', async () => {
    keenElems.addBtn.disabled = true;
    keenElems.addState.textContent = 'Сохраняем…';
    try {
      const { origin, user, pass } = validateKeenInput();
      const item = { id: uuid(), origin, user, pass, lastOk: null, lastOkTs: 0, lastErr: '' };

      keenElems.addState.textContent = 'Пробный запрос к CLI…';
      try {
        await keenProbe(item);
        item.lastOk = true; item.lastOkTs = Date.now();
      } catch (e) {
        item.lastOk = false; item.lastErr = String(e?.message || e || 'Ошибка');
      }

      const cur = await loadKeenHosts();
      cur.push(item);
      await saveKeenHosts(cur);
      renderKeenList(cur);

      keenElems.addState.textContent = item.lastOk ? 'Добавлено ✓ (CLI доступен)' : 'Добавлено ✓ (но CLI не ответил)';
      keenElems.addState.classList.toggle('ok', true);

      keenElems.url.value = '';
    } catch (e) {
      keenElems.addState.textContent = String(e?.message || e || 'Ошибка');
      keenElems.addState.classList.toggle('ok', false);
    } finally {
      setTimeout(() => { keenElems.addState.textContent = '—'; keenElems.addState.classList.remove('ok'); }, 2500);
      keenElems.addBtn.disabled = false;
    }
  });
});
