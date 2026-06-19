import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useCameraStore } from '../../stores/cameraStore';
import { useRobotPoseStore } from '../../stores/robotPoseStore';

interface CameraControlsProps {
  mode: 'navigate' | 'hrz' | 'hrp' | 'mapedit';
  followRobot: boolean;
}

const lerpTarget = new THREE.Vector3();

export function CameraControls({ mode, followRobot }: CameraControlsProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const appliedKey = useRef('');
  const snapshotApplied = useRef(false);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.mouseButtons = {
        LEFT: -1,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    }
  }, [mode]);

  useEffect(() => {
    const cam = useCameraStore.getState();
    if (controlsRef.current && !snapshotApplied.current) {
      camera.position.set(...cam.position);
      controlsRef.current.target.set(...cam.target);
      controlsRef.current.update();
      appliedKey.current = `${cam.position.join(',')}-${cam.target.join(',')}`;
      snapshotApplied.current = true;
    }
  }, [camera]);

  useEffect(() => {
    snapshotApplied.current = false;
  }, [useCameraStore.getState().position, useCameraStore.getState().target]);

  useFrame(() => {
    if (!controlsRef.current) return;

    if (followRobot) {
      const pose = useRobotPoseStore.getState().pose;
      lerpTarget.set(pose.x, 0, pose.z);
      controlsRef.current.target.lerp(lerpTarget, 0.05);
    }

    const t = controlsRef.current.target;
    const p = camera.position;
    const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}-${t.x.toFixed(2)},${t.y.toFixed(2)},${t.z.toFixed(2)}`;
    if (key !== appliedKey.current) {
      appliedKey.current = key;
      useCameraStore.getState().setPosition([p.x, p.y, p.z]);
      useCameraStore.getState().setTarget([t.x, t.y, t.z]);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={1}
      maxDistance={100}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}
