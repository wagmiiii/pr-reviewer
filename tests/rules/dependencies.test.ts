import { describe, it, expect } from 'vitest';
import { newDependencyRule } from '../../src/rules/dependencies.js';
import type { PullRequestContext } from '../../src/types.js';

describe('NEW_DEPENDENCY', () => {
  it('skips when no dependency files are modified', () => {
    const context = {
      files: [{ filename: 'src/index.ts', status: 'modified' }],
      diff: { patch: '' },
    } as unknown as PullRequestContext;

    expect(newDependencyRule.run(context).outcome).toBe('skip');
  });

  it('fails with unsupported warning for yarn', () => {
    const context = {
      files: [{ filename: 'yarn.lock', status: 'modified' }],
      diff: { patch: '' },
    } as unknown as PullRequestContext;

    const result = newDependencyRule.run(context);
    expect(result.outcome).toBe('fail');
    expect(result.explanation).toContain('unsupported');
  });

  it('skips for npm if no dependencies added in diff', () => {
    const context = {
      files: [{ filename: 'package.json', status: 'modified' }],
      diff: {
        patch: `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -1,2 +1,2 @@
-  "version": "1.0.0"
+  "version": "1.0.1"`,
      },
    } as unknown as PullRequestContext;

    expect(newDependencyRule.run(context).outcome).toBe('skip');
  });

  it('fails if new dependency is added to package.json', () => {
    const context = {
      files: [{ filename: 'package.json', status: 'modified' }],
      diff: {
        patch: `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -10,2 +10,3 @@
   "dependencies": {
+    "new-pkg": "^1.0.0",
     "old-pkg": "^1.0.0"
   }`,
      },
    } as unknown as PullRequestContext;

    const result = newDependencyRule.run(context);
    expect(result.outcome).toBe('fail');
    expect(result.explanation).toContain('New npm dependency');
  });

  it('fails if new dependency is added to package-lock.json', () => {
    const context = {
      files: [{ filename: 'package-lock.json', status: 'modified' }],
      diff: {
        patch: `diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -100,0 +101,4 @@
+    "node_modules/new-pkg": {
+      "version": "1.0.0",
+      "resolved": "https://registry.npmjs.org/new-pkg/-/new-pkg-1.0.0.tgz"
+    },`,
      },
    } as unknown as PullRequestContext;

    const result = newDependencyRule.run(context);
    expect(result.outcome).toBe('fail');
    expect(result.explanation).toContain('New npm dependency');
  });
});
