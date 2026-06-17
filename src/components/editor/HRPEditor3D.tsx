import * as THREE from 'three';
import { useMemo } from 'react';
import { useHRPStore } from '../../stores/hrpStore';

export function HRPEditor3D() {
  const path = useHRPStore((s) => s.path);

  const linePositions = useMemo(() => {
    return new Float32Array(path.flatMap((p) => [p.x, 0.05, p.z]));
  }, [path]);

  if (path.length === 0) return null;

  const geometryKey = path.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join('|');

  return (
    <group>
      {path.length >= 2 && (
        <line key={geometryKey}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={path.length}
              array={linePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4caf50" linewidth={3} />
        </line>
      )}
      {path.map((p, i) => (
        <mesh key={i} position={[p.x, 0.05, p.z]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color={i === 0 ? '#4caf50' : '#81c784'} />
        </mesh>
      ))}
    </group>
  );
}
