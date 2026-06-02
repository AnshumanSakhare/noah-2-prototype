"use client";

import React, { useState } from 'react';
import { HomeworkStep, getTopicName } from './context';

interface FlashcardStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const FlashcardStep: React.FC<FlashcardStepProps> = ({ step, onBack, onContinue, isFirst, stepProgressText }) => {
  const [flipped, setFlipped] = useState<boolean>(false);

  return (
    <div className="hw-card hw-card-flashcard">
      {/* ── Card Header Navbar ── */}
      <div className="hw-card-header">
        <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0d9488', flexShrink: 0 }}>
            <rect x="3" y="9" width="14" height="12" rx="2" />
            <path d="M7 5h14v12" />
          </svg>
          {getTopicName(step)}
        </h3>
        <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          <span>🃏</span> Concept Flashcard
        </div>
      </div>

      <div className="hw-card-body">
        <div 
          className={`hw-flashcard ${flipped ? 'flipped' : ''}`} 
          id="hwFlash" 
          onClick={() => setFlipped(prev => !prev)}
        >
          <div className="hw-flashcard-inner">
            <div className="hw-flash-face hw-flash-front">
              <div>
                <div className="ff-q">{step.content?.front}</div>
                <div className="ff-hint">tap to flip 🔄</div>
              </div>
            </div>
            <div className="hw-flash-face hw-flash-back">
              <div 
                className="fb-a"
                dangerouslySetInnerHTML={{ __html: step.content?.back || '' }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        {stepProgressText && <span className="footer-step-indicator">{stepProgressText}</span>}
        {flipped ? (
          <button 
            className="nav-btn primary" 
            id="flashContinue" 
            onClick={onContinue}
          >
            Continue →
          </button>
        ) : (
          <div style={{ width: '80px' }}></div> /* Maintain space balance when Continue is hidden */
        )}
      </div>
    </div>
  );
};
export default FlashcardStep;
