// Content Script - Message bridge (ISOLATED world)
// Receives messages from injected-script (MAIN world) via window.postMessage
// Forwards to background service worker

let signalrStatus = 'disconnected';
let signalrMessages = [];

// Listen for messages from injected script
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'signalr-monitor') return;

    const message = event.data;

    // Update local status
    if (message.type === 'SIGNALR_STATE') {
        signalrStatus = message.data.state || 'disconnected';
    }

    // Cache messages for popup queries
    signalrMessages.push({
        type: message.type,
        data: message.data,
        timestamp: Date.now()
    });

    if (signalrMessages.length > 1000) {
        signalrMessages = signalrMessages.slice(-500);
    }

    // Forward to background
    try {
        chrome.runtime.sendMessage({
            type: 'SIGNALR_MESSAGE',
            data: message
        });
    } catch (e) {
        // Extension context may have been invalidated
    }
});

// Respond to queries from popup / devtools
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_STATUS') {
        sendResponse({ status: signalrStatus });
    } else if (request.type === 'GET_MESSAGES') {
        sendResponse({ messages: signalrMessages });
    } else if (request.type === 'CLEAR_MESSAGES') {
        signalrMessages = [];
        sendResponse({ success: true });
    }
    return true;
});

console.log('[SignalR Monitor] Content script loaded');
