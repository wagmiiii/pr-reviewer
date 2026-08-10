import { describe, expect, it } from 'vitest';
import { duplicateFilesRule } from '../../src/rules/duplicateFiles.js';
import type { PullRequestContext } from '../../src/types.js';

describe('DUPLICATE_FILES rule', () => {
  it('skips if no files in PR', () => {
    const context = { files: [] } as unknown as PullRequestContext;
    const result = duplicateFilesRule.run(context);
    expect(result.outcome).toBe('skip');
  });

  it('skips if no other open PRs', () => {
    const context = {
      files: [{ filename: 'src/index.ts' }],
      otherOpenPrs: [],
    } as unknown as PullRequestContext;
    const result = duplicateFilesRule.run(context);
    expect(result.outcome).toBe('skip');
  });

  it('passes if overlap is below 70%', () => {
    const context = {
      number: 1,
      files: [
        { filename: 'src/index.ts' },
        { filename: 'src/utils.ts' },
        { filename: 'src/types.ts' },
        { filename: 'src/rules.ts' },
      ],
      otherOpenPrs: [
        {
          number: 2,
          author: 'alice',
          files: [{ filename: 'src/index.ts' }, { filename: 'src/utils.ts' }],
        },
      ],
    } as unknown as PullRequestContext;

    // overlap = 2 / 4 = 50%
    const result = duplicateFilesRule.run(context);
    expect(result.outcome).toBe('pass');
  });

  it('fails if overlap is 70% or more', () => {
    const context = {
      number: 1,
      files: [
        { filename: 'src/index.ts' },
        { filename: 'src/utils.ts' },
        { filename: 'src/types.ts' },
        { filename: 'src/rules.ts' },
      ],
      otherOpenPrs: [
        {
          number: 2,
          author: 'alice',
          files: [
            { filename: 'src/index.ts' },
            { filename: 'src/utils.ts' },
            { filename: 'src/types.ts' },
          ],
        },
      ],
    } as unknown as PullRequestContext;

    // overlap = 3 / 4 = 75%
    const result = duplicateFilesRule.run(context);
    expect(result.outcome).toBe('fail');
    expect(result.explanation).toContain('#2');
  });
});
