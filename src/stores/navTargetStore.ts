import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';

interface NavTargetState {
  target: Vec2 | null;
  plannedPath: Vec2[];
  navigating: boolean;
  setTarget: (target: Vec2 | null) => void;
  setPlannedPath: (path: Vec2[]) => void;
  setNavigating: (navigating: boolean) => void;
  clearNav: () => void;
}

export const useNavTargetStore = create<NavTargetState>((set) => ({
  target: null,
  plannedPath: [],
  navigating: false,
  setTarget: (target) => set({ target }),
  setPlannedPath: (plannedPath) => set({ plannedPath }),
  setNavigating: (navigating) => set({ navigating }),
  clearNav: () => set({ target: null, plannedPath: [], navigating: false }),
}));
