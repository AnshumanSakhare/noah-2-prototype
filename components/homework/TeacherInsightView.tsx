"use client";

import React, { useEffect, useState } from 'react';
import { useHomework } from './context';
import { students } from '../../data/students';
import { learningOutcomes } from '../../data/topics';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  Lightbulb,
  Sparkles
} from 'lucide-react';

export const TeacherInsightView: React.FC = () => {
  const { builderState, homeworkSteps, hwAnswers, hwElapsed } = useHomework();
  const [rendered, setRendered] = useState<boolean>(false);

  useEffect(() => {
    setRendered(true);
  }, []);

  const questionSteps = homeworkSteps.filter(s => s.isQuestion);
  let correctCount = 0;
  questionSteps.forEach(qs => {
    const si = homeworkSteps.indexOf(qs);
    if (hwAnswers[si] && hwAnswers[si].correct) correctCount++;
  });
  
  const pct = questionSteps.length ? Math.round((correctCount / questionSteps.length) * 100) : 0;
  const hwMin = Math.max(1, Math.round(hwElapsed / 60000)) || 8;

  const activeStudent = builderState.student ? students.find(x => x.id === builderState.student) : null;

  const topicsData = learningOutcomes
    .filter(lo => builderState.topics.includes(lo.id))
    .map(lo => {
      const qs = questionSteps.filter(q => q.topic === lo.id);
      const c = qs.filter(q => {
        const si = homeworkSteps.indexOf(q);
        return hwAnswers[si] && hwAnswers[si].correct;
      }).length;
      const ratio = qs.length ? c / qs.length : 0.7; // default fallback if no questions for topic
      return { lo, ratio };
    });

  // Dynamically compile focus tip
  const getFocusText = () => {
    const sorted = [...topicsData].sort((a, b) => a.ratio - b.ratio);
    const weakest = sorted[0];
    const second = sorted[1];
    
    if (weakest && second) {
      return `Open class with <strong>${weakest.lo.name}</strong> — it's the weakest area. A short recap of <strong>${second.lo.name}</strong> would help too, then move to applied problems since the other topics are solid.`;
    }
    return "The student has demonstrated solid performance across all selected topics. Reinforce concepts with multi-stage equations in the upcoming class!";
  };

  return (
    <div className="teacher-screen show saas-card-wrapper" id="teacherView" style={{ display: 'block', marginTop: '0' }}>
      <div className="t-hero" style={{ background: 'linear-gradient(135deg, #2a4dd7 0%, #14278f 100%)', borderRadius: '12px', padding: '30px 32px', color: '#ffffff', marginBottom: '20px', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div className="th-eyebrow" style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          <BookOpen size={12} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          Pre-Class AI Insight Report
        </div>
        <h2 id="tHeroTitle" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.7rem', fontWeight: 900, color: '#ffffff', margin: '4px 0' }}>
          <Sparkles size={22} style={{ fill: '#ffd54f', color: '#ffd54f' }} />
          <span>{activeStudent ? `${activeStudent.name} — Student Outcome Profile` : 'Student — Outcome Profile'}</span>
        </h2>
        <div className="th-meta" style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.86rem', fontWeight: 600 }}>Submitted just now</div>
        
        <div className="t-time-strip">
          <div className="t-time-pill">
            <div className="ttv" id="tHwTime" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} />
              {hwMin}m
            </div>
            <div className="ttl">Elapsed Run</div>
          </div>
          <div className="t-time-pill">
            <div className="ttv" id="tQCount" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} />
              {questionSteps.length}
            </div>
            <div className="ttl">Test Questions</div>
          </div>
          <div className="t-time-pill">
            <div className="ttv" id="tAccuracy" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              {pct}%
            </div>
            <div className="ttl">Accuracy Rate</div>
          </div>
        </div>
      </div>
      
      <div className="t-section saas-card">
        <h3>
          <TrendingUp size={16} className="text-indigo" style={{ marginRight: '8px' }} />
          Learning Outcomes Performance Breakdown
        </h3>
        <div className="ts-sub">Synthesized based on student choices inside interactive worksheets.</div>
        <div id="tBreakdown" className="saas-progress-list">
          {topicsData.map((t, idx) => {
            const p = Math.round(t.ratio * 100);
            let tag = 'struggle';
            let label = 'Needs practice';
            let color = 'red';
            let sub = 'Requires primary classroom focus';

            if (t.ratio >= 0.75) {
              tag = 'over';
              label = 'Strong mastery';
              color = 'green';
              sub = 'Can be stretched with challenging presets';
            } else if (t.ratio >= 0.4) {
              tag = 'dev';
              label = 'Developing';
              color = 'yellow';
              sub = 'Almost there — brief reinforcement helpful';
            }

            return (
              <div key={t.lo.id} className="t-bd-row">
                <div className="t-bd-name">
                  {t.lo.name}
                  <small className="text-dim">{sub}</small>
                </div>
                <div className="t-bd-bar">
                  <div 
                    className={`t-bd-fill ${color}`} 
                    style={{ width: rendered ? `${p}%` : '0%', transition: 'width 1s ease' }}
                  />
                </div>
                <span className={`t-bd-tag ${tag}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="t-focus-banner saas-tip-card">
        <Lightbulb size={24} className="text-violet flex-shrink-0" />
        <div>
          <h4>Actionable Classroom Focus Strategy</h4>
          <p id="tFocusText" className="text-dim" style={{ margin: '4px 0 0' }} dangerouslySetInnerHTML={{ __html: getFocusText() }} />
        </div>
      </div>
    </div>
  );
};
export default TeacherInsightView;
