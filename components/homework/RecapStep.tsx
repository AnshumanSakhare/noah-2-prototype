"use client";

import React, { useState } from 'react';
import { HomeworkStep, getTopicName } from './context';
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

  const hasSimulation = topicId === 'lo1' || topicId === 'lo2' || topicId === 'lo3' || topicId === 'lo4';
  const isInteractive = step.type === 'flashcard' || (step.type === 'recap' && hasSimulation);

  // Accordion drawer for self-test
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [flashFlipped, setFlashFlipped] = useState<boolean>(false);

  // ─── lo1: Laws Chalkboard State ───
  const [selectedLaw, setSelectedLaw] = useState<'inertia' | 'fma' | 'reaction'>('inertia');

  // ─── lo2: F = ma Calculator State (reactive — no animation) ───
  const [cartMass, setCartMass] = useState<number>(5);
  const [cartForce, setCartForce] = useState<number>(20);

  // ─── lo3: Action-Reaction State (CSS transitions) ───
  const [throwItem, setThrowItem] = useState<'apple' | 'bowling' | 'anvil'>('apple');
  const [launched, setLaunched] = useState<boolean>(false);
  const [noTransition, setNoTransition] = useState<boolean>(false);

  // ─── lo4: Friction Race State (CSS transitions) ───
  const [raceStarted, setRaceStarted] = useState<boolean>(false);
  const [raceNoTransition, setRaceNoTransition] = useState<boolean>(false);
  const [showScreech, setShowScreech] = useState<boolean>(false);

  // ─── lo3 handlers ───
  const handleLaunch = () => setLaunched(true);
  const handleResetLaunch = () => {
    setNoTransition(true);
    setLaunched(false);
    setTimeout(() => setNoTransition(false), 50);
  };

  // ─── lo4 handlers ───
  const handleRace = () => {
    setRaceStarted(true);
    setTimeout(() => setShowScreech(true), 1900);
  };
  const handleResetRace = () => {
    setRaceNoTransition(true);
    setRaceStarted(false);
    setShowScreech(false);
    setTimeout(() => setRaceNoTransition(false), 50);
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

  // ─── Physics Sandboxes ───
  const renderSandbox = () => {

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // lo1: Newton's Laws Explorer (tab selector — unchanged)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (topicId === 'lo1') {
      const lawsInfo = {
        inertia: {
          title: "Newton's First Law: Inertia 📦",
          desc: "An object resists changes in motion. A heavy cardboard box won't move until you pull it, and once moving, it would glide forever without friction!",
        },
        fma: {
          title: "Newton's Second Law: F = ma ⚡",
          desc: "Acceleration happens when force acts on a mass. More force = faster speed-up. More mass = harder to speed up!",
        },
        reaction: {
          title: "Newton's Third Law: Pairs 🤝",
          desc: "Forces always come in matched pairs! When you push a wall, it pushes back at you with the exact same force, in the opposite direction.",
        }
      };

      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '48px 0 16px 0', padding: '16px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px' }}>
          <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '16px', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Newton&apos;s Laws Explorer
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(['inertia', 'fma', 'reaction'] as const).map(law => {
                const isActive = selectedLaw === law;
                return (
                  <button
                    key={law}
                    onClick={() => setSelectedLaw(law)}
                    style={{
                      fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 750,
                      background: isActive ? '#0284c7' : '#ffffff',
                      borderColor: isActive ? '#0284c7' : '#cbd5e1',
                      color: isActive ? '#ffffff' : '#475569',
                      borderWidth: '1px', borderStyle: 'solid',
                      padding: '8px 16px', borderRadius: '30px',
                      cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 3px 6px rgba(2, 132, 199, 0.15)' : 'none',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; } }}
                    onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
                  >
                    {law === 'inertia' ? '1st Law' : law === 'fma' ? '2nd Law' : '3rd Law'}
                  </button>
                );
              })}
            </div>

            <div
              id="lo1ChalkboardContent"
              style={{
                background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px',
                padding: '24px 28px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 10px 15px -3px rgba(0, 0, 0, 0.04)',
                display: 'flex', flexDirection: 'column', gap: '8px',
                minHeight: '120px', justifyContent: 'center'
              }}
            >
              <h4 style={{ color: '#1e293b', fontFamily: 'inherit', fontWeight: 850, fontSize: '1.2rem', margin: 0, letterSpacing: '-0.015em' }}>
                {lawsInfo[selectedLaw].title}
              </h4>
              <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: '#475569', margin: 0, fontWeight: 500 }}>
                {lawsInfo[selectedLaw].desc}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // lo2: F = ma Live Calculator (pure reactive — NO animation)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (topicId === 'lo2') {
      const accel = cartForce / cartMass;
      const accelDisplay = accel.toFixed(1);
      const massPct = ((cartMass - 1) / (20 - 1)) * 100;
      const forcePct = ((cartForce - 5) / (50 - 5)) * 100;
      const barWidth = Math.min(100, accel * 4);

      const massEmoji = cartMass <= 3 ? '🪶' : cartMass <= 8 ? '📦' : cartMass <= 14 ? '🧱' : '🐘';
      const forceEmoji = cartForce <= 15 ? '💨' : cartForce <= 30 ? '🏃' : '🚀';
      const speedLabel = accel < 2 ? 'Slow 🐌' : accel < 5 ? 'Medium 🚶' : accel < 10 ? 'Fast 🏎️' : 'Blazing! 🚀';

      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '48px 0 16px 0', padding: '16px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px' }}>
          <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '16px', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            F = ma Explorer
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
            {/* Left: Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Mass Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  <span>Mass</span>
                  <span style={{ color: '#0284c7', fontSize: '0.95rem' }}>{cartMass} kg {massEmoji}</span>
                </div>
                <input
                  type="range" min="1" max="20" value={cartMass}
                  onChange={(e) => setCartMass(parseInt(e.target.value))}
                  style={{
                    width: '100%', accentColor: '#0284c7', height: '6px', borderRadius: '3px',
                    background: `linear-gradient(to right, #0284c7 ${massPct}%, #e2e8f0 ${massPct}%)`,
                    WebkitAppearance: 'none', appearance: 'none', outline: 'none', cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                  <span>🪶 Light</span><span>🐘 Heavy</span>
                </div>
              </div>

              {/* Force Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  <span>Force</span>
                  <span style={{ color: '#10b981', fontSize: '0.95rem' }}>{cartForce} N {forceEmoji}</span>
                </div>
                <input
                  type="range" min="5" max="50" value={cartForce}
                  onChange={(e) => setCartForce(parseInt(e.target.value))}
                  style={{
                    width: '100%', accentColor: '#10b981', height: '6px', borderRadius: '3px',
                    background: `linear-gradient(to right, #10b981 ${forcePct}%, #e2e8f0 ${forcePct}%)`,
                    WebkitAppearance: 'none', appearance: 'none', outline: 'none', cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                  <span>💨 Gentle</span><span>🚀 Powerful</span>
                </div>
              </div>
            </div>

            {/* Right: Result Card */}
            <div style={{
              background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px',
              padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Acceleration
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0284c7', lineHeight: 1.1, fontFamily: "'Inter', sans-serif" }}>
                {accelDisplay} <span style={{ fontSize: '1rem', fontWeight: 700 }}>m/s²</span>
              </div>

              {/* Visual bar */}
              <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{
                  width: `${barWidth}%`, height: '100%', borderRadius: '5px',
                  background: accel < 5
                    ? 'linear-gradient(90deg, #93c5fd, #3b82f6)'
                    : accel < 15
                      ? 'linear-gradient(90deg, #6ee7b7, #10b981)'
                      : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                  transition: 'width 0.3s ease, background 0.3s ease'
                }} />
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                {speedLabel}
              </div>
            </div>
          </div>

          {/* Math sticky note */}
          <div style={{
            marginTop: '14px', background: '#fefcbf', border: '1px solid #fef08a', borderRadius: '10px',
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 850, color: '#a16207', textTransform: 'uppercase' }}>Math</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e3a8a' }}>
              F = m × a &rarr; <span style={{ fontFamily: "'Space Mono', monospace" }}>{cartForce}N = {cartMass}kg × {accelDisplay}m/s²</span>
            </div>
          </div>
        </div>
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // lo3: Action-Reaction Launcher (CSS transitions)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (topicId === 'lo3') {
      const throwConfig = {
        apple:   { emoji: '🍎', label: 'Light',  itemEnd: '85%', astroEnd: '36%', dur: '0.8s', insight: 'The light apple flies fast — you barely move!' },
        bowling: { emoji: '🎳', label: 'Medium', itemEnd: '72%', astroEnd: '15%', dur: '1.0s', insight: 'Both move! Equal forces act on different masses.' },
        anvil:   { emoji: '🏗️', label: 'Heavy',  itemEnd: '52%', astroEnd: '2%',  dur: '1.0s', insight: 'The heavy anvil barely moves — YOU fly backward! 😱' },
      };
      const cfg = throwConfig[throwItem];
      const transStyle = noTransition ? 'none' : `left ${cfg.dur} ease-out`;

      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '48px 0 16px 0', padding: '16px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px' }}>
          <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Action–Reaction Launcher
          </div>

          {/* Item selector pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {(['apple', 'bowling', 'anvil'] as const).map(item => {
              const c = throwConfig[item];
              const active = throwItem === item;
              return (
                <button
                  key={item}
                  onClick={() => { if (!launched) setThrowItem(item); }}
                  disabled={launched}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: '12px',
                    border: `1.5px solid ${active ? '#0284c7' : '#e2e8f0'}`,
                    background: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#0284c7' : '#64748b',
                    fontWeight: 750, fontSize: '0.78rem',
                    cursor: launched ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    fontFamily: 'inherit', outline: 'none', opacity: launched && !active ? 0.4 : 1
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Space stage */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '14px',
            height: '90px', position: 'relative', overflow: 'hidden', marginBottom: '12px'
          }}>
            {/* Stars */}
            <div style={{ position: 'absolute', width: '2px', height: '2px', background: '#fff', borderRadius: '50%', top: '12px', left: '20%', opacity: 0.5 }} />
            <div style={{ position: 'absolute', width: '1.5px', height: '1.5px', background: '#fff', borderRadius: '50%', top: '55px', left: '65%', opacity: 0.4 }} />
            <div style={{ position: 'absolute', width: '2.5px', height: '2.5px', background: '#fff', borderRadius: '50%', top: '18px', left: '82%', opacity: 0.6 }} />
            <div style={{ position: 'absolute', width: '1.5px', height: '1.5px', background: '#fff', borderRadius: '50%', top: '40px', left: '10%', opacity: 0.3 }} />

            {/* Astronaut */}
            <div style={{
              position: 'absolute', top: '20px',
              left: launched ? cfg.astroEnd : '40%',
              fontSize: '2rem', lineHeight: 1, zIndex: 2,
              transition: transStyle
            }}>🧑‍🚀</div>

            {/* Thrown item */}
            <div style={{
              position: 'absolute', top: '30px',
              left: launched ? cfg.itemEnd : '48%',
              fontSize: '1.3rem', lineHeight: 1, zIndex: 2,
              transition: transStyle
            }}>{cfg.emoji}</div>

            {/* Force labels — appear after launch */}
            {launched && (
              <>
                <div style={{
                  position: 'absolute', bottom: '8px', left: '12px',
                  color: '#ef4444', fontSize: '0.62rem', fontWeight: 800,
                  background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '4px'
                }}>
                  ◀ Reaction
                </div>
                <div style={{
                  position: 'absolute', bottom: '8px', right: '12px',
                  color: '#22c55e', fontSize: '0.62rem', fontWeight: 800,
                  background: 'rgba(34,197,94,0.15)', padding: '2px 6px', borderRadius: '4px'
                }}>
                  Action ▶
                </div>
              </>
            )}
          </div>

          {/* Insight text */}
          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748b', textAlign: 'center', marginBottom: '12px', lineHeight: 1.5, minHeight: '20px' }}>
            {launched ? cfg.insight : 'Pick an object and throw it in space!'}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {!launched ? (
              <button
                onClick={handleLaunch}
                style={{
                  borderRadius: '30px', background: '#0284c7', color: '#fff', fontWeight: 750,
                  fontSize: '0.85rem', padding: '9px 24px', border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s ease', boxShadow: '0 3px 6px rgba(2,132,199,0.2)',
                  fontFamily: 'inherit'
                }}
              >
                Throw! 🚀
              </button>
            ) : (
              <button
                onClick={handleResetLaunch}
                style={{
                  borderRadius: '30px', background: '#ffffff', color: '#475569', fontWeight: 700,
                  fontSize: '0.85rem', padding: '9px 24px', border: '1.5px solid #cbd5e1', cursor: 'pointer',
                  transition: 'all 0.2s ease', fontFamily: 'inherit'
                }}
              >
                Try Again 🔄
              </button>
            )}
          </div>
        </div>
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // lo4: Friction Race (side-by-side CSS transitions)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (topicId === 'lo4') {
      const iceTransition = raceNoTransition ? 'none' : 'left 3s linear';
      const gravelTransition = raceNoTransition ? 'none' : 'left 1.8s cubic-bezier(0.0, 0.7, 0.3, 1.0)';

      return (
        <div className="sandbox-canvas-wrapper" style={{ margin: '48px 0 16px 0', padding: '16px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px' }}>
          <div className="sandbox-title" style={{ fontSize: '0.75rem', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Friction Race
          </div>

          {/* Two lanes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {/* Ice lane */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0ea5e9', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                ❄️ Frictionless Ice
              </div>
              <div style={{
                background: 'linear-gradient(90deg, #e0f7fa, #b2ebf2)', borderRadius: '10px',
                height: '48px', position: 'relative', overflow: 'hidden', border: '1px solid #b2ebf2'
              }}>
                <div style={{
                  position: 'absolute', top: '10px', fontSize: '1.4rem', lineHeight: 1, zIndex: 2,
                  left: raceStarted ? '88%' : '4%', transition: iceTransition
                }}>📦</div>
              </div>
            </div>

            {/* Gravel lane */}
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#78716c', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                🪨 Rough Gravel
              </div>
              <div style={{
                background: 'repeating-linear-gradient(90deg, #d6d3d1, #d6d3d1 8px, #e7e5e4 8px, #e7e5e4 16px)',
                borderRadius: '10px', height: '48px', position: 'relative', overflow: 'hidden',
                border: '1px solid #d6d3d1'
              }}>
                <div style={{
                  position: 'absolute', top: '10px', fontSize: '1.4rem', lineHeight: 1, zIndex: 2,
                  left: raceStarted ? '35%' : '4%', transition: gravelTransition
                }}>📦</div>

                {/* Screech label */}
                {showScreech && (
                  <div style={{
                    position: 'absolute', top: '14px', left: '44%', fontSize: '0.7rem', fontWeight: 800,
                    background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '4px'
                  }}>
                    STOPPED! 🛑
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insight text */}
          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748b', textAlign: 'center', marginBottom: '12px', lineHeight: 1.5 }}>
            {raceStarted
              ? "❄️ No friction → crate keeps sliding! 🪨 Friction slows it down. That's Newton's First Law!"
              : 'Same crate, same push, different surfaces. What will happen?'}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {!raceStarted ? (
              <button
                onClick={handleRace}
                style={{
                  borderRadius: '30px', background: '#0284c7', color: '#fff', fontWeight: 750,
                  fontSize: '0.85rem', padding: '9px 24px', border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s ease', boxShadow: '0 3px 6px rgba(2,132,199,0.2)',
                  fontFamily: 'inherit'
                }}
              >
                Race! 🏁
              </button>
            ) : (
              <button
                onClick={handleResetRace}
                style={{
                  borderRadius: '30px', background: '#ffffff', color: '#475569', fontWeight: 700,
                  fontSize: '0.85rem', padding: '9px 24px', border: '1.5px solid #cbd5e1', cursor: 'pointer',
                  transition: 'all 0.2s ease', fontFamily: 'inherit'
                }}
              >
                Reset 🔄
              </button>
            )}
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
      {/* ── Card Header Navbar ── */}
      <div className="hw-card-header">
        <h3 className="hw-card-header-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 850, color: 'var(--text)' }}>
          {isInteractive ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0d9488', flexShrink: 0 }}>
              <rect x="3" y="9" width="14" height="12" rx="2" />
              <path d="M7 5h14v12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
          )}
          {getTopicName(step)}
        </h3>
        <div className="hw-card-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          {isInteractive ? "Interactive Sandbox" : "30-Second Recap"}
        </div>
      </div>

      <div className="hw-card-body">
        <div className="hw-notebook-sheet">
          <div className="hw-notebook-sheet-content">
            <div
              style={{ fontSize: '1.05rem', lineHeight: '1.75', marginBottom: '32px', color: '#475569' }}
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
