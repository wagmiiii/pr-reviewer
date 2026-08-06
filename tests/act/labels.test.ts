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

      expect(add).toEqual(['has-conflicts']);
      // Should remove 'stale', but ignore 'custom-maintainer-label'
      expect(remove).toEqual(['stale']);
    });
  });
});
