"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, GraduationCap, BookOpen, Compass, Home } from 'lucide-react';

export const AppModeBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const isTeacher = pathname.includes('/teacher');
  const isStudent = pathname.includes('/student');

  if (pathname === '/homework-studio' || pathname === '/homework-studio/' || isStudent) {
    return null;
  }

  return (
    <div className="app-mode-bar-modern" id="appModeBar">
      <div className="amb-left" onClick={() => router.push('/homework-studio')} style={{ cursor: 'pointer' }}>
        <div className="logo-box">
          <Sparkles size={20} className="logo-sparkle" />
        </div>
        <div className="brand-texts">
          <h1 className="brand-title">Teacher Homework Studio</h1>
          <div className="brand-subtitle">
            <Compass size={10} style={{ marginRight: '4px' }} />
            AI-Powered Teacher Studio
          </div>
        </div>
      </div>
      
      <div className="amb-right">
        {isTeacher ? (
          <div className="role-badge teacher-badge">
            <span className="live-status-dot" />
            <GraduationCap size={14} style={{ marginRight: '4px' }} />
            <span>Teacher Console</span>
          </div>
        ) : isStudent ? (
          <div className="role-badge student-badge">
            <span className="live-status-dot student" />
            <BookOpen size={14} style={{ marginRight: '4px' }} />
            <span>Student Playground</span>
          </div>
        ) : null}
        
        <button 
          className="portal-home-btn-premium"
          onClick={() => router.push('/homework-studio')}
          title="Exit to Portal Home"
        >
          <span>Exit Studio</span>
          <Home size={14} style={{ marginLeft: '6px' }} />
        </button>
      </div>
    </div>
  );
};
export default AppModeBar;
