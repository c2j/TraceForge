# TraceForge Recorder 使用指南

## 一、概述

Recorder 是 TraceForge 的核心功能之一，用于可视化地录制用户操作流程，自动生成可执行的测试脚本。通过直观的界面，你可以：

- 🎬 录制浏览器操作（点击、输入、导航等）
- ✏️ 手动插入和编辑动作
- 🔍 搜索和筛选步骤
- ⏱️ 配置等待条件
- 💾 自动保存和恢复
- ↩️ 撤销/重做操作

---

## 二、快速开始

### 2.1 启动录制

1. 打开 TraceForge Desktop 应用
2. 切换到 **Recorder** 页面
3. 在 URL 输入框中输入目标网站地址（默认 `http://localhost:3000`）
4. 选择 **Kernel**（浏览器内核）
5. 点击 ▶️ **Start Recording** 按钮

```
┌─────────────────────────────────────────────────┐
│  ⏱️ 00:00    [▶️ Start]  [+] Scenario  [🎯 Assert] [📷 Screenshot]  │
│  ─────────────────────────────────────────────── │
│  URL: [http://localhost:3000          ]         │
│  Kernel: [Chrome 120                    ▼]       │
│  ─────────────────────────────────────────────── │
│  [Cancel]                              [💾 Save] │
└─────────────────────────────────────────────────┘
```

### 2.2 常见问题：Kernel 下拉框为空？

如果 **Kernel** 下拉框为空，请按以下步骤操作：

#### 步骤 1：切换到 Kernels 页面

点击左侧导航栏的 **Kernels** 图标（或访问 `/kernels` 路由）：

```
┌─────────────────────────────────────────────────┐
│  🏠 Dashboard   📁 Scenarios   🎬 Recorder      │
│  📝 Editor      ✅ Results     📡 Nodes         │
│  💾 Kernels     ⚙️ Settings                      │
└─────────────────────────────────────────────────┘
```

#### 步骤 2：自动检测

点击 **Auto-detect** 按钮，系统会自动扫描系统中的 Chrome 浏览器：

```
┌─────────────────────────────────────────────────┐
│  Kernel Manager                                  │
│  ─────────────────────────────────────────────  │
│  [🔍 Auto-detect]  [➕ Add Manually]            │
│                                                │
│  检测到的内核将显示在此处...                     │
└─────────────────────────────────────────────────┘
```

#### 步骤 3：手动添加（如果自动检测失败）

1. 点击 **Add Manually**
2. 在文件选择器中找到 Chrome 可执行文件：
   - **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
   - **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - **Linux**: `/usr/bin/google-chrome`

#### 步骤 4：验证兼容性

添加后，系统会自动测试 Chrome 版本的兼容性：
- ✅ **Compatible** - 版本 >= 86.0，可用于录制
- ❌ **Incompatible** - 版本过低，需要升级 Chrome

### 2.3 录制过程中的状态

| 状态 | 图标 | 说明 |
|------|------|------|
| 空闲 | 灰色 | 未开始录制 |
| 录制中 | 红色脉冲 ⏺️ | 正在录制操作 |
| 已暂停 | 黄色 ⏸️ | 录制暂停，可恢复 |
| 停止中 | 红色方形 ⏹️ | 正在停止录制 |

---

## 三、录制操作

### 3.1 基本操作

在目标页面中执行以下操作将被自动录制：

| 操作类型 | 说明 | 录制内容 |
|----------|------|----------|
| **点击** | 点击页面元素 | 元素定位器 + 描述 |
| **输入** | 在输入框中填写内容 | 定位器 + 输入值 |
| **导航** | 访问新 URL | 目标 URL |
| **悬停** | 鼠标悬停 | 元素定位器 |
| **滚动** | 页面滚动 | 滚动方向和距离 |

### 3.2 手动插入动作

点击工具栏按钮手动添加动作：

```
[+] Scenario  - 添加新场景
[🎯 Assert    - 添加断言
[📷 Screenshot - 添加截图
```

或者使用底部快捷栏：

```
[➕ Add Page] [↗️ Navigate] [⏱️ Wait] [🖱️ Manual]
```

#### 支持的动作类型

| 类型 | 参数 | 说明 |
|------|------|------|
| **Navigate** | URL | 跳转到指定页面 |
| **Click** | Selector | 点击元素 |
| **Fill** | Selector, Value | 输入文本 |
| **Hover** | Selector | 悬停元素 |
| **Wait** | Wait Type | 等待条件 |
| **Assert** | Expected Text | 验证文本存在 |
| **Screenshot** | - | 截图 |

---

## 四、步骤管理

### 4.1 步骤树形结构

录制内容按层级组织：

```
📁 Scenario 1
 ├── 📄 Page 1 (http://example.com)
 │    ├── 1️⃣ Click "Submit button" [button#submit]
 │    ├── 2️⃣ Fill "Email field" [input[name="email"]]
 │    └── 3️⃣ Wait for network idle
 └── 📄 Page 2 (http://example.com/profile)
      └── 1️⃣ Navigate to profile
```

### 4.2 编辑步骤

点击任意步骤，可在右侧面板编辑：

```
┌─────────────────────────────────────────────────┐
│  Step Details                                   │
│  ─────────────────────────────────────────────  │
│  Type:      [ CLICK         ]                   │
│  Desc:      [ Click "Submit"      ]             │
│  Target:    [ #submit          ]                │
│                                                    │
│  Locators:                                      │
│    • role: button                               │
│    • text: Submit (fallback)                    │
│                                                    │
│  Quick Actions:                                 │
│  [1s Wait] [Network Idle] [Screenshot] [Scroll] │
│                                                    │
│  Wait Conditions:                               │
│  Before: [None           ▼]                     │
│  After:  [Network Idle   ▼]                     │
│                                                    │
│  [Duplicate]  [Delete]                          │
└─────────────────────────────────────────────────┘
```

### 4.3 拖拽排序

拖动步骤左侧的 `⋮⋮` 图标可调整步骤顺序。

### 4.4 复制/删除

- **复制**: 点击 + 图标或 `Ctrl+D`
- **删除**: 点击 🗑️ 图标或 `Delete` 键

---

## 五、搜索和筛选

### 5.1 搜索步骤

在搜索框中输入关键词，可按以下内容搜索：

- 步骤描述
- 目标选择器
- 页面名称

### 5.2 筛选动作类型

使用下拉菜单筛选特定类型的动作：

```
Filter: [All Actions ▼]
        All Actions
        Clicks
        Fills
        Navigates
        Waits
        Asserts
```

显示格式：`X / Y steps`（X 为筛选后数量，Y 为总数）

---

## 六、等待条件配置

### 6.1 为什么需要等待条件？

页面加载速度不确定，等待条件可确保测试稳定性。

### 6.2 配置选项

每个步骤可配置 **Wait Before** 和 **Wait After**：

| 条件类型 | 说明 | 适用场景 |
|----------|------|----------|
| **None** | 不等待 | 快速操作 |
| **Network Idle** | 网络空闲 | 页面加载完成后 |
| **DOM Ready** | DOM 就绪 | 元素已渲染 |
| **Selector Visible** | 选择器可见 | 特定元素出现 |
| **Timeout** | 超时等待 | 固定等待时间 |

### 6.3 快捷等待操作

点击右侧面板的 **Quick Actions** 快速添加：

```
[⏱️ 1s Wait]    - 等待1秒
[📡 Network Idle] - 等待网络空闲
[📷 Screenshot] - 截取截图
[⬆️ Scroll Top] - 滚动到顶部
```

---

## 七、快捷键

### 7.1 录制控制

| 快捷键 | 功能 |
|--------|------|
| `Space` | 暂停/继续录制 |
| `Esc` | 关闭对话框 |

### 7.2 编辑操作

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+S` | 保存 |
| `Ctrl+N` | 添加动作 |
| `Delete` | 删除选中步骤 |
| `Ctrl+D` | 复制步骤 |
| `↑` | 上移选中步骤 |
| `↓` | 下移选中步骤 |

### 7.3 快捷键提示

日志栏显示当前可用快捷键：

```
[Space: Pause] [Ctrl+Z: Undo] [Ctrl+Y: Redo] [Ctrl+S: Save] [Ctrl+N: Add] [Del: Delete]
```

---

## 八、保存和恢复

### 8.1 自动保存

- 录制期间每 **10 秒** 自动保存到本地
- 状态指示器显示保存状态：
  - 🟢 绿色 - 已保存
  - 🟡 黄色脉冲 - 保存中
- 数据保留 **24 小时**

### 8.2 手动保存

1. 点击 💾 **Save** 按钮
2. 输入脚本名称
3. 选择项目
4. 点击 **Save**

### 8.3 恢复会话

重新打开应用时，自动检测并提示恢复未保存的录制：

```
┌─────────────────────────────────────────────────┐
│  发现未保存的录制会话                            │
│  ─────────────────────────────────────────────  │
│  保存时间: 2024-01-15 14:30:00                  │
│                                                    │
│  [恢复会话]        [放弃]                        │
└─────────────────────────────────────────────────┘
```

---

## 九、数据存储

### 9.1 存储位置

| 数据类型 | 存储位置 |
|----------|----------|
| 自动保存 | `localStorage` (浏览器) |
| 正式保存 | `SQLite` 数据库 |

### 9.2 SQLite 结构

保存的录制数据存储在以下表结构中：

```
scripts (脚本)
├── scenarios (场景)
│   ├── pages (页面)
│   │   ├── actions (动作)
│   │   │   ├── locator_strategies (定位器)
│   │   │   └── parameters (参数)
```

---

## 十、最佳实践

### 10.1 录制前

- [ ] 准备好目标网站 URL
- [ ] 确认 Kernel 版本兼容
- [ ] 清理浏览器缓存（避免干扰录制）

### 10.2 录制中

- [ ] 保持操作节奏稳定
- [ ] 使用等待条件处理慢速加载
- [ ] 避免不必要的重复操作
- [ ] 为场景和页面使用描述性名称

### 10.3 录制后

- [ ] 检查步骤顺序是否正确
- [ ] 验证目标选择器唯一性
- [ ] 添加必要的等待条件
- [ ] 测试脚本可重放性

---

## 十一、常见问题

### Q1: Kernel 下拉框为空怎么办？

**原因**: 系统没有检测到 Chrome 浏览器。

**解决方案**:

1. **检查 Chrome 是否已安装**
   - macOS: `/Applications/Google Chrome.app`
   - Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - Linux: `/usr/bin/google-chrome`

2. **手动添加 Kernel**
   - 点击左侧导航栏 **Kernels** 图标
   - 点击 **Auto-detect** 自动扫描
   - 或点击 **Add Manually** 手动选择 chrome 可执行文件

3. **升级 Chrome**
   - 需要 Chrome 版本 >= 86.0.4240.198
   - 低于此版本的 Chrome 将标记为不兼容

### Q2: 录制的内容没有显示？

1. 检查 WebSocket 连接状态
2. 确认 Kernel 已正确启动
3. 查看日志面板的错误信息

### Q3: 定位器不准确？

Recorder 生成的 locator 按优先级排列：
1. `role` - 语义化角色
2. `text` - 文本内容
3. `css` - CSS 选择器
4. `xpath` - XPath（最后备选）

### Q4: 如何处理动态元素？

1. 使用 `Wait` 条件等待元素出现
2. 手动调整选择器为更稳定的属性
3. 避免使用动态生成的 ID

### Q5: 录制中断怎么办？

1. 自动保存的数据可在 24 小时内恢复
2. 重新启动录制后继续操作
3. 查看日志定位中断原因

### Q6: 录制功能无法启动？

1. 确认 Chrome Kernel 已添加并标记为兼容
2. 检查 Engine 连接状态（顶部状态栏）
3. 重启应用后重试

---

## 十二、技术限制

当前版本限制：

| 功能 | 状态 | 说明 |
|------|------|------|
| 真实 WebSocket 录制 | 🔄 进行中 | 需要 ForgeEngine 配合 |
| 自动 locator 生成 | 🔄 进行中 | 需要 ForgeEngine 配合 |
| 真实截图捕获 | 🔄 进行中 | 需要 ForgeEngine 配合 |
| iFrame 录制 | 📋 计划中 | 后续版本支持 |
| 多标签页录制 | 📋 计划中 | 后续版本支持 |

---

## 十三、相关文档

- [需求规格书](../specs/001-traceforge-desktop/spec.md)
- [实现状态](../IMPLEMENTATION_PROGRESS.md)
- [Recorder 需求检查清单](../specs/001-traceforge-desktop/checklists/recorder.md)

---

*最后更新: 2024-01-15*
