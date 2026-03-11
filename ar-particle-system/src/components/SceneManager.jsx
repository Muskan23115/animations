import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { LeftHandVisual } from './LeftHandVisual';
import { RightHandVisual } from './RightHandVisual';
import { GalaxyMerge } from './GalaxyMerge';

export const SceneManager = ({ handsRef }) => {
  const { viewport } = useThree();
  
  const leftGroupRef = useRef();
  const rightGroupRef = useRef();
  const mergeGroupRef = useRef();
  
  // Track state internally to avoid React re-renders which kill 60fps
  const stateRef = useRef({ isMerged: false });

  useFrame(() => {
    if (!handsRef.current) return;
    const { left, right } = handsRef.current;
    
    let lPos = null;
    let rPos = null;

    if (left) lPos = [left.x * viewport.width, left.y * viewport.height, 0];
    if (right) rPos = [right.x * viewport.width, right.y * viewport.height, 0];
    
    if (leftGroupRef.current) {
      leftGroupRef.current.visible = !!lPos && !stateRef.current.isMerged;
      if (lPos) leftGroupRef.current.position.set(...lPos);
    }
    
    if (rightGroupRef.current) {
      rightGroupRef.current.visible = !!rPos && !stateRef.current.isMerged;
      if (rPos) rightGroupRef.current.position.set(...rPos);
    }

    if (lPos && rPos) {
       const dx = lPos[0] - rPos[0];
       const dy = lPos[1] - rPos[1];
       const dist = Math.sqrt(dx*dx + dy*dy);
       
       // Threshold check with hysteresis
       if (dist < 2.5 && !stateRef.current.isMerged) {
         stateRef.current.isMerged = true;
       } else if (dist > 3.5 && stateRef.current.isMerged) {
         stateRef.current.isMerged = false;
       }
       
       if (mergeGroupRef.current) {
         mergeGroupRef.current.position.set( (lPos[0]+rPos[0])/2, (lPos[1]+rPos[1])/2, 0 );
       }
    } else {
       stateRef.current.isMerged = false;
    }
    
    if (mergeGroupRef.current) {
       // Reset startTime precisely when it becomes visible
       if (stateRef.current.isMerged && !mergeGroupRef.current.visible) {
         mergeGroupRef.current.userData.spawnTime = performance.now();
       }
       mergeGroupRef.current.visible = stateRef.current.isMerged;
    }
  });

  return (
    <>
      <group ref={leftGroupRef} visible={false}>
        <LeftHandVisual />
      </group>
      <group ref={rightGroupRef} visible={false}>
        <RightHandVisual />
      </group>
      <group ref={mergeGroupRef} visible={false}>
        <GalaxyMerge parentRef={mergeGroupRef} />
      </group>
    </>
  );
};
