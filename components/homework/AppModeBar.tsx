"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart3, BookOpen } from 'lucide-react';
import { useHomework } from './context';

export const AppModeBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTab, setActiveTab } = useHomework();

  if (pathname === '/homework-studio' || pathname === '/homework-studio/') {
    return null;
  }

  return (
    <div className="app-mode-bar-flat-sticky" id="appModeBar">
      <style>{`
        .hw-layout-container {
          padding-top: 0 !important;
        }
        .app-mode-bar-flat-sticky {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 40px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(196, 197, 215, 0.35);
          margin-bottom: 32px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          width: 100vw;
          margin-left: calc(-50vw + 50%);
        }
        .amb-left {
          display: flex;
          align-items: center;
        }
        .brand-title {
          font-size: 1.15rem;
          font-weight: 850;
          letter-spacing: -0.015em;
          margin: 0;
          line-height: 1.2;
          color: var(--text);
          font-family: 'Nunito', sans-serif;
        }
        .amb-right {
          display: flex;
          align-items: center;
        }
        .minimal-analytics-btn {
          background: rgba(99, 102, 241, 0.06) !important;
          border: 1.5px solid rgba(99, 102, 241, 0.25) !important;
          color: var(--accent) !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 0.85rem !important;
          font-weight: 750 !important;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: none !important;
          margin-right: 12px;
        }
        .minimal-analytics-btn:hover {
          background: rgba(99, 102, 241, 0.12) !important;
          border-color: var(--accent) !important;
          color: var(--accent) !important;
        }
        .minimal-exit-btn {
          background: transparent !important;
          border: 1.5px solid rgba(196, 197, 215, 0.45) !important;
          color: var(--text-dim) !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 0.85rem !important;
          font-weight: 700 !important;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.2;
          box-shadow: none !important;
        }
        .minimal-exit-btn:hover {
          background: rgba(0, 0, 0, 0.02) !important;
          border-color: var(--text) !important;
          color: var(--text) !important;
        }
      `}</style>
      <div className="amb-left" onClick={() => router.push('/homework-studio')} style={{ cursor: 'pointer' }}>
        <h1 className="brand-title">Teacher Homework Studio</h1>
      </div>
      <div className="amb-right">
        {activeTab === 'analytics' ? (
          <button 
            className="minimal-analytics-btn"
            onClick={() => setActiveTab('dynamic')}
            title="Switch to Homework Studio"
          >
            <span>Homework Studio</span>
            <BookOpen size={14} style={{ marginLeft: '6px' }} />
          </button>
        ) : (
          <button 
            className="minimal-analytics-btn"
            onClick={() => setActiveTab('analytics')}
            title="Open Analytics & Insights"
          >
            <span>Analytics &amp; Insights</span>
            <BarChart3 size={14} style={{ marginLeft: '6px' }} />
          </button>
        )}

        <button 
          className="minimal-exit-btn"
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
