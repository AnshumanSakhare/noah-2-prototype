"use client";

import React, { useState, useEffect, useMemo } from 'react';

export const FractionsSandbox: React.FC = () => {
  const [denom, setDenom] = useState<number>(4);
  const [activeSlices, setActiveSlices] = useState<Set<number>>(new Set([0, 1]));
  const [showEquiv, setShowEquiv] = useState<boolean>(false);
  const [equivDenom, setEquivDenom] = useState<number>(8);
  const [equivActive, setEquivActive] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  useEffect(() => {
    setActiveSlices(prev => { const next = new Set<number>(); prev.forEach(v => { if (v < denom) next.add(v); }); return next; });
  }, [denom]);

  useEffect(() => {
    setEquivActive(prev => { const next = new Set<number>(); prev.forEach(v => { if (v < equivDenom) next.add(v); }); return next; });
  }, [equivDenom]);

  const toggleSlice = (idx: number, isEquiv = false) => {
    const setter = isEquiv ? setEquivActive : setActiveSlices;
    setter(prev => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; });
  };

  const selectAll = (isEquiv = false) => {
    const total = isEquiv ? equivDenom : denom;
    const next = new Set<number>(); for (let i = 0; i < total; i++) next.add(i);
    isEquiv ? setEquivActive(next) : setActiveSlices(next);
  };

  const selectNone = (isEquiv = false) => {
    isEquiv ? setEquivActive(new Set()) : setActiveSlices(new Set());
  };

  const getSlicePath = (cx: number, cy: number, r: number, index: number, total: number) => {
    if (total === 1) return "";
    const angleSize = (2 * Math.PI) / total;
    const startAngle = index * angleSize - Math.PI / 2;
    const endAngle = (index + 1) * angleSize - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };

  const val1 = denom > 0 ? activeSlices.size / denom : 0;
  const val2 = equivDenom > 0 ? equivActive.size / equivDenom : 0;

  const isEquivalent = useMemo(() => {
    if (!showEquiv) return false;
    if (activeSlices.size === 0 && equivActive.size === 0) return false;
    return Math.abs(val1 - val2) < 0.0001;
  }, [showEquiv, val1, val2, activeSlices.size, equivActive.size]);

  const getDenomLabel = (d: number) => {
    const labels: Record<number, string> = { 1: 'Whole', 2: 'Halves', 3: 'Thirds', 4: 'Quarters', 6: 'Sixths', 8: 'Eighths', 12: 'Twelfths' };
    return labels[d] || `${d}ths`;
  };

  const renderPizza = (cx: number, cy: number, r: number, total: number, active: Set<number>, isEquiv = false) => {
    const pizzaColor = isEquiv ? '#f43f5e' : '#f59e0b';
    const pizzaBg = isEquiv ? '#ffe4e6' : '#fef3c7';
    const pizzaBorder = isEquiv ? '#be123c' : '#d97706';

    const slices = [];
    if (total === 1) {
      slices.push(
        <circle key={0} cx={cx} cy={cy} r={r} className="pizza-slice-interactive"
          fill={active.has(0) ? pizzaColor : pizzaBg} stroke={pizzaBorder} strokeWidth="2"
          onClick={() => toggleSlice(0, isEquiv)} />
      );
    } else {
      for (let i = 0; i < total; i++) {
        const isActive = active.has(i);
        slices.push(
          <path key={i} d={getSlicePath(cx, cy, r, i, total)}
            className={`pizza-slice-interactive ${isActive ? 'active' : ''}`}
            fill={isActive ? pizzaColor : pizzaBg} stroke={pizzaBorder} strokeWidth="1.5"
            onClick={() => toggleSlice(i, isEquiv)} />
        );
      }
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={r + 4} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={r + 2} fill="#d97706" opacity="0.85" />
        {slices}
        <circle cx={cx} cy={cy} r="3" fill="#78350f" />
      </g>
    );
  };

  return (
    <div className="math-sandbox-pizza">
      <div className="sandbox-canvas-wrapper">
        <div className="sandbox-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🍕 Pizza Slicer</span>
          <button className="equiv-toggle-btn" onClick={() => setShowEquiv(prev => !prev)}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>
              {showEquiv ? '✅' : '○'} Equivalent
            </span>
          </button>
        </div>

        {/* Pizza Visual */}
        <div className="pizzas-visual-container">
          <svg viewBox={showEquiv ? "0 0 320 150" : "0 0 320 160"} className="pizza-svg-canvas">
            {!showEquiv ? (
              renderPizza(160, 80, 65, denom, activeSlices, false)
            ) : (
              <>
                {renderPizza(80, 75, 50, denom, activeSlices, false)}
                {renderPizza(240, 75, 50, equivDenom, equivActive, true)}
                <g transform="translate(148, 66)" opacity={activeSlices.size > 0 || equivActive.size > 0 ? "1" : "0.3"}>
                  <rect x="0" y="0" width="24" height="6" rx="2" fill={isEquivalent ? "#10b981" : "#94a3b8"} />
                  <rect x="0" y="10" width="24" height="6" rx="2" fill={isEquivalent ? "#10b981" : "#94a3b8"} />
                </g>
              </>
            )}
          </svg>
        </div>

        {/* Controls */}
        <div className="pizza-sliders-grid" style={{ display: 'grid', gridTemplateColumns: showEquiv ? '1fr 1fr' : '1fr', gap: '12px' }}>
          {/* Pizza A */}
          <div className="pizza-ctrl-panel">
            <div className="ctrl-header">
              <span className="pizza-label yellow">A: <strong>{activeSlices.size}/{denom}</strong></span>
              <span className="pizza-percentage">{Math.round(val1 * 100)}%</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <button className="small-action-btn" onClick={() => selectAll(false)}>All</button>
              <button className="small-action-btn" onClick={() => selectNone(false)}>Clear</button>
            </div>
            <input type="range" min="1" max="12" step="1" value={denom}
              onChange={(e) => setDenom(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b' }} />
            <div className="denom-range-labels"><span>1</span><span>{getDenomLabel(denom)}</span><span>12</span></div>
          </div>

          {/* Pizza B (equivalent mode) */}
          {showEquiv && (
            <div className="pizza-ctrl-panel border-rose">
              <div className="ctrl-header">
                <span className="pizza-label rose">B: <strong>{equivActive.size}/{equivDenom}</strong></span>
                <span className="pizza-percentage">{Math.round(val2 * 100)}%</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <button className="small-action-btn rose" onClick={() => selectAll(true)}>All</button>
                <button className="small-action-btn rose" onClick={() => selectNone(true)}>Clear</button>
              </div>
              <input type="range" min="1" max="12" step="1" value={equivDenom}
                onChange={(e) => setEquivDenom(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#f43f5e' }} />
              <div className="denom-range-labels"><span>1</span><span>{getDenomLabel(equivDenom)}</span><span>12</span></div>
            </div>
          )}
        </div>

        {/* Insight */}
        <div className="math-sandbox-insight" style={{ minHeight: '36px', marginTop: '10px' }}>
          {!showEquiv ? (
            <span>🍕 Each slice = <strong className="text-indigo">1/{denom}</strong>. Selected <strong className="text-amber">{activeSlices.size}/{denom}</strong>!</span>
          ) : isEquivalent ? (
            <span className="text-correct">
              ✨ <strong>{activeSlices.size}/{denom}</strong> = <strong>{equivActive.size}/{equivDenom}</strong> ({Math.round(val1 * 100)}%)!
            </span>
          ) : activeSlices.size === 0 && equivActive.size === 0 ? (
            <span className="text-dim">Tap slices to compare!</span>
          ) : (
            <span className="text-dim">
              A: <strong className="text-amber">{activeSlices.size}/{denom}</strong> ({Math.round(val1 * 100)}%) vs B: <strong className="text-rose">{equivActive.size}/{equivDenom}</strong> ({Math.round(val2 * 100)}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
