import * as THREE from 'three';
import { useHRPStore } from '../../stores/hrpStore';

export function HRPEditor3D() {
  const path = useHRPStore((s) => s.path);

  if (path.length === 0) return null;

  const points = path.map((p) => new THREE.Vector3(p.x, 0.05, p.z));

  return (
    <group>
      {points.length >= 2 && (
        <line>
          <bufferAttribute
            attach="geometry-attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
            itemSize={3}
          />
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
