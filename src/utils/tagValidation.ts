/**
 * Clash of Clans player/clan tags use Supercell's restricted "tag" alphabet
 * (a base-14-ish charset that intentionally excludes visually-confusable
 * characters like O/0, I/1, S/5, etc.).
 */
const TAG_CHARSET = '0289PYLQGRJCUV';
const TAG_PATTERN = new RegExp(`^#[${TAG_CHARSET}]{3,12}$`);

export interface TagValidationResult {
  valid: boolean;
  normalizedTag: string;
  error?: string;
}

/**
 * Validates and normalizes a user-supplied player/clan tag. Accepts the
 * tag with or without a leading `#` and is case-insensitive. Does not hit
 * the network — this is a pure format check to fail fast on obviously
 * malformed input before spending an API call.
 */
export function validateTag(rawTag: string): TagValidationResult {
  const trimmed = rawTag.trim().toUpperCase();

  if (trimmed.length === 0) {
    return { valid: false, normalizedTag: '', error: 'Tag cannot be empty.' };
  }

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

  if (!TAG_PATTERN.test(withHash)) {
    return {
      valid: false,
      normalizedTag: withHash,
      error:
        'That doesn\'t look like a valid Clash of Clans tag. Tags start with `#` and only ' +
        `use these characters: ${TAG_CHARSET.split('').join(' ')}`,
    };
  }

  return { valid: true, normalizedTag: withHash };
}
