import './chunk-G3PMV62Z.js';

// src/act/render.ts
function renderComment(context, results, status) {
  const activeFailures = results.filter(
    (r) => r.outcome === "fail" || r.outcome === "pass" && false
  );
  const factFailures = activeFailures.filter(
    (r) => r.bucket === "fact" && r.outcome === "fail"
  );
  const heuristicFailures = activeFailures.filter(
    (r) => r.bucket === "heuristic" && r.outcome === "fail"
  );
  const lines = [];
  let statusBadge = "";
  switch (status) {
    case "READY_FOR_REVIEW":
      statusBadge = "\u{1F7E2} **Ready for Review**";
      break;
    case "BLOCKED_ON_CONTRIBUTOR":
      statusBadge = "\u{1F534} **Blocked (Contributor)**";
      break;
    case "BLOCKED_ON_MAINTAINER":
      statusBadge = "\u{1F534} **Blocked (Maintainer)**";
      break;
    case "WAITING":
      statusBadge = "\u{1F7E1} **Waiting**";
      break;
  }
  lines.push(`### PR Status: ${statusBadge}`);
  lines.push("");
  if (factFailures.length > 0) {
    lines.push("#### \u{1F6D1} Blocking Issues");
    lines.push("");
    for (const failure of factFailures) {
      const ownerLabel = failure.owner === "maintainer" ? "*(Maintainer action required)*" : "*(Contributor action required)*";
      lines.push(`- **${failure.code}**: ${failure.explanation} ${ownerLabel}`);
      if (failure.code === "CI_FAILING" || failure.code === "CI_BROKEN_ON_BASE") {
        const failingChecks = (context.checks || []).filter(
          (c) => ["failure", "timed_out", "cancelled", "action_required", "stale"].includes(
            c.conclusion
          )
        );
        for (const check of failingChecks) {
          lines.push(
            `  - \u274C \`${check.name}\`${check.failureExcerpt ? `:
    \`\`\`
    ${check.failureExcerpt}
    \`\`\`` : ""}`
          );
        }
      }
      if (failure.code === "MERGE_CONFLICT") {
        lines.push(
          `  - **How to fix**: Resolve conflicts by merging or rebasing against \`${context.baseBranch}\`.`
        );
        lines.push(`    \`\`\`sh`);
        lines.push(`    git fetch origin`);
        lines.push(`    git checkout ${context.headBranch}`);
        lines.push(`    git merge origin/${context.baseBranch}`);
        lines.push(`    # resolve conflicts, then:`);
        lines.push(`    git push`);
        lines.push(`    \`\`\``);
      }
      if (failure.code === "BEHIND_BASE") {
        lines.push(
          `  - **How to fix**: Update your branch to include the latest changes from \`${context.baseBranch}\`.`
        );
      }
    }
    lines.push("");
  }
  if (heuristicFailures.length > 0) {
    lines.push("#### \u26A0\uFE0F Warnings & Notes");
    lines.push("");
    for (const failure of heuristicFailures) {
      lines.push(`- **${failure.code}**: ${failure.explanation}`);
    }
    lines.push("");
  }
  if (factFailures.length === 0 && heuristicFailures.length === 0) {
    lines.push("No mechanical issues found.");
    lines.push("");
  }
  return lines.join("\n").trim();
}

export { renderComment };
//# sourceMappingURL=render-5JCM6QY6.js.map
//# sourceMappingURL=render-5JCM6QY6.js.map