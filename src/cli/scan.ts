import { Octokit } from 'octokit';
import * as yaml from 'js-yaml';
import type { PullRequestContext, RepoConfig } from '../types.js';
import { collectPullRequestCore } from '../collect/pr.js';
import { collectCheckRuns, collectBaseCheckRuns } from '../collect/checks.js';
import { runRules, CORE_RULES } from '../rules/index.js';
import { renderTerminalReport, type EvaluatedPR } from '../render/terminal.js';

export interface ScanOptions {
  octokit: Octokit;
  owner: string;
  repo: string;
  json?: boolean;
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
      return {}; // Defaults
    }
    throw error;
  }
  return {};
}

export async function scanCommand(options: ScanOptions): Promise<void> {
  const { octokit, owner, repo, json } = options;

  if (!json) {
    console.error(`Scanning ${owner}/${repo}...`);
  }

  const config = await loadConfig(octokit, owner, repo);

  const prs = await octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo,
    state: 'open',
  });

  const evaluated: EvaluatedPR[] = [];

  for (const listPr of prs) {
    const partial = await collectPullRequestCore(octokit, owner, repo, listPr.number);

    const checks = await collectCheckRuns(
      octokit,
      owner,
      repo,
      partial.headSha!,
      partial.baseBranch!,
    );
    const baseChecks = await collectBaseCheckRuns(octokit, owner, repo, partial.baseSha!);

    // Convert to full PullRequestContext
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
      ...(partial.linkedIssues !== undefined
        ? { linkedIssues: partial.linkedIssues }
        : {}),
      ...(partial.reviews !== undefined ? { reviews: partial.reviews } : {}),
      ...(partial.commits !== undefined ? { commits: partial.commits } : {}),
      ...(partial.files !== undefined ? { files: partial.files } : {}),
      ...(checks !== undefined ? { checks } : {}),
      ...(baseChecks !== undefined ? { baseChecks } : {}),
    };

    const results = runRules(context, CORE_RULES);
    evaluated.push({ context, results });
  }

  if (json) {
    console.log(JSON.stringify(evaluated, null, 2));
  } else {
    console.log('\n' + renderTerminalReport(evaluated));
  }
}
