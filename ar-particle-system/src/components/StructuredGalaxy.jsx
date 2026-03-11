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
  const [streakColors, streakTargets, streakVel] = useMemo(() => {
    const col = new Float32Array(streakCount * 3);
    const tgt = new Float32Array(streakCount * 3);
    const vel = new Float32Array(streakCount * 3);
    
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
        const r = Math.pow(Math.random(), 1.5) * 10.0; 
        
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
        
        vel[i*3] = 0; vel[i*3+1] = 0; vel[i*3+2] = 0;
    }
    return [col, tgt, vel];
  }, []);

  // Use empty pos array on mount, it populates on spawn
  const streakPos = useMemo(() => new Float32Array(streakCount * 3), []);

  // --- 2. Large Orbital Rings ---
  const ringGeo = useMemo(() => {
     return [
       new THREE.TorusGeometry(3.5, 0.02, 16, 128),
       new THREE.TorusGeometry(6.0, 0.015, 16, 150),
       new THREE.TorusGeometry(8.5, 0.01, 16, 200)
     ];
  }, []);

  useFrame((state, delta) => {
    if (!parentRef?.current?.visible) return;
    
    const dt = Math.min(delta, 0.1); // Prevent physics explosions on lag
    const spawnTime = parentRef.current.userData.spawnTime || performance.now();
    const elapsed = (performance.now() - spawnTime) / 1000;
    
    // --- INITIALIZATION (The Bomb) ---
    // If a new spawn occurred, reset positions and inject massive explosion velocities
    if (streaksRef.current && streaksRef.current.userData.lastSpawnTime !== spawnTime) {
       streaksRef.current.userData.lastSpawnTime = spawnTime;
       
       const arr = streaksRef.current.geometry.attributes.position.array;
       for (let i = 0; i < streakCount; i++) {
            const i3 = i * 3;
            
            // All start exactly at the origin (center of the Merged Core)
            arr[i3] = 0; arr[i3+1] = 0; arr[i3+2] = 0;
            
            // Calculate direction to target
            const tx = streakTargets[i3], ty = streakTargets[i3+1], tz = streakTargets[i3+2];
            const dist = Math.sqrt(tx*tx + ty*ty + tz*tz);
            const nX = dist > 0 ? tx/dist : (Math.random()-0.5);
            const nY = dist > 0 ? ty/dist : (Math.random()-0.5);
            const nZ = dist > 0 ? tz/dist : (Math.random()-0.5);
            
            // Splash Force! Huge initial outward velocity
            const burstForce = 30.0 + Math.random() * 60.0;
            streakVel[i3] = nX * burstForce;
            streakVel[i3+1] = nY * burstForce;
            
            // Z-Axis Pop! Explode violently forward toward the camera (+Z)
            streakVel[i3+2] = nZ * burstForce + (20.0 + Math.random() * 40.0); 
       }
    }

    // --- PHYSICS (The Web) ---
    if (streaksRef.current) {
        const arr = streaksRef.current.geometry.attributes.position.array;
        streaksRef.current.rotation.y = elapsed * 0.05; // slowly rotate over time
        
        for (let i = 0; i < streakCount; i++) {
            const i3 = i * 3;
            
            // Apply velocity to position
            arr[i3] += streakVel[i3] * dt;
            arr[i3+1] += streakVel[i3+1] * dt;
            arr[i3+2] += streakVel[i3+2] * dt;

            // Apply extreme Drag/Friction
            // High friction means they shoot fast but screech to a halt
            const drag = 6.0; 
            streakVel[i3] -= streakVel[i3] * drag * dt;
            streakVel[i3+1] -= streakVel[i3+1] * drag * dt;
            streakVel[i3+2] -= streakVel[i3+2] * drag * dt;

            // Apply Structural Spring (Pull them into their final geometric Web)
            const spring = 12.0; 
            streakVel[i3] += (streakTargets[i3] - arr[i3]) * spring * dt;
            streakVel[i3+1] += (streakTargets[i3+1] - arr[i3+1]) * spring * dt;
            streakVel[i3+2] += (streakTargets[i3+2] - arr[i3+2]) * spring * dt;
        }
        streaksRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Sparkle Trail Pulse
        // Opacity spikes to 1.0 instantly, then decays down as they settle.
        const baseOpacity = 0.6;
        const flashDecay = Math.max(0, Math.exp(-elapsed * 4.0)); // fast fade from 1.0
        streaksRef.current.material.opacity = Math.min(1.0, baseOpacity + flashDecay);
        // Pulse size slightly for an optical 'streak'
        streaksRef.current.material.size = 0.04 + flashDecay * 0.08; 
    }

    // --- RINGS ---
    if (ringsRef.current) {
        // Explode outward fast, then elastic settle
        let ringScale = Math.min(1.0, elapsed * 4.0);
        if (elapsed > 0.25) {
            // Slight elastic bounce at the end of the scale
            ringScale = 1.0 + Math.sin((elapsed - 0.25) * Math.PI * 4) * Math.exp(-elapsed * 5) * 0.1;
        }
        ringsRef.current.scale.set(ringScale, ringScale, ringScale);
        
        ringsRef.current.rotation.x = Math.sin(elapsed * 0.4) * 0.2;
        ringsRef.current.rotation.y = elapsed * 0.2;
        ringsRef.current.rotation.z = Math.cos(elapsed * 0.3) * 0.2;
        
        // Flash geometry opacity
        ringsRef.current.children.forEach(child => {
            if (child.material) {
                const baseOp = 0.4;
                const flash = Math.max(0, Math.exp(-elapsed * 3.0));
                child.material.opacity = Math.min(1.0, baseOp + flash);
            }
        });
    }

    // --- TEXT DEBRIS ---
    if (textGroupRef.current) {
        // Text shoots out, using same elastic scale
        let tScale = Math.min(1.0, elapsed * 3.0);
        if (elapsed > 0.33) {
             tScale = 1.0 + Math.sin((elapsed - 0.33) * Math.PI * 3) * Math.exp(-elapsed * 4) * 0.2;
        }
        textGroupRef.current.scale.set(tScale, tScale, tScale);
        textGroupRef.current.rotation.y = -elapsed * 0.15; 
        
        // Deep Z spread for the text group overall to match the Z-Pop
        textGroupRef.current.position.z = Math.max(0, 5.0 * Math.exp(-elapsed * 3.0));
    }
  });

  return (
    <group>
      {/* 1. True Physics Branching Particle Streaks */}
      <points ref={streaksRef}>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={streakPos.length/3} array={streakPos} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={streakColors.length/3} array={streakColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.05} 
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
              <meshBasicMaterial color={[1.5, 0.5, 2.0]} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[1]} rotation={[-Math.PI/5, Math.PI/4, 0]}>
              <meshBasicMaterial color={[0.5, 1.5, 3.0]} transparent opacity={0.5} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
          <mesh geometry={ringGeo[2]} rotation={[Math.PI/6, -Math.PI/3, 0]}>
              <meshBasicMaterial color={[2.0, 2.0, 3.0]} transparent opacity={0.4} blending={THREE.AdditiveBlending} toneMapped={false}/>
          </mesh>
      </group>

      {/* 3. Floating Numbers/Text in Debris with Pop Scale */}
      <group ref={textGroupRef}>
          <Text position={[5, 2, 3]} fontSize={0.8} color={[3.0, 3.0, 4.0]} material-toneMapped={false} transparent opacity={0.9}>THROW()</Text>
          <Text position={[-4, -3, -2]} fontSize={1.2} color={[4.0, 1.0, 3.0]} material-toneMapped={false} transparent opacity={0.8}>0xEA</Text>
          <Text position={[3, -2, -6]} fontSize={0.6} color={[1.0, 4.0, 4.0]} material-toneMapped={false} transparent opacity={0.9}>[42]</Text>
          <Text position={[-6, 3, 2]} fontSize={1.0} color={[2.5, 1.5, 4.0]} material-toneMapped={false} transparent opacity={0.8}>GALAXY</Text>
      </group>
      
      {/* Intense core to anchor it, flashes and fades into Web */}
      <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial color={[4.0, 4.0, 4.0]} toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending}/>
      </mesh>
      <mesh>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial color={[3.0, 0.5, 4.0]} toneMapped={false} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};
