import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loadFixtures } from '../support/fixtures.js';
import { runRules } from '../../src/rules/index.js';
import { ciRules } from '../../src/rules/ci.js';
import { mergeConflictRule, behindBaseRule } from '../../src/rules/mergeability.js';
import { changesRequestedRule, draftRule } from '../../src/rules/review.js';
import { touchesProtectedRule, hugeDiffRule } from '../../src/rules/path.js';
import { firstTimeContributorRule, staleRule, noDcoRule } from '../../src/rules/contributor.js';

const allRules = [
  ...ciRules,
  mergeConflictRule, behindBaseRule,
  changesRequestedRule, draftRule,
  touchesProtectedRule, hugeDiffRule,
  firstTimeContributorRule, staleRule, noDcoRule
];

describe('Zero false-positive gate', () => {
  const expectationsPath = join(process.cwd(), 'tests/fixtures/expectations.json');
  const expectations: Record<string, string[]> = JSON.parse(readFileSync(expectationsPath, 'utf8'));
  const contexts = loadFixtures();

  for (const context of contexts) {
    test(`PR #${context.number} matches hand-written expected fact rule outcomes`, () => {
      const expectedFailures = expectations[context.number.toString()] || [];
      const results = runRules(context, allRules);
      
      const actualFailures = results
        .filter(r => r.bucket === 'fact' && r.outcome === 'fail')
        .map(r => r.code)
        .sort();

      expect(actualFailures).toEqual(expectedFailures.sort());
    });
  }
});
