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
          desc: "An object stays in its current state of motion unless an external force acts on it. A heavy cardboard box won't move until you pull it, and once moving, it would glide forever without friction!",
          sketch: "📦 ➔ 🛑 (friction stops it)"
        },
        fma: {
          title: "Newton's Second Law: F = ma ⚡",
          desc: "Acceleration happens when a force acts on a mass. The bigger the force, the faster it speeds up. The bigger the mass, the harder it is to speed up!",
          sketch: "🏃 ➔ 🏃💨 (more force = speed!)"
        },
        reaction: {
          title: "Newton's Third Law: Pairs 🤝",
          desc: "Forces always come in matched pairs! When you push against a wall, the wall pushes back at you with the exact same amount of force, just in the opposite direction.",
          sketch: "🤜 💥 🤛 (equal & opposite)"
        }
      };

      return (
        <div className="sandbox-canvas-wrapper">
          <div className="sandbox-chalkboard">
            <div className="sandbox-title">Chalkboard: Newton's Laws Explorer</div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {(['inertia', 'fma', 'reaction'] as const).map(law => (
                <button 
                  key={law}
                  className={`mini-btn lo1-tab ${selectedLaw === law ? 'selected' : ''}`}
                  onClick={() => setSelectedLaw(law)}
                  style={{
                    fontFamily: 'var(--chalk-font)', fontSize: '0.8rem',
                    background: selectedLaw === law ? '#ffd54f' : '#1e352f',
                    borderColor: '#8e623b', color: selectedLaw === law ? '#223a31' : '#ffca28',
                    padding: '5px 12px', borderRadius: '6px', cursor: 'pointer'
                  }}
                >
                  {law === 'inertia' ? '1st Law' : law === 'fma' ? '2nd Law' : '3rd Law'}
                </button>
              ))}
            </div>
            <div id="lo1ChalkboardContent" style={{ padding: '4px 0' }}>
              <h4 style={{ color: '#ffd54f', fontFamily: 'var(--chalk-font)', fontSize: '1.15rem', margin: '0 0 8px' }}>
                {lawsInfo[selectedLaw].title}
              </h4>
              <p style={{ fontSize: '0.98rem', lineHeight: 1.55, color: '#fbf7eb', margin: '0 0 12px' }}>
                {lawsInfo[selectedLaw].desc}
              </p>
              <div style={{ textAlign: 'center', fontSize: '2.8rem', margin: '15px 0 0' }}>
                <div style={{ animation: 'floatSubtle 2.5s ease-in-out infinite' }}>
                  {lawsInfo[selectedLaw].sketch}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (topicId === 'lo2') {
      const calculatedAccel = (cartForce / cartMass).toFixed(1);

      return (
        <div className="sandbox-canvas-wrapper">
          <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '1rem', fontWeight: 700, color: '#5c5545', marginBottom: '8px' }}>
            Tactile Push Cart Runway
          </div>
          
          <div style={{ background: '#fdfcf9', border: '2.5px solid #e1dbcf', borderRadius: '12px', height: '100px', position: 'relative', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: '20px', height: '3px', background: '#e1dbcf' }} />
            <div 
              id="sandboxCart" 
              style={{ 
                position: 'absolute', bottom: '23px', left: `${cartLeft}px`, width: '44px', height: '28px', 
                borderRadius: '6px', background: 'linear-gradient(135deg,var(--accent),#7a85d8)', 
                boxShadow: '0 3px 8px rgba(0,0,0,0.15)', zIndex: 2 
              }}
            >
              <div style={{ position: 'absolute', bottom: '-6px', left: '4px', width: '12px', height: '12px', borderRadius: '50%', background: '#2d2a26', border: '2px solid #fff' }} />
              <div style={{ position: 'absolute', bottom: '-6px', right: '4px', width: '12px', height: '12px', borderRadius: '50%', background: '#2d2a26', border: '2px solid #fff' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontFamily: 'var(--hand-font)', fontWeight: 700, color: '#5c5545' }}>
              <span style={{ minWidth: '70px' }}>Mass: <strong style={{ color: 'var(--accent)' }}>{cartMass} kg</strong></span>
              <input 
                type="range" 
                min="2" 
                max="15" 
                value={cartMass} 
                onChange={(e) => setCartMass(parseInt(e.target.value))} 
                style={{ flex: 1, margin: '0 12px', accentColor: 'var(--accent)' }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontFamily: 'var(--hand-font)', fontWeight: 700, color: '#5c5545' }}>
              <span style={{ minWidth: '70px' }}>Force: <strong style={{ color: 'var(--accent-3)' }}>{cartForce} N</strong></span>
              <input 
                type="range" 
                min="5" 
                max="50" 
                value={cartForce} 
                onChange={(e) => setCartForce(parseInt(e.target.value))} 
                style={{ flex: 1, margin: '0 12px', accentColor: 'var(--accent-3)' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e1dbcf' }}>
            <button 
              className="nav-btn primary" 
              onClick={launchCart} 
              disabled={pushing}
              style={{ padding: '8px 18px', fontSize: '0.84rem', borderRadius: '8px', height: 'auto' }}
            >
              {pushing ? 'Pushing… 💨' : 'Push Cart! 🚀'}
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)' }}>Acceleration Rate</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: '1.15rem', fontWeight: 800, color: 'var(--hw-deep)' }}>
                {calculatedAccel} m/s²
              </div>
            </div>
          </div>

          {/* Instrument Dashboard Panel */}
          <div style={{ marginTop: '15px', background: '#1e352f', border: '4px solid #795548', borderRadius: '12px', padding: '12px', color: '#fdfaf2', boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            {/* Live Speedometer */}
            <div style={{ textAlign: 'center', flex: '1 1 76px' }}>
              <div style={{ fontSize: '0.65rem', color: '#81c784', fontFamily: 'var(--chalk-font)', marginBottom: '2px' }}>Live Speedometer</div>
              <svg width="76" height="76" style={{ background: 'transparent', fontFamily: 'var(--chalk-font)' }}>
                <circle cx="38" cy="38" r="32" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <path d="M 15,58 A 27,27 0 1,1 61,58" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round" />
                <text x="14" y="63" fill="rgba(255,255,255,0.4)" fontSize="6" textAnchor="middle">0</text>
                <text x="38" y="16" fill="rgba(255,255,255,0.4)" fontSize="6" textAnchor="middle">25</text>
                <text x="62" y="63" fill="rgba(255,255,255,0.4)" fontSize="6" textAnchor="middle">50</text>
                <g transform={`rotate(${speedNeedleRot} 38 38)`}>
                  <line x1="38" y1="38" x2="38" y2="14" stroke="#ff5252" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="38" cy="38" r="3.5" fill="#ff5252" />
                </g>
                <circle cx="38" cy="38" r="1.5" fill="#fff" />
                <text x="38" y="68" fill="#fff" fontFamily="'Space Mono', monospace" fontSize="8" fontWeight="700" textAnchor="middle">
                  {liveSpeed.toFixed(1)} m/s
                </text>
              </svg>
            </div>

            {/* live v-t graph */}
            <div style={{ textAlign: 'center', flex: '1 1 105px' }}>
              <div style={{ fontSize: '0.65rem', color: '#81c784', fontFamily: 'var(--chalk-font)', marginBottom: '2px' }}>v-t Graph</div>
              <svg width="105" height="76" style={{ background: '#152822', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontFamily: "'Space Mono', monospace", fontSize: '6px' }}>
                <line x1="12" y1="12" x2="98" y2="12" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                <line x1="12" y1="28" x2="98" y2="28" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                <line x1="12" y1="44" x2="98" y2="44" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                
                <line x1="12" y1="4" x2="12" y2="60" stroke="rgba(255,255,255,0.3)" />
                <line x1="12" y1="60" x2="98" y2="60" stroke="rgba(255,255,255,0.3)" />
                <text x="4" y="8" fill="rgba(255,255,255,0.5)">v</text>
                <text x="94" y="69" fill="rgba(255,255,255,0.5)">t</text>
                <polyline points={graphPoints} stroke="#ffd54f" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Calculations widget */}
            <div style={{ textAlign: 'center', flex: '1 1 90px', border: '1.5px dashed rgba(255,255,255,0.2)', padding: '5px', borderRadius: '8px', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#a1887f', fontFamily: 'var(--chalk-font)' }}>Chalk Math</div>
              <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '0.95rem', color: '#ffca28', lineHeight: '16px' }}>F = m &middot; a</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.68rem', color: '#81c784', marginTop: '2px', whiteSpace: 'nowrap' }}>
                {cartForce}N = {cartMass}kg &middot; {calculatedAccel}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (topicId === 'lo3') {
      return (
        <div className="sandbox-canvas-wrapper">
          <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '1rem', fontWeight: 700, color: '#5c5545', marginBottom: '8px' }}>
            Zero-G Recoil Simulator
          </div>
          <div style={{ background: '#111c24', border: '2.5px solid #2d3e4f', borderRadius: '12px', height: '120px', position: 'relative', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ position: 'absolute', width: '2px', height: '2px', background: '#fff', top: '20px', left: '40px', opacity: 0.6 }} />
            <div style={{ position: 'absolute', width: '2px', height: '2px', background: '#fff', top: '80px', left: '180px', opacity: 0.8 }} />
            <div style={{ position: 'absolute', width: '3px', height: '3px', background: '#fff', top: '30px', left: '320px', opacity: 0.5 }} />
            
            <div style={{ position: 'absolute', top: '35px', left: `${astroLeft}px`, fontSize: '2.2rem', lineHeight: 1, zIndex: 3 }}>🧑‍🚀</div>
            <div style={{ position: 'absolute', top: '48px', left: `${rockLeft}px`, fontSize: '1.1rem', lineHeight: 1, zIndex: 4 }}>☄️</div>
            
            {/* Vectors */}
            <div 
              style={{ 
                position: 'absolute', top: '54px', right: `calc(100% - ${astroLeft - 5}px)`, 
                width: `${vectorWidth}px`, height: '4px', background: '#d94a4a', 
                opacity: vectorOpacity, transition: 'all 0.1s', transformOrigin: 'right center' 
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: '-4px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '8px solid #d94a4a' }} />
              <div style={{ position: 'absolute', top: '-16px', left: '10px', fontFamily: "'Space Mono'", fontSize: '0.66rem', fontWeight: 700, color: '#d94a4a', whiteSpace: 'nowrap' }}>
                -F (Recoil)
              </div>
            </div>
            
            <div 
              style={{ 
                position: 'absolute', top: '54px', left: `${rockLeft + 20}px`, 
                width: `${vectorWidth}px`, height: '4px', background: '#3baa6f', 
                opacity: vectorOpacity, transition: 'all 0.1s', transformOrigin: 'left center' 
              }}
            >
              <div style={{ position: 'absolute', right: 0, top: '-4px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '8px solid #3baa6f' }} />
              <div style={{ position: 'absolute', top: '-16px', right: '10px', fontFamily: "'Space Mono'", fontSize: '0.66rem', fontWeight: 700, color: '#3baa6f', whiteSpace: 'nowrap' }}>
                +F (Throw)
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="nav-btn primary" 
              onClick={launchRecoil} 
              disabled={recoilActive}
              style={{ flex: 1, padding: '10px 0', fontSize: '0.88rem', borderRadius: '8px', height: 'auto', justifyContent: 'center' }}
            >
              Throw Space-Rock! ☄️
            </button>
            {(astroLeft !== 140 || rockLeft !== 190) && (
              <button 
                className="nav-btn secondary" 
                onClick={resetRecoil}
                style={{ padding: '10px 20px', fontSize: '0.88rem', borderRadius: '8px', height: 'auto' }}
              >
                Reset 🔄
              </button>
            )}
          </div>
        </div>
      );
    }

    if (topicId === 'lo4') {
      return (
        <div className="sandbox-canvas-wrapper">
          <div style={{ fontFamily: 'var(--chalk-font)', fontSize: '1rem', fontWeight: 700, color: '#5c5545', marginBottom: '8px' }}>
            First Law Friction Highway
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'var(--hand-font)', fontSize: '0.95rem', fontWeight: 700, color: '#5c5545' }}>Select Runway Surface:</span>
            <select 
              value={surface} 
              onChange={(e) => setSurface(e.target.value as 'ice' | 'gravel')}
              style={{ padding: '6px 12px', fontFamily: "'Nunito'", fontWeight: 700, fontSize: '0.8rem', border: '2px solid var(--border)', borderRadius: '8px', background: '#fff', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ice">❄️ Frictionless Ice Runway</option>
              <option value="gravel">🪨 Rough Gravel Runway</option>
            </select>
          </div>
          
          <div style={{ background: '#fdfcf9', border: '2.5px solid #e1dbcf', borderRadius: '12px', height: '100px', position: 'relative', overflow: 'hidden', marginBottom: '12px' }}>
            <div 
              id="runwayTrackBg" 
              style={{ 
                position: 'absolute', left: '45px', right: 0, bottom: '20px', height: '12px', 
                background: surface === 'gravel' 
                  ? 'repeating-linear-gradient(90deg, #d35400, #d35400 10px, #e67e22 10px, #e67e22 20px)' 
                  : 'linear-gradient(90deg, #e0f7fa, #b2ebf2)', 
                transition: 'background 0.3s' 
              }} 
            />
            
            <div 
              id="frictionArrow" 
              style={{ 
                position: 'absolute', bottom: '42px', left: `${frictionArrowLeft}px`, fontSize: '1.1rem', 
                opacity: frictionArrowOpacity, transition: 'opacity 0.2s, left 0.1s linear', color: '#d94a4a' 
              }}
            >
              ⬅️ <span style={{ fontSize: '0.6rem', fontFamily: "'Space Mono'", fontWeight: 800, verticalAlign: 'middle', background: '#fff', border: '1px solid #d94a4a', padding: '1px 3px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                Friction
              </span>
            </div>
            
            <div style={{ position: 'absolute', bottom: '30px', left: `${crateLeft}px`, fontSize: '1.8rem', lineHeight: 1, zIndex: 2 }}>📦</div>
            
            {/* Screech Alert */}
            <div 
              className="screech-alert" 
              style={{ 
                position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)', 
                background: '#d94a4a', color: '#fff', fontFamily: 'var(--chalk-font)', fontSize: '0.85rem', 
                fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', opacity: screechOpacity, 
                transition: 'opacity 0.2s', border: '2px solid #fff', boxShadow: '0 3px 10px rgba(0,0,0,0.2)' 
              }}
            >
              SKRRRRT! 🛑
            </div>
          </div>
          
          <button 
            className="nav-btn primary" 
            onClick={launchGlide} 
            disabled={gliding}
            style={{ width: '100%', padding: '10px 0', fontSize: '0.88rem', borderRadius: '8px', height: 'auto', justifyContent: 'center' }}
          >
            {gliding ? 'Gliding… 📦' : 'Launch Crate! 🚀'}
          </button>
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
              style={{ fontSize: '1.15rem', lineHeight: '28px', marginBottom: '15px' }}
              dangerouslySetInnerHTML={{ __html: hlText(content?.text, hlClass) }}
            />
            
            {/* Visual physics sandbox */}
            {renderSandbox()}
            
            {/* Try challenge flashcard accordion */}
            <div className={`self-test-drawer ${drawerOpen ? 'open' : ''}`} id="selfTestDrawer">
              <div className="self-test-header" onClick={() => setDrawerOpen(prev => !prev)}>
                <span>🧠 Try the Self-Test Challenge</span>
                <span className="self-test-arrow">▼</span>
              </div>
              <div className="self-test-body">
                <div 
                  className={`hw-flashcard ${flashFlipped ? 'flipped' : ''}`} 
                  id="hwRecapFlash"
                  onClick={() => setFlashFlipped(prev => !prev)}
                  style={{ height: '180px' }}
                >
                  <div className="hw-flashcard-inner">
                    <div className="hw-flash-face hw-flash-front" style={{ background: '#5b8c6f', color: '#fff', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ padding: '16px' }}>
                        <div className="ff-q" style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>{flashcard.front}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>tap to flip 🔄</div>
                      </div>
                    </div>
                    <div className="hw-flash-face hw-flash-back" style={{ background: '#ffffff', border: '2px solid #dbd6c5', borderRadius: '14px', transform: 'rotateY(180deg)' }}>
                      <div 
                        style={{ padding: '16px', fontFamily: 'var(--hand-font)', fontSize: '1.1rem', color: '#2c3e50', lineHeight: 1.4 }}
                        dangerouslySetInnerHTML={{ __html: flashcard.back }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
