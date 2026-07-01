"use client";

import React from 'react';
import { useHomework } from './context';
import { learningOutcomes } from '../../data/topics';

interface AssignmentStartCardProps {
  onStart: () => void;
}

export const AssignmentStartCard: React.FC<AssignmentStartCardProps> = ({ onStart }) => {
  const { builderState, homeworkSteps } = useHomework();

  const qCount = homeworkSteps.filter(s => s.isQuestion).length;
  const usedTopics = [...new Set(homeworkSteps.filter(s => s.topic).map(s => s.topic))];
  const contentSteps = homeworkSteps.filter(s => !s.isQuestion).length;
  const estTime = Math.round(contentSteps * 0.5 + qCount * 1.2);

  const topicQuestionCounts: Record<string, number> = {};
  homeworkSteps.filter(s => s.isQuestion).forEach(s => {
    if (s.topic) {
      topicQuestionCounts[s.topic] = (topicQuestionCounts[s.topic] || 0) + 1;
    }
  });

  const usedLearningOutcomes = learningOutcomes.filter(lo => usedTopics.includes(lo.id));

  return (
    <div className="assign-screen" id="assignScreen" style={{ display: 'flex' }}>
      <div className="assign-card">
        <span className="assign-from">📌 Assigned by Ms. Rao</span>
        <h2>Tonight's Homework</h2>
        <div className="assign-meta" style={{ margin: '14px 0 22px' }}>
          <span>📚 {usedTopics.length || builderState.topics.length} topics</span>
          <span>❓ {qCount} questions</span>
          <span style={{ textTransform: 'capitalize' }}>🎚️ {builderState.diff}</span>
          <span>⏱️ ~{estTime} min</span>
        </div>
        
        <div className="checklist-preview">
          <h4>What you'll work through</h4>
          <div id="checklistPreview">
            {usedLearningOutcomes.map((lo, idx) => {
              const qNum = topicQuestionCounts[lo.id] || 0;
              return (
                <div key={lo.id} className="cl-item">
                  <span className="cl-num">{idx + 1}.</span>
                  <span>{lo.name}</span>
                  <span className="cl-topic-q">
                    {qNum} Q {builderState.format !== 'questions' ? '· recap · flash' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        <button className="start-btn" onClick={onStart}>
          Start tonight's work →
        </button>
        <div style={{ marginTop: '14px', fontSize: '.76rem', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>
          You can stop midway and pick up right where you left off.
        </div>
      </div>
    </div>
  );
};
export default AssignmentStartCard;
