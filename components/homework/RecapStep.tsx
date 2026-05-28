"use client";

import React, { useState, useEffect, useRef } from 'react';
import { HomeworkStep } from './context';
import { topicContent } from '../../data/topics';

interface RecapStepProps {
  step: HomeworkStep;
  onBack: () => void;
  onContinue: () => void;
  isFirst: boolean;
  stepProgressText?: string;
}

export const RecapStep: React.FC<RecapStepProps> = ({ step, onBack, onContinue, isFirst, stepProgressText }) => {
  const topicId = step.topic || '';
  const content = step.content;

  const hasSimulation = topicId === 'lo1' || topicId === 'lo2' || topicId === 'lo4';
  const isInteractive = step.type === 'flashcard' || (step.type === 'recap' && hasSimulation);

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
            <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '6px', paddingBottom: '4px' }}>Newton's Laws Explorer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px', alignItems: 'center' }}>
              <div>
                {(['inertia', 'fma', 'reaction'] as const).map(law => (
                  <button 
                    key={law}
                    className={`mini-btn lo1-tab ${selectedLaw === law ? 'selected' : ''}`}
                    onClick={() => setSelectedLaw(law)}
                    style={{
                      fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 700,
                      background: selectedLaw === law ? 'var(--accent)' : 'var(--surface)',
                      borderColor: selectedLaw === law ? 'var(--accent)' : 'var(--border)', 
                      color: selectedLaw === law ? '#ffffff' : 'var(--text-dim)',
                      borderWidth: '1px', borderStyle: 'solid',
                      padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'block', width: '100%', marginBottom: '4px', textAlign: 'center',
                      transition: 'all 0.2s ease', boxShadow: 'none'
                    }}
                  >
                    {law === 'inertia' ? '1st Law' : law === 'fma' ? '2nd Law' : '3rd Law'}
                  </button>
                ))}
              </div>
              <div id="lo1ChalkboardContent" style={{ padding: '2px 0' }}>
                <h4 style={{ color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.88rem', margin: '0 0 4px' }}>
                  {lawsInfo[selectedLaw].title}
                </h4>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.4, color: 'var(--text-dim)', margin: '0' }}>
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
          <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '6px', paddingBottom: '4px' }}>
            Tactile Push Cart Runway
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '12px', alignItems: 'center' }}>
            {/* Left Column: runway, sliders, launch button */}
            <div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', height: '64px', position: 'relative', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '10px', height: '1px', background: 'var(--border)' }} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                  <span style={{ minWidth: '60px' }}>Mass: <strong style={{ color: 'var(--accent)' }}>{cartMass} kg</strong></span>
                  <input 
                    type="range" 
                    min="2" 
                    max="15" 
                    value={cartMass} 
                    onChange={(e) => setCartMass(parseInt(e.target.value))} 
                    style={{ flex: 1, margin: '0 8px', accentColor: 'var(--accent)', height: '4px' }} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                  <span style={{ minWidth: '60px' }}>Force: <strong style={{ color: 'var(--correct)' }}>{cartForce} N</strong></span>
                  <input 
                    type="range" 
                    min="5" 
                    max="50" 
                    value={cartForce} 
                    onChange={(e) => setCartForce(parseInt(e.target.value))} 
                    style={{ flex: 1, margin: '0 8px', accentColor: 'var(--correct)', height: '4px' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                <button 
                  className="sandbox-btn primary" 
                  onClick={launchCart} 
                  disabled={pushing}
                >
                  {pushing ? 'Pushing…' : 'Push Cart! 🚀'}
                </button>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)' }}>Accel Rate</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>
                    {calculatedAccel} m/s²
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Instrument Panel */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', color: 'var(--text)', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Live Speedometer */}
              <div style={{ textAlign: 'center', flex: '1' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.02em', fontFamily: 'inherit', marginBottom: '4px' }}>Speedometer</div>
                <svg width="60" height="60" style={{ background: 'transparent' }}>
                  <circle cx="30" cy="30" r="26" fill="var(--surface)" stroke="var(--border)" strokeWidth="0.5" />
                  <path d="M 12,46 A 22,22 0 1,1 48,46" fill="none" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
                  <g transform={`rotate(${speedNeedleRot} 30 30)`}>
                    <line x1="30" y1="30" x2="30" y2="10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="30" cy="30" r="2.5" fill="var(--accent)" />
                  </g>
                  <text x="30" y="52" fill="var(--text)" fontFamily="'Space Mono', monospace" fontSize="7.5" fontWeight="700" textAnchor="middle">
                    {liveSpeed.toFixed(1)} m/s
                  </text>
                </svg>
              </div>

              {/* live v-t graph */}
              <div style={{ textAlign: 'center', flex: '1.2' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.02em', fontFamily: 'inherit', marginBottom: '4px' }}>v-t Graph</div>
                <svg width="80" height="60" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: "'Space Mono', monospace", fontSize: '5px' }}>
                  <line x1="10" y1="10" x2="74" y2="10" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />
                  <line x1="10" y1="24" x2="74" y2="24" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />
                  <line x1="10" y1="38" x2="74" y2="38" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />
                  
                  <line x1="10" y1="4" x2="10" y2="48" stroke="var(--text-dim)" strokeWidth="0.5" />
                  <line x1="10" y1="48" x2="74" y2="48" stroke="var(--text-dim)" strokeWidth="0.5" />
                  <polyline points={graphPoints} stroke="var(--correct)" strokeWidth="1.5" fill="none" />
                </svg>
              </div>

              {/* Calculations widget */}
              <div style={{ textAlign: 'center', flex: '1', border: '1px dashed var(--border)', padding: '4px', borderRadius: '6px', background: 'var(--surface)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.02em', fontFamily: 'inherit' }}>Math</div>
                <div style={{ fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', lineHeight: '14px', margin: '2px 0' }}>F = m &middot; a</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: 'var(--correct)', whiteSpace: 'nowrap' }}>
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
          <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '6px', paddingBottom: '4px' }}>
            Zero-G Recoil Simulator
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', height: '70px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: '2.5px', height: '2.5px', background: '#cbd5e1', borderRadius: '50%', top: '15px', left: '30px', opacity: 0.8 }} />
              <div style={{ position: 'absolute', width: '2px', height: '2px', background: '#94a3b8', borderRadius: '50%', top: '40px', left: '150px', opacity: 0.8 }} />
              <div style={{ position: 'absolute', width: '3px', height: '3px', background: '#cbd5e1', borderRadius: '50%', top: '20px', left: '280px', opacity: 0.8 }} />
              
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <button 
                className="sandbox-btn primary" 
                onClick={launchRecoil} 
                disabled={recoilActive}
              >
                Throw Space-Rock! ☄️
              </button>
              {(astroLeft !== 140 || rockLeft !== 190) && (
                <button 
                  className="sandbox-btn" 
                  onClick={resetRecoil}
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
          <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '6px', paddingBottom: '4px' }}>
            First Law Friction Highway
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'inherit' }}>Surface:</span>
                <select 
                  value={surface} 
                  onChange={(e) => setSurface(e.target.value as 'ice' | 'gravel')}
                  style={{ padding: '4px 8px', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.75rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="ice">❄️ Frictionless Ice</option>
                  <option value="gravel">🪨 Rough Gravel</option>
                </select>
              </div>
              
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', height: '64px', position: 'relative', overflow: 'hidden' }}>
                <div 
                  id="runwayTrackBg" 
                  style={{ 
                    position: 'absolute', left: '45px', right: 0, bottom: '10px', height: '8px', 
                    background: surface === 'gravel' 
                      ? 'repeating-linear-gradient(90deg, #94a3b8, #94a3b8 10px, #cbd5e1 10px, #cbd5e1 20px)' 
                      : 'linear-gradient(90deg, #e0f7fa, #b2ebf2)', 
                    transition: 'background 0.3s' 
                  }} 
                />
                
                <div 
                  id="frictionArrow" 
                  style={{ 
                    position: 'absolute', bottom: '26px', left: `${frictionArrowLeft}px`, fontSize: '0.9rem', 
                    opacity: frictionArrowOpacity, transition: 'opacity 0.2s, left 0.1s linear', color: 'var(--wrong)' 
                  }}
                >
                  ⬅️ <span style={{ fontSize: '0.55rem', fontFamily: "'Space Mono'", fontWeight: 800, verticalAlign: 'middle', background: 'var(--surface)', border: '1px solid var(--wrong)', padding: '0 2px', borderRadius: '2px' }}>
                    Friction
                  </span>
                </div>
                
                <div style={{ position: 'absolute', bottom: '16px', left: `${crateLeft}px`, fontSize: '1.4rem', lineHeight: 1, zIndex: 2 }}>📦</div>
                
                {/* Screech Alert */}
                <div 
                  className="screech-alert" 
                  style={{ 
                    position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', 
                    background: 'var(--wrong)', color: '#fff', fontFamily: 'inherit', fontSize: '0.75rem', 
                    fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', opacity: screechOpacity, 
                    transition: 'opacity 0.2s', border: '1px solid var(--border)' 
                  }}
                >
                  SKRRRRT! 🛑
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                className="sandbox-btn primary" 
                onClick={launchGlide} 
                disabled={gliding}
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
            <h3 className="notebook-title" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {isInteractive ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: '#0d9488', flexShrink: 0 }}>
                  <rect x="3" y="9" width="14" height="12" rx="2" />
                  <path d="M7 5h14v12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: 'var(--accent)', flexShrink: 0 }}>
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              )}
              {content?.title}
            </h3>
            <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '12px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', color: 'var(--text-dim)', flexShrink: 0 }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              {content?.sub}
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
        {stepProgressText && <span className="footer-step-indicator">{stepProgressText}</span>}
        <button className="nav-btn primary" onClick={onContinue}>
          Got it ✓
        </button>
      </div>
    </div>
  );
};
export default RecapStep;
