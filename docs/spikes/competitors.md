# PR-002 — Competitor research

**Owner:** Allison Muyideen · **Date:** 2026-08-05 · **Timebox:** ~45 min

Not a market survey. Three specific questions, from `docs/00-concept.md`
§ Differentiation. Anything already covered by an existing tool stops being a reason
to build this.

Confidence tags: [Certain] / [Likely] / [Guessing].

---

## Q1 — Does anything assign a _blockage owner_ (contributor vs maintainer)?

**No. This is genuinely uncovered.** [Likely — absence of evidence across the tools
surveyed, not proof of absence]

What exists:

- **Mergify** labels by _condition_. It can add `needs-rebase` on conflict, comment
  tagging the author, and remove the label when resolved. It can toggle a label on CI
  failure status. [Certain — documented behaviour]
- **Label Conflicting Pull Requests** (marketplace action) does the conflict label alone.
- **GitHub search** filters by `status:failure`, labels, review state.

What none of them do:

- Answer "**whose problem is this?**" A red CI, a missing required check, a workflow-file
  change, and a broken `main` all produce different labels in Mergify but none of them
  tell the maintainer that three of those are theirs and one is the contributor's.
- **Distinguish `CI_FAILING` from `CI_BROKEN_ON_BASE`.** No surveyed tool compares the
  failing check against the base branch before assigning blame. Mergify has automatic CI
  retries for flaky checks in the merge queue [Certain, shipped 2026-03], which is a
  different problem — it protects the queue, it does not stop a contributor being blamed
  for someone else's breakage.

**Verdict: this survives as a differentiator, and it is the strongest one.**

---

## Q2 — Does anything turn a red CI into _specific, actionable instructions_?

**Yes, the concept is proven — but the GitHub Actions implementation is weak and
fragmented.** [Likely]

What exists:

- **ci-reporter** (Probot app) does almost exactly the intended thing: on a failed
  status it finds the part of the build that failed and comments back on the PR, with
  configurable update-in-place vs new-comment and message templates. **It supports
  TravisCI and CircleCI only** — not GitHub Actions. [Certain — stated in its own docs]
- **ci-friend** extracts failing tests from a Travis log and comments. Travis-only.
- **GitHub Actions Failure Analysis** (marketplace) analyses failures with
  `post-pr-comment: true`.
- **pytest-github-actions-annotate-failures** annotates failed tests inline — but it is
  a pytest plugin, so it is per-language and requires the contributor's own CI to adopt it.
- Various `workflow_run` + `create-or-update-comment` recipes.

The honest reading: **we were wrong to call this uncovered.** The idea has been
implemented repeatedly. What's missing is a maintained, CI-agnostic, GitHub
Actions-native version — ci-reporter is the closest and it predates Actions being the
dominant CI.

**Verdict: survives as a differentiator, but a much narrower one than claimed. It is an
implementation gap, not a conceptual one.**

---

## Q3 — Does anything verify _issue linkage_?

**Existence checking: fully covered, by several free actions.** [Certain]

- **Verify Linked Issue** — fails the check and comments when a PR body has no issue
  reference.
- **nearform/github-action-check-linked-issues** — same, and handles cross-repo
  references (`org/repo#123`, full URLs) which our planned regex would miss.
- **Validate Issues over Pull Requests**, **Pull Request Ticket Check Action** — same
  space.
- All installable as required status checks today.

**Verification that the diff actually addresses the issue: uncovered** — but that is our
J1, which is P3, gated behind PR-100, digest-only, and explicitly allowed to be cancelled.

**Verdict: this does NOT survive as a differentiator.** Drop it from
`docs/00-concept.md` § Differentiation. Our `NO_LINKED_ISSUE` heuristic (PR-082) is
strictly worse than nearform's action and should either adopt their matching logic or be
dropped in favour of recommending their action from `pr-reviewer recommend` (PR-094).

---

## Scorecard

| Differentiator             | Status                                                | Consequence                                    |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| Blockage ownership         | **Uncovered**                                         | Keep. Lead with it.                            |
| Actionable CI instructions | Concept covered; no maintained GH-Actions-native tool | Keep, narrowed. Say "GitHub Actions" out loud. |
| Issue-linkage verification | **Covered** for existence                             | Drop. Recommend nearform's action instead.     |

---

## The strongest surviving argument, which was not on the original list

Adopting the existing tools means installing **four to five separate bots**: Mergify for
labels and conflicts, a linked-issue action, a CI-comment action or app, a stale bot, and
something for duplicates. Each posts its own comment.

That recreates the exact problem this project exists to solve. The maintainer went from
writing three comments by hand to receiving five bot comments per PR.

**The integration is the product** — one bot, one comment, one reconciled label set, one
noise budget. That is a better articulation of the wedge than any of the three original
differentiators, and it is consistent with the noise-budget design in
`docs/03-review-pipeline.md`.

---

## Recommendation: **proceed, with the pitch rewritten**

Not a clean win. An honest assessment:

**Against building.** Mergify plus two free marketplace actions gets a maintainer
conflict labels, CI-failure labels, and linked-issue enforcement today, for no
engineering. That is a real fraction of Phases 1–2. A maintainer who just wants their
queue tractable should install those first. [Likely]

**For building.** The blockage-ownership model is genuinely absent, the broken-on-base
distinction is absent, no maintained GitHub-Actions-native CI-excerpt tool exists, and
the multi-bot noise problem is real and self-inflicted by the alternative.

**What changes as a result:**

1. Rewrite `docs/00-concept.md` § Differentiation — drop issue linkage, add the
   single-bot/noise-budget argument, name GitHub Actions explicitly on the CI point.
2. Demote PR-082 (issue-linkage heuristics) or reduce it to recommending nearform's
   action from PR-094.
3. Add a Sprint 0 follow-up: **install Mergify's conflict label and a linked-issue
   action on the real repo this week.** If that alone makes the queue tractable, PR-003
   should be a no-go and we saved ourselves two months. This is the cheapest possible
   test of the whole premise. [Certain that it's cheap; Guessing whether it will be
   decisive]

---

## Sources

- [Mergify — Label action](https://docs.mergify.com/actions/label/)
- [Mergify — Conditions](https://docs.mergify.com/configuration/conditions/)
- [Mergify — Dealing faster with conflicting pull requests](https://articles.mergify.com/dealing-faster-with-conflicting-pull-requests/)
- [Mergify — Automatic CI retries in merge queue (2026-03-18)](https://docs.mergify.com/changelog/2026-03-18-automatic-ci-retries-in-merge-queue/)
- [ci-reporter (Probot)](https://github.com/JasonEtco/ci-reporter)
- [ci-friend](https://github.com/ascott1/ci-friend)
- [GitHub Actions Failure Analysis](https://github.com/marketplace/actions/github-actions-failure-analysis)
- [pytest-github-actions-annotate-failures](https://github.com/pytest-dev/pytest-github-actions-annotate-failures)
- [nearform/github-action-check-linked-issues](https://github.com/nearform-actions/github-action-check-linked-issues)
- [Verify Linked Issue](https://github.com/marketplace/actions/verify-linked-issue)
- [CodeRabbit](https://www.coderabbit.ai/) — reviewed and excluded: line-by-line diff review, explicitly our non-goal
