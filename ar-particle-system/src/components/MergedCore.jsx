import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const MergedCore = ({ parentRef }) => {
  const pointsRef = useRef();
  const ringRef = useRef();
  const particleCount = 2500;

  // Set up swirling core particles
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    
    // Deep purple and magenta palette
    const colorChoices = [
      new THREE.Color('#8800ff').multiplyScalar(1.5), // Deep Purple
      new THREE.Color('#ff00aa').multiplyScalar(1.5), // Magenta
      new THREE.Color('#ff00ff').multiplyScalar(2.0), // Bright Pink (hot core)
    ];

    for (let i = 0; i < particleCount; i++) {
      // Initialize in a dense cluster
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      // Bias towards center for density
      const r = Math.pow(Math.random(), 2.0) * 1.5; 
      
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
    
    // Rotate core rapidly
    if (pointsRef.current) {
        pointsRef.current.rotation.y = t * 1.5;
        pointsRef.current.rotation.x = t * 0.8;
        pointsRef.current.rotation.z = Math.sin(t) * 0.5;

        // Make the particles vibrate violently (unstable energy)
        const arr = pointsRef.current.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Wobble
            arr[i3] += (Math.random() - 0.5) * 0.05;
            arr[i3 + 1] += (Math.random() - 0.5) * 0.05;
            arr[i3 + 2] += (Math.random() - 0.5) * 0.05;
            
            // Constrain back to sphere if they wander too far
            const x = arr[i3], y = arr[i3+1], z = arr[i3+2];
            const dist = Math.sqrt(x*x + y*y + z*z);
            if (dist > 1.8) {
                const nx = x/dist, ny = y/dist, nz = z/dist;
                arr[i3] = nx * 1.5;
                arr[i3+1] = ny * 1.5;
                arr[i3+2] = nz * 1.5;
            }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Unstable binding rings
    if (ringRef.current) {
        ringRef.current.rotation.x = t * 2.0;
        ringRef.current.rotation.y = t * -3.0;
        // Pulse ring scale slightly
        const s = 1.0 + Math.sin(t * 10.0) * 0.1;
        ringRef.current.scale.set(s,s,s);
    }
  });

  return (
    <group>
      {/* Central swirling unstable particle core */}
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
            size={0.06}
            vertexColors={true}
            transparent={true}
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
        />
      </points>

      {/* Binding Rings trying to contain the energy */}
      <group ref={ringRef}>
          <mesh rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[1.6, 0.02, 16, 64]} />
              <meshBasicMaterial color={[1.0, 0.2, 2.0]} toneMapped={false} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[0, Math.PI/2, 0]}>
              <torusGeometry args={[1.7, 0.01, 16, 64]} />
              <meshBasicMaterial color={[2.0, 0.2, 1.0]} toneMapped={false} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[Math.PI/4, Math.PI/4, 0]}>
              <torusGeometry args={[1.8, 0.03, 16, 64]} />
              <meshBasicMaterial color={[3.0, 3.0, 3.0]} toneMapped={false} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
          </mesh>
      </group>

      {/* Intense center glow */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color={[2.0, 0.5, 3.0]} toneMapped={false} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};
