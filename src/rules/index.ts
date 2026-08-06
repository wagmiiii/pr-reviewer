/**
 * Stage 2 — rules.
 *
 * Pure, synchronous, no network, no model, no clock. A rule is a function from
 * a `PullRequestContext` to a `RuleResult`, and the status is derived from
 * `fact` rules only — `heuristic` rules attach warnings and can never change it.
 *
 * PR-030 owns the rules engine, registry, and status derivation.
 */

import type { PullRequestContext, RuleResult, TriageStatus } from '../types.js';

/** Shape every rule is expected to have. Synchronous by design. */
export type Rule = (context: PullRequestContext) => RuleResult;

/** A registered rule with its stable code identifier. */
export interface RuleDefinition {
  readonly code: string;
  readonly run: Rule;
}

/**
 * Run a set of rules against a context, filtering out disabled rules via config.
 */
export function runRules(
  context: PullRequestContext,
  registry: readonly RuleDefinition[],
): RuleResult[] {
  const disabled = new Set(context.config?.disabledRules ?? []);

  return registry.filter((def) => !disabled.has(def.code)).map((def) => def.run(context));
}

/**
 * Derive the final PR status from fact rules.
 * Heuristic rules and passed/skipped outcomes are ignored.
 */
export function deriveStatus(results: readonly RuleResult[]): TriageStatus {
  const factFailures = results.filter((r) => r.bucket === 'fact' && r.outcome === 'fail');

  // Any contributor-owned block -> BLOCKED_ON_CONTRIBUTOR
  if (factFailures.some((r) => r.severity === 'blocking' && r.owner === 'contributor')) {
    return 'BLOCKED_ON_CONTRIBUTOR';
  }

  // Any maintainer-owned block -> BLOCKED_ON_MAINTAINER
  if (factFailures.some((r) => r.severity === 'blocking' && r.owner === 'maintainer')) {
    return 'BLOCKED_ON_MAINTAINER';
  }

  // Any wait -> WAITING
  if (factFailures.some((r) => r.severity === 'wait')) {
    return 'WAITING';
  }

  return 'READY_FOR_REVIEW';
}

export * from './ci.js';
export * from './mergeability.js';
export * from './review.js';
