import { createHash } from 'crypto';
import type { Octokit } from 'octokit';
import type { RuleResult, TriageStatus } from '../types.js';
import { type MarkerState, readState, writeState } from './state.js';

export const MARKER_PREFIX = '<!-- pr-reviewer:v1';

export function hashVerdict(
  results: readonly RuleResult[],
  status: TriageStatus,
): string {
  // Filter out passes/skips and map to only stable fields
  const material = results
    .filter((r) => r.outcome !== 'pass' && r.outcome !== 'skip')
    .map((r) => ({
      code: r.code,
      outcome: r.outcome,
      bucket: r.bucket,
      owner: r.owner,
      severity: r.severity,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const payload = JSON.stringify({ status, material });
  return createHash('sha256').update(payload).digest('hex');
}

export function createMarker(state: MarkerState): string {
  return `<!-- pr-reviewer:v1 ${JSON.stringify(state)} -->`;
}

export async function applyComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  results: readonly RuleResult[],
  status: TriageStatus,
  reportMarkdown: string,
  dailyEditCap: number = 10,
  dryRun: boolean = false,
): Promise<void> {
  const hash = hashVerdict(results, status);

  // Find existing comment
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pullNumber,
  });

  const existing = comments.find((c: any) => c.body?.includes(MARKER_PREFIX));
  const today = new Date().toISOString().split('T')[0]!;

  const marker = await readState(owner, repo, pullNumber, existing?.body);

  if (marker && marker.hash === hash) {
    // Identical hash to last run produces no write at all
    return;
  }

  let editsToday = marker?.date === today ? (marker?.editsToday || 0) + 1 : 1;

  if (editsToday > dailyEditCap) {
    console.warn(`Skipping comment edit: daily edit cap of ${dailyEditCap} reached.`);
    return;
  }

  const newState: MarkerState = { hash, date: today, editsToday };

  if (!dryRun) {
    const newBody = `${createMarker(newState)}\n${reportMarkdown}`;
    if (existing) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body: newBody,
      });
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: newBody,
      });
    }
  }

  // Always write state cache, even in dry run (for subsequent runs to see the state)
  await writeState(owner, repo, pullNumber, newState);
}
