import type { PullRequestContext, RuleResult } from '../types.js';
import type { RuleDefinition } from './index.js';

/**
 * PR-085. Known key prefixes plus an entropy check over added lines.
 *
 * This rule is **maintainer-only and never rendered into the contributor
 * comment** — see `MAINTAINER_ONLY_CODES` and the enforcing test in
 * `tests/act/maintainer-only.test.ts`. A false positive published on a
 * contributor's PR is worse than a miss, so the invariant is a test rather
 * than a convention.
 *
 * The entropy path is deliberately conservative. Measured against this
 * repository's own history (60 commits), the first implementation flagged
 * **30 of 60** — English prose in docs, git SHAs, and lockfile integrity
 * hashes. The current shape flags 0. See `docs/spikes/possible-secret-tuning.md`.
 */

function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;

  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const freq of frequencies.values()) {
    const p = freq / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Prefixes that identify a credential on their own. A match here needs no
 * entropy support — the issuing service defined the shape.
 */
const KNOWN_PREFIXES = [
  'AKIA',
  'ghp_',
  'gho_',
  'ghu_',
  'ghs_',
  'ghr_',
  'sk_live_',
  'xoxb-',
  'xoxp-',
];

/**
 * Machine-generated files where a high-entropy string is the norm and a
 * committed credential is not a realistic failure mode. Checking them
 * produces noise and nothing else.
 */
const GENERATED_FILE_PATTERNS = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)Cargo\.lock$/,
  /(^|\/)go\.sum$/,
  /(^|\/)Gemfile\.lock$/,
  /(^|\/)composer\.lock$/,
  /(^|\/)poetry\.lock$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /(^|\/)corpus\//,
  /(^|\/)tests\/fixtures\//,
  // Build output. This repo commits `dist/action.js` because an Action must
  // ship its bundle; a bundle is generated, so scanning it only reproduces
  // findings from the sources it was built from.
  /(^|\/)dist\//,
  /(^|\/)build\//,
];

/** Subresource-integrity and checksum values. Long, random, not secrets. */
const INTEGRITY_PREFIX = /^(sha1|sha256|sha384|sha512|md5)-/i;

/** Hex-only: git SHAs, checksums, UUID bodies. Never a credential. */
const HEX_ONLY = /^[0-9a-f]+$/i;

/**
 * File paths. `docs/decisions/005-judgment-gate.md` is 35 characters, mixes
 * digits and letters, and scores above the entropy floor — it was the largest
 * remaining false-positive class after whitespace splitting was fixed.
 *
 * Matched on a trailing source-file extension rather than on `/`, because AWS
 * secret access keys legitimately contain `/`.
 */
const PATH_LIKE =
  /\.(md|markdown|ts|tsx|js|jsx|mjs|cjs|json|ya?ml|txt|sh|toml|lock|xml|html?|css|svg|png|snap)$/i;

/**
 * Minimum body length after a known prefix. Without it the rule matches its own
 * `KNOWN_PREFIXES` list, this file's tests, and any document that names a
 * credential format — which is how it flagged the commit that introduced it.
 */
const MIN_PREFIX_BODY = 16;

/**
 * Split on whitespace and the punctuation that surrounds a value in source.
 *
 * Deliberately does **not** split on `.`, `/`, `+`, `-` or `_`, all of which
 * occur inside real credentials (JWT segments, AWS secret keys, slack tokens).
 */
const TOKEN_DELIMITERS = /[\s="'`;,<>()[\]{}|\\]+/;

const MIN_TOKEN_LENGTH = 20;
const MAX_TOKEN_LENGTH = 200;
const MIN_ENTROPY = 4.0;

function isGeneratedFile(filename: string): boolean {
  return GENERATED_FILE_PATTERNS.some((p) => p.test(filename));
}

/**
 * A credential is a dense run of characters with no internal structure. The
 * digit-and-letter requirement is what excludes English prose, which is the
 * single largest false-positive source: an ordinary word never mixes classes.
 */
function looksLikeCredential(token: string): boolean {
  if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) return false;
  if (INTEGRITY_PREFIX.test(token)) return false;
  if (HEX_ONLY.test(token)) return false;
  if (PATH_LIKE.test(token)) return false;
  if (!/[0-9]/.test(token)) return false;
  if (!/[a-z]/i.test(token)) return false;
  if (token.includes('://')) return false;
  return calculateEntropy(token) >= MIN_ENTROPY;
}

/**
 * Never emit the matched value. Keeps enough of the head to identify the
 * credential type and discloses nothing usable.
 */
function redact(token: string): string {
  const head = token.slice(0, 3);
  return `${head}${'*'.repeat(Math.min(token.length - head.length, 12))}`;
}

interface SecretHit {
  readonly file: string;
  readonly line: number;
  readonly redacted: string;
  readonly reason: 'known-prefix' | 'entropy';
}

/**
 * Walks the unified diff tracking the current file and new-file line number, so
 * a hit can be reported as `file:line` without ever quoting the value.
 */
export function findSecrets(patch: string): SecretHit[] {
  const hits: SecretHit[] = [];
  let currentFile = '';
  let newLineNo = 0;
  let skipFile = false;

  for (const rawLine of patch.split('\n')) {
    if (rawLine.startsWith('diff --git')) {
      currentFile = '';
      skipFile = false;
      continue;
    }

    if (rawLine.startsWith('+++ ')) {
      const path = rawLine.slice(4).trim();
      currentFile = path === '/dev/null' ? '' : path.replace(/^b\//, '');
      skipFile = currentFile !== '' && isGeneratedFile(currentFile);
      continue;
    }

    if (rawLine.startsWith('--- ')) continue;

    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(rawLine);
    if (hunk) {
      newLineNo = Number(hunk[1]);
      continue;
    }

    if (rawLine.startsWith('-')) continue;

    if (!rawLine.startsWith('+')) {
      newLineNo++;
      continue;
    }

    const content = rawLine.slice(1);
    const lineNo = newLineNo;
    newLineNo++;

    if (skipFile) continue;

    const tokens = content.split(TOKEN_DELIMITERS);

    const prefixToken = tokens.find((token) =>
      KNOWN_PREFIXES.some(
        (prefix) =>
          token.startsWith(prefix) && token.length >= prefix.length + MIN_PREFIX_BODY,
      ),
    );
    if (prefixToken) {
      hits.push({
        file: currentFile,
        line: lineNo,
        redacted: redact(prefixToken),
        reason: 'known-prefix',
      });
      continue;
    }

    for (const token of tokens) {
      if (looksLikeCredential(token)) {
        hits.push({
          file: currentFile,
          line: lineNo,
          redacted: redact(token),
          reason: 'entropy',
        });
        break;
      }
    }
  }

  return hits;
}

export const possibleSecretRule: RuleDefinition = {
  code: 'POSSIBLE_SECRET',
  run: (context: PullRequestContext): RuleResult => {
    if (!context.diff || !context.diff.patch) {
      return {
        code: 'POSSIBLE_SECRET',
        outcome: 'skip',
        bucket: 'heuristic',
        owner: 'none',
        severity: 'info',
        explanation: 'No diff available to check for secrets.',
        confidence: 1,
      };
    }

    const hits = findSecrets(context.diff.patch);

    if (hits.length === 0) {
      return {
        code: 'POSSIBLE_SECRET',
        outcome: 'pass',
        bucket: 'heuristic',
        owner: 'none',
        severity: 'info',
        explanation: 'No obvious secrets detected.',
        confidence: 1,
      };
    }

    const byPrefix = hits.some((h) => h.reason === 'known-prefix');
    const shown = hits
      .slice(0, 3)
      .map((h) => `${h.file || 'unknown'}:${h.line} (\`${h.redacted}\`)`)
      .join(', ');
    const more = hits.length > 3 ? ` and ${hits.length - 3} more` : '';

    return {
      code: 'POSSIBLE_SECRET',
      outcome: 'fail',
      bucket: 'heuristic',
      owner: 'maintainer',
      severity: 'warning',
      explanation:
        `Possible secret in added lines: ${shown}${more}. ` +
        `Values are redacted; review the diff directly. ` +
        (byPrefix
          ? 'Matched a known credential prefix.'
          : 'Matched on entropy alone, which is the weaker signal.'),
      // A known prefix is defined by the issuing service; entropy is a guess.
      confidence: byPrefix ? 0.9 : 0.5,
      thresholdTuned: true,
    };
  },
};
