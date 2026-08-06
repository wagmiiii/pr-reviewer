import { Octokit } from 'octokit';
import type { PullRequestContext } from '../types.js';

export async function collectCheckRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string,
  baseBranch: string,
): Promise<PullRequestContext['checks']> {
  let requiredContexts: string[] = [];
  try {
    const protection = await octokit.rest.repos.getBranchProtection({
      owner,
      repo,
      branch: baseBranch,
    });
    const statusChecks = protection.data.required_status_checks;
    if (statusChecks) {
      requiredContexts = [
        ...(statusChecks.contexts || []),
        ...(statusChecks.checks?.map((c: any) => c.context) || []),
      ];
    }
  } catch (error: any) {
    // If the repository does not have branch protection enabled or we lack permissions,
    // we fallback to no checks being explicitly required.
    if (error.status !== 404 && error.status !== 403) {
      throw error;
    }
  }

  const checkRuns = await octokit.paginate(octokit.rest.checks.listForRef, {
    owner,
    repo,
    ref: headSha,
  });

  return Promise.all(
    checkRuns.map(async (check: any) => {
      let failureExcerpt;

      if (check.conclusion === 'failure' && check.app?.slug === 'github-actions') {
        try {
          const logs = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: check.id,
          });
          const logText = logs.data as unknown as string;
          const lines = logText.split('\n');
          
          const errorLineIdx = lines.findIndex(l => l.includes('##[error]'));
          if (errorLineIdx !== -1) {
            const start = Math.max(0, errorLineIdx - 15);
            const end = Math.min(lines.length, errorLineIdx + 35);
            failureExcerpt = lines.slice(start, end).join('\n');
          } else {
            failureExcerpt = lines.slice(-50).join('\n');
          }
        } catch (err) {
          // Ignore failures fetching logs
        }
      }

      return {
        name: check.name,
        status: check.status as any,
        conclusion: check.conclusion as any,
        isRequired: requiredContexts.includes(check.name),
        ...(check.workflow_run_id ? { workflowRunId: String(check.workflow_run_id) } : {}),
        ...(failureExcerpt ? { failureExcerpt } : {}),
      };
    })
  );
}

export async function collectBaseCheckRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseSha: string,
): Promise<PullRequestContext['baseChecks']> {
  const checkRuns = await octokit.paginate(octokit.rest.checks.listForRef, {
    owner,
    repo,
    ref: baseSha,
  });

  return checkRuns.map((check: any) => ({
    name: check.name,
    status: check.status as any,
    conclusion: check.conclusion as any,
  }));
}
