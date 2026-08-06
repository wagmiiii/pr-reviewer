#!/usr/bin/env bash
# PR-004 — premise measurement against the archive.
#
# Answers the questions PR-004 was supposed to answer by installing bots and
# waiting a week, using the captured history instead. Pure derivation over
# corpus/prs/*.json — no API calls, no rules engine, so it runs today rather
# than after Sprint 1.
#
# Every number it prints is a direct count. Where a question cannot be answered
# from history at all, it says so rather than substituting a weaker proxy.
#
# Usage: ./premise.sh [> ../docs/spikes/premise-findings.json]
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Maintainer-authored comments are identified by author_association, which
# GitHub sets per comment: OWNER and MEMBER are the repo's own people,
# COLLABORATOR has push access. CONTRIBUTOR and NONE are the PR authors.
#
# The "nag" classification is a keyword match over comment bodies and is
# therefore approximate — it is a floor, not an exact count. It matches the
# vocabulary a maintainer uses when telling someone their PR is not mergeable
# yet: CI/checks failing, rebase/merge conflicts, update your branch.
PROG="$(mktemp)"
trap 'rm -f "$PROG"' EXIT

cat > "$PROG" <<'JQ_PROGRAM'
  def is_maintainer: . == "OWNER" or . == "MEMBER" or . == "COLLABORATOR";

  # Two things this had to learn from reading the corpus rather than guessing:
  #
  #   - This maintainer types "CL" for "CI" constantly. "fix your cl" is the
  #     single most common comment in the whole history. A regex written from
  #     imagination misses 14 of them.
  #   - "resolve conflicts" appears bare, with no "the" and no "with the base
  #     branch". Requiring the long form loses most of them.
  #
  # Comments addressed to @dependabot are excluded: "@dependabot rebase" is a
  # maintainer driving a bot, not nagging a human.
  def is_nag:
    ascii_downcase as $b
    | ($b | test("^\\s*@dependabot")) as $to_bot
    | ($to_bot | not)
      and ($b | test(
        "ci (is |are )?(currently |now )?fail|failing ci|checks? (are |is )?(currently |now )?fail|failing checks?"
      + "|fix (your |the )?ci\\b|fix (your |the )?cl\\b|red ci"
      + "|fix (your |the )?checks?|build (is )?fail|tests? (are |is )?fail"
      + "|rebase|merge conflicts?|conflicts? with|resolve[a-z]* (your |the )?conflicts?"
      + "|update your branch|out of date with|behind main|behind master"
      + "|sign the cla|\\bdco\\b"));

  def hours_open:
    if .pull_request.closed_at == null then null
    else ((.pull_request.closed_at | fromdateiso8601)
          - (.pull_request.created_at | fromdateiso8601)) / 3600
    end;

  map({
    number: .pull_request.number,
    merged: .pull_request.merged,
    fork: .pull_request.head.fork,
    author: .pull_request.author.login,
    assoc: .pull_request.author_association,
    hours: hours_open,
    head_failing: (.analysis.head_failing_checks | length),
    base_failing_same: (.analysis.failing_also_failing_on_base | length),
    has_ci: .analysis.head_has_ci,
    maintainer_comments: [
      .issue_comments.comments[]?
      | select(.author_association | is_maintainer)
    ],
  }
  | . + {
      nag_comments: [ .maintainer_comments[] | select(.body | is_nag) ]
    }) as $rows

  | ($rows | map(select(.head_failing > 0))) as $failing
  | ($rows | map(select((.nag_comments | length) > 0))) as $nagged

  | {
      population: {
        pull_requests: ($rows | length),
        from_forks: ($rows | map(select(.fork)) | length),
        distinct_authors: ($rows | map(.author) | unique | length),
        merged: ($rows | map(select(.merged)) | length)
      },

      # Q1. Did contributor PRs actually arrive broken?
      broken_on_arrival: {
        with_failing_check: ($failing | length),
        share_of_all: (($failing | length) * 1000 / ($rows | length) | round / 10),
        with_no_ci_at_all: ($rows | map(select(.has_ci | not)) | length)
      },

      # Q2. Differentiator #1 - was the failure even the contributor's fault?
      blame: {
        failing_and_base_also_failing:
          ($failing | map(select(.base_failing_same > 0)) | length),
        failing_and_base_was_green:
          ($failing | map(select(.base_failing_same == 0)) | length),
        share_not_contributors_fault:
          (($failing | map(select(.base_failing_same > 0)) | length) * 1000
           / (($failing | length) | if . == 0 then 1 else . end) | round / 10)
      },

      # Q3. The premise itself - did a human have to do the nagging by hand?
      manual_nagging: {
        prs_needing_a_nag: ($nagged | length),
        share_of_all: (($nagged | length) * 1000 / ($rows | length) | round / 10),
        total_nag_comments: ($nagged | map(.nag_comments | length) | add // 0),
        total_maintainer_comments: ($rows | map(.maintainer_comments | length) | add // 0),
        nagged_prs_that_still_merged: ($nagged | map(select(.merged)) | length),
        note: "Keyword match over maintainer comment bodies. A floor, not an exact count - a nag phrased unusually is missed. Never an overcount in the other direction is not claimed."
      },

      # Q4. How long did a blocked PR sit before anyone said anything?
      latency_hours: {
        median_open_to_close:
          ($rows | map(.hours | select(. != null)) | sort
           | if length == 0 then null else .[(length / 2 | floor)] end | . * 10 | round / 10),
        median_when_nagged:
          ($nagged | map(.hours | select(. != null)) | sort
           | if length == 0 then null else .[(length / 2 | floor)] end | . * 10 | round / 10),
        median_when_not_nagged:
          ($rows | map(select((.nag_comments | length) == 0) | .hours | select(. != null)) | sort
           | if length == 0 then null else .[(length / 2 | floor)] end | . * 10 | round / 10)
      },

      # Stated, not silently omitted.
      unanswerable_from_history: [
        "MERGE_CONFLICT rate. GitHub computes mergeable_state only for open PRs; all 159 here are closed, so the field is 'unknown' throughout.",
        "Noise budget. Comment volume under a bot can only be observed live.",
        "Whether the maintainer's experience improves. A replay measures rule accuracy, not relief.",
        "Time-to-first-actionable-feedback under the bot. The historical figure is a baseline for a future comparison, not a result."
      ]
    }
JQ_PROGRAM

jq -s -f "$PROG" "$ROOT"/prs/pr-*.json
