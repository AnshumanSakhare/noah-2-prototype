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
import { getMathTopicBundle } from '../../../data/math';

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
    setActiveAssignmentId,
    activeTab,
    setActiveTab
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
      if (builderState.subject === 'math') {
        const bundle = getMathTopicBundle(tId);
        topicQuestions[tId] = bundle ? bundle.questions : [];
      } else {
        topicQuestions[tId] = questionBank.filter(q => q.lo === tId);
      }
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
      let lo: any;
      let content: any;
      let qs: any[] = [];

      if (builderState.subject === 'math') {
        const bundle = getMathTopicBundle(tId);
        if (!bundle) return;
        lo = { id: tId, name: bundle.content.name, short: bundle.content.name };
        content = bundle.content;
        const count = questionsPerTopic[tId] || 0;
        const bank = topicQuestions[tId] || [];
        qs = bank.slice(0, count);
      } else {
        const sciLo = learningOutcomes.find(l => l.id === tId);
        const sciContent = topicContent[tId];
        if (!sciLo || !sciContent) return;
        lo = sciLo;
        content = sciContent;
        const count = questionsPerTopic[tId] || 0;
        const bank = topicQuestions[tId] || [];
        qs = bank.slice(0, count);
      }

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
            numberA: q.numberA,
            numberB: q.numberB,
            correctSide: q.correctSide,
            hideNumbers: q.hideNumbers,
            correctSymbol: q.correctSymbol,
            numbers: q.numbers,
            correctOrder: q.correctOrder,
            useDots: q.useDots,
          });
        });
      } else {
        // Interleaved layout:
        // A. Add Study recap step (with animations/sandboxes)
        if (builderState.subject === 'math') {
          if (tId === 'kg-comparing-numbers') {
            // For KG, only add Math Concept Card & Math Interactive Sandbox, then all game questions in order!
            if (qs.length > 0) {
              steps.push({
                type: 'math-concept',
                topic: tId,
                lo,
                isQuestion: false,
              });
              steps.push({
                type: 'math-recap-guide',
                topic: tId,
                lo,
                isQuestion: false,
              });
              steps.push({
                type: 'math-recap',
                topic: tId,
                lo,
                isQuestion: false,
              });
              let pushedCompareGuide = false;
              let pushedSortGuide = false;
              qs.forEach(q => {
                if (q.type === 'game-compare' && !pushedCompareGuide) {
                  steps.push({
                    type: 'math-compare-guide',
                    topic: tId,
                    lo,
                    isQuestion: false,
                  });
                  pushedCompareGuide = true;
                }
                if (q.type === 'game-sort' && !pushedSortGuide) {
                  steps.push({
                    type: 'math-sort-guide',
                    topic: tId,
                    lo,
                    isQuestion: false,
                  });
                  pushedSortGuide = true;
                }
                steps.push({
                  type: q.type,
                  topic: tId,
                  lo,
                  isQuestion: true,
                  text: q.text,
                  numberA: q.numberA,
                  numberB: q.numberB,
                  correctSide: q.correctSide,
                  hideNumbers: q.hideNumbers,
                  correctSymbol: q.correctSymbol,
                  numbers: q.numbers,
                  correctOrder: q.correctOrder,
                  useDots: q.useDots,
                  explanation: q.explanation,
                });
              });
            }
          } else {
            const mcqs = qs.filter(q => q.type === 'mcq');
            const fills = qs.filter(q => q.type === 'fill');
            const blanks = qs.filter(q => q.type === 'blanks');
            const drags = qs.filter(q => q.type === 'drag');

            const mapQuestionStep = (q: any) => ({
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

            // 1. Concept Card -> MCQs
            if (mcqs.length > 0) {
              steps.push({
                type: 'math-concept',
                topic: tId,
                lo,
                isQuestion: false,
              });
              if (tId === 'g7-pythagoras') {
                steps.push({
                  type: 'math-pythagoras-guide',
                  topic: tId,
                  lo,
                  isQuestion: false,
                });
                steps.push({
                  type: 'math-recap',
                  topic: tId,
                  lo,
                  isQuestion: false,
                });
              }
              mcqs.forEach(q => steps.push(mapQuestionStep(q)));
            }

            // 2. Interactive Sandbox -> Fills
            if (fills.length > 0) {
              if (tId === 'g3-intro-fractions') {
                steps.push({
                  type: 'math-fraction-guide',
                  topic: tId,
                  lo,
                  isQuestion: false,
                });
              }
              if (tId !== 'g7-pythagoras') {
                steps.push({
                  type: 'math-recap',
                  topic: tId,
                  lo,
                  isQuestion: false,
                });
              }
              fills.forEach(q => steps.push(mapQuestionStep(q)));
            }

            // 3. Worked Example -> Blanks
            if (blanks.length > 0) {
              steps.push({
                type: 'math-example',
                topic: tId,
                lo,
                isQuestion: false,
              });
              blanks.forEach(q => steps.push(mapQuestionStep(q)));
            }

            // 4. Recall Flashcard -> Drags
            if (drags.length > 0) {
              steps.push({
                type: 'flashcard',
                topic: tId,
                lo,
                isQuestion: false,
                content: {
                  title: content.name,
                  sub: 'Concept self-test card',
                  text: '',
                  front: content.flashcard.front,
                  back: content.flashcard.back
                }
              });
              drags.forEach(q => steps.push(mapQuestionStep(q)));
            }
          }
        } else {
          // A. Add Study recap step (Science)
          if (qs.length > 0) {
            steps.push({
              type: 'recap',
              topic: tId,
              lo,
              isQuestion: false,
              content: content.recap
            });

            // B. Add questions for this topic (Science)
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
        }
      }
    });

    // Post-process to ensure we end with questions and have no orphaned content cards
    let finalSteps: HomeworkStep[] = [];
    for (let i = 0; i < steps.length; i++) {
      const current = steps[i];
      if (!current.isQuestion && current.type !== 'topic-intro' && current.type !== 'topic-complete') {
        // It's a content card. Let's see if there is at least one question step after it.
        let hasQuestionAfter = false;
        for (let j = i + 1; j < steps.length; j++) {
          if (steps[j].isQuestion) {
            hasQuestionAfter = true;
            break;
          }
        }
        if (hasQuestionAfter) {
          finalSteps.push(current);
        }
      } else {
        finalSteps.push(current);
      }
    }

    // Double check that the last step is a question or intro/complete (no trailing content cards)
    while (finalSteps.length > 0) {
      const last = finalSteps[finalSteps.length - 1];
      if (!last.isQuestion && last.type !== 'topic-intro' && last.type !== 'topic-complete') {
        finalSteps.pop();
      } else {
        break;
      }
    }

    setHomeworkSteps(finalSteps);

    // Create a beautiful dynamic custom assignment
    const customId = `custom-${Date.now()}`;
    const topicsList = selectedTopics.map(t => {
      if (builderState.subject === 'math') {
        const bundle = getMathTopicBundle(t);
        return bundle ? bundle.content.name : t;
      }
      const lo = learningOutcomes.find(l => l.id === t);
      return lo ? lo.short : t;
    }).join(', ');

    const newAssignment = {
      id: customId,
      title: `Generated Assignment #${assignments.filter(a => a.isCustom).length + 1}`,
      topicSummary: `Topics: ${topicsList}`,
      subject: builderState.subject,
      length: finalSteps.length,
      steps: finalSteps,
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
          {activeTab === 'analytics' ? (
            <AnalyticsDashboard />
          ) : (
            <BuilderPanel 
              onGenerate={handleGenerate} 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
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
