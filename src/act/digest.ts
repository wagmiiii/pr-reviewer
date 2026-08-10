import type { Octokit } from 'octokit';

/**
 * Identifies the digest issue. Kept in `act` rather than in the renderer: the
 * marker is an addressing concern for the upsert, not part of what the digest
 * says, and `render` must stay a pure function of its input.
 */
export const DIGEST_MARKER = '<!-- pr-reviewer:digest:v1 -->';

const DIGEST_TITLE = 'PR Reviewer digest';

export interface DigestUpsertResult {
  /** What the upsert did. `unchanged` means the body already matched. */
  readonly action: 'created' | 'updated' | 'unchanged' | 'skipped';
  /** The digest issue number, when one exists or was created. */
  readonly issueNumber?: number;
  /** True when the issue was created and successfully pinned. */
  readonly pinned?: boolean;
}

function digestBody(markdown: string): string {
  return `${DIGEST_MARKER}\n\n${markdown}`;
}

/**
 * Creates or updates the single pinned digest issue for the repository.
 *
 * Finding it by marker rather than by title or creator: a maintainer may rename
 * the issue, and the creator differs between a PAT-run action and
 * `github-actions[bot]`, so neither is a reliable key. The marker is ours.
 */
export async function applyDigest(
  octokit: Octokit,
  owner: string,
  repo: string,
  markdown: string,
  dryRun: boolean = false,
): Promise<DigestUpsertResult> {
  const body = digestBody(markdown);

  const openIssues = (await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
  })) as Array<{ number: number; body?: string | null; pull_request?: unknown }>;

  // `issues.listForRepo` returns PRs too; a PR body could contain the marker if
  // someone quoted a digest into one, and updating that would be destructive.
  const existing = openIssues.find(
    (issue) => !issue.pull_request && issue.body?.includes(DIGEST_MARKER),
  );

  if (existing && existing.body === body) {
    // Re-writing an identical body still emits an edit event and bumps the
    // issue, which is noise on a schedule that runs every few hours.
    console.log(`Digest issue #${existing.number} is already up to date.`);
    return { action: 'unchanged', issueNumber: existing.number };
  }

  if (dryRun) {
    console.log(
      existing
        ? `[dry-run] Would update digest issue #${existing.number}.`
        : '[dry-run] Would create and pin a digest issue.',
    );
    return {
      action: 'skipped',
      ...(existing ? { issueNumber: existing.number } : {}),
    };
  }

  if (existing) {
    await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: existing.number,
      body,
    });
    console.log(`Updated digest issue #${existing.number}.`);
    return { action: 'updated', issueNumber: existing.number };
  }

  const created = await octokit.rest.issues.create({
    owner,
    repo,
    title: DIGEST_TITLE,
    body,
  });

  const pinned = await pinIssue(octokit, created.data.node_id);
  console.log(`Created digest issue #${created.data.number}.`);

  return { action: 'created', issueNumber: created.data.number, pinned };
}

/**
 * Pinning needs GraphQL — there is no REST equivalent. It is best-effort: it
 * needs a token with issue-write scope, and a repository accepts at most three
 * pinned issues. Neither is worth failing the run over, since an unpinned
 * digest is still correct and still linkable.
 */
async function pinIssue(octokit: Octokit, nodeId: string | undefined): Promise<boolean> {
  if (!nodeId) return false;

  try {
    await octokit.graphql(
      `mutation PinIssue($issueId: ID!) {
        pinIssue(input: { issueId: $issueId }) {
          issue { id }
        }
      }`,
      { issueId: nodeId },
    );
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `Created the digest issue but could not pin it: ${reason}. ` +
        'A repository allows at most three pinned issues, and pinning needs issue-write scope.',
    );
    return false;
  }
}
