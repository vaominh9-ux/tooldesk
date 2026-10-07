'use client';

import { useRef, type HTMLAttributes } from 'react';

/** A drag from a field to the backdrop is not a deliberate backdrop click. */
export function useBackdropDismiss(onClose: () => void): HTMLAttributes<HTMLDivElement> {
  const gesture = useRef<{ pointerId: number; x: number; y: number; eligible: boolean; released: boolean } | null>(null);
  return {
    onPointerDownCapture(event) {
      gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, eligible: event.isPrimary && event.button === 0 && event.target === event.currentTarget, released: false };
    },
    onPointerMoveCapture(event) {
      const start = gesture.current;
      if (start && start.pointerId === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) start.eligible = false;
    },
    onPointerUpCapture(event) {
      const start = gesture.current;
      if (!start || start.pointerId !== event.pointerId) return;
      start.released = true;
      start.eligible = start.eligible && event.target === event.currentTarget && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6;
    },
    onPointerCancelCapture() { gesture.current = null; },
    onClick(event) {
      const start = gesture.current;
      gesture.current = null;
      if (start?.eligible && start.released && event.target === event.currentTarget) onClose();
    }
  };
}
