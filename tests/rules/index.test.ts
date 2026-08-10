import { expect, test, describe } from 'vitest';
import { deriveStatus } from '../../src/rules/index.js';
import type { FactRuleResult, HeuristicRuleResult } from '../../src/types.js';

describe('deriveStatus', () => {
  test('adding a failing heuristic to a green context leaves the status unchanged', () => {
    const greenResults: FactRuleResult[] = [
      {
        code: 'SOME_FACT',
        bucket: 'fact',
        outcome: 'pass',
        owner: 'none',
        severity: 'blocking',
        explanation: 'Everything is fine',
      },
    ];

    expect(deriveStatus(greenResults)).toBe('READY_FOR_REVIEW');

    const withHeuristicFailing = [
      ...greenResults,
      {
        code: 'SOME_HEURISTIC',
        bucket: 'heuristic',
        outcome: 'fail',
        owner: 'contributor',
        severity: 'warning',
        explanation: 'This is a warning',
        confidence: 0.8,
        thresholdTuned: true,
      } as HeuristicRuleResult,
    ];

    expect(deriveStatus(withHeuristicFailing)).toBe('READY_FOR_REVIEW');
  });
});
