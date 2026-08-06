import type { LinkedIssue } from '../types.js';

export function parseLinkedIssues(
  title: string,
  body: string | null | undefined,
): LinkedIssue[] {
  const issues: LinkedIssue[] = [];
  const seen = new Set<string>();

  const add = (num: number, rep: string | undefined, source: LinkedIssue['source']) => {
    const key = `${rep || ''}#${num}`;
    if (!seen.has(key)) {
      seen.add(key);
      issues.push({
        number: num,
        ...(rep ? { repository: rep } : {}),
        source,
      });
    }
  };

  const shortRe = /(?:([a-zA-Z0-9.-]+)\/([a-zA-Z0-9.-]+))?#(\d+)/g;
  const urlRe =
    /https:\/\/github\.com\/([a-zA-Z0-9.-]+)\/([a-zA-Z0-9.-]+)\/(?:issues|pull)\/(\d+)/g;

  // 1. Title references
  for (const m of title.matchAll(shortRe)) {
    const rep = m[1] && m[2] ? `${m[1]}/${m[2]}` : undefined;
    add(parseInt(m[3]!, 10), rep, 'title_reference');
  }
  for (const m of title.matchAll(urlRe)) {
    const rep = `${m[1]}/${m[2]}`;
    add(parseInt(m[3]!, 10), rep, 'title_reference');
  }

  if (!body) {
    return issues;
  }

  // 2. Closing keywords in body
  const closingRegex =
    /\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:([a-zA-Z0-9.-]+)\/([a-zA-Z0-9.-]+))?#(\d+)\b/gi;
  for (const m of body.matchAll(closingRegex)) {
    const rep = m[2] && m[3] ? `${m[2]}/${m[3]}` : undefined;
    add(parseInt(m[4]!, 10), rep, 'closing_keyword');
  }

  const closingUrlRegex =
    /\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+https:\/\/github\.com\/([a-zA-Z0-9.-]+)\/([a-zA-Z0-9.-]+)\/(?:issues|pull)\/(\d+)\b/gi;
  for (const m of body.matchAll(closingUrlRegex)) {
    const rep = `${m[2]}/${m[3]}`;
    add(parseInt(m[4]!, 10), rep, 'closing_keyword');
  }

  // 3. Body references (remaining)
  for (const m of body.matchAll(shortRe)) {
    const rep = m[1] && m[2] ? `${m[1]}/${m[2]}` : undefined;
    add(parseInt(m[3]!, 10), rep, 'body_reference');
  }
  for (const m of body.matchAll(urlRe)) {
    const rep = `${m[1]}/${m[2]}`;
    add(parseInt(m[3]!, 10), rep, 'body_reference');
  }

  return issues;
}
