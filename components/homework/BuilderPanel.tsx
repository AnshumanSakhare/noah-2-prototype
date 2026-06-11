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
  ChevronDown, 
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
  Calculator,
  Lock
} from 'lucide-react';
import mathTopics from '../../data/topic-grade_question_count.json';

const getMathTopicId = (topicName: string, gradeName: string): string => {
  return topicName;
};

interface BuilderPanelProps {
  onGenerate: () => void;
  activeTab: 'dynamic' | 'templates' | 'analytics';
  setActiveTab: (tab: 'dynamic' | 'templates' | 'analytics') => void;
}

export const BuilderPanel: React.FC<BuilderPanelProps> = ({ 
  onGenerate,
  activeTab,
  setActiveTab
}) => {
  const { 
    builderState, 
    setBuilderState, 
    agentReady, 
    setAgentReady, 
    showToast,
    assignments,
    selectedMathGrade,
    topicDbCounts,
  } = useHomework();

  const [loadingAgent, setLoadingAgent] = useState<boolean>(false);
  const [agentStep, setAgentStep] = useState<number>(-1);
  const [currentStep, setCurrentStep] = useState<number>(1);

  const getDefaultMathTopic = (grade: string): string => {
    const nextTopics = (mathTopics as any[])
      .filter(t => t.grade === grade)
      .map(t => getMathTopicId(t.topic, t.grade))
      .filter(tId => tId !== null) as string[];
    
    const defaultTopic = nextTopics.find(t => (topicDbCounts[t] || 0) > 0) || nextTopics[0] || '';
    return defaultTopic;
  };

  // Sync Math topics for the selected grade automatically to prevent Science leak
  useEffect(() => {
    if (builderState.subject === 'math') {
      const defaultTopic = getDefaultMathTopic(selectedMathGrade);
      setBuilderState(prev => ({
        ...prev,
        topics: defaultTopic ? [defaultTopic] : []
      }));
    }
  }, [builderState.subject, selectedMathGrade, topicDbCounts]);

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
      
      const defaultTopic = getDefaultMathTopic(selectedMathGrade);
      newBuilder.topics = builderState.subject === 'math' ? (defaultTopic ? [defaultTopic] : []) : [...students[0].weak];
      fetchProfileAgent(students[0].id);
    } else {
      newBuilder.student = null;
      
      const defaultTopic = getDefaultMathTopic(selectedMathGrade);
      newBuilder.topics = builderState.subject === 'math' ? (defaultTopic ? [defaultTopic] : []) : learningOutcomes.map(lo => lo.id);
    }

    setBuilderState(newBuilder);
    showToast(`⚡ Preset '${preset.name}' applied!`);
  };

  const pickSubject = (id: string) => {
    const nextTopics = id === 'science' 
      ? learningOutcomes.map(l => l.id) 
      : (() => {
          const defaultTopic = getDefaultMathTopic(selectedMathGrade);
          return defaultTopic ? [defaultTopic] : [];
        })();

    setBuilderState(prev => ({
      ...prev,
      subject: id,
      topics: nextTopics,
    }));
    showToast(`📚 Subject changed to ${id.toUpperCase()}!`);
  };

  const pickType = (type: 'general' | 'specific') => {
    if (type === 'general') {
      const nextTopics = builderState.subject === 'math'
        ? (() => {
            const defaultTopic = getDefaultMathTopic(selectedMathGrade);
            return defaultTopic ? [defaultTopic] : [];
          })()
        : learningOutcomes.map(l => l.id);

      setBuilderState(prev => ({
        ...prev,
        type,
        student: null,
        manual: false,
        topics: nextTopics,
      }));
      showToast('🏫 Switched to Class-Wide Assignment');
      setCurrentStep(3); // Auto-advance to Step 3
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

      const nextTopics = builderState.subject === 'math'
        ? (() => {
            const defaultTopic = getDefaultMathTopic(selectedMathGrade);
            return defaultTopic ? [defaultTopic] : [];
          })()
        : s && !builderState.manual ? [...s.weak] : builderState.topics;

      setBuilderState(prev => ({
        ...prev,
        student: studentId,
        topics: nextTopics,
      }));
      showToast('🧠 Student Profile analysis complete!');
    }
  }, [loadingAgent, agentStep]);

  const selectStudent = (id: string) => {
    const s = students.find(x => x.id === id);
    if (!s) return;

    const nextTopics = builderState.subject === 'math'
      ? (() => {
          const defaultTopic = getDefaultMathTopic(selectedMathGrade);
          return defaultTopic ? [defaultTopic] : [];
        })()
      : !builderState.manual ? [...s.weak] : builderState.topics;

    setBuilderState(prev => ({
      ...prev,
      student: id,
      topics: nextTopics,
    }));
    showToast(`🎯 Selected student: ${s.name}`);
  };

  const toggleManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setBuilderState(prev => {
      const nextManual = checked;
      const s = prev.student ? students.find(x => x.id === prev.student) : null;
      return {
        ...prev,
        manual: nextManual,
        topics: !nextManual && s && prev.subject !== 'math' ? [...s.weak] : prev.topics,
      };
    });
  };

  const toggleTopic = (id: string) => {
    setBuilderState(prev => {
      let nextManual = prev.manual;
      if (prev.type === 'specific' && !prev.manual) {
        nextManual = true;
      }
      if (prev.subject === 'math') {
        return {
          ...prev,
          manual: nextManual,
          topics: [id],
        };
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

  return (
    <div className="builder-screen show" id="builderScreen">
      {/* Dynamic Tab / Template Tab toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <div className="builder-tab-toggle">
          <button 
            className={`tab-toggle-btn ${activeTab === 'dynamic' ? 'active' : ''}`}
            onClick={() => setActiveTab('dynamic')}
          >
            Dynamic Builder
          </button>
          <button 
            className={`tab-toggle-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Worksheet Templates
          </button>
        </div>
      </div>

      <style>{`
        /* ─── Premium Custom CSS (Optimized for Screen Height) ─── */
        
        /* Complete Screen Height fitting without scrollbars */
        .homework-studio {
          overflow-x: hidden !important;
        }
        .homework-studio:has(.builder-screen) {
          overflow: hidden !important;
          height: 100vh !important;
          max-height: 100vh !important;
        }
        .homework-studio:has(.builder-screen) .hw-layout-container {
          overflow: visible !important;
          height: 100vh !important;
          max-height: 100vh !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        
        /* Layout overrides to fit screen height perfectly */
        .app-mode-bar-flat-sticky {
          padding: 10px 40px !important;
          margin-bottom: 16px !important;
        }

        /* ─── Step 1: Vertical Subject Cards (Upgrade & Centered) ─── */
        .homework-studio .subject-grid {
          display: flex;
          justify-content: center; /* Center horizontally! */
          gap: 20px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
        .homework-studio .subject-card {
          flex: 1;
          min-width: 130px;
          max-width: 170px;
          height: 170px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px 14px !important;
          gap: 12px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.015);
        }
        .homework-studio .subject-card .sc-icon {
          font-size: 2.6rem;
          margin-bottom: 4px;
        }
        .homework-studio .subject-card .sc-name {
          font-size: 1.05rem;
          font-weight: 850;
        }

        /* ─── Step 2: Vertical Homework Type Cards (Upgrade & Centered) ─── */
        .homework-studio .hw-type-grid {
          display: flex;
          justify-content: center; /* Center horizontally! */
          gap: 24px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .homework-studio .hw-type-card {
          flex: 1;
          min-width: 180px;
          max-width: 250px !important; /* Cap width to center nicely without stretching! */
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          justify-content: center;
          padding: 24px 20px !important;
          height: 170px !important;
          border-radius: 16px;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.015);
        }
        .homework-studio .hw-type-card .htc-icon-wrapper {
          width: 44px !important;
          height: 44px !important;
          border-radius: 50% !important;
          background: rgba(42, 77, 215, 0.05) !important;
          display: grid !important;
          place-items: center !important;
          margin-bottom: 6px !important;
          transition: all 0.2s !important;
          flex-shrink: 0 !important;
        }
        .homework-studio .hw-type-card.selected .htc-icon-wrapper {
          background: #ffffff;
        }
        .homework-studio .hw-type-card .htc-title {
          font-size: 1.05rem;
          font-weight: 850;
          margin: 0;
        }
        .homework-studio .hw-type-card .htc-desc {
          font-size: 0.76rem;
          line-height: 1.45;
          margin: 0;
          max-width: 280px;
        }
        
        .builder-tab-toggle {
          display: inline-flex;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 12px;
          padding: 4px;
          border: 1px solid rgba(196, 197, 215, 0.25);
        }
        .tab-toggle-btn {
          padding: 8px 20px;
          font-size: 0.85rem;
          font-weight: 750;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
        }
        .tab-toggle-btn.active {
          background: #ffffff;
          color: var(--accent);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
        }

        /* ─── Stepper ─── */
        .amb-stepper-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding: 10px 32px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(196, 197, 215, 0.2);
        }
        .stepper-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          user-select: none;
          position: relative;
          z-index: 2;
        }
        .node-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
          color: #64748b;
          display: grid;
          place-items: center;
          font-size: 0.85rem;
          font-weight: 800;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .node-label {
          font-size: 0.78rem;
          font-weight: 750;
          color: #64748b;
          transition: all 0.3s;
          font-family: 'Nunito', sans-serif;
        }
        .stepper-node.active .node-circle {
          background: rgba(42, 77, 215, 0.05);
          border-color: var(--accent, #3b82f6);
          color: var(--accent, #3b82f6);
          transform: scale(1.1);
        }
        .stepper-node.active .node-label {
          color: var(--accent, #3b82f6);
          font-weight: 850;
        }
        .stepper-node.completed .node-circle {
          background: #10b981;
          border-color: #10b981;
          color: #ffffff;
        }
        .stepper-node.completed .node-label {
          color: #10b981;
        }
        .stepper-line {
          flex: 1;
          height: 3px;
          background: #e2e8f0;
          margin: 0 16px;
          border-radius: 2px;
          position: relative;
          top: -12px;
          z-index: 1;
          transition: all 0.3s;
        }
        .stepper-line.completed {
          background: #10b981;
        }

        /* ─── Wizard Card ─── */
        .wizard-step-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(196, 197, 215, 0.2);
          padding: 20px 24px;
          margin-bottom: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.015);
          min-height: auto !important;
          height: 430px !important;
          max-height: 430px !important;
          overflow-y: auto !important;
        }
        .templates-tab-container .wizard-step-card {
          height: 550px !important;
          max-height: 550px !important;
          overflow-y: auto !important;
        }
        .step-content-pane {
          animation: kg-slidein 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        /* ─── Footer Nav ─── */
        .wizard-navigation-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }
        .wizard-navigation-footer .nav-btn {
          padding: 8px 20px;
          font-size: 0.85rem;
          font-weight: 750;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
        }
        .wizard-navigation-footer .nav-btn.primary {
          background: var(--accent);
          color: #ffffff;
          border: none;
          margin-left: auto;
        }
        .wizard-navigation-footer .nav-btn.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(42, 77, 215, 0.2);
        }
        .wizard-navigation-footer .nav-btn.primary:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .wizard-navigation-footer .nav-btn.secondary {
          background: transparent;
          border: 1.5px solid rgba(196, 197, 215, 0.45);
          color: var(--text-dim);
        }
        .wizard-navigation-footer .nav-btn.secondary:hover {
          background: rgba(0, 0, 0, 0.02);
          border-color: var(--text);
          color: var(--text);
        }

        /* Scrollable student list to fit screen height */
        .student-dashboard-list {
          max-height: 180px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 4px;
        }

        /* ─── Math capsules with faint highlights ─── */
        .math-capsules-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
          padding: 6px;
        }
        .math-capsule-item {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(42, 77, 215, 0.03);
          border: 1px solid rgba(196, 197, 215, 0.08);
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 0.81rem;
          font-weight: 650;
          color: var(--text);
          cursor: not-allowed;
          user-select: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .math-capsule-item:hover {
          background: rgba(42, 77, 215, 0.08);
          border-color: rgba(42, 77, 215, 0.18);
          transform: translateY(-1.5px);
          box-shadow: 0 4px 12px rgba(42, 77, 215, 0.08);
        }
        .math-capsule-item.unlocked {
          cursor: pointer !important;
          background: rgba(42, 77, 215, 0.07) !important;
          border: 1.5px solid rgba(42, 77, 215, 0.28) !important;
          box-shadow: 0 2px 8px rgba(42, 77, 215, 0.04);
        }
        .math-capsule-item.unlocked:hover {
          background: rgba(42, 77, 215, 0.1) !important;
          border-color: rgba(42, 77, 215, 0.4) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(42, 77, 215, 0.12);
        }
        .math-capsule-item.unlocked.selected {
          background: var(--accent) !important;
          border-color: var(--accent) !important;
          color: #ffffff !important;
        }
        .math-capsule-item.unlocked.selected span {
          color: #ffffff !important;
        }
        .math-capsule-item.unlocked.selected .mc-pill {
          color: #ffffff !important;
          background: rgba(255, 255, 255, 0.15) !important;
        }

        /* ─── Premium Visual Parameters Layout ─── */
        .params-visual-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1.3fr;
          gap: 20px;
          width: 100%;
          margin-top: 10px;
        }
        .param-panel-card {
          background: rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(196, 197, 215, 0.2);
          border-radius: 16px;
          padding: 12px 16px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-height: auto !important;
          height: 220px !important;
          justify-content: flex-start;
        }
        .ppc-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(42, 77, 215, 0.06);
          color: var(--accent);
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }
        .param-panel-card h4 {
          font-size: 0.92rem;
          font-weight: 800;
          margin: 0 0 12px 0;
          color: var(--text);
        }
        .ppc-options-stack {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .ppc-opt-btn {
          width: 100%;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(196, 197, 215, 0.3);
          background: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ppc-opt-btn:hover {
          background: rgba(0,0,0,0.01);
          border-color: rgba(42, 77, 215, 0.3);
        }
        .ppc-opt-btn.active {
          background: rgba(42, 77, 215, 0.05);
          border-color: var(--accent);
          color: var(--accent);
        }
        .dot-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: all 0.2s;
        }
        .ppc-opt-btn.active .dot-indicator {
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
        }
        .ppc-slider-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          justify-content: center;
          gap: 8px;
        }
        .slider-value-display {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--accent);
          font-family: monospace;
          margin-bottom: 4px;
        }
        .ppc-range-slider {
          width: 100%;
          accent-color: var(--accent);
        }
        .slider-ticks {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 0.72rem;
          color: var(--text-dim);
          font-weight: 700;
        }
        .ppc-flow-selectors {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .flow-tile {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1.5px solid rgba(196, 197, 215, 0.25);
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .flow-tile:hover {
          border-color: rgba(42, 77, 215, 0.3);
        }
        .flow-tile.active {
          border-color: var(--accent);
          background: rgba(42, 77, 215, 0.04);
        }
        .flow-tile h5 {
          font-size: 0.8rem;
          font-weight: 800;
          margin: 0 0 2px 0;
          color: var(--text);
        }
        .flow-tile p {
          font-size: 0.68rem;
          color: var(--text-dim);
          margin: 0;
          line-height: 1.3;
        }

        /* Tooltip details */
        .math-capsule-tooltip {
          position: absolute;
          bottom: 128%;
          left: 50%;
          transform: translateX(-50%) translateY(6px);
          background: #1e293b;
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
          z-index: 99;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .math-capsule-tooltip::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #1e293b transparent transparent transparent;
        }
        .math-capsule-item:hover .math-capsule-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .mc-pill {
          background: rgba(255, 255, 255, 0.1);
          padding: 1px 5px;
          border-radius: 4px;
        }

        /* ─── Edit Details button ─── */
        .edit-details-secondary-btn {
          background: transparent !important;
          border: 1.5px solid rgba(196, 197, 215, 0.5) !important;
          color: var(--text-dim) !important;
          padding: 10px 20px !important;
          border-radius: 10px !important;
          font-size: 0.85rem !important;
          font-weight: 700 !important;
          width: 100% !important;
          margin-top: 10px !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          text-align: center !important;
        }
        .edit-details-secondary-btn:hover {
          background: rgba(0, 0, 0, 0.02) !important;
          border-color: rgba(196, 197, 215, 0.8) !important;
          color: var(--text) !important;
        }

        /* ─── Centered Step Titles & Subtitles ─── */
        .homework-studio .step-title-lg {
          text-align: center !important;
        }
        .homework-studio .bp-sub {
          text-align: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        /* ─── Screen height scroll limitations for capsules & chips ─── */
        .math-capsules-container, .topic-chips {
          max-height: 220px !important;
          overflow-y: auto !important;
          padding-right: 4px;
        }

        /* ─── Compact Horizontal Student Cards Deck (Upgrade) ─── */
        .student-dashboard-list {
          display: flex !important;
          flex-direction: row !important;
          justify-content: center;
          gap: 12px !important;
          max-height: none !important;
          margin-top: 12px !important;
          width: 100%;
          padding-bottom: 4px;
        }
        .student-pick-card {
          flex: 1;
          max-width: 210px !important;
          padding: 10px 14px !important;
          min-height: 68px !important;
          height: auto !important;
          overflow: hidden !important;
          border-radius: 12px !important;
          border: 1px solid var(--border) !important;
          background: var(--surface) !important;
          transition: all 0.2s;
        }
        .student-pick-card.selected {
          border: 2px solid var(--accent) !important;
          background: var(--accent-glow) !important;
        }
        .student-pick-card .sp-card-header {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .student-pick-card .sp-avatar {
          width: 32px !important;
          height: 32px !important;
          font-size: 0.8rem !important;
          border-radius: 50% !important;
          flex-shrink: 0 !important;
        }
        .student-pick-card .sp-card-info {
          flex: 1;
          text-align: left;
        }
        .student-pick-card .sp-name {
          font-size: 0.8rem !important;
          font-weight: 850 !important;
          line-height: 1.1;
          color: var(--text);
        }
        .student-pick-card .sp-detail {
          font-size: 0.64rem !important;
          color: var(--text-dim);
          margin-top: 1px;
        }
        .student-pick-card .sp-tag-badge {
          font-size: 0.58rem !important;
          padding: 1px 6px !important;
          border-radius: 8px !important;
          border: 1px solid transparent !important;
        }
        .student-pick-card .sp-tag-badge.weak { background: rgba(217,74,74,.08); color: var(--wrong); border-color: rgba(217,74,74,0.15); }
        .student-pick-card .sp-tag-badge.mid { background: rgba(212,160,60,.12); color: #b08828; border-color: rgba(212,160,60,0.15); }
        .student-pick-card .sp-tag-badge.strong { background: var(--correct-bg); color: var(--correct); border-color: rgba(59,170,111,0.15); }
        /* Fully disable expanding profiles in step 2 list */
        .student-pick-card .sp-profile {
          display: none !important;
        }

        /* ─── Premium Symmetrical Three-Column Recipe Grid ─── */
        .recipe-grid-three-col {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px 14px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(196, 197, 215, 0.25);
          padding-bottom: 16px;
        }
        .recipe-grid-three-col .recipe-row {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          border-bottom: none !important;
          padding: 8px 12px !important;
          background: rgba(248, 250, 252, 0.6) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(226, 232, 240, 0.85) !important;
          transition: all 0.2s ease-in-out;
          gap: 3px !important;
          min-height: 56px;
        }
        .recipe-grid-three-col .recipe-row:hover {
          background: rgba(241, 245, 249, 0.9) !important;
          border-color: rgba(203, 213, 225, 0.9) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
        }
        .recipe-grid-three-col .recipe-row .rr-label-wrapper {
          display: flex !important;
          align-items: center !important;
          color: var(--text-dim) !important;
          font-size: 0.65rem !important;
          font-weight: 750 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        .recipe-grid-three-col .recipe-row .rr-val {
          margin-left: 0 !important;
          font-size: 0.82rem !important;
          font-weight: 850 !important;
          color: var(--text) !important;
        }
        .homework-studio .saas-recipe-card {
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          border-radius: 20px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
          padding: 24px !important;
          background: #ffffff !important;
        }
        .homework-studio .saas-recipe-card h3 {
          font-size: 0.95rem !important;
          font-weight: 850 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: #1e293b !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          border-bottom: 2px solid rgba(99, 102, 241, 0.1) !important;
          padding-bottom: 12px !important;
          margin-bottom: 18px !important;
        }
        .recipe-actions-row {
          display: flex !important;
          align-items: center !important;
          gap: 16px !important;
          width: 100% !important;
          margin-top: 20px !important;
        }
        .homework-studio .recipe-actions-row .saas-primary-btn {
          flex: 1.25 !important;
          height: 38px !important;
          border-radius: 10px !important;
          font-size: 0.82rem !important;
          font-weight: 800 !important;
          background: var(--accent) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(42, 77, 215, 0.15) !important;
          transition: all 0.2s ease-in-out !important;
          margin-top: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .homework-studio .recipe-actions-row .saas-primary-btn:hover {
          transform: translateY(-1.5px) !important;
          box-shadow: 0 6px 18px rgba(42, 77, 215, 0.25) !important;
          background: #1d4ed8 !important;
        }
        .homework-studio .recipe-actions-row .edit-details-secondary-btn {
          flex: 1 !important;
          height: 38px !important;
          border-radius: 10px !important;
          font-size: 0.82rem !important;
          font-weight: 750 !important;
          border: 1.5px solid rgba(196, 197, 215, 0.45) !important;
          color: var(--text-dim) !important;
          background: transparent !important;
          transition: all 0.2s ease-in-out !important;
          margin-top: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .homework-studio .recipe-actions-row .edit-details-secondary-btn:hover {
          background: rgba(0, 0, 0, 0.02) !important;
          border-color: var(--text) !important;
          color: var(--text) !important;
        }
      `}</style>

      {/* ───────────────── TAB: DYNAMIC BUILDER ───────────────── */}
      {activeTab === 'dynamic' && (
        <div className="dynamic-wizard-container">
          {/* Stepper on top */}
          <div className="amb-stepper-container">
            {[
              { num: 1, label: 'Subject' },
              { num: 2, label: 'Audience' },
              { num: 3, label: 'Topics' },
              { num: 4, label: 'Parameters' },
              { num: 5, label: 'Preview' },
            ].map((s, idx, arr) => {
              const isActive = currentStep === s.num;
              const isCompleted = currentStep > s.num;
              return (
                <React.Fragment key={s.num}>
                  <div 
                    className={`stepper-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => setCurrentStep(s.num)}
                  >
                    <div className="node-circle">
                      {isCompleted ? '✓' : s.num}
                    </div>
                    <span className="node-label">{s.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Active Step Content */}
          <div className="wizard-step-card">
            
            {/* STEP 1: SUBJECT SELECTION */}
            {currentStep === 1 && (
              <div className="step-content-pane">
                <h3 className="step-title-lg">Academic Subject</h3>
                <div className="bp-sub" style={{ marginBottom: '20px' }}>Select the core subject focus for tonight's assignments.</div>
                <div className="subject-grid">
                  {subjects.map(s => {
                    const sel = builderState.subject === s.id;
                    const cs = s.comingSoon ? 'coming-soon' : '';
                    return (
                      <div 
                        key={s.id} 
                        className={`subject-card ${sel ? 'selected' : ''} ${cs}`}
                        style={{ position: 'relative' }}
                        onClick={() => {
                          if (!s.comingSoon) {
                            pickSubject(s.id);
                            setCurrentStep(2); // Auto-advance to Step 2!
                          }
                        }}
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
            )}

            {/* STEP 2: WHO IS THIS FOR? */}
            {currentStep === 2 && (
              <div className="step-content-pane">
                <h3 className="step-title-lg">Homework Type</h3>
                <div className="bp-sub">General covers the whole class. Personalized targets one student's weak spots using the Profile Agent.</div>
                
                <div className="hw-type-grid" style={{ marginTop: '20px' }}>
                  <div 
                    className={`hw-type-card ${builderState.type === 'general' ? 'selected' : ''}`}
                    onClick={() => pickType('general')}
                  >
                    {builderState.type === 'general' && (
                      <div className="sc-check-badge">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    )}
                    <div className="htc-icon-wrapper">
                      <Users size={20} className="text-accent" />
                    </div>
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
                    <div className="htc-icon-wrapper">
                      <Brain size={20} className="text-violet" style={{ color: 'var(--accent-2)' }} />
                    </div>
                    <div className="htc-title">Personalized Homework</div>
                    <div className="htc-desc">A tailored set for one student, focused on what they're struggling with.</div>
                  </div>
                </div>

                {/* Profile Agent Connections & Extraction */}
                <div className={`source-block ${builderState.type === 'specific' ? 'show' : ''}`} style={{ marginTop: '24px' }}>
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
                                    {builderState.subject === 'math' ? (
                                      <span className="sp-pill strong">⚖️ Math Focus Grade: {selectedMathGrade}</span>
                                    ) : (
                                      <>
                                        {s.strong.map(topicId => {
                                          const label = learningOutcomes.find(lo => lo.id === topicId)?.short || topicId;
                                          return <span key={topicId} className="sp-pill strong">💪 {label}</span>;
                                        })}
                                        {s.weak.map(topicId => {
                                          const label = learningOutcomes.find(lo => lo.id === topicId)?.short || topicId;
                                          return <span key={topicId} className="sp-pill weak">⚠️ {label}</span>;
                                        })}
                                      </>
                                    )}
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
                      
                      <label className="manual-toggle-checkbox" style={{ marginTop: '16px', display: 'block' }}>
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
            )}

            {/* STEP 3: SELECT LEARNING TOPICS */}
            {currentStep === 3 && (
              <div className="step-content-pane">
                {builderState.subject === 'math' ? (
                  <>
                    <h3 className="step-title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calculator size={18} className="text-accent" />
                      Syllabus Preview &bull; {selectedMathGrade === 'KG' ? 'Kindergarten' : `Grade ${selectedMathGrade.substring(1)}`}
                    </h3>
                    <div className="bp-sub">
                      Curriculum topics for the selected grade. Glowing highlighted capsules represent available dynamic database chapters.
                    </div>

                    <div className="math-capsules-container">
                      {(mathTopics as any[])
                        .filter(t => t.grade === selectedMathGrade)
                        .map((t, idx) => {
                          const mathTopicId = t.topic;
                          const dbQuestionCount = topicDbCounts[t.topic] || 0;
                          const isSelected = builderState.topics.includes(mathTopicId);

                          return (
                            <div 
                              key={idx}
                              className={`math-capsule-item unlocked ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleTopic(mathTopicId)}
                            >
                              {isSelected ? (
                                <Check size={10} className="stroke-[3]" style={{ color: '#ffffff' }} />
                              ) : (
                                <Sparkles size={10} style={{ color: dbQuestionCount > 0 ? 'var(--accent)' : 'var(--text-dim)' }} />
                              )}
                              <span style={{ fontFamily: "'Nunito'" }}>{t.topic}</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-dim)', background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.03)', padding: '1px 5px', borderRadius: '4px' }}>
                                {dbQuestionCount > 0 ? `${dbQuestionCount} DB Qs` : `No questions in DB`}
                              </span>

                              <div className="math-capsule-tooltip">
                                <span style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '2px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px' }}>
                                  🔓 {t.topic} Analysis
                                </span>
                                <span>📁 Objectives: <strong className="mc-pill" style={{ color: '#60a5fa' }}>{t.learning_objectives} LOs</strong></span>
                                <span>🗃️ DB Question Bank: <strong className="mc-pill" style={{ color: dbQuestionCount > 0 ? '#34d399' : '#ef4444' }}>{dbQuestionCount > 0 ? `${dbQuestionCount} Qs` : 'No questions in DB'}</strong></span>
                                <span>🔄 Safe Quiz Retakes: <strong className="mc-pill" style={{ color: '#fbbf24' }}>{t.recurring_tests_with_no_repeat} times</strong></span>
                                <span style={{ color: '#a7f3d0', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  ✨ Click to select for Homework!
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="step-title-lg">Science Curriculum Objectives</h3>
                    <div className="bp-sub" style={{ marginBottom: '20px' }}>
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
                  </>
                )}
              </div>
            )}

            {/* STEP 4: PARAMETERS CONFIGURATION */}
            {currentStep === 4 && (
              <div className="step-content-pane">
                <div className="params-visual-grid">
                  {/* Panel 1: Difficulty Target */}
                  <div className="param-panel-card">
                    <div className="ppc-icon"><Sliders size={18} /></div>
                    <h4>Difficulty Target</h4>
                    <div className="ppc-options-stack">
                      {(['easy', 'medium', 'hard', 'adaptive'] as const).map(d => (
                        <button 
                          key={d} 
                          className={`ppc-opt-btn ${builderState.diff === d ? 'active' : ''}`}
                          onClick={() => pickDiff(d)}
                        >
                          <span className="dot-indicator" />
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Panel 2: Total Questions */}
                  {(() => {
                    const selectedTopicId = builderState.topics[0];
                    const isStaticDemo = selectedTopicId === "kg-comparing-numbers" || selectedTopicId === "g3-intro-fractions" || selectedTopicId === "g7-pythagoras";
                    const dbCount = !isStaticDemo && selectedTopicId ? (topicDbCounts[selectedTopicId] || 0) : 0;
                    
                    const minSliderVal = dbCount > 0 ? Math.min(1, dbCount) : 3;
                    const maxSliderVal = dbCount > 0 ? Math.min(10, dbCount) : 10;
                    
                    const currentLen = Math.min(maxSliderVal, Math.max(minSliderVal, builderState.length));

                    return (
                      <div className="param-panel-card">
                        <div className="ppc-icon"><CheckSquare size={18} /></div>
                        <h4>Total Questions</h4>
                        <div className="ppc-slider-container">
                          <div className="slider-value-display">{currentLen} Qs</div>
                          <input 
                            type="range" 
                            min={minSliderVal} 
                            max={maxSliderVal} 
                            value={currentLen} 
                            step="1" 
                            className="ppc-range-slider" 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setBuilderState(prev => ({ ...prev, length: val }));
                            }} 
                          />
                          <div className="slider-ticks">
                            <span>{minSliderVal}</span>
                            <span>{Math.round((minSliderVal + maxSliderVal) / 2)}</span>
                            <span>{maxSliderVal}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Panel 3: Content Layout Flow */}
                  <div className="param-panel-card">
                    <div className="ppc-icon"><Activity size={18} /></div>
                    <h4>Format Flow</h4>
                    <div className="ppc-flow-selectors">
                      <div 
                        className={`flow-tile ${builderState.format === 'journey' ? 'active' : ''}`}
                        onClick={() => pickFormat('journey')}
                      >
                        <h5>Interactive Journey</h5>
                        <p>Weave sliders, slides & flashcards</p>
                      </div>
                      <div 
                        className={`flow-tile ${builderState.format === 'questions' ? 'active' : ''}`}
                        onClick={() => pickFormat('questions')}
                      >
                        <h5>Only Questions</h5>
                        <p>Quick assessment check</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: PREVIEW */}
            {currentStep === 5 && (
              <div className="step-content-pane" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: '680px' }}>
                  <RecipePanel 
                    onGenerate={onGenerate} 
                    showEditBtn={true} 
                    onEdit={() => setCurrentStep(4)} 
                  />
                </div>
              </div>
            )}

          </div>

          {/* Stepper Navigation Footer */}
          <div className="wizard-navigation-footer">
            {currentStep > 1 && currentStep < 5 && (
              <button className="nav-btn secondary" onClick={() => setCurrentStep(prev => prev - 1)}>
                ← Back
              </button>
            )}
            {currentStep < 5 && (
              <button 
                className="nav-btn primary" 
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={currentStep === 3 && builderState.topics.length === 0}
              >
                Next Step →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ───────────────── TAB: TEMPLATE PRESETS ───────────────── */}
      {activeTab === 'templates' && (
        <div className="templates-tab-container step-content-pane">
          <div className="wizard-step-card">
            <h3 className="step-title-lg">⚡ Worksheet Templates</h3>
            <div className="bp-sub" style={{ marginBottom: '24px' }}>
              Configure difficulty, length, format, and topics instantly with one click.
            </div>

            <div className="presets-grid" style={{ marginBottom: '32px' }}>
              {presets.filter(p => p.config.type === builderState.type).map(p => {
                const sel = activePresetId === p.id;
                
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

            {activePresetId && (
              <div className="template-compile-pane" style={{ maxWidth: '680px', margin: '0 auto' }}>
                <RecipePanel onGenerate={onGenerate} />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-component for Sticky Recipe panel
const RecipePanel: React.FC<{ onGenerate: () => void; onEdit?: () => void; showEditBtn?: boolean }> = ({ onGenerate, onEdit, showEditBtn }) => {
  const { builderState, selectedMathGrade } = useHomework();
  const subjectName = subjects.find(s => s.id === builderState.subject)?.name || builderState.subject;
  const activeStudentName = builderState.student ? students.find(s => s.id === builderState.student)?.name : '';

  // Estimate time
  const getEstTime = () => {
    if (builderState.format === 'questions') {
      return Math.round(builderState.length * 1.2);
    } else {
      const contentSteps = builderState.topics.length * 2;
      return Math.round(contentSteps * 0.5 + builderState.length * 1.2);
    }
  };

  return (
    <div className="recipe-card saas-recipe-card" style={{ width: '100%', margin: 0, position: 'relative' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 850 }}>
        <FileText size={16} className="text-indigo" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
        <span style={{ verticalAlign: 'middle' }}>Worksheet Compiler Details</span>
      </h3>
      
      <div className="recipe-grid-three-col">
        <div className="recipe-row">
          <span className="rr-label-wrapper">
            <span>Subject</span>
          </span>
          <span className="rr-val">{subjectName}</span>
        </div>
        {builderState.subject === 'math' && (
          <div className="recipe-row">
            <span className="rr-label-wrapper">
              <span>Grade Focus</span>
            </span>
            <span className="rr-val text-violet" style={{ fontWeight: 800 }}>
              {selectedMathGrade === 'KG' ? 'Kindergarten' : `Grade ${selectedMathGrade.substring(1)}`}
            </span>
          </div>
        )}
        <div className="recipe-row">
          <span className="rr-label-wrapper">
            <span>Type</span>
          </span>
          <span className="rr-val">{builderState.type === 'general' ? 'Class-Wide' : 'Personalized'}</span>
        </div>
        {builderState.type === 'specific' && (
          <div className="recipe-row">
            <span className="rr-label-wrapper">
              <span>Target Student</span>
            </span>
            <span className="rr-val text-violet">{activeStudentName || '—'}</span>
          </div>
        )}
        <div className="recipe-row">
          <span className="rr-label-wrapper">
            <span>Selected Objectives</span>
          </span>
          <span className="rr-val">{builderState.topics.length} Areas</span>
        </div>
        <div className="recipe-row">
          <span className="rr-label-wrapper">
            <span>Difficulty Target</span>
          </span>
          <span className="rr-val text-indigo" style={{ textTransform: 'capitalize' }}>{builderState.diff}</span>
        </div>
        <div className="recipe-row">
          <span className="rr-label-wrapper">
            <span>Format Flow</span>
          </span>
          <span className="rr-val">{builderState.format === 'questions' ? 'Only Questions' : 'Journey Roadmap'}</span>
        </div>
        <div className="recipe-row">
          <span className="rr-label-wrapper">
            <span>Test Questions</span>
          </span>
          <span className="rr-val">{builderState.length} Questions</span>
        </div>
        <div className="recipe-row">
          <span className="rr-label-wrapper">
            <span>Est. Student Run</span>
          </span>
          <span className="rr-val text-bold font-mono text-indigo">~{getEstTime()} Min</span>
        </div>
      </div>
      
      <div className="recipe-actions-row">
        <button 
          className={`generate-btn saas-primary-btn ${builderState.subject === 'math' && builderState.topics.length === 0 ? 'disabled' : ''}`} 
          onClick={builderState.subject === 'math' && builderState.topics.length === 0 ? undefined : onGenerate}
          disabled={builderState.subject === 'math' && builderState.topics.length === 0}
          style={builderState.subject === 'math' && builderState.topics.length === 0 ? { 
            opacity: 0.5, 
            cursor: 'not-allowed', 
            background: '#94a3b8', 
            borderColor: '#94a3b8',
            boxShadow: 'none'
          } : undefined}
        >
          <Sparkles size={14} style={{ marginRight: '6px' }} />
          {builderState.subject === 'math' && builderState.topics.length === 0 ? 'Math Preview' : 'Compile Journey'}
        </button>

        {showEditBtn && (
          <button 
            className="edit-details-secondary-btn"
            onClick={onEdit}
          >
            Edit Parameters
          </button>
        )}
      </div>

      <div className="recipe-hint" style={{ marginTop: '12px', textAlign: 'center' }}>
        Personalized workbook compiles in ~3 seconds.
      </div>
    </div>
  );
};

export default BuilderPanel;
