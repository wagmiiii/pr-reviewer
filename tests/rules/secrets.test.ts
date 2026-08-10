import { expect, test, describe } from 'vitest';
import { possibleSecretRule } from '../../src/rules/secrets.js';
import type { PullRequestContext } from '../../src/types.js';

describe('possibleSecretRule', () => {
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
    diff: {
      patch: '',
      truncated: false,
      capBytes: 1000,
    },
  };

  test('skips if no diff is present', () => {
    const { diff: _, ...withoutDiff } = baseContext;
    const result = possibleSecretRule.run(withoutDiff as PullRequestContext);
    expect(result.outcome).toBe('skip');
  });

  test('passes on a normal diff', () => {
    const result = possibleSecretRule.run({
      ...baseContext,
      diff: {
        ...baseContext.diff!,
        patch: '--- a/file.ts\n+++ b/file.ts\n+const x = 42;\n-const x = 41;',
      },
    });
    expect(result.outcome).toBe('pass');
  });

  test('flags a known AWS secret prefix', () => {
    const result = possibleSecretRule.run({
      ...baseContext,
      diff: {
        ...baseContext.diff!,
        patch: '--- a/file.ts\n+++ b/file.ts\n+const awsKey = "AKIAIOSFODNN7EXAMPLE";',
      },
    });
    expect(result.outcome).toBe('fail');
    expect(result.severity).toBe('warning');
    expect(result.owner).toBe('maintainer');
    expect(result.explanation).toContain('Known secret prefix detected.');
    expect(result.explanation).not.toContain('AKIA'); // Should not leak the secret
  });

  test('flags a high-entropy string', () => {
    // Generate a long random string (Base64-like)
    const randomBase64 = 'aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1pQ3r';
    const result = possibleSecretRule.run({
      ...baseContext,
      diff: {
        ...baseContext.diff!,
        patch: `--- a/file.ts\n+++ b/file.ts\n+const secret = "${randomBase64}";`,
      },
    });
    expect(result.outcome).toBe('fail');
    expect(result.explanation).toContain('High-entropy string detected');
    expect(result.explanation).not.toContain(randomBase64); // Should not leak
  });

  test('does not flag secrets in deleted lines', () => {
    const result = possibleSecretRule.run({
      ...baseContext,
      diff: {
        ...baseContext.diff!,
        patch: '--- a/file.ts\n+++ b/file.ts\n-const awsKey = "AKIAIOSFODNN7EXAMPLE";\n+const awsKey = process.env.AWS_KEY;',
      },
    });
    expect(result.outcome).toBe('pass');
  });
});
