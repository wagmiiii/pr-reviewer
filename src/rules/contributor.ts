import type { RuleDefinition } from './index.js';

export const firstTimeContributorRule: RuleDefinition = {
  code: 'FIRST_TIME_CONTRIBUTOR',
  run: (context) => {
    if (
      context.authorAssociation === 'FIRST_TIME_CONTRIBUTOR' ||
      context.authorAssociation === 'FIRST_TIMER' ||
      context.authorAssociation === 'NONE'
    ) {
      return {
        code: 'FIRST_TIME_CONTRIBUTOR',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation:
          "This is the contributor's first time contributing to this repository.",
      };
    }
    return {
      code: 'FIRST_TIME_CONTRIBUTOR',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'Contributor has contributed before.',
    };
  },
};

export const staleRule: RuleDefinition = {
  code: 'STALE',
  run: (context) => {
    const nudgeDays = context.config?.staleNudgeDays;
    const warnDays = context.config?.staleWarnDays;

    if (nudgeDays === undefined && warnDays === undefined) {
      return {
        code: 'STALE',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'Stale tracking disabled.',
      };
    }

    let lastActivityStr = context.createdAt;

    if (context.commits) {
      for (const commit of context.commits) {
        if (
          commit.authoredAt &&
          new Date(commit.authoredAt) > new Date(lastActivityStr)
        ) {
          lastActivityStr = commit.authoredAt;
        }
      }
    }

    if (context.comments) {
      for (const comment of context.comments) {
        if (comment.author === context.author) {
          const timestamp = comment.updatedAt || comment.createdAt;
          if (new Date(timestamp) > new Date(lastActivityStr)) {
            lastActivityStr = timestamp;
          }
        }
      }
    }

    if (context.reviews) {
      for (const review of context.reviews) {
        if (review.author === context.author && review.submittedAt) {
          if (new Date(review.submittedAt) > new Date(lastActivityStr)) {
            lastActivityStr = review.submittedAt;
          }
        }
      }
    }

    const lastActivity = new Date(lastActivityStr).getTime();
    const collectedAt = new Date(context.collectedAt).getTime();
    const daysSince = (collectedAt - lastActivity) / (1000 * 60 * 60 * 24);

    if (warnDays !== undefined && daysSince > warnDays) {
      return {
        code: 'STALE',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'wait',
        explanation: `No activity from the author in ${Math.round(daysSince)} days (warning threshold passed).`,
      };
    }

    if (nudgeDays !== undefined && daysSince > nudgeDays) {
      return {
        code: 'STALE',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'warning',
        explanation: `No activity from the author in ${Math.round(daysSince)} days (nudge threshold passed).`,
      };
    }

    return {
      code: 'STALE',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'Pull request is recently active.',
    };
  },
};

export const noDcoRule: RuleDefinition = {
  code: 'NO_DCO',
  run: (context) => {
    if (!context.config?.dcoEnabled) {
      return {
        code: 'NO_DCO',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'DCO enforcement is not enabled.',
      };
    }

    if (!context.commits || context.commits.length === 0) {
      return {
        code: 'NO_DCO',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'No commits available.',
      };
    }

    for (const commit of context.commits) {
      if (!commit.message.includes('Signed-off-by: ')) {
        return {
          code: 'NO_DCO',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'contributor',
          severity: 'blocking',
          explanation: `Commit ${commit.sha.substring(0, 7)} is missing a Developer Certificate of Origin (DCO) sign-off.`,
        };
      }
    }

    return {
      code: 'NO_DCO',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'All commits contain DCO sign-offs.',
    };
  },
};
