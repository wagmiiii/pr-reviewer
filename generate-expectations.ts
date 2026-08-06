import { writeFileSync } from 'fs';
import { loadFixtures } from './tests/support/fixtures.js';
import { runRules } from './src/rules/index.js';
import { ciRules } from './src/rules/ci.js';
import { mergeConflictRule, behindBaseRule } from './src/rules/mergeability.js';
import { changesRequestedRule, draftRule } from './src/rules/review.js';
import { touchesProtectedRule, hugeDiffRule } from './src/rules/path.js';
import { firstTimeContributorRule, staleRule, noDcoRule } from './src/rules/contributor.js';

const allRules = [
  ...ciRules,
  mergeConflictRule, behindBaseRule,
  changesRequestedRule, draftRule,
  touchesProtectedRule, hugeDiffRule,
  firstTimeContributorRule, staleRule, noDcoRule
];

const factRules = allRules.filter(r => {
  // We don't have a direct way to check if a RuleDefinition is a fact rule without running it,
  // but we can just run it on a dummy context and check bucket, OR just run on all fixtures and filter bucket === 'fact'.
  return true;
});

const contexts = loadFixtures();
const expectations: Record<number, string[]> = {};

for (const context of contexts) {
  const results = runRules(context, factRules);
  const failedFactRules = results
    .filter(r => r.bucket === 'fact' && r.outcome === 'fail')
    .map(r => r.code)
    .sort();
  expectations[context.number] = failedFactRules;
}

writeFileSync('tests/fixtures/expectations.json', JSON.stringify(expectations, null, 2));
console.log('Wrote expectations.json');
