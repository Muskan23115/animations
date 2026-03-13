import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

let handLandmarker = null;

export const initializeHandLandmarker = async () => {
  if (handLandmarker) return handLandmarker;
  
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2,
  });

  return handLandmarker;
};

// Helper function to detect if index finger is pointing up
const isIndexFingerUp = (landmarks) => {
  // Landmarks: 0=wrist, 5=index base, 6=index knuckle, 7=index middle, 8=index tip
  const indexBase = landmarks[5];
  const indexTip = landmarks[8];
  
  // Check if index finger is extended (tip higher than base in Y)
  const indexExtended = indexTip.y < indexBase.y;
  
  // Check if other fingers are curled (tips lower than their bases)
  const middleBase = landmarks[9];
  const middleTip = landmarks[12];
  const middleCurled = middleTip.y > middleBase.y;
  
  const ringBase = landmarks[13];
  const ringTip = landmarks[16];
  const ringCurled = ringTip.y > ringBase.y;
  
  const pinkyBase = landmarks[17];
  const pinkyTip = landmarks[20];
  const pinkyCurled = pinkyTip.y > pinkyBase.y;
  
  const thumbBase = landmarks[1];
  const thumbTip = landmarks[4];
  const thumbCurled = thumbTip.y > thumbBase.y;
  
  return indexExtended && middleCurled && ringCurled && pinkyCurled && thumbCurled;
};

// Helper function to detect open palm (all fingers extended)
const isOpenPalm = (landmarks) => {
  // Check if all fingers are extended
  const thumbExtended = landmarks[4].y < landmarks[1].y;
  const indexExtended = landmarks[8].y < landmarks[5].y;
  const middleExtended = landmarks[12].y < landmarks[9].y;
  const ringExtended = landmarks[16].y < landmarks[13].y;
  const pinkyExtended = landmarks[20].y < landmarks[17].y;
  
  return thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended;
};

export const detectHands = (video) => {
  if (!handLandmarker) return null;
  const startTimeMs = performance.now();
  const results = handLandmarker.detectForVideo(video, startTimeMs);
  
  if (!results || !results.landmarks || results.landmarks.length === 0) {
    return null;
  }
  
  const processedHands = [];
  
  results.landmarks.forEach((landmarks, index) => {
    const handedness = results.handednesses[index][0].categoryName;
    
    // Use index finger tip (landmark 8) as the primary position
    const indexTip = landmarks[8];
    
    // Mirror X coordinate for visual alignment
    const normX = (1 - indexTip.x) - 0.5;
    const normY = -(indexTip.y - 0.5);
    
    // Detect gestures
    const gesture = isOpenPalm(landmarks) ? 'open_palm' : 
                   isIndexFingerUp(landmarks) ? 'index_up' : 'unknown';
    
    processedHands.push({
      handedness: handedness.toLowerCase(), // 'left' or 'right'
      position: { x: normX, y: normY, z: indexTip.z },
      gesture: gesture,
      landmarks: landmarks // Keep full landmarks for potential future use
    });
  });
  
  return processedHands;
};
