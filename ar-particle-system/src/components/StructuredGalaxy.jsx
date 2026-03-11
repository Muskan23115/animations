import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export const StructuredGalaxy = ({ parentRef }) => {
  const streaksRef = useRef();
  const ringsRef = useRef();
  const textGroupRef = useRef();
  
  const streakCount = 3000;

  // --- 1. Branching/Lightning Particle Streaks ---
  const [streakPos, streakColors, streakTargets] = useMemo(() => {
    const pos = new Float32Array(streakCount * 3);
    const col = new Float32Array(streakCount * 3);
    const tgt = new Float32Array(streakCount * 3);
    
    const colors = [
      new THREE.Color(2.0, 0.5, 3.0), // Deep purple/pink
      new THREE.Color(1.0, 1.5, 3.0), // Cyan/Blue
      new THREE.Color(3.0, 3.0, 3.0)  // Sharp white
    ];

    // Create 'branches'
    const numBranches = 8;
    for (let i = 0; i < streakCount; i++) {
        // Start center
        pos[i*3] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
        
        // Pick a branch
        const branchIdx = i % numBranches;
        const branchAngle = (Math.PI * 2 / numBranches) * branchIdx;
        
        // Distance along branch
        const r = Math.pow(Math.random(), 1.5) * 8.0; 
        
        // Add fractal/lightning jitter based on distance
        const jitter = r * 0.2;
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;
        const jz = (Math.random() - 0.5) * jitter;
        
        // Bend the branch slightly like a galaxy arm
        const theta = branchAngle + r * 0.15;
        
        tgt[i*3] = Math.cos(theta) * r + jx;
        tgt[i*3+1] = (Math.random()-0.5) * Math.max(0.1, 2.0 - r*0.2) + jy; // Flattened Y
        tgt[i*3+2] = Math.sin(theta) * r + jz;

        // Color based on branch and distance
        const c = colors[Math.floor(Math.random() * colors.length)];
        col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    return [pos, col, tgt];
  }, []);

  // --- 2. Large Orbital Rings ---
  const ringGeo = useMemo(() => {
     return [
       new THREE.TorusGeometry(3.0, 0.02, 16, 100),
       new THREE.TorusGeometry(5.0, 0.015, 16, 120),
       new THREE.TorusGeometry(7.0, 0.01, 16, 150)
     ];
  }, []);

  useFrame((state) => {
    if (!parentRef?.current?.visible) return;
    
    const spawnTime = parentRef.current.userData.spawnTime || performance.now();
    const elapsed = (performance.now() - spawnTime) / 1000;
    
    // Animate Streaks expanding
    if (streaksRef.current) {
        const arr = streaksRef.current.geometry.attributes.position.array;
        streaksRef.current.rotation.y = elapsed * 0.1;
        
        // Rapid expansion in first 1.5s
        const exp = Math.min(1.0, elapsed * 2.0);
        // Add a slight elastic overshoot
        const bounce = exp >= 1.0 ? 1.0 : exp + Math.sin(exp * Math.PI) * 0.1;

        for (let i = 0; i < streakCount; i++) {
            const i3 = i * 3;
            const tx = streakTargets[i3] * bounce;
            const ty = streakTargets[i3+1] * bounce;
            const tz = streakTargets[i3+2] * bounce;

            // Spring physics
            arr[i3] += (tx - arr[i3]) * 0.15;
            arr[i3+1] += (ty - arr[i3+1]) * 0.15;
            arr[i3+2] += (tz - arr[i3+2]) * 0.15;
        }
        streaksRef.current.geometry.attributes.position.needsUpdate = true;
        streaksRef.current.material.opacity = Math.min(0.9, elapsed * 2.0);
    }

    // Animate Rings
    if (ringsRef.current) {
        // Rings scale up as galaxy expands
        const s = Math.min(1.0, elapsed * 1.5);
        ringsRef.current.scale.set(s,s,s);
        
        ringsRef.current.rotation.x = Math.sin(elapsed * 0.2) * 0.2;
        ringsRef.current.rotation.y = elapsed * 0.15;
        ringsRef.current.rotation.z = Math.cos(elapsed * 0.1) * 0.2;
        
        // Fade rings in
        ringsRef.current.children.forEach(child => {
            if (child.material) child.material.opacity = Math.min(0.5, elapsed * 0.5);
        });
    }

    // Animate Text Debris
    if (textGroupRef.current) {
        const s = Math.min(1.0, elapsed * 1.2);
        textGroupRef.current.scale.set(s,s,s);
        textGroupRef.current.rotation.y = -elapsed * 0.1; // Counter rotate
    }
  });

  return (
    <group>
      {/* 1. Branching Particle Streaks */}
      <points ref={streaksRef}>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={streakPos.length/3} array={streakPos} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={streakColors.length/3} array={streakColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} vertexColors={true} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </points>

      {/* 2. Structured Orbital Rings */}
      <group ref={ringsRef}>
          <mesh geometry={ringGeo[0]} rotation={[Math.PI/3, 0, 0]}>
              <meshBasicMaterial color={[1.5, 0.5, 2.0]} transparent opacity={0} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[1]} rotation={[-Math.PI/5, Math.PI/4, 0]}>
              <meshBasicMaterial color={[0.5, 1.5, 3.0]} transparent opacity={0} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[2]} rotation={[Math.PI/6, -Math.PI/3, 0]}>
              <meshBasicMaterial color={[2.0, 2.0, 3.0]} transparent opacity={0} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
      </group>

      {/* 3. Floating Numbers/Text in Debris */}
      <group ref={textGroupRef}>
          <Text position={[4, 1, 2]} fontSize={0.6} color={[2.0, 2.0, 3.0]} material-toneMapped={false} transparent opacity={0.8}>42</Text>
          <Text position={[-3, -2, -4]} fontSize={0.8} color={[3.0, 1.0, 2.0]} material-toneMapped={false} transparent opacity={0.6}>0xEA</Text>
          <Text position={[2, -1.5, -5]} fontSize={0.5} color={[1.0, 3.0, 3.0]} material-toneMapped={false} transparent opacity={0.9}>99</Text>
          <Text position={[-5, 2, 1]} fontSize={0.7} color={[2.5, 0.5, 3.0]} material-toneMapped={false} transparent opacity={0.7}>101</Text>
      </group>
      
      {/* Intense core to anchor it */}
      <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={[3.0, 3.0, 3.0]} toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending}/>
      </mesh>
      <mesh>
          <sphereGeometry args={[1.0, 32, 32]} />
          <meshBasicMaterial color={[2.0, 0.5, 3.0]} toneMapped={false} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};
