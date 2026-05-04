import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

const REVEAL = 72;
const THRESHOLD = 30;

export default function SwipeRow({
  children,
  onDelete,
  disabled = false,
  onFirstSwipe,
  ariaLabel,
  className = '',
}) {
  const { t } = useTranslation();
  const [translate, setTranslate] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(null);
  const dragging = useRef(false);
  const movedRef = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setTranslate(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.target.closest('[data-swipe-row-active="true"]')) return;
      close();
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [open, close]);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  const beginDrag = (clientX) => {
    startX.current = clientX;
    dragging.current = true;
    movedRef.current = false;
  };

  const onMove = (clientX) => {
    if (!dragging.current || startX.current === null) return;
    const delta = clientX - startX.current;
    if (Math.abs(delta) > 4) movedRef.current = true;
    const base = open ? -REVEAL : 0;
    const next = Math.max(-REVEAL, Math.min(0, base + delta));
    setTranslate(next);
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const wasOpen = open;
    const shouldOpen = translate <= -THRESHOLD;
    if (shouldOpen) {
      setOpen(true);
      setTranslate(-REVEAL);
      if (!wasOpen) onFirstSwipe?.();
    } else {
      setOpen(false);
      setTranslate(0);
    }
    startX.current = null;
  };

  const handleTouchStart = (e) => beginDrag(e.touches[0].clientX);
  const handleTouchMove = (e) => onMove(e.touches[0].clientX);
  const handleTouchEnd = () => endDrag();

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    beginDrag(e.clientX);
  };
  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    onMove(e.clientX);
  };
  const handleMouseUp = () => endDrag();
  const handleMouseLeave = () => {
    if (dragging.current) endDrag();
  };

  const handleClickCapture = (e) => {
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete?.();
    close();
  };

  return (
    <div
      data-swipe-row-active={open ? 'true' : 'false'}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: REVEAL }}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={handleDeleteClick}
          className="w-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
          aria-label={ariaLabel || t('common.delete')}
          tabIndex={open ? 0 : -1}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      <div
        style={{ transform: `translateX(${translate}px)`, transition: dragging.current ? 'none' : 'transform 180ms ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
