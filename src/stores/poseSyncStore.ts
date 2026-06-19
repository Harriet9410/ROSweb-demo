import { create } from 'zustand';
import { useFleetStore } from './fleetStore';

interface PoseSyncState {
  enabled: boolean;
  serverUrl: string;
  setEnabled: (v: boolean) => void;
  setServerUrl: (url: string) => void;
}

export const usePoseSyncStore = create<PoseSyncState>((set) => ({
  enabled: false,
  serverUrl: 'ws://localhost:9091',
  setEnabled: (v) => set({ enabled: v }),
  setServerUrl: (url) => set({ serverUrl: url }),
}));

let syncWs: WebSocket | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startPoseSync(url: string): void {
  stopPoseSync();
  try {
    syncWs = new WebSocket(url);
    syncWs.onopen = () => {
      usePoseSyncStore.getState().setEnabled(true);
    };
    syncWs.onclose = () => {
      usePoseSyncStore.getState().setEnabled(false);
    };
    syncWs.onerror = () => {
      usePoseSyncStore.getState().setEnabled(false);
    };
    syncWs.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'poses' && Array.isArray(msg.robots)) {
          const fleet = useFleetStore.getState();
          for (const rp of msg.robots) {
            if (fleet.robots.find((r) => r.id === rp.id)) {
              fleet.setRobotPose(rp.id, { x: rp.x, z: rp.z, yaw: rp.yaw });
            }
          }
        }
      } catch {}
    };
    syncInterval = setInterval(() => {
      if (syncWs && syncWs.readyState === WebSocket.OPEN) {
        const fleet = useFleetStore.getState();
        const poses = fleet.robots.map((r) => ({
          id: r.id,
          name: r.name,
          x: r.pose.x,
          z: r.pose.z,
          yaw: r.pose.yaw,
          linearVelocity: r.linearVelocity,
          angularVelocity: r.angularVelocity,
        }));
        syncWs.send(JSON.stringify({ type: 'poses', robots: poses }));
      }
    }, 100);
  } catch {
    usePoseSyncStore.getState().setEnabled(false);
  }
}

export function stopPoseSync(): void {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  if (syncWs) { syncWs.close(); syncWs = null; }
  usePoseSyncStore.getState().setEnabled(false);
}
