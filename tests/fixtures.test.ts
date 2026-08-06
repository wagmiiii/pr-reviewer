/**
 * PR-012 acceptance: the harness records and replays real PRs, and the replayed
 * set is good enough to build rules against.
 *
 * These assertions double as a regression test on the archive itself. If a
 * future re-record silently loses the base-check data, `CI_BROKEN_ON_BASE` —
 * the finding the whole project rests on — becomes untestable, and the
 * counts below are what would catch it.
 */

import { describe, expect, it } from 'vitest';

import type { CheckRun } from '../src/types.js';

import {
  fixtureNumbers,
  loadFixture,
  loadFixtures,
  seededSample,
} from './support/fixtures.js';

describe('fixture harness', () => {
  it('replays the whole archive', () => {
    const contexts = loadFixtures();
    expect(contexts).toHaveLength(159);
    expect(contexts.every((c) => c.schemaVersion === 1)).toBe(true);
  });

  it('loads a single PR by number', () => {
    const pr = loadFixture(157);
    expect(pr.number).toBe(157);
    expect(pr.isFork).toBe(true);
  });

  it('preserves the absent/empty distinction through recording', () => {
    // The mapping must never substitute [] for a section it did not collect.
    // If this ever fails, `CI_MISSING` is one refactor away from firing on
    // every PR whose check-runs fetch was skipped.
    const contexts = loadFixtures();
    const withoutChecks = contexts.filter((c) => c.checks === undefined);
    const withEmptyChecks = contexts.filter((c) => c.checks?.length === 0);

    expect(withoutChecks.length + withEmptyChecks.length).toBeGreaterThan(0);
    for (const context of contexts) {
      expect(context.checks === null).toBe(false);
    }
  });

  it('carries the fields the rules were blocked on', () => {
    const contexts = loadFixtures();

    // PR-035 needs these two; neither existed before the type additions.
    expect(contexts.every((c) => typeof c.createdAt === 'string')).toBe(true);
    expect(contexts.every((c) => typeof c.authorAssociation === 'string')).toBe(true);

    // PR-031 compares head against base. Without base checks it cannot run.
    const withBaseChecks = contexts.filter((c) => (c.baseChecks?.length ?? 0) > 0);
    expect(withBaseChecks.length).toBeGreaterThan(100);

    // 134 of 159 are fork PRs — the population the project exists for.
    expect(contexts.filter((c) => c.isFork)).toHaveLength(134);
  });

  it('reproduces the PR-004 headline from replayed contexts alone', () => {
    // Not a vanity assertion. The 88.7% is the load-bearing number in the
    // PR-003 decision, and it was originally derived from the raw capture by a
    // separate script. Deriving it again here, from the fixtures the rules will
    // actually consume, is the independent re-derivation the decision's kill
    // criteria asked for.
    const FAILED = ['failure', 'timed_out', 'cancelled', 'action_required', 'stale'];
    const failing = (runs: readonly CheckRun[] | undefined): readonly CheckRun[] =>
      (runs ?? []).filter((run) => FAILED.includes(run.conclusion ?? ''));

    const contexts = loadFixtures();
    const withFailingHead = contexts.filter((c) => failing(c.checks).length > 0);

    const alsoFailingOnBase = withFailingHead.filter((context) => {
      const baseFailing = new Set(failing(context.baseChecks).map((run) => run.name));
      return failing(context.checks).some((run) => baseFailing.has(run.name));
    });

    expect(withFailingHead).toHaveLength(71);
    expect(alsoFailingOnBase).toHaveLength(63);
  });
});

describe('seededSample', () => {
  it('is stable for a given seed', () => {
    const numbers = fixtureNumbers();
    const a = seededSample(numbers, 40, 42);
    const b = seededSample(numbers, 40, 42);

    expect(a).toEqual(b);
    expect(a).toHaveLength(40);
    expect(new Set(a).size).toBe(40);
  });

  it('differs between seeds', () => {
    const numbers = fixtureNumbers();
    expect(seededSample(numbers, 40, 42)).not.toEqual(seededSample(numbers, 40, 43));
  });

  it('never asks for more than it has', () => {
    expect(seededSample([1, 2, 3], 40, 42)).toHaveLength(3);
  });
});
