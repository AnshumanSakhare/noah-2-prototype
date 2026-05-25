"use client";

import React from 'react';
import { useHomework } from './context';
import { topicContent } from '../../data/topics';

interface RecapSlidesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecapSlidesModal: React.FC<RecapSlidesModalProps> = ({ isOpen, onClose }) => {
  const { homeworkSteps } = useHomework();

  if (!isOpen) return null;

  // Gather unique topic recaps in this homework steps
  const recaps: Array<{ title: string; sub: string; text: string; icon: string }> = [];
  const processedTopics = new Set<string>();

  homeworkSteps.forEach(s => {
    if (s.topic && !processedTopics.has(s.topic)) {
      processedTopics.add(s.topic);
      const content = topicContent[s.topic];
      if (content && content.recap) {
        let icon = '🌟';
        if (content.recap.title.includes('Inertia')) icon = '🎯';
        else if (content.recap.title.includes('Force')) icon = '⚡';
        else if (content.recap.title.includes('Action')) icon = '🤝';

        recaps.push({
          title: content.recap.title,
          sub: content.recap.sub,
          text: content.recap.text,
          icon
        });
      }
    }
  });

  return (
    <div 
      className="recap-modal show" 
      id="recapModal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="recap-modal-content">
        <button className="recap-modal-close" onClick={onClose}>✕</button>
        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-.02em', color: 'var(--text)', marginBottom: '6px', marginTop: 0 }}>
          📖 Tonight's Study Sheets
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', fontWeight: 600, margin: '0 0 16px' }}>
          Quick learning cards compiled from your journey to review anytime.
        </p>
        
        <div className="recap-slide-wrap" id="recapModalSlides">
          {recaps.length === 0 ? (
            <div className="recap-slide-card" style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, margin: 0 }}>No recaps were included in this session.</p>
            </div>
          ) : (
            recaps.map((r, idx) => (
              <div key={idx} className="recap-slide-card">
                <div className="recap-slide-title">
                  <span>{r.icon}</span> {r.title}
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 8px' }}>
                  {r.sub}
                </p>
                <div 
                  className="recap-slide-text"
                  dangerouslySetInnerHTML={{ __html: r.text }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default RecapSlidesModal;
