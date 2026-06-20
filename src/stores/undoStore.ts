import { create } from 'zustand';
import { useHRZStore, HRZZone } from './hrzStore';
import { useHRPStore, SegmentSpeed } from './hrpStore';
import { useFleetStore, RobotInstance, WaypointConfig } from './fleetStore';
import { Vec2 } from '../utils/coordinate';

interface Snapshot {
  hrz: { zones: HRZZone[]; currentVertices: Vec2[]; isDrawing: boolean };
  hrp: { path: Vec2[]; segmentSpeeds: SegmentSpeed[]; blockedSegments: boolean[]; isDrawing: boolean };
  fleet: { robots: RobotInstance[]; activeRobotId: string };
}

const MAX_HISTORY = 50;

interface UndoState {
  history: Snapshot[];
  index: number;
  redoStack: Snapshot[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function cloneRobots(robots: RobotInstance[]): RobotInstance[] {
  return robots.map((r) => ({
    ...r,
    pose: { ...r.pose },
    waypoints: r.waypoints.map((w: WaypointConfig) => ({ ...w })),
    plannedPath: [...r.plannedPath],
  }));
}

function captureSnapshot(): Snapshot {
  const hrz = useHRZStore.getState();
  const hrp = useHRPStore.getState();
  const fleet = useFleetStore.getState();
  return {
    hrz: {
      zones: hrz.zones.map((z) => ({ ...z, vertices: [...z.vertices] })),
      currentVertices: [...hrz.currentVertices],
      isDrawing: hrz.isDrawing,
    },
    hrp: {
      path: [...hrp.path],
      segmentSpeeds: [...hrp.segmentSpeeds],
      blockedSegments: [...hrp.blockedSegments],
      isDrawing: hrp.isDrawing,
    },
    fleet: {
      robots: cloneRobots(fleet.robots),
      activeRobotId: fleet.activeRobotId,
    },
  };
}

function restoreSnapshot(snap: Snapshot) {
  const hrz = useHRZStore.getState();
  const hrp = useHRPStore.getState();
  hrz.loadZones(snap.hrz.zones);
  if (snap.hrz.isDrawing) {
    useHRZStore.setState({ currentVertices: snap.hrz.currentVertices, isDrawing: true });
  } else {
    useHRZStore.setState({ currentVertices: [], isDrawing: false });
  }
  hrp.loadPath(snap.hrp.path);
  useHRPStore.setState({
    segmentSpeeds: snap.hrp.segmentSpeeds,
    blockedSegments: snap.hrp.blockedSegments,
    isDrawing: snap.hrp.isDrawing,
  });
  useFleetStore.setState({
    robots: cloneRobots(snap.fleet.robots),
    activeRobotId: snap.fleet.activeRobotId,
  });
}

export const useUndoStore = create<UndoState>((set, get) => ({
  history: [],
  index: -1,
  redoStack: [],
  canUndo: false,
  canRedo: false,

  pushUndo: () => {
    const snap = captureSnapshot();
    set((s) => {
      const newHistory = s.history.slice(0, s.index + 1);
      newHistory.push(snap);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      const newIndex = newHistory.length - 1;
      return { history: newHistory, index: newIndex, canUndo: newIndex >= 0, canRedo: false, redoStack: [] };
    });
  },

  undo: () => {
    const { history, index, redoStack } = get();
    if (index < 0) return;
    const liveSnap = captureSnapshot();
    restoreSnapshot(history[index]);
    const newIndex = index - 1;
    set({
      index: newIndex,
      canUndo: newIndex >= 0,
      canRedo: true,
      redoStack: [...redoStack, liveSnap],
    });
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const snap = redoStack[redoStack.length - 1];
    restoreSnapshot(snap);
    set((s) => ({
      index: s.index + 1,
      canUndo: true,
      canRedo: s.redoStack.length > 1,
      redoStack: s.redoStack.slice(0, -1),
    }));
  },
}));
