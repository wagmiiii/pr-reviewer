# PR-005 — historical pull request archive

A raw capture of the pull request history of `Tollcraft/soroban-cost-linter`, the repo
whose maintenance load motivated this project. It is the evidence base for PR-003
(go / no-go), the fixture source for PR-012, and the only way to measure the Phase 0
exit criterion in `docs/04-roadmap.md` now that PR-042 is scored by retrospective replay.

Captured because it is decaying: GitHub Actions logs fall out of the retention window,
and a check run that has aged out cannot be recovered later at any price.

## Layout

| Path | What it is |
|---|---|
| `prs/pr-<n>.json` | One document per PR: metadata, reviews, commits, changed files, head check runs and legacy statuses, the resolved base SHA **and its** check runs, and issue/review comments. |
| `manifest.json` | Aggregate view over `prs/`. Pure derivation — rebuild any time with `./manifest.sh`. |
| `raw/` | Capture byproducts: the enumerated PR number list and the run log. |
| `logs/` | Workflow run zips, fetched only for runs behind a failing check. Empty — the log phase has not been run. |

Both scripts are idempotent. `capture.sh` skips a PR whose file already exists unless
`FORCE=1`, so a re-run only fills gaps. `manifest.sh` makes no API calls.

```sh
./capture.sh          # capture, then manifest
./capture.sh prs      # PR documents only
./capture.sh logs     # workflow logs (needs prs done)
./manifest.sh         # rebuild manifest.json alone
```

## State of the capture

159 of 162 PRs captured, zero fatal errors, one partial endpoint failure.

**Known gap — PRs 179, 281 and 328 are missing.** All three fail the same way:

```
/usr/bin/jq: Argument list too long
PR 179: assembly produced empty output
```

The assembly step in `capture.sh` passes each API payload to `jq` as a command-line
argument (`--argjson files "$files"`). On PRs with very large changed-file lists the
combined arguments exceed `ARG_MAX` and the exec fails, so the document is never
written. It is not a rate limit or a network fault, and re-running will not fix it —
the payloads have to move to temp files and be read with `--slurpfile` instead. Left
for the ticket owner rather than patched here, since it means reworking the variable
bindings through the whole assembly program.

The three are the largest PRs in the history, so the gap is not random with respect to
diff size. Anything measured over the corpus should say "159 of 162" and note which
three are absent.

## Two cautions for anyone measuring against this

**`MERGE_CONFLICT` cannot be reconstructed.** GitHub only computes `mergeable_state`
for *open* PRs. Every PR here is closed, so the field reads `unknown` throughout
(156 of 159). The conflict rule has to be validated some other way.

**Five base SHAs are approximate.** For merged PRs the base is exact — the first parent
of the merge commit is the base branch tip at merge time. Unmerged PRs have no merge
commit, so they fall back to the `.base.sha` GitHub recorded on the PR object, which can
lag the tip the PR was actually tested against. `manifest.json` lists the affected PR
numbers under `base_resolution.approximate_pr_numbers`.

## Secrets

Every assembled document is passed through a scrubber before it is written — GitHub
tokens and PATs, AWS key IDs, Slack tokens, `sk-` API keys, PEM private key blocks, and
bearer/authorization headers. No redactions fired on this capture, which is expected for
a public repo's API surface but is not a substitute for reading a diff before publishing
it anywhere.
