import { describe, expect, test, vi, beforeEach } from 'vitest';
import { applyDigest, DIGEST_MARKER } from '../../src/act/digest.js';

function mockOctokit(issues: unknown[]) {
  return {
    paginate: vi.fn().mockResolvedValue(issues),
    rest: {
      issues: {
        listForRepo: vi.fn(),
        create: vi.fn().mockResolvedValue({ data: { number: 99, node_id: 'NODE_ID' } }),
        update: vi.fn().mockResolvedValue({}),
      },
    },
    graphql: vi.fn().mockResolvedValue({}),
  };
}

describe('applyDigest', () => {
  beforeEach(() => vi.clearAllMocks());

  test('creates and pins a digest issue when none exists', async () => {
    const octokit = mockOctokit([]);

    const result = await applyDigest(octokit as any, 'owner', 'repo', '# Digest');

    expect(result.action).toBe('created');
    expect(result.issueNumber).toBe(99);
    expect(result.pinned).toBe(true);
    expect(octokit.rest.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining(DIGEST_MARKER),
      }),
    );
    expect(octokit.graphql).toHaveBeenCalled();
  });

  test('updates the existing digest issue in place', async () => {
    const octokit = mockOctokit([
      { number: 7, body: `${DIGEST_MARKER}\n\n# Old digest` },
    ]);

    const result = await applyDigest(octokit as any, 'owner', 'repo', '# New digest');

    expect(result).toMatchObject({ action: 'updated', issueNumber: 7 });
    expect(octokit.rest.issues.create).not.toHaveBeenCalled();
    expect(octokit.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 7 }),
    );
  });

  test('does not rewrite an identical body', async () => {
    const markdown = '# Digest';
    const octokit = mockOctokit([{ number: 7, body: `${DIGEST_MARKER}\n\n${markdown}` }]);

    const result = await applyDigest(octokit as any, 'owner', 'repo', markdown);

    // Re-writing an identical body bumps the issue on every scheduled run.
    expect(result.action).toBe('unchanged');
    expect(octokit.rest.issues.update).not.toHaveBeenCalled();
  });

  test('never mistakes a pull request for the digest issue', async () => {
    // issues.listForRepo returns PRs too. Quoting a digest into a PR body must
    // not cause the bot to overwrite that PR.
    const octokit = mockOctokit([
      {
        number: 5,
        body: `someone quoted ${DIGEST_MARKER} in here`,
        pull_request: { url: 'https://api.github.com/…' },
      },
    ]);

    const result = await applyDigest(octokit as any, 'owner', 'repo', '# Digest');

    expect(result.action).toBe('created');
    expect(octokit.rest.issues.update).not.toHaveBeenCalled();
  });

  test('still reports success when pinning is refused', async () => {
    const octokit = mockOctokit([]);
    octokit.graphql.mockRejectedValue(new Error('Over the pinned issue limit'));

    const result = await applyDigest(octokit as any, 'owner', 'repo', '# Digest');

    // A repo allows at most three pinned issues; an unpinned digest is fine.
    expect(result.action).toBe('created');
    expect(result.pinned).toBe(false);
  });

  test('writes nothing in dry-run', async () => {
    const octokit = mockOctokit([]);

    const result = await applyDigest(octokit as any, 'owner', 'repo', '# Digest', true);

    expect(result.action).toBe('skipped');
    expect(octokit.rest.issues.create).not.toHaveBeenCalled();
    expect(octokit.rest.issues.update).not.toHaveBeenCalled();
    expect(octokit.graphql).not.toHaveBeenCalled();
  });
});
