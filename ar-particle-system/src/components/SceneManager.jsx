import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { LeftHandVisual } from './LeftHandVisual';
import { RightHandVisual } from './RightHandVisual';
import { MergedCore } from './MergedCore';
import { StructuredGalaxy } from './StructuredGalaxy';

const PHASES = {
  SUMMON: 1, // Phase 1: Separate Hands (Sun + Orbit)
  CHARGE: 2, // Phase 2: Hands Merged (MergedCore)
  THROW: 3,  // Phase 3: Transitional - One hand drops, other pushes Z-depth rapidly
  GALAXY: 4  // Phase 4: Detonation (StructuredGalaxy)
};

export const SceneManager = ({ handsRef }) => {
  const { viewport } = useThree();
  
  const summonLeftRef = useRef();
  const summonRightRef = useRef();
  const chargeGroupRef = useRef();
  const galaxyGroupRef = useRef();
  
  // Track state internally to avoid React re-renders which kill 60fps
  const stateRef = useRef({ 
      phase: PHASES.SUMMON,
      chargePosition: [0,0,0],
      galaxyPosition: [0,0,0],
      
      // Tracking for the Throw trigger
      throwingHandZ: null,
      throwVelocity: 0,
      framesSinceDrop: 0,
      activeThrowHand: null // "Left" or "Right"
  });

  useFrame(() => {
    if (!handsRef.current) return;
    const { left, right } = handsRef.current;
    const s = stateRef.current;
    
    let lPos = null;
    let rPos = null;
    let lRawZ = null;
    let rRawZ = null;

    if (left) { lPos = [left.x * viewport.width, left.y * viewport.height, 0]; lRawZ = left.z; }
    if (right) { rPos = [right.x * viewport.width, right.y * viewport.height, 0]; rRawZ = right.z; }

    // ====== STATE MACHINE LOGIC ======
    
    if (s.phase === PHASES.SUMMON) {
        if (lPos && rPos) {
           const dx = lPos[0] - rPos[0];
           const dy = lPos[1] - rPos[1];
           const dist = Math.sqrt(dx*dx + dy*dy);
           
           if (dist < 2.5) {
             // TRANSITION: Summon -> Charge
             s.phase = PHASES.CHARGE;
             s.chargePosition = [ (lPos[0]+rPos[0])/2, (lPos[1]+rPos[1])/2, 0 ];
             
             // Reset throw tracking
             s.throwingHandZ = null;
             s.throwVelocity = 0;
             s.framesSinceDrop = 0;
             s.activeThrowHand = null;
           }
        }
    } 
    else if (s.phase === PHASES.CHARGE) {
        // Did they pull hands apart to cancel?
        if (lPos && rPos) {
           const dx = lPos[0] - rPos[0];
           const dy = lPos[1] - rPos[1];
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist > 3.5) {
               s.phase = PHASES.SUMMON; // Cancel charge
           } else {
               // Update charge pos
               s.chargePosition = [ (lPos[0]+rPos[0])/2, (lPos[1]+rPos[1])/2, 0 ];
           }
        } 
        // Did they drop one hand to initiate the throw?
        else if ((lPos && !rPos) || (!lPos && rPos)) {
           // We are beginning to monitor for a rapid forward Z shift
           s.framesSinceDrop++;
           
           // We only give them ~60 frames (1 second) to complete the throw after dropping a hand
           if (s.framesSinceDrop > 60) {
               s.phase = PHASES.SUMMON; // Reset if too slow
           } else {
               s.activeThrowHand = lPos ? "Left" : "Right";
               const currentZ = lPos ? lRawZ : rRawZ;
               
               if (s.throwingHandZ !== null) {
                   // Calculate delta Z
                   // MediaPipe Z: Smaller negative numbers mean closer to camera.
                   // A rapid push forward means Z becomes more negative very fast.
                   const deltaZ = currentZ - s.throwingHandZ;
                   s.throwVelocity = deltaZ; 
                   
                   // Threshold: if they push forward fast enough
                   // e.g., deltaZ < -0.01 in a single frame
                   if (deltaZ < -0.015) {
                       // TRANSITION: Charge -> Throw -> Galaxy
                       s.phase = PHASES.GALAXY;
                       // Detonate at the current single hand position
                       const throwPos = lPos ? lPos : rPos;
                       s.galaxyPosition = [throwPos[0], throwPos[1], 0];
                       // Mark spawn time for animations
                       if (galaxyGroupRef.current) {
                           galaxyGroupRef.current.userData.spawnTime = performance.now();
                       }
                   }
               }
               s.throwingHandZ = currentZ;
           }
        } 
        // They dropped both hands
        else {
             s.phase = PHASES.SUMMON; 
        }
    }
    else if (s.phase === PHASES.GALAXY) {
       // Only remain in GALAXY as long as the throwing hand is visible
       const isThrowingHandVisible = (s.activeThrowHand === "Left" && lPos) || (s.activeThrowHand === "Right" && rPos);
       
       if (!isThrowingHandVisible) {
           s.phase = PHASES.SUMMON;
       } else {
           // Track the hand to move the galaxy center slightly
           const throwPos = lPos ? lPos : rPos;
           s.galaxyPosition = [throwPos[0], throwPos[1], 0];
       }
    }


    // ====== VISIBILITY UPDATES ======
    
    // Phase 1
    if (summonLeftRef.current) {
      summonLeftRef.current.visible = (s.phase === PHASES.SUMMON && !!lPos);
      if (lPos) summonLeftRef.current.position.set(...lPos);
    }
    if (summonRightRef.current) {
      summonRightRef.current.visible = (s.phase === PHASES.SUMMON && !!rPos);
      if (rPos) summonRightRef.current.position.set(...rPos);
    }
    
    // Phase 2
    if (chargeGroupRef.current) {
        chargeGroupRef.current.visible = (s.phase === PHASES.CHARGE);
        if (s.phase === PHASES.CHARGE) {
             chargeGroupRef.current.position.set(...s.chargePosition);
        }
    }
    
    // Phase 4
    if (galaxyGroupRef.current) {
        galaxyGroupRef.current.visible = (s.phase === PHASES.GALAXY);
        if (s.phase === PHASES.GALAXY) {
             // Optional: LERP to hand position so it feels floaty rather than glued
             galaxyGroupRef.current.position.lerp(new THREE.Vector3(...s.galaxyPosition), 0.1);
        }
    }
  });

  return (
    <>
      <group ref={summonLeftRef} visible={false}>
        <LeftHandVisual />
      </group>
      <group ref={summonRightRef} visible={false}>
        <RightHandVisual />
      </group>
      
      <group ref={chargeGroupRef} visible={false}>
        <MergedCore parentRef={chargeGroupRef} />
      </group>
      
      <group ref={galaxyGroupRef} visible={false}>
        <StructuredGalaxy parentRef={galaxyGroupRef} />
      </group>
    </>
  );
};
