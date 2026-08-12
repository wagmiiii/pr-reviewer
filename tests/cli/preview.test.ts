/**
 * `preview` is a read-only development surface, so the tests that matter are
 * the ones asserting it stays read-only and stays honest about what the corpus
 * does not cover.
 */

import { describe, expect, test } from 'vitest';

import { renderPreview } from '../../src/cli/preview.js';

const FIXTURES = 'tests/fixtures';

describe('pr-reviewer preview', () => {
  test('summarises the corpus by triage status', () => {
    const output = renderPreview({ fixturesDir: FIXTURES });

    expect(output).toMatch(/\d+ fixtures, \d+ with findings/);
    expect(output).toContain('BLOCKED_ON_CONTRIBUTOR');
    expect(output).toContain('CI_FAILING');
  });

  test('renders the contributor-facing comment for one PR', () => {
    const output = renderPreview({ fixturesDir: FIXTURES, number: 140 });

    expect(output).toContain('PR #140 — BLOCKED_ON_CONTRIBUTOR');
    expect(output).toContain('### PR Status: 🔴 **Blocked (Contributor)**');
    expect(output).toContain('CI_FAILING');
  });

  test('`only` filters to a single status', () => {
    const output = renderPreview({ fixturesDir: FIXTURES, only: 'WAITING' });

    expect(output).toContain('filtered to WAITING');
    expect(output).not.toContain('BLOCKED_ON_CONTRIBUTOR');
  });

  test('throws rather than printing an empty preview for an unknown PR', () => {
    expect(() => renderPreview({ fixturesDir: FIXTURES, number: 99999 })).toThrow(
      /No fixture recorded/,
    );
  });

  /**
   * The point of the note. A preview that renders a `CI_FAILING` comment with
   * no log excerpt, and says nothing about why, invites the reader to conclude
   * the log path is fine. It is simply not in the corpus.
   */
  test('declares that no fixture exercises the CI failure log excerpt', () => {
    const output = renderPreview({ fixturesDir: FIXTURES });

    expect(output).toContain('failureExcerpt');
    expect(output).toContain('Only a live run covers it');
  });

  test('never emits a maintainer-only finding into a contributor comment', () => {
    const output = renderPreview({ fixturesDir: FIXTURES, number: 140 });

    expect(output).not.toContain('POSSIBLE_SECRET');
  });
});
