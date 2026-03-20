import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { BlochVector } from '../../types/quantum';

interface ClickedAngles {
  theta: number;  // polar angle from |0⟩ pole, radians [0, π]
  phi: number;    // azimuthal angle in xy-plane, radians [0, 2π)
  pos: [number, number, number]; // Three.js position for the dot marker
}

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

function BlochSphereInner({
  before,
  after,
  onSphereClick,
  clickedPos,
}: {
  before: BlochVector;
  after: BlochVector;
  onSphereClick: (a: ClickedAngles) => void;
  clickedPos: [number, number, number] | null;
}) {
  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const p = e.point.clone().normalize();
    // Invert blochToCartesian: x=p.x, y=-p.z, z=p.y
    const bx = p.x, by = -p.z, bz = p.y;
    const theta = Math.acos(Math.max(-1, Math.min(1, bz)));
    let phi = Math.atan2(by, bx);
    if (phi < 0) phi += 2 * Math.PI;
    onSphereClick({ theta, phi, pos: [p.x, p.y, p.z] });
  }

  return (
    <>
      {/* Sphere wireframe */}
      <mesh onClick={handleClick}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#1e2d4a" wireframe transparent opacity={0.6} />
      </mesh>

      {/* Invisible solid sphere for reliable raycasting */}
      <mesh onClick={handleClick}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} />
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

      {/* Clicked point marker */}
      {clickedPos && (
        <mesh position={clickedPos}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      )}
    </>
  );
}

interface BlochSphereProps {
  before: BlochVector;
  after: BlochVector;
  className?: string;
}

export function BlochSphere({ before, after, className }: BlochSphereProps) {
  const [clicked, setClicked] = useState<ClickedAngles | null>(null);

  return (
    <div className={`card-quantum p-2 ${className ?? ''}`}>
      <p className="text-xs text-gray-500 font-mono px-2 pt-1 mb-1">Bloch Sphere</p>
      <div style={{ height: 220 }}>
        <Canvas camera={{ position: [2.5, 1.5, 2.5], fov: 40 }}>
          <ambientLight intensity={0.5} />
          <BlochSphereInner
            before={before}
            after={after}
            onSphereClick={setClicked}
            clickedPos={clicked?.pos ?? null}
          />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Angle readout */}
      {clicked ? (
        <div className="mx-2 mb-2 mt-1 rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 font-mono text-xs text-yellow-300">
          <span className="mr-4">θ = {(clicked.theta * 180 / Math.PI).toFixed(1)}°</span>
          <span>φ = {(clicked.phi * 180 / Math.PI).toFixed(1)}°</span>
          <span className="ml-4 text-yellow-500/60">
            ({clicked.theta.toFixed(3)} rad, {clicked.phi.toFixed(3)} rad)
          </span>
        </div>
      ) : (
        <p className="mx-2 mb-2 mt-1 text-xs text-gray-600 font-mono italic">click sphere to read angles</p>
      )}

      <div className="flex justify-between px-3 pb-2 text-xs font-mono">
        <span className="text-quantum-cyan">|0⟩ top</span>
        <span className="text-quantum-purple">|1⟩ bottom</span>
      </div>
    </div>
  );
}
