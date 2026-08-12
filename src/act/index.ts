/**
 * Stage 5 — act.
 *
 * **The only stage permitted to write.** Idempotent writers: labels reconciled
 * to a desired set, one sticky comment located by its HTML marker
 * (`<!-- pr-reviewer:v1 -->`) and edited in place, never duplicated.
 *
 * Dry-run is defined as "run everything, skip this stage, print the plan" —
 * which only stays true as long as no other stage writes.
 *
 * Never merges, closes, or pushes. The bot does not hold `contents: write`.
 *
 * Not implemented here — PR-050 onwards.
 */

export * from './labels.js';
export * from './comment.js';
export * from './digest.js';
// Rendering a comment is pure and safe to call without writing anything, which
// is what `pr-reviewer preview` relies on. It was omitted here, so the only way
// to see a contributor-facing comment was to reach into the module directly.
export * from './render.js';
