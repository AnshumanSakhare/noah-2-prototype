"use client";

import React, { useState, useEffect, useRef } from 'react';
import { HomeworkStep } from './context';
import { topicContent } from '../../data/topics';

interface RecapStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
}

export const RecapStep: React.FC<RecapStepProps> = ({ step, onBack, onContinue, isFirst }) => {
  const topicId = step.topic || '';
  const content = step.content;

  // Accordion drawer for self-test
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [flashFlipped, setFlashFlipped] = useState<boolean>(false);

  // ─── lo1: Laws Chalkboard State ───
  const [selectedLaw, setSelectedLaw] = useState<'inertia' | 'fma' | 'reaction'>('inertia');

  // ─── lo2: Push Cart State ───
  const [cartMass, setCartMass] = useState<number>(5);
  const [cartForce, setCartForce] = useState<number>(20);
  const [pushing, setPushing] = useState<boolean>(false);
  const [cartLeft, setCartLeft] = useState<number>(10);
  const [liveSpeed, setLiveSpeed] = useState<number>(0);
  const [speedNeedleRot, setSpeedNeedleRot] = useState<number>(-140);
  const [graphPoints, setGraphPoints] = useState<string>("12,60");
  const cartAnimRef = useRef<number | null>(null);

  // ─── lo3: Recoil Space State ───
  const [recoilActive, setRecoilActive] = useState<boolean>(false);
  const [astroLeft, setAstroLeft] = useState<number>(140);
  const [rockLeft, setRockLeft] = useState<number>(190);
  const [vectorWidth, setVectorWidth] = useState<number>(0);
  const [vectorOpacity, setVectorOpacity] = useState<number>(0);
  const recoilAnimRef = useRef<number | null>(null);

  // ─── lo4: Friction Highway State ───
  const [surface, setSurface] = useState<'ice' | 'gravel'>('ice');
  const [crateLeft, setCrateLeft] = useState<number>(10);
  const [gliding, setGliding] = useState<boolean>(false);
  const [screechOpacity, setScreechOpacity] = useState<number>(0);
  const [frictionArrowLeft, setFrictionArrowLeft] = useState<number>(60);
  const [frictionArrowOpacity, setFrictionArrowOpacity] = useState<number>(0);
  const glideAnimRef = useRef<number | null>(null);

  // Clean animations on unmount
  useEffect(() => {
    return () => {
      if (cartAnimRef.current) cancelAnimationFrame(cartAnimRef.current);
      if (recoilAnimRef.current) cancelAnimationFrame(recoilAnimRef.current);
      if (glideAnimRef.current) cancelAnimationFrame(glideAnimRef.current);
    };
  }, []);

  // ─── lo2: Cart Simulator Push Function ───
  const launchCart = () => {
    if (pushing) return;
    setPushing(true);
    setCartLeft(10);
    setLiveSpeed(0);
    setSpeedNeedleRot(-140);
    setGraphPoints("12,60");

    const accel = cartForce / cartMass;
    let pos = 10;
    let vel = 0;
    const dt = 0.16;
    let timeElapsed = 0;
    const points = ["12,60"];

    const frame = () => {
      vel += accel * dt;
      pos += vel * dt;
      timeElapsed += dt;

      // Update speedometer gauge
      const dialRot = -140 + Math.min(280, vel * 12);
      setSpeedNeedleRot(dialRot);
      setLiveSpeed(vel);

      // v-t Graph calculations
      const gx = 12 + Math.min(86, timeElapsed * 8);
      const gy = 60 - Math.min(52, vel * 2.2);
      points.push(`${gx.toFixed(1)},${gy.toFixed(1)}`);
      setGraphPoints(points.join(" "));

      setCartLeft(pos);

      if (pos < 310) {
        cartAnimRef.current = requestAnimationFrame(frame);
      } else {
        setPushing(false);
        setTimeout(() => {
          setCartLeft(10);
          setLiveSpeed(0);
          setSpeedNeedleRot(-140);
          setGraphPoints("12,60");
        }, 1200);
      }
    };
    frame();
  };

  // ─── lo3: Recoil simulator space launch ───
  const launchRecoil = () => {
    if (recoilActive) return;
    setRecoilActive(true);
    setAstroLeft(140);
    setRockLeft(190);
    setVectorWidth(70);
    setVectorOpacity(1);

    let posA = 140;
    let posR = 190;
    const velA = -1.2;
    const velR = 4.0;

    const frame = () => {
      posA += velA;
      posR += velR;
      
      setAstroLeft(posA);
      setRockLeft(posR);

      if (posR < 340 && posA > 10) {
        recoilAnimRef.current = requestAnimationFrame(frame);
      } else {
        setRecoilActive(false);
      }
    };
    frame();
  };

  const resetRecoil = () => {
    setAstroLeft(140);
    setRockLeft(190);
    setVectorWidth(0);
    setVectorOpacity(0);
  };

  // ─── lo4: Friction Highway launch ───
  const launchGlide = () => {
    if (gliding) return;
    setGliding(true);
    setCrateLeft(10);
    setScreechOpacity(0);
    
    const hasFriction = surface === 'gravel';
    let pos = 10;
    let vel = 12;
    const frictionDecel = 0.28;

    if (hasFriction) {
      setFrictionArrowOpacity(1);
      setFrictionArrowLeft(60);
    } else {
      setFrictionArrowOpacity(0);
    }

    const frame = () => {
      if (hasFriction) {
        vel = Math.max(0, vel - frictionDecel);
        setFrictionArrowLeft(pos + 30);
      }
      pos += vel;
      setCrateLeft(pos);

      if (vel > 0 && pos < 340) {
        glideAnimRef.current = requestAnimationFrame(frame);
      } else {
        setFrictionArrowOpacity(0);
        if (vel === 0) {
          setScreechOpacity(1);
        }
        
        setTimeout(() => {
          setGliding(false);
          setCrateLeft(10);
          setScreechOpacity(0);
        }, 1800);
      }
    };
    frame();
  };

  // ─── Highlights Parser ───
  const hlText = (raw?: string, colorClass = 'hl-yellow') => {
    if (!raw) return '';
    let t = raw;
    const words = [
      "First Law \\(Inertia\\)", "Second Law \\(F = ma\\)", "Third Law", 
      "Force equals mass times acceleration", "F = ma", "equal and opposite reaction",
      "action force", "reaction force", "resists changing its motion", "inertia"
    ];
    words.forEach(w => {
      const reg = new RegExp(w, 'gi');
      t = t.replace(reg, match => `<span class="${colorClass}">${match}</span>`);
    });
    return t;
  };

  // Physics Sandboxes templates
  const renderSandbox = () => {
    if (topicId === 'lo1') {
      const lawsInfo = {
        inertia: {
          title: "Newton's First Law: Inertia 📦",
          desc: "An object resists changes in motion. A heavy cardboard box won't move until you pull it, and once moving, it would glide forever without friction!",
          sketch: "📦 ➔ 🛑 (friction stops it)"
        },
        fma: {
          title: "Newton's Second Law: F = ma ⚡",
          desc: "Acceleration happens when force acts on a mass. More force = faster speed-up. More mass = harder to speed up!",
          sketch: "🏃 ➔ 🏃💨 (more force = speed!)"
        },
        reaction: {
          title: "Newton's Third Law: Pairs 🤝",
          desc: "Forces always come in matched pairs! When you push a wall, it pushes back at you with the exact same force, in the opposite direction.",
          sketch: "🤜 💥 🤛 (equal & opposite)"
        }
      };

      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '8px 0', padding: '10px' }}>
          <div className="sandbox-chalkboard" style={{ padding: '10px', minHeight: '120px' }}>
            <div className="sandbox-title" style={{ fontSize: '0.8rem', marginBottom: '6px', paddingBottom: '4px' }}>Chalkboard: Newton's Laws Explorer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px', alignItems: 'center' }}>
              <div>
                {(['inertia', 'fma', 'reaction'] as const).map(law => (
                  <button 
                    key={law}
                    className={`mini-btn lo1-tab ${selectedLaw === law ? 'selected' : ''}`}
                    onClick={() => setSelectedLaw(law)}
                    style={{
                      fontFamily: 'var(--chalk-font)', fontSize: '0.74rem',
                      background: selectedLaw === law ? '#ffd54f' : '#1e352f',
                      borderColor: '#8e623b', color: selectedLaw === law ? '#223a31' : '#ffca28',
                      padding: '4px 8px', borderRadius: '5px', cursor: 'pointer', display: 'block', width: '100%', marginBottom: '4px', textAlign: 'center'
                    }}
                  >
                    {law === 'inertia' ? '1st Law' : law === 'fma' ? '2nd Law' : '3rd Law'}
                  </button>
                ))}
              </div>
              <div id="lo1ChalkboardContent" style={{ padding: '2px 0' }}>
                <h4 style={{ color: '#ffd54f', fontFamily: 'var(--chalk-font)', fontSize: '0.95rem', margin: '0 0 4px' }}>
                  {lawsInfo[selectedLaw].title}
                </h4>
                <p style={{ fontSize: '0.82rem', lineHeight: 1.4, color: '#fbf7eb', margin: '0' }}>
                  {lawsInfo[selectedLaw].desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (topicId === 'lo2') {
      const calculatedAccel = (cartForce / cartMass).toFixed(1);

      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '8px 0', padding: '10px' }}>
          <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '0.86rem', fontWeight: 700, color: '#5c5545', marginBottom: '6px' }}>
            Tactile Push Cart Runway
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '12px', alignItems: 'center' }}>
            {/* Left Column: runway, sliders, launch button */}
            <div>
              <div style={{ background: '#fdfcf9', border: '2px solid #e1dbcf', borderRadius: '10px', height: '64px', position: 'relative', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '10px', height: '2px', background: '#e1dbcf' }} />
                <div 
                  id="sandboxCart" 
                  style={{ 
                    position: 'absolute', bottom: '12px', left: `${cartLeft}px`, width: '32px', height: '20px', 
                    borderRadius: '4px', background: 'linear-gradient(135deg,var(--accent),#7a85d8)', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 2 
                  }}
                >
                  <div style={{ position: 'absolute', bottom: '-4px', left: '2px', width: '8px', height: '8px', borderRadius: '50%', background: '#2d2a26', border: '1.5px solid #fff' }} />
                  <div style={{ position: 'absolute', bottom: '-4px', right: '2px', width: '8px', height: '8px', borderRadius: '50%', background: '#2d2a26', border: '1.5px solid #fff' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#5c5545' }}>
                  <span style={{ minWidth: '55px' }}>Mass: <strong style={{ color: 'var(--accent)' }}>{cartMass} kg</strong></span>
                  <input 
                    type="range" 
                    min="2" 
                    max="15" 
                    value={cartMass} 
                    onChange={(e) => setCartMass(parseInt(e.target.value))} 
                    style={{ flex: 1, margin: '0 8px', accentColor: 'var(--accent)', height: '4px' }} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#5c5545' }}>
                  <span style={{ minWidth: '55px' }}>Force: <strong style={{ color: 'var(--accent-3)' }}>{cartForce} N</strong></span>
                  <input 
                    type="range" 
                    min="5" 
                    max="50" 
                    value={cartForce} 
                    onChange={(e) => setCartForce(parseInt(e.target.value))} 
                    style={{ flex: 1, margin: '0 8px', accentColor: 'var(--accent-3)', height: '4px' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e1dbcf' }}>
                <button 
                  className="nav-btn primary" 
                  onClick={launchCart} 
                  disabled={pushing}
                  style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '6px', height: 'auto' }}
                >
                  {pushing ? 'Pushing…' : 'Push Cart! 🚀'}
                </button>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)' }}>Accel Rate</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '1rem', fontWeight: 800, color: 'var(--hw-deep)' }}>
                    {calculatedAccel} m/s²
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Instrument Panel */}
            <div style={{ background: '#1e352f', border: '3px solid #795548', borderRadius: '10px', padding: '8px', color: '#fdfaf2', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Live Speedometer */}
              <div style={{ textAlign: 'center', flex: '1' }}>
                <div style={{ fontSize: '0.58rem', color: '#81c784', fontFamily: 'var(--chalk-font)', marginBottom: '2px' }}>Speedometer</div>
                <svg width="60" height="60" style={{ background: 'transparent' }}>
                  <circle cx="30" cy="30" r="26" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <path d="M 12,46 A 22,22 0 1,1 48,46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" strokeLinecap="round" />
                  <g transform={`rotate(${speedNeedleRot} 30 30)`}>
                    <line x1="30" y1="30" x2="30" y2="10" stroke="#ff5252" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="30" cy="30" r="2.5" fill="#ff5252" />
                  </g>
                  <text x="30" y="52" fill="#fff" fontFamily="'Space Mono', monospace" fontSize="7" fontWeight="700" textAnchor="middle">
                    {liveSpeed.toFixed(1)} m/s
                  </text>
                </svg>
              </div>

              {/* live v-t graph */}
              <div style={{ textAlign: 'center', flex: '1.2' }}>
                <div style={{ fontSize: '0.58rem', color: '#81c784', fontFamily: 'var(--chalk-font)', marginBottom: '2px' }}>v-t Graph</div>
                <svg width="80" height="60" style={{ background: '#152822', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', fontFamily: "'Space Mono', monospace", fontSize: '5px' }}>
                  <line x1="10" y1="10" x2="74" y2="10" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                  <line x1="10" y1="24" x2="74" y2="24" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                  <line x1="10" y1="38" x2="74" y2="38" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                  
                  <line x1="10" y1="4" x2="10" y2="48" stroke="rgba(255,255,255,0.3)" />
                  <line x1="10" y1="48" x2="74" y2="48" stroke="rgba(255,255,255,0.3)" />
                  <polyline points={graphPoints} stroke="#ffd54f" strokeWidth="1.5" fill="none" />
                </svg>
              </div>

              {/* Calculations widget */}
              <div style={{ textAlign: 'center', flex: '1', border: '1px dashed rgba(255,255,255,0.2)', padding: '4px', borderRadius: '6px', background: 'rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#a1887f', fontFamily: 'var(--chalk-font)' }}>Math</div>
                <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '0.8rem', color: '#ffca28', lineHeight: '12px' }}>F = m &middot; a</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: '#81c784', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  {cartForce}N={cartMass}kg &middot; {calculatedAccel}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (topicId === 'lo3') {
      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '8px 0', padding: '10px' }}>
          <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '0.86rem', fontWeight: 700, color: '#5c5545', marginBottom: '6px' }}>
            Zero-G Recoil Simulator
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: '#111c24', border: '2px solid #2d3e4f', borderRadius: '10px', height: '70px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: '2px', height: '2px', background: '#fff', top: '15px', left: '30px', opacity: 0.6 }} />
              <div style={{ position: 'absolute', width: '2px', height: '2px', background: '#fff', top: '40px', left: '150px', opacity: 0.8 }} />
              <div style={{ position: 'absolute', width: '3px', height: '3px', background: '#fff', top: '20px', left: '280px', opacity: 0.5 }} />
              
              <div style={{ position: 'absolute', top: '15px', left: `${astroLeft}px`, fontSize: '1.8rem', lineHeight: 1, zIndex: 3 }}>🧑‍🚀</div>
              <div style={{ position: 'absolute', top: '24px', left: `${rockLeft}px`, fontSize: '0.9rem', lineHeight: 1, zIndex: 4 }}>☄️</div>
              
              {/* Vectors */}
              <div 
                style={{ 
                  position: 'absolute', top: '29px', right: `calc(100% - ${astroLeft - 5}px)`, 
                  width: `${vectorWidth}px`, height: '3px', background: '#d94a4a', 
                  opacity: vectorOpacity, transition: 'all 0.1s', transformOrigin: 'right center' 
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: '-3px', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '6px solid #d94a4a' }} />
              </div>
              
              <div 
                style={{ 
                  position: 'absolute', top: '29px', left: `${rockLeft + 16}px`, 
                  width: `${vectorWidth}px`, height: '3px', background: '#3baa6f', 
                  opacity: vectorOpacity, transition: 'all 0.1s', transformOrigin: 'left center' 
                }}
              >
                <div style={{ position: 'absolute', right: 0, top: '-3px', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '6px solid #3baa6f' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button 
                className="nav-btn primary" 
                onClick={launchRecoil} 
                disabled={recoilActive}
                style={{ padding: '6px 0', fontSize: '0.78rem', borderRadius: '6px', height: 'auto', justifyContent: 'center' }}
              >
                Throw Space-Rock! ☄️
              </button>
              {(astroLeft !== 140 || rockLeft !== 190) && (
                <button 
                  className="nav-btn secondary" 
                  onClick={resetRecoil}
                  style={{ padding: '6px 0', fontSize: '0.78rem', borderRadius: '6px', height: 'auto', justifyContent: 'center' }}
                >
                  Reset 🔄
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (topicId === 'lo4') {
      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '8px 0', padding: '10px' }}>
          <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '0.86rem', fontWeight: 700, color: '#5c5545', marginBottom: '6px' }}>
            First Law Friction Highway
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5c5545' }}>Surface:</span>
                <select 
                  value={surface} 
                  onChange={(e) => setSurface(e.target.value as 'ice' | 'gravel')}
                  style={{ padding: '4px 8px', fontFamily: "'Nunito'", fontWeight: 700, fontSize: '0.75rem', border: '1px solid var(--border)', borderRadius: '6px', background: '#fff', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="ice">❄️ Frictionless Ice</option>
                  <option value="gravel">🪨 Rough Gravel</option>
                </select>
              </div>
              
              <div style={{ background: '#fdfcf9', border: '2px solid #e1dbcf', borderRadius: '10px', height: '64px', position: 'relative', overflow: 'hidden' }}>
                <div 
                  id="runwayTrackBg" 
                  style={{ 
                    position: 'absolute', left: '45px', right: 0, bottom: '10px', height: '8px', 
                    background: surface === 'gravel' 
                      ? 'repeating-linear-gradient(90deg, #d35400, #d35400 10px, #e67e22 10px, #e67e22 20px)' 
                      : 'linear-gradient(90deg, #e0f7fa, #b2ebf2)', 
                    transition: 'background 0.3s' 
                  }} 
                />
                
                <div 
                  id="frictionArrow" 
                  style={{ 
                    position: 'absolute', bottom: '26px', left: `${frictionArrowLeft}px`, fontSize: '0.9rem', 
                    opacity: frictionArrowOpacity, transition: 'opacity 0.2s, left 0.1s linear', color: '#d94a4a' 
                  }}
                >
                  ⬅️ <span style={{ fontSize: '0.55rem', fontFamily: "'Space Mono'", fontWeight: 800, verticalAlign: 'middle', background: '#fff', border: '1px solid #d94a4a', padding: '0 2px', borderRadius: '2px' }}>
                    Friction
                  </span>
                </div>
                
                <div style={{ position: 'absolute', bottom: '16px', left: `${crateLeft}px`, fontSize: '1.4rem', lineHeight: 1, zIndex: 2 }}>📦</div>
                
                {/* Screech Alert */}
                <div 
                  className="screech-alert" 
                  style={{ 
                    position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', 
                    background: '#d94a4a', color: '#fff', fontFamily: 'var(--chalk-font)', fontSize: '0.75rem', 
                    fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px', opacity: screechOpacity, 
                    transition: 'opacity 0.2s', border: '1.5px solid #fff' 
                  }}
                >
                  SKRRRRT! 🛑
                </div>
              </div>
            </div>

            <div>
              <button 
                className="nav-btn primary" 
                onClick={launchGlide} 
                disabled={gliding}
                style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem', borderRadius: '6px', height: 'auto', justifyContent: 'center' }}
              >
                {gliding ? 'Gliding… 📦' : 'Launch Crate! 🚀'}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // notebook theme color variables
  let noteColorClass = 'notebook-lo1';
  let hlClass = 'hl-yellow';
  if (topicId === 'lo2') {
    noteColorClass = 'notebook-lo2';
    hlClass = 'hl-blue';
  } else if (topicId === 'lo3') {
    noteColorClass = 'notebook-lo3';
    hlClass = 'hl-pink';
  } else if (topicId === 'lo4') {
    noteColorClass = 'notebook-lo4';
    hlClass = 'hl-green';
  }

  const flashcard = topicContent[topicId]?.flashcard || { front: 'No self-test available', back: 'No answer available' };

  return (
    <div className={`hw-card hw-card-recap hw-card-recap-handwritten ${noteColorClass}`}>
      <div className="hw-card-body">
        <div className="hw-notebook-sheet">
          <div className="hw-notebook-sheet-content">
            <h3 className="notebook-title">📖 {content?.title}</h3>
            <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '12px', letterSpacing: '0.04em' }}>
              📝 {content?.sub}
            </p>
            <div 
              style={{ fontSize: '0.95rem', lineHeight: '22px', marginBottom: '12px' }}
              dangerouslySetInnerHTML={{ __html: hlText(content?.text, hlClass) }}
            />
            
            {/* Visual physics sandbox */}
            {renderSandbox()}
          </div>
        </div>
      </div>
      <div className="hw-card-footer">
        <button className="nav-btn secondary" onClick={onBack} disabled={isFirst}>
          ← Back
        </button>
        <button className="nav-btn primary" onClick={onContinue}>
          Got it ✓
        </button>
      </div>
    </div>
  );
};
export default RecapStep;
