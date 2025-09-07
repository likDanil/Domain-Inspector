const domains = new Set();

const originalFetch = window.fetch;
window.fetch = function(...args) {
    try {
        const url = new URL(args[0]);
        domains.add(url.hostname);
    } catch (e) {}
    return originalFetch.apply(this, args);
};

const XHRopen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
    try {
        const reqUrl = new URL(url, window.location.href);
        domains.add(reqUrl.hostname);
    } catch (e) {}
    return XHRopen.apply(this, arguments);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDomains") {
        performance.getEntriesByType('resource').forEach(r => {
            try {
                const url = new URL(r.name);
                domains.add(url.hostname);
            } catch (e) {}
        });

        sendResponse({ domains: Array.from(domains).sort() });
    }
});