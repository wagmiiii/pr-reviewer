Carries PR-034 and PR-035, adding path, size, and contributor rules for Sprint 2.

## PR-034 — Path and size rules

Implemented rules to assess the physical size and location of changes in `src/rules/path.ts`:

* `TOUCHES_PROTECTED`: Uses a basic regex-based glob matcher. Warns if any modified file matches `config.protectedGlobs` (defaults to `.github/workflows/**`). Emits a `fail` with `blocking` severity owned by the `maintainer`.
* `HUGE_DIFF`: Aggregates the absolute sum of additions and deletions strictly from the `files` array (bypassing potential silent truncations from the PR diff body). If the size exceeds `config.hugeDiffThresholdLines` (default 500), it emits a `fail` with `warning` severity (heuristic bucket) owned by the `contributor`.

## PR-035 — Contributor rules: first-time, stale, DCO

Implemented contributor metadata rules in `src/rules/contributor.ts`:

* `FIRST_TIME_CONTRIBUTOR`: Identifies first-time committers via `authorAssociation` (`FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER`, `NONE`). It is strictly informational (`info` severity) and never blocks.
* `STALE`: Checks for the latest activity specifically from the contributor (their commits, their comments, their reviews). A `fail` fires with `wait` severity if days since activity exceed `config.staleDays` (default 14). Maintainer comments correctly bypass this check.
* `NO_DCO`: Skipped entirely unless `config.dcoEnabled` is true. When active, it scans all commit messages for the `Signed-off-by: ` string, emitting a `blocking` `fail` owned by the `contributor` if any commit is unsigned.

## Testing against the archive

Extended `src/types.ts` to accommodate the new configurable options, regenerated the JSON schema, and successfully verified all rules against the 159-PR `corpus` using the fixture harness.
