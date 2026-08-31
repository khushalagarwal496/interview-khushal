/**
 * PrepPilot AI Interview — Analytics Service
 * Aggregates performance metrics + proctoring audit into a final report payload.
 * Persists data to localStorage so interview-analysis.html can render it.
 */
const AnalyticsService = (() => {
  const STORAGE_KEY = 'prepPilotAnalyticsReport';

  function buildReport({ performanceMetrics, integrityReport, sessionMeta }) {
    const report = {
      generatedAt: new Date().toISOString(),
      sessionMeta: {
        candidateName:    sessionMeta.candidateName   || 'Candidate',
        targetRole:       sessionMeta.targetRole      || 'Full Stack Developer',
        experienceLevel:  sessionMeta.experienceLevel || 'Mid Level',
        interviewType:    sessionMeta.interviewType   || 'Technical',
        targetCompany:    sessionMeta.targetCompany   || 'Tech Giant (FAANG)',
        durationSeconds:  sessionMeta.durationSeconds || 0,
        questionsAttempted: sessionMeta.questionsAttempted || 0,
        totalQuestions:   sessionMeta.totalQuestions  || 5,
        status:           sessionMeta.status          || 'COMPLETED',
        terminationReason: sessionMeta.terminationReason || null,
      },
      performance: {
        overallScore:       performanceMetrics.overallScore       ?? 82,
        communication:      performanceMetrics.communication      ?? 85,
        technicalKnowledge: performanceMetrics.technicalKnowledge ?? 78,
        confidence:         performanceMetrics.confidence         ?? 88,
        answerQuality:      performanceMetrics.answerQuality       ?? 82,
        speakingPace:       performanceMetrics.speakingPace        ?? 'Optimal',
        eyeContact:         performanceMetrics.eyeContact          ?? 'Good',
        strengths:          performanceMetrics.strengths           ?? [],
        improvements:       performanceMetrics.improvements        ?? [],
        aiRecommendations:  performanceMetrics.aiRecommendations   ?? [],
      },
      integrity: {
        integrityScore:              integrityReport.integrityScore              ?? 100,
        sessionStatus:               integrityReport.sessionStatus               ?? 'COMPLETED',
        focusLossCount:              integrityReport.focusLossCount              ?? 0,
        faceAbsentCount:             integrityReport.faceAbsentCount             ?? 0,
        multifaceCount:              integrityReport.multifaceCount              ?? 0,
        repeatedInterruptionCount:   integrityReport.repeatedInterruptionCount   ?? 0,
        totalTimeAwaySeconds:        integrityReport.totalTimeAwaySeconds        ?? 0,
        totalEvents:                 integrityReport.totalEvents                 ?? 0,
        eventLog:                    integrityReport.eventLog                    ?? [],
      }
    };
    return report;
  }

  function saveReport(report) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    } catch(e) {
      console.warn('AnalyticsService: could not save report', e);
    }
  }

  function loadReport() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  }

  function clearReport() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} Min${m !== 1 ? 's' : ''} ${s} Sec${s !== 1 ? 's' : ''}`;
  }

  return { buildReport, saveReport, loadReport, clearReport, formatDuration };
})();

export default AnalyticsService;
