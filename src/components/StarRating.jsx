import React from 'react';
import { Star } from 'lucide-react';

const SIZE_CLASS = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function StarRating({ value = 0, onChange, readonly = false, size = 'sm' }) {
  const cls = SIZE_CLASS[size] || SIZE_CLASS.sm;
  const handle = (n) => {
    if (readonly || !onChange) return;
    onChange(n === value ? 0 : n);
  };
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Beoordeling">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={readonly}
            onClick={() => handle(n)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
            aria-label={`${n} ster${n === 1 ? '' : 'ren'}`}
            aria-pressed={active}
          >
            <Star
              className={`${cls} ${active ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
