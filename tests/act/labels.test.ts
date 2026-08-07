import { describe, expect, test, vi } from 'vitest';
import {
  deriveDesiredLabels,
  reconcileLabels,
  applyLabels,
} from '../../src/act/labels.js';

describe('labels action', () => {
  describe('deriveDesiredLabels', () => {
    test('maps rule outcomes to labels', () => {
      const results: any[] = [
        { code: 'CI_FAILING', outcome: 'fail', bucket: 'fact' },
        { code: 'MERGE_CONFLICT', outcome: 'fail', bucket: 'fact' },
      ];
      const desired = deriveDesiredLabels(results, 'BLOCKED_ON_CONTRIBUTOR');
      expect(Array.from(desired).sort()).toEqual(['has-conflicts', 'needs-ci-fix']);
    });

    test('ignores heuristic failures', () => {
      const results: any[] = [
        { code: 'CI_FAILING', outcome: 'fail', bucket: 'heuristic' },
      ];
      const desired = deriveDesiredLabels(results, 'READY_FOR_REVIEW');
      expect(Array.from(desired)).toEqual(['ready-for-review']);
    });

    test('maps triage status to labels', () => {
      const desired = deriveDesiredLabels([], 'BLOCKED_ON_MAINTAINER');
      expect(Array.from(desired)).toEqual(['needs-maintainer-decision']);
    });
  });

  describe('reconcileLabels', () => {
    test('computes add and remove', () => {
      const desired = new Set(['needs-ci-fix', 'has-conflicts'] as const);
      const actual = ['needs-ci-fix', 'stale', 'custom-maintainer-label'];

      const { add, remove } = reconcileLabels(desired, actual);

      expect(add.map((a) => a.name)).toEqual(['has-conflicts']);
      // Should remove 'stale', but ignore 'custom-maintainer-label'
      expect(remove).toEqual(['stale']);
    });

    test('respects label prefixes', () => {
      const desired = new Set(['needs-ci-fix', 'has-conflicts'] as const);
      const actual = ['bot/needs-ci-fix', 'stale', 'custom-maintainer-label'];
      const config = { labelPrefix: 'bot/' };

      const { add, remove } = reconcileLabels(desired, actual, config);

      expect(add.map((a) => a.name)).toEqual(['bot/has-conflicts']);
      // Should want to remove bot/stale (which is absent in actual), but not stale (unmanaged). Wait, the test has 'stale'.
      // With prefix 'bot/', the managed labels are 'bot/needs-ci-fix', 'bot/has-conflicts', 'bot/stale', etc.
      // actual 'stale' doesn't match 'bot/stale', so it's ignored!
      expect(remove).toEqual([]);
    });

    test('respects label mappings', () => {
      const desired = new Set(['needs-ci-fix', 'stale'] as const);
      const actual = ['ci-failing', 'stale-pr'];
      const config = {
        labelMapping: {
          'needs-ci-fix': 'ci-failing',
          stale: 'stale-pr',
          'has-conflicts': 'conflicts',
        },
      };

      const { add, remove } = reconcileLabels(desired, actual, config);

      // 'ci-failing' and 'stale-pr' are desired. Both are present, so nothing to add or remove!
      expect(add).toEqual([]);
      expect(remove).toEqual([]);
    });

    test('combines prefix and mapping', () => {
      const desired = new Set(['needs-ci-fix'] as const);
      const actual = ['bot/stale-pr'];
      const config = {
        labelPrefix: 'bot/',
        labelMapping: { 'needs-ci-fix': 'ci-failing', stale: 'stale-pr' },
      };

      const { add, remove } = reconcileLabels(desired, actual, config);

      expect(add.map((a) => a.name)).toEqual(['bot/ci-failing']);
      expect(remove).toEqual(['bot/stale-pr']);
    });
  });
});
