"use client";

import React, { useEffect, useState } from 'react';
import { useHomework, HomeworkStep, HomeworkAnswer } from './context';
import { learningOutcomes, topicContent } from '../../data/topics';
import { RecapSlidesModal } from './RecapSlidesModal';
import { extractOutputValue } from '../../lib/scoring';
import confetti from 'canvas-confetti';

// Band color for a 0–100 value (matches the green/yellow/red strength tiers).
const bandColor = (v: number): string => (v >= 75 ? '#16B981' : v >= 50 ? '#FF9F43' : '#F0556B');

// Circular progress ring with the value centered inside.
const ScoreRing: React.FC<{ value: number; size?: number; stroke?: number; color?: string; suffix?: string }> = ({
  value, size = 132, stroke = 13, color, suffix = ''
}) => {
  const v = Math.max(0, Math.min(100, value || 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - v / 100);
  const c = color || bandColor(v);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${v} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f5" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.22,.61,.36,1)' }}
      />
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.27} fontWeight={900} fill="#20243A">{v}</text>
      <text x="50%" y="66%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.1} fontWeight={700} fill="#A0A4B8">{suffix}</text>
    </svg>
  );
};

// Horizontal labelled meter bar.
const Meter: React.FC<{ value: number; label: string; sub?: string; color?: string }> = ({ value, label, sub, color }) => {
  const v = Math.max(0, Math.min(100, value || 0));
  const c = color || bandColor(v);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label !== '' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#52586F' }}>{label}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: c }}>{v}{sub ?? '%'}</span>
        </div>
      )}
      <div style={{ height: '8px', borderRadius: '999px', background: '#eef0f5', overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: c, borderRadius: '999px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

// Read-only question snapshot, scaled to fit the panel width (the game stage is a
// fixed 760×520; we scale it down so it never overflows / causes horizontal scroll).
const STAGE_W = 760;
const STAGE_H = 520;
const QuestionPreview: React.FC<{ html: string; index: number }> = ({ html, index }) => {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.6);
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, (el.clientWidth - 2) / STAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrapRef} style={{ margin: '4px 0 14px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: STAGE_W * scale,
        height: STAGE_H * scale,
        overflow: 'hidden',
        border: '1px solid #E5E7F0',
        borderRadius: 14,
        background: '#fff'
      }}>
        <iframe
          key={index}
          title="Question preview"
          sandbox="allow-scripts"
          srcDoc={html}
          style={{
            width: STAGE_W,
            height: STAGE_H,
            border: 'none',
            background: 'transparent',
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        />
      </div>
    </div>
  );
};

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
    performance: number;                       // 0–100 score for this question
    state: 'correct' | 'partial' | 'wrong';    // mastered / partial credit / incorrect
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    timeSpent: string;
    pts: number;
    difficulty: string;
    html?: string;                             // rendered question snapshot (DB attempts only)
  }> = [];

  if (dbResults) {
    // Build an id → label map from variation_data so answers render as human
    // labels (e.g. "Pick red") instead of internal ids (e.g. "pick_red").
    const buildLabelMap = (vd: any): Record<string, string> => {
      const map: Record<string, string> = {};
      // (a) Objects carrying an id + a label/text/value (e.g. options:[{id,label}]).
      const walk = (v: any) => {
        if (Array.isArray(v)) { v.forEach(walk); return; }
        if (v && typeof v === 'object') {
          if (typeof v.id === 'string' && (v.label || v.text || v.value)) {
            map[v.id] = String(v.label ?? v.text ?? v.value);
          }
          Object.values(v).forEach(walk);
        }
      };
      walk(vd);
      // (b) Flat pairs: option_1_id ↔ option_1_label, choice_a_value ↔ choice_a_label, etc.
      if (vd && typeof vd === 'object') {
        Object.keys(vd).forEach(k => {
          const m = k.match(/^(.*)_(id|value)$/);
          if (!m) return;
          const prefix = m[1];
          const labelKey = [`${prefix}_label`, `${prefix}_name`, `${prefix}_text`].find(lk => vd[lk] != null);
          if (labelKey && vd[k] != null) map[String(vd[k])] = String(vd[labelKey]);
        });
      }
      return map;
    };

    dbResults.attempts.forEach((a: any, idx: number) => {
      const type = a.interaction_type;
      const s = a.variation_data || {};
      const spec = a.evaluation_spec || {};
      const out = a.student_answer;
      const labelMap = buildLabelMap(s);
      const lbl = (x: any) => labelMap[String(x)] ?? String(x);

      // Render a canonical value into readable text, resolving ids → labels.
      const fmt = (v: any): string => {
        if (v === null || v === undefined || v === '') return 'No answer';
        if (Array.isArray(v)) return v.map(fmt).join(', ');
        if (typeof v === 'object') return Object.entries(v).map(([k, val]) => `${lbl(k)} → ${lbl(val)}`).join(', ');
        return lbl(v);
      };

      // Normalize the student output the SAME way the scorer did, then extract
      // the inner value — so a 100/100 answer can never show "No answer".
      const isEmpty = (x: any) =>
        x === null || x === undefined || x === '' ||
        (Array.isArray(x) && x.length === 0) ||
        (typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 0);

      let innerOut = extractOutputValue(type, out);
      // Fallback 1: a non-canonical output shape still has data — show it raw.
      if (isEmpty(innerOut) && !isEmpty(out)) innerOut = out;
      // Fallback 2: the scorer recorded the selection in score_breakdown.
      if (isEmpty(innerOut) && a.score_breakdown) {
        const bd = a.score_breakdown;
        innerOut = bd.selected ?? bd.order ?? bd.placements ?? bd.slots ?? bd.parts ?? bd.count ?? bd.position;
      }

      const userAnsText = isEmpty(innerOut) ? 'No answer' : fmt(innerOut);
      const correctAnsText = fmt(spec.answer);

      const performance = Number(a.performance ?? (a.is_correct ? 100 : 0));
      const state: 'correct' | 'partial' | 'wrong' =
        a.is_correct ? 'correct' : performance > 0 ? 'partial' : 'wrong';

      const explanation = state === 'correct'
        ? `Nicely done — scored ${performance}/100.`
        : state === 'partial'
          ? `Partially correct — scored ${performance}/100. Check the highlighted answer to see what to fix.`
          : `Scored ${performance}/100. Review the correct answer and try this concept again.`;

      allReviews.push({
        num: idx + 1,
        topic: a.learning_objective || a.subtopic || 'General',
        text: s.question_text || s.text || s.sentence?.replace(/\{___\}/g, '_____') || 'Interactive Challenge',
        type: a.interaction_type,
        correct: a.is_correct,
        performance,
        state,
        userAnswer: userAnsText,
        correctAnswer: correctAnsText,
        explanation: s.explanation || explanation,
        timeSpent: `${(a.time_taken_ms / 1000).toFixed(1)}s`,
        pts: Math.round(performance / 100 * 3),
        difficulty: (a.difficulty || 'medium').toUpperCase(),
        html: a.html
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
        performance: isCorrect ? 100 : 0,
        state: isCorrect ? 'correct' : 'wrong',
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
    topic: string;     // the topic to launch adaptive practice against
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
        topic: p.topic || dbResults.assignment?.topic || p.subtopic,
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

      breakdownRows.push({ name: lo?.name || topicId, topic: lo?.name || topicId, p, tag, label, color });
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
        
        <div className="shn-score-section" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <ScoreRing value={pct} suffix="/ 100" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="shn-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.max(1, Math.round(pct / 20)) ? 'star filled' : 'star'}>★</span>
              ))}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)' }}>
              Mean performance across {displayTotal} question{displayTotal === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="shn-tags-row">
          <span className="shn-tag primary-badge">{pct >= 80 ? 'Mastery' : pct >= 50 ? 'Foundation' : 'Early Start'}</span>
          <span className="shn-tag secondary-badge">Next: {pct >= 80 ? 'Expert Path' : 'Foundation Builder'}</span>
          <span className="shn-tag neutral-badge">{displayScore}/{displayTotal} mastered</span>
          <span className="shn-tag neutral-badge">{timeMin}m total</span>
        </div>
      </div>

      {/* 2. KPI Metrics Cards Grid */}
      <div className="success-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap">📊</div>
          <div className="kpi-value">{pct}<span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}> / 100</span></div>
          <div className="kpi-title">Mean Performance</div>
          <div style={{ width: '100%', marginTop: '8px' }}>
            <Meter value={pct} label="Score" />
          </div>
          <div className="kpi-sub" style={{ marginTop: '6px' }}>{displayScore}/{displayTotal} questions mastered</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">⏳</div>
          <div className="kpi-value">{avgTime}</div>
          <div className="kpi-title">Avg Time / Q</div>
          <div className="kpi-sub">{timeMin}m total elapsed time</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap">📈</div>
          <div className="kpi-title" style={{ marginBottom: '10px' }}>Performance by Tier</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <Meter value={difficultyStats.easy?.accuracy || 0} label={`Easy${difficultyStats.easy?.total ? ` · ${difficultyStats.easy.total}q` : ''}`} />
            <Meter value={difficultyStats.medium?.accuracy || 0} label={`Medium${difficultyStats.medium?.total ? ` · ${difficultyStats.medium.total}q` : ''}`} />
            <Meter value={difficultyStats.hard?.accuracy || 0} label={`Hard${difficultyStats.hard?.total ? ` · ${difficultyStats.hard.total}q` : ''}`} />
          </div>
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
            <span className="leg-item"><span className="leg-dot correct"></span>Mastered</span>
            <span className="leg-item"><span className="leg-dot partial"></span>Partial</span>
            <span className="leg-item"><span className="leg-dot wrong"></span>Incorrect</span>
          </div>
        </div>
        
        <div className="rap-intro">Tap any question to see your answer, the correct answer, and the explanation.</div>
        
        <div className="rap-buttons-row">
          {allReviews.map((r, idx) => (
            <button
              key={idx}
              className={`rap-q-btn ${r.state} ${selectedQIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedQIndex(idx)}
              title={`${r.performance}/100`}
            >
              {r.num}
            </button>
          ))}
        </div>

        {activeReview && (
          <div className="rap-details-card animate-fade">
            <div className="rap-details-header">
              <div className="rdh-title">
                QUESTION {activeReview.num} &bull; <span style={{ textTransform: 'uppercase' }}>{activeReview.difficulty}</span>
                <span style={{ marginLeft: '8px', fontWeight: 900, color: 'var(--text-dim)' }}>· {activeReview.performance}/100</span>
              </div>
              <div className={`rdh-status-badge ${activeReview.state}`}>
                {activeReview.state === 'correct' ? 'MASTERED' : activeReview.state === 'partial' ? 'PARTIAL CREDIT' : 'INCORRECT'}
              </div>
            </div>

            <div className="rap-question-text">{activeReview.text}</div>

            {activeReview.html && (
              <QuestionPreview html={activeReview.html} index={selectedQIndex} />
            )}

            <div className="rap-comparison-grid">
              <div className="comp-item">
                <div className="comp-label">YOUR ANSWER</div>
                <div className={`comp-val-box ${activeReview.state}`}>
                  {activeReview.userAnswer}
                </div>
              </div>

              {activeReview.state !== 'correct' && (
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

              <div style={{ margin: '8px 0 10px' }}>
                <Meter value={r.p} label="" />
              </div>

              <div className="lpm-desc-text">
                {r.color === 'green'
                  ? 'Strong grasp — keep this sharp with occasional review and try harder variations.'
                  : r.color === 'yellow'
                    ? 'Developing — a few more focused reps will turn this into mastery.'
                    : 'Needs practice — revisit the core idea, then drill targeted questions to rebuild confidence.'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span className={`lpm-item-tag ${r.tag}`}>
                  {r.label === 'Strong' ? 'Mastered' : r.label === 'Developing' ? 'Needs Focus' : 'Urgent Practice'}
                </span>

                <button
                  className="lpm-practice-btn"
                  onClick={() => {
                    assignHomeworkDb(r.topic, 5, 'adaptive').then(id => {
                      if (id) {
                        showToast(`🚀 Practice session launched for: ${r.name}!`);
                      } else {
                        showToast(`No practice questions available yet for ${r.name}.`);
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
          <strong>Next goal:</strong> {(() => {
            const topicName = dbResults?.assignment?.topic || questionSteps[0]?.topic || 'this topic';
            if (pct >= 80) return `Great mastery of ${topicName}! Move on to harder variations and a new topic to keep growing.`;
            if (pct >= 50) return `You're building a solid foundation in ${topicName}. Run a few adaptive practice sets to push past the 80% mastery line.`;
            return `Let's strengthen the basics of ${topicName}. Start with an adaptive practice set above and review the questions you missed.`;
          })()}
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
        /* Partial-credit (0 < score < 70) styling for the answer review */
        .rap-q-btn.partial {
          background: #FFF1E2;
          border-color: #FF9F43;
          color: #B45309;
        }
        .rap-q-btn.partial.active {
          background: #FF9F43;
          color: #fff;
        }
        .rdh-status-badge.partial {
          background: #FFF1E2;
          color: #B45309;
        }
        .comp-val-box.partial {
          outline: 2px solid #FF9F43;
          background: #FFF8EF;
        }
        .leg-dot.partial { background: #FF9F43; }
      `}</style>
    </div>
  );
};

export default SuccessScreen;
