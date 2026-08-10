# Decision: PR-062 One-week labels-only trial

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
