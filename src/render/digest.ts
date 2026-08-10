import type { RuleResult } from '../types.js';
import { deriveStatus } from '../rules/index.js';
import type { EvaluatedPR } from './terminal.js';

/**
 * Renders the whole open-PR queue as a single maintainer-facing digest.
 *
 * The gate this ticket passed (`docs/decisions/PR-090-digest-gate.md`) turned on
 * one thing: a saved search can filter by label but cannot say *why* a label was
 * applied. Specifically it cannot distinguish "a required check is failing
 * because your `main` is broken" from "a required check is failing because this
 * contributor broke it" — and PR-004 measured that split at 63 to 8. So the
 * digest leads with attribution. A renderer that only listed rule codes would be
 * the "it is prettier" outcome the gate was written to reject.
 */

/** How many PRs to list per section before collapsing the remainder into a count. */
const DEFAULT_SECTION_CAP = 20;

/**
 * GitHub rejects an issue body over 65536 characters. A digest over a large
 * queue can plausibly reach that, and the failure mode is the whole upsert
 * throwing, so the renderer stays under a self-imposed budget and says what it
 * dropped.
 */
const BODY_BUDGET_CHARS = 60000;

type SectionKey =
  'baseBroken' | 'readyForYou' | 'yourDecision' | 'blockedOnContributor' | 'waiting';

interface Section {
  readonly key: SectionKey;
  readonly heading: string;
  /** One line telling the maintainer what this section means and who owns it. */
  readonly blurb: string;
}

const SECTIONS: readonly Section[] = [
  {
    key: 'baseBroken',
    heading: 'Your `main` is broken',
    blurb:
      'A required check is failing here **and was already failing on the base commit**. ' +
      'The contributor did not cause these. Fixing the base clears them all at once.',
  },
  {
    key: 'readyForYou',
    heading: 'Ready for you',
    blurb: 'Nothing mechanical is blocking these. They are waiting on a review.',
  },
  {
    key: 'yourDecision',
    heading: 'Needs your decision',
    blurb: 'Blocked on something only you can resolve.',
  },
  {
    key: 'blockedOnContributor',
    heading: 'Blocked on contributor',
    blurb:
      'Waiting on the author. The bot has already told them what to fix, so these ' +
      'need nothing from you.',
  },
  {
    key: 'waiting',
    heading: 'Waiting',
    blurb: 'In flight — CI still running, or no activity for a while.',
  },
];

function isBaseBroken(results: readonly RuleResult[]): boolean {
  return results.some((r) => r.code === 'CI_BROKEN_ON_BASE' && r.outcome === 'fail');
}

function bucketFor(pr: EvaluatedPR): SectionKey {
  // Attribution wins over status: a base-broken PR is technically
  // BLOCKED_ON_MAINTAINER, but lumping it in with "needs your decision" hides
  // the one distinction this digest exists to draw.
  if (isBaseBroken(pr.results)) return 'baseBroken';

  const status = deriveStatus(pr.results);
  if (status === 'READY_FOR_REVIEW') return 'readyForYou';
  if (status === 'BLOCKED_ON_MAINTAINER') return 'yourDecision';
  if (status === 'BLOCKED_ON_CONTRIBUTOR') return 'blockedOnContributor';
  return 'waiting';
}

function ageInDays(pr: EvaluatedPR): number {
  const collectedAt = new Date(pr.context.collectedAt).getTime();
  const createdAt = new Date(pr.context.createdAt).getTime();
  return Math.floor((collectedAt - createdAt) / (1000 * 60 * 60 * 24));
}

/**
 * Within a section, oldest first.
 *
 * Q9 in `06-open-questions.md` explicitly declines to pick a sort order, calling
 * "cheap wins first" an unbacked assertion about the maintainer's preferences,
 * and says to answer it from a week of real usage. Age is the one ordering that
 * assumes nothing about what the maintainer values — it is a property of the
 * queue, not a guess about the reader. Revisit once Q9 has evidence behind it.
 */
function oldestFirst(a: EvaluatedPR, b: EvaluatedPR): number {
  const ageDiff = ageInDays(b) - ageInDays(a);
  return ageDiff !== 0 ? ageDiff : a.context.number - b.context.number;
}

/** The failing fact rules, which are what the maintainer needs the reason for. */
function reasonsFor(pr: EvaluatedPR): readonly RuleResult[] {
  return pr.results.filter((r) => r.outcome === 'fail' && r.bucket === 'fact');
}

function renderEntry(pr: EvaluatedPR): string {
  const { context } = pr;
  const title = context.title ? ` ${context.title}` : '';
  const age = ageInDays(pr);
  const lines = [`- **#${context.number}**${title} — ${age}d old`];

  for (const reason of reasonsFor(pr)) {
    lines.push(`  - \`${reason.code}\` — ${reason.explanation}`);
  }

  return lines.join('\n');
}

export function renderDigest(
  prs: readonly EvaluatedPR[],
  sectionCap: number = DEFAULT_SECTION_CAP,
): string {
  const buckets = new Map<SectionKey, EvaluatedPR[]>(
    SECTIONS.map((section) => [section.key, [] as EvaluatedPR[]]),
  );

  for (const pr of prs) {
    buckets.get(bucketFor(pr))!.push(pr);
  }

  const lines: string[] = ['# PR Reviewer digest', ''];

  if (prs.length === 0) {
    lines.push('The open-PR queue is empty.');
    return lines.join('\n');
  }

  lines.push(`${prs.length} open pull request${prs.length === 1 ? '' : 's'}.`, '');

  let truncatedSections = 0;

  for (const section of SECTIONS) {
    const items = buckets.get(section.key)!;
    if (items.length === 0) continue; // An empty section is noise in a digest.

    items.sort(oldestFirst);

    lines.push(`## ${section.heading} (${items.length})`, '', section.blurb, '');

    const visible = items.slice(0, sectionCap);
    for (const pr of visible) {
      lines.push(renderEntry(pr));
    }

    if (items.length > visible.length) {
      truncatedSections++;
      lines.push(`- …and ${items.length - visible.length} more`);
    }

    lines.push('');
  }

  if (truncatedSections > 0) {
    lines.push(`_Sections are capped at ${sectionCap} PRs._`, '');
  }

  const rendered = lines.join('\n').trimEnd();

  if (rendered.length <= BODY_BUDGET_CHARS) return rendered;

  // Falling back rather than throwing: a truncated digest is still useful, and
  // an upsert that 422s leaves the maintainer with nothing.
  const keep = rendered.slice(0, BODY_BUDGET_CHARS);
  const lastBreak = keep.lastIndexOf('\n');
  return (
    (lastBreak > 0 ? keep.slice(0, lastBreak) : keep) +
    '\n\n_Digest truncated: the full queue exceeds the GitHub issue body limit._'
  );
}
