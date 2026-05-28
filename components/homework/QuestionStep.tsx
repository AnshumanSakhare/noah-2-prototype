"use client";

import React, { useState, useEffect } from 'react';
import { HomeworkStep, HomeworkAnswer } from './context';

interface QuestionStepProps {
  step: HomeworkStep;
  answer: HomeworkAnswer | undefined;
  onAnswer: (ans: HomeworkAnswer) => void;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

// ─── 1. MCQ QUESTION ───
export const MCQStep: React.FC<QuestionStepProps> = ({ step, answer, onAnswer, onBack, onContinue, isFirst, stepProgressText }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | undefined>(answer?.answer);

  const selectMCQ = (idx: number) => {
    setSelectedIdx(idx);
    const correct = idx === step.correct;
    onAnswer({
      type: 'mcq',
      answer: idx,
      correct
    });
  };

  useEffect(() => {
    setSelectedIdx(answer?.answer);
  }, [answer, step]);

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="hw-card hw-card-question">
      <div className="hw-card-top" style={{ background: 'var(--hw)' }}></div>
      <div className="hw-card-body">
        <span className="q-type-badge mcq">Multiple Choice</span>
        <div className="q-text">{step.text}</div>
        
        <div className="options">
          {step.options?.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const revealCls = isSelected ? 'selected' : '';

            return (
              <button 
                key={idx}
                className={`option-btn ${revealCls}`}
                onClick={() => selectMCQ(idx)}
              >
                <span className="opt-letter">{optionLabels[idx]}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        {stepProgressText && <span className="footer-step-indicator">{stepProgressText}</span>}
        <button 
          className="nav-btn primary" 
          onClick={onContinue} 
          disabled={selectedIdx === undefined}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// ─── 2. FILL-IN QUESTION ───
export const FillStep: React.FC<QuestionStepProps> = ({ step, answer, onAnswer, onBack, onContinue, isFirst, stepProgressText }) => {
  const [val, setVal] = useState<string>(answer?.answer || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setVal(inputVal);
  };

  const submitFill = () => {
    if (!val.trim()) return;
    const correct = val.trim().toLowerCase() === step.answer?.toLowerCase();
    onAnswer({
      type: 'fill',
      answer: val,
      correct
    });
    onContinue();
  };

  useEffect(() => {
    setVal(answer?.answer || '');
  }, [answer, step]);

  return (
    <div className="hw-card hw-card-question">
      <div className="hw-card-top" style={{ background: 'var(--path)' }}></div>
      <div className="hw-card-body">
        <span className="q-type-badge fill">Fill in the blank</span>
        <div className="q-text" style={{ marginBottom: '16px' }}>{step.text}</div>
        
        <div className="fill-wrap">
          <input 
            type="text"
            className="fill-input"
            value={val}
            onChange={handleChange}
            placeholder={`Enter your answer ${step.unit ? `in ${step.unit}` : ''}...`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitFill();
            }}
          />
          <div className="fill-hint">
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '4px', color: '#f59e0b' }}>
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 7.5 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
              Hint:
            </span>
            <span>{step.hint}</span>
          </div>
        </div>
      </div>

      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        {stepProgressText && <span className="footer-step-indicator">{stepProgressText}</span>}
        <button 
          className="nav-btn primary" 
          onClick={submitFill} 
          disabled={!val.trim()}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// ─── 3. BLANKS TAP-TO-PLACE QUESTION ───
export const BlanksStep: React.FC<QuestionStepProps> = ({ step, answer, onAnswer, onBack, onContinue, isFirst, stepProgressText }) => {
  const blankCount = step.answers?.length || 0;
  const [filledBlanks, setFilledBlanks] = useState<Array<string | null>>(
    answer?.filledBlanks || new Array(blankCount).fill(null)
  );

  useEffect(() => {
    setFilledBlanks(answer?.filledBlanks || new Array(blankCount).fill(null));
  }, [answer, step]);

  const placeWord = (word: string) => {
    const next = [...filledBlanks];
    const emptyIdx = next.findIndex(b => b === null);
    if (emptyIdx === -1) return;
    next[emptyIdx] = word;
    setFilledBlanks(next);
  };

  const removeWord = (slotIdx: number) => {
    const next = [...filledBlanks];
    next[slotIdx] = null;
    setFilledBlanks(next);
  };

  const submitBlanks = () => {
    const allFilled = filledBlanks.every(b => b !== null);
    if (!allFilled) return;
    
    const correct = filledBlanks.every(
      (b, i) => b && b.toLowerCase() === step.answers?.[i].toLowerCase()
    );

    onAnswer({
      type: 'blanks',
      filledBlanks,
      correct
    });
    onContinue();
  };

  const allFilled = filledBlanks.every(b => b !== null);

  // Render blanks sentence
  const renderSentence = () => {
    const parts = step.sentence?.split('{___}') || [];
    const elements: React.ReactNode[] = [];
    
    parts.forEach((part, idx) => {
      elements.push(<span key={`text-${idx}`}>{part}</span>);
      if (idx < blankCount) {
        const slotVal = filledBlanks[idx];
        elements.push(
          <span 
            key={`slot-${idx}`}
            className={`blank-slot ${slotVal ? 'filled' : 'empty'}`}
            onClick={() => slotVal && removeWord(idx)}
          >
            {slotVal || '_____'}
          </span>
        );
      }
    });
    return <div className="blanks-sentence">{elements}</div>;
  };

  return (
    <div className="hw-card hw-card-question">
      <div className="hw-card-top" style={{ background: 'var(--accent-4)' }}></div>
      <div className="hw-card-body">
        <span className="q-type-badge blanks">Mixed drag blanks</span>
        {renderSentence()}
        
        <div className="word-bank">
          <div className="word-bank-label">Word Bank (tap to place)</div>
          {step.wordBank?.map((word, idx) => {
            // Count occurrences in word bank vs placements to handle duplicates correctly
            const totalInBank = step.wordBank?.filter(w => w === word).length || 0;
            const countUsed = filledBlanks.filter(w => w === word).length;
            
            // If there's multiple identical words in the bank, we mark as used if placements matches
            const usedInPlacements = filledBlanks.includes(word);
            const wordIdx = step.wordBank?.indexOf(word);
            
            // Simpler approach: check if this index's item is in filledBlanks
            // To be safe, check if the word is fully consumed
            const isUsed = countUsed >= totalInBank;

            return (
              <span 
                key={idx}
                className={`word-chip ${isUsed ? 'used' : ''}`}
                onClick={() => !isUsed && placeWord(word)}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        {stepProgressText && <span className="footer-step-indicator">{stepProgressText}</span>}
        <button 
          className="nav-btn primary" 
          onClick={submitBlanks} 
          disabled={!allFilled}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// ─── 4. DRAG & DROP MATCHING QUESTION ───
export const DragStep: React.FC<QuestionStepProps> = ({ step, answer, onAnswer, onBack, onContinue, isFirst, stepProgressText }) => {
  const [placements, setPlacements] = useState<Record<string, string>>(answer?.placements || {});
  const [selectedDrag, setSelectedDrag] = useState<string | null>(null);

  useEffect(() => {
    setPlacements(answer?.placements || {});
    setSelectedDrag(null);
  }, [answer, step]);

  const selectDragItem = (item: string) => {
    // If already placed, do not select
    if (Object.values(placements).includes(item)) return;
    setSelectedDrag(item);
  };

  const dropInZone = (zone: string) => {
    if (!selectedDrag) return;
    const next = { ...placements };
    
    // Remove selected item from any other zone
    Object.keys(next).forEach(z => {
      if (next[z] === selectedDrag) delete next[z];
    });

    next[zone] = selectedDrag;
    setPlacements(next);
    setSelectedDrag(null);
  };

  const removePlaced = (zone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = { ...placements };
    delete next[zone];
    setPlacements(next);
  };

  const submitDrag = () => {
    const allPlaced = step.pairs?.every(p => !!placements[p.zone]);
    if (!allPlaced) return;

    const correct = step.pairs?.every(p => placements[p.zone] === p.item) || false;
    onAnswer({
      type: 'drag',
      placements,
      correct
    });
    onContinue();
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, item: string) => {
    e.dataTransfer.setData('text/plain', item);
    setSelectedDrag(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('text/plain');
    if (item) {
      const next = { ...placements };
      Object.keys(next).forEach(z => {
        if (next[z] === item) delete next[z];
      });
      next[zone] = item;
      setPlacements(next);
    }
  };

  const placedItems = Object.values(placements);
  const allPlaced = step.pairs?.every(p => !!placements[p.zone]);

  return (
    <div className="hw-card hw-card-question">
      <div className="hw-card-top" style={{ background: 'var(--accent)' }}></div>
      <div className="hw-card-body">
        <span className="q-type-badge drag">Drag &amp; Drop</span>
        <div className="q-text">{step.text}</div>
        <div className="drag-instruction">🖱️ Drag items to matching zones, or tap item then tap zone</div>
        
        <div className="drag-grid">
          {/* Draggable Items */}
          <div className="drag-col">
            <h4>Items</h4>
            {step.pairs?.map((p, idx) => {
              const isPlaced = placedItems.includes(p.item);
              const isSelected = selectedDrag === p.item;
              return (
                <div 
                  key={idx}
                  className={`drag-item ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected-drag' : ''}`}
                  draggable={!isPlaced}
                  onDragStart={(e) => handleDragStart(e, p.item)}
                  onClick={() => selectDragItem(p.item)}
                >
                  <span className="di-grip">⠿</span>
                  {p.item}
                </div>
              );
            })}
          </div>

          {/* Target Drop Zones */}
          <div className="drag-col">
            <h4>Drop Zones</h4>
            {step.pairs?.map((p, idx) => {
              const placedItem = placements[p.zone];
              return (
                <div 
                  key={idx}
                  className={`drop-zone ${placedItem ? 'filled' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, p.zone)}
                  onClick={() => placedItem ? null : dropInZone(p.zone)}
                >
                  <span className="dz-label">{p.zone}</span>
                  {placedItem ? (
                    <>
                      <span className="dz-item">{placedItem}</span>
                      <span className="dz-remove" onClick={(e) => removePlaced(p.zone, e)}>✕</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: '.78rem', fontWeight: 600 }}>
                      Drop here
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        {stepProgressText && <span className="footer-step-indicator">{stepProgressText}</span>}
        <button 
          className="nav-btn primary" 
          onClick={submitDrag} 
          disabled={!allPlaced}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
