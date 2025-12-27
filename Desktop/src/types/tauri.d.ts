// ============================================================================
// TraceForge Desktop - Tauri Type Declarations
// Unified type declarations for Tauri APIs
// ============================================================================

declare global {
  interface Window {
    __TAURI__?: {
      invoke: <T>(cmd: string, args?: unknown) => Promise<T>;
      dialog: {
        save: (options: unknown) => Promise<string | null>;
        open: (options: unknown) => Promise<string | null>;
      };
      fs: {
        writeFile: (path: string, contents: string) => Promise<void>;
      };
    };
  }
}

export {};
