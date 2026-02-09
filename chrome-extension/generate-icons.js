// 快速生成PNG图标的Node.js脚本
const fs = require('fs');
const path = require('path');

// 创建icons目录
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// 简单的PNG图标生成（使用Canvas API）
function createIcon(size, filename) {
    // 创建HTML Canvas
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // 绘制信号波纹图标
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size / 16;
    ctx.lineCap = 'round';

    const centerX = size / 2;
    const centerY = size / 2;

    // 中心点
    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 20, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // 三层波纹
    for (let i = 1; i <= 3; i++) {
        const radius = (size / 6) * i;
        const startAngle = -Math.PI / 3;
        const endAngle = Math.PI / 3;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.stroke();
    }

    // 保存为PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconsDir, filename), buffer);
    console.log(`✓ Generated ${filename}`);
}

// 检查canvas包是否安装
try {
    require('canvas');

    // 生成三个尺寸的图标
    createIcon(16, 'icon16.png');
    createIcon(48, 'icon48.png');
    createIcon(128, 'icon128.png');

    console.log('\n✅ All icons generated successfully!');
    console.log('📁 Location: ' + iconsDir);
} catch (e) {
    console.log('❌ canvas package not found. Installing...');
    console.log('Please run: npm install canvas');
    console.log('\nOr use the simpler method below:');
    console.log('='.repeat(50));
    console.log('Open icon-generator.html in your browser and download the icons manually.');
}
