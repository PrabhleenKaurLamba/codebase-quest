import type { Repository, SourceFile } from './types';

const ignored = /(^|\/)(node_modules|dist|build|vendor|\.git|coverage|\.next|\.agents|\.github|docs|examples|__snapshots__)(\/|$)/;
const sourceFile = /\.(tsx?|jsx?|py|go|rb|rs|java|kt|cs|php|vue|svelte)$/i;
const usefulConfig = /(^|\/)(package\.json|pyproject\.toml|go\.mod|cargo\.toml|gemfile|composer\.json)$/i;
const entryPriority = (path: string) => {
  if (/(^|\/)(src\/)?(main|server)\.(tsx?|jsx?|py|go|rb|rs|java|kt|cs|php)$/i.test(path)) return 0;
  if (/(^|\/)(app\/(layout|page)|pages\/_app|pages\/index)\.(tsx?|jsx?)$/i.test(path)) return 0;
  if (/(^|\/)(index)\.(tsx?|jsx?|py|go|rb|rs|java|kt|cs|php)$/i.test(path) && !/(^|\/)(components|ui|tests?|__tests__|stories)(\/|$)/i.test(path)) return 1;
  if (usefulConfig.test(path)) return 2;
  return 3;
};
export function parseGithubUrl(value: string) {
  const match = value.trim().match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?\/?(?:#.*)?$/i);
  if (!match) throw new Error('Enter a public GitHub URL such as github.com/owner/repository.');
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}
export async function fetchRepository(url: string): Promise<{ name: string; repository: Repository; tree: string[]; files: SourceFile[] }> {
  const { owner, repo } = parseGithubUrl(url); const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Codebase-Quest' };
  const repoInfo = await fetch(base, { headers }); if (!repoInfo.ok) throw new Error(repoInfo.status === 404 ? 'Repository not found or not public.' : 'GitHub could not load this repository.');
  const info = await repoInfo.json(); const branch = info.default_branch;
  const treeRes = await fetch(`${base}/git/trees/${branch}?recursive=1`, { headers }); if (!treeRes.ok) throw new Error('Could not retrieve the repository file tree.');
  const tree = await treeRes.json();
  const visibleFiles = tree.tree.filter((x: { type: string; path: string }) => x.type === 'blob' && !ignored.test(x.path));
  const candidates = visibleFiles.filter((x: { path: string; size?: number }) => (x.size || 0) < 90000 && (sourceFile.test(x.path) || usefulConfig.test(x.path)));
  if (!candidates.length) throw new Error('This repository has no supported source files to explore.');
  candidates.sort((a: {path:string}, b: {path:string}) => entryPriority(a.path) - entryPriority(b.path) || a.path.localeCompare(b.path));
  const selected = candidates.slice(0, 24);
  const files = (await Promise.all(selected.map(async (item: { path: string }) => {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`); return res.ok ? { path: item.path, content: (await res.text()).slice(0, 18000) } : null;
  }))).filter(Boolean) as SourceFile[];
  return { name: `${owner}/${repo}`, repository: { owner, repo, branch }, tree: visibleFiles.map((x: { path: string }) => x.path).sort(), files };
}

export async function fetchFile(repository: Repository, path: string): Promise<SourceFile> {
  if (!/^[\w.-]+$/.test(repository.owner) || !/^[\w.-]+$/.test(repository.repo) || !/^[\w./-]+$/.test(path) || path.includes('..')) throw new Error('Invalid file request.');
  const url = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${repository.branch}/${path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load this file from GitHub.');
  return { path, content: (await response.text()).slice(0, 30000) };
}
