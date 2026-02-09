// DevTools Panel script
// Connects to background via port, receives historical and live SignalR messages

let messages = [];
let isPaused = false;
let clearTimestamp = 0;
let filters = {
    send: true,
    receive: true,
    connection: true,
    error: true
};

const messagesContainer = document.getElementById('messagesContainer');
const messageCount = document.getElementById('messageCount');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const clearBtn = document.getElementById('clearBtn');
const pauseBtn = document.getElementById('pauseBtn');
const exportBtn = document.getElementById('exportBtn');

// ── Port connection with auto-reconnect ──────────────────

let port = null;
const tabId = chrome.devtools.inspectedWindow.tabId;

function connectPort() {
    port = chrome.runtime.connect({ name: 'devtools' });

    port.onMessage.addListener((message) => {
        if (message.type === 'HISTORY') {
            // Filter out messages older than last clear
            messages = (message.messages || []).filter(m => (m._timestamp || 0) > clearTimestamp);
            renderMessages();
        } else if (message.type === 'CLEARED') {
            messages = [];
            renderMessages();
        } else if (message.type === 'NEW_MESSAGE') {
            if (!isPaused && message.data) {
                // Ignore messages sent before the last clear
                if ((message.data._timestamp || 0) > clearTimestamp) {
                    addMessage(message.data);
                }
            }
        }
    });

    port.onDisconnect.addListener(() => {
        // Service worker may have restarted, reconnect after a short delay
        setTimeout(connectPort, 500);
    });

    // Request historical messages
    port.postMessage({ type: 'INIT', tabId: tabId });
}

connectPort();

// ── Message handling ─────────────────────────────────────

function addMessage(entry) {
    messages.push(entry);

    if (messages.length > 1000) {
        messages = messages.slice(-500);
    }

    updateStatus(entry);
    renderMessages();
}

function updateStatus(entry) {
    if (entry.type === 'SIGNALR_STATE' && entry.data) {
        const state = entry.data.state;
        statusDot.className = 'status-dot ' + state;

        const stateMap = {
            'connected': 'Connected',
            'disconnected': 'Disconnected',
            'reconnecting': 'Reconnecting...',
            'connecting': 'Connecting...'
        };
        statusText.textContent = stateMap[state] || state;
    }
}

function getMsgDisplayType(entry) {
    switch (entry.type) {
        case 'SIGNALR_SEND': return 'send';
        case 'SIGNALR_RECEIVE': return 'receive';
        case 'SIGNALR_STATE':
        case 'SIGNALR_CONNECTION_CREATED': return 'connection';
        case 'SIGNALR_ERROR': return 'error';
        default: return 'connection';
    }
}

function getMsgMethod(entry) {
    const data = entry.data || {};
    switch (entry.type) {
        case 'SIGNALR_SEND':
        case 'SIGNALR_RECEIVE':
            return data.method || 'Unknown';
        case 'SIGNALR_STATE':
            return 'State: ' + (data.state || 'unknown');
        case 'SIGNALR_CONNECTION_CREATED':
            return 'Connection Created';
        case 'SIGNALR_ERROR':
            return 'Error: ' + (data.error || 'unknown');
        default:
            return entry.type || 'Unknown';
    }
}

function getMsgDetail(entry) {
    return entry.data || {};
}

// ── Rendering ────────────────────────────────────────────

function renderMessages() {
    const filtered = messages.filter(msg => {
        const displayType = getMsgDisplayType(msg);
        return filters[displayType];
    });

    messageCount.textContent = filtered.length;

    if (filtered.length === 0) {
        messagesContainer.innerHTML = '<div class="empty-state">' +
            '<div class="empty-state-icon">📡</div>' +
            '<div class="empty-state-text">Waiting for SignalR messages...</div>' +
            '</div>';
        return;
    }

    messagesContainer.innerHTML = filtered.map(msg => createMessageElement(msg)).join('');

    document.querySelectorAll('.message-header').forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            if (body) body.classList.toggle('expanded');
        });
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function createMessageElement(msg) {
    const ts = msg.data?.timestamp || msg._timestamp;
    const time = ts
        ? new Date(ts).toLocaleTimeString('en-US', {
            hour12: false, hour: '2-digit', minute: '2-digit',
            second: '2-digit', fractionalSecondDigits: 3
        })
        : '--:--:--.---';

    const displayType = getMsgDisplayType(msg);
    const method = escapeHtml(getMsgMethod(msg));
    const detail = getMsgDetail(msg);

    let jsonStr;
    try {
        jsonStr = JSON.stringify(detail, null, 2);
    } catch (e) {
        jsonStr = String(detail);
    }

    return '<div class="message-entry">' +
        '<div class="message-header">' +
        '<span class="message-type ' + displayType + '">' + displayType + '</span>' +
        '<span class="message-method">' + method + '</span>' +
        '<span class="message-time">' + time + '</span>' +
        '</div>' +
        '<div class="message-body">' +
        '<div class="json-view"><pre>' + escapeHtml(jsonStr) + '</pre></div>' +
        '</div>' +
        '</div>';
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Button events ─────────────────────────────────────────

clearBtn.addEventListener('click', () => {
    messages = [];
    clearTimestamp = Date.now();
    renderMessages();

    try {
        port.postMessage({ type: 'CLEAR', tabId: tabId });
    } catch (e) {
        // Port may be disconnected, will reconnect automatically
    }
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'signalr-messages-' + Date.now() + '.json';
    link.click();
    URL.revokeObjectURL(url);
});

document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const type = e.target.dataset.type;
        filters[type] = e.target.checked;
        renderMessages();
    });
});

renderMessages();
