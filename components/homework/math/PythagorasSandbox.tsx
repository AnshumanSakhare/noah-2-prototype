"use client";

import React, { useState, useEffect, useRef } from 'react';

export const PythagorasSandbox: React.FC = () => {
  const [sideA, setSideA] = useState<number>(3);
  const [sideB, setSideB] = useState<number>(4);
  const [isProving, setIsProving] = useState<boolean>(false);
  const [waterA, setWaterA] = useState<number>(100);
  const [waterB, setWaterB] = useState<number>(100);
  const [waterC, setWaterC] = useState<number>(0);
  const [proofComplete, setProofComplete] = useState<boolean>(false);
  const [noTransition, setNoTransition] = useState<boolean>(false);

  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => { handleReset(); }, [sideA, sideB]);

  const handleReset = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    setNoTransition(true);
    setWaterA(100); setWaterB(100); setWaterC(0);
    setProofComplete(false); setIsProving(false);
    setTimeout(() => setNoTransition(false), 50);
  };

  const handleProve = () => {
    if (isProving || proofComplete) return;
    setIsProving(true);
    setWaterA(0); setWaterB(0);
    const t1 = setTimeout(() => setWaterC(100), 500);
    const t2 = setTimeout(() => { setProofComplete(true); setIsProving(false); }, 1800);
    timersRef.current.push(t1, t2);
  };

  useEffect(() => { return () => { timersRef.current.forEach(t => clearTimeout(t)); }; }, []);

  const sideC = Math.sqrt(sideA * sideA + sideB * sideB);
  const areaA = sideA * sideA;
  const areaB = sideB * sideB;
  const areaC = Math.round(sideC * sideC);

  // Use a compact scale so everything fits within ~280x220 SVG
  const sc = 14;
  const wA = sideA * sc;
  const wB = sideB * sc;
  const wC = sideC * sc;
  const angleRad = Math.atan2(sideA, sideB);
  const angleDeg = (angleRad * 180) / Math.PI;

  const transStyle = noTransition ? 'none' : 'all 0.8s ease-in-out';
  const transCStyle = noTransition ? 'none' : 'all 1.0s cubic-bezier(0.4, 0, 0.2, 1)';

  // Triangle vertices — pivot at bottom-left corner of triangle
  const px = 90;
  const py = 140;
  const ax = px;
  const ay = py - wA;
  const bx = px + wB;

  return (
    <div style={{ width: '100%' }}>
      {/* SVG Canvas */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
        padding: '8px', display: 'flex', justifyContent: 'center'
      }}>
        <svg viewBox="0 0 260 230" style={{ width: '100%', maxWidth: '280px', height: 'auto' }}>
          {/* Square A — left of vertical side a */}
          <g transform={`translate(${px - wA}, ${ay})`}>
            <rect width={wA} height={wA} fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" rx="2" />
            <rect x="1" y={wA - (wA * waterA) / 100} width={wA - 2} height={(wA * waterA) / 100}
              fill="rgba(59,130,246,0.4)" rx="1" style={{ transition: transStyle }} />
            <text x={wA / 2} y={wA / 2 + 3} textAnchor="middle" fill="#1d4ed8" fontWeight="bold" fontSize="8" fontFamily="Inter">
              a²={areaA}
            </text>
          </g>

          {/* Square B — below horizontal side b */}
          <g transform={`translate(${px}, ${py})`}>
            <rect width={wB} height={wB} fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" rx="2" />
            <rect x="1" y={wB - (wB * waterB) / 100} width={wB - 2} height={(wB * waterB) / 100}
              fill="rgba(59,130,246,0.4)" rx="1" style={{ transition: transStyle }} />
            <text x={wB / 2} y={wB / 2 + 3} textAnchor="middle" fill="#1d4ed8" fontWeight="bold" fontSize="8" fontFamily="Inter">
              b²={areaB}
            </text>
          </g>

          {/* Square C — on hypotenuse, rotated */}
          <g transform={`translate(${ax}, ${ay}) rotate(${90 - angleDeg})`}>
            <rect width={wC} height={wC} fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.8" rx="2" />
            <rect x="1" y={wC - (wC * waterC) / 100} width={wC - 2} height={(wC * waterC) / 100}
              fill="rgba(14,165,233,0.5)" rx="1" style={{ transition: transCStyle }} />
            <g transform={`translate(${wC / 2}, ${wC / 2}) rotate(${angleDeg - 90})`}>
              <text x="0" y="3" textAnchor="middle" fill="#0369a1" fontWeight="bold" fontSize="9" fontFamily="Inter">
                c²={areaC}
              </text>
            </g>
          </g>

          {/* Right Triangle */}
          <polygon points={`${px},${py} ${ax},${ay} ${bx},${py}`}
            fill="#ffffff" stroke="#475569" strokeWidth="2" />

          {/* Side labels */}
          <text x={px - 5} y={py - wA / 2 + 3} textAnchor="end" fill="#475569" fontWeight="800" fontSize="9" fontFamily="Inter">a={sideA}</text>
          <text x={px + wB / 2} y={py + 10} textAnchor="middle" fill="#475569" fontWeight="800" fontSize="9" fontFamily="Inter">b={sideB}</text>
          <text x={(ax + bx) / 2 - 8} y={(ay + py) / 2 - 6} textAnchor="middle" fill="#0ea5e9" fontWeight="800" fontSize="9" fontFamily="Inter">c={sideC.toFixed(1)}</text>

          {/* 90-degree marker */}
          <rect x={px} y={py - 6} width="6" height="6" fill="none" stroke="#64748b" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Controls row — sliders + buttons side by side */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', flexWrap: 'wrap'
      }}>
        {/* Sliders */}
        <div style={{ flex: 1, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', minWidth: '42px' }}>Side a</span>
            <input type="range" min="3" max="6" step="1" value={sideA} disabled={isProving}
              onChange={(e) => setSideA(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#3b82f6', height: '4px', opacity: isProving ? 0.4 : 1 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', minWidth: '14px', textAlign: 'right' }}>{sideA}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', minWidth: '42px' }}>Side b</span>
            <input type="range" min="3" max="6" step="1" value={sideB} disabled={isProving}
              onChange={(e) => setSideB(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#3b82f6', height: '4px', opacity: isProving ? 0.4 : 1 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', minWidth: '14px', textAlign: 'right' }}>{sideB}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleProve} disabled={isProving || proofComplete}
            style={{
              fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 700, padding: '5px 12px',
              borderRadius: '6px', border: 'none', cursor: isProving || proofComplete ? 'not-allowed' : 'pointer',
              background: isProving || proofComplete ? '#cbd5e1' : '#3b82f6', color: '#fff',
              opacity: isProving || proofComplete ? 0.6 : 1, transition: 'all 0.15s ease'
            }}>
            Flow Water
          </button>
          <button onClick={handleReset}
            style={{
              fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 700, padding: '5px 10px',
              borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer',
              background: '#fff', color: '#475569', transition: 'all 0.15s ease'
            }}>
            Reset
          </button>
        </div>
      </div>

      {/* Result line */}
      <div style={{
        marginTop: '8px', padding: '6px 10px', borderRadius: '8px', textAlign: 'center',
        fontSize: '0.76rem', fontWeight: 700, lineHeight: 1.4,
        background: proofComplete ? 'rgba(34,197,94,0.06)' : 'rgba(59,130,246,0.03)',
        border: `1px solid ${proofComplete ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.08)'}`,
        color: proofComplete ? '#16a34a' : '#64748b'
      }}>
        {!isProving && !proofComplete && (
          <span>Adjust sides, then tap Flow Water to prove the theorem</span>
        )}
        {isProving && !proofComplete && (
          <span style={{ color: '#3b82f6' }}>Draining a²({areaA}) + b²({areaB}) into c²({areaC})...</span>
        )}
        {proofComplete && (
          <span>Proved: <strong>{areaA}</strong> + <strong>{areaB}</strong> = <strong>{areaC}</strong></span>
        )}
      </div>
    </div>
  );
};
