import React from 'react';
import { HomeworkProvider } from '../../components/homework/context';
import AppModeBar from '../../components/homework/AppModeBar';
import '../../components/homework/homework-studio.css';
import '../../components/homework/student-studio.css';

export const metadata = {
  title: 'Homework Studio — AI-Powered Interactive Homework',
  description: 'Create interactive, topic-wise homework journeys with AI. Supports MCQ, fill-in-the-blank, drag-and-drop, flashcards, and physics animations.',
};

export default function HomeworkStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HomeworkProvider>
      <div className="homework-studio">
        {/* Google Fonts Link elements */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&family=Patrick+Hand&family=Kalam:wght@400;700&display=swap" 
          rel="stylesheet" 
        />
        
        <div className="confetti-container" id="confetti" />

        <div className="app hw-layout-container">
          {/* Top mode switch bar */}
          <AppModeBar />
          
          {children}
        </div>
      </div>
    </HomeworkProvider>
  );
}
