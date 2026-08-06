import { Octokit } from 'octokit';
import type { MergeableState, PullRequestContext } from '../types.js';
import { parseLinkedIssues } from './issues.js';

const MERGEABLE_STATES: readonly MergeableState[] = [
  'clean',
  'dirty',
  'blocked',
  'behind',
  'unstable',
  'has_hooks',
  'draft',
  'unknown',
];

/**
 * GitHub types `mergeable_state` as a bare string. Anything we do not recognise
 * becomes `'unknown'` rather than being passed through — a rule must never see
 * a state it cannot reason about, and `'unknown'` is the honest answer.
 */
function toMergeableState(value: string | undefined): MergeableState {
  return MERGEABLE_STATES.find((state) => state === value) ?? 'unknown';
}

export async function collectPullRequestCore(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<Partial<PullRequestContext>> {
  const [prResponse, reviews, commits, files] = await Promise.all([
    octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber }),
    octokit.paginate(octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: pullNumber,
    }),
    octokit.paginate(octokit.rest.pulls.listCommits, {
      owner,
      repo,
      pull_number: pullNumber,
    }),
    octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pullNumber,
    }),
  ]);

  const pr = prResponse.data;

  return {
    number: pr.number,
    author: pr.user?.login || '',
    state: pr.state as 'open' | 'closed',
    isDraft: Boolean(pr.draft),
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    baseSha: pr.base.sha,
    headSha: pr.head.sha,
    mergeableState: toMergeableState(pr.mergeable_state),
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    linkedIssues: parseLinkedIssues(pr.title, pr.body),
    reviews: reviews.map((review: any) => ({
      author: review.user?.login || '',
      state: review.state,
    })),
    commits: commits.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      isVerified: Boolean(commit.commit.verification?.verified),
    })),
    files: files.map((file: any) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
    })),
  };
}
