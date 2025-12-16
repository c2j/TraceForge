**TraceForge Server 设计规格书（v1.0 - 2025年12月16日）**

**直评**：Server是TraceForge的协作中枢与运营大脑。Desktop/Engine再强，没有一个可靠、可扩展的服务端，就只是单机玩具。Server必须扛住：脚本版本管理、分布式调度、智能合格评价、Allure级报表、权限协作、artifact长期存储。设计原则：稳（如狗）、可观测、易扩展、数据一致性优先。

### 1. 模块概述
- **定位**：Java Spring Boot 3后端，提供REST + WebSocket API，负责：
  - 项目/脚本/版本的Git-like协作管理。
  - ForgeAgent节点注册、监控、心跳、负载均衡调度。
  - 大规模执行任务切片、进度聚合、结果存储。
  - 测试合格评价（Pass Rate、Flakiness检测、趋势分析）。
  - 专业级报告（Allure集成 + 自定义Dashboard）。
  - Artifact长期存储（MinIO）。
- **部署要求**：Docker化，支持单机到K8s扩展；PostgreSQL主库 + MinIO对象存储。

### 2. 功能说明

1. **认证与权限（RBAC）**
   - JWT + Refresh Token。
   - 角色：Admin / Lead（调度权限） / Engineer（脚本管理） / Viewer（只读）。

2. **项目与脚本管理（Git-like）**
   - 项目 → 版本（tag/branch） → 脚本（层次JSON）。
   - 支持锁、合并冲突检测、版本回滚。

3. **节点管理**
   - Agent动态注册/注销、心跳（30s）。
   - 实时状态：CPU/Mem/内核能力/当前任务。

4. **任务调度与执行**
   - 任务类型：单脚本本地跑 / 网格回归 / 数据驱动切片。
   - 智能调度：优先空闲+内核匹配+负载低节点。
   - 支持优先级队列、超时杀戮、重试策略。

5. **结果聚合与合格评价**
   - 自动计算：Pass Rate、Failure Rate、Flakiness（同脚本多跑波动）。
   - 趋势分析（7/30天）。
   - 根因标签（locator失效 / 网络 / 视觉 / 超时）。

6. **报告与可视化**
   - Allure框架集成（trace/截图/日志自动上传）。
   - 自定义Dashboard：执行热图、失败Top10、视觉回归墙。

7. **存储**
   - PostgreSQL：元数据。
   - MinIO：trace.zip / 截图 / 视频 / baseline。

### 3. 关键场景描述

#### 场景1：大规模回归调度（Lead日常）
**流程**：
1. Lead在Desktop提交“Run on Grid”：脚本TC001 + 1000行数据 + 内核Latest。
2. Server创建ExecutionGroup（id），切片为50任务（每Agent并发20）。
3. 查询在线Agent（内核匹配Latest），按负载排序push任务WS。
4. Agent执行 → 实时WS推进度/日志 → Server聚合。
5. 所有完成 → 计算总体Pass 98.5%、Flakiness 2% → 生成Allure报告链接。
6. Dashboard推送通知“回归完成，失败20例（数据问题）”。

#### 场景2：失败根因分析与合格评价
**流程**：
1. Engineer查看Results → 点击失败执行 → Server返回trace MinIO url + 视觉diff。
2. 系统自动标注根因（e.g., “locator role失效，建议添加text fallback”）。
3. Lead设置合格阈值（Pass≥95% & Flakiness≤5%） → 当前版本标记“Blocked”。
4. 修复后重新回归 → Pass 99% → 自动标记“Passed”，触发发布闸门。

#### 场景3：节点动态扩展与容灾
**流程**：
1. 运维新加3台Linux服务器，启动ForgeAgent。
2. Agent心跳注册 → Server Nodes页面实时显示新节点。
3. 负载高峰 → Server自动分流，老节点掉线 → 自动标记Offline，重调度任务。
4. Maintenance模式 → Lead点按钮 → Server不再推新任务。

#### 场景4：脚本协作与版本控制
**流程**：
1. 小张提交脚本v2.1.1 → Server创建commit。
2. 小李同时修改同脚本 → push冲突 → Server返回409 + diff。
3. 小李解决冲突后合并 → 版本历史完整追溯。

### 4. 关键数据结构设计（核心实体）

```java
// 项目结构
class Project {
    Long id;
    String name;
    String description;
}

// 版本（tag）
class Version {
    Long id;
    Long projectId;
    String tag;  // v2.1.0
    String branch = "main";
}

// 脚本（层次JSON存储）
class Script {
    Long id;
    Long versionId;
    String name;
    String scriptJson;  // 完整Script JSON (Scenario-Page-Action)
    String commitHash;
    Long authorId;
    Timestamp committedAt;
}

// 节点
class Node {
    UUID id;
    String name;
    String ip;
    int wsPort;
    List<Kernel> kernels;  // {id, version}
    NodeStatus status;     // ONLINE/BUSY/OFFLINE/MAINTENANCE
    double cpuLoad;
    double memLoad;
    Timestamp lastHeartbeat;
}

// 执行组（大规模回归）
class ExecutionGroup {
    UUID id;
    Long scriptId;
    String kernel;
    int totalTasks;
    int completedTasks;
    ExecutionStatus overallStatus;
    Map<String, Object> metrics;  // passRate, flakiness
}

// 单任务（Agent执行单元）
class ExecutionTask {
    UUID id;
    UUID groupId;
    UUID nodeId;
    String dataChunk;  // JSON rows
    String status;
    String traceUrl;   // MinIO
}
```

### 5. 表结构设计（PostgreSQL）

```sql
-- 项目与版本
projects (id PK, name, description, created_at)
versions (id PK, project_id FK, tag UNIQUE, branch, created_at)

-- 脚本版本控制
scripts (id PK, version_id FK, name, script_json TEXT, commit_hash, author_id FK, committed_at)

-- 节点
nodes (
    id UUID PK,
    name VARCHAR,
    ip VARCHAR,
    ws_port INT,
    kernels JSONB,         -- [{"id":"latest","version":"130.0"}]
    status VARCHAR,
    cpu_load DOUBLE,
    mem_load DOUBLE,
    last_heartbeat TIMESTAMP
);

-- 执行组
execution_groups (
    id UUID PK,
    script_id BIGINT FK,
    kernel VARCHAR,
    total_tasks INT,
    completed INT,
    pass_rate DOUBLE,
    flakiness DOUBLE,
    status VARCHAR,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

-- 执行任务
execution_tasks (
    id UUID PK,
    group_id UUID FK,
    node_id UUID FK,
    data_chunk JSONB,
    status VARCHAR,
    trace_url VARCHAR,     -- MinIO
    artifacts JSONB,
    started_at TIMESTAMP,
    duration_ms BIGINT
);
```

### 6. 接口设计

#### 6.1 REST API（/api/v1）
- **认证**：POST /auth/login → JWT
- **脚本**：GET/POST/PUT /projects/{id}/scripts
- **节点**：GET /nodes, POST /nodes/register (Agent调用)
- **执行**：POST /executions/grid {scriptId, kernel, dataUrl} → 返回groupId
- **结果**：GET /executions/{groupId}, GET /executions/{taskId}/trace (redirect MinIO)

#### 6.2 WebSocket API
- **Agent通道**：/ws/agent/{nodeId} (JWT)
  - push: task_assigned {taskId, scriptJson, dataChunk}
  - receive: task_progress / task_complete / log_stream
- **用户实时通知**：/ws/user/{userId}
  - execution_update / node_status_change

**结论**：这个Server设计已硬核到能直接支撑企业级运营——调度智能、评价科学、报告专业、扩展无痛。风险直言：任务切片数据传输别太大（用MinIO预上传大Excel），心跳漏检加补偿机制。Server稳了，TraceForge从单机神器变团队平台。
