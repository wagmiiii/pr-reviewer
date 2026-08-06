# Configuration

Config lives at `.github/pr-reviewer.yml` in the target repo.

The first draft of this document specified ~60 keys before a line of code existed.
Every key is a compatibility promise and a maintenance obligation, so this is cut to
what Phases 0–2 actually consume. Keys get added when a phase needs them, not in
advance.

Unknown keys are an **error**, not silently ignored. Silent misconfiguration on a bot
with write access is unacceptable.

## Phase 0–1

```yaml
version: 1

# Runs the full pipeline, writes nothing, prints the plan. Start here.
dry_run: true

rules:
  required_checks: [] # empty = use branch-protection required checks
  behind_base_threshold: 20 # untuned guess
  huge_diff_lines: 800 # untuned guess
  stale_days: 14 # untuned guess
  protected_paths:
    - ".github/workflows/**"
  disabled: [] # stable rule codes, e.g. ["STALE"]

labels:
  enabled: true
  prefix: "" # e.g. "bot/" to namespace them

comment:
  enabled: true
  ci_log_lines: 20
```

Every threshold above is a starting guess, not a researched default. Tune them against
a real queue and record what you changed and why — that record is more valuable than
the numbers.

## Phase 2 (add when the phase starts)

```yaml
digest:
  enabled: false
  issue_number: null # created on first run if null
  max_items_per_section: 10

stale:
  nudge_after_days: 14
  nudge_interval_days: 14
  # No close_after_days. The bot does not close PRs.

# Required for the NO_TEST_CHANGED / TESTS_REMOVED rules — repo-specific, no
# useful default. When unset, both rules report "not configured" rather than firing.
tests:
  paths:
    - "tests/**"
    - "**/*_test.*"
    - "**/*.test.*"
```

## Phase 3+ (add when the phase starts)

```yaml
judgment:
  enabled: false
  checks: [issue_resolution, effort_estimate] # the only two; see 03-review-pipeline.md
  shadow: true # write to digest marked unvalidated; exit shadow by hand
  max_diff_bytes: 120000
  # No `destination` key. Both checks are maintainer-facing, permanently — that is a
  # design decision (Q3), not a setting.

coverage:
  enabled: false
  source: artifact # artifact | codecov
  format: lcov
```

## Not configurable, by design

- **Merging.** There is no merge configuration because there is no merge feature.
- **Auto-closing PRs.**
- Heuristic rules blocking a PR. Bucket 2 is warn-only and that is not a setting.
- Sending judgment output to contributors. Maintainer-facing is permanent (Q3).

## Precedence

Defaults ← repo config ← Action inputs. Action inputs win so a maintainer can force
`dry_run` from the workflow without editing the config file.

## Adoption workflow

```yaml
# .github/workflows/pr-reviewer.yml
name: PR Reviewer

on:
  # Writes happen here: check_suite and schedule run in the base-repo
  # context with a full-permission token, including for fork PRs.
  check_suite:
    types: [completed]
  schedule:
    - cron: "0 8 * * 1-5"
  # Dry-run logging only. On fork PRs this token is read-only and
  # cannot comment or label — see docs/02-architecture.md.
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  pull-requests: write
  issues: write
  checks: read
  contents: read # never contents: write — the bot does not merge or push

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: <owner>/pr-reviewer@v1
        with:
          dry_run: true # flip to false once you trust the output
```

Note the absence of `pull_request_target` and the absence of a checkout step. The
Action never executes contributor code.

**Unverified assumption:** that `check_suite: completed` grants a writable token for
fork-originated PRs [Likely, not yet tested]. Phase −1 in the roadmap exists to confirm
this before anything depends on it.
