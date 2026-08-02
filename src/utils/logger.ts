import { config, LogLevel } from '../config/env';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function timestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[config.logLevel];
}

function format(level: LogLevel, scope: string, message: string): string {
  return `[${timestamp()}] [${level.toUpperCase()}] [${scope}] ${message}`;
}

export interface Logger {
  debug: (message: string, ...meta: unknown[]) => void;
  info: (message: string, ...meta: unknown[]) => void;
  warn: (message: string, ...meta: unknown[]) => void;
  error: (message: string, ...meta: unknown[]) => void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message: string, ...meta: unknown[]) => {
      if (shouldLog('debug')) console.debug(format('debug', scope, message), ...meta);
    },
    info: (message: string, ...meta: unknown[]) => {
      if (shouldLog('info')) console.info(format('info', scope, message), ...meta);
    },
    warn: (message: string, ...meta: unknown[]) => {
      if (shouldLog('warn')) console.warn(format('warn', scope, message), ...meta);
    },
    error: (message: string, ...meta: unknown[]) => {
      if (shouldLog('error')) console.error(format('error', scope, message), ...meta);
    },
  };
}

export const logger = createLogger('App');
