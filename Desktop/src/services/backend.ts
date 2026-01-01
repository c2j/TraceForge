import { MOCK_SCENARIOS, MOCK_RESULTS, MOCK_LOGS, MOCK_RECORDER_SCENARIOS } from './mocks'

// Helper to detect Tauri environment
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// Generic invoker wrapper
async function invoke<T>(command: string, args?: any): Promise<T> {
  if (isTauri()) {
    // Dynamically import to avoid build errors in web mode if package not present
    // const { invoke } = await import('@tauri-apps/api/core')
    // return invoke(command, args)
    const tauriModule = await import('@tauri-apps/api/tauri')
    return tauriModule.invoke<T>(command, args)
  }

  // Fallback to Mocks for Web
  console.warn(`[MockBackend] Invoking ${command}`, args)

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300))

  switch (command) {
    case 'get_scenarios':
      return MOCK_SCENARIOS as any
    case 'create_scenario':
      return { success: true, id: Math.random().toString() } as any
    case 'run_scenario':
      return { success: true, jobId: 'job-123' } as any
    case 'get_results':
      return MOCK_RESULTS as any
    case 'get_recorder_logs':
      return MOCK_LOGS as any
    case 'get_recorder_scenarios':
      return MOCK_RECORDER_SCENARIOS as any
    case 'recorder_action':
      return { success: true, action: args.action } as any
    case 'get_available_port':
      return Math.floor(Math.random() * 20000) + 30000 as any
    default:
      console.error(`Mock handler for ${command} not implemented.`)
      return null as any
  }
}

// Exported API Methods
export const backend = {
  scenarios: {
    list: () => invoke<typeof MOCK_SCENARIOS>('get_scenarios'),
    create: (data: any) => invoke('create_scenario', { data }),
    run: (id: string) => invoke('run_scenario', { id }),
  },
  results: {
    list: () => invoke<typeof MOCK_RESULTS>('get_results'),
  },
  recorder: {
    getLogs: () => invoke<typeof MOCK_LOGS>('get_recorder_logs'),
    getScenarios: () => invoke<typeof MOCK_RECORDER_SCENARIOS>('get_recorder_scenarios'),
    performAction: (action: string, payload?: any) =>
      invoke('recorder_action', { action, payload }),
    clearLogs: () => invoke('clear_recorder_logs'),
    clearScenarios: () => invoke('clear_recorder_scenarios'),
    addLog: (level: string, msg: string) =>
      invoke('add_recorder_log', { level, msg }),
  },
  engine: {
    getAvailablePort: () => invoke<number>('get_available_port'),
    spawn: (port?: number) => invoke<number>('spawn_engine', { port }),
    stop: (port: number) => invoke('stop_engine', { port }),
    getStatus: (port: number) => invoke('get_engine_status', { port }),
    detectKernels: () => invoke('detect_kernels'),
  },
}
