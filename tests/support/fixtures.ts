/**
 * PR-012 — the *replay* half of the fixture harness.
 *
 * Loads recorded `PullRequestContext` documents so rules can be tested without
 * a collector, a token, or a network. This is what decouples the Rules track
 * from the Platform track: a rule needs a context, not the code that fetched
 * one.
 *
 * Fixtures are produced by `npm run fixtures:record` from the archive in
 * `corpus/`. They are committed, so a checkout can run the whole rule suite
 * offline.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PullRequestContext } from '../../src/types.js';

const FIXTURES = fileURLToPath(new URL('../fixtures', import.meta.url));

/** Every recorded PR number, ascending. */
export function fixtureNumbers(): number[] {
  return readdirSync(FIXTURES)
    .filter((f) => f.endsWith('.context.json'))
    .map((f) => Number(f.replace(/^pr-|\.context\.json$/g, '')))
    .sort((a, b) => a - b);
}

/** One recorded context by PR number. Throws if it was never recorded. */
export function loadFixture(number: number): PullRequestContext {
  const path = join(FIXTURES, `pr-${number}.context.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as PullRequestContext;
}

/** Every recorded context, ascending by PR number. */
export function loadFixtures(): PullRequestContext[] {
  return fixtureNumbers().map(loadFixture);
}

/**
 * A deterministic pseudo-random sample, for PR-042.
 *
 * The Phase 0 exit criterion is a blind hand-classification of 40 PRs whose
 * membership is **committed before the run**. That only means anything if the
 * same seed always picks the same 40 — otherwise the sample can be re-rolled
 * until it flatters the rules, which is the failure mode the criterion exists
 * to prevent.
 *
 * mulberry32: small, seeded, and stable across Node versions. `Math.random()`
 * would defeat the point entirely.
 */
export function seededSample<T>(items: readonly T[], size: number, seed: number): T[] {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Fisher-Yates over a copy, then take the first `size`.
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j] as T, pool[i] as T];
  }

  return pool.slice(0, Math.min(size, pool.length));
}
