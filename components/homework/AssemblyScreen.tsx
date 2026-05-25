"use client";

import React, { useState, useEffect } from 'react';
import { useHomework } from './context';
import { students } from '../../data/students';
import { learningOutcomes } from '../../data/topics';

interface AssemblyScreenProps {
  onComplete: () => void;
}

export const AssemblyScreen: React.FC<AssemblyScreenProps> = ({ onComplete }) => {
  const { builderState } = useHomework();
  const [activeStep, setActiveStep] = useState<number>(0);

  const student = builderState.student ? students.find(s => s.id === builderState.student) : null;
  const topicNames = builderState.topics.map(id => learningOutcomes.find(l => l.id === id)?.name || id);

  const steps = [
    {
      status: 'Reading your topic selections',
      label: `Pulling ${builderState.topics.length} topic${builderState.topics.length > 1 ? 's' : ''}: ${topicNames.join(', ')}`
    },
    {
      status: builderState.type === 'specific' ? `Reading ${student ? student.name : "student"}'s profile` : 'Balancing across the class',
      label: builderState.type === 'specific' ? 'Weighting toward weak areas' : 'Even coverage for all students'
    },
    {
      status: 'Building recap cards & flashcards',
      label: 'Creating learning content for each topic'
    },
    {
      status: 'Generating mixed questions',
      label: `Creating ${builderState.length} questions: MCQ, fill-in, blanks & drag-and-drop`
    },
    {
      status: 'Sequencing the journey',
      label: 'Interleaving content and questions topic by topic'
    },
    {
      status: '✨ Your homework is ready!',
      label: 'Interactive journey assembled'
    }
  ];

  useEffect(() => {
    if (activeStep < steps.length) {
      const timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(completeTimer);
    }
  }, [activeStep]);

  return (
    <div className="assembly-screen show" id="assemblyScreen">
      <div className="assembly-orb">🪄</div>
      <h2>Assembling your homework…</h2>
      <div className="assembly-status" style={{ minHeight: '1.4em', transition: 'opacity .3s' }}>
        {activeStep < steps.length ? steps[activeStep].status : '✨ Assembled!'}
      </div>
      
      <div className="assembly-log" id="assemblyLog">
        {steps.map((st, i) => {
          const isVisible = activeStep >= i;
          const isDone = activeStep > i;
          return (
            <div 
              key={i} 
              className={`al-item ${isVisible ? 'show' : ''} ${isDone ? 'done' : ''}`}
              id={`al-${i}`}
            >
              {isDone ? (
                <span className="al-check">✓</span>
              ) : activeStep === i ? (
                <span className="al-spin" />
              ) : (
                <span className="al-check" style={{ visibility: 'hidden' }}>✓</span>
              )}
              <span>{st.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AssemblyScreen;
