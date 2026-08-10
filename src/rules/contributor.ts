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

/** Defaults are untuned guesses, per `docs/05-configuration.md`. */
const DEFAULT_NUDGE_AFTER_DAYS = 14;
const DEFAULT_WARN_AFTER_DAYS = 28;

export const staleRule: RuleDefinition = {
  code: 'STALE',
  run: (context) => {
    // `staleDays` is the pre-lifecycle name for the nudge threshold. Honoured
    // rather than dropped: unknown config keys are a hard error, so removing it
    // would break every existing config on upgrade.
    const nudgeAfterDays =
      context.config?.staleNudgeAfterDays ??
      context.config?.staleDays ??
      DEFAULT_NUDGE_AFTER_DAYS;

    // Floored at the nudge threshold so a warning can never fire before the PR
    // is even considered stale. Setting warn at or below nudge collapses the
    // nudge stage — staleness then goes straight to `warn` at the nudge
    // threshold, which is the reasonable reading of "warn me earlier".
    const warnAfterDays = Math.max(
      context.config?.staleWarnAfterDays ?? DEFAULT_WARN_AFTER_DAYS,
      nudgeAfterDays,
    );

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

    const days = Math.round(daysSince);

    // Both stages stay `wait`. Escalating to `blocking` would flip the PR to
    // BLOCKED_ON_CONTRIBUTOR, and a stale PR is waiting, not blocked — the
    // author has nothing to fix. It would also be a step toward treating stale
    // as a hard stop, and `docs/04-roadmap.md` rules out auto-closing outright.
    if (daysSince > warnAfterDays) {
      return {
        code: 'STALE',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'wait',
        stage: 'warn',
        explanation:
          `No activity from the author in ${days} days. This pull request will stay ` +
          'open, but it is no longer being tracked as active. A comment saying it is ' +
          'still wanted is enough to keep it alive.',
      };
    }

    if (daysSince > nudgeAfterDays) {
      return {
        code: 'STALE',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'wait',
        stage: 'nudge',
        explanation:
          `No activity from the author in ${days} days. Still working on this? ` +
          'No action is needed if you are.',
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
