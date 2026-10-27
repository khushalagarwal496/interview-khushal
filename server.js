require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const geminiService = require('./services/geminiService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Global Active Sessions Store
const activeSessions = new Map();

// In-Memory User and Profile Database
const usersDb = new Map([
  ['khushal@preppilot.ai', {
    id: 'user_001',
    email: 'khushal@preppilot.ai',
    name: 'Khushal Agarwal',
    passwordHash: 'demo123',
    role: 'Full Stack Developer',
    experienceLevel: 'Senior Engineer (5+ yrs)',
    targetCompany: 'Tech Giant (FAANG)',
    interviewType: 'Technical & Architecture',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India (IST / UTC+5:30)',
    github: 'https://github.com/khushal-dev',
    linkedin: 'https://linkedin.com/in/khushal-agarwal',
    portfolio: 'https://khushal.dev',
    bio: 'Passionate Full Stack Architect specializing in high-throughput Node.js microservices, distributed caching, and reactive React applications with AI-integrated pipelines.',
    skills: {
      frontend: ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux Toolkit', 'WebSockets'],
      backend: ['Node.js', 'Express', 'Python', 'Go', 'GraphQL', 'REST APIs'],
      cloudDevOps: ['Docker', 'Kubernetes', 'AWS (ECS/S3)', 'GCP', 'CI/CD Pipelines'],
      databases: ['PostgreSQL', 'Redis', 'MongoDB', 'Elasticsearch'],
      aiMl: ['OpenAI API', 'LangChain', 'Prompt Engineering', 'Vector DBs (Pinecone)']
    },
    experience: [
      { company: 'CloudScale Inc.', role: 'Senior Full Stack Engineer', period: '2023 - Present', highlights: 'Engineered real-time collaboration canvas serving 200k+ MAU with 99.98% uptime.' },
      { company: 'HyperStack Labs', role: 'Full Stack Developer', period: '2021 - 2023', highlights: 'Migrated monolithic Node API into Dockerized microservices; cut p99 latency by 45%.' }
    ],
    education: [
      { institution: 'National Institute of Technology', degree: 'B.Tech in Computer Science', year: '2021', score: '8.9 CGPA' }
    ],
    atsScore: 94,
    profileCompleteness: 95,
    difficultyLevel: 4
  }],
  ['sarah@preppilot.ai', {
    id: 'user_002',
    email: 'sarah@preppilot.ai',
    name: 'Sarah Jenkins',
    passwordHash: 'demo123',
    role: 'AI / Machine Learning Engineer',
    experienceLevel: 'Senior Engineer (5+ yrs)',
    targetCompany: 'OpenAI / Anthropic Tier',
    interviewType: 'System Design & Scale',
    phone: '+1 (415) 555-0192',
    location: 'San Francisco, CA (PST)',
    github: 'https://github.com/sarah-ml',
    linkedin: 'https://linkedin.com/in/sarahjenkins-ai',
    portfolio: 'https://sarahjenkins.ai',
    bio: 'AI Engineer building distributed LLM fine-tuning pipelines, RAG architectures, and scalable inference backends on Google Cloud and PyTorch.',
    skills: {
      frontend: ['React', 'Streamlit', 'D3.js Visualization'],
      backend: ['Python (FastAPI)', 'Ray', 'Triton Inference Server'],
      cloudDevOps: ['GCP Vertex AI', 'Kubernetes', 'Docker', 'MLflow'],
      databases: ['PostgreSQL (pgvector)', 'Pinecone', 'Redis'],
      aiMl: ['PyTorch', 'Hugging Face', 'Transformers', 'LoRA / QLoRA', 'LangChain']
    },
    experience: [
      { company: 'CognitiveScale', role: 'Lead AI Engineer', period: '2022 - Present', highlights: 'Architected enterprise RAG system with multi-agent orchestration and sub-second retrieval latency.' }
    ],
    education: [
      { institution: 'Stanford University', degree: 'M.S. in Artificial Intelligence', year: '2022', score: '3.9 GPA' }
    ],
    atsScore: 96,
    profileCompleteness: 98,
    difficultyLevel: 5
  }]
]);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    serverTime: new Date().toISOString(), 
    app: 'PrepPilot AI Context Engine',
    aiConfigured: geminiService.isAiConfigured()
  });
});

// AI Configuration Status
app.get('/api/ai/status', (req, res) => {
  const isConfigured = geminiService.isAiConfigured();
  const rawKey = geminiService.getApiKey();
  const maskedKey = rawKey && rawKey.length > 8 
    ? `${rawKey.substring(0, 4)}...${rawKey.substring(rawKey.length - 4)}` 
    : (isConfigured ? '***configured***' : 'not_set');

  res.json({
    success: true,
    provider: 'Google Gemini',
    isConfigured,
    maskedKey,
    model: 'gemini-1.5-flash / gemini-2.0-flash',
    features: [
      'Resume-Tailored Initial Question',
      'Adaptive In-Flight Follow-Ups based on Candidate Answers',
      'Dynamic Technical Scoring & Coaching Tips',
      'AI-Powered Final Readiness & Performance Report',
      'AI Resume Parser'
    ]
  });
});

// Set / Update AI Key at Runtime
app.post('/api/ai/set-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return res.status(400).json({ success: false, message: 'Invalid API key provided.' });
  }

  geminiService.setApiKey(apiKey.trim());
  res.json({
    success: true,
    message: 'Google Gemini API key updated successfully.',
    isConfigured: geminiService.isAiConfigured()
  });
});

// AUTH: Login API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const user = usersDb.get(email.toLowerCase().trim());
  if (user) {
    if (password && user.passwordHash && user.passwordHash !== password) {
      return res.status(401).json({ success: false, message: 'Invalid password credentials.' });
    }
    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        experienceLevel: user.experienceLevel,
        targetCompany: user.targetCompany,
        interviewType: user.interviewType,
        profile: user
      }
    });
  }

  // If user doesn't exist yet, auto-provision user profile for testing
  const fallbackUser = {
    id: `user_${Date.now()}`,
    email: email.toLowerCase().trim(),
    name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    passwordHash: password || 'pass123',
    role: 'Full Stack Developer',
    experienceLevel: 'Mid Level (2-5 yrs)',
    targetCompany: 'Tech Giant (FAANG)',
    interviewType: 'Technical & Architecture',
    phone: '+1 (555) 012-3456',
    location: 'Remote / Global',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    portfolio: '',
    bio: 'Experienced software engineer focused on building robust, scalable applications.',
    skills: {
      frontend: ['JavaScript', 'React', 'HTML5/CSS3'],
      backend: ['Node.js', 'Express', 'REST APIs'],
      cloudDevOps: ['Docker', 'AWS'],
      databases: ['PostgreSQL', 'MongoDB'],
      aiMl: ['OpenAI API']
    },
    experience: [
      { company: 'Tech Solutions Ltd', role: 'Software Developer', period: '2022 - Present', highlights: 'Built core features and maintained reliable web applications.' }
    ],
    education: [
      { institution: 'University of Technology', degree: 'B.S. in Computer Science', year: '2022', score: '3.8 GPA' }
    ],
    atsScore: 88,
    profileCompleteness: 85,
    difficultyLevel: 3
  };

  usersDb.set(email.toLowerCase().trim(), fallbackUser);
  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  res.json({
    success: true,
    token,
    user: {
      id: fallbackUser.id,
      email: fallbackUser.email,
      name: fallbackUser.name,
      role: fallbackUser.role,
      experienceLevel: fallbackUser.experienceLevel,
      targetCompany: fallbackUser.targetCompany,
      interviewType: fallbackUser.interviewType,
      profile: fallbackUser
    }
  });
});

// AUTH: Sign Up API
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name, role = 'Full Stack Developer', experienceLevel = 'Mid Level (2-5 yrs)', targetCompany = 'Tech Giant (FAANG)' } = req.body;

  if (!email || !name) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const newUser = {
    id: `user_${Date.now()}`,
    email: cleanEmail,
    name: name.trim(),
    passwordHash: password || 'pass123',
    role,
    experienceLevel,
    targetCompany,
    interviewType: 'Technical & Architecture',
    phone: '',
    location: 'Remote',
    github: '',
    linkedin: '',
    portfolio: '',
    bio: `Driven ${role} eager to master technical interviews and deliver high-impact software solutions.`,
    skills: {
      frontend: ['JavaScript', 'HTML/CSS', 'React'],
      backend: ['Node.js', 'Express', 'REST APIs'],
      cloudDevOps: ['Docker', 'Git'],
      databases: ['SQL', 'MongoDB'],
      aiMl: ['Prompt Engineering']
    },
    experience: [],
    education: [],
    atsScore: 82,
    profileCompleteness: 70,
    difficultyLevel: 3
  };

  usersDb.set(cleanEmail, newUser);
  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  res.json({
    success: true,
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      experienceLevel: newUser.experienceLevel,
      targetCompany: newUser.targetCompany,
      interviewType: newUser.interviewType,
      profile: newUser
    }
  });
});

// USER: Get Profile
app.get('/api/user/profile', (req, res) => {
  const email = (req.query.email || 'khushal@preppilot.ai').toLowerCase().trim();
  const profile = usersDb.get(email) || usersDb.get('khushal@preppilot.ai');
  res.json({ success: true, profile });
});

// USER: Update Profile
app.post('/api/user/profile', (req, res) => {
  const { email, profile } = req.body;
  if (!email || !profile) {
    return res.status(400).json({ success: false, message: 'Email and profile payload required.' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const existing = usersDb.get(cleanEmail) || {};
  const updated = { ...existing, ...profile, email: cleanEmail };
  usersDb.set(cleanEmail, updated);

  res.json({ success: true, message: 'Profile saved successfully.', profile: updated });
});

// START INTERVIEW SESSION API
app.post('/api/interview/start', async (req, res) => {
  const { 
    sessionId = `session_${Date.now()}`,
    jobRole = 'Full Stack Developer',
    interviewType = 'Technical & Architecture',
    experienceLevel = 'Mid Level (2-5 yrs)',
    resumeHighlights = '',
    targetCompany = 'Tech Giant (FAANG)',
    difficultyLevel = 3,
    candidateName = 'Candidate'
  } = req.body;

  const candidateProfile = { 
    name: candidateName, 
    role: jobRole, 
    experience: experienceLevel, 
    resume: resumeHighlights, 
    company: targetCompany 
  };

  const projectMention = (resumeHighlights && resumeHighlights.trim()) 
    ? resumeHighlights.split(',')[0].trim() 
    : 'your core technical projects';
  let initialGreeting = `Welcome ${candidateName}! I'm Dr. Aris Thorne, your AI Recruiter. We are calibrating this ${interviewType} session for a ${experienceLevel} ${jobRole} position at ${targetCompany}. To begin, please introduce yourself and walk me through your key architecture choices in ${projectMention}.`;

  // Try real Gemini AI generation if configured
  try {
    const aiResult = await geminiService.generateInitialQuestion(candidateProfile, interviewType, Number(difficultyLevel) || 3);
    if (aiResult && aiResult.greeting) {
      initialGreeting = aiResult.greeting;
      console.log(`[Gemini AI] Generated personalized greeting for ${candidateName} (${jobRole})`);
    }
  } catch (err) {
    console.warn('[Gemini AI] Initial question generation failed, using fallback:', err.message);
  }

  const sessionContext = {
    sessionId,
    candidateProfile,
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
app.post('/api/interview/next-question', async (req, res) => {
  const { sessionId = 'session_default', answer = '' } = req.body;

  let session = activeSessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      candidateProfile: { name: 'Candidate', role: 'Full Stack Developer', experience: 'Mid Level', company: 'General Tech', resume: '' },
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

  let coachingTip = isUncertain 
    ? "Tip: When unsure, break down your response into core engineering principles." 
    : "Tip: Great technical depth! Continue using concrete metrics.";

  let nextQuestionText = "";
  let isComplete = (session.currentQuestionIndex + 1) > session.totalQuestions;

  // Try Real Gemini AI Follow-Up Generation
  let aiFollowUp = null;
  try {
    aiFollowUp = await geminiService.generateAdaptiveFollowUp(session, cleanAnswer);
  } catch (err) {
    console.warn('[Gemini AI] Adaptive follow-up failed, falling back:', err.message);
  }

  if (aiFollowUp && aiFollowUp.nextQuestion) {
    if (typeof aiFollowUp.evaluatedScore === 'number') qScore = aiFollowUp.evaluatedScore;
    nextQuestionText = aiFollowUp.nextQuestion;
    if (aiFollowUp.coachingTip) coachingTip = aiFollowUp.coachingTip;
    if (aiFollowUp.skillEvaluated) session.evaluatedSkills.push(aiFollowUp.skillEvaluated);
    if (aiFollowUp.weakAreaIdentified) session.weakAreas.push(aiFollowUp.weakAreaIdentified);
    if (aiFollowUp.adjustedDifficulty) session.difficultyLevel = aiFollowUp.adjustedDifficulty;
    if (typeof aiFollowUp.isComplete === 'boolean') isComplete = aiFollowUp.isComplete;
    session.currentQuestionIndex++;
    console.log(`[Gemini AI] Follow-up generated for Q${session.currentQuestionIndex}. Score: ${qScore}`);
  } else {
    session.currentQuestionIndex++;
    if (isComplete) {
      nextQuestionText = "Thank you for completing the interview session. Your responses have been processed by PrepPilot AI.";
    } else {
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
  }

  session.scores.push(qScore);
  session.previousQuestions.push(nextQuestionText);

  res.json({
    success: true,
    isComplete,
    questionIndex: session.currentQuestionIndex,
    totalQuestions: session.totalQuestions,
    nextQuestion: nextQuestionText,
    evaluatedScore: qScore,
    currentDifficulty: session.difficultyLevel,
    coachingTip
  });
});

// EVALUATE SINGLE RESPONSE API (Used by text interview mode)
app.post('/api/interview/evaluate', async (req, res) => {
  const { question = '', answer = '', role = 'Software Engineer' } = req.body;
  const cleanAnswer = (answer || '').trim();

  // Try Gemini AI evaluation
  try {
    if (geminiService.isAiConfigured()) {
      const prompt = `Evaluate this interview response for a ${role} position.\nQuestion: ${question}\nCandidate Answer: ${cleanAnswer}\n\nReturn JSON strictly with:\n{\n  "overallScore": number (50-98),\n  "feedbackSummary": "concise 1-2 sentence feedback"\n}`;
      const raw = await geminiService.callGemini(prompt, 'You are an expert technical interviewer.', true);
      const parsed = geminiService.cleanAndParseJson ? geminiService.cleanAndParseJson(raw, null) : null;
      if (parsed && typeof parsed.overallScore === 'number') {
        return res.json(parsed);
      }
    }
  } catch(e) {}

  // Heuristic Fallback
  const wordCount = cleanAnswer.split(/\s+/).length;
  const score = Math.min(95, Math.max(68, 72 + Math.floor(wordCount / 3)));
  res.json({
    overallScore: score,
    feedbackSummary: wordCount > 30 
      ? "Strong explanation of architectural trade-offs! Keep using concrete STAR metrics for upcoming questions."
      : "Good technical baseline. Expand further on scalability trade-offs and error recovery."
  });
});

// FINAL REPORT API
app.post('/api/interview/report', async (req, res) => {
  const { sessionId = 'session_default' } = req.body;
  const session = activeSessions.get(sessionId) || {
    scores: [84, 88, 92, 80, 86],
    candidateProfile: { name: 'Khushal Agarwal', role: 'Full Stack Developer', company: 'Tech Giant (FAANG)', resume: 'Full stack development' },
    evaluatedSkills: ["System Design", "React", "Node.js API Security"],
    weakAreas: ["High-concurrency Sharding Trade-offs"],
    previousQuestions: [],
    previousAnswers: []
  };

  // Try real Gemini AI Comprehensive Report
  try {
    const aiReport = await geminiService.generateFinalReport(session);
    if (aiReport && aiReport.overallScore) {
      console.log(`[Gemini AI] Comprehensive evaluation report generated for ${session.candidateProfile.name}`);
      return res.json({
        success: true,
        overallScore: aiReport.overallScore,
        candidateProfile: session.candidateProfile,
        executiveSummary: aiReport.executiveSummary,
        metrics: aiReport.metrics || {
          communication: 88,
          technicalKnowledge: aiReport.overallScore,
          confidence: 86,
          answerRelevance: 88,
          eyeContact: 95,
          speakingPace: "Optimal"
        },
        strengths: aiReport.strengths || [
          `Tailored expertise for ${session.candidateProfile.role} roles`,
          "Clear articulation of system boundaries"
        ],
        weakTopics: aiReport.weakTopics || [
          "High-concurrency database sharding trade-offs"
        ],
        questionsAnsweredWell: aiReport.questionsAnsweredWell || [
          "System Architecture & State Management"
        ],
        suggestedResources: aiReport.suggestedResources || [
          "Designing Data-Intensive Applications by Martin Kleppmann"
        ]
      });
    }
  } catch (err) {
    console.warn('[Gemini AI] Final report generation failed, using fallback:', err.message);
  }

  // Fallback heuristic report
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

// SMART RESUME PARSER & AUTO PROFILE GENERATOR API (Enhanced PDF Extraction Intelligence)
app.post('/api/resume/parse', async (req, res) => {
  const { filename = 'Resume.pdf', rawText = '' } = req.body;

  // Try real Gemini AI Parsing if configured and rawText provided
  try {
    if (geminiService.isAiConfigured() && rawText && rawText.length > 30) {
      const aiParsed = await geminiService.parseResumeWithAI(rawText, filename);
      if (aiParsed && (aiParsed.name || aiParsed.role)) {
        console.log(`[Gemini AI] Parsed resume for ${aiParsed.name || 'Candidate'}`);
        return res.json({
          success: true,
          filename,
          atsScore: 92,
          extractedProfile: {
            candidateName: aiParsed.name || 'Candidate',
            jobRole: aiParsed.role || 'Full Stack Developer',
            experienceLevel: aiParsed.experienceLevel || 'Mid Level (2-5 yrs)',
            interviewType: 'Technical & Architecture',
            targetCompany: aiParsed.targetCompany || 'Tier-1 Tech',
            resumeHighlights: aiParsed.resumeHighlights || rawText.substring(0, 300),
            difficultyLevel: 3,
            skills: aiParsed.skills || {
              frontend: ['React', 'TypeScript'],
              backend: ['Node.js', 'Express'],
              databases: ['PostgreSQL'],
              cloudDevOps: ['Docker', 'AWS'],
              aiMl: ['OpenAI API']
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Gemini AI] Resume parsing error, using heuristic fallback:', err.message);
  }

  let candidateName = filename
    .replace(/\.(pdf|doc|docx|txt)$/i, '')
    .replace(/[-_]?(resume|cv|profile|final|v\d+)/gi, '')
    .replace(/[-_]/g, ' ')
    .trim();

  if (!candidateName || candidateName.length < 3) {
    candidateName = "Khushal Agarwal";
  } else {
    candidateName = candidateName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const combined = (filename + ' ' + rawText).toLowerCase();

  // Role Detection Logic
  let jobRole = "Full Stack Developer";
  if (combined.includes("product") || combined.includes("roadmap") || combined.includes("agile") || combined.includes("stakeholder")) {
    jobRole = "Product Manager";
  } else if (combined.includes("data") || combined.includes("analytics") || combined.includes("pandas") || combined.includes("bi")) {
    jobRole = "Data Analyst / Engineer";
  } else if (combined.includes("machine learning") || combined.includes("llm") || combined.includes("pytorch") || combined.includes("tensorflow") || combined.includes("ai engineer")) {
    jobRole = "AI / Machine Learning Engineer";
  } else if (combined.includes("backend") || combined.includes("microservice") || combined.includes("go") || combined.includes("kafka") || combined.includes("express")) {
    jobRole = "Backend Software Engineer";
  } else if (combined.includes("frontend") || combined.includes("css") || combined.includes("html") || combined.includes("ui") || combined.includes("react")) {
    jobRole = "Frontend Engineer";
  }

  // Experience Level Detection
  let experienceLevel = "Mid Level (2-5 yrs)";
  let diffLevel = 3;
  if (combined.includes("senior") || combined.includes("lead") || combined.includes("principal") || combined.includes("5+") || combined.includes("architect")) {
    experienceLevel = "Senior Engineer (5+ yrs)";
    diffLevel = 4;
  } else if (combined.includes("intern") || combined.includes("fresher") || combined.includes("entry") || combined.includes("student")) {
    experienceLevel = "Entry Level (0-2 yrs)";
    diffLevel = 2;
  }

  // Target Interview Setup
  let interviewType = "Technical & Architecture";
  let targetCompany = "Tech Giant (FAANG)";
  if (jobRole === "Product Manager") {
    interviewType = "Project Defense";
    targetCompany = "E-Commerce Platform";
  } else if (jobRole.includes("Data") || jobRole.includes("AI")) {
    interviewType = "System Design & Scale";
    targetCompany = "High-Growth AI Startup";
  }

  // Skills Extraction NLP Map
  const extractedSkills = {
    frontend: [],
    backend: [],
    cloudDevOps: [],
    databases: [],
    aiMl: []
  };

  const skillKeywords = {
    frontend: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Vue', 'HTML5', 'CSS3', 'Redux', 'Webpack'],
    backend: ['Node.js', 'Express', 'Python', 'FastAPI', 'Go', 'Java', 'Spring Boot', 'GraphQL', 'REST APIs', 'gRPC'],
    cloudDevOps: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'GitHub Actions', 'Terraform', 'Nginx'],
    databases: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Elasticsearch', 'DynamoDB', 'Supabase', 'Firebase'],
    aiMl: ['OpenAI API', 'PyTorch', 'TensorFlow', 'LangChain', 'Hugging Face', 'Vector Search', 'Pandas', 'NumPy']
  };

  for (const [cat, list] of Object.entries(skillKeywords)) {
    for (const kw of list) {
      if (combined.includes(kw.toLowerCase())) {
        extractedSkills[cat].push(kw);
      }
    }
  }

  // Ensure default skills if parsing empty string
  if (extractedSkills.frontend.length === 0 && extractedSkills.backend.length === 0) {
    extractedSkills.frontend = ['React.js', 'TypeScript', 'Tailwind CSS'];
    extractedSkills.backend = ['Node.js', 'Express', 'REST APIs'];
    extractedSkills.databases = ['PostgreSQL', 'Redis'];
    extractedSkills.cloudDevOps = ['Docker', 'AWS', 'CI/CD'];
    extractedSkills.aiMl = ['OpenAI API', 'LangChain'];
  }

  let calculatedAts = 75;
  if (rawText.length > 300) calculatedAts += 10;
  if (combined.includes('@') || combined.includes('email')) calculatedAts += 5;
  if (combined.includes('github') || combined.includes('linkedin')) calculatedAts += 4;
  if (Object.values(extractedSkills).flat().length > 6) calculatedAts += 5;
  calculatedAts = Math.min(98, Math.max(65, calculatedAts));

  const resumeHighlights = `${jobRole} profile extracted from ${filename}. Skills: ${Object.values(extractedSkills).flat().slice(0, 6).join(', ')}. Target: ${targetCompany}.`;

  res.json({
    success: true,
    filename,
    atsScore: calculatedAts,
    extractedProfile: {
      candidateName,
      jobRole,
      experienceLevel,
      interviewType,
      targetCompany,
      resumeHighlights,
      difficultyLevel: diffLevel,
      skills: extractedSkills
    }
  });
});

// PROCTORING EVENT LOGGER API
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

// Serve static pages with and without .html extensions
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'signin.html'));
});
app.get('/signin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'signin.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'signin.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});
app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

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
