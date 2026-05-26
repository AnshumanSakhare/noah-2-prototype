"use client";

import React, { useState } from 'react';
import { 
  Activity, 
  ChevronDown, 
  Lightbulb, 
  AlertCircle, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface StudentSubmission {
  id: string;
  name: string;
  avatar: string;
  color: string;
  timeSpent: string;
  submittedAgo: string;
  score: string;
  tag: 'weak' | 'mid' | 'strong';
  tagLabel: string;
  questions: Array<{
    q: string;
    correct: boolean;
    meta: string;
  }>;
  aiRecommendation: string;
}

const mockSubmissions: StudentSubmission[] = [
  {
    id: 'arjun',
    name: 'Arjun M.',
    avatar: 'AM',
    color: 'var(--accent-2)',
    timeSpent: '8m spent',
    submittedAgo: 'Submitted 10m ago',
    score: '3/5',
    tag: 'weak',
    tagLabel: 'Needs Support',
    questions: [
      { q: 'Q1: Balanced Forces concept', correct: true, meta: 'Correct · 45s' },
      { q: 'Q2: Inertia vs Action-Reaction', correct: false, meta: "Incorrect · 2m 10s · Picked 'Third Law'" },
      { q: 'Q3: Friction calculation', correct: true, meta: 'Correct · 1m 20s' },
      { q: 'Q4: Balanced force calculation', correct: true, meta: 'Correct · 55s' },
      { q: 'Q5: F = ma formula rearrangement', correct: false, meta: 'Incorrect · 2m 50s · Multiplied F * m' },
    ],
    aiRecommendation: "Confused Newton's First vs Third Law (inertial frame vs equal/opposite force pairs). Struggled with ratio division. Suggest short skateboard-curb inertia visual."
  },
  {
    id: 'meera',
    name: 'Meera S.',
    avatar: 'MS',
    color: 'var(--accent)',
    timeSpent: '7m spent',
    submittedAgo: 'Submitted 1h ago',
    score: '5/5',
    tag: 'strong',
    tagLabel: 'Strong',
    questions: [
      { q: 'Q1: Balanced Forces concept', correct: true, meta: 'Correct · 30s' },
      { q: 'Q2: Inertia vs Action-Reaction', correct: true, meta: 'Correct · 50s' },
      { q: 'Q3: Friction calculation', correct: true, meta: 'Correct · 1m 15s' },
      { q: 'Q4: Balanced force calculation', correct: true, meta: 'Correct · 40s' },
      { q: 'Q5: F = ma formula rearrangement', correct: true, meta: 'Correct · 1m 30s' },
    ],
    aiRecommendation: "Flawless understanding! Perfect conceptual mastery and swift problem solving. Ready for advanced friction force challenges or multi-mass tension paths."
  },
  {
    id: 'kabir',
    name: 'Kabir R.',
    avatar: 'KR',
    color: 'var(--path)',
    timeSpent: '11m spent',
    submittedAgo: 'Submitted 2h ago',
    score: '4/5',
    tag: 'mid',
    tagLabel: 'Developing',
    questions: [
      { q: 'Q1: Balanced Forces concept', correct: true, meta: 'Correct · 55s' },
      { q: 'Q2: Inertia vs Action-Reaction', correct: true, meta: 'Correct · 1m 40s' },
      { q: 'Q3: Friction calculation', correct: true, meta: 'Correct · 2m 05s' },
      { q: 'Q4: Balanced force calculation', correct: true, meta: 'Correct · 1m 10s' },
      { q: 'Q5: F = ma formula rearrangement', correct: false, meta: 'Incorrect · 3m 10s · Divided Mass / Force' },
    ],
    aiRecommendation: "Strong comprehension of conceptual Newton's Laws. Struggled with equation substitution under time pressure. Review the visual F-m-a triangle."
  },
  {
    id: 'rohan',
    name: 'Rohan G.',
    avatar: 'RG',
    color: 'var(--accent-3)',
    timeSpent: '9m spent',
    submittedAgo: 'Submitted 3h ago',
    score: '3/5',
    tag: 'weak',
    tagLabel: 'Needs Support',
    questions: [
      { q: 'Q1: Balanced Forces concept', correct: true, meta: 'Correct · 1m 10s' },
      { q: 'Q2: Inertia vs Action-Reaction', correct: false, meta: "Incorrect · 3m 05s · Picked 'Third Law'" },
      { q: 'Q3: Friction calculation', correct: false, meta: 'Incorrect · 2m 30s · Forgot gravity constant' },
      { q: 'Q4: Balanced force calculation', correct: true, meta: 'Correct · 1m 15s' },
      { q: 'Q5: F = ma formula rearrangement', correct: true, meta: 'Correct · 1m 00s' },
    ],
    aiRecommendation: "Difficulty identifying difference between net net force and contact/friction vectors. Confused reaction force pairs. Suggest friction simulator practice."
  }
];

export const AnalyticsDashboard: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="analytics-dashboard saas-dashboard-wrapper">
      <div className="ad-header">
        <Activity size={20} className="text-indigo" />
        <h2 style={{ margin: 0 }}>Class Accuracy &amp; AI Misconception Alerts</h2>
      </div>
      
      <div className="analytics-grid">
        {/* Left: Recent Student Submissions */}
        <div className="saas-card shadow-sm">
          <h4 className="saas-section-title">
            <TrendingUp size={14} className="text-indigo" style={{ marginRight: '6px' }} />
            Recent Homework Turn-ins
          </h4>
          <div className="student-status-list">
            {mockSubmissions.map(sub => {
              const isExpanded = !!expandedRows[sub.id];
              return (
                <div 
                  key={sub.id} 
                  className={`status-row ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleRow(sub.id)}
                >
                  <div className="status-summary">
                    <div className="status-avatar" style={{ backgroundColor: sub.color }}>
                      {sub.avatar}
                    </div>
                    <div className="status-info">
                      <div className="status-name">{sub.name}</div>
                      <div className="status-time">
                        <Clock size={10} style={{ marginRight: '3px', display: 'inline' }} />
                        {sub.submittedAgo} · {sub.timeSpent}
                      </div>
                    </div>
                    <div className="status-score-wrap">
                      <div className={`status-score ${sub.tag}`}>{sub.score}</div>
                      <span className={`status-badge ${sub.tag}`}>{sub.tagLabel}</span>
                    </div>
                    <ChevronDown size={14} className={`status-arrow-icon ${isExpanded ? 'rotated' : ''}`} />
                  </div>
                  
                  <div className="status-details" style={{ display: isExpanded ? 'block' : 'none' }}>
                    <div className="details-breakdown">
                      <div className="db-title">Worksheet Question Results</div>
                      <div className="db-grid">
                        {sub.questions.map((q, idx) => (
                          <div 
                            key={idx} 
                            className={`db-item ${q.correct ? 'correct' : 'wrong'}`}
                          >
                            <div className="db-item-header">
                              <span className="db-item-icon">
                                {q.correct ? <CheckCircle2 size={12} className="text-correct" /> : <XCircle size={12} className="text-wrong" />}
                              </span>
                              <span className="db-q">{q.q}</span>
                            </div>
                            <div className="db-meta">{q.meta}</div>
                          </div>
                        ))}
                      </div>
                      <div className="db-insight">
                        <Lightbulb size={14} className="text-violet flex-shrink-0" style={{ marginTop: '2px' }} />
                        <span><strong>AI Assistant Recommendation:</strong> {sub.aiRecommendation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Right: Misconception Panels */}
        <div className="misconception-panel">
          <h4 className="saas-section-title text-red">
            <AlertCircle size={14} style={{ marginRight: '6px' }} />
            Critical Misconception Hotspots
          </h4>
          
          {/* Misconception 1 */}
          <div className="misconception-card saas-alert-card">
            <div className="mc-head">
              <AlertCircle size={16} className="text-red" />
              <span className="mc-topic">Newton's First Law vs Third Law</span>
              <span className="mc-alert-tag">High Alert</span>
            </div>
            <div className="mc-statement">
              <strong>6 students</strong> confusing inertia (First Law - objects resisting acceleration) with action-reaction force pairs (Third Law).
            </div>
            <div className="mc-action saas-tip-box">
              <Lightbulb size={16} className="text-red flex-shrink-0" />
              <div>
                <strong>Actionable Teaching Tip:</strong> Open tomorrow's class with a physical demo. Ask: <em>"Why do you lurch forward when a skateboard hits a curb?"</em> Focus on body inertia rather than pushback force.
              </div>
            </div>
          </div>

          {/* Misconception 2 */}
          <div className="misconception-card mild saas-alert-card">
            <div className="mc-head">
              <Search size={16} className="text-teal" />
              <span className="mc-topic">F = ma Algebraic Rearrangement</span>
              <span className="mc-alert-tag">Mild Nudge</span>
            </div>
            <div className="mc-statement" style={{ color: 'var(--text)' }}>
              <strong>4 students</strong> multiplied force by mass (<code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px' }}>a = F * m</code>) instead of dividing (<code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px' }}>a = F / m</code>).
            </div>
            <div className="mc-action saas-tip-box">
              <Sparkles size={16} className="text-teal flex-shrink-0" />
              <div>
                <strong>Actionable Teaching Tip:</strong> Write the triangular cover-and-solve F-m-a widget on the whiteboard. Host three 1-minute quick calculation runs.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AnalyticsDashboard;
