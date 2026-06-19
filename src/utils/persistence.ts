import { Vec2 } from './coordinate';
import { MapLabel } from '../stores/labelStore';
import { HRZZone } from '../stores/hrzStore';

const STORAGE_KEY = 'mrrep-web-persistence';

interface PersistedData {
  hrzZones: HRZZone[];
  hrpPath: Vec2[];
  labels: MapLabel[];
}

export function save(hrzZones: HRZZone[], hrpPath: Vec2[], labels: MapLabel[]): void {
  try {
    const data: PersistedData = { hrzZones, hrpPath, labels };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function load(): PersistedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedData;
  } catch {
    return null;
  }
}
