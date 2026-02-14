// ─── Structured Logger ──────────────────────────────────────────────────────
//
// Replaces bare console.error / console.log throughout the app.
// Adds timestamp and context to every entry.
//
// Usage:
//   import { log } from "@/lib/logger";
//   log.error("ComplianceScreen", "Failed to load household", { householdId, error });
//   log.info("TaskManager", "Task completed", { taskId });
//   log.warn("HomeScreen", "Stats returned empty");

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function formatEntry(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;
}

function createEntry(level: LogLevel, context: string, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

export const log = {
  info(context: string, message: string, data?: Record<string, unknown>) {
    const entry = createEntry("info", context, message, data);
    console.log(formatEntry(entry), data || "");
  },

  warn(context: string, message: string, data?: Record<string, unknown>) {
    const entry = createEntry("warn", context, message, data);
    console.warn(formatEntry(entry), data || "");
  },

  error(context: string, message: string, data?: Record<string, unknown>) {
    const entry = createEntry("error", context, message, data);
    console.error(formatEntry(entry), data || "");
  },
};
