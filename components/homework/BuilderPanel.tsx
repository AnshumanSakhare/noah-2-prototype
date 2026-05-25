"use client";

import React, { useState, useEffect } from 'react';
import { useHomework, BuilderState } from './context';
import { subjects } from '../../data/subjects';
import { presets } from '../../data/presets';
import { students } from '../../data/students';
import { learningOutcomes } from '../../data/topics';
import { 
  Sparkles, 
  BookOpen, 
  Users, 
  User, 
  GraduationCap, 
  Sliders, 
  CheckCircle2, 
  ChevronDown, 
  AlertCircle,
  Compass,
  Trophy,
  Activity,
  FileText,
  Clock,
  Layers,
  CheckSquare,
  Check,
  Brain,
  Timer,
  Dumbbell,
  Target,
  Calculator
} from 'lucide-react';

interface BuilderPanelProps {
  onGenerate: () => void;
}

export const BuilderPanel: React.FC<BuilderPanelProps> = ({ onGenerate }) => {
  const { 
    builderState, 
    setBuilderState, 
    agentReady, 
    setAgentReady, 
    showToast,
    assignments
  } = useHomework();

  const [loadingAgent, setLoadingAgent] = useState<boolean>(false);
  const [agentStep, setAgentStep] = useState<number>(-1);
  const [openSteps, setOpenSteps] = useState<number[]>([1]);

  // Sync preset active state
  const getActivePresetId = () => {
    const isSpecific = builderState.type === 'specific';
    const match = presets.find(p => 
      builderState.diff === p.config.diff &&
      builderState.length === p.config.length &&
      builderState.format === p.config.format &&
      builderState.type === p.config.type &&
      (isSpecific ? !!builderState.student : !builderState.student)
    );
    return match ? match.id : null;
  };

  const activePresetId = getActivePresetId();

  const applyPreset = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;

    const newBuilder: BuilderState = {
      ...builderState,
      diff: preset.config.diff,
      length: preset.config.length,
      format: preset.config.format,
      type: preset.config.type,
      manual: false,
    };

    if (preset.config.type === 'specific') {
      setAgentReady(false); // Reset to show the beautiful connection animation every time!
      newBuilder.student = students[0].id;
      newBuilder.topics = [...students[0].weak];
      fetchProfileAgent(students[0].id);
    } else {
      newBuilder.student = null;
      newBuilder.topics = learningOutcomes.map(lo => lo.id);
      
      // Select preset in Step 2: close Step 1 (previous), keep Step 2 open, open Step 3!
      setOpenSteps(prev => {
        const next = new Set(prev);
        next.delete(1); // collapse Step 1
        next.add(2);    // keep Step 2 open
        next.add(3);    // open Step 3
        return Array.from(next);
      });
    }

    setBuilderState(newBuilder);
    showToast(`⚡ Preset '${preset.name}' applied!`);
  };

  const pickSubject = (id: string) => {
    setBuilderState(prev => ({
      ...prev,
      subject: id,
      topics: learningOutcomes.map(l => l.id),
    }));
    showToast(`📚 Subject changed to ${id.toUpperCase()}!`);
    
    // Select subject in Step 1: open Step 2, keep Step 1 open!
    setOpenSteps(prev => {
      const next = new Set(prev);
      next.add(2); // open Step 2 without closing Step 1
      return Array.from(next);
    });
  };

  const pickType = (type: 'general' | 'specific') => {
    if (type === 'general') {
      setBuilderState(prev => ({
        ...prev,
        type,
        student: null,
        manual: false,
        topics: learningOutcomes.map(l => l.id),
      }));
      showToast('🏫 Switched to Class-Wide Assignment');
      
      // Select General in Step 3: close Step 2 (previous), keep Step 3 open, open Step 4!
      setOpenSteps(prev => {
        const next = new Set(prev);
        next.delete(2); // collapse Step 2
        next.add(3);    // keep Step 3 open
        next.add(4);    // open Step 4
        return Array.from(next);
      });
    } else {
      setAgentReady(false); // Force connecting loading animation to play every single time!
      setBuilderState(prev => ({
        ...prev,
        type,
      }));
      fetchProfileAgent(students[0].id);
    }
  };

  const fetchProfileAgent = (defaultStudentId?: string) => {
    setLoadingAgent(true);
    setAgentStep(0);
    
    // Switch to Step 3 and open it
    setOpenSteps(prev => {
      const next = new Set(prev);
      next.delete(2); // collapse Step 2
      next.add(3);    // keep Step 3 open
      return Array.from(next);
    });
  };

  useEffect(() => {
    if (!loadingAgent) return;
    if (agentStep < 0) return;

    if (agentStep < 3) {
      const timer = setTimeout(() => {
        setAgentStep(prev => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setAgentReady(true);
      setLoadingAgent(false);
      const studentId = builderState.student || students[0].id;
      const s = students.find(x => x.id === studentId);
      setBuilderState(prev => ({
        ...prev,
        student: studentId,
        topics: s && !prev.manual ? [...s.weak] : prev.topics,
      }));
      showToast('🧠 Student Profile analysis complete!');
      
      // Profile Agent connection done in Step 3: close Step 2 (previous), keep Step 3 open, open Step 4!
      setOpenSteps(prev => {
        const next = new Set(prev);
        next.delete(2); // collapse Step 2
        next.add(3);    // keep Step 3 open
        next.add(4);    // open Step 4
        return Array.from(next);
      });
    }
  }, [loadingAgent, agentStep]);

  const selectStudent = (id: string) => {
    const s = students.find(x => x.id === id);
    if (!s) return;
    setBuilderState(prev => ({
      ...prev,
      student: id,
      topics: !prev.manual ? [...s.weak] : prev.topics,
    }));
    showToast(`🎯 Selected student: ${s.name}`);
    
    // Select Student in Step 3: close Step 2 (previous), keep Step 3 open, open Step 4!
    setOpenSteps(prev => {
      const next = new Set(prev);
      next.delete(2); // collapse Step 2
      next.add(3);    // keep Step 3 open
      next.add(4);    // open Step 4
      return Array.from(next);
    });
  };

  const toggleManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setBuilderState(prev => {
      const nextManual = checked;
      const s = prev.student ? students.find(x => x.id === prev.student) : null;
      return {
        ...prev,
        manual: nextManual,
        topics: !nextManual && s ? [...s.weak] : prev.topics,
      };
    });
  };

  const toggleTopic = (id: string) => {
    setBuilderState(prev => {
      let nextManual = prev.manual;
      if (prev.type === 'specific' && !prev.manual) {
        nextManual = true;
      }
      const activeTopics = [...prev.topics];
      const idx = activeTopics.indexOf(id);
      if (idx >= 0) {
        if (activeTopics.length > 1) {
          activeTopics.splice(idx, 1);
        } else {
          showToast('⚠️ Keep at least one topic selected!');
        }
      } else {
        activeTopics.push(id);
      }
      return {
        ...prev,
        manual: nextManual,
        topics: activeTopics,
      };
    });

    // Select/toggle topics in Step 4: close Step 3 (previous), keep Step 4 open, open Step 5!
    setOpenSteps(prev => {
      const next = new Set(prev);
      next.delete(3); // collapse Step 3
      next.add(4);    // keep Step 4 open
      next.add(5);    // open Step 5
      return Array.from(next);
    });
  };

  const pickDiff = (diff: 'easy' | 'medium' | 'hard' | 'adaptive') => {
    setBuilderState(prev => ({ ...prev, diff }));
  };

  const updateLen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const length = parseInt(e.target.value);
    setBuilderState(prev => ({ ...prev, length }));
  };

  const pickFormat = (format: 'journey' | 'questions') => {
    setBuilderState(prev => ({ ...prev, format }));
  };

  const activeStudent = builderState.student ? students.find(s => s.id === builderState.student) : null;
  const isAgentPicksOnly = builderState.type === 'specific' && !builderState.manual && activeStudent;

  // Get summaries for closed steps
  const getSelectedSubjectName = () => {
    return subjects.find(s => s.id === builderState.subject)?.name || builderState.subject;
  };

  const getPresetSummary = () => {
    if (!activePresetId) return 'No Template Applied';
    const pr = presets.find(p => p.id === activePresetId);
    return pr ? pr.name : 'Custom Setup';
  };

  const getWhoForSummary = () => {
    if (builderState.type === 'general') return 'Class-Wide Assignment';
    return activeStudent ? `Tailored for ${activeStudent.name}` : 'Personalized';
  };

  const getTopicsCountSummary = () => {
    return `${builderState.topics.length} topic${builderState.topics.length > 1 ? 's' : ''} selected`;
  };

  const getDetailsSummary = () => {
    const diffStr = builderState.diff.charAt(0).toUpperCase() + builderState.diff.slice(1);
    const flowStr = builderState.format === 'journey' ? 'Journey Flow' : 'Only Questions';
    return `${diffStr} · ${builderState.length} Qs · ${flowStr}`;
  };

  const toggleAccordion = (stepNum: number) => {
    setOpenSteps(prev => {
      if (prev.includes(stepNum)) {
        return prev.filter(x => x !== stepNum);
      } else {
        return [...prev, stepNum];
      }
    });
  };

  return (
    <div className="builder-screen show" id="builderScreen">
      <div className="builder-head">
        <h2>Homework Studio</h2>
        <p>Compile custom interactive student worksheets interleaved with recap sheets, flippable flashcards, physics micro-sandboxes, or adaptive question flows.</p>
      </div>

      <div className="builder-grid">
        <div className="builder-accordion-container">
          
          {/* STEP 1: SUBJECT SELECTION */}
          <div className={`builder-panel saas-accordion-panel ${openSteps.includes(1) ? 'expanded' : 'collapsed'}`}>
            <div className="panel-header" onClick={() => toggleAccordion(1)}>
              <div className="bp-step-label">
                <span className="bp-num">1</span>
                <span>Select Subject</span>
              </div>
              <div className="panel-header-right">
                {!openSteps.includes(1) && <span className="collapsed-summary">{getSelectedSubjectName()}</span>}
                <ChevronDown size={18} className="arrow-icon" />
              </div>
            </div>
            
            <div className="panel-content">
              <h3 className="step-title-lg">Academic Subject</h3>
              <div className="bp-sub">Select the core subject focus for tonight's assignments.</div>
              <div className="subject-grid">
                {subjects.map(s => {
                  const sel = builderState.subject === s.id;
                  const cs = s.comingSoon ? 'coming-soon' : '';
                  return (
                    <div 
                      key={s.id} 
                      className={`subject-card ${sel ? 'selected' : ''} ${cs}`}
                      style={{ position: 'relative' }}
                      onClick={() => !s.comingSoon && pickSubject(s.id)}
                    >
                      {sel && (
                        <div className="sc-check-badge">
                          <Check size={14} className="stroke-[3]" />
                        </div>
                      )}
                      <span className="sc-icon">
                        {s.id === 'science' ? (
                          <Compass size={28} className="sc-lucide-icon text-accent" />
                        ) : s.id === 'math' ? (
                          <Calculator size={28} className="sc-lucide-icon" style={{ color: 'var(--text-dim)' }} />
                        ) : (
                          <BookOpen size={28} className="sc-lucide-icon" style={{ color: 'var(--text-dim)' }} />
                        )}
                      </span>
                      <div className="sc-name">{s.name}</div>
                      {s.comingSoon && <span className="sc-soon">Coming soon</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 2: QUICK PRESETS */}
          <div className={`builder-panel saas-accordion-panel ${openSteps.includes(2) ? 'expanded' : 'collapsed'}`}>
            <div className="panel-header" onClick={() => toggleAccordion(2)}>
              <div className="bp-step-label">
                <span className="bp-num">2</span>
                <span>Worksheet Templates</span>
              </div>
              <div className="panel-header-right">
                {!openSteps.includes(2) && <span className="collapsed-summary">{getPresetSummary()}</span>}
                <ChevronDown size={18} className="arrow-icon" />
              </div>
            </div>
            
            <div className="panel-content">
              <h3 className="step-title-lg">⚡ Quick Presets</h3>
              <div className="bp-sub">Configure difficulty, length, format, and topics instantly with one click.</div>
              <div className="presets-grid">
                {presets.filter(p => p.config.type === builderState.type).map(p => {
                  const sel = activePresetId === p.id;
                  
                  // Map dynamic premium icons
                  let PresetIcon = Sparkles;
                  if (p.id === 'quick-check') PresetIcon = Sparkles;
                  else if (p.id === 'deep-dive') PresetIcon = Brain;
                  else if (p.id === 'revision-sprint') PresetIcon = Timer;
                  else if (p.id === 'warmup') PresetIcon = Dumbbell;
                  else if (p.id === 'class-challenge') PresetIcon = Trophy;
                  else if (p.id === 'weakness-recovery') PresetIcon = Target;
                  else if (p.id === 'concept-reinforcer') PresetIcon = Layers;
                  else if (p.id === 'mastery-recovery') PresetIcon = Trophy;
                  else if (p.id === 'adaptive-remedial') PresetIcon = Activity;
                  else if (p.id === 'quick-refresher') PresetIcon = Clock;

                  return (
                    <div 
                      key={p.id} 
                      className={`preset-card ${sel ? 'selected' : ''}`}
                      onClick={() => applyPreset(p.id)}
                      style={{ position: 'relative' }}
                    >
                      {sel && (
                        <div className="sc-check-badge">
                          <Check size={14} className="stroke-[3]" />
                        </div>
                      )}
                      <div className="preset-card-header">
                        <PresetIcon size={18} className="text-accent" style={{ marginRight: '8px', flexShrink: 0 }} />
                        <div className="pc-title">{p.name}</div>
                      </div>
                      <div className="pc-desc">{p.description}</div>
                      <span className={`preset-tag ${builderState.type === 'general' ? 'class-wide' : 'targeted'}`}>
                        <Users size={10} style={{ marginRight: '4px', display: 'inline' }} />
                        {builderState.type === 'general' ? 'Class-Wide' : 'Personalized'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 3: HOMEWORK TYPE & AUDIENCE */}
          <div className={`builder-panel saas-accordion-panel ${openSteps.includes(3) ? 'expanded' : 'collapsed'}`}>
            <div className="panel-header" onClick={() => toggleAccordion(3)}>
              <div className="bp-step-label">
                <span className="bp-num">3</span>
                <span>Who is this for?</span>
              </div>
              <div className="panel-header-right">
                {!openSteps.includes(3) && <span className="collapsed-summary">{getWhoForSummary()}</span>}
                <ChevronDown size={18} className="arrow-icon" />
              </div>
            </div>
            
            <div className="panel-content">
              <h3 className="step-title-lg">Homework Type</h3>
              <div className="bp-sub">General covers the whole class. Personalized targets one student's weak spots using the Profile Agent.</div>
              
              <div className="hw-type-grid">
                <div 
                  className={`hw-type-card ${builderState.type === 'general' ? 'selected' : ''}`}
                  onClick={() => pickType('general')}
                >
                  {builderState.type === 'general' && (
                    <div className="sc-check-badge">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  )}
                  <span className="htc-icon-wrapper">
                    <Users size={20} className="text-accent" />
                  </span>
                  <div className="htc-title">General Homework</div>
                  <div className="htc-desc">One set for the whole class. You choose the topics and depth.</div>
                </div>
                <div 
                  className={`hw-type-card ${builderState.type === 'specific' ? 'selected' : ''}`}
                  onClick={() => pickType('specific')}
                >
                  {builderState.type === 'specific' && (
                    <div className="sc-check-badge">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  )}
                  <span className="htc-icon-wrapper">
                    <User size={20} className="text-violet" style={{ color: 'var(--accent-2)' }} />
                  </span>
                  <div className="htc-title">Personalized Homework</div>
                  <div className="htc-desc">A tailored set for one student, focused on what they're struggling with.</div>
                </div>
              </div>

              {/* Profile Agent Connections & Extraction Drawer */}
              <div className={`source-block ${builderState.type === 'specific' ? 'show' : ''}`}>
                <h4>Student Profile Agent Extraction</h4>
                
                {loadingAgent && (
                  <div className="agent-fetch show">
                    <div className="agent-orb-sm bg-violet">
                      <Activity size={18} color="#fff" />
                    </div>
                    <div className="af-text">
                      <div className="af-title">Student Profile Agent <span className="agent-badge">analyzing</span></div>
                      <div className="af-status">
                        {agentStep === 0 && 'Connecting to agent databases…'}
                        {agentStep === 1 && 'Loading student outcome memories…'}
                        {agentStep === 2 && 'Ingesting previous quiz scores…'}
                        {agentStep === 3 && `Compiled strength profiles!`}
                        <span className="af-dots"><span></span><span></span><span></span></span>
                      </div>
                      <div className="af-progress">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <span key={idx} className={`af-step ${agentStep > idx ? 'done' : ''}`}>
                            <span className="af-check">✓</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {agentReady && !loadingAgent && (
                  <div className="student-list-wrap show">
                    <h4 style={{ marginBottom: '10px' }}>Select Student to Model</h4>
                    <div id="studentList" className="student-dashboard-list">
                      {students.map(s => {
                        const sel = builderState.student === s.id;
                        return (
                          <div 
                            key={s.id} 
                            className={`student-pick-card ${sel ? 'selected' : ''}`}
                            onClick={() => selectStudent(s.id)}
                          >
                            <div className="sp-card-header">
                              <div className="sp-avatar" style={{ backgroundColor: s.color }}>
                                {s.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="sp-card-info">
                                <div className="sp-name">{s.name}</div>
                                <div className="sp-detail">{s.detail}</div>
                              </div>
                              <span className={`sp-tag-badge ${s.tag}`}>{s.tagLabel}</span>
                            </div>
                            
                            <div className="sp-profile">
                              <div className="sp-profile-inner">
                                <div className="sp-pills">
                                  {s.strong.map(topicId => {
                                    const label = learningOutcomes.find(lo => lo.id === topicId)?.short || topicId;
                                    return <span key={topicId} className="sp-pill strong">💪 {label}</span>;
                                  })}
                                  {s.weak.map(topicId => {
                                    const label = learningOutcomes.find(lo => lo.id === topicId)?.short || topicId;
                                    return <span key={topicId} className="sp-pill weak">⚠️ {label}</span>;
                                  })}
                                </div>
                                <div className="sp-memory">
                                  <span className="spm-ico"><Layers size={14} className="text-violet" /></span>
                                  <span><strong>Behavioral Insight:</strong> {s.memory}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <label className="manual-toggle-checkbox">
                      <input 
                        type="checkbox" 
                        checked={builderState.manual} 
                        onChange={toggleManual} 
                      />
                      <span>Override the agent — I'll choose topics myself</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 4: LEARNING TOPICS */}
          <div className={`builder-panel saas-accordion-panel ${openSteps.includes(4) ? 'expanded' : 'collapsed'}`}>
            <div className="panel-header" onClick={() => toggleAccordion(4)}>
              <div className="bp-step-label">
                <span className="bp-num">4</span>
                <span>Select Learning Topics</span>
              </div>
              <div className="panel-header-right">
                {!openSteps.includes(4) && <span className="collapsed-summary">{getTopicsCountSummary()}</span>}
                <ChevronDown size={18} className="arrow-icon" />
              </div>
            </div>
            
            <div className="panel-content">
              <h3 className="step-title-lg">Science Curriculum Objectives</h3>
              <div className="bp-sub">
                {builderState.type === 'specific' && !builderState.manual
                  ? `Auto-selected by the Profile Agent from ${activeStudent?.name || 'student'}'s weak areas.`
                  : "Check the curriculum chapters to compile into tonight's custom assignment."}
              </div>
              
              <div className="topic-chips">
                {learningOutcomes.map(lo => {
                  const sel = builderState.topics.includes(lo.id);
                  const isAuto = isAgentPicksOnly && activeStudent && activeStudent.weak.includes(lo.id);
                  return (
                    <div 
                      key={lo.id} 
                      className={`topic-chip ${sel ? 'selected' : ''}`}
                      onClick={() => toggleTopic(lo.id)}
                    >
                      <span className="tc-box">
                        {sel && <Check size={10} className="stroke-[3]" />}
                      </span>
                      <span>{lo.name}</span>
                      {isAuto && <span className="tc-auto">agent pick</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 5: WORKSHEET PARAMETERS & FLOW */}
          <div className={`builder-panel saas-accordion-panel ${openSteps.includes(5) ? 'expanded' : 'collapsed'}`}>
            <div className="panel-header" onClick={() => toggleAccordion(5)}>
              <div className="bp-step-label">
                <span className="bp-num">5</span>
                <span>Worksheet Parameters & Flow</span>
              </div>
              <div className="panel-header-right">
                {!openSteps.includes(5) && <span className="collapsed-summary">{getDetailsSummary()}</span>}
                <ChevronDown size={18} className="arrow-icon" />
              </div>
            </div>
            
            <div className="panel-content">
              <h3>Difficulty Threshold</h3>
              <div className="bp-sub">Select the questions difficulty target. "Adaptive" adjusts difficulty live to student accuracy.</div>
              
              <div className="diff-seg" style={{ marginBottom: '20px' }}>
                {(['easy', 'medium', 'hard', 'adaptive'] as const).map(d => (
                  <button 
                    key={d} 
                    className={`diff-opt ${builderState.diff === d ? 'active' : ''}`}
                    onClick={() => pickDiff(d)}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              
              <h3>Worksheet Length</h3>
              <div className="bp-sub">Adjust number of core test questions included.</div>
              <div className="len-row" style={{ marginBottom: '26px' }}>
                <input 
                  type="range" 
                  min="3" 
                  max="10" 
                  value={builderState.length} 
                  step="1" 
                  className="len-slider" 
                  onChange={updateLen} 
                />
                <span className="len-val" style={{ color: 'var(--accent)' }}>{builderState.length} Questions</span>
              </div>

              <h3>Compilation Layout Flow</h3>
              <div className="bp-sub">"Interactive Journey" weaves slides, physics simulations & flashcards. "Only Questions" is a quick test.</div>
              
              <div className="diff-seg" style={{ maxWidth: '380px' }}>
                <button 
                  className={`diff-opt ${builderState.format === 'journey' ? 'active' : ''}`}
                  onClick={() => pickFormat('journey')}
                >
                  Interactive Journey
                </button>
                <button 
                  className={`diff-opt ${builderState.format === 'questions' ? 'active' : ''}`}
                  onClick={() => pickFormat('questions')}
                >
                  Only Questions
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right sticky recipe panel */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <RecipePanel onGenerate={onGenerate} />
        </div>
      </div>
    </div>
  );
};

// Sub-component for Sticky Recipe panel
const RecipePanel: React.FC<{ onGenerate: () => void }> = ({ onGenerate }) => {
  const { builderState } = useHomework();
  const subjectName = subjects.find(s => s.id === builderState.subject)?.name || builderState.subject;
  const activeStudentName = builderState.student ? students.find(s => s.id === builderState.student)?.name : '';

  // Estimate time
  const getEstTime = () => {
    if (builderState.format === 'questions') {
      return Math.round(builderState.length * 1.2);
    } else {
      const contentSteps = builderState.topics.length * 2; // recap + flash per topic
      return Math.round(contentSteps * 0.5 + builderState.length * 1.2);
    }
  };

  return (
    <div className="recipe-card saas-recipe-card">
      <h3>
        <FileText size={16} className="text-indigo" style={{ marginRight: '6px' }} />
        Worksheet Compiler Details
      </h3>
      
      <div className="recipe-row">
        <span className="rr-ico"><Compass size={14} className="text-dim" /></span>
        <span>Subject</span>
        <span className="rr-val">{subjectName}</span>
      </div>
      <div className="recipe-row">
        <span className="rr-ico"><Users size={14} className="text-dim" /></span>
        <span>Type</span>
        <span className="rr-val">{builderState.type === 'general' ? 'Class-Wide' : 'Personalized'}</span>
      </div>
      {builderState.type === 'specific' && (
        <div className="recipe-row">
          <span className="rr-ico"><User size={14} className="text-dim" /></span>
          <span>Target Student</span>
          <span className="rr-val text-violet">{activeStudentName || '—'}</span>
        </div>
      )}
      <div className="recipe-row">
        <span className="rr-ico"><Layers size={14} className="text-dim" /></span>
        <span>Selected Objectives</span>
        <span className="rr-val">{builderState.topics.length} Areas</span>
      </div>
      <div className="recipe-row">
        <span className="rr-ico"><Sliders size={14} className="text-dim" /></span>
        <span>Difficulty Target</span>
        <span className="rr-val text-indigo" style={{ textTransform: 'capitalize' }}>{builderState.diff}</span>
      </div>
      <div className="recipe-row">
        <span className="rr-ico"><Activity size={14} className="text-dim" /></span>
        <span>Format Flow</span>
        <span className="rr-val">{builderState.format === 'questions' ? 'Only Questions' : 'Journey Roadmap'}</span>
      </div>
      <div className="recipe-row">
        <span className="rr-ico"><CheckSquare size={14} className="text-dim" /></span>
        <span>Test Questions</span>
        <span className="rr-val">{builderState.length} Questions</span>
      </div>
      <div className="recipe-row">
        <span className="rr-ico"><Clock size={14} className="text-dim" /></span>
        <span>Est. Student Run</span>
        <span className="rr-val text-bold font-mono text-indigo">~{getEstTime()} Min</span>
      </div>
      
      <button className="generate-btn saas-primary-btn" onClick={onGenerate}>
        <Sparkles size={16} style={{ marginRight: '8px' }} />
        Compile Homework Journey
      </button>
      <div className="recipe-hint">Personalized workbook compiles in ~3 seconds.</div>
    </div>
  );
};
export default BuilderPanel;
