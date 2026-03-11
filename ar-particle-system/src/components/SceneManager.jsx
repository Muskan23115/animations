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
      referenceZ: null,
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
             
             // Set persistent reference depth upon merging
             s.referenceZ = (lRawZ + rRawZ) / 2;
             s.activeThrowHand = null;
           }
        }
    } 
    else if (s.phase === PHASES.CHARGE) {
        let currentZ = null;

        // Verify hands are still somewhat together, or at least one hand is visible
        if (lPos && rPos) {
           const dx = lPos[0] - rPos[0];
           const dy = lPos[1] - rPos[1];
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist > 3.5) {
               s.phase = PHASES.SUMMON; // Pulled apart, cancel charge
               return;
           }
           // Keep position locked between hands
           s.chargePosition = [ (lPos[0]+rPos[0])/2, (lPos[1]+rPos[1])/2, 0 ];
           currentZ = (lRawZ + rRawZ) / 2;
        } else if (lPos || rPos) {
           // One hand dropped, use the remaining hand
           currentZ = lPos ? lRawZ : rRawZ;
        } else {
           // Both hands lost
           s.phase = PHASES.SUMMON; 
           return;
        }

        // PUSH DETECTION: Calculate delta from reference depth
        if (currentZ !== null && s.referenceZ !== null) {
            const deltaZ = currentZ - s.referenceZ;
            
            // Aggressive Trigger: smaller negative numbers mean closer to camera in our setup.
            // A delta of -0.015 is extremely sensitive and triggers immediately on a push.
            if (deltaZ < -0.015) {
                 // TRANSITION: Charge -> Galaxy
                 s.phase = PHASES.GALAXY;
                 
                 // Detonate exactly on the target (Merged Core's last position)
                 s.galaxyPosition = [...s.chargePosition];
                 s.activeThrowHand = lPos ? "Left" : "Right";
                 
                 if (galaxyGroupRef.current) {
                     galaxyGroupRef.current.userData.spawnTime = performance.now();
                 }
            } else if (deltaZ > 0.03) {
                 // If the user pulls their hand backward, update the reference Z 
                 // so they can push forward again without having to reset to Summon.
                 s.referenceZ = currentZ;
            }
        }
    }
    else if (s.phase === PHASES.GALAXY) {
       // Remain in GALAXY as long as a hand is visible
       const isHandVisible = !!(left || right);
       
       if (!isHandVisible) {
           s.phase = PHASES.SUMMON;
       }
       // Don't update s.galaxyPosition! It should stay fixed where it detonated.
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
