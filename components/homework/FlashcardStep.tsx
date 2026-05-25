"use client";

import React, { useState } from 'react';
import { HomeworkStep } from './context';

interface FlashcardStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
}

export const FlashcardStep: React.FC<FlashcardStepProps> = ({ step, onBack, onContinue, isFirst }) => {
  const [flipped, setFlipped] = useState<boolean>(false);

  return (
    <div className="hw-card hw-card-flashcard">
      <div className="hw-card-top" style={{ background: 'linear-gradient(90deg,#5b8c6f,#d4a03c)' }}></div>
      <div className="hw-card-body">
        <span className="q-type-badge blanks">🃏 Flashcard</span>
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
        {flipped && (
          <button 
            className="nav-btn primary" 
            id="flashContinue" 
            onClick={onContinue}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};
export default FlashcardStep;
