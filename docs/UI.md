**TraceForge Desktop 全套界面文字线框描述（2025最终架构版）**


TraceForge Desktop/
├── src/
│   ├── pages/
│   │   ├── ForgeRecorder.tsx
│   │   ├── ForgeEditor.tsx
│   │   ├── ForgeDashboard.tsx
│   │   └── ...
│   ├── components/
│   │   ├── TFStepCard.tsx
│   │   └── ...
│   └── stores/useForgeStore.ts
└── public/logo-traceforge.svg       # 锤子+trace波形Logo

要能支持多语言（首先支持中文和英文）

本界面后续将作为tauri桌面应用的前台，为便于集成开发，并能与桌面应用的后台交互，请注意让组件零视觉改动就能跑 MOCK / HTTP / IPC 三态。

**1. 主布局（TFLayout，所有页面共用）**
```
┌────────────────────────────────────────────────────────────────────┐
│ 顶部状态栏                                                         │
│ [TraceForge Logo]                           Engine: Connected (port 54321) ●  Server: Online ●  User: Jane Doe ▼ │
├──────────────┬─────────────────────────────────────────────────────┤
│ 侧边栏       │ 主内容区                                            │
│ (可折叠)     │                                                     │
│ ┌──────────┐ │                                                     │
│ │ Dashboard│ │                                                     │
│ │ Recorder │ │                                                     │
│ │ Editor   │ │                                                     │
│ │ Results  │ │                                                     │
│ │ Nodes    │ │                                                     │
│ │ Kernels  │ │                                                     │
│ │ Settings │ │                                                     │
│ └──────────┘ │                                                     │
│              │                                                     │
│ Local Mode   │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```
交互：Engine状态红闪断连自动重连；侧边栏悬停展开子菜单。

**2. ForgeDashboard（仪表板主页）**
```
┌────────────────────────────────────────────────────────────────────┐
│ 项目: E-Commerce ▼   版本: v2.1.0 ▼   [New Project] [Quick Record] │
├────────────────────────────────────────────────────────────────────┤
│ KPI 卡片 (4列)                                                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│ │ Pass Rate  │ │ Failures   │ │ Coverage   │ │ Scripts    │      │
│ │ 92% (+8%)  │ │ 2          │ │ 85%        │ │ 48         │      │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘      │
├────────────────────────────────────────────────────────────────────┤
│ 执行趋势 (Recharts 面积图，7天 Pass/Fail/Skip)                     │
├────────────────────────────────────────────────────────────────────┤
│ 快速入口网格                                                       │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│ │ Start      │ │ New Script │ │ Run All    │ │ Kernel Mgr │      │
│ │ Recording  │ │            │ │ Local      │ │            │      │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘      │
└────────────────────────────────────────────────────────────────────┘
```
交互：KPI卡片点击跳转Results；Quick Record直接全屏ForgeRecorder。

**3. ForgeRecorder（全屏录制器）**
**界面设计原则**
- **场景（Scenario）**：顶层业务流（如“用户登录 → 商品搜索 → 下单支付”），支持多个场景串联或分支。
- **页面（Page）**：每个URL或页面状态作为一个Page节点，自动检测导航。
- **操作（Action）**：鼠标移动、hover、click、dblclick、键盘输入、拖拽、滚动、等待（wait_for_load_state / selector / networkidle）、Assert、Screenshot。
- **智能分组**：录制时自动按导航事件分组页面，手动可拖拽调整。
- **等待自动注入**：Playwright auto-wait基础 + 显式wait_for反馈（如加载spinner消失）。
- **分支支持**：条件Assert失败走备用路径（未来扩展）。
```
┌────────────────────────────────────────────────────────────────────┐
│ 顶部控制栏                                                         │
│ ● Recording 02:15   [Pause] [Stop] [Add Scenario] [Assert] [Screenshot] Kernel: Chrome 86 ▼  [Cancel] [Save] │
├──────────────────────┬─────────────────────────────────────────────┤
│ 左侧场景树 (40%)     │ 右侧实时预览 (60%)                          │
│ ┌──────────────────┐ │ ┌─────────────────────────────────────────┐ │
│ │ Scenarios        │ │ │ 大截图 + 当前元素红框 + 页面URL         │ │
│ │  ┌─────────────┐ │ │ │                                         │ │
│ │  │ Scenario 1:  │ │ │ │ [时间轴拖拽查看历史]                    │ │
│ │  │ Purchase Flow│ │ │ └─────────────────────────────────────────┘ │
│ │  │   ┌─────────┐ │ │                                             │
│ │  │   │ Page 1: │ │ │                                             │
│ │  │   │ /login  │ │ │                                             │
│ │  │   │ 1. fill username│ │                                        │
│ │  │   │ 2. fill password│ │                                        │
│ │  │   │ 3. click "Login"│ │                                        │
│ │  │   │ 4. wait_for selector ".dashboard"  │            │
│ │  │   └─────────┘ │ │                                             │
│ │  │   ┌─────────┐ │ │                                             │
│ │  │   │ Page 2: │ │ │                                             │
│ │  │   │ /search │ │ │                                             │
│ │  │   │ 1. fill "#kw"   │ │                                        │
│ │  │   │ 2. press Enter  │ │                                        │
│ │  │   │ 3. wait_for networkidle │ │                                │
│ │  │   │ 4. hover ".item"│ │                                        │
│ │  │   │ 5. click "Add to Cart" │ │                                 │
│ │  │   └─────────┘ │ │                                             │
│ │ │ [+ Add Page] [+ Add Action] [Rename] [Delete]      │
│ │ └──────────────────┘ │                                             │
│ └──────────────────────┴─────────────────────────────────────────────┤
│ 底部实时日志 + 操作栏                                              │
│ [Manual Add: Navigate | Click | Fill | Hover | Wait | Scroll | ...] │
│ INFO Detected navigation to /search                                │
│ DEBUG Auto-injected wait_for networkidle                           │
└────────────────────────────────────────────────────────────────────┘
```
交互：Stop后弹窗Save to Local/Server；Assert时暂停并弹出Locator选择器。

**ForgeRecorder核心交互设计**
1. **自动场景/页面分组**：
   - 开始录制 → 自动创建Scenario 1。
   - 每次page.goto或导航事件 → 新建Page节点，命名“Page n: {url}”。
   - 操作实时归属当前Page。

2. **智能等待注入**：
   - 点击/输入后自动检测异步反馈（网络请求、DOM变化），提示“Add Wait?” → 一键插入wait_for_selector / networkidle / timeout。
   - 支持手动添加Wait行动作（选择器可见/隐藏/文本变化）。

3. **鼠标/键盘全捕获**：
   - mouse move → 可选记录hover（阈值过滤无用移动）。
   - drag/drop、scroll、right click、keyboard shortcut全支持。
   - 悬停触发下拉菜单 → 自动记录hover + wait_for visible + click。

4. **手动干预神器**：
   - 暂停录制 → 底部手动添加动作（Navigate/Wait/Assert）。
   - 选中树节点 → 右键“Insert Before/After”、“Convert to Wait”。

5. **录制后优化**：
   - Stop → 进入ForgeEditor（层次树结构完整保留）。
   - Editor中可折叠Page、拖拽跨Page移动动作、批量加locator策略。

**4. ForgeEditor（三栏脚本编辑器）**
```
┌────────────────────────────────────────────────────────────────────┐
│ 工具栏: Project > v2.1 > TC001 - Purchase Flow   Kernel: Chrome 86 ▼  [Debug Run] [Run All] [Save] [Data Table] │
├──────────────────────┬─────────────────────────────────────────────┤
│ 左侧场景树 (35%)     │ 中间操作详情 + 预览 (65%, 分栏)             │
│ ┌──────────────────┐ │ ┌─────────────────────────────────────────┐ │
│ │ Scenarios        │ │ │ 当前选中节点详情面板                    │ │
│ │  ┌─────────────┐ │ │ │ Action: Click ▼                         │ │
│ │  │ Scenario 1:  │ │ │ │ Locators:                               │ │
│ │  │ Purchase Flow│ │ │ │ 1. role=button[name="Add to Cart"]     │ │
│ │  │ (P0)         │ │ │ │ 2. text="Add to Cart"                  │ │
│ │  │   ┌─────────┐ │ │ │ │ 3. css=.add-cart-btn                   │ │
│ │  │   │ Page 1: │ │ │ │ │ [+ Add Strategy] [Test Locator]        │ │
│ │  │   │ /login  │ │ │ │ │ Timeout: 30s   Wait For: networkidle ▼ │ │
│ │  │   │ 1. fill username│ │ │ Params: ...                          │ │
│ │  │   │ 2. fill password│ │ │                                         │ │
│ │  │   │ 3. click "Login"│ │ │ ┌─────────────────────────────────────┐ │ │
│ │  │   │ 4. wait_for ".dashboard" │ │ │ 实时预览区 (50%)                  │ │
│ │  │   └─────────┘ │ │ │ │ 当前Page大截图 + 高亮红框         │ │
│ │  │   ┌─────────┐ │ │ │ │ [Jump to Browser] [Step Screenshot]│ │
│ │  │   │ Page 2: │ │ │ │ └─────────────────────────────────────┘ │
│ │  │   │ /search │ │ │ │ 操作时间轴 (50%)                        │ │
│ │  │   │ ...     │ │ │ │ │ [拖拽播放头查看历史步骤截图]      │ │
│ │  │   └─────────┘ │ │ │ └─────────────────────────────────────────┘ │
│ │ [+ Add Scenario] [+ Add Page] [Import Steps] [Collapse All]      │
│ └──────────────────────┴─────────────────────────────────────────────┤
│ 底部日志/执行流 (可折叠)                                           │
└────────────────────────────────────────────────────────────────────┘
```
交互：点击步骤 → 右侧显示该步截图+高亮；Highlight按钮临时在外部浏览器红框元素。

**ForgeEditor核心交互设计**

1. **左侧场景树全面层次化**：
   - Scenario（可多，串联业务流）
     → Page（自动/手动命名，支持URL或描述，如“登录页”、“搜索结果页”）
       → Action（操作步骤）
   - 支持完整拖拽：跨Page/Scenario移动动作、批量选中删除。
   - 右键菜单：Insert Page/Wait/Assert、Convert Action to Wait、Group as Scenario。
   - 折叠/展开，复杂脚本一目了然。

2. **中间详情面板动态适配**：
   - 选中Scenario：显示描述、优先级、数据驱动绑定。
   - 选中Page：显示入口Navigate、默认Wait（load/networkidle）、Page-level Assert。
   - 选中Action：标准详情 + 多locator策略排序 + 参数化占位符（{{data.column}}）。
   - 新增“Auto-Inject Wait”开关：运行时动态加wait_for反馈。

3. **右侧预览区双模式**：
   - 上半：当前Page/Step大截图 + 元素高亮红框。
   - 下半：时间轴序列截图（Recorder录制时每步自动拍），拖拽播放头预览执行流。
   - 按钮：Jump to Browser（临时打开外部浏览器定位到该步时间点，Playwright goto trace timestamp）。

4. **调试/执行增强**：
   - Debug Run：从选中Scenario/Page开始单步执行，树节点实时状态（运行中/成功/失败）。
   - Run All：支持多内核并行（每个内核独立报告，层次树对比显示）。
   - 数据驱动：点击[Data Table] → 全屏表格编辑，支持{{row.col}}绑定到任意Action params。

5. **智能辅助**：
   - 选中Action → “Test Locator”：临时在外部浏览器高亮所有匹配元素，验证可靠。
   - 失败后自动建议：Add Wait / New Fallback Locator / Ignore Visual Diff。
   - 导入Recorder步骤：自动解析为层次结构。

**5. ForgeKernels（浏览器内核管理器）**
```
┌────────────────────────────────────────────────────────────────────┐
│ ForgeKernels Manager                                      [+ Add]  │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────────────┐         │
│ │ Chrome 86.0.4240.198   │ │ Chrome 130.0 (Bundled) │         │
│ │ Path: C:\browsers\86   │ │ Path: Built-in         │         │
│ │ Status: Compatible     │ │ Status: Latest         │         │
│ │ [Default Record] [Test]│ │ [Default Agent] [Remove]│        │
│ └────────────────────────┘ └────────────────────────┘         │
└────────────────────────────────────────────────────────────────────┘
```
交互：+ Add → 文件选择chrome.exe → 自动检测版本。

**6. ForgeNodes（分布式节点管理）**
```
┌────────────────────────────────────────────────────────────────────┐
│ ForgeNodes                                          [Refresh] [+]  │
│ Online: 5  Busy: 1  Local: 1                                       │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────────────┐         │
│ │ Local Desktop (This PC)│ │ ForgeAgent-01 (192.168.1.100)      │
│ │ ● ONLINE               │ │ ● BUSY                         │
│ │ Kernels: 86, Latest    │ │ CPU ███████░ 70%               │
│ │ [Details]              │ │ Mem █████░░░ 50%               │
│ └────────────────────────┘ │ Kernels: Latest                │
│                           │ [Maintenance] [Remove]         │
└────────────────────────────────────────────────────────────────────┘
```
交互：Local卡始终置顶。

**7. ForgeResults（结果列表页）**
```
┌────────────────────────────────────────────────────────────────────┐
│ Execution History                                 [Filter] [Search]│
├────────────────────────────────────────────────────────────────────┤
│ Status │ Project/Version │ Script      │ Duration │ Kernel │ View   │
│ PASS   │ E-Commerce v2.1 │ TC001 Login │ 12s      │ 86     │ →      │
│ FAIL   │ E-Commerce v2.1 │ TC002 Pay   │ 45s      │ Latest │ →      │
└────────────────────────────────────────────────────────────────────┘
```

**8. ForgeResults → 执行详情页**
```
┌────────────────────────────────────────────────────────────────────┐
│ TC002 - Payment Fail [FAILED]   Kernel: Chrome 86   45s ago      │
│ [View in ForgeTracer]                                              │
├─────────────────────┬─────────────────────┬──────────────────────┤
│ 质量评分: 78 (C+)   │ 步骤饼图 Pass 8/Fail 1│ 视觉回归对比         │
│ 受1个失败影响       │                       │ [Side-by-Side] [Accept]│
├─────────────────────┴─────────────────────┴──────────────────────┤
│ 日志 + 根因分析                                                    │
│ 14:30:04 ERROR Timeout waiting for button#pay                      │
└────────────────────────────────────────────────────────────────────┘
```

**9. ForgeTracer（独立全屏Trace查看器）**
```
┌────────────────────────────────────────────────────────────────────┐
│ ForgeTracer - trace-20251216-tc002.zip                    [Download]│
├────────────────────────────────────────────────────────────────────┤
│ 时间轴拖动条                                                       │
├──────────────┬──────────────────────┬────────────────────────────┤
│ Actions列表  │ DOM/Network快照      │ Console/源码               │
│ ✔ goto       │ [当前时间点截图+高亮] │ [错误高亮]                 │
│ ✔ click      │                      │                            │
│ ✘ fill       │                      │                            │
└──────────────┴──────────────────────┴────────────────────────────┘
```

**10. Settings（设置页）**
```
┌────────────────────────────────────────────────────────────────────┐
│ Engine Port Range: 50000-60000                                     │
│ Server URL: https://traceforge.company.com                         │
│ Local DB: ~/TraceForge/data.db   [Clear Cache]                     │
│ Default Recording Kernel: Chrome 86                                │
│ Theme: Dark ▼                                                      │
└────────────────────────────────────────────────────────────────────┘
```
