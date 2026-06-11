"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useHomework, HomeworkStep, HomeworkAnswer, getTopicName } from './context';
import { RecapStep } from './RecapStep';
import { FlashcardStep } from './FlashcardStep';
import { MCQStep, FillStep, BlanksStep, DragStep } from './QuestionStep';
import { MathRecapStep } from './math/MathRecapStep';
import { MathConceptStep } from './math/MathConceptStep';
import { MathExampleStep } from './math/MathExampleStep';
import { KGGameStep } from './math/KGGameStep';
import { MathRecapGuideStep } from './math/MathRecapGuideStep';
import { MathCompareGuideStep } from './math/MathCompareGuideStep';
import { MathSortGuideStep } from './math/MathSortGuideStep';
import { MathFractionGuideStep } from './math/MathFractionGuideStep';
import { MathPythagorasGuideStep } from './math/MathPythagorasGuideStep';

interface IframeQuestionStepProps {
  assignmentId: string;
  index: number;
  answer: HomeworkAnswer | undefined;
  onAnswer: (ans: HomeworkAnswer) => void;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText: string;
}

export const IframeQuestionStep: React.FC<IframeQuestionStepProps> = ({
  assignmentId,
  index,
  answer,
  onAnswer,
  onBack,
  onContinue,
  isFirst,
  stepProgressText
}) => {
  const [loading, setLoading] = useState(true);
  const [questionId, setQuestionId] = useState("");
  const [html, setHtml] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<any>(answer?.answer || null);
  const [submitting, setSubmitting] = useState(false);
  
  const renderTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const fetchQuestion = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/homework/${assignmentId}/question/${index}`);
        const json = await res.json();
        if (json.success) {
          setQuestionId(json.data.id);
          setHtml(json.data.html);
          renderTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestion();
    setSelectedAnswer(answer?.answer || null);
  }, [assignmentId, index, answer]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "EDUQUEST_ANSWER") {
        setSelectedAnswer(e.data.answer);
        onAnswer({
          type: "mcq", // placeholder
          answer: e.data.answer,
          correct: true
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onAnswer]);

  const handleSubmit = async () => {
    if (selectedAnswer === null) return;
    setSubmitting(true);
    
    const timeTakenMs = Date.now() - renderTimeRef.current;
    
    try {
      await fetch(`/api/homework/${assignmentId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          student_answer: selectedAnswer,
          time_taken_ms: timeTakenMs
        })
      });
      onContinue();
    } catch (err) {
      console.error(err);
      onContinue();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hw-card hw-card-question">
      <div className="hw-card-body" style={{ padding: 0, position: 'relative', height: '520px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
            <div className="spin-icon" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⚙️</div>
            <p style={{ fontWeight: 650, color: 'var(--text-dim)' }}>Loading next interactive challenge...</p>
          </div>
        ) : (
          <iframe
            title="EduQuest Activity"
            sandbox="allow-scripts"
            srcDoc={html}
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
          />
        )}
      </div>

      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        <span className="footer-step-indicator">{stepProgressText}</span>
        <button 
          className="nav-btn primary" 
          onClick={handleSubmit} 
          disabled={selectedAnswer === null || submitting}
        >
          {submitting ? "Saving..." : "Next →"}
        </button>
      </div>
    </div>
  );
};

interface HomeworkRunnerProps {
  onComplete: () => void;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  'topic-intro': 'Introduction',
  'topic-complete': 'Topic Complete',
  'recap': 'Concept Review',
  'math-concept': 'Math Concept',
  'math-recap-guide': 'Playground Guide',
  'math-compare-guide': 'Playground Guide',
  'math-sort-guide': 'Playground Guide',
  'math-fraction-guide': 'Playground Guide',
  'math-pythagoras-guide': 'Playground Guide',
  'math-recap': 'Math Interactive',
  'math-example': 'Worked Example',
  'flashcard': 'Flashcard',
  'mcq': 'Multiple Choice',
  'fill': 'Fill in the Blank',
  'blanks': 'Word Bank',
  'drag': 'Drag & Drop',
  'game-tap': 'Tap the Bigger',
  'game-compare': 'Feed Alligator',
  'game-sort': 'Tower Sort',
};

const STEP_ICONS: Record<string, string> = {
  'recap': '📖',
  'math-concept': '📖',
  'math-recap-guide': 'ℹ️',
  'math-compare-guide': 'ℹ️',
  'math-sort-guide': 'ℹ️',
  'math-fraction-guide': 'ℹ️',
  'math-pythagoras-guide': 'ℹ️',
  'math-recap': '⚙️',
  'math-example': '📖',
  'flashcard': '🃏',
  'topic-intro': '▶',
  'topic-complete': '✓',
  'game-tap': '🎮',
  'game-compare': '🎮',
  'game-sort': '🎮',
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

function isQuestionType(step: HomeworkStep) {
  return ['mcq', 'fill', 'blanks', 'drag', 'game-tap', 'game-compare', 'game-sort'].includes(step.type);
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
    logEvent,
    activeAssignmentId
  } = useHomework();

  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [transitionDir, setTransitionDir] = useState<'forward' | 'backward'>('forward');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'topics' | 'map'>('topics');
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  const handleTabClick = (tab: 'topics' | 'map') => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setActiveTab(tab);
      setTimeout(() => {
        scrollToSection(tab);
      }, 100);
    } else {
      if (activeTab === tab) {
        setSidebarCollapsed(true);
      } else {
        setActiveTab(tab);
        scrollToSection(tab);
      }
    }
  };

  const scrollToSection = (section: 'topics' | 'map') => {
    if (!sidebarContentRef.current) return;
    const topicsEl = sidebarContentRef.current.querySelector('.hwmap-section-topics');
    const mapEl = sidebarContentRef.current.querySelector('.hwmap-section-map');
    if (section === 'topics' && topicsEl) {
      topicsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (section === 'map' && mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
    const topicName = getTopicName(s);
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

  // Map bubble status (hiding correctness during the session)
  const getMapStatus = (s: HomeworkStep, idx: number): string => {
    if (idx === hwIndex) return 'current';
    if (idx < hwIndex) return 'done';
    return 'pending';
  };

  const renderStepIcon = (s: HomeworkStep) => {
    const size = 12;
    const topicId = s.topic || s.lo?.id || '';

    // lo1 (Laws Explorer), lo2 (F=ma), lo3 (Recoil), lo4 (Friction) have interactive sandboxes.
    const hasSimulation = topicId === 'lo1' || topicId === 'lo2' || topicId === 'lo3' || topicId === 'lo4' || topicId.startsWith('kg-') || topicId.startsWith('g3-') || topicId.startsWith('g7-');
    const isInteractive = s.type === 'flashcard' || s.type === 'animation' || s.type === 'math-recap' || s.type === 'math-recap-guide' || s.type === 'math-compare-guide' || s.type === 'math-sort-guide' || s.type === 'math-fraction-guide' || s.type === 'math-pythagoras-guide' || (s.type === 'recap' && hasSimulation);

    if (s.type === 'topic-complete') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }

    if (isInteractive) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#0d9488' }}>
          <rect x="3" y="9" width="14" height="12" rx="2" />
          <path d="M7 5h14v12" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--accent)' }}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    }
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

    const stepProgressText = `Step ${hwIndex + 1} of ${homeworkSteps.length}`;

    // If this is a database-backed assignment (UUID instead of demo1/demo2), 
    // render the sandboxed iframe question step for all question types!
    const isDbAssignment = activeAssignmentId && !activeAssignmentId.startsWith('demo');
    if (isDbAssignment && isQuestionType(step)) {
      return (
        <IframeQuestionStep
          key={hwIndex}
          assignmentId={activeAssignmentId!}
          index={hwIndex}
          answer={activeAnswer}
          onAnswer={handleAnswer}
          onBack={handleBack}
          onContinue={handleContinue}
          isFirst={isFirst}
          stepProgressText={stepProgressText}
        />
      );
    }

    switch (step.type) {
      case 'topic-intro':
        return (
          <div className="hw-card hw-card-intro">
            {/* ── Card Header Navbar ── */}
            <div className="hw-card-header">
              <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {getTopicName(step)}
              </h3>
              <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                <span>▶</span> Topic Introduction &bull; Topic {(step.topicIdx || 0) + 1} of {step.totalTopics || 1}
              </div>
            </div>

            <div className="hw-card-body">
              <div className="topic-intro-inner">
                <span className="ti-icon" style={{ marginTop: '10px' }}>
                  {step.lo?.name?.includes('Inertia') ? '🎯'
                    : step.lo?.name?.includes('Force') ? '⚡'
                      : step.lo?.name?.includes('Action') ? '🤝' : '🌟'}
                </span>
                <p style={{ marginTop: '16px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-dim)' }}>{step.motivational || "Let's dive in!"}</p>
              </div>
            </div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>← Back</button>
              <span className="footer-step-indicator">{stepProgressText}</span>
              <button className="nav-btn primary" onClick={handleContentContinue}>Let's go →</button>
            </div>
          </div>
        );

      case 'topic-complete':
        return (
          <div className="hw-card hw-card-complete">
            {/* ── Card Header Navbar ── */}
            <div className="hw-card-header">
              <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--correct)', flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {getTopicName(step)}
              </h3>
              <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                <span>✓</span> Topic Completed
              </div>
            </div>

            <div className="hw-card-body">
              <div className="topic-complete-inner" style={{ textAlign: 'center', padding: '32px 12px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'var(--correct-bg)', color: 'var(--correct)',
                  fontSize: '2rem', display: 'grid', placeItems: 'center',
                  margin: '0 auto 20px', border: '2px solid var(--correct)', fontWeight: 900
                }}>✓</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '10px', color: 'var(--text)' }}>
                  Topic Completed! 🎉
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', fontWeight: 500, maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  {step.isLast ? "That was the last topic! Let's see how you did." : "Great work! Ready for the next topic?"}
                </p>
              </div>
            </div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>← Back</button>
              <span className="footer-step-indicator">{stepProgressText}</span>
              <button className="nav-btn primary" onClick={handleContentContinue}>
                {step.isLast ? 'See results →' : 'Next topic →'}
              </button>
            </div>
          </div>
        );

      case 'recap':
        return <RecapStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-concept':
        return <MathConceptStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-recap-guide':
        return <MathRecapGuideStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-compare-guide':
        return <MathCompareGuideStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-sort-guide':
        return <MathSortGuideStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-fraction-guide':
        return <MathFractionGuideStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-pythagoras-guide':
        return <MathPythagorasGuideStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-recap':
        return <MathRecapStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'math-example':
        return <MathExampleStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'flashcard':
        return <FlashcardStep step={step} onBack={handleBack} onContinue={handleContentContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'mcq':
        return <MCQStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'fill':
        return <FillStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'blanks':
        return <BlanksStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'drag':
        return <DragStep step={step} answer={activeAnswer} onAnswer={handleAnswer} onBack={handleBack} onContinue={handleContinue} isFirst={isFirst} stepProgressText={stepProgressText} />;

      case 'game-tap':
      case 'game-compare':
      case 'game-sort':
        return (
          <KGGameStep
            key={hwIndex}
            step={step}
            answer={activeAnswer}
            onAnswer={handleAnswer}
            onBack={handleBack}
            onContinue={handleContinue}
            isFirst={isFirst}
            isLast={hwIndex + 1 === homeworkSteps.length}
            stepProgressText={stepProgressText}
          />
        );

      default:
        return (
          <div className="hw-card">
            <div className="hw-card-body"><p>Step type {step.type} not implemented yet.</p></div>
            <div className="hw-card-footer">
              <button className="nav-btn secondary" onClick={handleBack} disabled={isFirst}>← Back</button>
              <span className="footer-step-indicator">{stepProgressText}</span>
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
  const topicName = getTopicName(step);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div id="hwUI" className="homework-studio hw-runner-page student-runner-layout">

      {/* ── Top header bar ── */}
      <div className="hwrh-bar">
        <div className="hwrh-left">
          <div className="hwrh-step-title" style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Homework Agent
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

      {/* ── Body: sidebar on left + main content ── */}
      <div className={`hw-runner-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Left panel: topics + question map */}
        <div className="hw-runner-sidebar">

          {/* Protruding minimal toggle tab base */}
          <div className="hw-sidebar-tabs">
            <div className="hw-sidebar-tab-base">
              <button
                className={`hw-sidebar-tab-pill pill-map ${sidebarCollapsed ? 'collapsed' : ''}`}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <div className="hw-sidebar-tab-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s ease', transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <div className="hw-sidebar-scroll-content" ref={sidebarContentRef}>
            {/* Topic progress section */}
            <div className="hwmap-section hwmap-section-topics">
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
            <div className="hwmap-section hwmap-section-map">
              <div className="hwmap-section-label">
                STEP MAP
                <span className="hwmap-qcount">
                  {hwIndex + 1}/{homeworkSteps.length}
                </span>
              </div>
              <div className="hwmap-grid">
                {homeworkSteps.map((s, idx) => {
                  const status = getMapStatus(s, idx);
                  const isQ = isQuestionType(s);
                  const qN = stepQuestionNumbers[idx];

                  const topicId = s.topic || s.lo?.id || '';
                  const hasSimulation = topicId === 'lo1' || topicId === 'lo2' || topicId === 'lo3' || topicId === 'lo4' || topicId.startsWith('kg-') || topicId.startsWith('g3-') || topicId.startsWith('g7-');
                  const isInteractive = s.type === 'flashcard' || s.type === 'animation' || s.type === 'math-recap' || s.type === 'math-recap-guide' || s.type === 'math-compare-guide' || s.type === 'math-sort-guide' || s.type === 'math-fraction-guide' || s.type === 'math-pythagoras-guide' || (s.type === 'recap' && hasSimulation);

                  // Compute dynamic border and background styles for non-questions to match the legend beautifully
                  let bubbleStyle: React.CSSProperties = {};
                  if (!isQ) {
                    if (status === 'current') {
                      bubbleStyle = {
                        borderColor: '#f59e0b',
                        background: '#fffbeb',
                        color: '#b45309',
                      };
                    } else if (isInteractive) {
                      bubbleStyle = {
                        borderColor: '#0d9488',
                        background: 'rgba(13, 148, 136, 0.06)',
                        color: '#0d9488',
                      };
                    } else {
                      bubbleStyle = {
                        borderColor: 'var(--accent)',
                        background: 'rgba(37, 99, 235, 0.06)',
                        color: 'var(--accent)',
                      };
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={`hwmap-bubble hwmap-${status} ${isQ ? 'hwmap-is-question' : 'hwmap-is-content'}`}
                      style={bubbleStyle}
                      title={`Step ${idx + 1}: ${STEP_TYPE_LABELS[s.type] || s.type}`}
                    >
                      {isQ ? (qN || idx + 1) : renderStepIcon(s)}
                    </div>
                  );
                })}
              </div>
              <div className="hwmap-legend" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <span className="hwmap-leg" style={{ color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <div className="hwmap-bubble hwmap-is-content" style={{ width: '18px', height: '18px', border: '1px solid var(--accent)', background: 'rgba(37, 99, 235, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      </svg>
                    </div>
                    Concept Card
                  </span>
                  <span className="hwmap-leg" style={{ color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <div className="hwmap-bubble hwmap-is-content" style={{ width: '18px', height: '18px', border: '1px solid #0d9488', background: 'rgba(13, 148, 136, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0d9488' }}>
                        <rect x="3" y="9" width="14" height="12" rx="2" />
                        <path d="M7 5h14v12" />
                      </svg>
                    </div>
                    Interactive Card
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.64rem' }}>
                  <span className="hwmap-leg hwmap-leg-current">● Current</span>
                  <span className="hwmap-leg hwmap-leg-pending" style={{ color: '#9ca3af' }}>● Completed</span>
                  <span className="hwmap-leg hwmap-leg-pending">● Upcoming</span>
                </div>
              </div>
            </div>
          </div>

          <button className="hw-pause-btn" onClick={saveHomework}>
            ⏸ Save &amp; Exit
          </button>
        </div>

        {/* Main question card area */}
        <div className="hw-runner-content">
          <div className={`card-wrapper ${cardTransitionClass}`}>
            {renderActiveCard()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomeworkRunner;
