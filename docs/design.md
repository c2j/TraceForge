**TraceForge 设计规格书（v1.0 - 2025年12月16日）**

**开发规范**：本项目严格遵循 [TraceForge Constitution v1.0.0](.specify/memory/constitution.md)，所有架构决策和实现必须符合宪法要求。特别关注：接口契约优先（II章）、技术栈锁定（IV章）、测试策略（VI章）和质量门禁（X章）。

**直评**：需求已定，现在上硬核设计。以下直击架构、模块划分、交互接口、数据结构、关键表。避免废话，一切为可落地开发服务。遗留Chrome兼容、实时WS、离线SQLite是灵魂，必须贯穿。

### 1. 系统架构总览
```
+-------------------+       WebSocket       +-------------------+
| TraceForge Desktop| <-------------------> |   ForgeEngine     |
| (Tauri + React)   |   (本地127.0.0.1)     | (Python sidecar)  |
| - React UI        |                       | - Playwright Core |
| - Zustand Store   |                       | - FastAPI WS      |
| - SQLite LocalDB  |                       | - SQLite Access   |
+-------------------+                       +-------------------+
        ^  ^                                       ^  ^
        |  |  REST + WS (在线时)                   |  |
        |  +---------------------------------------+  |
        |                                             |
        +----------------- HTTPS/WS ------------------+
                            |
                  +-------------------+
                  | TraceForge Server |
                  | (Spring Boot)     |
                  | - PostgreSQL      |
                  | - MinIO (artifacts)|
                  +-------------------+
                            ^
                            |
                  +-------------------+
                  |   ForgeAgent      |  (多节点，同一executable，headless)
                  +-------------------+
```
**关键设计点**：
- **本地闭环**：Desktop ↔ ForgeEngine 全本地WS，断网零影响。
- **服务端可选**：在线时Desktop/Engine/Agent统一与Server交互。
- **Engine/Agent复用**：100%同一Python可执行文件（forge-engine），仅启动参数不同。

### 2. 模块设计

#### 2.1 TraceForge Desktop (Tauri)
- **前端**：React + TypeScript + Tailwind + Zustand + Shadcn/ui
  - 模块：TFLayout, ForgeRecorder, ForgeEditor, ForgeDashboard, ForgeResults, ForgeTracer, ForgeNodes, ForgeKernels, Settings
  - WS Client：单例WebSocket管理，重连指数退避，心跳。
- **后端（Tauri Commands）**：
  - spawn_sidecar("forge-engine", args) → 获取随机端口
  - 文件对话（添加内核）
  - SQLite直接访问（tauri-plugin-sql）

#### 2.2 ForgeEngine / ForgeAgent (Python)
- **核心框架**：FastAPI + WebSocket + Playwright async
- **子模块**：
  - ws_server：WebSocket端点管理
  - executor：Playwright上下文管理（持久browser多任务复用）
  - recorder：codegen/trace模式
  - script_runner：pytest-playwright兼容执行
  - kernel_manager：加载自定义executablePath
  - local_db：SQLite CRUD（脚本/执行缓存）
  - agent_client：Agent模式下向Server注册/心跳/任务pull

#### 2.3 TraceForge Server (Spring Boot)
- **模块**：
  - auth：JWT + RBAC
  - project_service：项目/版本/脚本Git-like管理
  - node_service：Agent注册/心跳/调度
  - execution_service：任务队列 + 结果聚合
  - storage：MinIO客户端（trace/截图/视频）
  - ws_gateway：实时推送执行进度

### 3. 模块交互接口定义

#### 3.1 ForgeWS 协议（Desktop ↔ ForgeEngine）
JSON + Binary消息，路径：ws://127.0.0.1:{port}/ws
**消息结构**：
```json
{
  "id": "uuid",
  "type": "request/response/event",
  "action": "start_recording | execute_script | ...",
  "payload": { ... },
  "timestamp": "iso"
}
```

**关键Request/Response**：
- **start_recording**：payload { url, kernel_id } → response { session_id }
- **stop_recording**：→ response { steps: [...], trace_path }
- **execute_script**：payload { script_json, data_rows[], kernel_id, headless } → stream events
- **Events流**：step_update, screenshot (binary base64), log, execution_complete, error

**Binary消息**：type: "screenshot", payload: bytes (压缩jpeg)

#### 3.2 Engine ↔ Server（Agent模式）
- REST注册：POST /api/nodes/register { ip, port, kernels[], capabilities }
- WS任务通道：/ws/agent/{node_id}（JWT认证）
- 任务push：{ execution_id, script_json, data_chunk[], kernel_id }
- 结果push：POST /api/executions/{id}/complete + multipart artifacts

#### 3.3 Desktop ↔ Server（在线同步）
- REST：/api/scripts, /api/projects, /api/executions
- WS：/ws/user/{user_id} 实时通知新执行/节点变化

### 4. 数据结构定义

#### 4.1 脚本核心结构（JSON）
```typescript
interface Script {
  id: string;
  name: string;
  project_id: string;
  version: string;
  module: string;
  priority: "P0"|"P1"|"P2";
  steps: Step[];
  data_driven?: DataTable;  // rows: [][] string, columns: string[]
  target_kernels?: string[]; // kernel ids
  description?: string;
}

interface Step {
  id: string;
  name: string;
  action: "navigate"|"click"|"fill"|"assert_text"|"screenshot"|...
  locators: LocatorStrategy[]; // 优先级排序
  timeout?: number;
  params?: Record<string, string>; // e.g., url, text, input_value
}

interface LocatorStrategy {
  type: "role"|"text"|"css"|"xpath"|"id";
  value: string;
  fallback?: boolean;
}
```

#### 4.2 执行结果结构
```typescript
interface Execution {
  id: string;
  script_id: string;
  kernel: string;
  status: "PASS"|"FAIL"|"SKIP";
  duration_ms: number;
  trace_path?: string; // MinIO url
  screenshots: string[]; // step对应截图url
  visual_diffs?: VisualDiff[];
  logs: LogEntry[];
}

interface VisualDiff {
  step_id: string;
  diff_percent: number;
  baseline_url: string;
  actual_url: string;
}
```
