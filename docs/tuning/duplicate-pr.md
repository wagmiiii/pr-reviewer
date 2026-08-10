# Duplicate PR Threshold Tuning

## Objective
Tune the `POSSIBLE_DUPLICATE_PR` heuristic to identify heavily overlapping open PRs while avoiding false positives triggered by commonly updated "central" files.

## Approach
- **Strategy**: Fetches the last 40 open PRs. We build a frequency map of all files modified in those PRs.
- **Central file exclusion**: Any file modified in > 20% of open PRs (min 3) is considered a "central file" (e.g., `package.json`, `README.md`) and is excluded from the overlap computation. This prevents trivial overlaps.
- **Overlap Metric**: `overlapProportion = (overlapping meaningful files) / min(PR_A meaningful files, PR_B meaningful files)`.

## Tuning Logs

**Threshold Tried: 70% (0.7)**
- **Observed**: Flagged PRs with moderate overlap where common utility modules were refactored concurrently. Led to several false positives where features happened to touch the same 2-3 files in a 4-file PR.

**Threshold Tried: 90% (0.9)**
- **Observed**: Too strict. Missed genuine duplicate PRs where one author added an extra commit tweaking an unrelated file.

**Threshold Chosen: 80% (0.8)**
- **Reasoning**: Strikes the right balance. After excluding central files, an 80% overlap relative to the smaller of the two PRs strongly indicates they are solving the exact same issue or are effectively the same branch. 
- **Result**: Reliable detection without spamming contributors. The rule is maintainer-facing only, so any borderline true-positives are easily dismissed by the maintainer.
