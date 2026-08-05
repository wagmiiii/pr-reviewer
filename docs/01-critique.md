# Critique of the original idea

Honest assessment of the concept as first stated, with the changes it implies.

## Flaws

### F1 — Auto-merge is a supply-chain vulnerability, not a feature

"Merge PRs where necessary" is the highest-risk sentence in the brief. A bot with
write access that merges based on an LLM's opinion can be steered by whoever wrote the
diff it is reading. Prompt injection inside a source comment, a README, or a test
fixture is a live attack, not a theoretical one. Related classic: a workflow triggered
by `pull_request_target` runs with repo secrets *and* checks out attacker code.

**Implication.** Auto-merge must be driven exclusively by deterministic facts, gated by
an explicit allowlist of conditions, disabled by default, and never influenced by model
output. Prefer delegating the actual merge to GitHub's native auto-merge / merge queue
so the platform enforces branch protection rather than our bot bypassing it.

### F2 — Comment spam recreates the original problem

The pain was "I had to add comments manually to every PR." A bot posting a fresh
comment on every push produces *more* noise, and contributors mute it within a week.

**Implication.** Exactly one bot comment per PR, edited in place. Keyed to head SHA so
it only rewrites when something actually changed. A hard per-PR daily comment budget.
Never comment when the only news is "still failing, same as before".

### F3 — Using an LLM for facts the API already gives you

Merge conflicts and CI status are structured fields. Asking a model about them is
slower, costlier, and strictly less reliable.

**Implication.** The deterministic/judgment split in `00-concept.md`. LLM calls only
for questions with no API answer.

### F4 — "Check coverage" is not implementable as stated

Coverage cannot be inferred from a diff. It requires a coverage report produced by the
target repo's CI.

**Implication.** Coverage is an *optional capability*, enabled only when the repo
publishes an lcov/cobertura artifact or uses Codecov. Degrade honestly: "coverage not
reported" rather than a guess. Never let a hallucinated coverage number reach a comment.

### F5 — "Quality of work" is undefined and unfalsifiable

An LLM asked "is this good quality?" will produce confident, generic, unhelpful prose.

**Implication.** Decompose into narrow, checkable questions with evidence attached:
Does the diff touch files plausibly related to the issue? Is there a test for the new
behaviour? Does it delete tests? Does the PR description match the diff? Each answer
must cite files/lines, and must be allowed to return "cannot determine".

### F6 — Cost and rate limits at queue scale

40 open PRs × several pushes/day × a full-diff LLM call is a real bill and a real
secondary-rate-limit problem.

**Implication.** Cache verdicts by head SHA. Debounce pushes (~2 min). Skip the
judgment layer entirely for PRs the deterministic gate already blocked — a PR with
failing CI does not need a quality opinion yet. Cap diff size sent to the model and
truncate deliberately.

### F7 — The bot is only as trusted as its false-positive rate

One wrong "this doesn't fix the issue" on a good PR and the maintainer disables it.

**Implication.** Ship dry-run mode first (writes nothing, produces a report). Never let
the judgment layer emit a blocking verdict. Phrase advice as questions to the
maintainer, not verdicts about the contributor.

### F8 — Tone matters more than you'd think

Volunteers quit over curt bot comments. A bot telling a first-time contributor their
work is low quality is a community-management incident.

**Implication.** Comments are addressed to the *state of the PR*, never to the person.
The judgment layer's output goes to the maintainer digest by default, not into the PR
thread. Contributor-facing text is limited to actionable mechanics: CI failures, rebase
instructions, missing checklist items.

## Missing pieces worth adding

- **A ranked triage queue.** The real deliverable. A dashboard or a single daily issue
  comment: "3 PRs ready for you, 12 blocked on contributor, 5 stale, 2 duplicates."
- **Duplicate detection.** Multiple contributors fixing the same issue is endemic
  (especially Hacktoberfest). Detect overlapping PRs and surface them together.
- **Actionable CI feedback.** Don't say "CI failed" — extract the failing job, the
  failing test name, and ~20 relevant log lines. This single feature removes most
  maintainer round-trips.
- **Copy-pasteable conflict resolution.** Exact `git fetch upstream && git rebase
  upstream/main` block with the contributor's real remote/branch names filled in.
- **Stale-PR lifecycle.** Nudge at N days, warn at M, close at K, all configurable and
  off by default.
- **Trust tiers.** First-time contributor vs. repeat contributor vs. maintainer changes
  what is checked and what may be auto-merged.
- **Prevention over correction.** A PR template checklist and required-status
  configuration prevent more bad PRs than any bot fixes. Ship a `recommend` command that
  audits the repo's own contribution setup.

## Utility — is this worth building?

**Yes, with the scope corrected.** The strong case:

- The pain is real, recurring, and self-experienced.
- ~80% of the value (the deterministic gate + sticky comment + ranked queue) needs no
  AI, which means it can be reliable, cheap, and shippable.
- Distribution is easy: a GitHub Action other maintainers can adopt in one file.

The honest risks:

- Crowded adjacent market. Survival depends on staying the *queue* tool, not becoming a
  worse line-comment bot.
- Mergify, Renovate, stale-bot, and GitHub merge queue each solve a slice already. The
  wedge is that none of them unify status + conflict + issue-linkage + ranking into one
  maintainer view.
- Value is concentrated in high-traffic repos. Small repos won't feel it.
