import type { RuleDefinition } from './index.js';

export const mergeConflictRule: RuleDefinition = {
  code: 'MERGE_CONFLICT',
  run: (context) => {
    if (context.mergeableState === 'dirty') {
      return {
        code: 'MERGE_CONFLICT',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'blocking',
        explanation: 'There are merge conflicts that must be resolved.',
      };
    }
    if (context.mergeableState === 'unknown') {
      return {
        code: 'MERGE_CONFLICT',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'Mergeability is currently unknown, skipping.',
      };
    }
    return {
      code: 'MERGE_CONFLICT',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'No merge conflicts.',
    };
  },
};

export const behindBaseRule: RuleDefinition = {
  code: 'BEHIND_BASE',
  run: (context) => {
    if (context.mergeableState === 'behind') {
      return {
        code: 'BEHIND_BASE',
        outcome: 'fail',
        bucket: 'heuristic',
        owner: 'contributor',
        severity: 'warning',
        explanation: 'The pull request is behind the base branch.',
        confidence: 1,
      };
    }
    return {
      code: 'BEHIND_BASE',
      outcome: 'pass',
      bucket: 'heuristic',
      owner: 'none',
      severity: 'info',
      explanation: 'The pull request is not behind the base branch.',
      confidence: 1,
    };
  },
};
