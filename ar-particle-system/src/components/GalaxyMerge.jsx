import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const GalaxyMerge = ({ parentRef }) => {
  const sparksRef = useRef();
  const galaxyRef = useRef();
  
  const sparkCount = 1500;
  const galaxyCount = 5000;

  // --- STAGE 1: Supernova Sparkle Burst ---
  const [sparkPos, sparkVel] = useMemo(() => {
    const pos = new Float32Array(sparkCount * 3);
    const vel = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
      
      // Random spherical direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      // High velocity for sparks
      const speed = 10.0 + Math.random() * 15.0; 
      vel[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      vel[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      vel[i * 3 + 2] = speed * Math.cos(phi);
    }
    return [pos, vel];
  }, []);

  // --- STAGE 2: Logarithmic Spiral Galaxy ---
  const [galaxyPos, galaxyColor, galaxyTarget] = useMemo(() => {
    const pos = new Float32Array(galaxyCount * 3);
    const col = new Float32Array(galaxyCount * 3);
    const tgt = new Float32Array(galaxyCount * 3); // target positions for the spiral
    
    // Galaxy core/arm colors
    const coreColor = new THREE.Color(4.0, 1.0, 4.0); // Intense pink/purple
    const armColor = new THREE.Color(0.5, 2.0, 4.0);  // Blue/Cyan
    
    // Logarithmic spiral parameters: r = a * e^(b * theta)
    const arms = 5;
    const a = 0.5;
    const b = 0.25;

    for (let i = 0; i < galaxyCount; i++) {
        // Start all particles at center
        pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
        
        // Calculate final spiral target
        const armIndex = i % arms;
        const armOffset = (Math.PI * 2 / arms) * armIndex;
        // theta mapping (farther particles have higher theta)
        const maxTheta = 12.0; 
        // Bias towards center using pow
        const t = Math.pow(Math.random(), 1.5) * maxTheta; 
        const theta = t + armOffset;
        
        const r = a * Math.exp(b * t);
        
        // Add swirling scatter logic. Denser at center.
        const scatter = Math.max(0.1, r * 0.15) * (Math.random() - 0.5);
        
        tgt[i * 3] = Math.cos(theta) * r + scatter;
        tgt[i * 3 + 1] = (Math.random() - 0.5) * Math.max(0.2, 2.0 - r*0.2); // Z-thickness (Y in our map)
        tgt[i * 3 + 2] = Math.sin(theta) * r + scatter;

        // Colors blend based on distance from center
        const lerpFactor = Math.min(1.0, r / 10.0);
        const color = coreColor.clone().lerp(armColor, lerpFactor);
        
        col[i * 3] = color.r;
        col[i * 3 + 1] = color.g;
        col[i * 3 + 2] = color.b;
    }
    return [pos, col, tgt];
  }, []);

  useFrame((state, delta) => {
    if (!parentRef?.current?.visible) return;
    
    const spawnTime = parentRef.current.userData.spawnTime || performance.now();
    const elapsed = (performance.now() - spawnTime) / 1000; // seconds

    // --- Update Sparks ---
    if (sparksRef.current) {
        // Only visible and active for the first 1.5 seconds
        if (elapsed < 1.5) {
            sparksRef.current.visible = true;
            const arr = sparksRef.current.geometry.attributes.position.array;
            
            // Decelerate sparks rapidly
            const friction = Math.exp(-elapsed * 5.0); 
            
            for (let i = 0; i < sparkCount * 3; i++) {
                arr[i] += sparkVel[i] * delta * friction;
            }
            
            sparksRef.current.geometry.attributes.position.needsUpdate = true;
            
            // Fade opacity
            const material = sparksRef.current.material;
            material.opacity = Math.max(0, 1.0 - (elapsed / 1.5));
        } else {
            sparksRef.current.visible = false;
        }
    }

    // --- Update Galaxy ---
    if (galaxyRef.current) {
        const arr = galaxyRef.current.geometry.attributes.position.array;
        
        // Rotate entire galaxy
        galaxyRef.current.rotation.y = elapsed * 0.1;
        galaxyRef.current.rotation.z = elapsed * 0.05;
        galaxyRef.current.rotation.x = Math.PI * 0.1; // slight tilt
        
        // Explosion expansion factor: rapid scale up in first 2 seconds, then settle
        const expansionCurve = Math.min(1.0, elapsed * 1.5);
        
        for (let i = 0; i < galaxyCount; i++) {
            const i3 = i * 3;
            // Target position multiplied by expansion curve
            const tx = galaxyTarget[i3] * expansionCurve;
            const ty = galaxyTarget[i3 + 1] * expansionCurve;
            const tz = galaxyTarget[i3 + 2] * expansionCurve;

            // Spring towards target
            arr[i3] += (tx - arr[i3]) * 0.1;
            arr[i3 + 1] += (ty - arr[i3 + 1]) * 0.1;
            arr[i3 + 2] += (tz - arr[i3 + 2]) * 0.1;
            
            // Minor continuous swirl
            if (expansionCurve >= 1.0) {
               const r = Math.sqrt(tx*tx + tz*tz);
               const speed = 0.05 / (r + 1.0); // inner rotates faster
               const currentTheta = Math.atan2(arr[i3+2], arr[i3]) + speed;
               arr[i3] = Math.cos(currentTheta) * r;
               arr[i3+2] = Math.sin(currentTheta) * r;
            }
        }
        galaxyRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Fade in Galaxy exactly as sparks fade
        galaxyRef.current.material.opacity = Math.min(0.8, elapsed * 0.8);
    }
  });

  return (
    <group>
      {/* Supernova Sparks */}
      <points ref={sparksRef}>
        <bufferGeometry>
            <bufferAttribute
                attach="attributes-position"
                count={sparkPos.length / 3}
                array={sparkPos}
                itemSize={3}
            />
        </bufferGeometry>
        <pointsMaterial
            size={0.08}
            color={[4.0, 3.0, 1.0]} // Overdriven bright gold/white
            transparent={true}
            opacity={1.0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
        />
      </points>
      
      {/* Logarithmic Spiral Galaxy */}
      <points ref={galaxyRef}>
        <bufferGeometry>
            <bufferAttribute
                attach="attributes-position"
                count={galaxyPos.length / 3}
                array={galaxyPos}
                itemSize={3}
            />
            <bufferAttribute
                attach="attributes-color"
                count={galaxyColor.length / 3}
                array={galaxyColor}
                itemSize={3}
            />
        </bufferGeometry>
        <pointsMaterial
            size={0.05}
            vertexColors={true}
            transparent={true}
            opacity={0.0} // Fades in
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
        />
      </points>
    </group>
  );
};
