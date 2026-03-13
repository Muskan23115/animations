import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const MergedCore = ({ parentRef }) => {
  const pointsRef = useRef();
  const ringRef = useRef();
  const particleCount = 2500;

  // Set up scattered purple/pink square particles
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    
    // Deep purple, magenta, and pink palette
    const colorChoices = [
      new THREE.Color('#8800ff').multiplyScalar(1.5), // Deep Purple
      new THREE.Color('#ff00aa').multiplyScalar(1.5), // Magenta
      new THREE.Color('#ff00ff').multiplyScalar(2.0), // Bright Pink
      new THREE.Color('#aa00ff').multiplyScalar(1.8), // Purple
    ];

    for (let i = 0; i < particleCount; i++) {
      // Scattered cloud around the core
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      // Bias towards outer areas for scattered effect
      const r = Math.pow(Math.random(), 0.5) * 2.0; 
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (!parentRef?.current?.visible) return;
    
    const t = state.clock.getElapsedTime();
    
    // Animate scattered particles
    if (pointsRef.current) {
        pointsRef.current.rotation.y = t * 0.5;
        pointsRef.current.rotation.x = t * 0.3;
        pointsRef.current.rotation.z = t * 0.7;

        // Gentle floating motion for scattered particles
        const arr = pointsRef.current.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Subtle wobble
            arr[i3] += (Math.random() - 0.5) * 0.02;
            arr[i3 + 1] += (Math.random() - 0.5) * 0.02;
            arr[i3 + 2] += (Math.random() - 0.5) * 0.02;
            
            // Allow particles to drift further for scattered effect
            const x = arr[i3], y = arr[i3+1], z = arr[i3+2];
            const dist = Math.sqrt(x*x + y*y + z*z);
            if (dist > 2.5) {
                const nx = x/dist, ny = y/dist, nz = z/dist;
                arr[i3] = nx * 2.0;
                arr[i3+1] = ny * 2.0;
                arr[i3+2] = nz * 2.0;
            }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Bright white/pink intersecting orbital rings
    if (ringRef.current) {
        ringRef.current.rotation.x = t * 1.0;
        ringRef.current.rotation.y = t * -1.5;
        // Subtle pulsing
        const s = 1.0 + Math.sin(t * 8.0) * 0.05;
        ringRef.current.scale.set(s,s,s);
    }
  });

  return (
    <group>
      {/* Dense glowing lavender/magenta spherical core */}
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial color="#cc00ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshBasicMaterial color="#aa00cc" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Scattered purple/pink square particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
            <bufferAttribute
                attach="attributes-position"
                count={positions.length / 3}
                array={positions}
                itemSize={3}
            />
            <bufferAttribute
                attach="attributes-color"
                count={colors.length / 3}
                array={colors}
                itemSize={3}
            />
        </bufferGeometry>
        <pointsMaterial
            size={0.08}
            vertexColors={true}
            transparent={true}
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
        />
      </points>

      {/* Distinct intersecting bright white/pink orbital rings */}
      <group ref={ringRef}>
          <mesh rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[1.8, 0.03, 16, 64]} />
              <meshBasicMaterial color={[3.0, 1.0, 3.0]} toneMapped={false} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[0, Math.PI/2, 0]}>
              <torusGeometry args={[2.0, 0.02, 16, 64]} />
              <meshBasicMaterial color={[3.0, 2.0, 3.0]} toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[Math.PI/4, Math.PI/4, 0]}>
              <torusGeometry args={[2.2, 0.025, 16, 64]} />
              <meshBasicMaterial color={[4.0, 4.0, 4.0]} toneMapped={false} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          </mesh>
      </group>
    </group>
  );
};
