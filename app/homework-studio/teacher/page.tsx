"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHomework, HomeworkStep } from '../../../components/homework/context';
import BuilderPanel from '../../../components/homework/BuilderPanel';
import AssemblyScreen from '../../../components/homework/AssemblyScreen';
import PreviewScreen from '../../../components/homework/PreviewScreen';
import AnalyticsDashboard from '../../../components/homework/AnalyticsDashboard';
import TeacherInsightView from '../../../components/homework/TeacherInsightView';

import { questionBank } from '../../../data/questions';
import { learningOutcomes, topicContent } from '../../../data/topics';

export default function TeacherPage() {
  const router = useRouter();
  const { 
    builderState, 
    setHomeworkSteps, 
    isCompleted, 
    resetHomework, 
    showToast,
    assignments,
    setAssignments,
    setActiveAssignmentId
  } = useHomework();
  const [viewMode, setViewMode] = useState<'builder' | 'assembling' | 'preview'>('builder');

  const handleGenerate = () => {
    setViewMode('assembling');
    compileHomework();
  };

  const handleAssemblyComplete = () => {
    setViewMode('preview');
  };

  const handleBackToBuilder = () => {
    setViewMode('builder');
  };

  const handlePreviewStudent = () => {
    resetHomework();
    router.push('/homework-studio/student');
    showToast('👀 Switched to Student Preview mode!');
  };

  const compileHomework = () => {
    const steps: HomeworkStep[] = [];
    const selectedTopics = [...builderState.topics];

    // 1. Group questions by selected topics
    const topicQuestions: Record<string, typeof questionBank> = {};
    selectedTopics.forEach(tId => {
      topicQuestions[tId] = questionBank.filter(q => q.lo === tId);
    });

    // 2. Distribute questions count across topics
    const questionsPerTopic: Record<string, number> = {};
    selectedTopics.forEach(tId => {
      questionsPerTopic[tId] = 0;
    });

    let remaining = builderState.length;
    let idx = 0;
    let safety = 0;

    while (remaining > 0 && safety < 100) {
      const tId = selectedTopics[idx % selectedTopics.length];
      const bank = topicQuestions[tId] || [];
      if (questionsPerTopic[tId] < bank.length) {
        questionsPerTopic[tId]++;
        remaining--;
      }
      idx++;
      safety++;
    }

    // 3. Assemble steps sequentially topic by topic
    selectedTopics.forEach((tId, tIdx) => {
      const lo = learningOutcomes.find(l => l.id === tId);
      const content = topicContent[tId];
      if (!lo || !content) return;

      const count = questionsPerTopic[tId] || 0;
      const bank = topicQuestions[tId] || [];
      const qs = bank.slice(0, count);

      if (builderState.format === 'questions') {
        // Only add questions
        qs.forEach(q => {
          steps.push({
            type: q.type,
            topic: tId,
            lo,
            isQuestion: true,
            text: q.text,
            options: q.type === 'mcq' ? q.options : undefined,
            correct: q.type === 'mcq' ? q.correct : undefined,
            explanation: q.explanation,
            unit: q.type === 'fill' ? q.unit : undefined,
            answer: q.type === 'fill' ? q.answer : undefined,
            hint: q.type === 'fill' ? q.hint : undefined,
            sentence: q.type === 'blanks' ? q.sentence : undefined,
            answers: q.type === 'blanks' ? q.answers : undefined,
            wordBank: q.type === 'blanks' ? q.wordBank : undefined,
            pairs: q.type === 'drag' ? q.pairs : undefined,
          });
        });
      } else {
        // Interleaved layout:
        // A. Add Study recap step (with animations/sandboxes)
        steps.push({
          type: 'recap',
          topic: tId,
          lo,
          isQuestion: false,
          content: content.recap
        });

        // B. Add questions for this topic
        qs.forEach(q => {
          steps.push({
            type: q.type,
            topic: tId,
            lo,
            isQuestion: true,
            text: q.text,
            options: q.type === 'mcq' ? q.options : undefined,
            correct: q.type === 'mcq' ? q.correct : undefined,
            explanation: q.explanation,
            unit: q.type === 'fill' ? q.unit : undefined,
            answer: q.type === 'fill' ? q.answer : undefined,
            hint: q.type === 'fill' ? q.hint : undefined,
            sentence: q.type === 'blanks' ? q.sentence : undefined,
            answers: q.type === 'blanks' ? q.answers : undefined,
            wordBank: q.type === 'blanks' ? q.wordBank : undefined,
            pairs: q.type === 'drag' ? q.pairs : undefined,
          });
        });
      }
    });

    setHomeworkSteps(steps);

    // Create a beautiful dynamic custom assignment
    const customId = `custom-${Date.now()}`;
    const topicsList = selectedTopics.map(t => {
      const lo = learningOutcomes.find(l => l.id === t);
      return lo ? lo.short : t;
    }).join(', ');

    const newAssignment = {
      id: customId,
      title: `Generated Assignment #${assignments.filter(a => a.isCustom).length + 1}`,
      topicSummary: `Topics: ${topicsList}`,
      subject: builderState.subject,
      length: steps.length,
      steps,
      isCustom: true,
      isCompleted: false
    };

    setAssignments(prev => {
      const filtered = prev.filter(a => !a.isCustom);
      return [...filtered, newAssignment];
    });
    setActiveAssignmentId(customId);
  };

  return (
    <main style={{ minHeight: '80vh' }}>
      {/* Dynamic Views */}
      {viewMode === 'builder' && (
        <>
          <BuilderPanel onGenerate={handleGenerate} />
          <AnalyticsDashboard />
        </>
      )}

      {viewMode === 'assembling' && (
        <AssemblyScreen onComplete={handleAssemblyComplete} />
      )}

      {viewMode === 'preview' && (
        <PreviewScreen 
          onBack={handleBackToBuilder} 
          onPreviewStudent={handlePreviewStudent} 
        />
      )}

    </main>
  );
}
