// SignalR Monitor - Injected script (runs in page MAIN world, document_start)
// Hooks WebSocket at the protocol level to intercept SignalR messages, no timing issues

(function () {
    'use strict';

    const RECORD_SEPARATOR = '\x1e';
    const wsMetadata = new WeakMap();

    // ── Utilities ─────────────────────────────────────────────

    function postMsg(type, data) {
        try {
            window.postMessage({
                source: 'signalr-monitor',
                type: type,
                data: { ...data, timestamp: new Date().toISOString() }
            }, '*');
        } catch (e) {
            // Silent fail - never break page functionality
        }
    }

    // ── SignalR Protocol Parsing ──────────────────────────────

    function isSignalRHandshake(data) {
        if (typeof data !== 'string') return false;
        try {
            const parts = data.split(RECORD_SEPARATOR);
            for (const part of parts) {
                if (!part) continue;
                const msg = JSON.parse(part);
                if (msg.protocol !== undefined && msg.version !== undefined) {
                    return true;
                }
            }
        } catch (e) { }
        return false;
    }

    function parseSignalRMessages(rawData, direction, url) {
        if (typeof rawData !== 'string') return;

        const parts = rawData.split(RECORD_SEPARATOR);

        for (const part of parts) {
            if (!part) continue;
            try {
                const msg = JSON.parse(part);
                handleParsedMessage(msg, direction, url);
            } catch (e) {
                // Not JSON, skip
            }
        }
    }

    function handleParsedMessage(msg, direction, url) {
        // Handshake request: { protocol: "json", version: 1 }
        if (msg.protocol !== undefined && msg.version !== undefined) {
            postMsg('SIGNALR_STATE', {
                state: 'connecting',
                protocol: msg.protocol,
                version: msg.version,
                url: url
            });
            return;
        }

        // Handshake response: {} or { error: "..." }
        if (msg.type === undefined) {
            if (msg.error) {
                postMsg('SIGNALR_ERROR', { error: msg.error, url: url });
            } else {
                postMsg('SIGNALR_STATE', { state: 'connected', url: url });
            }
            return;
        }

        switch (msg.type) {
            case 1: // Invocation
                postMsg(direction === 'send' ? 'SIGNALR_SEND' : 'SIGNALR_RECEIVE', {
                    method: msg.target,
                    args: msg.arguments || [],
                    invocationId: msg.invocationId
                });
                break;

            case 2: // StreamItem
                postMsg('SIGNALR_RECEIVE', {
                    method: '[StreamItem]',
                    args: [msg.item],
                    invocationId: msg.invocationId
                });
                break;

            case 3: // Completion
                postMsg(direction === 'send' ? 'SIGNALR_SEND' : 'SIGNALR_RECEIVE', {
                    method: '[Completion]',
                    args: msg.result !== undefined ? [msg.result] : [],
                    invocationId: msg.invocationId,
                    error: msg.error
                });
                break;

            case 4: // StreamInvocation
                postMsg('SIGNALR_SEND', {
                    method: '[StreamInvocation] ' + msg.target,
                    args: msg.arguments || [],
                    invocationId: msg.invocationId
                });
                break;

            case 5: // CancelInvocation
                postMsg('SIGNALR_SEND', {
                    method: '[CancelInvocation]',
                    invocationId: msg.invocationId
                });
                break;

            case 6: // Ping - skip to reduce noise
                break;

            case 7: // Close
                postMsg('SIGNALR_STATE', {
                    state: 'disconnected',
                    error: msg.error,
                    url: url
                });
                break;
        }
    }

    // ── Hook WebSocket ───────────────────────────────────────

    const OriginalWebSocket = window.WebSocket;
    const originalSend = OriginalWebSocket.prototype.send;

    // Hook WebSocket.prototype.send to intercept outgoing data
    OriginalWebSocket.prototype.send = function (data) {
        try {
            const meta = wsMetadata.get(this);
            if (meta) {
                if (!meta.isSignalR && isSignalRHandshake(data)) {
                    meta.isSignalR = true;
                    postMsg('SIGNALR_CONNECTION_CREATED', { url: meta.url });
                }
                if (meta.isSignalR) {
                    parseSignalRMessages(data, 'send', meta.url);
                }
            }
        } catch (e) {
            // Monitor error must not break normal send
        }
        return originalSend.call(this, data);
    };

    // Hook WebSocket constructor to register event listeners on each instance
    window.WebSocket = function (url, protocols) {
        const ws = protocols !== undefined
            ? new OriginalWebSocket(url, protocols)
            : new OriginalWebSocket(url);

        const meta = { url: url, isSignalR: false };
        wsMetadata.set(ws, meta);

        ws.addEventListener('message', function (event) {
            try {
                if (!meta.isSignalR) {
                    // Check if this is a SignalR handshake response or subsequent message
                    if (typeof event.data === 'string') {
                        const parts = event.data.split(RECORD_SEPARATOR).filter(Boolean);
                        for (const part of parts) {
                            try {
                                const msg = JSON.parse(part);
                                // SignalR messages have a numeric type field (1-7)
                                if (typeof msg.type === 'number' && msg.type >= 1 && msg.type <= 7) {
                                    meta.isSignalR = true;
                                    break;
                                }
                                // Handshake response is an empty object {}
                                if (Object.keys(msg).length === 0) {
                                    meta.isSignalR = true;
                                    break;
                                }
                            } catch (e) { }
                        }
                    }
                }

                if (meta.isSignalR) {
                    parseSignalRMessages(event.data, 'receive', meta.url);
                }
            } catch (e) { }
        });

        ws.addEventListener('close', function (event) {
            try {
                if (meta.isSignalR) {
                    postMsg('SIGNALR_STATE', {
                        state: 'disconnected',
                        url: meta.url,
                        code: event.code,
                        reason: event.reason
                    });
                }
            } catch (e) { }
        });

        ws.addEventListener('error', function () {
            try {
                if (meta.isSignalR) {
                    postMsg('SIGNALR_ERROR', {
                        error: 'WebSocket error',
                        url: meta.url
                    });
                }
            } catch (e) { }
        });

        return ws;
    };

    // Preserve WebSocket API compatibility
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

    console.log('[SignalR Monitor] Injected script loaded');
})();
