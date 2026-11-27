import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import type { BlogPost } from '../types/blog.ts';
import { ShelfArtwork } from './ShelfArtwork.tsx';

interface ListViewProps {
  posts: BlogPost[];
  activeIndex: number;
  onHoverIndex: (idx: number) => void;
  onOpenPost: (post: BlogPost) => void;
}

export function ListView({
  posts,
  activeIndex,
  onHoverIndex,
  onOpenPost,
}: ListViewProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number>(activeIndex);
  const previewIndex = posts.length > 0 ? Math.max(0, Math.min(hoveredIdx, posts.length - 1)) : 0;
  const previewPost = posts[previewIndex];

  const handleEnter = (idx: number) => {
    setHoveredIdx(idx);
    onHoverIndex(idx);
  };

  if (posts.length === 0) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center px-6 text-center">
        <p className="font-display text-2xl text-stone-500 dark:text-stone-400">
          No essays match this filter.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Architectural essay list"
      className="relative min-h-dvh w-full px-5 sm:px-10 lg:px-12 pt-24 sm:pt-28 pb-20"
    >
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left/Center 9-column Typographic Ledger */}
        <div className="col-span-12 lg:col-span-9 divide-y divide-stone-200/70 dark:divide-stone-800/70">
          {posts.map((post, idx) => {
            const isHighlighted = idx === previewIndex;
            const num = String(idx + 1).padStart(2, '0');
            return (
              <button
                key={post.id}
                type="button"
                onMouseEnter={() => handleEnter(idx)}
                onFocus={() => handleEnter(idx)}
                onClick={() => onOpenPost(post)}
                className={`w-full text-left py-4 sm:py-5 grid grid-cols-12 gap-3 sm:gap-4 items-baseline transition-opacity duration-150 cursor-pointer ${
                  isHighlighted ? 'opacity-100' : 'opacity-35 hover:opacity-100'
                }`}
              >
                <span className="col-span-2 sm:col-span-1 font-mono-code text-xs sm:text-sm text-stone-500 dark:text-stone-400 tabular-nums">
                  {num}
                </span>

                <span className="hidden sm:block sm:col-span-3 text-xs uppercase tracking-wider text-[#9A3412] dark:text-orange-400 truncate">
                  {post.shelf}
                </span>

                <span className="col-span-8 sm:col-span-6 font-display text-lg sm:text-2xl font-medium tracking-tight text-stone-950 dark:text-stone-50 leading-snug truncate">
                  {post.title}
                </span>

                <span className="col-span-2 text-right font-mono-code text-xs text-stone-500 dark:text-stone-400 tabular-nums whitespace-nowrap">
                  {post.date.slice(0, 7)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pinned Right-Column Visual Preview (crl-2026 .lib_list_visual inspired) */}
        {previewPost && (
          <aside className="hidden lg:block lg:col-span-3 sticky top-28">
            <button
              type="button"
              onClick={() => onOpenPost(previewPost)}
              className="w-full text-left group cursor-pointer"
            >
              <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-[#EFEAE0] dark:bg-[#1C1916] relative">
                <ShelfArtwork
                  shelf={previewPost.shelf}
                  alt={previewPost.title}
                  className="w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent"
                />
                <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-xs font-mono-code tabular-nums">
                    {previewPost.displayDate}
                  </span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <p className="text-xs uppercase tracking-widest text-[#9A3412] dark:text-orange-400 font-medium">
                  {previewPost.shelf} · {previewPost.readingTimeMinutes} min read
                </p>
                <h2 className="font-display text-xl font-medium text-stone-950 dark:text-stone-50 leading-snug">
                  {previewPost.title}
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                  {previewPost.excerpt}
                </p>
              </div>
            </button>
          </aside>
        )}
      </div>
    </section>
  );
}
