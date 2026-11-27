import { ArrowDown, ArrowUp, ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { BlogPost } from '../types/blog.ts';
import { ShelfArtwork } from './ShelfArtwork.tsx';

interface WheelViewProps {
  posts: BlogPost[];
  activeIndex: number;
  onChangeIndex: (nextIndex: number) => void;
  onOpenPost: (post: BlogPost) => void;
}

export function WheelView({
  posts,
  activeIndex,
  onChangeIndex,
  onOpenPost,
}: WheelViewProps) {
  const wheelLockRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  const safeIndex = posts.length > 0 ? Math.max(0, Math.min(activeIndex, posts.length - 1)) : 0;
  const activePost = posts[safeIndex];
  const prevPost = posts.length > 1 ? posts[(safeIndex - 1 + posts.length) % posts.length] : null;
  const nextPost = posts.length > 1 ? posts[(safeIndex + 1) % posts.length] : null;

  const stepBy = (delta: number) => {
    if (posts.length <= 1) return;
    const next = (safeIndex + delta + posts.length) % posts.length;
    onChangeIndex(next);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        stepBy(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        stepBy(-1);
      } else if (e.key === 'Enter' && activePost) {
        onOpenPost(activePost);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLockRef.current < 240) return;
    if (Math.abs(e.deltaY) < 18 && Math.abs(e.deltaX) < 18) return;
    wheelLockRef.current = now;
    const dir = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    stepBy(dir > 0 ? 1 : -1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const diff = touchStartYRef.current - endY;
    touchStartYRef.current = null;
    if (Math.abs(diff) > 36) {
      stepBy(diff > 0 ? 1 : -1);
    }
  };

  if (!activePost) {
    return (
      <div className="h-dvh w-full flex items-center justify-center px-6 text-center">
        <p className="font-display text-2xl text-stone-500 dark:text-stone-400">
          No essays match this filter.
        </p>
      </div>
    );
  }

  const formattedNum = String(safeIndex + 1).padStart(2, '0');
  const nextNum = String(((safeIndex + 1) % posts.length) + 1).padStart(2, '0');

  return (
    <section
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Editorial essay wheel"
      className="relative h-dvh w-full overflow-hidden select-none flex flex-col justify-between px-5 sm:px-10 lg:px-12 pt-20 sm:pt-24 pb-6"
    >
      {/* Top-Middle 12-Column Architectural Title Row (crl-2026 inspired) */}
      <div className="relative z-20 grid grid-cols-12 gap-4 items-start pt-2 sm:pt-4">
        <div className="col-span-2 sm:col-span-2 lg:col-span-2 overflow-hidden">
          <span className="font-mono-code text-2xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950 dark:text-stone-50 tabular-nums">
            {formattedNum}
          </span>
        </div>

        <div className="col-span-8 sm:col-span-8 lg:col-span-7">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-[#9A3412] dark:text-orange-400 font-medium mb-2">
            {activePost.shelf}
          </p>
          <button
            type="button"
            onClick={() => onOpenPost(activePost)}
            className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A3412] rounded-sm"
          >
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-stone-950 dark:text-stone-50 group-hover:text-[#9A3412] dark:group-hover:text-orange-400 transition-colors leading-[1.06] text-balance-head line-clamp-2">
              {activePost.title}
            </h1>
          </button>
          <p className="mt-3 text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-xl line-clamp-2 leading-relaxed">
            {activePost.excerpt}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-3 text-right">
          <span className="font-mono-code text-xl sm:text-3xl lg:text-4xl font-medium text-stone-950 dark:text-stone-50 tabular-nums block">
            {activePost.year}
          </span>
          <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400 tabular-nums">
            {activePost.readingTimeMinutes} min · {activePost.wordCount} w
          </span>
        </div>
      </div>

      {/* Centered Depth Visual Deck */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-4 min-h-0">
        <div className="relative flex items-center justify-center w-full h-full max-h-[46vh] sm:max-h-[50vh]">
          {/* Previous Ghost Plate */}
          {prevPost && (
            <button
              type="button"
              onClick={() => stepBy(-1)}
              aria-label={`Previous essay: ${prevPost.title}`}
              className="hidden md:block absolute left-[8%] lg:left-[14%] w-[180px] lg:w-[220px] aspect-[4/5] rounded-xl overflow-hidden opacity-25 hover:opacity-55 scale-90 transition-all duration-300 border border-stone-300/60 dark:border-stone-700/60 cursor-pointer"
            >
              <ShelfArtwork
                shelf={prevPost.shelf}
                alt={prevPost.title}
                className="w-full h-full"
              />
            </button>
          )}

          {/* Active Focal Plate */}
          <button
            type="button"
            onClick={() => onOpenPost(activePost)}
            className="group relative h-full max-h-[44vh] sm:max-h-[48vh] aspect-[4/5] rounded-xl overflow-hidden border border-stone-300/80 dark:border-stone-700/80 shadow-xl bg-[#EFEAE0] dark:bg-[#1C1916] transition-transform duration-300 hover:scale-[1.015] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A3412]"
          >
            <ShelfArtwork
              shelf={activePost.shelf}
              alt={activePost.title}
              className="w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-3 text-left">
              <div className="min-w-0">
                <p className="text-[11px] font-mono-code text-stone-300 tabular-nums">
                  {activePost.displayDate}
                </p>
                <p className="mt-0.5 text-sm font-medium text-white truncate">
                  Open Essay
                </p>
              </div>
              <span className="w-8 h-8 rounded-full bg-white/90 text-stone-950 flex items-center justify-center shrink-0 group-hover:bg-[#9A3412] group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
          </button>

          {/* Next Ghost Plate */}
          {nextPost && (
            <button
              type="button"
              onClick={() => stepBy(1)}
              aria-label={`Next essay: ${nextPost.title}`}
              className="hidden md:block absolute right-[8%] lg:right-[14%] w-[180px] lg:w-[220px] aspect-[4/5] rounded-xl overflow-hidden opacity-25 hover:opacity-55 scale-90 transition-all duration-300 border border-stone-300/60 dark:border-stone-700/60 cursor-pointer"
            >
              <ShelfArtwork
                shelf={nextPost.shelf}
                alt={nextPost.title}
                className="w-full h-full"
              />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Faded "Up Next" Preview & Wheel Controls (crl-2026 inspired) */}
      <div className="relative z-20 grid grid-cols-12 gap-4 items-end pt-2">
        <div className="col-span-4 sm:col-span-3 flex items-center gap-3 text-xs font-mono-code text-stone-500 dark:text-stone-400 tabular-nums">
          <span>
            {formattedNum} / {String(posts.length).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => stepBy(-1)}
              aria-label="Previous essay"
              className="p-1.5 rounded-md hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepBy(1)}
              aria-label="Next essay"
              className="p-1.5 rounded-md hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Faded Next Essay Teaser */}
        <div className="col-span-8 sm:col-span-6 flex justify-end sm:justify-center">
          {nextPost && (
            <button
              type="button"
              onClick={() => stepBy(1)}
              className="opacity-40 hover:opacity-95 transition-opacity text-right sm:text-center cursor-pointer max-w-full"
            >
              <span className="text-[11px] font-mono-code text-stone-500 dark:text-stone-400 uppercase tracking-widest block">
                Up Next · {nextNum}
              </span>
              <span className="font-display text-sm sm:text-base font-medium text-stone-900 dark:text-stone-100 truncate block max-w-[260px] sm:max-w-[360px]">
                {nextPost.title}
              </span>
            </button>
          )}
        </div>

        <div className="hidden sm:block sm:col-span-3 text-right text-[11px] font-mono-code text-stone-400 dark:text-stone-500">
          Scroll or ↑ ↓ · Enter to read
        </div>
      </div>
    </section>
  );
}
