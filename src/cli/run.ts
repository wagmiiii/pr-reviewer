import fs from 'node:fs';
import { Octokit } from 'octokit';
import * as yaml from 'js-yaml';
import type { PullRequestContext, RepoConfig, CheckRun } from '../types.js';
import { collectPullRequestCore } from '../collect/pr.js';
import { collectCheckRuns, collectBaseCheckRuns } from '../collect/checks.js';
import { runRules, CORE_RULES, deriveStatus } from '../rules/index.js';
import * as core from '@actions/core';
import { applyComment } from '../act/comment.js';
import { applyLabels, deriveDesiredLabels } from '../act/labels.js';
import { applyDigest } from '../act/digest.js';
import { renderDigest, type EvaluatedPR } from '../render/index.js';

/** One PR the sweep could not evaluate, and why. */
export interface SweepFailure {
  readonly number: number;
  readonly reason: string;
}

/** The outcome of evaluating the full open-PR queue. */
export interface SweepResult {
  /** PRs that were evaluated successfully. */
  readonly evaluated: readonly EvaluatedPR[];
  /** PRs that threw, with the reason. Never empty-checked by the caller for control flow. */
  readonly failures: readonly SweepFailure[];
  /** How many open PRs the sweep set out to process. */
  readonly total: number;
}

const ALLOWED_CONFIG_KEYS = new Set([
  'labelPrefix',
  'disabledRules',
  'dryRun',
  'protectedGlobs',
  'hugeDiffThresholdLines',
  'staleDays',
  'staleNudgeAfterDays',
  'staleWarnAfterDays',
  'dcoEnabled',
  'labelsEnabled',
  'labelMapping',
]);

async function loadConfig(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<RepoConfig> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.github/pr-reviewer.yml',
    });

    if ('content' in response.data) {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const parsed = yaml.load(content);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Config is not a valid YAML object.');
      }

      for (const key of Object.keys(parsed)) {
        if (!ALLOWED_CONFIG_KEYS.has(key)) {
          throw new Error(`Unknown config key: '${key}'.`);
        }
      }

      return parsed as RepoConfig;
    }
  } catch (error: any) {
    if (error.status === 404) {
      return {};
    }
    throw error;
  }
  return {};
}

function overrideConfigWithInputs(config: RepoConfig): RepoConfig {
  const overrides: any = {};

  const labelPrefix = core.getInput('labelPrefix');
  if (labelPrefix !== '') overrides.labelPrefix = labelPrefix;

  const disabledRules = core.getInput('disabledRules');
  if (disabledRules !== '') {
    overrides.disabledRules = disabledRules
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const dryRun = core.getInput('dryRun');
  if (dryRun !== '') overrides.dryRun = dryRun === 'true';

  const protectedGlobs = core.getInput('protectedGlobs');
  if (protectedGlobs !== '') {
    overrides.protectedGlobs = protectedGlobs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const hugeDiffThresholdLines = core.getInput('hugeDiffThresholdLines');
  if (hugeDiffThresholdLines !== '') {
    const parsed = parseInt(hugeDiffThresholdLines, 10);
    if (!isNaN(parsed)) overrides.hugeDiffThresholdLines = parsed;
  }

  const staleDays = core.getInput('staleDays');
  if (staleDays !== '') {
    const parsed = parseInt(staleDays, 10);
    if (!isNaN(parsed)) overrides.staleDays = parsed;
  }

  const staleNudgeAfterDays = core.getInput('staleNudgeAfterDays');
  if (staleNudgeAfterDays !== '') {
    const parsed = parseInt(staleNudgeAfterDays, 10);
    if (!isNaN(parsed)) overrides.staleNudgeAfterDays = parsed;
  }

  const staleWarnAfterDays = core.getInput('staleWarnAfterDays');
  if (staleWarnAfterDays !== '') {
    const parsed = parseInt(staleWarnAfterDays, 10);
    if (!isNaN(parsed)) overrides.staleWarnAfterDays = parsed;
  }

  const dcoEnabled = core.getInput('dcoEnabled');
  if (dcoEnabled !== '') overrides.dcoEnabled = dcoEnabled === 'true';

  const labelsEnabled = core.getInput('labelsEnabled');
  if (labelsEnabled !== '') overrides.labelsEnabled = labelsEnabled === 'true';

  return { ...config, ...overrides };
}

async function processPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  config: RepoConfig,
  dryRun: boolean,
  prefetchedBaseChecks?: CheckRun[],
): Promise<EvaluatedPR> {
  const partial = await collectPullRequestCore(octokit, owner, repo, pullNumber);

  const checks = await collectCheckRuns(
    octokit,
    owner,
    repo,
    partial.headSha!,
    partial.baseBranch!,
  );
  const baseChecks =
    prefetchedBaseChecks ??
    (await collectBaseCheckRuns(octokit, owner, repo, partial.baseSha!));

  const context: PullRequestContext = {
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    number: partial.number!,
    author: partial.author!,
    authorAssociation: partial.authorAssociation || 'CONTRIBUTOR',
    state: partial.state!,
    isDraft: partial.isDraft!,
    isMerged: partial.isMerged || false,
    createdAt: partial.createdAt!,
    updatedAt: partial.updatedAt!,
    closedAt: partial.closedAt ?? null,
    mergedAt: partial.mergedAt ?? null,
    baseBranch: partial.baseBranch!,
    headBranch: partial.headBranch!,
    baseSha: partial.baseSha!,
    headSha: partial.headSha!,
    isFork: partial.isFork ?? false,
    mergeableState: partial.mergeableState!,
    additions: partial.additions!,
    deletions: partial.deletions!,
    changedFiles: partial.changedFiles!,
    config,
    ...(partial.title !== undefined ? { title: partial.title } : {}),
    ...(partial.labels !== undefined ? { labels: partial.labels } : {}),
    ...(partial.headRepo !== undefined ? { headRepo: partial.headRepo } : {}),
    ...(partial.linkedIssues !== undefined ? { linkedIssues: partial.linkedIssues } : {}),
    ...(partial.reviews !== undefined ? { reviews: partial.reviews } : {}),
    ...(partial.commits !== undefined ? { commits: partial.commits } : {}),
    ...(partial.files !== undefined ? { files: partial.files } : {}),
    ...(checks !== undefined ? { checks } : {}),
    ...(baseChecks !== undefined ? { baseChecks } : {}),
  };

  const results = runRules(context, CORE_RULES);
  const status = deriveStatus(results);

  console.log(`Evaluated PR #${pullNumber}: ${status}`);

  const desiredLabels = deriveDesiredLabels(results, status);
  const { renderComment } = await import('../act/render.js');
  const reportMarkdown = renderComment(context, results, status);

  const isNoBot = context.labels?.includes('no-bot') || false;
  const effectiveDryRun = dryRun || isNoBot;

  if (isNoBot) {
    console.log(`PR #${pullNumber} has 'no-bot' label, forcing dry-run for writes.`);
  }

  await applyLabels(
    octokit,
    owner,
    repo,
    pullNumber,
    desiredLabels,
    effectiveDryRun,
    config,
  );
  await applyComment(
    octokit,
    owner,
    repo,
    pullNumber,
    results,
    status,
    reportMarkdown,
    10,
    effectiveDryRun,
  );

  return { context, results };
}

/**
 * Evaluates every open PR in the repository and returns the whole queue's
 * results, so a caller can reason about the queue as a unit rather than about
 * one PR at a time.
 *
 * A sweep visits PRs the bot does not otherwise control, so a single bad one —
 * a deleted fork head, a transient 5xx, one PR's rate-limit slice — must not
 * cost the rest of the queue. Failures are collected and reported, never
 * thrown: a sweep that aborts halfway leaves the queue in a partially-actuated
 * state that is worse than either extreme.
 */
export async function sweepOpenPullRequests(
  octokit: Octokit,
  owner: string,
  repo: string,
  config: RepoConfig,
  dryRun: boolean,
): Promise<SweepResult> {
  const openPrs = (await octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo,
    state: 'open',
  })) as Array<any>;

  const evaluated: EvaluatedPR[] = [];
  const failures: SweepFailure[] = [];

  // Pre-fetch base checks for unique base SHAs
  const baseChecksMap = new Map<string, readonly CheckRun[] | undefined>();
  for (const pr of openPrs) {
    const baseSha = pr.base?.sha;
    if (baseSha && !baseChecksMap.has(baseSha)) {
      try {
        const baseChecks = await collectBaseCheckRuns(octokit, owner, repo, baseSha);
        baseChecksMap.set(baseSha, baseChecks);
      } catch (err) {
        console.error(`Failed to fetch base checks for ${baseSha}`, err);
      }
    }
  }

  // Process PRs concurrently, honoring secondary rate limits
  const limit = 3;
  const queue = [...openPrs];
  const results: Promise<void>[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      const pr = queue.shift()!;
      try {
        const baseChecks = baseChecksMap.get(pr.base?.sha);
        const evalPr = await processPullRequest(
          octokit,
          owner,
          repo,
          pr.number,
          config,
          dryRun,
          baseChecks as CheckRun[] | undefined,
        );
        evaluated.push(evalPr);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        failures.push({ number: pr.number, reason });
        console.error(`Failed to process PR #${pr.number}: ${reason}`);
      }
    }
  };

  for (let i = 0; i < limit; i++) {
    results.push(worker());
  }

  await Promise.all(results);

  return { evaluated, failures, total: openPrs.length };
}

export async function runCommand(): Promise<void> {
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN environment variable');
  }

  const octokit = new Octokit({ auth: token });

  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repoFullName = process.env.GITHUB_REPOSITORY;

  if (!eventName || !eventPath || !repoFullName) {
    throw new Error(
      'Missing required GitHub Actions environment variables (GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_REPOSITORY)',
    );
  }

  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid GITHUB_REPOSITORY format');
  }
  const eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));

  let config = await loadConfig(octokit, owner, repo);
  config = overrideConfigWithInputs(config);

  let dryRun = config.dryRun === true;

  if (eventName === 'pull_request') {
    // pull_request triggers are strictly read-only mode to prevent fork PRs from failing during actuation
    dryRun = true;
    console.log('Running in pull_request event mode (dry-run forced)');

    const pullNumber = eventPayload.pull_request?.number;
    if (!pullNumber) {
      throw new Error('Could not find pull request number in event payload');
    }

    await processPullRequest(octokit, owner, repo, pullNumber, config, dryRun);
  } else if (eventName === 'workflow_run') {
    // workflow_run is a write path. It resolves a single PR (the one associated with the workflow run)
    console.log('Running in workflow_run event mode (write enabled)');

    const prs = eventPayload.workflow_run?.pull_requests;
    if (prs && prs.length > 0) {
      for (const pr of prs) {
        await processPullRequest(octokit, owner, repo, pr.number, config, dryRun);
      }
    } else {
      console.log('No pull requests associated with this workflow_run.');
    }
  } else if (eventName === 'schedule') {
    // scheduled sweep resolves the full open-PR list
    console.log('Running in schedule event mode (write enabled)');

    const sweep = await sweepOpenPullRequests(octokit, owner, repo, config, dryRun);

    console.log(
      `Sweep complete: ${sweep.evaluated.length}/${sweep.total} open PRs evaluated` +
        (sweep.failures.length > 0 ? `, ${sweep.failures.length} failed` : ''),
    );

    // A sweep that silently swallowed failures would look identical to a clean
    // run in the Actions log. Surface them without failing the job — the PRs
    // that did process were actuated correctly and that work should stand.
    for (const failure of sweep.failures) {
      core.warning(`PR #${failure.number} was skipped by the sweep: ${failure.reason}`);
    }

    // The digest is a whole-queue artefact, so it is only meaningful on the
    // sweep. A partial sweep still publishes: a digest missing two PRs beats no
    // digest, and the warnings above say which are absent.
    await applyDigest(octokit, owner, repo, renderDigest(sweep.evaluated), dryRun);
  } else {
    console.log(`Unsupported event: ${eventName}. Doing nothing.`);
  }
}
