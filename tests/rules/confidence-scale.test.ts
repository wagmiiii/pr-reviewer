/**
 * PR-086 — `confidence` is a 0–1 scale, and stays one.
 *
 * `HeuristicRuleResult.confidence` is a bare `number`, so the typechecker
 * cannot tell `0.9` from `90`. `dependencies.ts` shipped `100` and `90` and
 * nothing caught it, because no consumer reads the field yet — the bug was
 * latent, waiting for the first digest section that sorts on it.
 *
 * Two layers, because either alone has a hole:
 *
 * - **Replay** runs every registered rule over every recorded fixture. It
 *   catches new rules automatically, but only on the branches the corpus
 *   happens to exercise.
 * - **Source scan** reads the `confidence:` literals out of `src/rules`. It is
 *   a text scan, the same cheap trick `architecture.test.ts` uses, and it
 *   reaches the branches no fixture hits — the unsupported-ecosystem arm of
 *   `NEW_DEPENDENCY` was one of them.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CORE_RULES, runRules } from '../../src/rules/index.js';
import { loadFixtures } from '../support/fixtures.js';

const RULES_DIR = fileURLToPath(new URL('../../src/rules', import.meta.url));

function inRange(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

describe('confidence is a 0–1 scale', () => {
  it('every heuristic result over every fixture is within range', () => {
    const offenders = loadFixtures().flatMap((context) =>
      runRules(context, CORE_RULES)
        .filter((result) => result.bucket === 'heuristic')
        .filter((result) => !inRange(result.confidence))
        .map((result) => `PR #${context.number} ${result.code}: ${result.confidence}`),
    );

    expect(offenders).toEqual([]);
  });

  it('every `confidence:` literal in src/rules is within range', () => {
    const files = readdirSync(RULES_DIR, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => join(entry.parentPath, entry.name));

    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');

      // The value as written, up to the end of the property. Taking the whole
      // expression rather than a leading number is deliberate: it reaches the
      // literals inside a ternary, which is how `security.ts` assigns its two.
      return [...source.matchAll(/confidence:\s*([^,\n]+)/g)].flatMap((match) => {
        const literals = (match[1] ?? '').match(/\d+(?:\.\d+)?/g) ?? [];

        return literals
          .map(Number)
          .filter((value) => !inRange(value))
          .map((value) => `${file}: ${value}`);
      });
    });

    expect(offenders).toEqual([]);
  });
});
