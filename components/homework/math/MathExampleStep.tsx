"use client";

import React from 'react';
import { HomeworkStep, getTopicName } from '../context';
import { getMathTopicBundle } from '../../../data/math';

interface MathExampleStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const MathExampleStep: React.FC<MathExampleStepProps> = ({
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

  const renderExampleContent = () => {
    switch (topicId) {
      case 'kg-comparing-numbers':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* The Problem */}
            <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1.2px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Worked Example Challenge
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b' }}>
                Compare the counts of weights: 9 and 4.
              </div>
            </div>

            {/* Steps Flow */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { stepNum: 1, title: 'Represent the Numbers', text: 'Load 9 weights on the left side of the scale, and 4 weights on the right side.' },
                { stepNum: 2, title: 'Observe the Scale', text: 'Notice that the left pan tilts downward because 9 is heavier than 4!' },
                { stepNum: 3, title: 'Determine the Relation', text: 'Since the left side is heavier, 9 is larger than 4.' },
                { stepNum: 4, title: 'Write the Math Symbol', text: 'We write: 9 > 4. The alligator mouth sign (>) opens wide toward the bigger number (9)!' }
              ].map((s) => (
                <div key={s.stepNum} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: 'var(--accent-glow)', 
                    color: 'var(--accent)', 
                    display: 'grid', 
                    placeItems: 'center', 
                    fontSize: '0.78rem', 
                    fontWeight: 900,
                    flexShrink: 0
                  }}>
                    {s.stepNum}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>{s.title}</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px', lineHeight: '1.4' }}>{s.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pro-Tip Box */}
            <div style={{ padding: '10px 14px', background: 'rgba(79, 70, 229, 0.05)', border: '1.2px dashed rgba(79, 70, 229, 0.2)', borderRadius: '10px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 Pro-Tip
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px', lineHeight: '1.45' }}>
                When writing comparisons: the pointed small end of the symbol <strong>&lt;</strong> or <strong>&gt;</strong> always points at the smaller number, and the wide mouth always opens to the larger number!
              </div>
            </div>
          </div>
        );

      case 'g3-intro-fractions':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* The Problem */}
            <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1.2px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Worked Example Challenge
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b' }}>
                If you cut a pizza into 4 equal slices and eat 3, what fraction did you eat?
              </div>
            </div>

            {/* Steps Flow */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { stepNum: 1, title: 'Count the Total Slices (Denominator)', text: 'The whole pizza is divided into 4 equal slices. The total count goes on the bottom (Denominator = 4).' },
                { stepNum: 2, title: 'Count Selected Slices (Numerator)', text: 'You ate 3 of those slices. This count of parts selected goes on the top (Numerator = 3).' },
                { stepNum: 3, title: 'Write the Fraction', text: 'Combine them! The numerator over the denominator gives us: 3/4.' },
                { stepNum: 4, title: 'Read the Fraction Name', text: 'This is read as "three quarters" or "three-fourths".' }
              ].map((s) => (
                <div key={s.stepNum} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: 'rgba(13, 148, 136, 0.08)', 
                    color: '#0d9488', 
                    display: 'grid', 
                    placeItems: 'center', 
                    fontSize: '0.78rem', 
                    fontWeight: 900,
                    flexShrink: 0
                  }}>
                    {s.stepNum}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>{s.title}</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px', lineHeight: '1.4' }}>{s.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pro-Tip Box */}
            <div style={{ padding: '10px 14px', background: 'rgba(13, 148, 136, 0.04)', border: '1.2px dashed rgba(13, 148, 136, 0.2)', borderRadius: '10px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0d9488', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 Pro-Tip
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px', lineHeight: '1.45' }}>
                Always remember: the <strong>Denominator</strong> is Down (total slices), and the <strong>Numerator</strong> is on top (number of slices selected)!
              </div>
            </div>
          </div>
        );

      case 'g7-pythagoras':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* The Problem */}
            <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1.2px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Worked Example Challenge
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b' }}>
                Find the hypotenuse c of a right triangle with other sides a = 3 and b = 4.
              </div>
            </div>

            {/* Steps Flow */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { stepNum: 1, title: 'Recall the Pythagorean Formula', text: 'Write down the equation: a² + b² = c².' },
                { stepNum: 2, title: 'Square the Shorter Sides', text: 'Calculate the square of each leg: a² = 3² = 9, and b² = 4² = 16.' },
                { stepNum: 3, title: 'Add the Square Areas', text: 'Add the two areas together: 9 + 16 = 25. Thus c² = 25.' },
                { stepNum: 4, title: 'Take the Square Root', text: 'Find the square root of 25: c = √25 = 5. So the hypotenuse length c is 5!' }
              ].map((s) => (
                <div key={s.stepNum} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: 'rgba(99, 102, 241, 0.08)', 
                    color: '#6366f1', 
                    display: 'grid', 
                    placeItems: 'center', 
                    fontSize: '0.78rem', 
                    fontWeight: 900,
                    flexShrink: 0
                  }}>
                    {s.stepNum}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>{s.title}</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px', lineHeight: '1.4' }}>{s.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pro-Tip Box */}
            <div style={{ padding: '10px 14px', background: 'rgba(99, 102, 241, 0.04)', border: '1.2px dashed rgba(99, 102, 241, 0.2)', borderRadius: '10px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 Pro-Tip
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px', lineHeight: '1.45' }}>
                The side length c (hypotenuse) is always the <strong>longest side</strong> of a right triangle, and it is always positioned directly opposite the 90° right angle!
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="hw-card hw-card-recap math-recap-card-layout math-example-card">
      {/* Card Header */}
      <div className="hw-card-header">
        <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
          {getTopicName(step)}
        </h3>
        <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          <span>📖</span> Worked Example
        </div>
      </div>

      {/* Card Body */}
      <div className="hw-card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
        {renderExampleContent()}
      </div>

      {/* Card Footer */}
      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        <span className="footer-step-indicator">{stepProgressText}</span>
        <button className="nav-btn primary" onClick={onContinue}>
          Got it ✓
        </button>
      </div>
    </div>
  );
};

export default MathExampleStep;
