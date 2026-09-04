/**
 * PrepPilot AI Interview — Analytics Service
 * Aggregates candidate performance metrics, question-by-question breakdown,
 * and proctoring audit log into a single unified report payload.
 * Saves report to localStorage for interview-analysis.html rendering.
 */
const AnalyticsService = (() => {
  const STORAGE_KEY = 'prepPilotAnalyticsReport';

  function buildReport({ performanceMetrics = {}, integrityReport = {}, sessionMeta = {} }) {
    const report = {
      generatedAt: new Date().toISOString(),
      sessionMeta: {
        candidateName: sessionMeta.candidateName || 'Candidate',
        targetRole: sessionMeta.targetRole || 'Full Stack Developer',
        experienceLevel: sessionMeta.experienceLevel || 'Mid Level',
        interviewType: sessionMeta.interviewType || 'Technical',
        targetCompany: sessionMeta.targetCompany || 'Tech Giant (FAANG)',
        durationSeconds: sessionMeta.durationSeconds || 0,
        questionsAttempted: sessionMeta.questionsAttempted || 0,
        totalQuestions: sessionMeta.totalQuestions || 5,
        status: sessionMeta.status || 'COMPLETED',
        terminationReason: sessionMeta.terminationReason || null,
      },
      performance: {
        overallScore: performanceMetrics.overallScore ?? 84,
        communication: performanceMetrics.communication ?? 87,
        technicalKnowledge: performanceMetrics.technicalKnowledge ?? 84,
        confidence: performanceMetrics.confidence ?? 88,
        answerQuality: performanceMetrics.answerQuality ?? 86,
        speakingPace: performanceMetrics.speakingPace || 'Optimal',
        eyeContact: performanceMetrics.eyeContact || 'Good',
        averageResponseTimeSec: performanceMetrics.averageResponseTimeSec || null,
        fillerWordsCount: performanceMetrics.fillerWordsCount || null,
        longPausesCount: performanceMetrics.longPausesCount || null,
        strengths: performanceMetrics.strengths || [],
        improvements: performanceMetrics.improvements || [],
        aiRecommendations: performanceMetrics.aiRecommendations || [],
        questionAnalysis: performanceMetrics.questionAnalysis || [],
      },
      integrity: {
        integrityScore: integrityReport.integrityScore ?? 100,
        sessionStatus: integrityReport.sessionStatus ?? 'COMPLETED',
        focusLossCount: integrityReport.focusLossCount ?? 0,
        faceAbsentCount: integrityReport.faceAbsentCount ?? 0,
        multifaceCount: integrityReport.multifaceCount ?? 0,
        headOrientationCount: integrityReport.headOrientationCount ?? 0,
        identityConcernCount: integrityReport.identityConcernCount ?? 0,
        identityVerified: integrityReport.identityVerified ?? false,
        identityConsistencyPct: integrityReport.identityConsistencyPct ?? null,
        facePresencePct: integrityReport.facePresencePct ?? null,
        candidatePhotoDataUrl: integrityReport.candidatePhotoDataUrl || null,
        totalTimeAwaySeconds: integrityReport.totalTimeAwaySeconds ?? 0,
        totalFaceAbsentSeconds: integrityReport.totalFaceAbsentSeconds ?? 0,
        totalEvents: integrityReport.totalEvents ?? 0,
        eventLog: integrityReport.eventLog ?? [],
      }
    };
    return report;
  }

  function saveReport(report) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    } catch(e) {
      console.warn('AnalyticsService: could not save report to localStorage', e);
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
    return `${m}m ${s}s`;
  }

  return { buildReport, saveReport, loadReport, clearReport, formatDuration };
})();

export default AnalyticsService;
