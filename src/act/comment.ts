import { createHash } from 'crypto';
import type { Octokit } from 'octokit';
import type { RuleResult, TriageStatus, Comment } from '../types.js';

export const MARKER_PREFIX = '<!-- pr-reviewer:v1';

export interface MarkerState {
  hash: string;
  date: string;
  editsToday: number;
}

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

export function parseMarker(body: string): MarkerState | null {
  const match = body.match(
    /<!-- pr-reviewer:v1 hash:([a-f0-9]+) date:([^ ]+) edits:(\d+) -->/,
  );
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  return {
    hash: match[1]!,
    date: match[2]!,
    editsToday: parseInt(match[3]!, 10),
  };
}

export function createMarker(hash: string, editsToday: number): string {
  const date = new Date().toISOString().split('T')[0];
  return `<!-- pr-reviewer:v1 hash:${hash} date:${date} edits:${editsToday} -->`;
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
): Promise<void> {
  const hash = hashVerdict(results, status);

  // Find existing comment
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pullNumber,
  });

  const existing = comments.find((c: any) => c.body?.includes(MARKER_PREFIX));
  const today = new Date().toISOString().split('T')[0];

  if (existing) {
    const marker = parseMarker(existing.body || '');
    if (marker && marker.hash === hash) {
      // Identical hash to last run produces no write at all
      return;
    }

    let editsToday = marker?.date === today ? (marker?.editsToday || 0) + 1 : 1;

    if (editsToday > dailyEditCap) {
      console.warn(`Skipping comment edit: daily edit cap of ${dailyEditCap} reached.`);
      return;
    }

    const newBody = `${createMarker(hash, editsToday)}\n${reportMarkdown}`;
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: newBody,
    });
  } else {
    const newBody = `${createMarker(hash, 1)}\n${reportMarkdown}`;
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: newBody,
    });
  }
}
