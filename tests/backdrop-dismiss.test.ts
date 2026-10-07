import { describe, expect, it, vi } from 'vitest';
import type { MouseEvent, PointerEvent } from 'react';
vi.mock('react', () => ({ useRef: <T>(value: T) => ({ current: value }) }));
import { useBackdropDismiss } from '../src/components/dialogs/use-backdrop-dismiss';

function setup() {
  const close = vi.fn();
  const handlers = useBackdropDismiss(close);
  const backdrop = {} as HTMLDivElement, field = {} as HTMLInputElement;
  const pointer = (target: EventTarget, x = 10, y = 10, button = 0) => ({ target, currentTarget: backdrop, clientX: x, clientY: y, button, isPrimary: true, pointerId: 1 }) as PointerEvent<HTMLDivElement>;
  const click = (target: EventTarget) => handlers.onClick?.({ target, currentTarget: backdrop } as MouseEvent<HTMLDivElement>);
  return { close, handlers, backdrop, field, pointer, click };
}
describe('Backdrop dismissal', () => {
  it('closes on an intentional backdrop click', () => {
    const s = setup();
    s.handlers.onPointerDownCapture?.(s.pointer(s.backdrop));
    s.handlers.onPointerUpCapture?.(s.pointer(s.backdrop));
    s.click(s.backdrop);
    expect(s.close).toHaveBeenCalledTimes(1);
  });
  it('keeps the form open when selection starts inside and ends on backdrop', () => {
    const s = setup();
    s.handlers.onPointerDownCapture?.(s.pointer(s.field));
    s.handlers.onPointerUpCapture?.(s.pointer(s.backdrop));
    s.click(s.backdrop);
    expect(s.close).not.toHaveBeenCalled();
  });
  it('ignores input clicks and a backdrop press released inside the form', () => {
    const s = setup();
    s.handlers.onPointerDownCapture?.(s.pointer(s.field));
    s.handlers.onPointerUpCapture?.(s.pointer(s.field)); s.click(s.field);
    s.handlers.onPointerDownCapture?.(s.pointer(s.backdrop));
    s.handlers.onPointerUpCapture?.(s.pointer(s.field)); s.click(s.backdrop);
    expect(s.close).not.toHaveBeenCalled();
  });
  it('ignores touch scrolling or a drag that returns to its origin', () => {
    const s = setup();
    s.handlers.onPointerDownCapture?.(s.pointer(s.backdrop));
    s.handlers.onPointerMoveCapture?.(s.pointer(s.backdrop, 50));
    s.handlers.onPointerUpCapture?.(s.pointer(s.backdrop)); s.click(s.backdrop);
    expect(s.close).not.toHaveBeenCalled();
  });
  it('ignores cancelled gestures, right clicks, and clicks without a press', () => {
    const s = setup(); s.click(s.backdrop);
    s.handlers.onPointerDownCapture?.(s.pointer(s.backdrop));
    s.handlers.onPointerCancelCapture?.(s.pointer(s.backdrop)); s.click(s.backdrop);
    s.handlers.onPointerDownCapture?.(s.pointer(s.backdrop, 10, 10, 2));
    s.handlers.onPointerUpCapture?.(s.pointer(s.backdrop, 10, 10, 2)); s.click(s.backdrop);
    expect(s.close).not.toHaveBeenCalled();
  });
  it('allows the next deliberate backdrop click after an ignored drag', () => {
    const s = setup();
    s.handlers.onPointerDownCapture?.(s.pointer(s.field));
    s.handlers.onPointerUpCapture?.(s.pointer(s.backdrop)); s.click(s.backdrop);
    s.handlers.onPointerDownCapture?.(s.pointer(s.backdrop));
    s.handlers.onPointerUpCapture?.(s.pointer(s.backdrop)); s.click(s.backdrop);
    expect(s.close).toHaveBeenCalledTimes(1);
  });
});
