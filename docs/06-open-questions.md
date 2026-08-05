# Open questions

Decisions to make, with a recommendation each. Confidence tags:
[Certain] / [Likely] / [Guessing].

## Q1 — Is this a product or a tool for your own repos?

Changes multi-tenancy, config surface, docs burden, and hosting.
**Recommendation:** build it for your own repos and make it adoptable by copying one
workflow file. Productise only if other maintainers ask. Building for hypothetical users
first is the most common way this kind of project stalls [Guessing, but widely observed].

## Q2 — Does the digest survive contact with GitHub search? *(blocks Phase 2)*

`is:pr is:open label:ready-for-review` plus the Phase 1 labels may deliver most of the
digest's value for none of the work [Certain the search works; Guessing how much value
it absorbs].
**Recommendation:** run Phase 1 labels alone for a week. If you find yourself wanting
something the PR list can't show, build the digest. If not, don't. Answer this
empirically rather than by argument.

## Q3 — Does the judgment layer ever talk to contributors? **RESOLVED: no, permanently**

The surviving Bucket 3 checks are J1 (issue-resolution) and J7 (effort-estimate).
Neither has meaning for a contributor: an effort estimate is about the reviewer, and an
issue-resolution doubt reads as an accusation. The test-related checks that were the
promotion candidates are now deterministic Bucket 2 rules, so they reach the comment
without needing promotion (see `03-review-pipeline.md`).

## Q4 — Should Bucket 3 run on *blocked* PRs? **RESOLVED: no**

The question rested on a stock/flow error — see the corrected F6 in `01-critique.md`.
The judge fires on a PR's transition into `READY_FOR_REVIEW`, so "most PRs are blocked
right now" never implied "the judge rarely runs".

The alternative framing — "is this blocked PR worth rescuing, or should it be closed
politely?" — is rejected on three grounds:

1. A blocked PR's blocker is mechanical, and the rules already told both parties exactly
   what it is. A model opinion adds nothing to "CI is red".
2. "Close this" is the highest-stakes output in the design resting on the weakest
   evidence, and the cost of a false positive is a discouraged contributor [Certain
   about the asymmetry].
3. It runs the model over the largest population — most expensive, least valuable.

## Q5 — Flaky tests will still be misattributed

Comparing against base catches broken-main, but a check that fails intermittently
passes on base and the contributor gets blamed anyway [Certain]. Real detection needs
re-run history or repeated sampling.
**Recommendation:** out of scope. Say so in the comment copy — hedge the CI message
("this check failed on your branch and passed on `main`") rather than asserting fault.
Cheap mitigation, no engineering.

## Q6 — Rebase instructions can destroy contributor work

Remote names vary; wrong git advice loses commits [Likely].
**Recommendation:** ordered fallback — (1) GitHub's web "Update branch" button,
(2) `gh pr checkout N`, (3) raw git commands with an explicit "check your remote names
first" caveat. Never lead with raw git.

## Q7 — What happens on repos with no CI?

Most fact rules go silent and the bot looks broken.
**Recommendation:** detect at collect time, say so plainly, and point at
`pr-reviewer recommend` (Q8).

## Q8 — Should the bot audit the repo's own contribution setup?

Missing PR template, no required checks, no CONTRIBUTING. Prevention stops more bad PRs
than any amount of triage [Likely].
**Recommendation:** yes. Small Phase 2 add-on, high leverage.

## Q9 — How should the digest be sorted?

The first draft said "cheap wins first" (ascending reviewer effort). That was an
unbacked assertion about your preferences [Guessing — no evidence either way].
Maintainers may well want the most *important* PR first.
**Recommendation:** don't decide now. Phase 1 labels don't need a sort order; by Phase
2 you'll have a week of real usage to answer it from.

## Q10 — Prompt-injection defence **RESOLVED: verifiability, not sanitisation**

Untrusted diff content enters model context and cannot be filtered — the diff *is* the
payload, and any filter over it is bypassable [Certain]. Sanitisation is therefore not
attempted.

With merging out of scope, no tool access in judge calls, and digest-only output read by
one person who knows it is model-generated, the worst outcome is a fabricated line in
the digest. The defence is that a fabricated finding either cites nothing — dropped by
the mandatory-evidence contract — or cites a location that doesn't say what it claims,
caught in one click.

Downgraded from release blocker to: **mandatory `file:line` evidence in the output
schema, plus one adversarial fixture in the test suite.** The elaborate version was
priced for a merge bot that no longer exists.

## Q11 — How do contributors opt out?

Some find any bot intrusive.
**Recommendation:** honour a `no-bot` label — skip all writes on that PR, keep it
visible to the maintainer.

## Q12 — What kills this project?

Worth writing down so it's recognisable early.
**Recommendation:** three named failure modes to watch for —

1. **Phase −1 research shows Mergify already does it.** Correct response: adopt
   Mergify, stop. Not a failure.
2. **Fork tokens can't write on any acceptable trigger.** Forces Surface B, which turns
   a weekend project into hosted infrastructure. Decide honestly whether you want that.
3. **Scope drift into line-by-line code review.** The gravitational pull is strong and
   it's a losing fight against funded competitors. `00-concept.md` lists it as a
   non-goal for this reason.
