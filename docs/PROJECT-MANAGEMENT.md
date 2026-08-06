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
| PR-042 | Phase 0 exit measurement — **restated against the 162-PR corpus, 2026-08-05** | Blocks all Phase 1 investment |
| PR-062 | Labels-only trial findings — **deferred, needs live traffic** | Feeds PR-090, which is therefore also stalled |
| PR-090 | Does the digest beat a saved search? | **Yes** — skips epic E9 |
| PR-100 | Build the judgment layer at all? | **Yes** — skips epic E10 |

A plan that cannot be cancelled is not a plan.

---

## Sprint plan

| Sprint | Weeks | Goal | Exit criterion | Ademola | Allison | Joint | Total |
|---|---|---|---|---|---|---|---|
| Sprint 0 | 1 | Validation + scaffold | Go/no-go answered in writing | 8 | 5 | 4 | 17 |
| Sprint 1 | 2 | Context type, collectors, fact rules | Rules run green against fixtures | 18 | 18 | — | 36 |
| Sprint 2 | 2 | Phase 0 CLI | Scan beats a timed manual pass | 11 | 13 | 3 | 27 |
| Sprint 3 | 2 | Action delivery + labels | Labels reconcile correctly over replayed PRs, live on the repo in dry-run | 13 | 10 | 2 | 25 |
| Sprint 4 | 2 | Sticky comment | Comment bodies render for all 162 replayed PRs; noise gate deferred | 12 | 13 | — | 25 |

Scheduled total: **128 points**. Unscheduled backlog: **50 points**.

Sprint 3 and Sprint 4 exit criteria were rewritten on 2026-08-05. They previously read
"labels live on a real repo" and "a week with zero manual 'fix your CI' comments", both of
which need a live PR queue that no longer exists. The replacements test the same code
against replayed history. **They are weaker**: they prove the writers behave correctly,
not that the output reduces anyone's workload. The noise and workload halves of those
gates are deferred until a contributor wave arrives, and are recorded as open in
`docs/04-roadmap.md` rather than quietly dropped. [Certain]

Sprint 1 runs at 9 points per person per week against an assumed 10–12. The slack is
deliberate — it is the sprint with the most unknowns in it.

Re-plan after Sprint 4. Everything beyond it is conditional on a gate.

---

## Backlog

Status of every ticket at time of writing: `Done` for PR-001, PR-002, PR-003, PR-004, PR-005, PR-010, PR-011, PR-013, PR-014, PR-020, PR-021, PR-022, PR-023; `In Progress` for PR-026; `Ready` for PR-012; `Backlog` for everything else.

### Sprint 0 — Validation and scaffold

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-001 | Spike: can the Action write on fork PRs? | Ademola | P0 | 3 | Spike | — |
| PR-002 | Competitor research: does this already exist? — **findings in `docs/spikes/competitors.md`** | Allison | P0 | 2 | Spike | — |
| PR-004 | Premise test — **ANSWERED against the archive, see `docs/spikes/premise-test.md`** | Allison | P0 | 2 | Spike | — |
| PR-005 | **Archive the 162-PR corpus — time-sensitive, logs are decaying** | Ademola | P0 | 3 | Spike | — |
| PR-003 | Decision: go / no-go / pivot — **DECIDED: GO, scoped to PR-042. `docs/decisions/PR-003-go-no-go.md`. Countersigned.** | Joint | P0 | 1 | Decision | — |
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
| PR-041 | Terminal report renderer grouped by blockage owner — **re-spec maintainer-first before building, PR-003** | Allison | P0 | 3 | Feature | PR-040 |
| PR-042 | Phase 0 exit measurement — **criterion restated against replayed history, see `docs/04-roadmap.md`** | Joint | P0 | 3 | Decision | PR-005, PR-036, PR-041 |

### Sprint 3 — Action delivery and labels

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-050 | Action packaging and release | Ademola | P1 | 5 | Feature | PR-042 |
| PR-051 | Trigger wiring: **workflow_run** + schedule, dry-run pull_request — **`check_suite` rejected by PR-003; needs a tested no-checkout invariant** | Ademola | P1 | 3 | Feature | PR-001, PR-050 |
| PR-052 | State store: Actions cache with comment fallback | Ademola | P1 | 5 | Feature | PR-050 |
| PR-053 | Dry-run mode end to end | Allison | P1 | 2 | Feature | PR-051 |
| PR-054 | Verdict hashing and the noise budget | Allison | P1 | 3 | Feature | PR-052 |
| PR-060 | Label reconciliation | Allison | P1 | 3 | Feature | PR-051 |
| PR-061 | Label config and prefix support | Allison | P2 | 2 | Feature | PR-060 |
| PR-062 | One-week labels-only trial — **deferred until a contributor wave arrives; needs live traffic** | Joint | P1 | 2 | Decision | PR-060 |

### Sprint 4 — Sticky comment

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-070 | Sticky comment upsert by marker | Ademola | P1 | 5 | Feature | PR-052, PR-054 |
| PR-071 | Comment renderer: status, fixes, notes, checklist — **re-spec maintainer-first before building, PR-003** | Allison | P1 | 5 | Feature | PR-070 |
| PR-072 | CI failure formatting in the comment | Allison | P1 | 5 | Feature | PR-024, PR-071 |
| PR-073 | Branch-update instructions for conflicts | Allison | P1 | 3 | Feature | PR-071 |
| PR-074 | `no-bot` opt-out label | Ademola | P2 | 2 | Feature | PR-070 |
| PR-080 | Heuristic bucket with warn-only enforcement | Ademola | P2 | 2 | Feature | PR-030 |
| PR-081 | `NO_TEST_CHANGED` and `TESTS_REMOVED` | Ademola | P2 | 3 | Feature | PR-080 |

### Unscheduled — gated on a decision

| Ref | Task | Owner | Pri | Pts | Type | Blocked by |
|---|---|---|---|---|---|---|
| PR-082 | ~~Issue-linkage heuristics~~ — **DROPPED by PR-003; folded into PR-094 as a recommendation** | Allison | P3 | 0 | Feature | — |
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

### Backlog changes

Recorded so the reasoning survives, rather than silently editing rows.

| Date | Change | Why |
|---|---|---|
| 2026-08-05 | **PR-082 demoted P2 → P3** | PR-002 found `nearform/github-action-check-linked-issues` does this better than our planned regex, including cross-repo references. Either adopt their matching logic or reduce PR-082 to "recommend their action" inside PR-094. |
| 2026-08-05 | **PR-004 added, P0, Sprint 0** | PR-002 surfaced a cheaper test of the premise than anything else on the board: install the existing tools for a week first. Now blocks PR-003. |
| 2026-08-05 | **PR-004 blocked and redesigned** | No repo has any open PRs. The contributor wave on `Tollcraft/soroban-cost-linter` (162 PRs, ~65 contributors) ran 2026-07-06 to 2026-08-04 and is over. "Install and wait a week" measures nothing. Redesigned as install + archive + retrospective replay. See `docs/spikes/premise-test.md`. |
| 2026-08-06 | **PR-003 drafted: GO, scoped to PR-042 only** | The evidence supports a small sharp tool, not the 128-point plan. Authorises Sprint 0–2 (~53 points); Sprints 3–4 stay drafted and unauthorised. Pitch changes: lead with blockage ownership and `CI_BROKEN_ON_BASE`, drop issue linkage, add the single-bot/noise-budget argument. Kill criteria written into the decision. Not decided until both people sign. |
| 2026-08-06 | **`check_suite: completed` rejected as the write trigger** | PR-001 found it does not fire when the check suite was created by GitHub Actions, which is 100% of suites on the target repo — it would have fired zero times. `docs/02-architecture.md` records it as Chosen and `docs/01-critique.md` P1 gives it as the resolution; both need amending. Replacement (`workflow_run` vs `pull_request_target`) deliberately left to PR-051, which must also encode "never check out contributor code" as a tested invariant. |
| 2026-08-06 | **Output design may be aimed at the wrong reader** | 63 of the 71 failing PRs were "your `main` is broken" findings, not "your PR is broken". That is maintainer-facing; the roadmap assumes contributor-facing. Flagged against PR-041 and PR-071, unresolved. |
| 2026-08-06 | **PR-003 DECIDED: GO, scoped to PR-042. Product owner signed; platform countersignature outstanding** | Recommendation accepted in full. Only Sprint 0–2 (~53 of 128 points) is authorised; Sprints 3–4 stay drafted. Consequences applied to `docs/00-concept.md`, `docs/01-critique.md`, `docs/02-architecture.md` and `README.md` in the same pass rather than left as follow-ups. |
| 2026-08-06 | **Trigger resolved: `workflow_run: completed` + `schedule`** | `check_suite` rejected — zero fires. `pull_request_target` recorded as documented fallback rather than rejected, since the exploit requires checking out contributor code and this design never does. Both bound by a **tested** "never check out or execute contributor code" invariant. Recorded against the platform track; PR-051 confirms or overturns on evidence. |
| 2026-08-06 | **Product is maintainer-first, contributor-second** | 63 of 71 findings say "your `main` is broken", which is not a message to a drive-by contributor. PR-041 and PR-071 carry a re-spec flag and must be re-pointed before Sprint 2, not after. Largest single consequence of the gate. |
| 2026-08-06 | **PR-082 dropped, 3 points → 0** | PR-003 finalised the PR-002 finding: nearform's action does linked-issue checking better than the planned regex. Reduced to a recommendation emitted by PR-094. Not worth building a worse version of something free. |
| 2026-08-06 | **PR-004 re-scoped from "install and wait" to "measure against the archive" — now answered** | The original design needed an open PR queue and there isn't one. Re-scoped to direct counts over the 159-PR archive, which needs no rules engine and so runs now rather than after Sprint 1. Method and full findings in `docs/spikes/premise-test.md`; raw output in `docs/spikes/premise-findings.json`; script is `corpus/premise.sh`. |
| 2026-08-06 | **PR-003 unblocked** | Its three inputs are all answered: PR-001 Done (with a live disagreement on the trigger, carried into the decision), PR-002 Done, PR-004 answered. Nothing is waiting on PR-005, which was never a real dependency of the decision — only of the measurement. |
| 2026-08-06 | **Premise confirmed, but re-framed — differentiator #1 should lead PR-003** | 63 of the 71 PRs with a failing check (88.7%) were failing a check *already failing on their base commit*. The nag was misdirected nearly nine times in ten. The product argument moves from "automate the nagging" to "stop sending the wrong nag". Countervailing: 78 maintainer comments in a month is not drowning, and only 8 PRs in the whole history had a genuine contributor-caused break on a green base. Both sides are written up rather than just the supporting one. |
| 2026-08-05 | **PR-005 added, P0, Sprint 0** | The 162-PR history is the evidence base for PR-003, PR-012's fixture corpus, and the only way to validate PR-024 — and Actions logs are decaying now. Only genuinely time-sensitive ticket on the board. |
| 2026-08-05 | **PR-042 exit criterion rewritten — done** | It assumed an open queue to hand-classify. There isn't one. Now measured by retrospective replay: blind hand-classification of a seeded random sample of 40 of the 162 archived PRs, committed before the run; **zero fact-rule disagreements** required; plus a reported `CI_BROKEN_ON_BASE` count over all 162 (differentiator #1, countable from history, reported not thresholded); scan of all 162 replayed PRs under 2 minutes. Now also blocked by PR-005, since it needs the archive. Full text in `docs/04-roadmap.md`. |
| 2026-08-05 | **Live-traffic exit criteria marked deferred, not rewritten** | Phase 1's noise gate (≈1 bot comment per PR, zero manual "fix your CI" comments, no contributor complaints), Phase 2's "digest is the first thing you open", Phase 3's three-week shadow-mode agreement gate, and PR-062's one-week labels trial all measure maintainer or contributor behaviour under the bot. A replay posts nothing and has no clock, so none of them has an honest retrospective substitute. Marked deferred until a wave arrives rather than downgraded into something weaker that would read as passed. |
| 2026-08-05 | **Phase 1 metrics list split into measurable / deferred** | Fact-rule false positives, the `CI_BROKEN_ON_BASE` count, and heuristic tuning survive as replay measurements. Median time-to-first-actionable-feedback, bot comments per PR, manual comments per week, and PRs that self-resolve do not — the historical figures are baselines for a future live comparison, not results. Recorded in `docs/04-roadmap.md` and `docs/00-concept.md`. |
| 2026-08-05 | **Sprint 3 and Sprint 4 exit criteria rewritten** | "Labels live on a real repo" and "a week with zero manual 'fix your CI' comments" both need an open queue. Replaced with replay-based criteria over the corpus, with the workload half of each explicitly deferred. The replacements are weaker and the sprint table says so. |
| 2026-08-05 | **Bucket 2 threshold tuning re-sourced** | `docs/03-review-pipeline.md` said thresholds would be tuned "against a real queue". Now tuned against the archive. `DUPLICATE_FILES` and `ISSUE_CLAIMED_ELSEWHERE` need concurrently-open PRs reconstructed from open/close timestamps, which is a reconstruction rather than an observation. Noted in the doc. |

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
| No live traffic to validate against | **Certain, already happened** | Every behavioural exit criterion is unmeasurable | Retrospective replay over the 162-PR archive for rule correctness; behavioural gates explicitly deferred rather than faked. Accept that Phase 1+ ships partly unvalidated. |
| Contributor waves are episodic, not continuous | Unknown [Guessing — one observed wave] | The tool only has value during a wave, which weakens the case for building it | State it plainly at PR-003. One wave is not a pattern; check whether earlier waves exist on other repos before treating it as either a rule or an outlier. |

---

## Keeping this file honest

Notion is the working copy; this file is the record. Refresh it at each retro — the
sprint tables and point totals, not every status change. If the two disagree about
scope, Notion wins; if they disagree about *why* a decision was made, the
`docs/decisions/` files win.
