_Implements the `act` phase core logic for PR-060: Label reconciliation._

## Core responsibilities

This PR introduces the pure functions required to reconcile desired bot-managed labels against actual PR labels, and the effectful runner to sync them to the repository.

| Feature                                | Implementation Detail                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desired label computation**          | Computes the precise set of labels required based on rule failures (`needs-ci-fix`, `has-conflicts`, etc) and `TriageStatus` (`ready-for-review`).                                     |
| **Pure reconciliation**                | A pure `reconcileLabels` function takes the desired set and the actual array, producing exact `add` and `remove` arrays. Crucially, it **never touches maintainer-owned labels**.      |
| **Zero API writes on unchanged state** | `applyLabels` fetches the current PR labels first. If `add` and `remove` are empty, it exits immediately, issuing zero API writes (Idempotency requirement).                           |
| **Creation with colours**              | Labels scheduled for addition are queried via the repository endpoint. If a 404 is encountered, they are created with their specified hex colour and description before being applied. |

## The general principle

**Reconciliation must be a pure function of desired vs actual state.**
By strictly separating the pure diff computation (`reconcileLabels`) from the side effects (`applyLabels`), we ensure the behaviour is entirely predictable and testable, and we easily fulfil the mandate to avoid unnecessary API writes.
