import { useState, useEffect } from 'react';
import { useRosStore } from '../../stores/rosStore';
import { useHRZStore } from '../../stores/hrzStore';
import { useHRPStore } from '../../stores/hrpStore';
import { useUndoStore } from '../../stores/undoStore';

export function StatusBar() {
  const rosStatus = useRosStore((s) => s.status);
  const isMock = useRosStore((s) => s.isMock);
  const zoneCount = useHRZStore((s) => s.zones.length);
  const pathPts = useHRPStore((s) => s.path.length);
  const canUndo = useUndoStore((s) => s.canUndo);
  const canRedo = useUndoStore((s) => s.canRedo);
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  return (
    <div className="h-7 bg-gray-900 border-t border-gray-700 flex items-center px-3 text-xs text-gray-400 gap-4">
      <span>
        ROS:{' '}
        <span
          className={
            rosStatus === 'connected'
              ? isMock ? 'text-purple-400' : 'text-green-400'
              : rosStatus === 'error'
              ? 'text-red-400'
              : 'text-yellow-400'
          }
        >
          {rosStatus}{isMock ? ' (mock)' : ''}
        </span>
      </span>
      <span>Zones: {zoneCount}</span>
      <span>Path pts: {pathPts}</span>
      <span className="ml-auto flex items-center gap-3">
        {shiftHeld && <span className="text-cyan-400 font-medium">SNAP 0.5m</span>}
        <span className={canUndo ? 'text-blue-400' : 'text-gray-600'}>Ctrl+Z</span>
        <span className="text-gray-600">/</span>
        <span className={canRedo ? 'text-blue-400' : 'text-gray-600'}>Ctrl+Y</span>
      </span>
    </div>
  );
}
