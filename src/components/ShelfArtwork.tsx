import { BookOpen, Code2, Compass, Feather } from 'lucide-react';
import { useState } from 'react';
import codeImg from '../assets/images/code_craft_terminal_1795800222708.jpg';
import heroImg from '../assets/images/hero_editorial_desk_1795800222788.jpg';
import streetImg from '../assets/images/street_twilight_observations_1795800224302.jpg';
import travelImg from '../assets/images/travel_hills_monsoon_1795800222486.jpg';
import type { EssayShelf } from '../types/blog.ts';

interface ShelfArtworkProps {
  shelf: EssayShelf | 'Hero';
  alt: string;
  className?: string;
}

const IMAGE_MAP: Record<EssayShelf | 'Hero', string> = {
  Hero: heroImg,
  'Travel & Places': travelImg,
  'Code & Craft': codeImg,
  'Life & Reflections': streetImg,
  Tamil: streetImg,
};

function FallbackIcon({ shelf }: { shelf: EssayShelf | 'Hero' }) {
  switch (shelf) {
    case 'Travel & Places':
      return <Compass className="w-8 h-8 text-stone-500 dark:text-stone-400" />;
    case 'Code & Craft':
      return <Code2 className="w-8 h-8 text-stone-500 dark:text-stone-400" />;
    case 'Tamil':
      return <BookOpen className="w-8 h-8 text-stone-500 dark:text-stone-400" />;
    default:
      return <Feather className="w-8 h-8 text-stone-500 dark:text-stone-400" />;
  }
}

export function ShelfArtwork({ shelf, alt, className = '' }: ShelfArtworkProps) {
  const [failed, setFailed] = useState(false);
  const src = IMAGE_MAP[shelf];

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#F3EFE7] to-[#E5DFD3] dark:from-[#211D19] dark:to-[#181512] text-stone-600 dark:text-stone-400 ${className}`}
        role="img"
        aria-label={alt}
      >
        <FallbackIcon shelf={shelf} />
        <span className="text-xs font-medium tracking-wide text-stone-500 dark:text-stone-400">
          {shelf === 'Hero' ? 'Editorial Archive' : shelf}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
