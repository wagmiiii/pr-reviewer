# Open questions

Decisions to make before Phase 1. Recommendations given; none are locked.

## Q1 — Is this a product or a tool for your own repos?

Changes almost everything: multi-tenancy, config surface, docs burden, hosting.
*Recommendation:* build it for your own repos first and make it adoptable by copying a
workflow file. Productise only if other maintainers ask.

## Q2 — Where does the digest live?

A pinned issue is zero-infrastructure and works today. A web dashboard is nicer but is a
whole second product.
*Recommendation:* pinned issue through Phase 3. Revisit only if the digest outgrows a
comment.

## Q3 — Does the judgment layer ever talk to contributors?

Sending model opinions into a public PR thread is where community friction starts.
*Recommendation:* digest-only until the false-positive rate is measured. Then consider
promoting only the highest-precision checks (test-deletion, missing tests).

## Q4 — How is "did they fix the issue" actually evaluated?

Options: issue text vs. diff (cheap, shallow); issue text vs. diff plus the referenced
source files (better, costlier); reproduce-and-verify (out of scope).
*Recommendation:* start shallow with mandatory evidence citations and a liberal
`unknown`. Measure before investing more.

## Q5 — Who owns a red CI that isn't the contributor's fault?

Flaky tests and broken-on-main both blame the contributor wrongly, which is a
trust-destroying failure. Detect by checking whether the same check fails on base.
*Recommendation:* implement the base-comparison check in Phase 1; classify as
`BLOCKED_ON_MAINTAINER` when base is also red.

## Q6 — Rebase instructions require knowing the contributor's fork setup.

Remote names vary. Generic instructions can be wrong, and wrong git advice loses work.
*Recommendation:* emit the GitHub web "Update branch" button first, `gh pr checkout N`
second, and raw git commands only as a fallback with an explicit "check your remotes"
caveat.

## Q7 — What happens on repos with no CI at all?

Half the gate rules go silent and the bot looks broken.
*Recommendation:* detect at collect time and say so plainly in the digest, plus point at
the `recommend` audit (Q8).

## Q8 — Should the bot audit the repo's own contribution setup?

A `pr-reviewer recommend` command reporting missing PR template, missing required
checks, missing CONTRIBUTING, no auto-merge protection. Cheap to build, prevents more
bad PRs than any amount of triage.
*Recommendation:* yes, small Phase 2 add-on.

## Q9 — Model provider and cost ceiling.

Needs a provider-agnostic interface and a hard monthly spend cap with graceful
degradation (skip judgment, keep the gate) when exceeded.
*Recommendation:* decide at Phase 3, not before. The gate carries the product until
then.

## Q10 — Prompt injection defence, concretely.

Untrusted diff content flows into model context. Mitigations: no tool access in judge
calls, structured output only, judge output can never trigger writes, delimiter framing,
and a scan for injection-shaped strings in diffs that raises a maintainer warn.
*Recommendation:* treat as a Phase 3 release blocker, documented and tested.

## Q11 — How do contributors opt out?

Some will find any bot intrusive.
*Recommendation:* honour a `no-bot` label on a PR — skip everything except gate status
in the digest.
