import { describe, expect, test } from 'vitest';
import { renderDigest } from '../../src/render/digest.js';
import type { PullRequestContext, RuleResult } from '../../src/types.js';

function context(overrides: Partial<PullRequestContext> = {}): PullRequestContext {
  return {
    schemaVersion: 1,
    collectedAt: '2026-08-10T12:00:00Z',
    createdAt: '2026-08-01T12:00:00Z',
    updatedAt: '2026-08-10T12:00:00Z',
    number: 1,
    title: 'Fix the thing',
    author: 'contributor',
    authorAssociation: 'CONTRIBUTOR',
    state: 'open',
    isDraft: false,
    isMerged: false,
    closedAt: null,
    mergedAt: null,
    baseBranch: 'main',
    headBranch: 'fix',
    baseSha: 'abc',
    headSha: 'def',
    isFork: true,
    mergeableState: 'clean',
    additions: 10,
    deletions: 5,
    changedFiles: 2,
    ...overrides,
  };
}

const baseBroken: RuleResult = {
  code: 'CI_BROKEN_ON_BASE',
  outcome: 'fail',
  bucket: 'fact',
  owner: 'maintainer',
  severity: 'blocking',
  explanation: 'A required check is failing on the base branch.',
};

const contributorBroke: RuleResult = {
  code: 'CI_FAILING',
  outcome: 'fail',
  bucket: 'fact',
  owner: 'contributor',
  severity: 'blocking',
  explanation: 'A required check is failing on this branch only.',
};

describe('renderDigest', () => {
  test('says so plainly when the queue is empty', () => {
    expect(renderDigest([])).toContain('The open-PR queue is empty.');
  });

  test('separates base-broken PRs from contributor-broken ones', () => {
    const digest = renderDigest([
      { context: context({ number: 1 }), results: [baseBroken] },
      { context: context({ number: 2 }), results: [contributorBroke] },
    ]);

    expect(digest).toContain('## Your `main` is broken (1)');
    expect(digest).toContain('## Blocked on contributor (1)');

    // The attribution split is the whole justification for the digest, so the
    // two PRs must not land in the same section.
    const baseIdx = digest.indexOf('Your `main` is broken');
    const contribIdx = digest.indexOf('Blocked on contributor');
    const pr1Idx = digest.indexOf('**#1**');
    const pr2Idx = digest.indexOf('**#2**');

    expect(pr1Idx).toBeGreaterThan(baseIdx);
    expect(pr1Idx).toBeLessThan(contribIdx);
    expect(pr2Idx).toBeGreaterThan(contribIdx);
  });

  test('gives the reason, not just the rule code', () => {
    const digest = renderDigest([{ context: context(), results: [baseBroken] }]);

    // A saved search can already show which label is applied. The reason is the
    // thing it cannot show, so it must survive into the output.
    expect(digest).toContain('A required check is failing on the base branch.');
    expect(digest).toContain('`CI_BROKEN_ON_BASE`');
  });

  test('a base-broken PR outranks its own triage status', () => {
    // CI_BROKEN_ON_BASE is maintainer-owned and blocking, so deriveStatus puts
    // it in BLOCKED_ON_MAINTAINER. It must still be pulled out separately.
    const digest = renderDigest([{ context: context(), results: [baseBroken] }]);

    expect(digest).toContain('## Your `main` is broken (1)');
    expect(digest).not.toContain('## Needs your decision');
  });

  test('orders each section oldest first', () => {
    const digest = renderDigest([
      { context: context({ number: 1, createdAt: '2026-08-09T12:00:00Z' }), results: [] },
      { context: context({ number: 2, createdAt: '2026-08-01T12:00:00Z' }), results: [] },
      { context: context({ number: 3, createdAt: '2026-08-05T12:00:00Z' }), results: [] },
    ]);

    expect(digest.indexOf('**#2**')).toBeLessThan(digest.indexOf('**#3**'));
    expect(digest.indexOf('**#3**')).toBeLessThan(digest.indexOf('**#1**'));
  });

  test('omits empty sections rather than printing zero counts', () => {
    const digest = renderDigest([{ context: context(), results: [] }]);

    expect(digest).toContain('## Ready for you (1)');
    expect(digest).not.toContain('(0)');
  });

  test('caps a long section and reports the remainder', () => {
    const prs = Array.from({ length: 25 }, (_, i) => ({
      context: context({ number: i + 1 }),
      results: [],
    }));

    const digest = renderDigest(prs, 20);

    expect(digest).toContain('## Ready for you (25)');
    expect(digest).toContain('…and 5 more');
    expect(digest).toContain('Sections are capped at 20 PRs.');
  });

  test('stays under the GitHub issue body limit on a large queue', () => {
    const prs = Array.from({ length: 400 }, (_, i) => ({
      context: context({
        number: i + 1,
        title: 'A fairly long pull request title that eats into the budget'.repeat(6),
      }),
      results: [baseBroken, contributorBroke],
    }));

    const digest = renderDigest(prs, 400);

    expect(digest.length).toBeLessThanOrEqual(65536);
  });
});
