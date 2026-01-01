# Recorder 页面需求质量与实现差距检查清单

**用途**: 验证 Recorder 相关需求的质量，并识别实现差距
**创建日期**: 2025-12-30
**范围**: FR-002, FR-003, FR-009, FR-018, FR-019 及 US1 验收场景

---

## 一、需求完整性检查 (Completeness)

- [ ] CHK001 - FR-002 是否明确定义了"全屏模式"的具体行为和切换机制？[Completeness, Spec §FR-002]
- [ ] CHK002 - FR-002 中"<500ms UI 更新延迟"是否定义了测量方法和验证标准？[Completeness, Spec §FR-002]
- [ ] CHK003 - FR-002 中"每 3 秒更新截图"是否定义了更新触发条件（主动轮询 vs 事件驱动）？[Completeness, Spec §FR-002]
- [ ] CHK004 - FR-003 是否定义了 locator 生成失败时的降级策略？[Gap]
- [ ] CHK005 - FR-009 WebSocket 延迟"<200ms"是否区分了不同类型的事件优先级？[Completeness, Spec §FR-009]
- [ ] CHK006 - FR-018 是否明确定义了所有动作类型（Navigate/Click/Fill/Hover/Wait/Assert/Screenshot）的参数规范？[Completeness, Spec §FR-018]
- [ ] CHK007 - FR-019 是否定义了网络活动和 DOM 变化的检测阈值？[Gap]
- [ ] CHK008 - US1 Scenario 2 是否定义了截图存储格式和压缩策略？[Completeness, Spec §US1-S2]
- [ ] CHK009 - 是否定义了 recording session 失败后的恢复机制？[Gap]
- [ ] CHK010 - 是否定义了录制数据的本地存储结构（SQLite schema）？[Gap]

---

## 二、需求清晰度检查 (Clarity)

- [ ] CHK011 - "near real-time capture"在 FR-002 中是否量化到具体毫秒数？[Clarity, Spec §FR-002]
- [ ] CHK012 - FR-003 中 locator 优先级（role → text → CSS → XPath）是否定义了具体的选择算法？[Clarity, Spec §FR-003]
- [ ] CHK013 - "hierarchical tree (Scenarios > Pages > Actions)"的最大深度是否有明确限制？[Clarity, Spec §FR-002]
- [ ] CHK014 - FR-009 中"immediate delivery for execution-critical events"是否定义了哪些事件属于 critical？[Clarity, Spec §FR-009]
- [ ] CHK015 - "fallback locators"在 FR-003 中是否定义了回退尝试次数和超时？[Clarity, Spec §FR-003]
- [ ] CHK016 - FR-018 中"user-defined parameters"是否定义了参数类型和验证规则？[Clarity, Spec §FR-018]
- [ ] CHK017 - FR-019 中"automatically inject"是否定义了注入位置的确定逻辑（前置/后置/智能判断）？[Clarity, Spec §FR-019]

---

## 三、需求一致性检查 (Consistency)

- [ ] CHK018 - FR-002 要求的截图频率（每 3 秒）与 US1 Scenario 2 的"at each action"是否一致？[Consistency, Spec §FR-002 vs §US1-S2]
- [ ] CHK019 - 录制状态显示（timer, active indicator）在 spec 中是否有统一的定义？[Consistency, Gap]
- [ ] CHK020 - 手动插入动作（FR-018）与自动捕获的动作在数据结构上是否一致？[Consistency, Spec §FR-018]
- [ ] CHK021 - WebSocket 事件命名规范是否在 spec 中统一？[Consistency, Spec §FR-009]
- [ ] CHK022 - kernel 选择器在不同页面（Dashboard, Recorder, Editor）中的行为是否一致？[Consistency, Gap]

---

## 四、需求可测量性检查 (Measurability)

- [ ] CHK023 - "<500ms UI 更新延迟"是否有可执行的自动化测试标准？[Measurability, Spec §FR-002]
- [ ] CHK024 - "<200ms WebSocket 延迟"是否定义了测量点和采样方法？[Measurability, Spec §FR-009]
- [ ] CHK025 - "real-time capture"是否有明确的延迟预算分配？[Measurability, Spec §FR-002]
- [ ] CHK026 - locator 生成质量是否有可测量的指标（准确率、唯一性）？[Measurability, Spec §FR-003]
- [ ] CHK027 - 录制功能的 success criteria 是否有可量化的指标？[Measurability, Gap]

---

## 五、场景覆盖检查 (Coverage)

- [ ] CHK028 - 是否定义了网络断开时录制数据的本地缓存策略？[Coverage, Edge Case, Gap]
- [ ] CHK029 - 是否定义了浏览器崩溃后的录制恢复流程？[Coverage, Recovery, Gap]
- [ ] CHK030 - 是否定义了目标页面加载失败时的处理逻辑？[Coverage, Exception, Gap]
- [ ] CHK031 - 是否定义了同一页面多次跳转的场景处理？[Coverage, Scenario, Gap]
- [ ] CHK032 - 是否定义了 iframe 内的交互录制策略？[Coverage, Edge Case, Gap]
- [ ] CHK033 - 是否定义了重复动作（连续点击同一元素）的合并/去重策略？[Coverage, Scenario, Gap]
- [ ] CHK034 - 是否定义了暗色模式下的 UI 录制兼容性？[Coverage, Scenario, Gap]

---

## 六、非功能性需求检查 (Non-Functional)

- [ ] CHK035 - 是否定义了录制时内存使用的上限？[Performance, Gap]
- [ ] CHK036 - 是否定义了单次录制会话的最大步骤数限制？[Performance, Gap]
- [ ] CHK037 - 是否定义了截图的最大分辨率和质量参数？[Quality, Gap]
- [ ] CHK038 - 是否定义了录制数据的加密存储要求？[Security, Gap]
- [ ] CHK039 - 是否定义了敏感信息（密码）的录制脱敏策略？[Security, Gap]
- [ ] CHK040 - 是否定义了录制功能的键盘快捷键规范？[Accessibility, Gap]

---

## 七、实现差距分析 (Implementation Gaps)

> 以下条目标识当前 ForgeRecorder.tsx 实现与需求之间的差距

### 阻塞级别 (Blocker) - 核心功能未实现

- [ ] CHK041 - WebSocket 连接和消息处理机制是否已实现？[Gap, Blocker, ForgeRecorder.tsx:9-18]
- [ ] CHK042 - 实际的录制启动/停止逻辑是否已实现？当前使用静态 mock 数据[Gap, Blocker, ForgeRecorder.tsx:12-40]
- [ ] CHK043 - 目标 URL 输入和 kernel 选择是否已与后端集成？[Gap, Blocker, ForgeRecorder.tsx:77-86]
- [ ] CHK044 - 截图数据的实时接收和显示是否已实现？当前使用静态图片[Gap, Blocker, ForgeRecorder.tsx:164]

### 严重级别 (Critical) - 主要功能缺失

- [ ] CHK045 - 手动动作插入（Assert, Screenshot, Navigate, Wait）对话框是否已实现？[Gap, Critical, ForgeRecorder.tsx:64-72]
- [ ] CHK046 - Locator 生成结果显示是否已实现？当前只显示简单 target[Gap, Critical, ForgeRecorder.tsx:108-122]
- [ ] CHK047 - 自动等待条件注入配置是否已实现？[Gap, Critical, ForgeRecorder.tsx:34]
- [ ] CHK048 - 录制保存到 SQLite 数据库的功能是否已实现？[Gap, Critical, ForgeRecorder.tsx:84-86]

### 主要级别 (Major) - 功能不完整

- [ ] CHK049 - 暂停/恢复功能的状态管理是否完整？当前 UI 存在但状态为静态[Gap, Major, ForgeRecorder.tsx:53-58]
- [ ] CHK050 - 实时日志显示是否从 WebSocket 动态获取？当前使用静态数据[Gap, Major, ForgeRecorder.tsx:12-18]
- [ ] CHK051 - 步骤详情编辑面板是否已实现？[Gap, Major, ForgeRecorder.tsx:92-146]
- [ ] CHK052 - 时间线拖动和截图跳转功能是否已实现？[Gap, Major, ForgeRecorder.tsx:171-178]

### 次要级别 (Minor) - UI/UX 改进

- [ ] CHK053 - 录制计时器是否与实际录制状态同步？[Gap, Minor, ForgeRecorder.tsx:49]
- [ ] CHK054 - 是否支持拖拽重新排序步骤？[Gap, Minor, ForgeRecorder.tsx:108-122]
- [ ] CHK055 - 键盘快捷键支持是否已实现？[Gap, Minor, ForgeRecorder.tsx:44-88]
- [ ] CHK056 - 无障碍访问（ARIA 标签、键盘导航）是否完整？[Gap, Minor, ForgeRecorder.tsx:43-206]

---

## 八、依赖与假设检查

- [ ] CHK057 - 是否验证了 ForgeEngine WebSocket API 与 recorder-implementation-details.md 的一致性？[Dependency]
- [ ] CHK058 - 是否确认了 Chrome kernel 版本兼容性检测已实现？[Dependency, Spec §FR-006]
- [ ] CHK059 - 是否验证了 SQLite 数据库 schema 对录制数据的存储支持？[Dependency, Spec §FR-008]
- [ ] CHK060 - 是否确认了 tauri-plugin-sql 已正确配置？[Assumption]

---

## 检查结果摘要

| 类别 | 数量 | 占比 |
|------|------|------|
| 需求质量检查 | 40 | 67% |
| 实现差距分析 | 20 | 33% |
| **总计** | **60** | **100%** |

**建议优先级排序**（基于实现差距）：
1. **立即处理**: CHK041-044 (WebSocket + 核心录制逻辑)
2. **本周完成**: CHK045-048 (手动插入 + 保存功能)
3. **迭代完善**: CHK049-052 (状态管理 + 详情编辑)
4. **后续优化**: CHK053-056 (UX 改进)

---

*清单生成时间: 2025-12-30*
