Carries PR-032 and PR-033, completing the remaining tasks for Sprint 1 sequentially.

## PR-032 — Mergeability rules: conflict and behind-base

Implemented synchronous rules for mergeability states within the `src/rules/mergeability.ts` file:

- `MERGE_CONFLICT`: Checks if `mergeableState === 'dirty'`. Fires a `fail` with `blocking` severity owned by the `contributor`. If `mergeableState === 'unknown'`, it safely handles the asynchronous limitation of GitHub's API by emitting an `info`/`skip` outcome, as the rule interface must treat it as _not knowable_ without network retries.
- `BEHIND_BASE`: Checks if `mergeableState === 'behind'`. Emits a `fail` with a `warning` severity (heuristic bucket) owned by the `contributor`, which aligns with the warn-only threshold mandate (never blocks the PR status).

## PR-033 — Review and draft rules

Implemented review state and draft tracking within the `src/rules/review.ts` file:

- `CHANGES_REQUESTED`: Validates unresolved review states. It maps the latest review state per author (ignoring `DISMISSED` reviews). If any reviewer's latest state remains `CHANGES_REQUESTED`, it fires a `fail` with `blocking` severity owned by the `contributor`. Subsequent approvals correctly clear the state.
- `DRAFT`: Directly checks `isDraft`. When `true`, it emits a `fail` with `wait` severity owned by the `contributor`, mapping natively to the `WAITING` status derivation.

## Testing against the archive

Both rule modules are wired into `src/rules/index.ts` and exhaustively tested against the 159-PR `corpus` using the `fixture harness` (`tests/rules/mergeability.test.ts` and `tests/rules/review.test.ts`). All rules successfully complete against the recorded `PullRequestContext` snapshots without errors, satisfying the Sprint 1 Definition of Done for fact rules.
