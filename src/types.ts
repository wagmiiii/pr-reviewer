/**
 * Shared vocabulary for the pipeline. Types only — no behaviour lives here.
 *
 * This is the contract between the two work tracks: `collect` produces exactly
 * this, everything downstream reads only this. Changing it is a joint decision
 * (PR-011).
 *
 * ## The one rule that is easy to get wrong
 *
 * **`undefined` means "not collected". An empty array means "collected, and
 * there were none".** They are different facts and rules must treat them
 * differently — a repo with no CI configured is not the same as a check-runs
 * fetch that failed, and emitting `CI_MISSING` on an API blip is exactly the
 * kind of false positive the Definition of Done forbids for fact rules.
 *
 * Every field that can be absent is therefore optional, and no collector may
 * substitute `[]` for a fetch it did not perform.
 */

/** ISO-8601 timestamp, e.g. `2026-08-04T11:30:23Z`. Always UTC. */
export type Timestamp = string;

/**
 * GitHub's relationship between the PR author and the repo, verbatim from the
 * API. Drives the first-time-contributor rule (PR-035).
 *
 * Observed across the 159-PR archive: `CONTRIBUTOR` 139, `MEMBER` 19, `NONE` 1.
 */
export type AuthorAssociation =
  | 'OWNER'
  | 'MEMBER'
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'MANNEQUIN'
  | 'NONE';

/**
 * GitHub's computed mergeability.
 *
 * **Only computed for open pull requests.** For anything closed it is
 * `'unknown'`, which is why `MERGE_CONFLICT` could not be validated against the
 * historical archive at all — 156 of 159 archived PRs read `unknown`
 * (`docs/spikes/premise-test.md`).
 *
 * A rule must therefore treat `'unknown'` as *not knowable*, never as *clean*.
 */
export type MergeableState =
  | 'clean'
  | 'dirty'
  | 'blocked'
  | 'behind'
  | 'unstable'
  | 'has_hooks'
  | 'draft'
  | 'unknown';

/** Lifecycle of a single check run. */
export type CheckStatus = 'queued' | 'in_progress' | 'completed';

/**
 * Outcome of a completed check run. `null` while the check is still running.
 *
 * `stale` is included because GitHub can emit it and the corpus capture counts
 * it as a failure; it does not occur in the current archive.
 */
export type CheckConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'timed_out'
  | 'action_required'
  | 'skipped'
  | 'stale'
  | null;

/** A check run, on either the head or the base commit. */
export interface CheckRun {
  readonly name: string;
  readonly status: CheckStatus;
  readonly conclusion: CheckConclusion;
  /**
   * Whether this check is a required status check on the base branch.
   *
   * Present on base checks as well as head checks: `CI_BROKEN_ON_BASE` compares
   * the two sides, and it can only filter both to required-only if both carry
   * the flag.
   *
   * Optional because resolving required checks needs branch-protection access
   * the token may not have (PR-022). `undefined` means "could not determine".
   */
  readonly isRequired?: boolean;
  /** Workflow run this check belongs to, for fetching logs later (PR-024). */
  readonly workflowRunId?: string;
  /** Excerpt of the failing job log (PR-024). */
  readonly failureExcerpt?: string;
}

/** A review left on the PR. */
export interface Review {
  readonly author: string;
  readonly state:
    'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  readonly submittedAt?: Timestamp;
}

/** A commit in the PR. */
export interface Commit {
  readonly sha: string;
  readonly message: string;
  /** GPG/SSH signature verified by GitHub. */
  readonly isVerified: boolean;
  readonly authoredAt?: Timestamp;
}

/** A file changed by the PR. */
export interface ChangedFile {
  readonly filename: string;
  readonly status:
    'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  readonly additions: number;
  readonly deletions: number;
  /** Set when `status` is `renamed`. */
  readonly previousFilename?: string;
}

/**
 * A comment on the PR conversation.
 *
 * Needed by the noise budget (PR-054) and the sticky-comment upsert (PR-070),
 * which locates the bot's own prior comment by its HTML marker rather than by
 * author, and by any measurement of manual maintainer effort.
 */
export interface Comment {
  readonly id: number;
  readonly author: string;
  readonly authorAssociation: AuthorAssociation;
  readonly body: string;
  readonly createdAt: Timestamp;
  readonly updatedAt?: Timestamp;
}

/** An issue this PR claims to resolve. */
export interface LinkedIssue {
  readonly number: number;
  /** Set when the reference is cross-repo, e.g. `org/repo#123`. */
  readonly repository?: string;
  /** How the link was found — closing keyword, body reference, or title. */
  readonly source: 'closing_keyword' | 'body_reference' | 'title_reference';
}

/**
 * The PR diff, capped (PR-026).
 *
 * `truncated` is the point: a rule must never conclude "this PR touches no test
 * files" from a diff that was cut short.
 */
export interface CappedDiff {
  readonly patch: string;
  readonly truncated: boolean;
  /** Byte cap that was applied. */
  readonly capBytes: number;
}

/** Adopter configuration in effect for this scan (PR-040). */
export interface RepoConfig {
  readonly labelPrefix?: string;
  readonly disabledRules?: readonly string[];
  /**
   * Run without making any changes to the PR (zero write API calls).
   * `dry_run: true` is the documented default for first adoption.
   * @default true
   */
  readonly dryRun?: boolean;
  readonly protectedGlobs?: readonly string[];
  readonly hugeDiffThresholdLines?: number;
  readonly staleDays?: number;
  readonly dcoEnabled?: boolean;
  /**
   * Whether the bot should manage labels.
   * @default true
   */
  readonly labelsEnabled?: boolean;
  /**
   * Optional mapping of managed labels to custom names.
   */
  readonly labelMapping?: Record<string, string>;
}

/**
 * The single serialisable snapshot produced by `collect` and consumed by every
 * downstream stage.
 *
 * Serialisable in the strict sense: JSON round-trips without loss. No `Date`,
 * no `undefined`-vs-missing distinction beyond the one documented at the top of
 * this file, no class instances. Fixtures are recorded by writing this to disk
 * and replaying it (PR-012).
 */
export interface PullRequestContext {
  /** Bumped when a change to this shape invalidates recorded fixtures. */
  readonly schemaVersion: 1;
  /** When `collect` ran. Not when the PR changed. */
  readonly collectedAt: Timestamp;

  readonly number: number;
  readonly title?: string;
  readonly author: string;
  readonly authorAssociation: AuthorAssociation;
  readonly state: 'open' | 'closed';
  readonly isDraft: boolean;
  readonly isMerged: boolean;

  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  /** `null` while the PR is open. */
  readonly closedAt: Timestamp | null;
  /** `null` unless the PR was merged. */
  readonly mergedAt: Timestamp | null;

  readonly baseBranch: string;
  readonly headBranch: string;
  readonly baseSha: string;
  readonly headSha: string;

  /**
   * Whether the head branch lives in a fork.
   *
   * 134 of the 159 archived PRs are from forks. This is the population the
   * project exists for and the reason the trigger model is what it is — a rule
   * or renderer that ignores it is reasoning about the wrong users.
   */
  readonly isFork: boolean;
  /** `owner/repo` of the head. Differs from the base repo when `isFork`. */
  readonly headRepo?: string;

  /** See {@link MergeableState} — `'unknown'` is not `'clean'`. */
  readonly mergeableState: MergeableState;

  readonly additions: number;
  readonly deletions: number;
  readonly changedFiles: number;
  readonly labels?: readonly string[];

  readonly reviews?: readonly Review[];
  readonly commits?: readonly Commit[];
  readonly files?: readonly ChangedFile[];
  readonly comments?: readonly Comment[];

  /** Check runs on {@link PullRequestContext.headSha}. */
  readonly checks?: readonly CheckRun[];
  /**
   * Check runs on the base commit the PR branched from.
   *
   * Not a secondary field. 63 of the 71 archived PRs with a failing check were
   * failing a check that was **already failing here** — the finding PR-003 is
   * built on. This is the primary signal, and the reader is the maintainer.
   */
  readonly baseChecks?: readonly CheckRun[];

  readonly linkedIssues?: readonly LinkedIssue[];
  readonly diff?: CappedDiff;
  readonly config?: RepoConfig;
}

/** Which of the three buckets a rule belongs to. See docs/00-concept.md. */
export type RuleBucket = 'fact' | 'heuristic';

/** The only three things a rule may return. See docs/02-architecture.md § rules. */
export type RuleOutcome = 'pass' | 'fail' | 'skip';

/** Who has to act. The blockage-ownership call is the product's core claim. */
export type RuleOwner = 'contributor' | 'maintainer' | 'none';

/**
 * How loudly a finding is reported.
 *
 * PR-030 owns the final set. `blocking` is reserved for `fact` rules: a
 * `heuristic` rule can warn but can never change a PR's status.
 */
export type RuleSeverity = 'blocking' | 'wait' | 'warning' | 'info';

/** PR-030 owns the concrete rules; this is only the shape they must return. */
export interface BaseRuleResult {
  /** Stable identifier, e.g. `CI_FAILING`. Never renamed once shipped. */
  readonly code: string;
  readonly outcome: RuleOutcome;
  readonly owner: RuleOwner;
  /** Human explanation, contributor-facing. */
  readonly explanation: string;
}

export interface FactRuleResult extends BaseRuleResult {
  readonly bucket: 'fact';
  readonly severity: RuleSeverity;
}

export interface HeuristicRuleResult extends BaseRuleResult {
  readonly bucket: 'heuristic';
  readonly severity: 'warning' | 'info';
  readonly confidence: number;
  readonly thresholdTuned?: boolean;
}

export type RuleResult = FactRuleResult | HeuristicRuleResult;

/** Derived from `fact` rules only. See docs/02-architecture.md § rules. */
export type TriageStatus =
  'BLOCKED_ON_CONTRIBUTOR' | 'BLOCKED_ON_MAINTAINER' | 'WAITING' | 'READY_FOR_REVIEW';
