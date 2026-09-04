/**
 * PrepPilot AI Interview — Proctoring Service
 * Monitors browser visibility, window focus, and fullscreen mode.
 * Enforces tab focus return countdown with auto-termination handling.
 */
import PROCTORING_CONFIG from './proctoringConfig.js';
import IntegrityService from './integrityService.js';

const ProctoringService = (() => {
  let countdownTimer = null;
  let countdownSeconds = 0;
  let focusLostAt = null;
  let onAutoTerminate = null;
  let onCountdownTick = null;
  let onReturnDetected = null;
  let onWarning = null;
  let initialized = false;

  const WARNING_MESSAGES = {
    1: '⚠️ Please remain focused on the interview window.',
    2: '⚠️ Repeated interview interruptions detected. Please return your attention to the interview.',
    3: '🔴 Final Warning: Continued interruption may result in the interview ending automatically.',
  };

  function init({ onTerminate, onTick, onReturn, onWarn }) {
    if (initialized) return;
    initialized = true;
    onAutoTerminate = onTerminate;
    onCountdownTick = onTick;
    onReturnDetected = onReturn;
    onWarning = onWarn;

    // Tab visibility change
    document.addEventListener('visibilitychange', _handleVisibilityChange);
    // Window focus/blur
    window.addEventListener('blur', _handleFocusLost);
    window.addEventListener('focus', _handleFocusReturn);
    // Fullscreen mode change
    document.addEventListener('fullscreenchange', _handleFullscreenChange);
  }

  function _handleVisibilityChange() {
    if (document.hidden) _onLeave();
    else _onReturn();
  }

  function _handleFocusLost() {
    if (document.hidden) return; // already handled by visibilitychange
    _onLeave();
  }

  function _handleFocusReturn() {
    if (!document.hidden) _onReturn();
  }

  function _handleFullscreenChange() {
    if (!document.fullscreenElement) {
      IntegrityService.logEvent('FULLSCREEN_EXIT');
      _fireWarning();
    }
  }

  function _onLeave() {
    if (countdownTimer) return; // already counting down
    focusLostAt = Date.now();

    IntegrityService.logEvent('WINDOW_FOCUS_LOST', { durationMs: 0 });
    _fireWarning();
    _startCountdown(PROCTORING_CONFIG.tabAbsenceCountdownSeconds || 10);
  }

  function _onReturn() {
    if (!focusLostAt) return;
    const durationMs = Date.now() - focusLostAt;
    focusLostAt = null;

    _cancelCountdown();

    // Update the duration of the previous WINDOW_FOCUS_LOST event
    const report = IntegrityService.getReport();
    const lastFocus = [...report.eventLog].reverse().find(e => e.eventType === 'WINDOW_FOCUS_LOST');
    if (lastFocus) lastFocus.durationMs = durationMs;

    IntegrityService.logEvent('WINDOW_FOCUS_RETURNED', { durationMs });

    if (onReturnDetected) {
      onReturnDetected({ durationMs, durationSeconds: Math.round(durationMs / 1000) });
    }
  }

  function _startCountdown(seconds) {
    countdownSeconds = seconds;
    if (onCountdownTick) onCountdownTick(countdownSeconds, false);

    countdownTimer = setInterval(() => {
      countdownSeconds--;
      if (onCountdownTick) onCountdownTick(countdownSeconds, false);

      if (countdownSeconds <= 0) {
        _cancelCountdown();
        IntegrityService.setTerminated();
        if (onCountdownTick) onCountdownTick(0, true);
        if (onAutoTerminate) onAutoTerminate();
      }
    }, 1000);
  }

  function _cancelCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdownSeconds = 0;
  }

  function _fireWarning() {
    const level = IntegrityService.nextWarningLevel();
    if (level && onWarning) {
      onWarning(level, WARNING_MESSAGES[level]);
    }
  }

  function requestFullscreen() {
    if (document.documentElement.requestFullscreen) {
      return document.documentElement.requestFullscreen().catch(e => console.warn('Fullscreen denied:', e));
    }
    return Promise.resolve();
  }

  function destroy() {
    document.removeEventListener('visibilitychange', _handleVisibilityChange);
    window.removeEventListener('blur', _handleFocusLost);
    window.removeEventListener('focus', _handleFocusReturn);
    document.removeEventListener('fullscreenchange', _handleFullscreenChange);
    _cancelCountdown();
    initialized = false;
  }

  return { init, requestFullscreen, destroy };
})();

export default ProctoringService;
