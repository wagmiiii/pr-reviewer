import { describe, expect, test, vi, beforeEach } from 'vitest';
import { hashVerdict, createMarker, applyComment } from '../../src/act/comment.js';
import * as state from '../../src/act/state.js';
import type { RuleResult } from '../../src/types.js';

vi.mock('@actions/cache', () => ({
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
}));

describe('comment actuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashVerdict', () => {
    test('ignores timestamps, explanations, and ordering', () => {
      const results1: RuleResult[] = [
        {
          code: 'CI_FAILING',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'contributor',
          severity: 'blocking',
          explanation: 'Failed at 10:00',
        },
        {
          code: 'MERGE_CONFLICT',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'contributor',
          severity: 'blocking',
          explanation: 'Conflicts in a.txt',
        },
      ];

      const results2: RuleResult[] = [
        {
          code: 'MERGE_CONFLICT',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'contributor',
          severity: 'blocking',
          explanation: 'Conflicts in b.txt',
        },
        {
          code: 'CI_FAILING',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'contributor',
          severity: 'blocking',
          explanation: 'Failed at 11:00',
        },
      ];

      const hash1 = hashVerdict(results1, 'BLOCKED_ON_CONTRIBUTOR');
      const hash2 = hashVerdict(results2, 'BLOCKED_ON_CONTRIBUTOR');

      expect(hash1).toEqual(hash2);
    });

    test('different status produces different hash', () => {
      const results: RuleResult[] = [
        {
          code: 'CI_FAILING',
          outcome: 'fail',
          bucket: 'fact',
          owner: 'contributor',
          severity: 'blocking',
          explanation: '',
        },
      ];
      const hash1 = hashVerdict(results, 'BLOCKED_ON_CONTRIBUTOR');
      const hash2 = hashVerdict(results, 'READY_FOR_REVIEW');

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('markers', () => {
    test('creates marker correctly', () => {
      const marker = createMarker({
        hash: 'abc123feed',
        editsToday: 5,
        date: '2026-08-05',
      });
      expect(marker).toContain('abc123feed');
      expect(marker).toContain('"editsToday":5');
      expect(marker).toContain('pr-reviewer:v1');
    });
  });

  describe('applyComment', () => {
    test('creates comment if missing', async () => {
      const createComment = vi.fn();
      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([]),
        rest: { issues: { createComment } },
      };

      await applyComment(octokit, 'owner', 'repo', 1, [], 'READY_FOR_REVIEW', 'Hello');

      expect(createComment).toHaveBeenCalledTimes(1);
      expect(createComment.mock.calls[0]![0]!.body).toContain('Hello');
      expect(createComment.mock.calls[0]![0]!.body).toContain('<!-- pr-reviewer:v1');
    });

    test('updates comment if hash differs', async () => {
      const updateComment = vi.fn();
      const oldMarker = createMarker({
        hash: 'deadbeef',
        editsToday: 1,
        date: new Date().toISOString().split('T')[0]!,
      });
      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([{ id: 123, body: oldMarker }]),
        rest: { issues: { updateComment } },
      };

      await applyComment(octokit, 'owner', 'repo', 1, [], 'READY_FOR_REVIEW', 'Hello');

      expect(updateComment).toHaveBeenCalledTimes(1);
      expect(updateComment.mock.calls[0]![0]!.comment_id).toEqual(123);
      expect(updateComment.mock.calls[0]![0]!.body).toContain('"editsToday":2');
    });

    test('no write if hash is identical', async () => {
      const updateComment = vi.fn();
      const hash = hashVerdict([], 'READY_FOR_REVIEW');
      const marker = createMarker({
        hash,
        editsToday: 1,
        date: new Date().toISOString().split('T')[0]!,
      });

      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([{ id: 123, body: marker }]),
        rest: { issues: { updateComment } },
      };

      await applyComment(octokit, 'owner', 'repo', 1, [], 'READY_FOR_REVIEW', 'Hello');

      expect(updateComment).not.toHaveBeenCalled();
    });

    test('skips update if edit cap reached', async () => {
      const updateComment = vi.fn();
      const oldMarker = createMarker({
        hash: 'deadbeef',
        editsToday: 10,
        date: new Date().toISOString().split('T')[0]!,
      });
      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([{ id: 123, body: oldMarker }]),
        rest: { issues: { updateComment } },
      };

      await applyComment(
        octokit,
        'owner',
        'repo',
        1,
        [],
        'READY_FOR_REVIEW',
        'Hello',
        10,
      );

      expect(updateComment).not.toHaveBeenCalled();
    });

    test('skips actual comment write if dryRun is true, but writes cache', async () => {
      const createComment = vi.fn();
      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([]),
        rest: { issues: { createComment } },
      };

      await applyComment(
        octokit,
        'owner',
        'repo',
        1,
        [],
        'READY_FOR_REVIEW',
        'Hello',
        10,
        true,
      );

      expect(createComment).not.toHaveBeenCalled();
    });

    test('truncates comment body if over 65536 chars', async () => {
      const createComment = vi.fn();
      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([]),
        rest: { issues: { createComment } },
      };

      const hugeMarkdown = 'A'.repeat(70000);
      await applyComment(
        octokit,
        'owner',
        'repo',
        1,
        [],
        'READY_FOR_REVIEW',
        hugeMarkdown,
      );

      expect(createComment).toHaveBeenCalledTimes(1);
      const body = createComment.mock.calls[0]![0]!.body;
      expect(body.length).toBeLessThanOrEqual(65536);
      expect(body.endsWith('\n... (truncated)')).toBe(true);
      expect(body).toContain('<!-- pr-reviewer:v1');
    });

    test('deletes duplicate markers and keeps the oldest', async () => {
      const updateComment = vi.fn();
      const deleteComment = vi.fn();
      const marker = createMarker({ hash: 'abc', editsToday: 1, date: '2026-08-05' });

      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([
          { id: 101, body: marker, created_at: '2026-08-05T10:00:00Z' }, // Older
          { id: 102, body: 'Random text' },
          { id: 103, body: marker, created_at: '2026-08-05T12:00:00Z' }, // Newer
        ]),
        rest: { issues: { updateComment, deleteComment } },
      };

      await applyComment(octokit, 'owner', 'repo', 1, [], 'READY_FOR_REVIEW', 'Hello');

      expect(deleteComment).toHaveBeenCalledTimes(1);
      expect(deleteComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 103,
      });
      expect(updateComment).toHaveBeenCalledTimes(1);
      expect(updateComment.mock.calls[0]![0]!.comment_id).toEqual(101);
    });
  });
});
