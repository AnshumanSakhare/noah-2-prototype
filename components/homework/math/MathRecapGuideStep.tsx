"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';

interface MathRecapGuideStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathRecapGuideStep: React.FC<MathRecapGuideStepProps> = ({
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

        /* SVG Scale Animation Keys */
        @keyframes beamTilt {
          0%, 15%   { transform: rotate(0deg); }
          23%, 45%  { transform: rotate(-8deg); } /* Tilt left (5 weight drops) */
          55%, 85%  { transform: rotate(8deg); }  /* Tilt right (10 weight drops) */
          93%, 100% { transform: rotate(0deg); }
        }

        @keyframes leftPanTranslate {
          0%, 15%   { transform: translate(0, 0); }
          23%, 45%  { transform: translate(-0.8px, 11.1px); } /* Tilt left: left pan moves DOWN */
          55%, 85%  { transform: translate(-0.8px, -11.1px); } /* Tilt right: left pan moves UP */
          93%, 100% { transform: translate(0, 0); }
        }

        @keyframes rightPanTranslate {
          0%, 15%   { transform: translate(0, 0); }
          23%, 45%  { transform: translate(-0.8px, -11.1px); } /* Tilt left: right pan moves UP */
          55%, 85%  { transform: translate(-0.8px, 11.1px); }  /* Tilt right: right pan moves DOWN */
          93%, 100% { transform: translate(0, 0); }
        }

        /*
          Weight coordinates: rect is x=-4.5, y=-8, h=8 → bottom edge of rect = y+0 = group origin y.
          Pan surfaces:   left pan at y=86 → drop group at y=86 (weight bottom sits on pan rim)
                          right pan at y=86 → drop group at y=86
          Tilted left:    left pan y= 86+11.1=97.1, right pan y= 86-11.1=74.9
          Tilted right:   left pan y= 86-11.1=74.9, right pan y= 86+11.1=97.1
          Bin slot A (5): cx=190, cy=142 → group at x=190, y=142 (center of slot circle)
          Bin slot B(10): cx=230, cy=142 → group at x=230, y=142
        */

        /* Weight A (Value 5) */
        @keyframes weightADrag {
          0%, 5%    { transform: translate(190px, 142px); opacity: 0; }
          7%        { transform: translate(190px, 142px); opacity: 1; }
          15%, 17%  { transform: translate(70px, 86px); opacity: 1; }   /* arriving at left pan */
          23%, 45%  { transform: translate(69.2px, 97.1px); opacity: 1; } /* tilted left: pan down */
          55%, 85%  { transform: translate(69.2px, 74.9px); opacity: 1; } /* tilted right: pan up */
          91%, 100% { transform: translate(190px, 142px); opacity: 0; }
        }

        /* Weight B (Value 10) */
        @keyframes weightBDrag {
          0%, 35%   { transform: translate(230px, 142px); opacity: 0; }
          37%       { transform: translate(230px, 142px); opacity: 1; }
          45%       { transform: translate(229.2px, 86px); opacity: 1; }  /* arriving at right pan */
          55%, 85%  { transform: translate(229.2px, 97.1px); opacity: 1; } /* tilted right: pan down */
          91%, 100% { transform: translate(230px, 142px); opacity: 0; }
        }

        /* Hand Cursor */
        @keyframes handDrag {
          0%, 4%    { transform: translate(150px, 150px); opacity: 0; }
          5%        { transform: translate(190px, 142px); opacity: 1; }
          15%       { transform: translate(70px, 86px); opacity: 1; }
          18%       { transform: translate(70px, 86px); opacity: 0; }
          19%, 33%  { transform: translate(150px, 150px); opacity: 0; }
          37%       { transform: translate(230px, 142px); opacity: 1; }
          45%       { transform: translate(229.2px, 86px); opacity: 1; }
          48%       { transform: translate(229.2px, 86px); opacity: 0; }
          49%, 100% { transform: translate(150px, 150px); opacity: 0; }
        }

        /* SVG-native sign badge animations */
        @keyframes signScaleIn {
          0%, 18%   { transform: scale(0); opacity: 0; }
          22%, 45%  { transform: scale(1); opacity: 1; }
          48%       { transform: scale(0); opacity: 0; }
          55%, 85%  { transform: scale(1); opacity: 1; }
          90%, 100% { transform: scale(0); opacity: 0; }
        }
        @keyframes signTextSwap {
          0%, 45%   { opacity: 1; }  /* '>' visible */
          46%, 100% { opacity: 0; }  /* '>' hidden when '<' phase starts */
        }
        @keyframes signTextSwapAlt {
          0%, 45%   { opacity: 0; }  /* '<' hidden */
          46%, 85%  { opacity: 1; }  /* '<' visible */
          90%, 100% { opacity: 0; }
        }
        .g-sign-badge-svg {
          transform-origin: 150px 56px;
          transform-box: view-box;
          animation: signScaleIn 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-sign-gt { animation: signTextSwapAlt 8s steps(1) infinite; }
        .g-sign-lt { animation: signTextSwap 8s steps(1) infinite; }

        /* Classes mapped to SVG elements */
        .g-scale-beam {
          transform-origin: 150px 56px;
          transform-box: view-box;
          animation: beamTilt 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-left-assembly {
          transform-origin: 70px 56px;
          transform-box: view-box;
          animation: leftPanTranslate 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-right-assembly {
          transform-origin: 230px 56px;
          transform-box: view-box;
          animation: rightPanTranslate 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-weight-a {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: weightADrag 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-weight-b {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: weightBDrag 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .g-hand-cursor {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation: handDrag 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
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
              <div className="guide-brief-title">Drop Weights</div>
              <div className="guide-brief-desc">Drag numbers from the bottom rack onto left or right plates.</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">2</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Compare Values</div>
              <div className="guide-brief-desc">Watch the scale tilt down toward the heavier side.</div>
            </div>
          </div>
          <div className="guide-brief-row">
            <div className="guide-brief-bullet">3</div>
            <div className="guide-brief-body">
              <div className="guide-brief-title">Find Balance</div>
              <div className="guide-brief-desc">Try to add equal weights on both sides to balance it!</div>
            </div>
          </div>
        </div>

        {/* Right Side: Micro-Animation Visual Demo */}
        <div className="guide-sandbox-demo-box">
          {/* Fixed 300×165-px scaler ensures 1 CSS px = 1 SVG user unit → correct weight positions */}
          <div className="guide-svg-scaler">
            <svg viewBox="0 0 300 165" style={{ overflow: 'visible' }}>
              {/* Stand */}
              <line x1="150" y1="56" x2="150" y2="115" stroke="#94a3b8" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M120,115 L180,115 L175,124 L125,124 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />

              {/* Rotating Beam */}
              <line className="g-scale-beam" x1="70" y1="56" x2="230" y2="56" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
              <circle cx="150" cy="56" r="5" fill="#1e293b" />

              {/* LEFT PAN ASSEMBLY */}
              <g className="g-left-assembly">
                <line x1="70" y1="56" x2="52" y2="86" stroke="#cbd5e1" strokeWidth="1.2" />
                <line x1="70" y1="56" x2="88" y2="86" stroke="#cbd5e1" strokeWidth="1.2" />
                <path d="M 47 86 Q 70 94 93 86 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
              </g>

              {/* RIGHT PAN ASSEMBLY */}
              <g className="g-right-assembly">
                <line x1="230" y1="56" x2="212" y2="86" stroke="#cbd5e1" strokeWidth="1.2" />
                <line x1="230" y1="56" x2="248" y2="86" stroke="#cbd5e1" strokeWidth="1.2" />
                <path d="M 207 86 Q 230 94 253 86 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
              </g>

              {/* ANIMATED WEIGHTS — root level so CSS px ↔ SVG units map 1:1 */}
              {/* Weight rect: x=-4.5 y=-8 h=8 → bottom edge at group-origin y → sits on pan at y=86 */}
              <g className="g-weight-a">
                <rect x="-4.5" y="-8" width="9" height="8" rx="1" fill="var(--accent)" stroke="#312e81" strokeWidth="1" />
                <text x="0" y="-2" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="5.5" fontFamily="monospace">5</text>
              </g>
              <g className="g-weight-b">
                <rect x="-4.5" y="-8" width="9" height="8" rx="1" fill="#64748b" stroke="#334155" strokeWidth="1" />
                <text x="0" y="-2" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="5.5" fontFamily="monospace">10</text>
              </g>

              {/* Comparison sign badge — inside SVG so it scales with coordinate space */}
              <g className="g-sign-badge-svg">
                <circle cx="150" cy="56" r="14" fill="#ffffff" stroke="var(--accent)" strokeWidth="1.8" />
                {/* Two overlapping text elements: one shows '>', one shows '<'; toggled by opacity animation */}
                <text className="g-sign-gt" x="150" y="61" textAnchor="middle" fill="var(--accent)" fontWeight="900" fontSize="13" fontFamily="sans-serif">&gt;</text>
                <text className="g-sign-lt" x="150" y="61" textAnchor="middle" fill="var(--accent)" fontWeight="900" fontSize="13" fontFamily="sans-serif">&lt;</text>
              </g>

              {/* BOTTOM WEIGHTS BIN */}
              <rect x="50" y="132" width="200" height="22" rx="6" fill="rgba(0,0,0,0.03)" stroke="#e2e8f0" strokeWidth="1" />
              {[70, 110, 150, 190, 230].map((cx) => (
                <circle key={cx} cx={cx} cy="143" r="8" fill="rgba(255,255,255,0.8)" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
              ))}
              <text x="70" y="147" textAnchor="middle" fill="#94a3b8" fontWeight="800" fontSize="8" fontFamily="monospace">1</text>
              <text x="110" y="147" textAnchor="middle" fill="#94a3b8" fontWeight="800" fontSize="8" fontFamily="monospace">2</text>
              <text x="150" y="147" textAnchor="middle" fill="#94a3b8" fontWeight="800" fontSize="8" fontFamily="monospace">3</text>
              <text x="190" y="147" textAnchor="middle" fill="#4f46e5" fontWeight="800" fontSize="8" fontFamily="monospace">5</text>
              <text x="230" y="147" textAnchor="middle" fill="#64748b" fontWeight="800" fontSize="8" fontFamily="monospace">10</text>

              {/* HAND CURSOR */}
              <g className="g-hand-cursor">
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

export default MathRecapGuideStep;
