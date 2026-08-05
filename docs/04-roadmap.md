# Roadmap

Each phase is independently useful and independently shippable. Do not start a phase
until the previous one has run against a real repo with real PRs.

## Phase 0 — Read-only observer (no AI, no writes)

**Goal:** prove the collectors and gate rules produce a triage report you'd actually
trust, without touching anyone's repo.

- CLI: `pr-reviewer scan <owner>/<repo>` using a local token.
- Implement `collect` + `gate` for the core rules: CI status, conflicts, behind-base,
  linked issue, staleness, changes-requested.
- Render the maintainer digest to stdout.
- Fixture harness: record real `PullRequestContext` snapshots for tests.

**Done when:** run it against the repo that motivated this and the ranked list matches
your own judgment of what to look at.

## Phase 1 — Sticky comment via GitHub Action

**Goal:** stop hand-writing "fix CI" and "please rebase".

- Package as a GitHub Action; one workflow file to adopt.
- Sticky comment with embedded state; edit-in-place; noise budget enforced.
- Actionable CI feedback: failing job, failing test name, log excerpt.
- Filled-in rebase instructions for conflicts.
- Label reconciliation.
- `dry_run: true` as the documented default for first adoption.

**Done when:** a week passes with zero manual "fix your CI" comments and no contributor
complaints about noise.

## Phase 2 — Maintainer digest

**Goal:** deliver the actual product — the ranked queue.

- Scheduled cron run over all open PRs.
- Digest posted to a pinned issue, updated in place.
- Duplicate-PR detection via file overlap.
- Stale lifecycle: nudge → warn → (optional) close.

**Done when:** the digest is the first thing you open, ahead of the PR list.

## Phase 3 — Judgment layer

**Goal:** answer "did they actually fix it" and "how long will this take me".

- J1 issue-resolution, J2 test-presence, J3 test-deletion, J7 effort-estimate first —
  the four with the clearest value and lowest false-positive risk.
- Output goes to the **digest only** at first, not into PR threads.
- Evidence citations mandatory; `"unknown"` always permitted.
- Caching by `(check, head_sha, prompt_version)`.
- Build the labelled eval set *before* shipping: ~30 real PRs you've already judged,
  measure false-positive rate, gate release on it.

**Done when:** false-positive rate on the eval set is low enough that you stop
double-checking the bot.

## Phase 4 — Coverage integration

- Parse lcov/cobertura from CI artifacts; optional Codecov adapter.
- Report coverage delta on the PR; flag drops beyond threshold as a maintainer warn.
- Degrade honestly when unavailable.

## Phase 5 — Auto-merge (narrow)

- Implement the allowlist policy from `03-review-pipeline.md` exactly.
- Off by default; requires explicit `automerge.enabled: true` plus a path allowlist.
- Delegate to GitHub native auto-merge.
- Every auto-merge logged in the digest with the rules that permitted it.
- Ship a `--explain` mode showing why a given PR is or isn't auto-mergeable.

## Phase 6 — Hosted GitHub App (only if demanded)

- Webhook receiver, installation tokens, Postgres verdict history.
- Cross-repo / org-wide dashboard.
- Only worth building if multiple maintainers ask for it. The Action covers the
  single-repo case at zero operational cost.

## Deliberately deferred

- Line-by-line code review comments — crowded, noisy, off-strategy.
- Auto-fixing contributor branches (bot-pushed rebases) — surprising and unsafe.
- Auto-closing PRs on quality grounds — a human decision, permanently.
- Web UI before the CLI and Action are genuinely useful.

## Metrics to track from Phase 1

- Median time-to-first-actionable-feedback.
- Manual maintainer comments per week (should trend to zero for mechanical issues).
- Bot comments per PR (should stay ≈1).
- Judgment-layer false-positive rate on the eval set.
- PRs blocked-on-contributor that self-resolve without maintainer touch.
