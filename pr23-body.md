_Implements the maintainer-first terminal renderer required for the Phase 0 CLI._

## Driven by PR status

The output is strictly driven by the final derived status of each PR. We evaluate the fact rules and group the PRs into the specific queues maintainers need:

| Queue                      | Condition                                                    |
| -------------------------- | ------------------------------------------------------------ |
| **Ready for you**          | `READY_FOR_REVIEW` (no fact failures)                        |
| **Blocked on contributor** | `BLOCKED_ON_CONTRIBUTOR` (e.g., merge conflicts, failing CI) |
| **Needs your decision**    | `BLOCKED_ON_MAINTAINER` (e.g., protected file changes)       |
| **Stale**                  | `WAITING` due to the `STALE` rule specifically               |
| **Waiting**                | `WAITING` for any other reason                               |

## Formatting and metadata

Each line clearly presents the PR number, title, any blocking reasons (in brackets), and the triage age in days.
If a PR is missing CI data completely, we append `(no CI detected)` to the notes so the maintainer isn't left guessing why CI rules failed.

## The general principle

**The renderer is a pure consumer.** It takes the array of `EvaluatedPR` objects and maps them to strings. It does not re-evaluate rules, nor does it fetch data. This ensures our presentation layer remains decoupled from the rules engine.
