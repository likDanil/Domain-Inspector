document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyBtn');
  const sendBtn = document.getElementById('sendKeeneticBtn');
  const domainsPre = document.getElementById('domains');
  const scanFormat = document.getElementById('scanFormat');
  const scanCollapseMode = document.getElementById('scanCollapseMode');
  const themeBtn = document.getElementById('themeBtn');
  const donateBtn = document.getElementById('donateBtn');
  const groupLabel = document.getElementById('groupLabel');
  const domainsCount = document.getElementById('domainsCount');
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
    const scan = mode === 'scan';
    tabScan.setAttribute('aria-selected', scan ? 'true' : 'false');
    tabConvert.setAttribute('aria-selected', scan ? 'false' : 'true');
    paneScan.classList.toggle('active', scan);
    paneConvert.classList.toggle('active', !scan);
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

  function convert(domains, mode) {
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

    if (mode === 'none') {
      const out = [];
      const seen = new Set();
      for (const h of domains.map(cleanHost)) {
        if (h && !seen.has(h)) { seen.add(h); out.push(h); }
      }
      return out;
    }

    if (mode === 'all') {
      const out = [];
      for (const [base] of groups.entries()) {
        if (!out.includes(base)) out.push(base);
      }
      return out;
    }

    const keep = new Set();
    for (const [base, g] of groups.entries()) {
      if (g.subs.size >= 2) keep.add(base);
      for (const h of g.all) {
        if (!isSubdomainOf(h, base)) keep.add(h);
        else if (g.subs.size < 2) keep.add(h);
      }
    }
    const out = [];
    for (const h of domains.map(cleanHost)) if (h && keep.has(h) && !out.includes(h)) out.push(h);
    for (const [base, g] of groups.entries()) {
      if (g.subs.size >= 2 && !out.includes(base)) out.push(base);
    }
    return out;
  }

  function formatOutput(list, mode) {
    return mode === 'adguard' ? list.join(',') : list.join('\n');
  }

  function ruPlural(n, forms = ['домен','домена','доменов']) {
    const a = Math.abs(n);
    const n10 = a % 10, n100 = a % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
    return forms[2];
  }

  let lastRaw = [];
  let lastScanOut = [];
  copyBtn.style.display = 'none';
  sendBtn.style.display = 'none';
  sendBtn.disabled = true;

  function updateButtonsVisibility(out) {
    const has = (out && out.length) ? true : false;
    copyBtn.style.display = has ? 'inline-flex' : 'none';
    const keenSelected = (scanFormat.value === 'keen');
    sendBtn.style.display = (has && keenSelected) ? 'inline-flex' : 'none';
    sendBtn.disabled = true;
  }

  function applyOutput() {
    if (!lastRaw.length) {
      domainsPre.textContent = 'Не найдено доменов. Попробуйте позже.';
      domainsCount.textContent = '0 доменов';
      updateButtonsVisibility([]);
      return;
    }
    const out = convert(lastRaw, scanCollapseMode.value || 'auto');
    lastScanOut = out;
    domainsPre.textContent = formatOutput(out, scanFormat.value);
    domainsCount.textContent = `${out.length} ${ruPlural(out.length)}`;
    updateButtonsVisibility(out);
  }

  async function runScan() {
    domainsPre.textContent = '🔍 Сканирование...';
    domainsCount.textContent = '';
    updateButtonsVisibility([]);
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      let host = '';
      try { host = new URL(tabs[0].url).hostname; } catch (_) {}
      groupLabel.textContent = host ? `Группа: ${host}` : 'Группа: —';

      const response = await sendMessage(tabs[0].id, { action: 'getDomains' });
      const raw = (response && response.domains) || [];
      lastRaw = raw.map(cleanHost).filter(Boolean);
      applyOutput();
    } catch (err) {
      domainsPre.textContent = '❌ Не удалось получить данные. Перезагрузите страницу и попробуйте снова.';
      domainsCount.textContent = '';
      updateButtonsVisibility([]);
    }
  }

  scanFormat.addEventListener('change', applyOutput);
  if (scanCollapseMode) scanCollapseMode.addEventListener('change', applyOutput);

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(domainsPre.textContent || '').then(() => {
      copyBtn.textContent = '✅ Скопировано';
      setTimeout(() => (copyBtn.textContent = 'Скопировать все домены'), 1200);
    });
  });

  const convertInput        = document.getElementById('convertInput');
  const convertOutput       = document.getElementById('convertOutput');
  const copyConvertBtn      = document.getElementById('copyConvertBtn');
  const convertFormat       = document.getElementById('convertFormat');
  const convertCollapseMode = document.getElementById('convertCollapseMode');
  const sendConvertBtn      = document.getElementById('sendKeeneticBtnConvert');

  let lastConvertOut = [];
  convertOutput.style.display = 'none';
  copyConvertBtn.style.display = 'none';
  sendConvertBtn.style.display = 'none';
  sendConvertBtn.disabled = true;

  function tokenizeFlexible(raw) {
    const noSchemes = (raw || '').replace(/\b[a-z]{2,20}:\/\/+/gi, '');
    const normalized = noSchemes.replace(/[^a-zA-Z0-9.\-]+/g, ' ').replace(/\s+/g, '\n').trim();
    return normalized ? normalized.split('\n') : [];
  }

  function updateConvertButtonsVisibility(out) {
    const has = (out && out.length) ? true : false;
    copyConvertBtn.style.display = has ? 'inline-flex' : 'none';
    const keenSelected = (convertFormat.value === 'keen');
    sendConvertBtn.style.display = (has && keenSelected) ? 'inline-flex' : 'none';
    sendConvertBtn.disabled = true;
  }

  function runConvert() {
    const tokens = tokenizeFlexible(convertInput.value);
    const list = [];
    const seen = new Set();
    for (const t of tokens) {
      const h = cleanHost(t);
      if (h && !seen.has(h)) { seen.add(h); list.push(h); }
    }
    const converted = convert(list, (convertCollapseMode && convertCollapseMode.value) || 'auto');
    lastConvertOut = converted;

    if (converted.length > 0) {
      convertOutput.textContent = formatOutput(converted, convertFormat.value);
      convertOutput.style.display = 'block';
    } else {
      convertOutput.textContent = '';
      convertOutput.style.display = 'none';
    }
    updateConvertButtonsVisibility(converted);
  }

  convertInput.addEventListener('input', runConvert);
  if (convertCollapseMode) convertCollapseMode.addEventListener('change', runConvert);
  convertFormat.addEventListener('change', () => {
    if (lastConvertOut.length > 0) convertOutput.textContent = formatOutput(lastConvertOut, convertFormat.value);
    updateConvertButtonsVisibility(lastConvertOut);
  });

  runScan();
});
