_Implements PR-053: Dry-run mode end to end._

## Core responsibilities

This PR provides users with the confidence to deploy PR-Reviewer by ensuring they can run it and observe its outputs without accidentally mutating their repository.

| Feature                         | Implementation Detail                                                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enforced client-side safety** | Adds an Octokit `hook` in `createGitHubClient` that aggressively throws an Error if any write API (`POST`, `PUT`, `DELETE`, `PATCH`) is called when `dryRun = true`. This moves safety from convention to a hard client boundary. |
| **Documented default**          | Updates `RepoConfig` types to explicitly document that `dry_run: true` should be the default for adoption.                                                                                                                        |
| **Visible intentions**          | Updates side-effecting `act` runners like `applyLabels` (and implicitly future runners) to print their intended diffs directly to the console instead of relying on network tracing.                                              |

## The general principle

**Dry-run must be enforced at the boundary, not the call site.**
By wrapping the HTTP request method itself, we ensure no future developer can accidentally introduce a write side-effect that bypasses the dry-run guard.
