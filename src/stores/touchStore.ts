import { create } from 'zustand';

interface TouchState {
  longPressCallback: ((x: number, z: number) => void) | null;
  setLongPressCallback: (cb: ((x: number, z: number) => void) | null) => void;
}

export const useTouchStore = create<TouchState>((set) => ({
  longPressCallback: null,
  setLongPressCallback: (cb) => set({ longPressCallback: cb }),
}));

let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let touchStartPos: { x: number; y: number } | null = null;

export function initTouchHandlers(canvas: HTMLCanvasElement) {
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      longPressTimer = setTimeout(() => {
        const cb = useTouchStore.getState().longPressCallback;
        if (cb && touchStartPos) {
          const rect = canvas.getBoundingClientRect();
          const ndcX = ((touchStartPos.x - rect.left) / rect.width) * 2 - 1;
          const ndcY = -((touchStartPos.y - rect.top) / rect.height) * 2 + 1;
          cb(ndcX, ndcY);
        }
        touchStartPos = null;
      }, 600);
    } else {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
      touchStartPos = null;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (longPressTimer && touchStartPos && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartPos.x;
      const dy = e.touches[0].clientY - touchStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        touchStartPos = null;
      }
    }
  };

  const onTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = null;
    touchStartPos = null;
  };

  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  };
}
