import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const ParticleSystem = ({ handPosRef }) => {
  const pointsRef = useRef();
  const { viewport } = useThree();

  const particleCount = 5000; // Bumped up for more glitter
  
  const stateRef = useRef({ phase: 'SUMMON' });

  // Generate Positions, Lightning Web Targets, and Blast Velocities
  const [positions, galaxyTargets, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const targets = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      pos[i3] = 0; pos[i3 + 1] = 0; pos[i3 + 2] = 0;

      // Build the "Lightning Web" Shape (Branching arms instead of a flat circle)
      const branches = 12; // 12 main lightning strikes
      const branchIndex = i % branches;
      const radius = Math.random() * 12; // Massive radius
      
      // Make them jagged like lightning
      const angle = (branchIndex / branches) * Math.PI * 2 + (Math.sin(radius) * 0.3);
      
      targets[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * (radius * 0.2);
      targets[i3 + 1] = Math.sin(angle) * radius + (Math.random() - 0.5) * (radius * 0.2);
      targets[i3 + 2] = (Math.random() - 0.5) * 4; // Deep 3D spread

      vel[i3] = 0; vel[i3 + 1] = 0; vel[i3 + 2] = 0;
    }
    return [pos, targets, vel];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const posArray = pointsRef.current.geometry.attributes.position.array;
    
    let targetX = 0;
    let targetY = 0;
    let normalizedDistance = 999;
    let handsVisible = false;

    // 1. SAFELY READ HAND TRACKING
    if (handPosRef && handPosRef.current && handPosRef.current.indexFinger) {
      const { indexFinger, thumb } = handPosRef.current;
      
      const xIndex = (1 - indexFinger.x) - 0.5;
      const yIndex = -(indexFinger.y - 0.5);
      const xThumb = (1 - thumb.x) - 0.5;
      const yThumb = -(thumb.y - 0.5);

      targetX = ((xIndex + xThumb) / 2) * viewport.width;
      targetY = ((yIndex + yThumb) / 2) * viewport.height;

      const dx = indexFinger.x - thumb.x;
      const dy = indexFinger.y - thumb.y;
      normalizedDistance = Math.sqrt(dx * dx + dy * dy);
      handsVisible = true;
    }

    // 2. TRIGGER LOGIC
    if (stateRef.current.phase === 'SUMMON') {
      if (handsVisible && normalizedDistance < 0.15) { 
        stateRef.current.phase = 'MERGE'; 
      }
    } 
    else if (stateRef.current.phase === 'MERGE') {
      // The Throw Trigger: Hands vanish (thrown out of view) or pull apart fast
      if (!handsVisible || normalizedDistance > 0.3) {
        stateRef.current.phase = 'GALAXY';
        
        // THE SPLASH BOMB - Inject massive speed
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          velocities[i3] = (Math.random() - 0.5) * 6.0;     
          velocities[i3 + 1] = (Math.random() - 0.5) * 6.0; 
          velocities[i3 + 2] = (Math.random() - 0.5) * 8.0; 
        }
      }
    }

    // 3. APPLY PHYSICS & THE "LIVE" MOVEMENT
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      if (stateRef.current.phase === 'SUMMON') {
        posArray[i3] += (targetX - posArray[i3]) * 0.05 + Math.sin(time * 2 + i)*0.01;
        posArray[i3 + 1] += (targetY - posArray[i3 + 1]) * 0.05 + Math.cos(time * 2 + i)*0.01;
        posArray[i3 + 2] += (0 - posArray[i3 + 2]) * 0.05;
      } 
      else if (stateRef.current.phase === 'MERGE') {
        // Charging up
        const orbit = Math.random() * 0.8;
        posArray[i3] += (targetX + Math.cos(time * 8 + i) * orbit - posArray[i3]) * 0.15;
        posArray[i3 + 1] += (targetY + Math.sin(time * 8 + i) * orbit - posArray[i3 + 1]) * 0.15;
        posArray[i3 + 2] += (Math.sin(time * 12 + i) * 0.5 - posArray[i3 + 2]) * 0.15;
      } 
      else if (stateRef.current.phase === 'GALAXY') {
        // 1. The Splash Momentum
        posArray[i3] += velocities[i3];
        posArray[i3 + 1] += velocities[i3 + 1];
        posArray[i3 + 2] += velocities[i3 + 2];

        // 2. Friction
        velocities[i3] *= 0.85;
        velocities[i3 + 1] *= 0.85;
        velocities[i3 + 2] *= 0.85;

        // 3. Form the Web Structure
        posArray[i3] += (galaxyTargets[i3] - posArray[i3]) * 0.04;
        posArray[i3 + 1] += (galaxyTargets[i3 + 1] - posArray[i3 + 1]) * 0.04;
        posArray[i3 + 2] += (galaxyTargets[i3 + 2] - posArray[i3 + 2]) * 0.04;

        // 4. THE GLITTER FIX! Make it alive and breathing
        // This adds constant random wiggling to every particle even after they settle
        posArray[i3] += Math.sin(time * 3 + i * 0.1) * 0.015;
        posArray[i3 + 1] += Math.cos(time * 4 + i * 0.1) * 0.015;
        posArray[i3 + 2] += Math.sin(time * 2 + i * 0.1) * 0.015;
      }
    }

    // 4. SCALE AND ROTATE THE ENTIRE ROOM
    if (stateRef.current.phase === 'GALAXY') {
      // Keep the whole structure spinning slowly
      pointsRef.current.rotation.y += 0.003;
      pointsRef.current.rotation.z -= 0.001;
      pointsRef.current.rotation.x += 0.002;
      
      pointsRef.current.position.lerp(new THREE.Vector3(0, 0, -3), 0.1); 
      // Scale it up HUGE so it covers the screen
      pointsRef.current.scale.lerp(new THREE.Vector3(4, 4, 4), 0.05);
    } else {
      pointsRef.current.rotation.set(0, 0, 0);
      pointsRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
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
        size={0.035}
        color={stateRef.current.phase === 'MERGE' ? "#ff00ff" : "#e0aaff"} // Light purple/pink galaxy
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
//meowmoemeow