document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyBtn');
  const domainsPre = document.getElementById('domains');
  const scanCbCollapse = document.getElementById('scanCbCollapse');
  const scanFormat = document.getElementById('scanFormat');
  const themeBtn = document.getElementById('themeBtn');
  const donateBtn = document.getElementById('donateBtn');
  const body = document.body;

  (function initTheme(){
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'light') body.classList.add('light');
    themeBtn.textContent = saved === 'light' ? '🌞' : '🌙';
    themeBtn.addEventListener('click', () => {
      const isLight = body.classList.toggle('light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      themeBtn.textContent = isLight ? '🌞' : '🌙';
    });
  })();

  donateBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://tbank.ru/cf/3So3sEyMUIm' });
  });

  const tabScan = document.getElementById('tab-scan');
  const tabConvert = document.getElementById('tab-convert');
  const paneScan = document.getElementById('mode-scan');
  const paneConvert = document.getElementById('mode-convert');

  function setMode(mode) {
    if (mode === 'scan') {
      tabScan.setAttribute('aria-selected', 'true');
      tabConvert.setAttribute('aria-selected', 'false');
      paneScan.classList.add('active');
      paneConvert.classList.remove('active');
    } else {
      tabScan.setAttribute('aria-selected', 'false');
      tabConvert.setAttribute('aria-selected', 'true');
      paneScan.classList.remove('active');
      paneConvert.classList.add('active');
    }
  }
  tabScan.addEventListener('click', () => setMode('scan'));
  tabConvert.addEventListener('click', () => setMode('convert'));

  function sendMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    });
  }

  function cleanHost(str) {
    if (!str) return '';
    let s = String(str).trim().toLowerCase();
    if (/^(https?|ftps?|socks\d?|ws|wss|ssh|mailto)$/.test(s)) return '';
    s = s.replace(/^\*/g, '').replace(/^\.+/, '');
    try { if (/^https?:\/\//i.test(s)) s = new URL(s).hostname.toLowerCase(); } catch (_) {}
    try { if (!/^https?:\/\//i.test(s)) s = new URL('http://' + s).hostname.toLowerCase(); } catch (_) {}
    s = s.split('/')[0].split('?')[0].split('#')[0];
    s = s.replace(/^www\./, '').replace(/\.+/g, '.').replace(/[^a-z0-9.-]/g, '');
    return s || '';
  }

  function getBaseDomain(host) {
    const h = cleanHost(host);
    if (!h) return '';
    if (typeof window.tldts !== 'undefined') {
      const domain = tldts.getDomain(h, { allowPrivateDomains: true });
      return domain || h;
    }
    const parts = h.split('.').filter(Boolean);
    return parts.length <= 2 ? h : parts.slice(-2).join('.');
  }

  function isSubdomainOf(host, base) {
    return host !== base && host.endsWith('.' + base);
  }

  function convert(domains, collapse) {
    const groups = new Map();
    for (const h0 of domains) {
      const h = cleanHost(h0);
      if (!h) continue;
      const base = getBaseDomain(h);
      const g = groups.get(base) || { all: new Set(), subs: new Set() };
      g.all.add(h);
      if (isSubdomainOf(h, base)) g.subs.add(h);
      groups.set(base, g);
    }
    const keep = new Set();
    for (const [base, g] of groups.entries()) {
      if (collapse && g.subs.size >= 2) keep.add(base);
      for (const h of g.all) {
        if (!collapse) keep.add(h);
        else if (!isSubdomainOf(h, base)) keep.add(h);
        else if (g.subs.size < 2) keep.add(h);
      }
    }
    const out = [];
    for (const h of domains.map(cleanHost)) if (h && keep.has(h) && !out.includes(h)) out.push(h);
    if (collapse) {
      for (const [base, g] of groups.entries()) {
        if (g.subs.size >= 2 && !out.includes(base)) out.push(base);
      }
    }
    return out;
  }

  function formatOutput(list, mode) {
    return mode === 'adguard' ? list.join(',') : list.join('\n');
  }

  let lastRaw = [];
  let lastScanOut = [];
  copyBtn.style.display = 'none';

  function applyOutput() {
    if (!lastRaw.length) {
      domainsPre.textContent = 'Не найдено доменов. Попробуйте позже.';
      copyBtn.style.display = 'none';
      return;
    }
    const out = scanCbCollapse && scanCbCollapse.checked ? convert(lastRaw, true) : lastRaw.slice();
    lastScanOut = out;
    domainsPre.textContent = formatOutput(out, scanFormat.value);
    copyBtn.style.display = out.length ? 'block' : 'none';
  }

  async function runScan() {
    domainsPre.textContent = '🔍 Сканирование...';
    copyBtn.style.display = 'none';
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await sendMessage(tabs[0].id, { action: 'getDomains' });
      const raw = (response && response.domains) || [];
      lastRaw = raw.map(cleanHost).filter(Boolean);
      applyOutput();
    } catch (err) {
      domainsPre.textContent = '❌ Не удалось получить данные. Перезагрузите страницу и попробуйте снова.';
      copyBtn.style.display = 'none';
    }
  }

  scanFormat.addEventListener('change', () => {
    if (lastScanOut.length || lastRaw.length) domainsPre.textContent = formatOutput(scanCbCollapse.checked ? convert(lastRaw, true) : lastRaw.slice(), scanFormat.value);
  });

  if (scanCbCollapse) {
    scanCbCollapse.addEventListener('change', () => applyOutput());
  }

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(domainsPre.textContent || '').then(() => {
      copyBtn.textContent = '✅ Скопировано';
      setTimeout(() => (copyBtn.textContent = '📋 Скопировать все домены'), 1200);
    });
  });

  const convertInput   = document.getElementById('convertInput');
  const cbCollapse     = document.getElementById('cbCollapse');
  const convertOutput  = document.getElementById('convertOutput');
  const copyConvertBtn = document.getElementById('copyConvertBtn');
  const convertFormat  = document.getElementById('convertFormat');

  let lastConvertOut = [];
  convertOutput.style.display = 'none';
  copyConvertBtn.style.display = 'none';

  function tokenizeFlexible(raw) {
    const noSchemes = (raw || '').replace(/\b[a-z]{2,20}:\/\/+/gi, '');
    const normalized = noSchemes.replace(/[^a-zA-Z0-9.\-]+/g, ' ').replace(/\s+/g, '\n').trim();
    return normalized ? normalized.split('\n') : [];
  }

  function runConvert() {
    const tokens = tokenizeFlexible(convertInput.value);
    const list = [];
    const seen = new Set();
    for (const t of tokens) {
      const h = cleanHost(t);
      if (h && !seen.has(h)) { seen.add(h); list.push(h); }
    }
    const converted = convert(list, cbCollapse.checked);
    lastConvertOut = converted;
    if (converted.length > 0) {
      convertOutput.textContent = formatOutput(converted, convertFormat.value);
      convertOutput.style.display = 'block';
      copyConvertBtn.style.display = 'block';
    } else {
      convertOutput.textContent = '';
      convertOutput.style.display = 'none';
      copyConvertBtn.style.display = 'none';
    }
  }

  convertInput.addEventListener('input', runConvert);
  cbCollapse.addEventListener('change', runConvert);
  convertFormat.addEventListener('change', () => {
    if (lastConvertOut.length > 0) convertOutput.textContent = formatOutput(lastConvertOut, convertFormat.value);
  });

  copyConvertBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(convertOutput.textContent || '').then(() => {
      copyConvertBtn.textContent = '✅ Скопировано';
      setTimeout(() => (copyConvertBtn.textContent = '📋 Скопировать результат'), 1200);
    });
  });

  runScan();
});
