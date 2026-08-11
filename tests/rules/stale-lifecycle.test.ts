import { describe, expect, test } from 'vitest';
import { staleRule } from '../../src/rules/contributor.js';
import type { PullRequestContext, RepoConfig } from '../../src/types.js';

/** A PR whose only activity is its creation, `daysStale` days before collection. */
function stalePr(daysStale: number, config?: RepoConfig): PullRequestContext {
  const collectedAt = new Date('2026-08-10T12:00:00Z');
  const createdAt = new Date(collectedAt.getTime() - daysStale * 86400000);

  return {
    schemaVersion: 1,
    collectedAt: collectedAt.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    number: 1,
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
    additions: 1,
    deletions: 1,
    changedFiles: 1,
    ...(config ? { config } : {}),
  };
}

describe('STALE lifecycle', () => {
  test('a fresh PR passes', () => {
    const result = staleRule.run(stalePr(3));
    expect(result.outcome).toBe('pass');
    expect(result.stage).toBeUndefined();
  });

  test('nudges past the nudge threshold', () => {
    const result = staleRule.run(stalePr(20));
    expect(result.outcome).toBe('fail');
    expect(result.stage).toBe('nudge');
    expect(result.explanation).toContain('Still working on this?');
  });

  test('escalates to warn past the warn threshold', () => {
    const result = staleRule.run(stalePr(40));
    expect(result.outcome).toBe('fail');
    expect(result.stage).toBe('warn');
    expect(result.explanation).toContain('no longer being tracked as active');
  });

  test('never escalates severity beyond wait', () => {
    // `blocking` would flip the PR to BLOCKED_ON_CONTRIBUTOR. A stale PR is
    // waiting, not blocked — there is nothing for the author to fix — and
    // docs/04-roadmap.md rules out treating staleness as a hard stop.
    for (const days of [20, 40, 400]) {
      const result = staleRule.run(stalePr(days));
      expect(result.severity).toBe('wait');
      expect(result.owner).toBe('contributor');
    }
  });

  test('keeps the STALE code at every stage', () => {
    // The zero-false-positive fixtures are hand-classified against this code.
    // A separate STALE_WARN code would move 5 of the 9 stale fixtures and
    // break the gate.
    for (const days of [20, 40]) {
      expect(staleRule.run(stalePr(days)).code).toBe('STALE');
    }
  });

  test('honours the deprecated staleDays as the nudge threshold', () => {
    // Unknown config keys are a hard error, so dropping this would break every
    // existing config on upgrade.
    const result = staleRule.run(stalePr(8, { staleDays: 5 }));
    expect(result.outcome).toBe('fail');
    expect(result.stage).toBe('nudge');
  });

  test('staleNudgeAfterDays wins over the deprecated staleDays', () => {
    const result = staleRule.run(stalePr(8, { staleDays: 5, staleNudgeAfterDays: 30 }));
    expect(result.outcome).toBe('pass');
  });

  test('respects configured thresholds', () => {
    const config: RepoConfig = { staleNudgeAfterDays: 2, staleWarnAfterDays: 5 };

    expect(staleRule.run(stalePr(1, config)).outcome).toBe('pass');
    expect(staleRule.run(stalePr(3, config)).stage).toBe('nudge');
    expect(staleRule.run(stalePr(6, config)).stage).toBe('warn');
  });

  test('a warn threshold below the nudge threshold never warns early', () => {
    const config: RepoConfig = { staleNudgeAfterDays: 14, staleWarnAfterDays: 2 };

    // The floor is the point: a PR that is not yet stale must not be warned
    // about, whatever the warn threshold says.
    expect(staleRule.run(stalePr(5, config)).outcome).toBe('pass');

    // Past the nudge threshold it goes straight to warn — the nudge stage
    // collapses, which is the reasonable reading of "warn me earlier".
    expect(staleRule.run(stalePr(20, config)).stage).toBe('warn');
  });
});
