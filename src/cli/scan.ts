import { Octokit } from 'octokit';
import yaml from 'js-yaml';
import type { PullRequestContext, RepoConfig } from '../types.js';
import { collectPullRequestCore } from '../collect/pr.js';
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
  'staleNudgeDays',
  'staleWarnDays',
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
      ...(partial.checks !== undefined ? { checks: partial.checks } : {}),
      ...(partial.baseChecks !== undefined ? { baseChecks: partial.baseChecks } : {}),
    };

    const results = runRules(context, CORE_RULES);
    
    // Read state to get judgments
    const { readState } = await import('../act/state.js');
    let state = await readState(owner, repo, listPr.number);
    if (!state) {
      const comments = await octokit.paginate(octokit.rest.issues.listComments, {
        owner,
        repo,
        issue_number: listPr.number,
      });
      const existing = comments.find((c: any) => c.body?.includes('<!-- pr-reviewer:v1'));
      if (existing) state = await readState(owner, repo, listPr.number, existing.body);
    }

    evaluated.push({ 
      context, 
      results,
      judgments: state?.judgments 
    });
  }

  if (json) {
    console.log(JSON.stringify(evaluated, null, 2));
  } else {
    const report = renderTerminalReport(evaluated);
    console.log('\n' + report);
    
    // If not json, this might be a real run. Wait, we want to post the digest.
    // Let's only post the digest if dryRun is false (config).
    const { renderDigest } = await import('../render/digest.js');
    const { applyDigest } = await import('../act/digest.js');
    
    const digestMd = renderDigest(evaluated);
    await applyDigest(octokit, owner, repo, digestMd, config.dryRun === true);
  }
}
