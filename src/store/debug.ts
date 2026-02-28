import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: any[];
}

interface DebugStore {
  logs: LogEntry[];
  addLog: (level: "info" | "warn" | "error", message: string, ...data: any[]) => void;
  clearLogs: () => void;
  exportLogs: () => string;
}

// Intercept console methods to capture logs
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

export const useDebugStore = create<DebugStore>()(
  persist(
    (set, get) => ({
      logs: [],
      addLog: (level, message, ...data) => {
        const serialize = (obj: any, depth = 0): any => {
          if (depth > 3) return "[Max Depth Reached]";
          if (obj === null || obj === undefined) return obj;

          if (obj instanceof Error || (obj && typeof obj.message === 'string' && typeof obj.name === 'string')) {
            return {
              name: obj.name,
              message: obj.message,
              stack: obj.stack,
              cause: obj.cause ? serialize(obj.cause, depth + 1) : undefined,
              // Some APIs return error data in custom properties
              ...(Object.getOwnPropertyNames(obj).reduce((acc, key) => {
                if (!['name', 'message', 'stack', 'cause'].includes(key)) {
                  acc[key] = serialize((obj as any)[key], depth + 1);
                }
                return acc;
              }, {} as any))
            };
          }

          if (typeof obj === "object") {
            try {
              if (Array.isArray(obj)) {
                return obj.map(item => serialize(item, depth + 1));
              }
              const result: any = {};
              for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                   result[key] = serialize(obj[key], depth + 1);
                }
              }
              return result;
            } catch {
              return "[Unserializable Object]";
            }
          }
          return obj;
        };

        const parsedMessage =
          typeof message === "string" ? message : JSON.stringify(serialize(message));

        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level,
          message: parsedMessage,
          data: data.length > 0 ? data.map(serialize) : undefined,
        };
        // Limit logs to last 1000 entries to prevent memory issues
        set((state) => ({
          logs: [...state.logs.slice(-999), entry],
        }));
      },
      clearLogs: () => set({ logs: [] }),
      exportLogs: () => {
        const { logs } = get();
        return JSON.stringify(logs, null, 2);
      },
    }),
    {
      name: "deep-research-debug-store",
    }
  )
);

// Function to initialize log interception
export function initLogInterception() {
  if (typeof window === "undefined") return; // Client-side only

  console.log = (...args) => {
    originalConsoleLog(...args);
    useDebugStore.getState().addLog("info", args[0], ...args.slice(1));
  };

  console.warn = (...args) => {
    originalConsoleWarn(...args);
    useDebugStore.getState().addLog("warn", args[0], ...args.slice(1));
  };

  console.error = (...args) => {
    originalConsoleError(...args);
    useDebugStore.getState().addLog("error", args[0], ...args.slice(1));
  };
}
