import { useMemo, useRef } from 'react';
import * as THREE from 'three';
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

  const hasTwo = points.length >= 2;
  const hasOne = points.length === 1;
  const p0 = points[0];
  const p1 = points[1];

  const distLabel = distance > 0 ? `${distance.toFixed(3)}m` : '';
  const p0Label = p0 ? `(${p0.x.toFixed(2)}, ${p0.z.toFixed(2)})` : '';
  const p1Label = p1 ? `(${p1.x.toFixed(2)}, ${p1.z.toFixed(2)})` : '';

  const positions = useMemo(() => {
    if (!hasTwo || !p0 || !p1) return null;
    return new Float32Array([p0.x, 0.06, p0.z, p1.x, 0.06, p1.z]);
  }, [hasTwo, p0, p1]);

  const distTex = useMemo(() => {
    if (!distLabel) return null;
    return makeLabel(distLabel, '#006064', '#00e5ff', 160, 28);
  }, [distLabel]);

  const p0Tex = useMemo(() => {
    if (!p0Label) return null;
    return makeLabel(p0Label, '#006064cc', '#00e5ff', 128, 24);
  }, [p0Label]);

  const p1Tex = useMemo(() => {
    if (!p1Label) return null;
    return makeLabel(p1Label, '#006064cc', '#00e5ff', 128, 24);
  }, [p1Label]);

  const hintTex = useMemo(() => makeLabel('Click 2nd point...', '#006064cc', '#80deea', 128, 24), []);

  if (points.length === 0 && !measuring) return null;

  return (
    <group>
      {hasOne && p0 && (
        <>
          <mesh position={[p0.x, 0.06, p0.z]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#00e5ff" />
          </mesh>
          {p0Tex && (
            <sprite position={[p0.x, 0.25, p0.z]} scale={[0.8, 0.15, 1]}>
              <spriteMaterial map={p0Tex} transparent opacity={0.9} />
            </sprite>
          )}
          {measuring && (
            <sprite position={[p0.x, 0.4, p0.z]} scale={[0.6, 0.12, 1]}>
              <spriteMaterial map={hintTex} transparent opacity={0.8} />
            </sprite>
          )}
        </>
      )}
      {hasTwo && p0 && p1 && positions && (
        <>
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
          {distTex && (
            <sprite position={[(p0.x + p1.x) / 2, 0.3, (p0.z + p1.z) / 2]} scale={[1.0, 0.18, 1]}>
              <spriteMaterial map={distTex} transparent opacity={0.95} />
            </sprite>
          )}
          <mesh position={[p0.x, 0.06, p0.z]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#00e5ff" />
          </mesh>
          <mesh position={[p1.x, 0.06, p1.z]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#00e5ff" />
          </mesh>
          {p0Tex && (
            <sprite position={[p0.x, 0.25, p0.z]} scale={[0.8, 0.15, 1]}>
              <spriteMaterial map={p0Tex} transparent opacity={0.9} />
            </sprite>
          )}
          {p1Tex && (
            <sprite position={[p1.x, 0.25, p1.z]} scale={[0.8, 0.15, 1]}>
              <spriteMaterial map={p1Tex} transparent opacity={0.9} />
            </sprite>
          )}
        </>
      )}
    </group>
  );
}
