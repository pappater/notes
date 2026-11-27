import type { ArchiveSyncMeta, BlogPost, EssayHeading, EssayShelf } from '../types/blog.ts';

interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
}

interface GitTreeEntry {
  path: string;
  type: string;
  sha: string;
}

const POSTS_PATH = '_posts';
const LOCAL_CACHE_KEY = 'pappater_blog_remote_posts_v1';

// Eagerly bundle all markdown files inside /_posts/** at build time (100% static, works offline)
const BUNDLED_MARKDOWN_MODULES = import.meta.glob('/_posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function detectGitHubRepo(): GitHubRepoConfig {
  const envOwner = import.meta.env.VITE_GITHUB_OWNER as string | undefined;
  const envRepo = import.meta.env.VITE_GITHUB_REPO as string | undefined;
  const envBranch = (import.meta.env.VITE_GITHUB_BRANCH as string | undefined) || 'main';

  if (envOwner && envRepo) {
    return { owner: envOwner, repo: envRepo, branch: envBranch };
  }

  // Auto-detect when hosted on GitHub Pages: https://<owner>.github.io/<repo>/
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.github.io')) {
      const owner = host.replace(/\.github\.io$/, '');
      const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
      const repo = firstSegment || `${owner}.github.io`;
      return { owner, repo, branch: envBranch };
    }
  }

  return { owner: 'pappater', repo: 'blog', branch: envBranch };
}

function encodeRepoPath(repoPath: string): string {
  return repoPath.split('/').map(encodeURIComponent).join('/');
}

function slugifyId(repoPath: string): string {
  return repoPath
    .replace(/^\/+/, '')
    .replace(new RegExp(`^${POSTS_PATH}/`), '')
    .replace(/(\.md)+$/i, '')
    .replace(/\//g, '--');
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'
  );
}

function extractDateFromFilename(filename: string): string | null {
  const leadingMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  if (leadingMatch) return leadingMatch[1];
  const anywhereMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return anywhereMatch ? anywhereMatch[1] : null;
}

function formatHumanTitleFromFilename(filename: string): string {
  let clean = filename.replace(/(\.md)+$/i, '');
  clean = clean.replace(/^\d{4}-\d{2}-\d{2}-?/, '');
  clean = clean.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  if (!clean) return filename;

  const words = clean.split(/[-_]+/).filter(Boolean);
  const smallWords = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with',
  ]);

  return words
    .map((word, idx) => {
      if (/[^\x00-\x7F]/.test(word)) return word;
      if (word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word;
      const lower = word.toLowerCase();
      if (idx > 0 && idx < words.length - 1 && smallWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function parseCategoriesValue(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  return trimmed
    .split(/\s+/)
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseFrontmatter(rawText: string): {
  hasFrontmatter: boolean;
  data: Record<string, string>;
  body: string;
} {
  const normalized = rawText.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { hasFrontmatter: false, data: {}, body: normalized };
  }

  const data: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey: string | null = null;

  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (kv) {
      currentKey = kv[1].toLowerCase();
      let val = kv[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      data[currentKey] = val;
    } else if (currentKey && /^\s+-\s+/.test(line)) {
      const item = line.replace(/^\s+-\s+/, '').trim().replace(/^['"]|['"]$/g, '');
      data[currentKey] = data[currentKey] ? `${data[currentKey]} ${item}` : item;
    }
  }

  return { hasFrontmatter: true, data, body: match[2] };
}

function cleanJekyllMarkdown(body: string, repoConfig: GitHubRepoConfig): string {
  const rawBase = `https://raw.githubusercontent.com/${repoConfig.owner}/${repoConfig.repo}/${repoConfig.branch}`;
  let cleaned = body;

  cleaned = cleaned.replace(/\{\{\s*site\.baseurl\s*\}\}/g, rawBase);
  cleaned = cleaned.replace(
    /\{\{\s*['"]([^'"]+)['"]\s*\|\s*relative_url\s*\}\}/g,
    `${rawBase}$1`
  );
  cleaned = cleaned.replace(/\{%\s*highlight\s+([a-zA-Z0-9_-]+)(?:\s+[^%]*)?%\}/g, '```$1');
  cleaned = cleaned.replace(/\{%\s*endhighlight\s*%\}/g, '```');
  cleaned = cleaned.replace(/\{%\s*(?:raw|endraw)\s*%\}/g, '');
  cleaned = cleaned.replace(/!\[([^\]]*)\]\((\/assets\/[^)]+)\)/g, `![$1](${rawBase}$2)`);

  return cleaned.trim();
}

function detectLanguage(text: string): 'en' | 'ta' | 'mixed' {
  const tamilMatches = text.match(/[\u0B80-\u0BFF]/g) || [];
  const latinMatches = text.match(/[A-Za-z]/g) || [];
  if (tamilMatches.length === 0) return 'en';
  if (tamilMatches.length > latinMatches.length * 0.4) return 'ta';
  return 'mixed';
}

function classifyShelf(
  title: string,
  body: string,
  rawCategories: string[],
  language: 'en' | 'ta' | 'mixed'
): EssayShelf {
  const lowerCats = rawCategories.map((c) => c.toLowerCase());
  const hay = `${title} ${lowerCats.join(' ')} ${body.slice(0, 1200)}`.toLowerCase();

  if (language === 'ta' || lowerCats.includes('tamil')) {
    return 'Tamil';
  }

  const techKeywords = [
    'git', 'github', 'markdown', 'html', 'homebrew', 'sorting', 'multifactor',
    'auth', 'webscrap', 'scrape', 'genai', 'alexa', 'audit', 'deps', 'chunk',
    'code', 'mardown', 'random location app', 'pappater.github.io', 'round off',
  ];
  if (techKeywords.some((kw) => hay.includes(kw))) {
    return 'Code & Craft';
  }

  const travelKeywords = [
    'hills', 'jawadhu', 'jawadu', 'pulicat', 'pazhavanthangal', 'bangalore',
    'bike trip', 'panruti', 'charminar', 'muharram', 'thandarai', 'ecr',
    'bus stand', 'waterfall', 'temple', 'madurai',
  ];
  if (travelKeywords.some((kw) => hay.includes(kw))) {
    return 'Travel & Places';
  }

  return 'Life & Reflections';
}

function extractHeadings(markdown: string): EssayHeading[] {
  const headings: EssayHeading[] = [];
  const seen = new Map<string, number>();
  let inCodeFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^```/.test(line.trim())) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/[*_`[\]]/g, '').trim();
      if (!text) continue;
      const baseId = slugifyHeading(text);
      const count = seen.get(baseId) || 0;
      seen.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count}`;
      headings.push({ id, text, level });
    }
  }
  return headings;
}

function buildExcerpt(markdown: string, title: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/^[>\-*+]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let summary = plain;
  if (summary.toLowerCase().startsWith(title.toLowerCase())) {
    summary = summary.slice(title.length).replace(/^[:.\-\s]+/, '').trim();
  }

  if (summary.length <= 190) return summary;
  const sliced = summary.slice(0, 187);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced).trim()}...`;
}

function parseDateSafe(
  rawDate: string | undefined,
  filename: string
): { iso: string; display: string; year: number; month: number } {
  const fallbackDate = extractDateFromFilename(filename) || '2025-01-01';
  const candidate = rawDate?.trim() || fallbackDate;

  const ymd = candidate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime()) && ymd) {
    parsed = new Date(`${ymd[1]}-${ymd[2]}-${ymd[3]}T12:00:00Z`);
  }
  if (Number.isNaN(parsed.getTime())) {
    parsed = new Date(`${fallbackDate}T12:00:00Z`);
  }

  const iso = ymd ? `${ymd[1]}-${ymd[2]}-${ymd[3]}` : parsed.toISOString().slice(0, 10);
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + 1;
  const display = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);

  return { iso, display, year, month };
}

export function parseMarkdownPost(
  repoPath: string,
  sha: string,
  rawMarkdown: string,
  repoConfig: GitHubRepoConfig
): BlogPost {
  const normalizedPath = repoPath.replace(/^\/+/, '');
  const filename = normalizedPath.split('/').pop() || normalizedPath;
  const { hasFrontmatter, data, body } = parseFrontmatter(rawMarkdown);
  const cleanedBody = cleanJekyllMarkdown(body, repoConfig);

  let title = data.title?.trim() || '';
  if (!title) {
    const firstH1 = cleanedBody.match(/^#\s+(.+)$/m);
    if (firstH1) {
      title = firstH1[1].replace(/[*_`]/g, '').trim();
    }
  }
  if (!title) {
    title = formatHumanTitleFromFilename(filename);
  }

  const { iso, display, year, month } = parseDateSafe(data.date, filename);

  const rawCategories = [
    ...parseCategoriesValue(data.categories || ''),
    ...parseCategoriesValue(data.category || ''),
    ...parseCategoriesValue(data.tags || ''),
  ].filter((c) => !['jekyll', 'update'].includes(c.toLowerCase()));

  const language = detectLanguage(`${title} ${cleanedBody}`);
  const shelf = classifyShelf(title, cleanedBody, rawCategories, language);

  const plainForCount = cleanedBody
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()-]/g, ' ')
    .trim();
  const wordCount = plainForCount ? plainForCount.split(/\s+/).filter(Boolean).length : 0;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 210));

  const headings = extractHeadings(cleanedBody);
  const excerpt = buildExcerpt(cleanedBody, title);
  const encodedPath = encodeRepoPath(normalizedPath);

  return {
    id: slugifyId(normalizedPath),
    filename,
    path: normalizedPath,
    sha,
    title,
    date: iso,
    displayDate: display,
    year,
    month,
    rawCategories: Array.from(new Set(rawCategories)),
    shelf,
    language,
    excerpt,
    content: cleanedBody,
    wordCount,
    readingTimeMinutes,
    headings,
    hasFrontmatter,
    githubUrl: `https://github.com/${repoConfig.owner}/${repoConfig.repo}/blob/${repoConfig.branch}/${encodedPath}`,
    rawUrl: `https://raw.githubusercontent.com/${repoConfig.owner}/${repoConfig.repo}/${repoConfig.branch}/${encodedPath}`,
  };
}

function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.filename.localeCompare(a.filename);
  });
}

function loadCachedRemotePosts(): Record<string, { sha: string; raw: string }> {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, { sha: string; raw: string }>;
  } catch {
    return {};
  }
}

function saveCachedRemotePosts(cache: Record<string, { sha: string; raw: string }>): void {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota errors
  }
}

export function getStaticBundledPosts(): { posts: BlogPost[]; meta: ArchiveSyncMeta } {
  const repoConfig = detectGitHubRepo();
  const bundledMap = new Map<string, BlogPost>();

  for (const [modulePath, rawContent] of Object.entries(BUNDLED_MARKDOWN_MODULES)) {
    const normalizedPath = modulePath.replace(/^\/+/, '');
    const post = parseMarkdownPost(normalizedPath, `bundled:${normalizedPath}`, rawContent, repoConfig);
    bundledMap.set(normalizedPath, post);
  }

  // Merge any cached remote posts discovered via browser GitHub sync
  const remoteCache = loadCachedRemotePosts();
  for (const [remotePath, entry] of Object.entries(remoteCache)) {
    const post = parseMarkdownPost(remotePath, entry.sha, entry.raw, repoConfig);
    bundledMap.set(remotePath, post);
  }

  const posts = sortPosts(Array.from(bundledMap.values()));

  return {
    posts,
    meta: {
      owner: repoConfig.owner,
      repo: repoConfig.repo,
      branch: repoConfig.branch,
      postsPath: POSTS_PATH,
      repoUrl: `https://github.com/${repoConfig.owner}/${repoConfig.repo}`,
      postsTreeUrl: `https://github.com/${repoConfig.owner}/${repoConfig.repo}/tree/${repoConfig.branch}/${POSTS_PATH}`,
      totalCount: posts.length,
      syncedAt: new Date().toISOString(),
      cacheHit: true,
      staleFallback: false,
      newOrUpdatedCount: 0,
    },
  };
}

export async function syncPostsFromGitHub(): Promise<{ posts: BlogPost[]; meta: ArchiveSyncMeta }> {
  const repoConfig = detectGitHubRepo();
  const bundledByPath = new Map<string, string>();

  for (const [modulePath, rawContent] of Object.entries(BUNDLED_MARKDOWN_MODULES)) {
    bundledByPath.set(modulePath.replace(/^\/+/, ''), rawContent);
  }

  const treeUrl = `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/git/trees/${repoConfig.branch}?recursive=1`;
  const treeRes = await fetch(treeUrl, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (!treeRes.ok) {
    throw new Error(`GitHub sync returned HTTP ${treeRes.status}`);
  }

  const treeJson = (await treeRes.json()) as { tree?: GitTreeEntry[] };
  const entries = (treeJson.tree || []).filter(
    (item) =>
      item.type === 'blob' &&
      item.path.startsWith(`${POSTS_PATH}/`) &&
      item.path.toLowerCase().endsWith('.md')
  );

  const remoteCache = loadCachedRemotePosts();
  let newOrUpdatedCount = 0;

  // Only fetch files that are NOT already cached with the exact same SHA
  const toFetch = entries.filter((entry) => remoteCache[entry.path]?.sha !== entry.sha);

  const batchSize = 10;
  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (entry) => {
        const url = `https://raw.githubusercontent.com/${repoConfig.owner}/${repoConfig.repo}/${repoConfig.branch}/${encodeRepoPath(entry.path)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const raw = await res.text();
        const bundledRaw = bundledByPath.get(entry.path);
        if (bundledRaw !== raw) {
          newOrUpdatedCount++;
        }
        remoteCache[entry.path] = { sha: entry.sha, raw };
      })
    );
  }

  // Remove any stale remote cache entries that were deleted from the repo
  const livePaths = new Set(entries.map((e) => e.path));
  for (const cachedPath of Object.keys(remoteCache)) {
    if (!livePaths.has(cachedPath)) {
      delete remoteCache[cachedPath];
    }
  }
  saveCachedRemotePosts(remoteCache);

  const finalMap = new Map<string, BlogPost>();
  for (const entry of entries) {
    const raw = remoteCache[entry.path]?.raw ?? bundledByPath.get(entry.path);
    if (raw !== undefined) {
      finalMap.set(entry.path, parseMarkdownPost(entry.path, entry.sha, raw, repoConfig));
    }
  }

  const posts = sortPosts(Array.from(finalMap.values()));

  return {
    posts,
    meta: {
      owner: repoConfig.owner,
      repo: repoConfig.repo,
      branch: repoConfig.branch,
      postsPath: POSTS_PATH,
      repoUrl: `https://github.com/${repoConfig.owner}/${repoConfig.repo}`,
      postsTreeUrl: `https://github.com/${repoConfig.owner}/${repoConfig.repo}/tree/${repoConfig.branch}/${POSTS_PATH}`,
      totalCount: posts.length,
      syncedAt: new Date().toISOString(),
      cacheHit: toFetch.length === 0,
      staleFallback: false,
      newOrUpdatedCount,
    },
  };
}
