chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDomains") {
        const domains = [...new Set(
            performance.getEntriesByType('resource').map(r => {
                try {
                    return new URL(r.name).hostname;
                } catch (e) {
                    return null;
                }
            }).filter(Boolean)
        )].sort();

        sendResponse({ domains });
    }
});