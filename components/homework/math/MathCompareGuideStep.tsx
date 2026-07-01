"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';

interface MathCompareGuideStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathCompareGuideStep: React.FC<MathCompareGuideStepProps> = ({
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

        /* 3-phase Opacity Animations (9s Cycle) */
        @keyframes comparePhase1 {
          0%, 28%   { opacity: 1; visibility: visible; }
          33%, 95%  { opacity: 0; visibility: hidden; }
          98%, 100% { opacity: 1; visibility: visible; }
        }
        @keyframes comparePhase2 {
          0%, 28%   { opacity: 0; visibility: hidden; }
          33%, 61%  { opacity: 1; visibility: visible; }
          66%, 100% { opacity: 0; visibility: hidden; }
        }
        @keyframes comparePhase3 {
          0%, 61%   { opacity: 0; visibility: hidden; }
          66%, 95%  { opacity: 1; visibility: visible; }
          98%, 100% { opacity: 0; visibility: hidden; }
        }

        .g-compare-p1 {
          animation: comparePhase1 9s infinite;
        }
        .g-compare-p2 {
          animation: comparePhase2 9s infinite;
        }
        .g-compare-p3 {
          animation: comparePhase3 9s infinite;
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
          Playground Guide &bull; Comparison Symbols
        </div>
      </div>

      {/* Card Body */}
      <div className="hw-card-body" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', alignItems: 'center', paddingBottom: '16px' }}>
        
        {/* Left Side: Less Words, Highly Visual Rules */}
        <div className="guide-brief-items">
          <div className="guide-brief-row">
            <div className="guide-brief-bullet" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.08)' }}>&gt;</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title" style={{ color: '#10b981' }}>Greater Than (&gt;)</div>
              <div className="guide-brief-desc">The open wide mouth always points to the bigger number! (e.g. 5 &gt; 2)</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)' }}>&lt;</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title" style={{ color: '#ef4444' }}>Less Than (&lt;)</div>
              <div className="guide-brief-desc">The small pointed end always points at the smaller number! (e.g. 3 &lt; 8)</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">=</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Equal To (=)</div>
              <div className="guide-brief-desc">When both numbers are the same, they are equal! (e.g. 6 = 6)</div>
            </div>
          </div>
        </div>

        {/* Right Side: Micro-Animation Visual Demo matching the actual Alligator game */}
        <div className="guide-sandbox-demo-box">
          <div className="guide-svg-scaler">
            <svg viewBox="0 0 300 165" style={{ overflow: 'visible' }}>
              
              {/* LEFT CARD */}
              <g>
                <rect x="35" y="24" width="62" height="106" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Phase 1: Number 5 */}
                <g className="g-compare-p1">
                  <text x="66" y="68" textAnchor="middle" fill="var(--text)" fontWeight="900" fontSize="36" fontFamily="sans-serif">5</text>
                  {/* 5 Dots Grid */}
                  <circle cx="54" cy="92" r="3.5" fill="#f43f5e" />
                  <circle cx="66" cy="92" r="3.5" fill="#3b82f6" />
                  <circle cx="78" cy="92" r="3.5" fill="#10b981" />
                  <circle cx="60" cy="104" r="3.5" fill="#f59e0b" />
                  <circle cx="72" cy="104" r="3.5" fill="#8b5cf6" />
                </g>

                {/* Phase 2: Number 3 */}
                <g className="g-compare-p2">
                  <text x="66" y="68" textAnchor="middle" fill="var(--text)" fontWeight="900" fontSize="36" fontFamily="sans-serif">3</text>
                  {/* 3 Dots Row */}
                  <circle cx="54" cy="98" r="3.5" fill="#f43f5e" />
                  <circle cx="66" cy="98" r="3.5" fill="#3b82f6" />
                  <circle cx="78" cy="98" r="3.5" fill="#10b981" />
                </g>

                {/* Phase 3: Number 6 */}
                <g className="g-compare-p3">
                  <text x="66" y="68" textAnchor="middle" fill="var(--text)" fontWeight="900" fontSize="36" fontFamily="sans-serif">6</text>
                  {/* 6 Dots Grid */}
                  <circle cx="54" cy="92" r="3.5" fill="#f43f5e" />
                  <circle cx="66" cy="92" r="3.5" fill="#3b82f6" />
                  <circle cx="78" cy="92" r="3.5" fill="#10b981" />
                  <circle cx="54" cy="104" r="3.5" fill="#f59e0b" />
                  <circle cx="66" cy="104" r="3.5" fill="#8b5cf6" />
                  <circle cx="78" cy="104" r="3.5" fill="#ec4899" />
                </g>
              </g>

              {/* CENTER SLOT (Matches dashed slot in alligator game) */}
              <g>
                <rect x="112" y="44" width="76" height="72" rx="12" fill="rgba(0,0,0,0.015)" stroke="#cbd5e1" strokeWidth="2.2" strokeDasharray="4 4" />
                
                {/* Phase 1: Greater Than (>) */}
                <g className="g-compare-p1">
                  <text x="150" y="82" textAnchor="middle" fill="#10b981" fontWeight="900" fontSize="28" fontFamily="sans-serif">&gt;</text>
                  <text x="150" y="100" textAnchor="middle" fill="#10b981" fontWeight="800" fontSize="8" letterSpacing="0.05em" fontFamily="sans-serif">GREATER</text>
                </g>

                {/* Phase 2: Less Than (<) */}
                <g className="g-compare-p2">
                  <text x="150" y="82" textAnchor="middle" fill="#ef4444" fontWeight="900" fontSize="28" fontFamily="sans-serif">&lt;</text>
                  <text x="150" y="100" textAnchor="middle" fill="#ef4444" fontWeight="800" fontSize="8" letterSpacing="0.05em" fontFamily="sans-serif">LESS</text>
                </g>

                {/* Phase 3: Equal To (=) */}
                <g className="g-compare-p3">
                  <text x="150" y="82" textAnchor="middle" fill="var(--accent)" fontWeight="900" fontSize="28" fontFamily="sans-serif">=</text>
                  <text x="150" y="100" textAnchor="middle" fill="var(--accent)" fontWeight="800" fontSize="8" letterSpacing="0.05em" fontFamily="sans-serif">EQUAL</text>
                </g>
              </g>

              {/* RIGHT CARD */}
              <g>
                <rect x="203" y="24" width="62" height="106" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Phase 1: Number 2 */}
                <g className="g-compare-p1">
                  <text x="234" y="68" textAnchor="middle" fill="var(--text)" fontWeight="900" fontSize="36" fontFamily="sans-serif">2</text>
                  {/* 2 Dots Row */}
                  <circle cx="226" cy="98" r="3.5" fill="#f43f5e" />
                  <circle cx="242" cy="98" r="3.5" fill="#3b82f6" />
                </g>

                {/* Phase 2: Number 8 */}
                <g className="g-compare-p2">
                  <text x="234" y="68" textAnchor="middle" fill="var(--text)" fontWeight="900" fontSize="36" fontFamily="sans-serif">8</text>
                  {/* 8 Dots Grid */}
                  <circle cx="216" cy="92" r="3.5" fill="#f43f5e" />
                  <circle cx="228" cy="92" r="3.5" fill="#3b82f6" />
                  <circle cx="240" cy="92" r="3.5" fill="#10b981" />
                  <circle cx="252" cy="92" r="3.5" fill="#f59e0b" />
                  <circle cx="216" cy="104" r="3.5" fill="#8b5cf6" />
                  <circle cx="228" cy="104" r="3.5" fill="#ec4899" />
                  <circle cx="240" cy="104" r="3.5" fill="#14b8a6" />
                  <circle cx="252" cy="104" r="3.5" fill="#f97316" />
                </g>

                {/* Phase 3: Number 6 */}
                <g className="g-compare-p3">
                  <text x="234" y="68" textAnchor="middle" fill="var(--text)" fontWeight="900" fontSize="36" fontFamily="sans-serif">6</text>
                  {/* 6 Dots Grid */}
                  <circle cx="222" cy="92" r="3.5" fill="#f43f5e" />
                  <circle cx="234" cy="92" r="3.5" fill="#3b82f6" />
                  <circle cx="246" cy="92" r="3.5" fill="#10b981" />
                  <circle cx="222" cy="104" r="3.5" fill="#f59e0b" />
                  <circle cx="234" cy="104" r="3.5" fill="#8b5cf6" />
                  <circle cx="246" cy="104" r="3.5" fill="#ec4899" />
                </g>
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

export default MathCompareGuideStep;
