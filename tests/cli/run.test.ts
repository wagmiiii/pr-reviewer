import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { runCommand } from '../../src/cli/run.js';
import * as prCollector from '../../src/collect/pr.js';
import * as labelsAction from '../../src/act/labels.js';
import * as commentAction from '../../src/act/comment.js';
import * as digestAction from '../../src/act/digest.js';
import { Octokit } from 'octokit';
import * as core from '@actions/core';

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
vi.mock('../../src/act/digest.js');
// Partial mock: `getInput` must keep its real behaviour (it reads INPUT_* env
// vars, which are unset here and correctly yield ''), but `warning` needs to be
// observable and ESM namespaces cannot be spied on.
vi.mock('@actions/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/core')>();
  return { ...actual, warning: vi.fn() };
});

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

  test('schedule sweep continues past a PR that fails to collect', async () => {
    process.env.GITHUB_EVENT_NAME = 'schedule';
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const mockOctokit = {
      rest: {
        repos: { getContent: vi.fn().mockRejectedValue({ status: 404 }) },
        pulls: { list: vi.fn() },
      },
      paginate: vi.fn().mockResolvedValue([{ number: 1 }, { number: 2 }, { number: 3 }]),
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

    // The middle PR blows up the way a deleted fork head does.
    vi.mocked(prCollector.collectPullRequestCore).mockImplementation(
      async (_octokit, _owner, _repo, pullNumber) => {
        if (pullNumber === 2) throw new Error('Not Found');
        return {
          number: pullNumber,
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
        } as any;
      },
    );

    await expect(runCommand()).resolves.toBeUndefined();

    // All three attempted, and the two healthy ones were still actuated.
    expect(prCollector.collectPullRequestCore).toHaveBeenCalledTimes(3);
    expect(commentAction.applyComment).toHaveBeenCalledTimes(2);

    const actuated = vi
      .mocked(commentAction.applyComment)
      .mock.calls.map((call) => call[3]);
    expect(actuated).toEqual([1, 3]);
  });

  test('schedule sweep reports the failure rather than swallowing it', async () => {
    process.env.GITHUB_EVENT_NAME = 'schedule';
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const mockOctokit = {
      rest: {
        repos: { getContent: vi.fn().mockRejectedValue({ status: 404 }) },
        pulls: { list: vi.fn() },
      },
      paginate: vi.fn().mockResolvedValue([{ number: 7 }]),
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

    vi.mocked(prCollector.collectPullRequestCore).mockRejectedValue(
      new Error('Bad credentials'),
    );

    await runCommand();

    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('#7'));
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Bad credentials'));
  });

  test('schedule sweep publishes a digest of the whole queue', async () => {
    process.env.GITHUB_EVENT_NAME = 'schedule';
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const mockOctokit = {
      rest: {
        repos: { getContent: vi.fn().mockRejectedValue({ status: 404 }) },
        pulls: { list: vi.fn() },
      },
      paginate: vi.fn().mockResolvedValue([{ number: 11 }]),
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

    await runCommand();

    expect(digestAction.applyDigest).toHaveBeenCalledTimes(1);
    const [, owner, repo, markdown, dryRun] = vi.mocked(digestAction.applyDigest).mock
      .calls[0]!;
    expect(owner).toBe('owner');
    expect(repo).toBe('repo');
    expect(markdown).toContain('# PR Reviewer digest');
    expect(dryRun).toBe(false);
  });

  test('a partial sweep still publishes a digest of what it did evaluate', async () => {
    process.env.GITHUB_EVENT_NAME = 'schedule';
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const mockOctokit = {
      rest: {
        repos: { getContent: vi.fn().mockRejectedValue({ status: 404 }) },
        pulls: { list: vi.fn() },
      },
      paginate: vi.fn().mockResolvedValue([{ number: 1 }, { number: 2 }]),
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit as any);

    vi.mocked(prCollector.collectPullRequestCore).mockImplementation(
      async (_octokit, _owner, _repo, pullNumber) => {
        if (pullNumber === 2) throw new Error('Not Found');
        return {
          number: pullNumber,
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
        } as any;
      },
    );

    await runCommand();

    // A digest missing one PR beats no digest; the warning says which is absent.
    expect(digestAction.applyDigest).toHaveBeenCalledTimes(1);
    const markdown = vi.mocked(digestAction.applyDigest).mock.calls[0]![3];
    expect(markdown).toContain('**#1**');
    expect(markdown).not.toContain('**#2**');
  });
});
