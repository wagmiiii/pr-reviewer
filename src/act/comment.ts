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

  const existingComments = comments.filter((c: any) => c.body?.includes(MARKER_PREFIX));

  // Keep the oldest comment (sort by created_at ascending)
  existingComments.sort((a: any, b: any) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : a.id;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : b.id;
    return timeA - timeB;
  });

  const existing = existingComments.length > 0 ? existingComments[0] : undefined;
  const duplicates = existingComments.slice(1);

  if (!dryRun) {
    for (const dup of duplicates) {
      await octokit.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: dup.id,
      });
    }
  }

  const today = new Date().toISOString().split('T')[0]!;

  const marker = await readState(owner, repo, pullNumber, existing?.body);

  if (marker && marker.hash === hash && duplicates.length === 0) {
    // Identical hash to last run produces no write at all (unless we had duplicates to delete)
    // Wait, if duplicates.length > 0, we deleted them but we still don't need to rewrite the main comment if the hash is identical.
    // So we can return here regardless, since duplicates were deleted above.
    return;
  }

  let editsToday = marker?.date === today ? (marker?.editsToday || 0) + 1 : 1;

  if (editsToday > dailyEditCap) {
    console.warn(`Skipping comment edit: daily edit cap of ${dailyEditCap} reached.`);
    return;
  }

  const newState: MarkerState = { hash, date: today, editsToday };

  if (!dryRun) {
    const markerStr = createMarker(newState);
    let finalMarkdown = reportMarkdown;
    const MAX_LENGTH = 65536;
    const ellipsis = '\n... (truncated)';

    if (markerStr.length + 1 + finalMarkdown.length > MAX_LENGTH) {
      const allowedLength = MAX_LENGTH - markerStr.length - 1 - ellipsis.length;
      finalMarkdown = finalMarkdown.slice(0, Math.max(0, allowedLength)) + ellipsis;
    }

    const newBody = `${markerStr}\n${finalMarkdown}`;

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
