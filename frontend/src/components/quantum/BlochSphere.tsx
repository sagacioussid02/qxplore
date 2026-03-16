import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { BlochVector } from '../../types/quantum';

function blochToCartesian(bv: BlochVector): [number, number, number] {
  return [bv.x, bv.z, -bv.y]; // remap for Three.js (Y-up): x→x, z→y, -y→z
}

function StateVector({ from, to }: { from: BlochVector; to: BlochVector }) {
  const arrowRef = useRef<THREE.ArrowHelper>(null!);
  const progress = useRef(0);
  const fromVec = new THREE.Vector3(...blochToCartesian(from));
  const toVec = new THREE.Vector3(...blochToCartesian(to));

  useFrame((_, delta) => {
    if (!arrowRef.current) return;
    progress.current = Math.min(progress.current + delta * 1.5, 1);
    const current = fromVec.clone().lerp(toVec, progress.current).normalize();
    arrowRef.current.setDirection(current);
  });

  const dir = fromVec.clone().normalize();
  const origin = new THREE.Vector3(0, 0, 0);

  return (
    <primitive
      ref={arrowRef}
      object={new THREE.ArrowHelper(dir, origin, 1.05, 0x00ffff, 0.15, 0.08)}
    />
  );
}

function BlochSphereInner({ before, after }: { before: BlochVector; after: BlochVector }) {
  // Wireframe sphere
  return (
    <>
      {/* Sphere wireframe */}
      <mesh>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#1e2d4a" wireframe transparent opacity={0.6} />
      </mesh>

      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.005, 8, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
      </mesh>

      {/* Axes */}
      <Line points={[[0, -1.3, 0], [0, 1.3, 0]]} color="#00ffff" lineWidth={1} />
      <Line points={[[-1.3, 0, 0], [1.3, 0, 0]]} color="#8b5cf6" lineWidth={1} />
      <Line points={[[0, 0, -1.3], [0, 0, 1.3]]} color="#ec4899" lineWidth={1} />

      {/* State vector arrow */}
      <StateVector from={before} to={after} />

      {/* Poles */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      <mesh position={[0, -1.15, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#8b5cf6" />
      </mesh>
    </>
  );
}

interface BlochSphereProps {
  before: BlochVector;
  after: BlochVector;
  className?: string;
}

export function BlochSphere({ before, after, className }: BlochSphereProps) {
  return (
    <div className={`card-quantum p-2 ${className ?? ''}`}>
      <p className="text-xs text-gray-500 font-mono px-2 pt-1 mb-1">Bloch Sphere</p>
      <div style={{ height: 220 }}>
        <Canvas camera={{ position: [2.5, 1.5, 2.5], fov: 40 }}>
          <ambientLight intensity={0.5} />
          <BlochSphereInner before={before} after={after} />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>
      <div className="flex justify-between px-3 pb-2 text-xs font-mono">
        <span className="text-quantum-cyan">|0⟩ top</span>
        <span className="text-quantum-purple">|1⟩ bottom</span>
      </div>
    </div>
  );
}
