import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BlogPost } from '../types/blog.ts';
import { ShelfArtwork } from './ShelfArtwork.tsx';

interface EssayCurtainProps {
  post: BlogPost;
  allPosts: BlogPost[];
  onClose: () => void;
  onSelectPost: (post: BlogPost) => void;
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

export function EssayCurtain({
  post,
  allPosts,
  onClose,
  onSelectPost,
}: EssayCurtainProps) {
  const [fontScale, setFontScale] = useState<FontScale>('comfortable');
  const [copied, setCopied] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { indexNum, prevPost, nextPost } = useMemo(() => {
    const idx = allPosts.findIndex((p) => p.id === post.id);
    return {
      indexNum: idx >= 0 ? String(idx + 1).padStart(2, '0') : '01',
      prevPost: idx > 0 ? allPosts[idx - 1] : null,
      nextPost: idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null,
    };
  }, [allPosts, post.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setScrollProgress(0);
  }, [post.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      setScrollProgress(scrollable <= 0 ? 1 : Math.min(1, Math.max(0, el.scrollTop / scrollable)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [post.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && prevPost) {
        onSelectPost(prevPost);
      } else if (e.key === 'ArrowRight' && nextPost) {
        onSelectPost(nextPost);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onSelectPost, prevPost, nextPost]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
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
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
      className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-md"
    >
      {/* Top Close Handle (crl-2026 .lib_panel_close inspired) */}
      <div className="flex justify-center pt-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs uppercase tracking-widest font-medium bg-[#FBF9F5] dark:bg-[#1A1714] text-stone-900 dark:text-stone-100 rounded-md shadow-sm hover:text-[#9A3412] dark:hover:text-orange-400 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Close</span>
        </button>
      </div>

      {/* Architectural Reading Sheet */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto bg-[#FBF9F5] dark:bg-[#141210] text-stone-900 dark:text-stone-100 rounded-t-2xl border-t border-stone-200 dark:border-stone-800 shadow-2xl"
      >
        {/* Reading depth line */}
        <div aria-hidden="true" className="sticky top-0 left-0 right-0 h-[2px] z-20 pointer-events-none">
          <div
            className="h-full bg-[#9A3412] dark:bg-orange-500 origin-left transition-transform duration-100 ease-out"
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-14 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Curatorial Metadata Column (Col 1–3) */}
          <aside className="lg:col-span-3 lg:sticky lg:top-10 space-y-6">
            <div className="flex items-baseline justify-between lg:block">
              <span className="font-mono-code text-3xl sm:text-4xl font-medium text-stone-950 dark:text-stone-50 tabular-nums">
                {indexNum}
              </span>
              <p className="text-xs uppercase tracking-widest text-[#9A3412] dark:text-orange-400 font-medium lg:mt-2">
                {post.shelf}
              </p>
            </div>

            <div className="hidden sm:block max-w-[220px] aspect-[4/5] overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-[#EFEAE0] dark:bg-[#1C1916]">
              <ShelfArtwork
                shelf={post.shelf}
                alt={post.title}
                className="w-full h-full"
              />
            </div>

            <dl className="divide-y divide-stone-200/80 dark:divide-stone-800/80 text-xs">
              <div className="py-2 flex justify-between gap-3">
                <dt className="text-stone-500 dark:text-stone-400">Date</dt>
                <dd className="font-mono-code tabular-nums">{post.date}</dd>
              </div>
              <div className="py-2 flex justify-between gap-3">
                <dt className="text-stone-500 dark:text-stone-400">Reading</dt>
                <dd className="tabular-nums">{post.readingTimeMinutes} min · {post.wordCount} w</dd>
              </div>
              <div className="py-2 flex justify-between gap-3">
                <dt className="text-stone-500 dark:text-stone-400">Source</dt>
                <dd>
                  <a
                    href={post.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-[#9A3412] dark:text-orange-400 hover:underline"
                  >
                    <span>GitHub .md</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </dd>
              </div>
            </dl>

            {/* Controls: Font scale & Share */}
            <div className="flex items-center gap-2 pt-1">
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
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 dark:text-stone-300 bg-[#F3EFE7] dark:bg-[#1D1A17] rounded-md hover:text-stone-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </aside>

          {/* Main Reading Column (Col 5–11) */}
          <article className="lg:col-span-8 lg:col-start-5 min-w-0">
            <header className="pb-8 border-b border-stone-200 dark:border-stone-800">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 leading-[1.12] text-balance-head">
                {post.title}
              </h1>
              <p className="mt-3 text-xs font-mono-code text-stone-400 dark:text-stone-500 truncate">
                {post.path}
              </p>
            </header>

            <div
              className={`mt-8 max-w-prose text-stone-800 dark:text-stone-200 space-y-6 ${
                FONT_SIZE_CLASSES[fontScale]
              } ${startsWithProse ? 'editorial-dropcap' : ''}`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h2
                      id={slugifyHeading(String(children))}
                      className="font-display text-2xl sm:text-3xl font-semibold text-stone-950 dark:text-stone-50 pt-6 pb-1 text-balance-head"
                    >
                      {children}
                    </h2>
                  ),
                  h2: ({ children }) => (
                    <h2
                      id={slugifyHeading(String(children))}
                      className="font-display text-2xl font-semibold text-stone-950 dark:text-stone-50 pt-6 pb-1 text-balance-head"
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3
                      id={slugifyHeading(String(children))}
                      className="font-display text-xl font-semibold text-stone-950 dark:text-stone-50 pt-4 text-balance-head"
                    >
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => <p className="leading-[inherit]">{children}</p>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9A3412] dark:text-orange-400 underline decoration-[#9A3412]/35 dark:decoration-orange-400/35 underline-offset-4 hover:decoration-[#9A3412] transition-colors"
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
                        className="w-full rounded-xl border border-stone-200 dark:border-stone-800"
                      />
                      {alt && (
                        <figcaption className="mt-2.5 text-xs font-display italic text-stone-500 dark:text-stone-400">
                          {alt}
                        </figcaption>
                      )}
                    </figure>
                  ),
                }}
              >
                {post.content || '*This markdown file has no body text yet.*'}
              </ReactMarkdown>
            </div>

            {/* Turn-Page Controls */}
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
    </div>
  );
}
