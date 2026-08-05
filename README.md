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

## Start here

Two things, in order:

1. **Verify the fork-token behaviour** (30 minutes, no code). If writes are impossible
   on the triggers you need, the delivery plan changes before anything is built.
2. **Phase 0** — a read-only CLI that scans a repo and prints the triage report. No
   writes, no AI, no hosting. Success is measured, not vibed: see
   [the roadmap](docs/04-roadmap.md).
