/**
 * PrepPilot AI Interview — Face Detection Service
 * Canvas-based video frame sampler.
 * Uses brightness pixel analysis as a lightweight proxy for face presence
 * when a full ML model (e.g. face-api.js) is not loaded.
 *
 * Monitors:
 * - FACE_NOT_DETECTED   (very dark / empty frame)
 * - FACE_RETURNED       (face back in frame)
 * - MULTIPLE_FACES_DETECTED  (bright region clusters heuristic)
 * - ATTENTION_DRIFT     (rapid frame change between samples)
 */
import IntegrityService from './integrityService.js';

const FaceDetectionService = (() => {
  let animFrame = null;
  let canvas = null;
  let ctx = null;
  let videoEl = null;
  let lastFrameData = null;
  let faceAbsent = false;
  let faceAbsentFrames = 0;
  let multifaceWarned = false;
  let onMultiFace = null;
  let onFaceAbsent = null;
  let onFaceReturn = null;
  let enabled = false;
  let sampleInterval = null;
  const SAMPLE_INTERVAL_MS = 2000; // sample every 2s for performance

  function init(videoElement, { onMultiple, onAbsent, onReturn } = {}) {
    videoEl = videoElement;
    onMultiFace = onMultiple;
    onFaceAbsent = onAbsent;
    onFaceReturn = onReturn;

    canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    ctx = canvas.getContext('2d');

    enabled = true;
    sampleInterval = setInterval(_sampleFrame, SAMPLE_INTERVAL_MS);
  }

  function _sampleFrame() {
    if (!enabled || !videoEl || videoEl.readyState < 2) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalBrightness = 0;
    let highBrightnessPixels = 0;
    const PIXEL_COUNT = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
      totalBrightness += brightness;
      if (brightness > 180) highBrightnessPixels++;
    }

    const avgBrightness = totalBrightness / PIXEL_COUNT;
    const highBrightnessFraction = highBrightnessPixels / PIXEL_COUNT;

    // Face absent heuristic: very dark or fully washed-out frame
    const noFace = avgBrightness < 15 || avgBrightness > 245;

    if (noFace) {
      faceAbsentFrames++;
      if (faceAbsentFrames >= 2 && !faceAbsent) {
        faceAbsent = true;
        IntegrityService.logEvent('FACE_NOT_DETECTED');
        if (onFaceAbsent) onFaceAbsent();
      }
    } else {
      if (faceAbsent) {
        faceAbsent = false;
        faceAbsentFrames = 0;
        IntegrityService.logEvent('FACE_RETURNED');
        if (onFaceReturn) onFaceReturn();
      } else {
        faceAbsentFrames = 0;
      }
    }

    // Multiple faces heuristic: unusually large fraction of distinct bright regions
    // Very rough proxy — real impl would use face-api.js
    if (highBrightnessFraction > 0.45 && avgBrightness > 80 && avgBrightness < 230) {
      if (!multifaceWarned) {
        multifaceWarned = true;
        IntegrityService.logEvent('MULTIPLE_FACES_DETECTED');
        if (onMultiFace) onMultiFace();
      }
    } else {
      multifaceWarned = false;
    }

    // Frame change magnitude (attention drift proxy)
    if (lastFrameData) {
      let diff = 0;
      for (let i = 0; i < data.length; i += 16) {
        diff += Math.abs(data[i] - lastFrameData[i]);
      }
      const avgDiff = diff / (data.length / 16);
      if (avgDiff > 60) {
        IntegrityService.logEvent('ATTENTION_DRIFT');
      }
    }
    lastFrameData = new Uint8ClampedArray(data.buffer.slice(0));
  }

  function destroy() {
    enabled = false;
    clearInterval(sampleInterval);
  }

  return { init, destroy };
})();

export default FaceDetectionService;
