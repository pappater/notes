import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IndexRail } from './components/IndexRail.tsx';
import { ReadingCanvas } from './components/ReadingCanvas.tsx';
import { getStaticBundledPosts, syncPostsFromGitHub } from './lib/markdownPosts.ts';
import type { ArchiveSyncMeta, BlogPost, EssayShelf } from './types/blog.ts';

function readPostIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('post');
}

export default function App() {
  const initialData = useMemo(() => getStaticBundledPosts(), []);
  const [posts, setPosts] = useState<BlogPost[]>(initialData.posts);
  const [meta, setMeta] = useState<ArchiveSyncMeta>(initialData.meta);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    const fromUrl = readPostIdFromUrl();
    if (fromUrl && initialData.posts.some((p) => p.id === fromUrl)) {
      return fromUrl;
    }
    return initialData.posts[0]?.id || null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShelf, setSelectedShelf] = useState<EssayShelf | 'All'>('All');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);

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
      // Ignore storage failures
    }
  }, [isDark]);

  const handleSyncGitHub = useCallback(async (showNotice = true) => {
    setIsSyncing(true);
    try {
      const synced = await syncPostsFromGitHub();
      setPosts(synced.posts);
      setMeta(synced.meta);
      setSelectedPostId((current) => {
        if (current && synced.posts.some((p) => p.id === current)) return current;
        return synced.posts[0]?.id || null;
      });
      if (showNotice) {
        if (synced.meta.newOrUpdatedCount > 0) {
          setSyncNotice(
            `Synced ${synced.meta.totalCount} (${synced.meta.newOrUpdatedCount} new from GitHub)`
          );
        } else {
          setSyncNotice(`Up to date · ${synced.meta.totalCount} posts`);
        }
        setTimeout(() => setSyncNotice(null), 3500);
      }
    } catch (err) {
      if (showNotice) {
        const msg = err instanceof Error ? err.message : 'GitHub sync unavailable';
        setSyncNotice(msg);
        setTimeout(() => setSyncNotice(null), 3500);
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Browser back/forward support for ?post=<id>
  useEffect(() => {
    const onPopState = () => {
      const id = readPostIdFromUrl();
      if (id) setSelectedPostId(id);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectPost = useCallback((post: BlogPost) => {
    setSelectedPostId(post.id);
    setMobileIndexOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('post', post.id);
    window.history.pushState({ postId: post.id }, '', url.toString());
  }, []);

  const activePost = useMemo(() => {
    if (posts.length === 0) return null;
    return posts.find((p) => p.id === selectedPostId) || posts[0];
  }, [posts, selectedPostId]);

  const handleRandomPost = useCallback(() => {
    if (posts.length === 0) return;
    const pool = posts.filter((p) => p.id !== activePost?.id);
    const pick = (pool.length > 0 ? pool : posts)[
      Math.floor(Math.random() * (pool.length > 0 ? pool.length : posts.length))
    ];
    selectPost(pick);
  }, [posts, activePost?.id, selectPost]);

  // Keyboard shortcuts: / focus search, f toggle focus mode, ArrowLeft/Right step essays
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;

      if (e.key === 'Escape' && mobileIndexOpen) {
        setMobileIndexOpen(false);
        return;
      }

      if (inInput) return;

      if (e.key === '/') {
        e.preventDefault();
        setIsFocusMode(false);
        setTimeout(() => searchInputRef.current?.focus(), 20);
      } else if (e.key.toLowerCase() === 'f') {
        setIsFocusMode((v) => !v);
      } else if (e.key === 'ArrowLeft' && activePost) {
        const idx = posts.findIndex((p) => p.id === activePost.id);
        if (idx > 0) selectPost(posts[idx - 1]);
      } else if (e.key === 'ArrowRight' && activePost) {
        const idx = posts.findIndex((p) => p.id === activePost.id);
        if (idx >= 0 && idx < posts.length - 1) selectPost(posts[idx + 1]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePost, posts, selectPost, mobileIndexOpen]);

  return (
    <div className="h-dvh w-full overflow-hidden flex bg-[#FBF9F5] dark:bg-[#141210] text-stone-900 dark:text-stone-100">
      {/* Desktop Split-Pane Left Index Rail */}
      {!isFocusMode && (
        <div className="hidden lg:block w-[350px] xl:w-[390px] h-full shrink-0">
          <IndexRail
            posts={posts}
            meta={meta}
            selectedPostId={activePost?.id || null}
            onSelectPost={selectPost}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedShelf={selectedShelf}
            onSelectShelf={setSelectedShelf}
            onSyncGitHub={() => handleSyncGitHub(true)}
            isSyncing={isSyncing}
            syncNotice={syncNotice}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onRandomPost={handleRandomPost}
            searchInputRef={searchInputRef}
          />
        </div>
      )}

      {/* Mobile Slide-Over Index Drawer */}
      {mobileIndexOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setMobileIndexOpen(false)}
          />
          <div className="relative z-10 w-[86vw] max-w-[360px] h-full shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileIndexOpen(false)}
              aria-label="Close essay index"
              className="absolute top-4 right-4 z-20 p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <IndexRail
              posts={posts}
              meta={meta}
              selectedPostId={activePost?.id || null}
              onSelectPost={selectPost}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedShelf={selectedShelf}
              onSelectShelf={setSelectedShelf}
              onSyncGitHub={() => handleSyncGitHub(true)}
              isSyncing={isSyncing}
              syncNotice={syncNotice}
              isDark={isDark}
              onToggleTheme={() => setIsDark((d) => !d)}
              onRandomPost={handleRandomPost}
            />
          </div>
        </div>
      )}

      {/* Right Full-Height Serene Reading Canvas */}
      <main className="flex-1 h-full min-w-0">
        {activePost ? (
          <ReadingCanvas
            post={activePost}
            allPosts={posts}
            onSelectPost={selectPost}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode((v) => !v)}
            onOpenMobileIndex={() => setMobileIndexOpen(true)}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-3">
              <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
                No Markdown posts found in _posts
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Add any <span className="font-mono-code">.md</span> file to the{' '}
                <span className="font-mono-code">_posts/</span> directory in this repository.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
