"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useHomework } from '../../../../components/homework/context';
import TeacherInsightView from '../../../../components/homework/TeacherInsightView';

export default function TeacherInsightsPage() {
  const router = useRouter();
  const { showToast } = useHomework();

  const handleReturn = () => {
    router.push('/homework-studio/teacher');
    showToast('📊 Returned to Teacher Console!');
  };

  return (
    <div className="homework-studio" style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px 80px' }}>
      {/* Sticky Premium Insights Navigation Header */}
      <div style={{
        maxWidth: '740px',
        width: '100%',
        margin: '0 auto 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        <button 
          className="nav-btn secondary"
          onClick={handleReturn}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}
        >
          ← Return to Teacher Console
        </button>
        
        <span style={{
          fontFamily: "'Nunito'",
          fontWeight: 800,
          fontSize: '0.82rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          background: 'var(--accent-glow)',
          color: 'var(--accent)',
          border: '1px solid rgba(42, 77, 215, 0.15)',
          padding: '6px 14px',
          borderRadius: '20px'
        }}>
          📊 Student Outcome Profile
        </span>
      </div>

      {/* Main outcome report content */}
      <div style={{ maxWidth: '740px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <TeacherInsightView />
      </div>
    </div>
  );
}
