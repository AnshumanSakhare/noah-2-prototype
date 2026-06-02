"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';

interface MathConceptStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathConceptStep: React.FC<MathConceptStepProps> = ({
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

  // Render a gorgeous key takeaway widget based on topic
  const renderTakeaway = () => {
    switch (content.sandbox.type) {
      case 'balance-scale':
        return (
          <div className="math-concept-takeaway balance-takeaway">
            <div className="takeaway-badge">CONCEPT DETAILS</div>
            <div className="takeaway-grid">
              <div className="takeaway-item greater">
                <span className="symbol">&gt;</span>
                <span className="label">Greater Than</span>
                <span className="example">8 &gt; 4</span>
              </div>
              <div className="takeaway-item less">
                <span className="symbol">&lt;</span>
                <span className="label">Less Than</span>
                <span className="example">3 &lt; 7</span>
              </div>
              <div className="takeaway-item equal">
                <span className="symbol">=</span>
                <span className="label">Equal To</span>
                <span className="example">5 = 5</span>
              </div>
            </div>
            <p className="takeaway-tip"><em>Tip: The alligator mouth comparison sign always points its open side to the larger value.</em></p>
          </div>
        );
      case 'pizza-slicer':
        return (
          <div className="math-concept-takeaway fraction-takeaway">
            <div className="takeaway-badge">FRACTION STRUCTURE</div>
            <div className="fraction-anatomy-display">
              <div className="anatomy-part numerator-part">
                <span className="val">3</span>
                <span className="line"></span>
                <span className="label"><strong>Numerator</strong> (parts selected)</span>
              </div>
              <div className="fraction-bar-symbol">/</div>
              <div className="anatomy-part denominator-part">
                <span className="val">8</span>
                <span className="label"><strong>Denominator</strong> (total equal slices)</span>
              </div>
            </div>
            <p className="takeaway-tip"><em>Tip: Remember that the Denominator represents the Down (total) division blocks.</em></p>
          </div>
        );
      case 'pythagoras-proof':
        return (
          <div className="math-concept-takeaway pythagoras-takeaway">
            <div className="takeaway-badge">FORMULA BRIEF</div>
            <div className="pythagoras-formula-display">
              <div className="formula-box">
                <span className="term">a²</span>
                <span className="operator">+</span>
                <span className="term">b²</span>
                <span className="operator">=</span>
                <span className="term">c²</span>
              </div>
            </div>
            <div className="pythagoras-labels">
              <p>• <b>a</b> and <b>b</b> represent the lengths of the two shorter sides (legs).</p>
              <p>• <b>c</b> represents the longest side (hypotenuse) opposite the 90° right angle.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="hw-card hw-card-recap math-recap-card-layout math-concept-card">
      {/* Card Header */}
      <div className="hw-card-header">
        <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
          {getTopicName(step)}
        </h3>
        <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          {content.recap.sub}
        </div>
      </div>

      {/* Card Body */}
      <div className="hw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
        <div className="recap-content-section" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px' }}>
          <p
            className="recap-paragraph-text"
            style={{ fontSize: '0.96rem', lineHeight: '1.7', color: 'var(--text-dim)', margin: 0, fontWeight: 550 }}
            dangerouslySetInnerHTML={{ __html: parseHighlights(content.recap.text) }}
          />
        </div>

        {/* Dynamic Takeaway Display */}
        <div className="concept-takeaway-section">
          {renderTakeaway()}
        </div>
      </div>

      {/* Card Footer */}
      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        <span className="footer-step-indicator">{stepProgressText}</span>
        <button className="nav-btn primary" onClick={onContinue}>
          Start Practice →
        </button>
      </div>
    </div>
  );
};
export default MathConceptStep;
