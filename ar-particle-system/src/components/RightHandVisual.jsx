import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export const RightHandVisual = ({ position }) => {
  const groupRef = useRef();
  
  // Create massive cinematic orbital rings (tripled radius vs original)
  const ringGeometries = useMemo(() => {
    return [
      new THREE.TorusGeometry(1.5, 0.015, 16, 128), // Inner
      new THREE.TorusGeometry(2.4, 0.015, 16, 128), // Middle
      new THREE.TorusGeometry(3.3, 0.015, 16, 128), // Outer
    ];
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // Smooth, cinematic rotation
    groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.5;
    groupRef.current.rotation.y = t * 0.3;
    groupRef.current.rotation.z = Math.cos(t * 0.15) * 0.5;
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        
        {/* Ring 1 - Inner */}
        <mesh geometry={ringGeometries[0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={[1.5, 1.5, 1.5]} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <Text
          position={[1.5, 0, 0]}
          fontSize={0.4}
          color={[2, 2, 2]} // Overdriven color for bloom
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
        >
          01
        </Text>

        {/* Ring 2 - Middle */}
        <mesh geometry={ringGeometries[1]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
          <meshBasicMaterial color={[0.5, 1.5, 1.0]} transparent opacity={0.5} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <Text
          position={[0, 2.4, 0]}
          fontSize={0.5}
          color={[1.0, 3.0, 2.0]} 
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
        >
          02
        </Text>
        
        {/* Ring 3 - Outer */}
        <mesh geometry={ringGeometries[2]} rotation={[-Math.PI / 4, Math.PI / 6, 0]}>
          <meshBasicMaterial color={[1.0, 0.5, 2.0]} transparent opacity={0.4} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <Text
          position={[-3.3, 0, 0]}
          fontSize={0.6}
          color={[2.0, 1.0, 4.0]}
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
        >
          03
        </Text>
      </group>
      
      {/* Central bright core */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={[3, 3, 3]} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};
