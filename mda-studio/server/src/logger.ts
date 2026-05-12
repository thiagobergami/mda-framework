export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  sink?: (line: string) => void;
  level?: LogLevel;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  const sink = opts.sink ?? ((line: string) => process.stdout.write(`${line}\n`));
  const minLevel = LEVEL_RANK[opts.level ?? "info"];

  function emit(level: LogLevel, msg: string, fields: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < minLevel) return;
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level,
      msg,
      ...fields,
    });
    sink(line);
  }

  return {
    debug: (msg, fields = {}) => emit("debug", msg, fields),
    info: (msg, fields = {}) => emit("info", msg, fields),
    warn: (msg, fields = {}) => emit("warn", msg, fields),
    error: (msg, fields = {}) => emit("error", msg, fields),
  };
}
