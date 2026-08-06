/**
 * Stage 1 — collect.
 *
 * **The only stage permitted to read I/O.** GitHub API, CI logs, coverage
 * artifacts. Nothing downstream may import a network or filesystem module; see
 * `tests/architecture.test.ts`.
 *
 * Produces a single serialisable `PullRequestContext` snapshot so the rest of
 * the engine can be tested against recorded fixtures.
 *
 * Not implemented here — PR-020 onwards.
 */

import type { PullRequestContext } from '../types.js';

/** Shape every collector entry point is expected to have. */
export type Collect = (/* PR-011 defines the input */) => Promise<PullRequestContext>;
