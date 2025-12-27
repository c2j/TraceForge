export const resources = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      scenarios: 'Scenarios',
      recorder: 'Recorder',
      editor: 'Editor',
      results: 'Results',
      nodes: 'Nodes',
      kernels: 'Kernels',
      settings: 'Settings'
    },
    status: {
      engine: 'Engine',
      connected: 'Connected',
      disconnected: 'Disconnected',
      server: 'Server',
      online: 'Online',
      user: 'User',
      systemReady: 'System Ready',
      localMode: 'Local Mode'
    },
    dashboard: {
      project: 'Project',
      version: 'Version',
      newProject: 'New Project',
      quickRecord: 'Quick Record',
      passRate: 'Pass Rate',
      failures: 'Failures',
      coverage: 'Coverage',
      scripts: 'Scripts',
      executionTrend: 'Execution Trend (7 Days)',
      startRecording: 'Start Recording',
      startRecordingSub: 'Launch new session',
      newScript: 'New Script',
      newScriptSub: 'Create from blank',
      runAllLocal: 'Run All Local',
      runAllLocalSub: 'Execute 48 scripts',
      kernelMgr: 'Kernel Mgr',
      kernelMgrSub: 'Manage browsers',
      manageScenarios: 'Manage Suites'
    },
    scenarios: {
      title: 'Test Scenarios',
      create: 'Create Scenario',
      search: 'Search scenarios...',
      columns: {
        name: 'Scenario Name',
        project: 'Project',
        tags: 'Tags',
        lastRun: 'Last Run',
        status: 'Status',
        actions: 'Actions'
      },
      actions: {
        edit: 'Edit',
        run: 'Run'
      }
    },
    editor: {
      scenarioStructure: 'Scenario Structure',
      collapseAll: 'Collapse All',
      debugRun: 'Debug Run',
      dataTable: 'Data Table',
      save: 'Save',
      stepSnapshot: 'Step Snapshot',
      executionPreview: 'Execution Preview',
      locators: 'Locators (Strategies)',
      addStrategy: 'Add Strategy',
      waitFor: 'Wait For',
      timeout: 'Timeout (ms)',
      scenarioOutline: 'Scenario Outline',
      examples: 'Examples',
      variables: 'Variables',
      importCsv: 'Import CSV'
    },
    results: {
      title: 'Execution History',
      filter: 'Filter',
      search: 'Search...',
      status: 'Status',
      project: 'Project / Version',
      script: 'Script',
      duration: 'Duration',
      kernel: 'Kernel',
      time: 'Time',
      action: 'Action',
      detailsTitle: 'Execution Details',
      back: 'Back to List',
      steps: 'Execution Steps',
      logs: 'Console Logs',
      artifacts: 'Artifacts',
      errorMessage: 'Error Analysis',
      screenshot: 'Screenshot',
      video: 'Video Replay'
    },
    settings: {
      title: 'Settings',
      networkConfig: 'Network Configuration',
      enginePortRange: 'Engine Port Range',
      serverUrl: 'Server URL',
      storageData: 'Storage & Data',
      localDatabase: 'Local Database',
      clearCache: 'Clear Cache',
      defaults: 'Defaults',
      defaultRecordingKernel: 'Default Recording Kernel',
      theme: 'Theme',
      language: 'Language',
      selectLanguage: 'Select Language'
    },
    tracer: {
      title: 'Trace Viewer',
      subtitle: 'Debug and analyze test execution traces',
      searchTraces: 'Search traces...',
      filterAll: 'All',
      filterPass: 'Pass',
      filterFail: 'Fail',
      back: 'Back',
      visualDiff: 'Visual Diff',
      export: 'Export',
      customView: 'Custom View',
      playwrightTrace: 'Playwright Trace',
      noTraceAvailable: 'No trace available',
      noTraceHelp: 'Select a trace to view details',
      timeline: 'Timeline',
      screenshot: 'Screenshot',
      fullscreen: 'Fullscreen',
      noScreenshot: 'No screenshot available',
      errorDetected: 'Error Detected',
      visualRegression: 'Visual Regression',
      domSnapshot: 'DOM Snapshot',
      consoleLogs: 'Console Logs',
      networkActivity: 'Network Activity',
      selectStep: 'Select a step to view details'
    }
  },
  zh: {
    nav: {
      dashboard: '仪表盘',
      scenarios: '测试场景',
      recorder: '录制器',
      editor: '编辑器',
      results: '执行结果',
      nodes: '节点管理',
      kernels: '内核管理',
      settings: '系统设置'
    },
    status: {
      engine: '引擎',
      connected: '已连接',
      disconnected: '未连接',
      server: '服务器',
      online: '在线',
      user: '用户',
      systemReady: '系统就绪',
      localMode: '本地模式'
    },
    dashboard: {
      project: '项目',
      version: '版本',
      newProject: '新建项目',
      quickRecord: '快速录制',
      passRate: '通过率',
      failures: '失败数',
      coverage: '覆盖率',
      scripts: '脚本总数',
      executionTrend: '执行趋势 (7天)',
      startRecording: '开始录制',
      startRecordingSub: '启动新会话',
      newScript: '新建脚本',
      newScriptSub: '空白创建',
      runAllLocal: '本地运行',
      runAllLocalSub: '执行48个脚本',
      kernelMgr: '内核管理',
      kernelMgrSub: '浏览器版本管理',
      manageScenarios: '管理测试套件'
    },
    scenarios: {
      title: '测试场景列表',
      create: '创建场景',
      search: '搜索场景...',
      columns: {
        name: '场景名称',
        project: '所属项目',
        tags: '标签',
        lastRun: '上次运行',
        status: '状态',
        actions: '操作'
      },
      actions: {
        edit: '编辑',
        run: '运行'
      }
    },
    editor: {
      scenarioStructure: '场景结构',
      collapseAll: '全部折叠',
      debugRun: '调试运行',
      dataTable: '数据表',
      save: '保存',
      stepSnapshot: '步骤快照',
      executionPreview: '执行预览',
      locators: '定位策略',
      addStrategy: '添加策略',
      waitFor: '等待条件',
      timeout: '超时 (ms)',
      scenarioOutline: '场景大纲',
      examples: '示例数据',
      variables: '变量',
      importCsv: '导入 CSV'
    },
    results: {
      title: '执行历史',
      filter: '筛选',
      search: '搜索...',
      status: '状态',
      project: '项目 / 版本',
      script: '测试脚本',
      duration: '耗时',
      kernel: '执行内核',
      time: '执行时间',
      action: '操作',
      detailsTitle: '执行详情',
      back: '返回列表',
      steps: '执行步骤',
      logs: '控制台日志',
      artifacts: '测试产物',
      errorMessage: '错误分析',
      screenshot: '截图快照',
      video: '视频回放'
    },
    settings: {
      title: '系统设置',
      networkConfig: '网络配置',
      enginePortRange: '引擎端口范围',
      serverUrl: '服务器地址',
      storageData: '存储与数据',
      localDatabase: '本地数据库',
      clearCache: '清除缓存',
      defaults: '默认设置',
      defaultRecordingKernel: '默认录制内核',
      theme: '界面主题',
      language: '语言设置',
      selectLanguage: '选择语言'
    },
    tracer: {
      title: '追踪查看器',
      subtitle: '调试和分析测试执行追踪',
      searchTraces: '搜索追踪...',
      filterAll: '全部',
      filterPass: '通过',
      filterFail: '失败',
      back: '返回',
      visualDiff: '视觉对比',
      export: '导出',
      customView: '自定义视图',
      playwrightTrace: 'Playwright 追踪',
      noTraceAvailable: '无可用追踪',
      noTraceHelp: '选择一个追踪查看详情',
      timeline: '时间线',
      screenshot: '截图',
      fullscreen: '全屏',
      noScreenshot: '无可用截图',
      errorDetected: '检测到错误',
      visualRegression: '视觉回归',
      domSnapshot: 'DOM 快照',
      consoleLogs: '控制台日志',
      networkActivity: '网络活动',
      selectStep: '选择一个步骤查看详情'
    }
  }
};

export type Language = keyof typeof resources;
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof resources.en>;
