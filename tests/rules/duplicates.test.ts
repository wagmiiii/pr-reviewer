import { expect, test, describe } from 'vitest';
import { duplicatePrRule } from '../../src/rules/duplicates.js';
import type { PullRequestContext } from '../../src/types.js';

describe('duplicatePrRule', () => {
  const baseContext: PullRequestContext = {
    schemaVersion: 1,
    collectedAt: '2026-08-04T11:30:23Z',
    number: 123,
    author: 'alice',
    authorAssociation: 'CONTRIBUTOR',
    state: 'open',
    isDraft: false,
    isMerged: false,
    createdAt: '2026-08-04T11:30:23Z',
    updatedAt: '2026-08-04T11:30:23Z',
    closedAt: null,
    mergedAt: null,
    baseBranch: 'main',
    headBranch: 'patch-1',
    baseSha: 'abc',
    headSha: 'def',
    isFork: true,
    mergeableState: 'clean',
    additions: 10,
    deletions: 5,
    changedFiles: 2,
  };

  test('passes when duplicateOf is undefined', () => {
    const result = duplicatePrRule(baseContext);
    expect(result.outcome).toBe('pass');
    expect(result.code).toBe('POSSIBLE_DUPLICATE_PR');
  });

  test('fails and warns when duplicateOf is defined', () => {
    const result = duplicatePrRule({ ...baseContext, duplicateOf: 456 });
    expect(result.outcome).toBe('fail');
    expect(result.code).toBe('POSSIBLE_DUPLICATE_PR');
    expect(result.severity).toBe('warning');
    expect(result.explanation).toContain('PR #456');
  });
});
