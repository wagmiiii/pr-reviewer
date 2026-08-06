import { Octokit } from 'octokit';
import type { PullRequestContext } from '../types.js';

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
    mergeableState: pr.mergeable_state || 'unknown',
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
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
