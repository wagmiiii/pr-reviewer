import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { runCommand } from '../../src/cli/run.js';
import * as prCollector from '../../src/collect/pr.js';
import * as labelsAction from '../../src/act/labels.js';
import * as commentAction from '../../src/act/comment.js';
import { Octokit } from 'octokit';

vi.mock('node:fs');
vi.mock('octokit');
vi.mock('../../src/collect/pr.js');
vi.mock('../../src/act/labels.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/act/labels.js')>();
  return {
    ...actual,
    applyLabels: vi.fn(),
  };
});
vi.mock('../../src/act/comment.js');

describe('runCommand', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GITHUB_TOKEN = 'token';
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.GITHUB_EVENT_PATH = '/path/to/event.json';

    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    vi.mocked(prCollector.collectPullRequestCore).mockResolvedValue({
      number: 1,
      author: 'contributor',
      state: 'open',
      isDraft: false,
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      baseBranch: 'main',
      headBranch: 'feature',
      baseSha: 'abc',
      headSha: 'def',
      mergeableState: 'clean',
      additions: 10,
      deletions: 5,
      changedFiles: 1,
      files: [],
      commits: [],
      reviews: [],
      checks: [],
      baseChecks: [],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('throws if missing environment variables', async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(runCommand()).rejects.toThrow('Missing GITHUB_TOKEN');
  });

  test('pull_request event forces dryRun and reads pull_request.number', async () => {
    process.env.GITHUB_EVENT_NAME = 'pull_request';
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        pull_request: { number: 42 },
      }),
    );

    // Mock config load as 404 (default config)
    const mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockRejectedValue({ status: 404 }),
        },
      },
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

    await runCommand();

    expect(prCollector.collectPullRequestCore).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      42,
    );

    expect(labelsAction.applyLabels).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      42,
      expect.anything(),
      true, // dryRun = true
      expect.anything(),
    );

    expect(commentAction.applyComment).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      42,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      10,
      true, // dryRun = true
    );
  });

  test('workflow_run event processes associated pull requests with write enabled', async () => {
    process.env.GITHUB_EVENT_NAME = 'workflow_run';
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        workflow_run: { pull_requests: [{ number: 100 }, { number: 101 }] },
      }),
    );

    const mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockRejectedValue({ status: 404 }),
        },
      },
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

    await runCommand();

    expect(prCollector.collectPullRequestCore).toHaveBeenCalledTimes(2);
    expect(prCollector.collectPullRequestCore).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      100,
    );
    expect(prCollector.collectPullRequestCore).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      101,
    );

    expect(commentAction.applyComment).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      100,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      10,
      false, // dryRun = false
    );
  });

  test('schedule event processes all open pull requests with write enabled', async () => {
    process.env.GITHUB_EVENT_NAME = 'schedule';
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockRejectedValue({ status: 404 }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
      paginate: vi.fn().mockResolvedValue([{ number: 200 }]),
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

    await runCommand();

    expect(mockOctokit.paginate).toHaveBeenCalled();
    expect(prCollector.collectPullRequestCore).toHaveBeenCalledTimes(1);
    expect(prCollector.collectPullRequestCore).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      200,
    );

    expect(commentAction.applyComment).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      'repo',
      200,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      10,
      false, // dryRun = false
    );
  });
});
