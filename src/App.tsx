import { Moon, RefreshCw, Search, Sun, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EssayCurtain } from './components/EssayCurtain.tsx';
import { ListView } from './components/ListView.tsx';
import { WheelView } from './components/WheelView.tsx';
import { getStaticBundledPosts, syncPostsFromGitHub } from './lib/markdownPosts.ts';
import type { BlogPost, EssayShelf } from './types/blog.ts';

type GalleryMode = 'wheel' | 'list';

const SHELF_FILTERS: { id: EssayShelf | 'All'; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Life & Reflections', label: 'Life' },
  { id: 'Travel & Places', label: 'Travel' },
  { id: 'Code & Craft', label: 'Code' },
  { id: 'Tamil', label: 'Tamil' },
];

function readPostIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('post');
}

export default function App() {
  const initialData = useMemo(() => getStaticBundledPosts(), []);
  const [posts, setPosts] = useState<BlogPost[]>(initialData.posts);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<GalleryMode>('wheel');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedShelf, setSelectedShelf] = useState<EssayShelf | 'All'>('All');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openPostId, setOpenPostId] = useState<string | null>(() => readPostIdFromUrl());

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('blog_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('blog_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDark]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (selectedShelf !== 'All' && post.shelf !== selectedShelf) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.filename.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q)
      );
    });
  }, [posts, selectedShelf, searchQuery]);

  // Keep activeIndex in bounds when filtering changes
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedShelf, searchQuery]);

  useEffect(() => {
    const onPopState = () => {
      setOpenPostId(readPostIdFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === 'Escape') {
          setSearchOpen(false);
          setSearchQuery('');
        }
        return;
      }
      if (e.key === '/' && !openPostId) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 20);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPostId]);

  const handleOpenPost = useCallback(
    (post: BlogPost) => {
      const idx = filteredPosts.findIndex((p) => p.id === post.id);
      if (idx >= 0) setActiveIndex(idx);
      setOpenPostId(post.id);
      const url = new URL(window.location.href);
      url.searchParams.set('post', post.id);
      window.history.pushState({ postId: post.id }, '', url.toString());
    },
    [filteredPosts]
  );

  const handleClosePost = useCallback(() => {
    setOpenPostId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('post');
    window.history.pushState({}, '', url.toString());
  }, []);

  const handleSyncGitHub = useCallback(async () => {
    setIsSyncing(true);
    try {
      const synced = await syncPostsFromGitHub();
      setPosts(synced.posts);
      if (synced.meta.newOrUpdatedCount > 0) {
        setSyncNotice(`${synced.meta.newOrUpdatedCount} new synced`);
      } else {
        setSyncNotice(`${synced.meta.totalCount} up to date`);
      }
      setTimeout(() => setSyncNotice(null), 3000);
    } catch {
      setSyncNotice('Sync unavailable');
      setTimeout(() => setSyncNotice(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const openedPost = useMemo(() => {
    if (!openPostId) return null;
    return posts.find((p) => p.id === openPostId) || null;
  }, [posts, openPostId]);

  return (
    <div className="min-h-dvh w-full bg-[#FBF9F5] dark:bg-[#0E0D0C] text-stone-950 dark:text-stone-50">
      {/* Floating Minimalist Mode Switcher — Top Left (no header bar) */}
      <div className="fixed top-6 left-5 sm:left-10 lg:left-12 z-30 flex items-baseline gap-1.5 text-sm sm:text-base font-medium">
        <button
          type="button"
          onClick={() => setMode('wheel')}
          className={`transition-opacity cursor-pointer whitespace-nowrap shrink-0 underline-offset-4 ${
            mode === 'wheel'
              ? 'opacity-100 underline decoration-stone-900 dark:decoration-stone-100'
              : 'opacity-40 hover:opacity-80'
          }`}
        >
          Wheel,
        </button>
        <button
          type="button"
          onClick={() => setMode('list')}
          className={`transition-opacity cursor-pointer whitespace-nowrap shrink-0 underline-offset-4 ${
            mode === 'list'
              ? 'opacity-100 underline decoration-stone-900 dark:decoration-stone-100'
              : 'opacity-40 hover:opacity-80'
          }`}
        >
          List
        </button>
      </div>

      {/* Floating Minimalist Inline Controls — Top Right (no header bar) */}
      <div className="fixed top-6 right-5 sm:right-10 lg:right-12 z-30 flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
        {/* Inline Shelf Filters */}
        <div className="hidden md:flex items-center gap-3" role="tablist" aria-label="Filter essays by shelf">
          {SHELF_FILTERS.map((shelf) => {
            const active = selectedShelf === shelf.id;
            return (
              <button
                key={shelf.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedShelf(shelf.id)}
                className={`transition-opacity cursor-pointer whitespace-nowrap shrink-0 underline-offset-4 ${
                  active
                    ? 'opacity-100 font-medium text-[#9A3412] dark:text-orange-400 underline'
                    : 'opacity-45 hover:opacity-90'
                }`}
              >
                {shelf.label}
              </button>
            );
          })}
        </div>

        {/* Inline Expandable Search */}
        {searchOpen ? (
          <div className="flex items-center gap-1.5 border-b border-stone-400 dark:border-stone-600 pb-0.5">
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter..."
              aria-label="Search essays"
              className="w-28 sm:w-40 bg-transparent text-xs sm:text-sm focus:outline-none placeholder:text-stone-400"
            />
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
              aria-label="Close search"
              className="opacity-60 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 20);
            }}
            aria-label="Search essays"
            className="opacity-55 hover:opacity-100 transition-opacity cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
        )}

        {/* GitHub Sync */}
        <button
          type="button"
          onClick={handleSyncGitHub}
          disabled={isSyncing}
          className="opacity-55 hover:opacity-100 transition-opacity cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0 disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{syncNotice || 'Sync'}</span>
        </button>

        {/* Paper / Ink Theme */}
        <button
          type="button"
          onClick={() => setIsDark((d) => !d)}
          aria-label={isDark ? 'Switch to Paper mode' : 'Switch to Ink mode'}
          className="opacity-55 hover:opacity-100 transition-opacity cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-orange-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Gallery Canvas (Wheel or List) */}
      <main>
        {mode === 'wheel' ? (
          <WheelView
            posts={filteredPosts}
            activeIndex={activeIndex}
            onChangeIndex={setActiveIndex}
            onOpenPost={handleOpenPost}
          />
        ) : (
          <ListView
            posts={filteredPosts}
            activeIndex={activeIndex}
            onHoverIndex={setActiveIndex}
            onOpenPost={handleOpenPost}
          />
        )}
      </main>

      {/* Slide-Up Editorial Reading Curtain */}
      {openedPost && (
        <EssayCurtain
          post={openedPost}
          allPosts={filteredPosts.length > 0 ? filteredPosts : posts}
          onClose={handleClosePost}
          onSelectPost={handleOpenPost}
        />
      )}
    </div>
  );
}
