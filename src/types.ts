/**
 * Shared vocabulary for the pipeline. Types only — no behaviour lives here.
 *
 * Scope note (PR-010): these are the placeholders the stage boundaries need in
 * order to typecheck. Filling them in belongs to later tickets, named inline.
 */

/**
 * The single serialisable snapshot produced by `collect` and consumed by every
 * downstream stage.
 *
 * PR-011: defined jointly, do not fill in here.
 *
 * It is `unknown` on purpose. Anything downstream must narrow explicitly, so no
 * stage can quietly grow a dependency on a field before the contract exists.
 */
export interface PullRequestContext {
  /** The PR number. */
  number: number;
  /** The author's GitHub login. */
  author: string;
  /** State of the PR. */
  state: 'open' | 'closed';
  /** Whether the PR is a draft. */
  isDraft: boolean;

  /** The base branch name (e.g. 'main'). */
  baseBranch: string;
  /** The head branch name. */
  headBranch: string;
  /** The SHA of the base commit. */
  baseSha: string;
  /** The SHA of the head commit. */
  headSha: string;

  /** Mergeable state from GitHub API (e.g. 'clean', 'dirty', 'unknown'). */
  mergeableState: string;
  /** Total lines added across all files. */
  additions: number;
  /** Total lines deleted across all files. */
  deletions: number;
  /** Total changed files. */
  changedFiles: number;

  /** Reviews on the PR. */
  reviews: Array<{
    author: string;
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  }>;

  /** Commits in the PR, for checking DCO signatures and count. */
  commits: Array<{
    sha: string;
    message: string;
    /** Whether the commit is verified (GPG/SSH signature). */
    isVerified: boolean;
  }>;

  /** Files changed in the PR, for path-based rules. */
  files: Array<{
    filename: string;
    status:
      'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
    additions: number;
    deletions: number;
  }>;

  /** Check runs on the PR head commit. */
  checks: Array<{
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion:
      | 'success'
      | 'failure'
      | 'neutral'
      | 'cancelled'
      | 'timed_out'
      | 'action_required'
      | 'skipped'
      | null;
    isRequired: boolean;
  }>;

  /** Check runs on the base commit for comparison (CI_BROKEN_ON_BASE). */
  baseChecks: Array<{
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion:
      | 'success'
      | 'failure'
      | 'neutral'
      | 'cancelled'
      | 'timed_out'
      | 'action_required'
      | 'skipped'
      | null;
  }>;
}

/** Which of the three buckets a rule belongs to. See docs/00-concept.md. */
export type RuleBucket = 'fact' | 'heuristic';

/** The only three things a rule may return. See docs/02-architecture.md § rules. */
export type RuleOutcome = 'pass' | 'fail' | 'skip';

/** Who has to act. The blockage-ownership call is the product's core claim. */
export type RuleOwner = 'contributor' | 'maintainer';

/**
 * How loudly a finding is reported.
 *
 * PR-030 owns the final set. `blocking` is reserved for `fact` rules: a
 * `heuristic` rule can warn but can never change a PR's status.
 */
export type RuleSeverity = 'blocking' | 'warning' | 'info';

/** PR-030 owns the concrete rules; this is only the shape they must return. */
export interface RuleResult {
  /** Stable identifier, e.g. `CI_FAILING`. Never renamed once shipped. */
  readonly code: string;
  readonly outcome: RuleOutcome;
  readonly bucket: RuleBucket;
  readonly owner: RuleOwner;
  readonly severity: RuleSeverity;
  /** Human explanation, contributor-facing. */
  readonly explanation: string;
}

/** Derived from `fact` rules only. See docs/02-architecture.md § rules. */
export type TriageStatus =
  'BLOCKED_ON_CONTRIBUTOR' | 'BLOCKED_ON_MAINTAINER' | 'WAITING' | 'READY_FOR_REVIEW';
