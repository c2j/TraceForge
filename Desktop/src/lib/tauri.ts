/**
 * Tauri 环境检测工具
 *
 * 提供统一的 Tauri 环境检测方法
 */

let _isTauriCache: boolean | null = null

/**
 * 判断当前是否运行在 Tauri 环境中（同步版，快速检测）
 */
// export const isTauriEnvironmentSync = (): boolean => {
//   if (_isTauriCache !== null) return _isTauriCache;

//   // 方法 1: 检查 window.__TAURI__.invoke（最快）
//   try {
//     const tauri = window.__TAURI__ as any;

//     if (tauri && typeof tauri.invoke === 'function') {
//       _isTauriCache = true;
//       return true;
//     }
//   } catch {
//     // Ignore errors
//   }

//   // 方法 2: 检查 protocol
//   try {
//     const protocol = window.location.protocol;
//     if (protocol === 'tauri:' || protocol === 'tauri://') {
//       _isTauriCache = true;
//       return true;
//     }
//   } catch {
//     // Ignore errors
//   }

//   // 方法 3: 检查 user agent（备用）
//   try {
//     const userAgent = navigator.userAgent;
//     if (userAgent.includes('Tauri')) {
//       _isTauriCache = true;
//       return true;
//     }
//   } catch {
//     // Ignore errors
//   }

//   _isTauriCache = false;
//   return false;
// };

/**
 * 判断当前是否运行在 Tauri 环境中（异步版，最可靠）
 */
export const isTauriEnvironment = async (): Promise<boolean> => {
  if (_isTauriCache !== null) return _isTauriCache

  try {
    _isTauriCache = false
    // 尝试动态导入 Tauri API 核心模块
    const tauriModule = await import('@tauri-apps/api/tauri')

    // 如果能成功导入且 invoke 是函数，则确认是 Tauri 环境
    if (typeof tauriModule.invoke === 'function') {
      _isTauriCache = true
      return true
    }
  } catch (e) {
    // 导入失败 → 肯定不是 Tauri 环境（或网络/打包问题）
    console.debug('[Tauri Env] Not in Tauri:', e)
  }

  // 方法 2: 检查 protocol
  try {
    const protocol = window.location.protocol
    if (protocol === 'tauri:' || protocol === 'tauri://') {
      _isTauriCache = true
      return true
    }
  } catch {
    // Ignore errors
  }

  // 方法 3: 检查 user agent（备用）
  try {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Tauri')) {
      _isTauriCache = true
      return true
    }
  } catch {
    // Ignore errors
  }

  return false
}

/**
 * 调用 Tauri 命令
 *
 * @template T 返回值类型
 * @param {string} cmd 命令名称
 * @param {unknown} [args] 命令参数
 * @returns {Promise<T>} 命令返回值
 * @throws {Error} 如果不在 Tauri 环境中
 */
export const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (!(await isTauriEnvironment())) {
    throw new Error('Tauri environment not available. Please run with `npm run tauri:dev`')
  }

  try {
    const tauriModule = await import('@tauri-apps/api/tauri')
    return tauriModule.invoke<T>(cmd, args)
  } catch (error) {
    console.error(`[invoke] Command "${cmd}" failed:`, error)
    throw error
  }
}

/**
 * 调用 Tauri 命令（静默失败）
 *
 * 如果命令失败，返回 null 而不是抛出异常
 *
 * @template T 返回值类型
 * @param {string} cmd 命令名称
 * @param {unknown} [args] 命令参数
 * @returns {Promise<T | null>} 命令返回值，失败时返回 null
 */
export const invokeSilent = async <T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T | null> => {
  try {
    return await invoke<T>(cmd, args)
  } catch {
    return null
  }
}

/**
 * Tauri Dialog API
 */
export const dialog = {
  /**
   * 打开文件保存对话框
   */
  save: async (options: {
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }): Promise<string | null> => {
    if (!(await isTauriEnvironment())) {
      return Promise.resolve(null)
    }

    try {
      const dialogModule = await import('@tauri-apps/api/dialog')
      // 返回类型可能是 string | string[] | null
      const result = await dialogModule.save(options)
      // 只返回 string 或 null
      return typeof result === 'string' ? result : null
    } catch {
      return Promise.resolve(null)
    }
  },

  /**
   * 打开文件选择对话框
   */
  open: async (options?: {
    multiple?: boolean
    filters?: Array<{ name: string; extensions: string[] }>
  }): Promise<string | null> => {
    if (!(await isTauriEnvironment())) {
      return Promise.resolve(null)
    }

    try {
      const dialogModule = await import('@tauri-apps/api/dialog')
      // 返回类型可能是 string | string[] | null
      const result = await dialogModule.open(options || {})
      // 只返回 string 或 null
      return typeof result === 'string' ? result : null
    } catch {
      return Promise.resolve(null)
    }
  },
}

/**
 * Tauri File System API
 */
export const fs = {
  /**
   * 写入文件
   */
  writeFile: async (path: string, contents: string): Promise<void> => {
    if (!(await isTauriEnvironment())) {
      throw new Error('Tauri environment not available')
    }

    const fsModule = await import('@tauri-apps/api/fs')
    await fsModule.writeFile(path, contents)
  },

  /**
   * 读取文件
   */
  readFile: async (path: string): Promise<string> => {
    if (!(await isTauriEnvironment())) {
      throw new Error('Tauri environment not available')
    }

    const fsModule = await import('@tauri-apps/api/fs')
    return fsModule.readTextFile(path)
  },

  /**
   * 检查文件是否存在
   */
  exists: async (path: string): Promise<boolean> => {
    if (!(await isTauriEnvironment())) {
      return Promise.resolve(false)
    }

    try {
      const fsModule = await import('@tauri-apps/api/fs')
      const metadata = await fsModule.readTextFile(path)
      return !!metadata
    } catch {
      return false
    }
  },
}
