"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useHomework, HomeworkStep, HomeworkAnswer } from './context';
import { RecapStep } from './RecapStep';
import { FlashcardStep } from './FlashcardStep';
import { MCQStep, FillStep, BlanksStep, DragStep } from './QuestionStep';

interface HomeworkRunnerProps {
  onComplete: () => void;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  'topic-intro': 'Introduction',
  'topic-complete': 'Topic Complete',
  'recap': 'Concept Review',
  'flashcard': 'Flashcard',
  'mcq': 'Multiple Choice',
  'fill': 'Fill in the Blank',
  'blanks': 'Word Bank',
  'drag': 'Drag & Drop',
};

const STEP_ICONS: Record<string, string> = {
  'recap': '📖',
  'flashcard': '🃏',
  'topic-intro': '▶',
  'topic-complete': '✓',
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

function isQuestionType(step: HomeworkStep) {
  return ['mcq', 'fill', 'blanks', 'drag'].includes(step.type);
}

export const HomeworkRunner: React.FC<HomeworkRunnerProps> = ({ onComplete }) => {
  const {
    homeworkSteps,
    hwAnswers,
    setHwAnswers,
    hwIndex,
    setHwIndex,
    hwStartTime,
    setHwStartTime,
    hwElapsed,
    setHwElapsed,
    showToast,
    logEvent
  } = useHomework();

  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [transitionDir, setTransitionDir] = useState<'forward' | 'backward'>('forward');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hwStartTime) {
      setHwStartTime(Date.now());
    }
    timerRef.current = setInterval(() => {
      setHwElapsed(prev => prev + 1000);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hwStartTime]);

  const step = homeworkSteps[hwIndex];

  useEffect(() => {
    if (step && step.type === 'topic-complete') {
      if (hwIndex + 1 >= homeworkSteps.length) {
        onComplete();
      } else {
        setHwIndex(prev => prev + 1);
      }
    }
  }, [hwIndex, step, homeworkSteps, onComplete, setHwIndex]);

  if (!step) return null;

  // ── Derived metrics ───────────────────────────────────────────────────────

  // Question number for current step
  let currentQuestionNum = 0;
  let totalQuestions = 0;
  let questionsPassed = 0;
  homeworkSteps.forEach((s, idx) => {
    if (isQuestionType(s)) {
      totalQuestions++;
      if (idx <= hwIndex) {
        questionsPassed++;
      }
      if (idx === hwIndex) {
        currentQuestionNum = totalQuestions;
      }
    }
  });

  if (currentQuestionNum === 0 && totalQuestions > 0) {
    // For non-question steps, show the next upcoming question context
    currentQuestionNum = Math.min(questionsPassed + 1, totalQuestions);
  }

  // Per-step question number index (for the map bubbles)
  const stepQuestionNumbers: Record<number, number> = {};
  let qCounter = 0;
  homeworkSteps.forEach((s, idx) => {
    if (isQuestionType(s)) {
      qCounter++;
      stepQuestionNumbers[idx] = qCounter;
    }
  });

  // Topic groups for progress bars
  const topicGroups: Array<{
    topicId: string;
    name: string;
    stepIndices: number[];
    completedCount: number;
  }> = [];
  const seenTopics = new Map<string, number>(); // topicId → group index

  homeworkSteps.forEach((s, idx) => {
    const topicId = s.topic || s.lo?.id || 'general';
    const topicName = s.lo?.name || s.topic || 'General';
    if (!seenTopics.has(topicId)) {
      seenTopics.set(topicId, topicGroups.length);
      topicGroups.push({ topicId, name: topicName, stepIndices: [], completedCount: 0 });
    }
    const groupIdx = seenTopics.get(topicId)!;
    topicGroups[groupIdx].stepIndices.push(idx);
  });

  // Count completed steps per topic
  topicGroups.forEach(group => {
    group.completedCount = group.stepIndices.filter(
      idx => hwAnswers[idx] !== undefined || idx < hwIndex
    ).length;
  });

  const currentTopicId = step.topic || step.lo?.id || 'general';
  const currentGroupIdx = topicGroups.findIndex(g => g.topicId === currentTopicId);

  // Map bubble status
  const getMapStatus = (s: HomeworkStep, idx: number): string => {
    if (idx === hwIndex) return 'current';
    if (idx < hwIndex) {
      if (isQuestionType(s)) {
        const ans = hwAnswers[idx];
        if (ans?.correct) return 'correct';
        if (ans) return 'wrong';
        return 'done';
      }
      return 'done';
    }
    return 'pending';
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const saveHomework = () => {
    logEvent({ type: 'hw_pause', index: hwIndex });
    showToast('💾 Saved — you can come back anytime');
  };

  const handleBack = () => {
    if (hwIndex > 0) {
      setTransitionDir('backward');
      setTransitioning(true);
      setTimeout(() => {
        setHwIndex(prev => prev - 1);
        setTransitioning(false);
      }, 300);
    }
  };

  const handleContinue = (isQuestionSubmission: boolean | React.MouseEvent = false) => {
    if (hwIndex + 1 >= homeworkSteps.length) {
      setTransitionDir('forward');
      setTransitioning(true);
      setTimeout(() => {
        onComplete();
        setTransitioning(false);
      }, 300);
    } else {
      setTransitionDir('forward');
      setTransitioning(true);
      setTimeout(() => {
        setHwIndex(prev => prev + 1);
        setTransitioning(false);
      }, 300);
    }
  };

  const handleAnswer = (ans: HomeworkAnswer) => {
    setHwAnswers(prev => ({
      ...prev,
      [hwIndex]: ans
    }));
  };

  const handleContentContinue = () => {
    handleAnswer({ type: 'content', viewed: true, correct: true });
    handleContinue();
  };

  // ── Card renderer ─────────────────────────────────────────────────────────

  const renderActiveCard = () => {
    const isFirst = hwIndex === 0;
    const activeAnswer = hwAnswers[hwIndex];

    switch (step.type) {
      case 'topic-intro':
        return (
          <div className="hw-card hw-card-intro">
            <div className="hw-card-body">
              <div className="topic-intro-inner">
                <span className="ti-num">Topic {(step.topicIdx || 0) + 1} of {step.totalTopics || 1}</span>
                <span className="ti-icon">
                  {step.lo?.name?.includes('Inertia') ? '🎯'
                    : step.lo?.name?.includes('Force') ? '⚡'
                    : step.lo?.name?.includes('Action') ? '🤝' : '🌟'}
                </span>
                <h2>{step.lo?.name}</h2>
                <p>{step.motivational || "Let's dive in!"}</p>
              </div>
            </div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>← Back</button>
              <button className="nav-btn primary" onClick={handleContentContinue}>Let's go →</button>
            </div>
          </div>
        );

      case 'topic-complete':
        return (
          <div className="hw-card hw-card-complete">
            <div className="hw-card-body">
              <div className="topic-complete-inner" style={{ textAlign: 'center', padding: '32px 12px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'var(--correct-bg)', color: 'var(--correct)',
                  fontSize: '2rem', display: 'grid', placeItems: 'center',
                  margin: '0 auto 20px', border: '2px solid var(--correct)', fontWeight: 900
                }}>✓</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '10px', color: 'var(--text)' }}>
                  {step.lo?.name} — Done! 🎉
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', fontWeight: 500, maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  {step.isLast ? "That was the last topic! Let's see how you did." : "Great work! Ready for the next topic?"}
                </p>
              </div>
            </div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>← Back</button>
              <button className="nav-btn primary" onClick={handleContentContinue}>
                {step.isLast ? 'See results →' : 'Next topic →'}
              </button>
            </div>
          </div>
        );

      case 'recap':
        return <RecapStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} />;

      case 'flashcard':
        return <FlashcardStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} />;

      case 'mcq':
        return <MCQStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} />;

      case 'fill':
        return <FillStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} />;

      case 'blanks':
        return <BlanksStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} />;

      case 'drag':
        return <DragStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} />;

      default:
        return (
          <div className="hw-card">
            <div className="hw-card-body"><p>Step type {step.type} not implemented yet.</p></div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>← Back</button>
              <button className="nav-btn primary" onClick={() => handleContinue()}>Continue →</button>
            </div>
          </div>
        );
    }
  };

  // Card transition class
  let cardTransitionClass = '';
  if (transitioning) {
    cardTransitionClass = transitionDir === 'forward' ? 'card-exit-left' : 'card-exit-right';
  } else {
    cardTransitionClass = transitionDir === 'forward' ? 'card-enter-right' : 'card-enter-left';
  }

  const stepTypeLabel = STEP_TYPE_LABELS[step.type] || step.type;
  const topicName = step.lo?.name || step.topic || '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div id="hwUI" className="homework-studio hw-runner-page student-runner-layout">

      {/* ── Top header bar ── */}
      <div className="hwrh-bar">
        <div className="hwrh-left">
          {topicName && (
            <div className="hwrh-breadcrumb">
              <span className="hwrh-subject">HOMEWORK</span>
              <span className="hwrh-sep"> / </span>
              <span className="hwrh-topic">{topicName}</span>
            </div>
          )}
          <div className="hwrh-step-title">
            {isQuestionType(step)
              ? `Question ${currentQuestionNum} of ${totalQuestions}`
              : `Step ${hwIndex + 1} of ${homeworkSteps.length}`
            }
          </div>
        </div>
        <div className="hwrh-right">
          {hwElapsed > 0 && (
            <div className="hwrh-timer">
              <div className="hwrh-timer-label">TIME TAKEN</div>
              <div className="hwrh-timer-value">{formatElapsed(hwElapsed)}</div>
              <div className="hwrh-timer-sub">this session</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body: main content + right panel ── */}
      <div className="hw-runner-body">

        {/* Main question card area */}
        <div className="hw-runner-content">
          <div className={`card-wrapper ${cardTransitionClass}`}>
            {renderActiveCard()}
          </div>
        </div>

        {/* Right panel: topics + question map */}
        <div className="hw-runner-map">

          {/* Topic progress section */}
          <div className="hwmap-section">
            <div className="hwmap-section-label">TOPICS</div>
            {topicGroups.map((group, i) => {
              const pct = group.stepIndices.length > 0
                ? Math.round((group.completedCount / group.stepIndices.length) * 100)
                : 0;
              const isActive = i === currentGroupIdx;
              return (
                <div key={i} className={`hwmap-topic-row ${isActive ? 'active' : ''}`}>
                  <div className="hwmap-topic-info">
                    <span className="hwmap-topic-name">{group.name}</span>
                    <span className="hwmap-topic-count">{group.completedCount}/{group.stepIndices.length}</span>
                  </div>
                  <div className="hwmap-topic-track">
                    <div
                      className="hwmap-topic-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Question map grid */}
          <div className="hwmap-section">
            <div className="hwmap-section-label">
              QUESTION MAP
              <span className="hwmap-qcount">
                {currentQuestionNum}/{totalQuestions}
              </span>
            </div>
            <div className="hwmap-grid">
              {homeworkSteps.map((s, idx) => {
                const status = getMapStatus(s, idx);
                const isQ = isQuestionType(s);
                const qN = stepQuestionNumbers[idx];
                return (
                  <div
                    key={idx}
                    className={`hwmap-bubble hwmap-${status} ${isQ ? 'hwmap-is-question' : 'hwmap-is-content'}`}
                    title={`Step ${idx + 1}: ${STEP_TYPE_LABELS[s.type] || s.type}`}
                  >
                    {isQ ? (qN || idx + 1) : (STEP_ICONS[s.type] || '·')}
                  </div>
                );
              })}
            </div>
            <div className="hwmap-legend" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <span className="hwmap-leg" style={{ color: 'var(--text-dim)' }}>📖 Study Concept</span>
                <span className="hwmap-leg" style={{ color: 'var(--text-dim)' }}>🔢 Practice Q</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.64rem' }}>
                <span className="hwmap-leg hwmap-leg-current">● Current</span>
                <span className="hwmap-leg hwmap-leg-correct">● Correct Q</span>
                <span className="hwmap-leg hwmap-leg-pending">● Upcoming</span>
              </div>
            </div>
          </div>

          <button className="hw-pause-btn" onClick={saveHomework}>
            ⏸ Save &amp; Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeworkRunner;
