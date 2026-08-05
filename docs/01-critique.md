# Critique

Two parts: flaws in the original idea, then flaws found auditing the first draft of
this plan. The second list is the more useful one.

Confidence tags: [Certain] / [Likely] / [Guessing].

---

## Part 1 — Flaws in the original idea

### F1 — Auto-merge was the highest-risk element. Removed.

"Merge PRs where necessary" was the most dangerous line in the brief. A bot with write
access that merges based on a model's opinion can be steered by whoever wrote the diff
it is reading — prompt injection in a source comment or test fixture is a live
technique, not a theory [Likely]. The related classic is a `pull_request_target`
workflow that checks out attacker code with secrets in scope [Certain].

Resolution: merging is out of scope entirely. GitHub's native auto-merge and merge
queue already do this under branch protection [Certain]. This is not a deferral.

### F2 — Comment spam recreates the original problem

The pain was hand-writing comments on every PR. A bot posting a fresh comment per push
produces more noise and gets muted.

Resolution: one comment per PR, edited in place, keyed to head SHA, with a hard noise
budget. No comment when nothing material changed.

### F3 — Using a model for facts the API already returns

CI status and merge conflicts are structured fields [Certain]. Asking a model about
them is slower, costlier, and less reliable.

Resolution: the three-bucket model in `00-concept.md`.

### F4 — "Check coverage" is not implementable as stated

Coverage cannot be derived from a diff [Certain]. It requires a report produced by the
target repo's CI.

Resolution: optional capability, gated on an lcov/cobertura artifact or Codecov.
Degrade to "not reported" — never a guessed number.

### F5 — "Quality of work" is unfalsifiable

A model asked "is this good quality?" returns confident generic prose.

Resolution: decompose into narrow checkable questions with mandatory file/line
evidence and a permitted "unknown".

### F6 — Cost and rate limits *(and a measurement error, now corrected)*

The cost controls are: skip the judgment layer on PRs the rules already blocked, cache
verdicts by head SHA, and cap the diff bytes sent to the model.

An earlier revision of this document claimed those two facts — *skip blocked PRs* and
*most PRs are blocked* — together meant the judgment layer would rarely run, and
therefore that Bucket 3 might be worthless. **That was a stock/flow error.** "Most PRs
are blocked at any instant" is not "few PRs become ready." The judge fires on a PR's
*transition* into `READY_FOR_REVIEW`, not on a headcount of the queue, and every PR
that is ever reviewed makes that transition at least once [Certain — it follows from
the status machine in `03-review-pipeline.md`].

Corrected reading: the judge runs **once per eventually-reviewable PR, at the moment
its output is useful**, and abandoned PRs never cost a call. The cost optimisation and
the feature are aligned rather than in tension. Q4 is resolved on that basis.

### F7 — Trust dies at the first false positive

One wrong "this doesn't fix the issue" on a good PR and the bot gets disabled.

Resolution: dry-run first; Bucket 3 never blocks; advisory output goes to the
maintainer, not the contributor.

### F8 — Tone is a community-management risk

A bot telling a first-time contributor their work is low quality is an incident.

Resolution: contributor-facing text covers mechanics only — CI failures, rebase steps,
missing checklist items. Never quality, never the person.

---

## Part 2 — Flaws found auditing the first draft of this plan

### P1 — The Action cannot write on fork PRs *(most damaging)*

For `pull_request` events from a forked repo, `GITHUB_TOKEN` is read-only and the
workflow's `permissions:` block cannot elevate it [Likely — verify with a throwaway
fork PR before writing code]. The first draft's workflow requested
`pull-requests: write` on `pull_request`, i.e. exactly the population the project
exists for.

Resolution: `check_suite: completed` and `schedule` run in the base-repo context with a
full-permission token [Likely] and become the write triggers. `pull_request` is kept
for dry-run logging only. Cost: latency goes from seconds to one CI cycle. The
"minutes not days" claim in the first draft was overstated and has been corrected in
`00-concept.md`.

### P2 — The differentiation thesis was asserted, not argued

The first draft called the ranked queue "the real product" and "the wedge" with no
evidence. GitHub search plus labels already delivers a filterable queue [Certain the
filters exist; Guessing how much perceived value they absorb — plausibly most of it].

Resolution: labels are promoted from a Phase 1 bullet to a Phase 1 headline — cheap,
reliable, and possibly the majority of the value. The digest drops to Phase 2 and must
justify itself against "just use a saved search". Competitor research is now Phase 0's
first task.

### P3 — Dry-run and the noise budget were mutually incompatible

State was to be recovered by parsing JSON out of the sticky comment. Dry-run posts no
comment, therefore has no prior state, therefore can never exercise the
"did-the-verdict-change" check [Certain — follows from the two documents]. The
mechanism protecting against the original complaint was untestable at exactly the
moment trust is being established.

Resolution: state lives in the Actions cache, with the comment block as a fallback.

### P4 — The comment-embedded state was treated as trusted

Anyone with write access can edit the bot's comment [Certain], and comment bodies cap
at 65,536 characters [Likely]. The first draft would have `JSON.parse`'d it directly.

Resolution: schema-validate; on any parse or validation failure, treat as "no prior
state" and proceed.

### P5 — Three heuristics were disguised as facts

`NO_LINKED_ISSUE` (regex over prose), `DUPLICATE_FILES` (a 70% overlap threshold that
was invented with no basis [Guessing]), and `NEW_DEPENDENCY` (presented as one table
row; actually means parsing npm/yarn/pnpm/pip/poetry/cargo/go.mod) all sat in the
"always correct" bucket.

Resolution: Bucket 2 in `00-concept.md` exists specifically to hold them. Warn-only,
never blocking, thresholds explicitly marked as untuned.

### P6 — Phase 0's success criterion was circular

"Done when the ranked list matches your own judgment" — if it matches, it told you
nothing you didn't already know [Certain, it's circular].

Resolution: measurable criteria in `04-roadmap.md`.

### P7 — A 30-PR eval set cannot gate a release

At a true 10% false-positive rate, n=30 gives roughly ±11 percentage points [Likely,
standard binomial interval]. Distinguishing 5% from 15% needs on the order of 200
labelled PRs.

Resolution: either accept that Phase 3's gate is qualitative and say so, or start
labelling from Phase 1. This plan does the latter.

### P8 — The config file was 60 keys of commitment before any code

Every key is a maintenance obligation and a compatibility promise.

Resolution: `05-configuration.md` cut to what Phases 0–2 actually consume.

### P9 — "Cheap wins first" ranking was an unbacked assertion

The first draft sorted the digest by ascending reviewer effort. Maintainers may well
want the *important* PR first, not the cheapest [Guessing — no evidence either way].

Resolution: recorded as an open question; the digest is Phase 2 and can be sorted
whichever way turns out to be right in practice.

### P10 — `collect` is not cleanly pure

The design says each stage is a pure function of the last, but fetching CI logs for
*failing* jobs requires knowing which jobs failed — knowledge the gate produces
[Certain].

Resolution: `collect` over-fetches (check runs first, then logs for non-success
conclusions) within one stage. Minor, but the "pure pipeline" description was tidier
than the reality.

### P11 — Two heuristics were disguised as judgment (P5 in reverse)

P5 caught heuristics sitting in the facts bucket. The same error ran the other way:
`J2 test-presence` and `J3 test-deletion` were specified as model calls, but

- "did any file under a test path change?" is a path glob [Certain]
- "were lines matching `assert|it\(|test\(|def test_` removed, or `skip`/`xit` added?"
  is a regex over the diff [Likely to catch the large majority of real cases]

The model version adds a marginal refinement over each and inherits the whole apparatus
of evidence citation, caching, injection defence, and eval gating.

Resolution: both demoted to Bucket 2, shipped in Phase 2 with no model. Being
deterministic, they are also safe to put in the contributor-facing comment, which the
model versions never would have been. Bucket 3 shrinks to J1 and J7.

---

## Is it worth building?

**Yes, with the scope as now written — but the first real deliverable is 30 minutes of
competitor research, not code.**

The case for:

- The pain is real, recurring, and self-experienced.
- With merging removed and Bucket 3 deferred, roughly all of the near-term value is
  deterministic, cheap, and reliable.
- Labels alone are a genuinely useful product that fits in Phase 1.

The case against, stated fairly:

- Mergify covers a real portion of the conditions-based automation [Likely].
- GitHub search plus labels may absorb most of the digest's value [Guessing].
- P1 means the delivery mechanism has an unverified dependency.
- Value concentrates in high-traffic repos; small repos won't feel it [Likely].

If competitor research shows the three differentiators in `00-concept.md` are already
covered, the correct decision is to adopt the existing tool and stop.
