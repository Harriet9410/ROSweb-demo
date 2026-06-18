import { useRosStore } from '../../stores/rosStore';

export type AppMode = 'navigate' | 'hrz' | 'hrp' | 'mapedit';

interface ModeSelectorProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const allModes: { key: AppMode; label: string; icon: string; mockOnly: boolean }[] = [
  { key: 'navigate', label: 'Navigate', icon: '🧭', mockOnly: false },
  { key: 'mapedit', label: 'Map Edit', icon: '🗺️', mockOnly: true },
  { key: 'hrz', label: 'HRZ Zone', icon: '🚫', mockOnly: false },
  { key: 'hrp', label: 'HRP Path', icon: '✏️', mockOnly: false },
];

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const isMock = useRosStore((s) => s.isMock);

  const visibleModes = allModes.filter((m) => !m.mockOnly || isMock);

  const safeMode = visibleModes.find((m) => m.key === mode) ? mode : 'navigate';

  return (
    <div className="flex flex-wrap gap-1">
      {visibleModes.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`text-xs px-3 py-1.5 rounded font-medium transition ${
            safeMode === m.key
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {m.icon} {m.label}
        </button>
      ))}
    </div>
  );
}
