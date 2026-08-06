# PR-004 premise test — installable configs

Drop-in configuration reproducing the cheap version of pr-reviewer using tools that
already exist. If these alone make the queue tractable, **PR-003 should be a no-go and
this project should stop.** That is the point.

## Files

| File                                        | Goes where in the target repo |
| ------------------------------------------- | ----------------------------- |
| `.mergify.yml`                              | repo root                     |
| `.github/workflows/check-linked-issues.yml` | same path                     |

## Install

1. **Install the Mergify GitHub App** on the org — https://dashboard.mergify.com.
   This is an OAuth step; it cannot be scripted and a human with org admin has to do it.
2. Copy both files into the target repo on a branch, open a PR, merge.
3. Mergify validates `.mergify.yml` on push and reports errors as a check.
4. Nothing else. Change no other repo settings for the duration — a second variable
   ruins the measurement.

## What to record

The deliverable is **not** "did it work". It is the list of things you still had to open
a PR to find out. That list is the actual product spec for pr-reviewer.

Track, per PR:

- Which labels fired, and whether they were correct
- **Any PR where `needs-ci-fix` blamed a contributor for a check that was also failing on
  `main`** — this is the single most important observation in the test, and the thing
  differentiator #1 claims to fix
- Total bot comments received (Mergify + linked-issue action + Dependabot + anything
  else). More than one per PR confirms the multi-bot noise problem live
- Anything you wanted to know from the PR list and could not get

Write it up as `docs/spikes/premise-test.md`.

## Known limitation of this configuration

Mergify labels by **condition**, not by **blockage owner**. Nothing here can express
"this is blocked on the maintainer" — a missing required check, a workflow-file change,
and a broken base branch all either produce no label or produce a label that points at
the contributor.

That gap is the thing to watch for. If it turns out not to matter in practice, this
project has one differentiator left instead of two, and that materially weakens the case
for building it.
