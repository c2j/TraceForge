import React, { useState, useEffect, useRef } from 'react'
import {
  Pause,
  Square,
  Plus,
  Save,
  X,
  MousePointer,
  ChevronDown,
  ChevronRight,
  Clock,
  MoveRight,
  MonitorPlay,
  Trash2,
  Loader2,
  Play,
  Globe,
  RotateCcw,
  ShieldCheck,
  Edit2,
  ArrowUpCircle,
  ArrowDownCircle,
  FilePlus,
  Layers,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { backend } from '../services/backend'
import { useForgeStore } from '../stores/useForgeStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useRecordingWebSocket } from '../hooks/useRecordingWebSocket'

// UI Helper type for local state
interface UIScenario {
  id: string
  name: string
  isCollapsed: boolean
  pages: UIPage[]
}

interface UIPage {
  id: string
  name: string
  active: boolean
  steps: any[]
}

// Helper to format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const ForgeRecorder: React.FC = () => {
  const { getProjectName, kernels, loadKernels } = useForgeStore() // Get Project Context and Kernels
  const [selectedKernel, setSelectedKernel] = useState<string>('')
  const [showKernelDropdown, setShowKernelDropdown] = useState(false)

  // Load URL from localStorage, session, or use default
  const getInitialUrl = (): string => {
    const saved = localStorage.getItem('traceforge_recorder_url')
    if (saved) return saved
    return 'https://example.com'
  }

  const [targetUrl, setTargetUrl] = useState<string>(getInitialUrl())

  // Recording store state
  const {
    session,
    scenarios,
    logs,
    setCurrentScenario,
    setCurrentPage,
    addScenario,
    addPage,
    addStep,
    updatePage,
    removeStep,
    startRecording: startRecordingStore,
    stopRecording: stopRecordingStore,
    pauseRecording: pauseRecordingStore,
    resumeRecording: resumeRecordingStore,
    addLog: addLogToStore,
  } = useRecordingStore()

  // WebSocket hooks for communication with ForgeEngine
  const {
    startRecording: startRecordingWS,
    stopRecording: stopRecordingWS,
    pauseRecording: pauseRecordingWS,
    resumeRecording: resumeRecordingWS,
  } = useRecordingWebSocket()

  // Local state for UI interactions like collapsing
  const [localScenarios, setLocalScenarios] = useState<UIScenario[]>([])
  const [loading, setLoading] = useState(true)

  const logsEndRef = useRef<HTMLDivElement>(null)
  const kernelDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (kernelDropdownRef.current && !kernelDropdownRef.current.contains(event.target as Node)) {
        setShowKernelDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const initData = async () => {
      try {
        // Load kernels
        await loadKernels()

        // Set default kernel if available
        const loadedKernels = useForgeStore.getState().kernels
        const defaultKernel = loadedKernels.find(k => k.is_default_agent)
        if (defaultKernel) {
          setSelectedKernel(defaultKernel.id)
        } else if (loadedKernels.length > 0) {
          setSelectedKernel(loadedKernels[0].id)
        }

        // Try to load from local storage first
        const hasSavedData = useRecordingStore.getState().loadFromLocalStorage()

        if (hasSavedData) {
          console.log('[ForgeRecorder] Loaded from localStorage')
        } else {
          // If no saved data, fetch from backend
          const logsData = await backend.recorder.getLogs()
          logsData.forEach((log: any) => addLogToStore(log))
        }

        // Map store scenarios to local UI state (adding isCollapsed)
        setLocalScenarios(
          scenarios.map((s) => ({
            ...s,
            isCollapsed: false,
          }))
        )
      } catch (error) {
        console.error('Failed to init recorder', error)
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Persist URL to localStorage
  useEffect(() => {
    localStorage.setItem('traceforge_recorder_url', targetUrl)
  }, [targetUrl])

  const addLog = (level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false })
    const logEntry = { time, level, msg }

    // Add to store
    addLogToStore(logEntry)

    // Also send to backend for persistence
    backend.recorder.addLog(level, msg).catch(console.error)
  }

  // --- Scenario Management ---

  const handleCreateScenario = (insertIndex: number = -1) => {
    const name = window.prompt('Enter Scenario Name:', `Scenario ${localScenarios.length + 1}`)
    if (!name) return

    const newScenario: UIScenario = {
      id: `s_${Date.now()}`,
      name: name,
      isCollapsed: false,
      pages: [], // Start with no pages, or maybe a default one
    }

    setLocalScenarios(prev => {
      const newList = [...prev]
      if (insertIndex === -1) {
        newList.push(newScenario)
      } else {
        newList.splice(insertIndex, 0, newScenario)
      }
      return newList
    })

    // Add to store
    addScenario({
      id: newScenario.id,
      name: newScenario.name,
      pages: [],
    })
    setCurrentScenario(newScenario.id)

    // Automatically add a default page to the new scenario
    handleAddPageToScenario(newScenario.id, true)
    addLog('INFO', `Created new scenario: "${name}"`)
  }

  const handleRenameScenario = (id: string) => {
    const scenario = localScenarios.find(s => s.id === id)
    if (!scenario) return

    const newName = window.prompt('Rename Scenario:', scenario.name)
    if (newName && newName !== scenario.name) {
      setLocalScenarios(prev => prev.map(s => (s.id === id ? { ...s, name: newName } : s)))

      // Update in store
      // Note: recordingStore doesn't have updateScenario, so we'll skip for now
      addLog('INFO', `Renamed scenario to "${newName}"`)
    }
  }

  const handleDeleteScenario = (id: string) => {
    if (window.confirm('Are you sure you want to delete this scenario and all its steps?')) {
      setLocalScenarios(prev => prev.filter(s => s.id !== id))

      // Note: recordingStore doesn't have removeScenario, so we'll skip for now
      addLog('WARN', `Deleted scenario ${id}`)
    }
  }

  const toggleScenarioCollapse = (id: string) => {
    setLocalScenarios(prev => prev.map(s => (s.id === id ? { ...s, isCollapsed: !s.isCollapsed } : s)))
  }

  // --- Page Management ---

  const handleAddPageToScenario = (scenarioId: string, isSilent = false) => {
    setLocalScenarios(prev =>
      prev.map(s => {
        if (s.id !== scenarioId) {
          return s
        }

        const updatedPages = s.pages.map(p => ({ ...p, active: false }))
        const newPage: UIPage = {
          id: `p_${Date.now()}`,
          name: `Page ${s.pages.length + 1}: /new-page`,
          active: true,
          steps: [],
        }

        const newScenario = { ...s, pages: [...updatedPages, newPage], isCollapsed: false }

        // Add to store
        addPage(scenarioId, {
          id: newPage.id,
          name: newPage.name,
          active: true,
          steps: [],
        })
        setCurrentPage(newPage.id)

        return newScenario
      })
    )
    if (!isSilent) addLog('INFO', 'Added new page frame.')
  }

  const handleRenamePage = (scenarioId: string, pageId: string) => {
    const scenario = localScenarios.find(s => s.id === scenarioId)
    const page = scenario?.pages.find(p => p.id === pageId)
    if (!page) return

    const newName = window.prompt('Rename Page / URL:', page.name)
    if (newName) {
      setLocalScenarios(prev =>
        prev.map(s => {
          if (s.id !== scenarioId) return s
          return {
            ...s,
            pages: s.pages.map(p => (p.id === pageId ? { ...p, name: newName } : p)),
          }
        })
      )

      // Update in store
      updatePage(scenarioId, pageId, { name: newName })
    }
  }

  const handleDeletePage = (scenarioId: string, pageId: string) => {
    setLocalScenarios(prev =>
      prev.map(s => {
        if (s.id !== scenarioId) return s
        return { ...s, pages: s.pages.filter(p => p.id !== pageId) }
      })
    )

    // Note: recordingStore doesn't have removePage, so we'll skip for now
    addLog('DEBUG', `Deleted page ${pageId}`)
  }

  // --- Step Management (Existing Logic Adapted) ---

  const getActiveScenarioAndPage = () => {
    // Find the scenario that has an active page
    for (const s of localScenarios) {
      const activePage = s.pages.find(p => p.active)
      if (activePage) return { scenario: s, page: activePage }
    }
    // Fallback: Last scenario, last page
    const lastScenario = localScenarios[localScenarios.length - 1]
    if (lastScenario && lastScenario.pages.length > 0) {
      return { scenario: lastScenario, page: lastScenario.pages[lastScenario.pages.length - 1] }
    }
    return null
  }

  const addNewStep = (type: string, desc: string) => {
    const active = getActiveScenarioAndPage()
    if (!active) {
      alert('No active page found. Please create a scenario and page first.')
      return
    }

    const newStep = {
      id: (active.page.steps.length + 1).toString(),
      type,
      desc,
      target: '',
    }

    setLocalScenarios(prev =>
      prev.map(s => {
        if (s.id !== active.scenario.id) return s
        return {
          ...s,
          pages: s.pages.map(p => {
            if (p.id !== active.page.id) return p
            return {
              ...p,
              steps: [...p.steps, newStep],
            }
          }),
        }
      })
    )

    // Add to store
    addStep(active.scenario.id, active.page.id, {
      id: newStep.id,
      type: newStep.type,
      desc: newStep.desc,
      target: newStep.target,
      timestamp: new Date().toISOString(),
    })

    addLog('INFO', `Recorded step: ${type}`)
  }

  const handleDeleteStep = (scenarioId: string, pageId: string, stepId: string) => {
    setLocalScenarios(prev =>
      prev.map(s => {
        if (s.id !== scenarioId) return s
        return {
          ...s,
          pages: s.pages.map(p => {
            if (p.id !== pageId) return p
            return { ...p, steps: p.steps.filter(st => st.id !== stepId) }
          }),
        }
      })
    )

    // Remove from store
    removeStep(scenarioId, pageId, stepId)
  }

  // --- Top Bar Actions ---

  const handleGlobalAddPage = () => {
    // Adds page to the currently active scenario or the last one
    const active = getActiveScenarioAndPage()
    if (active) {
      handleAddPageToScenario(active.scenario.id)
    } else if (localScenarios.length > 0) {
      handleAddPageToScenario(localScenarios[localScenarios.length - 1].id)
    } else {
      handleCreateScenario() // Create scenario first if none exist
    }
  }

  const handleNavigate = () => {
    const currentUrl = targetUrl
    setTargetUrl(currentUrl)
    addNewStep('navigate', `navigate to ${currentUrl}`)
    addLog('INFO', `Navigating to ${currentUrl}...`)
  }

  const toggleRecording = async () => {
    const isRecordingSession = session?.status === 'recording'
    const isPausedSession = session?.status === 'paused'

    if (!isRecordingSession) {
      // Start recording
      const selectedKernelData = kernels.find(k => k.id === selectedKernel)
      const kernelName = selectedKernelData?.name || 'Chrome'
      const kernelId = selectedKernel || 'chrome_86'

      if (!selectedKernelData) {
        addLog('WARN', 'No kernel selected. Please select a kernel first.')
        return
      }

      // Start recording in store
      await startRecordingStore(targetUrl, kernelId, kernelName)

      // Start recording via WebSocket
      const port = await backend.engine.getAvailablePort()
      startRecordingWS(targetUrl, port.toString())

      addLog('INFO', `Recording session started with kernel: ${kernelName}`)
    } else {
      // Toggle pause/resume
      if (isPausedSession) {
        // Resume
        resumeRecordingStore()
        resumeRecordingWS()
        addLog('INFO', 'Recording resumed.')
      } else {
        // Pause
        pauseRecordingStore()
        pauseRecordingWS()
        addLog('INFO', 'Recording paused.')
      }
    }
  }

  const stopRecording = async () => {
    // Stop recording in store
    await stopRecordingStore()

    // Stop recording via WebSocket
    stopRecordingWS()

    addLog('INFO', 'Recording stopped. Session saved locally.')
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Control Bar - Single Row */}
      <div className="h-14 bg-surface border-b border-slate-700 flex items-center justify-between px-4 shadow-md z-20 gap-4">
        {/* Left: Project Context */}
        <div className="flex flex-col justify-center min-w-[140px]">
          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">
            Project
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold text-primary truncate max-w-[180px]"
              title={getProjectName() || 'No Project'}
            >
              {getProjectName() || 'No Project'}
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-700/50 mx-2"></div>

        {/* Center: Browser Omnibox & Controls */}
        <div className="flex-1 flex items-center gap-3">
          {/* URL Bar */}
          <div className="flex-1 flex items-center bg-slate-900 border border-slate-600 rounded-md focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all overflow-hidden h-9">
            <div className="pl-3 pr-2 text-slate-500">
              {targetUrl.startsWith('https') ? (
                <ShieldCheck className="w-4 h-4 text-green-500" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </div>
            <input
              type="text"
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-slate-500 h-full"
              placeholder="Enter URL to record..."
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              onKeyDown={e =>
                e.key === 'Enter' && ((session?.status !== 'recording' && session?.status !== 'paused') ? toggleRecording() : handleNavigate())
              }
            />
             <div className="h-5 w-px bg-slate-700 mx-1"></div>
            <div ref={kernelDropdownRef} className="relative">
              <button
                onClick={() => setShowKernelDropdown(!showKernelDropdown)}
                className="flex items-center gap-1 px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors h-full"
              >
                {kernels.find(k => k.id === selectedKernel)?.name || 'Select Kernel'}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showKernelDropdown && (
                <div className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-md shadow-xl z-50 min-w-[200px]">
                  {kernels.length === 0 && (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      No kernels available
                    </div>
                  )}
                  {kernels.map(kernel => (
                    <button
                      key={kernel.id}
                      onClick={() => {
                        setSelectedKernel(kernel.id)
                        setShowKernelDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-700 transition-colors flex items-center justify-between ${
                        selectedKernel === kernel.id ? 'bg-slate-700 text-white' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={kernel.is_compatible ? 'text-green-400' : 'text-orange-400'}>
                          {kernel.is_compatible ? '✓' : '!'}
                        </span>
                        <span>{kernel.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{kernel.version}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

            {/* Controls Group */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleRecording}
                className={`h-9 px-4 rounded-md font-medium text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
                  session?.status !== 'recording' && session?.status !== 'paused'
                    ? 'bg-primary hover:bg-blue-600 text-white'
                    : session?.status === 'paused'
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'
                }`}
              >
                {session?.status !== 'recording' && session?.status !== 'paused' ? (
                  <Play className="w-3 h-3 fill-current" />
                ) : session?.status === 'paused' ? (
                  <Play className="w-3 h-3 fill-current" />
                ) : (
                  <Pause className="w-3 h-3 fill-current" />
                )}
                <span className="hidden sm:inline">
                  {session?.status !== 'recording' && session?.status !== 'paused'
                    ? 'Start'
                    : session?.status === 'paused'
                      ? 'Resume'
                      : 'Pause'}
                </span>
              </button>

              {(session?.status === 'recording' || session?.status === 'paused') && (
                <button
                  onClick={stopRecording}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 transition-colors"
                  title="Stop Recording"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              )}

              {/* Timer (Moved Here) */}
              <div
                className={`flex items-center gap-2 px-3 h-9 rounded-md border transition-all ${
                  session?.status === 'recording'
                    ? 'bg-slate-900 border-red-500/30 text-red-400'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${session?.status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}
                ></div>
                <span className="font-mono text-sm font-medium w-11 text-center">
                  {session?.elapsedSeconds ? formatTime(session.elapsedSeconds) : 'Ready'}
                </span>
              </div>
            </div>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-3 w-fit justify-end pl-4 border-l border-slate-700/50">
          <div className="flex gap-2">
            <Link
              to="/editor"
              className="h-9 px-4 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 transition-colors"
            >
              <Save className="w-4 h-4" /> <span className="hidden xl:inline">Save</span>
            </Link>
            <Link
              to="/"
              className="h-9 w-9 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Scenario Tree */}
        <div className="w-[40%] bg-surface/50 border-r border-slate-700 flex flex-col">
          {/* Header Action Bar */}
          <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-400 tracking-wider">SESSIONS</span>
            </div>
            <button
              onClick={() => handleCreateScenario()}
              className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 rounded text-xs transition-colors"
              title="Create New Scenario"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          {/* Main Tree List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {localScenarios.map((sc, index) => (
              <div
                key={sc.id}
                className="border border-slate-700 rounded bg-slate-800/50 overflow-hidden transition-all"
              >
                {/* Scenario Header */}
                <div className="p-2 bg-slate-800 border-b border-slate-700 font-medium text-sm flex items-center justify-between group">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => toggleScenarioCollapse(sc.id)}
                  >
                    {sc.isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-primary font-bold">SCENARIO</span>
                    <span className="text-slate-200">{sc.name}</span>
                  </div>

                  {/* Scenario Actions (Visible on Hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCreateScenario(index)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400"
                      title="Insert Scenario Before"
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleCreateScenario(index + 1)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400"
                      title="Insert Scenario After"
                    >
                      <ArrowDownCircle className="w-3 h-3" />
                    </button>
                    <div className="h-3 w-px bg-slate-700 mx-1"></div>
                    <button
                      onClick={() => handleAddPageToScenario(sc.id)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400"
                      title="Add Page to this Scenario"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRenameScenario(sc.id)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Rename Scenario"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteScenario(sc.id)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Scenario Pages */}
                {!sc.isCollapsed && (
                  <div className="p-2 space-y-3 animate-in slide-in-from-top-1 duration-200">
                    {sc.pages.length === 0 && (
                      <div className="text-center text-xs text-slate-500 py-2 border border-dashed border-slate-700 rounded">
                        No pages.{' '}
                        <button
                          className="text-primary hover:underline"
                          onClick={() => handleAddPageToScenario(sc.id)}
                        >
                          Add one
                        </button>
                      </div>
                    )}
                    {sc.pages.map((page: any) => (
                      <div
                        key={page.id}
                        className={`rounded border ${page.active ? 'border-primary/50 bg-primary/5' : 'border-slate-700 bg-slate-900/50'}`}
                      >
                        {/* Page Header */}
                        <div className="px-3 py-2 border-b border-dashed border-slate-700/50 text-xs font-mono text-slate-400 flex justify-between items-center group">
                          <div className="flex items-center gap-2">
                            <span>{page.name}</span>
                            {page.active && (
                              <span className="text-primary text-[10px] px-1 border border-primary/30 rounded">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleRenamePage(sc.id, page.id)}
                              className="hover:text-white"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeletePage(sc.id, page.id)}
                              className="hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Steps List */}
                        <div className="p-2 space-y-1">
                          {page.steps.map((step: any) => (
                            <div
                              key={step.id}
                              className="group flex items-center gap-2 text-xs text-slate-300 p-1.5 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
                            >
                              <span className="text-slate-500 w-4">{step.id}.</span>
                              <span
                                className={`px-1 rounded text-[10px] font-bold uppercase w-14 text-center select-none
                                ${
                                  step.type === 'click'
                                    ? 'bg-blue-900/50 text-blue-400'
                                    : step.type === 'wait'
                                      ? 'bg-purple-900/50 text-purple-400'
                                      : step.type === 'assert'
                                        ? 'bg-yellow-900/50 text-yellow-400'
                                        : step.type === 'navigate'
                                          ? 'bg-emerald-900/50 text-emerald-400'
                                          : step.type === 'manual'
                                            ? 'bg-orange-900/50 text-orange-400'
                                            : 'bg-slate-700 text-slate-400'
                                }`}
                              >
                                {step.type}
                              </span>
                              <span className="truncate flex-1">{step.desc}</span>
                              <div className="hidden group-hover:flex gap-1">
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleDeleteStep(sc.id, page.id, step.id)
                                  }}
                                  className="p-1 hover:bg-slate-600 rounded"
                                >
                                  <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-400" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {page.steps.length === 0 && (
                            <div className="text-[10px] text-slate-600 italic px-2">
                              No steps recorded
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Empty State / Add First Scenario */}
            {localScenarios.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm mb-4">No scenarios created yet.</p>
                <button
                  onClick={() => handleCreateScenario()}
                  className="bg-slate-800 border border-slate-700 px-4 py-2 rounded text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                >
                  Create First Scenario
                </button>
              </div>
            )}
          </div>

          {/* Action Toolbar - Compact & Efficient */}
          <div className="h-12 border-t border-slate-700 bg-slate-900 px-3 flex items-center justify-between shadow-inner z-10">
            {/* Structure Actions */}
            <div className="flex items-center">
              <button
                onClick={handleGlobalAddPage}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded text-xs text-slate-400 hover:text-primary transition-all active:scale-95 group"
                title="Add Page to Active Scenario"
              >
                <FilePlus className="w-4 h-4 group-hover:text-primary" />
                <span>Add Page</span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-slate-700 mx-2"></div>

            {/* Step Injection Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleNavigate}
                className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                title="Add Navigation Step"
              >
                <MoveRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => addNewStep('wait', 'wait for 2000ms')}
                className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-purple-400 transition-colors"
                title="Add Wait Step"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => addNewStep('manual', 'Perform manual interaction')}
                className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-orange-400 transition-colors"
                title="Add Manual Interaction Step"
              >
                <MousePointer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 flex flex-col bg-black relative">
          <div className="bg-slate-800 p-2 flex items-center gap-2 border-b border-slate-700">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <div className="flex-1 bg-slate-900 rounded px-3 py-1 text-xs text-slate-400 font-mono truncate flex items-center justify-between">
              <span>{targetUrl}</span>
              <RotateCcw className="w-3 h-3 hover:text-white cursor-pointer" />
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-neutral-900">
            {session?.status !== 'recording' && session?.status !== 'paused' && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-surface border border-slate-700 p-8 rounded-xl shadow-2xl max-w-md">
                  <MonitorPlay className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">Ready to Record?</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Enter the target URL in the address bar above and click "Start" to launch the
                    browser and begin your session.
                  </p>
                  <div className="text-xs text-slate-500 font-mono">Target Kernel: {session?.kernelName || kernels.find(k => k.id === selectedKernel)?.name || 'No Kernel'}</div>
                </div>
              </div>
            )}

            {/* Preview Content - Show iframe if recording, placeholder otherwise */}
            {(session?.status === 'recording' || session?.status === 'paused') ? (
              <iframe
                src={session?.targetUrl || targetUrl}
                className="w-full h-full border-0"
                title="Browser Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <img
                src="https://picsum.photos/800/600"
                alt="Preview"
                className="max-w-full max-h-full opacity-80"
              />
            )}

            {(session?.status === 'recording' || session?.status === 'paused') && (
              <>
                <div className="absolute top-1/2 left-1/3 w-32 h-10 border-2 border-red-500 bg-red-500/10 flex items-center justify-center animate-pulse">
                  <span className="bg-red-500 text-white text-[10px] absolute -top-4 left-0 px-1">
                    .item-card-1
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 h-12 bg-slate-900/90 rounded border border-slate-700 flex items-center px-4 gap-4 backdrop-blur-sm">
                  <MonitorPlay className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 h-1 bg-slate-700 rounded relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[70%] bg-primary rounded"></div>
                    <div className="absolute left-[70%] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow cursor-pointer hover:scale-110 transition-transform"></div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{session?.elapsedSeconds ? formatTime(session.elapsedSeconds) : '00:00'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Log */}
      <div className="h-32 bg-slate-950 border-t border-slate-700 flex flex-col font-mono text-xs">
        <div className="bg-surface px-2 py-1 text-slate-500 border-b border-slate-800 flex justify-between">
          <span>Event Log</span>
          <span className="hover:text-white cursor-pointer">
            <X className="w-3 h-3" />
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 hover:bg-white/5 px-1">
              <span className="text-slate-500">[{log.time}]</span>
              <span
                className={`${
                  log.level === 'INFO' ? 'text-blue-400' :
                  log.level === 'WARN' ? 'text-orange-400' :
                  log.level === 'ERROR' ? 'text-red-400' :
                  'text-yellow-400'
                }`}
              >
                {log.level}
              </span>
              <span className="text-slate-300">{log.msg}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
          {(session?.status === 'recording') && (
            <div className="flex gap-2 px-1 animate-pulse">
              <span className="text-slate-500">...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgeRecorder
