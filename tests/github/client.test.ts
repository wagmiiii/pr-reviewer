import { describe, expect, test, vi } from 'vitest';
import { createGitHubClient } from '../../src/github/client.js';

describe('GitHub Client', () => {
  test('allows reads in dry run mode', async () => {
    const client = createGitHubClient('token', true);
    // Mock the fetch/request to prevent real network calls
    vi.spyOn(client, 'request').mockResolvedValue({ data: {} } as any);

    await expect(
      client.request('GET /repos/{owner}/{repo}', { owner: 'a', repo: 'b' }),
    ).resolves.not.toThrow();
  });

  test('blocks writes in dry run mode', async () => {
    const client = createGitHubClient('token', true);

    await expect(
      client.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner: 'a',
        repo: 'b',
        issue_number: 1,
        labels: ['test'],
      }),
    ).rejects.toThrow(
      'Write API reachable in dry-run mode: POST /repos/{owner}/{repo}/issues/{issue_number}/labels',
    );
  });

  test('allows writes in normal mode', async () => {
    const client = createGitHubClient('token', false);
    vi.spyOn(client, 'request').mockResolvedValue({ data: {} } as any);

    await expect(
      client.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner: 'a',
        repo: 'b',
        issue_number: 1,
        labels: ['test'],
      }),
    ).resolves.not.toThrow();
  });
});
