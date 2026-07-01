"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHomework, HomeworkAssignment } from '../../../components/homework/context';
import AssignmentStartCard from '../../../components/homework/AssignmentStartCard';
import HomeworkRunner from '../../../components/homework/HomeworkRunner';
import SuccessScreen from '../../../components/homework/SuccessScreen';
import { 
  BookOpen, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Award,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

export default function StudentPage() {
  const router = useRouter();
  const { 
    assignments, 
    activeAssignmentId, 
    selectAssignment, 
    setActiveAssignmentId,
    homeworkSteps, 
    isCompleted, 
    setIsCompleted, 
    showToast 
  } = useHomework();

  const [activeScreen, setActiveScreen] = useState<'start' | 'running' | 'success'>('start');

  useEffect(() => {
    // If completed already, default to success screen
    if (isCompleted) {
      setActiveScreen('success');
    } else {
      setActiveScreen('start');
    }
  }, [isCompleted, activeAssignmentId]);

  const handleStart = () => {
    setActiveScreen('running');
    showToast('🚀 Physics adventure launched! Let\'s go!');
  };

  const handleComplete = () => {
    setIsCompleted(true);
    setActiveScreen('success');
    showToast('🎉 Assignment completed! Amazing work.');
    
    // Mark the current active assignment as completed in local state (for badge updates)
    if (activeAssignmentId) {
      const selected = assignments.find(a => a.id === activeAssignmentId);
      if (selected) {
        selected.isCompleted = true;
      }
    }
  };

  const handleSeeTeacher = () => {
    router.push('/homework-studio/teacher/insights');
    showToast('📊 Loaded Student Pre-Class Analytics!');
  };

  const handleLaunchAssignment = (id: string) => {
    selectAssignment(id);
    setActiveScreen('start');
  };

  // IF NO ASSIGNMENT SELECTED: Show the gorgeous Student Playground Selection Dashboard
  if (!activeAssignmentId) {
    return (
      <main className="student-dashboard-screen">
        <div className="student-dashboard-header">
          <div className="sd-eyebrow">
            <Award size={14} className="text-amber" />
            <span>Student Learning Space</span>
          </div>
          <h2>My Homework Playground</h2>
          <p>
            Choose a physics worksheet journey to begin! Work through interactive study notes, 
            hands-on thruster simulations, concept flashcards, and practice questions.
          </p>
        </div>

        <div className="assignments-grid">
          {assignments.map((assignment) => {
            const qCount = assignment.steps.filter(s => s.isQuestion).length;
            const contentSteps = assignment.steps.filter(s => !s.isQuestion).length;
            const estTime = Math.round(contentSteps * 0.5 + qCount * 1.2);
            
            return (
              <div 
                key={assignment.id} 
                className={`assignment-play-card ${assignment.isCompleted ? 'completed-border' : ''}`}
                onClick={() => handleLaunchAssignment(assignment.id)}
              >
                <div className="ap-card-glow" />
                <div className="ap-card-header">
                  <div className="ap-icon-wrapper">
                    {assignment.isCustom ? (
                      <Sparkles size={20} className="text-violet" />
                    ) : (
                      <GraduationCap size={20} className="text-amber" />
                    )}
                  </div>
                  <span className={`ap-type-badge ${assignment.isCustom ? 'custom' : 'demo'}`}>
                    {assignment.isCustom ? 'Teacher Assigned' : 'Demo Practice'}
                  </span>
                  
                  {assignment.isCompleted && (
                    <span className="ap-status-badge completed">
                      <CheckCircle2 size={12} />
                      Completed
                    </span>
                  )}
                </div>

                <div className="ap-card-body">
                  <h3>{assignment.title}</h3>
                  <p className="ap-summary">{assignment.topicSummary}</p>
                  
                  <div className="ap-meta-row">
                    <span className="ap-meta-item">
                      <BookOpen size={12} />
                      {qCount} Questions
                    </span>
                    <span className="ap-meta-item">
                      <Clock size={12} />
                      ~{estTime} Min
                    </span>
                  </div>
                </div>

                <button 
                  className={`ap-launch-btn ${assignment.isCompleted ? 'completed-btn' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchAssignment(assignment.id);
                  }}
                >
                  <span>{assignment.isCompleted ? 'Replay Challenge' : 'Launch Homework'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="student-dashboard-footer">
          <p>
            Want more custom topics? Head over to the <strong>Teacher</strong> mode at the top 
            to dynamically compile a fresh worksheet!
          </p>
          <button 
            className="nav-btn secondary"
            onClick={() => router.push('/homework-studio/teacher')}
            style={{ margin: '12px auto 0' }}
          >
            Go to Teacher Console
          </button>
        </div>
      </main>
    );
  }

  // IF AN ASSIGNMENT IS SELECTED: Render the standard assignment runner views
  return (
    <main style={{ minHeight: '80vh' }}>
      <ActiveToasts />

      {activeScreen === 'start' && (
        <AssignmentStartCard onStart={handleStart} />
      )}

      {activeScreen === 'running' && (
        <HomeworkRunner onComplete={handleComplete} />
      )}

      {activeScreen === 'success' && (
        <SuccessScreen onSeeTeacher={handleSeeTeacher} />
      )}
    </main>
  );
}

// Internal Toast component helper
const ActiveToasts: React.FC = () => {
  const { toastMessage, streakToastMessage } = useHomework();
  return (
    <>
      <div className={`toast ${toastMessage ? 'show' : ''}`} id="toast">
        {toastMessage}
      </div>
      <div className={`streak-toast ${streakToastMessage ? 'show' : ''}`} id="streakToast">
        {streakToastMessage}
      </div>
    </>
  );
};
