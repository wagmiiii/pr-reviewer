import { describe, expect, test } from 'vitest';
import { renderTerminalReport } from '../../src/render/terminal.js';
import type { PullRequestContext, RuleResult } from '../../src/types.js';

describe('renderTerminalReport', () => {
  test('renders empty queue', () => {
    const report = renderTerminalReport([]);
    expect(report).toContain('## Ready for you (0)');
    expect(report).toContain('  None');
  });

  test('groups by triage status', () => {
    const pr1: PullRequestContext = {
      schemaVersion: 1,
      collectedAt: '2026-08-05T12:00:00Z',
      createdAt: '2026-08-01T12:00:00Z',
      updatedAt: '2026-08-05T12:00:00Z',
      number: 1,
      title: 'Fix issue',
      author: 'contributor1',
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
    };

    const results: RuleResult[] = [
      {
        code: 'CI_FAILING',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'blocking',
        explanation: 'Fails',
      },
    ];

    const report = renderTerminalReport([{ context: pr1, results }]);

    expect(report).toContain('## Blocked on contributor (1)');
    expect(report).toContain('  #1 Fix issue [CI_FAILING (no CI detected)] (4d)');
  });
});
