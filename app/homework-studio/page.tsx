"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, BookOpen, Sparkles, Compass, CheckCircle2 } from 'lucide-react';
import { useHomework } from '../../components/homework/context';

export default function HomeworkStudioRootPage() {
  const router = useRouter();
  const { showToast } = useHomework();

  const handleSelectMode = (mode: 'teacher' | 'student') => {
    if (mode === 'teacher') {
      router.push('/homework-studio/teacher');
      showToast('💼 Switched to Teacher Console!');
    } else {
      router.push('/homework-studio/student');
      showToast('🎒 Switched to Student Workspace!');
    }
  };

  return (
    <div className="portal-container">
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
                <CheckCircle2 size={16} className="feature-check" />
                <span>AI-Assisted Step Compiler</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="feature-check" />
                <span>Real-Time Student Performance Analytics</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="feature-check" />
                <span>Custom Physics Sandboxes & Flashcards</span>
              </li>
            </ul>
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
                <CheckCircle2 size={16} className="feature-check" />
                <span>Ruled Notebook Recap Summaries</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="feature-check" />
                <span>Interactive Forces & Inertia Sandboxes</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="feature-check" />
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
