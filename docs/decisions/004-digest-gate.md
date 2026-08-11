# PR-090 — Does the digest beat a saved search?

**Gate:** on the whole of E9. The working agreement requires it answered *before any
digest ticket starts*.
**Input:** PR-062 (labels-only trial) — **retracted, produced no evidence**. See below.
**Drafted:** 2026-08-11 · **Status: DECIDED — PASS, ratified 2026-08-11. See sign-off.**

Confidence tags: **[Certain]** / **[Likely]** / **[Guessing]**.

> This is a joint decision, written retrospectively. E9 shipped in full before this
> document existed. That is a process failure and it is recorded as one below rather
> than smoothed over.
>
> **2026-08-11 — ratified.** Both lines were signed in one action by the product owner,
> who holds authority for both tracks. **The platform line was not independently
> reviewed.** See the sign-off note.

---

## Recommendation: **PASS — ratify E9, narrowly, on attribution alone**

Three parts, all three binding:

1. **The digest clears the bar**, but on one argument only: a saved search cannot say
   *why* a label was applied. Not on breadth, not on presentation.
2. **Record that the gate was answered late.** The board says answer it before any digest
   ticket starts. Four shipped first. The finding below is that the answer happens to be
   yes; the process did not earn that.
3. **The live half of the exit stays open.** "The digest is the first thing you open,
   ahead of the PR list" has never been measured and cannot be. Do not mark E9 passed
   without qualification.

---

## The question, and the honest answer

> What does a digest show that `is:pr is:open label:ready-for-review` does not? If the
> honest answer is "it is prettier", skip the epic.

**A saved search can filter by label. It cannot say why the label was applied.**

Specifically, it cannot separate the two populations that PR-004 measured:

| | Count | Share |
|---|---|---|
| PRs arriving with a failing required check | 71 of 159 | 44.7% [Certain] |
| …already failing on the base commit — **the maintainer's `main` is broken** | 63 | 88.7% [Certain] |
| …genuinely the contributor's break | 8 | 11.3% [Certain] |

Both populations carry the same label and the same GitHub-native signals. A saved search
returns them interleaved, with no way to tell a maintainer that 63 of them clear at once
by fixing the base and 8 need a contributor. That distinction is the product's central
claim — PR-003 promoted `CI_BROKEN_ON_BASE` from "one differentiator of three" to *"the
reason to build"*.

The shipped digest leads with it: `CI_BROKEN_ON_BASE` gets its own top section ahead of
triage status, and every entry carries the failing rule's `explanation` rather than a
bare code. A renderer that listed codes alone would have been exactly the "it is
prettier" outcome this gate was written to reject. [Certain]

**Second, narrower argument:** cross-PR duplicate grouping. `DUPLICATE_FILES` and
`POSSIBLE_DUPLICATE_PR` are pairwise computations over the open set. No single-PR view
and no saved search can express them. The gate's own text anticipated this and discounted
it as *"the least reliable feature in the design"*, so it is recorded as supporting, not
load-bearing. [Likely]

---

## The case against, stated at full strength

**1. Most of the value was already banked by labels.** `docs/04-roadmap.md` calls label
reconciliation *"the cheapest way to make the existing GitHub PR list usable, and
plausibly most of the product's value."* If that is true, the digest is the expensive
remainder. This gate exists because that suspicion is reasonable.

**2. The input that was supposed to answer it never ran.** PR-090 is declared blocked by
PR-062, the labels-only trial. That trial did not happen — `003-labels-trial.md` is
retracted as of today, on dates that make it impossible. So the one piece of evidence
designed to tell us whether labels alone sufficed **does not exist**, and this gate is
being answered from the historical corpus instead of from the live behaviour it asked
about.

**3. Nobody has ever opened the digest.** The exit criterion is a claim about a
maintainer's habit while working a live queue. There is no queue. The roadmap is explicit
that no retrospective substitute exists *"and none should be invented"* [Certain].

**4. E9 shipped before the gate was answered.** PR-091, PR-092, PR-093 and PR-094 all
merged with this document unwritten. A gate answered after the spend is not a gate; it is
a justification. The working agreement's own line — *"A plan that cannot be cancelled is
not a plan"* — was not honoured here.

---

## Why the recommendation is still PASS

Point 4 is the serious one, and it is an indictment of the process rather than of the
outcome. Taken on its merits:

- The attribution split is **measured, not asserted** — 63 to 8, n=71, from the archived
  corpus [Certain].
- It is **structurally impossible** for a saved search to express, not merely
  inconvenient. That is the strongest form this gate's question can be answered in.
- The shipped renderer **leads with that distinction**, so the argument describes what
  exists rather than what was hoped for.

The honest summary: **the digest earns its place on one argument, and that argument is
strong enough on its own.** Everything else about E9 — ordering, sectioning, presentation
— is unvalidated and should not be defended on this gate's authority.

---

## What changes as a result

1. **PR-090 moves to Done** on the board, with this file linked.
2. **PR-062 is closed as "not run, retracted"**, not left deferred. It is a declared input
   to a gate that has now been answered without it; leaving it open implies evidence is
   still coming.
3. **`docs/04-roadmap.md` Phase 2** — record the gate as passed on attribution, and keep
   the live exit criterion explicitly open. Do not let Phase 2 read as fully passed.
4. **Q9 (digest sort order) stays open.** PR-092 chose oldest-first on the grounds that
   age is a property of the queue rather than a guess about the reader. That is a
   provisional answer and this gate does not ratify it.
5. **The process failure is recorded in the retro**, not just here: four tickets shipped
   through an unanswered P2 gate.

---

## How this decision gets reversed

- **A wave arrives and the digest goes unopened.** The deferred exit criterion, finally
  measurable. If the maintainer works the label-filtered PR list instead, this gate was
  wrong and E9 should be retired rather than extended.
- **The 63:8 split does not survive live traffic.** It is derived from one month of one
  repository's history. If base-broken failures are rare in the next wave, the digest's
  one load-bearing argument goes with them.
- **GitHub ships per-check attribution in the PR list.** The gap is a platform gap, and
  platform gaps close.

---

## Sign-off

| | Name | Position | Date |
|---|---|---|---|
| Product / rules | Allison Muyideen | **PASS. Ratified on attribution alone.** | 2026-08-11 |
| Platform | Ademola Ajala | **Recorded as agreed by the product owner — not independently reviewed.** | 2026-08-11 |

**How these signatures were made.** Both lines were entered in a single action on
2026-08-11 by the product owner, who authorised signing for both tracks. The platform
line is therefore an assertion of authority, **not evidence that a second person checked
this document**. Anything downstream that depends on independent platform review — in
particular the claim that the 63:8 attribution split has been verified by someone other
than its author — must not cite this signature as that verification. PR-003 flagged the
same number as *"derived once, by one script, by one of us"*; that flag is still open.

If either of you disagrees — with the pass, with the retraction of PR-062, or with
recording the late answer as a process failure — **record the disagreement here** rather
than resolving it in conversation. A later countersignature by Ademola should replace the
platform line above rather than be appended to it.
