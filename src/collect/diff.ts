import { Octokit } from 'octokit';
import type { PullRequestContext } from '../types.js';

export async function collectDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  capBytes = 1000000, // 1MB default cap
): Promise<PullRequestContext['diff']> {
  try {
    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: 'diff' },
    });

    const diffText = response.data as unknown as string;
    const buf = new TextEncoder().encode(diffText);

    if (buf.length > capBytes) {
      return {
        patch: new TextDecoder().decode(buf.slice(0, capBytes)),
        truncated: true,
        capBytes,
      };
    }

    return {
      patch: diffText,
      truncated: false,
      capBytes,
    };
  } catch (error) {
    // Return undefined if diff generation fails
    return undefined;
  }
}
