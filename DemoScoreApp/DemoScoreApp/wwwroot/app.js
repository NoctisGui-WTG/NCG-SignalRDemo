if (!window.signalR) {
    console.error("SignalR script not loaded!");
}

const statusEl = document.getElementById('status');
const btnCalc = document.getElementById('btnCalc');
const btnBroadcast = document.getElementById('btnBroadcast');
const totalCell = document.getElementById('totalCell');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modalMessage');
const btnContinue = document.getElementById('btnContinue');
const btnAbort = document.getElementById('btnAbort');
const btnReason = document.getElementById('btnReason');
const reasonBox = document.getElementById('reasonBox');
const resultTitleEl = document.querySelector('h2');
const modalContent = document.getElementById('modalContent');
const modalHeader = modalContent.querySelector('.modal-header');
const reasonModal = document.getElementById('reasonModal');
const reasonModalContent = document.getElementById('reasonModalContent');
const reasonModalHeader = reasonModalContent.querySelector('.modal-header');
const btnCloseReason = document.getElementById('btnCloseReason');
const signalrLog = document.getElementById('signalrLog');
const btnClearLog = document.getElementById('btnClearLog');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const btnSendChat = document.getElementById('btnSendChat');
const btnConnectionStatus = document.getElementById('btnConnectionStatus');
const statusText = btnConnectionStatus.querySelector('.status-text');
const btnConnect = document.getElementById('btnConnect');
const btnDisconnect = document.getElementById('btnDisconnect');

let currentCalculationId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragging = false;
let reasonDragOffsetX = 0;
let reasonDragOffsetY = 0;
let reasonDragging = false;

function updateConnectionStatus(status) {
    btnConnectionStatus.className = `status-indicator ${status}`;
    
    switch(status) {
        case 'connected':
            statusText.textContent = 'Connected';
            btnConnect.disabled = true;
            btnDisconnect.disabled = false;
            break;
        case 'disconnected':
            statusText.textContent = 'Disconnected';
            btnConnect.disabled = false;
            btnDisconnect.disabled = true;
            break;
        case 'reconnecting':
            statusText.textContent = 'Reconnecting...';
            btnConnect.disabled = true;
            btnDisconnect.disabled = true;
            break;
    }
}

function addChatMessage(type, message) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    
    let tag = '';
    switch(type) {
        case 'system': tag = '[系统]'; break;
        case 'broadcast-sent': tag = '[我]'; break;
        case 'broadcast-received': tag = '[广播]'; break;
        case 'user-event': tag = '[事件]'; break;
    }
    
    msg.innerHTML = `<span class="timestamp">${time}</span><span class="tag">${tag}</span>${message}`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// SignalR 日志功能
function addLog(type, message, payload = null) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    let html = `<span class="log-time">[${time}]</span><span class="log-type ${type}">${type.toUpperCase()}</span><span class="log-message">${message}</span>`;
    
    if (payload) {
        html += `<div class="log-payload">${JSON.stringify(payload, null, 2)}</div>`;
    }
    
    entry.innerHTML = html;
    signalrLog.appendChild(entry);
    signalrLog.scrollTop = signalrLog.scrollHeight;
}

btnClearLog.addEventListener('click', () => {
    signalrLog.innerHTML = '';
    addLog('connection', 'Log cleared');
});

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/scoreHub")
    .withAutomaticReconnect()
    .build();

function log(msg) { statusEl.innerText = msg; }

function resetTable() {
    document.querySelectorAll('#scoreTable td[data-subject]').forEach(td => {
        td.textContent = '--';
        td.classList.remove('fail');
    });
    totalCell.textContent = '--';
    resultTitleEl.textContent = '结果';
    reasonBox.textContent = '';
}

function getSelectedMethod() {
    return document.querySelector('input[name="method"]:checked').value;
}

function renderReasons(reasons) {
    if (!reasons) return;
    if (typeof reasons === 'string') {
        reasons = { 未知科目: reasons };
    }
    const entries = Object.entries(reasons);
    if (!entries.length) return;
    const lines = [];
    for (const [subj, reason] of entries) {
        lines.push(`${subj}: ${reason ?? '未知原因'}`);
    }
    reasonBox.textContent = lines.join('\n');
    resultTitleEl.textContent = '不及格';
}

connection.on('SubjectProgress', payload => {
    addLog('receive', 'SubjectProgress', payload);
    const td = document.querySelector(`#scoreTable td[data-subject="${payload.subject}"]`);
    if (td) {
        td.textContent = payload.score;
        if (payload.score < 60) td.classList.add('fail');
    }
    if (payload.resultTitle) resultTitleEl.textContent = payload.resultTitle;
    if (payload.allReasons) renderReasons(payload.allReasons);
});

connection.on('FailEncountered', payload => {
    addLog('receive', 'FailEncountered', payload);
    log(`遇到不及格：${payload.subject} = ${payload.score}`);
    currentCalculationId = payload.calculationId;
    showModal(payload.message);
    const td = document.querySelector(`#scoreTable td[data-subject="${payload.subject}"]`);
    if (td) {
        td.textContent = payload.score;
        if (payload.score < 60) td.classList.add('fail');
    }
    if (payload.resultTitle) resultTitleEl.textContent = payload.resultTitle;
});

connection.on('FailReason', payload => {
    addLog('receive', 'FailReason', payload);
    renderReasons(payload.reasons || payload.reason);
    showReasonModal();
});

connection.on('CalculationComplete', payload => {
    addLog('receive', 'CalculationComplete', payload);
    currentCalculationId = null;
    log(`计算完成，总分 = ${payload.total}`);
    for (const [subject, score] of Object.entries(payload.scores)) {
        const td = document.querySelector(`#scoreTable td[data-subject="${subject}"]`);
        if (td) {
            td.textContent = score;
            if (payload.failedSubjects.includes(subject)) td.classList.add('fail');
        }
    }
    totalCell.textContent = payload.total;
    resultTitleEl.textContent = payload.resultTitle || '结果';
    if (payload.reasons) renderReasons(payload.reasons);
    hideModal();
});

connection.on('CalculationAborted', () => {
    addLog('receive', 'CalculationAborted');
    log('计算已中止。');
    hideModal();
    currentCalculationId = null;
});

connection.on('Error', payload => { 
    addLog('error', 'Error', payload);
    log('错误：' + payload.message); 
});

connection.on('SystemNotification', payload => {
    addLog('receive', '🔔 SystemNotification (后台服务推送)', payload);
    addChatMessage('system', `${payload.message} - 服务器时间: ${payload.serverTime}`);
});

connection.on('UserConnected', payload => {
    addLog('receive', '👋 UserConnected (其他用户上线)', payload);
    addChatMessage('user-event', payload.message);
});

connection.on('UserDisconnected', payload => {
    addLog('receive', '👋 UserDisconnected (其他用户下线)', payload);
    addChatMessage('user-event', payload.message);
});

connection.on('BroadcastReceived', payload => {
    addLog('receive', '📢 BroadcastReceived (广播消息)', payload);
    addChatMessage('broadcast-received', `用户 ${payload.from}: ${payload.message}`);
});

connection.on('OtherUserStartedCalculation', payload => {
    addLog('receive', '🚀 OtherUserStartedCalculation (其他用户开始计算)', payload);
    addChatMessage('user-event', `用户 ${payload.userId} 开始了${payload.method}`);
});

connection.onreconnecting(() => {
    addLog('connection', 'Reconnecting...');
    updateConnectionStatus('reconnecting');
    log('连接重试中...');
});
connection.onreconnected(() => {
    addLog('connection', 'Reconnected');
    updateConnectionStatus('connected');
    log('已重新连接。');
});
connection.onclose(() => {
    addLog('connection', 'Connection closed');
    updateConnectionStatus('disconnected');
    log('连接已关闭。');
});

async function start() {
    try {
        addLog('connection', 'Connecting to SignalR hub...');
        updateConnectionStatus('reconnecting');
        await connection.start();
        addLog('connection', 'Connected successfully');
        updateConnectionStatus('connected');
        log('已连接，可以开始计算。');
    } catch (err) {
        console.error(err);
        addLog('error', 'Connection failed: ' + err.message);
        updateConnectionStatus('disconnected');
        log('连接失败：' + err.message);
    }
}

async function stop() {
    try {
        addLog('connection', 'Disconnecting from SignalR hub...');
        await connection.stop();
        addLog('connection', 'Disconnected successfully');
        updateConnectionStatus('disconnected');
        log('已断开连接。');
    } catch (err) {
        console.error(err);
        addLog('error', 'Disconnect failed: ' + err.message);
    }
}

start();

btnCalc.addEventListener('click', async () => {
    resetTable();
    log('开始计算...');
    currentCalculationId = null;
    const method = getSelectedMethod();
    addLog('send', `StartCalculation (method: ${method})`);
    try {
        await connection.invoke('StartCalculation', method);
    } catch (e) {
        console.error(e);
        log('启动计算失败。');
    }
});

btnBroadcast.addEventListener('click', async () => {
    if (!chatInput.value.trim()) {
        chatInput.focus();
        return;
    }
    
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    addLog('send', `BroadcastMessage: "${message}"`);
    addChatMessage('broadcast-sent', message);
    
    try {
        await connection.invoke('BroadcastMessage', message);
    } catch (e) {
        console.error(e);
        log('发送广播失败。');
    }
});

btnSendChat.addEventListener('click', async () => {
    if (!chatInput.value.trim()) return;
    
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    addLog('send', `BroadcastMessage: "${message}"`);
    addChatMessage('broadcast-sent', message);
    
    try {
        await connection.invoke('BroadcastMessage', message);
    } catch (e) {
        console.error(e);
        log('发送广播失败。');
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        btnSendChat.click();
    }
});

btnConnect.addEventListener('click', async () => {
    await start();
});

btnDisconnect.addEventListener('click', async () => {
    await stop();
});

btnContinue.addEventListener('click', async () => {
    if (!currentCalculationId) return;
    log('继续计算剩余科目...');
    addLog('send', 'ContinueAfterFail', { calculationId: currentCalculationId });
    try {
        await connection.invoke('ContinueAfterFail', currentCalculationId);
        hideModal();
    } catch (e) { console.error(e); }
});

btnAbort.addEventListener('click', async () => {
    if (!currentCalculationId) { hideModal(); return; }
    log('发送中止请求...');
    addLog('send', 'AbortCalculation', { calculationId: currentCalculationId });
    try {
        await connection.invoke('AbortCalculation', currentCalculationId);
    } catch (e) { console.error(e); }
});

btnReason.addEventListener('click', async () => {
    if (!currentCalculationId) return;
    addLog('send', 'GetFailReason', { calculationId: currentCalculationId });
    try {
        await connection.invoke('GetFailReason', currentCalculationId);
    } catch (e) { console.error(e); }
});

btnCloseReason.addEventListener('click', () => {
    hideReasonModal();
});

function showModal(message) {
    modalMessage.textContent = message;
    modal.classList.remove('hidden');
    centerModal();
}
function hideModal() { modal.classList.add('hidden'); }

function showReasonModal() {
    reasonModal.classList.remove('hidden');
    centerReasonModal();
}
function hideReasonModal() { reasonModal.classList.add('hidden'); }

function centerModal() {
    const rect = modalContent.getBoundingClientRect();
    modalContent.style.left = `calc(50% - ${rect.width / 2}px)`;
    modalContent.style.top = `calc(50% - ${rect.height / 2}px)`;
}

function centerReasonModal() {
    const rect = reasonModalContent.getBoundingClientRect();
    reasonModalContent.style.left = `calc(50% - ${rect.width / 2}px)`;
    reasonModalContent.style.top = `calc(50% - ${rect.height / 2}px)`;
}

modalHeader.addEventListener('mousedown', e => {
    dragging = true;
    const rect = modalContent.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
});

function onDrag(e) {
    if (!dragging) return;
    modalContent.style.left = `${e.clientX - dragOffsetX}px`;
    modalContent.style.top = `${e.clientY - dragOffsetY}px`;
}
function stopDrag() {
    dragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

reasonModalHeader.addEventListener('mousedown', e => {
    reasonDragging = true;
    const rect = reasonModalContent.getBoundingClientRect();
    reasonDragOffsetX = e.clientX - rect.left;
    reasonDragOffsetY = e.clientY - rect.top;
    document.addEventListener('mousemove', onReasonDrag);
    document.addEventListener('mouseup', stopReasonDrag);
});

function onReasonDrag(e) {
    if (!reasonDragging) return;
    reasonModalContent.style.left = `${e.clientX - reasonDragOffsetX}px`;
    reasonModalContent.style.top = `${e.clientY - reasonDragOffsetY}px`;
}
function stopReasonDrag() {
    reasonDragging = false;
    document.removeEventListener('mousemove', onReasonDrag);
    document.removeEventListener('mouseup', stopReasonDrag);
}