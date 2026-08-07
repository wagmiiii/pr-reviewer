import { describe, expect, test, vi } from 'vitest';
import {
  hashVerdict,
  parseMarker,
  createMarker,
  applyComment,
} from '../../src/act/comment.js';
import type { RuleResult } from '../../src/types.js';

describe('comment actuation', () => {
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
    test('creates and parses marker correctly', () => {
      const marker = createMarker('abc123feed', 5);
      const parsed = parseMarker(marker);
      expect(parsed?.hash).toEqual('abc123feed');
      expect(parsed?.editsToday).toEqual(5);
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
      expect(createComment.mock.calls[0]![0]!.body).toContain(
        '<!-- pr-reviewer:v1 hash:',
      );
    });

    test('updates comment if hash differs', async () => {
      const updateComment = vi.fn();
      const oldMarker = createMarker('deadbeef', 1);
      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([{ id: 123, body: oldMarker }]),
        rest: { issues: { updateComment } },
      };

      await applyComment(octokit, 'owner', 'repo', 1, [], 'READY_FOR_REVIEW', 'Hello');

      expect(updateComment).toHaveBeenCalledTimes(1);
      expect(updateComment.mock.calls[0]![0]!.comment_id).toEqual(123);
      expect(updateComment.mock.calls[0]![0]!.body).toContain('edits:2');
    });

    test('no write if hash is identical', async () => {
      const updateComment = vi.fn();
      const hash = hashVerdict([], 'READY_FOR_REVIEW');
      const marker = createMarker(hash, 1);

      const octokit: any = {
        paginate: vi.fn().mockResolvedValue([{ id: 123, body: marker }]),
        rest: { issues: { updateComment } },
      };

      await applyComment(octokit, 'owner', 'repo', 1, [], 'READY_FOR_REVIEW', 'Hello');

      expect(updateComment).not.toHaveBeenCalled();
    });

    test('skips update if edit cap reached', async () => {
      const updateComment = vi.fn();
      const oldMarker = createMarker('deadbeef', 10);
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
  });
});
