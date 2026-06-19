import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

interface MeasureState {
  points: Vec2[];
  measuring: boolean;
  distance: number;
  startMeasure: () => void;
  addPoint: (p: Vec2) => void;
  clearMeasure: () => void;
}

export const useMeasureStore = create<MeasureState>((set, get) => ({
  points: [],
  measuring: false,
  distance: 0,

  startMeasure: () => set({ measuring: true, points: [], distance: 0 }),

  addPoint: (p) => {
    const { points, measuring } = get();
    if (!measuring) return;
    const newPoints = [...points, p];
    if (newPoints.length >= 2) {
      const dx = newPoints[1].x - newPoints[0].x;
      const dz = newPoints[1].z - newPoints[0].z;
      const d = Math.sqrt(dx * dx + dz * dz);
      set({ points: newPoints, measuring: false, distance: d });
    } else {
      set({ points: newPoints });
    }
  },

  clearMeasure: () => set({ points: [], measuring: false, distance: 0 }),
}));
