/**
 * Stage 3 — judge (Phase 3+, and only sometimes).
 *
 * Advisory only. Fires on a *transition* into `READY_FOR_REVIEW`, never on
 * every sweep. Output can only advise: it cannot set a status, block, or merge.
 *
 * Model access sits behind a provider-agnostic interface and is deferred to
 * Phase 3. Diff content is untrusted input.
 *
 * Not implemented here — Phase 3 tickets.
 */

import type { PullRequestContext } from '../types.js';
import type { JudgmentResult, ReviewerEffortEstimate, JudgeConfig } from './types.js';

export * from './types.js';

export async function judgeIssueResolution(
  context: PullRequestContext,
  config: JudgeConfig,
): Promise<JudgmentResult | null> {
  // Stub implementation. PR-101 will provide the LLM provider.
  // Validation: If evidence is empty, we must drop it (return null).
  return null;
}

export async function judgeReviewerEffort(
  context: PullRequestContext,
  config: JudgeConfig,
): Promise<ReviewerEffortEstimate | null> {
  // Stub implementation.
  return null;
}
