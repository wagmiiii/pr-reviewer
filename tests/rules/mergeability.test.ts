import { describe, expect, it } from 'vitest';
import { mergeConflictRule, behindBaseRule } from '../../src/rules/mergeability.js';
import { loadFixtures } from '../support/fixtures.js';

describe('Mergeability rules', () => {
  const fixtures = loadFixtures();

  it('runs MERGE_CONFLICT without errors', () => {
    const results = fixtures.map((f) => mergeConflictRule.run(f));
    expect(results).toHaveLength(159);
  });

  it('runs BEHIND_BASE without errors', () => {
    const results = fixtures.map((f) => behindBaseRule.run(f));
    expect(results).toHaveLength(159);
  });
});
