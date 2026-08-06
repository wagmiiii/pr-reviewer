import { Octokit } from 'octokit';
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const query = `
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        closingIssuesReferences(first: 10) {
          nodes {
            number
            repository { nameWithOwner }
          }
        }
      }
    }
  }
`;
octokit
  .graphql(query, { owner: 'wagmiiii', repo: 'pr-reviewer', pr: 16 })
  .then((res) => console.log(JSON.stringify(res, null, 2)))
  .catch((e) => console.error(e.message));
