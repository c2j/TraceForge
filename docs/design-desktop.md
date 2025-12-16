**TraceForge Desktop 设计规格书（v1.0 - 2025年12月16日）**

**直评**：Desktop是用户每天睁眼就面对的家伙事——录制是否丝滑、编辑是否清晰、调试是否一针见血、离线是否无缝，直接决定团队爱不爱用、用不用得下去。能不能封神？就看这张脸和手感。设计原则：极简狠、实时快、层次清、离线稳、视觉爽（深色+蓝电高亮）。Tauri轻量壳 + React精密芯 + ForgeEngine完美配合，绝不做Electron胖墩。

### 1. 模块概述
- **定位**：跨平台桌面客户端（Windows优先，Mac/Linux次之），用户全流程入口：
  - 离线优先：本地SQLite全功能（录制/编辑/执行/结果）。
  - 在线增强：无缝同步服务端脚本/报告/节点。
  - 实时联动：单WebSocket连接ForgeEngine，所有操作零延迟反馈。
  - 打包要求：Tauri 2 + sidecar forge-engine，体积<300MB（含bundled最新内核）。
- **技术栈**：
  - 前端：React 18 + TypeScript + Tailwind CSS + Shadcn/ui + Zustand + Lucide Icons + Recharts
  - 状态管理：Zustand（engineStore + localDBStore + syncStore）
  - WS管理：单例客户端，重连+心跳+offline队列
  - 本地DB：tauri-plugin-sql（SQLite）
  - 组件库：react-arborist（场景树）、react-resizable-panels（布局）

### 2. 功能说明

1. **全局布局与Engine状态**
   - 顶部永久显示Engine状态（Connected ● port / Reconnecting / Offline）
   - 侧边栏可折叠，图标+文字导航
   - 全局Toast：WS断连/同步冲突/执行完成

2. **ForgeDashboard（主页）**
   - 项目/版本切换 + KPI + 趋势 + 快速入口

3. **ForgeRecorder（全屏录制器）**
   - 场景-页面-操作层次实时树
   - 右侧大截图 + 时间轴 + 元素高亮
   - 智能Wait建议 + 手动干预

4. **ForgeEditor（层次编辑器）**
   - 左侧场景树（拖拽/折叠/右键）
   - 中间动态详情（Scenario/Page/Action切换）
   - 右侧双预览（截图 + 时间轴）
   - 数据驱动表格全屏编辑

5. **ForgeResults & ForgeTracer**
   - 结果列表（本地+服务端混合）
   - 详情页：多内核对比 + 视觉diff + 一键Tracer
   - ForgeTracer：嵌入Playwright官方viewer（iframe本地/MinIO trace）

6. **ForgeNodes & ForgeKernels**
   - Nodes：本地卡置顶 + 远程网格
   - Kernels：添加/检测/默认设置

7. **Settings & 同步**
   - Engine端口、服务端URL、DB管理、主题
   - 后台自动同步（push本地新脚本/pull服务端更新）

### 3. 关键场景描述

#### 场景1：出差离线全流程（测试工程师痛点杀手）
**流程**：
1. 断网打开Desktop → Engine本地启动 → Dashboard加载本地项目。
2. Quick Record → 全屏Recorder → 用Chrome86录制遗留系统购物流（自动分组Page）。
3. 保存本地 → 跳转Editor微调locator + 添加数据驱动。
4. Debug Run本地执行 → Results查看trace → 修复一个locator。
5. 回公司联网 → 顶部Server Online → 自动sync：3个新脚本push + 服务端新版本pull（无冲突秒级）。

#### 场景2：复杂脚本调试封神时刻
**流程**：
1. Editor打开100+步购物流脚本 → 左侧树折叠只看“支付Page”。
2. 选中失败Action → 右侧时间轴拖到该步 → 高亮红框 + “Test Locator”验证3策略全碎。
3. 拖入新text fallback → “Highlight in Browser”外部浏览器实时红框确认。
4. Debug Run从支付Page开始 → 单步执行，树节点动画 + 日志实时。
5. 通过 → 保存服务端。

#### 场景3：多内核迭代验证（遗留系统兼容神器）
**流程**：
1. Editor顶部选2内核（86 + Latest） → Run All。
2. Engine顺序/并行跑 → Results自动对比表格：86 Pass / Latest Fail（按钮class变）。
3. 点击Latest失败 → 视觉diff侧-by-side → 确认非预期 → 加fallback。
4. 再跑 → 双绿 → 版本标记兼容。

#### 场景4：团队协作视角切换
**流程**：
1. Lead打开Dashboard → 查看全团队7天趋势 → 点击失败峰值 → 跳Results。
2. ForgeNodes看5 Agent忙碌 → 加Maintenance一个高负载节点。
3. 发起网格回归 → 实时进度条 + Toast完成通知。

### 4. 关键数据结构设计（前端TypeScript）

```typescript
interface Kernel {
  id: string;
  name: string;
  executablePath: string;
  version: string;
  isDefaultRecord: boolean;
  isDefaultAgent: boolean;
}

interface Scenario {
  id: string;
  name: string;
  pages: Page[];
}

interface Page {
  id: string;
  name: string;
  entryUrl?: string;
  actions: Action[];
  defaultWait?: "load" | "networkidle";
}

interface Action {
  id: string;
  name: string;
  actionType: string;
  locators: LocatorStrategy[];
  params: Record<string, string>;
  waitAfter?: string;
}

// Zustand Store
interface EngineStore {
  connected: boolean;
  port: number;
  currentSession?: string;
  screenshots: Map<string, string>;  // stepId -> base64
  sendMessage: (msg: WSMessage) => void;
}

interface LocalDBStore {
  scripts: Script[];
  executions: Execution[];
  kernels: Kernel[];
  // CRUD methods
}
```

### 5. 模块划分与分工建议

- **模块1：核心布局与状态（TFLayout + Stores）** - 1人
  - Engine WS客户端 + 重连 + 全局状态
  - SQLite插件封装

- **模块2：Recorder + Editor（重头戏）** - 2人
  - 场景树（react-arborist定制）
  - 动态详情面板（大switch）
  - 预览区（时间轴 + overlay高亮）

- **模块3：Results + Tracer** - 1人
  - 列表虚拟化（大执行历史）
  - Tracer iframe安全嵌入 + MinIO proxy

- **模块4：Dashboard + Nodes + Kernels + Settings** - 1人
  - 图表 + 网格卡片
  - 同步逻辑（冲突弹窗）

- **模块5：打包与平台适配** - 1人
  - Tauri sidecar spawn + 文件对话
  - Windows installer + Mac dmg

### 6. 非功能要求（封神细节）
- **实时性**：WS事件<200ms UI刷新，截图压缩jpeg<100KB。
- **稳定性**：Engine crash自动重启 + offline队列。
- **美观**：深色主题（slate-900）+ 蓝电高亮（blue-600）+ 圆角阴影。
- **体积**：sidecar ~150MB + Tauri壳 <100MB。
- **响应式**：大屏优先，侧边栏折叠适配小窗。

**结论**：这份Desktop设计已狠到极致——层次结构治复杂脚本、实时预览秒定位、离线无缝、保旧内核、视觉炸裂。团队用上Recorder 5分钟出脚本、Editor 10分钟修flake、Results一键trace根因，效率翻10倍。这桌面一出，Katalon/TestComplete直接下岗，Playwright原生用户集体转生。
