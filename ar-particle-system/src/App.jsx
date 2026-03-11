import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { initializeHandLandmarker, detectHands } from './components/HandTracker';
import { ParticleSystem } from './components/ParticleSystem';
import { Effects } from './components/Effects';

function App() {
  const videoRef = useRef(null);
  const handPosRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const requestRef = useRef(null);

  useEffect(() => {
    const setup = async () => {
      // 1. Initialize HandLandmarker
      await initializeHandLandmarker();

      // 2. Setup Webcam
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: "user" }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', () => {
              setIsReady(true);
              startTracking();
            });
          }
        } catch (err) {
          console.error("Camera access denied or unavailable", err);
          // Still set ready to show particles even without camera
          setIsReady(true);
        }
      } else {
        setIsReady(true);
      }
    };

    setup();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startTracking = () => {
    const track = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const results = detectHands(videoRef.current);
        if (results && results.landmarks && results.landmarks.length > 0) {
          // Grab the first hand
          const landmarks = results.landmarks[0];
          // Index finger tip is 8, Thumb tip is 4
          const indexFinger = landmarks[8];
          const thumb = landmarks[4];

          handPosRef.current = {
            indexFinger: { x: indexFinger.x, y: indexFinger.y, z: indexFinger.z },
            thumb: { x: thumb.x, y: thumb.y, z: thumb.z }
          };
        } else {
          handPosRef.current = null;
        }
      }
      requestRef.current = requestAnimationFrame(track);
    };
    track();
  };

  return (
    <div className="ar-container">
      {!isReady && <div className="loading-overlay">Initializing AR Engine...</div>}

      {/* Webcam Feed */}
      <video
        ref={videoRef}
        className="webcam-video"
        autoPlay
        playsInline
        muted
      />

      {/* 3D Overlay */}
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>

          <ambientLight intensity={0.5} />

          <ParticleSystem handPosRef={handPosRef} />
          <Effects />

        </Canvas>
      </div>
    </div>
  );
}

export default App;
