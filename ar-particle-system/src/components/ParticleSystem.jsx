import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const ParticleSystem = ({ handPosRef }) => {
  const pointsRef = useRef();
  const { viewport } = useThree();

  const particleCount = 2000;

  // Initialize particles in a sphere
  const [positions, mixFactors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const mix = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 1.5 + Math.random() * 1.5;

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      // Random factor for individual particle behavior
      mix[i] = Math.random();
    }
    return [pos, mix];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array;
    
    // Rotate the entire system slowly
    pointsRef.current.rotation.y = time * 0.1;
    pointsRef.current.rotation.x = time * 0.05;

    // Get target position from hand tracking
    let targetX = 0;
    let targetY = 0;
    let pinchDistance = 0;
    let hasTarget = false;

    if (handPosRef && handPosRef.current && handPosRef.current.indexFinger) {
      const { indexFinger, thumb } = handPosRef.current;
      
      // Map normalized coordinates [0, 1] to 3D viewport coordinates
      // MediaPipe x is 0 left, 1 right. Since we flipped the video (scaleX(-1)),
      // actual mirrored rendering means 0 is right, 1 is left visually.
      // Three.js viewport: 0 is center, positive X is right.
      // For accurate alignment overlaying the flipped video:
      // Real X on screen = 1 - x
      const xIndex = (1 - indexFinger.x) - 0.5;
      const yIndex = -(indexFinger.y - 0.5);
      
      const xThumb = (1 - thumb.x) - 0.5;
      const yThumb = -(thumb.y - 0.5);

      // Map to viewport
      const cx = ((xIndex + xThumb) / 2) * viewport.width;
      const cy = ((yIndex + yThumb) / 2) * viewport.height;

      // Distance for 'energy' scale
      const dx = (xIndex - xThumb) * viewport.width;
      const dy = (yIndex - yThumb) * viewport.height;
      pinchDistance = Math.sqrt(dx * dx + dy * dy);
      
      targetX = cx;
      targetY = cy;
      hasTarget = true;
    }

    // Update individual particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Base swirling motion
      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];
      
      // Spring force towards target if hand is visible
      if (hasTarget) {
        // Particles get pulled towards the hand midpoint, but maintain some orbit
        const force = 0.05;
        const orbitRadius = Math.max(0.5, pinchDistance * 0.5) + mixFactors[i];
        
        // Calculate vector from target to particle
        const vx = px - targetX;
        const vy = py - targetY;
        const vz = pz - 0; // Hand is approx at z=0 plane
        
        const dist = Math.sqrt(vx*vx + vy*vy + vz*vz);
        const normX = vx / dist;
        const normY = vy / dist;
        const normZ = vz / dist;
        
        // Target pos for this particle
        const tx = targetX + normX * orbitRadius;
        const ty = targetY + normY * orbitRadius;
        const tz = normZ * orbitRadius;
        
        // Lerp to target
        positions[i3] += (tx - px) * force;
        positions[i3 + 1] += (ty - py) * force;
        positions[i3 + 2] += (tz - pz) * force;
      } else {
        // Return to center
        positions[i3] += (-px) * 0.01;
        positions[i3 + 1] += (-py) * 0.01;
        positions[i3 + 2] += (-pz) * 0.01;
      }
      
      // Add some noise/wobble
      positions[i3] += Math.sin(time + i) * 0.01;
      positions[i3 + 1] += Math.cos(time + i * 1.5) * 0.01;
      positions[i3 + 2] += Math.sin(time * 0.8 + i) * 0.01;
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
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#00ffff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
