_Implements PR-054: Verdict hashing and the noise budget._

## Core responsibilities

This PR introduces the state-management mechanism required to prevent the bot from becoming an annoyance by repeatedly commenting on PRs that haven't materially changed.

| Feature                    | Implementation Detail                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stable hashing**         | `hashVerdict` computes a SHA256 hash over the rule outcomes, ignoring ephemeral data like timestamps and log excerpts.                                                                                     |
| **Sticky comment**         | `applyComment` locates the bot's prior comment using an HTML marker (`<!-- pr-reviewer:v1 -->`).                                                                                                           |
| **Zero-write idempotency** | If the computed hash exactly matches the hash stored in the prior comment's marker, the bot issues zero write API calls.                                                                                   |
| **Noise budget cap**       | To prevent runaway edit loops on noisy PRs, a configurable `dailyEditCap` is tracked directly within the marker string. If the cap is reached within a single UTC day, further edits are silently dropped. |

## The general principle

**Stateless resilience requires embedding state in the environment.**
By persisting both the stable hash and the daily edit count inside the markdown of the comment itself, we achieve idempotent "exactly-once" behavior and strict noise budgeting without requiring a separate database, cache, or state store.
