# PR-090 — Digest gate

**Gate:** the second of three that can end or redirect the project.
**Inputs:** PR-062 (one-week labels-only trial), `06-open-questions.md` Q2 and Q9.
**Drafted:** 2026-08-10 · **Status: DRAFT — awaiting product owner decision and platform countersignature.**

Confidence tags: **[Certain]** / **[Likely]** / **[Guessing]**.

---

## The question, as written

> What does a digest show that `is:pr is:open label:ready-for-review` does not?
> If the honest answer is "it is prettier", skip it.

Q2 set the test empirically: *run Phase 1 labels alone for a week; if you find yourself
wanting something the PR list can't show, build the digest. If not, don't.* PR-062 ran
that week. This gate reads its result.

---

## Recommendation: **GO, scoped — and one cheap experiment runs first**

Three parts, all three binding:

1. **The gap is real and it is not prettiness.** Build the digest.
2. **Split label granularity out as a precursor** and ship it before PR-092. It closes
   roughly half the observed gap for about a sixth of the cost, and it shrinks what the
   digest has to do.
3. **PR-093 (stale nudge) stays conditional.** Nothing in the trial asked for it.

---

## What PR-062 actually returned

| Observation | Effect on this gate |
|---|---|
| Labels made triage **partially tractable** — maintainer stopped monitoring PRs they couldn't merge | Confirms Phase 1 delivered. Weakens the case for more. |
| Maintainer **still opened PRs to learn *why*** one was blocked | The load-bearing finding for GO |
| Contributors saw labels but **didn't know what was expected** | Real, but **not the digest's to claim** — see below |

### The honest answer to "what does the saved search not show"

A saved search filters by label. It cannot show **why** a label was applied. The trial
names two distinct unknowns the maintainer had to open PRs to resolve:

1. *Merge conflict, or failing CI?* — a **category** question.
2. *If CI: a flaky/base-broken check, or a real break the author introduced?* — an
   **attribution** question.

These have very different costs. (1) is expressible in the label vocabulary itself. (2)
is not expressible in any label — it needs the check name and the base-versus-branch
comparison, which is prose. [Certain — it is a property of what a label can encode]

And (2) is precisely this project's load-bearing finding. PR-004 measured **63 of 71**
failing PRs as already failing on their base commit. A queue view that cannot distinguish
"your `main` is broken" from "this contributor broke it" is hiding the single thing the
tool exists to surface. That is a genuine information gain over the saved search, and it
survives the "is it just prettier" test. **[Certain]**

---

## The case against, stated at full strength

**1. Contributor confusion is the sticky comment's win, not the digest's.** Observation 3
is already addressed by E7, which shipped in Sprint 4. Crediting it to the digest inflates
the case. Removed from the ledger above.

**2. Granular labels close unknown (1) for near-zero engineering.** Splitting
`needs-author-action` into `needs-author-action:ci` / `:conflict` / `:stale` is a change to
the label vocabulary and the reconciliation map — roughly 2 points against E9's 11. If
half the observed pain evaporates for 2 points, the digest must justify itself on the
remaining half alone. **This is the strongest argument against and it has not been
tested.** [Likely]

**3. The evidence base is one maintainer, one week, one repo.** PR-004 at least had n=159.
This gate rests on three qualitative observations. [Certain about the thinness]

**4. There is still no live queue.** PR-003 recorded zero open PRs. A digest of an empty
queue is worth nothing, and the wave that motivated the project is over. The digest's value
is contingent on a second wave that may not arrive. [Guessing]

**5. Q9 (sort order) is still unanswered** and PR-092 needs it. The trial did not produce
the usage data Q9 said would answer it, because labels alone don't expose ordering.

---

## Why the recommendation is still GO

The counter-case argues about **scope and sequencing**, not about whether the gap exists.
Unknown (2) — attribution — is not reachable by any cheaper mechanism, and it is the
project's core claim. A tool that measured 88.7% base-broken and then declined to show it
at queue level would be refusing to ship its own best finding.

But argument 2 is strong enough to change the shape of the work rather than be waved
through. Hence: run the cheap experiment, then build the digest against what's left.

---

## What changes as a result

1. **New precursor ticket — label granularity.** Split `needs-author-action` by cause.
   ~2 points, product/rules track. Ships before PR-092.
2. **PR-091 (sweep) is unaffected** — the digest needs a whole-queue sweep regardless, and
   it is the prerequisite for measuring anything.
3. **PR-092 (renderer) is re-specified after the precursor lands**, against the gap that
   actually remains. Its 5 points are an upper bound, not a commitment.
4. **PR-093 (stale nudge) is not authorised by this gate.** No trial observation asked for
   it. It stays Unscheduled until something does.
5. **Q9 stays open** and is answered from the precursor's week of usage, not by argument.
6. **PR-100 is not answered here and must not be inferred from this decision.** See below.

---

## What this gate does *not* authorise

PR-100 — whether to build the judgment layer at all — remains open. This gate weakens the
case for it rather than strengthening it: every gap PR-062 identified is being closed
deterministically, by labels and by a renderer over facts the collectors already have. No
model is required to answer "which check failed, and was it already failing on base".

Per Q9, PR-100 needs a period of real digest usage behind it. It cannot be answered before
PR-092 has run on a live queue.

**Scaffolding for it already exists uncommitted** — see `wip/judge-scaffold`, parked
2026-08-10. It should not land while this remains open. It also weakens the `MarkerState`
schema (`additionalProperties: false` → `true`) to admit judgment data, which is a
validation regression taken on behalf of an unapproved feature.

---

## Kill criteria — how this decision gets reversed

- **The label-granularity precursor closes the gap entirely.** If a week on granular labels
  leaves the maintainer no longer opening PRs to diagnose, PR-092 is unnecessary. Say so and
  stop — the 2 points will have saved 5.
- **No second wave arrives before PR-092 would ship.** A digest with nothing to digest is a
  novelty. Defer rather than build.
- **A maintained equivalent ships.** Same clause as PR-003. Adopt it and stop.

---

## Sign-off

| | Name | Position | Date |
|---|---|---|---|
| Product / rules | Allison Muyideen | *pending* | |
| Platform | Ademola Ajala | *pending* | |

Both signatures are outstanding. If either of you disagrees — with the GO, with the
precursor, or with holding PR-093 — **record the disagreement here** rather than resolving
it in conversation. The reasoning is the point of the document.

The one thing to check before countersigning: **argument 2 has not been tested.** If you
believe granular labels close the whole gap, this should be a NO-GO on PR-092 and a yes to
the precursor alone, and it is cheaper to say so now than after five points are spent.
