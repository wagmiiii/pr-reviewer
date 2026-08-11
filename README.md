# pr-reviewer

A PR triage bot for maintainers drowning in contributor pull requests.

It reads every open PR, works out **who is blocking it**, tells the contributor exactly
what to fix, and labels the queue so the maintainer can see at a glance which PRs are
actually worth opening.

**It never merges anything.** Merging is the maintainer's decision, permanently.

**Status:** planning. No code yet — see `docs/`.

## The idea in one paragraph

Maintaining a repo with many drive-by contributors means most PRs are failing CI, stuck
behind merge conflicts, or unverifiable against the issue they claim to fix — and the
maintainer spends their time hand-writing the same three comments instead of reviewing
code. This bot automates the mechanical half (facts from the GitHub API, no AI),
surfaces heuristics as warnings rather than verdicts, and — later, and only if it earns
it — adds an advisory layer for "did this actually fix the issue".

## Design principles

1. **Facts, heuristics, and opinions are three different things** and get three
   different levels of authority. See `00-concept.md`.
2. **Nothing the bot produces can merge, close, or block a PR.** It labels, comments,
   and ranks. Humans decide.
3. **One comment per PR, edited in place.** Automating comment spam is not a product.
4. **Labels before dashboards.** GitHub's own PR list is the cheapest UI that exists.
5. **Dry-run first.** Every writing behaviour is opt-in.
6. **Contributor diffs are untrusted input.** Never checked out, never executed.

## Known structural risk

The Action-based delivery in Phase 1 depends on GitHub token permissions for
fork-originated PRs, which are read-only on `pull_request` events. The design routes
around this with `check_suite` and `schedule` triggers — at the cost of latency.
**This must be verified with a real fork PR before Phase 1 begins.** Details in
`02-architecture.md` § Trigger model.

## Planning docs

| Doc | What's in it |
|---|---|
| [00-concept.md](docs/00-concept.md) | Problem, the three-bucket model, users, non-goals |
| [01-critique.md](docs/01-critique.md) | Flaws in the original idea and in this plan; is it worth building |
| [02-architecture.md](docs/02-architecture.md) | Pipeline, trigger model, state, stack |
| [03-review-pipeline.md](docs/03-review-pipeline.md) | Rules, warnings, judgment checks, output formats |
| [04-roadmap.md](docs/04-roadmap.md) | Phases 0–5, each independently shippable |
| [05-configuration.md](docs/05-configuration.md) | Minimal config and adoption workflow |
| [06-open-questions.md](docs/06-open-questions.md) | Unresolved decisions, with recommendations |
| [PROJECT-MANAGEMENT.md](docs/PROJECT-MANAGEMENT.md) | Team, process, sprint plan, full backlog — backup of the Notion board |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branches, commits, PRs, Definition of Done, testing standards per bucket |
| [spikes/competitors.md](docs/spikes/competitors.md) | PR-002 findings — which differentiators survived contact with the market |
| [spikes/premise-test.md](docs/spikes/premise-test.md) | PR-004 — is the premise even true? Measured against 159 real PRs |
| [spikes/fork-token.md](docs/spikes/fork-token.md) | PR-001 — can the Action write on fork PRs, and on which trigger |
| [decisions/PR-003-go-no-go.md](docs/decisions/PR-003-go-no-go.md) | The go/no-go, its evidence, and the criteria that would reverse it |

## Before you wait for this: you may not need it

If what you want today is conflict labels and linked-issue enforcement, install these and
stop reading. They work now, they cost no engineering, and a maintainer who just wants a
tractable queue should try them first:

- **[Mergify](https://docs.mergify.com/)** — labels by condition, `needs-rebase` on
  conflict, comment the author, remove the label when resolved.
- **[nearform/github-action-check-linked-issues](https://github.com/nearform-actions/github-action-check-linked-issues)**
  — linked-issue enforcement, including cross-repo references.

What they do not do is tell you **whose problem a PR is**, or check whether a failing
check was *already failing on the base commit* before blaming the contributor. Measured
over 159 real PRs: **63 of the 71 with a failing check were failing a check already
failing on their base** — the contributor had broken nothing. No surveyed tool catches
that.

The other reason to want one tool rather than five: five bots post five comments per PR,
which is the problem this project exists to solve. **The integration is the product.**

## Setup as a GitHub Action

Create `.github/workflows/pr-reviewer.yml` in your repository. The action requires `pull-requests: write` and `issues: write` to manage labels and comments. **It will never request `contents: write`.**

```yaml
name: PR Triage Bot

on:
  pull_request_target:
    types: [opened, synchronize, reopened, ready_for_review]
  workflow_run:
    workflows: ["CI"] # Replace with your CI workflow name
    types:
      - completed
  schedule:
    - cron: '0 * * * *' # Every hour

permissions:
  pull-requests: write
  issues: write
  contents: read # Required to read the configuration file, but never write.

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: wagmiiii/pr-reviewer@v1
        with:
          dryRun: 'false' # Set to 'true' for a dry-run
```

## Start here

Two things, in order:

1. **Confirm the write trigger against a real fork PR.** `check_suite` was the plan and it
   does not work — it never fires when the check suite is created by GitHub Actions.
   `workflow_run` is the replacement. See
   [the trigger model](docs/02-architecture.md#trigger-model--read-this-before-writing-any-code).
2. **Phase 0** — a read-only CLI that scans a repo and prints the triage report. No
   writes, no AI, no hosting. Success is measured, not vibed: see
   [the roadmap](docs/04-roadmap.md).
