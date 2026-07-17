import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

// Maximum aantal gelijktijdige toasts. Bij een vierde verdwijnt de oudste.
const MAX_TOASTS = 3;

let nextToastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const clearTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback((id) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearTimer]);

  const showToast = useCallback(({ message, actionLabel, onAction, duration = 5000 }) => {
    const id = ++nextToastId;
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
    timersRef.current.set(id, timer);

    setToasts((prev) => {
      const next = [...prev, { id, message, actionLabel, onAction }];
      if (next.length > MAX_TOASTS) {
        const [oldest, ...rest] = next;
        clearTimer(oldest.id);
        return rest;
      }
      return next;
    });
  }, [clearTimer]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      dismiss: () => {},
      toasts: [],
    };
  }
  return ctx;
}
