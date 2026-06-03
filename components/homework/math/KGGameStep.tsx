"use client";

import React, { useState, useEffect, useRef } from 'react';
import { HomeworkStep, HomeworkAnswer, getTopicName } from '../context';

interface KGGameStepProps {
  step: HomeworkStep;
  answer: HomeworkAnswer | undefined;
  onAnswer: (ans: HomeworkAnswer) => void;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

type WrongTarget = 'A' | 'B' | 'symbol' | 'tower' | null;

export const KGGameStep: React.FC<KGGameStepProps> = ({
  step,
  answer,
  onAnswer,
  onBack,
  onContinue,
  isFirst,
  stepProgressText
}) => {
  const [selectedSide, setSelectedSide] = useState<'A' | 'B' | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<'>' | '<' | '=' | null>(null);
  const [placedNumbers, setPlacedNumbers] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [wrongTarget, setWrongTarget] = useState<WrongTarget>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state on every new step
  useEffect(() => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    
    setSelectedSide(null);
    setSelectedSymbol(null);
    setPlacedNumbers([]);
    setIsCorrect(false);
    setIsAnswered(false);
    setWrongTarget(null);

    // Pre-populate if previously answered correctly
    if (answer?.correct) {
      setIsCorrect(true);
      setIsAnswered(true);
      if (step.type === 'game-tap') setSelectedSide(answer.answer);
      else if (step.type === 'game-compare') setSelectedSymbol(answer.answer);
      else if (step.type === 'game-sort') setPlacedNumbers(answer.answer ?? []);
    }
  }, [step]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const startAutoAdvance = (correct: boolean) => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    const delay = correct ? 1500 : 3000;
    autoAdvanceTimer.current = setTimeout(() => {
      onContinue();
    }, delay);
  };

  const shakeFor = (target: WrongTarget, duration = 600) => {
    setWrongTarget(target);
    shakeTimer.current = setTimeout(() => setWrongTarget(null), duration);
  };

  /* ── Game 1: Tap the Bigger ─────────────────────────────────────── */
  const handleSideTap = (side: 'A' | 'B') => {
    if (isAnswered) return;
    
    setSelectedSide(side);
    setIsAnswered(true);

    const correct = side === step.correctSide;
    if (correct) {
      setIsCorrect(true);
      onAnswer({ type: step.type as any, answer: side, correct: true });
    } else {
      setIsCorrect(false);
      onAnswer({ type: step.type as any, answer: side, correct: false });
    }

    startAutoAdvance(correct);
  };

  /* ── Game 2: Feed the Alligator ─────────────────────────────────── */
  const handleSymbolTap = (sym: '>' | '<' | '=') => {
    if (isAnswered) return;

    setSelectedSymbol(sym);
    setIsAnswered(true);

    const correct = sym === step.correctSymbol;
    if (correct) {
      setIsCorrect(true);
      onAnswer({ type: step.type as any, answer: sym, correct: true });
    } else {
      setIsCorrect(false);
      onAnswer({ type: step.type as any, answer: sym, correct: false });
    }

    startAutoAdvance(correct);
  };

  /* ── Game 3: Number Tower Sort ───────────────────────────────────── */
  const handleBlockClick = (num: number) => {
    if (isAnswered) return;
    
    if (placedNumbers.includes(num)) {
      setPlacedNumbers(prev => prev.filter(n => n !== num));
      return;
    }
    if (placedNumbers.length >= 3) return;
    
    const next = [...placedNumbers, num];
    setPlacedNumbers(next);

    if (next.length === 3) {
      setIsAnswered(true);
      const correct = next.every((v, i) => v === step.correctOrder?.[i]);
      
      if (correct) {
        setIsCorrect(true);
        onAnswer({ type: step.type as any, answer: next, correct: true });
      } else {
        setIsCorrect(false);
        onAnswer({ type: step.type as any, answer: next, correct: false });
      }

      startAutoAdvance(correct);
    }
  };

  /* ── Dot-grid counting helper ────────────────────────────────────── */
  const dotColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];
  const renderDots = (count: number) => {
    const scatterPositions = [
      { left: '15%', top: '10%' },
      { left: '65%', top: '15%' },
      { left: '40%', top: '25%' },
      { left: '20%', top: '40%' },
      { left: '75%', top: '35%' },
      { left: '50%', top: '50%' },
      { left: '30%', top: '65%' },
      { left: '68%', top: '60%' },
      { left: '10%', top: '70%' },
      { left: '85%', top: '70%' }
    ];

    return (
      <div className="kg-dot-container" style={{ position: 'relative', width: '100%', height: '80px', minWidth: '110px' }}>
        {scatterPositions.slice(0, count).map((pos, i) => (
          <span
            key={i}
            className="kg-dot"
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              backgroundColor: dotColors[i % dotColors.length],
              animationDelay: `${i * 40}ms`
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`hw-card kg-card ${
      isAnswered
        ? isCorrect ? 'kg-card-correct' : 'kg-card-wrong'
        : ''
    }`}>
      <style>{`
        /* ─── KG Card Shell ─────────────────────────────────────── */
        .kg-card {
          border: 3px solid #6366f1;
          border-radius: 24px;
          overflow: hidden;
          background: var(--card-bg);
          display: flex;
          flex-direction: column;
          min-height: 460px;
          transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kg-card.kg-card-correct {
          border-color: #10b981 !important;
          box-shadow: 0 0 24px rgba(16, 185, 129, 0.35) !important;
        }
        .kg-card.kg-card-wrong {
          border-color: #ef4444 !important;
          box-shadow: 0 0 24px rgba(239, 68, 68, 0.35) !important;
        }

        /* ─── Header ────────────────────────────────────────────── */
        .kg-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 16px 20px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .kg-header-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .kg-topic-name {
          font-size: 1.15rem;
          font-weight: 850;
          color: var(--text);
          margin: 0;
          line-height: 1.2;
        }
        .kg-instruction {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.5;
          margin: 0;
          padding: 0 2px;
        }

        /* ─── Body ──────────────────────────────────────────────── */
        .kg-body {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 20px;
        }

        /* ─── GAME 1: Tap cards ──────────────────────────────────── */
        .kg-tap-wrap {
          display: flex;
          gap: 24px;
          justify-content: center;
          align-items: center;
          width: 100%;
          flex: 1;
        }
        .kg-tap-card {
          flex: 1;
          max-width: 200px;
          min-width: 160px;
          border: 3px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          border-radius: 18px;
          padding: 24px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          user-select: none;
        }
        .kg-tap-card:hover:not(.kg-answered) {
          transform: translateY(-6px) scale(1.02);
          border-color: #6366f1;
          box-shadow: 0 10px 24px rgba(99,102,241,0.15);
        }
        .kg-tap-card.kg-answered {
          pointer-events: none;
        }
        .kg-tap-card.kg-state-correct {
          border-color: #10b981 !important;
          background: rgba(16,185,129,0.08) !important;
          box-shadow: 0 0 0 6px rgba(16,185,129,0.2) !important;
        }
        .kg-tap-card.kg-state-wrong {
          border-color: #ef4444 !important;
          background: rgba(239,68,68,0.08) !important;
          box-shadow: 0 0 0 6px rgba(239,68,68,0.2) !important;
        }
        .kg-big-num {
          font-size: 4.5rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1;
          letter-spacing: -0.02em;
        }

        /* ─── Dot Grid ───────────────────────────────────────────── */
        .kg-dot-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          justify-content: center;
          max-width: 120px;
          min-height: 40px;
          align-content: center;
        }
        .kg-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          animation: kg-popin 0.3s cubic-bezier(0.175,0.885,0.32,1.275) both;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        /* ─── GAME 2: Alligator ──────────────────────────────────── */
        .kg-alli-scene {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin: 4px 0 20px;
        }
        .kg-alli-num {
          font-size: 4rem;
          font-weight: 900;
          color: var(--text);
          width: 90px;
          height: 90px;
          border: 2px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          border-radius: 50%;
          display: grid;
          place-items: center;
          letter-spacing: -0.02em;
        }
        .kg-alli-slot {
          width: 110px;
          height: 110px;
          border: 3px dashed rgba(255,255,255,0.15);
          border-radius: 14px;
          display: grid;
          place-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .kg-alli-slot.slot-correct {
          border-style: solid;
          border-color: #10b981;
          background: rgba(16,185,129,0.06);
          box-shadow: 0 0 0 6px rgba(16,185,129,0.2);
        }
        .kg-alli-slot.slot-wrong {
          border-style: solid;
          border-color: #ef4444;
          background: rgba(239,68,68,0.06);
          box-shadow: 0 0 0 6px rgba(239,68,68,0.2);
        }
        .kg-alli-empty-hint {
          font-size: 2.4rem;
          color: rgba(255,255,255,0.12);
          font-weight: 900;
          user-select: none;
        }
        .kg-alli-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          animation: kg-popin 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both;
        }
        .kg-alli-sym {
          font-size: 2.4rem;
          font-weight: 900;
          line-height: 1;
        }
        .kg-alli-word {
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #10b981;
        }
        .kg-alli-word.word-wrong {
          color: #ef4444;
        }
        .kg-alli-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .kg-sym-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.04);
          border: 2px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          padding: 10px 18px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }
        .kg-sym-btn:hover:not(:disabled) {
          transform: translateX(4px);
          border-color: #6366f1;
          background: rgba(99,102,241,0.08);
        }
        .kg-sym-btn:disabled { cursor: default; }
        .kg-sym-btn.btn-correct {
          background: rgba(16,185,129,0.12) !important;
          border-color: #10b981 !important;
        }
        .kg-sym-btn.btn-wrong {
          background: rgba(239,68,68,0.12) !important;
          border-color: #ef4444 !important;
        }
        .kg-sym-glyph {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--text);
          min-width: 28px;
          text-align: center;
        }
        .kg-sym-label {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text);
        }
        .kg-sym-emoji {
          font-size: 1.2rem;
          margin-left: auto;
        }

        /* ─── GAME 3: Tower Sort ─────────────────────────────────── */
        .kg-sort-wrap {
          display: flex;
          gap: 32px;
          align-items: center;
          justify-content: center;
          flex: 1;
          width: 100%;
        }
        .kg-block-bank {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .kg-block-bank-label {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-dim);
          margin-bottom: 2px;
        }
        .kg-block {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-radius: 14px;
          color: white;
          font-size: 2rem;
          font-weight: 900;
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(99,102,241,0.3), 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s cubic-bezier(0.175,0.885,0.32,1.275),
                      opacity 0.2s, box-shadow 0.2s;
          user-select: none;
        }
        .kg-block:hover:not(.kg-block-placed):not(.kg-block-disabled) {
          transform: scale(1.12) rotate(-2deg);
          box-shadow: 0 10px 20px rgba(99,102,241,0.4);
        }
        .kg-block-placed {
          opacity: 0.22;
          transform: scale(0.88);
          pointer-events: none;
          box-shadow: none;
        }
        .kg-block-disabled {
          pointer-events: none;
        }
        .kg-tower {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          padding-top: 28px;
          min-width: 160px;
        }
        .kg-tower-star {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.6rem;
          animation: kg-starjump 0.7s cubic-bezier(0.175,0.885,0.32,1.275) both;
          pointer-events: none;
        }
        .kg-tower-label {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-dim);
          text-align: center;
          margin-bottom: 2px;
        }
        .kg-slot {
          height: 52px;
          border: 2px dashed rgba(255,255,255,0.14);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          background: rgba(255,255,255,0.015);
          cursor: pointer;
          transition: all 0.3s;
          min-width: 150px;
        }
        .kg-slot-empty-hint {
          color: rgba(255,255,255,0.18);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .kg-slot.slot-filled-ok {
          border-style: solid;
          border-color: #10b981;
          background: linear-gradient(90deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%);
          box-shadow: 0 0 0 4px rgba(16,185,129,0.15);
        }
        .kg-slot.slot-filled-wrong {
          border-style: solid;
          border-color: #ef4444;
          background: linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%);
          box-shadow: 0 0 0 4px rgba(239,68,68,0.15);
        }
        .kg-slot.slot-filled-pending {
          border-style: solid;
          border-color: rgba(255,255,255,0.25);
          background: rgba(255,255,255,0.04);
        }
        .kg-slot-num-display {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1;
        }
        .kg-slot-rank {
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.5);
          margin-left: auto;
        }

        /* ─── Minimal Note ───────────────────────────────────────── */
        .kg-minimal-note {
          font-size: 0.95rem;
          font-weight: 650;
          text-align: center;
          margin-top: 16px;
          line-height: 1.5;
          max-width: 480px;
          animation: kg-slidein 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
          user-select: none;
        }

        /* ─── Loading Spinner ────────────────────────────────────── */
        .kg-loading-spinner {
          width: 14px;
          height: 14px;
          border: 2.5px solid rgba(255, 255, 255, 0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: kg-spin 1.5s linear infinite; /* Spin it slow */
          display: inline-block;
          flex-shrink: 0;
        }

        /* ─── Footer CTA ─────────────────────────────────────────── */
        .kg-next-btn {
          background: #10b981 !important;
          border-color: #10b981 !important;
          color: white !important;
          opacity: 0.55 !important; /* Faint button color during that time */
          animation: kg-popin 0.45s cubic-bezier(0.175,0.885,0.32,1.275) both;
        }
        .kg-next-btn-wrong {
          background: #ef4444 !important;
          border-color: #ef4444 !important;
          color: white !important;
          opacity: 0.55 !important; /* Faint button color during that time */
          animation: kg-popin 0.45s cubic-bezier(0.175,0.885,0.32,1.275) both;
        }

        /* ─── Keyframes ──────────────────────────────────────────── */
        @keyframes kg-popin {
          from { opacity: 0; transform: scale(0.75); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes kg-slidein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kg-starjump {
          0%  { transform: translateX(-50%) scale(0) rotate(-30deg); opacity: 0; }
          70% { transform: translateX(-50%) scale(1.3) rotate(10deg); opacity: 1; }
          100%{ transform: translateX(-50%) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes kg-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="kg-header">
        <div className="kg-header-top">
          <h3 className="kg-topic-name">{getTopicName(step)}</h3>
        </div>
        <p className="kg-instruction">{step.text}</p>
      </div>

      {/* ── Body ── */}
      <div className="kg-body">

        {/* ────────── GAME 1: TAP THE BIGGER NUMBER ────────── */}
        {step.type === 'game-tap' && (
          <div className="kg-tap-wrap">
            {(['A', 'B'] as const).map(side => {
              const num = side === 'A' ? step.numberA : step.numberB;
              const isSelected = selectedSide === side;
              const cardStateClass = isSelected
                ? (isCorrect ? 'kg-state-correct' : 'kg-state-wrong')
                : '';
              return (
                <div
                  key={side}
                  className={`kg-tap-card ${cardStateClass} ${isAnswered ? 'kg-answered' : ''}`}
                  onClick={() => handleSideTap(side)}
                >
                  <div className="kg-big-num" style={{ color: (!step.hideNumbers || isAnswered) ? 'var(--text)' : 'var(--text-dim)' }}>
                    {(!step.hideNumbers || isAnswered) ? num : '?'}
                  </div>
                  {renderDots(num ?? 0)}
                </div>
              );
            })}
          </div>
        )}

        {/* ────────── GAME 2: FEED THE ALLIGATOR ────────── */}
        {step.type === 'game-compare' && (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}>
            {/* Scene: Left Num — Slot — Right Num */}
            <div className="kg-alli-scene" style={{ flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="kg-alli-num">{step.numberA}</div>
                <div className={`kg-alli-slot ${
                  selectedSymbol
                    ? isCorrect ? 'slot-correct' : 'slot-wrong'
                    : ''
                }`}>
                  {selectedSymbol ? (
                    <div className="kg-alli-display">
                      <span className="kg-alli-sym" style={{ color: isCorrect ? '#10b981' : '#ef4444' }}>
                        {selectedSymbol}
                      </span>
                      <span className={`kg-alli-word ${!isCorrect ? 'word-wrong' : ''}`}>
                        {selectedSymbol === '>' ? 'Greater' : selectedSymbol === '<' ? 'Less' : 'Equal'}
                      </span>
                    </div>
                  ) : (
                    <span className="kg-alli-empty-hint">?</span>
                  )}
                </div>
                <div className="kg-alli-num">{step.numberB}</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="kg-alli-buttons">
              {([
                { sym: '>' as const, label: 'Greater Than', emoji: '🐊' },
                { sym: '=' as const, label: 'Equal To',     emoji: '⚖️' },
                { sym: '<' as const, label: 'Less Than',    emoji: '🐊' },
              ]).map(({ sym, label, emoji }) => {
                const isSelected = selectedSymbol === sym;
                return (
                  <button
                    key={sym}
                    className={`kg-sym-btn ${
                      isSelected
                        ? isCorrect ? 'btn-correct' : 'btn-wrong'
                        : ''
                    }`}
                    disabled={isAnswered}
                    onClick={() => handleSymbolTap(sym)}
                  >
                    <span className="kg-sym-glyph">{sym}</span>
                    <span className="kg-sym-label">{label}</span>
                    <span className="kg-sym-emoji">{emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ────────── GAME 3: NUMBER TOWER SORT ────────── */}
        {step.type === 'game-sort' && (
          <div className="kg-sort-wrap">
            {/* Block Bank */}
            <div className="kg-block-bank">
              <span className="kg-block-bank-label">Tap to place</span>
              {step.numbers?.map((num, i) => (
                <div
                  key={i}
                  className={`kg-block ${placedNumbers.includes(num) ? 'kg-block-placed' : ''} ${isAnswered ? 'kg-block-disabled' : ''}`}
                  onClick={() => handleBlockClick(num)}
                >
                  {num}
                </div>
              ))}
            </div>

            {/* Tower */}
            <div className="kg-tower">
              {isCorrect && <div className="kg-tower-star">⭐</div>}
              <span className="kg-tower-label">Build smallest → biggest</span>
              {(['3rd (Biggest)', '2nd (Middle)', '1st (Smallest)'] as const).map((rankLabel, visualIdx) => {
                const slotIdx = 2 - visualIdx; // slot 2 = biggest at top
                const num = placedNumbers[slotIdx];
                const isFilled = num !== undefined;
                return (
                  <div
                    key={slotIdx}
                    className={`kg-slot ${
                      isFilled
                        ? isCorrect ? 'slot-filled-ok' : isAnswered ? 'slot-filled-wrong' : 'slot-filled-pending'
                        : ''
                    }`}
                    onClick={() => isFilled && !isAnswered && handleBlockClick(num)}
                  >
                    {isFilled ? (
                      <>
                        <span className="kg-slot-num-display">{num}</span>
                        <span className="kg-slot-rank">{rankLabel}</span>
                      </>
                    ) : (
                      <span className="kg-slot-empty-hint">Tap a number…</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Minimal Explanation Note ── */}
        {isAnswered && (
          <p className="kg-minimal-note" style={{ color: isCorrect ? '#10b981' : '#ef4444' }}>
            {step.explanation}
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        {stepProgressText && <span className="footer-step-indicator">{stepProgressText}</span>}
        <button
          className={`nav-btn primary ${
            isAnswered
              ? isCorrect ? 'kg-next-btn' : 'kg-next-btn-wrong'
              : ''
          }`}
          onClick={onContinue}
          disabled={!isAnswered}
        >
          {isAnswered ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Next</span>
              <span className="kg-loading-spinner" />
            </span>
          ) : (
            "Next →"
          )}
        </button>
      </div>
    </div>
  );
};
