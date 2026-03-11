import React from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export const Effects = () => {
  return (
    <EffectComposer multisampling={8}>
      <Bloom 
        intensity={1.8}       // Lower intensity to reveal particle structure
        luminanceThreshold={0.5} // Higher threshold so only very bright things glow
        luminanceSmoothing={0.9} 
        mipmapBlur 
      />
    </EffectComposer>
  );
};
