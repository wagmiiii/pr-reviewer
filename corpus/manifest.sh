#!/usr/bin/env bash
# Builds corpus/manifest.json by aggregating corpus/prs/*.json.
# Pure aggregation — makes no API calls, so it is cheap to re-run.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRS_DIR="$ROOT/prs"
LOGS_DIR="$ROOT/logs"
RAW_DIR="$ROOT/raw"
REPO="${REPO:-Tollcraft/soroban-cost-linter}"

expected_total="$(wc -l < "$RAW_DIR/pr-numbers.txt" 2>/dev/null || echo 0)"

log_results='[]'
[ -s "$RAW_DIR/log-results.jsonl" ] && log_results="$(jq -sc '.' "$RAW_DIR/log-results.jsonl")"

log_bytes=0
log_files=0
if [ -d "$LOGS_DIR" ]; then
  log_files="$(find "$LOGS_DIR" -name '*.zip' -type f | wc -l)"
  log_bytes="$(find "$LOGS_DIR" -name '*.zip' -type f -printf '%s\n' 2>/dev/null | awk '{s+=$1} END {print s+0}')"
fi
logs_gitignored=false
[ -f "$LOGS_DIR/.gitignore" ] && logs_gitignored=true

# The program goes in a file rather than an inline '...' argument: the notes
# below contain apostrophes and quoted jq values, and inside a single-quoted
# shell string each of those silently ends the quoting. A quoted heredoc takes
# the text verbatim.
PROG="$(mktemp)"
trap 'rm -f "$PROG"' EXIT

cat > "$PROG" <<'JQ_PROGRAM'

  # A PR document counts a section as "available" when the endpoint returned
  # data. Empty-but-successful (e.g. a PR with no reviews) is available-and-empty,
  # which is different from a failed fetch; failed fetches land in capture_errors.
  def avail($d):
    {
      metadata:        ($d.pull_request != null),
      reviews:         ($d.reviews != null),
      commits:         (($d.commits // []) | length > 0),
      files:           (($d.files // []) | length > 0),
      head_check_runs: ($d.head_check_runs != null and ($d.head_check_runs.total_count // 0) > 0),
      head_statuses:   ($d.head_statuses != null and ($d.head_statuses.total_count // 0) > 0),
      base_check_runs: ($d.base_branch_ci.check_runs != null and ($d.base_branch_ci.check_runs.total_count // 0) > 0),
      base_statuses:   ($d.base_branch_ci.statuses != null and ($d.base_branch_ci.statuses.total_count // 0) > 0),
      issue_comments:  ($d.issue_comments != null),
      review_comments: ($d.review_comments != null),
      mergeable_state: (($d.pull_request.mergeable_state // "unknown") != "unknown")
    };

  map(select(.fatal != true)) as $ok |
  map(select(.fatal == true))  as $fatal |

  ($ok | map(. as $d | {
     number: $d.pull_request.number,
     state: $d.pull_request.state,
     merged: $d.pull_request.merged,
     draft: $d.pull_request.draft,
     author: $d.pull_request.author.login,
     created_at: $d.pull_request.created_at,
     closed_at: $d.pull_request.closed_at,
     fork: $d.pull_request.head.fork,
     base_resolution: $d.base_branch_ci.resolution_method,
     base_approximate: $d.base_branch_ci.approximate,
     available: avail($d),
     head_failing: $d.analysis.head_failing_checks,
     base_failing: $d.analysis.base_failing_checks,
     failing_also_failing_on_base: $d.analysis.failing_also_failing_on_base,
     head_failing_statuses: $d.analysis.head_failing_statuses,
     issue_comment_count: $d.issue_comments.count,
     review_comment_count: $d.review_comments.count,
     review_count: ($d.reviews | length),
     errors: ($d.capture_errors | length)
   })) as $rows |

  {
    corpus: "PR-005 historical pull request archive",
    repo: $repo,
    captured_at: $captured_at,
    schema_version: 1,
    note: "Raw GitHub API capture. NOT yet shaped into the project's PullRequestContext type - that is ticket PR-012, which is gated on PR-011 defining the type.",

    totals: {
      pull_requests_expected: $expected_total,
      pull_requests_captured: ($rows | length),
      pull_requests_failed: ($fatal | length),
      merged:   ($rows | map(select(.merged)) | length),
      closed_unmerged: ($rows | map(select(.merged | not)) | length),
      open:     ($rows | map(select(.state == "open")) | length),
      drafts:   ($rows | map(select(.draft)) | length),
      from_forks: ($rows | map(select(.fork)) | length),
      distinct_authors: ($rows | map(.author) | unique | length)
    },

    date_range: {
      earliest_created: ($rows | map(.created_at) | sort | first),
      latest_created:   ($rows | map(.created_at) | sort | last),
      latest_closed:    ($rows | map(.closed_at | select(. != null)) | sort | last)
    },

    ci_summary: {
      with_head_check_runs:  ($rows | map(select(.available.head_check_runs)) | length),
      with_no_ci_at_all:     ($rows | map(select((.available.head_check_runs | not) and (.available.head_statuses | not))) | length),
      with_legacy_statuses:  ($rows | map(select(.available.head_statuses)) | length),
      with_failing_check:    ($rows | map(select((.head_failing | length) > 0)) | length),
      with_failing_status:   ($rows | map(select((.head_failing_statuses | length) > 0)) | length),
      with_base_check_runs:  ($rows | map(select(.available.base_check_runs)) | length),

      # THE decision-relevant number for PR-003 / differentiator #1.
      failing_and_same_check_failing_on_base:
        ($rows | map(select((.failing_also_failing_on_base | length) > 0)) | length),
      failing_and_base_was_green:
        ($rows | map(select(((.head_failing | length) > 0) and ((.failing_also_failing_on_base | length) == 0))) | length),

      failing_check_names:
        ($rows | map(.head_failing[]?) | group_by(.) | map({name: .[0], count: length}) | sort_by(-.count)),
      base_failing_check_names:
        ($rows | map(.base_failing[]?) | group_by(.) | map({name: .[0], count: length}) | sort_by(-.count))
    },

    conflict_summary: {
      note: "GitHub only computes mergeable/mergeable_state for OPEN pull requests. Every PR in this corpus is closed, so mergeable_state is 'unknown' throughout and MERGE_CONFLICT cannot be reconstructed retrospectively from the API.",
      mergeable_state_known: ($rows | map(select(.available.mergeable_state)) | length),
      mergeable_state_unknown: ($rows | map(select(.available.mergeable_state | not)) | length)
    },

    maintainer_effort: {
      note: "Comment volume is a proxy for how much manual nagging each PR cost.",
      total_issue_comments:  ($rows | map(.issue_comment_count) | add // 0),
      total_review_comments: ($rows | map(.review_comment_count) | add // 0),
      total_reviews:         ($rows | map(.review_count) | add // 0),
      prs_with_zero_comments: ($rows | map(select(.issue_comment_count == 0 and .review_comment_count == 0)) | length),
      max_issue_comments_on_one_pr: ($rows | map(.issue_comment_count) | max // 0)
    },

    base_resolution: {
      note: "The base commit a PR sat on. 'merge_commit_first_parent' is exact - the first parent of the merge commit is by definition the base branch tip at the moment of merge (true for merge and squash strategies alike). 'pull_request_base_sha' is APPROXIMATE - it is the .base.sha field GitHub recorded on the PR object, which reflects the base ref when the PR was created or last synchronised and may lag the tip the PR was really tested against. Unmerged PRs have no merge commit and can only use the approximate method.",
      exact:       ($rows | map(select(.base_approximate | not)) | length),
      approximate: ($rows | map(select(.base_approximate)) | length),
      approximate_pr_numbers: ($rows | map(select(.base_approximate) | .number) | sort)
    },

    logs: {
      note: "Workflow run logs are fetched only for runs attached to a FAILING check on a PR head - the fixtures PR-024's log extractor needs.",
      zip_files: $log_files,
      total_bytes: $log_bytes,
      total_mb: (($log_bytes / 1048576) * 100 | round / 100),
      gitignored: $logs_gitignored,
      gitignore_reason: (if $logs_gitignored then "Total log volume exceeded the ~50MB commit budget; logs/.gitignore contains '*'. The logs exist on the capture machine but are NOT committed. Re-fetch with ./capture.sh logs while they remain inside the GitHub Actions retention window." else null end),
      results: $log_results,
      unavailable: ($log_results | map(select(.ok | not)))
    },

    api_failures: {
      prs_with_partial_failures: ($rows | map(select(.errors > 0) | {number, errors})),
      prs_entirely_failed: ($fatal | map(.number)),
      total_endpoint_errors: ($rows | map(.errors) | add // 0)
    },

    per_pr: $rows,

    corpus_bytes: $corpus_bytes,
    corpus_mb: (($corpus_bytes / 1048576) * 100 | round / 100)
  }
JQ_PROGRAM

jq -s \
  --arg repo "$REPO" \
  --arg captured_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson expected_total "$expected_total" \
  --argjson log_results "$log_results" \
  --argjson log_files "$log_files" \
  --argjson log_bytes "$log_bytes" \
  --argjson logs_gitignored "$logs_gitignored" \
  --argjson corpus_bytes "$(du -sb "$ROOT" 2>/dev/null | cut -f1)" \
  -f "$PROG" "$PRS_DIR"/pr-*.json > "$ROOT/manifest.json"

echo "wrote $ROOT/manifest.json"
