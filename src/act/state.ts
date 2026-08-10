import * as cache from '@actions/cache';
import { Ajv } from 'ajv';
import fs from 'node:fs';

import type { JudgmentResult, ReviewerEffortEstimate } from '../judge/index.js';

export interface MarkerState {
  hash: string;
  date: string;
  editsToday: number;
  status?: string;
  judgments?: {
    issueResolution?: JudgmentResult | null;
    effortEstimate?: ReviewerEffortEstimate | null;
  };
}

const ajv = new Ajv();
const stateSchema = {
  type: 'object',
  properties: {
    hash: { type: 'string' },
    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    editsToday: { type: 'integer', minimum: 0 },
    status: { type: 'string' },
    judgments: { type: 'object' },
  },
  required: ['hash', 'date', 'editsToday'],
  additionalProperties: true,
};
const validateState = ajv.compile(stateSchema);

export async function readState(
  owner: string,
  repo: string,
  pullNumber: number,
  commentBody?: string,
): Promise<MarkerState | null> {
  const keyPrefix = `pr-reviewer-${owner}-${repo}-${pullNumber}-`;
  const cachePath = '.pr-reviewer-state.json';

  // 1. Try Actions cache
  try {
    const cacheHit = await cache.restoreCache([cachePath], keyPrefix + Date.now(), [
      keyPrefix,
    ]);
    if (cacheHit) {
      const data = JSON.parse(await fs.promises.readFile(cachePath, 'utf8'));
      if (validateState(data)) {
        return data as unknown as MarkerState;
      }
    }
  } catch (error) {
    // Ignore cache errors
  }

  // 2. Fallback to sticky comment
  if (commentBody) {
    const match = commentBody.match(/<!-- pr-reviewer:v1\s*({.*?})\s*-->/s);
    if (match && match[1]) {
      try {
        const data = JSON.parse(match[1]);
        if (validateState(data)) {
          return data as unknown as MarkerState;
        }
      } catch (e) {
        // Validation/parse error treats as no prior state
      }
    }
  }

  return null;
}

export async function writeState(
  owner: string,
  repo: string,
  pullNumber: number,
  state: MarkerState,
): Promise<void> {
  const key = `pr-reviewer-${owner}-${repo}-${pullNumber}-${Date.now()}`;
  const cachePath = '.pr-reviewer-state.json';

  try {
    await fs.promises.writeFile(cachePath, JSON.stringify(state));
    await cache.saveCache([cachePath], key);
  } catch (error) {
    // Ignore cache errors
  }
}
