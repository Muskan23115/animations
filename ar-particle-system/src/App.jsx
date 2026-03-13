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
        const hands = detectHands(videoRef.current);
        
        handsRef.current = { left: null, right: null };

        if (hands && hands.length > 0) {
          hands.forEach((hand) => {
            const handData = {
              x: hand.position.x,
              y: hand.position.y,
              z: hand.position.z,
              gesture: hand.gesture
            };
            
            if (hand.handedness === 'left') {
              handsRef.current.left = handData;
            } else if (hand.handedness === 'right') {
              handsRef.current.right = handData;
            }
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
