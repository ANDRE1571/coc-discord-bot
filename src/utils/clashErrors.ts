import { ClashApiError } from '../services/clash.service';

/**
 * Maps a caught error (expected to usually be a `ClashApiError`) into a
 * user-facing message suitable for an embed description or plain reply.
 * Shared across every command that calls the Clash of Clans API so error
 * handling stays consistent.
 */
export function resolveClashErrorMessage(error: unknown, subject: 'player' | 'clan' = 'player'): string {
  if (error instanceof ClashApiError) {
    if (error.statusCode === 404) {
      return `❌ No ${subject} found for that tag. Double-check it and try again.`;
    }
    if (error.isRateLimited) {
      return '⏳ The Clash of Clans API is rate limiting us right now. Please try again shortly.';
    }
    if (error.statusCode === 403) {
      return `🚫 Access to that ${subject} was denied by the Clash of Clans API (private war log or invalid API key IP allowlist).`;
    }
    return `⚠️ Clash of Clans API error: ${error.message}`;
  }
  return '⚠️ Something went wrong while talking to the Clash of Clans API. Please try again later.';
}
