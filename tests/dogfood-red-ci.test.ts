/**
 * DELIBERATE FAILURE — dogfood probe. Do not merge; delete after reading.
 *
 * The most important message this bot sends is the one to a contributor whose
 * CI just went red, and it is the one message the corpus cannot test. No
 * recorded fixture carries a `failureExcerpt` (0 of 159) because the Actions
 * logs had decayed before PR-005 archived them, so `src/act/render.ts`'s log
 * block has never rendered against real data.
 *
 * This test fails on purpose, so a real workflow run produces real logs and the
 * bot has to collect them and render a real CI_FAILING comment.
 */

import { describe, expect, test } from 'vitest';

describe('dogfood probe', () => {
  test('fails on purpose so the bot has a red check to talk about', () => {
    const whatTheContributorThought = 'green';
    expect(whatTheContributorThought).toBe('red');
  });
});
