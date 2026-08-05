# pr-reviewer

A PR triage bot for maintainers drowning in contributor pull requests.

It reads every open PR, works out who is blocking it, tells the contributor exactly
what to fix, and gives the maintainer a short ranked list of PRs actually worth their
attention.

**Status:** planning. No code yet — see `docs/`.

## The idea in one paragraph

Maintaining a repo with many drive-by contributors means most PRs are failing CI, stuck
behind merge conflicts, or unverifiable against the issue they claim to fix — and the
maintainer spends their time hand-writing the same three comments instead of reviewing
code. This bot automates the mechanical half completely (deterministic, no AI), advises
on the judgment half (AI, advisory only, never authoritative), and delivers a ranked
queue so the maintainer's first click of the day lands on a PR that's genuinely ready.

## Design principles

1. **Deterministic facts get deterministic checks.** CI status and merge conflicts come
   from the API, not from a model.
2. **The model advises; it never decides.** No AI output can block a PR or trigger a merge.
3. **One comment per PR, edited in place.** Automating comment spam is not a product.
4. **Ranking is the deliverable.** The maintainer's scarce resource is attention.
5. **Dry-run first, write later.** Every writing behaviour is opt-in.
6. **Contributor diffs are untrusted input.** Never checked out, never executed, never
   allowed to influence control flow.

## Planning docs

| Doc | What's in it |
|---|---|
| [00-concept.md](docs/00-concept.md) | Problem, product shape, users, non-goals |
| [01-critique.md](docs/01-critique.md) | Flaws in the original idea, what to add, is it worth building |
| [02-architecture.md](docs/02-architecture.md) | Engine, pipeline stages, delivery surfaces, stack |
| [03-review-pipeline.md](docs/03-review-pipeline.md) | Gate rules, judgment checks, auto-merge policy, output formats |
| [04-roadmap.md](docs/04-roadmap.md) | Phases 0–6, each independently shippable |
| [05-configuration.md](docs/05-configuration.md) | `.github/pr-reviewer.yml` schema and adoption workflow |
| [06-open-questions.md](docs/06-open-questions.md) | Unresolved decisions, with recommendations |

## Start here

Phase 0 in [the roadmap](docs/04-roadmap.md): a read-only CLI that scans a repo and
prints the triage report. No writes, no AI, no hosting. If that report matches your own
judgment of which PRs deserve attention, the rest of the project is worth building.
