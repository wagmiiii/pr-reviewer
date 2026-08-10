import type { RuleDefinition } from './index.js';

export const duplicatePrRule: RuleDefinition = {
  code: 'POSSIBLE_DUPLICATE_PR',
  run: (context) => {
    if (context.duplicateOf !== undefined) {
      return {
        code: 'POSSIBLE_DUPLICATE_PR',
        outcome: 'fail',
        bucket: 'heuristic',
        owner: 'maintainer',
        severity: 'warning',
        explanation: `This pull request has significant file-path overlap with PR #${context.duplicateOf}. It might be a duplicate.`,
        confidence: 0.8,
        thresholdTuned: true,
      };
    }

    return {
      code: 'POSSIBLE_DUPLICATE_PR',
      outcome: 'pass',
      bucket: 'heuristic',
      owner: 'none',
      severity: 'info',
      explanation: 'No significant overlap with other open pull requests.',
      confidence: 0.8,
      thresholdTuned: true,
    };
  },
};
