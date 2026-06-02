"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';
import { ComparingNumbersSandbox } from './ComparingNumbersSandbox';
import { FractionsSandbox } from './FractionsSandbox';
import { PythagorasSandbox } from './PythagorasSandbox';

interface MathRecapStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathRecapStep: React.FC<MathRecapStepProps> = ({
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

  const { content } = bundle;

  // Highlights Parser for Math Key Terms
  const parseHighlights = (rawText: string, colorClass = 'hl-yellow') => {
    if (!rawText) return '';
    let parsed = rawText;
    // Render markdown bold **text** to HTML strong tags
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    const mathTerms = [
      "Comparing Numbers", "Balance Scale", "Greater Than", "Less Than", "Equal To", "Equal",
      "fraction", "pizza", "denominator", "numerator", "simplifying",
      "Pythagorean Theorem", "hypotenuse", "right-angled triangle", "a² \\+ b² = c²"
    ];
    mathTerms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      parsed = parsed.replace(regex, match => `<span class="${colorClass}">${match}</span>`);
    });
    return parsed;
  };

  const renderSandbox = () => {
    switch (content.sandbox.type) {
      case 'balance-scale':
        return <ComparingNumbersSandbox />;
      case 'pizza-slicer':
        return <FractionsSandbox />;
      case 'pythagoras-proof':
        return <PythagorasSandbox />;
      default:
        return null;
    }
  };

  return (
    <div className="hw-card hw-card-recap math-recap-card-layout">
      {/* Card Header */}
      <div className="hw-card-header">
        <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
          {getTopicName(step)}
        </h3>
      <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          Interactive Simulation
        </div>
      </div>

      {/* Card Body */}
      <div className="hw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '8px' }}>
        {/* Sandbox Instruction Banner */}
        <div className="math-sandbox-instruction-banner" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p className="instruction-text" style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-dim)', margin: 0, fontWeight: 550 }}>
            {content.sandbox.caption}
          </p>
        </div>

        {/* Dynamic Math Sandbox */}
        <div className="recap-sandbox-section" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
          {renderSandbox()}
        </div>
      </div>

      {/* Card Footer */}
      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        <span className="footer-step-indicator">{stepProgressText}</span>
        <button className="nav-btn primary" onClick={onContinue}>
          Got it, Continue →
        </button>
      </div>
    </div>
  );
};
export default MathRecapStep;
