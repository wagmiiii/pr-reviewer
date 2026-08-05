# Review pipeline specification

## Gate rules (deterministic)

Each rule has a stable code, an owner (who must act), and a severity.
`block` = PR cannot be ready. `warn` = surfaced but not blocking.

| Code | Condition | Owner | Severity |
|---|---|---|---|
| `CI_FAILING` | any required check concluded failure/timed_out | contributor | block |
| `CI_PENDING` | required checks still running | — | wait |
| `CI_MISSING` | a required check never ran | maintainer | block |
| `MERGE_CONFLICT` | `mergeable_state` is `dirty` | contributor | block |
| `BEHIND_BASE` | commits behind base > threshold | contributor | warn |
| `DRAFT` | PR is a draft | contributor | wait |
| `NO_LINKED_ISSUE` | no `Fixes #N` / no issue reference | contributor | warn |
| `ISSUE_ALREADY_CLOSED` | linked issue already closed | maintainer | warn |
| `ISSUE_CLAIMED_ELSEWHERE` | another open PR links the same issue | maintainer | warn |
| `DUPLICATE_FILES` | >70% file overlap with another open PR | maintainer | warn |
| `STALE` | no contributor activity in N days | contributor | warn |
| `CHANGES_REQUESTED` | unresolved requested-changes review | contributor | block |
| `TOUCHES_WORKFLOWS` | diff touches `.github/workflows/**` | maintainer | block |
| `TOUCHES_PROTECTED` | diff touches configured protected paths | maintainer | block |
| `NEW_DEPENDENCY` | lockfile/manifest adds a dependency | maintainer | warn |
| `HUGE_DIFF` | changed lines above threshold | maintainer | warn |
| `NO_DCO` | commits unsigned when DCO required | contributor | block |
| `FIRST_TIME_CONTRIBUTOR` | author has no merged PR here | — | info |

Status derivation:

- any `block` owned by contributor → `BLOCKED_ON_CONTRIBUTOR`
- any `block` owned by maintainer → `BLOCKED_ON_MAINTAINER`
- any `wait` → `WAITING`
- otherwise → `READY_FOR_REVIEW`
- `READY_FOR_REVIEW` + auto-merge allowlist satisfied → `AUTO_MERGEABLE`

## Judgment checks (advisory only)

Run only when status is not `BLOCKED_ON_CONTRIBUTOR`. Each returns
`{verdict: yes|no|unknown, confidence, evidence[], note}`.

- **J1 issue-resolution** — Does the diff plausibly implement what the linked issue
  asks? Inputs: issue title/body, diff summary, changed file paths.
- **J2 test-presence** — Is new/changed behaviour covered by a new or modified test?
  Deterministic pre-filter: did any test-path file change at all?
- **J3 test-deletion** — Were assertions or test cases removed or skipped? High-signal,
  low-false-positive; worth surfacing loudly.
- **J4 description-accuracy** — Does the PR description match what the diff does?
- **J5 scope-creep** — Unrelated changes bundled in (reformatting, version bumps,
  drive-by refactors)?
- **J6 risk-flags** — Apparent secrets, disabled security checks, permission widening,
  network calls added to build scripts.
- **J7 effort-estimate** — Rough reviewer minutes + a one-line "what to look at first".
  This is the single most useful output for ranking the queue.

Coverage is **not** a judgment check. It is a collector: parse lcov/cobertura from CI
artifacts or Codecov, compute delta against base, report the number or report
"not available". No model involved.

## Auto-merge policy

Disabled by default. When enabled, **all** of these must hold — no exceptions, no model
input:

1. `AUTO_MERGEABLE` status (every gate rule passed).
2. Every required check green, and at least one required check exists.
3. Zero conflicts, not behind base beyond threshold.
4. Diff confined to paths in `automerge.allow_paths` (default: docs, README, comments
   only).
5. Diff size under `automerge.max_lines` (default 50).
6. Author is in `automerge.trusted_authors`, or has ≥ N previously merged PRs.
7. No maintainer-owned warn rules fired.
8. Not a first-time contributor unless explicitly permitted.

Mechanism: enable GitHub's native auto-merge on the PR rather than calling the merge
endpoint directly, so branch protection remains the final authority. Log every
auto-merge to the digest.

**Never auto-mergeable:** anything touching workflows, CI config, dependency manifests,
build scripts, or auth/security paths — regardless of size or author.

## Output surfaces

### 1. Sticky PR comment (contributor-facing)

One comment, edited in place, marked with `<!-- pr-reviewer:v1 -->` and carrying a
hidden JSON state block for the next run. Sections, in order, omitted when empty:

1. **Status line** — one sentence: what's blocking, who owns it.
2. **What to fix** — only contributor-owned failures, each with concrete remediation:
   the failing test name plus ~20 log lines for CI; a filled-in rebase command block
   for conflicts.
3. **Checklist** — passed checks, collapsed by default.
4. Nothing else. No praise, no summary of the diff, no line-by-line notes.

Rewrite only when the head SHA changed *and* the material verdict changed.

### 2. Maintainer digest (the actual product)

Posted to a pinned issue, or a scheduled comment, or a dashboard later. Ranked:

```
Ready for you (3)
  #412  Fix retry backoff        · 8 min · tests added · closes #388
  #401  Add Postgres adapter     · 25 min · no tests ⚠ · closes #390
  ...
Blocked on contributor (12)   — CI failing 7, conflicts 4, changes requested 1
Needs your decision (2)       — #377 touches workflows · #380 no linked issue
Stale > 30d (5)               — nudged, close on <date>
Possible duplicates (1)       — #395 / #402 both touch src/auth/*
```

Ranking = readiness first, then reviewer-effort ascending (cheap wins first), then age.

### 3. Labels

Reconciled to match state: `needs-ci-fix`, `has-conflicts`, `ready-for-review`,
`needs-maintainer-decision`, `stale`. Labels make the GitHub PR list itself usable,
which is high value for low effort.

## Noise budget

- Max 1 comment edit per PR per push event.
- Max 1 new comment per PR ever (subsequent updates are edits).
- No nudge on the same PR more than once per `stale.nudge_interval_days`.
- If a run produces the same verdict hash as the last run: do nothing at all.
