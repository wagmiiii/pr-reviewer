#!/usr/bin/env bash
# PR-005 — historical PR corpus capture for Tollcraft/soroban-cost-linter
#
# Captures, per pull request: metadata, reviews, commits, changed files,
# check runs + legacy commit statuses for the head SHA, the resolved base SHA
# and ITS check runs/statuses (the CI_FAILING vs CI_BROKEN_ON_BASE signal),
# and issue/review comments.
#
# Idempotent and resumable: a PR whose corpus/prs/pr-<n>.json already exists is
# skipped unless FORCE=1. Logs are fetched in a separate, final phase.
#
# Usage:
#   ./capture.sh              # capture all PRs, then manifest
#   ./capture.sh prs          # PR JSON only
#   ./capture.sh logs         # workflow logs only (needs prs done)
#   ./capture.sh manifest     # rebuild manifest.json from existing prs/
#   FORCE=1 ./capture.sh prs  # re-capture even if the file exists
#
# Requires: gh (authenticated), jq.

set -uo pipefail

REPO="${REPO:-Tollcraft/soroban-cost-linter}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRS_DIR="$ROOT/prs"
LOGS_DIR="$ROOT/logs"
RAW_DIR="$ROOT/raw"
PARALLEL="${PARALLEL:-6}"
LOG_BUDGET_MB="${LOG_BUDGET_MB:-50}"

mkdir -p "$PRS_DIR" "$LOGS_DIR" "$RAW_DIR"

# ---------------------------------------------------------------- helpers ---

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# gh api wrapper: prints JSON on success, prints nothing and returns 1 on error.
# The error text is appended to a per-PR error file.
api() {
  local errfile="$1"; shift
  local out err rc
  err="$(mktemp)"
  out="$(gh api "$@" 2>"$err")"; rc=$?
  if [ $rc -ne 0 ]; then
    jq -cn --arg ep "$1" --arg msg "$(head -c 500 "$err" | tr -d '\000')" \
      '{endpoint:$ep, error:$msg}' >> "$errfile"
    rm -f "$err"
    return 1
  fi
  rm -f "$err"
  printf '%s' "$out"
  return 0
}

# Secret scrubbing. Applied to every assembled document before it is written.
# Covers GitHub tokens (classic + fine-grained), AWS keys, Slack tokens,
# bearer/authorization headers, generic long hex/base64 secrets in obvious
# key=value form, and PEM private key blocks.
scrub() {
  sed -E \
    -e 's/gh[pousr]_[A-Za-z0-9]{16,}/[REDACTED_GITHUB_TOKEN]/g' \
    -e 's/github_pat_[A-Za-z0-9_]{20,}/[REDACTED_GITHUB_PAT]/g' \
    -e 's/AKIA[0-9A-Z]{16}/[REDACTED_AWS_KEY_ID]/g' \
    -e 's/ASIA[0-9A-Z]{16}/[REDACTED_AWS_STS_KEY_ID]/g' \
    -e 's/xox[abposr]-[A-Za-z0-9-]{10,}/[REDACTED_SLACK_TOKEN]/g' \
    -e 's/sk-[A-Za-z0-9]{32,}/[REDACTED_API_KEY]/g' \
    -e 's/(-----BEGIN [A-Z ]*PRIVATE KEY-----)[^-]*/\1[REDACTED]/g' \
    -e 's/([Bb]earer )[A-Za-z0-9._~+\/-]{20,}=*/\1[REDACTED]/g' \
    -e 's/(([Aa]uthorization|[Tt]oken|[Ss]ecret|[Pp]assword|[Aa]pi[_-]?[Kk]ey)[\\"'"'"': =]{1,6})[A-Za-z0-9._~+\/-]{24,}=*/\1[REDACTED]/g'
}

check_rate() {
  local rem
  rem="$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null)" || return 0
  [ -z "$rem" ] && return 0
  if [ "$rem" -lt 300 ]; then
    local reset now sleep_for
    reset="$(gh api rate_limit --jq '.resources.core.reset' 2>/dev/null)"
    now="$(date +%s)"
    sleep_for=$(( reset - now + 10 ))
    [ "$sleep_for" -lt 1 ] && sleep_for=60
    log "RATE LIMIT: $rem core requests left, sleeping ${sleep_for}s"
    sleep "$sleep_for"
  fi
}

# ------------------------------------------------------------ per-PR fetch ---

capture_pr() {
  local n="$1"
  local out="$PRS_DIR/pr-${n}.json"
  [ -f "$out" ] && [ "${FORCE:-0}" != "1" ] && return 0

  local tmp errfile
  tmp="$(mktemp -d)"
  errfile="$tmp/errors.jsonl"
  : > "$errfile"

  # --- 1. the pull request itself -------------------------------------------
  local pr
  pr="$(api "$errfile" "repos/$REPO/pulls/$n")" || {
    jq -cn --arg n "$n" --slurpfile e "$errfile" \
      '{number:($n|tonumber), fatal:true, capture_errors:$e}' > "$out"
    rm -rf "$tmp"; return 1
  }

  local head_sha base_ref base_sha merge_sha merged
  head_sha="$(jq -r '.head.sha // ""' <<<"$pr")"
  base_ref="$(jq -r '.base.ref // ""' <<<"$pr")"
  base_sha="$(jq -r '.base.sha // ""' <<<"$pr")"
  merge_sha="$(jq -r '.merge_commit_sha // ""' <<<"$pr")"
  merged="$(jq -r '.merged // false' <<<"$pr")"

  # --- 2. reviews / commits / files / comments ------------------------------
  local reviews commits files icomments rcomments
  # gh api --paginate merges JSON array responses into a single array.
  reviews="$(api   "$errfile" "repos/$REPO/pulls/$n/reviews?per_page=100"   --paginate)" || reviews='[]'
  commits="$(api   "$errfile" "repos/$REPO/pulls/$n/commits?per_page=100"   --paginate)" || commits='[]'
  files="$(api     "$errfile" "repos/$REPO/pulls/$n/files?per_page=100"     --paginate)" || files='[]'
  icomments="$(api "$errfile" "repos/$REPO/issues/$n/comments?per_page=100" --paginate)" || icomments='[]'
  rcomments="$(api "$errfile" "repos/$REPO/pulls/$n/comments?per_page=100"  --paginate)" || rcomments='[]'

  # --- 3. head SHA CI -------------------------------------------------------
  local head_checks head_status
  head_checks="$(api "$errfile" "repos/$REPO/commits/$head_sha/check-runs?per_page=100")" \
    || head_checks='null'
  head_status="$(api "$errfile" "repos/$REPO/commits/$head_sha/status?per_page=100")" \
    || head_status='null'

  # --- 4. resolve the base commit the PR actually sat on --------------------
  # Preference order:
  #   exact       - first parent of the merge commit == the base branch tip at
  #                 the moment of merge. True for both merge and squash merges.
  #   approximate - .base.sha from the PR object. GitHub records this when the
  #                 PR is created/synced, so for a long-lived PR it may lag the
  #                 real tip; it is also all that exists for unmerged PRs.
  local resolved_base="" base_method="" base_approx=true base_note=""
  if [ "$merged" = "true" ] && [ -n "$merge_sha" ]; then
    local mc
    if mc="$(api "$errfile" "repos/$REPO/git/commits/$merge_sha")"; then
      resolved_base="$(jq -r '.parents[0].sha // ""' <<<"$mc")"
      if [ -n "$resolved_base" ]; then
        base_method="merge_commit_first_parent"
        base_approx=false
        base_note="Exact: first parent of merge commit $merge_sha is the $base_ref tip at merge time."
      fi
    fi
  fi
  if [ -z "$resolved_base" ]; then
    resolved_base="$base_sha"
    base_method="pull_request_base_sha"
    base_approx=true
    if [ "$merged" = "true" ]; then
      base_note="APPROXIMATE: merge commit parent unavailable; using .base.sha recorded on the PR object, which may predate the tip the PR was finally tested against."
    else
      base_note="APPROXIMATE: PR was not merged, so no merge commit exists. .base.sha is the $base_ref tip as recorded when the PR was created or last synced."
    fi
  fi

  local base_checks base_status
  base_checks='null'; base_status='null'
  if [ -n "$resolved_base" ]; then
    base_checks="$(api "$errfile" "repos/$REPO/commits/$resolved_base/check-runs?per_page=100")" \
      || base_checks='null'
    base_status="$(api "$errfile" "repos/$REPO/commits/$resolved_base/status?per_page=100")" \
      || base_status='null'
  fi

  # --- 5. assemble ----------------------------------------------------------
  jq -n \
    --argjson pr "$pr" \
    --argjson reviews "$reviews" \
    --argjson commits "$commits" \
    --argjson files "$files" \
    --argjson icomments "$icomments" \
    --argjson rcomments "$rcomments" \
    --argjson head_checks "$head_checks" \
    --argjson head_status "$head_status" \
    --argjson base_checks "$base_checks" \
    --argjson base_status "$base_status" \
    --arg repo "$REPO" \
    --arg captured_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg resolved_base "$resolved_base" \
    --arg base_method "$base_method" \
    --argjson base_approx "$base_approx" \
    --arg base_note "$base_note" \
    --slurpfile errors "$errfile" '
    def person: if . == null then null else {login, id, type} end;
    def normrun: {
      name, status, conclusion, started_at, completed_at, details_url,
      app: (.app.slug // null),
      workflow_run_id: (
        (.details_url // "") | capture("/actions/runs/(?<id>[0-9]+)").id? // null
      )
    };
    def checkblock: if . == null then null else {
      total_count: .total_count,
      check_runs: [.check_runs[] | normrun]
    } end;
    def statusblock: if . == null then null else {
      state: .state,
      total_count: .total_count,
      statuses: [.statuses[] | {context, state, description, target_url, created_at, updated_at}]
    } end;
    def failing(c): if c == null then [] else
      [c.check_runs[] | select(.conclusion as $x
        | ["failure","timed_out","cancelled","action_required","stale"] | index($x))] end;

    ($head_checks | checkblock) as $hc |
    ($base_checks | checkblock) as $bc |
    ($head_status | statusblock) as $hs |
    ($base_status | statusblock) as $bs |
    (failing($hc)) as $hf |
    (failing($bc)) as $bf |

    {
      schema_version: 1,
      captured_at: $captured_at,
      repo: $repo,

      pull_request: {
        number: $pr.number,
        title: $pr.title,
        body: $pr.body,
        author: ($pr.user | person),
        author_association: $pr.author_association,
        state: $pr.state,
        draft: $pr.draft,
        merged: $pr.merged,
        created_at: $pr.created_at,
        updated_at: $pr.updated_at,
        merged_at: $pr.merged_at,
        closed_at: $pr.closed_at,
        merged_by: ($pr.merged_by | person),
        mergeable: $pr.mergeable,
        mergeable_state: $pr.mergeable_state,
        rebaseable: $pr.rebaseable,
        merge_commit_sha: $pr.merge_commit_sha,
        base: {ref: $pr.base.ref, sha: $pr.base.sha, repo: $pr.base.repo.full_name},
        head: {ref: $pr.head.ref, sha: $pr.head.sha,
               repo: ($pr.head.repo.full_name // null),
               fork: (($pr.head.repo.full_name // "") != ($pr.base.repo.full_name // ""))},
        labels: [$pr.labels[]?.name],
        milestone: ($pr.milestone.title // null),
        requested_reviewers: [$pr.requested_reviewers[]? | person],
        assignees: [$pr.assignees[]? | person],
        additions: $pr.additions, deletions: $pr.deletions,
        changed_files: $pr.changed_files, commits: $pr.commits,
        comments: $pr.comments, review_comments: $pr.review_comments,
        html_url: $pr.html_url
      },

      reviews: [$reviews[] | {
        id, state, submitted_at, author_association,
        user: (.user | person),
        body_present: ((.body // "") | length > 0),
        body: .body
      }],
      review_states: ([$reviews[] | .state] | group_by(.) | map({state: .[0], count: length})),

      commits: [$commits[] | {
        sha,
        message: .commit.message,
        author_name: .commit.author.name,
        author_email: .commit.author.email,
        authored_at: .commit.author.date,
        committed_at: .commit.committer.date,
        author: (.author | person),
        committer: (.committer | person),
        verified: .commit.verification.verified,
        signed_off: ((.commit.message // "") | test("(?m)^Signed-off-by:"))
      }],

      files: [$files[] | {filename, status, additions, deletions, changes,
                          previous_filename: (.previous_filename // null)}],

      head_check_runs: $hc,
      head_statuses: $hs,

      base_branch_ci: {
        resolved_sha: $resolved_base,
        resolution_method: $base_method,
        approximate: $base_approx,
        note: $base_note,
        pull_request_base_sha: $pr.base.sha,
        check_runs: $bc,
        statuses: $bs
      },

      issue_comments: {
        count: ($icomments | length),
        authors: ([$icomments[] | .user.login] | group_by(.) | map({login: .[0], count: length})),
        comments: [$icomments[] | {id, created_at, updated_at,
                                   user: (.user | person),
                                   author_association, body}]
      },
      review_comments: {
        count: ($rcomments | length),
        authors: ([$rcomments[] | .user.login] | group_by(.) | map({login: .[0], count: length})),
        comments: [$rcomments[] | {id, created_at, path, line, original_line,
                                   user: (.user | person),
                                   author_association, in_reply_to_id, body}]
      },

      analysis: {
        head_has_ci: ($hc != null and ($hc.total_count // 0) > 0),
        base_has_ci: ($bc != null and ($bc.total_count // 0) > 0),
        head_failing_checks: [$hf[] | .name],
        base_failing_checks: [$bf[] | .name],
        # The decision-relevant field: a check failing on the head whose
        # same-named check was ALSO failing on the resolved base commit.
        failing_also_failing_on_base:
          ([$hf[] | .name] - ([$hf[] | .name] - [$bf[] | .name])) | unique,
        head_failing_statuses: [$hs.statuses[]? | select(.state == "failure" or .state == "error") | .context],
        base_failing_statuses: [$bs.statuses[]? | select(.state == "failure" or .state == "error") | .context],
        workflow_run_ids_for_failures: ([$hf[] | .workflow_run_id | select(. != null)] | unique),
        all_head_workflow_run_ids: ([$hc.check_runs[]? | .workflow_run_id | select(. != null)] | unique),
        merge_conflict: ($pr.mergeable_state == "dirty")
      },

      capture_errors: $errors
    }' | scrub > "$out"

  if [ ! -s "$out" ]; then
    log "PR $n: assembly produced empty output"
    rm -f "$out"
    rm -rf "$tmp"
    return 1
  fi
  rm -rf "$tmp"
  return 0
}

# ------------------------------------------------------------------ phases ---

phase_prs() {
  log "Enumerating pull requests on $REPO"
  gh api "repos/$REPO/pulls?state=all&per_page=100" --paginate --jq '.[].number' \
    | sort -n > "$RAW_DIR/pr-numbers.txt"
  local total; total="$(wc -l < "$RAW_DIR/pr-numbers.txt")"
  log "Found $total pull requests"

  export -f capture_pr api scrub log
  export REPO PRS_DIR RAW_DIR FORCE

  # Chunk the work so the rate limit is re-checked between batches.
  local batch=0
  split -l 30 "$RAW_DIR/pr-numbers.txt" "$RAW_DIR/chunk-"
  for f in "$RAW_DIR"/chunk-*; do
    batch=$((batch+1))
    log "Batch $batch ($(wc -l < "$f") PRs)"
    xargs -a "$f" -P "$PARALLEL" -I{} bash -c 'capture_pr "$@"' _ {}
    check_rate
  done
  rm -f "$RAW_DIR"/chunk-*
  log "PR capture complete: $(ls -1 "$PRS_DIR" | wc -l) files"
}

phase_logs() {
  log "Collecting workflow run ids for failing checks"
  # Only runs attached to a FAILING check on a PR head — the ones PR-024 needs.
  jq -r '.analysis.workflow_run_ids_for_failures[]?' "$PRS_DIR"/pr-*.json \
    | sort -u > "$RAW_DIR/failing-run-ids.txt"
  local n; n="$(wc -l < "$RAW_DIR/failing-run-ids.txt")"
  log "$n distinct workflow runs to fetch logs for"
  [ "$n" -eq 0 ] && return 0

  : > "$RAW_DIR/log-results.jsonl"
  while read -r rid; do
    [ -z "$rid" ] && continue
    local dest="$LOGS_DIR/run-${rid}.zip"
    if [ -f "$dest" ]; then continue; fi
    if gh api "repos/$REPO/actions/runs/$rid/logs" > "$dest" 2>"$RAW_DIR/log-err.txt"; then
      jq -cn --arg id "$rid" --arg bytes "$(stat -c%s "$dest")" \
        '{run_id:$id, ok:true, bytes:($bytes|tonumber)}' >> "$RAW_DIR/log-results.jsonl"
    else
      rm -f "$dest"
      jq -cn --arg id "$rid" --arg msg "$(head -c 300 "$RAW_DIR/log-err.txt")" \
        '{run_id:$id, ok:false, error:$msg}' >> "$RAW_DIR/log-results.jsonl"
    fi
  done < "$RAW_DIR/failing-run-ids.txt"
  rm -f "$RAW_DIR/log-err.txt"

  # Budget check: if the logs are bulky, keep them locally but out of git.
  local mb; mb="$(du -sm "$LOGS_DIR" 2>/dev/null | cut -f1)"
  log "Log volume: ${mb}MB (budget ${LOG_BUDGET_MB}MB)"
  if [ "${mb:-0}" -gt "$LOG_BUDGET_MB" ]; then
    printf '*\n' > "$LOGS_DIR/.gitignore"
    log "Log volume exceeds budget - wrote logs/.gitignore (*)"
  fi
}

phase_manifest() {
  log "Building manifest"
  bash "$ROOT/manifest.sh"
}

case "${1:-all}" in
  prs)      phase_prs ;;
  logs)     phase_logs ;;
  manifest) phase_manifest ;;
  all)      phase_prs; phase_logs; phase_manifest ;;
  *) echo "usage: $0 [all|prs|logs|manifest]" >&2; exit 2 ;;
esac
