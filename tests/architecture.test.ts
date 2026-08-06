/**
 * Enforces the one architectural invariant the whole design rests on:
 * `collect` is the only stage that reads I/O, `act` is the only stage that
 * writes. Dry-run ("run everything, skip `act`") is only safe while that holds.
 *
 * This is a text scan, not a real dependency graph — cheap, and it catches the
 * realistic failure, which is someone reaching for `node:fs` or Octokit inside
 * a rule because it was convenient.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** Stages that must stay pure functions of their input. */
const PURE_STAGES = ['rules', 'render'] as const;

/** Import specifiers that mean the module is touching the outside world. */
const IO_IMPORTS = [
  'node:fs',
  'node:http',
  'node:https',
  'node:net',
  'node:child_process',
  'node:dns',
  '@octokit',
  '@actions/core',
  'undici',
];

function tsFilesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name));
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  );
}

describe('pipeline stage boundaries', () => {
  for (const stage of PURE_STAGES) {
    it(`\`${stage}\` imports nothing that does I/O`, () => {
      const offenders = tsFilesIn(join(SRC, stage)).flatMap((file) =>
        importSpecifiers(readFileSync(file, 'utf8'))
          .filter((specifier) =>
            IO_IMPORTS.some((io) => specifier === io || specifier.startsWith(`${io}/`)),
          )
          .map((specifier) => `${file}: ${specifier}`),
      );

      expect(offenders).toEqual([]);
    });

    it(`\`${stage}\` does not import from \`collect\` or \`act\``, () => {
      const offenders = tsFilesIn(join(SRC, stage)).flatMap((file) =>
        importSpecifiers(readFileSync(file, 'utf8'))
          .filter((specifier) => /^\.\.\/(collect|act)\b/.test(specifier))
          .map((specifier) => `${file}: ${specifier}`),
      );

      expect(offenders).toEqual([]);
    });
  }

  it('every stage directory exists', () => {
    const stages = readdirSync(SRC, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(stages).toEqual(['act', 'collect', 'judge', 'render', 'rules']);
  });
});
