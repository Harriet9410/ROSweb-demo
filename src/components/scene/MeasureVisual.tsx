import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMeasureStore } from '../../stores/measureStore';

function makeLabel(text: string, bg: string, fg: string, w: number, h: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.round(h * 0.55)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function MeasureVisual() {
  const points = useMeasureStore((s) => s.points);
  const measuring = useMeasureStore((s) => s.measuring);
  const distance = useMeasureStore((s) => s.distance);
  const lineRef = useRef<any>(null);

  useFrame(() => {
    if (lineRef.current) {
      lineRef.current.computeLineDistances();
    }
  });

  if (points.length === 0 && !measuring) return null;

  if (points.length === 1) {
    const p = points[0];
    const tex = useMemo(() => makeLabel(`(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`, '#006064cc', '#00e5ff', 128, 24), [p.x, p.z]);
    return (
      <group>
        <mesh position={[p.x, 0.06, p.z]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#00e5ff" />
        </mesh>
        <sprite position={[p.x, 0.25, p.z]} scale={[0.8, 0.15, 1]}>
          <spriteMaterial map={tex} transparent opacity={0.9} />
        </sprite>
        {measuring && (
          <sprite position={[p.x, 0.4, p.z]} scale={[0.6, 0.12, 1]}>
            <spriteMaterial map={useMemo(() => makeLabel('Click 2nd point...', '#006064cc', '#80deea', 128, 24), [])} transparent opacity={0.8} />
          </sprite>
        )}
      </group>
    );
  }

  if (points.length < 2) return null;

  const p0 = points[0];
  const p1 = points[1];
  const midX = (p0.x + p1.x) / 2;
  const midZ = (p0.z + p1.z) / 2;
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;

  const positions = useMemo(() => new Float32Array([p0.x, 0.06, p0.z, p1.x, 0.06, p1.z]), [p0, p1]);
  const distTex = useMemo(() => makeLabel(`${distance.toFixed(3)}m`, '#006064', '#00e5ff', 160, 28), [distance]);
  const p0Tex = useMemo(() => makeLabel(`(${p0.x.toFixed(2)}, ${p0.z.toFixed(2)})`, '#006064cc', '#00e5ff', 128, 24), [p0.x, p0.z]);
  const p1Tex = useMemo(() => makeLabel(`(${p1.x.toFixed(2)}, ${p1.z.toFixed(2)})`, '#006064cc', '#00e5ff', 128, 24), [p1.x, p1.z]);

  return (
    <group>
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineDashedMaterial color="#00e5ff" dashSize={0.15} gapSize={0.08} linewidth={2} />
      </line>
      <sprite position={[midX, 0.3, midZ]} scale={[1.0, 0.18, 1]}>
        <spriteMaterial map={distTex} transparent opacity={0.95} />
      </sprite>
      <mesh position={[p0.x, 0.06, p0.z]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh position={[p1.x, 0.06, p1.z]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <sprite position={[p0.x, 0.25, p0.z]} scale={[0.8, 0.15, 1]}>
        <spriteMaterial map={p0Tex} transparent opacity={0.9} />
      </sprite>
      <sprite position={[p1.x, 0.25, p1.z]} scale={[0.8, 0.15, 1]}>
        <spriteMaterial map={p1Tex} transparent opacity={0.9} />
      </sprite>
    </group>
  );
}
