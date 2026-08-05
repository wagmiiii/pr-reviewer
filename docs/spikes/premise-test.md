# PR-004 — Premise test

**Owner:** Allison Muyideen · **Date:** 2026-08-05 · **Status: BLOCKED as designed —
redesign proposed below**

Confidence tags: [Certain] / [Likely] / [Guessing].

---

## The blocker

PR-004 says: install Mergify and a linked-issue action on the real high-traffic repo,
run for a week, observe. **There is no traffic left to observe.**

Survey of every repo reachable from the `mallison031` account and its three orgs
(`Tollcraft`, `accensa`, `Soroban-Cost-Linter`):

| Repo | Total PRs | Open now |
|---|---|---|
| `Tollcraft/soroban-cost-linter` | 162 | **0** |
| `accensa/accensa-app` | 30 | 0 |
| `accensa/accensa-contracts` | 16 | 0 |
| everything else | <6 | 0 or 1 |

[Certain — queried via the GitHub API on 2026-08-05]

## What the history shows

`Tollcraft/soroban-cost-linter` is unambiguously the repo that motivated this project:

- **162 pull requests** — 157 merged, 5 closed.
- **~65 distinct external contributors**, most with 1–4 PRs each. Classic drive-by
  pattern.
- **Entire wave compressed into one month:** oldest PR 2026-07-06, newest 2026-08-04.
- The most recent PRs are the two maintainers plus Dependabot. The wave has passed.

So the pain was real, recent, and severe — and it is currently over. Installing bots and
waiting a week would measure a queue that no longer exists. [Certain]

## Why this matters beyond PR-004

Two consequences the roadmap did not account for:

1. **PR-042 (Phase 0 exit measurement) has the same problem.** Its criterion is "hand
   classify every open PR on a real high-traffic repo, then run the scan". Zero open PRs
   means zero to classify. That gate is unrunnable as written too.
2. **The 162 closed PRs are an asset, not a loss.** They are exactly the corpus PR-012
   needs, and they are recent enough that check-run data survives — verified on PR #20,
   whose check conclusions are still queryable [Certain, sampled].

## Proposed redesign: retrospective replay

Replace "install and wait" with "replay against history". Same question, better evidence,
no waiting.

**Method.** Fetch all 162 PRs as `PullRequestContext` fixtures. Run the fact rules over
them. Compare what the rules would have said against what actually happened — how long
each PR sat, how many maintainer comments it took, whether it was merged or abandoned.

**What it answers that the live test cannot:**

- How many of the 162 PRs had failing CI at some point? Conflicts? Both?
- **How many had a check failing that was also failing on `main` at the time?** This is
  differentiator #1. A retrospective count either proves it mattered or kills the claim
  outright — the strongest single piece of evidence available for PR-003.
- What fraction would the deterministic rules have correctly routed without a human?
- N = 162 instead of whatever trickles in during a week. [Certain that the sample is
  larger; Guessing whether it is decisive]

**What it cannot answer, honestly:**

- **Noise.** Comment volume per PR under a multi-bot setup can only be measured live.
- **Whether the maintainer's experience actually improves.** A replay measures rule
  accuracy, not relief.
- **CI log excerpts (PR-024).** GitHub Actions logs expire on a retention window; the
  July PRs are probably still inside it but will not be for long [Likely]. If PR-024's
  extractor is to be validated against real failures, the logs should be archived
  **now**, before they age out.

## Recommendation

Do all three, in this order:

1. **Archive the corpus this week.** 162 PRs plus check runs plus whatever logs still
   exist. This is time-sensitive in a way nothing else on the board is — the data is
   decaying. It doubles as PR-012's fixture set.
2. **Install the configs anyway** (`premise-test/` in this repo). Traffic is low but
   non-zero — Dependabot and the two maintainers still open PRs — and the cost of leaving
   it running is zero. It also puts the setup in place should another contributor wave
   arrive.
3. **Run the retrospective replay** and treat it as the decisive input to PR-003.

## Consequences for the board

- **PR-004 redesigned** from "install and wait a week" to "install, archive, replay".
- **New ticket needed: archive the historical corpus.** P0, time-sensitive, Sprint 0.
  Arguably it should outrank everything else currently in Ready.
- **PR-012 (fixture harness) is no longer blocked on PR-011 in practice** — the raw
  archive can be captured now and shaped into `PullRequestContext` once the type exists.
  Splitting it into "capture raw" and "shape into fixtures" would unblock real work
  during Sprint 0.
- **PR-042's exit criterion needs rewriting** to work against historical PRs rather than
  an open queue.

## Open question for PR-003

The wave lasted a month and ended. If contributor waves on these repos are episodic
rather than continuous, the tool only has value during a wave — which changes the
argument for building it from "ongoing pain" to "be ready for the next one".

That is a weaker case, and it should be stated honestly at the go/no-go rather than
discovered later. [Guessing — one observed wave is not a pattern; if there were earlier
waves on other repos, that would change the answer.]
