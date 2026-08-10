import { expect, test, describe } from 'vitest';
import { renderComment } from '../../src/act/render.js';
import type { PullRequestContext, RuleResult } from '../../src/types.js';

describe('renderComment', () => {
  test('renders maintainer blocked state with broken CI on base', () => {
    const context = {
      schemaVersion: 1,
      baseBranch: 'main',
      headBranch: 'feature',
      checks: [
        { name: 'build', status: 'completed', conclusion: 'failure', isRequired: true, failureExcerpt: 'Error: Cannot find module X' }
      ]
    } as unknown as PullRequestContext;
    
    const results: RuleResult[] = [
      {
        code: 'CI_BROKEN_ON_BASE',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'maintainer',
        severity: 'blocking',
        explanation: 'A required check is failing on the base branch.'
      },
      {
        code: 'MERGE_CONFLICT',
        outcome: 'pass',
        bucket: 'fact',
        owner: 'none',
        severity: 'info',
        explanation: 'No conflicts'
      }
    ];
    
    const result = renderComment(context, results, 'BLOCKED_ON_MAINTAINER');
    expect(result).toContain('### PR Status: 🔴 **Blocked (Maintainer)**');
    expect(result).toContain('#### 🛑 Blocking Issues');
    expect(result).toContain('CI_BROKEN_ON_BASE');
    expect(result).toContain('❌ `build`');
    expect(result).toContain('Error: Cannot find module X');
  });

  test('renders contributor blocked state for merge conflict', () => {
    const context = {
      schemaVersion: 1,
      baseBranch: 'main',
      headBranch: 'feature',
    } as unknown as PullRequestContext;
    
    const results: RuleResult[] = [
      {
        code: 'MERGE_CONFLICT',
        outcome: 'fail',
        bucket: 'fact',
        owner: 'contributor',
        severity: 'blocking',
        explanation: 'There are merge conflicts.'
      }
    ];
    
    const result = renderComment(context, results, 'BLOCKED_ON_CONTRIBUTOR');
    expect(result).toContain('### PR Status: 🔴 **Blocked (Contributor)**');
    expect(result).toContain('MERGE_CONFLICT');
    expect(result).toContain('git merge origin/main');
  });

  test('renders ready for review when no failures', () => {
    const context = {} as PullRequestContext;
    const results: RuleResult[] = [];
    const result = renderComment(context, results, 'READY_FOR_REVIEW');
    
    expect(result).toContain('### PR Status: 🟢 **Ready for Review**');
    expect(result).toContain('No mechanical issues found.');
  });
});
