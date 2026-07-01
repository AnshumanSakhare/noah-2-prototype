"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';

interface MathPythagorasGuideStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathPythagorasGuideStep: React.FC<MathPythagorasGuideStepProps> = ({
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

        /* 9-second Animation Cycle */
        @keyframes handMove {
          0%        { transform: translate(290px, 140px); opacity: 0; }
          5%        { transform: translate(290px, 140px); opacity: 1; }
          15%       { transform: translate(235px, 52px); opacity: 1; }   /* Move to Slider a */
          25%       { transform: translate(255px, 52px); opacity: 1; }   /* Drag slider right */
          35%       { transform: translate(235px, 52px); opacity: 1; }   /* Drag slider back */
          45%       { transform: translate(210px, 104px); opacity: 1; }  /* Move to Flow Water button */
          48%       { transform: translate(210px, 104px) scale(0.9); opacity: 1; } /* Click button */
          52%       { transform: translate(210px, 104px) scale(1); opacity: 1; }   /* Release button */
          60%, 100% { transform: translate(260px, 140px); opacity: 0; }
        }

        @keyframes sliderHandleA {
          0%, 15%   { cx: 235px; }
          25%       { cx: 255px; }
          35%, 100% { cx: 235px; }
        }

        @keyframes btnClick {
          0%, 47%   { fill: #3b82f6; }
          48%, 52%  { fill: #1d4ed8; }
          53%, 82%  { fill: #cbd5e1; } /* disabled state */
          85%, 100% { fill: #3b82f6; }
        }

        @keyframes waterADrain {
          0%, 48%   { y: 88px; height: 31px; }
          72%, 82%  { y: 119px; height: 0px; }
          85%, 100% { y: 88px; height: 31px; }
        }

        @keyframes waterBDrain {
          0%, 48%   { y: 121px; height: 42px; }
          72%, 82%  { y: 163px; height: 0px; }
          85%, 100% { y: 121px; height: 42px; }
        }

        @keyframes waterCFill {
          0%, 48%   { y: 54px; height: 0px; }
          72%, 82%  { y: 1px; height: 53px; }
          85%, 100% { y: 54px; height: 0px; }
        }

        @keyframes resultBgHighlight {
          0%, 47%   { fill: rgba(59,130,246,0.03); stroke: rgba(59,130,246,0.08); }
          48%, 71%  { fill: rgba(59,130,246,0.06); stroke: rgba(59,130,246,0.15); }
          72%, 82%  { fill: rgba(34,197,94,0.06); stroke: rgba(34,197,94,0.15); }
          85%, 100% { fill: rgba(59,130,246,0.03); stroke: rgba(59,130,246,0.08); }
        }

        @keyframes textAdjust {
          0%, 47%   { opacity: 1; visibility: visible; }
          48%, 84%  { opacity: 0; visibility: hidden; }
          85%, 100% { opacity: 1; visibility: visible; }
        }

        @keyframes textDraining {
          0%, 47%   { opacity: 0; visibility: hidden; }
          48%, 71%  { opacity: 1; visibility: visible; }
          72%, 100% { opacity: 0; visibility: hidden; }
        }

        @keyframes textProved {
          0%, 71%   { opacity: 0; visibility: hidden; }
          72%, 82%  { opacity: 1; visibility: visible; }
          85%, 100% { opacity: 0; visibility: hidden; }
        }

        .g-pythag-hand {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: handMove 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-pythag-slider-handle-a {
          animation: sliderHandleA 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-pythag-btn {
          animation: btnClick 9s ease infinite;
        }
        .g-pythag-water-a {
          animation: waterADrain 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-pythag-water-b {
          animation: waterBDrain 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-pythag-water-c {
          animation: waterCFill 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-pythag-result-bg {
          animation: resultBgHighlight 9s ease infinite;
        }
        .g-pythag-text-adjust {
          animation: textAdjust 9s ease infinite;
          fill: #64748b;
          font-weight: 700;
        }
        .g-pythag-text-draining {
          animation: textDraining 9s ease infinite;
          fill: #3b82f6;
          font-weight: 700;
        }
        .g-pythag-text-proved {
          animation: textProved 9s ease infinite;
          fill: #16a34a;
          font-weight: 800;
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
          Playground Guide &bull; Pythagoras Theorem
        </div>
      </div>

      {/* Card Body */}
      <div className="hw-card-body" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', alignItems: 'center', paddingBottom: '16px' }}>

        {/* Left Side: Visual Rules */}
        <div className="guide-brief-items">
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">1</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Adjust Sides</div>
              <div className="guide-brief-desc">Drag the sliders to set the lengths of sides a and b of the triangle.</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">2</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Flow Water</div>
              <div className="guide-brief-desc">Tap &apos;Flow Water&apos; to watch water from squares a² and b² flow into square c².</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">3</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Prove Theorem</div>
              <div className="guide-brief-desc">Verify that the sum of the square areas matches: a² + b² = c²! 💧</div>
            </div>
          </div>
        </div>

        {/* Right Side: Micro-Animation Visual Demo */}
        <div className="guide-sandbox-demo-box">
          <div className="guide-svg-scaler">
            <svg viewBox="0 0 300 165" style={{ overflow: 'visible' }}>
              {/* Right Triangle */}
              <polygon points="85,120 85,87 129,120" fill="#ffffff" stroke="#475569" strokeWidth="1.8" />
              {/* 90-degree marker */}
              <rect x="85" y="114" width="6" height="6" fill="none" stroke="#64748b" strokeWidth="1.2" />

              {/* Square A — left of side a */}
              <rect x="52" y="87" width="33" height="33" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.2" rx="2" />
              <rect className="g-pythag-water-a" x="53" width="31" fill="rgba(59,130,246,0.35)" rx="1" />
              <text x="68.5" y="106.5" textAnchor="middle" fill="#1d4ed8" fontWeight="bold" fontSize="7.5" fontFamily="sans-serif">
                a²=9
              </text>

              {/* Square B — below side b */}
              <rect x="85" y="120" width="44" height="44" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.2" rx="2" />
              <rect className="g-pythag-water-b" x="86" width="42" fill="rgba(59,130,246,0.35)" rx="1" />
              <text x="107" y="145" textAnchor="middle" fill="#1d4ed8" fontWeight="bold" fontSize="7.5" fontFamily="sans-serif">
                b²=16
              </text>

              {/* Square C — on hypotenuse, rotated */}
              <g transform="translate(85, 87) rotate(53.13)">
                <rect width="55" height="55" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" rx="2" />
                <rect className="g-pythag-water-c" x="1" width="53" fill="rgba(14,165,233,0.45)" rx="1" />
                <g transform="translate(27.5, 27.5) rotate(-53.13)">
                  <text x="0" y="3.5" textAnchor="middle" fill="#0369a1" fontWeight="bold" fontSize="8" fontFamily="sans-serif">
                    c²=25
                  </text>
                </g>
              </g>

              {/* Side labels */}
              <text x="80" y="106.5" textAnchor="end" fill="#475569" fontWeight="800" fontSize="8" fontFamily="sans-serif">a=3</text>
              <text x="107" y="130" textAnchor="middle" fill="#475569" fontWeight="800" fontSize="8" fontFamily="sans-serif">b=4</text>
              <text x="99" y="97.5" textAnchor="middle" fill="#0ea5e9" fontWeight="800" fontSize="8" fontFamily="sans-serif">c=5</text>

              {/* Controls UI (Sliders & Buttons) */}
              {/* Slider a */}
              <text x="180" y="55" fill="#475569" fontWeight="700" fontSize="7.5" fontFamily="sans-serif">Side a</text>
              <line x1="215" y1="52" x2="275" y2="52" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              <circle className="g-pythag-slider-handle-a" cx="235" cy="52" r="4.5" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
              <text x="288" y="55" fill="#3b82f6" fontWeight="800" fontSize="8" fontFamily="sans-serif">3</text>

              {/* Slider b */}
              <text x="180" y="75" fill="#475569" fontWeight="700" fontSize="7.5" fontFamily="sans-serif">Side b</text>
              <line x1="215" y1="72" x2="275" y2="72" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="255" cy="72" r="4.5" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
              <text x="288" y="75" fill="#3b82f6" fontWeight="800" fontSize="8" fontFamily="sans-serif">4</text>

              {/* Action Buttons */}
              <rect className="g-pythag-btn" x="180" y="94" width="62" height="18" rx="4.5" fill="#3b82f6" />
              <text x="211" y="105.5" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="7.5" fontFamily="sans-serif">Flow Water</text>

              <rect x="247" y="94" width="41" height="18" rx="4.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
              <text x="267.5" y="105.5" textAnchor="middle" fill="#475569" fontWeight="800" fontSize="7.5" fontFamily="sans-serif">Reset</text>

              {/* Result Line Banner */}
              <rect className="g-pythag-result-bg" x="40" y="132" width="220" height="22" rx="6" strokeWidth="1" fill="rgba(59,130,246,0.03)" stroke="rgba(59,130,246,0.08)" />
              <text className="g-pythag-text-adjust" x="150" y="146" textAnchor="middle" fontSize="7.5" fontFamily="sans-serif">Adjust sides, then tap Flow Water to prove the theorem</text>
              <text className="g-pythag-text-draining" x="150" y="146" textAnchor="middle" fontSize="7.5" fontFamily="sans-serif">Draining a²(9) + b²(16) into c²(25)...</text>
              <text className="g-pythag-text-proved" x="150" y="146" textAnchor="middle" fontSize="7.5" fontFamily="sans-serif">Proved: 9 + 16 = 25</text>

              {/* Hand Cursor */}
              <g className="g-pythag-hand">
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
          Start Sandbox →
        </button>
      </div>
    </div>
  );
};

export default MathPythagorasGuideStep;
