import { useState } from "react";

const DOMAINS = [
  "All Domains (Mixed)",
  "People – Leading a Team",
  "Process – Project Execution",
  "Business Environment – Strategy & Value",
];

const PRINCIPLES = [
  "All Principles (Mixed)",
  "Stewardship",
  "Team Collaboration",
  "Stakeholder Engagement",
  "Value Focus",
  "Systems Thinking",
  "Leadership",
  "Tailoring",
  "Quality",
  "Complexity Navigation",
  "Risk Management",
  "Adaptability & Resilience",
  "Change Management",
];

const APPROACHES = ["Mixed (All)", "Predictive (Waterfall)", "Agile", "Hybrid"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"];

const SYSTEM_PROMPT = `You are a certified PMP exam question writer specializing in the PMBOK 7th Edition.
You create realistic, scenario-based PMP exam questions that test situational judgment, not memorization.

Rules for every question:
1. Present a realistic project scenario with context (3-5 sentences)
2. Ask what the project manager should do NEXT or FIRST
3. Provide exactly 4 answer choices (A, B, C, D)
4. Make all distractors plausible — no obviously wrong answers
5. The correct answer must align with PMI's "best practice" mindset: proactive, ethical, collaborative, value-driven
6. For Agile questions, favor servant leadership, iterative delivery, and team empowerment
7. For Predictive questions, favor proper process, stakeholder communication, and change control
8. Vary the industries across questions (IT, construction, healthcare, finance, pharma, etc.)

Return a JSON array of exactly 10 question objects. No markdown, no extra text, valid JSON only:
[
  {
    "scenario": "...",
    "question": "...",
    "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "A",
    "explanation": "...",
    "principleOrDomain": "...",
    "approach": "Agile|Predictive|Hybrid"
  }
]`;

export default function PMPQuestionGenerator() {
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [principle, setPrinciple] = useState(PRINCIPLES[0]);
  const [approach, setApproach] = useState(APPROACHES[0]);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[3]);

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [phase, setPhase] = useState("config");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQuiz = async () => {
    setLoading(true);
    setError(null);

    const userPrompt = `Generate exactly 10 ${difficulty === "Mixed" ? "varied difficulty" : difficulty} PMP exam scenario-based questions.
- Domain: ${domain}
- PMBOK 7th Edition Principle: ${principle}
- Project Approach: ${approach}

Ensure variety across industries, scenarios, and sub-topics. Each question must be distinct.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await response.json();
      const text = data.content.map((b) => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid response");

      setQuestions(parsed);
      setAnswers({});
      setRevealed({});
      setCurrent(0);
      setPhase("quiz");
    } catch (err) {
      setError("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const q = questions[current];
  const selectedAnswer = answers[current];
  const isRevealed = revealed[current];

  const handleSelect = (letter) => {
    if (isRevealed) return;
    setAnswers((a) => ({ ...a, [current]: letter }));
  };

  const handleCheck = () => {
    if (!selectedAnswer) return;
    setRevealed((r) => ({ ...r, [current]: true }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
    else setPhase("results");
  };

  const getScore = () => questions.filter((q, i) => answers[i] === q.correctAnswer).length;

  const getChoiceStyle = (letter) => {
    const base = "w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ";
    if (!isRevealed) {
      return base + (selectedAnswer === letter
        ? "border-indigo-500 bg-indigo-50 text-indigo-800 cursor-pointer"
        : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer");
    }
    if (letter === q.correctAnswer) return base + "border-green-500 bg-green-50 text-green-800";
    if (letter === selectedAnswer) return base + "border-red-400 bg-red-50 text-red-800";
    return base + "border-gray-200 bg-white text-gray-400";
  };

  // ── Results Screen ────────────────────────────────────────
  if (phase === "results") {
    const score = getScore();
    const pct = Math.round((score / questions.length) * 100);

    return (
      <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
        <div className="max-w-3xl mx-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
            <div className="bg-indigo-600 px-6 py-6 text-center">
              <div className="text-indigo-200 text-xs uppercase tracking-widest mb-2">Quiz Complete</div>
              <div className="text-white text-6xl font-bold mb-1">
                {score}<span className="text-indigo-300 text-3xl">/{questions.length}</span>
              </div>
              <div className={`text-2xl font-semibold ${pct >= 70 ? "text-green-300" : "text-red-300"}`}>
                {pct}% — {pct >= 70 ? "Pass ✓" : "Needs Work ✗"}
              </div>
              <div className="text-indigo-200/60 text-xs mt-1">PMP passing benchmark is ~70%</div>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-2">Question Review</div>
              {questions.map((qq, i) => {
                const isCorrect = answers[i] === qq.correctAnswer;
                return (
                  <div key={i} className={`rounded-xl border p-4 ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`text-lg font-bold mt-0.5 ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                        {isCorrect ? "✓" : "✗"}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          <span className="bg-indigo-100 text-indigo-700 text-xs rounded-full px-2 py-0.5">Q{i + 1}</span>
                          <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">{qq.principleOrDomain}</span>
                          <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">{qq.approach}</span>
                        </div>
                        <p className="text-gray-800 text-sm font-medium mb-1">{qq.question}</p>
                        {!isCorrect && answers[i] && (
                          <p className="text-red-500 text-xs mb-1">Your answer: {answers[i]} — {qq.choices[answers[i]]}</p>
                        )}
                        <p className={`text-xs font-semibold ${isCorrect ? "text-green-700" : "text-gray-700"}`}>
                          Correct: {qq.correctAnswer} — {qq.choices[qq.correctAnswer]}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{qq.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => setPhase("config")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all text-sm">
            ✦ Start New Quiz
          </button>
          <p className="text-center text-white/20 text-xs mt-4 pb-2">Based on PMBOK® Guide 7th Edition · PMI Exam Content Outline</p>
        </div>
      </div>
    );
  }

  // ── Quiz Screen ───────────────────────────────────────────
  if (phase === "quiz" && q) {
    const answeredCount = Object.keys(revealed).length;
    const progress = ((current) / questions.length) * 100;

    return (
      <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
        <div className="max-w-3xl mx-auto py-6">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPhase("config")} className="text-white/40 hover:text-white/70 text-sm transition-colors">← Back</button>
            <div className="text-white/60 text-sm">
              Question <span className="text-white font-bold">{current + 1}</span> of {questions.length}
              <span className="ml-3 text-green-400 font-semibold">{answeredCount} answered</span>
            </div>
          </div>

          <div className="w-full bg-white/10 rounded-full h-1.5 mb-5">
            <div className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 px-5 py-2 flex flex-wrap gap-2 items-center">
              <span className="text-white font-bold text-sm">Q{current + 1}</span>
              <span className="text-indigo-100 text-xs bg-white/20 rounded-full px-3 py-0.5">{q.approach}</span>
              <span className="text-indigo-100 text-xs bg-white/20 rounded-full px-3 py-0.5">{q.principleOrDomain}</span>
            </div>

            <div className="p-6">
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3 mb-5">
                <div className="text-amber-700 text-xs uppercase font-bold tracking-wider mb-1">Scenario</div>
                <p className="text-gray-700 text-sm leading-relaxed">{q.scenario}</p>
              </div>

              <p className="text-gray-900 font-semibold text-base mb-4">{q.question}</p>

              <div className="space-y-2 mb-5">
                {Object.entries(q.choices).map(([letter, text]) => (
                  <button key={letter} onClick={() => handleSelect(letter)} className={getChoiceStyle(letter)}>
                    <span className="font-bold mr-2">{letter}.</span>{text}
                    {isRevealed && letter === q.correctAnswer && <span className="ml-2 text-green-600">✓</span>}
                    {isRevealed && letter === selectedAnswer && selectedAnswer !== q.correctAnswer && <span className="ml-2 text-red-500">✗</span>}
                  </button>
                ))}
              </div>

              {isRevealed && (
                <div className={`rounded-xl p-4 mb-4 ${selectedAnswer === q.correctAnswer ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <div className={`font-bold text-sm mb-1 ${selectedAnswer === q.correctAnswer ? "text-green-700" : "text-red-700"}`}>
                    {selectedAnswer === q.correctAnswer ? "✓ Correct!" : `✗ Incorrect — Correct answer: ${q.correctAnswer}`}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{q.explanation}</p>
                </div>
              )}

              {!isRevealed ? (
                <button onClick={handleCheck} disabled={!selectedAnswer}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all text-sm">
                  {selectedAnswer ? "Check Answer" : "Select an answer first"}
                </button>
              ) : (
                <button onClick={handleNext}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all text-sm">
                  {current < questions.length - 1 ? `→ Next Question (${current + 2}/${questions.length})` : "🏁 View Results"}
                </button>
              )}
            </div>
          </div>

          {/* Question dot navigator */}
          <div className="flex justify-center flex-wrap gap-2 mt-5">
            {questions.map((_, i) => {
              const isDone = revealed[i];
              const isCorrectDot = isDone && answers[i] === questions[i].correctAnswer;
              const isCurrent = i === current;
              return (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${isCurrent ? "border-white scale-110" : "border-transparent"} ${
                    isDone ? isCorrectDot ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    : "bg-white/10 text-white/50 hover:bg-white/20"
                  }`}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <p className="text-center text-white/20 text-xs mt-4 pb-2">Based on PMBOK® Guide 7th Edition · PMI Exam Content Outline</p>
        </div>
      </div>
    );
  }

  // ── Config Screen ─────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-10">
          <div className="inline-block bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-1 text-indigo-300 text-xs tracking-widest uppercase mb-3">
            PMBOK 7th Edition
          </div>
          <h1 style={{ fontFamily: "'Georgia', serif" }} className="text-3xl font-bold text-white mb-1">PMP Exam Prep</h1>
          <p className="text-indigo-300/70 text-sm">Generate a 10-question AI-powered quiz</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-indigo-300 text-xs uppercase tracking-wider mb-1">Domain</label>
              <select value={domain} onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400">
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-indigo-300 text-xs uppercase tracking-wider mb-1">Approach</label>
              <select value={approach} onChange={(e) => setApproach(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400">
                {APPROACHES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-indigo-300 text-xs uppercase tracking-wider mb-1">Principle</label>
              <select value={principle} onChange={(e) => setPrinciple(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400">
                {PRINCIPLES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-indigo-300 text-xs uppercase tracking-wider mb-1">Difficulty</label>
              <div className="flex gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      difficulty === d
                        ? d === "Easy" ? "bg-green-500/30 border-green-400 text-green-300"
                          : d === "Medium" ? "bg-yellow-500/30 border-yellow-400 text-yellow-300"
                          : d === "Hard" ? "bg-red-500/30 border-red-400 text-red-300"
                          : "bg-indigo-500/30 border-indigo-400 text-indigo-300"
                        : "bg-slate-800 border-white/10 text-white/40 hover:border-white/30"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className="text-indigo-300 text-3xl font-bold">10</div>
            <div>
              <div className="text-white text-sm font-semibold">Questions per quiz</div>
              <div className="text-indigo-300/60 text-xs">All generated at once — fresh, unique, AI-powered</div>
            </div>
          </div>

          <button onClick={generateQuiz} disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm tracking-wide">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating 10 Questions...
              </span>
            ) : "✦ Start 10-Question Quiz"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-400/30 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        <p className="text-center text-white/20 text-xs pb-6">Based on PMBOK® Guide 7th Edition · PMI Exam Content Outline</p>
      </div>
    </div>
  );
}
