import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../config/env';
import { createLogger } from '../utils/logger';
import { Clan, ClashApiErrorPayload, CurrentWar, Player } from './clash.types';

const logger = createLogger('ClashService');

const BASE_URL = 'https://api.clashofclans.com/v1';

/** Endpoints that legitimately return 404 for "not in war" / private war log, etc. */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 8_000;

/**
 * Error raised for any non-2xx response (or exhausted-retry network failure)
 * from the Clash of Clans API. Carries the HTTP status and the API's own
 * "reason" field so callers can branch on specific failure modes
 * (e.g. private war log vs. invalid tag vs. rate limited).
 */
export class ClashApiError extends Error {
  public readonly statusCode: number | undefined;
  public readonly reason: string | undefined;
  public readonly isRateLimited: boolean;

  constructor(message: string, statusCode?: number, reason?: string) {
    super(message);
    this.name = 'ClashApiError';
    this.statusCode = statusCode;
    this.reason = reason;
    this.isRateLimited = statusCode === 429;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Computes an exponential backoff delay with full jitter, capped at
 * `maxDelayMs`.
 */
function computeBackoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** attempt;
  const capped = Math.min(exponential, maxDelayMs);
  return Math.floor(Math.random() * capped);
}

/**
 * Parses a `Retry-After` header (seconds, or an HTTP date) into a millisecond
 * delay. Returns null if the header is absent or unparseable.
 */
function parseRetryAfterMs(headerValue: unknown): number | null {
  if (typeof headerValue !== 'string' || headerValue.trim().length === 0) {
    return null;
  }

  const asSeconds = Number(headerValue);
  if (!Number.isNaN(asSeconds)) {
    return Math.max(0, asSeconds * 1000);
  }

  const asDate = Date.parse(headerValue);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return null;
}

/**
 * Normalizes a Clash of Clans player/clan tag: ensures a single leading
 * `#`, uppercases it (tags are case-insensitive but the API is picky about
 * some lowercase variants), and strips whitespace.
 */
export function normalizeTag(rawTag: string): string {
  const trimmed = rawTag.trim().toUpperCase();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash;
}

/** URL-encodes a normalized tag for safe use as a path segment (`#` -> `%23`). */
function encodeTag(rawTag: string): string {
  return encodeURIComponent(normalizeTag(rawTag));
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

class ClashApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 10_000,
      headers: {
        Authorization: `Bearer ${config.cocApiKey}`,
        Accept: 'application/json',
      },
    });
  }

  /**
   * Performs a GET request against the Clash of Clans API with automatic
   * retry + rate limit handling.
   *
   * Retry policy:
   * - Retries on network errors and on 408/429/500/502/503/504 responses.
   * - On 429 (rate limited) or 503 with a `Retry-After` header, waits the
   *   server-specified duration before retrying.
   * - Otherwise uses exponential backoff with jitter.
   * - Non-retryable errors (400/401/403/404/etc.) fail immediately as a
   *   `ClashApiError`.
   */
  private async get<T>(url: string, options: RetryOptions = {}): Promise<T> {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

    let attempt = 0;

    for (;;) {
      try {
        const requestConfig: AxiosRequestConfig = {};
        const response: AxiosResponse<T> = await this.http.get<T>(url, requestConfig);
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError<ClashApiErrorPayload>;
        const statusCode = axiosError.response?.status;
        const isRetryable = this.isRetryableError(axiosError);
        const hasRetriesLeft = attempt < maxRetries;

        if (!isRetryable || !hasRetriesLeft) {
          throw this.toClashApiError(axiosError);
        }

        const retryAfterMs = parseRetryAfterMs(axiosError.response?.headers?.['retry-after']);
        const delayMs = retryAfterMs ?? computeBackoffDelay(attempt, baseDelayMs, maxDelayMs);

        if (statusCode === 429) {
          logger.warn(
            `Rate limited by Clash of Clans API on ${url}. Retrying in ${delayMs}ms ` +
              `(attempt ${attempt + 1}/${maxRetries}).`,
          );
        } else {
          logger.warn(
            `Request to ${url} failed (${statusCode ?? axiosError.code ?? 'network error'}). ` +
              `Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}).`,
          );
        }

        await sleep(delayMs);
        attempt += 1;
      }
    }
  }

  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network-level failure (timeout, DNS, connection reset, etc.) - retryable.
      return true;
    }
    return RETRYABLE_STATUS_CODES.has(error.response.status);
  }

  private toClashApiError(error: AxiosError<ClashApiErrorPayload>): ClashApiError {
    const statusCode = error.response?.status;
    const reason = error.response?.data?.reason;
    const apiMessage = error.response?.data?.message;
    const message = apiMessage ?? reason ?? error.message ?? 'Unknown Clash of Clans API error';

    return new ClashApiError(message, statusCode, reason);
  }

  public async getPlayer(tag: string): Promise<Player> {
    return this.get<Player>(`/players/${encodeTag(tag)}`);
  }

  public async getClan(tag: string): Promise<Clan> {
    return this.get<Clan>(`/clans/${encodeTag(tag)}`);
  }

  public async getCurrentWar(tag: string): Promise<CurrentWar> {
    return this.get<CurrentWar>(`/clans/${encodeTag(tag)}/currentwar`);
  }
}

const client = new ClashApiClient();

/**
 * Fetches a player's profile by tag (e.g. `#ABC123` or `ABC123`).
 * @throws {ClashApiError} if the player is not found or the request fails.
 */
export async function getPlayer(tag: string): Promise<Player> {
  return client.getPlayer(tag);
}

/**
 * Fetches a clan's profile by tag (e.g. `#ABC123` or `ABC123`).
 * @throws {ClashApiError} if the clan is not found or the request fails.
 */
export async function getClan(tag: string): Promise<Clan> {
  return client.getClan(tag);
}

/**
 * Fetches a clan's current war status by clan tag.
 *
 * Note: this requires the clan's war log to be public, or that the
 * requesting API key's clan is currently at war with it; otherwise the API
 * returns a 403 with reason `accessDenied`. If the clan is not currently in
 * a war, `state` will be `notInWar`.
 * @throws {ClashApiError} if the clan is not found or the request fails.
 */
export async function getCurrentWar(tag: string): Promise<CurrentWar> {
  return client.getCurrentWar(tag);
}
