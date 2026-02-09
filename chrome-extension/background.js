// Background Service Worker - Message hub
// Stores per-tab message history, forwards to DevTools panel via port connections

const tabMessages = new Map();     // tabId -> Message[]
const devtoolsPorts = new Map();   // tabId -> port

// Receive messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== 'SIGNALR_MESSAGE') return;

    const tabId = sender.tab?.id;
    if (!tabId) return;

    if (!tabMessages.has(tabId)) {
        tabMessages.set(tabId, []);
    }

    const entry = {
        ...message.data,           // source, type (SIGNALR_SEND etc.), data
        id: Date.now() + Math.random(),
        _timestamp: Date.now()
    };

    const messages = tabMessages.get(tabId);
    messages.push(entry);

    // Limit message count
    if (messages.length > 1000) {
        tabMessages.set(tabId, messages.slice(-500));
    }

    // Forward to DevTools panel via port
    const port = devtoolsPorts.get(tabId);
    if (port) {
        try {
            port.postMessage({ type: 'NEW_MESSAGE', data: entry });
        } catch (e) {
            devtoolsPorts.delete(tabId);
        }
    }
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
    tabMessages.delete(tabId);
    devtoolsPorts.delete(tabId);
});

// DevTools panel connects via port
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'devtools') return;

    let tabId = null;

    port.onMessage.addListener((message) => {
        if (message.type === 'INIT') {
            tabId = message.tabId;
            devtoolsPorts.set(tabId, port);

            // Send historical messages
            const messages = tabMessages.get(tabId) || [];
            port.postMessage({ type: 'HISTORY', messages: messages });

        } else if (message.type === 'CLEAR') {
            if (tabId) {
                tabMessages.delete(tabId);
            }
            port.postMessage({ type: 'CLEARED' });
        }
    });

    port.onDisconnect.addListener(() => {
        if (tabId) {
            devtoolsPorts.delete(tabId);
        }
    });
});

console.log('[SignalR Monitor] Background service worker loaded');
