import { Colors, EmbedBuilder } from 'discord.js';

export const BRAND_COLOR = Colors.Gold;
export const ERROR_COLOR = Colors.Red;
export const SUCCESS_COLOR = Colors.Green;
export const INFO_COLOR = Colors.Blurple;

const BAR_FILLED_CHAR = '█';
const BAR_EMPTY_CHAR = '░';
const BAR_LENGTH = 10;

/** A base embed with consistent branding (color + footer + timestamp). */
export function baseEmbed(title: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(title)
    .setFooter({ text: 'Clash of Clans' })
    .setTimestamp();
}

/** A standardized error embed. */
export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(ERROR_COLOR).setDescription(message);
}

/** A standardized success embed. */
export function successEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(title).setDescription(message);
}

/**
 * Renders a compact text progress bar, e.g. `███████░░░ 70%`, for
 * level/trophy/progress-style fields.
 */
export function progressBar(current: number, max: number, length: number = BAR_LENGTH): string {
  if (max <= 0) return `${BAR_EMPTY_CHAR.repeat(length)} 0%`;
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  const percent = Math.round(ratio * 100);
  return `${BAR_FILLED_CHAR.repeat(filled)}${BAR_EMPTY_CHAR.repeat(empty)} ${percent}%`;
}

/**
 * Splits a list of pre-formatted lines into chunks that each fit within
 * Discord's 1024-character embed field value limit, joining lines with
 * newlines. Used for troop/spell/hero lists that may exceed the limit.
 */
export function chunkLines(lines: string[], maxLength = 1024): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    const candidate = current.length === 0 ? line : `${current}\n${line}`;
    if (candidate.length > maxLength) {
      if (current.length > 0) {
        chunks.push(current);
      }
      current = line;
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : ['None'];
}

/** Renders a Unix-ms timestamp as a Discord relative timestamp, e.g. `<t:1234:R>`. */
export function relativeTimestamp(unixMs: number): string {
  return `<t:${Math.floor(unixMs / 1000)}:R>`;
}

/** Renders a Unix-ms timestamp as a Discord full date+time timestamp, e.g. `<t:1234:F>`. */
export function fullTimestamp(unixMs: number): string {
  return `<t:${Math.floor(unixMs / 1000)}:F>`;
}
