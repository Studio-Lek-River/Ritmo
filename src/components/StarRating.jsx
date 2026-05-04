import React from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

const SIZE_CLASS = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'sm',
  color = 'amber',
  labels,
}) {
  const { t } = useTranslation();
  const cls = SIZE_CLASS[size] || SIZE_CLASS.sm;
  const handle = (n) => {
    if (readonly || !onChange) return;
    onChange(n === value ? 0 : n);
  };
  const starWord = (n) => n === 1 ? t('stars.starOne') : t('stars.starOther');
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label={t('stars.aria')}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        const label = labels?.[n - 1];
        const ariaLabel = label
          ? `${n} ${starWord(n)}: ${label}`
          : `${n} ${starWord(n)}`;
        return (
          <button
            key={n}
            type="button"
            disabled={readonly}
            onClick={() => handle(n)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
            aria-label={ariaLabel}
            aria-pressed={active}
            title={label}
          >
            <Star
              className={`${cls} ${active ? `fill-${color}-400 text-${color}-400` : 'text-zinc-300 dark:text-zinc-600'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
