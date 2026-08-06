import { Octokit } from 'octokit';
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const query = `
  query($owner: String!, $repo: String!, $pullNumber: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pullNumber) {
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
  .graphql(query, { owner: 'wagmiiii', repo: 'pr-reviewer', pullNumber: 1 })
  .then((res) => console.log(JSON.stringify(res)))
  .catch((e) => console.error(e.message));
