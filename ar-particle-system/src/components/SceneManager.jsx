import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { LeftHandVisual } from './LeftHandVisual';
import { RightHandVisual } from './RightHandVisual';
import { MergedCore } from './MergedCore';
import { StructuredGalaxy } from './StructuredGalaxy';

const PHASES = {
  SUMMON: 1, // Phase 1: Index fingers up - Sun (left) and Math Structure (right)
  MERGE: 2,  // Phase 2: Hands close together - Lavender Core
  GALAXY: 3  // Phase 3: Open palm - Milky Way Explosion
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
      mergePosition: [0,0,0],
      galaxyPosition: [0,0,0],
  });

  // MANUAL OVERRIDE: Spacebar triggers Galaxy directly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        const s = stateRef.current;
        s.phase = PHASES.GALAXY;
        s.galaxyPosition = [0, 0, 0]; // Lock to center and detach from hand
        s.activeThrowHand = "Right"; // Arbitrary
        
        if (galaxyGroupRef.current) {
            galaxyGroupRef.current.userData.spawnTime = performance.now();
            galaxyGroupRef.current.scale.set(0.1, 0.1, 0.1); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useFrame(() => {
    if (!handsRef.current) return;
    const { left, right } = handsRef.current;
    const s = stateRef.current;
    
    let lPos = null;
    let rPos = null;

    if (left && left.gesture === 'index_up') { 
      lPos = [left.x * viewport.width, left.y * viewport.height, 0]; 
    }
    if (right && right.gesture === 'index_up') { 
      rPos = [right.x * viewport.width, right.y * viewport.height, 0]; 
    }

    // ====== STATE MACHINE LOGIC ======
    
    if (s.phase === PHASES.SUMMON) {
        // Stay in SUMMON as long as at least one hand is showing index finger
        const hasIndexFinger = (left && left.gesture === 'index_up') || (right && right.gesture === 'index_up');
        
        if (!hasIndexFinger) {
            // Reset to summon when no index fingers detected
            s.phase = PHASES.SUMMON;
        } else if (lPos && rPos) {
            // Both hands with index fingers up - check distance for merge
            const dx = lPos[0] - rPos[0];
            const dy = lPos[1] - rPos[1];
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 2.5) {
                // TRANSITION: Summon -> Merge
                s.phase = PHASES.MERGE;
                s.mergePosition = [ (lPos[0]+rPos[0])/2, (lPos[1]+rPos[1])/2, 0 ];
            }
        }
    } 
    else if (s.phase === PHASES.MERGE) {
        if (lPos && rPos) {
            // Update merge position while both hands are close
            const dx = lPos[0] - rPos[0];
            const dy = lPos[1] - rPos[1];
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 3.5) {
                s.mergePosition = [ (lPos[0]+rPos[0])/2, (lPos[1]+rPos[1])/2, 0 ];
                
                // Check for open palm gesture to trigger galaxy
                const leftOpenPalm = left && left.gesture === 'open_palm';
                const rightOpenPalm = right && right.gesture === 'open_palm';
                
                if (leftOpenPalm || rightOpenPalm) {
                    // TRANSITION: Merge -> Galaxy
                    s.phase = PHASES.GALAXY;
                    s.galaxyPosition = [...s.mergePosition];
                    
                    if (galaxyGroupRef.current) {
                        galaxyGroupRef.current.userData.spawnTime = performance.now();
                        galaxyGroupRef.current.scale.set(0.1, 0.1, 0.1);
                    }
                }
            } else {
                // Hands pulled apart, go back to summon
                s.phase = PHASES.SUMMON;
            }
        } else {
            // One or both hands lost, go back to summon
            s.phase = PHASES.SUMMON;
        }
    }
    else if (s.phase === PHASES.GALAXY) {
        // Stay in galaxy until no hands are visible
        const hasVisibleHand = (left && left.gesture !== 'unknown') || (right && right.gesture !== 'unknown');
        
        if (!hasVisibleHand) {
            s.phase = PHASES.SUMMON;
        }
    }


    // ====== VISIBILITY UPDATES ======
    
    // Phase 1: Summon - Show visuals at index finger positions
    if (summonLeftRef.current) {
      summonLeftRef.current.visible = (s.phase === PHASES.SUMMON && !!lPos);
      if (lPos) summonLeftRef.current.position.set(...lPos);
    }
    
    if (summonRightRef.current) {
      summonRightRef.current.visible = (s.phase === PHASES.SUMMON && !!rPos);
      if (rPos) summonRightRef.current.position.set(...rPos);
    }
    
    // Phase 2: Merge - Show merged core
    if (chargeGroupRef.current) {
        chargeGroupRef.current.visible = (s.phase === PHASES.MERGE);
        if (s.phase === PHASES.MERGE) {
             chargeGroupRef.current.position.set(...s.mergePosition);
        }
    }
    
    // Phase 3: Galaxy
    if (galaxyGroupRef.current) {
        galaxyGroupRef.current.visible = (s.phase === PHASES.GALAXY);
        if (s.phase === PHASES.GALAXY) {
             galaxyGroupRef.current.position.lerp(new THREE.Vector3(...s.galaxyPosition), 0.1);
        }
    }
  });
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
