(() => {
  if (window.__diInjected) return;
  window.__diInjected = 1;

  let CFG = {
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

  window.addEventListener("message", (e) => {
    if (e && e.source === window && e.data && e.data.type === "di_cfg" && e.data.cfg) {
      try { CFG = { ...CFG, ...(e.data.cfg || {}) }; } catch {}
    }
  }, false);

  const postHost = (host) => {
    if (!host) return;
    try {
      window.postMessage({ type: "di_host_found", host: String(host) }, "*");
    } catch {}
  };

  const addFromUrl = (u, base) => {
    try {
      const raw = (u && typeof u === "object" && "url" in u) ? u.url : u;
      const h = new URL(raw, base || location.href).hostname;
      if (h) postHost(h);
    } catch {}
  };

  try {
    if (CFG.enableFetch && window.fetch) {
      const _fetch = window.fetch.bind(window);
      window.fetch = function (input, init) { addFromUrl(input); return _fetch(input, init); };
    }
  } catch {}

  try {
    if (CFG.enableXHR && window.XMLHttpRequest) {
      const _open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        addFromUrl(url);
        return _open.call(this, method, url, ...rest);
      };
    }
  } catch {}

  try {
    if (CFG.enableBeacon && navigator.sendBeacon) {
      const _sb = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url, data) { addFromUrl(url); return _sb(url, data); };
    }
  } catch {}

  try {
    if (CFG.enableWebSocket && window.WebSocket) {
      const _WS = window.WebSocket;
      function WS(url, protocols) { addFromUrl(url); return new _WS(url, protocols); }
      WS.prototype = _WS.prototype; WS.prototype.constructor = WS;
      window.WebSocket = WS;
    }
  } catch {}

  try {
    if (CFG.enableEventSource && window.EventSource) {
      const _ES = window.EventSource;
      function ES(url, conf) { addFromUrl(url); return new _ES(url, conf); }
      ES.prototype = _ES.prototype; ES.prototype.constructor = ES;
      window.EventSource = ES;
    }
  } catch {}

  try {
    if (CFG.enableWorker && window.Worker) {
      const _Worker = window.Worker;
      function W(url, opts){ addFromUrl(url); return new _Worker(url, opts); }
      W.prototype = _Worker.prototype; W.prototype.constructor = W;
      window.Worker = W;
    }
  } catch {}

  try {
    if (CFG.enableSharedWorker && window.SharedWorker) {
      const _SWorker = window.SharedWorker;
      function SW(url, opts){ addFromUrl(url); return new _SWorker(url, opts); }
      SW.prototype = _SWorker.prototype; SW.prototype.constructor = SW;
      window.SharedWorker = SW;
    }
  } catch {}

  try {
    if (CFG.enableWebRTC && (window.RTCPeerConnection || window.webkitRTCPeerConnection)) {
      const _PC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
      function scanIceServers(cfg) {
        try {
          const list = (cfg && (cfg.iceServers || cfg.iceservers || cfg.iceservers)) || [];
          for (const s of list) {
            const urls = (s && (s.urls || s.url)) || [];
            const arr = Array.isArray(urls) ? urls : [urls];
            for (const u of arr) addFromUrl(u);
          }
        } catch {}
      }
      function PC(cfg, ...rest) {
        scanIceServers(cfg);
        try {
          const pc = new _PC(cfg, ...rest);
          const _setCfg = pc.setConfiguration && pc.setConfiguration.bind(pc);
          if (_setCfg) {
            pc.setConfiguration = (c) => { scanIceServers(c); return _setCfg(c); };
          }
          return pc;
        } catch {
          return new _PC(cfg, ...rest);
        }
      }
      PC.prototype = _PC.prototype; PC.prototype.constructor = PC;
      window.RTCPeerConnection = PC;
      if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = PC;
    }
  } catch {}

  try {
    if (CFG.enablePOResource && "PerformanceObserver" in window) {
      const po = new PerformanceObserver(list => {
        for (const r of list.getEntries()) addFromUrl(r.name);
      });
      po.observe({ entryTypes: ["resource"] });
    }
  } catch {}

  try {
    if (CFG.enableCSPViolation) {
      window.addEventListener("securitypolicyviolation", (e) => {
        if (e?.blockedURI) addFromUrl(e.blockedURI);
      }, true);
    }
  } catch {}
})();