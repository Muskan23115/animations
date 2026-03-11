import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { initializeHandLandmarker, detectHands } from './components/HandTracker';
import { SceneManager } from './components/SceneManager';
import { Effects } from './components/Effects';

function App() {
  const videoRef = useRef(null);
  const handsRef = useRef({ left: null, right: null });
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
        
        handsRef.current = { left: null, right: null };

        if (results && results.landmarks && results.landmarks.length > 0) {
          results.landmarks.forEach((landmarks, index) => {
             // MediaPipe returns Left/Right classification
             const handedness = results.handednesses[index][0].categoryName;
             
             // We use landmark 9 (middle finger base) as the center of the hand
             const pt = landmarks[9];
             
             // Since the video is horizontally flipped in CSS (scaleX(-1)),
             // we need to mirror the X coordinate for our 3D logic to line up visually.
             // MediaPipe x=0 means physical left side of image. If we mirror the video,
             // physical left side is rendered on the right side of the screen.
             // Therefore: real visual X = 1 - pt.x
             // We also shift back by 0.5 to put (0,0) in the center of the screen
             const normX = (1 - pt.x) - 0.5;
             const normY = -(pt.y - 0.5);
             
             // MediaPipe mirroring quirk: Usually front-facing cameras cause "Left" hand to report as "Right"
             // But we just want two separate hands, so we map them directly.
             if (handedness === "Left") handsRef.current.left = { x: normX, y: normY, z: pt.z };
             else handsRef.current.right = { x: normX, y: normY, z: pt.z };
          });
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
          
          <SceneManager handsRef={handsRef} />
          <Effects />
          
        </Canvas>
      </div>
    </div>
  );
}

export default App;
