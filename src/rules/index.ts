/**
 * Stage 2 — rules.
 *
 * Pure, synchronous, no network, no model, no clock. A rule is a function from
 * a `PullRequestContext` to a `RuleResult`, and the status is derived from
 * `fact` rules only — `heuristic` rules attach warnings and can never change it.
 *
 * Not implemented here — PR-030 owns the rules themselves.
 */

import type { PullRequestContext, RuleResult } from '../types.js';

/** Shape every rule is expected to have. Synchronous by design. */
export type Rule = (context: PullRequestContext) => RuleResult;
