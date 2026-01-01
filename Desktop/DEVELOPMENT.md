# TraceForge Desktop - 运行指南

## ⚠️ 重要提示

TraceForge 是一个 Tauri 桌面应用程序，**必须通过 Tauri 开发服务器运行**，不能只在浏览器中运行。

## 快速启动

### 正确的启动方式

```bash
# 进入 Desktop 目录
cd Desktop

# 启动 Tauri 开发服务器（包含后端和前端）
npm run tauri:dev
```

这将：
1. 启动 Rust 后端（Tauri）
2. 启动 React 前端（Vite）
3. 打开桌面应用程序窗口

### ❌ 错误的启动方式

```bash
# 只启动前端，没有后端
npm run dev
```

这会导致：
- "Tauri Environment Not Detected" 错误
- 无法访问数据库
- 无法访问文件系统
- 无法连接到 Chrome 内核

## 常见问题

### Q: 看到错误 "Tauri Environment Not Detected"

**原因**: 使用了 `npm run dev` 而不是 `npm run tauri:dev`

**解决方法**:
```bash
# 1. 停止当前服务器 (Ctrl+C)
# 2. 运行正确的命令
npm run tauri:dev
```

### Q: 首次运行需要安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 安装 Rust 依赖（自动执行）
cargo build

# 首次启动 Tauri
npm run tauri:dev
```

### Q: 端口冲突

如果端口 1421 被占用，可以修改环境变量：

```bash
# macOS/Linux
TAURI_DEV_HOST=localhost npm run tauri:dev

# Windows PowerShell
$env:TAURI_DEV_HOST="localhost"; npm run tauri:dev

# Windows CMD
set TAURI_DEV_HOST=localhost && npm run tauri:dev
```

### Q: Tauri CLI 未安装

```bash
# 安装 Tauri CLI
npm install -g @tauri-apps/cli

# 或者使用 npx（推荐）
npx tauri dev
```

## 开发工作流

### 启动开发环境

```bash
# 方式 1: 使用 npm script（推荐）
npm run tauri:dev

# 方式 2: 使用 npx
npx tauri dev
```

### 运行测试

```bash
# 单元测试
npm test

# E2E 测试（需要应用运行）
npm run test:e2e

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 构建生产版本

```bash
# 构建生产安装包
npm run tauri:build

# 构建特定平台
npm run tauri:build -- --target universal-apple-darwin  # macOS
npm run tauri:build -- --target nsis                  # Windows
npm run tauri:build -- --target deb                   # Linux
```

## 系统要求

- **Node.js**: 18.x 或更高版本
- **Rust**: 1.75 或更高版本（自动安装）
- **Chrome**: 86.0.4240.198 或更高版本
- **操作系统**: macOS 12+, Windows 10+, Ubuntu 20.04+

## 故障排除

### Rust 编译错误

```bash
# 更新 Rust
rustup update

# 清理并重新构建
cargo clean
npm run tauri:dev
```

### Vite 开发服务器问题

```bash
# 清理 node_modules
rm -rf node_modules
npm install

# 清理 Vite 缓存
rm -rf .vite
npm run tauri:dev
```

### 数据库问题

```bash
# 重置数据库（删除所有数据）
# macOS
rm ~/Library/Application\ Support/traceforge/data.db

# Windows
del "%APPDATA%\traceforge\data.db"

# Linux
rm ~/.local/share/traceforge/data.db
```

## 更多资源

- [Tauri 文档](https://tauri.app/v1/guides/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [项目 README](../README.md)

## 获取帮助

如果遇到问题：

1. 检查控制台输出（终端和浏览器开发者工具）
2. 查看日志文件
3. 在 GitHub 上报告问题
