# 🚀 快速启动指南

## 第一步：生成图标（2分钟）

1. 在浏览器中打开 `icon-generator.html` 文件
   ```
   文件路径: D:\GitProjects\NCG-SignalRDemo\chrome-extension\icon-generator.html
   ```

2. 点击"全部下载"按钮

3. 将下载的三个图标文件移动到 `icons/` 文件夹：
   - icon16.png
   - icon48.png
   - icon128.png

## 第二步：安装扩展（1分钟）

1. 打开Chrome浏览器，输入地址：
   ```
   chrome://extensions/
   ```

2. 打开右上角的"开发者模式"开关

3. 点击"加载已解压的扩展程序"

4. 选择文件夹：
   ```
   D:\GitProjects\NCG-SignalRDemo\chrome-extension
   ```

5. 完成！你会看到扩展已安装

## 第三步：测试扩展（2分钟）

### 方法A：使用本项目的Demo

1. 启动SignalR服务器：
   ```bash
   cd D:\GitProjects\NCG-SignalRDemo\DemoScoreApp\DemoScoreApp
   dotnet run
   ```

2. 打开浏览器访问：
   ```
   http://localhost:5000
   ```

3. 按 `F12` 打开开发者工具

4. 切换到 **"SignalR"** 标签页

5. 在Demo页面点击"开始计算"，你会看到：
   - ✅ 连接状态变化
   - ✅ 发送的消息（StartCalculation）
   - ✅ 接收的消息（SubjectProgress、CalculationComplete等）

### 方法B：配置其他SignalR项目

1. 点击Chrome工具栏的扩展图标 📡

2. 配置你的SignalR项目：
   ```
   Hub路径: /yourHub
   端口号: 你的端口
   服务器URL: http://localhost:端口号
   ```

3. 点击"保存配置"

4. 打开你的SignalR应用

5. 按 `F12` → 切换到"SignalR"标签页

## 主要功能速览

### 📊 DevTools面板
- **清空** - 清除所有消息记录
- **暂停** - 暂停消息记录（不影响实际通信）
- **导出** - 导出消息为JSON文件

### 🔍 消息查看
- 点击消息条目查看详细内容
- 自动区分发送/接收/连接/错误类型
- 显示时间戳（精确到毫秒）

### 🎯 消息过滤
左侧面板可以筛选：
- ✅ 发送 (Send)
- ✅ 接收 (Receive)
- ✅ 连接 (Connection)
- ✅ 错误 (Error)

## 常见使用场景

### 场景1：调试消息格式
```
1. 打开DevTools的SignalR面板
2. 触发消息发送
3. 点击消息查看JSON格式
4. 验证参数是否正确
```

### 场景2：排查连接问题
```
1. 查看连接状态指示器
2. 如果显示"重连中"，检查网络
3. 查看错误消息（红色标签）
4. 导出日志给团队分析
```

### 场景3：性能分析
```
1. 暂停其他活动
2. 执行目标操作
3. 查看消息数量和频率
4. 导出数据进行分析
```

## 项目文件结构

```
chrome-extension/
├── manifest.json           # 扩展配置文件
├── popup.html/js          # 弹出窗口（配置界面）
├── content-script.js      # 内容脚本（消息转发）
├── injected-script.js     # 注入脚本（SignalR拦截）
├── background.js          # 后台脚本（消息存储）
├── devtools.html/js       # DevTools入口
├── panel.html/js          # DevTools面板
├── icons/                 # 图标文件夹
├── icon-generator.html    # 图标生成工具
├── README.md             # 详细文档
└── QUICKSTART.md         # 本文件
```

## 配置参数说明

### Hub路径
SignalR Hub的端点路径，例如：
- `/scoreHub` - 本Demo使用
- `/chatHub` - 聊天应用
- `/notificationHub` - 通知系统

### 端口号
SignalR服务器监听的端口：
- `5000` - ASP.NET Core默认开发端口
- `5001` - HTTPS端口
- `8080` - 常用备用端口
- `443` - 生产环境HTTPS端口

### 服务器URL（可选）
完整的服务器地址，例如：
- `http://localhost:5000`
- `https://api.example.com`
- 留空则使用当前页面的地址

## 技巧与提示

### 💡 提示1：固定扩展图标
右键点击工具栏的扩展图标 → 选择"固定"，方便快速访问

### 💡 提示2：快捷键
- `F12` - 打开/关闭开发者工具
- `Ctrl+Shift+I` - 同上
- `Ctrl+R` - 刷新页面

### 💡 提示3：消息太多？
- 使用过滤器只显示关心的消息类型
- 定期点击"清空"按钮
- 暂停记录以便仔细查看

### 💡 提示4：导出数据
导出的JSON文件可以：
- 用VSCode打开查看
- 导入到日志分析工具
- 分享给团队成员
- 用于自动化测试验证

## 故障排除

### 问题：没有看到SignalR标签页？
**解决**：
1. 确保扩展已正确安装
2. 刷新页面（F5）
3. 关闭并重新打开DevTools

### 问题：消息没有显示？
**解决**：
1. 检查页面是否加载了SignalR库
2. 检查连接状态是否为"已连接"
3. 查看浏览器控制台是否有错误
4. 确认"启用监控"开关已打开

### 问题：配置不生效？
**解决**：
1. 保存配置后刷新页面
2. 检查Hub路径和端口是否正确
3. 查看浏览器控制台的错误信息

## 下一步

- 📖 阅读完整的 [README.md](README.md) 了解详细功能
- 🔧 根据你的需求修改配置
- 🌐 在你的实际项目中测试
- 💬 遇到问题？查看README的常见问题部分

## 需要帮助？

如果遇到问题，请检查：
1. Chrome控制台（F12 → Console）的错误信息
2. 扩展是否正确加载（chrome://extensions/）
3. SignalR服务器是否正常运行
4. 网络连接是否正常

---

**祝你使用愉快！🎉**
