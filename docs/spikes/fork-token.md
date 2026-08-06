# Spike PR-001 — `GITHUB_TOKEN` on fork pull requests

Owner: PR-001 · Date: 2026-08-05 · Target repo for evidence: `Tollcraft/soroban-cost-linter`

Confidence tags: **[Certain]** = verified by me against live data, or documentation that is
current and unambiguous. **[Likely]** = strong convergent evidence, one inferential step.
**[Guessing]** = plausible, unverified.

---

## Verdict

**The hypothesis is CONFIRMED. The chosen workaround is PARTLY REFUTED and must change.**

Three separate statements, because they resolve differently:

1. **`pull_request` from a fork gives a read-only `GITHUB_TOKEN`, and `permissions:` cannot
   raise it to write.** **Confirmed [Certain on documentation, Likely on end-to-end
   behaviour].** GitHub's docs state both halves in plain terms, three widely-used actions
   independently work around it, and the target repo's own run logs show fork runs in a
   demonstrably restricted context. The one step I could not close locally is a fork run
   whose workflow *asks* for `pull-requests: write` and is refused — see
   [What remains unverified](#what-remains-unverified).

2. **`check_suite: completed` does NOT work as the write trigger.** **Refuted [Certain].**
   GitHub documents that `check_suite` "does not trigger workflows if the check suite was
   created by GitHub Actions." Every check suite in the target repo is created by the
   `github-actions` app. The trigger would fire zero times on the repo this project exists
   to serve. This is a design-breaking finding and the more urgent of the two.

3. **`schedule` does work.** **Confirmed [Certain on mechanism, Likely on end-to-end].**
   It runs on the default branch of the base repo with no fork in the picture, so the
   normal `permissions:` rules apply.

**Recommended correction:** replace `check_suite: completed` with **`workflow_run: completed`**,
keep `schedule` as the sweep. `workflow_run` is documented to grant secrets and write tokens
"even if the previous workflow was not" able to access them, and it is the mechanism the
ecosystem actually converged on for this exact problem. See
[The workaround](#the-workaround-assessment).

---

## 1 — Documentation findings

### 1.1 The fork restriction itself

> "With the exception of `GITHUB_TOKEN`, secrets are not passed to the runner when a workflow
> is triggered from a forked repository. **The `GITHUB_TOKEN` has read-only permissions in pull
> requests from forked repositories.**"
>
> — [Events that trigger workflows § `pull_request`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows)

**[Certain]** the documentation says this, and it is current as of 2026-08-05.

### 1.2 Whether `permissions:` can elevate it

> "You can use the `permissions` key to add and remove `read` permissions for forked
> repositories, **but typically you can't grant `write` access**. The exception to this
> behavior is where an admin user has selected the **Send write tokens to workflows from
> pull requests** option in the GitHub Actions settings."
>
> — [Workflow syntax for GitHub Actions § `permissions`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)

**[Certain]** the `permissions:` block cannot grant write on a fork `pull_request` run under
default settings.

**[Certain]** the escape hatch is useless to us. "Send write tokens to workflows from pull
requests" lives under the heading *"Enabling workflows for forks of **private**
repositories"* and is documented as *"Available to private repositories only"*
([Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)).
Every repo this project targets is public. The setting is also per-repo admin config, which
would break the "one file, no secrets" adoption story even if it existed for public repos.

Note the hedge word "typically" in GitHub's own sentence. It is the reason claim (1) above is
tagged Likely rather than Certain end-to-end: GitHub have left themselves room, and only a
live fork PR closes it.

### 1.3 The `check_suite` recursion rule — the finding that breaks the current design

> "**To prevent recursive workflows, this event does not trigger workflows if the check suite
> was created by GitHub Actions** or if the check suite's head SHA is associated with GitHub
> Actions."
>
> — [Events that trigger workflows § `check_suite`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_suite)

**[Certain]** this rule is documented. **[Certain]** it applies to the target repo: I queried
`GET /repos/Tollcraft/soroban-cost-linter/commits/{sha}/check-suites` and every check suite is
created by app slug `github-actions` (plus one `github-pages`). A `check_suite: completed`
workflow in that repo would never fire.

**[Likely]** this generalises to most of the target market. Repos whose CI is GitHub Actions —
the majority of the public repos this tool is pitched at — will never emit a
GitHub-Actions-triggerable `check_suite`. The trigger only works for repos whose CI is a
*third-party* app (CircleCI, Buildkite, Jenkins via the Checks API).

Two further constraints on `check_suite`, both **[Certain]** from the same page:
- "This event will only trigger a workflow run if the workflow file exists on the default
  branch" — fine for us, but worth knowing.
- `GITHUB_SHA` = last commit on default branch, `GITHUB_REF` = default branch. The event does
  **not** check out or point at the PR head. Same is true of `schedule` and `workflow_run`.

### 1.4 `workflow_run` — the replacement

> "The workflow started by the `workflow_run` event **is able to access secrets and write
> tokens, even if the previous workflow was not**."
>
> — [Events that trigger workflows § `workflow_run`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)

Also documented **[Certain]**: it carries the same "running untrusted code on `workflow_run`
may lead to security vulnerabilities including cache poisoning" warning as
`pull_request_target`, it runs on the default branch, and chains are capped at three levels.

### 1.5 `schedule`

> "Scheduled workflows run on the latest commit on the default branch."
>
> — [Events that trigger workflows § `schedule`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows)

**[Certain]** no fork is involved, so the fork clamp cannot apply and `permissions:` behaves
normally. **[Certain]** minimum interval is 5 minutes, and **[Likely]** cron is best-effort and
skewed under load — do not promise a tight SLA off it. **[Certain]** scheduled workflows are
disabled automatically after 60 days of repository inactivity; a low-traffic adopter will
silently lose the sweep.

### 1.6 Version and date caveats — this behaviour has moved

- **[Likely]** The fork read-only clamp predates the `permissions:` key; it has been the
  behaviour since roughly the 2020 fork-workflow security changes
  ([GitHub Actions improvements for fork and pull request workflows](https://github.blog/news-insights/product-news/github-actions-improvements-for-fork-and-pull-request-workflows/)).
- **[Likely]** The `permissions:` key itself arrived in 2021, and "restricted" defaults became
  selectable that November.
- **[Certain]** In February 2023 GitHub changed the *default* `GITHUB_TOKEN` permissions for
  newly created repos to read-only
  ([changelog](https://github.blog/changelog/2023-02-02-github-actions-updating-the-default-github_token-permissions-to-read-only/)).
  This is a **separate, orthogonal** restriction from the fork clamp and it is easy to confuse
  the two — see §2.3, where it confounds the log evidence.
- **[Guessing]** Any pre-2023 blog post or StackOverflow answer on this topic is likely to be
  describing the permissive-default world and should not be trusted.

---

## 2 — Empirical findings from the real target repo

Source: `Tollcraft/soroban-cost-linter`, read-only GitHub API via `gh` as `mallison031`.
All figures gathered 2026-08-05. I hold **admin** on this repo, which is why the run-log and
settings reads below were possible.

### 2.1 Forks dominate — the population at risk is 84% of the repo

162 pull requests, all now closed, created 2026-07-06 → 2026-08-04.

| | Count | Share |
|---|---:|---:|
| Head in a **fork** | **136** | **84.0%** |
| Head in the base repo | 26 | 16.0% |

**[Certain]** — computed from `.head.repo.full_name` on all 162 PRs.

- **65 distinct fork authors** [Certain].
- Fork PRs by `author_association`: 135 `CONTRIBUTOR`, 1 `NONE`. Base-repo PRs: 20 `MEMBER`,
  6 `CONTRIBUTOR` [Certain]. The split is almost perfectly "outsiders fork, members branch".
- Merge outcomes: 132/136 fork PRs merged, 25/26 base-repo PRs merged [Certain].

**Consequence [Certain]:** if the clamp is real, an Action driven by `pull_request` would be
unable to write on 84% of this repo's PRs, and specifically on 100% of the drive-by
contributors the product is aimed at. The blast radius is not a corner case; it is the product.

### 2.2 Workflows *do* run on fork PRs — the clamp is about permissions, not execution

736 workflow runs in the window:

| Event | Runs |
|---|---:|
| `pull_request` | 485 |
| `push` | 228 |
| `dynamic` (Dependabot / Pages) | 23 |
| `check_suite` | **0** |
| `workflow_run` | **0** |

Of the 485 `pull_request` runs, **416 had a fork head repository** and 69 were base-repo, across
**66 distinct head repositories** [Certain].

Conclusions of the 416 fork-head runs: 303 `failure`, 112 `success`, 1 `action_required`
[Certain]. The single `action_required` (run `30169743837`, head `Adejumo-2/soroban-cost-linter`)
is the first-time-contributor approval gate — worth noting as a second, independent way a fork
PR can produce no useful workflow output at all.

**[Certain]** workflows execute normally on fork PRs. The failure mode under test is a
permission denial at write time, not a missing run. Any spike that only checks "did CI run?"
will wrongly conclude everything is fine.

### 2.3 Direct evidence from run logs — real, but confounded

I extracted the `GITHUB_TOKEN Permissions` group that the Actions runner prints in "Set up job":

| Run | Event | Head | Printed permissions | Secret source |
|---|---|---|---|---|
| `30357276069` | `pull_request` | **fork** | `Contents: read, Metadata: read, Packages: read` | **`None`** |
| `30905080615` | `pull_request` | base repo | `Contents: read, Metadata: read, Packages: read` | `Actions` |
| `30913389897` | `push` | base repo | `Contents: read, Metadata: read, Packages: read` | `Actions` |
| `30895545790` | `push` (container-publish) | base repo | `Contents: read, Metadata: read, **Packages: write**` | `Actions` |

**[Certain]** the fork run is in a restricted context: `Secret source: None` versus
`Secret source: Actions` for every base-repo run. That is the runner stating outright that the
fork run got no secret store.

**[Certain] and important — the read-only token in row 1 does NOT by itself prove the fork
clamp.** `GET /repos/Tollcraft/soroban-cost-linter/actions/permissions/workflow` returns
`{"default_workflow_permissions": "read", "can_approve_pull_request_reviews": false}`. The repo
default is read-only for *everything*, so rows 1–3 are identical for a reason that has nothing
to do with forks. I am flagging this because it is exactly the trap a careless spike falls into.

**[Certain]** row 4 isolates the other variable usefully: `container-publish.yml` declares
`permissions: {contents: read, packages: write}` and the runner printed `Packages: write`
despite the repo default being `read`. So **a workflow's `permissions:` block can raise
above the repository default** on a non-fork event. That is the control condition. The missing
cell in the table is the one that matters — a **fork** run of a workflow that declares
`pull-requests: write` — and no workflow in this repo declares write permissions on
`pull_request`, so the repo cannot supply it. That single cell is the manual test in §5.

### 2.4 No native evidence of a write attempt on a fork PR

**[Certain]** none of the five workflows (`lint`, `dogfood-action`, `security`,
`container-publish`, `publish`) posts a comment or applies a label. `lint`, `dogfood-action`
and `security` carry **no `permissions:` block at all**. So this repo has never attempted the
operation under test, and produces **no direct evidence either way** on whether the write would
be refused. Stating this plainly rather than dressing up the circumstantial evidence.

### 2.5 A GitHub App *does* write on fork PRs — Surface B is unaffected

`drips-wave[bot]` posted **423 issue/PR comments**, of which **117 landed on fork PRs** and
**0 on base-repo PRs** [Certain]. It is a GitHub App (`https://github.com/apps/drips-wave`,
app id 2617547) with installation permissions `issues: write, pull_requests: write`
[Certain — read from `performed_via_github_app` on the comments].

**[Certain]** the fork restriction is a property of the Actions `GITHUB_TOKEN`, not of the PR.
An installation token writes on fork PRs without difficulty, in this very repo, today.
**[Likely]** this is a live, working existence proof that Surface B (GitHub App) is viable if
Surface A cannot be rescued.

### 2.6 PR resolution from a base-context event — solved, with a catch

The chosen triggers all run on the default branch and do not know which PR they concern.

**[Certain]** the `pull_requests[]` array on a check suite is **empty for both fork and
base-repo PRs** in this repo — I fetched individual check suites (`82807975993` on fork PR #327,
`83804572192` on base-repo PR #338) and both returned `"pull_requests": []`. Do **not** build
PR resolution on that field.

**[Certain]** the reliable path is head SHA →
`GET /repos/{owner}/{repo}/commits/{sha}/pulls`. Verified against fork PR #327
(head `nwabaj2017/soroban-cost-linter`, sha `da653d27…`): it returned exactly `#327`. The
Search API (`search/issues?q=repo:…+type:pr+{sha}`) also resolves it, as a fallback, at a much
lower rate limit.

**[Certain]** `check_suite.head_branch` is populated but is **not** a safe key — it is the
branch name inside the contributor's fork, and two forks can use the same branch name. Several
do in this repo.

---

## 3 — Third-party corroboration

Convergent independent workarounds, which is the strongest available evidence short of a live test.

1. **`nearform-actions/github-action-check-linked-issues`** — the action this project already
   selected in PR-002. Its README: *"If you enable the `comment` option (enabled by default) we
   recommend to listen on `pull_request_target` event"*, because *"`pull_request_target` event
   has write permission to the target repository **allowing external forks to create
   comments**."* [Certain — quoted from the README.] This is a maintained, widely-used action
   naming our exact failure mode as its reason for choosing a riskier trigger. Our own
   `premise-test/.github/workflows/check-linked-issues.yml` already carries this reasoning in
   its header comment.

2. **`marocchino/sticky-pull-request-comment`** — the closest analogue to our sticky comment.
   Its issue tracker and downstream users document that the action cannot comment on fork PRs
   under `pull_request`, and steer to `pull_request_target` or the `workflow_run` two-stage
   pattern [Likely — from search results and downstream repos, not read line-by-line].

3. **`check-spelling`** — ships a dedicated doc page titled
   *"pull_request gets a readonly GITHUB_TOKEN"*, stating that a PR from a user without write
   permission yields a read-only token and *"Because it's readonly, the action can't even
   comment on the PR"*
   ([source](https://github.com/check-spelling/check-spelling-docs/blob/gh-pages/Feature:-Support-pull_request_target.md))
   [Certain — that is the page's stated purpose].

4. **GitHub's own guidance** — GitHub publishes a whole page,
   [Securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target),
   which would not exist if `pull_request` could do the job [Certain that the page exists;
   Likely as an inference].

**[Likely]** Four independent parties reaching for the same two workarounds, one of which
carries a well-known security cost, is not what happens when a limitation is imaginary.

---

## 4 — The workaround assessment

### 4.1 `check_suite: completed` — **do not ship this**

| | |
|---|---|
| Token | Full base-repo token, `permissions:` honoured **[Likely — never observed, no such run exists]** |
| **Fatal flaw** | **Does not fire at all when the check suite was created by GitHub Actions [Certain].** In the target repo, 100% of check suites are `github-actions` [Certain]. |
| PR resolution | `pull_requests[]` is empty [Certain]. Needs head-SHA lookup. |
| Verdict | **Reject.** It would produce a workflow that is correct, tested, and never runs — the worst possible failure mode, because CI is green and nothing happens. |

This is the single most valuable finding in the spike. `docs/02-architecture.md` currently
records `check_suite: completed` as **Chosen**, and `docs/01-critique.md` P1 gives it as the
resolution. Both are wrong and need amending.

### 4.2 `workflow_run: completed` — **the replacement**

| | |
|---|---|
| Token | *"able to access secrets and write tokens, even if the previous workflow was not"* [Certain — documented] |
| Fires for fork PRs | **[Likely]** — this is the documented purpose of the trigger and the ecosystem's standard fix. Not observed locally: zero `workflow_run` runs exist in the target repo. |
| Context | Default branch, base repo [Certain] |
| PR resolution | `workflow_run.head_sha` → `GET /commits/{sha}/pulls` [Certain — verified on fork PR #327] |
| Catch 1 | Requires naming the upstream workflow(s) by name, e.g. `workflows: [Lint]`. Adopter-specific config — this **weakens the "one file, zero config" story** to "one file, tell us your CI workflow name". |
| Catch 2 | Same untrusted-artifact warning as `pull_request_target` [Certain]. We are safe because we never download artifacts from the triggering run and never check out head code — but that must be an enforced invariant, not a convention. |
| Catch 3 | Max 3 levels of chaining [Certain]. Irrelevant to us. |
| Catch 4 | The workflow file must be on the default branch [Certain], so it cannot be developed on a branch. |

### 4.3 `schedule` — keep as the sweep

Sound **[Certain on mechanism]**. Caveats: 5-minute floor, best-effort timing under load
**[Likely]**, and **auto-disabled after 60 days of repo inactivity [Certain]** — a real
reliability hole for a "safety net" on a quiet repo. The sweep should be treated as
eventually-consistent backstop, not a latency guarantee.

### 4.4 Options the architecture rejected — re-examine one of them

`docs/02-architecture.md` rejects `pull_request_target` outright as "the standard exploit path".
That framing is **[Likely] slightly too strong**. The exploit is `pull_request_target` **plus a
checkout of contributor code**. Without a checkout it is what nearform ships, and it is what our
own PR-004 premise-test workflow already runs. This project's `act` stage handles only API
calls, never executes contributor code, and never checks out. It is worth reconsidering as a
Phase 1 option with a hard, enforced no-checkout invariant — and it removes Catch 1 above
(no adopter-specific workflow name) and gives seconds-latency writes.

Not recommending it over `workflow_run` here, only flagging that the rejection was made against
a stronger threat model than this design actually presents, and the cost of that rejection just
went up now that `check_suite` is gone.

---

## 5 — Manual test procedure for final confirmation

**Why this is needed:** I have one GitHub account. Confirming the clamp end-to-end requires a
PR from a fork owned by a *different* account, since a PR from your own fork of your own repo
is not treated as an outside fork. I did not create throwaway repos or PRs. **Everything below
is ~10 minutes for a human with a second account.** It resolves the one open cell in §2.3 and
the one [Likely] in §4.2.

### Prerequisites
- Account **A** (owner) — e.g. `mallison031`. Any public repo you own; a scratch repo is fine.
- Account **B** (contributor) — must **not** be a collaborator on A's repo and must not be an
  org member with write access. That is the whole point.

### Step 1 — as account A, add this workflow on the default branch

`.github/workflows/fork-token-probe.yml`

```yaml
name: Fork token probe

# Deliberately asks for write on the two scopes pr-reviewer needs.
# On a fork PR the runner should refuse to grant them.
permissions:
  pull-requests: write
  issues: write
  contents: read

on:
  pull_request:
    types: [opened, synchronize]
  workflow_run:
    workflows: ["Fork token probe"]
    types: [completed]
  schedule:
    - cron: "*/10 * * * *"

jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - name: Report context
        run: |
          echo "event=${{ github.event_name }}"
          echo "head_repo=${{ github.event.pull_request.head.repo.full_name }}"
          echo "base_repo=${{ github.repository }}"

      # The definitive read: what the token actually holds, straight from the API.
      - name: Inspect token scopes
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          curl -sS -D headers.txt -o /dev/null \
            -H "Authorization: Bearer $GH_TOKEN" \
            https://api.github.com/repos/${{ github.repository }}
          echo "--- x-accepted-github-permissions / oauth scopes ---"
          grep -i -E 'x-(accepted-)?(github-permissions|oauth-scopes)' headers.txt || true

      # The behavioural test. Must not use `continue-on-error` alone —
      # we want the HTTP status recorded, not just a red X.
      - name: Attempt a PR comment
        if: github.event_name == 'pull_request'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          CODE=$(curl -sS -o body.json -w '%{http_code}' -X POST \
            -H "Authorization: Bearer $GH_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/${{ github.repository }}/issues/${{ github.event.pull_request.number }}/comments \
            -d '{"body":"PR-001 fork token probe"}')
          echo "HTTP $CODE"
          cat body.json
          echo "COMMENT_STATUS=$CODE" >> "$GITHUB_STEP_SUMMARY"

      - name: Attempt a label
        if: github.event_name == 'pull_request'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          CODE=$(curl -sS -o lbody.json -w '%{http_code}' -X POST \
            -H "Authorization: Bearer $GH_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/${{ github.repository }}/issues/${{ github.event.pull_request.number }}/labels \
            -d '{"labels":["bug"]}')
          echo "HTTP $CODE"
          cat lbody.json
          echo "LABEL_STATUS=$CODE" >> "$GITHUB_STEP_SUMMARY"
```

Also confirm A's repo setting: **Settings → Actions → General → Workflow permissions**. Note
whether it reads "Read repository contents and packages permissions" or "Read and write
permissions". Record it — §2.3 shows this is the classic confounder. The test is valid either
way, because the `permissions:` block at the top is what we are testing, but you must know
which state you were in.

### Step 2 — as account B, fork and open a PR
Fork A's repo, change one line in the README, open a PR against A's default branch.
If A's repo has never had a PR from B before, Actions may show **"1 workflow awaiting
approval"** — as account A, approve it. (This is the `action_required` state seen once in the
real repo, §2.2.)

### Step 3 — read the result

Open the run's **"Set up job"** step and read the `GITHUB_TOKEN Permissions` group.

| What you see | Meaning |
|---|---|
| `Pull requests: read` (or absent) despite the workflow asking for `write`, **and** the comment step returns **403** | **Hypothesis CONFIRMED.** The `permissions:` block was clamped. Expected outcome. |
| `Pull requests: write` **and** the comment step returns **201** | **Hypothesis REFUTED.** Re-check that B genuinely has no write access to A's repo before believing it. |
| `Secret source: None` | Confirms the run is in the restricted fork context (matches §2.3). Expect this regardless. |

Also check: does the comment appear on the PR? A 201 with no visible comment means you tested
the wrong thing.

### Step 4 — confirm the replacement trigger (the part that matters most)

With the same fork PR open, verify `workflow_run`:

1. Confirm a `workflow_run`-triggered run appeared after the `pull_request` run completed.
2. In *its* "Set up job", confirm `Pull requests: write` and `Secret source: Actions`.
3. From that run, resolve the PR: `GET /repos/{owner}/{repo}/commits/{workflow_run.head_sha}/pulls`
   and confirm it returns the fork PR number.
4. Post a comment from that run and confirm **201** and that it is visible on the fork PR.

**Step 4 is the acceptance test for Phase 1.** Step 3 only confirms bad news we already expect;
step 4 confirms the fix works.

### Step 5 — optional, confirms §4.1
Add `on: check_suite: {types: [completed]}` to a second workflow on the default branch and push
a commit. Confirm **no run appears** (because the check suite was created by GitHub Actions).
Takes two minutes and closes the last [Likely] on the most consequential finding.

### Cleanup
Close the PR, delete the probe workflows, remove the probe comment.

---

## What remains unverified

Stated plainly, since this is the project's biggest risk and false confidence is worse than
an open question.

1. **[Open]** No observation of a workflow that *requests* `pull-requests: write` being
   *refused* on a fork `pull_request` run. Everything in §2.3 is consistent with the clamp but
   also consistent with the repo-level read-only default. Documentation and four independent
   third-party workarounds close this to my satisfaction for planning purposes, but it is not
   verified. → **Test §5 step 3.**

2. **[Open]** No observation of `workflow_run` granting a write token on a fork-originated PR.
   Zero `workflow_run` runs exist in the target repo. This is currently a documentation-only
   claim and the entire corrected Phase 1 rests on it. → **Test §5 step 4.** *This is the
   highest-value remaining test.*

3. **[Open]** No observation of `schedule` writing on a fork PR. Mechanically it cannot be
   affected by the fork clamp, but unobserved is unobserved.

4. **[Closed by documentation, not observation]** That `check_suite: completed` fails to fire.
   The doc sentence is unambiguous and the app-slug evidence is direct, so I am comfortable at
   [Certain] — but §5 step 5 makes it free to confirm.

5. **[Guessing]** How representative `Tollcraft/soroban-cost-linter` is. One repo, one month,
   an incentivised contribution programme (Drips Wave) which likely inflates the fork share
   above a typical OSS project's. The 84% figure should be read as "forks dominate", not as a
   precise market estimate.

---

## Consequences for the roadmap

### If confirmed (expected — plan for this)

**Immediate documentation corrections, before any code:**

- `docs/02-architecture.md` § Trigger model: the constraint tag moves **[Likely] → [Certain]**.
  The options table row `check_suite: completed + schedule` changes from **Chosen** to
  **Rejected — does not fire when CI is GitHub Actions**. New chosen row:
  `workflow_run: completed + schedule`.
- `docs/01-critique.md` P1: same correction. The stated resolution is currently wrong, not just
  unverified — a stronger claim than P1 itself makes.
- `docs/02-architecture.md` § Permissions: add that `pull_request` runs must be structurally
  incapable of calling `act`, not merely configured not to. On a fork PR the write would 403
  anyway, but on a *base-repo* PR it would succeed — so a `pull_request`-triggered dry-run that
  accidentally writes will work fine on maintainer PRs and only fail in production on
  contributor PRs. That is a bug that hides during development. Worth a unit test asserting
  `act` is unreachable when `github.event_name == 'pull_request'`.

**Product consequences:**

- Latency stays "one CI cycle", as already accepted. `workflow_run` does not make this worse
  than `check_suite` would have.
- **New cost:** the adopter must name their CI workflow in `workflows: [...]`. The
  "one file, no configuration" pitch becomes "one file, one line to fill in". Small, but it was
  a headline claim and should be restated honestly.
- **New failure mode:** if the adopter renames their CI workflow, our trigger silently stops.
  Worth a startup assertion, and worth listing in `docs/06-open-questions.md`.
- Labels (the promoted Phase 1 headline per P2) are unaffected in kind — they just land one CI
  cycle later.

**Roadmap consequences:**

- Phase 1 remains viable. Surface A survives. This is a trigger correction, not a redesign —
  provided §5 step 4 passes.
- Add a Phase 0 gate: **§5 step 4 must pass before Phase 1 code is written.** It is ten minutes
  and it is the only thing standing between the plan and a second wrong trigger.
- Reconsider `pull_request_target` with an enforced no-checkout invariant as a documented
  alternative (§4.4), given the rejection was argued against a threat model this design does
  not present.

### If refuted (unlikely — but here is the branch)

If §5 step 3 shows a fork PR receiving `pull-requests: write`:

- Do **not** immediately celebrate. First verify account B truly had no write access, and
  check whether A's org has a non-default fork policy. The most probable explanation for a
  refutation is a misconfigured test, not a change in GitHub's behaviour.
- If genuinely refuted: `pull_request` becomes the primary trigger, latency drops from one CI
  cycle to seconds, `docs/00-concept.md`'s original "minutes not days" claim is reinstated,
  and `schedule` degrades from safety net to optional. `check_suite` is dropped regardless —
  §4.1 is independent of the fork clamp and stands either way.
- The architecture's dry-run-only `pull_request` subscription would then become the *write*
  path, and the noise-budget and idempotency work in `decide`/`act` becomes more urgent
  because writes would fire on every push rather than once per CI cycle.

### Unaffected either way

Surface B (GitHub App) is untouched by all of this — §2.5 shows a GitHub App writing on fork
PRs in the target repo today. If Surface A cannot be made to work, the fallback is proven to
exist; the cost is hosting, which is exactly the cost `docs/02-architecture.md` was trying to
defer.
