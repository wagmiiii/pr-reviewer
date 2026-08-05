# Contributing

This project is a PR triage bot. If our own contribution process is bad, we have no
standing to build it.

Two maintainers: **Allison Muyideen** (rules, renderers, contributor-facing copy,
product decisions) and **Ademola Ajala** (GitHub API, collectors, Action packaging,
delivery). Work is tracked on the Notion Sprint Board and mirrored in
[`docs/PROJECT-MANAGEMENT.md`](docs/PROJECT-MANAGEMENT.md).

## Before you start a ticket

Check the Definition of Ready. A ticket that fails any of these belongs in Backlog, not
Ready:

- Acceptance criteria written and testable
- Owner assigned
- Points assigned, value ≤ 5 — anything larger gets split, not re-estimated
- Blocking dependencies closed or explicitly waived
- Rules or output work: the relevant `docs/` section is linked or updated

Then check your WIP. **Two tickets per person**, counting In Progress and In Review
together. At the limit, finish something before starting something.

## Branches

```
<ticket-ref>-<short-slug>
```

e.g. `PR-031-ci-rules`, `PR-052-state-store`. The ref makes the board and the git log
line up without a bot to do it for us.

Branch from `main`. Keep branches short-lived — this project has two people and no
release train, so a long-lived branch is just a merge conflict with a delay on it.

## Commits

Present tense, imperative, scoped:

```
rules: distinguish CI_FAILING from CI_BROKEN_ON_BASE

Blaming a contributor for a broken main branch destroys credibility on
first contact. Unknown base status now degrades to maintainer-owned.

Refs PR-031
```

Body explains *why*, not *what* — the diff already says what. Reference the ticket.

Do not add co-author or attribution trailers for AI tools.

## Pull requests

- One ticket per PR where possible.
- Title: `PR-0xx: <what changed>`
- Description states what changed, why, and how it was verified. If a ticket's
  acceptance criteria are only partly met, say which ones and why.
- Move the board card to **In Review** when you open it. In Review means the other
  person looks at it, not "nearly done".
- Reviewer is always the other maintainer. Two people means no review queue and no
  excuse for skipping it.

## Definition of Done

Copied here deliberately so it survives independently of Notion. A ticket is not Done
until **all** of these hold:

- Merged to `main` via PR, reviewed by the other person
- Tests passing, including at least one fixture-based test for rule work
- `docs/` updated if behaviour or config changed — **the planning docs are the spec,
  and drift is a bug**
- No new lint or typecheck errors
- **Fact rules only: zero disagreements with hand classification on the fixture set.**
  A wrong fact rule is a bug, not a tuning problem.

## Testing rules

Fact rules and heuristic rules are held to different standards on purpose. See
[`docs/00-concept.md`](docs/00-concept.md) for why.

| Bucket | Standard |
|---|---|
| **Fact rules** | Zero false positives against the fixture set. The suite fails on any disagreement. |
| **Heuristic rules** | Measured on false-positive rate, tuned against real data. Thresholds ship marked as untuned, and every tuning decision gets a written record. |
| **Judgment checks** | Shadow mode only. Never gate a merge, never block a PR, never reach a contributor. |

New rules need a fixture that exercises them. If you cannot construct a fixture, that is
usually a sign the rule is not deterministic enough for the bucket you put it in.

## Decision records

Five tickets on the board are decision gates, three of which can legitimately end the
project. Their outputs live in `docs/decisions/` as numbered files, and spike findings
live in `docs/spikes/`.

Write the reasoning down, including **what evidence would reverse the decision**. A
decision recorded without its reasoning is just an assertion with a date on it.

## Things this project will not do

Listed so nobody has to relitigate them in a PR review:

- **Merge, close, or push to a contributor's branch.** The bot has no `contents: write`.
- **Line-by-line code review.** Crowded market, and the fastest route to being muted.
- **`pull_request_target`.** Contributor code is never checked out and never executed.
- **Auto-close stale PRs.** Human decision, permanently.
