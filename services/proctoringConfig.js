/**
 * PrepPilot AI Interview — Centralized Proctoring Configuration
 * Configurable thresholds and grace periods for computer vision,
 * head pose estimation, temporal debouncing, and integrity scoring.
 */
export const PROCTORING_CONFIG = {
  // Confidence & Detection Thresholds
  faceConfidenceThreshold: 0.60,       // Minimum detection confidence score
  lowConfidenceThreshold: 0.45,        // Trigger for lighting / visibility warning
  
  // Temporal Grace Periods (in milliseconds)
  faceLostGracePeriod: 3000,           // 3s grace before declaring face lost
  multiFaceConfirmationTime: 1500,     // 1.5s confirmation to prevent model noise false positives
  warningCooldown: 5000,               // 5s cooldown between consecutive UI warnings
  
  // Head Pose Orientation Limits (in degrees)
  headTurnYawThreshold: 28,            // Max normal Yaw rotation (looking left/right)
  headTurnPitchThreshold: 22,          // Max normal Pitch rotation (looking up/down)
  headTurnRollThreshold: 25,           // Max normal Roll rotation (head tilt)
  
  // Head Turn Duration Limits (in milliseconds)
  headTurnAttentionDuration: 3000,     // 3s off-camera glance -> Level 1 Attention
  headTurnConcernDuration: 6000,       // 6s off-camera glance -> Level 2/3 Integrity Concern
  
  // Tab Focus & Window Visibility
  tabAbsenceCountdownSeconds: 10,      // 10s return window before auto-termination
  
  // Identity Verification & Live Session Consistency
  identitySimilarityThreshold: 0.68,   // Minimum cosine similarity for landmark descriptors
  identityTemporalWindowSize: 15,     // 15-frame sliding window for temporal smoothing
  identityMismatchGraceMs: 3000,       // 3s grace period before soft identity warning
  identityConcernDurationMs: 6000,     // 6s persistent mismatch before logging IDENTITY_CONSISTENCY_CONCERN
  
  // Integrity Score Deductions
  deductions: {
    FACE_NOT_DETECTED: 3,
    MULTIPLE_FACES_DETECTED: 8,
    HEAD_ORIENTATION_CONCERN: 4,
    IDENTITY_CONSISTENCY_CONCERN: 10,
    IDENTITY_LOW_CONFIDENCE: 2,
    WINDOW_FOCUS_LOST: 5,
    FULLSCREEN_EXIT: 3,
    LOW_LIGHTING_WARNING: 1,
    AUTO_TERMINATED: 20,
  }
};

export default PROCTORING_CONFIG;
