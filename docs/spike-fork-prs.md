# Spike: Can the Action write on fork PRs?

## Conclusion

Yes, but with caveats. Standard `pull_request` workflows triggered from forks have a read-only `GITHUB_TOKEN` for security reasons.

## Solution

To write comments on a fork PR, we must use the `pull_request_target` event. This event runs in the context of the base repository rather than the fork, providing a `GITHUB_TOKEN` with write permissions.

### Important Security Warning

When using `pull_request_target`, the workflow executes code from the base branch, but it may checkout the PR branch. If we checkout the PR branch, we must not execute any untrusted code (e.g., `npm install`, `make`, etc.) directly, as this opens up critical security vulnerabilities (RCE/supply-chain attack).

Since this action just reviews PRs, it should strictly run the Action code from the base branch, and only analyze the diff from the PR without executing it.
