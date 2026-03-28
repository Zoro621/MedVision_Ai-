"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function CTScanRing() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <torusGeometry args={[2.5, 0.08, 16, 100]} />
      <meshBasicMaterial color="#00C2FF" wireframe transparent opacity={0.8} />
    </mesh>
  );
}

function ScanSlices() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const slices = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        position: [0, (i - 2) * 0.4, 0] as [number, number, number],
        opacity: 0.15 + i * 0.05,
      })),
    []
  );

  return (
    <group ref={groupRef}>
      {slices.map((slice, i) => (
        <mesh key={i} position={slice.position} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2, 64]} />
          <meshBasicMaterial
            color="#00C2FF"
            transparent
            opacity={slice.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function NeuralNodes() {
  const groupRef = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    const positions: [number, number, number][] = [
      [1, 0.5, 0.5],
      [-0.8, 0.3, 0.8],
      [0.5, -0.7, 0.3],
      [-0.5, 0.8, -0.5],
      [0.8, -0.3, -0.7],
      [-0.3, -0.5, 0.6],
    ];
    return positions;
  }, []);

  const connections = useMemo(() => {
    const lines: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 3],
      [1, 4],
    ];
    return lines;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={1.2}>
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#4EFFA0" />
        </mesh>
      ))}
      {connections.map(([start, end], i) => {
        const points = [
          new THREE.Vector3(...nodes[start]),
          new THREE.Vector3(...nodes[end]),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={i}>
            <bufferGeometry attach="geometry" {...geometry} />
            <lineBasicMaterial color="#4EFFA0" transparent opacity={0.3} />
          </line>
        );
      })}
    </group>
  );
}

function ParticleField() {
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += 0.002;
        if (positions[i * 3 + 1] > 7.5) {
          positions[i * 3 + 1] = -7.5;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00C2FF"
        size={0.03}
        sizeAttenuation
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

function MouseParallax({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  useFrame(({ pointer }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        (pointer.x * viewport.width) / 100,
        0.05
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        (pointer.y * viewport.height) / 100,
        0.05
      );
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export function ThreeScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <MouseParallax>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <CTScanRing />
          </Float>
          <ScanSlices />
          <NeuralNodes />
        </MouseParallax>
        <ParticleField />
      </Canvas>
    </div>
  );
}
