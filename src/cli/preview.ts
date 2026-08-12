/**
 * `pr-reviewer preview` — see what a contributor would receive, offline.
 *
 * Replays recorded fixtures through the real rules and the real comment
 * renderer, and prints the result. No token, no network, and — because it
 * never reaches stage 5 — no writes.
 *
 * This exists because reviewing contributor-facing copy had no cheap path.
 * Rendering one comment meant hand-writing a `PullRequestContext` in a test or
 * bundling `src/act/render.ts` directly, since it was not exported. Copy is the
 * product here: the bot's entire job is to say the right thing to someone whose
 * PR is red, and a change to that wording should be reviewable in seconds.
 *
 * It is not a substitute for a live run. The corpus cannot exercise what it
 * did not record — no fixture carries a `failureExcerpt`, so the log block in a
 * `CI_FAILING` comment is invisible here. The output says so wherever a
 * `CI_FAILING` comment appears, rather than letting a clean preview imply
 * coverage it does not have.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PullRequestContext, RuleResult, TriageStatus } from '../types.js';
import { runRules, deriveStatus, CORE_RULES } from '../rules/index.js';
import { renderComment } from '../act/render.js';

export interface PreviewOptions {
  /** Directory of `pr-<n>.context.json` fixtures. */
  fixturesDir: string;
  /** Render one PR's comment in full. Omit for the summary. */
  number?: number;
  /** Summarise only PRs whose triage status matches. */
  only?: TriageStatus;
}

interface Evaluated {
  readonly context: PullRequestContext;
  readonly results: readonly RuleResult[];
  readonly status: TriageStatus;
  readonly failures: readonly RuleResult[];
}

function loadFixtures(dir: string): PullRequestContext[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.context.json'))
    .map(
      (file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as PullRequestContext,
    )
    .sort((a, b) => a.number - b.number);
}

function evaluate(context: PullRequestContext): Evaluated {
  const results = runRules(context, CORE_RULES);
  return {
    context,
    results,
    status: deriveStatus(results),
    failures: results.filter((r) => r.outcome === 'fail'),
  };
}

/**
 * The corpus was archived after some CI logs had already expired, so no
 * fixture carries the excerpt that makes a `CI_FAILING` comment useful. Say so
 * where it is relevant, rather than leaving a silent hole in the preview.
 */
function excerptCoverage(evaluated: readonly Evaluated[]): string | undefined {
  const failing = evaluated.filter((e) =>
    e.failures.some((r) => r.code === 'CI_FAILING'),
  );
  if (failing.length === 0) return undefined;

  const withExcerpt = failing.filter((e) =>
    (e.context.checks ?? []).some((check) => check.failureExcerpt),
  );
  if (withExcerpt.length === failing.length) return undefined;

  return (
    `note: ${failing.length - withExcerpt.length} of ${failing.length} CI_FAILING ` +
    `fixture(s) carry no failureExcerpt, so the log block of a CI_FAILING ` +
    `comment is unexercised here. Only a live run covers it.`
  );
}

export function renderPreview(options: PreviewOptions): string {
  const evaluated = loadFixtures(options.fixturesDir).map(evaluate);
  const lines: string[] = [];

  if (options.number !== undefined) {
    const match = evaluated.find((e) => e.context.number === options.number);
    if (!match) {
      throw new Error(`No fixture recorded for PR #${options.number}.`);
    }

    lines.push(`PR #${match.context.number} — ${match.status}`);
    lines.push('='.repeat(70));
    lines.push(renderComment(match.context, match.results, match.status));

    const note = excerptCoverage([match]);
    if (note) lines.push('', note);

    return lines.join('\n');
  }

  const interesting = evaluated.filter(
    (e) => e.failures.length > 0 && (!options.only || e.status === options.only),
  );

  lines.push(
    `${evaluated.length} fixtures, ${interesting.length} with findings` +
      (options.only ? ` (filtered to ${options.only})` : ''),
  );
  lines.push('');

  const byStatus = new Map<TriageStatus, Evaluated[]>();
  for (const item of interesting) {
    byStatus.set(item.status, [...(byStatus.get(item.status) ?? []), item]);
  }

  for (const [status, items] of [...byStatus.entries()].sort()) {
    const codes = new Map<string, number>();
    for (const item of items) {
      for (const failure of item.failures) {
        codes.set(failure.code, (codes.get(failure.code) ?? 0) + 1);
      }
    }

    const breakdown = [...codes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => `${code} ${count}`)
      .join(', ');

    lines.push(`${status} (${items.length})`);
    lines.push(`  ${breakdown}`);
    lines.push(`  ${items.map((i) => `#${i.context.number}`).join(' ')}`);
    lines.push('');
  }

  const note = excerptCoverage(interesting);
  if (note) lines.push(note);

  lines.push('Render one in full: pr-reviewer preview <number>');

  return lines.join('\n');
}

export function previewCommand(options: PreviewOptions): void {
  console.log(renderPreview(options));
}
