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
    numHands: 1,
  });

  return handLandmarker;
};

export const detectHands = (video) => {
  if (!handLandmarker) return null;
  const startTimeMs = performance.now();
  return handLandmarker.detectForVideo(video, startTimeMs);
};
