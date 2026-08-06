# Architecture

## Shape

One core engine, two delivery surfaces. The engine is a pure library; the surfaces
differ only in how they get a token, how they're triggered, and where they write.

```
                 ┌──────────────────────────────┐
                 │       core engine (lib)      │
   PR context ──▶│ collect → rules → judge      │──▶ Verdict (JSON)
                 │                  ↓           │
                 │              renderers       │──▶ Markdown / labels
                 └──────────────────────────────┘
                        ▲                 │
        ┌───────────────┴──────┐   ┌──────┴─────────────┐
        │  Surface A: Action   │   │ Surface B: App     │
        │  runs in target repo │   │ hosted webhooks    │
        │  GITHUB_TOKEN        │   │ installation token │
        └──────────────────────┘   └────────────────────┘
```

**Surface A — GitHub Action (ship first).** No hosting, no secrets to manage, adopted
by committing one workflow file. Subject to the trigger constraint below.

**Surface B — GitHub App (only if demanded).** Needed for cross-repo views, sub-minute
reaction, and org-level install. Building it first is how this project dies in
infrastructure work.

## Trigger model — read this before writing any code

**Constraint:** for `pull_request` events originating from a **forked** repository,
`GITHUB_TOKEN` is read-only, and the workflow's `permissions:` block cannot raise it
[Likely]. Drive-by contributors work from forks, so this is precisely the population
that matters.

Ways out, and why each was or wasn't taken:

> **Amended 2026-08-06 by PR-003.** `check_suite: completed` was recorded here as
> **Chosen**. PR-001 refuted it. The table below is the corrected version; see
> `docs/spikes/fork-token.md` and `docs/decisions/PR-003-go-no-go.md`.

| Option | Verdict |
|---|---|
| `check_suite: completed` + `schedule` | **Rejected — was Chosen, refuted by PR-001.** `check_suite` does not fire when the check suite was created by GitHub Actions [Certain — documented], and 100% of check suites on the target repo are created by GitHub Actions [Certain]. It would have fired **zero times**. |
| `workflow_run: completed` + `schedule` | **Chosen, pending PR-051 confirmation.** Documented to receive secrets and a write token "even if the previous workflow was not". The ecosystem's standard fix for exactly this problem. |
| `pull_request_target` | **Fallback, no longer rejected outright.** The exploit is `pull_request_target` *plus a checkout of contributor code*. This design never checks out and never executes contributor code, so the original rejection was made against a stronger threat model than we present. Take it if `workflow_run`'s config burden proves unacceptable. |
| PAT or GitHub App token in the Action | **Rejected for Phase 1.** Kills the "one file, no secrets" adoption story. |

**Non-negotiable invariant for either chosen option:** the Action **never checks out and
never executes contributor code**. `act` makes API calls only. This must be enforced by a
test — see `tests/architecture.test.ts` — not by convention. It is the entire reason both
`workflow_run` and `pull_request_target` are safe here, and a future contributor adding a
`checkout` step would silently turn this into a remote-code-execution hole.

Consequences, accepted explicitly:

- Writes happen when the upstream workflow finishes or when the cron fires — **not**
  within seconds of a push. The latency promise is "one CI cycle", not "instant".
- **`workflow_run` requires the adopter to name their CI workflow.** The adoption story is
  "one file, tell us your CI workflow name", not "one file, zero config". Say so in the
  README rather than discovering it in an issue.
- `pull_request` is still subscribed, but only to compute and log a verdict in dry-run.
  It never attempts a write.
- The `schedule` sweep is the safety net, and is **eventually-consistent, not a latency
  guarantee**: 5-minute floor, best-effort under load, and auto-disabled after 60 days of
  repo inactivity [Certain] — a real hole for a quiet repo.

**Still unverified end-to-end.** No `workflow_run` run exists on the target repo. PR-051
confirms against a real fork PR before Phase 1 ships. If it doesn't hold, take the
fallback; if neither holds, Surface A is not viable and Surface B moves up the roadmap.

## Pipeline

```
trigger
  → collect    gather facts (GitHub API, CI logs, coverage artifacts)
  → rules      Bucket 1 facts + Bucket 2 heuristics → status + findings
  → judge      [Phase 3+, and only sometimes] advisory findings
  → decide     map (findings, prior state, config) → intended actions
  → act        labels / sticky comment / digest
```

`collect` is the only stage that reads I/O; `act` is the only stage that writes. Dry-run
is therefore just "run everything, skip `act`, print the plan".

One honest caveat: `collect` is not perfectly pure — fetching logs for *failing* jobs
requires first knowing which jobs failed. It over-fetches within the stage (check runs,
then logs for any non-success conclusion) rather than splitting into two stages.

### collect

Produces a `PullRequestContext`: a single serialisable snapshot. Everything downstream
reads only this, which makes the engine testable against recorded fixtures.

### rules

Pure, synchronous, no network, no model. Each rule returns `pass | fail | skip` with a
stable code, a human explanation, and a **bucket** (`fact` or `heuristic`).

Status, derived only from `fact` rules:

- `BLOCKED_ON_CONTRIBUTOR` — something only they can fix
- `BLOCKED_ON_MAINTAINER` — needs a decision, a secret, a re-run, or main is broken
- `WAITING` — CI still running, or draft
- `READY_FOR_REVIEW` — a human should look

Heuristic rules attach warnings to the verdict but can never change the status.

### judge (Phase 3+)

Fires only when `rules` reports a *transition* into `READY_FOR_REVIEW` — comparing
against prior state, not on every sweep. Once per eventually-reviewable PR.

Two checks (J1, J7), each a model call with a JSON-schema response, mandatory
`file:line` evidence citations, and a permitted `"unknown"`. A response with an empty
evidence array is dropped rather than repaired. Diff content is untrusted input: delimiter-framed, no tool
access, and structurally incapable of triggering a write. Cached by
`(check, head_sha, prompt_version)`.

### decide

Maps findings plus prior state to intended actions, and enforces the noise budget: if
the verdict hash is unchanged from the last run, produce nothing.

### act

Idempotent writers. Labels are reconciled to a desired set. The sticky comment is
located by an HTML marker (`<!-- pr-reviewer:v1 -->`) and edited, never duplicated.

## State

Prior verdicts are needed for change detection. Two tiers:

1. **Actions cache**, keyed by repo + PR number. Works in dry-run, which the
   comment-only approach did not — dry-run posts no comment and would otherwise never
   have prior state to compare against.
2. **Fallback:** a hidden JSON block in the sticky comment, for cache misses and cache
   eviction.

The comment block is **untrusted**: anyone with write access can edit it [Certain], and
comment bodies cap at 65,536 characters [Likely]. Schema-validate it; on any failure,
treat as "no prior state" and continue.

Surface B replaces both with Postgres.

## Stack

- TypeScript, Node 24. Octokit for the API, `@actions/core` for Surface A.
- Model access behind a provider-agnostic interface, deferred until Phase 3. Prompt
  templates versioned in-repo so cache keys invalidate correctly.
- Tests: recorded `PullRequestContext` fixtures → snapshot the rendered output. Fact
  rules unit-tested exhaustively. Heuristic rules tested for *false-positive rate*
  against real fixtures, since that's their only failure mode that matters.

## Permissions

Least privilege: `pull-requests: write`, `issues: write`, `checks: read`,
`contents: read`.

`contents: write` is **never** requested — the bot does not merge, push, or close.

No `pull_request_target`. No checkout of contributor code. The diff is read through the
API and never executed.
