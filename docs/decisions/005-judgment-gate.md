# PR-100 — Build the judgment layer at all?

**Gate:** on the whole of E10. Nothing in PR-101 through PR-105 starts without it.
**Inputs:** PR-081 (deterministic test checks), PR-090 (digest gate).
**Drafted:** 2026-08-11 · **Status: DRAFT — recommendation only, unsigned.**

Confidence tags: **[Certain]** / **[Likely]** / **[Guessing]**.

> This is a joint decision. It is written as a recommendation for both owners to accept,
> amend, or reject. Do not treat the draft as the outcome.

---

## Recommendation: **NO — do not build E10 now. Close it as not-built, with a named reopen trigger.**

Three parts, all three binding:

1. **Do not start PR-101.** E10 closes as *not built*, not as *deferred indefinitely* —
   a backlog of five P3 tickets nobody is allowed to start is worse than an empty one.
2. **Keep the reopen trigger explicit and dated.** Written below. If it fires, this
   document is reopened rather than re-litigated from scratch.
3. **Keep the substrate that was already cheap.** The one-line agree/disagree verdict
   from Phase 1 stays. It costs nothing and it is the only thing that makes a future
   reopen answerable.

---

## Why the gate was written, in its own words

The roadmap's kill condition for Phase 3:

> if Phases 1–2 have made the queue tractable on labels and deterministic checks alone,
> J1 is a nice-to-have and J7 is a novelty. Deciding not to build this phase is a
> legitimate outcome, and now a cheap one.

And the Notion card: *"Deciding not to build this epic is a legitimate and expected
outcome."* The gate anticipated this answer. What follows is whether the evidence
supports it.

---

## What the two inputs returned

| Input | Result | Effect on this gate |
|---|---|---|
| **PR-081** deterministic test checks | Shipped. `NO_TEST_CHANGED` + `TESTS_REMOVED` live | **Removes most of E10's original scope, without a model** |
| **PR-090** digest gate | Passed on the attribution argument; E9 fully shipped | Neutral on E10 — the digest does not need a judgment |

### PR-081 — J2 and J3 shipped without a model

They were judgment checks in the first draft. They are now a path glob and a regex over
deleted lines, in `src/rules/test-heuristics.ts`, safe in the contributor comment, with no
eval set and no injection surface. The roadmap already recorded the consequence:

> Shipping them here removes most of what the judgment layer was going to be for.

That is the single largest fact in this decision. E10 was scoped down to J1 and J7
*because* its useful half turned out not to need a model. [Certain]

### The deterministic stack that actually shipped

Nineteen rule codes across ten rule modules, plus queue-wide sweep (PR-091), digest and
pinned-issue upsert (PR-092), stale nudge → warn lifecycle (PR-093), and
`pr-reviewer recommend` (PR-094). Phases 1 and 2 are, in delivery terms, complete.

### J7 has no consumer left

J7's designed consumer was digest ordering. PR-092 built the digest and **explicitly
rejected** an effort-based sort: the parked draft sorted by `judgments.effortEstimate`,
and that was dropped as *"a preference guess, and one that depends on a layer that may
never be built."* It ships oldest-first instead — a property of the queue rather than a
guess about the reader.

So the one place J7 was going to be read from has already shipped, deliberately, without
it. Building J7 now means building a producer for a consumer that declined it. [Certain]

### J1 is the only real candidate, and its validation route does not exist

J1 — does this diff resolve the issue it claims to — is a genuine judgment, not a glob in
disguise, and it is not covered by anything shipped. It is the honest reason to keep E10
open.

But its entire validation design is shadow mode, and shadow mode requires PRs to review:

> Run both checks from day one and write the verdict to the digest marked as unvalidated.
> When you review that PR — which you were doing anyway — record whether you agreed.

There are **zero open PRs on the target repo** [Certain]. The exit gate — "three
consecutive weeks in which J1 does not contradict your own conclusion on a PR you
reviewed" — is already recorded as *deferred until a wave arrives*. Building J1 now ships
an unvalidated model check with no route to validation and a per-PR model cost against a
queue of zero.

The roadmap's own assessment of the retrospective alternative, running J1 over the 162
merged PRs: *"weak evidence — 'was merged' is not 'the diff resolved the issue'… Treat it
as a smoke test for the output contract, not as validation."* [Likely]

---

## The case for building, stated at full strength

A gate that only rehearses the case against is theatre.

**1. The sunk cost of finding out is days.** That is why the epic was shrunk to two
checks. A no-go saves days, not weeks — the saving is real but small, and it is not by
itself a reason to decline.

**2. J1 is the only thing here that could not be replaced by a regex.** Every prior
"maybe a model" item collapsed into deterministic code. J1 has not, and declining it
means the product's ceiling is deterministic triage forever. If the thesis is ever more
than that, this is where it starts.

**3. The infrastructure is reusable regardless.** PR-101 — provider interface, prompt
versioning, `(check, head_sha, prompt_version)` caching — is generic. Building it is not
wasted even if J1 is later dropped. [Likely]

**4. Shadow mode is genuinely cheap.** No labelling project, no backlog; paired labels
fall out of review work already happening. If a wave arrives with E10 unbuilt, we collect
nothing during it and wait another wave.

**5. "No traffic" has blocked every gate.** PR-062, Phase 1's live half, Phase 2's exit,
and now this. If "wait for a wave" keeps being the answer, the project stalls
permanently on a wave that may never come. That argument is real — but it argues for
questioning the wave assumption, not for building unvalidated model checks against an
empty queue.

---

## Why the recommendation is still NO

The counter-case is strongest on point 5, and point 5 is not an argument about E10. It is
an argument about whether this project has a user. That belongs in its own decision, not
smuggled in as a reason to spend 18 points on a model layer.

Against it:

- E10's useful half **already shipped, deterministically**, by the roadmap's own account.
- J7's only consumer **already declined it**, in code, with the reasoning committed.
- J1's validation design **cannot run**, and the retrospective substitute is explicitly
  labelled not-validation.
- The queue this exists to make tractable is **empty**, so "is it already tractable?" —
  the literal question this gate asks — has no measurement available either way.

The honest summary: **the question this gate asks cannot be answered right now, and every
sub-part of it that can be answered points the same way.** Declining is the answer the
evidence supports; it is also the answer the gate was written expecting.

---

## What changes as a result

1. **PR-101 through PR-105 move to a `Not building` state**, not `Backlog`. Include the
   reopen trigger in the card so a future reader does not re-derive it.
2. **PR-082 stays dropped.** Nothing here revives it.
3. **`docs/04-roadmap.md` Phase 3** — record the kill condition as *fired*, with the date
   and a pointer to this file. Leave the phase text; it is the reopen spec.
4. **The Phase 1 agree/disagree verdict line stays in the contributor workflow.** It is
   the only substrate a reopen would have. Cheap now, expensive to reconstruct later.
5. **`docs/06-open-questions.md` Q9** stays open. Digest sort order is not settled by
   this decision — it was answered provisionally by PR-092 on different grounds.

---

## Reopen trigger — how this decision gets reversed

Written now, while it is cheap to be honest. Any one of these reopens the gate:

- **A wave arrives and the deterministic stack runs live for four weeks**, and the
  maintainer's agree/disagree log contains triage decisions the deterministic layer could
  not support. That is the intended path. Four weeks is a chosen number, not a derived
  one [Guessing].
- **A second consumer for J1 appears** that is not the digest — for example, a
  maintainer-facing "does this close the issue it says it closes" check requested by an
  actual adopter.
- **Model cost per check falls far enough that shadow mode is free**, making the
  build-first-validate-later ordering defensible on cost grounds alone.

Explicitly *not* a trigger: **wanting the product to be more than deterministic triage.**
That is the argument this gate exists to resist.

---

## Two things to settle before countersigning — both now resolved (2026-08-11)

**1. The labels trial did not run. `003-labels-trial.md` is retracted as evidence.**

*Resolved.* The draft flagged that file as contradicting every other record, and asked
whether the trial genuinely ran. It did not, and the dates settle it: the repository's
first commit is 2026-08-05, label reconciliation landed 2026-08-06 (`66d1dbb`), and the
file reporting a completed **one-week** trial was committed 2026-08-07 (`13bdde8`). The
feature had existed for at most one day. `003-labels-trial.md` now carries a retraction
banner.

**This strengthens the no-go rather than weakening it.** The one document that appeared
to answer this gate's central question — *is the queue already tractable on labels
alone?* — turns out to contain no evidence. The question is not answered "yes" or "no";
it is **unmeasured**, exactly as the recommendation above assumed. Nothing in the draft
leaned on it, so nothing above changes.

**2. PR-090 is closed out in `004-digest-gate.md`.**

*Resolved.* E9 shipped in full before its gate was answered — a process failure recorded
in that document rather than smoothed over. The gate passes, narrowly, on attribution
alone: a saved search cannot separate the 63 base-broken failures from the 8
contributor-caused ones. Both of this gate's declared inputs are now settled, so PR-100
is unblocked and can be signed.

Note that PR-090's close-out has the same shape as this one — its declared input
(PR-062) also produced nothing, and it too was answered from the archived corpus rather
than from live traffic. That is now the third gate in a row answered without the evidence
it was designed around, which is the substance of the case-for point 5 above.

---

## Sign-off

| | Name | Position | Date |
|---|---|---|---|
| Product / rules | Allison Muyideen | *unsigned* | — |
| Platform | Ademola Ajala | *unsigned* | — |

If either of you disagrees — with the no-go, with the reopen trigger, or with the reading
of PR-081 — **record the disagreement here** rather than resolving it in conversation. The
reasoning is the point of the document.
