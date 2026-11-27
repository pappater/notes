import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Maximize2,
  Minimize2,
  PanelLeft,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BlogPost } from '../types/blog.ts';
import { ShelfArtwork } from './ShelfArtwork.tsx';

interface ReadingCanvasProps {
  post: BlogPost;
  allPosts: BlogPost[];
  onSelectPost: (post: BlogPost) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenMobileIndex: () => void;
}

type FontScale = 'compact' | 'comfortable' | 'large';

const FONT_SIZE_CLASSES: Record<FontScale, string> = {
  compact: 'text-[15.5px] leading-[1.78]',
  comfortable: 'text-[17px] leading-[1.85]',
  large: 'text-[19px] leading-[1.88]',
};

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'
  );
}

export function ReadingCanvas({
  post,
  allPosts,
  onSelectPost,
  isFocusMode,
  onToggleFocusMode,
  onOpenMobileIndex,
}: ReadingCanvasProps) {
  const [fontScale, setFontScale] = useState<FontScale>('comfortable');
  const [copiedLink, setCopiedLink] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { prevPost, nextPost } = useMemo(() => {
    const idx = allPosts.findIndex((p) => p.id === post.id);
    return {
      prevPost: idx > 0 ? allPosts[idx - 1] : null,
      nextPost: idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null,
    };
  }, [allPosts, post.id]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    setScrollProgress(0);
  }, [post.id]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const updateProgress = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable <= 0) {
        setScrollProgress(1);
        return;
      }
      setScrollProgress(Math.min(1, Math.max(0, el.scrollTop / scrollable)));
    };

    el.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => el.removeEventListener('scroll', updateProgress);
  }, [post.id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const startsWithProse = useMemo(() => {
    const trimmed = post.content.trim();
    return (
      Boolean(trimmed) &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('```') &&
      !trimmed.startsWith('>')
    );
  }, [post.content]);

  return (
    <div
      ref={scrollContainerRef}
      className="relative h-full overflow-y-auto bg-[#FBF9F5] dark:bg-[#141210]"
    >
      {/* Razor-thin reading depth indicator */}
      <div
        aria-hidden="true"
        className="sticky top-0 left-0 right-0 h-[2px] z-20 bg-transparent pointer-events-none"
      >
        <div
          className="h-full bg-[#9A3412] dark:bg-orange-500 origin-left transition-transform duration-100 ease-out"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-10 lg:px-14 pt-6 sm:pt-10 pb-20">
        {/* Inline Canvas Controls (not a site header) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMobileIndex}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 bg-[#F3EFE7] dark:bg-[#1D1A17] border border-stone-200 dark:border-stone-800 rounded-md cursor-pointer"
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span>Essays ({allPosts.length})</span>
            </button>

            <button
              type="button"
              onClick={onToggleFocusMode}
              title={isFocusMode ? 'Show index sidebar (F)' : 'Focus reading mode (F)'}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-md transition-colors cursor-pointer"
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Show Index</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Focus</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center p-0.5 bg-[#F3EFE7] dark:bg-[#1D1A17] rounded-md"
              role="group"
              aria-label="Text size"
            >
              {(
                [
                  { id: 'compact', label: 'S' },
                  { id: 'comfortable', label: 'M' },
                  { id: 'large', label: 'L' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFontScale(opt.id)}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    fontScale === opt.id
                      ? 'bg-white dark:bg-[#2A2521] text-stone-950 dark:text-stone-50 shadow-xs'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>

            <a
              href={post.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-[#9A3412] dark:hover:text-orange-400 transition-colors"
            >
              <span>.md</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Essay Title & Metadata */}
        <article>
          <header className="space-y-4 pb-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 tabular-nums">
              <span className="uppercase tracking-widest text-[#9A3412] dark:text-orange-400 font-medium">
                {post.shelf}
              </span>
              <span aria-hidden="true">·</span>
              <span>{post.displayDate}</span>
              <span aria-hidden="true">·</span>
              <span>{post.readingTimeMinutes} min read</span>
              <span aria-hidden="true">·</span>
              <span>{post.wordCount.toLocaleString()} words</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-stone-950 dark:text-stone-50 leading-[1.12] text-balance-head">
              {post.title}
            </h2>

            {/* Quiet atmospheric visual plate */}
            <figure className="pt-4">
              <div className="overflow-hidden rounded-xl border border-stone-200/90 dark:border-stone-800/90 bg-[#F3EFE7] dark:bg-[#1E1A17]">
                <ShelfArtwork
                  shelf={post.shelf}
                  alt={post.title}
                  className="w-full h-44 sm:h-56"
                />
              </div>
              <figcaption className="mt-2 flex items-center justify-between text-[11px] font-mono-code text-stone-400 dark:text-stone-500">
                <span className="truncate">{post.path}</span>
                {post.rawCategories.length > 0 && (
                  <span className="font-sans-ui shrink-0 ml-4">
                    {post.rawCategories.join(' / ')}
                  </span>
                )}
              </figcaption>
            </figure>
          </header>

          {/* Optional inline Table of Contents when headings exist */}
          {post.headings.length > 1 && (
            <nav
              aria-label="Essay sections"
              className="mb-8 py-4 border-y border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500 dark:text-stone-400"
            >
              <span className="uppercase tracking-widest text-[11px] font-medium text-stone-400 dark:text-stone-500">
                Sections
              </span>
              {post.headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className="hover:text-[#9A3412] dark:hover:text-orange-400 transition-colors"
                >
                  {h.text}
                </a>
              ))}
            </nav>
          )}

          {/* Markdown Essay Body */}
          <div
            className={`mt-4 text-stone-800 dark:text-stone-200 space-y-6 ${
              FONT_SIZE_CLASSES[fontScale]
            } ${startsWithProse ? 'editorial-dropcap' : ''}`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => {
                  const text = String(children);
                  return (
                    <h3
                      id={slugifyHeading(text)}
                      className="font-display text-2xl sm:text-3xl font-semibold text-stone-950 dark:text-stone-50 pt-6 pb-1 text-balance-head scroll-mt-8"
                    >
                      {children}
                    </h3>
                  );
                },
                h2: ({ children }) => {
                  const text = String(children);
                  return (
                    <h3
                      id={slugifyHeading(text)}
                      className="font-display text-2xl font-semibold text-stone-950 dark:text-stone-50 pt-6 pb-1 text-balance-head scroll-mt-8"
                    >
                      {children}
                    </h3>
                  );
                },
                h3: ({ children }) => {
                  const text = String(children);
                  return (
                    <h4
                      id={slugifyHeading(text)}
                      className="font-display text-xl font-semibold text-stone-950 dark:text-stone-50 pt-4 text-balance-head scroll-mt-8"
                    >
                      {children}
                    </h4>
                  );
                },
                p: ({ children }) => <p className="leading-[inherit]">{children}</p>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#9A3412] dark:text-orange-400 underline decoration-[#9A3412]/35 dark:decoration-orange-400/35 underline-offset-4 hover:decoration-[#9A3412] dark:hover:decoration-orange-400 transition-colors"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-8 py-5 px-1 border-y border-stone-200 dark:border-stone-800 font-display italic text-xl sm:text-2xl text-stone-800 dark:text-stone-200 leading-relaxed">
                    {children}
                  </blockquote>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 space-y-2 marker:text-stone-400">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 space-y-2 marker:text-stone-500 tabular-nums">
                    {children}
                  </ol>
                ),
                hr: () => <hr className="my-10 border-stone-200 dark:border-stone-800" />,
                code: ({ className, children, ...props }) => {
                  const isBlock =
                    Boolean(className?.includes('language-')) || String(children).includes('\n');
                  if (isBlock) {
                    return (
                      <code
                        className={`font-mono-code text-[13px] leading-relaxed ${className || ''}`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="font-mono-code text-[0.87em] px-1.5 py-0.5 rounded bg-[#F3EFE7] dark:bg-[#231F1B] text-stone-900 dark:text-stone-100"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-6 p-4 sm:p-5 overflow-x-auto rounded-xl bg-[#1C1917] dark:bg-[#0D0C0A] text-stone-100 border border-stone-800 text-sm">
                    {children}
                  </pre>
                ),
                img: ({ src, alt }) => (
                  <figure className="my-8">
                    <img
                      src={src || ''}
                      alt={alt || post.title}
                      referrerPolicy="no-referrer"
                      className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-[#F3EFE7] dark:bg-[#1E1A17]"
                    />
                    {alt && (
                      <figcaption className="mt-2.5 text-xs font-display italic text-stone-500 dark:text-stone-400">
                        {alt}
                      </figcaption>
                    )}
                  </figure>
                ),
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
                    <table className="w-full text-sm text-left border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2.5 font-semibold bg-[#F3EFE7] dark:bg-[#1D1A17] border-b border-stone-200 dark:border-stone-800">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2.5 border-b border-stone-200/70 dark:border-stone-800/70">
                    {children}
                  </td>
                ),
              }}
            >
              {post.content || '*This markdown file has no body text yet.*'}
            </ReactMarkdown>
          </div>

          {/* Minimalist Turn-Page Controls at End of Essay */}
          <div className="mt-16 pt-8 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {prevPost ? (
              <button
                type="button"
                onClick={() => onSelectPost(prevPost)}
                className="text-left group cursor-pointer max-w-xs"
              >
                <span className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Newer</span>
                </span>
                <p className="mt-1 font-display text-lg font-medium text-stone-900 dark:text-stone-100 group-hover:text-[#9A3412] dark:group-hover:text-orange-400 transition-colors truncate">
                  {prevPost.title}
                </p>
              </button>
            ) : (
              <div />
            )}

            {nextPost ? (
              <button
                type="button"
                onClick={() => onSelectPost(nextPost)}
                className="text-left sm:text-right group cursor-pointer max-w-xs sm:ml-auto"
              >
                <span className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                  <span>Older</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <p className="mt-1 font-display text-lg font-medium text-stone-900 dark:text-stone-100 group-hover:text-[#9A3412] dark:group-hover:text-orange-400 transition-colors truncate">
                  {nextPost.title}
                </p>
              </button>
            ) : (
              <div />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
