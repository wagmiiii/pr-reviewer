import { describe, expect, it } from 'vitest';
import { touchesProtectedRule, hugeDiffRule } from '../../src/rules/path.js';
import { loadFixtures } from '../support/fixtures.js';

describe('Path and size rules', () => {
  const fixtures = loadFixtures();

  it('runs TOUCHES_PROTECTED without errors', () => {
    const results = fixtures.map((f) => touchesProtectedRule.run(f));
    expect(results).toHaveLength(159);
  });

  it('runs HUGE_DIFF without errors', () => {
    const results = fixtures.map((f) => hugeDiffRule.run(f));
    expect(results).toHaveLength(159);
  });
});
