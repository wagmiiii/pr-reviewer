# Configuration

Config lives in the target repo at `.github/pr-reviewer.yml`. Every behaviour that
writes anything is opt-in or has a conservative default. Unknown keys are an error, not
silently ignored — silent misconfiguration on a bot with write access is unacceptable.

```yaml
version: 1

# Global kill switch. Runs the full pipeline, writes nothing, prints the plan.
dry_run: true

gate:
  required_checks: []          # empty = use branch-protection required checks
  behind_base_threshold: 20    # commits behind before BEHIND_BASE warns
  huge_diff_lines: 800
  require_linked_issue: warn   # off | warn | block
  require_dco: false
  protected_paths:
    - ".github/workflows/**"
    - "**/Dockerfile"
    - "scripts/release/**"
  disabled_rules: []           # stable rule codes, e.g. ["STALE"]

comment:
  enabled: true
  include_ci_logs: true
  ci_log_lines: 20
  include_rebase_instructions: true
  max_edits_per_day: 10

labels:
  enabled: true
  map:
    needs_ci_fix: "needs-ci-fix"
    has_conflicts: "has-conflicts"
    ready_for_review: "ready-for-review"
    needs_decision: "needs-maintainer-decision"
    stale: "stale"

digest:
  enabled: true
  target: issue                # issue | none
  issue_number: null           # created on first run if null
  schedule: "0 8 * * 1-5"
  max_items_per_section: 10

stale:
  enabled: false
  nudge_after_days: 14
  nudge_interval_days: 14
  warn_after_days: 30
  close_after_days: 45         # null = never close

judgment:
  enabled: false
  checks: [issue_resolution, test_presence, test_deletion, effort_estimate]
  destination: digest          # digest | comment | both
  max_diff_bytes: 120000
  min_confidence_to_report: 0.7

coverage:
  enabled: false
  source: artifact             # artifact | codecov
  artifact_name: coverage
  format: lcov                 # lcov | cobertura
  drop_threshold_pct: 1.0

automerge:
  enabled: false               # keep it that way unless you mean it
  max_lines: 50
  allow_paths:
    - "docs/**"
    - "**/*.md"
  trusted_authors: []
  min_merged_prs: 3
  allow_first_time_contributors: false
  method: native               # native = GitHub auto-merge (recommended)
```

## Precedence

Repo config overrides defaults. Action inputs override repo config (so a maintainer can
force `dry_run` from the workflow without editing the config file). Nothing overrides
the hard-coded auto-merge exclusions in `03-review-pipeline.md`.

## Adoption workflow

```yaml
# .github/workflows/pr-reviewer.yml
name: PR Reviewer
on:
  pull_request: { types: [opened, synchronize, reopened, ready_for_review] }
  check_suite: { types: [completed] }
  schedule: [{ cron: "0 8 * * 1-5" }]

permissions:
  pull-requests: write
  issues: write
  checks: read
  contents: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: <owner>/pr-reviewer@v1
        with:
          dry_run: true        # flip to false once you trust the output
```

Note the absence of `pull_request_target` and the absence of a checkout step — the
Action never executes contributor code.
