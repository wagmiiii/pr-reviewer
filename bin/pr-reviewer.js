#!/usr/bin/env node
import { cli } from '../dist/index.js';
import { Octokit } from 'octokit';

const args = process.argv.slice(2);
if (args[0] === 'recommend') {
  const octokit = process.env.GITHUB_TOKEN
    ? new Octokit({ auth: process.env.GITHUB_TOKEN })
    : undefined;
  const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  cli.recommend({ octokit, owner, repo }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (args[0] === 'scan') {
  const octokit = process.env.GITHUB_TOKEN
    ? new Octokit({ auth: process.env.GITHUB_TOKEN })
    : undefined;
  if (!octokit) {
    console.error('Missing GITHUB_TOKEN environment variable');
    process.exit(1);
  }
  const target = args[1] || process.env.GITHUB_REPOSITORY;
  if (!target || !target.includes('/')) {
    console.error('Usage: pr-reviewer scan <owner>/<repo>');
    process.exit(1);
  }
  const [owner, repo] = target.split('/');
  const json = args.includes('--json');

  cli.scanCommand({ octokit, owner, repo, json }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (args[0] === 'preview') {
  // Offline: fixtures only, no token, no network, no writes.
  const positional = args.slice(1).filter((a) => !a.startsWith('--'));
  const number = positional[0] ? Number(positional[0]) : undefined;
  if (positional[0] && !Number.isInteger(number)) {
    console.error(`Not a PR number: ${positional[0]}`);
    process.exit(1);
  }

  const onlyArg = args.find((a) => a.startsWith('--only='));
  const dirArg = args.find((a) => a.startsWith('--fixtures='));

  try {
    cli.previewCommand({
      fixturesDir: dirArg ? dirArg.split('=')[1] : 'tests/fixtures',
      ...(number !== undefined ? { number } : {}),
      ...(onlyArg ? { only: onlyArg.split('=')[1] } : {}),
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
} else if (args[0] === 'run') {
  cli.runCommand().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.log(
    'Usage: pr-reviewer recommend | scan <owner>/<repo> | preview [number] [--only=STATUS] [--fixtures=DIR] | run',
  );
  process.exit(1);
}
