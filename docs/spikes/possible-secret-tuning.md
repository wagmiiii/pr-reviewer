# PR-085 — `POSSIBLE_SECRET` tuning log

**Ticket:** PR-085, E8 Heuristics, P3. **Finished:** 2026-08-11.

Records what was tried, what it flagged, and why the current shape was chosen.
Thresholds invented without measurement are what PR-083 was told not to trust; the same
applies here.

Confidence tags: **[Certain]** / **[Likely]** / **[Guessing]**.

---

## First, the thing the ticket asked to check

> Low priority because GitHub secret scanning likely covers it better. Verify that before
> building.

**Partly true, and it does not make the rule redundant.** [Likely]

GitHub secret scanning is free on public repositories, covers a far larger provider list
than nine hardcoded prefixes, and has partner integrations that revoke a leaked key at the
source. On those grounds it is better than this rule and always will be.

Two gaps remain, and they are the reason to keep a warn-only version:

1. **Alerts are not visible to the maintainer during triage.** Secret scanning writes to
   the Security tab. This product's entire claim is that a maintainer working a queue
   should not have to open things to find out what is wrong — a digest line is a different
   delivery channel, not a duplicate detector.
2. **Push protection is off by default on existing repos**, and the scanning result is not
   part of the PR's mechanical state that this tool reconciles.

**Recorded honestly:** if a maintainer has secret scanning enabled and reads the Security
tab, this rule adds nothing. It is a low-value rule, which is what P3 already said.
`pr-reviewer recommend` (PR-094) pointing at secret scanning would serve most adopters
better than this rule does, and that is the more useful follow-up.

---

## Measurement method

There is **no corpus route for this rule.** The 159 archived PRs in `corpus/prs/` record
file names, additions and deletions, but **no patches** — `files[].patch` was never
captured. A rule that reads `context.diff.patch` therefore skips all 159. [Certain]

That is the same shape of problem as `MERGE_CONFLICT`, which PR-003 recorded as having no
validation route at all. Rather than declare the rule unmeasurable, it was run over **this
repository's own history**: the 60 most recent commits on `main`, via
`git show --format= --unified=0`. Real prose, real code, real lockfiles, real build output.

Weaknesses, stated: it is one repository, it is TypeScript-and-markdown shaped, and it
contains **zero real secrets**, so this measures the false-positive rate only. It says
nothing about recall. [Certain]

---

## Results

| Iteration | Change | Commits flagged (of 60) |
|---|---|---|
| 0 | As inherited | **30 — 50.0%** |
| 1 | Split tokens on whitespace; entropy floor 3.5 → 4.0; require a digit *and* a letter; drop hex-only, integrity hashes, URLs; skip generated files | **5 — 8.3%** |
| 2 | Drop path-like tokens; require ≥16 characters of body after a known prefix | **2 — 3.3%** |
| 3 | Add `dist/` and `build/` to generated files | **1 — 1.7%** |

The single remaining flag is a **true positive**: `tests/rules/security.test.ts` contains
`ghp_1234567890abcdefghijklmnopqrstuvwx` as a fixture, which is exactly what a leaked
GitHub token looks like. The rule is right; the string is fake.

**Effective false-positive rate on this sample: 0 of 60.** [Certain, for this sample]

---

## What was wrong at iteration 0

**The tokenizer never split on whitespace.** The character class was
`[s="':;,.<>/?()[\]{}|\\]+` — that leading `s` is a literal letter, not `\s`. Lines were
split on the letter *s* and on punctuation, so a whole English sentence became one token,
scored as one high-entropy string, and flagged.

```
"The quick brown fox jumped over the lazy dog again"  →  FLAGGED
```

This was the entire cause of the 50% rate. Any commit touching a markdown file was
near-certain to flag, which is why the PR-100 decision draft — pure prose — was flagged as
containing a credential.

**It also mattered more than a normal heuristic bug**, because of the next section.

---

## The invariant that was missing

The ticket says:

> **Maintainer-facing only, always.** Never surfaced in a public comment — a false positive
> published on a PR is worse than a miss.

`src/act/render.ts` rendered **every** failing heuristic rule into the contributor sticky
comment, `POSSIBLE_SECRET` included. Combined with the 50% false-positive rate, the shipped
behaviour would have been to publicly accuse roughly half of all contributors of leaking a
credential, on their own PR. [Certain]

Fixed by declaring `MAINTAINER_ONLY_CODES` in `src/rules/index.ts`, filtering it in the
renderer, and enforcing it with `tests/act/maintainer-only.test.ts` — a test rather than a
convention, the treatment PR-003 required for "never check out contributor code". The test
asserts both the code and its explanation text are absent, so a future renderer that
inlines explanations cannot leak it either.

---

## Thresholds chosen, and why

| Threshold | Value | Reasoning |
|---|---|---|
| Minimum token length | 20 | Inherited. Shorter tokens are dominated by ordinary identifiers. |
| Maximum token length | 200 | Above this it is a blob or minified line, not a credential. |
| Entropy floor | **4.0** | 3.5 admitted ordinary mixed-case identifiers. 4.0 is still a guess, and it is only meaningful now that tokens are actually whitespace-delimited. **[Guessing]** |
| Digit **and** letter required | — | The single most effective filter. English words never mix classes inside one token; credentials nearly always do. |
| Body after known prefix | ≥16 chars | Without it the rule matched its own `KNOWN_PREFIXES` list and flagged the commit that introduced it. |

Excluded outright: hex-only strings (git SHAs, checksums), `sha256-`/`sha512-` integrity
values, anything containing `://`, tokens ending in a source-file extension, and generated
files (lockfiles, `dist/`, `build/`, minified assets, `corpus/`, `tests/fixtures/`).

Path exclusion is by **trailing extension**, not by the presence of `/`, because AWS secret
access keys legitimately contain `/`.

---

## Confidence values

`0.9` for a known-prefix match — the issuing service defines the shape, so the string
either is that kind of credential or is a deliberate fake. `0.5` for entropy alone, which
is a guess and is labelled as one in the explanation the maintainer reads.

**Unrelated inconsistency found while doing this, not fixed here:** `src/rules/dependencies.ts`
returns `confidence: 100` and `90` where every other rule uses a 0–1 scale.
`BaseRuleResult.confidence` is an undocumented bare `number`, so nothing catches it, and
nothing currently consumes the field. It is a latent bug in PR-084's work rather than
PR-085's, and it should get its own ticket.

---

## What this rule still cannot tell you

- **Recall is unmeasured.** The sample contains no real secrets. Nine prefixes is a small
  fraction of what exists, and the entropy path will miss any credential that looks like a
  word. [Certain]
- **One repository, one language.** A Python or Go project will have different false
  positive shapes — `.env.example` files, base64 fixtures, embedded certificates.
- **The digest is still public** on a public repository. The values are redacted and the
  rule is off the contributor comment, but "maintainer-facing" means *addressed to* the
  maintainer, not private. A maintainer who wants true privacy should rely on secret
  scanning's Security tab, not on this.
