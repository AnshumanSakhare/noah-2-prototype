"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';

interface MathSortGuideStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathSortGuideStep: React.FC<MathSortGuideStepProps> = ({
  step,
  onBack,
  onContinue,
  isFirst,
  stepProgressText
}) => {
  const topicId = step.topic || '';
  const bundle = getMathTopicBundle(topicId);

  if (!bundle) {
    return (
      <div className="hw-card">
        <div className="hw-card-body">
          <p className="text-dim text-center">Math topic bundle &quot;{topicId}&quot; not found in registry.</p>
        </div>
        <div className="hw-card-footer">
          <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>← Back</button>
          <span className="footer-step-indicator">{stepProgressText}</span>
          <button className="nav-btn primary" onClick={onContinue}>Continue →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hw-card hw-card-recap math-recap-card-layout math-concept-card">
      <style>{`
        /* ─── Micro-Animation Demo Styles ─── */
        .guide-sandbox-demo-box {
          width: 100%;
          background: #f8fafc;
          border: 1.2px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 180px;
          overflow: hidden;
        }
        /* Fixed-pixel SVG wrapper ensures 1 CSS px = 1 SVG user unit */
        .guide-svg-scaler {
          width: 300px;
          max-width: 100%;
          aspect-ratio: 300 / 165;
          position: relative;
        }
        .guide-svg-scaler svg {
          width: 300px;
          height: 165px;
          display: block;
        }

        /* 10-second Animation Cycle */
        @keyframes blockAPlace {
          0%, 46%   { transform: translate(40px, 135px); opacity: 1; }
          54%, 85%  { transform: translate(210px, 55px); opacity: 1; }
          90%, 100% { transform: translate(40px, 135px); opacity: 0; }
        }

        @keyframes blockBPlace {
          0%, 10%   { transform: translate(70px, 135px); opacity: 1; }
          18%, 85%  { transform: translate(210px, 105px); opacity: 1; }
          90%, 100% { transform: translate(70px, 135px); opacity: 0; }
        }

        @keyframes blockCPlace {
          0%, 28%   { transform: translate(100px, 135px); opacity: 1; }
          36%, 85%  { transform: translate(210px, 80px); opacity: 1; }
          90%, 100% { transform: translate(100px, 135px); opacity: 0; }
        }

        @keyframes starPop {
          0%, 56%   { transform: scale(0); opacity: 0; }
          62%, 85%  { transform: scale(1); opacity: 1; }
          90%, 100% { transform: scale(0); opacity: 0; }
        }

        @keyframes cursorMove {
          0%        { transform: translate(150px, 150px); opacity: 0; }
          4%        { transform: translate(150px, 150px); opacity: 1; }
          8%, 11%   { transform: translate(70px, 135px); opacity: 1; }  /* Hover on 2 */
          20%       { transform: translate(150px, 150px); opacity: 1; }  /* Retreat */
          24%, 29%  { transform: translate(100px, 135px); opacity: 1; } /* Hover on 5 */
          38%       { transform: translate(150px, 150px); opacity: 1; }  /* Retreat */
          42%, 47%  { transform: translate(40px, 135px); opacity: 1; }  /* Hover on 7 */
          56%, 100% { transform: translate(150px, 150px); opacity: 0; }  /* Hide */
        }

        .g-guide-block-a {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: blockAPlace 10s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-guide-block-b {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: blockBPlace 10s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-guide-block-c {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: blockCPlace 10s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-guide-star {
          transform-origin: 210px 30px;
          transform-box: view-box;
          animation: starPop 10s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
        }
        .g-guide-hand {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: cursorMove 10s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
        }

        .guide-brief-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 4px;
        }
        .guide-brief-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .guide-brief-bullet {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.08);
          color: var(--accent);
          font-size: 0.85rem;
          font-weight: 800;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .guide-brief-body {
          flex: 1;
        }
        .guide-brief-title {
          font-size: 0.92rem;
          font-weight: 850;
          color: var(--text);
          margin-bottom: 2px;
        }
        .guide-brief-desc {
          font-size: 0.8rem;
          color: var(--text-dim);
          line-height: 1.4;
        }
      `}</style>

      {/* Card Header */}
      <div className="hw-card-header">
        <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
          {getTopicName(step)}
        </h3>
        <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          Playground Guide &bull; How to Play
        </div>
      </div>

      {/* Card Body */}
      <div className="hw-card-body" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', alignItems: 'center', paddingBottom: '16px' }}>

        {/* Left Side: Less Words, Highly Visual Rules */}
        <div className="guide-brief-items">
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">1</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Compare Values</div>
              <div className="guide-brief-desc">Count dots or read numbers to find the smallest block.</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">2</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Tap in Order</div>
              <div className="guide-brief-desc">Tap blocks from smallest to biggest. Tapped blocks slide to the tower!</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">3</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Stack the Tower</div>
              <div className="guide-brief-desc">Stack them all up to complete the tower and get a star! ⭐</div>
            </div>
          </div>
        </div>

        {/* Right Side: Micro-Animation Visual Demo */}
        <div className="guide-sandbox-demo-box">
          <div className="guide-svg-scaler">
            <svg viewBox="0 0 300 165" style={{ overflow: 'visible' }}>
              {/* Stand/Floor for Tower */}
              <line x1="170" y1="120" x2="250" y2="120" stroke="#94a3b8" strokeWidth="4.5" strokeLinecap="round" />

              {/* Tower Slots */}
              {/* Slot 0 (Bottom) */}
              <rect x="195" y="93" width="30" height="24" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="2.2" strokeDasharray="3 3" />
              <text x="238" y="108" fill="#94a3b8" fontWeight="800" fontSize="6.5" fontFamily="monospace">1st</text>

              {/* Slot 1 (Middle) */}
              <rect x="195" y="68" width="30" height="24" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="2.2" strokeDasharray="3 3" />
              <text x="238" y="83" fill="#94a3b8" fontWeight="800" fontSize="6.5" fontFamily="monospace">2nd</text>

              {/* Slot 2 (Top) */}
              <rect x="195" y="43" width="30" height="24" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="2.2" strokeDasharray="3 3" />
              <text x="238" y="58" fill="#94a3b8" fontWeight="800" fontSize="6.5" fontFamily="monospace">3rd</text>

              {/* Bank background/container for blocks */}
              <rect x="25" y="115" width="105" height="35" rx="10" fill="rgba(0,0,0,0.03)" stroke="#e2e8f0" strokeWidth="1.2" />
              <text x="77" y="145" textAnchor="middle" fill="#94a3b8" fontWeight="800" fontSize="6" fontFamily="sans-serif">TAP TO PLACE</text>

              {/* Blocks representation */}
              {/* Block B: Value 2 (Smallest) */}
              <g className="g-guide-block-b">
                <rect x="-12" y="-12" width="24" height="24" rx="6" fill="linear-gradient(135deg, #6366f1, #4f46e5)" stroke="#312e81" strokeWidth="1.2" />
                <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="monospace">2</text>
              </g>

              {/* Block C: Value 5 (Middle) */}
              <g className="g-guide-block-c">
                <rect x="-12" y="-12" width="24" height="24" rx="6" fill="linear-gradient(135deg, #6366f1, #4f46e5)" stroke="#312e81" strokeWidth="1.2" />
                <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="monospace">5</text>
              </g>

              {/* Block A: Value 7 (Biggest, shown as dots) */}
              <g className="g-guide-block-a">
                <rect x="-12" y="-12" width="24" height="24" rx="6" fill="linear-gradient(135deg, #6366f1, #4f46e5)" stroke="#312e81" strokeWidth="1.2" />
                {/* 7 dots grid inside block */}
                <circle cx="-6" cy="-6" r="1.8" fill="#ffffff" />
                <circle cx="0" cy="-6" r="1.8" fill="#ffffff" />
                <circle cx="6" cy="-6" r="1.8" fill="#ffffff" />
                <circle cx="-6" cy="0" r="1.8" fill="#ffffff" />
                <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
                <circle cx="6" cy="0" r="1.8" fill="#ffffff" />
                <circle cx="0" cy="6" r="1.8" fill="#ffffff" />
              </g>

              {/* Star pop-up at top */}
              <g className="g-guide-star">
                <path d="M210,18 L213,24 L220,25 L215,30 L216,37 L210,34 L204,37 L205,30 L200,25 L207,24 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
              </g>

              {/* Hand cursor */}
              <g className="g-guide-hand">
                <path d="M-2,-2 L-2,10 L1,7 L4,12 L6,11 L3,6 L7,6 Z" fill="#1e293b" stroke="#ffffff" strokeWidth="1.2" />
              </g>
            </svg>
          </div>
        </div>

      </div>

      {/* Card Footer */}
      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        <span className="footer-step-indicator">{stepProgressText}</span>
        <button className="nav-btn primary" onClick={onContinue}>
          Start Game →
        </button>
      </div>
    </div>
  );
};

export default MathSortGuideStep;
