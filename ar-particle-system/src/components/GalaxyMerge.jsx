import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const GalaxyMerge = ({ parentRef }) => {
  const pointsRef = useRef();
  const particleCount = 20000; // Massive particle system

  const [positions, colors, randoms] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const rnd = new Float32Array(particleCount);
    
    const colorChoices = [
      new THREE.Color('#ff00aa'), // pink
      new THREE.Color('#8800ff'), // purple
      new THREE.Color('#ffffff'), // white
      new THREE.Color('#00ffff'), // bright cyan
    ];

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      rnd[i] = Math.random();
    }
    return [pos, col, rnd];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !parentRef?.current?.visible) return;
    
    const spawnTime = parentRef.current.userData.spawnTime || performance.now();
    const t = (performance.now() - spawnTime) / 1000;
    const array = pointsRef.current.geometry.attributes.position.array;
    
    // Rotate entire galaxy smoothly
    pointsRef.current.rotation.y = t * 0.15;
    pointsRef.current.rotation.z = t * 0.05;

    // Fast expansion phase
    const baseRadius = Math.min(t * 12, 8) + Math.sin(t) * 0.5;

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 4 spiral arms
        const arm = Math.floor(randoms[i] * 4); 
        const armOffset = (Math.PI * 2 / 4) * arm;
        const distFromCenter = randoms[i] * baseRadius + (Math.random() * 0.5);
        const theta = distFromCenter * 1.5 + armOffset + (t * 0.2); 
        
        // Target pos
        const tx = Math.cos(theta) * distFromCenter;
        // Thicker at the center, thinner at the edges
        const ty = (Math.random() - 0.5) * Math.max(0.1, (2.0 - distFromCenter/(baseRadius*0.5))); 
        const tz = Math.sin(theta) * distFromCenter;

        // Spring/Lerp towards target for smooth but fast explosion
        array[i3] += (tx - array[i3]) * 0.05;
        array[i3 + 1] += (ty - array[i3 + 1]) * 0.05;
        array[i3 + 2] += (tz - array[i3 + 2]) * 0.05;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
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
        size={0.03}
        vertexColors={true}
        transparent={true}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
