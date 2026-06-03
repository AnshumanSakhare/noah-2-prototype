"use client";

import React from 'react';
import { useHomework } from './context';
import AppModeBar from './AppModeBar';
import AnalyticsDashboard from './AnalyticsDashboard';

interface LayoutInnerProps {
  children: React.ReactNode;
}

export const LayoutInner: React.FC<LayoutInnerProps> = ({ children }) => {
  const { activeTab } = useHomework();

  return (
    <div className="app hw-layout-container">
      {/* Top mode switch bar */}
      <AppModeBar />
      
      <div style={{ display: activeTab === 'analytics' ? 'none' : 'block' }}>
        {children}
      </div>
      {activeTab === 'analytics' && <AnalyticsDashboard />}
    </div>
  );
};

export default LayoutInner;
