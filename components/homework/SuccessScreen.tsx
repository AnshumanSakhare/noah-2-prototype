"use client";

import React, { useEffect, useState } from 'react';
import { useHomework, HomeworkStep, HomeworkAnswer } from './context';
import { learningOutcomes, topicContent } from '../../data/topics';
import { RecapSlidesModal } from './RecapSlidesModal';
import confetti from 'canvas-confetti';

interface SuccessScreenProps {
  onSeeTeacher: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ onSeeTeacher }) => {
  const { 
    homeworkSteps, 
    setHomeworkSteps, 
    hwAnswers, 
    setHwAnswers, 
    setHwIndex, 
    setStreak, 
    setIsCompleted, 
    setHwStartTime, 
    setHwElapsed, 
    hwElapsed, 
    showToast,
    setActiveAssignmentId,
    activeAssignmentId,
    assignHomeworkDb
  } = useHomework();

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedQIndex, setSelectedQIndex] = useState<number>(0);

  // DB Results states
  const [dbResults, setDbResults] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  const isDbAssignment = activeAssignmentId && !activeAssignmentId.startsWith('demo');

  useEffect(() => {
    if (isDbAssignment) {
      const fetchResults = async () => {
        setLoadingDb(true);
        try {
          const res = await fetch(`/api/homework/${activeAssignmentId}/results`);
          const json = await res.json();
          if (json.success) {
            setDbResults(json.data);
            if (json.data.stats.accuracy >= 70) {
              fireConfetti();
            }
          }
        } catch (err) {
          console.error("Failed to fetch DB results:", err);
        } finally {
          setLoadingDb(false);
        }
      };
      fetchResults();
    } else {
      // Demo fallback confetti
      const questionSteps = homeworkSteps.filter(s => s.isQuestion);
      let correctCount = 0;
      questionSteps.forEach(qs => {
        const stepIdx = homeworkSteps.indexOf(qs);
        if (hwAnswers[stepIdx] && hwAnswers[stepIdx].correct) correctCount++;
      });
      const pct = questionSteps.length ? Math.round((correctCount / questionSteps.length) * 100) : 0;
      if (pct >= 70) {
        fireConfetti();
      }
    }
  }, [activeAssignmentId]);

  const fireConfetti = () => {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const questionSteps = homeworkSteps.filter(s => s.isQuestion);
  let correctCount = 0;
  questionSteps.forEach(qs => {
    const stepIdx = homeworkSteps.indexOf(qs);
    if (hwAnswers[stepIdx] && hwAnswers[stepIdx].correct) correctCount++;
  });
  
  // Local computed metrics
  const localPct = questionSteps.length ? Math.round((correctCount / questionSteps.length) * 100) : 0;
  const localTimeMin = Math.max(1, Math.round(hwElapsed / 60000));

  // Resolved metrics from DB or Local
  const pct = dbResults ? dbResults.stats.accuracy : localPct;
  const displayScore = dbResults ? dbResults.stats.score : correctCount;
  const displayTotal = dbResults ? dbResults.stats.total : questionSteps.length;
  const timeMin = dbResults ? Math.max(1, Math.round(dbResults.stats.totalTimeMs / 60000)) : localTimeMin;
  const avgTime = dbResults ? `${(dbResults.stats.avgTimeMs / 1000).toFixed(1)}s` : `${(hwElapsed / homeworkSteps.length / 1000).toFixed(1)}s`;

  // Map review list
  const allReviews: Array<{
    num: number;
    topic: string;
    text: string;
    type: string;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    timeSpent: string;
    pts: number;
    difficulty: string;
  }> = [];

  if (dbResults) {
    // Render a canonical Output / Eval value into readable text.
    const fmt = (v: any): string => {
      if (v === null || v === undefined) return 'No answer';
      if (Array.isArray(v)) return v.map(fmt).join(', ');
      if (typeof v === 'object') return Object.entries(v).map(([k, val]) => `${k} → ${fmt(val)}`).join(', ');
      return String(v);
    };

    dbResults.attempts.forEach((a: any, idx: number) => {
      const type = a.interaction_type;
      const s = a.variation_data || {};
      const spec = a.evaluation_spec || {};
      const out = a.student_answer;

      // Pull the inner value out of the canonical Output wrapper for each archetype.
      const innerOut =
        type === 'tap-select' ? out?.selected :
        type === 'drag-drop' ? out?.placements :
        type === 'fill-slot' ? out?.slots :
        type === 'sequence-order' ? out?.order :
        type === 'build-count' ? out?.count :
        type === 'number-line' ? out?.position :
        type === 'partition' ? out?.parts :
        out;

      const userAnsText = innerOut === null || innerOut === undefined ? 'No answer' : fmt(innerOut);
      const correctAnsText = fmt(spec.answer);

      allReviews.push({
        num: idx + 1,
        topic: a.learning_objective || a.subtopic || 'General',
        text: s.question_text || s.text || s.sentence?.replace(/\{___\}/g, '_____') || 'Interactive Challenge',
        type: a.interaction_type,
        correct: a.is_correct,
        userAnswer: userAnsText,
        correctAnswer: correctAnsText,
        explanation: s.explanation || `Performance: ${a.performance ?? 0}/100. Re-evaluate parameters and concept guidance.`,
        timeSpent: `${(a.time_taken_ms / 1000).toFixed(1)}s`,
        pts: Math.round((a.performance ?? (a.is_correct ? 100 : 0)) / 100 * 3),
        difficulty: (a.difficulty || 'medium').toUpperCase()
      });
    });
  } else {
    // Demo mode mapping
    homeworkSteps.forEach((s, idx) => {
      if (!s.isQuestion) return;
      const ans = hwAnswers[idx];
      const isCorrect = !!(ans && ans.correct);
      
      let userAnsText = 'No answer';
      let correctAnsText = '';

      if (s.type === 'mcq') {
        userAnsText = ans && ans.answer !== undefined ? s.options?.[ans.answer] || 'No answer' : 'No answer';
        correctAnsText = s.options?.[s.correct || 0] || '';
      } else if (s.type === 'fill') {
        userAnsText = ans ? ans.answer : 'No answer';
        correctAnsText = (s.answer || '') + (s.unit ? ' ' + s.unit : '');
      } else if (s.type === 'blanks') {
        userAnsText = ans ? ans.filledBlanks?.filter(Boolean).join(', ') || 'No answer' : 'No answer';
        correctAnsText = s.answers?.join(', ') || '';
      } else if (s.type === 'drag') {
        userAnsText = ans && ans.placements 
          ? Object.entries(ans.placements).map(([zone, item]) => `${item} → ${zone}`).join(', ') 
          : 'No answer';
        correctAnsText = s.pairs?.map(p => `${p.item} → ${p.zone}`).join(', ') || '';
      }

      const qNum = homeworkSteps.filter((x, qIdx) => x.isQuestion && qIdx <= idx).length;
      const topicName = s.lo?.name || s.topic || '';

      const timeSpentVal = ans && (ans as any).timeSpent ? ((ans as any).timeSpent / 1000) : (Math.random() * 3 + 1);
      const timeSpentStr = `${timeSpentVal.toFixed(1)}s`;
      const pts = s.type === 'mcq' ? 2 : 3;
      const difficulty = s.type === 'mcq' ? 'EASY' : 'MEDIUM';

      allReviews.push({
        num: qNum,
        topic: topicName,
        text: s.text || s.sentence?.replace(/\{___\}/g, '_____') || '',
        type: s.type,
        correct: isCorrect,
        userAnswer: userAnsText,
        correctAnswer: correctAnsText,
        explanation: s.explanation || 'Review the topic concepts to reinforce your understanding.',
        timeSpent: timeSpentStr,
        pts,
        difficulty
      });
    });
  }

  const wrongReviews = allReviews.filter(r => !r.correct);

  // Learning Plan breakdown rows (Green >= 75%, Yellow 50-74%, Red < 50%)
  const breakdownRows: Array<{
    name: string;
    p: number;
    tag: string;
    label: string;
    color: string;
  }> = [];

  if (dbResults && dbResults.plan) {
    dbResults.plan.forEach((p: any) => {
      let label = 'Needs practice';
      let color = 'red';
      let tag = 'struggle';

      if (p.strength === 'green') {
        label = 'Strong';
        color = 'green';
        tag = 'over';
      } else if (p.strength === 'yellow') {
        label = 'Developing';
        color = 'yellow';
        tag = 'dev';
      }

      breakdownRows.push({
        name: p.subtopic,
        p: p.accuracy,
        tag,
        label,
        color
      });
    });
  } else {
    // Demo mode mapping
    const topicsUsed = [...new Set(questionSteps.map(q => q.topic || ''))];
    topicsUsed.forEach(topicId => {
      const lo = learningOutcomes.find(l => l.id === topicId);
      const qs = questionSteps.filter(q => q.topic === topicId);
      const correctCountForTopic = qs.filter(q => {
        const si = homeworkSteps.indexOf(q);
        return hwAnswers[si] && hwAnswers[si].correct;
      }).length;
      const ratio = qs.length ? correctCountForTopic / qs.length : 0;
      const p = Math.round(ratio * 100);

      let tag = 'struggle';
      let label = 'Needs practice';
      let color = 'red';

      if (ratio >= 0.75) {
        tag = 'over';
        label = 'Strong';
        color = 'green';
      } else if (ratio >= 0.4) {
        tag = 'dev';
        label = 'Developing';
        color = 'yellow';
      }

      breakdownRows.push({ name: lo?.name || topicId, p, tag, label, color });
    });
  }

  // Difficulty Tier Stats
  const difficultyStats = dbResults?.stats?.difficulty || {
    easy: { total: 0, correct: 0, accuracy: 0 },
    medium: { total: 0, correct: 0, accuracy: 0 },
    hard: { total: 0, correct: 0, accuracy: 0 }
  };

  // Safe retry function (only for demo assignments)
  const retryWrongQuestions = () => {
    const wrongQs = homeworkSteps.filter((s, idx) => s.isQuestion && (!hwAnswers[idx] || !hwAnswers[idx].correct));
    if (wrongQs.length === 0) return;

    const retrySteps: HomeworkStep[] = [];
    wrongQs.forEach(q => {
      const clonedQ = { ...q };
      if (q.type === 'mcq' && q.options) {
        const origOptions = [...q.options];
        const correctText = origOptions[q.correct || 0];
        const shuffled = [...origOptions].sort(() => Math.random() - 0.5);
        clonedQ.options = shuffled;
        clonedQ.correct = shuffled.indexOf(correctText);
      }
      retrySteps.push(clonedQ);
    });

    setHomeworkSteps(retrySteps);
    setHwIndex(0);
    setHwAnswers({});
    setStreak(0);
    setIsCompleted(false);
    setHwStartTime(Date.now());
    setHwElapsed(0);
    showToast('🔄 Retry session launched! Practice makes permanent.');
  };

  const activeReview = allReviews[selectedQIndex];

  if (loadingDb) {
    return (
      <div className="success-screen show" style={{ display: 'grid', placeItems: 'center', height: '80vh', color: 'var(--text-dim)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin-icon" style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite', marginBottom: '16px' }}>⚙️</div>
          <h3 style={{ fontWeight: 800 }}>Analyzing Homework Outcomes...</h3>
          <p style={{ fontSize: '0.82rem' }}>Compiling correct answer keys and scoring subtopic strengths...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="success-screen show" id="successScreen" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Hero Summary Panel */}
      <div className="success-hero-new">
        <div className="shn-eyebrow">HOMEWORK COMPLETE</div>
        <div className="shn-title">Hi Scholar - here is your score recap.</div>
        <div className="shn-desc">
          You sit in the <strong>{pct >= 80 ? 'Mastery Achieved' : pct >= 50 ? 'Foundation Builder' : 'Early Start'}</strong> band. The summary below shows your performance and learning path.
        </div>
        
        <div className="shn-score-section">
          <div className="shn-score-number">{pct}<span> / 100</span></div>
          <div className="shn-stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={i < Math.max(1, Math.round(pct / 20)) ? 'star filled' : 'star'}>★</span>
            ))}
          </div>
        </div>

        <div className="shn-tags-row">
          <span className="shn-tag primary-badge">{pct >= 80 ? 'Mastery' : pct >= 50 ? 'Foundation' : 'Early Start'}</span>
          <span className="shn-tag secondary-badge">Next: {pct >= 80 ? 'Expert Path' : 'Foundation Builder'}</span>
          <span className="shn-tag neutral-badge">{displayScore}/{displayTotal} correct</span>
          <span className="shn-tag neutral-badge">{timeMin}m total</span>
        </div>
      </div>

      {/* 2. KPI Metrics Cards Grid */}
      <div className="success-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap">📊</div>
          <div className="kpi-value">{pct}%</div>
          <div className="kpi-title">Accuracy Rate</div>
          <div className="kpi-sub">Scaled score · {displayScore}/{displayTotal} correct</div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-icon-wrap">⏳</div>
          <div className="kpi-value">{avgTime}</div>
          <div className="kpi-title">Avg Time / Q</div>
          <div className="kpi-sub">{timeMin}m total elapsed time</div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-icon-wrap">📈</div>
          <div className="kpi-value" style={{ fontSize: '1.25rem', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <span>E: {difficultyStats.easy.accuracy}%</span>
            <span>M: {difficultyStats.medium.accuracy}%</span>
            <span>H: {difficultyStats.hard.accuracy}%</span>
          </div>
          <div className="kpi-title">Accuracy by Tier</div>
          <div className="kpi-sub">Easy, Medium, and Hard tier breakouts</div>
        </div>
      </div>

      {/* 3. Interactive Answer Review Panel */}
      <div className="review-answers-panel">
        <div className="rap-header">
          <div className="rap-title">
            <span className="checked-icon">✓</span>
            <strong style={{ fontSize: '0.94rem', fontWeight: 900 }}>Review your answers</strong>
          </div>
          <div className="rap-legend">
            <span className="leg-item"><span className="leg-dot correct"></span>Correct</span>
            <span className="leg-item"><span className="leg-dot wrong"></span>Wrong</span>
          </div>
        </div>
        
        <div className="rap-intro">Tap any question to see your answer, the correct answer, and the explanation.</div>
        
        <div className="rap-buttons-row">
          {allReviews.map((r, idx) => (
            <button 
              key={idx} 
              className={`rap-q-btn ${r.correct ? 'correct' : 'wrong'} ${selectedQIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedQIndex(idx)}
            >
              {r.num}
            </button>
          ))}
        </div>

        {activeReview && (
          <div className="rap-details-card animate-fade">
            <div className="rap-details-header">
              <div className="rdh-title">QUESTION {activeReview.num} &bull; <span style={{ textTransform: 'uppercase' }}>{activeReview.difficulty}</span></div>
              <div className={`rdh-status-badge ${activeReview.correct ? 'correct' : 'wrong'}`}>
                {activeReview.correct ? 'GOT IT RIGHT' : 'GOT IT WRONG'}
              </div>
            </div>
            
            <div className="rap-question-text">{activeReview.text}</div>
            
            <div className="rap-comparison-grid">
              <div className="comp-item">
                <div className="comp-label">YOUR ANSWER</div>
                <div className={`comp-val-box ${activeReview.correct ? 'correct' : 'wrong'}`}>
                  {activeReview.userAnswer}
                </div>
              </div>
              
              {!activeReview.correct && (
                <div className="comp-item" style={{ marginTop: '10px' }}>
                  <div className="comp-label">CORRECT ANSWER</div>
                  <div className="comp-val-box correct">
                    {activeReview.correctAnswer}
                  </div>
                </div>
              )}
            </div>
            
            <div className="rap-explanation-box">
              <div className="reb-label">WHY</div>
              <div className="reb-content">{activeReview.explanation}</div>
            </div>
            
            <div className="rap-card-footer">
              <button 
                className="rap-nav-btn"
                disabled={selectedQIndex === 0}
                onClick={() => setSelectedQIndex(prev => prev - 1)}
              >
                &larr; Previous
              </button>
              <button 
                className="rap-nav-btn"
                disabled={selectedQIndex === allReviews.length - 1}
                onClick={() => setSelectedQIndex(prev => prev + 1)}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Plan Matrix Breakdown (Adaptive Practice launch CTAs) */}
      <div className="learning-plan-matrix-card">
        <div className="lpm-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>⚡ AI learning plan matrix</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Recommended personalized study plan to level up your score
            </div>
          </div>
          <span className="lpm-badge">AI PLAN</span>
        </div>

        <div className="lpm-grid">
          {breakdownRows.map((r, idx) => (
            <div key={idx} className={`lpm-item-card strength-${r.color}`}>
              <div className="lpm-item-header">
                <span className="lpm-item-name">{r.name}</span>
                <span className="lpm-item-score">{r.p}/100</span>
              </div>
              
              <div className="lpm-desc-text">
                Continue focused practice to reinforce conceptual foundations, address missteps, and build mastery.
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span className={`lpm-item-tag ${r.tag}`}>
                  {r.label === 'Strong' ? 'Mastered' : r.label === 'Developing' ? 'Needs Focus' : 'Urgent Practice'}
                </span>
                
                <button 
                  className="lpm-practice-btn"
                  onClick={() => {
                    assignHomeworkDb(r.name, 5, 'adaptive').then(id => {
                      if (id) {
                        showToast(`🚀 Practice session launched for: ${r.name}!`);
                      }
                    });
                  }}
                >
                  Practice Subtopic
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lpm-goal-bar">
          <strong>Next goal:</strong> {pct >= 80 
            ? "Perfect conceptual mastery! Practice advanced friction formulas and multi-mass dynamics." 
            : "Foundation Builder should help you slow down, practice the triangular F-m-a widget, and build strong number sense."}
        </div>
      </div>

      {/* Return to Dashboard controls */}
      <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: '20px', display: 'flex', gap: '14px', justifyContent: 'center' }}>
        <button 
          className="nav-btn secondary" 
          onClick={() => setActiveAssignmentId(null)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          🏠 Return to Playground
        </button>
        
        {!isDbAssignment && wrongReviews.length > 0 && (
          <button className="nav-btn accent-btn" onClick={retryWrongQuestions}>
            🔄 Practice Missed Questions
          </button>
        )}
        
        <button 
          className="nav-btn primary" 
          onClick={onSeeTeacher}
        >
          📊 See teacher view
        </button>
      </div>

      <RecapSlidesModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
      
      <style>{`
        /* LPM strength specific subtopic colors */
        .lpm-item-card.strength-green {
          border-left: 5px solid #16B981;
          background: rgba(22, 185, 129, 0.02);
        }
        .lpm-item-card.strength-yellow {
          border-left: 5px solid #FF9F43;
          background: rgba(255, 159, 67, 0.02);
        }
        .lpm-item-card.strength-red {
          border-left: 5px solid #F0556B;
          background: rgba(240, 85, 107, 0.02);
        }
        .lpm-practice-btn {
          background: white;
          border: 1.5px solid var(--accent);
          color: var(--accent);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
        }
        .lpm-practice-btn:hover {
          background: var(--accent);
          color: white;
        }
      `}</style>
    </div>
  );
};

export default SuccessScreen;
