# SignalR Monitor - Chrome扩展

这是一个用于监测SignalR连接状态和数据流向的Chrome浏览器扩展。

## 功能特性

✨ **核心功能**
- 📡 实时监测SignalR连接状态（已连接/未连接/重连中）
- 📨 拦截并显示所有SignalR消息（发送/接收）
- 🔍 详细查看消息内容和参数
- ⚙️ 可配置Hub路径和端口号
- 💾 支持导出消息记录为JSON文件
- 🎯 消息类型过滤（发送/接收/连接/错误）

🛠️ **DevTools集成**
- 专业的开发者工具面板
- 实时消息流监控
- 消息详情展开/折叠
- 暂停/继续记录
- 清空消息历史

## 安装步骤

### 1. 准备图标文件（重要！）

在安装前，你需要准备三个图标文件，放在 `chrome-extension/icons/` 目录下：
- `icon16.png` (16x16像素)
- `icon48.png` (48x48像素)
- `icon128.png` (128x128像素)

你可以使用任何在线图标生成工具创建，或者使用以下方法快速生成：

**方法1：使用在线工具**
- 访问 https://www.favicon-generator.org/
- 上传一张图片
- 下载生成的不同尺寸的图标
- 重命名为上述文件名

**方法2：使用现有图片**
- 找一张PNG图片
- 使用图片编辑工具（如Paint.NET、GIMP）调整为上述尺寸
- 保存到 `icons/` 目录

### 2. 加载扩展到Chrome

1. 打开Chrome浏览器
2. 在地址栏输入：`chrome://extensions/`
3. 打开右上角的"开发者模式"开关
4. 点击"加载已解压的扩展程序"
5. 选择 `D:\GitProjects\NCG-SignalRDemo\chrome-extension` 文件夹
6. 扩展安装完成！

## 使用方法

### 方式1：使用弹出窗口（Popup）

1. 点击Chrome工具栏中的 SignalR Monitor 图标
2. 在弹出窗口中配置：
   - **Hub路径**：SignalR Hub的路径（如 `/scoreHub`）
   - **端口号**：SignalR服务器的端口（如 `5000`）
   - **服务器URL**：可选，完整的服务器地址
3. 点击"保存配置"
4. 打开你的SignalR应用页面
5. 查看连接状态和实时消息

### 方式2：使用DevTools面板（推荐）

1. 打开你的SignalR应用页面
2. 按 `F12` 打开Chrome开发者工具
3. 切换到 **"SignalR"** 标签页
4. 你会看到：
   - 🔝 工具栏（清空、暂停、导出）
   - 📊 连接状态指示器
   - 📝 消息列表（可展开查看详情）
   - 🔍 左侧过滤器（按消息类型筛选）

## 配置示例

### 本地开发环境
```
Hub路径: /scoreHub
端口号: 5000
服务器URL: http://localhost:5000
```

### 生产环境
```
Hub路径: /chatHub
端口号: 443
服务器URL: https://your-domain.com
```

### 自定义端口
```
Hub路径: /notificationHub
端口号: 8080
服务器URL: http://localhost:8080
```

## 监测的SignalR事件

### 发送事件（Client → Server）
- `StartCalculation` - 开始计算
- `ContinueAfterFail` - 继续失败后的计算
- `GetFailReason` - 获取失败原因
- `AbortCalculation` - 中止计算
- `BroadcastMessage` - 广播消息

### 接收事件（Server → Client）
- `SubjectProgress` - 科目进度
- `FailEncountered` - 遇到失败
- `FailReason` - 失败原因
- `CalculationComplete` - 计算完成
- `CalculationAborted` - 计算已中止
- `Error` - 错误
- `SystemNotification` - 系统通知
- `UserConnected` - 用户连接
- `UserDisconnected` - 用户断开
- `BroadcastReceived` - 接收广播
- `OtherUserStartedCalculation` - 其他用户开始计算

### 连接状态
- `connecting` - 连接中
- `connected` - 已连接
- `disconnected` - 已断开
- `reconnecting` - 重连中

## 功能说明

### 消息过滤
在DevTools面板左侧，可以按以下类型过滤消息：
- ✅ 发送 (Send) - 客户端发送的消息
- ✅ 接收 (Receive) - 服务器接收的消息
- ✅ 连接 (Connection) - 连接状态变化
- ✅ 错误 (Error) - 错误信息

### 消息详情
点击任意消息条目可展开查看：
- 完整的JSON数据
- 方法名和参数
- 时间戳

### 导出数据
点击"导出"按钮可将所有消息导出为JSON文件，方便：
- 问题排查和调试
- 数据分析
- 团队协作

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    Chrome Extension                  │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐         ┌──────────────────┐     │
│  │   Popup      │         │  Background.js    │     │
│  │  (Config UI) │◄────────┤  (Message Hub)    │     │
│  └──────────────┘         └──────────────────┘     │
│         │                          ▲                 │
│         ▼                          │                 │
│  ┌──────────────────────────────────────────────┐  │
│  │           Content Script                      │  │
│  │  (Message Listener & Forwarder)              │  │
│  └──────────────────────────────────────────────┘  │
│         │                          ▲                 │
│         ▼                          │                 │
│  ┌──────────────────────────────────────────────┐  │
│  │         Injected Script                       │  │
│  │  (SignalR Hook & Interceptor)                │  │
│  └──────────────────────────────────────────────┘  │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │   Web Page (SignalR)  │
          │   window.signalR      │
          └───────────────────────┘
```

### 工作原理

1. **Injected Script** 注入到页面上下文中，Hook SignalR的核心API
2. **Content Script** 监听来自页面的消息，转发到Background
3. **Background** 存储消息历史，协调各组件通信
4. **Popup** 提供配置界面
5. **DevTools Panel** 提供专业的监测界面

## 适用场景

✅ **开发调试**
- 实时查看SignalR消息流
- 验证消息格式和内容
- 排查连接问题

✅ **性能优化**
- 监测消息频率
- 分析数据大小
- 识别性能瓶颈

✅ **问题排查**
- 记录错误信息
- 导出日志分析
- 重现问题场景

✅ **学习研究**
- 理解SignalR工作原理
- 学习实时通信机制
- 研究消息传递模式

## 常见问题

### Q: 扩展没有显示消息？
A: 请确保：
1. 页面已加载SignalR库
2. SignalR连接已建立
3. 扩展的"启用监控"开关已打开
4. 刷新页面后重试

### Q: 如何更改监测的Hub路径？
A:
1. 点击工具栏的扩展图标
2. 修改"Hub路径"配置
3. 点击"保存配置"
4. 刷新页面

### Q: DevTools面板在哪里？
A:
1. 按F12打开开发者工具
2. 在顶部标签栏找到"SignalR"标签
3. 如果没有，点击"»"查看更多标签

### Q: 可以监测HTTPS网站吗？
A: 可以！扩展支持HTTP和HTTPS协议。

### Q: 消息历史记录会保存吗？
A: 每个标签页最多保存1000条消息，关闭标签页后会清空。可以使用"导出"功能保存。

## 更新日志

### v1.0.0 (2026-02-09)
- ✨ 初始版本发布
- 📡 支持SignalR消息监测
- 🔍 DevTools面板集成
- ⚙️ 配置界面
- 💾 消息导出功能

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 相关链接

- [SignalR官方文档](https://docs.microsoft.com/aspnet/core/signalr/)
- [Chrome扩展开发文档](https://developer.chrome.com/docs/extensions/)
