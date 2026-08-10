import type { PullRequestContext, RuleResult, TriageStatus, CheckRun } from '../types.js';

export function renderComment(
  context: PullRequestContext,
  results: readonly RuleResult[],
  status: TriageStatus,
): string {
  // Sort results by severity/bucket/code for stability
  const activeFailures = results.filter(
    (r) =>
      r.outcome === 'fail' ||
      (r.outcome === 'pass' && false) /* we only want fails for the report */,
  );

  const factFailures = activeFailures.filter(
    (r) => r.bucket === 'fact' && r.outcome === 'fail',
  );
  const heuristicFailures = activeFailures.filter(
    (r) => r.bucket === 'heuristic' && r.outcome === 'fail',
  );

  const lines: string[] = [];

  // Triage status header
  let statusBadge = '';
  switch (status) {
    case 'READY_FOR_REVIEW':
      statusBadge = '🟢 **Ready for Review**';
      break;
    case 'BLOCKED_ON_CONTRIBUTOR':
      statusBadge = '🔴 **Blocked (Contributor)**';
      break;
    case 'BLOCKED_ON_MAINTAINER':
      statusBadge = '🔴 **Blocked (Maintainer)**';
      break;
    case 'WAITING':
      statusBadge = '🟡 **Waiting**';
      break;
  }

  lines.push(`### PR Status: ${statusBadge}`);
  lines.push('');

  if (factFailures.length > 0) {
    lines.push('#### 🛑 Blocking Issues');
    lines.push('');
    for (const failure of factFailures) {
      const ownerLabel =
        failure.owner === 'maintainer'
          ? '*(Maintainer action required)*'
          : '*(Contributor action required)*';
      lines.push(`- **${failure.code}**: ${failure.explanation} ${ownerLabel}`);

      // PR-072: CI failure formatting in the comment
      if (failure.code === 'CI_FAILING' || failure.code === 'CI_BROKEN_ON_BASE') {
        const failingChecks = (context.checks || []).filter((c) =>
          ['failure', 'timed_out', 'cancelled', 'action_required', 'stale'].includes(
            c.conclusion!,
          ),
        );
        for (const check of failingChecks) {
          lines.push(
            `  - ❌ \`${check.name}\`${check.failureExcerpt ? `:\n    \`\`\`\n    ${check.failureExcerpt}\n    \`\`\`` : ''}`,
          );
        }
      }

      // PR-073: Branch-update instructions for conflicts
      if (failure.code === 'MERGE_CONFLICT') {
        lines.push(
          `  - **How to fix**: Resolve conflicts by merging or rebasing against \`${context.baseBranch}\`.`,
        );
        lines.push(`    \`\`\`sh`);
        lines.push(`    git fetch origin`);
        lines.push(`    git checkout ${context.headBranch}`);
        lines.push(`    git merge origin/${context.baseBranch}`);
        lines.push(`    # resolve conflicts, then:`);
        lines.push(`    git push`);
        lines.push(`    \`\`\``);
      }
      if (failure.code === 'BEHIND_BASE') {
        lines.push(
          `  - **How to fix**: Update your branch to include the latest changes from \`${context.baseBranch}\`.`,
        );
      }
    }
    lines.push('');
  }

  if (heuristicFailures.length > 0) {
    lines.push('#### ⚠️ Warnings & Notes');
    lines.push('');
    for (const failure of heuristicFailures) {
      lines.push(`- **${failure.code}**: ${failure.explanation}`);
    }
    lines.push('');
  }

  if (factFailures.length === 0 && heuristicFailures.length === 0) {
    lines.push('No mechanical issues found.');
    lines.push('');
  }

  return lines.join('\n').trim();
}
