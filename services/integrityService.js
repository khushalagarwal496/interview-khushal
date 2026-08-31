/**
 * PrepPilot AI Interview — Integrity Service
 * Deductive scoring engine + structured event queue manager.
 * Starts at IntegrityScore = 100 and deducts on observable signals.
 */
const IntegrityService = (() => {
  let score = 100;
  let eventLog = [];
  let eventCounter = 0;
  let warningLevel = 0;       // 0 = none, 1 = first, 2 = repeat, 3 = final
  let lastWarnTime = 0;
  const WARN_COOLDOWN_MS = 20000; // 20s between repeated warnings
  let sessionStatus = 'ACTIVE'; // ACTIVE | ATTENTION | WARNING | ENDING | TERMINATED | COMPLETED
  let statusChangeCallbacks = [];

  const DEDUCTIONS = {
    FACE_NOT_DETECTED:       2,
    MULTIPLE_FACES_DETECTED: 5,
    WINDOW_FOCUS_LOST:       5,
    FULLSCREEN_EXIT:         3,
    REPEATED_INTERRUPTION:   8,
    AUTO_TERMINATED:        15,
    ATTENTION_DRIFT:         2,
  };

  const SEVERITY_MAP = {
    FACE_NOT_DETECTED:       'MINOR',
    MULTIPLE_FACES_DETECTED: 'WARNING',
    WINDOW_FOCUS_LOST:       'WARNING',
    FULLSCREEN_EXIT:         'MINOR',
    REPEATED_INTERRUPTION:   'CONCERN',
    AUTO_TERMINATED:         'CRITICAL',
    WINDOW_FOCUS_RETURNED:   'INFO',
    CAMERA_DISABLED:         'WARNING',
    MICROPHONE_DISABLED:     'WARNING',
    INTERVIEW_COMPLETED:     'INFO',
    ATTENTION_DRIFT:         'MINOR',
  };

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  function logEvent(eventType, extras = {}) {
    eventCounter++;
    const deduction = DEDUCTIONS[eventType] || 0;
    score = Math.max(0, score - deduction);

    const event = {
      eventId: `event_${String(eventCounter).padStart(3, '0')}`,
      timestamp: now(),
      eventType,
      severity: SEVERITY_MAP[eventType] || 'INFO',
      deduction,
      integrityScoreAfter: score,
      ...extras
    };
    eventLog.push(event);
    _updateStatus();
    _broadcastStatusChange();
    console.log('[IntegrityService]', event);
    return event;
  }

  function _updateStatus() {
    if (score >= 85)       sessionStatus = 'ACTIVE';
    else if (score >= 70)  sessionStatus = 'ATTENTION';
    else if (score >= 55)  sessionStatus = 'WARNING';
    else                   sessionStatus = 'ENDING';
  }

  function _broadcastStatusChange() {
    statusChangeCallbacks.forEach(cb => cb(sessionStatus, score));
  }

  function onStatusChange(cb) {
    statusChangeCallbacks.push(cb);
  }

  function shouldWarn() {
    const now = Date.now();
    if (now - lastWarnTime < WARN_COOLDOWN_MS && warningLevel > 0) return false;
    return true;
  }

  function nextWarningLevel() {
    if (!shouldWarn()) return null;
    warningLevel = Math.min(warningLevel + 1, 3);
    lastWarnTime = Date.now();
    return warningLevel;
  }

  function getReport() {
    const focusEvents = eventLog.filter(e => e.eventType === 'WINDOW_FOCUS_LOST');
    const faceAbsent  = eventLog.filter(e => e.eventType === 'FACE_NOT_DETECTED');
    const multiface   = eventLog.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED');
    const repeated    = eventLog.filter(e => e.eventType === 'REPEATED_INTERRUPTION');

    const totalAwayMs = focusEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0);

    return {
      integrityScore: score,
      sessionStatus,
      warningLevel,
      totalEvents: eventLog.length,
      focusLossCount: focusEvents.length,
      faceAbsentCount: faceAbsent.length,
      multifaceCount: multiface.length,
      repeatedInterruptionCount: repeated.length,
      totalTimeAwaySeconds: Math.round(totalAwayMs / 1000),
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
    score = 100; eventLog = []; eventCounter = 0;
    warningLevel = 0; lastWarnTime = 0; sessionStatus = 'ACTIVE';
  }

  return { logEvent, onStatusChange, nextWarningLevel, shouldWarn, getReport, setTerminated, setCompleted, reset, getScore: () => score, getStatus: () => sessionStatus };
})();

export default IntegrityService;
