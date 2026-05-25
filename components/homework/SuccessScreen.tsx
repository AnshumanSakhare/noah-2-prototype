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
    setActiveAssignmentId
  } = useHomework();

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [rendered, setRendered] = useState<boolean>(false);
  const [selectedQIndex, setSelectedQIndex] = useState<number>(0);

  useEffect(() => {
    setRendered(true);
    // Fire confetti on load if score >= 70%
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
  }, []);

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
  const pct = questionSteps.length ? Math.round((correctCount / questionSteps.length) * 100) : 0;
  const timeMin = Math.max(1, Math.round(hwElapsed / 60000));

  // Gathering reviews
  const wrongReviews: Array<{
    num: number;
    topic: string;
    text: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }> = [];

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

    // Enterprise-grade mocked metric tags
    const timeSpentVal = ans && (ans as any).timeSpent ? ((ans as any).timeSpent / 1000) : (Math.random() * 3 + 1);
    const timeSpentStr = `${timeSpentVal.toFixed(1)}s`;
    const pts = s.type === 'mcq' ? 2 : 3;
    const difficulty = s.type === 'mcq' ? 'EASY' : 'MEDIUM';

    const reviewObj = {
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
    };

    allReviews.push(reviewObj);

    if (!isCorrect) {
      wrongReviews.push({
        num: qNum,
        topic: topicName,
        text: reviewObj.text,
        userAnswer: userAnsText,
        correctAnswer: correctAnsText,
        explanation: reviewObj.explanation
      });
    }
  });

  // Retry missed questions
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

  // Breakdown metrics
  const topicsUsed = [...new Set(questionSteps.map(q => q.topic || ''))];
  const breakdownRows = topicsUsed.map(topicId => {
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

    return { name: lo?.name || topicId, p, tag, label, color };
  });

  const activeReview = allReviews[selectedQIndex];

  return (
    <div className="success-screen show" id="successScreen" style={{ display: 'flex' }}>
      
      {/* 1. Hero Section (Placement Complete design) */}
      <div className="success-hero-new">
        <div className="shn-eyebrow">HOMEWORK COMPLETE</div>
        <div className="shn-title">Hi Scholar - here is your spot.</div>
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
          <span className="shn-tag neutral-badge">Student: Scholar</span>
          <span className="shn-tag neutral-badge">{correctCount}/{questionSteps.length} correct</span>
          <span className="shn-tag neutral-badge">{timeMin}m total</span>
        </div>
      </div>

      {/* 2. KPI Metrics Cards Row */}
      <div className="success-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap">📊</div>
          <div className="kpi-value">{pct}%</div>
          <div className="kpi-title">Score</div>
          <div className="kpi-sub">Scaled to 100 · {correctCount}/{questionSteps.length} correct</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap">✅</div>
          <div className="kpi-value">{correctCount}</div>
          <div className="kpi-title">Correct Answers</div>
          <div className="kpi-sub">{(questionSteps.length - correctCount)} incorrect out of {questionSteps.length} total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap">⚡</div>
          <div className="kpi-value">{homeworkSteps.length}</div>
          <div className="kpi-title">Journey Nodes</div>
          <div className="kpi-sub">Completed interactive steps</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap">⏳</div>
          <div className="kpi-value">{(hwElapsed / homeworkSteps.length / 1000).toFixed(1)}s</div>
          <div className="kpi-title">Avg Time / Node</div>
          <div className="kpi-sub">{(hwElapsed / 1000).toFixed(0)}s total run time</div>
        </div>
      </div>

      {/* 4. Review your answers Block */}
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
          <div className="rap-details-card">
            <div className="rap-details-header">
              <div className="rdh-title">QUESTION {activeReview.num}</div>
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
                ← Previous
              </button>
              <button 
                className="rap-nav-btn"
                disabled={selectedQIndex === allReviews.length - 1}
                onClick={() => setSelectedQIndex(prev => prev + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. AI Learning Plan Matrix */}
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
            <div key={idx} className="lpm-item-card">
              <div className="lpm-item-header">
                <span className="lpm-item-name">{r.name}</span>
                <span className="lpm-item-score">{r.p}/100</span>
              </div>
              
              <div className="lpm-desc-text">
                {topicContent[topicsUsed[idx] || 'lo1']?.recap?.text?.replace(/<[^>]*>/g, '') || 
                 "Continue practice on inertia, motion equations, action-reaction pairs, and Newton's Three Laws to build solid conceptual foundation."}
              </div>
              
              <span className={`lpm-item-tag ${r.tag}`}>
                {r.label === 'Strong' ? 'Mastered' : r.label === 'Developing' ? 'Needs Focus' : 'Needs Urgent Help'}
              </span>
            </div>
          ))}
        </div>

        <div className="lpm-goal-bar">
          <strong>Next goal:</strong> {pct >= 80 
            ? "Perfect conceptual mastery! Practice advanced friction formulas and multi-mass dynamics." 
            : "Foundation Builder should help you slow down, practice the triangular F-m-a widget, and build strong number sense."}
        </div>
      </div>

      {/* 3. Question-by-Question Breakdown Card */}
      <div className="breakdown-card-new">
        <div className="bcn-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>📋 Question-by-Question Breakdown</h3>
            <div className="bcn-sub" style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>Detailed analysis per question</div>
          </div>
          <button className="methodology-btn" onClick={() => setModalOpen(true)}>🔬 Study Sheet</button>
        </div>
        
        <div className="bcn-table-wrapper">
          <table className="bcn-table">
            <thead>
              <tr>
                <th>Q</th>
                <th>DIFFICULTY</th>
                <th>YOUR ANSWER</th>
                <th>CORRECT</th>
                <th>RESULT</th>
                <th>TIME</th>
                <th>PTS</th>
                <th>EARNED</th>
                <th>FLAGS</th>
              </tr>
            </thead>
            <tbody>
              {allReviews.map((r, idx) => (
                <tr 
                  key={idx} 
                  className={selectedQIndex === idx ? 'active-row' : ''} 
                  onClick={() => setSelectedQIndex(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="q-num">{r.num}</td>
                  <td>
                    <span className={`diff-badge ${r.difficulty.toLowerCase()}`}>
                      {r.difficulty}
                    </span>
                  </td>
                  <td className={r.correct ? 'ans-text correct' : 'ans-text wrong'}>
                    {r.userAnswer}
                  </td>
                  <td className="ans-text correct">{r.correctAnswer}</td>
                  <td className="result-char">{r.correct ? '✓' : '✗'}</td>
                  <td className="space-mono">{r.timeSpent}</td>
                  <td className="space-mono">{r.pts}</td>
                  <td className="space-mono">{r.correct ? r.pts : 0}</td>
                  <td>
                    {!r.correct ? <span className="flag-badge">Rapid</span> : <span className="flag-badge-ok">Optimal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '6px 0', marginBottom: '20px', display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          className="nav-btn secondary" 
          onClick={() => setActiveAssignmentId(null)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          🏠 Return to Playground
        </button>
        {wrongReviews.length > 0 && (
          <button className="nav-btn accent-btn" onClick={retryWrongQuestions} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontWeight: 800, cursor: 'pointer' }}>
            🔄 Practice Missed Questions
          </button>
        )}
        <button 
          className="nav-btn primary" 
          onClick={onSeeTeacher} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          📊 See teacher view
        </button>
      </div>

      <RecapSlidesModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
};
export default SuccessScreen;
