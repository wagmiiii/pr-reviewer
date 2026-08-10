import { describe, it, expect } from 'vitest';
import { possibleSecretRule } from '../../src/rules/security.js';
import type { PullRequestContext } from '../../src/types.js';

describe('possibleSecretRule', () => {
  const baseContext: PullRequestContext = {
    schemaVersion: 1,
    collectedAt: '2026-08-04T00:00:00Z',
    number: 1,
    author: 'alice',
    authorAssociation: 'CONTRIBUTOR',
    state: 'open',
    isDraft: false,
    isMerged: false,
    createdAt: '2026-08-04T00:00:00Z',
    updatedAt: '2026-08-04T00:00:00Z',
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
  };

  it('skips if no diff', () => {
    const result = possibleSecretRule.run(baseContext);
    expect(result.outcome).toBe('skip');
  });

  it('passes for normal code additions', () => {
    const context = {
      ...baseContext,
      diff: {
        patch: '+++ b/file.js\n@@ -0,0 +1 @@\n+const x = 42;\n',
        truncated: false,
        capBytes: 100,
      },
    };
    const result = possibleSecretRule.run(context);
    expect(result.outcome).toBe('pass');
  });

  it('fails if known prefix is present', () => {
    const context = {
      ...baseContext,
      diff: {
        patch:
          '+++ b/file.js\n@@ -0,0 +1 @@\n+const token = "ghp_1234567890abcdefghijklmnopqrstuvwx";\n',
        truncated: false,
        capBytes: 100,
      },
    };
    const result = possibleSecretRule.run(context);
    expect(result.outcome).toBe('fail');
    expect(result.owner).toBe('maintainer');
  });

  it('fails if high entropy string >= 20 chars', () => {
    const context = {
      ...baseContext,
      diff: {
        patch:
          '+++ b/file.js\n@@ -0,0 +1 @@\n+const secret = "x7f9a2p8b1q5r4m3z0c6vx7f9a2p8b1q5r4m3z0c6v";\n',
        truncated: false,
        capBytes: 100,
      },
    };
    const result = possibleSecretRule.run(context);
    expect(result.outcome).toBe('fail');
  });

  it('passes if string is >= 20 chars but low entropy', () => {
    const context = {
      ...baseContext,
      diff: {
        patch: '+++ b/file.js\n@@ -0,0 +1 @@\n+const str = "aaaaaaaaaaaaaaaaaaaaa";\n',
        truncated: false,
        capBytes: 100,
      },
    };
    const result = possibleSecretRule.run(context);
    expect(result.outcome).toBe('pass');
  });

  it('ignores deleted lines', () => {
    const context = {
      ...baseContext,
      diff: {
        patch:
          '--- a/file.js\n+++ b/file.js\n@@ -1,1 +0,0 @@\n-const token = "ghp_1234567890abcdefghijklmnopqrstuvwx";\n',
        truncated: false,
        capBytes: 100,
      },
    };
    const result = possibleSecretRule.run(context);
    expect(result.outcome).toBe('pass');
  });
});
