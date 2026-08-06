#!/usr/bin/env node
/**
 * PR-012 — the *record* half of the fixture harness.
 *
 * Maps the raw GitHub API capture in `corpus/prs/` into `PullRequestContext`
 * documents under `tests/fixtures/`, validating each one against
 * `schema/pull-request-context.schema.json` before it is written.
 *
 * Recording is deliberately a separate step from replaying. The corpus is a
 * verbatim API capture that will never change; fixtures are our shape, which
 * changes whenever `PullRequestContext` does. Keeping them apart means a type
 * change costs a re-run rather than a re-capture — and the capture is the part
 * that cannot be repeated once GitHub's retention window closes.
 *
 * Idempotent. Run it after any change to `src/types.ts`:
 *
 *     npm run schema && npm run fixtures:record
 *
 * A document the schema rejects is reported and skipped, never written. A
 * fixture that does not satisfy the contract is worse than no fixture: it
 * teaches a rule to expect a shape no collector will ever produce.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Ajv } from 'ajv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = join(ROOT, 'corpus/prs');
const OUT = join(ROOT, 'tests/fixtures');
const SCHEMA = join(ROOT, 'schema/pull-request-context.schema.json');

/** GitHub's author_association values, passed through verbatim. */
const ASSOCIATIONS = new Set([
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
  'CONTRIBUTOR',
  'FIRST_TIME_CONTRIBUTOR',
  'FIRST_TIMER',
  'MANNEQUIN',
  'NONE',
]);

const MERGEABLE_STATES = new Set([
  'clean',
  'dirty',
  'blocked',
  'behind',
  'unstable',
  'has_hooks',
  'draft',
  'unknown',
]);

/**
 * `undefined` when the endpoint was never successfully fetched, so the absent /
 * empty distinction in `PullRequestContext` survives the mapping. Substituting
 * `[]` here would quietly erase the difference the type exists to preserve.
 */
function section(raw, map) {
  return raw == null ? undefined : raw.map(map);
}

function checkRun(run) {
  return {
    name: run.name,
    status: run.status,
    conclusion: run.conclusion ?? null,
    ...(run.workflow_run_id ? { workflowRunId: String(run.workflow_run_id) } : {}),
  };
}

function toContext(doc, capturedAt) {
  const pr = doc.pull_request;

  return {
    schemaVersion: 1,
    collectedAt: doc.captured_at ?? capturedAt,

    number: pr.number,
    author: pr.author?.login ?? '',
    authorAssociation: ASSOCIATIONS.has(pr.author_association)
      ? pr.author_association
      : 'NONE',
    state: pr.state === 'open' ? 'open' : 'closed',
    isDraft: Boolean(pr.draft),
    isMerged: Boolean(pr.merged),

    createdAt: pr.created_at,
    updatedAt: pr.updated_at ?? pr.created_at,
    closedAt: pr.closed_at ?? null,
    mergedAt: pr.merged_at ?? null,

    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    // The resolved base is the commit the PR was actually tested against —
    // exact for merged PRs, approximate for the handful that never merged.
    // See corpus/README.md.
    baseSha: doc.base_branch_ci?.resolved_sha ?? pr.base.sha,
    headSha: pr.head.sha,

    isFork: Boolean(pr.head.fork),
    ...(pr.head.repo ? { headRepo: pr.head.repo } : {}),

    mergeableState: MERGEABLE_STATES.has(pr.mergeable_state)
      ? pr.mergeable_state
      : 'unknown',

    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    changedFiles: pr.changed_files ?? 0,

    reviews: section(doc.reviews, (r) => ({
      author: r.user?.login ?? r.author?.login ?? '',
      state: r.state,
      ...(r.submitted_at ? { submittedAt: r.submitted_at } : {}),
    })),
    commits: section(doc.commits, (c) => ({
      sha: c.sha,
      message: c.message ?? c.commit?.message ?? '',
      isVerified: Boolean(c.verified ?? c.commit?.verification?.verified),
      ...(c.authored_at ? { authoredAt: c.authored_at } : {}),
    })),
    files: section(doc.files, (f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions ?? 0,
      deletions: f.deletions ?? 0,
      ...(f.previous_filename ? { previousFilename: f.previous_filename } : {}),
    })),
    comments: section(doc.issue_comments?.comments, (c) => ({
      id: c.id,
      author: c.user?.login ?? '',
      authorAssociation: ASSOCIATIONS.has(c.author_association)
        ? c.author_association
        : 'NONE',
      body: c.body ?? '',
      createdAt: c.created_at,
      ...(c.updated_at ? { updatedAt: c.updated_at } : {}),
    })),

    checks: section(doc.head_check_runs?.check_runs, checkRun),
    baseChecks: section(doc.base_branch_ci?.check_runs?.check_runs, checkRun),
  };
}

/** Drops `undefined` members so the written JSON matches what replay reads. */
function prune(value) {
  return JSON.parse(JSON.stringify(value));
}

function main() {
  mkdirSync(OUT, { recursive: true });

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(JSON.parse(readFileSync(SCHEMA, 'utf8')));
  const capturedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  const sources = readdirSync(CORPUS)
    .filter((f) => f.startsWith('pr-') && f.endsWith('.json'))
    .sort();

  let written = 0;
  const rejected = [];

  for (const file of sources) {
    const doc = JSON.parse(readFileSync(join(CORPUS, file), 'utf8'));
    if (doc.fatal || !doc.pull_request) {
      rejected.push(`${file}: capture is fatal or has no pull_request`);
      continue;
    }

    const context = prune(toContext(doc, capturedAt));
    if (!validate(context)) {
      rejected.push(`${file}: ${JSON.stringify(validate.errors?.slice(0, 2))}`);
      continue;
    }

    writeFileSync(
      join(OUT, `pr-${context.number}.context.json`),
      `${JSON.stringify(context, null, 2)}\n`,
    );
    written += 1;
  }

  console.log(`recorded ${written} fixtures from ${sources.length} captured PRs`);
  if (rejected.length > 0) {
    console.log(`\nskipped ${rejected.length}:`);
    for (const line of rejected) console.log(`  ${line}`);
    process.exitCode = 1;
  }
}

main();
