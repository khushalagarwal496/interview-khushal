/**
 * PrepPilot AI Interview — Integrity Service & Event Engine
 * Manages deductive scoring (Level 0 - Level 4), structured event audit log,
 * non-accusatory severity classification, and remote backend telemetry sync.
 */
import PROCTORING_CONFIG from './proctoringConfig.js';

const IntegrityService = (() => {
  let score = 100;
  let eventLog = [];
  let eventCounter = 0;
  let warningLevel = 0; // 0 = Normal, 1 = Attention, 2 = Warning, 3 = Concern, 4 = Terminated
  let lastWarnTime = 0;
  let sessionStatus = 'ACTIVE'; // ACTIVE | ATTENTION | WARNING | ENDING | TERMINATED | COMPLETED
  let statusChangeCallbacks = [];
  let activeSessionId = null;

  const DEDUCTIONS = {
    FACE_NOT_DETECTED: PROCTORING_CONFIG.deductions.FACE_NOT_DETECTED || 3,
    MULTIPLE_FACES_DETECTED: PROCTORING_CONFIG.deductions.MULTIPLE_FACES_DETECTED || 8,
    HEAD_ORIENTATION_CONCERN: PROCTORING_CONFIG.deductions.HEAD_ORIENTATION_CONCERN || 4,
    ATTENTION_DRIFT: 2,
    LOW_LIGHTING_WARNING: PROCTORING_CONFIG.deductions.LOW_LIGHTING_WARNING || 1,
    WINDOW_FOCUS_LOST: PROCTORING_CONFIG.deductions.WINDOW_FOCUS_LOST || 5,
    FULLSCREEN_EXIT: PROCTORING_CONFIG.deductions.FULLSCREEN_EXIT || 3,
    AUTO_TERMINATED: PROCTORING_CONFIG.deductions.AUTO_TERMINATED || 20,
    FACE_RETURNED: 0,
    MULTIPLE_FACES_CLEARED: 0,
    WINDOW_FOCUS_RETURNED: 0,
    INTERVIEW_COMPLETED: 0,
  };

  const SEVERITY_MAP = {
    FACE_NOT_DETECTED: 'WARNING',
    FACE_RETURNED: 'INFO',
    MULTIPLE_FACES_DETECTED: 'WARNING',
    MULTIPLE_FACES_CLEARED: 'INFO',
    HEAD_ORIENTATION_CONCERN: 'CONCERN',
    ATTENTION_DRIFT: 'MINOR',
    LOW_LIGHTING_WARNING: 'MINOR',
    WINDOW_FOCUS_LOST: 'WARNING',
    WINDOW_FOCUS_RETURNED: 'INFO',
    FULLSCREEN_EXIT: 'MINOR',
    AUTO_TERMINATED: 'CRITICAL',
    INTERVIEW_COMPLETED: 'INFO',
  };

  function setSessionId(id) {
    activeSessionId = id;
  }

  function nowFormatted() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  /**
   * Logs an integrity event, adjusts deductive score, and notifies subscribers
   */
  function logEvent(eventType, extras = {}) {
    eventCounter++;
    const deduction = DEDUCTIONS[eventType] || 0;
    score = Math.max(0, score - deduction);

    const event = {
      eventId: `event_${String(eventCounter).padStart(3, '0')}`,
      timestamp: nowFormatted(),
      eventType,
      severity: SEVERITY_MAP[eventType] || 'INFO',
      deduction,
      integrityScoreAfter: score,
      ...extras
    };

    eventLog.push(event);
    _updateStatus();
    _broadcastStatusChange();
    _sendTelemetry(event);

    console.log('[IntegrityService]', event);
    return event;
  }

  function _updateStatus() {
    if (sessionStatus === 'TERMINATED' || sessionStatus === 'COMPLETED') return;

    if (score >= 85) sessionStatus = 'ACTIVE';
    else if (score >= 70) sessionStatus = 'ATTENTION';
    else if (score >= 55) sessionStatus = 'WARNING';
    else sessionStatus = 'ENDING';
  }

  function _broadcastStatusChange() {
    statusChangeCallbacks.forEach(cb => cb(sessionStatus, score));
  }

  function _sendTelemetry(event) {
    if (!activeSessionId) return;
    try {
      fetch('/api/interview/proctoring-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          eventType: event.eventType,
          severity: event.severity,
          durationMs: event.durationMs || 0,
          extras: event
        })
      }).catch(() => {});
    } catch(e){}
  }

  function onStatusChange(cb) {
    statusChangeCallbacks.push(cb);
  }

  function shouldWarn() {
    const now = Date.now();
    if (now - lastWarnTime < PROCTORING_CONFIG.warningCooldown && warningLevel > 0) return false;
    return true;
  }

  function nextWarningLevel() {
    if (!shouldWarn()) return null;
    warningLevel = Math.min(warningLevel + 1, 3);
    lastWarnTime = Date.now();
    return warningLevel;
  }

  /**
   * Generates comprehensive integrity analysis audit report
   */
  function getReport() {
    const focusEvents = eventLog.filter(e => e.eventType === 'WINDOW_FOCUS_LOST');
    const faceAbsent = eventLog.filter(e => e.eventType === 'FACE_NOT_DETECTED');
    const multiface = eventLog.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED');
    const headOrientation = eventLog.filter(e => e.eventType === 'HEAD_ORIENTATION_CONCERN' || e.eventType === 'ATTENTION_DRIFT');

    const totalAwayMs = focusEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0);
    const totalAbsentMs = faceAbsent.reduce((sum, e) => sum + (e.durationMs || 0), 0);

    return {
      integrityScore: score,
      sessionStatus,
      warningLevel,
      totalEvents: eventLog.length,
      focusLossCount: focusEvents.length,
      faceAbsentCount: faceAbsent.length,
      multifaceCount: multiface.length,
      headOrientationCount: headOrientation.length,
      totalTimeAwaySeconds: Math.round(totalAwayMs / 1000),
      totalFaceAbsentSeconds: Math.round(totalAbsentMs / 1000),
      eventLog: [...eventLog],
    };
  }

  function setTerminated() {
    sessionStatus = 'TERMINATED';
    logEvent('AUTO_TERMINATED');
    _broadcastStatusChange();
  }

  function setCompleted() {
    sessionStatus = 'COMPLETED';
    logEvent('INTERVIEW_COMPLETED');
    _broadcastStatusChange();
  }

  function reset() {
    score = 100;
    eventLog = [];
    eventCounter = 0;
    warningLevel = 0;
    lastWarnTime = 0;
    sessionStatus = 'ACTIVE';
    activeSessionId = null;
  }

  return {
    setSessionId,
    logEvent,
    onStatusChange,
    nextWarningLevel,
    shouldWarn,
    getReport,
    setTerminated,
    setCompleted,
    reset,
    getScore: () => score,
    getStatus: () => sessionStatus
  };
})();

export default IntegrityService;
