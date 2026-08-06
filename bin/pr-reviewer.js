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
} else {
  console.log('Usage: pr-reviewer recommend');
  process.exit(1);
}
