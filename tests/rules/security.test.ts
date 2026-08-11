import { describe, it, expect } from 'vitest';
import { possibleSecretRule, findSecrets } from '../../src/rules/security.js';
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

  // PR-085 tuning. The first implementation split tokens on a character class
  // containing a literal `s` rather than `\s`, so lines were never split on
  // whitespace and whole sentences were scored as one token. It flagged 30 of
  // this repo's own 60 commits. Each case below is a real false positive from
  // that measurement.
  describe('false positives from the pre-tuning implementation', () => {
    const patchWith = (file: string, line: string) => ({
      ...baseContext,
      diff: {
        patch: `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -0,0 +1 @@\n+${line}\n`,
        truncated: false,
        capBytes: 1000,
      },
    });

    it('does not flag English prose', () => {
      const ctx = patchWith(
        'docs/decisions/005-judgment-gate.md',
        'The counter-case is real and mostly argues about size and timing, not about whether the thing works.',
      );
      expect(possibleSecretRule.run(ctx).outcome).toBe('pass');
    });

    it('does not flag a git SHA', () => {
      const ctx = patchWith(
        'docs/notes.md',
        'Fixed in 8cc65e03d4d8eee43b637fcd4ecf788019219315 last week.',
      );
      expect(possibleSecretRule.run(ctx).outcome).toBe('pass');
    });

    it('does not flag a lockfile integrity hash', () => {
      const ctx = patchWith(
        'package-lock.json',
        '"integrity": "sha512-Qm2b8QJ0kXk0dJx0PfJZWm3nKUEs0lJmNlBqLGpPYBTJUOBaKm2yfxgQqmVvvNJ5aQ==",',
      );
      expect(possibleSecretRule.run(ctx).outcome).toBe('pass');
    });

    it('does not flag a long URL', () => {
      const ctx = patchWith(
        'README.md',
        'See https://github.com/wagmiiii/pr-reviewer/blob/main/docs/04-roadmap.md for details.',
      );
      expect(possibleSecretRule.run(ctx).outcome).toBe('pass');
    });
  });

  describe('output redaction — PR-085 acceptance criterion', () => {
    const secretPatch = {
      ...baseContext,
      diff: {
        patch:
          'diff --git a/src/config.ts b/src/config.ts\n--- a/src/config.ts\n+++ b/src/config.ts\n@@ -10,0 +11,2 @@\n+const a = 1;\n+const token = "ghp_1234567890abcdefghijklmnopqrstuvwx";\n',
        truncated: false,
        capBytes: 1000,
      },
    };

    it('never emits the matched value', () => {
      const result = possibleSecretRule.run(secretPatch);
      expect(result.outcome).toBe('fail');
      expect(result.explanation).not.toContain('1234567890abcdefghijklmnopqrstuvwx');
      expect(result.explanation).toContain('***');
    });

    it('reports file and line so a maintainer can find it', () => {
      const result = possibleSecretRule.run(secretPatch);
      expect(result.explanation).toContain('src/config.ts:12');
    });

    it('is maintainer-owned and warning-only, never blocking', () => {
      const result = possibleSecretRule.run(secretPatch);
      expect(result.owner).toBe('maintainer');
      expect(result.severity).toBe('warning');
      expect(result.bucket).toBe('heuristic');
    });

    it('scores a known prefix above a bare entropy match', () => {
      const prefixHit = possibleSecretRule.run(secretPatch);
      const entropyCtx = {
        ...baseContext,
        diff: {
          patch:
            'diff --git a/src/x.ts b/src/x.ts\n--- a/src/x.ts\n+++ b/src/x.ts\n@@ -0,0 +1 @@\n+const k = "aZ4qP9xR2mT7bW1cV6nK3jL8";\n',
          truncated: false,
          capBytes: 1000,
        },
      };
      const entropyHit = possibleSecretRule.run(entropyCtx);
      expect(entropyHit.outcome).toBe('fail');

      // Narrow to the heuristic branch; `confidence` is not on FactRuleResult.
      if (prefixHit.bucket !== 'heuristic' || entropyHit.bucket !== 'heuristic') {
        throw new Error('POSSIBLE_SECRET must always be a heuristic result');
      }
      expect(prefixHit.confidence).toBeGreaterThan(entropyHit.confidence);
    });
  });

  describe('findSecrets line tracking', () => {
    it('attributes a hit to the right file when several change', () => {
      const patch = [
        'diff --git a/a.md b/a.md',
        '--- a/a.md',
        '+++ b/a.md',
        '@@ -1,0 +1,1 @@',
        '+just some ordinary words here',
        'diff --git a/b.ts b/b.ts',
        '--- a/b.ts',
        '+++ b/b.ts',
        '@@ -4,0 +5,1 @@',
        '+const t = "AKIAIOSFODNN7EXAMPLE";',
      ].join('\n');
      const hits = findSecrets(patch);
      expect(hits).toHaveLength(1);
      const [hit] = hits;
      expect(hit).toBeDefined();
      expect(hit!.file).toBe('b.ts');
      expect(hit!.line).toBe(5);
      expect(hit!.reason).toBe('known-prefix');
    });
  });
});
