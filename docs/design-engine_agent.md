**ForgeEngine & ForgeAgent 设计规格书（v1.0 - 2025年12月16日）**

**直评**：ForgeEngine是TraceForge的灵魂核心——纯Python sidecar可执行文件（PyInstaller打包），同时承担Desktop本地引擎和分布式ForgeAgent双重身份。所有Playwright浏览器操作、实时WS通信、录制/回放逻辑、内核管理、离线缓存全在这里。一针见血：这模块必须极稳、极快、零外部依赖（打包后standalone），否则整个平台flake。

### 1. 模块概述
- **定位**：TraceForge的核心执行引擎，负责：
  - 与Desktop实时WebSocket交互（本地127.0.0.1）。
  - Playwright浏览器自动化（headful/headless，多内核）。
  - 场景化录制（Scenario-Page-Action层次）。
  - 脚本执行（数据驱动、容错回放、视觉对比）。
  - 本地SQLite缓存（脚本/结果/设置）。
  - Agent模式下与Server通信。
- **运行模式**：
  - Desktop模式（默认）：--port 0（随机） --headful优先
  - Agent模式：--agent --port fixed --headless
- **打包要求**：PyInstaller --onefile，含Playwright bundled最新Chrome + 用户自定义内核支持。

### 2. 功能说明

1. **WebSocket服务器**
   - FastAPI + WebSockets，提供单连接实时通信。
   - 支持Desktop单客户端，Agent模式下支持Server push。

2. **浏览器内核管理**
   - 加载用户自定义Chrome executablePath（最低86.0）。
   - 持久BrowserContext复用（多任务性能拉满）。

3. **场景化录制（ForgeRecorder核心后端）**
   - 启动headful浏览器，trace + 自定义listener。
   - 自动检测导航分组Page，手动/自动注入Wait。
   - 实时推送步骤树、截图、建议Wait。

4. **脚本执行**
   - 解析层次脚本JSON，按Scenario→Page→Action遍历。
   - 多locator策略优先级尝试 + auto-wait + 重试。
   - 数据驱动参数化替换。
   - 视觉对比（expect.toHaveScreenshot + threshold）。
   - 生成Playwright trace + 步截图。

5. **本地缓存**
   - SQLite读写脚本/执行历史/内核配置。

6. **Agent扩展**
   - 启动时注册Server，心跳上报状态/内核。
   - pull/push任务执行。

### 3. 关键场景描述

#### 场景1：复杂业务流录制（购物流）
**流程**：
1. Desktop发start_recording {url, kernel_id="chrome86"}
2. Engine启动Chrome86 headful，开启trace。
3. 监听navigation → 新建Page节点推送。
4. 用户登录 → click/fill → 自动检测post-click网络请求 → 推送auto_wait_suggested。
5. 导航/search → 新Page，输入搜索 → press Enter → 自动注入wait_for networkidle。
6. hover商品 → click加购 → 推送action_recorded。
7. Desktop暂停 → 手动添加Assert。
8. stop_recording → 返回完整层次脚本JSON + trace.zip。

#### 场景2：容错回放与自愈
**流程**：
1. execute_script {script_json, data_rows[100], kernel_id="latest"}
2. 遍历Action：优先role locator → 失败切text → 再css。
3. 每个Page入口自动wait_for_load_state("networkidle")
4. 视觉Assert失败 → 生成diff截图推送。
5. 执行完 → 推送execution_complete + trace + 结果JSON。

#### 场景3：Agent分布式执行
**流程**：
1. 启动 --agent --port 8765
2. POST Server注册内核/能力。
3. Server WS push任务 → Engine无头执行 → 分chunk上传artifact → complete。

### 4. 关键数据结构设计

#### 4.1 层次脚本结构（核心JSON）
```python
class LocatorStrategy(BaseModel):
    type: str  # "role" | "text" | "css" | "xpath" | "id"
    value: str
    fallback: bool = False

class Action(BaseModel):
    id: str
    name: str
    action_type: str  # "navigate"|"click"|"fill"|"hover"|"wait_for"|"assert_text"|"screenshot"...
    locators: List[LocatorStrategy] = []
    params: dict = {}  # url/text/input_value/timeout/selector
    wait_after: str | None = None  # "networkidle"|"load"

class Page(BaseModel):
    id: str
    name: str
    entry_url: str | None
    actions: List[Action]
    default_wait: str = "networkidle"

class Scenario(BaseModel):
    id: str
    name: str
    description: str | None
    pages: List[Page]

class Script(BaseModel):
    id: str
    name: str
    scenarios: List[Scenario]
    data_driven: List[dict] | None = None  # rows
    target_kernels: List[str] | None = None
```

#### 4.2 WS消息结构
```python
class WSMessage(BaseModel):
    id: str
    type: str  # "request"|"response"|"event"
    action: str
    payload: dict | None = None
    error: str | None = None
```

### 5. 表结构设计（SQLite: forgeengine-local.db）

```sql
-- 内核配置
CREATE TABLE kernels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    executable_path TEXT NOT NULL,
    version TEXT,
    is_default_record BOOLEAN DEFAULT 0,
    is_default_agent BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 脚本缓存（完整JSON）
CREATE TABLE scripts (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    script_json TEXT NOT NULL,  -- JSON string
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME
);

-- 执行历史（小规模本地）
CREATE TABLE executions (
    id TEXT PRIMARY KEY,
    script_id TEXT,
    kernel_id TEXT,
    status TEXT,
    duration_ms INTEGER,
    trace_path TEXT,  -- local file path
    artifacts JSON,   -- {"screenshots": [...], "diffs": [...]}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 设置
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### 6. 接口设计（ForgeWS协议）

**WebSocket路径**：/ws (Desktop) 或 /ws/agent (Server)

**主要Request Actions**：
- start_recording → payload: {url: str, kernel_id: str}
  → response: {session_id: str}
  → events: navigation_detected, action_recorded, auto_wait_suggested, screenshot (binary), log

- stop_recording → {session_id}
  → response: {script: Script.model_dump(), trace_path: str}

- execute_script → {script: dict, data_rows: list[dict], kernel_id: str, headless: bool}
  → events: step_start, step_complete, screenshot, visual_diff, log, execution_complete {result: Execution}

- get_kernels → response: {kernels: list}

- health_check → pong

**Binary消息**：单独WebSocket message，type="screenshot"，data=bytes(jpeg压缩)

**结论**：ForgeEngine设计已极简硬核——场景化录制/执行、WS实时、内核灵活、SQLite稳固。开发优先级：1. WS基础 + 单内核录制PoC；2. 层次结构 + 自动分组；3. 执行容错 + 数据驱动；4. Agent模式。风险直言：旧内核86兼容必须先实测（Playwright可能crash），二进制截图别卡WS（分chunk + 压缩）。
