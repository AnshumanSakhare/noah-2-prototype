"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';

interface MathFractionGuideStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathFractionGuideStep: React.FC<MathFractionGuideStepProps> = ({
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
        @keyframes handPizza {
          0%        { transform: translate(150px, 150px); opacity: 0; }
          5%        { transform: translate(150px, 150px); opacity: 1; }
          15%, 18%  { transform: translate(220px, 45px); opacity: 1; }  /* Tap Slice 0 */
          28%, 31%  { transform: translate(220px, 75px); opacity: 1; }  /* Tap Slice 1 */
          42%, 46%  { transform: translate(180px, 120px); opacity: 1; } /* Grab Slider */
          58%, 64%  { transform: translate(220px, 120px); opacity: 1; } /* Drag Slider */
          74%, 100% { transform: translate(150px, 150px); opacity: 0; }
        }

        @keyframes slice0Color {
          0%, 15%   { fill: #fef3c7; } /* pizzaBg */
          16%, 80%  { fill: #f59e0b; } /* pizzaColor */
          85%, 100% { fill: #fef3c7; }
        }

        @keyframes slice1Color {
          0%, 28%   { fill: #fef3c7; }
          29%, 80%  { fill: #f59e0b; }
          85%, 100% { fill: #fef3c7; }
        }

        @keyframes sliderDrag {
          0%, 42%   { cx: 180px; }
          58%, 80%  { cx: 220px; }
          85%, 100% { cx: 180px; }
        }

        @keyframes pizzaDivisions {
          0%, 46%   { opacity: 1; visibility: visible; }
          50%, 80%  { opacity: 0; visibility: hidden; }
          85%, 100% { opacity: 1; visibility: visible; }
        }

        @keyframes pizzaDivisionsAlt {
          0%, 46%   { opacity: 0; visibility: hidden; }
          50%, 80%  { opacity: 1; visibility: visible; }
          85%, 100% { opacity: 0; visibility: hidden; }
        }

        @keyframes labelTextSwap {
          0%, 15%   { opacity: 0.5; }
          16%, 28%  { opacity: 1; content: "1/4"; }
          29%, 46%  { opacity: 1; content: "2/4"; }
          50%, 80%  { opacity: 1; content: "3/6"; }
          85%, 100% { opacity: 0.5; }
        }

        .g-pizza-hand {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: handPizza 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-pizza-slice-0 {
          animation: slice0Color 9s ease infinite;
        }
        .g-pizza-slice-1 {
          animation: slice1Color 9s ease infinite;
        }
        .g-pizza-slider-handle {
          animation: sliderDrag 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-pizza-4-slices {
          animation: pizzaDivisions 9s ease infinite;
        }
        .g-pizza-6-slices {
          animation: pizzaDivisionsAlt 9s ease infinite;
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
          Playground Guide &bull; Fractions Sandbox
        </div>
      </div>

      {/* Card Body */}
      <div className="hw-card-body" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px', alignItems: 'center', paddingBottom: '16px' }}>

        {/* Left Side: Less Words, Highly Visual Rules */}
        <div className="guide-brief-items">
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">1</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Choose Slices</div>
              <div className="guide-brief-desc">Drag the slider to cut the pizza into equal slices (1 to 12 slices).</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">2</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Select Slices</div>
              <div className="guide-brief-desc">Tap on any slice of the pizza to color it in and select it.</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">3</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">See the Fraction</div>
              <div className="guide-brief-desc">Watch the fraction values update dynamically at the bottom! 🍕</div>
            </div>
          </div>
        </div>

        {/* Right Side: Micro-Animation Visual Demo */}
        <div className="guide-sandbox-demo-box">
          <div className="guide-svg-scaler">
            <svg viewBox="0 0 300 165" style={{ overflow: 'visible' }}>
              {/* Outer Pizza Crust rings */}
              <circle cx="210" cy="65" r="41" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx="210" cy="65" r="39" fill="#d97706" opacity="0.85" />

              {/* 4 SLICES PIZZA GROUP */}
              <g className="g-pizza-4-slices">
                {/* Slice 0 (Top-right) */}
                <path d="M 210 65 L 210 30 A 35 35 0 0 1 245 65 Z" className="g-pizza-slice-0" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 1 (Bottom-right) */}
                <path d="M 210 65 L 245 65 A 35 35 0 0 1 210 100 Z" className="g-pizza-slice-1" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 2 (Bottom-left) */}
                <path d="M 210 65 L 210 100 A 35 35 0 0 1 175 65 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 3 (Top-left) */}
                <path d="M 210 65 L 175 65 A 35 35 0 0 1 210 30 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
              </g>

              {/* 6 SLICES PIZZA GROUP (active in second half) */}
              <g className="g-pizza-6-slices">
                {/* Slice 0 */}
                <path d="M 210 65 L 210 30 A 35 35 0 0 1 240.3 47.5 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 1 */}
                <path d="M 210 65 L 240.3 47.5 A 35 35 0 0 1 240.3 82.5 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 2 */}
                <path d="M 210 65 L 240.3 82.5 A 35 35 0 0 1 210 100 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 3 */}
                <path d="M 210 65 L 210 100 A 35 35 0 0 1 179.7 82.5 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 4 */}
                <path d="M 210 65 L 179.7 82.5 A 35 35 0 0 1 179.7 47.5 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                {/* Slice 5 */}
                <path d="M 210 65 L 179.7 47.5 A 35 35 0 0 1 210 30 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
              </g>

              {/* Center dot */}
              <circle cx="210" cy="65" r="3" fill="#78350f" />

              {/* Slider UI */}
              <rect x="150" y="112" width="120" height="22" rx="6" fill="rgba(0,0,0,0.03)" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="165" y1="123" x2="255" y2="123" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
              {/* Animated handle */}
              <circle className="g-pizza-slider-handle" cx="180" cy="123" r="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />

              {/* Mini fraction bubble indicator */}
              <rect x="35" y="55" width="90" height="30" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
              {/* Show fraction label inside */}
              <text x="80" y="74" textAnchor="middle" fill="var(--text)" fontWeight="900" fontSize="11" fontFamily="sans-serif">
                Fraction A
              </text>

              {/* Hand cursor */}
              <g className="g-pizza-hand">
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

export default MathFractionGuideStep;
