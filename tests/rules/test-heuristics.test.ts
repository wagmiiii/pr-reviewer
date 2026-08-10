import { describe, expect, it } from 'vitest';
import { noTestChangedRule, testsRemovedRule } from '../../src/rules/test-heuristics.js';
import type { PullRequestContext } from '../../src/types.js';

describe('NO_TEST_CHANGED', () => {
  it('skips if no testGlobs configured', () => {
    const ctx = { config: {} } as PullRequestContext;
    const result = noTestChangedRule.run(ctx);
    expect(result.outcome).toBe('skip');
  });

  it('skips if no files', () => {
    const ctx = {
      config: { testGlobs: ['tests/**/*.ts'] },
      files: [],
    } as unknown as PullRequestContext;
    const result = noTestChangedRule.run(ctx);
    expect(result.outcome).toBe('skip');
  });

  it('fails if testGlobs are configured but no test files were modified', () => {
    const ctx = {
      config: { testGlobs: ['tests/**/*.ts'] },
      files: [{ filename: 'src/main.ts', status: 'modified' }],
    } as unknown as PullRequestContext;
    const result = noTestChangedRule.run(ctx);
    expect(result.outcome).toBe('fail');
  });

  it('passes if test file was modified', () => {
    const ctx = {
      config: { testGlobs: ['tests/**/*.ts'] },
      files: [{ filename: 'tests/main.test.ts', status: 'modified' }],
    } as unknown as PullRequestContext;
    const result = noTestChangedRule.run(ctx);
    expect(result.outcome).toBe('pass');
  });
});

describe('TESTS_REMOVED', () => {
  it('skips if no diff', () => {
    const ctx = {} as PullRequestContext;
    const result = testsRemovedRule.run(ctx);
    expect(result.outcome).toBe('skip');
  });

  it('passes if no tests removed', () => {
    const ctx = {
      config: { testGlobs: ['tests/**/*.ts'] },
      diff: {
        patch: 'diff --git a/tests/foo.ts b/tests/foo.ts\n+ it("new test", () => {})',
        truncated: false,
      },
    } as unknown as PullRequestContext;
    const result = testsRemovedRule.run(ctx);
    expect(result.outcome).toBe('pass');
  });

  it('fails if test is removed', () => {
    const ctx = {
      config: { testGlobs: ['tests/**/*.ts'] },
      diff: {
        patch: 'diff --git a/tests/foo.ts b/tests/foo.ts\n- it("old test", () => {})',
        truncated: false,
      },
    } as unknown as PullRequestContext;
    const result = testsRemovedRule.run(ctx);
    expect(result.outcome).toBe('fail');
  });

  it('fails if skip is added', () => {
    const ctx = {
      config: { testGlobs: ['tests/**/*.ts'] },
      diff: {
        patch:
          'diff --git a/tests/foo.ts b/tests/foo.ts\n+ test.skip("skipped test", () => {})',
        truncated: false,
      },
    } as unknown as PullRequestContext;
    const result = testsRemovedRule.run(ctx);
    expect(result.outcome).toBe('fail');
  });

  it('ignores test removals in non-test files', () => {
    const ctx = {
      config: { testGlobs: ['tests/**/*.ts'] },
      diff: {
        patch: 'diff --git a/src/foo.ts b/src/foo.ts\n- it("is just a word", () => {})',
        truncated: false,
      },
    } as unknown as PullRequestContext;
    const result = testsRemovedRule.run(ctx);
    expect(result.outcome).toBe('pass');
  });
});
