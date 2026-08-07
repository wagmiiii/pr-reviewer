import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as cache from '@actions/cache';
import fs from 'node:fs';
import { readState, writeState } from '../../src/act/state.js';

vi.mock('@actions/cache', () => ({
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    },
  },
}));

describe('state store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readState', () => {
    test('returns null if no cache and no comment', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);
      const state = await readState('owner', 'repo', 1);
      expect(state).toBeNull();
    });

    test('reads from cache if available', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue('key');
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify({
          hash: 'abc',
          date: '2026-08-05',
          editsToday: 2,
        }),
      );

      const state = await readState('owner', 'repo', 1);
      expect(state).toEqual({
        hash: 'abc',
        date: '2026-08-05',
        editsToday: 2,
      });
    });

    test('falls back to comment if cache misses', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const state = await readState(
        'owner',
        'repo',
        1,
        '<!-- pr-reviewer:v1 {"hash":"def","date":"2026-08-05","editsToday":1} -->',
      );
      expect(state).toEqual({
        hash: 'def',
        date: '2026-08-05',
        editsToday: 1,
      });
    });

    test('returns null on invalid comment JSON schema', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined);

      const state = await readState(
        'owner',
        'repo',
        1,
        '<!-- pr-reviewer:v1 {"invalid":"yes"} -->',
      );
      expect(state).toBeNull();
    });
  });

  describe('writeState', () => {
    test('writes to cache file and saves cache', async () => {
      await writeState('owner', 'repo', 1, {
        hash: 'xyz',
        date: '2026-08-05',
        editsToday: 3,
      });

      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(cache.saveCache).toHaveBeenCalled();

      const [paths, key] = vi.mocked(cache.saveCache).mock.calls[0]!;
      expect(paths).toEqual(['.pr-reviewer-state.json']);
      expect(key).toMatch(/^pr-reviewer-owner-repo-1-\d+$/);
    });
  });
});
