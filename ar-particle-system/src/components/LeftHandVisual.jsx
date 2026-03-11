import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const LeftHandVisual = ({ position }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.5;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.8;
  });

  return (
    <group position={position}>
      {/* Core bright sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
      {/* Glow layer */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial 
          color="#ff2200" 
          transparent={true} 
          opacity={0.3} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial 
          color="#ff0000" 
          transparent={true} 
          opacity={0.15} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </mesh>
    </group>
  );
};
