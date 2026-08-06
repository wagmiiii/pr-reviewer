import type { PullRequestContext, RuleResult } from '../types.js';
import { deriveStatus } from '../rules/index.js';

export interface EvaluatedPR {
  context: PullRequestContext;
  results: readonly RuleResult[];
}

export function renderTerminalReport(prs: readonly EvaluatedPR[]): string {
  const sections = {
    'Ready for you': [] as EvaluatedPR[],
    'Blocked on contributor': [] as EvaluatedPR[],
    'Needs your decision': [] as EvaluatedPR[],
    Waiting: [] as EvaluatedPR[],
    Stale: [] as EvaluatedPR[],
  };

  for (const pr of prs) {
    const status = deriveStatus(pr.results);
    const failedRules = pr.results.filter((r) => r.outcome === 'fail');

    if (status === 'READY_FOR_REVIEW') {
      sections['Ready for you'].push(pr);
    } else if (status === 'BLOCKED_ON_MAINTAINER') {
      sections['Needs your decision'].push(pr);
    } else if (status === 'BLOCKED_ON_CONTRIBUTOR') {
      sections['Blocked on contributor'].push(pr);
    } else if (status === 'WAITING') {
      if (failedRules.some((r) => r.code === 'STALE')) {
        sections['Stale'].push(pr);
      } else {
        sections['Waiting'].push(pr);
      }
    }
  }

  const lines: string[] = [];
  const sectionKeys = [
    'Ready for you',
    'Blocked on contributor',
    'Needs your decision',
    'Waiting',
    'Stale',
  ] as const;

  for (const title of sectionKeys) {
    const items = sections[title];
    lines.push(`## ${title} (${items.length})`);

    if (items.length === 0) {
      lines.push('  None');
    } else {
      for (const item of items) {
        const { context, results } = item;
        const failedCodes = results
          .filter((r) => r.outcome === 'fail')
          .map((r) => r.code);

        const collectedAt = new Date(context.collectedAt).getTime();
        const createdAt = new Date(context.createdAt).getTime();
        const ageDays = Math.floor((collectedAt - createdAt) / (1000 * 60 * 60 * 24));

        let notes = failedCodes.length > 0 ? failedCodes.join(', ') : '';

        if (context.checks === undefined && context.baseChecks === undefined) {
          notes += (notes ? ' ' : '') + '(no CI detected)';
        } else if (context.checks?.length === 0 && context.baseChecks?.length === 0) {
          notes += (notes ? ' ' : '') + '(no CI detected)';
        }

        const notesStr = notes ? ` [${notes}]` : '';
        const titleStr = context.title ? ` ${context.title}` : '';
        lines.push(`  #${context.number}${titleStr}${notesStr} (${ageDays}d)`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
