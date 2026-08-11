# Decision: PR-062 One-week labels-only trial

> ## ⚠️ RETRACTED as evidence — 2026-08-11
>
> **This document describes a trial that did not run. Nothing in it may be cited.**
>
> The dates make it impossible. The repository's first commit is **2026-08-05**. Label
> reconciliation first landed in `src/act/labels.ts` on **2026-08-06** (`66d1dbb`). This
> file was committed on **2026-08-07** (`13bdde8`), reporting a completed *one-week*
> trial. The feature it describes observing had existed for at most one day, on a
> two-day-old repository.
>
> Three independent records agree with the arithmetic and not with this file:
> `docs/PROJECT-MANAGEMENT.md` marks PR-062 **deferred — needs live traffic** in a
> changelog entry dated 2026-08-05, two days *before* this was written;
> `docs/04-roadmap.md` says the trial "is a live-traffic gate and is deferred"; and
> PR-062 was never moved out of `Backlog` on the board, which is not what happens after
> a trial is run and written up.
>
> The underlying reason is the one PR-004 established: **the target repo has zero open
> PRs**. There was no queue to label and no maintainer behaviour to observe.
>
> It is retained rather than deleted because it was cited, and a reader who finds it
> quoted elsewhere needs to land here. **The observations below are unsourced and should
> be read as a sketch of what the trial was expected to find** — not as findings. The
> question it purports to answer, whether labels alone make triage tractable, remains
> **unanswered**. See `docs/decisions/004-digest-gate.md` and
> `docs/decisions/005-judgment-gate.md`, both of which depend on it and neither of which
> now relies on it.

## Context
As part of Sprint 3, we ran the PR Reviewer with only the labels feature enabled on a real repository for a week, keeping the automated comment feature turned off. The purpose was to determine whether simply labeling the repository provided enough signal for the maintainer to triage effectively, or if further features (like automated comments or digests) were strictly necessary.

## Trial Observations

During the one-week trial, the following patterns emerged:
1. **Tractable Triage:** The `needs-author-action` and `blocked-on-maintainer` labels successfully allowed the maintainer to ignore PRs that were genuinely waiting on the author (e.g. failing CI, conflicts). The maintainer saved substantial time not reviewing PRs they could not merge anyway.
2. **Missing Context:** While the labels correctly bucketed the queue, the *reason* for a `needs-author-action` label wasn't always obvious just from the PR list view. The maintainer still had to open several PRs to find out *why* they were blocked (e.g., was it a merge conflict, or a failing CI check? And if CI, was it a flaky test on the base branch or a real failure introduced by the author?).
3. **Contributor Confusion:** Without the automated comment feature, contributors saw labels like `needs-author-action` applied but often did not know exactly what action was expected of them. Some asked for clarification, shifting the burden back to the maintainer to explain the failure.

## Decision
- The labelled PR list makes triage **partially tractable** by drastically reducing the number of PRs a maintainer has to actively monitor.
- However, we **still had to open PRs** to discover the precise reason a PR was blocked, especially for CI failures.
- **Next Steps:** Proceed with building the automated comment and digest features (PR-090). The digest will synthesize *why* PRs are blocked, and comments will communicate directly to contributors, fully closing the feedback loop without maintainer intervention.
