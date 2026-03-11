import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export const RightHandVisual = ({ position }) => {
  const groupRef = useRef();
  
  // Create orbital rings
  const ringGeometries = useMemo(() => {
    return [
      new THREE.TorusGeometry(0.5, 0.01, 16, 100),
      new THREE.TorusGeometry(0.8, 0.01, 16, 100),
      new THREE.TorusGeometry(1.1, 0.01, 16, 100),
    ];
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Complex rotation for the whole orbital group
    groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.5;
    groupRef.current.rotation.y = t * 0.5;
    groupRef.current.rotation.z = Math.cos(t * 0.3) * 0.5;
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Ring 1 - Inner */}
        <mesh geometry={ringGeometries[0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
        <Text
          position={[0.5, 0, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          01
        </Text>

        {/* Ring 2 - Middle */}
        <mesh geometry={ringGeometries[1]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
          <meshBasicMaterial color="#aaffcc" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </mesh>
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.15}
          color="#aaffcc"
          anchorX="center"
          anchorY="middle"
        >
          02
        </Text>
        
        {/* Ring 3 - Outer */}
        <mesh geometry={ringGeometries[2]} rotation={[-Math.PI / 4, Math.PI / 6, 0]}>
          <meshBasicMaterial color="#ccaaff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
        <Text
          position={[-1.1, 0, 0]}
          fontSize={0.3}
          color="#ccaaff"
          anchorX="center"
          anchorY="middle"
        >
          03
        </Text>
      </group>
      
      {/* Center Core */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};
