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

let CFG = { ...DEFAULT_CFG };
const domains = new Set();
const domainStatuses = new Map(); // Map<domain, {hasResponse: boolean, hasError: boolean}>

function addFromUrl(u, base) {
  try {
    const raw = (u && typeof u === "object" && "url" in u) ? u.url : u;
    if (!raw || typeof raw !== 'string') return;
    
    const rawLower = raw.toLowerCase().trim();
    if (rawLower.startsWith('chrome-extension://') ||
        rawLower.startsWith('moz-extension://') ||
        rawLower.startsWith('edge-extension://') ||
        rawLower.startsWith('safari-extension://') ||
        rawLower.startsWith('chrome://') ||
        rawLower.startsWith('chrome-search://') ||
        rawLower.startsWith('about:') ||
        rawLower.startsWith('data:') ||
        rawLower.startsWith('blob:') ||
        rawLower.startsWith('file://') ||
        rawLower.startsWith('javascript:') ||
        rawLower.startsWith('vbscript:')) {
      return;
    }
    
    const url = new URL(raw, base || location.href);
    const h = url.hostname;
    
    if (!h || h === '' || url.protocol === 'chrome-extension:' || 
        url.protocol === 'moz-extension:' || url.protocol === 'edge-extension:' ||
        url.protocol === 'chrome:' || url.protocol === 'about:' ||
        url.protocol === 'data:' || url.protocol === 'blob:' ||
        url.protocol === 'file:') {
      return;
    }
    
    const host = h.toLowerCase();
    domains.add(host);
    if (!domainStatuses.has(host)) {
      domainStatuses.set(host, { hasResponse: false, hasError: false });
    }
  } catch {}
}

function updateDomainStatus(host, hasResponse, hasError) {
  if (!host) return;
  const hostLower = String(host).toLowerCase();
  const current = domainStatuses.get(hostLower) || { hasResponse: false, hasError: false };
  domainStatuses.set(hostLower, {
    hasResponse: current.hasResponse || hasResponse,
    hasError: current.hasError || hasError
  });
}

window.addEventListener("message", (e) => {
  if (e && e.source === window && e.data) {
    if (e.data.type === "di_host_found" && e.data.host) {
      try {
        const host = String(e.data.host).toLowerCase();
        domains.add(host);
        if (!domainStatuses.has(host)) {
          domainStatuses.set(host, { hasResponse: false, hasError: false });
        }
      } catch {}
    } else if (e.data.type === "di_domain_status" && e.data.host) {
      try {
        updateDomainStatus(e.data.host, e.data.hasResponse || false, e.data.hasError || false);
      } catch {}
    } else if (e.data.type === "di_cfg" && e.data.cfg) {
      try {
        const newCfg = { ...CFG, ...(e.data.cfg || {}) };
        const htmlChanged = CFG.enableHTMLElements !== newCfg.enableHTMLElements;
        const dnsChanged = CFG.enableDNSPrefetch !== newCfg.enableDNSPrefetch;
        CFG = newCfg;
        if (htmlChanged) {
          if (CFG.enableHTMLElements) {
            scanHTMLElements();
            startHTMLElementsObserver();
          } else {
            stopHTMLElementsObserver();
          }
        }
        if (dnsChanged) {
          if (CFG.enableDNSPrefetch) {
            scanDNSPrefetch();
            startDNSPrefetchObserver();
          } else {
            stopDNSPrefetchObserver();
          }
        }
        if (CFG.enableCSSResources && !htmlChanged && !dnsChanged) {
          scanCSSResources();
        }
        if (CFG.enableManifest && !htmlChanged && !dnsChanged) {
          scanManifest();
        }
      } catch {}
    }
  }
}, false);

function injectPagePatch() {
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("page-patch.js");
    s.async = false;
    (document.documentElement || document.head || document.body).appendChild(s);

    const sendCfg = () => window.postMessage({ type: "di_cfg", cfg: CFG }, "*");
    s.addEventListener("load", sendCfg);
    setTimeout(sendCfg, 50);
  } catch {}
}

function scanHTMLElements() {
  if (!CFG.enableHTMLElements) return;
  try {
    const selectors = [
      'img[src]', 'iframe[src]', 'script[src]', 'link[href]', 
      'video[src]', 'audio[src]', 'source[src]', 'track[src]',
      'embed[src]', 'object[data]', 'form[action]', 'a[href]',
      'area[href]', 'base[href]'
    ];
    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          const url = el.src || el.href || el.data || el.action;
          if (url) addFromUrl(url);
        });
      } catch {}
    });
    try {
      document.querySelectorAll('img[srcset], source[srcset]').forEach(el => {
        const srcset = el.getAttribute('srcset');
        if (srcset) {
          srcset.split(',').forEach(entry => {
            const url = entry.trim().split(/\s+/)[0];
            if (url) addFromUrl(url);
          });
        }
      });
    } catch {}
  } catch {}
}

function scanDNSPrefetch() {
  if (!CFG.enableDNSPrefetch) return;
  try {
    document.querySelectorAll('link[rel="dns-prefetch"], link[rel="preconnect"]').forEach(link => {
      const href = link.href || link.getAttribute('href');
      if (href) {
        try {
          if (href.startsWith('//')) {
            addFromUrl('http:' + href);
          } else if (!href.includes('://')) {
            addFromUrl('http://' + href);
          } else {
            addFromUrl(href);
          }
        } catch {}
      }
    });
  } catch {}
}

function scanCSSResources() {
  if (!CFG.enableCSSResources) return;
  try {
    document.querySelectorAll('style').forEach(styleEl => {
      const css = styleEl.textContent || styleEl.innerHTML;
      if (css) {
        const urlMatches = css.match(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
        if (urlMatches) {
          urlMatches.forEach(match => {
            const urlMatch = match.match(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/i);
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1].trim();
              if (url && !url.startsWith('data:') && !url.startsWith('#')) {
                addFromUrl(url);
              }
            }
          });
        }
        const importMatches = css.match(/@import\s+['"]([^'"]+)['"]/gi);
        if (importMatches) {
          importMatches.forEach(match => {
            const importMatch = match.match(/@import\s+['"]([^'"]+)['"]/i);
            if (importMatch && importMatch[1]) {
              const url = importMatch[1].trim();
              if (url && !url.startsWith('data:')) {
                addFromUrl(url);
              }
            }
          });
        }
      }
    });
    document.querySelectorAll('[style]').forEach(el => {
      const style = el.getAttribute('style');
      if (style) {
        const urlMatches = style.match(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
        if (urlMatches) {
          urlMatches.forEach(match => {
            const urlMatch = match.match(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/i);
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1].trim();
              if (url && !url.startsWith('data:') && !url.startsWith('#')) {
                addFromUrl(url);
              }
            }
          });
        }
      }
    });
  } catch {}
}

function scanManifest() {
  if (!CFG.enableManifest) return;
  try {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const manifestUrl = manifestLink.href || manifestLink.getAttribute('href');
      if (manifestUrl) {
        addFromUrl(manifestUrl);
        fetch(manifestUrl).then(r => r.json()).then(manifest => {
          try {
            if (manifest.start_url) addFromUrl(manifest.start_url);
            if (manifest.icons && Array.isArray(manifest.icons)) {
              manifest.icons.forEach(icon => {
                if (icon.src) addFromUrl(icon.src);
              });
            }
            if (manifest.screenshots && Array.isArray(manifest.screenshots)) {
              manifest.screenshots.forEach(screenshot => {
                if (screenshot.src) addFromUrl(screenshot.src);
              });
            }
          } catch {}
        }).catch(() => {});
      }
    }
  } catch {}
}

let htmlObserver = null;
let dnsObserver = null;

function startHTMLElementsObserver() {
  if (!CFG.enableHTMLElements || htmlObserver) return;
  try {
    htmlObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const url = node.src || node.href || node.data || node.action;
            if (url) addFromUrl(url);
            const srcset = node.getAttribute && node.getAttribute('srcset');
            if (srcset) {
              srcset.split(',').forEach(entry => {
                const url = entry.trim().split(/\s+/)[0];
                if (url) addFromUrl(url);
              });
            }
            if (node.querySelectorAll) {
              const selectors = ['img[src]', 'iframe[src]', 'script[src]', 'link[href]', 
                                'video[src]', 'audio[src]', 'source[src]', 'track[src]',
                                'embed[src]', 'object[data]', 'form[action]'];
              selectors.forEach(sel => {
                try {
                  node.querySelectorAll(sel).forEach(el => {
                    const url = el.src || el.href || el.data || el.action;
                    if (url) addFromUrl(url);
                  });
                } catch {}
              });
              node.querySelectorAll('img[srcset], source[srcset]').forEach(el => {
                const srcset = el.getAttribute('srcset');
                if (srcset) {
                  srcset.split(',').forEach(entry => {
                    const url = entry.trim().split(/\s+/)[0];
                    if (url) addFromUrl(url);
                  });
                }
              });
            }
          }
        });
      });
    });
    htmlObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  } catch {}
}

function stopHTMLElementsObserver() {
  if (htmlObserver) {
    try {
      htmlObserver.disconnect();
      htmlObserver = null;
    } catch {}
  }
}

function startDNSPrefetchObserver() {
  if (!CFG.enableDNSPrefetch || dnsObserver) return;
  try {
    dnsObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.tagName === 'LINK') {
            const rel = node.getAttribute && node.getAttribute('rel');
            if (rel === 'dns-prefetch' || rel === 'preconnect') {
              const href = node.href || node.getAttribute('href');
              if (href) {
                try {
                  if (href.startsWith('//')) {
                    addFromUrl('http:' + href);
                  } else if (!href.includes('://')) {
                    addFromUrl('http://' + href);
                  } else {
                    addFromUrl(href);
                  }
                } catch {}
              }
            }
          }
        });
      });
    });
    dnsObserver.observe(document.head || document.documentElement, {
      childList: true,
      subtree: true
    });
  } catch {}
}

function stopDNSPrefetchObserver() {
  if (dnsObserver) {
    try {
      dnsObserver.disconnect();
      dnsObserver = null;
    } catch {}
  }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getDomains") {
    if (CFG.enablePOResource) {
      try {
        performance.getEntriesByType("resource").forEach(r => {
          addFromUrl(r.name);
          try {
            const host = new URL(r.name, location.href).hostname.toLowerCase();
            const hasResponse = (r.transferSize > 0 || r.decodedBodySize > 0 || 
                                 (r.responseStatus && r.responseStatus >= 200 && r.responseStatus < 400)) &&
                                r.duration > 0;
            const hasError = (r.responseStatus && r.responseStatus >= 400) || 
                            (r.duration > 0 && r.transferSize === 0 && r.decodedBodySize === 0 && 
                             r.responseStatus !== undefined && r.responseStatus !== 0);
            updateDomainStatus(host, hasResponse, hasError);
          } catch {}
        });
      } catch {}
    }
    scanHTMLElements();
    scanDNSPrefetch();
    scanCSSResources();
    scanManifest();
    const domainsArray = Array.from(domains).sort();
    const domainsWithStatus = domainsArray.map(domain => ({
      domain,
      hasResponse: domainStatuses.get(domain)?.hasResponse || false,
      hasError: domainStatuses.get(domain)?.hasError || false
    }));
    sendResponse({ domains: domainsArray, domainsWithStatus });
  }
});

chrome.storage?.sync?.get({ di_cfg: DEFAULT_CFG }, (res) => {
  const cfg = { ...DEFAULT_CFG, ...(res?.di_cfg || {}) };
  CFG = cfg;
  injectPagePatch();
  if (CFG.enableHTMLElements) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        scanHTMLElements();
        startHTMLElementsObserver();
      });
    } else {
      scanHTMLElements();
      startHTMLElementsObserver();
    }
  }
  if (CFG.enableDNSPrefetch) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        scanDNSPrefetch();
        startDNSPrefetchObserver();
      });
    } else {
      scanDNSPrefetch();
      startDNSPrefetchObserver();
    }
  }
  if (CFG.enableCSSResources) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanCSSResources);
    } else {
      scanCSSResources();
    }
  }
  if (CFG.enableManifest) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanManifest);
    } else {
      scanManifest();
    }
  }
});