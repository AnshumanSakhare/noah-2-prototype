"use client";

import React, { useState, useEffect } from 'react';

export const ComparingNumbersSandbox: React.FC = () => {
  // State for weights currently on the left and right pans
  const [leftWeights, setLeftWeights] = useState<number[]>([]);
  const [rightWeights, setRightWeights] = useState<number[]>([]);
  
  // State for active clicked weight at the bottom (for click-to-drop fallback)
  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);

  // Dragging states
  const [draggedWeight, setDraggedWeight] = useState<number | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<'left' | 'right' | null>(null);

  // Animation and physics simulation angles
  const [tiltAngle, setTiltAngle] = useState<number>(0);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [noTransition, setNoTransition] = useState<boolean>(false);

  const leftSum = leftWeights.reduce((a, b) => a + b, 0);
  const rightSum = rightWeights.reduce((a, b) => a + b, 0);
  const isBalanced = leftSum === rightSum && leftSum > 0;

  // React to weight changes to recalculate scale tilt angle smoothly
  useEffect(() => {
    if (leftSum > 0 || rightSum > 0) {
      // Invert diff (rightSum - leftSum) so that the heavier side correctly tilts DOWN
      const diff = rightSum - leftSum;
      // Tilt angle: each 1 unit diff tilts by 3 degrees, capped at 15 degrees
      const targetAngle = Math.max(-15, Math.min(15, diff * 3));
      setTiltAngle(targetAngle);
      setShowResult(true);
    } else {
      setTiltAngle(0);
      setShowResult(false);
    }
  }, [leftSum, rightSum]);

  // Add weight to left/right pans
  const addWeightToSide = (side: 'left' | 'right', weight: number) => {
    // Limit to max 5 weights per side to prevent visual clutter
    if (side === 'left') {
      if (leftWeights.length >= 5) return;
      setLeftWeights(prev => [...prev, weight]);
    } else {
      if (rightWeights.length >= 5) return;
      setRightWeights(prev => [...prev, weight]);
    }
    setSelectedWeight(null); // Clear selected weight on drop
  };

  // Remove a weight from a pan by index
  const removeWeightFromSide = (side: 'left' | 'right', index: number) => {
    if (side === 'left') {
      setLeftWeights(prev => prev.filter((_, idx) => idx !== index));
    } else {
      setRightWeights(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleReset = () => {
    setNoTransition(true);
    setLeftWeights([]);
    setRightWeights([]);
    setTiltAngle(0);
    setShowResult(false);
    setSelectedWeight(null);
    setTimeout(() => setNoTransition(false), 50);
  };

  // Drag and drop handlers
  const handleDragStart = (weight: number) => {
    setDraggedWeight(weight);
  };

  const handleDragOver = (e: React.DragEvent, side: 'left' | 'right') => {
    e.preventDefault();
    setActiveDropZone(side);
  };

  const handleDrop = (e: React.DragEvent, side: 'left' | 'right') => {
    e.preventDefault();
    const weight = draggedWeight;
    if (weight !== null) {
      addWeightToSide(side, weight);
    }
    setDraggedWeight(null);
    setActiveDropZone(null);
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  // Click handler for pan drop (alternate way of dropping)
  const handlePanClick = (side: 'left' | 'right') => {
    if (selectedWeight !== null) {
      addWeightToSide(side, selectedWeight);
    }
  };

  // Coordinate calculations for the scale physics based on tiltAngle
  const angleRad = (tiltAngle * Math.PI) / 180;
  const beamLength = 95;
  const pivotX = 150;
  const pivotY = 72;

  const leftPanX = pivotX - beamLength * Math.cos(angleRad);
  const leftPanY = pivotY - beamLength * Math.sin(angleRad);
  const rightPanX = pivotX + beamLength * Math.cos(angleRad);
  const rightPanY = pivotY + beamLength * Math.sin(angleRad);

  const getRelationSymbol = () => {
    if (leftSum === rightSum) return '=';
    if (leftSum > rightSum) return '>';
    return '<';
  };

  const transitionCss = noTransition ? 'none' : 'all 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)';

  return (
    <div className="math-sandbox-balance" style={{ width: '100%' }}>
      <div className="sandbox-canvas-wrapper" style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '16px', border: '1.2px solid #e2e8f0' }}>
        
        {/* Dynamic Goal Message Banner */}
        <div style={{
          background: isBalanced ? 'rgba(79, 70, 229, 0.06)' : '#ffffff',
          border: `1.2px solid ${isBalanced ? 'rgba(79, 70, 229, 0.2)' : '#e2e8f0'}`,
          borderRadius: '10px',
          padding: '8px 12px',
          fontSize: '0.82rem',
          fontWeight: 650,
          color: isBalanced ? 'var(--accent)' : '#64748b',
          textAlign: 'center',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isBalanced ? (
            <span>Scale is balanced: {leftSum} = {rightSum}</span>
          ) : leftSum === 0 && rightSum === 0 ? (
            <span>Load weights onto either side to balance the scale</span>
          ) : (
            <span>Left side: {leftSum} | Right side: {rightSum}</span>
          )}
        </div>

        <div className="math-balance-visualizer" style={{ position: 'relative', overflow: 'visible', padding: '5px 0' }}>
          <svg viewBox="0 0 300 185" className="balance-scale-svg" style={{ overflow: 'visible' }}>
            {/* Stand */}
            <line x1={pivotX} y1={pivotY} x2={pivotX} y2="155" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M110,155 L190,155 L180,172 L120,172 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />

            {/* Rotating Beam */}
            <line
              x1={leftPanX} y1={leftPanY}
              x2={rightPanX} y2={rightPanY}
              stroke="#475569" strokeWidth="5" strokeLinecap="round"
              style={{ transition: transitionCss }}
            />
            <circle cx={pivotX} cy={pivotY} r="6.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* LEFT PAN DROP TARGET ZONE (invisible but active drop area) */}
            <circle 
              cx={leftPanX} 
              cy={leftPanY + 25} 
              r="34" 
              fill={activeDropZone === 'left' ? 'rgba(79, 70, 229, 0.08)' : 'transparent'} 
              stroke={activeDropZone === 'left' ? 'var(--accent)' : 'transparent'} 
              strokeWidth="1.5" 
              strokeDasharray="3 3"
              style={{ cursor: selectedWeight !== null ? 'pointer' : 'default', transition: 'all 0.2s' }}
              onDragOver={(e) => handleDragOver(e, 'left')}
              onDrop={(e) => handleDrop(e, 'left')}
              onDragLeave={handleDragLeave}
              onClick={() => handlePanClick('left')}
            />

            {/* Left Pan Chains */}
            <line x1={leftPanX} y1={leftPanY} x2={leftPanX - 20} y2={leftPanY + 36} stroke="#94a3b8" strokeWidth="1.5" style={{ transition: transitionCss }} />
            <line x1={leftPanX} y1={leftPanY} x2={leftPanX + 20} y2={leftPanY + 36} stroke="#94a3b8" strokeWidth="1.5" style={{ transition: transitionCss }} />
            
            {/* Left Pan Plate */}
            <path
              d={`M ${leftPanX - 26} ${leftPanY + 36} Q ${leftPanX} ${leftPanY + 45} ${leftPanX + 26} ${leftPanY + 36} Z`}
              fill={activeDropZone === 'left' ? 'rgba(79, 70, 229, 0.15)' : '#e2e8f0'} 
              stroke={activeDropZone === 'left' ? 'var(--accent)' : '#94a3b8'} 
              strokeWidth="1.8"
              style={{ transition: transitionCss }}
            />

            {/* RIGHT PAN DROP TARGET ZONE */}
            <circle 
              cx={rightPanX} 
              cy={rightPanY + 25} 
              r="34" 
              fill={activeDropZone === 'right' ? 'rgba(79, 70, 229, 0.08)' : 'transparent'} 
              stroke={activeDropZone === 'right' ? 'var(--accent)' : 'transparent'} 
              strokeWidth="1.5" 
              strokeDasharray="3 3"
              style={{ cursor: selectedWeight !== null ? 'pointer' : 'default', transition: 'all 0.2s' }}
              onDragOver={(e) => handleDragOver(e, 'right')}
              onDrop={(e) => handleDrop(e, 'right')}
              onDragLeave={handleDragLeave}
              onClick={() => handlePanClick('right')}
            />

            {/* Right Pan Chains */}
            <line x1={rightPanX} y1={rightPanY} x2={rightPanX - 20} y2={rightPanY + 36} stroke="#94a3b8" strokeWidth="1.5" style={{ transition: transitionCss }} />
            <line x1={rightPanX} y1={rightPanY} x2={rightPanX + 20} y2={rightPanY + 36} stroke="#94a3b8" strokeWidth="1.5" style={{ transition: transitionCss }} />
            
            {/* Right Pan Plate */}
            <path
              d={`M ${rightPanX - 26} ${rightPanY + 36} Q ${rightPanX} ${rightPanY + 45} ${rightPanX + 26} ${rightPanY + 36} Z`}
              fill={activeDropZone === 'right' ? 'rgba(79, 70, 229, 0.15)' : '#e2e8f0'} 
              stroke={activeDropZone === 'right' ? 'var(--accent)' : '#94a3b8'} 
              strokeWidth="1.8"
              style={{ transition: transitionCss }}
            />

            {/* RENDER PLACED WEIGHTS IN LEFT PAN */}
            {leftWeights.map((w, idx) => {
              const xOffset = (idx - (leftWeights.length - 1) / 2) * 11;
              const yOffset = 31; // sitting inside pan
              return (
                <g 
                  key={`left-weight-${idx}`} 
                  style={{ 
                    transform: `translate(${leftPanX + xOffset}px, ${leftPanY + yOffset}px)`, 
                    transition: transitionCss,
                    cursor: 'pointer' 
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWeightFromSide('left', idx);
                  }}
                >
                  <title>Click to remove</title>
                  {/* Clean standard slate weight blocks */}
                  <rect x="-5" y="-9" width="10" height="9" rx="1.5" fill="var(--accent)" stroke="#312e81" strokeWidth="1.2" />
                  <text x="0" y="-2" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="6.5" fontFamily="monospace">{w}</text>
                </g>
              );
            })}

            {/* RENDER PLACED WEIGHTS IN RIGHT PAN */}
            {rightWeights.map((w, idx) => {
              const xOffset = (idx - (rightWeights.length - 1) / 2) * 11;
              const yOffset = 31;
              return (
                <g 
                  key={`right-weight-${idx}`} 
                  style={{ 
                    transform: `translate(${rightPanX + xOffset}px, ${rightPanY + yOffset}px)`, 
                    transition: transitionCss,
                    cursor: 'pointer' 
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWeightFromSide('right', idx);
                  }}
                >
                  <title>Click to remove</title>
                  <rect x="-5" y="-9" width="10" height="9" rx="1.5" fill="#64748b" stroke="#334155" strokeWidth="1.2" />
                  <text x="0" y="-2" textAnchor="middle" fill="#ffffff" fontWeight="800" fontSize="6.5" fontFamily="monospace">{w}</text>
                </g>
              );
            })}
          </svg>

          {/* Relation Badge in Center */}
          {showResult && (
            <div className={`math-balance-badge show animate-pop`} style={{
              position: 'absolute',
              top: '52%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid var(--accent)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontSize: '1.25rem',
              fontWeight: 900,
              zIndex: 10
            }}>
              {getRelationSymbol()}
            </div>
          )}
        </div>

        {/* Informative Weight Counters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginBottom: '8px' }}>
          <div style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>
            Left Total: <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{leftSum}</span>
          </div>
          {selectedWeight !== null && (
            <div style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600, animation: 'pulseSlow 1.5s infinite' }}>
              Select a plate to drop weight ({selectedWeight})
            </div>
          )}
          <div style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>
            Right Total: <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{rightSum}</span>
          </div>
        </div>

        {/* Weights Selection Rack + Reset */}
        <div className="math-sandbox-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', width: '70px', flexShrink: 0 }}>
            Weight Bin:
          </div>
          
          <div className="math-balance-grid" style={{ flex: 1, overflow: 'visible' }}>
            <div className="numbers-row" style={{ display: 'flex', gap: '8px', justifyContent: 'center', overflow: 'visible' }}>
              {[1, 2, 3, 5, 10].map((num) => {
                const isSelected = selectedWeight === num;
                return (
                  <div
                    key={num}
                    draggable="true"
                    onDragStart={() => handleDragStart(num)}
                    onDragEnd={() => { setDraggedWeight(null); setActiveDropZone(null); }}
                    onClick={() => setSelectedWeight(isSelected ? null : num)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--accent)' : '#f1f5f9',
                      border: `1.2px solid ${isSelected ? 'var(--accent)' : '#cbd5e1'}`,
                      boxShadow: isSelected ? '0 2px 6px rgba(79, 70, 229, 0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'all 0.15s',
                    }}
                    title="Drag me onto a plate, or tap me then tap a plate!"
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isSelected ? '#ffffff' : '#475569', fontFamily: 'monospace' }}>
                      {num}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="sandbox-reset-btn"
            onClick={handleReset}
            disabled={leftWeights.length === 0 && rightWeights.length === 0}
            style={{
              padding: '6px 12px',
              background: '#f1f5f9',
              border: '1.2px solid #cbd5e1',
              color: leftWeights.length === 0 && rightWeights.length === 0 ? '#94a3b8' : '#475569',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 650,
              cursor: leftWeights.length === 0 && rightWeights.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Reset
          </button>
        </div>

        {/* Tip text */}
        <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>
          <em>Draggable on Desktop. On touch devices, select a weight above, then select a pan to drop it.</em>
        </div>

      </div>
    </div>
  );
};
export default ComparingNumbersSandbox;
