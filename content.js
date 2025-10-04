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

let CFG = { ...DEFAULT_CFG };
const domains = new Set();

function addFromUrl(u, base) {
  try {
    const raw = (u && typeof u === "object" && "url" in u) ? u.url : u;
    const h = new URL(raw, base || location.href).hostname;
    if (h) domains.add(h.toLowerCase());
  } catch {}
}

window.addEventListener("message", (e) => {
  if (e && e.source === window && e.data && e.data.type === "di_host_found" && e.data.host) {
    try { domains.add(String(e.data.host).toLowerCase()); } catch {}
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getDomains") {
    if (CFG.enablePOResource) {
      try { performance.getEntriesByType("resource").forEach(r => addFromUrl(r.name)); } catch {}
    }
    sendResponse({ domains: Array.from(domains).sort() });
  }
});

chrome.storage?.sync?.get({ di_cfg: DEFAULT_CFG }, (res) => {
  const cfg = { ...DEFAULT_CFG, ...(res?.di_cfg || {}) };
  CFG = cfg;
  injectPagePatch();
});