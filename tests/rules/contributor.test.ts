import { describe, expect, it } from 'vitest';
import {
  firstTimeContributorRule,
  staleRule,
  noDcoRule,
} from '../../src/rules/contributor.js';
import { loadFixtures } from '../support/fixtures.js';

describe('Contributor rules', () => {
  const fixtures = loadFixtures();

  it('runs FIRST_TIME_CONTRIBUTOR without errors', () => {
    const results = fixtures.map((f) => firstTimeContributorRule.run(f));
    expect(results).toHaveLength(159);
  });

  it('runs STALE without errors', () => {
    const results = fixtures.map((f) => staleRule.run(f));
    expect(results).toHaveLength(159);
  });

  it('runs NO_DCO without errors', () => {
    const results = fixtures.map((f) => noDcoRule.run(f));
    expect(results).toHaveLength(159);
  });
});
