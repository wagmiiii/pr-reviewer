# Concept

## The problem

A maintainer with an active repo and many drive-by contributors drowns in PR triage.
Observed failure modes from real maintenance experience:

- Most PRs fail CI, and the contributor doesn't notice or doesn't read the logs.
- Many PRs sit with merge conflicts because the base branch moved.
- The maintainer hand-writes the same three comments ("please fix CI", "please
  rebase", "please add a test") dozens of times.
- The maintainer cannot cheaply tell whether a PR *actually* resolves the issue it
  claims to, or whether test coverage moved in the right direction.
- Net effect: reviewing costs more than contributing, so review quality degrades and
  the queue grows.

The scarce resource is **maintainer attention**, not maintainer typing. The product
must optimise for attention, not for comment volume.

## The product in one line

A bot that continuously triages every open PR, blocks the ones that aren't the
maintainer's problem yet, tells the contributor exactly what to do next, and
surfaces a short ranked list of PRs that are genuinely ready for a human.

## Two engines, deliberately separated

The system contains two subsystems with opposite reliability profiles. Conflating
them is the primary design risk (see `01-critique.md`).

### 1. The deterministic gate (no AI)

Facts read straight from the GitHub API. Always correct, cheap, safe to act on.

- CI / check-run status per required check
- Mergeability (`mergeable`, `mergeable_state`), conflict detection
- Commits behind base
- Linked issue present / valid / already closed / already claimed by another PR
- Changed-file count, diff size, touched paths vs. protected paths
- Signed CLA / DCO, contributor history, first-time contributor flag
- Staleness (days since last contributor activity)

### 2. The judgment layer (AI)

Opinions. Useful, fallible, never authoritative. Only ever produces *advice for a
human* or *non-blocking suggestions for a contributor*.

- Does the diff plausibly resolve the linked issue?
- Is there a test covering the new behaviour?
- Coverage delta interpretation (from real coverage artifacts, not guessed)
- Overlap with other open PRs (duplicate work)
- Reviewer effort estimate ("5 min doc change" vs. "touches auth, needs a careful read")
- Risk flags: secrets, new dependencies, workflow-file edits, generated files

The rule: **the deterministic gate can block and can merge; the judgment layer can
only advise.**

## Primary users

- **Maintainer (primary).** Wants a short, honest, ranked queue and to stop repeating
  themselves.
- **Contributor (secondary).** Wants to know precisely what's wrong and how to fix it,
  without waiting days for a human.

## What success looks like

- Time-to-first-actionable-feedback on a PR drops from days to minutes.
- The maintainer's first click of the day lands on a PR that is genuinely reviewable.
- The number of hand-written "please fix CI" comments goes to zero.
- The queue of PRs blocked on the *maintainer* shrinks; the queue blocked on the
  *contributor* becomes visible and self-resolving.

## Explicit non-goals

- **Not a code-review AI.** No line-by-line nitpicking. That market is crowded
  (CodeRabbit, Vercel Agent, Copilot review) and it is the fastest way to become noise.
- **Not a CI replacement.** It reads CI; it does not run tests.
- **Not a linter or formatter.** Those belong in CI.
- **Not an autonomous merger of feature code.** See the auto-merge policy in
  `03-review-pipeline.md`.

## Why this is differentiated

Existing AI review tools review *the diff*. This reviews *the queue*. The unit of
value is "which of my 40 PRs deserve my attention right now, and why are the other 37
not my problem" — a question no line-comment bot answers.
