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
  
  Array.from(selectElement.options).forEach((option) => {
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
  };
  
  return wrapper;
}

function initAllCustomSelects() {
  document.querySelectorAll('select:not(.hidden-select)').forEach(select => {
    if (!select.dataset.customized) {
      initCustomSelect(select);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyBtn');
  const sendBtn = document.getElementById('sendKeeneticBtn');
  const domainsPre = document.getElementById('domains');
  const scanFormat = document.getElementById('scanFormat');
  const scanCollapseMode = document.getElementById('scanCollapseMode');
  const scanDomainFilter = document.getElementById('scanDomainFilter');
  const themeBtn = document.getElementById('themeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const donateBtn = document.getElementById('donateBtn');
  const groupLabel = document.getElementById('groupLabel');
  const domainsCount = document.getElementById('domainsCount');
  const body = document.body;
  
  // Settings button
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const url = chrome.runtime.getURL('options.html');
      chrome.tabs.create({ url });
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
    if (theme === 'light') {
      body.classList.add('light');
      if (themeBtn) themeBtn.textContent = '☀️';
    } else {
      body.classList.remove('light');
      if (themeBtn) themeBtn.textContent = '🌙';
    }
  }

  async function initTheme() {
    const currentTheme = await loadTheme();
    await applyTheme(currentTheme);
    
    if (themeBtn) {
      themeBtn.addEventListener('click', async () => {
        const currentTheme = await loadTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        await saveTheme(newTheme);
        await applyTheme(newTheme);
      });
    }
  }
  
  initTheme();

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

  function isIPAddress(str) {
    const parts = str.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && String(num) === part;
    });
  }

  function getBaseDomain(host) {
    const h = cleanHost(host);
    if (!h) return '';
    
    if (isIPAddress(h)) {
      return h;
    }
    
    if (typeof window.tldts !== 'undefined') {
      const domain = tldts.getDomain(h, { allowPrivateDomains: true });
      return domain || h;
    }
    const parts = h.split('.').filter(Boolean);
    return parts.length <= 2 ? h : parts.slice(-2).join('.');
  }

  function isSubdomainOf(host, base) {
    if (isIPAddress(host) || isIPAddress(base)) {
      return false;
    }
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
  let lastRawWithStatus = [];
  let lastScanOut = [];
  let scanError = false;
  copyBtn.style.display = 'none';
  sendBtn.style.display = 'none';
  sendBtn.disabled = true;

  function updateButtonsVisibility(out) {
    const has = (out && out.length) ? true : false;
    copyBtn.style.display = has ? 'inline-flex' : 'none';
    const keenSelected = (scanFormat.value === 'keen');
    sendBtn.style.display = (has && keenSelected) ? 'inline-flex' : 'none';
    sendBtn.disabled = !(has && keenSelected);
  }

  function filterDomains(domains, domainsWithStatus, filterMode) {
    if (filterMode === 'all') {
      return domains;
    }
    
    const statusMap = new Map();
    domainsWithStatus.forEach(item => {
      statusMap.set(item.domain, item);
    });
    
    const checkDomainStatus = (domain) => {
      const domainStatus = statusMap.get(domain);
      const domainHasResponse = domainStatus && domainStatus.hasResponse;
      
      let hasSubdomainWithResponse = false;
      let hasSubdomainWithoutResponse = false;
      
      for (const [fullDomain, status] of statusMap.entries()) {
        if (isSubdomainOf(fullDomain, domain)) {
          if (status && status.hasResponse) {
            hasSubdomainWithResponse = true;
          } else {
            hasSubdomainWithoutResponse = true;
          }
        }
      }
      
      const hasResponse = domainHasResponse || hasSubdomainWithResponse;
      
      return { hasResponse, hasSubdomainWithResponse, hasSubdomainWithoutResponse };
    };
    
    if (filterMode === 'withResponse') {
      return domains.filter(domain => {
        const status = checkDomainStatus(domain);
        return status.hasResponse;
      });
    } else if (filterMode === 'withoutResponse') {
      return domains.filter(domain => {
        const status = checkDomainStatus(domain);
        return !status.hasResponse;
      });
    }
    
    return domains;
  }

  function applyOutput() {
    if (!lastRaw.length) {
      if (scanError) {
        domainsPre.textContent = '❌ Не удалось получить данные. Перезагрузите страницу и попробуйте снова.';
        domainsCount.textContent = '';
      } else {
        domainsPre.textContent = 'Не найдено доменов. Попробуйте позже.';
        domainsCount.textContent = '0 доменов';
      }
      updateButtonsVisibility([]);
      return;
    }
    
    const collapseMode = (scanCollapseMode && scanCollapseMode.value) || 'auto';
    const collapsedDomains = convert(lastRaw, collapseMode);
    
    const filterMode = (scanDomainFilter && scanDomainFilter.value) || 'all';
    const out = filterDomains(collapsedDomains, lastRawWithStatus, filterMode);
    
    lastScanOut = out;
    domainsPre.textContent = formatOutput(out, scanFormat.value);
    domainsCount.textContent = `${out.length} ${ruPlural(out.length)}`;
    updateButtonsVisibility(out);
  }

  async function runScan() {
    domainsPre.textContent = '🔍 Сканирование...';
    domainsCount.textContent = '';
    updateButtonsVisibility([]);
    scanError = false;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      let host = '';
      try { host = new URL(tabs[0].url).hostname; } catch (_) {}
      groupLabel.textContent = host ? `Группа: ${host}` : 'Группа: —';

      const response = await sendMessage(tabs[0].id, { action: 'getDomains' });
      const raw = (response && response.domains) || [];
      lastRaw = raw.map(cleanHost).filter(Boolean);
      const rawWithStatus = (response && response.domainsWithStatus) || [];
      lastRawWithStatus = rawWithStatus.map(item => ({
        ...item,
        domain: cleanHost(item.domain)
      })).filter(item => item.domain);
      scanError = false;
      applyOutput();
    } catch (err) {
      scanError = true;
      lastRaw = [];
      lastRawWithStatus = [];
      domainsPre.textContent = '❌ Не удалось получить данные. Перезагрузите страницу и попробуйте снова.';
      domainsCount.textContent = '';
      updateButtonsVisibility([]);
    }
  }

  chrome.storage.sync.get({ defaultCollapseMode: 'auto', defaultFormat: 'keen', defaultDomainFilter: 'all' }, (res) => {
    const defCollapse = res.defaultCollapseMode || 'auto';
    let defFormat = res.defaultFormat || 'keen';
    if (defFormat === 'plain') { defFormat = 'keen'; chrome.storage.sync.set({ defaultFormat: defFormat }); }
    const defFilter = res.defaultDomainFilter || 'all';
    if (scanCollapseMode) scanCollapseMode.value = defCollapse;
    const convertCollapseMode = document.getElementById('convertCollapseMode');
    if (convertCollapseMode) convertCollapseMode.value = defCollapse;
    if (scanFormat) scanFormat.value = defFormat;
    const convertFormat = document.getElementById('convertFormat');
    if (convertFormat) convertFormat.value = defFormat;
    if (scanDomainFilter) scanDomainFilter.value = defFilter;
    
    setTimeout(() => {
      initAllCustomSelects();
      document.querySelectorAll('select.hidden-select').forEach(sel => {
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
    }, 50);
    
    runScan();
    runConvert();
  });

  scanFormat.addEventListener('change', applyOutput);
  if (scanCollapseMode) scanCollapseMode.addEventListener('change', applyOutput);
  if (scanDomainFilter) scanDomainFilter.addEventListener('change', applyOutput);

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(domainsPre.textContent || '').then(() => {
      copyBtn.textContent = '✅ Скопировано';
      setTimeout(() => (copyBtn.textContent = 'Скопировать все домены'), 1200);
    });
  });

  sendBtn.addEventListener('click', async () => {
    if (!lastScanOut || !lastScanOut.length) return;
    
    let groupName = '';
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url) {
        const host = new URL(tabs[0].url).hostname;
        if (host) {
          const parts = host.split('.').filter(Boolean);
          groupName = parts.length <= 2 ? host : parts.slice(-2).join('.');
        }
      }
    } catch (_) {}
    
    if (!groupName && lastScanOut.length > 0) {
      const firstDomain = lastScanOut[0];
      const parts = firstDomain.split('.').filter(Boolean);
      groupName = parts.length <= 2 ? firstDomain : parts.slice(-2).join('.');
    }
    
    await chrome.storage.session.set({
      keen_payload: {
        domains: lastScanOut,
        group: groupName || 'group'
      }
    });
    
    const url = chrome.runtime.getURL('keen-send.html');
    chrome.tabs.create({ url });
  });

  const convertInput        = document.getElementById('convertInput');
  const convertOutput       = document.getElementById('convertOutput');
  const copyConvertBtn      = document.getElementById('copyConvertBtn');
  const convertFormat       = document.getElementById('convertFormat');
  const convertCollapseMode = document.getElementById('convertCollapseMode');
  const sendConvertBtn      = document.getElementById('sendKeeneticBtnConvert');

  copyConvertBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(convertOutput.textContent || '').then(() => {
      copyConvertBtn.textContent = '✅ Скопировано';
      setTimeout(() => (copyConvertBtn.textContent = '📋 Скопировать результат'), 1200);
    });
  });

  sendConvertBtn.addEventListener('click', async () => {
    if (!lastConvertOut || !lastConvertOut.length) return;
    
    let groupName = 'group';
    if (lastConvertOut.length > 0) {
      const firstDomain = lastConvertOut[0];
      const parts = firstDomain.split('.').filter(Boolean);
      groupName = parts.length <= 2 ? firstDomain : parts.slice(-2).join('.');
    }
    
    await chrome.storage.session.set({
      keen_payload: {
        domains: lastConvertOut,
        group: groupName
      }
    });
    
    const url = chrome.runtime.getURL('keen-send.html');
    chrome.tabs.create({ url });
  });

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
    sendConvertBtn.disabled = !(has && keenSelected);
  }

  function runConvert() {
    const input = convertInput.value.trim();
    const list = [];
    const seen = new Set();
    
    // First, extract URL-like strings (with scheme or domain with path/query)
    // This regex matches URLs with scheme OR domains that contain / or ?
    const urlLikePattern = /(https?|ftps?|ws|wss):\/\/[^\s,;|\n]+|[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(?:\/[^\s,;|\n]+|\?[^\s,;|\n]+)/g;
    const urlMatches = [];
    let match;
    while ((match = urlLikePattern.exec(input)) !== null) {
      urlMatches.push({ text: match[0], index: match.index });
    }
    
    // Remove matched URLs from input to process remaining text
    let remainingInput = input;
    for (let i = urlMatches.length - 1; i >= 0; i--) {
      const matchText = urlMatches[i].text;
      const matchIndex = urlMatches[i].index;
      remainingInput = remainingInput.substring(0, matchIndex) + 
                       ' '.repeat(matchText.length) + 
                       remainingInput.substring(matchIndex + matchText.length);
    }
    
    // Process URL matches
    for (const match of urlMatches) {
      const h = cleanHost(match.text);
      if (h && !seen.has(h)) { seen.add(h); list.push(h); }
    }
    
    // Process remaining content (split by separators and tokenize)
    if (remainingInput.trim()) {
      const parts = remainingInput.split(/[,;|\n]+/).map(p => p.trim()).filter(p => p);
      for (const part of parts) {
        const tokens = tokenizeFlexible(part);
        for (const t of tokens) {
          const h = cleanHost(t);
          if (h && !seen.has(h)) { seen.add(h); list.push(h); }
        }
      }
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

});
