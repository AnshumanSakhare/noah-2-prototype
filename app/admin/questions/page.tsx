"use client";

import {
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Filter,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import filterData from "@/data/question-bank-plan-filters.json";

interface QuestionVariation {
  id: string;
  template_id: string;
  variation_index: number;
  difficulty: string;
  verifier_status: "pending" | "verified" | "failed";
  verifier_notes: string;
  last_edited_by: string;
  last_edited_at: string;
  status: "draft" | "review" | "active" | "deprecated";
  template_slug: string;
  grade: number;
  topic: string;
  subtopic: string;
  interaction_type: string;
  learning_objective: string;
}

export default function AdminQuestionsPage() {
  const router = useRouter();

  // State
  const [questions, setQuestions] = useState<QuestionVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedVerifierStatus, setSelectedVerifierStatus] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Groups (grade + topic) that hold more than the intended 9 variations.
  const [excessGroups, setExcessGroups] = useState<
    { grade: number; topic: string; count: number }[]
  >([]);
  const [showExcess, setShowExcess] = useState(false);

  const fetchExcessGroups = async () => {
    try {
      const res = await fetch("/api/admin/questions/excess");
      const json = await res.json();
      if (json.success) setExcessGroups(json.data);
    } catch (err) {
      console.error("Failed to fetch excess groups:", err);
    }
  };

  useEffect(() => {
    fetchExcessGroups();
  }, []);

  // Jump straight to a specific grade + topic so the excess can be reviewed/trimmed.
  const focusGroup = (grade: number, topic: string) => {
    setSelectedGrades([grade]);
    setSelectedTopic(topic);
    setPage(1);
    setShowExcess(false);
  };

  // Dynamic lists from plan filters JSON
  const grades = React.useMemo(() => {
    return filterData.grades.map((g) => {
      if (g === "KG") {
        return { value: 0, label: "Kindergarten (KG)" };
      }
      const match = g.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return { value: num, label: `Grade ${num}` };
    });
  }, []);

  // Determine list of topics based on selected grades
  const availableTopics = React.useMemo(() => {
    if (selectedGrades.length === 0) {
      return filterData.topics;
    }
    const unionTopics = new Set<string>();
    selectedGrades.forEach((g) => {
      const key = g === 0 ? "KG" : `G${g}`;
      const gradeTopics =
        (filterData.gradeTopicsMap as Record<string, string[]>)[key] || [];
      gradeTopics.forEach((t) => unionTopics.add(t));
    });
    return Array.from(unionTopics).sort();
  }, [selectedGrades]);

  // Reset selected topic if it is no longer valid for the selected grades
  useEffect(() => {
    if (selectedTopic && !availableTopics.includes(selectedTopic)) {
      setSelectedTopic("");
    }
  }, [availableTopics, selectedTopic]);

  const interactionTypes = [
    { value: "tap-select", label: "Tap Select (MCQ, Compare, T/F)" },
    { value: "drag-drop", label: "Drag & Drop (Bins, Matching)" },
    { value: "fill-slot", label: "Fill Slot (Blanks, Symbols)" },
    { value: "sequence-order", label: "Sequence Order" },
    { value: "build-count", label: "Build & Count" },
    { value: "number-line", label: "Number Line" },
    { value: "partition", label: "Partition (Sharing, Fractions)" },
  ];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("limit", String(limit));

      if (search) queryParams.set("search", search);
      if (selectedGrades.length > 0)
        queryParams.set("grade", selectedGrades.join(","));
      if (selectedTopic) queryParams.set("topic", selectedTopic);
      if (selectedDifficulty) queryParams.set("difficulty", selectedDifficulty);
      if (selectedStatus) queryParams.set("status", selectedStatus);
      if (selectedVerifierStatus)
        queryParams.set("verifier_status", selectedVerifierStatus);
      if (selectedTypes.length > 0)
        queryParams.set("interaction_type", selectedTypes.join(","));

      const res = await fetch(`/api/admin/questions?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setQuestions(json.data);
        setTotal(json.pagination.total);
      }
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    setSelectedIds([]); // Reset selection on page/filter change
  }, [
    page,
    limit,
    selectedGrades,
    selectedTopic,
    selectedDifficulty,
    selectedStatus,
    selectedVerifierStatus,
    selectedTypes,
  ]);

  // Handle keyboard debounced search on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setPage(1);
      fetchQuestions();
    }
  };

  // Bulk Actions
  const handleBulkAction = async (
    action: "mark_status" | "flag_reverify",
    statusValue?: string,
  ) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action, statusValue }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchQuestions();
        setSelectedIds([]);
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error performing bulk action");
    }
  };

  // Delete single variation
  const handleDeleteQuestion = async (id: string, slug: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete variation\n"${slug}"?\n\nThis cannot be undone.`,
      )
    )
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchQuestions();
        fetchExcessGroups();
        setSelectedIds((prev) => prev.filter((x) => x !== id));
      } else {
        alert(`Delete failed: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting question");
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Permanently delete ${selectedIds.length} selected variation(s)?\n\nThis cannot be undone.`,
      )
    )
      return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/admin/questions/${id}`, { method: "DELETE" }),
        ),
      );
      setSelectedIds([]);
      fetchQuestions();
      fetchExcessGroups();
    } catch (err) {
      console.error(err);
      alert("Error during bulk delete");
    }
  };

  // Toggle Filters
  const toggleGrade = (gradeVal: number) => {
    setPage(1);
    setSelectedGrades((prev) =>
      prev.includes(gradeVal)
        ? prev.filter((g) => g !== gradeVal)
        : [...prev, gradeVal],
    );
  };

  const toggleType = (typeVal: string) => {
    setPage(1);
    setSelectedTypes((prev) =>
      prev.includes(typeVal)
        ? prev.filter((t) => t !== typeVal)
        : [...prev, typeVal],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Status visual helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "badge-good";
      case "review":
        return "badge-mango";
      case "deprecated":
        return "badge-bad";
      default:
        return "badge-gray";
    }
  };

  const getVerifierColor = (vStatus: string) => {
    switch (vStatus) {
      case "verified":
        return "dot-good";
      case "failed":
        return "dot-bad";
      default:
        return "dot-mango";
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="view-container">
      {/* Top Banner Area */}
      <header className="page-header">
        <div className="title-area">
          <h1>Question Bank</h1>
          <p>
            Review, preview, and edit EduQuest game templates and variation
            slates.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              setSearch("");
              setSelectedGrades([]);
              setSelectedTopic("");
              setSelectedDifficulty("");
              setSelectedStatus("");
              setSelectedVerifierStatus("");
              setSelectedTypes([]);
              setPage(1);
            }}
          >
            Reset Filters
          </button>
          <button className="btn-primary" onClick={fetchQuestions}>
            <RefreshCw size={14} style={{ marginRight: "6px" }} />
            Reload Bank
          </button>
        </div>
      </header>

      {/* Main Grid: Filters Sidebar + Grid table */}
      <div className="main-layout-grid">
        {/* Filters Sidebar */}
        <aside className="filters-sidebar">
          <div className="sidebar-section">
            <h4>Difficulty</h4>
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setPage(1);
                setSelectedDifficulty(e.target.value);
              }}
              className="select-input"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="sidebar-section">
            <h4>Status</h4>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setPage(1);
                setSelectedStatus(e.target.value);
              }}
              className="select-input"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>

          <div className="sidebar-section">
            <h4>Verifier Status</h4>
            <select
              value={selectedVerifierStatus}
              onChange={(e) => {
                setPage(1);
                setSelectedVerifierStatus(e.target.value);
              }}
              className="select-input"
            >
              <option value="">All Verifications</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="sidebar-section">
            <h4>Topic Focus</h4>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setPage(1);
                setSelectedTopic(e.target.value);
              }}
              className="select-input"
            >
              <option value="">All Topics</option>
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="sidebar-section">
            <h4>Target Grades</h4>
            <div className="checkbox-stack">
              {grades.map((g) => {
                const checked = selectedGrades.includes(g.value);
                return (
                  <label
                    key={g.value}
                    className="checkbox-label"
                    onClick={() => toggleGrade(g.value)}
                  >
                    {checked ? (
                      <CheckSquare size={16} className="text-grape" />
                    ) : (
                      <Square size={16} />
                    )}
                    <span>{g.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Interaction Formats</h4>
            <div className="checkbox-stack">
              {interactionTypes.map((t) => {
                const checked = selectedTypes.includes(t.value);
                return (
                  <label
                    key={t.value}
                    className="checkbox-label"
                    onClick={() => toggleType(t.value)}
                  >
                    {checked ? (
                      <CheckSquare size={16} className="text-grape" />
                    ) : (
                      <Square size={16} />
                    )}
                    <span>{t.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content Table Area */}
        <section className="table-area">
          {/* Top Bulk Action Bar */}
          <div className="table-action-bar">
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by topic or slug... (Press Enter)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="search-input"
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="bulk-badge-wrap animate-fade">
                <span>{selectedIds.length} selected</span>
                <button
                  className="bulk-btn good"
                  onClick={() => handleBulkAction("mark_status", "active")}
                >
                  Mark Active
                </button>
                <button
                  className="bulk-btn bad"
                  onClick={() => handleBulkAction("mark_status", "deprecated")}
                >
                  Deprecate
                </button>
                <button
                  className="bulk-btn verify"
                  onClick={() => handleBulkAction("flag_reverify")}
                >
                  Re-verify
                </button>
                <button className="bulk-btn delete" onClick={handleBulkDelete}>
                  <Trash2 size={12} style={{ marginRight: 3 }} />
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Excess groups: grade+topic holding more than the intended 9 */}
          {excessGroups.length > 0 && (
            <div className="excess-panel">
              <button
                className="excess-header"
                onClick={() => setShowExcess((s) => !s)}
              >
                <AlertTriangle size={15} className="text-mango" />
                <span>
                  {excessGroups.length} topic group
                  {excessGroups.length === 1 ? "" : "s"} have more than 9
                  questions — possible duplicates to review
                </span>
                <span className="excess-toggle">
                  {showExcess ? "Hide" : "Show"}
                </span>
              </button>
              {showExcess && (
                <div className="excess-chips">
                  {excessGroups.map((g) => (
                    <button
                      key={`${g.grade}-${g.topic}`}
                      className="excess-chip"
                      onClick={() => focusGroup(g.grade, g.topic)}
                      title="Filter to this grade + topic"
                    >
                      <span className="excess-grade">
                        {g.grade === 0 ? "KG" : `G${g.grade}`}
                      </span>
                      <span>{g.topic}</span>
                      <span className="excess-count">{g.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Table Container */}
          <div className="table-card">
            {loading ? (
              <div className="table-loading">
                <RefreshCw size={24} className="spin-icon" />
                <p>Loading questions bank...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="table-empty">
                <AlertTriangle size={32} className="text-mango" />
                <h3>No questions found</h3>
                <p>Try clearing your active filters or query parameters.</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <button
                        onClick={toggleSelectAll}
                        className="cell-checkbox-btn"
                      >
                        {selectedIds.length === questions.length ? (
                          <CheckSquare size={16} className="text-grape" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th>Grade / Topic Focus</th>
                    <th>Interaction Details</th>
                    <th>Verifier</th>
                    <th>Difficulty</th>
                    <th>Status</th>
                    <th>Last Edited</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => {
                    const isRowSelected = selectedIds.includes(q.id);
                    return (
                      <tr
                        key={q.id}
                        className={isRowSelected ? "row-selected" : ""}
                      >
                        <td>
                          <button
                            onClick={() => toggleSelectOne(q.id)}
                            className="cell-checkbox-btn"
                          >
                            {isRowSelected ? (
                              <CheckSquare size={16} className="text-grape" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="cell-main">
                            <span className="grid-grade-badge">
                              {q.grade === 0 ? "KG" : `G${q.grade}`}
                            </span>
                            <div className="info-wrap">
                              <span className="topic-text">{q.topic}</span>
                              <span className="subtopic-text">
                                {q.subtopic}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="info-wrap">
                            <span
                              className="objective-text"
                              title={q.learning_objective}
                            >
                              {q.learning_objective}
                            </span>
                            <span className="slug-tag">
                              {q.template_slug} ({q.variation_index})
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="verifier-wrap">
                            <span
                              className={`verifier-dot ${getVerifierColor(q.verifier_status)}`}
                            />
                            <span
                              className="verifier-text"
                              title={q.verifier_notes || "No notes"}
                            >
                              {q.verifier_status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="difficulty-text">
                            {q.difficulty}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${getStatusColor(q.status)}`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td>
                          <div className="info-wrap">
                            <span className="editor-name">
                              {q.last_edited_by || "System Initial"}
                            </span>
                            <span className="editor-time">
                              {q.last_edited_at
                                ? new Date(
                                    q.last_edited_at,
                                  ).toLocaleDateString()
                                : "—"}
                            </span>
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap", width: "1%" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Link
                              href={`/admin/questions/${q.id}`}
                              className="row-action-btn"
                            >
                              Edit <ChevronRight size={14} />
                            </Link>
                            <button
                              className="row-delete-btn"
                              title="Delete variation"
                              disabled={deletingId === q.id}
                              onClick={() =>
                                handleDeleteQuestion(
                                  q.id,
                                  `${q.template_slug} (${q.variation_index})`,
                                )
                              }
                            >
                              {deletingId === q.id ? (
                                <RefreshCw size={13} className="spin-icon" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer — always shows the true total for the current filter */}
          {!loading && questions.length > 0 && (
            <div className="pagination-footer">
              <div className="footer-left">
                <span className="total-display">
                  Showing {questions.length} of {total} variation
                  {total === 1 ? "" : "s"}
                </span>
                <label className="page-size-label">
                  Per page:
                  <select
                    className="page-size-select"
                    value={limit}
                    onChange={(e) => {
                      setPage(1);
                      setLimit(Number(e.target.value));
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </label>
              </div>
              {totalPages > 1 && (
                <div className="paginator-controls">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="pag-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pNum) => (
                      <button
                        key={pNum}
                        onClick={() => setPage(pNum)}
                        className={`pag-btn num-btn ${page === pNum ? "active" : ""}`}
                      >
                        {pNum}
                      </button>
                    ),
                  )}

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="pag-btn"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <style>{`
        /* ─── Premium Admin styling sheet ─── */
        .view-container {
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1.5px solid #E4E7F2;
          padding-bottom: 20px;
        }

        .title-area h1 {
          font-size: 1.7rem;
          font-weight: 900;
          color: #20243A;
          margin: 0 0 4px 0;
        }

        .title-area p {
          font-size: 0.82rem;
          color: #52586F;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary {
          background: #6C5CE7;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          box-shadow: 0 4px 10px rgba(108, 92, 231, 0.12);
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #5A4AD1;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: white;
          border: 1.5px solid #CBD5E1;
          color: #52586F;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover {
          border-color: #20243A;
          color: #20243A;
        }

        .main-layout-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          align-items: start;
        }

        .filters-sidebar {
          background: white;
          border: 1px solid #E4E7F2;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-section h4 {
          font-size: 0.76rem;
          font-weight: 850;
          text-transform: uppercase;
          color: #94A3B8;
          letter-spacing: 0.05em;
          margin: 0 0 10px 0;
        }

        .select-input {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid #E5E7F0;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 650;
          outline: none;
          color: #20243A;
          background-color: #ffffff;
        }

        .checkbox-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #52586F;
          cursor: pointer;
          user-select: none;
        }

        .text-grape {
          color: #6C5CE7;
        }

        .table-area {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .table-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          max-width: 450px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }

        .search-input {
          width: 100%;
          padding: 9px 12px 9px 38px;
          border: 1.5px solid #E5E7F0;
          border-radius: 10px;
          font-size: 0.82rem;
          outline: none;
          background: white;
          color: #20243A;
        }

        .search-input:focus {
          border-color: #6C5CE7;
        }

        .bulk-badge-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(108, 92, 231, 0.05);
          border: 1.5px solid rgba(108, 92, 231, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 800;
          color: #6C5CE7;
        }

        .bulk-btn {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 850;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }

        .bulk-btn.good { background: #16B981; color: white; }
        .bulk-btn.bad { background: #F0556B; color: white; }
        .bulk-btn.verify { background: #FF9F43; color: white; }
        .bulk-btn.delete { background: #DC2626; color: white; }
        .bulk-btn:hover { opacity: 0.9; transform: translateY(-0.5px); }

        .row-delete-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1.5px solid #FCA5A5;
          background: rgba(220, 38, 38, 0.04);
          color: #DC2626;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .row-delete-btn:hover:not(:disabled) {
          background: #DC2626;
          border-color: #DC2626;
          color: white;
          transform: scale(1.05);
        }

        .row-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .excess-panel {
          background: #FFF8EE;
          border: 1.5px solid #FCD9A6;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .excess-header {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 800;
          color: #9A6212;
          text-align: left;
          width: 100%;
          padding: 0;
        }

        .excess-toggle {
          margin-left: auto;
          font-size: 0.72rem;
          font-weight: 850;
          color: #B4791C;
          text-decoration: underline;
        }

        .excess-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .excess-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: white;
          border: 1.5px solid #FCD9A6;
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 0.76rem;
          font-weight: 750;
          color: #20243A;
          cursor: pointer;
          transition: all 0.15s;
        }

        .excess-chip:hover {
          border-color: #F0A030;
          background: #FFFCF6;
          transform: translateY(-0.5px);
        }

        .excess-grade {
          font-weight: 900;
          font-size: 0.68rem;
          color: #6C5CE7;
          background: rgba(108, 92, 231, 0.08);
          padding: 2px 6px;
          border-radius: 5px;
        }

        .excess-count {
          font-weight: 900;
          font-size: 0.72rem;
          color: white;
          background: #F0A030;
          padding: 2px 7px;
          border-radius: 20px;
        }

        .table-card {
          background: white;
          border: 1px solid #E4E7F2;
          border-radius: 16px;
          overflow: hidden;
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          background: #F8F9FC;
          padding: 12px 16px;
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
          color: #94A3B8;
          border-bottom: 1.5px solid #E4E7F2;
          letter-spacing: 0.04em;
        }

        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F3FA;
          font-size: 0.82rem;
          vertical-align: middle;
        }

        .row-selected {
          background: rgba(108, 92, 231, 0.015);
        }

        .cell-checkbox-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: #cbd5e1;
          display: grid;
          place-items: center;
          padding: 0;
        }

        .cell-main {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .grid-grade-badge {
          padding: 4px 8px;
          background: rgba(108, 92, 231, 0.08);
          color: #6C5CE7;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 900;
        }

        .info-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .topic-text {
          font-weight: 800;
          color: #20243A;
        }

        .subtopic-text {
          font-size: 0.74rem;
          color: #52586F;
          font-weight: 600;
        }

        .objective-text {
          font-weight: 700;
          color: #20243A;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .slug-tag {
          font-family: monospace;
          font-size: 0.7rem;
          color: #94A3B8;
          font-weight: 600;
        }

        .verifier-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .verifier-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .dot-good { background: #16B981; box-shadow: 0 0 6px #16B981; }
        .dot-bad { background: #F0556B; box-shadow: 0 0 6px #F0556B; }
        .dot-mango { background: #FF9F43; box-shadow: 0 0 6px #FF9F43; }

        .verifier-text {
          font-weight: 750;
          font-size: 0.76rem;
          text-transform: capitalize;
        }

        .difficulty-text {
          font-weight: 800;
          font-size: 0.76rem;
          text-transform: capitalize;
          color: #52586F;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
        }

        .badge-good { background: rgba(22, 185, 129, 0.08); color: #16B981; }
        .badge-mango { background: rgba(255, 159, 67, 0.08); color: #FF9F43; }
        .badge-bad { background: rgba(240, 85, 107, 0.08); color: #F0556B; }
        .badge-gray { background: #f1f5f9; color: #64748b; }

        .editor-name {
          font-weight: 750;
          color: #20243A;
        }

        .editor-time {
          font-size: 0.7rem;
          color: #94A3B8;
          font-weight: 650;
        }

        .row-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #6C5CE7;
          text-decoration: none;
          font-weight: 800;
          font-size: 0.78rem;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s;
        }

        .row-action-btn:hover {
          background: rgba(108, 92, 231, 0.05);
        }

        .table-loading {
          padding: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #52586F;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
          color: #6C5CE7;
        }

        .table-empty {
          padding: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }

        .table-empty h3 {
          font-size: 1.1rem;
          font-weight: 850;
          margin: 0;
          color: #20243A;
        }

        .table-empty p {
          font-size: 0.8rem;
          color: #52586F;
          margin: 0;
        }

        .pagination-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 4px;
        }

        .total-display {
          font-size: 0.76rem;
          font-weight: 750;
          color: #52586F;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .page-size-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 750;
          color: #94A3B8;
        }

        .page-size-select {
          padding: 4px 8px;
          border: 1.5px solid #E5E7F0;
          border-radius: 6px;
          font-size: 0.74rem;
          font-weight: 800;
          color: #20243A;
          background: white;
          cursor: pointer;
        }

        .paginator-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pag-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E5E7F0;
          background: white;
          color: #52586F;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .pag-btn:hover:not(:disabled) {
          border-color: #6C5CE7;
          color: #6C5CE7;
        }

        .pag-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pag-btn.num-btn {
          font-size: 0.76rem;
          font-weight: 800;
        }

        .pag-btn.num-btn.active {
          background: #6C5CE7;
          border-color: #6C5CE7;
          color: white;
          box-shadow: 0 3px 8px rgba(108, 92, 231, 0.15);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes kg-slidein {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
