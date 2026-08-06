import type { RuleDefinition } from './index.js';

// Simple glob to regex converter for path matching
function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr =
    '^' +
    escaped.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.') +
    '$';
  return new RegExp(regexStr);
}

export const touchesProtectedRule: RuleDefinition = {
  code: 'TOUCHES_PROTECTED',
  run: (context) => {
    if (!context.files || context.files.length === 0) {
      return {
        code: 'TOUCHES_PROTECTED',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'No files modified.',
      };
    }
    const globs = context.config?.protectedGlobs ?? ['.github/workflows/**'];
    const regexes = globs.map(globToRegex);

    for (const file of context.files) {
      if (regexes.some((r) => r.test(file.filename))) {
        return {
          code: 'TOUCHES_PROTECTED',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'maintainer',
          severity: 'blocking',
          explanation: `Pull request modifies a protected file: ${file.filename}`,
        };
      }
    }

    return {
      code: 'TOUCHES_PROTECTED',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'No protected files modified.',
    };
  },
};

export const hugeDiffRule: RuleDefinition = {
  code: 'HUGE_DIFF',
  run: (context) => {
    const threshold = context.config?.hugeDiffThresholdLines ?? 500;
    let totalLines = 0;
    if (context.files) {
      for (const file of context.files) {
        totalLines += file.additions + file.deletions;
      }
    } else {
      totalLines = context.additions + context.deletions;
    }

    if (totalLines > threshold) {
      return {
        code: 'HUGE_DIFF',
        outcome: 'fail',
        bucket: 'heuristic',
        owner: 'contributor',
        severity: 'warning',
        explanation: `Pull request is exceptionally large (${totalLines} lines modified). Consider splitting it.`,
      };
    }

    return {
      code: 'HUGE_DIFF',
      outcome: 'pass',
      bucket: 'heuristic',
      owner: 'none',
      severity: 'info',
      explanation: 'Diff size is acceptable.',
    };
  },
};
