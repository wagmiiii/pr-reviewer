# Roadmap

Each phase is independently useful and independently shippable. Do not start a phase
until the previous one has run against a real repo with real PRs and hit its exit
criterion.

Auto-merge is not on this roadmap. It was removed from the project, not deferred.

---

## Phase −1 — Two checks before any code (a few hours)

Both can invalidate the plan. Doing them after building would be expensive.

1. **Fork-token verification.** Open a PR from a throwaway fork against a test repo.
   Run a workflow on `pull_request` requesting `pull-requests: write` and attempt a
   comment. Then repeat via `check_suite: completed`. Confirm which can write.
   *If neither can, Surface A is dead and the roadmap restarts at Surface B.*
2. ~~**Competitor research (30 min).**~~ **DONE** — `docs/spikes/competitors.md`
   (PR-002, 2026-08-05). One differentiator survived cleanly (blockage ownership), one
   narrowed to a GitHub-Actions implementation gap (actionable CI instructions), one
   died (issue-linkage verification, covered by free actions). A stronger argument
   emerged that was not on the original list: the alternative is 4–5 separate bots each
   posting their own comment, which recreates the problem this project exists to solve.
   Recommendation was **proceed with the pitch rewritten**.
3. **Cheapest possible premise test (new, from PR-002).** Install Mergify's conflict
   label and a linked-issue action on the real repo for one week. If that alone makes
   the queue tractable, PR-003 should be a no-go. An afternoon's work against a
   two-month build.

**Exit:** written answers to all three, committed to this repo.

---

## Phase 0 — Read-only observer (no AI, no writes)

Prove the collectors and fact rules produce a triage report worth trusting, without
touching anyone's repo.

- CLI: `pr-reviewer scan <owner>/<repo>` with a local token.
- `collect` + Bucket 1 fact rules, including `CI_BROKEN_ON_BASE`.
- Report to stdout, grouped by blockage owner.
- Fixture harness: record real `PullRequestContext` snapshots for tests.

**Exit criteria — measured, not judged.** The earlier "matches your own judgment" test
was circular: if it matches, it taught you nothing. Replace with:

- Run it against the repo that motivated this and hand-classify all open PRs yourself
  first. **Fact-rule disagreement with your classification must be zero** — a fact rule
  that's wrong is a bug, not a tuning problem.
- Record how long your manual pass took. The tool must make the same pass **under 2
  minutes**.
- It surfaces at least one PR whose blocking state you had misremembered.

---

## Phase 1 — Labels + sticky comment (GitHub Action)

Labels come first in this phase, not last. They are the cheapest way to make the
existing GitHub PR list usable, and plausibly most of the product's value.

- Package as an Action; adoption is one workflow file.
- Trigger model per `02-architecture.md`: `check_suite` + `schedule` for writes,
  `pull_request` for dry-run logging only.
- **Label reconciliation** — ship this first and use it alone for a week.
- Sticky comment, edited in place, state in the Actions cache with comment fallback.
- Actionable CI feedback: failing job, failing test name, log excerpt.
- Branch-update instructions for conflicts (safe ordering per Q6).
- `dry_run: true` documented as the default for first adoption.
- **Record your own verdict on every PR you review** — one line, agree/disagree with the
  bot's status. Cheap now, and it is the substrate Phase 3's shadow mode compares
  against. No separate labelling project; see Phase 3.

**Exit:** a week with zero manual "fix your CI" comments, ≈1 bot comment per PR, and no
contributor complaints about noise.

---

## Phase 2 — Maintainer digest *(conditional)*

**Do not start this phase without answering:** what does the digest show that
`is:pr is:open label:ready-for-review` does not? If the honest answer is "it's
prettier", skip to Phase 3 or stop.

If it clears that bar:

- Scheduled sweep over all open PRs; digest posted to a pinned issue, updated in place.
- Duplicate-PR detection (Bucket 2 — warn only, maintainer-facing).
- **Deterministic test checks** — `NO_TEST_CHANGED` (path glob) and `TESTS_REMOVED`
  (regex over deleted lines). These were J2 and J3 in the first draft's Phase 3; they
  need no model, no eval set, and no injection defence, and they are safe in the
  contributor comment. Shipping them here removes most of what the judgment layer was
  going to be for.
- Stale lifecycle: nudge → warn. **No auto-close** — closing a contributor's work stays
  a human decision.
- `pr-reviewer recommend`: audit the repo's own contribution setup (missing PR
  template, no required checks, no CONTRIBUTING). Prevention beats triage and this is
  cheap.

**Exit:** the digest is the first thing you open, ahead of the PR list.

---

## Phase 3 — Judgment layer *(two checks, shadow mode)*

The blockers that made this phase indefinite are resolved. Recorded here because the
resolutions are the reason the phase is small:

- **F6 was a measurement error.** The judge fires on a PR's *transition* into
  `READY_FOR_REVIEW`, not on a sweep of a queue that is mostly blocked. It runs once
  per eventually-reviewable PR. See F6 in `01-critique.md`.
- **J2 and J3 left.** They were a glob and a regex; they ship in Phase 2 without a
  model.
- **The 200-PR eval project is cancelled.** Replaced by shadow mode, below.
- **Q10 is downgraded** from a release blocker to a required output contract plus one
  adversarial fixture, because there is no merge capability left to attack.

Scope:

- **J1 issue-resolution** and **J7 effort-estimate**. Nothing else.
- Digest-only, permanently — neither has meaning for a contributor.
- Mandatory `file:line` evidence; responses without it are dropped, not repaired.
- `"unknown"` always permitted.
- Caching by `(check, head_sha, prompt_version)`.
- One adversarial injection fixture in the test suite.

**Shadow mode.** Run both checks from day one and write the verdict to the digest marked
as unvalidated. When you review that PR — which you were doing anyway — record whether
you agreed. That is paired labelled data collected as a side effect of existing work, at
zero marginal cost. No labelling project, no backlog.

**Exit:** three consecutive weeks in which J1 does not contradict your own conclusion on
a PR you reviewed. This gate is **qualitative and stated as such** — a small sample
cannot support a false-positive rate (P7), and a qualitative gate you actually apply
beats a statistical one you skip. Three weeks is a chosen number, not a derived one
[Guessing]; if you change it, record why.

**Kill condition:** if Phases 1–2 have made the queue tractable on labels and
deterministic checks alone, J1 is a nice-to-have and J7 is a novelty. Deciding not to
build this phase is a legitimate outcome, and now a cheap one — the sunk cost is days,
not the weeks the original scope implied.

---

## Phase 4 — Coverage integration

- Parse lcov/cobertura from CI artifacts; optional Codecov adapter.
- Report delta; flag drops beyond threshold as a maintainer-owned warning.
- Degrade honestly to "not reported" when unavailable.

---

## Phase 5 — Hosted GitHub App *(only if demanded)*

Webhook receiver, installation tokens, Postgres verdict history, cross-repo view.
Only worth building if multiple maintainers ask, or if Phase −1 shows the Action can't
write. The Action covers the single-repo case at zero operational cost.

---

## Deliberately excluded

- **Merging, in any form.** Removed from the project.
- **Auto-closing PRs.** Human decision, permanently.
- **Line-by-line review comments.** Crowded and noisy.
- **Bot-pushed rebases on contributor branches.** Surprising and unsafe.
- **A web UI** before the CLI and Action are demonstrably useful.

## Metrics from Phase 1

- Median time-to-first-actionable-feedback (expect one CI cycle, not seconds).
- Manual maintainer comments per week for mechanical issues → should reach zero.
- Bot comments per PR → should stay ≈1.
- Fact-rule false positives → must be zero; each one is a bug.
- Heuristic-rule false-positive rate → tune thresholds against this, not against
  intuition.
- PRs blocked-on-contributor that self-resolve without a maintainer touch.
