# PR-003 — Go / no-go / pivot

**Gate:** the first of five that can end the project.
**Inputs:** PR-001 (fork token spike), PR-002 (competitor research), PR-004 (premise test).
**Drafted:** 2026-08-06 · **Status: RECOMMENDED, awaiting both signatures.**

> This is a joint decision. What follows is a recommendation with its evidence and its
> counter-evidence laid out; it is not the decision. Sign-off block is at the foot.

Confidence tags: **[Certain]** / **[Likely]** / **[Guessing]**.

---

## Recommendation: **GO, scoped down — and the pitch is not the one we started with**

Three parts, all three binding:

1. **Build**, but authorise only **through PR-042** (Sprint 0–2, ~53 points), not the
   128-point plan. Sprints 3–4 stay drafted and unauthorised.
2. **Lead with blockage ownership and `CI_BROKEN_ON_BASE`.** That is where the measured
   evidence is. The original "drowning in CI nagging" pitch is *not* what the history
   supports.
3. **Ship the CLI first, the Action second.** There is no live queue to serve, and the
   trigger design just lost its chosen mechanism.

---

## What the three inputs actually returned

| Input | Result | Effect on this gate |
|---|---|---|
| **PR-001** fork token | Hypothesis confirmed; **`check_suite` is dead** and must be replaced | Raises delivery cost. Does not block. |
| **PR-002** competitors | 1 of 3 differentiators uncovered, 1 narrowed, 1 **dead** | Weakens the original pitch, supplies a better one |
| **PR-004** premise | Premise confirmed, but **inverted** | Supplies the strongest single argument to build |

### PR-001 — the trigger we chose does not exist for us

`check_suite: completed` "does not trigger workflows if the check suite was created by
GitHub Actions", and **100% of check suites on the target repo are created by GitHub
Actions** [Certain]. The trigger would have fired **zero times** on the one repo this
project exists to serve.

That is the worst failure mode available: a workflow that is correct, tested, green, and
never runs. `docs/02-architecture.md` records it as **Chosen** and `docs/01-critique.md`
P1 gives it as the resolution. Both are wrong and must be amended before any Sprint 3
work starts.

**The replacement is a real choice, not a detail, and the two spikes have not converged
on it:**

| | `workflow_run: completed` | `pull_request_target` |
|---|---|---|
| Write token on fork PRs | Yes [Certain — documented] | Yes [Certain] |
| Latency | One workflow-chain hop | Seconds |
| Config burden | **Adopter must name their CI workflow** — weakens "one file, zero config" | None |
| Safety requirement | No artifact download, no head checkout | **No head checkout** |
| Ecosystem precedent | The standard fix for this exact problem | What nearform ships; what our own `premise-test/` already runs |

Both are viable. Both need the same enforced invariant: **never check out or execute
contributor code.** This design already never does — `act` makes API calls only.

This gate does not need to pick one. **PR-051 does, and it must not inherit
`check_suite` by default.**

### PR-002 — one differentiator survives outright, and a better one appeared

- **Blockage ownership: uncovered.** No surveyed tool answers "whose problem is this?"
  and none compares a failing check against the base before assigning blame. [Likely —
  absence across the tools surveyed, not proof of absence]
- **Actionable CI instructions: narrowed.** The concept is proven and re-implemented
  repeatedly; what's missing is a maintained, CI-agnostic, **GitHub Actions-native**
  version. An implementation gap, not a conceptual one.
- **Issue linkage: dead.** Several free actions do it, one better than our planned regex.
  Drop it.

And the argument that wasn't on the original list: **adopting the alternatives means
installing four to five separate bots, each posting its own comment.** That recreates the
exact problem this project exists to solve. **The integration is the product** — one bot,
one comment, one reconciled label set, one noise budget.

### PR-004 — the premise is true, and it is about blame, not volume

| | |
|---|---|
| PRs arriving with a failing check | **71 of 159 (44.7%)** [Certain] |
| …already failing on the base commit | **63 of 71 (88.7%)** [Certain] |
| …genuinely the contributor's break | **8 of 71 (11.3%)** [Certain] |
| Maintainer comments that were manual nags | **73 of 78 (93.6%)** [Likely — keyword floor] |
| Median hours open→closed, nagged vs not | **40.9h vs 3.8h** [Certain] |

Two things follow.

**The maintainer was already hand-rolling this bot.** The most common comment in the
entire history is `fix your cl` — 14 times verbatim — and a copy-pasted CI boilerplate
appears 9 times. A human doing string templating by hand is the clearest demand signal
available. [Certain]

**And nearly nine nags in ten were aimed at the wrong person.** 63 of 71 failing PRs were
failing a check *already failing on the base commit they branched from*. Contributors
were being told to fix the maintainer's red `main`.

This is the finding that justifies the project, and it is not the finding we planned
around. `docs/00-concept.md` treats `CI_BROKEN_ON_BASE` as differentiator #1 in a list of
three. It is not one of three. **It is the reason to build.**

---

## The case against, stated at full strength

A gate that only rehearses the case for is theatre.

**1. There is no queue. The wave is over.** 159 PRs in one month; **zero open now**
[Certain]. If waves are episodic, the tool has value during a wave and none between. The
argument for building is "be ready for the next one", which is materially weaker than
"ongoing pain" — and one observed wave is not a pattern. [Guessing]

**2. 78 maintainer comments in a month is not drowning.** ~2.5 a day at peak. The
*misdirection* justifies the tool. The raw volume does not.

**3. The flagship rule's positive case is 8 PRs.** Only 8 of 159 had a genuine
contributor-caused break on a green base. If the pitch is "tells contributors what to
fix", that is the true size of what it serves. Its real job is the other 63 — which is a
*maintainer*-facing product, not a contributor-facing one. That should change who we
design the output for.

**4. Mergify plus two free actions gets a real fraction of Phases 1–2 today, for zero
engineering.** [Likely] A maintainer who just wants a tractable queue should install
those first. We should say so in our own README.

**5. Delivery just got more expensive.** `check_suite` is gone; the replacement either
costs adopter configuration or requires a security invariant we must enforce in code
rather than convention.

**6. `MERGE_CONFLICT` cannot be validated against history at all** — `mergeable_state` is
computed for open PRs only and all 159 are closed [Certain]. PR-032 ships on reasoning,
not evidence, until live traffic exists.

---

## Why the recommendation is still GO

The counter-case is real and mostly argues about **size and timing**, not about whether
the thing works. Weighed against it:

- The single strongest claim is now **measured, not asserted** — 88.7%, n=71.
- The gap it fills is **uncovered** by every tool surveyed.
- The demand signal is a human hand-templating comments 23 times in a month.
- The cost to the next gate is **~53 points**, not 128, and PR-042 kills it cheaply if the
  rules don't hold up.

The honest summary: **the evidence supports a small, sharp tool, and does not yet support
the full roadmap.** So authorise the small sharp tool.

---

## What changes as a result

Binding on the sprints, not optional follow-ups:

1. **`docs/00-concept.md` § Differentiation** — drop issue linkage; promote
   `CI_BROKEN_ON_BASE` and blockage ownership to the lead; add the single-bot / noise-budget
   argument; say "GitHub Actions" explicitly on the CI-excerpt point.
2. **`docs/02-architecture.md` § Trigger model** and **`docs/01-critique.md` P1** — remove
   `check_suite: completed` as Chosen. Record it as **rejected, with the reason**, and
   leave the replacement open for PR-051.
3. **PR-051** — must choose between `workflow_run` and `pull_request_target` on the
   evidence in both spikes, and must encode "never check out or execute contributor code"
   as an enforced invariant with a test, not a convention. `tests/architecture.test.ts` is
   the natural place.
4. **PR-082** (issue-linkage heuristics) — drop, or reduce to recommending nearform's
   action from PR-094.
5. **Output design re-targets the maintainer.** 63 of 71 findings are "your `main` is
   broken", not "your PR is broken". PR-041 and PR-071 should be reviewed against that
   before they are built.
6. **README states the alternative honestly** — if you want conflict labels and
   linked-issue enforcement today, install Mergify and nearform's action. We are the
   integration, not the only way.
7. **Nothing past PR-042 is authorised.** Sprints 3–4 remain drafted.

---

## Kill criteria — how this decision gets reversed

Written now, while it is cheap to be honest.

- **PR-042 fails.** Any fact-rule disagreement with blind hand classification over the
  seeded 40-PR sample. A wrong fact rule is a bug, not a tuning problem — one is enough.
- **The 88.7% does not survive scrutiny.** If base-SHA resolution turns out to be wrong in
  a way that inflates it, the central argument goes with it. **This should be
  independently re-derived by the other person before Sprint 1 starts** — it is currently
  one script written by one of us.
- **A maintained GitHub-Actions-native equivalent ships** before we reach PR-042. Adopt it
  and stop.
- **A second wave arrives and the existing tools handle it.** That is the live test PR-004
  could not run. If Mergify plus two actions makes it tractable, this is a no-go and we
  saved two months.

---

## Open, deliberately not resolved here

- **Trigger choice** — PR-051, on the evidence in both spikes.
- **Whether the product is maintainer-facing or contributor-facing.** The 63/8 split
  suggests maintainer. The roadmap assumes contributor. Unresolved, and it affects every
  renderer ticket.
- **Whether waves are episodic.** Unknowable from one wave. Revisit if a second arrives.

---

## Sign-off

| | Name | Position | Date |
|---|---|---|---|
| Product / rules | Allison Muyideen | | |
| Platform | Ademola Ajala | | |

**Not decided until both rows are filled.** If either party disagrees, record the
disagreement here rather than resolving it in conversation — the reasoning is the point
of the document.
