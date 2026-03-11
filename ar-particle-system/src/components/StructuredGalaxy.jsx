import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export const StructuredGalaxy = ({ parentRef }) => {
  const groupRef = useRef();
  const streaksRef = useRef();
  const ringsRef = useRef();
  const textGroupRef = useRef();
  
  const streakCount = 5000;

  // --- 1. Morphing Particles (Sphere -> Branching Galaxy) ---
  const [streakColors, sphereStarts, galaxyTargets] = useMemo(() => {
    const col = new Float32Array(streakCount * 3);
    const starts = new Float32Array(streakCount * 3);
    const tgt = new Float32Array(streakCount * 3);
    
    const colors = [
      new THREE.Color(2.0, 0.5, 3.0), // Deep purple/pink
      new THREE.Color(1.0, 1.5, 3.0), // Cyan/Blue
      new THREE.Color(3.0, 3.0, 3.0), // Sharp white
      new THREE.Color(4.0, 1.0, 4.0)  // Emissive magenta
    ];

    const numBranches = 12; // Starburst/lightning arms
    for (let i = 0; i < streakCount; i++) {
        // --- START STATE (Dense Sphere, matches Merged Core) ---
        const sTheta = Math.random() * Math.PI * 2;
        const sPhi = Math.acos((Math.random() * 2) - 1);
        const sR = Math.pow(Math.random(), 2.0) * 1.5; 
        starts[i*3] = sR * Math.sin(sPhi) * Math.cos(sTheta);
        starts[i*3+1] = sR * Math.sin(sPhi) * Math.sin(sTheta);
        starts[i*3+2] = sR * Math.cos(sPhi);

        // --- TARGET STATE (Structured Galaxy Web) ---
        const branchIdx = i % numBranches;
        const branchAngle = (Math.PI * 2 / numBranches) * branchIdx;
        const r = Math.pow(Math.random(), 1.5) * 8.0; 
        
        const jitter = Math.max(0.1, r * 0.25);
        const jx = (Math.random() - 0.5) * jitter * 2;
        const jy = (Math.random() - 0.5) * Math.max(0.2, 2.0 - r*0.2) * 2;
        const jz = (Math.random() - 0.5) * jitter * 2;
        
        const theta = branchAngle + r * 0.15;
        
        tgt[i*3] = Math.cos(theta) * r + jx;
        tgt[i*3+1] = jy; 
        tgt[i*3+2] = Math.sin(theta) * r + jz;

        const c = colors[Math.floor(Math.random() * colors.length)];
        col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    return [col, starts, tgt];
  }, []);

  // Mutable positions that lerp
  const streakPos = useMemo(() => new Float32Array(streakCount * 3), []);

  const ringGeo = useMemo(() => {
     return [
       new THREE.TorusGeometry(3.5, 0.02, 16, 128),
       new THREE.TorusGeometry(6.0, 0.015, 16, 150),
       new THREE.TorusGeometry(8.5, 0.01, 16, 200)
     ];
  }, []);

  // Track spawn state to reset geometry
  useFrame((state, delta) => {
    if (!parentRef?.current?.visible) return;
    
    // Prevent delta explosion on lag
    const dt = Math.min(delta, 0.1); 
    const spawnTime = parentRef.current.userData.spawnTime || performance.now();
    const elapsed = (performance.now() - spawnTime) / 1000;
    
    // --- 1. FORCE THE SCALE (The Boom) ---
    // Instantly explode from whatever core scale it was, up to MASSIVE 15x
    if (parentRef.current.scale.x < 14.9) {
        parentRef.current.scale.lerp(new THREE.Vector3(15, 15, 15), 0.1);
    }

    // --- 2. SCATTER THE PARTICLES (Sphere -> Galaxy Lerp) ---
    if (streaksRef.current) {
        const arr = streaksRef.current.geometry.attributes.position.array;
        
        // Reset positions exactly when spawned
        if (streaksRef.current.userData.lastSpawn !== spawnTime) {
            streaksRef.current.userData.lastSpawn = spawnTime;
            for(let i=0; i<arr.length; i++) arr[i] = sphereStarts[i];
        }

        // Interpolation factor (0 to 1 over first second)
        const lerpFactor = Math.min(1.0, elapsed * 1.5);
        
        for (let i = 0; i < streakCount; i++) {
            const i3 = i * 3;
            // Morph from dense sphere starts toward structured galaxy targets
            const targetX = THREE.MathUtils.lerp(sphereStarts[i3], galaxyTargets[i3], lerpFactor);
            const targetY = THREE.MathUtils.lerp(sphereStarts[i3+1], galaxyTargets[i3+1], lerpFactor);
            const targetZ = THREE.MathUtils.lerp(sphereStarts[i3+2], galaxyTargets[i3+2], lerpFactor);
            
            // Add alive wobble
            const wx = Math.sin(elapsed * 2.0 + i) * 0.05;
            const wy = Math.cos(elapsed * 1.5 + i) * 0.05;
            const wz = Math.sin(elapsed * 1.8 + i) * 0.05;

            // Apply spring logic to smoothly hit the moving target
            arr[i3] += (targetX + wx - arr[i3]) * 0.1;
            arr[i3+1] += (targetY + wy - arr[i3+1]) * 0.1;
            arr[i3+2] += (targetZ + wz - arr[i3+2]) * 0.1;
        }
        streaksRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // --- 3. KEEP IT SPINNING (Continuous Infinite Rotation) ---
    if (groupRef.current) {
        groupRef.current.rotation.y += 0.002;
        groupRef.current.rotation.z -= 0.001;
        groupRef.current.rotation.x = Math.sin(elapsed * 0.5) * 0.1; // slow tilt
    }

    // Internal Rings
    if (ringsRef.current) {
        ringsRef.current.rotation.x += 0.005;
        ringsRef.current.rotation.y -= 0.003;
        
        // Fade in
        ringsRef.current.children.forEach(child => {
            if (child.material) child.material.opacity = Math.min(0.5, elapsed * 2.0);
        });
    }

    // Floating Text
    if (textGroupRef.current) {
        textGroupRef.current.rotation.y += 0.004;
        textGroupRef.current.children.forEach(child => {
            if (child.material) child.material.opacity = Math.min(0.8, elapsed * 2.0);
        });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Dynamic Particle Streaks */}
      <points ref={streaksRef}>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={streakPos.length/3} array={streakPos} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={streakColors.length/3} array={streakColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.06} 
          vertexColors={true} 
          transparent={true}
          opacity={0.9} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          toneMapped={false} 
        />
      </points>

      {/* Structured Orbital Rings */}
      <group ref={ringsRef}>
          <mesh geometry={ringGeo[0]} rotation={[Math.PI/3, 0, 0]}>
              <meshBasicMaterial color={[1.5, 0.5, 2.0]} transparent opacity={0.0} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[1]} rotation={[-Math.PI/5, Math.PI/4, 0]}>
              <meshBasicMaterial color={[0.5, 1.5, 3.0]} transparent opacity={0.0} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[2]} rotation={[Math.PI/6, -Math.PI/3, 0]}>
              <meshBasicMaterial color={[2.0, 2.0, 3.0]} transparent opacity={0.0} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
      </group>

      {/* Floating Numbers/Text in Debris */}
      <group ref={textGroupRef}>
          <Text position={[6, 3, 4]} fontSize={1.0} color={[3.0, 3.0, 4.0]} material-toneMapped={false} transparent opacity={0.0}>THROW()</Text>
          <Text position={[-5, -4, -3]} fontSize={1.5} color={[4.0, 1.0, 3.0]} material-toneMapped={false} transparent opacity={0.0}>0xEA</Text>
          <Text position={[4, -3, -8]} fontSize={0.8} color={[1.0, 4.0, 4.0]} material-toneMapped={false} transparent opacity={0.0}>[42]</Text>
          <Text position={[-8, 4, 3]} fontSize={1.2} color={[2.5, 1.5, 4.0]} material-toneMapped={false} transparent opacity={0.0}>GALAXY</Text>
      </group>
      
      {/* Intense core to anchor it */}
      <mesh>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshBasicMaterial color={[4.0, 4.0, 4.0]} toneMapped={false} transparent opacity={0.8} blending={THREE.AdditiveBlending}/>
      </mesh>
    </group>
  );
};
