import type { Octokit } from 'octokit';

export const DIGEST_MARKER = '<!-- pr-reviewer:digest -->';

export async function applyDigest(
  octokit: Octokit,
  owner: string,
  repo: string,
  markdown: string,
  dryRun: boolean = false,
): Promise<void> {
  // Find existing digest issue
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    creator: 'app/github-actions', // or whatever the bot is called, but we can just search by marker
  });

  const existingIssue = issues.find((i: any) => i.body?.includes(DIGEST_MARKER));

  const newBody = `${DIGEST_MARKER}\n${markdown}`;

  if (!dryRun) {
    if (existingIssue) {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: existingIssue.number,
        body: newBody,
      });
    } else {
      const created = await octokit.rest.issues.create({
        owner,
        repo,
        title: 'PR Reviewer Digest',
        body: newBody,
      });

      // Pin the issue using GraphQL
      if (created.data.node_id) {
        try {
          await octokit.graphql(
            `mutation PinIssue($issueId: ID!) {
              pinIssue(input: {issueId: $issueId}) {
                issue { id }
              }
            }`,
            {
              issueId: created.data.node_id,
            }
          );
        } catch (error) {
          console.warn('Failed to pin the digest issue. Make sure the token has sufficient permissions.', error);
        }
      }
    }
  } else {
    console.log(`[DRY RUN] Would upsert digest issue for ${owner}/${repo}`);
  }
}
