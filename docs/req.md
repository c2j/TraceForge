**TraceForge 需求规格书（v1.0 - 2025年12月）**

**项目名称**：TraceForge - 高性能、高可靠、数据驱动的桌面级Web UI自动化测试平台  
**版本**：1.0  
**日期**：2025年12月16日  
**目标**：打造专治遗留Web系统（Chrome 86+）的自动化测试神器，实现录制零flake、回放容错、数据驱动、多浏览器内核迭代测试、分布式执行与协作管理。

### 1. 项目概述
TraceForge采用Desktop/Server架构：
- **TraceForge Desktop**：Tauri（Rust+React）桌面客户端，本地SQLite缓存，支持离线全功能。
- **ForgeEngine**：Python sidecar引擎（PyInstaller打包），核心执行Playwright浏览器自动化。
- **TraceForge Server**：Java Spring Boot服务端，负责脚本/结果/节点协作管理。
- **ForgeAgent**：与ForgeEngine相同可执行文件，headless模式部署于多节点。

### 2. 核心目标
- 高性能：并行执行、实时WebSocket反馈。
- 高可靠：Playwright auto-wait + 多locator策略 + 视觉对比 + 重试。
- 数据驱动：脚本参数化，支持CSV/Excel/DB数据源。
- 遗留系统兼容：支持自定义Chrome内核（最低86.0.4240.198）。
- 离线优先：本地SQLite全存脚本/结果，服务端在线时自动同步。
- 大规模协作：分布式Agent网格、权限管理、Allure级报告。

### 3. 用户角色
- **测试工程师**：录制、编辑、调试脚本，本地/服务端执行。
- **测试Lead**：管理项目/版本/节点、查看报告、调度大规模回归。
- **Agent管理员**：部署/监控ForgeAgent节点。

### 4. 功能需求

#### 4.1 TraceForge Desktop（客户端）
1. **ForgeRecorder（录制器）**
   - 全屏模式，启动外部真实浏览器（headful）。
   - 支持Playwright codegen或trace录制，实时WS推送步骤/截图/日志。
   - 内核切换：下拉选择自定义Chrome版本。
   - 手动添加Assert/Screenshot。
   - 保存至本地SQLite或服务端。

2. **ForgeEditor（脚本编辑器）**
   - 三栏布局：步骤树 + 详情 + 预览截图。
   - 支持拖拽排序、折叠组、单步调试。
   - 多策略locator（优先role/text > css > xpath）。
   - 数据驱动参数化表格编辑。
   - 内核选择 + 多内核迭代运行（生成对比报告）。
   - 保存/加载本地或服务端脚本。

3. **ForgeDashboard（仪表板）**
   - 项目/版本切换、KPI、趋势图、快速入口。

4. **ForgeResults（测试结果）**
   - 执行历史列表（本地+服务端）。
   - 详情页：步骤状态、视觉回归对比、根因分析。
   - 一键打开ForgeTracer（Playwright trace viewer）。

5. **ForgeKernels（浏览器内核管理）**
   - 添加/检测/设置默认任意本地Chrome executable。
   - 支持最低Chrome 86.0.4240.198。

6. **ForgeNodes（节点管理）**
   - 显示本地桌面 + 远程ForgeAgent。
   - 监控状态/资源/支持内核。

7. **ForgeTracer**
   - 全屏嵌入Playwright官方trace viewer。

8. **Settings**
   - Engine端口、服务端URL、数据库管理、默认内核、主题。

#### 4.2 ForgeEngine（Python sidecar）
- WebSocket服务器（FastAPI/aiohttp）。
- 启动参数：--port 0 --headless --kernel-id。
- 支持headful/headless、指定executablePath。
- 实时推送：步骤、截图（base64 binary）、日志、trace。
- 执行pytest-playwright脚本，支持数据驱动、视觉对比。
- 本地SQLite读写（脚本/结果缓存）。

#### 4.3 ForgeAgent（分布式执行节点）
- 与ForgeEngine同一可执行文件。
- 启动后向服务端注册（心跳上报状态/内核）。
- 接收服务端WS任务，执行后推送结果/trace/artifact。

#### 4.4 TraceForge Server（服务端）
- REST + WebSocket API。
- 脚本/项目/版本Git-like管理。
- Agent注册/调度/负载均衡。
- 结果存储（MinIO存trace/截图/视频）。
- 权限控制（RBAC）、Allure报告展示。

### 5. 关键用户场景描述（新增核心补充）

#### 场景1：遗留系统脚本录制（测试工程师日常核心，专治旧Chrome痛点）
**用户**：测试工程师小张，面对公司10年老系统，只支持Chrome 86。  
**前置**：已在ForgeKernels添加Chrome 86 portable executable，并设为Recording默认。  
**流程**：
1. 从Dashboard点击“Quick Record” → 全屏进入ForgeRecorder。
2. 顶部下拉确认Kernel: Chrome 86。
3. 点击“Start Recording” → ForgeEngine启动外部Chrome 86（headful），打开目标URL。
4. 小张在真实浏览器操作：登录 → 搜索商品 → 下单。
5. ForgeRecorder左侧实时推送步骤（goto/click/fill），右侧每3s刷新大截图+当前元素红框。
6. 操作中发现元素文本变化，点击“Assert” → 暂停 → 选择text locator（Playwright智能推荐role/text优先）。
7. 点击“Stop” → 弹窗“Save as New Script” → 输入TC001-Purchase → 保存至本地SQLite。
8. 自动跳转ForgeEditor查看/微调locator策略。
**结果**：5分钟录制出零flake脚本，完美兼容旧内核，无需改系统浏览器。

#### 场景2：脚本调试与根因分析（失败必备，神级trace救命）
**用户**：小张，脚本在Chrome Latest失败，但Chrome 86通过（UI微调导致）。  
**流程**：
1. 在ForgeEditor打开脚本，顶部选多内核迭代（Chrome 86 + Latest）。
2. 点击“Debug Run” → ForgeEngine顺序启动两个浏览器实例。
3. 运行中：左侧步骤树实时状态动画（运行中蓝/成功绿/失败红），右侧预览截图跳对应步骤。
4. Latest失败：步骤树定位失败步，点击“Highlight” → 外部浏览器临时红框元素（确认locator碎）。
5. 中间详情加fallback locator（text → css）。
6. 执行完 → 跳转ForgeResults对比报告：Chrome 86 Pass / Latest Fail + 视觉diff侧-by-side。
7. 点击“View in ForgeTracer” → 全屏trace：拖时间轴看DOM快照、网络瀑布、console错误。
8. 根因一目了然：新版按钮role变，3分钟修复locator。
**结果**：从失败到定位根因<10分钟，trace viewer碾压传统日志。

#### 场景3：数据驱动大规模回归（测试Lead回归神器）
**用户**：测试Lead老王，需跑1000组支付数据（Excel数据源）。  
**流程**：
1. ForgeEditor打开脚本 → 参数化步骤（用户名/密码/金额）→ “Edit Data Table” → 导入Excel 1000行。
2. 保存脚本至服务端（项目E-Commerce v2.1）。
3. ForgeNodes查看：5个ForgeAgent在线（headless Latest内核）。
4. 在ForgeEditor或Results页点击“Run on Grid” → 选择脚本+数据 → 指定内核Latest。
5. 服务端调度：任务切片推Agent，并行执行（单Agent 20并发）。
6. ForgeResults实时刷新进度（总1000/运行中/完成）。
7. 执行完：列表显示总体Pass 98% / Fail 20（数据问题），点击失败项看视觉diff+trace。
**结果**：1000案例从手动几天 → 自动1小时，报告自动聚合。

#### 场景4：离线开发与服务端同步（出差/网络差场景）
**用户**：小张出差，无网。  
**流程**：
1. 打开TraceForge Desktop → Engine自动本地启动（SQLite缓存上次项目）。
2. Dashboard加载本地脚本，继续编辑/录制/本地执行（headful Chrome 86）。
3. 新录3个脚本，跑本地回归。
4. 回公司联网 → 顶部Server: Online → 自动sync：本地新脚本推服务端，服务端新版本拉取（冲突弹窗manual merge）。
**结果**：断网不影响核心工作，联网无缝协作。

#### 场景5：分布式节点扩展与监控（团队规模化）
**用户**：老王，团队新增Linux服务器跑headless回归。  
**流程**：
1. 在新机部署ForgeAgent（复制forge-engine --agent --port 8765）。
2. Agent启动自动注册服务端（心跳上报Latest内核）。
3. ForgeNodes刷新：新卡出现 ● ONLINE，CPU/Mem实时进度条。
4. 调度任务时服务端优先空闲节点。
5. 节点负载高 → 老王点Maintenance → 暂停新任务。
**结果**：5分钟加节点，规模从1机 → 10机无痛扩展。

#### 场景6：视觉回归验收（UI设计师协作）
**用户**：小张，产品改版后视觉回归爆红。  
**流程**：
1. 回归执行完 → ForgeResults详情页视觉对比：Side-by-Side + Diff高亮15%差异。
2. 确认是预期改版 → 点击“Accept New Baseline” → 更新服务端基线截图。
3. 下次回归绿灯。
**结果**：视觉变化不误报，验收一键完成。


### 6. 非功能需求
- **性能**：单机并行≥20浏览器实例；截图刷新≤5s。
- **可靠性**：Engine断连自动重连；脚本执行重试机制。
- **安全性**：本地WS无认证；服务端JWT。
- **打包体积**：Desktop <300MB（含bundled最新Chrome）。
- **跨平台**：Windows优先，Mac/Linux次之。
- **离线支持**：断网时录制/编辑/本地执行全功能。

### 7. 技术栈
- **Desktop**：Tauri 2 + React 18 + TypeScript + Tailwind + Zustand + Shadcn/ui
- **Engine/Agent**：Python 3.12 + Playwright 1.48+ + FastAPI + WebSocket
- **本地存储**：SQLite（sqlmodel/sqlalchemy）
- **Server**：Spring Boot 3 + PostgreSQL + MinIO + WebSocket
