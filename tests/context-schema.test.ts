/**
 * PR-011 acceptance criterion: *"A JSON schema generated from it, used to
 * validate recorded fixtures."*
 *
 * Two separate guarantees, and both matter:
 *
 *   1. The committed schema still matches `src/types.ts`. A hand-maintained
 *      schema drifts silently, and a drifted schema validates fixtures against
 *      a contract nobody is actually writing code to.
 *   2. Recorded fixtures satisfy it. This is what PR-012 replays against, so a
 *      fixture the type cannot describe is a fixture no rule can consume.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCHEMA_PATH = join(ROOT, 'schema/pull-request-context.schema.json');
const FIXTURES = join(ROOT, 'tests/fixtures');

function committedSchema(): unknown {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
}

describe('PullRequestContext JSON schema', () => {
  it('is up to date with src/types.ts', () => {
    // Regenerates into memory and compares. If this fails, run `npm run schema`.
    const regenerated = execFileSync(
      'npx',
      [
        'ts-json-schema-generator',
        '--path',
        'src/types.ts',
        '--type',
        'PullRequestContext',
        '--tsconfig',
        'tsconfig.json',
        '--no-type-check',
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

    expect(JSON.parse(regenerated)).toEqual(committedSchema());
  }, 60_000);

  it('validates every recorded fixture', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(committedSchema() as object);

    const fixtures = readdirSync(FIXTURES).filter((f) => f.endsWith('.context.json'));
    expect(fixtures.length).toBeGreaterThan(0);

    for (const file of fixtures) {
      const context = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
      const valid = validate(context);
      expect(valid, `${file}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it('rejects an empty array standing in for an uncollected section', () => {
    // Not a schema check — a documentation check. `checks: []` is legal and
    // means "collected, none found". The distinction from `undefined` is a
    // contract rules must honour, so it is asserted somewhere visible.
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(committedSchema() as object);

    const base = JSON.parse(
      readFileSync(join(FIXTURES, 'pr-157.context.json'), 'utf8'),
    ) as Record<string, unknown>;

    expect(validate({ ...base, checks: [] })).toBe(true);
    const { checks: _omitted, ...withoutChecks } = base;
    expect(validate(withoutChecks)).toBe(true);
  });
});
