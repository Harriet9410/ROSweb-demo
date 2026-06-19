import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRobotPoseStore } from '../../stores/robotPoseStore';
import { useTrailStore } from '../../stores/trailStore';

const MAX_RENDER = 500;

export function BreadcrumbTrail() {
  const trailRef = useRef<{ x: number; z: number }[]>([]);
  const posRef = useRef<Float32Array | null>(null);
  const countRef = useRef(0);
  const addPoint = useTrailStore((s) => s.addPoint);

  useFrame(() => {
    const pose = useRobotPoseStore.getState().pose;
    addPoint({ x: pose.x, z: pose.z });

    const trail = useTrailStore.getState().trail;
    const len = Math.min(trail.length, MAX_RENDER);
    const step = trail.length > MAX_RENDER ? Math.floor(trail.length / MAX_RENDER) : 1;

    if (len !== countRef.current) {
      countRef.current = len;
      const arr = new Float32Array(len * 3);
      for (let i = 0; i < len; i++) {
        const p = trail[i * step] || trail[trail.length - 1];
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = 0.03;
        arr[i * 3 + 2] = p.z;
      }
      posRef.current = arr;
      trailRef.current = trail;
    }
  });

  const positions = posRef.current;
  if (!positions || positions.length < 6) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ff9800" transparent opacity={0.4} />
    </line>
  );
}
