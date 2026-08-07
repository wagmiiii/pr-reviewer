import * as core from '@actions/core';
import { runCommand } from './cli/run.js';

runCommand().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
