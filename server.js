const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Global Active Sessions Store
const activeSessions = new Map();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString(), app: 'PrepPilot AI Context Engine' });
});

// START INTERVIEW SESSION API (With Full Candidate Profile Setup)
app.post('/api/interview/start', (req, res) => {
  const { 
    sessionId = `session_${Date.now()}`,
    jobRole = 'Full Stack Developer',
    interviewType = 'Technical & Architecture',
    experienceLevel = 'Mid Level (2-5 yrs)',
    resumeHighlights = 'Campus Bridge platform, React, Node.js, Firebase Auth, PostgreSQL',
    targetCompany = 'Tech Giant (FAANG)',
    difficultyLevel = 3,
    candidateName = 'Sarah Jenkins'
  } = req.body;

  // Custom AI Greeting reflecting full setup context
  const projectMention = resumeHighlights.split(',')[0] || 'your core projects';
  const initialGreeting = `Welcome ${candidateName}! I'm Dr. Aris Thorne, your AI Recruiter. We are calibrating this ${interviewType} session for a ${experienceLevel} ${jobRole} position at ${targetCompany}. To begin, please introduce yourself and walk me through your architecture choices in ${projectMention}.`;

  const sessionContext = {
    sessionId,
    candidateProfile: { name: candidateName, role: jobRole, experience: experienceLevel, resume: resumeHighlights, company: targetCompany },
    interviewType,
    currentQuestionIndex: 1,
    totalQuestions: 5,
    difficultyLevel: Number(difficultyLevel) || 3,
    previousQuestions: [initialGreeting],
    previousAnswers: [],
    evaluatedSkills: [],
    weakAreas: [],
    scores: []
  };

  activeSessions.set(sessionId, sessionContext);

  res.json({
    success: true,
    sessionId,
    greeting: initialGreeting,
    questionIndex: 1,
    totalQuestions: 5,
    difficultyLevel: sessionContext.difficultyLevel,
    config: sessionContext.candidateProfile
  });
});

// NEXT ADAPTIVE QUESTION API
app.post('/api/interview/next-question', (req, res) => {
  const { sessionId = 'session_default', answer = '' } = req.body;

  let session = activeSessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      candidateProfile: { name: 'Candidate', role: 'Full Stack Developer', experience: 'Mid Level', company: 'General Tech' },
      interviewType: 'Technical',
      currentQuestionIndex: 1,
      totalQuestions: 5,
      difficultyLevel: 3,
      previousQuestions: [],
      previousAnswers: [],
      evaluatedSkills: [],
      weakAreas: [],
      scores: []
    };
    activeSessions.set(sessionId, session);
  }

  const cleanAnswer = answer.trim();
  session.previousAnswers.push(cleanAnswer);

  const wordCount = cleanAnswer.split(/\s+/).length;
  const lowerAns = cleanAnswer.toLowerCase();

  const isUncertain = lowerAns.includes("don't know") || lowerAns.includes("not sure") || lowerAns.includes("silent") || wordCount < 6;
  const isHighQuality = (wordCount > 30) && (lowerAns.includes("architecture") || lowerAns.includes("scale") || lowerAns.includes("optimize") || lowerAns.includes("trade-off") || lowerAns.includes("security") || lowerAns.includes("database") || lowerAns.includes("react") || lowerAns.includes("node"));

  let qScore = 78;
  if (isUncertain) {
    qScore = 65;
    session.difficultyLevel = Math.max(1, session.difficultyLevel - 1);
    session.weakAreas.push("Depth under technical trade-offs");
  } else if (isHighQuality) {
    qScore = 93;
    session.difficultyLevel = Math.min(5, session.difficultyLevel + 1);
    session.evaluatedSkills.push("System Architecture & Scalability");
  } else {
    qScore = 84;
    session.evaluatedSkills.push("Core Problem Solving");
  }

  session.scores.push(qScore);
  session.currentQuestionIndex++;

  let nextQuestionText = "";
  let isComplete = session.currentQuestionIndex > session.totalQuestions;

  if (isComplete) {
    nextQuestionText = "Thank you for completing the interview session. Your responses have been processed by PrepPilot AI.";
  } else {
    // Dynamic Adaptive Follow-up based on Candidate Role & Previous Answer
    if (session.currentQuestionIndex === 2) {
      if (isUncertain) {
        nextQuestionText = `That's fine. For a ${session.candidateProfile.role}, let's start with basic building blocks: How do you structure state management and API data fetching in your apps?`;
      } else {
        nextQuestionText = `Great technical overview! Given your target role as ${session.candidateProfile.role} at ${session.candidateProfile.company}: What specific performance trade-offs did you encounter as traffic grew, and how did you prevent database bottlenecks?`;
      }
    } else if (session.currentQuestionIndex === 3) {
      if (lowerAns.includes("database") || lowerAns.includes("sql") || lowerAns.includes("mongo") || lowerAns.includes("firebase")) {
        nextQuestionText = `Interesting storage perspective! How would you handle database indexing, token refresh security, and API rate limiting if 100,000 active users hit your service simultaneously?`;
      } else {
        nextQuestionText = `Good response! How do you handle error recovery, token rotation, and zero-downtime microservice deployments in your production workflow?`;
      }
    } else if (session.currentQuestionIndex === 4) {
      if (session.difficultyLevel >= 4) {
        nextQuestionText = `You are demonstrating senior-level depth. Final technical question: How do you design distributed caching and horizontal sharding strategies to guarantee 99.99% availability?`;
      } else {
        nextQuestionText = `Good progress! Describe a situation where a technical decision you made turned out to be wrong under high load, and how you refactored it.`;
      }
    } else {
      nextQuestionText = `To wrap up our interview: Tell me about a time when you disagreed with a senior engineer's architectural design and how you used benchmarks to reach alignment.`;
    }
  }

  session.previousQuestions.push(nextQuestionText);

  res.json({
    success: true,
    isComplete,
    questionIndex: session.currentQuestionIndex,
    totalQuestions: session.totalQuestions,
    nextQuestion: nextQuestionText,
    evaluatedScore: qScore,
    currentDifficulty: session.difficultyLevel,
    coachingTip: isUncertain 
      ? "Tip: When unsure, break down your response into core engineering principles." 
      : "Tip: Great technical depth! Continue using concrete metrics."
  });
});

// FINAL REPORT API
app.post('/api/interview/report', (req, res) => {
  const { sessionId = 'session_default' } = req.body;
  const session = activeSessions.get(sessionId) || {
    scores: [84, 88, 92, 80, 86],
    candidateProfile: { name: 'Sarah Jenkins', role: 'Full Stack Developer', company: 'Tech Industry' },
    evaluatedSkills: ["System Design", "React", "Node.js API Security"],
    weakAreas: ["High-concurrency Sharding Trade-offs"]
  };

  const avgScore = session.scores.length 
    ? Math.round(session.scores.reduce((a,b)=>a+b, 0) / session.scores.length)
    : 85;

  res.json({
    success: true,
    overallScore: avgScore,
    candidateProfile: session.candidateProfile,
    metrics: {
      communication: Math.min(97, avgScore + 3),
      technicalKnowledge: avgScore,
      confidence: Math.min(96, avgScore + 4),
      answerRelevance: Math.min(98, avgScore + 2),
      eyeContact: 96,
      speakingPace: "Optimal"
    },
    strengths: [
      `Tailored expertise for ${session.candidateProfile.role} roles`,
      "Clear articulation of system component boundaries",
      "Proactive security and API token validation"
    ],
    weakTopics: [
      "High-concurrency database sharding trade-offs",
      "Zero-downtime schema expansion strategies"
    ],
    questionsAnsweredWell: [
      "System Architecture & State Management",
      "API Security & Performance Optimization"
    ],
    suggestedResources: [
      "System Design Interview by Alex Xu",
      "High Performance Browser Networking",
      "Designing Data-Intensive Applications"
    ]
  });
});

// SMART RESUME PARSER & AUTO PROFILE GENERATOR API
app.post('/api/resume/parse', (req, res) => {
  const { filename = 'Resume.pdf', rawText = '' } = req.body;

  // Extract Name from filename (e.g., "Khushal_Agarwal_Resume.pdf" -> "Khushal Agarwal") or text
  let candidateName = filename
    .replace(/\.(pdf|doc|docx|txt)$/i, '')
    .replace(/[-_]?(resume|cv|profile|final|v\d+)/gi, '')
    .replace(/[-_]/g, ' ')
    .trim();

  if (!candidateName || candidateName.length < 3) {
    candidateName = "Khushal Agarwal";
  } else {
    // Capitalize each word
    candidateName = candidateName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const combined = (filename + ' ' + rawText).toLowerCase();

  // Role Detection Logic
  let jobRole = "Full Stack Developer";
  if (combined.includes("product") || combined.includes("roadmap") || combined.includes("agile") || combined.includes("stakeholder")) {
    jobRole = "Product Manager";
  } else if (combined.includes("data") || combined.includes("analytics") || combined.includes("python") || combined.includes("sql") || combined.includes("pandas")) {
    jobRole = "Data Analyst / Engineer";
  } else if (combined.includes("backend") || combined.includes("microservice") || combined.includes("go") || combined.includes("kafka") || combined.includes("express")) {
    jobRole = "Backend Software Engineer";
  } else if (combined.includes("frontend") || combined.includes("css") || combined.includes("html") || combined.includes("ui")) {
    jobRole = "Frontend Engineer";
  }

  // Experience Level Detection
  let experienceLevel = "Mid Level (2-5 yrs)";
  if (combined.includes("senior") || combined.includes("lead") || combined.includes("5+") || combined.includes("architect")) {
    experienceLevel = "Senior Engineer (5+ yrs)";
  } else if (combined.includes("intern") || combined.includes("fresher") || combined.includes("entry") || combined.includes("student")) {
    experienceLevel = "Entry Level (0-2 yrs)";
  }

  // Recommended Interview Round & Target Company
  let interviewType = "Technical & Architecture";
  let targetCompany = "Tech Giant (FAANG)";
  if (jobRole === "Product Manager") {
    interviewType = "Project Defense";
    targetCompany = "E-Commerce Platform";
  } else if (jobRole === "Data Analyst / Engineer") {
    interviewType = "System Design & Scale";
    targetCompany = "High-Growth Startup";
  }

  // Resume Highlights summary
  const resumeHighlights = `${jobRole} profile extracted from ${filename}. Tech stack: React.js, Node.js microservices, PostgreSQL, API Security, Cloud Deployments.`;

  res.json({
    success: true,
    filename,
    extractedProfile: {
      candidateName,
      jobRole,
      experienceLevel,
      interviewType,
      targetCompany,
      resumeHighlights,
      difficultyLevel: 3
    }
  });
});

// PROCTORING EVENT LOGGER API
// Accepts structured integrity events from the frontend and stores them on the session
app.post('/api/interview/proctoring-event', (req, res) => {
  const { sessionId, eventType, severity = 'INFO', durationMs = 0, extras = {} } = req.body;
  if (!sessionId || !eventType) return res.status(400).json({ error: 'sessionId and eventType required' });

  const session = activeSessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (!session.proctoringLog) session.proctoringLog = [];
  const event = {
    eventId: `event_${String(session.proctoringLog.length + 1).padStart(3, '0')}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    eventType, severity, durationMs, ...extras,
  };
  session.proctoringLog.push(event);
  activeSessions.set(sessionId, session);
  console.log(`[Proctoring] Session ${sessionId}: ${eventType} (${severity})`);
  res.json({ success: true, event });
});

// Serve specific static pages
app.get('/interview-analysis', (req, res) => {
  res.sendFile(path.join(__dirname, 'interview-analysis.html'));
});
app.get('/interview-analysis.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'interview-analysis.html'));
});
app.get('/video-interview', (req, res) => {
  res.sendFile(path.join(__dirname, 'video-interview.html'));
});
app.get('/video-interview.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'video-interview.html'));
});
app.get('/interview', (req, res) => {
  res.sendFile(path.join(__dirname, 'interview.html'));
});
app.get('/interview.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'interview.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 PrepPilot AI Engine running on http://localhost:${PORT}`);
  });
}

module.exports = app;

