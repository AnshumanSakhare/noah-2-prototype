"use client";

import React from 'react';
import { useHomework, HomeworkStep } from './context';
import { students } from '../../data/students';
import { 
  CheckCircle2, 
  ChevronLeft, 
  Eye, 
  HelpCircle, 
  BookOpen, 
  Award, 
  X,
  Layers,
  Sparkles
} from 'lucide-react';

interface PreviewScreenProps {
  onBack: () => void;
  onPreviewStudent: () => void;
}

export const PreviewScreen: React.FC<PreviewScreenProps> = ({ onBack, onPreviewStudent }) => {
  const { builderState, homeworkSteps, setHomeworkSteps, showToast } = useHomework();

  const student = builderState.student ? students.find(s => s.id === builderState.student) : null;
  const questionCount = homeworkSteps.filter(s => s.isQuestion).length;

  const removeStep = (idx: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Animate removal out of UI first
    const items = [...homeworkSteps];
    items.splice(idx, 1);

    // Re-adjust topicIdx and totalTopics for remaining topic-intro & topic-complete cards
    const activeTopics = [...new Set(items.filter(s => s.topic).map(s => s.topic))];
    items.forEach(s => {
      if (s.type === 'topic-intro') {
        s.topicIdx = activeTopics.indexOf(s.topic || '');
        s.totalTopics = activeTopics.length;
      } else if (s.type === 'topic-complete') {
        s.topicIdx = activeTopics.indexOf(s.topic || '');
        s.totalTopics = activeTopics.length;
        s.isLast = s.topicIdx === activeTopics.length - 1;
      }
    });

    setHomeworkSteps(items);
    showToast('🗑️ Card removed from homework!');
  };

  const getStepTitle = (s: HomeworkStep) => {
    if (s.type === 'topic-intro') return `Topic Start: ${s.lo?.name}`;
    if (s.type === 'recap') return `Study Sheet: ${s.content?.title}`;
    if (s.type === 'flashcard') return `Self-Test Flashcard: ${s.lo?.short}`;
    if (s.type === 'animation') return `Interactive Experiment: ${s.lo?.short}`;
    if (s.type === 'topic-complete') return `${s.lo?.name} Objective Completed`;
    
    const rawText = s.text || s.sentence || '';
    const cleanText = rawText.replace(/\{___\}/g, '_____');
    return cleanText.substring(0, 60) + (cleanText.length > 60 ? '…' : '');
  };

  const getStepSubtitle = (s: HomeworkStep) => {
    if (s.type === 'topic-intro') return s.motivational || '';
    if (s.type === 'recap') return s.content?.sub || '';
    if (s.type === 'flashcard') return 'Rule Concept Flashcard';
    if (s.type === 'animation') return s.content?.caption || '';
    if (s.type === 'topic-complete') return s.isLast ? 'Last topic finished!' : 'Moving on…';
    return `${s.type.toUpperCase()} question · Topic: ${s.lo?.short}`;
  };

  const getStepIcon = (s: HomeworkStep) => {
    if (s.type === 'topic-intro') return <Award size={16} className="text-indigo" />;
    if (s.type === 'topic-complete') return <CheckCircle2 size={16} className="text-correct" />;
    if (s.isQuestion) return <HelpCircle size={16} className="text-orange" />;
    return <BookOpen size={16} className="text-violet" />;
  };

  return (
    <div className="builder-screen show" id="previewScreen" style={{ display: 'block' }}>
      <div className="preview-banner saas-card">
        <div className="pb-icon-wrapper">
          <CheckCircle2 size={24} className="text-correct" />
        </div>
        <div className="pb-text">
          <h4 id="previewTitle">
            {builderState.type === 'specific' && student 
              ? `${student.name}'s Homework Journey Compiled` 
              : 'Classroom Homework Journey Compiled'}
          </h4>
          <p id="previewSub" className="text-dim">
            {homeworkSteps.length} total nodes · {questionCount} assessment questions · Interleaved layout flow
          </p>
        </div>
        <div className="pb-actions">
          <button className="nav-btn secondary" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ChevronLeft size={16} />
            Edit Recipe
          </button>
          <button className="nav-btn primary" onClick={onPreviewStudent} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={16} />
            Preview as Student
          </button>
        </div>
      </div>
      
      <div className="preview-steps-list">
        {homeworkSteps.map((s, i) => {
          const isQ = s.isQuestion;
          const typeClass = isQ ? 'question' : 'content';
          let cls = s.type === 'topic-intro' || s.type === 'topic-complete' ? 'divider' : isQ ? 'question' : s.type;

          return (
            <div 
              key={i} 
              className={`preview-step-row ${isQ ? 'is-q' : 'is-c'}`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="ps-icon-outer">
                {getStepIcon(s)}
              </div>
              <div className="ps-info">
                <h4 style={{ margin: 0, fontSize: '.88rem', fontWeight: 800 }}>
                  {getStepTitle(s)}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {getStepSubtitle(s)}
                </p>
              </div>
              <span className={`ps-type-tag ${typeClass}`}>{isQ ? 'Question' : 'Concept'}</span>
              <button 
                className="ps-remove-node-btn" 
                onClick={(e) => removeStep(i, e)}
                title="Remove node from journey"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default PreviewScreen;
