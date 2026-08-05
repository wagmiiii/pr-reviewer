# Architecture

## Shape

One core engine, two delivery surfaces. The engine is a pure library; the surfaces
differ only in how they get a token, get triggered, and where they write output.

```
                 ┌─────────────────────────────┐
                 │      core engine (lib)      │
                 │                             │
   PR context ──▶│  collectors → gate → judge  │──▶ Verdict (JSON)
                 │                    ↓        │
                 │              renderers      │──▶ Markdown
                 └─────────────────────────────┘
                        ▲                 │
        ┌───────────────┴──────┐   ┌──────┴─────────────┐
        │  Surface A: Action   │   │ Surface B: App     │
        │  runs in target repo │   │ hosted webhooks    │
        │  GITHUB_TOKEN        │   │ installation token │
        └──────────────────────┘   └────────────────────┘
```

**Surface A — GitHub Action (ship first).** Zero hosting, zero secrets to manage, uses
the repo's own `GITHUB_TOKEN`, adopted by committing one workflow file. Runs on
`pull_request`, `check_suite`, and a `schedule` cron for queue-wide sweeps. This is the
distribution story.

**Surface B — GitHub App (later).** Needed for cross-repo dashboards, sub-minute
reaction, and org-level install. Same engine, different token source.

Do not build B until A has real users. Building the hosted service first is how this
project dies in infrastructure work.

## Pipeline

```
trigger
  → collect       gather facts (GitHub API, CI artifacts, git)
  → gate          deterministic rules → Blocked | Needs-review | Mergeable
  → judge         [only if not blocked] LLM checks → advisory findings
  → decide        map (gate, findings, config) → actions
  → act           sticky comment / labels / merge request / digest
```

Each stage is a pure function over the previous stage's output. `collect` is the only
stage that does I/O reads; `act` is the only stage that writes. That makes dry-run
trivial: run everything, skip `act`, print the plan.

## Stages

### collect

Produces a `PullRequestContext` — a single serialisable snapshot. Everything downstream
reads only this, which makes the engine testable against recorded fixtures.

Sources: PR + reviews + check runs + commits (REST/GraphQL), the diff (capped), linked
issue bodies, CI logs for failing jobs only, coverage artifacts if present, repo config
file.

### gate

Pure, synchronous, no network, no model. A list of small rule functions each returning
`pass | fail | skip` with a machine-readable reason code and human explanation.
Rule codes are stable strings (`CI_FAILING`, `MERGE_CONFLICT`, `BEHIND_BASE`,
`NO_LINKED_ISSUE`, `STALE`, `TOUCHES_WORKFLOWS`, `FIRST_TIME_CONTRIBUTOR`, …) so
comments can be diffed and rules individually disabled in config.

Output status:
- `BLOCKED_ON_CONTRIBUTOR` — something only they can fix.
- `BLOCKED_ON_MAINTAINER` — needs a decision, a secret, a re-run, a design call.
- `READY_FOR_REVIEW` — clean; a human should look.
- `AUTO_MERGEABLE` — clean *and* matches the narrow auto-merge allowlist.

### judge

Skipped entirely when status is `BLOCKED_ON_CONTRIBUTOR` (saves most of the spend).
Each check is a separate, narrowly-scoped model call with a JSON schema response and a
mandatory `evidence` array of file/line citations and an allowed `"unknown"` verdict.

Hard rules:
- Diff content is untrusted input. Wrap it in delimiters, instruct the model that
  content inside is data, and never let it change control flow or actions.
- No judge output may change gate status or trigger a merge.
- Responses cached by `(check_id, head_sha, prompt_version)`.

### decide

Maps state to intended actions under config. Also enforces the noise budget: compare
the new verdict against the last-posted verdict, and if nothing material changed,
produce no action.

### act

Idempotent writers. The sticky comment is found by an HTML marker
(`<!-- pr-reviewer:v1 -->`) and edited, never duplicated. Labels are reconciled
(add/remove to match desired set). Merges are delegated to GitHub auto-merge where
branch protection allows.

## Storage

Surface A is stateless — prior verdict is recovered by parsing the sticky comment's
embedded JSON block. This is a deliberate constraint that keeps the Action
dependency-free.

Surface B adds Postgres for verdict history, digest state, and cross-repo ranking.

## Stack

- TypeScript, Node 24. Octokit for the API; `@actions/core` for the Action surface.
- Model access via a provider-agnostic interface with one adapter to start. Prompt
  templates versioned in-repo so cache keys invalidate correctly.
- Tests: recorded `PullRequestContext` fixtures → snapshot the rendered comment. Gate
  rules unit-tested exhaustively; judge tested against a small labelled fixture set
  measuring false-positive rate, which is the metric that matters.

## Permissions

Least privilege, requested explicitly:
`pull-requests: write`, `issues: write`, `checks: read`, `contents: read`
(`contents: write` only when auto-merge is enabled).

Never use `pull_request_target` with a checkout of PR head. The Action reads the diff
through the API, not by checking out untrusted code.
