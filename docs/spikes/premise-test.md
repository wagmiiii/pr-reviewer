# PR-004 — Premise test

**Owner:** Allison Muyideen · **Date:** 2026-08-05, re-scoped and answered 2026-08-06 ·
**Status: ANSWERED against the archive**

Confidence tags: [Certain] / [Likely] / [Guessing].

> **2026-08-06 — re-scoped and run.** The original design was blocked by an empty PR
> queue; that analysis is unchanged below and still stands. It is now measured against
> the 159-PR archive instead of a live install. **Findings are in
> [§ Findings](#findings-2026-08-06-measured-against-the-archive) at the foot of this
> document** — read the blocker analysis first for why the method changed, then the
> findings for what it produced. PR-003 is no longer waiting on this.

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

---

# Findings — 2026-08-06, measured against the archive

Re-scoped per the recommendation above. Method: direct counts over the 159 archived PRs
(`corpus/premise.sh`, output in `docs/spikes/premise-findings.json`). No rules engine —
these are queries against captured history, so they run now rather than after Sprint 1.

**Population:** 159 PRs, 154 merged, 134 from forks, 68 distinct authors, one month
(2026-07-06 → 2026-08-04). Three PRs (179, 281, 328) are absent from the archive; see
`corpus/README.md`. They are the three largest by diff size, so the gap is not random.

## Verdict

**The premise is confirmed, but not the version of it we wrote the tickets against.**

The original framing was *maintainers drown in manual CI nagging, so automate the
nagging*. The history says the nagging was real but modest in volume — and that the
majority of it was **aimed at the wrong person**.

## The numbers

| Question | Answer | Confidence |
|---|---|---|
| PRs arriving with a failing check | **71 of 159 (44.7%)** | [Certain] |
| …where the same check was **already failing on the base commit** | **63 of 71 (88.7%)** | [Certain] |
| …where the base was green, i.e. genuinely the contributor's break | **8 of 71 (11.3%)** | [Certain] |
| PRs with no CI at all | 14 | [Certain] |
| PRs that needed a manual "fix your CI / resolve conflicts" comment | **47 of 159 (29.6%)** | [Likely — keyword floor] |
| Maintainer comments that were such a nag | **73 of 78 (93.6%)** | [Likely — keyword floor] |
| Median hours open→closed, PRs that needed a nag | **40.9h** | [Certain] |
| Median hours open→closed, PRs that did not | **3.8h** | [Certain] |

## What actually matters here

**1. Nearly all maintainer commentary on this repo was manual triage.** 73 of 78
comments. Not code review, not design discussion — telling people their branch was not
mergeable. Whatever else is true, the maintainer's comment budget was spent almost
entirely on work a deterministic rule can do. [Certain that the ratio holds; Likely on
the exact split, since the classifier is a keyword match]

**2. The maintainer was already hand-rolling this bot.** The most common comment in the
entire history is `fix your cl` — 14 times, verbatim. A copy-pasted boilerplate
("Hello! 👋 We recently optimized and simplified the CI workflows on the `main`
branch…") appears 9 times. That is a human doing string templating by hand, which is the
clearest demand signal in the corpus. [Certain]

**3. And 88.7% of the time, the nag was misdirected.** Of the 71 PRs with a failing
check, 63 were failing a check that was *already failing on the base commit they branched
from*. The contributor had broken nothing. They were being asked to fix the maintainer's
red `main`. [Certain from the data; the interpretation assumes the base SHA resolution is
right, which is exact for merged PRs and approximate for 5]

This inverts the product argument. **The value is not automating the nag — it is not
sending it.** Differentiator #1 was a hypothesis in `docs/00-concept.md`; it is now the
single strongest measured finding on the board, and it should lead PR-003 rather than sit
third in a feature list.

**4. Being blocked cost roughly 10× in wall-clock.** 40.9h median versus 3.8h. That is
the contributor's waiting, not the maintainer's effort, and it is the number that would
improve most obviously under instant automated feedback. [Certain on the figures;
Guessing on causation — a PR needing a nag is plausibly also a more complicated PR]

## Where this argues *against* building

Stated because a premise test that only finds support is not a test.

- **78 maintainer comments in a month is not drowning.** ~2.5 a day at peak. The pain was
  real but the raw volume does not by itself justify a bot; the misdirection does.
- **The wave is over.** 159 PRs in one month, zero open now. If waves are episodic, the
  tool has value during a wave and none between. That case is weaker than "ongoing pain"
  and PR-003 should say so out loud. [Guessing — one wave is not a pattern]
- **8 PRs is the whole addressable set for the flagship rule's *positive* case.** Only 8
  of 159 had a genuine contributor-caused CI break with a green base. If the tool is sold
  on "tells contributors what to fix", that is the true size of the market it serves. Its
  real job is the other 63.

## What this could not answer

Carried forward rather than fudged:

- **`MERGE_CONFLICT` rate.** GitHub computes `mergeable_state` only for open PRs; all 159
  are closed, so the field is `unknown` throughout. The conflict rule (PR-032) has no
  historical validation route. Conflicts clearly happened — the nag text mentions them
  repeatedly — but they cannot be counted.
- **Noise budget.** Comments per PR under a bot is only observable live.
- **Whether the maintainer's experience improves.** A replay measures rule accuracy, not
  relief.
- **CI log excerpts (PR-024).** Not fetched; the log phase of the capture has not been
  run and the retention window is closing. [Likely]

## Method and its limits

`corpus/premise.sh`, re-runnable, pure derivation. Maintainer comments are identified by
GitHub's `author_association` (`OWNER`/`MEMBER`/`COLLABORATOR`).

The nag classifier is a keyword match and therefore a **floor**. Two corrections were
needed after reading actual comment text rather than imagining it — this maintainer
writes "CL" for "CI", and writes "resolve conflicts" bare rather than in the long form a
regex written from memory expects. Missing those undercounted nags by roughly half (36 →
73). Two genuine nags remain unmatched after tuning, and one ambiguous comment
("Rectify this mistake") is excluded. Comments addressed to `@dependabot` are excluded as
bot-driving, not nagging.

Anyone quoting these numbers should quote them as "159 of 162 PRs" and note the three
missing large PRs.
