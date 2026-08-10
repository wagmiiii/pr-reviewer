import type { RuleDefinition } from './index.js';

export const duplicateFilesRule: RuleDefinition = {
  code: 'DUPLICATE_FILES',
  run: (context) => {
    if (!context.files || context.files.length === 0) {
      return {
        code: 'DUPLICATE_FILES',
        bucket: 'heuristic',
        owner: 'maintainer',
        severity: 'warning',
        explanation: 'Did not run',
        outcome: 'skip',
        confidence: 1,
      };
    }
    if (!context.otherOpenPrs || context.otherOpenPrs.length === 0) {
      return {
        code: 'DUPLICATE_FILES',
        bucket: 'heuristic',
        owner: 'maintainer',
        severity: 'warning',
        explanation: 'Did not run',
        outcome: 'skip',
        confidence: 1,
      };
    }

    const ourFiles = new Set(context.files.map((f) => f.filename));
    const duplicates: number[] = [];

    for (const other of context.otherOpenPrs) {
      if (other.number === context.number) continue;
      if (!other.files || other.files.length === 0) continue;

      let overlapCount = 0;
      for (const f of other.files) {
        if (ourFiles.has(f.filename)) {
          overlapCount++;
        }
      }

      const overlapRatio = overlapCount / ourFiles.size;
      if (overlapRatio >= 0.7) {
        duplicates.push(other.number);
      }
    }

    if (duplicates.length > 0) {
      return {
        code: 'DUPLICATE_FILES',
        bucket: 'heuristic',
        owner: 'maintainer',
        severity: 'warning',
        outcome: 'fail',
        confidence: 0.7,
        explanation: `High file-path overlap (>= 70%) with open PRs: ${duplicates
          .map((n) => `#${n}`)
          .join(', ')}.`,
      };
    }

    return {
      code: 'DUPLICATE_FILES',
      bucket: 'heuristic',
      owner: 'maintainer',
      severity: 'warning',
      outcome: 'pass',
      confidence: 1,
      explanation: 'No significant file-path overlap with other open PRs.',
    };
  },
};
