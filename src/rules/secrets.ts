import type { RuleDefinition } from './index.js';

// Calculate Shannon entropy of a string
function calculateEntropy(str: string): number {
  const len = str.length;
  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// Patterns that strongly indicate a secret based on prefix
const SECRET_PREFIXES = [
  /AKIA[0-9A-Z]{16}/, // AWS
  /gh[pousr]_[A-Za-z0-9_]{36,}/, // GitHub tokens
  /sk_live_[0-9a-zA-Z]{24}/, // Stripe
  /xox[baprs]-[0-9]{10,}-[a-zA-Z0-9]{24}/, // Slack
  /AIza[0-9A-Za-z-_]{35}/, // Google API
];

export const possibleSecretRule: RuleDefinition = {
  code: 'POSSIBLE_SECRET',
  run: (context) => {
    if (!context.diff?.patch) {
      return {
        code: 'POSSIBLE_SECRET',
        outcome: 'skip',
        bucket: 'heuristic',
        owner: 'none',
        severity: 'info',
        explanation: 'No diff available to check for secrets.',
        confidence: 1,
        thresholdTuned: true,
      };
    }

    const addedLines = context.diff.patch
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.substring(1));

    let foundSecret = false;
    let matchType = '';

    for (const line of addedLines) {
      // 1. Check for known prefixes
      for (const regex of SECRET_PREFIXES) {
        if (regex.test(line)) {
          foundSecret = true;
          matchType = 'Known secret prefix detected.';
          break;
        }
      }

      if (foundSecret) break;

      // 2. Entropy check on long random-looking strings (Base64/Hex)
      // Look for contiguous alphanumeric strings (plus /+-_=) longer than 32 chars
      const tokenRegex = /[a-zA-Z0-9/+\-_=]{32,}/g;
      const matches = line.match(tokenRegex);
      if (matches) {
        for (const token of matches) {
          const entropy = calculateEntropy(token);
          // A purely random base62 string has max entropy ~5.95
          // We set a threshold of 4.5 to catch highly entropic strings
          if (entropy > 4.5) {
            foundSecret = true;
            matchType = 'High-entropy string detected (possible key or token).';
            break;
          }
        }
      }

      if (foundSecret) break;
    }

    if (foundSecret) {
      return {
        code: 'POSSIBLE_SECRET',
        outcome: 'fail',
        bucket: 'heuristic',
        owner: 'maintainer',
        severity: 'warning',
        explanation: `A potential secret was found in the added lines. ${matchType} Note: Matched values are redacted from this report to prevent leakage.`,
        confidence: 0.9,
        thresholdTuned: false,
      };
    }

    return {
      code: 'POSSIBLE_SECRET',
      outcome: 'pass',
      bucket: 'heuristic',
      owner: 'none',
      severity: 'info',
      explanation: 'No obvious secrets detected in added lines.',
      confidence: 0.9,
      thresholdTuned: false,
    };
  },
};
