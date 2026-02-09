// Popup script - display current page SignalR status

document.addEventListener('DOMContentLoaded', () => {
    updateStatus();
    setInterval(updateStatus, 1000);
});

document.getElementById('openDevTools').addEventListener('click', () => {
    const el = document.getElementById('openDevTools');
    el.textContent = 'Press F12, then switch to the "SignalR" tab';
    setTimeout(() => { el.textContent = 'Open DevTools for details'; }, 3000);
});

async function updateStatus() {
    const statusEl = document.getElementById('connectionStatus');
    const countEl = document.getElementById('messageCount');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
        if (response && response.status) {
            statusEl.textContent = getStatusText(response.status);
            statusEl.className = 'status-value status-' + response.status;
        }
    } catch (e) {
        statusEl.textContent = 'Not detected';
        statusEl.className = 'status-value status-disconnected';
    }

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_MESSAGES' });
        if (response && response.messages) {
            countEl.textContent = response.messages.length;
        }
    } catch (e) {
        countEl.textContent = '0';
    }
}

function getStatusText(status) {
    const map = {
        'connected': 'Connected',
        'disconnected': 'Disconnected',
        'reconnecting': 'Reconnecting...',
        'connecting': 'Connecting...'
    };
    return map[status] || 'Unknown';
}
