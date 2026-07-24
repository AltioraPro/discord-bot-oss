export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
}

export interface LoggerOptions {
  /** Emit one JSON object per line instead of a human readable line. */
  json: boolean;
  /** Messages below this level are dropped. */
  level: LogLevel;
  now?: () => Date;
  writeErr?: (line: string) => void;
  writeOut?: (line: string) => void;
}

const SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  error: 40,
  info: 20,
  warn: 30,
};

function formatPretty(
  level: LogLevel,
  message: string,
  fields: LogFields | undefined
): string {
  const head = `[${level.toUpperCase()}] ${message}`;
  const entries = Object.entries(fields ?? {});

  if (entries.length === 0) {
    return head;
  }

  const tail = entries
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");

  return `${head} ${tail}`;
}

function formatJson(
  level: LogLevel,
  message: string,
  fields: LogFields | undefined,
  now: Date
): string {
  return JSON.stringify({
    level,
    message,
    time: now.toISOString(),
    ...fields,
  });
}

export function createLogger(options: LoggerOptions): Logger {
  const now = options.now ?? (() => new Date());

  // This module is the logging boundary: it is the only place in the codebase
  // that calls console. `test/boundaries.test.ts` enforces that, because the
  // linter preset does not enable a no-console rule.
  const writeOut =
    options.writeOut ??
    ((line: string) => {
      console.log(line);
    });

  const writeErr =
    options.writeErr ??
    ((line: string) => {
      console.error(line);
    });

  const minimum = SEVERITY[options.level];

  function emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (SEVERITY[level] < minimum) {
      return;
    }

    const line = options.json
      ? formatJson(level, message, fields, now())
      : formatPretty(level, message, fields);

    if (SEVERITY[level] >= SEVERITY.warn) {
      writeErr(line);
      return;
    }

    writeOut(line);
  }

  return {
    debug: (message, fields) => emit("debug", message, fields),
    error: (message, fields) => emit("error", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
  };
}

let active: Logger = createLogger({ json: false, level: "info" });

/** Replace the process logger. Called once during bootstrap. */
export function configureLogger(options: LoggerOptions): void {
  active = createLogger(options);
}

/**
 * The process logger. Delegates to the active instance rather than being
 * reassigned, so modules that imported it before `configureLogger` ran still
 * observe the new settings.
 */
export const logger: Logger = {
  debug: (message, fields) => active.debug(message, fields),
  error: (message, fields) => active.error(message, fields),
  info: (message, fields) => active.info(message, fields),
  warn: (message, fields) => active.warn(message, fields),
};
