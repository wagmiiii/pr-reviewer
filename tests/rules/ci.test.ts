import { describe, expect, it } from 'vitest';
import {
  ciFailingRule,
  ciBrokenOnBaseRule,
  ciPendingRule,
  ciMissingRule,
} from '../../src/rules/ci.js';
import { loadFixtures } from '../support/fixtures.js';
import type { PullRequestContext, RuleResult } from '../../src/types.js';

describe('CI rules against PR-012 fixtures', () => {
  const fixtures = loadFixtures();

  it('runs CI_FAILING without errors', () => {
    const results = fixtures.map((f) => ciFailingRule.run(f));
    expect(results).toHaveLength(159);
    // Spot check a few outcomes if known
  });

  it('runs CI_BROKEN_ON_BASE without errors', () => {
    const results = fixtures.map((f) => ciBrokenOnBaseRule.run(f));
    expect(results).toHaveLength(159);
  });

  it('runs CI_PENDING without errors', () => {
    const results = fixtures.map((f) => ciPendingRule.run(f));
    expect(results).toHaveLength(159);
  });

  it('runs CI_MISSING without errors', () => {
    const results = fixtures.map((f) => ciMissingRule.run(f));
    expect(results).toHaveLength(159);
  });
});
