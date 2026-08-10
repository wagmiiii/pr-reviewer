import type { PullRequestContext, RuleResult } from '../types.js';
import type { RuleDefinition } from './index.js';

export const newDependencyRule: RuleDefinition = {
  code: 'NEW_DEPENDENCY',
  run(context: PullRequestContext): RuleResult {
    const files = context.files ?? [];

    const hasNpm = files.some(
      (f) => f.filename === 'package.json' || f.filename === 'package-lock.json',
    );
    const hasYarn = files.some((f) => f.filename === 'yarn.lock');
    const hasPnpm = files.some((f) => f.filename === 'pnpm-lock.yaml');
    const hasPython = files.some(
      (f) =>
        f.filename === 'requirements.txt' ||
        f.filename === 'pyproject.toml' ||
        f.filename === 'Pipfile.lock',
    );
    const hasRuby = files.some((f) => f.filename === 'Gemfile.lock');
    const hasRust = files.some((f) => f.filename === 'Cargo.lock');
    const hasGo = files.some((f) => f.filename === 'go.mod' || f.filename === 'go.sum');

    if (hasYarn || hasPnpm || hasPython || hasRuby || hasRust || hasGo) {
      return {
        code: 'NEW_DEPENDENCY',
        bucket: 'heuristic',
        outcome: 'fail',
        owner: 'maintainer',
        severity: 'warning',
        confidence: 100,
        explanation:
          'Dependency detection is currently unsupported for this ecosystem (npm only).',
      };
    }

    if (!hasNpm) {
      return {
        code: 'NEW_DEPENDENCY',
        bucket: 'heuristic',
        outcome: 'skip',
        owner: 'none',
        severity: 'info',
        confidence: 100,
        explanation: 'No dependency files modified.',
      };
    }

    const patch = context.diff?.patch ?? '';
    let hasNewDep = false;
    const filePatches = patch.split(/^diff --git/m);

    for (const chunk of filePatches) {
      if (!chunk.includes('a/package.json') && !chunk.includes('a/package-lock.json')) {
        continue;
      }

      const isPkg = chunk.includes('a/package.json');
      const isLock = chunk.includes('a/package-lock.json');

      const lines = chunk.split('\n');
      let inDepsBlock = false;

      for (const line of lines) {
        // Track if we are inside a dependencies block
        if (line.match(/"(?:dependencies|devDependencies|peerDependencies)"\s*:/i)) {
          inDepsBlock = true;
        } else if (line.match(/^[-+ ]\s*}/)) {
          // If we see a closing brace, we might be leaving the deps block
          // It's a heuristic, so it's not perfect but good enough for typical diffs
          inDepsBlock = false;
        }

        if (line.startsWith('+') && !line.startsWith('+++')) {
          if (isLock) {
            // v3 lockfile packages
            if (line.includes('"node_modules/')) {
              hasNewDep = true;
              break;
            }
            // v2/v1 lockfile dependencies
            if (inDepsBlock && line.match(/\+\s*"[^"]+"\s*:\s*\{/)) {
              hasNewDep = true;
              break;
            }
          }
          if (isPkg) {
            if (inDepsBlock && line.match(/\+\s*"[^"]+"\s*:\s*"[^"]+"/)) {
              hasNewDep = true;
              break;
            }
          }
        }
      }
    }

    if (hasNewDep) {
      return {
        code: 'NEW_DEPENDENCY',
        bucket: 'heuristic',
        outcome: 'fail',
        owner: 'maintainer',
        severity: 'warning',
        confidence: 90,
        explanation: 'New npm dependency detected. Verify security and licensing.',
      };
    }

    return {
      code: 'NEW_DEPENDENCY',
      bucket: 'heuristic',
      outcome: 'skip',
      owner: 'none',
      severity: 'info',
      confidence: 100,
      explanation: 'No new npm dependencies added.',
    };
  },
};
