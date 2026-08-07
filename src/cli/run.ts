import fs from 'node:fs';
import { Octokit } from 'octokit';
import * as yaml from 'js-yaml';
import type { PullRequestContext, RepoConfig } from '../types.js';
import { collectPullRequestCore } from '../collect/pr.js';
import { runRules, CORE_RULES, deriveStatus } from '../rules/index.js';
import * as core from '@actions/core';
import { applyComment } from '../act/comment.js';
import { applyLabels, deriveDesiredLabels } from '../act/labels.js';

const ALLOWED_CONFIG_KEYS = new Set([
  'labelPrefix',
  'disabledRules',
  'dryRun',
  'protectedGlobs',
  'hugeDiffThresholdLines',
  'staleDays',
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
) {
  const partial = await collectPullRequestCore(octokit, owner, repo, pullNumber);

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
    ...(partial.headRepo !== undefined ? { headRepo: partial.headRepo } : {}),
    ...(partial.linkedIssues !== undefined ? { linkedIssues: partial.linkedIssues } : {}),
    ...(partial.reviews !== undefined ? { reviews: partial.reviews } : {}),
    ...(partial.commits !== undefined ? { commits: partial.commits } : {}),
    ...(partial.files !== undefined ? { files: partial.files } : {}),
    ...(partial.checks !== undefined ? { checks: partial.checks } : {}),
    ...(partial.baseChecks !== undefined ? { baseChecks: partial.baseChecks } : {}),
  };

  const results = runRules(context, CORE_RULES);
  const status = deriveStatus(results);

  console.log(`Evaluated PR #${pullNumber}: ${status}`);

  const desiredLabels = deriveDesiredLabels(results, status);
  const reportMarkdown = '<!-- TODO: Comment renderer not yet implemented -->';

  await applyLabels(octokit, owner, repo, pullNumber, desiredLabels, dryRun, config);
  await applyComment(
    octokit,
    owner,
    repo,
    pullNumber,
    results,
    status,
    reportMarkdown,
    10,
    dryRun,
  );
}

export async function runCommand(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
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

    const prs = (await octokit.paginate(octokit.rest.pulls.list, {
      owner,
      repo,
      state: 'open',
    })) as any[];

    for (const pr of prs) {
      await processPullRequest(octokit, owner, repo, pr.number, config, dryRun);
    }
  } else {
    console.log(`Unsupported event: ${eventName}. Doing nothing.`);
  }
}
