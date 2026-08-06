import { describe, expect, it } from 'vitest';

import * as engine from '../src/index.js';

describe('engine barrel', () => {
  it('exposes every pipeline stage', () => {
    expect(Object.keys(engine).sort()).toEqual([
      'act',
      'collect',
      'judge',
      'render',
      'rules',
    ]);
  });
});
