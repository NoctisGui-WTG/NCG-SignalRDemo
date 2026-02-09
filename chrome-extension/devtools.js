// 创建SignalR面板
chrome.devtools.panels.create(
    'SignalR',
    'icons/icon48.png',
    'panel.html',
    (panel) => {
        console.log('SignalR panel created');
    }
);
