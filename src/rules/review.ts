import type { RuleDefinition } from './index.js';

export const changesRequestedRule: RuleDefinition = {
  code: 'CHANGES_REQUESTED',
  run: (context) => {
    if (!context.reviews) {
      return {
        code: 'CHANGES_REQUESTED',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'No reviews available.',
      };
    }

    const latestReviewByAuthor = new Map<string, string>();
    for (const review of context.reviews) {
      if (review.state !== 'DISMISSED') {
        latestReviewByAuthor.set(review.author, review.state);
      }
    }

    let hasChangesRequested = false;
    for (const state of latestReviewByAuthor.values()) {
      if (state === 'CHANGES_REQUESTED') {
        hasChangesRequested = true;
        break;
      }
    }

    if (hasChangesRequested) {
      return {
        code: 'CHANGES_REQUESTED',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'blocking',
        explanation: 'Changes have been requested by a reviewer.',
      };
    }

    return {
      code: 'CHANGES_REQUESTED',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'No unresolved requested changes.',
    };
  },
};

export const draftRule: RuleDefinition = {
  code: 'DRAFT',
  run: (context) => {
    if (context.isDraft) {
      return {
        code: 'DRAFT',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'wait',
        explanation: 'The pull request is in draft mode.',
      };
    }
    return {
      code: 'DRAFT',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'The pull request is not in draft mode.',
    };
  },
};
