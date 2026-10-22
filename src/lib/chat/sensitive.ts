const NOISE = /[\s\p{P}\p{S}]/gu;
const ZERO_WIDTH = /[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g;

export function normalizeForFilter(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(ZERO_WIDTH, "")
    .replace(NOISE, "");
}

/**
 * Returns the words that the given text hits. Matching happens on a normalized
 * copy, so "代 考" or "代-考" cannot slip past the filter.
 */
export function findSensitiveWords(text: string, words: readonly string[]): string[] {
  const haystack = normalizeForFilter(text);
  if (haystack.length === 0) return [];

  const hits = new Set<string>();
  for (const word of words) {
    const needle = normalizeForFilter(word);
    if (needle.length > 0 && haystack.includes(needle)) hits.add(word);
  }
  return [...hits];
}
