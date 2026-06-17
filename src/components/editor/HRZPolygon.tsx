import * as THREE from 'three';
import { Vec2 } from '../../utils/coordinate';

interface HRZPolygonProps {
  vertices: Vec2[];
  color?: string;
  opacity?: number;
  closed?: boolean;
}

export function HRZPolygon({ vertices, color = '#e53935', opacity = 0.3, closed = true }: HRZPolygonProps) {
  if (vertices.length === 0) return null;

  const linePoints = vertices.map((v) => new THREE.Vector3(v.x, 0.02, v.z));
  if (closed && vertices.length >= 2) {
    linePoints.push(new THREE.Vector3(vertices[0].x, 0.02, vertices[0].z));
  }

  return (
    <group>
      {vertices.length >= 3 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <shapeGeometry args={[createShape(vertices)]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} side={2} />
        </mesh>
      )}
      {linePoints.length >= 2 && (
        <line>
          <bufferAttribute
            attach="geometry-attributes-position"
            count={linePoints.length}
            array={new Float32Array(linePoints.flatMap((p) => [p.x, p.y, p.z]))}
            itemSize={3}
          />
          <lineBasicMaterial color={color} linewidth={2} />
        </line>
      )}
      {vertices.map((v, i) => (
        <mesh key={i} position={[v.x, 0.05, v.z]}>
          <sphereGeometry args={[i === 0 ? 0.12 : 0.08, 16, 16]} />
          <meshBasicMaterial color={i === 0 ? '#fdd835' : color} />
        </mesh>
      ))}
    </group>
  );
}

function createShape(vertices: Vec2[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(vertices[0].x, -vertices[0].z);
  for (let i = 1; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, -vertices[i].z);
  }
  shape.closePath();
  return shape;
}
