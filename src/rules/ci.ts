import type {
  PullRequestContext,
  RuleResult,
  CheckRun,
  CheckConclusion,
} from '../types.js';
import type { RuleDefinition } from './index.js';

const FAILED: CheckConclusion[] = [
  'failure',
  'timed_out',
  'cancelled',
  'action_required',
  'stale',
];

function isRequired(run: CheckRun): boolean {
  return run.isRequired !== false;
}

export const ciFailingRule: RuleDefinition = {
  code: 'CI_FAILING',
  run: (context: PullRequestContext): RuleResult => {
    if (!context.checks)
      return {
        code: 'CI_FAILING',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'Checks not fetched',
      };

    const failingHead = context.checks.filter(
      (c) => isRequired(c) && FAILED.includes(c.conclusion),
    );
    if (failingHead.length === 0)
      return {
        code: 'CI_FAILING',
        outcome: 'pass',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'No failing required checks',
      };

    if (!context.baseChecks) {
      return {
        code: 'CI_FAILING',
        outcome: 'pass',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'Base checks unknown',
      };
    }

    const failedByContributor = failingHead.some((headRun) => {
      const baseRun = context.baseChecks!.find((b) => b.name === headRun.name);
      return !baseRun || !FAILED.includes(baseRun.conclusion);
    });

    if (failedByContributor) {
      return {
        code: 'CI_FAILING',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'blocking',
        explanation: 'A required check failed on your PR but passes on the base branch.',
      };
    }

    return {
      code: 'CI_FAILING',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'All failures are also on base.',
    };
  },
};

export const ciBrokenOnBaseRule: RuleDefinition = {
  code: 'CI_BROKEN_ON_BASE',
  run: (context: PullRequestContext): RuleResult => {
    if (!context.checks)
      return {
        code: 'CI_BROKEN_ON_BASE',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'Checks not fetched',
      };

    const failingHead = context.checks.filter(
      (c) => isRequired(c) && FAILED.includes(c.conclusion),
    );
    if (failingHead.length === 0)
      return {
        code: 'CI_BROKEN_ON_BASE',
        outcome: 'pass',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'No failing required checks',
      };

    if (!context.baseChecks) {
      return {
        code: 'CI_BROKEN_ON_BASE',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'maintainer',
        severity: 'blocking',
        explanation: 'Checks are failing and base status is unknown.',
      };
    }

    const failedOnBase = failingHead.some((headRun) => {
      const baseRun = context.baseChecks!.find((b) => b.name === headRun.name);
      return baseRun && FAILED.includes(baseRun.conclusion);
    });

    if (failedOnBase) {
      return {
        code: 'CI_BROKEN_ON_BASE',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'maintainer',
        severity: 'blocking',
        explanation: 'A required check is failing on the base branch.',
      };
    }

    return {
      code: 'CI_BROKEN_ON_BASE',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'No base failures detected.',
    };
  },
};

export const ciPendingRule: RuleDefinition = {
  code: 'CI_PENDING',
  run: (context: PullRequestContext): RuleResult => {
    if (!context.checks)
      return {
        code: 'CI_PENDING',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'Checks not fetched',
      };

    const pending = context.checks.some((c) => isRequired(c) && c.status !== 'completed');
    if (pending) {
      return {
        code: 'CI_PENDING',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'none',
        severity: 'wait',
        explanation: 'Required checks are still running.',
      };
    }

    return {
      code: 'CI_PENDING',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'All checks completed.',
    };
  },
};

export const ciMissingRule: RuleDefinition = {
  code: 'CI_MISSING',
  run: (context: PullRequestContext): RuleResult => {
    if (!context.checks)
      return {
        code: 'CI_MISSING',
        outcome: 'skip',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'Checks not fetched',
      };

    if (context.checks.length === 0) {
      return {
        code: 'CI_MISSING',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'maintainer',
        severity: 'blocking',
        explanation: 'No checks ran on this PR.',
      };
    }

    if (context.baseChecks) {
      const missing = context.baseChecks.some((baseCheck) => {
        if (!isRequired(baseCheck)) return false;
        const found = context.checks!.some(
          (headCheck) => headCheck.name === baseCheck.name,
        );
        return !found;
      });
      if (missing) {
        return {
          code: 'CI_MISSING',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'maintainer',
          severity: 'blocking',
          explanation: 'A required check is missing from this PR.',
        };
      }
    }

    return {
      code: 'CI_MISSING',
      outcome: 'pass',
      bucket: 'fact',
      owner: 'none',
      severity: 'info',
      explanation: 'No missing required checks.',
    };
  },
};

export const ciRules = [ciFailingRule, ciBrokenOnBaseRule, ciPendingRule, ciMissingRule];
