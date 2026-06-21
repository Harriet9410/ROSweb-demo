import { create } from 'zustand';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RosLogEntry {
  timestamp: number;
  direction: 'in' | 'out' | 'sys';
  topic: string;
  summary: string;
}

interface RosState {
  status: ConnectionStatus;
  url: string;
  isMock: boolean;
  rosLog: RosLogEntry[];
  setUrl: (url: string) => void;
  setStatus: (status: ConnectionStatus) => void;
  setMock: (mock: boolean) => void;
  addRosLog: (entry: Omit<RosLogEntry, 'timestamp'>) => void;
  clearRosLog: () => void;
}

const MAX_LOG = 100;

export const useRosStore = create<RosState>((set) => ({
  status: 'disconnected',
  url: 'ws://localhost:9090',
  isMock: false,
  rosLog: [],
  setUrl: (url) => set({ url }),
  setStatus: (status) => set({ status }),
  setMock: (isMock) => set({ isMock }),
  addRosLog: (entry) => set((s) => {
    const log = [...s.rosLog, { ...entry, timestamp: Date.now() }];
    if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
    return { rosLog: log };
  }),
  clearRosLog: () => set({ rosLog: [] }),
}));
