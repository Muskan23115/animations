import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const LeftHandVisual = ({ position }) => {
  const pulseRef = useRef();
  const flareRef = useRef();
  
  const particleCount = 300;
  
  // Set up solar flare particles
  const [flarePositions, flareSpeeds] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    for(let i=0; i<particleCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / particleCount);
        const theta = Math.sqrt(particleCount * Math.PI) * phi;
        
        // Initial tight radius
        const r = 0.9;
        pos[i*3] = r * Math.cos(theta) * Math.sin(phi);
        pos[i*3+1] = r * Math.sin(theta) * Math.sin(phi);
        pos[i*3+2] = r * Math.cos(phi);
        
        spd[i] = 1.0 + Math.random() * 2.0;
    }
    return [pos, spd];
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Pulse the outer sphere
    if (pulseRef.current) {
        const scale = 1.0 + Math.sin(t * 4.0) * 0.15;
        pulseRef.current.scale.set(scale, scale, scale);
        pulseRef.current.rotation.y = t * 0.5;
        pulseRef.current.rotation.x = t * 0.3;
    }
    
    // Animate solar flares
    if (flareRef.current) {
        flareRef.current.rotation.y = t * 0.8;
        flareRef.current.rotation.z = t * 0.4;
        
        const posAttr = flareRef.current.geometry.attributes.position;
        const arr = posAttr.array;
        
        for(let i=0; i<particleCount; i++) {
            const i3 = i * 3;
            // Radius distance from center
            const x = arr[i3], y = arr[i3+1], z = arr[i3+2];
            const dist = Math.sqrt(x*x + y*y + z*z);
            
            // Move outward
            const speed = flareSpeeds[i] * 0.02;
            const nx = x / dist;
            const ny = y / dist;
            const nz = z / dist;
            
            arr[i3] += nx * speed;
            arr[i3+1] += ny * speed;
            arr[i3+2] += nz * speed;
            
            // Loop back to surface if they go too far
            if (dist > 1.5 + Math.random() * 0.5) {
                const r = 0.9; // Just inside the pulse sphere (1.0 base size)
                arr[i3] = nx * r;
                arr[i3+1] = ny * r;
                arr[i3+2] = nz * r;
            }
        }
        posAttr.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      {/* Intense Solid Yellow Inner Core - Tripled (was 0.3 -> now 0.9) */}
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial color="#ffff55" />
      </mesh>
      
      {/* Pulsing Semi-transparent Orange/Red Outer Sphere */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshBasicMaterial 
          color="#ff4400" 
          transparent={true} 
          opacity={0.6} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </mesh>

      {/* Larger soft glow to blend it into the background */}
      <mesh>
        <sphereGeometry args={[1.3, 32, 32]} />
        <meshBasicMaterial 
          color="#ff1100" 
          transparent={true} 
          opacity={0.2} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </mesh>

      {/* Fast moving solar flares */}
      <points ref={flareRef}>
        <bufferGeometry>
            <bufferAttribute
                attach="attributes-position"
                count={flarePositions.length / 3}
                array={flarePositions}
                itemSize={3}
            />
        </bufferGeometry>
        <pointsMaterial
            size={0.06}
            color="#ffcc00"
            transparent={true}
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
        />
      </points>
    </group>
  );
};
