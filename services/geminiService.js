/**
 * PrepPilot AI - Google Gemini Integration Service
 * Dynamically generates interview questions tailored to candidate resume and evaluates
 * candidate responses in real-time for follow-ups and final comprehensive reports.
 */

let runtimeApiKey = process.env.GEMINI_API_KEY || '';

function setApiKey(key) {
  runtimeApiKey = (key || '').trim();
}

function getApiKey() {
  return runtimeApiKey || process.env.GEMINI_API_KEY || '';
}

function isAiConfigured() {
  const key = getApiKey();
  return Boolean(key && key.length > 10 && !key.includes('your_api_key_here'));
}

/**
 * Safely parse JSON from LLM responses, stripping any markdown backticks.
 */
function cleanAndParseJson(text, fallback = {}) {
  if (!text || typeof text !== 'string') return fallback;
  try {
    const trimmed = text.trim();
    // Direct parse if clean JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return JSON.parse(trimmed);
    }
    // Remove markdown code fences ```json ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      return JSON.parse(match[1].trim());
    }
    // Search for first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
  } catch (err) {
    console.warn('[GeminiService] JSON parse error, returning fallback:', err.message);
  }
  return fallback;
}

/**
 * Call Google Gemini REST API using native fetch
 */
async function callGemini(prompt, systemInstruction = '', jsonMode = true) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const models = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash'
  ];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      
      const contents = [];
      if (systemInstruction) {
        contents.push({
          role: 'user',
          parts: [{ text: `[System Instruction: ${systemInstruction}]` }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'Understood. I will strictly act as instructed.' }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const bodyPayload = {
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1200,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {})
        }
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[GeminiService] Model ${model} returned HTTP ${response.status}:`, errText);
        lastError = new Error(`HTTP ${response.status}: ${errText}`);
        continue; // Try next model
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        return candidateText;
      }
    } catch (err) {
      console.warn(`[GeminiService] Failed with model ${model}:`, err.message);
      lastError = err;
    }
  }

  console.error('[GeminiService] All Gemini models failed:', lastError?.message);
  return null;
}

/**
 * 1. Generate Resume-Aware Initial Interview Greeting & Question
 */
async function generateInitialQuestion(candidateProfile, interviewType = 'Technical & Architecture', difficultyLevel = 3) {
  const {
    name = 'Candidate',
    role = 'Software Engineer',
    experience = 'Mid Level',
    company = 'Tech Company',
    resume = ''
  } = candidateProfile;

  if (!isAiConfigured()) {
    return null; // Triggers fallback
  }

  const prompt = `
Candidate Profile:
- Name: ${name}
- Target Role: ${role}
- Experience Level: ${experience}
- Target Company: ${company}
- Interview Round: ${interviewType}
- Target Difficulty: Level ${difficultyLevel} of 5
- Resume Highlights / Projects:
${resume || 'Full stack web development, REST APIs, database design, system performance.'}

Task:
You are Dr. Aris Thorne, an expert AI Technical Recruiter conducting an interview at ${company}.
Formulate:
1. A warm, professional greeting addressing ${name}.
2. The FIRST interview question tailored directly to the specific projects, technologies, or architecture decisions found in the candidate's resume highlights.
Ask the candidate to introduce themselves briefly and explain their architectural choices and trade-offs in one of their key projects.

Output format MUST be strictly JSON:
{
  "greeting": "Greeting and opening question combined in natural, spoken conversational voice (2 to 3 sentences max for Text-to-Speech).",
  "focusArea": "Project Architecture & Background",
  "difficulty": ${difficultyLevel}
}
`;

  const systemInstruction = 'You are Dr. Aris Thorne, an articulate and perceptive AI Technical Interviewer. Keep questions natural, concise, and professional for spoken audio.';
  const rawText = await callGemini(prompt, systemInstruction, true);
  if (!rawText) return null;

  return cleanAndParseJson(rawText, null);
}

/**
 * 2. Evaluate Candidate's Answer and Generate the Next Adaptive Question
 */
async function generateAdaptiveFollowUp(sessionContext, candidateAnswer) {
  if (!isAiConfigured()) {
    return null; // Triggers fallback
  }

  const {
    candidateProfile,
    interviewType,
    currentQuestionIndex,
    totalQuestions = 5,
    difficultyLevel = 3,
    previousQuestions = [],
    previousAnswers = []
  } = sessionContext;

  const lastQuestion = previousQuestions[previousQuestions.length - 1] || 'Describe your project architecture.';
  const historySnippet = previousQuestions.map((q, idx) => {
    const a = previousAnswers[idx] || (idx === previousQuestions.length - 1 ? candidateAnswer : '');
    return `Q${idx + 1}: ${q}\nA${idx + 1}: ${a || '[No answer]'}`;
  }).join('\n\n');

  const isFinalStep = currentQuestionIndex >= totalQuestions;

  const prompt = `
Interview Context:
- Candidate: ${candidateProfile.name}
- Target Role: ${candidateProfile.role} (${candidateProfile.experience}) at ${candidateProfile.company}
- Interview Type: ${interviewType}
- Current Question #${currentQuestionIndex} of ${totalQuestions}
- Current Difficulty Level: ${difficultyLevel}/5
- Resume Highlights: ${candidateProfile.resume || 'Modern software engineering stack'}

Interview History:
${historySnippet}

Candidate's Latest Spoken Answer to Question #${currentQuestionIndex}:
"${candidateAnswer}"

Your Task:
1. Actively evaluate the candidate's answer for technical accuracy, clarity, depth, and STAR methodology.
2. Score this answer from 50 to 98 based on technical substance.
3. Formulate a brief (1 sentence) constructive coaching tip.
4. If this is NOT the final question (${isFinalStep ? 'IT IS FINAL QUESTION' : 'NEXT QUESTION NEEDED'}):
   - Ask a logical, adaptive follow-up question.
   - If the candidate gave a great response: drill down into real-world edge cases, scalability bottlenecks, high concurrency, security, or trade-offs.
   - If the candidate was vague or uncertain: pivot gracefully to a foundational concept or ask how they would break the problem down.
   - Connect the question with their resume skills or the target role (${candidateProfile.role}).
   - Make the question natural and conversational for spoken voice (2 to 3 sentences max).
5. If this is the final question, set isComplete to true and provide a warm closing statement.

Output format MUST be strictly JSON:
{
  "evaluatedScore": 85,
  "feedbackSummary": "Concise 1-2 sentence feedback on their answer.",
  "coachingTip": "Actionable 1-sentence tip.",
  "skillEvaluated": "e.g. Distributed Caching / State Management",
  "weakAreaIdentified": "Optional weak area or null",
  "nextQuestion": "The next question to speak, or closing thank you if complete.",
  "adjustedDifficulty": 3,
  "isComplete": ${isFinalStep}
}
`;

  const systemInstruction = 'You are Dr. Aris Thorne. You listen carefully to candidate answers and ask incisive, contextual follow-ups that challenge and assess true engineering capability.';
  const rawText = await callGemini(prompt, systemInstruction, true);
  if (!rawText) return null;

  return cleanAndParseJson(rawText, null);
}

/**
 * 3. Generate Comprehensive Post-Interview Performance & Integrity Report
 */
async function generateFinalReport(sessionContext) {
  if (!isAiConfigured()) {
    return null; // Triggers fallback
  }

  const {
    candidateProfile,
    interviewType,
    scores = [],
    previousQuestions = [],
    previousAnswers = []
  } = sessionContext;

  const qAndA = previousQuestions.map((q, idx) => ({
    q,
    a: previousAnswers[idx] || '[Candidate gave no response]'
  }));

  const prompt = `
Candidate Interview Summary:
- Candidate Name: ${candidateProfile.name}
- Target Role: ${candidateProfile.role}
- Experience: ${candidateProfile.experience}
- Target Company: ${candidateProfile.company}
- Interview Type: ${interviewType}
- Resume Highlights: ${candidateProfile.resume}

Full Interview Transcript:
${JSON.stringify(qAndA, null, 2)}

Task:
Analyze the complete interview transcript thoroughly. Provide a production-grade readiness assessment.
Generate:
1. Overall score (0-100) and category breakdown (communication, technicalKnowledge, confidence, answerRelevance).
2. Key strengths demonstrated specifically during this conversation.
3. Specific technical topics where the candidate needs improvement.
4. Questions they answered particularly well.
5. Curated high-impact study resources tailored to their weak areas.
6. A concise executive summary of their hireability for ${candidateProfile.role} at ${candidateProfile.company}.

Output format MUST be strictly JSON:
{
  "overallScore": 87,
  "executiveSummary": "2-3 sentences summarizing performance and placement readiness.",
  "metrics": {
    "communication": 89,
    "technicalKnowledge": 85,
    "confidence": 88,
    "answerRelevance": 86,
    "eyeContact": 95,
    "speakingPace": "Optimal (135 WPM)"
  },
  "strengths": [
    "Concrete strength 1 with reference to their answer",
    "Concrete strength 2",
    "Concrete strength 3"
  ],
  "weakTopics": [
    "Specific area 1 to improve",
    "Specific area 2 to improve"
  ],
  "questionsAnsweredWell": [
    "Topic or question handled excellently"
  ],
  "suggestedResources": [
    "Designing Data-Intensive Applications by Martin Kleppmann",
    "System Design Interview by Alex Xu"
  ]
}
`;

  const systemInstruction = 'You are a Principal Engineering Director and Senior Hiring Committee member reviewing candidate interview transcripts.';
  const rawText = await callGemini(prompt, systemInstruction, true);
  if (!rawText) return null;

  return cleanAndParseJson(rawText, null);
}

/**
 * 4. Parse Resume with AI into Structured Profile
 */
async function parseResumeWithAI(rawText, filename = 'Resume.pdf') {
  if (!isAiConfigured() || !rawText || rawText.trim().length < 20) {
    return null;
  }

  const prompt = `
Resume Filename: ${filename}
Raw Resume Text:
"""
${rawText.substring(0, 5000)}
"""

Task:
Extract and infer candidate profile data from this resume text:
1. Full Name
2. Primary Target Job Role (e.g. Full Stack Developer, Backend Engineer, Frontend Engineer, AI/ML Engineer, DevOps Engineer, Cloud Architect, Data Engineer)
3. Experience Level (Junior / Entry Level (0-2 yrs), Mid Level (2-5 yrs), Senior Engineer (5+ yrs), Lead / Staff Architect (8+ yrs))
4. Target or Past Company (e.g. Google, Amazon, Microsoft, Uber, Stripe, or Startup)
5. Key skills grouped by category
6. Brief 1-2 sentence resume summary highlighting key projects and tech stack for the interviewer to reference.

Output format MUST be strictly JSON:
{
  "name": "Candidate Full Name",
  "role": "Detected Job Role",
  "experienceLevel": "Mid Level (2-5 yrs)",
  "targetCompany": "FAANG / Tier-1 Tech",
  "skills": {
    "frontend": ["React", "TypeScript"],
    "backend": ["Node.js", "Express"],
    "databases": ["PostgreSQL", "MongoDB"],
    "cloudDevOps": ["Docker", "AWS"],
    "aiMl": ["LLMs", "Prompt Engineering"]
  },
  "resumeHighlights": "Summary of core projects, metrics, and architecture."
}
`;

  const systemInstruction = 'You are an expert technical resume parser and talent analyst.';
  const rawTextResult = await callGemini(prompt, systemInstruction, true);
  if (!rawTextResult) return null;

  return cleanAndParseJson(rawTextResult, null);
}

module.exports = {
  setApiKey,
  getApiKey,
  isAiConfigured,
  generateInitialQuestion,
  generateAdaptiveFollowUp,
  generateFinalReport,
  parseResumeWithAI
};
