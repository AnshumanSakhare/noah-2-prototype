"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, HelpCircle, Layers, Settings, Users, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-container">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo-spark">✨</div>
          <div className="brand-wrap">
            <span className="brand-title">EduQuest</span>
            <span className="brand-badge">QA Console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link
            href="/admin/questions"
            className={`nav-item ${pathname.startsWith("/admin/questions") && !pathname.startsWith("/admin/questions/generator") ? "active" : ""}`}
          >
            <HelpCircle size={18} />
            <span>Question Bank</span>
          </Link>

          <Link
            href="/admin/questions/generator"
            className={`nav-item ${pathname.startsWith("/admin/questions/generator") ? "active" : ""}`}
          >
            <Settings size={18} />
            <span>AI Generator</span>
          </Link>
          
          <div className="nav-group-title">Homework Operations</div>
          
          <Link
            href="/homework-studio/teacher"
            className="nav-item"
          >
            <Layers size={18} />
            <span>Teacher Console</span>
          </Link>

          <Link
            href="/homework-studio/student"
            className="nav-item"
          >
            <Users size={18} />
            <span>Student Workspace</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="profile-avatar">QA</div>
            <div className="profile-info">
              <span className="profile-name">QA Testing Team</span>
              <span className="profile-role">Admin Role</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content viewport */}
      <main className="admin-content">
        {children}
      </main>

      <style>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          background: #F8F9FC;
          font-family: 'Figtree', sans-serif;
        }

        .admin-sidebar {
          width: 250px;
          background: #ffffff;
          border-right: 1px solid #E4E7F2;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid #F1F3FA;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-spark {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #6C5CE7;
          display: grid;
          place-items: center;
          font-size: 1.1rem;
        }

        .brand-wrap {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 0.95rem;
          font-weight: 900;
          color: #20243A;
          letter-spacing: -0.01em;
        }

        .brand-badge {
          font-size: 0.65rem;
          font-weight: 800;
          color: #6C5CE7;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .sidebar-nav {
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .nav-group-title {
          font-size: 0.66rem;
          font-weight: 800;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 18px 0 8px 12px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          color: #52586F;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .nav-item:hover {
          background: #F1F3FA;
          color: #20243A;
        }

        .nav-item.active {
          background: rgba(108, 92, 231, 0.07);
          color: #6C5CE7;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #F1F3FA;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F8F9FC;
          padding: 10px;
          border-radius: 8px;
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #E5E7F0;
          color: #52586F;
          display: grid;
          place-items: center;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .profile-name {
          font-size: 0.78rem;
          font-weight: 800;
          color: #20243A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-role {
          font-size: 0.68rem;
          font-weight: 600;
          color: #94A3B8;
        }

        .admin-content {
          flex: 1;
          min-height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
