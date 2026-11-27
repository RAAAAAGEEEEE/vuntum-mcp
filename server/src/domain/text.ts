/**
 * Text normalisation used by the claim invariants:
 *  - a quote must be an exact substring of its snapshot after normalisation;
 *  - every number in a claim value must be findable in the quote.
 *
 * These are deterministic code checks, never model judgements.
 */

const ZERO_WIDTH = /[​-‏‪-‮⁠-⁤﻿]/g;

/** Removes invisible characters used to smuggle instructions past a reader. */
export function stripInvisible(input: string): string {
  return input.replace(ZERO_WIDTH, '');
}

/**
 * NFKC + invisible removal + whitespace collapse.
 * Typographic quotes and dashes are folded so that a copy of a sentence still
 * matches when the CMS re-typesets it.
 */
export function normalizeText(input: string): string {
  return stripInvisible(input)
    .normalize('NFKC')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/ | | /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A page text as the extraction gave it before the cell separators and line breaks were kept:
 * those taken out. Only for finding words copied from that older text.
 */
export function gluedReading(text: string): string {
  return text.replace(/ \| /g, '').replace(/\n+/g, '');
}
