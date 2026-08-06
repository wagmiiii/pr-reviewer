import type { RuleResult, TriageStatus } from '../types.js';

export const MANAGED_LABELS = {
  'needs-ci-fix': { color: 'e99695', description: 'PR is blocked by failing CI checks' },
  'has-conflicts': { color: 'b60205', description: 'PR has merge conflicts' },
  'changes-requested': { color: 'c2e0c6', description: 'Reviewer requested changes' },
  'ready-for-review': {
    color: '0e8a16',
    description: 'PR is ready for maintainer review',
  },
  'needs-maintainer-decision': {
    color: 'fbca04',
    description: 'PR is blocked on maintainer action',
  },
  'ci-broken-on-main': {
    color: 'd93f0b',
    description: 'CI is failing on the base branch',
  },
  stale: { color: 'eeeeee', description: 'PR has been inactive for a while' },
} as const;

export type ManagedLabel = keyof typeof MANAGED_LABELS;
const MANAGED_LABEL_NAMES = new Set(Object.keys(MANAGED_LABELS)) as Set<ManagedLabel>;

/**
 * Derives the desired set of bot-managed labels for a PR.
 */
export function deriveDesiredLabels(
  results: readonly RuleResult[],
  status: TriageStatus,
): Set<ManagedLabel> {
  const desired = new Set<ManagedLabel>();

  const failures = new Set(
    results.filter((r) => r.outcome === 'fail' && r.bucket === 'fact').map((r) => r.code),
  );

  if (failures.has('CI_FAILING')) desired.add('needs-ci-fix');
  if (failures.has('MERGE_CONFLICT')) desired.add('has-conflicts');
  if (failures.has('CHANGES_REQUESTED')) desired.add('changes-requested');
  if (failures.has('CI_BROKEN_ON_BASE')) desired.add('ci-broken-on-main');
  if (failures.has('STALE')) desired.add('stale');

  if (status === 'READY_FOR_REVIEW') desired.add('ready-for-review');
  if (status === 'BLOCKED_ON_MAINTAINER') desired.add('needs-maintainer-decision');

  return desired;
}

/**
 * Reconcile the desired managed labels with the actual labels present on the PR.
 * Never touches labels not in the MANAGED_LABELS set (maintainer-owned labels).
 */
export function reconcileLabels(
  desired: Set<ManagedLabel>,
  actual: readonly string[],
): { add: ManagedLabel[]; remove: ManagedLabel[] } {
  const actualSet = new Set(actual);

  const add: ManagedLabel[] = [];
  const remove: ManagedLabel[] = [];

  for (const label of MANAGED_LABEL_NAMES) {
    const isDesired = desired.has(label);
    const isActual = actualSet.has(label);

    if (isDesired && !isActual) {
      add.push(label);
    } else if (!isDesired && isActual) {
      remove.push(label);
    }
  }

  return { add, remove };
}

import type { Octokit } from 'octokit';

/**
 * Syncs the desired labels to the PR, creating them in the repo if they don't exist.
 * Reads the current labels from the PR to ensure zero API writes on unchanged state.
 */
export async function applyLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  desired: Set<ManagedLabel>,
): Promise<void> {
  const pr = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  const actual = pr.data.labels.map((l: any) => l.name);

  const { add, remove } = reconcileLabels(desired, actual);

  if (add.length === 0 && remove.length === 0) {
    return;
  }

  for (const label of add) {
    try {
      await octokit.rest.issues.getLabel({ owner, repo, name: label });
    } catch (e: any) {
      if (e.status === 404) {
        await octokit.rest.issues.createLabel({
          owner,
          repo,
          name: label,
          color: MANAGED_LABELS[label].color,
          description: MANAGED_LABELS[label].description,
        });
      } else {
        throw e;
      }
    }
  }

  if (add.length > 0) {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: pullNumber,
      labels: add,
    });
  }

  for (const label of remove) {
    try {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: pullNumber,
        name: label,
      });
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }
  }
}
