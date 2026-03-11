import React from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export const Effects = () => {
  return (
    <EffectComposer multisampling={8}>
      <Bloom 
        intensity={2.5} 
        luminanceThreshold={0.1} 
        luminanceSmoothing={0.9} 
        mipmapBlur 
      />
    </EffectComposer>
  );
};
