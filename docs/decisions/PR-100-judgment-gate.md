# PR-100 — Judgment gate

**Gate:** the third and last of the three that can end or redirect the project.
**Inputs:** PR-004 (premise test corpus, n=159), PR-062 (labels trial), PR-090 (digest gate),
`06-open-questions.md` Q3/Q4/Q9/Q10, `03-review-pipeline.md` § Bucket 3.
**Drafted:** 2026-08-10 · **Status: DRAFT — awaiting product owner decision and platform countersignature.**

Confidence tags: **[Certain]** / **[Likely]** / **[Guessing]**.

---

## The question, as written

> If labels and deterministic checks already made the queue tractable, the AI layer is a
> novelty. Not building it is a legitimate outcome.

---

## Recommendation: **NO-GO on J1. Defer J7. Do not build the layer now.**

Three parts, all three binding:

1. **J1 (issue-resolution) is rejected on measured evidence**, not deferred. The corpus
   leaves it almost no room to be useful.
2. **J7 (effort-estimate) is deferred, not rejected.** It is blocked by an open question
   (Q9), not by contrary evidence.
3. **PR-101–105 stay Unscheduled.** `wip/judge-scaffold` does not land.

This is the outcome the gate was written to permit. Taking it is not a failure of the
plan; it is the plan working.

---

## The number that decides it

The corpus was re-queried for this gate rather than reasoned about.

| | |
|---|---|
| Pull requests in corpus | **159** [Certain] |
| **Merged** | **154 (96.9%)** [Certain] |
| Closed without merging | **5 (3.1%)** [Certain] |
| PRs declaring a closing keyword (`Closes #N`) | **131 (82.4%)**, 169 references total [Certain] |
| Closing references resolving to a PR inside the corpus | **0** — so they are issues, or PRs outside the captured window [Likely] |

**J1 asks: does the diff plausibly implement what the linked issue asks?**

The input is abundant — 82.4% of PRs declare an issue, so the collector already has
something to reason over. That is not the problem.

The problem is the answer. **96.9% of these PRs merged.** The maintainer, reading them by
hand, concluded that essentially all of them did what they claimed. J1's entire value is
flagging the ones that don't — and the observable ceiling on that population is **5 PRs,
3.1%**, and only if *every* unmerged PR turned out to be closed for scope reasons.

So the ceiling is 5 PRs. **All five were then read.** None of them is a case where the diff
failed to implement its linked issue:

| PR | What it is | Is it J1's positive class? |
|---|---|---|
| #140 | `fail on malformed budget.toml instead of silent fallback`, Closes #92. Detailed, matches its claim. | No |
| #181 | `detect storage operations inside iterator closures`, Closes #5. Matches its claim. | No |
| #284 | `rename ambiguous variable names`, closes #208. Cosmetic refactor, matches its claim. | No |
| #285 | A stray **merge commit** with the PR template left blank — literally `Closes #` with no number. | No — it is malformed, not mis-scoped |
| #329 | **Dependabot** version bump, superseded by a later bump. | No |

**J1's observed positive class in this corpus is zero, not 3.1%.** [Likely — closure
*reasons* are not in the corpus, so this reads each PR's description against its own claim
rather than against a maintainer's stated rationale. Three of the five were plausibly
closed as superseded or unwanted, neither of which J1 detects.]

A check with a model in the loop, no eval set, and **zero observed positives across 159
PRs** is not a feature. Compare PR-003, which authorised the whole project on a positive
class of **88.7%, n=71**. The asymmetry is the argument.

One thing does fall out of this, and it is cheap: **#285 is catchable by a regex.** A PR
whose template still reads `Closes #` with no number is a deterministic Bucket 2 finding —
a malformed-template check, no model required. That is the only actionable signal the five
produced, and it argues for a rule, not a judge.

---

## And there is no demand signal behind it

PR-004 measured what the maintainer actually complained about:

| | |
|---|---|
| Total maintainer comments | 78 |
| Of which manual CI nags | **73 (93.6%)** [Likely — keyword floor] |
| PRs needing a nag | 47, of which **45 still merged** |

Ninety-four percent of the maintainer's own words were about CI. **Not one measured signal
is about whether a PR does what its issue asked.** PR-003 justified building because a
human was hand-templating the same comment 23 times — that is what demand looks like in
this corpus. There is no equivalent trace for J1. [Certain — absence in the measured
comment set, which is a floor, not proof of absence]

---

## Why J7 is deferred rather than rejected

J7 (reviewer minutes + what to look at first) fails differently: it has no *consumer* yet.

Its natural home is the digest's sort order, and **Q9 explicitly declines to specify
that**, calling "cheap wins first" an unbacked assertion about the maintainer's
preferences. PR-090 leaves Q9 open and routes it to a week of real usage.

There is also a reason to doubt the premise. Median time open→close was **13.9h overall,
3.8h when not nagged, 40.9h when nagged**. The bottleneck was *blocked-ness*, not reviewer
effort — PRs were slow because they sat, not because they were hard to read. An effort
estimate optimises something the data does not show to be scarce. [Likely]

If Q9 resolves to "sort by effort" and the digest proves the ordering matters, J7 becomes
a real ticket with a real consumer. Until then it is a feature looking for a use.

---

## The case for building, stated at full strength

A gate that only rehearses the case against is theatre.

**1. The design work is already done and it is good.** The mandatory `file:line` evidence
contract, `"unknown"` as a first-class answer, digest-only destination, no tool access, no
merge capability. Q10 correctly downgraded injection from a blocker to one fixture. This
is a *safer* AI feature than most shipped ones. Nothing here is reckless.

**2. Scaffolding already exists.** `wip/judge-scaffold` has the types and function
signatures. The marginal cost of PR-101 is lower than its 5 points suggest.

**3. The corpus may not generalise.** 159 PRs, one repo, one maintainer, one wave, 96.9%
merged. A repo with a *lower* merge rate — more drive-by PRs, more scope mismatch — is
exactly where J1 earns its keep. This project's own corpus may be the unrepresentative
case. [Guessing — and this is the strongest pro argument]

**4. "Advisory only, maintainer-only" is a low-stakes contract.** A wrong J1 costs one
ignored line in a digest read by one person who knows it is model-generated. The downside
is genuinely small.

**5. Not building it forecloses the differentiator.** Every surviving feature is now
deterministic. If the pitch is ever "more than rules", this is the only thing in the plan
that is.

---

## Why the recommendation is still NO-GO

Argument 3 is the serious one, and it is honest: the corpus may understate J1's value on
other repos. But this project has been disciplined about answering questions empirically
rather than by argument — PR-062 ran a week of labels rather than debating them, and Q2
was settled by evidence.

The same standard applied here says: **the only population we have measured says J1 has
zero observed positives and no demand signal.** Building on the hope that some other repo differs is
building for hypothetical users, which `06-open-questions.md` Q1 names as "the most common
way this kind of project stalls."

And the timing is decisive. PR-090 concluded that every gap PR-062 found is closable
deterministically — labels for the category question, a renderer over already-collected
facts for the attribution question. **The judgment layer is being asked to justify itself
at the exact moment the deterministic path was shown to be sufficient.** That is the
condition the gate names, in the words the gate uses.

Nineteen points, on the weakest evidence in the project, against a deterministic
alternative that just proved out. No.

---

## What changes as a result

1. **PR-102 (J1) is closed as rejected**, with this document as the reason. Not left in
   Backlog to rot.
2. **PR-101, 103, 104, 105 stay Unscheduled** and unstarted.
3. **`wip/judge-scaffold` does not land.** It also flips `MarkerState` from
   `additionalProperties: false` to `true` to admit judgment data — a validation boundary
   weakened for a feature now rejected. If any part of that branch is ever revived, that
   change must not come with it.
4. **`03-review-pipeline.md` § Bucket 3 is amended** to record Bucket 3 as *specified but
   not built*, with the reason, rather than as Phase 3+ work pending.
5. **PR-105 (adversarial fixture) is retained as a note, not a ticket.** It only has
   meaning alongside a model call.
6. **Q3 and Q4 are unaffected** — both already resolved "no", and this makes them moot.
7. **The roadmap ends at E9.** After Sprint 5 there is no authorised work. That should be
   stated plainly rather than discovered.
8. **One new candidate rule, from reading the five: a malformed-template check.** PR #285
   shipped with `Closes #` and no number. That is a regex over the body, Bucket 2,
   maintainer-facing, ~1 point. It is the only thing this gate found worth building, and
   it is the opposite of a judgment check. Raise it as a ticket if it survives triage.

---

## Kill criteria — how this decision gets reversed

Written now, while it is cheap to be honest. Any one of these reopens it:

- **A second wave arrives with a materially lower merge rate.** If merged/total drops below
  ~85% on a population of 50+, J1's positive class becomes large enough to be worth
  detecting. Re-derive the number before arguing.
- **The digest ships and the maintainer still asks "does this PR actually do what it
  says?"** That is the demand signal absent from PR-004. One instance is not enough; a
  pattern over a month is.
- **Q9 resolves to effort-based sorting** and the digest's ordering demonstrably matters.
  That revives J7 specifically, on its own merits, not J1 with it.
- **The tool is adopted by a repo unlike this one.** The 96.9% is one maintainer's
  standards. Another repo's corpus is a different experiment.

Note what is *not* a kill criterion: model capability improving. J1's problem is that
there is almost nothing to find, not that finding it is hard.

---

## Sign-off

| | Name | Position | Date |
|---|---|---|---|
| Product / rules | Allison Muyideen | *pending* | |
| Platform | Ademola Ajala | *pending* | |

Both signatures are outstanding. If either of you disagrees — with the J1 rejection, with
deferring J7, or with closing PR-102 outright — **record the disagreement here** rather
than resolving it in conversation. The reasoning is the point of the document.

The one thing to check before countersigning: **the 96.9%, the 82.4% linkage rate, and the
five-PR ceiling were derived once, by one script, over `corpus/prs`.** They are the load-bearing numbers in this
decision, exactly as the 88.7% was in PR-003, and PR-003's own kill criteria demanded that
such a number be independently re-derived by the other person. Do that before signing.

The second thing: **the five unmerged PRs were read, and the classification above is a
judgement call made from their descriptions.** Closure reasons are not in the corpus. If
you think any of #140, #181 or #284 was actually closed because the diff did not do what
its issue asked, that is J1's positive class and it overturns the central finding —
challenge it in the table rather than in conversation.
