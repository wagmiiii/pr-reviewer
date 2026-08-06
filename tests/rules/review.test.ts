import { describe, expect, it } from 'vitest';
import { changesRequestedRule, draftRule } from '../../src/rules/review.js';
import { loadFixtures } from '../support/fixtures.js';

describe('Review and draft rules', () => {
  const fixtures = loadFixtures();

  it('runs CHANGES_REQUESTED without errors', () => {
    const results = fixtures.map((f) => changesRequestedRule.run(f));
    expect(results).toHaveLength(159);
  });

  it('runs DRAFT without errors', () => {
    const results = fixtures.map((f) => draftRule.run(f));
    expect(results).toHaveLength(159);
  });
});
