"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useHomework, HomeworkStep, HomeworkAnswer } from './context';
import { RecapStep } from './RecapStep';
import { FlashcardStep } from './FlashcardStep';
import { MCQStep, FillStep, BlanksStep, DragStep } from './QuestionStep';

interface HomeworkRunnerProps {
  onComplete: () => void;
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
    // Record start time on mount if not already set
    if (!hwStartTime) {
      setHwStartTime(Date.now());
    }

    // Keep updating elapsed time
    timerRef.current = setInterval(() => {
      if (hwStartTime) {
        setHwElapsed(prev => prev + 1000);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hwStartTime]);

  const step = homeworkSteps[hwIndex];

  useEffect(() => {
    if (step && step.type === 'topic-complete') {
      // Auto skip the topic complete card completely
      if (hwIndex + 1 >= homeworkSteps.length) {
        onComplete();
      } else {
        setHwIndex(prev => prev + 1);
      }
    }
  }, [hwIndex, step, homeworkSteps, onComplete, setHwIndex]);

  if (!step) return null;

  // Renders Progress Ring
  const getProgressCircleValues = () => {
    const pct = Math.round(((hwIndex + 1) / homeworkSteps.length) * 100);
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (pct / 100 * circumference);
    return { pct, offset };
  };

  const { pct, offset } = getProgressCircleValues();

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
      }, 350);
    }
  };

  const handleContinue = (isQuestionSubmission: boolean | React.MouseEvent = false) => {
    if (hwIndex + 1 >= homeworkSteps.length) {
      setTransitionDir('forward');
      setTransitioning(true);
      setTimeout(() => {
        onComplete();
        setTransitioning(false);
      }, 350);
    } else {
      setTransitionDir('forward');
      setTransitioning(true);
      setTimeout(() => {
        setHwIndex(prev => prev + 1);
        setTransitioning(false);
      }, 350);
    }
  };

  const handleAnswer = (ans: HomeworkAnswer) => {
    setHwAnswers(prev => ({
      ...prev,
      [hwIndex]: ans
    }));
  };

  const handleContentContinue = () => {
    // Save state for content viewed
    handleAnswer({
      type: 'content',
      viewed: true,
      correct: true // content step is always true
    });
    handleContinue();
  };

  // Render the corresponding active card
  const renderActiveCard = () => {
    const isFirst = hwIndex === 0;
    const activeAnswer = hwAnswers[hwIndex];

    switch(step.type) {
      case 'topic-intro':
        return (
          <div className="hw-card hw-card-intro">
            <div className="hw-card-top" style={{ background: 'linear-gradient(90deg,var(--accent),var(--accent-3))' }}></div>
            <div className="hw-card-body">
              <div className="topic-intro-inner">
                <span className="ti-num">Topic {(step.topicIdx || 0) + 1} of {step.totalTopics || 1}</span>
                <span className="ti-icon">
                  {step.lo?.name?.includes('Inertia') ? '🎯' : step.lo?.name?.includes('Force') ? '⚡' : step.lo?.name?.includes('Action') ? '🤝' : '🌟'}
                </span>
                <h2>{step.lo?.name}</h2>
                <p>{step.motivational || "Let's dive in!"}</p>
              </div>
            </div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>
                ← Back
              </button>
              <button className="nav-btn primary" onClick={handleContentContinue}>
                Let's go →
              </button>
            </div>
          </div>
        );

      case 'topic-complete':
        return (
          <div className="hw-card hw-card-complete">
            <div className="hw-card-top" style={{ background: 'linear-gradient(90deg,var(--correct),#5b8c6f)' }}></div>
            <div className="hw-card-body">
              <div className="topic-complete-inner" style={{ textAlign: 'center', padding: '32px 12px' }}>
                <div className="tc-check-circle" style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'var(--correct-bg)',
                  color: 'var(--correct)',
                  fontSize: '2.5rem',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 20px',
                  border: '3px solid var(--correct)',
                  boxShadow: 'var(--shadow-sm)',
                  fontWeight: 900
                }}>✓</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '12px', color: 'var(--text)' }}>
                  {step.lo?.name} — Done! 🎉
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.98rem', fontWeight: 700, maxWidth: '440px', margin: '0 auto 28px', lineHeight: 1.65 }}>
                  {step.isLast ? "That was the last topic! Let's see how you did." : "Great work! Ready for the next topic?"}
                </p>
              </div>
            </div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>
                ← Back
              </button>
              <button className="nav-btn primary" onClick={handleContentContinue}>
                {step.isLast ? 'See results →' : 'Next topic →'}
              </button>
            </div>
          </div>
        );

      case 'recap':
        return (
          <RecapStep 
            step={step}
            onBack={handleBack}
            onContinue={handleContentContinue}
            isFirst={isFirst}
          />
        );

      case 'flashcard':
        return (
          <FlashcardStep 
            step={step}
            onBack={handleBack}
            onContinue={handleContentContinue}
            isFirst={isFirst}
          />
        );

      case 'mcq':
        return (
          <MCQStep 
            step={step}
            answer={activeAnswer}
            onAnswer={handleAnswer}
            onBack={handleBack}
            onContinue={handleContinue}
            isFirst={isFirst}
          />
        );

      case 'fill':
        return (
          <FillStep 
            step={step}
            answer={activeAnswer}
            onAnswer={handleAnswer}
            onBack={handleBack}
            onContinue={handleContinue}
            isFirst={isFirst}
          />
        );

      case 'blanks':
        return (
          <BlanksStep 
            step={step}
            answer={activeAnswer}
            onAnswer={handleAnswer}
            onBack={handleBack}
            onContinue={handleContinue}
            isFirst={isFirst}
          />
        );

      case 'drag':
        return (
          <DragStep 
            step={step}
            answer={activeAnswer}
            onAnswer={handleAnswer}
            onBack={handleBack}
            onContinue={handleContinue}
            isFirst={isFirst}
          />
        );

      default:
        return (
          <div className="hw-card">
            <div className="hw-card-body">
              <p>Step type {step.type} not implemented yet.</p>
            </div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>← Back</button>
              <button className="nav-btn primary" onClick={() => handleContinue()}>Continue →</button>
            </div>
          </div>
        );
    }
  };

  // Card transition classes
  let cardTransitionClass = '';
  if (transitioning) {
    cardTransitionClass = transitionDir === 'forward' ? 'card-exit-left' : 'card-exit-right';
  } else {
    cardTransitionClass = transitionDir === 'forward' ? 'card-enter-right' : 'card-enter-left';
  }

  return (
    <div id="hwUI" className="homework-studio show student-runner-layout">
      {/* Main card viewport */}
      <div className="runner-main-content">
        <div className={`card-wrapper ${cardTransitionClass}`}>
          {renderActiveCard()}
        </div>
      </div>
      
      {/* Floating progress tab sidebar on the right side */}
      <div className="runner-sidebar">
        <div className="sidebar-progress-card">
          <div className="sidebar-progress-title">My Progress</div>
          <div className="topic-badge" id="hwTopicBadge">{step.lo?.short || '—'}</div>
          
          <div className="progress-ring-wrap">
            <svg className="progress-ring" width="56" height="56">
              <circle className="progress-ring-bg" cx="28" cy="28" r="22" />
              <circle 
                className="progress-ring-fill" 
                id="progressRing" 
                cx="28" 
                cy="28" 
                r="22" 
                stroke="url(#ringGrad)" 
                style={{ strokeDasharray: 138.2, strokeDashoffset: 138.2 - (pct / 100 * 138.2) }}
              />
            </svg>
            <div className="progress-ring-text" id="progressText">{pct}%</div>
          </div>
          
          <div className="hw-step-label" id="hwStepLabel">Step {hwIndex + 1}/{homeworkSteps.length}</div>
          
          <button className="hw-pause" onClick={saveHomework}>
            ⏸ Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
};
export default HomeworkRunner;
