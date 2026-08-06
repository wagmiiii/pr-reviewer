# Concept

## The problem

A maintainer with an active repo and many drive-by contributors drowns in PR triage.
Observed failure modes from real maintenance experience:

- Most PRs fail CI, and the contributor doesn't notice or doesn't read the logs.
- Many PRs sit with merge conflicts because the base branch moved.
- The maintainer hand-writes the same three comments ("please fix CI", "please
  rebase", "please add a test") dozens of times.
- The maintainer cannot cheaply tell whether a PR _actually_ resolves the issue it
  claims to, or whether test coverage moved in the right direction.
- Net effect: reviewing costs more than contributing, so review quality degrades and
  the queue grows.

The scarce resource is **maintainer attention**, not maintainer typing.

## The product in one line

A bot that continuously triages every open PR, makes the state of each one visible
without opening it, tells the contributor exactly what to do next, and never touches
the merge button.

## Three buckets, three levels of authority

The central design claim. Conflating these is the primary risk (see `01-critique.md`).

### Bucket 1 — Facts (no AI, no heuristics)

Structured fields from the GitHub API. Correct by construction. May set a PR's blocking
status.

- CI / check-run conclusions per required check
- Mergeability (`mergeable`, `mergeable_state`) and conflict detection
- Commits behind base
- Draft status; unresolved requested-changes reviews
- Changed files, diff size, touched paths
- Author's merged-PR count in this repo; first-time-contributor flag
- Days since last contributor activity

### Bucket 2 — Heuristics (no AI, but fallible)

Pattern matching and thresholds. Useful, wrong sometimes. **Warn only — never blocks.**
Every threshold here is a guess until it has been tuned against real PRs — which now
means the 162-PR archive rather than a live queue, with the caveats in
`docs/03-review-pipeline.md`.

- Linked-issue detection (regex over PR body/title — misses prose references)
- Duplicate-PR detection (file overlap between open PRs)
- New-dependency detection (manifest/lockfile parsing, per ecosystem)
- Secret-shaped strings in a diff
- Test presence (did any file under a test-path glob change?)
- Test removal (were assertions deleted, or skip markers added?)

Keeping these out of Bucket 1 is what makes Bucket 1's guarantee meaningful.

### Bucket 3 — Judgment (AI, advisory only)

Opinions. Go to the maintainer, never block anything, always allowed to say "unknown".
Two checks only:

- Does the diff plausibly resolve the linked issue?
- Reviewer effort estimate and "what to look at first"

Anything answerable by a glob, a regex, or an API field belongs in Bucket 1 or 2 — that
is where the test-related checks went after an earlier draft specified them as model
calls. The discipline runs both ways.

The judge fires once per PR, on its transition into `READY_FOR_REVIEW`, which is the
moment its output is useful and the point at which abandoned PRs have already filtered
themselves out.

The rule: **Bucket 1 can block. Bucket 2 can warn. Bucket 3 can only advise. Nothing
can merge.**

## Merging is out of scope, deliberately

An earlier version of this plan included conditional auto-merge. It is removed, not
deferred. Reasons:

1. A bot with merge rights is a supply-chain surface; the safest version of that
   feature is one that doesn't exist. [Certain that removing it removes the risk]
2. GitHub already ships native auto-merge and merge queues gated by branch protection.
   Anyone who wants automated merging should use those — they're enforced by the
   platform rather than by our code. [Certain that these features exist]
3. The value of this project is concentrated in triage. Merging was never the
   bottleneck; deciding _what to look at_ was.

## Primary users

- **Maintainer (primary).** Wants to stop repeating themselves and to see queue state
  without opening 40 tabs.
- **Contributor (secondary).** Wants to know precisely what's wrong and how to fix it,
  without waiting days for a human.

## What success looks like

Every item here is a statement about a live queue, and as of 2026-08-05 there is no live
queue to measure against — the contributor wave that motivated this project ran
2026-07-06 to 2026-08-04 and ended, leaving 162 closed PRs and zero open ones [Certain,
`docs/spikes/premise-test.md`]. The list stands as the definition of success. What
changes is when it can be checked: **not until another wave arrives.**

- Time-to-first-actionable-feedback drops from days to **one CI cycle** (see the
  latency constraint in `02-architecture.md` — this is not seconds). _Requires live
  traffic; a replay over history has no clock._
- The maintainer can filter the PR list by bot-applied labels and get a usable
  shortlist without opening anything. _Requires live traffic._
- Hand-written "please fix CI" comments go to zero. _Requires live traffic. The
  historical count from the wave is the baseline to beat, not the measurement._
- PRs blocked on the contributor become visible and self-resolve without a maintainer
  touch. _Requires live traffic; the bot is the intervention, so the historical
  self-resolve rate is a baseline only._

What can be checked now, against the 162-PR corpus, is narrower and worth stating
separately so it is not mistaken for the above: **the fact rules classify historical PRs
the way a human does, with zero disagreements**, and **how often a required check was
failing on the base branch at the same time it was failing on the PR**. The second is the
lead differentiator and is directly countable. Neither says anything about whether the
maintainer's day improves. [Certain]

## Explicit non-goals

- **Not a merge bot.** See above.
- **Not a code-review AI.** No line-by-line nitpicking. Crowded market, and the fastest
  route to being muted.
- **Not a CI replacement.** It reads CI; it does not run tests.
- **Not a linter.** That belongs in CI.
- **Not an auto-closer.** Closing a contributor's work is a human decision.

## Differentiation — tested, not assumed

Competitor research is done: `docs/spikes/competitors.md` (PR-002, 2026-08-05). Of the
three differentiators the first draft claimed, **one survived cleanly, one narrowed, and
one died.** What follows is the corrected version.

### 1. Blockage ownership — genuinely uncovered

Assigning each PR an **owner of the blockage** (contributor vs. maintainer) rather than
just a status. Mergify labels by _condition_ — `needs-rebase` on conflict, a toggled
label on CI failure — but nothing surveyed answers "whose problem is this?" [Likely —
absence of evidence across the tools surveyed, not proof of absence].

Included in this: distinguishing `CI_FAILING` from `CI_BROKEN_ON_BASE`. No surveyed tool
compares a failing check against the base branch before assigning blame. This is the
sharpest gap and the thing to lead with.

### 2. Actionable CI instructions on GitHub Actions — an implementation gap

Turning a red CI into a specific instruction in the PR thread. **The concept is proven,
not novel:** `ci-reporter` already finds the failing part of a build and comments back,
with update-in-place — but it supports TravisCI and CircleCI only, not GitHub Actions
[Certain — stated in its own docs]. Other options are per-language (pytest plugins) or
single-purpose marketplace actions.

The claim must name GitHub Actions explicitly, or it is false.

### 3. ~~Issue-linkage verification~~ — dropped

Covered. `nearform/github-action-check-linked-issues`, `Verify Linked Issue`, and others
enforce this today for free, and handle cross-repo references that this project's planned
regex would have missed [Certain]. Verifying that a diff _actually addresses_ the issue
is still uncovered, but that is J1 — P3, digest-only, and already gated behind a decision
that may cancel it.

### 4. The single-bot argument — stronger than any of the above

Not on the original list, and the best of them. Adopting the alternatives means
installing **four or five separate bots**: Mergify for labels and conflicts, a
linked-issue action, a CI-comment app, a stale bot, something for duplicates. Each posts
its own comment.

That recreates the exact problem this project exists to solve — the maintainer goes from
writing three comments by hand to receiving five bot comments per PR. One bot, one
comment, one reconciled label set, one noise budget is the wedge, and it is consistent
with the noise budget in `docs/03-review-pipeline.md`.

### The honest counter-argument

Mergify plus two free marketplace actions delivers conflict labels, CI-failure labels,
and linked-issue enforcement today for zero engineering — a real fraction of Phases 1–2
[Likely]. The original test of this was: install exactly that on a real repo for a week,
and if the queue becomes tractable, stop.

**That test is not runnable.** There is no queue. Install the configs anyway — the cost
is zero and they are in place for the next wave — but the evidence for the go/no-go now
comes from replaying the fact rules over the 162 archived PRs and asking what the
alternatives would have missed. Concretely: how many of those PRs had a required check
failing that was _also_ failing on base, since no surveyed competitor makes that
distinction. A low count means the alternatives were close to sufficient and the correct
decision is to stop. [Certain that the count is obtainable; Guessing what it shows]

The honest weakness of this substitution: a replay compares rule outputs, not maintainer
experience. It cannot tell you whether four bots posting four comments would have been
worse than one, which is differentiator #4 and the strongest argument in this section.
That one stays untested until a wave arrives, and should be presented at PR-003 as an
argument rather than as a finding.
