import { describe, it, expect } from 'vitest';
import { renderComment } from '../../src/act/render.js';
import { MAINTAINER_ONLY_CODES } from '../../src/rules/index.js';
import type { PullRequestContext, RuleResult } from '../../src/types.js';

/**
 * PR-085 acceptance criterion: "Maintainer-facing only, always. Never surfaced
 * in a public comment — a false positive published on a PR is worse than a
 * miss."
 *
 * This is an enforced invariant rather than a convention, in the same spirit as
 * the "never check out contributor code" test from PR-003. If someone adds a
 * maintainer-only code and renders it into the comment, this fails.
 */

const context: PullRequestContext = {
  schemaVersion: 1,
  collectedAt: '2026-08-11T00:00:00Z',
  number: 7,
  author: 'alice',
  authorAssociation: 'CONTRIBUTOR',
  state: 'open',
  isDraft: false,
  isMerged: false,
  createdAt: '2026-08-11T00:00:00Z',
  updatedAt: '2026-08-11T00:00:00Z',
  closedAt: null,
  mergedAt: null,
  baseBranch: 'main',
  headBranch: 'feat',
  baseSha: 'abc',
  headSha: 'def',
  isFork: false,
  mergeableState: 'clean',
  additions: 1,
  deletions: 0,
  changedFiles: 1,
} as unknown as PullRequestContext;

function failureFor(code: string): RuleResult {
  return {
    code,
    outcome: 'fail',
    bucket: 'heuristic',
    owner: 'maintainer',
    severity: 'warning',
    explanation: `LEAKED-EVIDENCE-${code}`,
    confidence: 0.5,
  } as RuleResult;
}

describe('maintainer-only findings never reach the contributor comment', () => {
  it('has at least one maintainer-only code, or this test is vacuous', () => {
    expect(MAINTAINER_ONLY_CODES.length).toBeGreaterThan(0);
  });

  for (const code of MAINTAINER_ONLY_CODES) {
    it(`omits ${code} entirely — code and explanation`, () => {
      const body = renderComment(context, [failureFor(code)], 'READY_FOR_REVIEW');
      expect(body).not.toContain(code);
      expect(body).not.toContain(`LEAKED-EVIDENCE-${code}`);
    });
  }

  it('renders a normal heuristic finding, so the filter is not just hiding everything', () => {
    const body = renderComment(
      context,
      [failureFor('NO_TEST_CHANGED')],
      'READY_FOR_REVIEW',
    );
    expect(body).toContain('NO_TEST_CHANGED');
  });

  it('still reports nothing-found when the only finding was maintainer-only', () => {
    const body = renderComment(
      context,
      [failureFor('POSSIBLE_SECRET')],
      'READY_FOR_REVIEW',
    );
    expect(body).toContain('No mechanical issues found.');
  });
});
