import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';

const CustomOctokit = Octokit.plugin(retry, throttling);

export function createGitHubClient(token: string) {
  return new CustomOctokit({
    auth: token,
    throttle: {
      onRateLimit: (
        retryAfter: number,
        options: any,
        octokit: any,
        retryCount: number,
      ) => {
        octokit.log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`,
        );
        if (retryCount < 3) {
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter: number, options: any, octokit: any) => {
        octokit.log.warn(
          `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
        );
      },
    },
  });
}
