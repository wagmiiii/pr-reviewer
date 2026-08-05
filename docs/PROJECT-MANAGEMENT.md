# Project management

Backup of the Notion board. The Notion **Sprint Board** is the working copy; this file
is the durable record so the plan survives independently of a SaaS account.

Board: `PR Reviewer — Scrum` → `Sprint Board` database.
Ticket refs (`PR-0xx`) are stable and match the `Ref` column exactly.

---

## Team and tracks

| Person | Track | Owns |
|---|---|---|
| **Allison Muyideen** | Rules | Rules engine, renderers, all contributor-facing copy, every product decision |
| **Ademola Ajala** | Platform | GitHub API integration, collectors, Action packaging, state, delivery |

The split is deliberate. The two tracks meet at exactly one place: the
`PullRequestContext` type (PR-011). Define that type jointly and first; after that the
tracks run in parallel with almost no merge conflicts and almost no blocking.

Allison owns product decisions because she lived the problem. Ademola owns platform
because he owns the GitHub repo and the org.

---

## Process

We are two people. Full Scrum ceremony for a team of two costs roughly a day per sprint
and buys very little. What the board actually supports:

- **Kanban with a weekly cadence.** Sprint columns exist for planning and reporting, but
  work is pulled continuously rather than frozen into a sprint scope.
- **WIP limit: 2 per person**, counting In Progress + In Review together. This is the
  single most valuable constraint on the board. Without it the board is a to-do list.
- **Weekly 30-minute sync (Monday).** What moved, what is blocked, re-order Ready. This
  replaces planning, review, and standup.
- **Retro every 4 weeks, 30 minutes.** Keep / drop / change. Three questions, nothing else.
- **No estimation ritual.** Points are set once by whoever writes the ticket. A task that
  turns out larger than 5 gets split, not re-estimated.

Promote to real Scrum only if the team grows past two.

### Priority levels

| Level | Meaning |
|---|---|
| **P0 Critical** | Blocks other work or gates a go/no-go. Nothing else starts while a P0 is open. |
| **P1 High** | Required for the next shippable milestone. |
| **P2 Medium** | Real value, deferrable without breaking a milestone. |
| **P3 Low** | Conditional on a gate not yet passed. Do not start. May be deleted rather than done. |

### Estimation scale

Fibonacci, sized on effort and uncertainty together.

`1` under an hour · `2` half a session · `3` one session, minor unknowns ·
`5` multiple sessions or one real unknown · `8` **too big, split it** — there are no 8s
on this board by design.

Assumed capacity: **10–12 points per person per week**. That is a guess until Sprint 1
completes. Correct it from actuals; do not defend it.

### Definition of Ready

- Acceptance criteria written and testable
- Owner assigned
- Points assigned, value ≤ 5
- Blocking dependencies closed or explicitly waived
- Rules/output work: relevant `docs/` section linked or updated

### Definition of Done

- Merged to `main` via PR, reviewed by the other person
- Tests passing, including a fixture-based test for rule work
- `docs/` updated if behaviour or config changed — the planning docs are the spec, and
  drift is a bug
- No new lint or typecheck errors
- **Fact rules only: zero disagreements with hand classification.** A wrong fact rule is
  a bug, not a tuning problem.

---

## Decision gates

Five tickets can legitimately end or redirect the project. They are tickets, not
conversations, and each is answered in writing and committed to `docs/decisions/`.

| Ref | Gate | Can it stop the project? |
|---|---|---|
| PR-003 | Go / no-go after spike + competitor research | **Yes** — adopt an existing tool and stop |
| PR-042 | Phase 0 exit measurement | Blocks all Phase 1 investment |
| PR-062 | Labels-only trial findings | Feeds PR-090 |
| PR-090 | Does the digest beat a saved search? | **Yes** — skips epic E9 |
| PR-100 | Build the judgment layer at all? | **Yes** — skips epic E10 |

A plan that cannot be cancelled is not a plan.

---

## Sprint plan

| Sprint | Weeks | Goal | Exit criterion | Ademola | Allison | Joint | Total |
|---|---|---|---|---|---|---|---|
| Sprint 0 | 1 | Validation + scaffold | Go/no-go answered in writing | 8 | 3 | 4 | 15 |
| Sprint 1 | 2 | Context type, collectors, fact rules | Rules run green against fixtures | 18 | 18 | — | 36 |
| Sprint 2 | 2 | Phase 0 CLI | Scan beats a timed manual pass | 11 | 13 | 3 | 27 |
| Sprint 3 | 2 | Action delivery + labels | Labels live on a real repo | 13 | 10 | 2 | 25 |
| Sprint 4 | 2 | Sticky comment | A week with zero manual "fix your CI" comments | 12 | 13 | — | 25 |

Scheduled total: **128 points**. Unscheduled backlog: **50 points**.

Sprint 1 runs at 9 points per person per week against an assumed 10–12. The slack is
deliberate — it is the sprint with the most unknowns in it.

Re-plan after Sprint 4. Everything beyond it is conditional on a gate.

---

## Backlog

Status of every ticket at time of writing: `Ready` for PR-001, PR-002, PR-010;
`Backlog` for everything else.

### Sprint 0 — Validation and scaffold

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-001 | Spike: can the Action write on fork PRs? | Ademola | P0 | 3 | Spike | — |
| PR-002 | Competitor research: does this already exist? | Allison | P0 | 2 | Spike | — |
| PR-003 | Decision: go / no-go / pivot | Joint | P0 | 1 | Decision | PR-001, PR-002 |
| PR-010 | Repo scaffold: TypeScript, Node 24, tooling | Ademola | P0 | 3 | Chore | — |
| PR-011 | Define the `PullRequestContext` type | Joint | P0 | 3 | Feature | PR-010 |
| PR-013 | CI for this repo: lint, typecheck, test | Ademola | P1 | 2 | Chore | PR-010 |
| PR-014 | CONTRIBUTING and Definition of Done in repo | Allison | P2 | 1 | Docs | — |

### Sprint 1 — Collectors and fact rules

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-012 | Fixture harness: record and replay real PRs | Allison | P0 | 5 | Test | PR-011 |
| PR-020 | Octokit client: auth, rate limits, retries | Ademola | P0 | 3 | Feature | PR-010 |
| PR-021 | Collect PR core: metadata, reviews, commits, files | Ademola | P0 | 3 | Feature | PR-011, PR-020 |
| PR-022 | Collect check runs and resolve required checks | Ademola | P0 | 5 | Feature | PR-020 |
| PR-023 | Collect base-branch check status | Ademola | P0 | 5 | Feature | PR-022 |
| PR-026 | Diff fetch with size cap | Ademola | P1 | 2 | Feature | PR-020 |
| PR-030 | Rule interface, registry, status derivation | Allison | P0 | 3 | Feature | PR-011 |
| PR-031 | CI rules: FAILING, BROKEN_ON_BASE, PENDING, MISSING | Allison | P0 | 5 | Feature | PR-022, PR-023, PR-030 |
| PR-032 | Mergeability rules: conflict and behind-base | Allison | P0 | 3 | Feature | PR-030 |
| PR-033 | Review and draft rules | Allison | P1 | 2 | Feature | PR-030 |

### Sprint 2 — Phase 0 CLI

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-024 | Fetch failing-job logs and extract the useful excerpt | Ademola | P1 | 5 | Feature | PR-022 |
| PR-025 | Collect linked issues | Ademola | P1 | 3 | Feature | PR-020 |
| PR-034 | Path and size rules | Allison | P1 | 2 | Feature | PR-030 |
| PR-035 | Contributor rules: first-time, stale, DCO | Allison | P1 | 3 | Feature | PR-021, PR-030 |
| PR-036 | Fact-rule test suite with a zero-false-positive gate | Allison | P0 | 5 | Test | PR-012, PR-031/2/3 |
| PR-040 | CLI: scan command and config loader | Ademola | P0 | 3 | Feature | PR-021, PR-030 |
| PR-041 | Terminal report renderer grouped by blockage owner | Allison | P0 | 3 | Feature | PR-040 |
| PR-042 | Phase 0 exit measurement | Joint | P0 | 3 | Decision | PR-036, PR-041 |

### Sprint 3 — Action delivery and labels

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-050 | Action packaging and release | Ademola | P1 | 5 | Feature | PR-042 |
| PR-051 | Trigger wiring: check_suite, schedule, dry-run pull_request | Ademola | P1 | 3 | Feature | PR-001, PR-050 |
| PR-052 | State store: Actions cache with comment fallback | Ademola | P1 | 5 | Feature | PR-050 |
| PR-053 | Dry-run mode end to end | Allison | P1 | 2 | Feature | PR-051 |
| PR-054 | Verdict hashing and the noise budget | Allison | P1 | 3 | Feature | PR-052 |
| PR-060 | Label reconciliation | Allison | P1 | 3 | Feature | PR-051 |
| PR-061 | Label config and prefix support | Allison | P2 | 2 | Feature | PR-060 |
| PR-062 | One-week labels-only trial | Joint | P1 | 2 | Decision | PR-060 |

### Sprint 4 — Sticky comment

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-070 | Sticky comment upsert by marker | Ademola | P1 | 5 | Feature | PR-052, PR-054 |
| PR-071 | Comment renderer: status, fixes, notes, checklist | Allison | P1 | 5 | Feature | PR-070 |
| PR-072 | CI failure formatting in the comment | Allison | P1 | 5 | Feature | PR-024, PR-071 |
| PR-073 | Branch-update instructions for conflicts | Allison | P1 | 3 | Feature | PR-071 |
| PR-074 | `no-bot` opt-out label | Ademola | P2 | 2 | Feature | PR-070 |
| PR-080 | Heuristic bucket with warn-only enforcement | Ademola | P2 | 2 | Feature | PR-030 |
| PR-081 | `NO_TEST_CHANGED` and `TESTS_REMOVED` | Ademola | P2 | 3 | Feature | PR-080 |

### Unscheduled — gated on a decision

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-082 | Issue-linkage heuristics | Allison | P2 | 3 | Feature | PR-025, PR-080 |
| PR-083 | Duplicate-PR detection and threshold tuning | Ademola | P2 | 5 | Feature | PR-080 |
| PR-084 | `NEW_DEPENDENCY` detection (npm only) | Ademola | P2 | 3 | Feature | PR-080 |
| PR-085 | `POSSIBLE_SECRET` detection | Ademola | P3 | 3 | Feature | PR-080 |
| PR-090 | **Decision: does the digest beat a saved search?** | Joint | P2 | 1 | Decision | PR-062 |
| PR-091 | Scheduled sweep across all open PRs | Ademola | P2 | 3 | Feature | PR-090 |
| PR-092 | Digest renderer and pinned-issue upsert | Allison | P2 | 5 | Feature | PR-091 |
| PR-093 | Stale nudge lifecycle | Allison | P2 | 3 | Feature | PR-091 |
| PR-094 | `pr-reviewer recommend`: audit the repo's own setup | Ademola | P2 | 5 | Feature | — |
| PR-100 | **Decision: build the judgment layer at all?** | Joint | P3 | 1 | Decision | PR-081, PR-090 |
| PR-101 | Model provider interface and prompt versioning | Ademola | P3 | 5 | Feature | PR-100 |
| PR-102 | J1 issue-resolution with mandatory citations | Allison | P3 | 5 | Feature | PR-101 |
| PR-103 | J7 reviewer effort estimate | Allison | P3 | 3 | Feature | PR-101 |
| PR-104 | Shadow mode and the agreement log | Allison | P3 | 3 | Feature | PR-102 |
| PR-105 | Adversarial prompt-injection fixture | Ademola | P3 | 2 | Test | PR-102 |

---

## Critical path

```
PR-001 ─┐
        ├─▶ PR-003 ─▶ (all Sprint 1)
PR-002 ─┘

PR-010 ─▶ PR-011 ─┬─▶ PR-020 ─▶ PR-022 ─▶ PR-023 ─▶ PR-031 ─┐
                  │                                          ├─▶ PR-036 ─▶ PR-042
                  └─▶ PR-030 ─▶ PR-032, PR-033 ──────────────┘        │
                                                                      ▼
                                            PR-050 ─▶ PR-051 ─▶ PR-060 ─▶ PR-062 ─▶ PR-090
```

**PR-011 is the chokepoint.** Nothing meaningful parallelises until it exists. Do it in
one joint sitting in week 1 rather than letting it drift.

**PR-001 is the risk.** If fork tokens cannot write on any acceptable trigger, PR-051
and everything downstream of it change shape, and the project becomes hosted
infrastructure rather than a weekend Action. Find out in week 1, not month 2.

---

## Risks on the board

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fork tokens cannot write | Medium | Kills Surface A | PR-001, first ticket in the plan |
| Mergify already does this | Medium | Ends the project | PR-002, timeboxed to an hour |
| PR-011 churns after tracks start | Medium | Constant merge conflicts | Joint design, both review, freeze before PR-020 |
| Heuristic thresholds are guesses | **High** | False positives erode trust | Warn-only by construction (PR-080), tuning logs committed |
| Comment tone alienates contributors | Medium | Community incident | PR-071 copy reviewed by both; contributor text is mechanics only |
| Scope drift into line-by-line review | Medium | Loses to funded competitors | Listed as a non-goal in `docs/00-concept.md` |

---

## Keeping this file honest

Notion is the working copy; this file is the record. Refresh it at each retro — the
sprint tables and point totals, not every status change. If the two disagree about
scope, Notion wins; if they disagree about *why* a decision was made, the
`docs/decisions/` files win.
