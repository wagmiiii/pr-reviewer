_Implements the `scan` CLI command that serves as the primary entry point for Phase 0._

## Core responsibilities

The `scan` command runs the entire pipeline (collect -> rules -> render) over all open pull requests in a repository.

| Feature             | Implementation Detail                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Invocation**      | `pr-reviewer scan <owner>/<repo>`                                                                                                   |
| **Config Loader**   | Strict YAML parsing of `.github/pr-reviewer.yml` via the GitHub API. Fails fast on unknown keys to prevent silent misconfiguration. |
| **Data Collection** | Hydrates a complete `PullRequestContext` for each open PR using `collectPullRequestCore`.                                           |
| **Rule Engine**     | Passes the context to the central `runRules` function using `CORE_RULES`.                                                           |
| **Presentation**    | Formats the output for humans (the terminal renderer) or machines (`--json`).                                                       |

## Read-only by design

This command reads from the GitHub API and writes to stdout. It makes absolutely no state modifications to the repository, respecting the strict read-only boundary defined for Phase 0.

## The general principle

**A bot with write access must fail fast on invalid config.**
By failing loudly when `.github/pr-reviewer.yml` contains unknown keys, we prevent a scenario where a maintainer misspells `disabledRules` and accidentally unleashes automated judgments they thought they had disabled. The system should refuse to run rather than guess.
