/**
 * Stage 4 — render.
 *
 * Pure. Verdict in, Markdown and a desired label set out. No I/O: rendering
 * produces strings, `act` is what puts them anywhere.
 *
 * Tested by snapshotting rendered output from recorded fixtures.
 *
 * Not implemented here — PR-040 onwards.
 */

export { renderTerminalReport } from './terminal.js';
export type { EvaluatedPR } from './terminal.js';
