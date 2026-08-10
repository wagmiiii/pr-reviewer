import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Workflow configurations', () => {
  test('pull_request_target is never used', () => {
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      return; // No workflows to check
    }

    const files = fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      expect(content).not.toContain('pull_request_target');
    }
  });
});
