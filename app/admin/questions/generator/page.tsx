"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  Eye,
  Settings,
  X,
  CheckSquare,
  Square,
  Sparkle,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Play,
  Trash2
} from "lucide-react";
import filterData from "@/data/question-bank-plan-filters.json";

// The 7 canonical interaction archetypes — auto-fill picks 3 distinct ones for variety.
const ARCHETYPES = ["tap-select", "drag-drop", "fill-slot", "sequence-order", "build-count", "number-line", "partition"];

interface VariationSlot {
  id: string;
  template_id: string;
  variation_index: number;
  variation_data: any;
  difficulty: string;
  verifier_status: "pending" | "verified" | "failed";
  status: "draft" | "review" | "active" | "deprecated";
  template_slug: string;
  grade: number;
  topic: string;
  subtopic: string;
  interaction_type: string;
  learning_objective: string;
  template_html: string;
}

export default function AIGeneratorPage() {
  const router = useRouter();

  // Filters State
  const [selectedGrade, setSelectedGrade] = useState<number | "">("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  // Slots State
  const [slots, setSlots] = useState<VariationSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Modal State
  const [activeSlot, setActiveSlot] = useState<{
    difficulty: "easy" | "medium" | "hard";
    index: number;
    variation?: VariationSlot;
  } | null>(null);

  const [openGenModal, setOpenGenModal] = useState(false);
  const [openEditAIModal, setOpenEditAIModal] = useState(false);
  const [openPreviewModal, setOpenPreviewModal] = useState(false);

  // Form State inside modals
  const [interactionArchetype, setInteractionArchetype] = useState("tap-select");
  const [customPrompt, setCustomPrompt] = useState("");
  const [previewItem, setPreviewItem] = useState<VariationSlot | null>(null);

  // Brainstorm state
  const [brainstorming, setBrainstorming] = useState(false);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<any | null>(null);

  // Close gen modal and reset brainstorm state
  const closeGenModal = () => {
    setOpenGenModal(false);
    setIdeas([]);
    setSelectedIdea(null);
    setCustomPrompt("");
  };

  // Brainstorm Ideas
  const handleBrainstormIdeas = async () => {
    if (selectedGrade === "" || !selectedTopic || !activeSlot) return;
    setBrainstorming(true);
    setIdeas([]);
    setSelectedIdea(null);
    try {
      const res = await fetch("/api/admin/generator/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedGrade,
          topic: selectedTopic,
          difficulty: activeSlot.difficulty,
          interactionArchetype,
          customPrompt
        })
      });
      const json = await res.json();
      if (json.success) {
        setIdeas(json.ideas);
      } else {
        alert(`Failed to brainstorm: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error brainstorming ideas");
    } finally {
      setBrainstorming(false);
    }
  };

  // Grade Options Mapping
  const gradeOptions = useMemo(() => {
    return filterData.grades.map((g) => {
      if (g === "KG") {
        return { value: 0, label: "Kindergarten (KG)" };
      }
      const match = g.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return { value: num, label: `Grade ${num}` };
    });
  }, []);

  // Filter topics based on grade
  const availableTopics = useMemo(() => {
    if (selectedGrade === "") {
      return filterData.topics;
    }
    const key = selectedGrade === 0 ? "KG" : `G${selectedGrade}`;
    const gradeTopics = (filterData.gradeTopicsMap as Record<string, string[]>)[key] || [];
    return Array.from(new Set(gradeTopics)).sort();
  }, [selectedGrade]);

  // Reset selected topic if invalid for current grade
  useEffect(() => {
    if (selectedTopic && !availableTopics.includes(selectedTopic)) {
      setSelectedTopic("");
    }
  }, [availableTopics, selectedTopic]);

  // Fetch slot status
  const fetchSlots = async () => {
    if (selectedGrade === "" || !selectedTopic) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/generator/list?grade=${selectedGrade}&topic=${encodeURIComponent(selectedTopic)}`);
      const json = await res.json();
      if (json.success) {
        setSlots(json.data);
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error loading slot matrix");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedGrade, selectedTopic]);

  // Delete a generated slot (variation + its template references), then refresh.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDeleteSlot = async (variationId: string) => {
    if (!confirm("Delete this generated question slot permanently? This cannot be undone.")) return;
    setDeletingId(variationId);
    try {
      const res = await fetch(`/api/admin/questions/${variationId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await fetchSlots();
      } else {
        alert(`Failed to delete: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting slot");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Auto-Fill: idea → game → save, for Slot #1 of Easy / Medium / Hard ──
  // Picks 3 DISTINCT interaction archetypes for variety; runs sequentially so the
  // grade/difficulty context is honored per slot. Skips slots already filled.
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoStatus, setAutoStatus] = useState("");
  // Which slot row (1, 2 or 3) the Auto-Fill button targets across Easy/Med/Hard.
  const [autoFillRow, setAutoFillRow] = useState<1 | 2 | 3>(1);

  const autoGenerateOne = async (
    difficulty: "easy" | "medium" | "hard",
    archetype: string,
    rowIndex: number
  ): Promise<string> => {
    // 1) Brainstorm one idea for this grade/difficulty/archetype.
    let idea: any = null;
    try {
      const ideaRes = await fetch("/api/admin/generator/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedGrade,
          topic: selectedTopic,
          difficulty,
          interactionArchetype: archetype,
          customPrompt: ""
        })
      });
      const ideaJson = await ideaRes.json();
      if (ideaJson.success && Array.isArray(ideaJson.ideas) && ideaJson.ideas.length > 0) {
        idea = ideaJson.ideas[0];
      }
    } catch (e) {
      console.error("idea step failed", e);
    }

    // 2) Generate the game from that idea and save (retry once on validation/network failure).
    let lastErr = "unknown error";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const genRes = await fetch("/api/admin/generator/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            grade: selectedGrade,
            topic: selectedTopic,
            difficulty,
            variationIndex: rowIndex,
            interactionArchetype: archetype,
            customPrompt: "",
            selectedIdea: idea
          })
        });
        const genJson = await genRes.json();
        if (genJson.success) return `${difficulty}: ✓ ${archetype}`;
        lastErr = genJson.error || "unknown error";
      } catch (e: any) {
        lastErr = e?.message || "network error";
      }
    }
    return `${difficulty}: ✗ ${archetype} — ${lastErr}`;
  };

  const handleAutoFill = async () => {
    if (selectedGrade === "" || !selectedTopic || autoFilling) return;
    const row = autoFillRow;
    if (!confirm(`Auto-generate Slot #${row} for Easy, Medium and Hard (3 games with 3 distinct interaction types)? This calls the AI ~3× and saves to the DB.`)) return;

    setAutoFilling(true);
    setAutoStatus(`Generating Slot #${row} (Easy, Medium & Hard)…`);
    const diffs: Array<"easy" | "medium" | "hard"> = ["easy", "medium", "hard"];
    // 3 distinct archetypes for variety.
    const picks = [...ARCHETYPES].sort(() => Math.random() - 0.5).slice(0, 3);

    try {
      // Run all three slots concurrently for speed.
      const results = await Promise.all(
        diffs.map((diff, i) =>
          getSlot(diff, row)
            ? Promise.resolve(`${diff}: skipped (Slot ${row} already filled)`)
            : autoGenerateOne(diff, picks[i], row)
        )
      );
      await fetchSlots();
      alert("Auto-fill complete:\n\n" + results.join("\n"));
    } catch (e: any) {
      alert("Auto-fill error: " + (e?.message || "unknown"));
    } finally {
      setAutoStatus("");
      setAutoFilling(false);
      await fetchSlots();
    }
  };

  // Get variation helper
  const getSlot = (difficulty: "easy" | "medium" | "hard", index: number) => {
    return slots.find(
      (s) => s.difficulty.toLowerCase() === difficulty && s.variation_index === index
    );
  };

  // Trigger Create Question
  const handleCreate = async () => {
    if (!activeSlot || selectedGrade === "" || !selectedTopic) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          grade: selectedGrade,
          topic: selectedTopic,
          difficulty: activeSlot.difficulty,
          variationIndex: activeSlot.index,
          interactionArchetype,
          customPrompt,
          selectedIdea
        })
      });
      const json = await res.json();
      if (json.success) {
        alert("Success! Question slot generated and saved to DB.");
        closeGenModal();
        fetchSlots();
      } else {
        alert(`Failed to generate: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network error occurred during generation");
    } finally {
      setGenerating(false);
    }
  };

  // Trigger Regenerate/Edit Question
  const handleRegenerate = async () => {
    if (!activeSlot || !activeSlot.variation) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate",
          grade: selectedGrade,
          topic: selectedTopic,
          difficulty: activeSlot.difficulty,
          variationIndex: activeSlot.index,
          customPrompt,
          variationId: activeSlot.variation.id
        })
      });
      const json = await res.json();
      if (json.success) {
        alert("Success! Slot revised and updated in DB.");
        setOpenEditAIModal(false);
        setCustomPrompt("");
        fetchSlots();
      } else {
        alert(`Failed to regenerate: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network error occurred during revision");
    } finally {
      setGenerating(false);
    }
  };

  // Hydrate Template helper
  const hydrateTemplate = (html: string, data: any) => {
    if (!html) return "";
    let output = html;
    for (const key in data) {
      const val = data[key];
      const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      output = output.replaceAll(`{{${key}}}`, stringVal);
    }
    // Strip any leftover unmatched {{token}} so the preview never shows literal braces.
    output = output.replace(/\{\{\s*[\w.\-]+\s*\}\}/g, "");
    return output;
  };

  // Render status badges helper
  const getStatusClass = (status: string) => {
    switch (status) {
      case "active": return "badge-good";
      case "review": return "badge-mango";
      default: return "badge-gray";
    }
  };

  // Compute counts
  const totalSlotsCount = 9;
  const completedSlotsCount = slots.filter((s) => ["easy", "medium", "hard"].includes(s.difficulty.toLowerCase())).length;
  const completionPercentage = Math.round((completedSlotsCount / totalSlotsCount) * 100);

  return (
    <div className="gen-container">
      {/* Header Area */}
      <header className="page-header">
        <div className="title-area">
          <div className="sparkle-title-row">
            <Sparkles className="text-grape" size={24} />
            <h1>AI Question Generator</h1>
          </div>
          <p>Create or revise interactive math games dynamically using OpenAI based on the spreadsheet schema.</p>
        </div>
        {selectedGrade !== "" && selectedTopic && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              className="autofill-row-select"
              value={autoFillRow}
              onChange={(e) => setAutoFillRow(Number(e.target.value) as 1 | 2 | 3)}
              disabled={autoFilling || loading}
              title="Which slot row to fill across Easy / Medium / Hard"
            >
              <option value={1}>Row 1</option>
              <option value={2}>Row 2</option>
              <option value={3}>Row 3</option>
            </select>
            <button className="btn-generate-slot" onClick={handleAutoFill} disabled={autoFilling || loading} style={{ whiteSpace: 'nowrap' }}>
              <Sparkles size={14} className={autoFilling ? "spin-icon" : ""} style={{ marginRight: '6px' }} />
              {autoFilling ? (autoStatus || "Auto-Filling…") : `⚡ Auto-Fill Row ${autoFillRow}`}
            </button>
            <button className="btn-secondary" onClick={fetchSlots} disabled={loading || autoFilling}>
              <RefreshCw size={14} className={loading ? "spin-icon" : ""} style={{ marginRight: '6px' }} />
              Reload Grid
            </button>
          </div>
        )}
      </header>

      {/* Selectors Panel */}
      <div className="selectors-card">
        <div className="selector-field">
          <label>Grade Focus</label>
          <select
            value={selectedGrade}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedGrade(val === "" ? "" : Number(val));
            }}
            className="selector-select"
          >
            <option value="">Select Grade...</option>
            {gradeOptions.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div className="selector-field flex-grow">
          <label>Topic Name</label>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="selector-select"
            disabled={selectedGrade === ""}
          >
            <option value="">Select Topic Focus...</option>
            {availableTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Viewport */}
      {selectedGrade === "" || !selectedTopic ? (
        <div className="empty-state-view">
          <BookOpen size={48} className="text-slate-muted" />
          <h3>No topic selected</h3>
          <p>Choose a Grade Focus and select a Topic Name from the selectors above to begin auditing and generating question slots.</p>
        </div>
      ) : (
        <div className="matrix-viewport animate-fade">
          {/* Progress Widget Card */}
          <div className="progress-summary-card">
            <div className="progress-details">
              <div className="text-col">
                <h3>Syllabus Slot Status</h3>
                <p>Every topic focus requires exactly 9 completed games (3 Easy, 3 Medium, 3 Hard) for adaptive serving.</p>
              </div>
              <div className="score-capsule">
                <span className="bold-score">{completedSlotsCount} / {totalSlotsCount}</span>
                <span className="lbl-score">completed</span>
              </div>
            </div>

            <div className="bar-wrapper">
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }} />
              </div>
              <span className="percent-text">{completionPercentage}% slots filled</span>
            </div>
          </div>

          {/* Matrix Columns */}
          <div className="columns-grid">
            
            {/* EASY COLUMN */}
            <div className="difficulty-col">
              <div className="col-header-lbl easy-lbl">🟢 EASY SLOTS</div>
              <div className="slots-stack">
                {[1, 2, 3].map((idx) => {
                  const s = getSlot("easy", idx);
                  return s ? (
                    <div key={`easy-${idx}`} className="slot-card filled-card">
                      <div className="card-top-row">
                        <span className="slot-index-lbl">Slot # {idx}</span>
                        <span className={`status-pill ${getStatusClass(s.status)}`}>{s.status}</span>
                      </div>
                      <h4 className="objective-desc">{s.learning_objective || "No objective defined"}</h4>
                      <div className="format-slug-row">
                        <span className="capsule">{s.interaction_type}</span>
                        <span className="code-font">{s.template_slug}</span>
                      </div>
                      
                      <div className="actions-row">
                        <button className="btn-action" onClick={() => { setPreviewItem(s); setOpenPreviewModal(true); }}>
                          <Eye size={12} /> Preview
                        </button>
                        <button className="btn-action" onClick={() => { setActiveSlot({ difficulty: "easy", index: idx, variation: s }); setOpenEditAIModal(true); }}>
                          <Sparkle size={12} /> Edit with AI
                        </button>
                        <Link href={`/admin/questions/${s.id}`} className="btn-action-link">
                          <Settings size={12} /> Manual
                        </Link>
                        <button
                          className="btn-action"
                          onClick={() => handleDeleteSlot(s.id)}
                          disabled={deletingId === s.id}
                          style={{ color: '#e11d48' }}
                        >
                          <Trash2 size={12} /> {deletingId === s.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={`easy-empty-${idx}`} className="slot-card empty-card">
                      <div className="empty-title">Slot # {idx} is empty</div>
                      <p className="empty-sub">Pedagogical Guard: Simple direct modalities</p>
                      <button
                        className="btn-generate-slot"
                        onClick={() => {
                          setActiveSlot({ difficulty: "easy", index: idx });
                          setOpenGenModal(true);
                        }}
                      >
                        <Sparkles size={13} style={{ marginRight: '6px' }} />
                        Generate with AI
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MEDIUM COLUMN */}
            <div className="difficulty-col">
              <div className="col-header-lbl medium-lbl">🟡 MEDIUM SLOTS</div>
              <div className="slots-stack">
                {[1, 2, 3].map((idx) => {
                  const s = getSlot("medium", idx);
                  return s ? (
                    <div key={`medium-${idx}`} className="slot-card filled-card">
                      <div className="card-top-row">
                        <span className="slot-index-lbl">Slot # {idx}</span>
                        <span className={`status-pill ${getStatusClass(s.status)}`}>{s.status}</span>
                      </div>
                      <h4 className="objective-desc">{s.learning_objective || "No objective defined"}</h4>
                      <div className="format-slug-row">
                        <span className="capsule">{s.interaction_type}</span>
                        <span className="code-font">{s.template_slug}</span>
                      </div>
                      
                      <div className="actions-row">
                        <button className="btn-action" onClick={() => { setPreviewItem(s); setOpenPreviewModal(true); }}>
                          <Eye size={12} /> Preview
                        </button>
                        <button className="btn-action" onClick={() => { setActiveSlot({ difficulty: "medium", index: idx, variation: s }); setOpenEditAIModal(true); }}>
                          <Sparkle size={12} /> Edit with AI
                        </button>
                        <Link href={`/admin/questions/${s.id}`} className="btn-action-link">
                          <Settings size={12} /> Manual
                        </Link>
                        <button
                          className="btn-action"
                          onClick={() => handleDeleteSlot(s.id)}
                          disabled={deletingId === s.id}
                          style={{ color: '#e11d48' }}
                        >
                          <Trash2 size={12} /> {deletingId === s.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={`medium-empty-${idx}`} className="slot-card empty-card">
                      <div className="empty-title">Slot # {idx} is empty</div>
                      <p className="empty-sub">Pedagogical Guard: Introduces math symbols & fractions</p>
                      <button
                        className="btn-generate-slot"
                        onClick={() => {
                          setActiveSlot({ difficulty: "medium", index: idx });
                          setOpenGenModal(true);
                        }}
                      >
                        <Sparkles size={13} style={{ marginRight: '6px' }} />
                        Generate with AI
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HARD COLUMN */}
            <div className="difficulty-col">
              <div className="col-header-lbl hard-lbl">🔴 HARD SLOTS</div>
              <div className="slots-stack">
                {[1, 2, 3].map((idx) => {
                  const s = getSlot("hard", idx);
                  return s ? (
                    <div key={`hard-${idx}`} className="slot-card filled-card">
                      <div className="card-top-row">
                        <span className="slot-index-lbl">Slot # {idx}</span>
                        <span className={`status-pill ${getStatusClass(s.status)}`}>{s.status}</span>
                      </div>
                      <h4 className="objective-desc">{s.learning_objective || "No objective defined"}</h4>
                      <div className="format-slug-row">
                        <span className="capsule">{s.interaction_type}</span>
                        <span className="code-font">{s.template_slug}</span>
                      </div>
                      
                      <div className="actions-row">
                        <button className="btn-action" onClick={() => { setPreviewItem(s); setOpenPreviewModal(true); }}>
                          <Eye size={12} /> Preview
                        </button>
                        <button className="btn-action" onClick={() => { setActiveSlot({ difficulty: "hard", index: idx, variation: s }); setOpenEditAIModal(true); }}>
                          <Sparkle size={12} /> Edit with AI
                        </button>
                        <Link href={`/admin/questions/${s.id}`} className="btn-action-link">
                          <Settings size={12} /> Manual
                        </Link>
                        <button
                          className="btn-action"
                          onClick={() => handleDeleteSlot(s.id)}
                          disabled={deletingId === s.id}
                          style={{ color: '#e11d48' }}
                        >
                          <Trash2 size={12} /> {deletingId === s.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={`hard-empty-${idx}`} className="slot-card empty-card">
                      <div className="empty-title">Slot # {idx} is empty</div>
                      <p className="empty-sub">Pedagogical Guard: Abstract, multi-variable matching</p>
                      <button
                        className="btn-generate-slot"
                        onClick={() => {
                          setActiveSlot({ difficulty: "hard", index: idx });
                          setOpenGenModal(true);
                        }}
                      >
                        <Sparkles size={13} style={{ marginRight: '6px' }} />
                        Generate with AI
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: GENERATE EMPTY SLOT */}
      {openGenModal && activeSlot && (
        <div className="modal-backdrop">
          <div className={`modal-card ${ideas.length > 0 ? "expanded-modal" : ""}`}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Sparkles size={18} className="text-grape" />
                <h3>Generate {activeSlot.difficulty.toUpperCase()} Slot #{activeSlot.index}</h3>
              </div>
              <button className="close-btn" onClick={closeGenModal} disabled={generating || brainstorming}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-split-layout">
                <div className="inputs-pane">
                  <div className="modal-field">
                    <label>Interaction Archetype</label>
                    <select
                      value={interactionArchetype}
                      onChange={(e) => setInteractionArchetype(e.target.value)}
                      className="modal-select"
                      disabled={generating || brainstorming}
                    >
                      <option value="tap-select">tap-select (Comparing, MCQ, True/False)</option>
                      <option value="drag-drop">drag-drop (Sorting into bins, matching)</option>
                      <option value="fill-slot">fill-slot (Equation blanks, missing numbers)</option>
                      <option value="sequence-order">sequence-order (Sorting in line, smallest to biggest)</option>
                      <option value="build-count">build-count (Ten-frames, block counting)</option>
                      <option value="number-line">number-line (Fraction plotting, estimation)</option>
                      <option value="partition">partition (Equal sharing, fractional splits)</option>
                    </select>
                  </div>

                  <div className="modal-field">
                    <label>Custom Design Instructions (Optional)</label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={4}
                      className="modal-textarea"
                      placeholder="e.g. 'Use fruits emojis for counting', 'make the balance look like scales', 'focus on values between 1 and 20'..."
                      disabled={generating || brainstorming}
                    />
                  </div>

                  <button
                    className="btn-brainstorm"
                    onClick={handleBrainstormIdeas}
                    disabled={generating || brainstorming}
                  >
                    {brainstorming ? (
                      <>
                        <RefreshCw className="spin-icon" size={14} style={{ marginRight: 6 }} />
                        Brainstorming Ideas...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} style={{ marginRight: 6 }} />
                        {ideas.length > 0 ? "Re-brainstorm Ideas" : "Brainstorm Creative Ideas"}
                      </>
                    )}
                  </button>

                  {generating && (
                    <div className="generation-loader" style={{ marginTop: 12 }}>
                      <RefreshCw className="spin-icon text-grape" size={24} />
                      <p>Engaging OpenAI to construct the game HTML, parameters schema, and variation assets...</p>
                    </div>
                  )}
                </div>

                {ideas.length > 0 && (
                  <div className="ideas-pane">
                    <div className="ideas-pane-header">
                      <h4>✨ Choose a Game Concept</h4>
                      <p>Select one idea below as the blueprint for slot generation:</p>
                    </div>
                    <div className="ideas-list">
                      {ideas.map((idea, idx) => {
                        const isSelected = selectedIdea === idea;
                        return (
                          <div
                            key={idx}
                            className={`idea-card-item ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedIdea(idea)}
                          >
                            <div className="idea-card-header">
                              <span className="idea-card-title">{idea.title}</span>
                              <span className="idea-card-concept">{idea.concept}</span>
                            </div>
                            <p className="idea-card-desc">{idea.description}</p>
                            <div className="idea-card-pedagogy">
                              <strong>Pedagogy:</strong> {idea.pedagogy}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeGenModal} disabled={generating || brainstorming}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={generating || brainstorming || (ideas.length > 0 && !selectedIdea)}
              >
                {generating ? "Generating..." : "Generate Game Slot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT WITH AI / REGENERATE */}
      {openEditAIModal && activeSlot && activeSlot.variation && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title-row">
                <Sparkle size={18} className="text-grape" />
                <h3>Edit with AI: Slot #{activeSlot.index} ({activeSlot.difficulty.toUpperCase()})</h3>
              </div>
              <button className="close-btn" onClick={() => setOpenEditAIModal(false)} disabled={generating}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="slot-summary-box">
                <span className="lbl">Current objective:</span>
                <span className="val">{activeSlot.variation.learning_objective}</span>
              </div>

              <div className="modal-field">
                <label>Tester Change Instructions</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  className="modal-textarea"
                  placeholder="e.g. 'Make option A correct', 'change the colors to sky-blue', 'make the numbers larger', 'fix the division logic'..."
                  disabled={generating}
                />
              </div>

              {generating && (
                <div className="generation-loader">
                  <RefreshCw className="spin-icon text-grape" size={24} />
                  <p>Requesting OpenAI to revise the current template HTML layout and update parameters...</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setOpenEditAIModal(false)} disabled={generating}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleRegenerate} disabled={generating}>
                {generating ? "Revising..." : "Apply Revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PREVIEW DIALOG */}
      {openPreviewModal && previewItem && (
        <div className="modal-backdrop-dark">
          <div className="preview-modal-card">
            <div className="preview-modal-header">
              <div className="title-section">
                <h3>{previewItem.topic} ({previewItem.difficulty})</h3>
                <span className="objective-sub">{previewItem.learning_objective}</span>
              </div>
              <button className="close-btn dark-close" onClick={() => setOpenPreviewModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="preview-iframe-wrapper">
              <iframe
                title="AI Interactive Game Preview"
                sandbox="allow-scripts"
                srcDoc={hydrateTemplate(previewItem.template_html, previewItem.variation_data)}
                className="preview-iframe"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        .gen-container {
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

        .sparkle-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .sparkle-title-row h1 {
          font-size: 1.7rem;
          font-weight: 900;
          color: #20243A;
          margin: 0;
        }

        .page-header p {
          font-size: 0.82rem;
          color: #52586F;
          margin: 0;
        }

        .selectors-card {
          background: white;
          border: 1px solid #E4E7F2;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          gap: 20px;
        }

        .selector-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 220px;
        }

        .flex-grow {
          flex: 1;
        }

        .selector-field label {
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
          color: #94A3B8;
          letter-spacing: 0.04em;
        }

        .selector-select {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #E5E7F0;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          outline: none;
          color: #20243A;
          background: white;
          cursor: pointer;
        }

        .selector-select:disabled {
          background: #F8F9FC;
          cursor: not-allowed;
          color: #A0A4B8;
        }

        .empty-state-view {
          padding: 80px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
          background: white;
          border: 1px solid #E4E7F2;
          border-radius: 20px;
        }

        .text-slate-muted {
          color: #CBD5E1;
        }

        .empty-state-view h3 {
          font-size: 1.1rem;
          font-weight: 850;
          color: #20243A;
          margin: 0;
        }

        .empty-state-view p {
          font-size: 0.82rem;
          color: #52586F;
          max-width: 420px;
          margin: 0;
          line-height: 1.45;
        }

        .matrix-viewport {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .progress-summary-card {
          background: white;
          border: 1px solid #E4E7F2;
          border-radius: 20px;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .progress-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .progress-details h3 {
          font-size: 1rem;
          font-weight: 850;
          color: #20243A;
          margin: 0 0 2px 0;
        }

        .progress-details p {
          font-size: 0.78rem;
          color: #52586F;
          margin: 0;
        }

        .score-capsule {
          background: rgba(108, 92, 231, 0.06);
          border: 1px solid rgba(108, 92, 231, 0.15);
          padding: 6px 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .score-capsule .bold-score {
          font-size: 1.2rem;
          font-weight: 900;
          color: #6C5CE7;
        }

        .score-capsule .lbl-score {
          font-size: 0.65rem;
          font-weight: 850;
          color: #6C5CE7;
          text-transform: uppercase;
        }

        .bar-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .progress-bar-bg {
          flex: 1;
          height: 10px;
          background: #F1F3FA;
          border-radius: 5px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #6C5CE7;
          border-radius: 5px;
          transition: width 0.4s ease;
          box-shadow: 0 0 8px rgba(108, 92, 231, 0.3);
        }

        .percent-text {
          font-size: 0.76rem;
          font-weight: 800;
          color: #6C5CE7;
          min-width: 90px;
          text-align: right;
        }

        .columns-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }

        .difficulty-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .col-header-lbl {
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          padding: 4px 6px;
          border-bottom: 2px solid transparent;
        }

        .easy-lbl { color: #16B981; border-color: rgba(22, 185, 129, 0.2); }
        .medium-lbl { color: #FF9F43; border-color: rgba(255, 159, 67, 0.2); }
        .hard-lbl { color: #F0556B; border-color: rgba(240, 85, 107, 0.2); }

        .slots-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .slot-card {
          border-radius: 16px;
          padding: 18px;
          min-height: 165px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.2s;
        }

        .filled-card {
          background: white;
          border: 1px solid #E4E7F2;
          box-shadow: 0 2px 4px rgba(0,0,0,0.01);
        }

        .filled-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(108,92,231,0.04);
          border-color: #CBD5E1;
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .slot-index-lbl {
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
          color: #94A3B8;
        }

        .status-pill {
          font-size: 0.62rem;
          font-weight: 900;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 20px;
        }

        .badge-good { background: rgba(22, 185, 129, 0.08); color: #16B981; }
        .badge-mango { background: rgba(255, 159, 67, 0.08); color: #FF9F43; }
        .badge-gray { background: #F1F5F9; color: #64748b; }

        .objective-desc {
          font-size: 0.8rem;
          font-weight: 800;
          color: #20243A;
          line-height: 1.4;
          margin: 0;
          flex-grow: 1;
        }

        .format-slug-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .format-slug-row .capsule {
          font-size: 0.65rem;
          background: #F1F3FA;
          color: #52586F;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 750;
        }

        .format-slug-row .code-font {
          font-family: monospace;
          font-size: 0.65rem;
          color: #A0A4B8;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .actions-row {
          display: flex;
          border-top: 1px solid #F1F3FA;
          padding-top: 10px;
          gap: 12px;
        }

        .btn-action {
          background: transparent;
          border: none;
          color: #52586F;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 0;
        }

        .btn-action:hover {
          color: #6C5CE7;
        }

        .btn-action-link {
          color: #52586F;
          font-size: 0.72rem;
          font-weight: 800;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 0;
        }

        .btn-action-link:hover {
          color: #6C5CE7;
        }

        .empty-card {
          background: transparent;
          border: 1.5px dashed #CBD5E1;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
        }

        .empty-card:hover {
          border-color: #6C5CE7;
          background: rgba(108, 92, 231, 0.005);
        }

        .empty-title {
          font-size: 0.8rem;
          font-weight: 800;
          color: #52586F;
        }

        .empty-sub {
          font-size: 0.68rem;
          color: #A0A4B8;
          line-height: 1.35;
          margin: 0;
        }

        .btn-generate-slot {
          background: white;
          border: 1.5px solid #CBD5E1;
          color: #20243A;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: all 0.15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .btn-generate-slot:hover {
          border-color: #6C5CE7;
          color: #6C5CE7;
          transform: translateY(-0.5px);
          box-shadow: 0 2px 4px rgba(108,92,231,0.06);
        }

        .autofill-row-select {
          background: white;
          border: 1.5px solid #CBD5E1;
          color: #20243A;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .autofill-row-select:hover:not(:disabled) {
          border-color: #6C5CE7;
          color: #6C5CE7;
        }

        .autofill-row-select:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Modals layout */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(32, 36, 58, 0.5);
          backdrop-filter: blur(4px);
          display: grid;
          place-items: center;
          z-index: 999;
          animation: fadein 0.15s ease-out;
        }

        .modal-backdrop-dark {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(20, 22, 36, 0.85);
          display: grid;
          place-items: center;
          z-index: 999;
          animation: fadein 0.15s ease-out;
        }

        .modal-card {
          background: white;
          border-radius: 20px;
          width: 520px;
          max-width: 90vw;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          padding: 16px 20px;
          border-bottom: 1.5px solid #F1F3FA;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-title-row h3 {
          font-size: 0.95rem;
          font-weight: 850;
          color: #20243A;
          margin: 0;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          display: grid;
          place-items: center;
          padding: 4px;
          border-radius: 50%;
          transition: background 0.15s;
        }

        .close-btn:hover {
          background: #F1F3FA;
          color: #20243A;
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-field label {
          font-size: 0.72rem;
          font-weight: 800;
          color: #52586F;
        }

        .modal-select {
          width: 100%;
          padding: 9px 12px;
          border: 1.5px solid #E5E7F0;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          color: #20243A;
          background: white;
        }

        .modal-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #E5E7F0;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          color: #20243A;
          background: white;
          font-family: inherit;
          resize: none;
        }

        .modal-textarea:focus, .modal-select:focus {
          border-color: #6C5CE7;
        }

        .generation-loader {
          background: rgba(108, 92, 231, 0.05);
          border: 1px solid rgba(108, 92, 231, 0.1);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .generation-loader p {
          font-size: 0.76rem;
          color: #6C5CE7;
          font-weight: 700;
          margin: 0;
          line-height: 1.4;
        }

        .modal-footer {
          padding: 14px 20px;
          border-top: 1.5px solid #F1F3FA;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #F8F9FC;
        }

        .btn-primary {
          background: #6C5CE7;
          border: none;
          color: white;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5A4AD1;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          border: 1.5px solid #CBD5E1;
          color: #52586F;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover:not(:disabled) {
          border-color: #20243A;
          color: #20243A;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .slot-summary-box {
          background: #F8F9FC;
          border: 1px solid #E4E7F2;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .slot-summary-box .lbl {
          font-size: 0.65rem;
          font-weight: 800;
          color: #94A3B8;
          text-transform: uppercase;
        }

        .slot-summary-box .val {
          font-size: 0.78rem;
          font-weight: 750;
          color: #20243A;
        }

        /* Preview Modal */
        .preview-modal-card {
          background: #141624;
          border-radius: 24px;
          width: 820px;
          height: 620px;
          max-width: 95vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          border: 1px solid #20243A;
        }

        .preview-modal-header {
          padding: 16px 24px;
          border-bottom: 1px solid #20243A;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1C1E2F;
        }

        .preview-modal-header h3 {
          font-size: 0.95rem;
          font-weight: 900;
          color: white;
          margin: 0 0 2px 0;
        }

        .objective-sub {
          font-size: 0.74rem;
          color: #94A3B8;
          font-weight: 600;
        }

        .dark-close {
          color: #94A3B8;
        }

        .dark-close:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .preview-iframe-wrapper {
          flex: 1;
          background: #ffffff;
          display: grid;
          place-items: center;
          position: relative;
        }

        .preview-iframe {
          width: 760px;
          height: 520px;
          border: none;
          background: #ffffff;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Brainstorm Layout & Cards */
        .expanded-modal {
          width: 960px !important;
          max-width: 95vw !important;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modal-split-layout {
          display: flex;
          gap: 20px;
          width: 100%;
        }

        .inputs-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ideas-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-left: 1.5px solid #F1F3FA;
          padding-left: 20px;
          max-height: 480px;
        }

        .ideas-pane-header h4 {
          font-size: 0.88rem;
          font-weight: 850;
          color: #20243A;
          margin: 0 0 2px 0;
        }

        .ideas-pane-header p {
          font-size: 0.72rem;
          color: #52586F;
          margin: 0;
        }

        .ideas-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          padding-right: 6px;
        }

        .idea-card-item {
          background: #F8F9FC;
          border: 1.5px solid #E4E7F2;
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .idea-card-item:hover {
          border-color: #6C5CE7;
          background: rgba(108, 92, 231, 0.01);
        }

        .idea-card-item.selected {
          border-color: #6C5CE7;
          background: rgba(108, 92, 231, 0.04);
          box-shadow: 0 0 0 1px #6C5CE7;
        }

        .idea-card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 8px;
          margin-bottom: 6px;
        }

        .idea-card-title {
          font-size: 0.78rem;
          font-weight: 850;
          color: #6C5CE7;
        }

        .idea-card-concept {
          font-size: 0.62rem;
          font-weight: 900;
          color: #4A5568;
          background: #E2E8F0;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .idea-card-desc {
          font-size: 0.72rem;
          color: #2D3748;
          margin: 0 0 6px 0;
          line-height: 1.45;
        }

        .idea-card-pedagogy {
          font-size: 0.66rem;
          color: #718096;
          line-height: 1.4;
          border-top: 1px solid #EDF2F7;
          padding-top: 6px;
        }

        .btn-brainstorm {
          background: white;
          border: 1.5px solid #6C5CE7;
          color: #6C5CE7;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          width: 100%;
        }

        .btn-brainstorm:hover:not(:disabled) {
          background: rgba(108, 92, 231, 0.04);
        }

        .btn-brainstorm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
