import type { PullRequestContext, RuleResult } from '../types.js';
import { deriveStatus } from '../rules/index.js';
import type { EvaluatedPR } from './terminal.js';

export function renderDigest(prs: readonly EvaluatedPR[], cap: number = 20): string {
  const byOwner = {
    Maintainer: [] as EvaluatedPR[],
    Contributor: [] as EvaluatedPR[],
    None: [] as EvaluatedPR[],
  };

  for (const pr of prs) {
    const status = deriveStatus(pr.results);
    if (status === 'READY_FOR_REVIEW' || status === 'BLOCKED_ON_MAINTAINER') {
      byOwner.Maintainer.push(pr);
    } else if (status === 'BLOCKED_ON_CONTRIBUTOR') {
      byOwner.Contributor.push(pr);
    } else {
      byOwner.None.push(pr);
    }
  }

  // "cheap wins first" sort order - sort by estimated minutes if available, fallback to smallest PR first (changedFiles or additions+deletions)
  const cheapWinsSort = (a: EvaluatedPR, b: EvaluatedPR) => {
    const timeA = a.judgments?.effortEstimate?.estimatedMinutes;
    const timeB = b.judgments?.effortEstimate?.estimatedMinutes;
    if (timeA !== undefined && timeB !== undefined) {
      return timeA - timeB;
    }
    const sizeA = a.context.additions + a.context.deletions;
    const sizeB = b.context.additions + b.context.deletions;
    return sizeA - sizeB;
  };

  byOwner.Maintainer.sort(cheapWinsSort);
  byOwner.Contributor.sort(cheapWinsSort);
  byOwner.None.sort(cheapWinsSort);

  const lines: string[] = [];
  lines.push('<!-- pr-reviewer:digest -->');
  lines.push('# PR Reviewer Digest');
  lines.push('');

  const renderSection = (title: string, items: EvaluatedPR[]) => {
    lines.push(`## ${title} (${items.length})`);
    if (items.length === 0) {
      lines.push('  None');
    } else {
      const visibleItems = items.slice(0, cap);
      for (const item of visibleItems) {
        const { context, results } = item;
        const failedCodes = results.filter((r) => r.outcome === 'fail').map((r) => r.code);
        
        const collectedAt = new Date(context.collectedAt).getTime();
        const createdAt = new Date(context.createdAt).getTime();
        const ageDays = Math.floor((collectedAt - createdAt) / (1000 * 60 * 60 * 24));

        let notes = failedCodes.length > 0 ? failedCodes.join(', ') : '';
        const titleStr = context.title ? ` ${context.title}` : '';
        
        let itemStr = `- **#${context.number}**${titleStr} (${ageDays}d)${notes ? ` [${notes}]` : ''}`;
        
        if (item.judgments) {
          const j1 = item.judgments.issueResolution;
          const j7 = item.judgments.effortEstimate;
          
          if (j1) {
            itemStr += `\n  - *J1 Resolution:* ${j1.verdict} (Confidence: ${j1.confidence})`;
          }
          if (j7) {
            itemStr += `\n  - *J7 Effort:* ~${j7.estimatedMinutes}m. Look at: ${j7.whatToLookAtFirst}`;
          }
          if (j1 || j7) {
            itemStr += `\n  - *(Shadow Mode)* [ ] Agree [ ] Disagree`;
          }
        }
        
        lines.push(itemStr);
      }
      if (items.length > cap) {
        lines.push(`- *...and ${items.length - cap} more*`);
      }
    }
    lines.push('');
  };

  renderSection('Blocked on Maintainer', byOwner.Maintainer);
  renderSection('Blocked on Contributor', byOwner.Contributor);
  renderSection('Waiting / Other', byOwner.None);

  return lines.join('\n').trim();
}
