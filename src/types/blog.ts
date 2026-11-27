export type EssayShelf =
  | 'Life & Reflections'
  | 'Travel & Places'
  | 'Code & Craft'
  | 'Tamil';

export interface EssayHeading {
  id: string;
  text: string;
  level: number;
}

export interface BlogPost {
  id: string;
  filename: string;
  path: string;
  sha: string;
  title: string;
  date: string;
  displayDate: string;
  year: number;
  month: number;
  rawCategories: string[];
  shelf: EssayShelf;
  language: 'en' | 'ta' | 'mixed';
  excerpt: string;
  content: string;
  wordCount: number;
  readingTimeMinutes: number;
  headings: EssayHeading[];
  hasFrontmatter: boolean;
  githubUrl: string;
  rawUrl: string;
}

export interface ArchiveSyncMeta {
  owner: string;
  repo: string;
  branch: string;
  postsPath: string;
  repoUrl: string;
  postsTreeUrl: string;
  totalCount: number;
  syncedAt: string;
  cacheHit: boolean;
  staleFallback: boolean;
  newOrUpdatedCount: number;
  rateLimitRemaining?: number | null;
}

export interface PostsApiResponse {
  posts: BlogPost[];
  meta: ArchiveSyncMeta;
}
