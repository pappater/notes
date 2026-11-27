import { ArrowUpRight, Moon, RefreshCw, Search, Shuffle, Sun, X } from 'lucide-react';
import { useMemo, useRef } from 'react';
import type { ArchiveSyncMeta, BlogPost, EssayShelf } from '../types/blog.ts';

interface IndexRailProps {
  posts: BlogPost[];
  meta: ArchiveSyncMeta | null;
  selectedPostId: string | null;
  onSelectPost: (post: BlogPost) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedShelf: EssayShelf | 'All';
  onSelectShelf: (shelf: EssayShelf | 'All') => void;
  onSyncGitHub: () => void;
  isSyncing: boolean;
  syncNotice: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onRandomPost: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const SHELF_TABS: { id: EssayShelf | 'All'; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Life & Reflections', label: 'Life' },
  { id: 'Travel & Places', label: 'Travel' },
  { id: 'Code & Craft', label: 'Code' },
  { id: 'Tamil', label: 'Tamil' },
];

export function IndexRail({
  posts,
  meta,
  selectedPostId,
  onSelectPost,
  searchQuery,
  onSearchChange,
  selectedShelf,
  onSelectShelf,
  onSyncGitHub,
  isSyncing,
  syncNotice,
  isDark,
  onToggleTheme,
  onRandomPost,
  searchInputRef,
}: IndexRailProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || localRef;

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (selectedShelf !== 'All' && post.shelf !== selectedShelf) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.filename.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.rawCategories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [posts, searchQuery, selectedShelf]);

  const groupedByYear = useMemo(() => {
    const groups = new Map<number, BlogPost[]>();
    for (const post of filteredPosts) {
      const arr = groups.get(post.year) || [];
      arr.push(post);
      groups.set(post.year, arr);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [filteredPosts]);

  return (
    <aside
      aria-label="Essay index"
      className="h-full flex flex-col bg-[#F3EFE7] dark:bg-[#191613] border-r border-stone-200/90 dark:border-stone-800/90"
    >
      {/* Title & Search Block */}
      <div className="px-6 pt-7 pb-5 border-b border-stone-200/90 dark:border-stone-800/90 space-y-5 shrink-0">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
              /blog
            </h1>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Archive of a clueless man · {posts.length} essays
            </p>
          </div>

          <button
            type="button"
            onClick={onRandomPost}
            title="Open a random essay"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:text-[#9A3412] dark:hover:text-orange-400 bg-white/70 dark:bg-[#231F1B] border border-stone-200/80 dark:border-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Random</span>
          </button>
        </div>

        {/* Underline Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search essays or filenames... ( / )"
            aria-label="Search essays"
            className="w-full pl-6 pr-6 py-1.5 text-sm bg-transparent text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 border-b border-stone-300 dark:border-stone-700 focus:border-[#9A3412] dark:focus:border-orange-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Minimalist Shelf Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Essay shelves">
          {SHELF_TABS.map((tab) => {
            const active = selectedShelf === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectShelf(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Chronological Index */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {groupedByYear.length === 0 ? (
          <div className="px-3 py-12 text-center space-y-2">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              No matching essays
            </p>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onSelectShelf('All');
              }}
              className="text-xs text-[#9A3412] dark:text-orange-400 hover:underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        ) : (
          groupedByYear.map(([year, items]) => (
            <div key={year}>
              <div className="px-2 pb-1.5 flex items-baseline justify-between text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                <span className="font-mono-code font-medium tracking-wider">{year}</span>
                <span>{items.length}</span>
              </div>

              <div className="space-y-0.5">
                {items.map((post) => {
                  const isActive = post.id === selectedPostId;
                  const shortMonthDay = post.date.slice(5); // MM-DD
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => onSelectPost(post)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${
                        isActive
                          ? 'bg-white dark:bg-[#24201C] shadow-xs'
                          : 'hover:bg-white/60 dark:hover:bg-[#221E1A]'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={`font-display text-[15px] leading-snug transition-colors line-clamp-1 ${
                            isActive
                              ? 'font-semibold text-[#9A3412] dark:text-orange-400'
                              : 'font-medium text-stone-900 dark:text-stone-100 group-hover:text-stone-950 dark:group-hover:text-white'
                          }`}
                        >
                          {post.title}
                        </span>
                        <span className="text-[11px] font-mono-code text-stone-400 dark:text-stone-500 tabular-nums shrink-0">
                          {shortMonthDay}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 tabular-nums truncate">
                        {post.shelf} · {post.readingTimeMinutes} min
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quiet Rail Controls (Sync / Theme / Repo Link) */}
      <div className="px-5 py-3.5 border-t border-stone-200/90 dark:border-stone-800/90 shrink-0 space-y-2">
        {syncNotice && (
          <p role="status" className="text-[11px] text-[#9A3412] dark:text-orange-400 truncate">
            {syncNotice}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSyncGitHub}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium text-stone-800 dark:text-stone-200 hover:text-[#9A3412] dark:hover:text-orange-400 bg-white/80 dark:bg-[#231F1B] border border-stone-200/80 dark:border-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing' : 'Sync _posts'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Paper theme' : 'Switch to Ink theme'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white bg-white/80 dark:bg-[#231F1B] border border-stone-200/80 dark:border-stone-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isDark ? <Sun className="w-3 h-3 text-orange-400" /> : <Moon className="w-3 h-3" />}
              <span>{isDark ? 'Paper' : 'Ink'}</span>
            </button>
          </div>

          <a
            href={meta?.postsTreeUrl || 'https://github.com/pappater/blog/tree/main/_posts'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors whitespace-nowrap shrink-0"
          >
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </aside>
  );
}
