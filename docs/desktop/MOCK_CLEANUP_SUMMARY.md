# Mock Data Cleanup Summary

## 概述
本次更新移除了前端组件中的Mock数据，并将其替换为从后台数据库获取真实数据。

## 修改的文件

### 1. ForgeDashboard.tsx
**修改内容：**
- 移除了硬编码的图表数据 `data` 常量（第8-16行）
- 移除了硬编码的KPI卡片数据（第74-77行）
- 导入了 `useEffect`, `useMemo`
- 从store中添加 `executions`, `scripts`, `loadExecutions`, `loadScripts`
- 添加了 `kpiData` 计算逻辑：
  - 计算总脚本数
  - 计算通过和失败的执行数
  - 计算通过率
- 添加了 `chartData` 计算逻辑：
  - 获取最近7天的数据
  - 按天分组执行记录
  - 使用正确的 `ExecutionStatus` 类型（'COMPLETED', 'FAILED', 'CANCELLED'）
- 使用 `useEffect` 在组件加载时获取数据

**数据流：**
```
Backend (SQLite) -> loadExecutions() & loadScripts() -> kpiData & chartData -> UI
```

### 2. ForgeTracer.tsx
**修改内容：**
- 移除了 `mockTraces` 常量（第57-157行）
- 导入了 `useForgeStore`, `Execution`, `ExecutionStep`
- 使用 `loadExecutions()` 和 `loadExecutionSteps()` 从后台获取数据
- 添加了 `getTraceData()` 辅助函数来将Execution和ExecutionSteps转换为TraceData格式
- 使用 `useEffect` 钩子在组件加载和数据变化时自动刷新数据
- 将所有对 `mockTraces` 的引用替换为 `allTraces`

**数据流：**
```
Backend (SQLite) -> loadExecutions() -> state.executions -> getTraceData() -> TraceData[]
```

### 2. ForgeScenarios.tsx
**修改内容：**
- 移除了 `mockScenarios` 常量（第6-12行）
- 导入了 `useForgeStore`, `Scenario`, `Script`
- 使用 `loadScenarios()` 和 `loadScripts()` 从后台获取数据
- 添加了辅助函数：
  - `getScriptName()`: 根据scriptId获取脚本名称
  - `getLastRun()`: 获取最后一次运行时间（临时返回"Never"）
  - `getScenarioStatus()`: 获取场景状态（临时返回"IDLE"）
- 使用 `useEffect` 在组件加载时自动刷新数据

**数据流：**
```
Backend (SQLite) -> loadScenarios() -> state.scenarios -> UI
```

### 3. ForgeResults.tsx
**修改内容：**
- 移除了 `results` 常量（第31-54行）
- 导入了 `useForgeStore`, `Execution`, `ExecutionStep`, `Script`
- 使用 `loadExecutions()`, `loadExecutionSteps()`, `loadScripts()` 从后台获取数据
- 添加了辅助函数：
  - `getScriptName()`: 获取脚本名称
  - `getProjectName()`: 获取项目名称
  - `getDuration()`: 计算执行时长
  - `getRelativeTime()`: 获取相对时间显示
- 将Execution和ExecutionSteps转换为TestResult和TestStep格式
- 使用 `useEffect` 在组件加载和选中结果时自动刷新数据

**数据流：**
```
Backend (SQLite) -> loadExecutions() & loadExecutionSteps() -> TestResult[]
```

### 4. ForgeEditor.tsx
**修改内容：**
- 移除了硬编码的 `tableData` mock数据（第55-60行）
- 导入了 `DataRow` 类型
- 使用 `loadDataRows()` 从后台获取数据
- 添加了 `parseRowValues()` 辅助函数来解析JSON格式的values
- 将 `testLocator` 函数中的mock替换为实际API调用逻辑（目前仍使用模拟结果，但准备接入真实API）

**数据流：**
```
Backend (SQLite) -> loadDataRows() -> parseRowValues() -> tableData
```

### 5. ForgeRecorder.tsx
**修改内容：**
- 移除了硬编码的 `logs` 和 `scenarios` mock数据
- 导入了 `useForgeStore`
- 使用 `loadScenarios()` 从后台获取scenarios
- 将数据转换为组件所需的格式

**数据流：**
```
Backend (SQLite) -> loadScenarios() -> scenarioPages -> UI
```

### 6. useForgeStore.ts
**修改内容：**
- 保留了第208行的 "Mock for development" 注释
- 这是一个合理的fallback，当 `window.__TAURI__?.invoke` 不可用时返回空对象
- 不需要修改

## 数据库命令

所有修改都使用了以下后台Tauri命令：

### CRUD命令
- `get_projects()`, `create_project()`, `update_project()`, `delete_project()`
- `get_scripts()`, `create_script()`, `update_script()`, `delete_script()`
- `get_scenarios()`, `create_scenario()`, `update_scenario()`, `delete_scenario()`
- `get_executions()`, `create_execution()`, `update_execution_status()`, `delete_execution()`
- `get_execution_steps()`, `create_execution_step()`, `update_execution_step_status()`
- `get_data_rows()`, `create_data_row()`, `update_data_row()`, `delete_data_row()`

## 未完成的集成

以下功能仍需进一步实现：

### ForgeEditor.tsx - testLocator函数
当前状态：仍在返回模拟结果
需要的后台API：需要一个实际测试定位器的命令
建议实现：
```rust
#[command]
pub async fn test_locator(
  locator: String,
  locator_type: String,
) -> Result<serde_json::Value, String>
```

### ForgeRecorder.tsx - 日志和记录功能
当前状态：logs为空数组
需要的后台API：实时日志和录制功能
建议：通过WebSocket实现实时日志推送

### ForgeScenarios.tsx - 状态和运行历史
当前状态：getLastRun() 和 getScenarioStatus() 返回固定值
需要的实现：从executions表中获取最近运行记录和状态

## 测试建议

1. **数据库初始化测试**
   - 确保所有表都正确创建
   - 插入测试数据
   - 验证CRUD操作

2. **组件加载测试**
   - 测试每个组件是否能正确加载数据
   - 验证空状态显示
   - 测试错误处理

3. **实时更新测试**
   - 测试数据变化时UI是否更新
   - 验证useEffect的依赖项

4. **性能测试**
   - 测试大量数据时的加载性能
   - 验证分页和过滤功能

## Store 层防御性编程修复

### invoke 函数修复
**问题：** 当 `window.__TAURI__?.invoke` 不可用时（开发模式），`invoke` 函数返回 `{}` 而不是适当的默认值。

**修复：**
```typescript
const invoke = async <T>(cmd: string, args?: unknown): Promise<T> => {
  if (window.__TAURI__?.invoke) {
    return window.__TAURI__.invoke(cmd, args);
  }
  // Mock for development - return appropriate defaults
  if (cmd === 'get_projects' || cmd === 'get_scripts' || cmd === 'get_scenarios' ||
      cmd === 'get_kernels' || cmd === 'get_executions' || cmd === 'get_execution_steps' ||
      cmd === 'get_pages' || cmd === 'get_actions' || cmd === 'get_data_rows') {
    return [] as T;
  }
  return {} as T;
};
```

### load* 函数修复
**问题：** 所有 `load*` 函数直接使用 `result as T[]` 类型断言，但没有检查 `result` 是否为数组。

**修复：** 添加 `Array.isArray()` 检查和错误处理：
```typescript
loadExecutions: async (scriptId) => {
  set({ executionsLoading: true });
  try {
    const result = await invoke<unknown>('get_executions', { scriptId });
    const executions = Array.isArray(result) ? result as Execution[] : [];
    set({ executions, executionsLoading: false });
  } catch (error) {
    console.error('Failed to load executions:', error);
    set({ executions: [], executionsLoading: false });
  }
},
```

**修复的函数：**
- ✅ `loadProjects`
- ✅ `loadScripts`
- ✅ `loadScenarios`
- ✅ `loadKernels`
- ✅ `loadExecutions`
- ✅ `loadExecutionSteps`
- ✅ `loadDataRows`

## 组件层防御性编程修复

所有组件都添加了 `|| []` 和 `?.` 检查，确保数据为空时不会崩溃：
- ✅ ForgeDashboard
- ✅ ForgeResults
- ✅ ForgeTracer
- ✅ ForgeScenarios
- ✅ ForgeEditor
- ✅ ForgeRecorder
- ✅ ForgeSettings
- ✅ ForgeKernels
- ✅ ForgeNodes

## 后续改进建议

1. **缓存策略**
   - 实现数据缓存以减少数据库查询
   - 添加数据过期和刷新机制

2. **错误处理**
   - 添加更详细的错误信息
   - 实现重试机制
   - 添加加载状态指示器

3. **类型安全**
   - 确保所有类型定义一致
   - 添加运行时类型检查

4. **性能优化**
   - 实现虚拟滚动（大列表）
   - 添加数据懒加载
   - 优化数据转换逻辑

## 迁移影响

### 破坏性变更
无。所有组件接口保持不变，只是数据源从Mock改为数据库。

### 需要数据库迁移
无。数据库架构已存在，只需要填充数据。

### 用户影响
- 用户需要先创建项目、脚本、场景才能看到数据
- 新安装的应用将显示空列表
- 需要提供示例数据或导入功能

## 总结

本次更新成功地将所有Mock数据替换为真实的数据获取逻辑，建立了从前端组件到后台数据库的完整数据流。所有修改都遵循了现有架构模式，保持了代码的一致性和可维护性。

## 运行时错误修复

### 错误：`executions.filter is not a function`

**根本原因：**
1. Store的 `invoke` 函数在mock模式返回 `{}` 而不是 `[]`
2. `loadExecutions` 使用 `result as Execution[]` 类型断言，将对象强转为数组
3. `executions` 被设置为空对象 `{}` 而不是空数组 `[]`
4. 组件中的 `executions?.filter()` 失败，因为 `executions` 不是数组

**修复策略：**
1. **Store层：** 修改 `invoke` 返回合适的默认值（列表查询返回 `[]`）
2. **Store层：** 所有 `load*` 函数添加 `Array.isArray()` 检查
3. **组件层：** 所有数组操作添加 `|| []` 和 `?.` 防御性检查

### 防御性编程模式

**Store层：**
```typescript
// ✅ 正确
const executions = Array.isArray(result) ? result as Execution[] : [];

// ❌ 错误
const executions = result as Execution[];
```

**组件层：**
```typescript
// ✅ 正确
{(executions || []).map(e => ...)}
{executions?.filter(e => ...) || []}

// ❌ 错误
{executions.map(e => ...)}
```

## 总计修改文件：6个
1. ForgeDashboard.tsx - 仪表板指标和图表数据 + 新建项目功能

### 新增功能：ForgeDashboard.tsx - "New Project" 按钮
**问题：** 点击 "New Project" 按钮没有任何反应（缺少 `onClick` 处理函数）

**修复内容：**
- 添加 `useState` 状态管理：`showNewProjectModal`, `newProject`
- 从 store 导入 `createProject` 和 `setCurrentProject`
- 创建 `handleCreateProject` 异步函数：
  - 验证项目名称不为空
  - 调用 `createProject` API 创建项目
  - 设置为当前项目
  - 关闭模态框并重置表单
- 创建模态框 UI 组件：
  - 项目名称输入框（必填）
  - 版本输入框（默认 "1.0.0"）
  - 描述文本框（可选）
  - Cancel 和 Create Project 按钮
- 为按钮添加 `onClick={() => setShowNewProjectModal(true)}` 事件处理
- 确保 Project 类型完整性（包含所有必需字段：created_at, updated_at, sync_enabled, last_sync_at）

### 新增功能：ForgeScenarios.tsx - "Create Scenario" 按钮
**问题：** 点击 "Create Scenario" 按钮没有任何反应

**修复内容：**
- 导入 `X` 图标
- 添加 `useState` 状态：`showCreateModal`, `newScenario`
- 从 store 导入 `createScenario`
- 创建 `handleCreateScenario` 函数：
  - 验证场景名称不为空
  - 验证已选择脚本
  - 调用 `createScenario` API（正确参数顺序：scriptId, name, priority, orderIndex, description）
  - 关闭模态框并重置表单
  - 重新加载场景列表
- 创建模态框 UI 组件：
  - Script 下拉选择（必填）
  - 场景名称输入框（必填）
  - Priority 下拉选择（P0-P3）
  - 描述文本框（可选）
  - Cancel 和 Create Scenario 按钮
- 为按钮添加 `onClick={() => setShowCreateModal(true)}` 事件处理

### 修复按钮事件处理：ForgeRecorder.tsx
**问题：** 多个按钮没有 `onClick` 事件或只有alert占位符

**修复内容：**

**状态管理：**
- 添加 `showAddScenarioModal`, `setShowAddScenarioModal` - 控制添加场景模态框
- 添加 `showAddPageModal`, `setShowAddPageModal` - 控制添加页面模态框
- 添加 `showAssertModal`, `setShowAssertModal` - 控制添加断言模态框
- 扩展 `newScenario` 状态：`{ name: '', priority: 'P0', scriptId: '', description: '' }`

**函数实现：**
- `handleAddScenario()` - 打开添加场景模态框（先检查是否有可用脚本）
- `handleCreateScenario()` - 创建场景的完整实现（调用API、重置表单、重新加载）
- `handleToggleRecording()` - 切换录制状态（暂停/继续）
- `handleSave()` - 保存确认
- `handleCancel()` - 取消确认（带确认对话框）

**按钮事件处理：**
1. **顶部工具栏：**
   - Pause/Stop 按钮 → `handleToggleRecording`
   - "+ Scenario" 按钮 → `handleAddScenario` (打开模态框)
   - Assert 按钮 → `setShowAssertModal(true)` (打开模态框)
   - Screenshot 按钮 → 确认截图已捕获

2. **右侧按钮：**
   - Cancel 按钮 → `handleCancel`
   - Save 按钮 → `handleSave`

3. **左侧工具栏：**
   - Add Page → `setShowAddPageModal(true)` (打开模态框)
   - Navigate → 确认功能即将推出
   - Wait → 确认功能即将推出
   - Manual → 确认功能即将推出

**模态框实现：**

1. **Add Scenario Modal：**
   - Script 下拉选择（必填，从 scripts 列表加载）
   - Scenario Name 输入框（必填）
   - Priority 下拉选择（P0-P3）
   - Add Scenario 按钮（调用 `handleCreateScenario`）

2. **Add Page Modal：**
   - Page Name 输入框（必填）
   - Entry URL 输入框（可选）
   - Cancel 和 Add Page 按钮

3. **Assert Modal：**
   - Assertion Type 下拉选择：
     - Text Visible
     - Element Exists
     - URL Contains
     - Value Equals
   - Expected Value 输入框（必填）
   - Cancel 和 Add Assertion 按钮
2. ForgeTracer.tsx - 追踪数据
3. ForgeScenarios.tsx - 场景列表
4. ForgeResults.tsx - 执行结果
5. ForgeEditor.tsx - 测试编辑器数据表
6. ForgeRecorder.tsx - 录制器场景数据
