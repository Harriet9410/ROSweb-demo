import { create } from 'zustand';
import { Vec2 } from '../utils/coordinate';
import type { SegmentSpeed } from './hrpStore';

export type TaskStepType = 'path' | 'waypoint' | 'wait';

export interface TaskStep {
  id: string;
  type: TaskStepType;
  path: Vec2[];
  speeds: SegmentSpeed[];
  waypoint: Vec2 | null;
  waitDuration: number;
}

export interface TaskChain {
  id: string;
  name: string;
  steps: TaskStep[];
  createdAt: number;
}

export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  taskChainId: string;
  robotId: string;
  cron: CronSchedule;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number | null;
}

export type ConditionType = 'battery_low' | 'battery_critical' | 'idle_timeout';

export interface ConditionConfig {
  type: ConditionType;
  threshold: number;
  timeoutSeconds: number;
}

export interface ConditionalTask {
  id: string;
  name: string;
  taskChainId: string;
  robotId: string;
  condition: ConditionConfig;
  enabled: boolean;
  lastTriggered: number | null;
}

export type TaskExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskExecution {
  id: string;
  taskChainId: string;
  taskChainName: string;
  robotId: string;
  scheduledTaskId: string | null;
  conditionalTaskId: string | null;
  status: TaskExecutionStatus;
  currentStep: number;
  totalSteps: number;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

interface TaskState {
  chains: TaskChain[];
  scheduledTasks: ScheduledTask[];
  conditionalTasks: ConditionalTask[];
  executions: TaskExecution[];
  selectedChainId: string | null;
  editingStepIndex: number | null;

  addChain: (name: string) => string;
  removeChain: (id: string) => void;
  renameChain: (id: string, name: string) => void;
  duplicateChain: (id: string) => string | null;
  addStepToChain: (chainId: string, step: TaskStep) => void;
  removeStepFromChain: (chainId: string, stepIndex: number) => void;
  reorderStep: (chainId: string, fromIndex: number, toIndex: number) => void;
  updateStep: (chainId: string, stepIndex: number, step: Partial<TaskStep>) => void;
  setSelectedChainId: (id: string | null) => void;
  setEditingStepIndex: (idx: number | null) => void;

  addScheduledTask: (task: Omit<ScheduledTask, 'id' | 'lastRun' | 'nextRun'>) => string;
  removeScheduledTask: (id: string) => void;
  updateScheduledTask: (id: string, updates: Partial<ScheduledTask>) => void;
  toggleScheduledTask: (id: string) => void;

  addConditionalTask: (task: Omit<ConditionalTask, 'id' | 'lastTriggered'>) => string;
  removeConditionalTask: (id: string) => void;
  updateConditionalTask: (id: string, updates: Partial<ConditionalTask>) => void;
  toggleConditionalTask: (id: string) => void;

  addExecution: (exec: Omit<TaskExecution, 'id'>) => string;
  updateExecution: (id: string, updates: Partial<TaskExecution>) => void;
  clearExecutions: () => void;

  loadTasks: (data: { chains: TaskChain[]; scheduledTasks: ScheduledTask[]; conditionalTasks: ConditionalTask[] }) => void;
}

let chainCounter = 0;
let stepCounter = 0;
let schedCounter = 0;
let condCounter = 0;
let execCounter = 0;

export const useTaskStore = create<TaskState>((set, get) => ({
  chains: [],
  scheduledTasks: [],
  conditionalTasks: [],
  executions: [],
  selectedChainId: null,
  editingStepIndex: null,

  addChain: (name) => {
    const id = `chain-${++chainCounter}-${Date.now()}`;
    const chain: TaskChain = { id, name, steps: [], createdAt: Date.now() };
    set((s) => ({ chains: [...s.chains, chain], selectedChainId: id }));
    return id;
  },

  removeChain: (id) => set((s) => ({
    chains: s.chains.filter((c) => c.id !== id),
    selectedChainId: s.selectedChainId === id ? null : s.selectedChainId,
  })),

  renameChain: (id, name) => set((s) => ({
    chains: s.chains.map((c) => c.id === id ? { ...c, name } : c),
  })),

  duplicateChain: (id) => {
    const chain = get().chains.find((c) => c.id === id);
    if (!chain) return null;
    const newId = `chain-${++chainCounter}-${Date.now()}`;
    const dup: TaskChain = {
      id: newId,
      name: `${chain.name} (copy)`,
      steps: chain.steps.map((s) => ({ ...s, id: `step-${++stepCounter}` })),
      createdAt: Date.now(),
    };
    set((s) => ({ chains: [...s.chains, dup] }));
    return newId;
  },

  addStepToChain: (chainId, step) => set((s) => ({
    chains: s.chains.map((c) =>
      c.id === chainId ? { ...c, steps: [...c.steps, step] } : c
    ),
  })),

  removeStepFromChain: (chainId, stepIndex) => set((s) => ({
    chains: s.chains.map((c) =>
      c.id === chainId
        ? { ...c, steps: c.steps.filter((_, i) => i !== stepIndex) }
        : c
    ),
  })),

  reorderStep: (chainId, fromIndex, toIndex) => set((s) => ({
    chains: s.chains.map((c) => {
      if (c.id !== chainId) return c;
      const steps = [...c.steps];
      const [moved] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, moved);
      return { ...c, steps };
    }),
  })),

  updateStep: (chainId, stepIndex, updates) => set((s) => ({
    chains: s.chains.map((c) => {
      if (c.id !== chainId) return c;
      const steps = c.steps.map((st, i) => i === stepIndex ? { ...st, ...updates } : st);
      return { ...c, steps };
    }),
  })),

  setSelectedChainId: (id) => set({ selectedChainId: id, editingStepIndex: null }),
  setEditingStepIndex: (idx) => set({ editingStepIndex: idx }),

  addScheduledTask: (task) => {
    const id = `sched-${++schedCounter}-${Date.now()}`;
    const st: ScheduledTask = { ...task, id, lastRun: null, nextRun: null };
    set((s) => ({ scheduledTasks: [...s.scheduledTasks, st] }));
    return id;
  },

  removeScheduledTask: (id) => set((s) => ({
    scheduledTasks: s.scheduledTasks.filter((t) => t.id !== id),
  })),

  updateScheduledTask: (id, updates) => set((s) => ({
    scheduledTasks: s.scheduledTasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),

  toggleScheduledTask: (id) => set((s) => ({
    scheduledTasks: s.scheduledTasks.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t),
  })),

  addConditionalTask: (task) => {
    const id = `cond-${++condCounter}-${Date.now()}`;
    const ct: ConditionalTask = { ...task, id, lastTriggered: null };
    set((s) => ({ conditionalTasks: [...s.conditionalTasks, ct] }));
    return id;
  },

  removeConditionalTask: (id) => set((s) => ({
    conditionalTasks: s.conditionalTasks.filter((t) => t.id !== id),
  })),

  updateConditionalTask: (id, updates) => set((s) => ({
    conditionalTasks: s.conditionalTasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),

  toggleConditionalTask: (id) => set((s) => ({
    conditionalTasks: s.conditionalTasks.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t),
  })),

  addExecution: (exec) => {
    const id = `exec-${++execCounter}-${Date.now()}`;
    const ex: TaskExecution = { ...exec, id };
    set((s) => ({ executions: [...s.executions, ex] }));
    return id;
  },

  updateExecution: (id, updates) => set((s) => ({
    executions: s.executions.map((e) => e.id === id ? { ...e, ...updates } : e),
  })),

  clearExecutions: () => set({ executions: [] }),

  loadTasks: (data) => set({
    chains: data.chains,
    scheduledTasks: data.scheduledTasks,
    conditionalTasks: data.conditionalTasks,
  }),
}));

export function createStepFromPath(path: Vec2[], speeds: SegmentSpeed[]): TaskStep {
  return {
    id: `step-${++stepCounter}`,
    type: 'path',
    path: [...path],
    speeds: [...speeds],
    waypoint: null,
    waitDuration: 0,
  };
}

export function createStepFromWaypoint(pt: Vec2): TaskStep {
  return {
    id: `step-${++stepCounter}`,
    type: 'waypoint',
    path: [],
    speeds: [],
    waypoint: { ...pt },
    waitDuration: 0,
  };
}

export function createStepWait(duration: number): TaskStep {
  return {
    id: `step-${++stepCounter}`,
    type: 'wait',
    path: [],
    speeds: [],
    waypoint: null,
    waitDuration: duration,
  };
}

export function computeNextCronRun(cron: CronSchedule, now: Date = new Date()): Date | null {
  try {
    const parseField = (field: string, min: number, max: number): number[] => {
      if (field === '*') return Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return field.split(',').map((v) => parseInt(v, 10)).filter((v) => v >= min && v <= max);
    };
    const minutes = parseField(cron.minute, 0, 59);
    const hours = parseField(cron.hour, 0, 23);
    const daysOfMonth = parseField(cron.dayOfMonth, 1, 31);
    const months = parseField(cron.month, 1, 12);
    const daysOfWeek = parseField(cron.dayOfWeek, 0, 6);

    const start = new Date(now.getTime() + 60000);
    start.setSeconds(0, 0);

    for (let offset = 0; offset < 525960; offset++) {
      const candidate = new Date(start.getTime() + offset * 60000);
      if (!months.includes(candidate.getMonth() + 1)) continue;
      if (!daysOfMonth.includes(candidate.getDate())) continue;
      if (!daysOfWeek.includes(candidate.getDay())) continue;
      if (!hours.includes(candidate.getHours())) continue;
      if (!minutes.includes(candidate.getMinutes())) continue;
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

export function cronToHumanReadable(cron: CronSchedule): string {
  const minuteStr = cron.minute === '*' ? '' : `:${cron.minute.padStart(2, '0')}`;
  const hourStr = cron.hour === '*' ? 'every hour' : `${cron.hour.padStart(2, '0')}${minuteStr}`;
  const dayStr = cron.dayOfWeek === '*' ? '' : ` on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(cron.dayOfWeek)]}`;
  return `At ${hourStr}${dayStr}`;
}
