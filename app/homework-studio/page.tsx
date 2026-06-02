"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, BookOpen, Sparkles, Compass, CheckCircle2, Calculator, Lock, ChevronDown } from 'lucide-react';
import { useHomework } from '../../components/homework/context';

export default function HomeworkStudioRootPage() {
  const router = useRouter();
  const { 
    showToast,
    selectedMathGrade,
    setSelectedMathGrade,
    builderState,
    setBuilderState
  } = useHomework();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectMode = (mode: 'teacher' | 'student') => {
    if (mode === 'teacher') {
      router.push('/homework-studio/teacher');
      showToast('💼 Switched to Teacher Console!');
    } else {
      router.push('/homework-studio/student');
      showToast('🎒 Switched to Student Workspace!');
    }
  };

  const currentOptionLabel = builderState.subject === 'science'
    ? 'Science: Newtonian Physics (Active)'
    : `Math: ${selectedMathGrade === 'KG' ? 'Kindergarten (KG)' : `Grade ${selectedMathGrade.substring(1)} (${selectedMathGrade})`}`;

  return (
    <div className="portal-container">
      {/* Premium custom styled dropdown select components matching the SaaS theme */}
      <style>{`
        .hw-layout-container {
          padding-top: 10px !important;
          padding-bottom: 10px !important;
        }
        .portal-container {
          padding-top: 15px !important;
          padding-bottom: 20px !important;
          max-width: 900px;
          margin: 0 auto;
        }
        .portal-header {
          margin-bottom: 14px !important;
        }
        .portal-header h1 {
          font-size: 1.6rem !important;
          margin-bottom: 4px !important;
        }
        .portal-header p {
          font-size: 0.8rem !important;
          max-width: 520px !important;
        }
        .portal-cards {
          gap: 16px !important;
        }
        .portal-card {
          padding: 18px 22px !important;
          overflow: visible !important; /* Critical to prevent dropdown menu clipping! */
        }
        .portal-card h3 {
          font-size: 1.0rem !important;
          margin-bottom: 4px !important;
        }
        .portal-card p {
          font-size: 0.76rem !important;
          line-height: 1.45 !important;
        }
        .portal-feature-list {
          gap: 6px !important;
        }
        .portal-feature-list li {
          font-size: 0.72rem !important;
          gap: 6px !important;
        }
        .portal-select-premium-button {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 8px 12px !important;
          border-radius: 8px !important;
          border: 1.5px solid #2a4dd7 !important; /* Premium Indigo Accent Border */
          background: #ffffff;
          color: #1e293b;
          font-size: 0.76rem !important;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(42, 77, 215, 0.04);
          text-align: left;
          justify-content: space-between;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          margin-bottom: 12px !important; /* Critical: guarantees a clean visual gap between select dropdown and enter console CTA button! */
        }
        .portal-select-premium-button:hover {
          border-color: #14278f !important;
          box-shadow: 0 4px 12px rgba(42, 77, 215, 0.08);
          transform: translateY(-1px);
        }
        .portal-select-premium-button:focus {
          border-color: #2a4dd7 !important;
          box-shadow: 0 0 0 3px rgba(42, 77, 215, 0.12);
        }
        .portal-dropdown-menu {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.08);
          z-index: 100;
          max-height: 240px;
          padding: 4px;
          animation: dropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .portal-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px !important;
          border-radius: 6px !important;
          cursor: pointer;
          font-size: 0.72rem !important;
          font-weight: 750;
          color: #475569;
          transition: all 0.12s ease;
        }
        .portal-dropdown-item:hover {
          background: rgba(42, 77, 215, 0.06);
          color: #2a4dd7;
        }
        .portal-dropdown-item.active {
          background: rgba(42, 77, 215, 0.08);
          color: #2a4dd7;
        }
        .portal-btn {
          margin-top: 12px !important; /* Critical: compact gap matches theme */
          padding: 8px 0 !important; /* Extremely sleek and minimal height */
          font-size: 0.78rem !important; /* Smaller text size */
          border-radius: 8px !important; /* Rounded sleek layout matching select button */
        }
      `}</style>

      <div className="portal-header">
        <h1>Homework Studio</h1>
        <p>
          Bridge classroom instruction and tactile exploration. Custom compile step-by-step 
          homework journeys or play inside physics playgrounds.
        </p>
      </div>

      <div className="portal-cards">
        {/* Teacher Card */}
        <div 
          className="portal-card teacher-portal-card" 
          onClick={() => handleSelectMode('teacher')}
        >
          <div className="portal-card-glow" />
          <div className="portal-icon-wrapper bg-indigo">
            <GraduationCap size={32} className="portal-icon" />
          </div>
          <div className="portal-card-body">
            <h3>Teacher Console</h3>
            <p>
              Design intelligent physics worksheets, adapt content dynamically, and track student outcomes in real-time.
            </p>
            <ul className="portal-feature-list">
              <li>
                <CheckCircle2 size={13} className="feature-check" />
                <span>AI-Assisted Step Compiler</span>
              </li>
              <li>
                <CheckCircle2 size={13} className="feature-check" />
                <span>Real-Time Student Performance Analytics</span>
              </li>
              <li>
                <CheckCircle2 size={13} className="feature-check" />
                <span>Custom Physics Sandboxes & Flashcards</span>
              </li>
            </ul>

            {/* Premium Subject/Grade Selection Dropdown */}
            <div 
              style={{ marginTop: '14px', textAlign: 'left', position: 'relative' }}
              onClick={(e) => e.stopPropagation()} // Stop propagation to prevent outer div click!
              ref={dropdownRef}
            >
              <label 
                style={{ 
                  display: 'block', 
                  fontSize: '0.68rem', 
                  fontWeight: 800, 
                  color: '#64748b', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                  fontFamily: "'Inter'"
                }}
              >
                Select Target Syllabus &amp; Grade:
              </label>

              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="portal-select-premium-button"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {builderState.subject === 'science' ? (
                    <Compass size={15} style={{ color: '#2a4dd7', flexShrink: 0 }} />
                  ) : (
                    /* Elegant SVG Triangle Ruler matching screenshot exactly */
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2a4dd7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M22 22L2 2v20h20z" />
                      <path d="M18 18H6v-12l12 12z" fill="rgba(42, 77, 215, 0.08)" />
                    </svg>
                  )}
                  <span style={{ fontWeight: 800 }}>{currentOptionLabel}</span>
                </div>
                <ChevronDown 
                  size={13} 
                  style={{ 
                    color: '#475569', 
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'none', 
                    transition: 'transform 0.2s ease',
                    marginLeft: '8px',
                    flexShrink: 0
                  }} 
                />
              </button>

              {isDropdownOpen && (
                <div className="portal-dropdown-menu">
                  {/* Science Option */}
                  <div 
                    onClick={() => {
                      setBuilderState(prev => ({
                        ...prev,
                        subject: 'science',
                        topics: ['lo1', 'lo2', 'lo3', 'lo4']
                      }));
                      showToast('Subject initialized to Science (Newtonian Physics)!');
                      setIsDropdownOpen(false);
                    }}
                    className={`portal-dropdown-item ${builderState.subject === 'science' ? 'active' : ''}`}
                  >
                    <Compass size={16} style={{ color: builderState.subject === 'science' ? '#2a4dd7' : '#64748b' }} />
                    <span>Science: Newtonian Physics (Active)</span>
                  </div>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 8px' }} />

                  {/* Math Options */}
                  {[
                    { value: 'KG', label: 'Math: Kindergarten (KG)' },
                    { value: 'G3', label: 'Math: Grade 3 (G3)' },
                    { value: 'G7', label: 'Math: Grade 7 (G7)' },
                  ].map((opt) => {
                    const isSelected = builderState.subject === 'math' && selectedMathGrade === opt.value;
                    return (
                      <div 
                        key={opt.value}
                        onClick={() => {
                          setSelectedMathGrade(opt.value);
                          setBuilderState(prev => ({
                            ...prev,
                            subject: 'math',
                            topics: []
                          }));
                          showToast(`Subject set to Math (${opt.label})!`);
                          setIsDropdownOpen(false);
                        }}
                        className={`portal-dropdown-item ${isSelected ? 'active' : ''}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M22 22L2 2v20h20z" />
                          <path d="M18 18H6v-12l12 12z" fill="currentColor" fillOpacity="0.1" />
                        </svg>
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <button className="portal-btn btn-indigo">
            Enter Teacher Console →
          </button>
        </div>

        {/* Student Card */}
        <div 
          className="portal-card student-portal-card" 
          onClick={() => handleSelectMode('student')}
        >
          <div className="portal-card-glow" />
          <div className="portal-icon-wrapper bg-amber">
            <BookOpen size={32} className="portal-icon" />
          </div>
          <div className="portal-card-body">
            <h3>Student Workspace</h3>
            <p>
              Complete assignments inside a tactile, handwriting-themed digital notebook, run physics simulations, and earn streaks.
            </p>
            <ul className="portal-feature-list">
              <li>
                <CheckCircle2 size={13} className="feature-check" />
                <span>Ruled Notebook Recap Summaries</span>
              </li>
              <li>
                <CheckCircle2 size={13} className="feature-check" />
                <span>Interactive Forces & Inertia Sandboxes</span>
              </li>
              <li>
                <CheckCircle2 size={13} className="feature-check" />
                <span>Personalized Flashcards & Quick Checks</span>
              </li>
            </ul>
          </div>
          <button className="portal-btn btn-amber">
            Enter Student Workspace →
          </button>
        </div>
      </div>
    </div>
  );
}
