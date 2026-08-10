import type { PullRequestContext, RuleResult } from '../types.js';
import type { RuleDefinition } from './index.js';

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
        explanation: 'No diff available to check for secrets',
        confidence: 1,
      };
    }

    const lines = context.diff.patch.split('\n');
    const addedLines = lines
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.slice(1).trim());

    let secretFound = false;
    for (const line of addedLines) {
      if (KNOWN_PREFIXES.some((prefix) => line.includes(prefix))) {
        secretFound = true;
        break;
      }

      const tokens = line.split(/[s="':;,.<>/?()[\]{}|\\]+/);
      for (const token of tokens) {
        if (token.length >= 20 && calculateEntropy(token) > 3.5) {
          secretFound = true;
          break;
        }
      }

      if (secretFound) break;
    }

    if (secretFound) {
      return {
        code: 'POSSIBLE_SECRET',
        outcome: 'fail',
        bucket: 'heuristic',
        owner: 'maintainer',
        severity: 'warning',
        explanation: 'Possible secret detected in added lines.',
        confidence: 0.7,
        thresholdTuned: false,
      };
    }

    return {
      code: 'POSSIBLE_SECRET',
      outcome: 'pass',
      bucket: 'heuristic',
      owner: 'none',
      severity: 'info',
      explanation: 'No obvious secrets detected.',
      confidence: 1,
    };
  },
};
