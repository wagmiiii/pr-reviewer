import { minimatch } from 'minimatch';
import type { PullRequestContext, RuleResult } from '../types.js';

export const noTestChangedRule = {
  code: 'NO_TEST_CHANGED',
  run: (context: PullRequestContext): RuleResult => {
    const globs = context.config?.testGlobs;
    if (!globs || globs.length === 0) {
      return {
        code: 'NO_TEST_CHANGED',
        outcome: 'skip',
        bucket: 'heuristic',
        owner: 'none',
        severity: 'info',
        explanation: 'No test globs configured',
      };
    }

    if (!context.files || context.files.length === 0) {
      return {
        code: 'NO_TEST_CHANGED',
        outcome: 'skip',
        bucket: 'heuristic',
        owner: 'none',
        severity: 'info',
        explanation: 'No files to check',
      };
    }

    const hasTestFilesModified = context.files.some(
      (f) => f.status !== 'unchanged' && globs.some((g) => minimatch(f.filename, g)),
    );

    if (!hasTestFilesModified) {
      return {
        code: 'NO_TEST_CHANGED',
        outcome: 'fail',
        bucket: 'heuristic',
        owner: 'contributor',
        severity: 'warning',
        explanation: 'No files under configured test paths were modified.',
      };
    }

    return {
      code: 'NO_TEST_CHANGED',
      outcome: 'pass',
      bucket: 'heuristic',
      owner: 'none',
      severity: 'info',
      explanation: 'Test files were modified',
    };
  },
};
export const testsRemovedRule = {
  code: 'TESTS_REMOVED',
  run: (context: PullRequestContext): RuleResult => {
    if (!context.diff || context.diff.truncated) {
      return {
        code: 'TESTS_REMOVED',
        outcome: 'skip',
        bucket: 'heuristic',
        owner: 'none',
        severity: 'info',
        explanation: 'Diff missing or truncated',
      };
    }

    const patch = context.diff.patch;
    const lines = patch.split('\n');
    let currentFile = '';
    let inTestFile = false;
    const testGlobs = context.config?.testGlobs ?? [];

    const deletionRegex = /(assert|it\(|test\(|def test_)/;
    const skipRegex = /(skip|xit|@Ignore)/;

    for (const line of lines) {
      if (line.startsWith('diff --git ')) {
        // e.g. diff --git a/tests/foo.ts b/tests/foo.ts
        const parts = line.split(' ');
        if (parts.length >= 3) {
          currentFile = parts[2]!.replace(/^b\//, '').replace(/^a\//, '');
          // Determine if it's a test file based on globs, or common test heuristics if globs not present?
          // "deleted from test files" - if testGlobs are given, use them. Else we might fallback to a default heuristic?
          // Let's assume if testGlobs is empty, we just check if path contains 'test'.
          if (testGlobs.length > 0) {
            inTestFile = testGlobs.some((g) => minimatch(currentFile, g));
          } else {
            inTestFile = currentFile.includes('test') || currentFile.includes('spec');
          }
        }
        continue;
      }

      if (inTestFile) {
        if (line.startsWith('-') && !line.startsWith('---') && deletionRegex.test(line)) {
          return {
            code: 'TESTS_REMOVED',
            outcome: 'fail',
            bucket: 'heuristic',
            owner: 'contributor',
            severity: 'warning',
            explanation: 'Test cases appear to be removed.',
          };
        }
        if (line.startsWith('+') && !line.startsWith('+++') && skipRegex.test(line)) {
          return {
            code: 'TESTS_REMOVED',
            outcome: 'fail',
            bucket: 'heuristic',
            owner: 'contributor',
            severity: 'warning',
            explanation: 'Tests appear to be skipped.',
          };
        }
      }
    }

    return {
      code: 'TESTS_REMOVED',
      outcome: 'pass',
      bucket: 'heuristic',
      owner: 'none',
      severity: 'info',
      explanation: 'No tests removed or skipped.',
    };
  },
};
