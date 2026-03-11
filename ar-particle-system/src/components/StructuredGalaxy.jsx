import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export const StructuredGalaxy = ({ parentRef }) => {
  const streaksRef = useRef();
  const ringsRef = useRef();
  const textGroupRef = useRef();
  
  const streakCount = 5000;

  // --- 1. Branching/Lightning Particle Streaks ---
  const [streakColors, streakTargets, driftFactors] = useMemo(() => {
    const col = new Float32Array(streakCount * 3);
    const tgt = new Float32Array(streakCount * 3);
    const drift = new Float32Array(streakCount);
    
    const colors = [
      new THREE.Color(2.0, 0.5, 3.0), // Deep purple/pink
      new THREE.Color(1.0, 1.5, 3.0), // Cyan/Blue
      new THREE.Color(3.0, 3.0, 3.0), // Sharp white
      new THREE.Color(4.0, 1.0, 4.0)  // Emissive magenta
    ];

    const numBranches = 12; // Starburst/lightning arms
    for (let i = 0; i < streakCount; i++) {
        // Pick a branch
        const branchIdx = i % numBranches;
        const branchAngle = (Math.PI * 2 / numBranches) * branchIdx;
        
        // Distance along branch (power random for dense core)
        const r = Math.pow(Math.random(), 1.5) * 12.0; 
        
        // Jitter based on distance (fractal branching feel)
        const jitter = Math.max(0.1, r * 0.25);
        const jx = (Math.random() - 0.5) * jitter * 2;
        const jy = (Math.random() - 0.5) * Math.max(0.2, 2.0 - r*0.2) * 2;
        const jz = (Math.random() - 0.5) * jitter * 2;
        
        // Bend arm slightly like a galaxy
        const theta = branchAngle + r * 0.15;
        
        tgt[i*3] = Math.cos(theta) * r + jx;
        tgt[i*3+1] = jy; 
        tgt[i*3+2] = Math.sin(theta) * r + jz;

        // Color
        const c = colors[Math.floor(Math.random() * colors.length)];
        col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
        
        // Calculate drift potential for outer points
        drift[i] = (r > 6.0) ? (Math.random() * 0.5 + 0.5) : 0;
    }
    return [col, tgt, drift];
  }, []);

  const streakPos = useMemo(() => new Float32Array(streakCount * 3), []);

  // --- 2. Large Orbital Rings ---
  const ringGeo = useMemo(() => {
     return [
       new THREE.TorusGeometry(4.5, 0.02, 16, 128),
       new THREE.TorusGeometry(7.0, 0.015, 16, 150),
       new THREE.TorusGeometry(9.5, 0.01, 16, 200)
     ];
  }, []);

  useFrame(() => {
    if (!parentRef?.current?.visible) return;
    
    const spawnTime = parentRef.current.userData.spawnTime || performance.now();
    const elapsed = (performance.now() - spawnTime) / 1000;
    
    // 1. The Expansion Tween (0 to massive over 1.5s)
    const progress = Math.min(1.0, elapsed / 1.5);
    // Smooth easing out (easeOutQuart)
    const easeScale = 1 - Math.pow(1 - progress, 4); 

    // --- CONTINUOUS ANIMATION: Streaks ---
    if (streaksRef.current) {
        // Slowly rotate entire particle group continuously
        streaksRef.current.rotation.y += 0.002;
        streaksRef.current.rotation.z -= 0.001;
        
        const arr = streaksRef.current.geometry.attributes.position.array;
        
        for (let i = 0; i < streakCount; i++) {
            const i3 = i * 3;
            
            const tx = streakTargets[i3];
            const ty = streakTargets[i3+1];
            const tz = streakTargets[i3+2];
            
            // Lingering Sparkles: outer particles bleed into space infinitely
            const staticDrift = driftFactors[i];
            const currentDrift = 1.0 + (staticDrift * elapsed * 0.15); // Expands slow and forever
            
            // Alive: slow sine-wave wobble 
            const wx = Math.sin(elapsed * 2.0 + i) * 0.2;
            const wy = Math.cos(elapsed * 1.5 + i) * 0.2;
            const wz = Math.sin(elapsed * 1.8 + i) * 0.2;

            // Apply base target * continuous drift * intro tween scale + living wobble!
            arr[i3] = (tx * currentDrift + wx) * easeScale;
            arr[i3+1] = (ty + wy) * easeScale;
            arr[i3+2] = ((tz * currentDrift) + 5.0 + wz) * easeScale - 5.0; // Pops out in Z slightly as it scales
        }
        streaksRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Initial flash fade to base opacity
        const baseOpacity = 0.6;
        const flashDecay = Math.max(0, Math.exp(-elapsed * 4.0)); // exponential fade from +1.0
        streaksRef.current.material.opacity = Math.min(1.0, baseOpacity + flashDecay * 0.5);
        streaksRef.current.material.size = 0.05 + Math.sin(elapsed * 3.0) * 0.01; // Global breathing size
    }

    // --- CONTINUOUS ANIMATION: Rings ---
    if (ringsRef.current) {
        // Expand Rings smoothly
        ringsRef.current.scale.set(easeScale, easeScale, easeScale);
        
        // Constant, living rotation
        ringsRef.current.rotation.x += 0.001;
        ringsRef.current.rotation.y += 0.003;
        ringsRef.current.rotation.z -= 0.002;
        
        // Fade in
        ringsRef.current.children.forEach(child => {
            if (child.material) {
                child.material.opacity = Math.min(0.5, elapsed * 0.5);
            }
        });
    }

    // --- CONTINUOUS ANIMATION: Text Debris ---
    if (textGroupRef.current) {
        textGroupRef.current.scale.set(easeScale, easeScale, easeScale);
        
        // Constant, living rotation
        textGroupRef.current.rotation.y -= 0.004; 
        textGroupRef.current.rotation.x += 0.001; 
    }
  });

  return (
    <group>
      {/* 1. Alive Particle Streaks */}
      <points ref={streaksRef}>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={streakPos.length/3} array={streakPos} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={streakColors.length/3} array={streakColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.06} 
          vertexColors={true} 
          transparent={true}
          opacity={1.0} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          toneMapped={false} 
        />
      </points>

      {/* 2. Structured Orbital Rings */}
      <group ref={ringsRef}>
          <mesh geometry={ringGeo[0]} rotation={[Math.PI/3, 0, 0]}>
              <meshBasicMaterial color={[1.5, 0.5, 2.0]} transparent opacity={0.5} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[1]} rotation={[-Math.PI/5, Math.PI/4, 0]}>
              <meshBasicMaterial color={[0.5, 1.5, 3.0]} transparent opacity={0.4} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[2]} rotation={[Math.PI/6, -Math.PI/3, 0]}>
              <meshBasicMaterial color={[2.0, 2.0, 3.0]} transparent opacity={0.3} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
      </group>

      {/* 3. Floating Numbers/Text in Debris */}
      <group ref={textGroupRef}>
          <Text position={[6, 3, 4]} fontSize={1.0} color={[3.0, 3.0, 4.0]} material-toneMapped={false} transparent opacity={0.9}>THROW()</Text>
          <Text position={[-5, -4, -3]} fontSize={1.5} color={[4.0, 1.0, 3.0]} material-toneMapped={false} transparent opacity={0.8}>0xEA</Text>
          <Text position={[4, -3, -8]} fontSize={0.8} color={[1.0, 4.0, 4.0]} material-toneMapped={false} transparent opacity={0.9}>[42]</Text>
          <Text position={[-8, 4, 3]} fontSize={1.2} color={[2.5, 1.5, 4.0]} material-toneMapped={false} transparent opacity={0.8}>GALAXY</Text>
      </group>
      
      {/* Intense core to anchor it */}
      <mesh>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial color={[4.0, 4.0, 4.0]} toneMapped={false} transparent opacity={0.6} blending={THREE.AdditiveBlending}/>
      </mesh>
    </group>
  );
};
