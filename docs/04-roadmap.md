# Roadmap

Each phase is independently useful and independently shippable. Do not start a phase
until the previous one has hit its exit criterion against real PR data.

Auto-merge is not on this roadmap. It was removed from the project, not deferred.

**Correction, 2026-08-05.** This roadmap was written assuming a live queue of open PRs to
measure against. There isn't one. Every repo the team owns has **zero** open PRs; the
contributor wave on `Tollcraft/soroban-cost-linter` (162 PRs, ~65 external contributors)
ran 2026-07-06 to 2026-08-04 and has ended [Certain — GitHub API, see
`docs/spikes/premise-test.md`]. Exit criteria below have been rewritten to run against
that 162-PR historical corpus by **retrospective replay**: fetch the PRs as fixtures, run
the fact rules over them, compare what the rules would have said against what actually
happened.

Retrospective replay cannot measure everything the live criteria measured. Where a
criterion genuinely needs live traffic it is marked **deferred until a wave arrives**
rather than rewritten into a weaker retrospective proxy. Specifically, a replay cannot
measure comment volume per PR (noise), cannot measure time-to-first-feedback, and cannot
measure whether the maintainer's experience improves. It measures rule accuracy and
nothing else. [Certain]

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
3. ~~**Cheapest possible premise test — install Mergify plus a linked-issue action for one
   week and see if the queue becomes tractable.**~~ **BLOCKED as designed, redesigned** —
   `docs/spikes/premise-test.md` (PR-004, 2026-08-05). There is no queue left to make
   tractable. Replaced by **install + archive + replay**: install the configs anyway
   (cost is zero, traffic is non-zero, and it is in place if another wave arrives),
   archive the 162-PR corpus before Actions logs age out (PR-005), and answer the premise
   question by replaying the fact rules over that history.

   The replay's decisive output for PR-003 is **how many of the 162 PRs had a required
   check failing that was also failing on the base branch at the time**. That is
   differentiator #1, it is directly countable from history, and a low count kills the
   claim outright. [Certain that it is countable; Guessing what the count is]

**Exit:** written answers to all three, committed to this repo. Note that answer 3 is now
evidence about what the rules *would have* said, not about whether a real week of triage
got easier. The premise test got stronger on sample size (N=162 rather than a week's
trickle) and weaker on realism. State both at the go/no-go. [Certain]

---

## Phase 0 — Read-only observer (no AI, no writes)

Prove the collectors and fact rules produce a triage report worth trusting, without
touching anyone's repo.

- CLI: `pr-reviewer scan <owner>/<repo>` with a local token.
- `collect` + Bucket 1 fact rules, including `CI_BROKEN_ON_BASE`.
- Report to stdout, grouped by blockage owner.
- Fixture harness: record real `PullRequestContext` snapshots for tests.

**Exit criteria — measured, not judged (PR-042).** The earlier "matches your own
judgment" test was circular: if it matches, it taught you nothing. That was fixed. What
was *not* fixed until now is that the replacement assumed an open queue to classify.
There is none, so the criteria are restated against the archived 162-PR corpus (PR-005).
The rewrite is recorded here rather than swapped in silently.

Run the scan against **replayed fixtures** — each PR reconstructed at its own head SHA,
with the check-run and base-branch check status as they stood at that time. Then:

- **Blind hand-classification.** Draw a **random sample of 40** of the 162 PRs (seeded,
  and the seed committed). Hand-classify each into one of `BLOCKED_ON_CONTRIBUTOR` /
  `BLOCKED_ON_MAINTAINER` / `WAITING` / `READY_FOR_REVIEW` from the PR page alone,
  **before** running the rules and without looking at rule output. Commit the
  classification first, then run.
- **Fact-rule disagreement with that classification must be zero.** A fact rule that is
  wrong is a bug, not a tuning problem. Disagreement here means the derived status
  differs, or a fact rule fired that the PR's state does not support.
- **Report the `CI_BROKEN_ON_BASE` count over all 162.** How many PRs had a required
  check failing that was *also* failing on the base branch at that PR's head. This is the
  project's lead differentiator and it is directly countable from history. Report it as a
  raw count and a fraction. This is a reported number, not a pass/fail threshold — no
  honest threshold exists before the count is known, and inventing one now would be
  fitting the gate to the answer. [Certain]
- **Speed: the scan over all 162 replayed PRs completes under 2 minutes**, excluding
  fixture fetch. Record how long the 40-PR hand pass took, for the ratio.
- **It surfaces at least one PR whose blocking state you had classified wrong.** Now
  cheap to check, because the blind classification is written down before the run.

Sample size 40 is chosen, not derived [Guessing]. It is roughly a quarter of the corpus
and about an hour of hand classification, which is the most manual effort this gate is
worth. If it turns out zero-disagreement is trivially met, widen the sample rather than
declaring victory.

**Deferred until a wave arrives:** whether the report is *useful* to a maintainer working
a live queue. A replay proves the rules are correct; it cannot prove the output changes
what anyone does. Do not let Phase 0 claim otherwise.

---

## Phase 1 — Labels + sticky comment (GitHub Action)

Labels come first in this phase, not last. They are the cheapest way to make the
existing GitHub PR list usable, and plausibly most of the product's value.

- Package as an Action; adoption is one workflow file.
- Trigger model per `02-architecture.md`: `check_suite` + `schedule` for writes,
  `pull_request` for dry-run logging only.
- **Label reconciliation** — ship this first and use it alone. The original "for a week"
  presumes a week's worth of PRs to label. Ship it and leave it running; the trial
  (PR-062) is a live-traffic gate and is deferred, see below.
- Sticky comment, edited in place, state in the Actions cache with comment fallback.
- Actionable CI feedback: failing job, failing test name, log excerpt.
- Branch-update instructions for conflicts (safe ordering per Q6).
- `dry_run: true` documented as the default for first adoption.
- **Record your own verdict on every PR you review** — one line, agree/disagree with the
  bot's status. Cheap now, and it is the substrate Phase 3's shadow mode compares
  against. No separate labelling project; see Phase 3.

**Exit — split, because half of it cannot be measured without traffic.**

Measurable now, by replay against the corpus:

- Run the label reconciler in dry-run over all 162 replayed PRs. The label set it *would*
  have applied is correct on the 40-PR blind sample from PR-042, and reconciliation is
  idempotent: replaying the same fixture twice produces zero label churn.
- Rendered comment bodies for all 162 are generated without error, and every
  contributor-facing remediation string resolves to a concrete instruction rather than a
  placeholder.

**Deferred until a wave arrives** — these need live traffic and are not being rewritten
into retrospective proxies, because a retrospective cannot answer them [Certain]:

- A week with **zero manual "fix your CI" comments**. This measures maintainer behaviour
  under the bot, which did not exist during the wave. The historical count of such
  comments is a *baseline* worth extracting from the corpus, but it is not the exit
  criterion.
- **≈1 bot comment per PR.** Noise is a property of a live multi-bot setup. A replay
  posts nothing.
- **No contributor complaints about noise.** Requires contributors.

Until a wave arrives, Phase 1 ships behind the measurable half and its live half stays
explicitly open. Do not mark it passed.

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

**Exit — deferred until a wave arrives.** "The digest is the first thing you open, ahead
of the PR list" is a statement about a maintainer's habit while triaging a live queue.
There is nothing to open. No retrospective substitute exists and none should be invented
[Certain]. Phase 2 was already conditional; it is now conditional on traffic as well, and
the honest position is that it should not start before a wave arrives.

One thing here *is* measurable retrospectively and is worth doing early, because it is
the part a saved search genuinely cannot replace: run **duplicate-PR detection** over the
PRs that were open concurrently during the wave, reconstructed from open/close timestamps,
and check the pairs it flags against what the maintainers actually did with them. That
tunes the `DUPLICATE_FILES` threshold against real data instead of intuition. It does not
substitute for the exit criterion.

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

**Exit — deferred until a wave arrives.** The gate was "three consecutive weeks in which
J1 does not contradict your own conclusion on a PR you reviewed". Shadow mode collects
paired labels as a side effect of reviewing PRs, and there are no PRs to review. The
whole design of this phase depends on live traffic, so the gate is deferred rather than
rewritten. The gate remains **qualitative and stated as such** — a small sample cannot
support a false-positive rate (P7), and a qualitative gate you actually apply beats a
statistical one you skip. Three weeks is a chosen number, not a derived one [Guessing];
if you change it, record why.

A retrospective run of J1 over the 162 merged PRs is possible and would be worth doing
before spending anything on this phase, but it is weak evidence: "was merged" is not "the
diff resolved the issue", and the maintainers merged plenty of PRs without checking that.
Treat it as a smoke test for the output contract, not as validation. [Likely]

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

## Metrics

Split by what can be measured now and what cannot. Every metric below was originally
written as a live-traffic measurement from Phase 1.

**Measurable now, by replay over the 162-PR corpus:**

- **Fact-rule false positives → must be zero**; each one is a bug. Measured against the
  blind hand-classified sample in PR-042.
- **`CI_BROKEN_ON_BASE` count** across the corpus — how often a contributor would have
  been blamed for a break they did not cause. Differentiator #1, and the single most
  informative number available. Report the raw count.
- **Heuristic-rule false-positive rate** → tune thresholds against replayed PRs rather
  than intuition. Note the limit: for `DUPLICATE_FILES` this requires reconstructing which
  PRs were open concurrently, and the ground truth is what the maintainers did, which is
  noisier than a fact. [Likely]
- **Historical baselines** — manual maintainer comments for mechanical issues during the
  wave, and how long PRs actually sat. These are the "before" numbers. They are not
  evidence the tool improves anything; they are what a future live measurement gets
  compared to.

**Deferred until a wave arrives.** These require live traffic. They are listed rather
than replaced, because no retrospective answers them [Certain]:

- **Median time-to-first-actionable-feedback** (expect one CI cycle, not seconds). A
  replay has no clock.
- **Manual maintainer comments per week for mechanical issues → zero.** Measures
  maintainer behaviour under a bot that did not exist at the time.
- **Bot comments per PR → ≈1.** A replay posts nothing, so noise is unmeasurable.
- **PRs blocked-on-contributor that self-resolve without a maintainer touch.** The
  historical rate is measurable, but the number that matters is the rate *under the bot*,
  and the bot is the intervention. The historical figure is a baseline, not the metric.
