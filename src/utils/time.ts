const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const MIN_REMINDER_MS = MINUTE_MS; // 1 minute
const MAX_REMINDER_MS = 30 * DAY_MS; // 30 days

export interface DurationParseResult {
  valid: boolean;
  milliseconds: number;
  error?: string;
}

/**
 * Parses a human-friendly duration string into milliseconds. Accepts a
 * plain integer (interpreted as minutes) or a compound expression like
 * `1d`, `2h`, `30m`, or `1d12h30m`. Enforces a sane [1 minute, 30 days]
 * bound for reminders.
 */
export function parseDuration(raw: string): DurationParseResult {
  const trimmed = raw.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { valid: false, milliseconds: 0, error: 'Duration cannot be empty.' };
  }

  if (/^\d+$/.test(trimmed)) {
    const minutes = Number.parseInt(trimmed, 10);
    return finalize(minutes * MINUTE_MS);
  }

  const pattern = /(\d+)\s*(d|h|m)/g;
  let match: RegExpExecArray | null;
  let totalMs = 0;
  let matchedAnything = false;

  while ((match = pattern.exec(trimmed)) !== null) {
    matchedAnything = true;
    const value = Number.parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'd') totalMs += value * DAY_MS;
    else if (unit === 'h') totalMs += value * HOUR_MS;
    else if (unit === 'm') totalMs += value * MINUTE_MS;
  }

  if (!matchedAnything) {
    return {
      valid: false,
      milliseconds: 0,
      error: 'Could not parse that duration. Try something like `30m`, `2h`, `1d12h`, or `90`.',
    };
  }

  return finalize(totalMs);
}

function finalize(ms: number): DurationParseResult {
  if (ms < MIN_REMINDER_MS) {
    return { valid: false, milliseconds: 0, error: 'Reminders must be at least 1 minute away.' };
  }
  if (ms > MAX_REMINDER_MS) {
    return { valid: false, milliseconds: 0, error: 'Reminders cannot be more than 30 days away.' };
  }
  return { valid: true, milliseconds: ms };
}

/**
 * Parses the Clash of Clans API's compact timestamp format
 * (`yyyyMMdd'T'HHmmss.SSS'Z'`, e.g. `20260115T134500.000Z`) into a
 * standard `Date`. Returns null if the input doesn't match.
 */
export function parseCocTimestamp(raw: string | undefined): Date | null {
  if (!raw) return null;
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/.exec(raw);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, millis] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}.${millis}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats a millisecond duration as a compact human string, e.g. `1d 4h 20m`. */
export function formatDuration(ms: number): string {
  let remaining = Math.max(0, ms);
  const days = Math.floor(remaining / DAY_MS);
  remaining -= days * DAY_MS;
  const hours = Math.floor(remaining / HOUR_MS);
  remaining -= hours * HOUR_MS;
  const minutes = Math.floor(remaining / MINUTE_MS);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}
