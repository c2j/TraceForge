import { create } from 'zustand';
import type { Scenario, Action, LocatorStrategy, Parameter } from '../lib/types';
import { invoke } from '../lib/tauri';

const AUTOSAVE_KEY = 'traceforge_recording_autosave';
const AUTOSAVE_INTERVAL = 10000; // 10 seconds

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopping';

export interface RecordingLog {
  time: string;
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
  msg: string;
}

export interface WaitCondition {
  type: 'networkidle' | 'domcontentloaded' | 'selector_visible' | 'timeout' | 'network';
  selector?: string;
  timeout_ms?: number;
  value?: string;
}

export interface RecordingStep {
  id: string;
  type: string;
  desc: string;
  target: string;
  timestamp: string;
  screenshot?: string;
  locators?: LocatorStrategy[];
  parameters?: Parameter[];
  wait_before?: WaitCondition;
  wait_after?: WaitCondition;
}

export interface RecordingPage {
  id: string;
  name: string;
  url?: string;
  active: boolean;
  steps: RecordingStep[];
}

export interface RecordingScenario {
  id: string;
  name: string;
  pages: RecordingPage[];
}

export interface RecordingSession {
  id: string;
  status: RecordingStatus;
  startTime: string | null;
  targetUrl: string;
  kernelId: string;
  kernelName: string;
  elapsedSeconds: number;
}

interface RecordingHistoryEntry {
  scenarios: RecordingScenario[];
  timestamp: number;
}

interface RecordingStore {
  session: RecordingSession | null;
  scenarios: RecordingScenario[];
  currentScenarioId: string | null;
  currentPageId: string | null;
  screenshots: Map<string, string>;
  logs: RecordingLog[];
  selectedStepId: string | null;
  history: RecordingHistoryEntry[];
  historyIndex: number;
  isAutoSaving: boolean;
  lastAutoSave: string | null;

  setSession: (session: RecordingSession | null) => void;
  updateSession: (updates: Partial<RecordingSession>) => void;

  setScenarios: (scenarios: RecordingScenario[]) => void;
  addScenario: (scenario: RecordingScenario) => void;
  updateScenario: (id: string, updates: Partial<RecordingScenario>) => void;
  removeScenario: (id: string) => void;

  setCurrentScenario: (scenarioId: string | null) => void;
  setCurrentPage: (pageId: string | null) => void;

  addPage: (scenarioId: string, page: RecordingPage) => void;
  updatePage: (scenarioId: string, pageId: string, updates: Partial<RecordingPage>) => void;

  addStep: (scenarioId: string, pageId: string, step: RecordingStep) => void;
  updateStep: (scenarioId: string, pageId: string, stepId: string, updates: Partial<RecordingStep>) => void;
  removeStep: (scenarioId: string, pageId: string, stepId: string) => void;

  setScreenshot: (stepId: string, dataUrl: string) => void;
  addLog: (log: RecordingLog) => void;
  clearLogs: () => void;

  setSelectedStep: (stepId: string | null) => void;

  moveStep: (scenarioId: string, pageId: string, fromIndex: number, toIndex: number) => void;
  duplicateStep: (scenarioId: string, pageId: string, stepId: string) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  clearLocalStorage: () => void;

  resetRecording: () => void;

  startRecording: (url: string, kernelId: string, kernelName: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;

  saveRecording: (name: string, projectId: string) => Promise<string>;
}

export const useRecordingStore = create<RecordingStore>((set, get) => ({
  session: null,
  scenarios: [],
  currentScenarioId: null,
  currentPageId: null,
  screenshots: new Map(),
  logs: [],
  selectedStepId: null,
  history: [],
  historyIndex: -1,
  isAutoSaving: false,
  lastAutoSave: null,

  setSession: (session) => set({ session }),

  updateSession: (updates) =>
    set((state) => ({
      session: state.session ? { ...state.session, ...updates } : null,
    })),

  setScenarios: (scenarios) => set({ scenarios }),

  addScenario: (scenario) =>
    set((state) => {
      const newScenarios = [...state.scenarios, scenario];
      return {
        scenarios: newScenarios,
        currentScenarioId: scenario.id,
      };
    }),

  updateScenario: (id, updates) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  removeScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      currentScenarioId:
        state.currentScenarioId === id ? null : state.currentScenarioId,
    })),

  setCurrentScenario: (scenarioId) =>
    set({ currentScenarioId: scenarioId }),

  setCurrentPage: (pageId) =>
    set({ currentPageId: pageId }),

  addPage: (scenarioId, page) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === scenarioId
          ? { ...s, pages: [...s.pages, page] }
          : s
      ),
      currentPageId: page.id,
    })),

  updatePage: (scenarioId, pageId, updates) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              pages: s.pages.map((p) =>
                p.id === pageId ? { ...p, ...updates } : p
              ),
            }
          : s
      ),
    })),

  addStep: (scenarioId, pageId, step) =>
    set((state) => {
      const newScenarios = state.scenarios.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              pages: s.pages.map((p) =>
                p.id === pageId
                  ? { ...p, steps: [...p.steps, step] }
                  : p
              ),
            }
          : s
      );
      return { scenarios: newScenarios };
    }),

  updateStep: (scenarioId, pageId, stepId, updates) =>
    set((state) => {
      const newScenarios = state.scenarios.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              pages: s.pages.map((p) =>
                p.id === pageId
                  ? {
                      ...p,
                      steps: p.steps.map((step) =>
                        step.id === stepId ? { ...step, ...updates } : step
                      ),
                    }
                  : p
              ),
            }
          : s
      );
      return { scenarios: newScenarios };
    }),

  removeStep: (scenarioId, pageId, stepId) =>
    set((state) => {
      const newScenarios = state.scenarios.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              pages: s.pages.map((p) =>
                p.id === pageId
                  ? { ...p, steps: p.steps.filter((step) => step.id !== stepId) }
                  : p
              ),
            }
          : s
      );
      return { scenarios: newScenarios };
    }),

  setScreenshot: (stepId, dataUrl) =>
    set((state) => {
      const newScreenshots = new Map(state.screenshots);
      newScreenshots.set(stepId, dataUrl);
      return { screenshots: newScreenshots };
    }),

  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log].slice(-100),
    })),

  clearLogs: () => set({ logs: [] }),

  setSelectedStep: (stepId) => set({ selectedStepId: stepId }),

  moveStep: (scenarioId, pageId, fromIndex, toIndex) =>
    set((state) => {
      const newScenarios = state.scenarios.map((s) => {
        if (s.id !== scenarioId) return s;

        return {
          ...s,
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;

            const newSteps = [...p.steps];
            const [movedStep] = newSteps.splice(fromIndex, 1);
            newSteps.splice(toIndex, 0, movedStep);

            return { ...p, steps: newSteps };
          }),
        };
      });

      return { scenarios: newScenarios };
    }),

  duplicateStep: (scenarioId, pageId, stepId) =>
    set((state) => {
      const newScenarios = state.scenarios.map((s) => {
        if (s.id !== scenarioId) return s;

        return {
          ...s,
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;

            const stepIndex = p.steps.findIndex((step) => step.id === stepId);
            if (stepIndex === -1) return p;

            const originalStep = p.steps[stepIndex];
            const newStep: RecordingStep = {
              ...originalStep,
              id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
            };

            const newSteps = [...p.steps];
            newSteps.splice(stepIndex + 1, 0, newStep);

            return { ...p, steps: newSteps };
          }),
        };
      });

      return { scenarios: newScenarios };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const prevState = state.history[state.historyIndex - 1];
        return {
          scenarios: prevState.scenarios,
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          scenarios: nextState.scenarios,
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    }),

  pushHistory: () =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        scenarios: JSON.parse(JSON.stringify(state.scenarios)),
        timestamp: Date.now(),
      });
      const MAX_HISTORY = 50;
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  saveToLocalStorage: () => {
    const state = useRecordingStore.getState();
    if (state.session && state.scenarios.length > 0) {
      const data = {
        session: state.session,
        scenarios: state.scenarios,
        screenshots: Array.from(state.screenshots.entries()),
        logs: state.logs,
        currentScenarioId: state.currentScenarioId,
        currentPageId: state.currentPageId,
        selectedStepId: state.selectedStepId,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
        set({ lastAutoSave: new Date().toISOString() });
        console.log('[RecordingStore] Auto-saved to localStorage');
      } catch (e) {
        console.error('[RecordingStore] Failed to auto-save:', e);
      }
    }
  },

  loadFromLocalStorage: () => {
    try {
      const dataStr = localStorage.getItem(AUTOSAVE_KEY);
      if (!dataStr) return false;

      const data = JSON.parse(dataStr);
      
      if (!data.session || !data.scenarios) return false;

      const savedAt = new Date(data.savedAt);
      const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return false;
      }

      const screenshotsMap = new Map<string, string>();
      if (Array.isArray(data.screenshots)) {
        data.screenshots.forEach(([key, value]: [string, string]) => {
          screenshotsMap.set(key, value);
        });
      }

      set({
        session: data.session,
        scenarios: data.scenarios,
        screenshots: screenshotsMap,
        logs: data.logs || [],
        currentScenarioId: data.currentScenarioId,
        currentPageId: data.currentPageId,
        selectedStepId: data.selectedStepId,
      });

      console.log('[RecordingStore] Restored from localStorage');
      return true;
    } catch (e) {
      console.error('[RecordingStore] Failed to load from localStorage:', e);
      return false;
    }
  },

  clearLocalStorage: () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    set({ lastAutoSave: null });
  },

  resetRecording: () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    set({
      session: null,
      scenarios: [],
      currentScenarioId: null,
      currentPageId: null,
      screenshots: new Map(),
      logs: [],
      selectedStepId: null,
      history: [],
      historyIndex: -1,
      lastAutoSave: null,
    });
  },

  startRecording: async (url, kernelId, kernelName) => {
    const sessionId = `session_${Date.now()}`;
    const session: RecordingSession = {
      id: sessionId,
      status: 'recording',
      startTime: new Date().toISOString(),
      targetUrl: url,
      kernelId,
      kernelName,
      elapsedSeconds: 0,
    };

    set({
      session,
      scenarios: [],
      logs: [],
      screenshots: new Map(),
      history: [],
      historyIndex: -1,
    });

    get().addLog({
      time: new Date().toISOString().slice(11, 19),
      level: 'INFO',
      msg: `Started recording session ${sessionId}`,
    });
    get().addLog({
      time: new Date().toISOString().slice(11, 19),
      level: 'INFO',
      msg: `Target URL: ${url}`,
    });
    get().addLog({
      time: new Date().toISOString().slice(11, 19),
      level: 'INFO',
      msg: `Kernel: ${kernelName}`,
    });

    const startElapseds = () => {
      const session = get().session;
      if (session?.status === 'recording') {
        get().updateSession({
          elapsedSeconds: (session.elapsedSeconds || 0) + 1,
        });
        setTimeout(startElapseds, 1000);
      }
    };
    startElapseds();

    const autoSaveTimer = setInterval(() => {
      const currentSession = get().session;
      if (currentSession?.status === 'recording') {
        set({ isAutoSaving: true });
        get().saveToLocalStorage();
        set({ isAutoSaving: false });
      } else {
        clearInterval(autoSaveTimer);
      }
    }, AUTOSAVE_INTERVAL);
  },

  stopRecording: async () => {
    const session = get().session;
    if (session) {
      get().updateSession({ status: 'stopping' });
      get().addLog({
        time: new Date().toISOString().slice(11, 19),
        level: 'INFO',
        msg: 'Stopping recording...',
      });
    }
  },

  pauseRecording: () => {
    const session = get().session;
    if (session?.status === 'recording') {
      get().updateSession({ status: 'paused' });
      get().addLog({
        time: new Date().toISOString().slice(11, 19),
        level: 'INFO',
        msg: 'Recording paused',
      });
    }
  },

  resumeRecording: () => {
    const session = get().session;
    if (session?.status === 'paused') {
      get().updateSession({ status: 'recording' });
      get().addLog({
        time: new Date().toISOString().slice(11, 19),
        level: 'INFO',
        msg: 'Recording resumed',
      });

      const resumeElapseds = () => {
        const session = get().session;
        if (session?.status === 'recording') {
          get().updateSession({
            elapsedSeconds: (session.elapsedSeconds || 0) + 1,
          });
          setTimeout(resumeElapseds, 1000);
        }
      };
      resumeElapseds();
    }
  },

  saveRecording: async (name, projectId) => {
    const { scenarios, session } = get();

    if (!session) {
      throw new Error('No active recording session');
    }

    const scriptId = await invoke<string>('create_script', {
      dbLabel: 'traceforge.db',
      name,
      projectId,
    });

    const convertedScenarios: Scenario[] = scenarios.map((sc, sIdx) => ({
      id: `sc_${sc.id}`,
      script_id: scriptId,
      name: sc.name,
      priority: 'P1' as const,
      order_index: sIdx,
      pages: sc.pages.map((p, pIdx) => ({
        id: `page_${p.id}`,
        scenario_id: `sc_${sc.id}`,
        name: p.name,
        entry_url: p.url,
        default_wait: 'networkidle' as const,
        order_index: pIdx,
        actions: p.steps.map((step, aIdx) => ({
          id: `action_${step.id}`,
          page_id: `page_${p.id}`,
          name: step.desc,
          action_type: step.type as Action['action_type'],
          order_index: aIdx,
          timeout_ms: 30000,
          screenshot_enabled: true,
          parameters: step.parameters || [],
          locators: step.locators || [],
        })),
      })),
    }));

    await invoke('update_script_scenarios', {
      dbLabel: 'traceforge.db',
      scriptId,
      scenarios: JSON.stringify(convertedScenarios),
    });

    get().addLog({
      time: new Date().toISOString().slice(11, 19),
      level: 'INFO',
      msg: `Recording saved as "${name}"`,
    });

    return scriptId;
  },
}));
