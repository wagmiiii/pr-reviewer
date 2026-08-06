/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import type { Octokit } from 'octokit';

export interface RecommendOptions {
  cwd?: string;
  octokit?: Octokit;
  owner?: string;
  repo?: string;
  baseBranch?: string;
  logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
  };
}

export async function recommend(options: RecommendOptions = {}): Promise<void> {
  const dir = options.cwd ?? process.cwd();
  const log = options.logger ?? {
    info: console.log,
    error: console.error,
    warn: console.warn,
  };

  log.info('Auditing repository setup...\n');
  let issues = 0;

  // 1. Check CONTRIBUTING.md
  const contributingPaths = [
    'CONTRIBUTING.md',
    'CONTRIBUTING',
    '.github/CONTRIBUTING.md',
    '.github/CONTRIBUTING',
    'docs/CONTRIBUTING.md',
  ];
  const hasContributing = contributingPaths.some((p) => fs.existsSync(path.join(dir, p)));
  if (!hasContributing) {
    issues++;
    log.error('❌ Missing CONTRIBUTING.md');
    log.info(
      '   Recommendation: Add a CONTRIBUTING.md file to explain how to develop and test changes locally.\n',
    );
  }

  // 2. Check PULL_REQUEST_TEMPLATE
  const templatePaths = [
    'PULL_REQUEST_TEMPLATE.md',
    '.github/PULL_REQUEST_TEMPLATE.md',
    'docs/PULL_REQUEST_TEMPLATE.md',
    '.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
  ];
  const hasPrTemplate = templatePaths.some((p) => fs.existsSync(path.join(dir, p)));
  if (!hasPrTemplate) {
    issues++;
    log.error('❌ Missing Pull Request Template');
    log.info(
      '   Recommendation: Add a `.github/PULL_REQUEST_TEMPLATE.md` to guide contributors.',
    );
    log.info(
      '   A good template should ask contributors to link issues and explain their changes.\n',
    );
  }

  // 3. Check Linked Issues action
  log.info('💡 Recommendation: Enforce Linked Issues');
  log.info(
    '   Instead of manually checking if a PR links to an issue, we recommend using',
  );
  log.info(
    '   `nearform/github-action-check-linked-issues` in your GitHub Actions workflow.',
  );
  log.info(
    '   It reliably verifies that PRs are linked to an issue, including cross-repo references.\n',
  );

  // 4. Check Required Status Checks (if Octokit provided)
  if (options.octokit && options.owner && options.repo) {
    const baseBranch = options.baseBranch ?? 'main';
    try {
      const protection = await options.octokit.rest.repos.getBranchProtection({
        owner: options.owner,
        repo: options.repo,
        branch: baseBranch,
      });
      const checks = protection.data.required_status_checks?.contexts;
      const otherChecks = protection.data.required_status_checks?.checks;
      if (!checks?.length && !otherChecks?.length) {
        issues++;
        log.error(`❌ No required status checks on branch '${baseBranch}'`);
        log.info(
          '   Recommendation: Require tests and linters to pass before merging PRs.\n',
        );
      }
    } catch (e: any) {
      if (e.status === 404 || e.status === 403) {
        issues++;
        log.error(`❌ Branch protection not found or accessible for '${baseBranch}'`);
        log.info(
          '   Recommendation: Enable branch protection and require status checks to pass before merging.\n',
        );
      } else {
        log.warn(
          `⚠️  Could not verify branch protection for '${baseBranch}': ${e.message}\n`,
        );
      }
    }
  } else {
    log.info('ℹ️  Skipped branch protection audit (GitHub API client not provided).\n');
  }

  if (issues === 0) {
    log.info('✅ Audit complete. Your repository setup looks great!');
  } else {
    log.info(`✅ Audit complete. Found ${issues} area(s) for improvement.`);
  }
}
