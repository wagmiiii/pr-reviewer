_Establishes the Definition of Done for the rules engine by introducing a zero false-positive gate on all fact rules._

## The Gate

We run every fact rule against all 159 archived PR fixtures. The results are compared strictly against `expectations.json`, which contains the hand-classified expected failures for each PR.

**The suite fails on any disagreement.**

| Rule Type       | Gated?  | Measurement                                  |
| --------------- | ------- | -------------------------------------------- |
| Fact Rules      | **Yes** | Zero false-positive gate (this PR)           |
| Heuristic Rules | No      | Measured on false-positive rate (separately) |

## The general principle

**A wrong fact rule is a bug, not a tuning problem.** By enforcing this gate against a static, historically accurate archive (the PR-012 fixtures), we guarantee that refactors to the rules engine cannot silently alter the definitions of CI failures, merge conflicts, or blockages. We can iterate quickly knowing the gate has our back.
