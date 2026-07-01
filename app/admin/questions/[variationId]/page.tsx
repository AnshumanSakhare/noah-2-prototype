"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  Save, 
  Copy, 
  Trash2, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle,
  Play,
  Settings
} from "lucide-react";

interface VariationDetail {
  id: string;
  template_id: string;
  variation_index: number;
  variation_data: any;
  evaluation_spec: any;
  difficulty: string;
  locale: string;
  verifier_status: "pending" | "verified" | "failed";
  verifier_notes: string;
  last_edited_by: string;
  last_edited_at: string;
  status: "draft" | "review" | "active" | "deprecated";
  template_slug: string;
  grade: number;
  topic: string;
  subtopic: string;
  learning_objective: string;
  interaction_type: string;
  template_html: string;
  props_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  answer_key_fn: string;
}

export default function QuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const variationId = params?.variationId as string;

  const [question, setQuestion] = useState<VariationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [variationData, setVariationData] = useState<any>({});
  const [evaluationSpec, setEvaluationSpec] = useState<any>({});
  const [status, setStatus] = useState("");
  const [verifierNotes, setVerifierNotes] = useState("");
  const [difficulty, setDifficulty] = useState("");

  // Iframe preview source doc state
  const [previewSrcDoc, setPreviewSrcDoc] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuestionDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/questions/${variationId}`);
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        setQuestion(data);
        setVariationData(data.variation_data || {});
        setEvaluationSpec(data.evaluation_spec || {});
        setStatus(data.status || "draft");
        setVerifierNotes(data.verifier_notes || "");
        setDifficulty(data.difficulty || "medium");
        
        // Hydrate and set initial preview
        const initialHtml = hydrateTemplate(data.template_html, data.variation_data);
        setPreviewSrcDoc(initialHtml);
      } else {
        alert(`Error: ${json.error}`);
        router.push("/admin/questions");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load question details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (variationId) {
      fetchQuestionDetails();
    }
  }, [variationId]);

  // Client-side hydration template helper
  const hydrateTemplate = (html: string, data: any) => {
    if (!html) return "";
    let output = html;
    for (const key in data) {
      const val = data[key];
      const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      output = output.replaceAll(`{{${key}}}`, stringVal);
    }
    return output;
  };

  // Debounced auto-preview reload
  useEffect(() => {
    if (!question) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    debounceTimerRef.current = setTimeout(() => {
      const hydrated = hydrateTemplate(question.template_html, variationData);
      setPreviewSrcDoc(hydrated);
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [variationData]);

  const forceReloadPreview = () => {
    if (!question) return;
    const hydrated = hydrateTemplate(question.template_html, variationData);
    setPreviewSrcDoc(""); // force re-render
    setTimeout(() => setPreviewSrcDoc(hydrated), 50);
  };

  // Actions
  const handleSave = async () => {
    if (!question) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${variationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variation_data: variationData,
          evaluation_spec: evaluationSpec,
          status,
          verifier_notes: verifierNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        alert("Changes saved successfully!");
        fetchQuestionDetails();
      } else {
        alert(`Failed to save: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving changes");
    } finally {
      setSaving(false);
    }
  };

  const handleRecomputeKey = async () => {
    try {
      const res = await fetch(`/api/admin/questions/${variationId}/recompute-key`, {
        method: "POST"
      });
      const json = await res.json();
      if (json.success) {
        setEvaluationSpec(json.evaluationSpec);
        alert("Evaluation spec recomputed! Status set to pending.");
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error recomputing answer key");
    }
  };

  const handleVerify = async () => {
    try {
      const res = await fetch(`/api/admin/questions/${variationId}/verify`, {
        method: "POST"
      });
      const json = await res.json();
      if (json.success) {
        alert(`Verification Complete: Result is "${json.verifierStatus}"`);
        fetchQuestionDetails();
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error verifying question");
    }
  };

  const handleDuplicate = async () => {
    if (!confirm("Are you sure you want to duplicate this variation? This will create a new variant index in draft status.")) return;
    try {
      const res = await fetch(`/api/admin/questions/${variationId}/duplicate`, {
        method: "POST"
      });
      const json = await res.json();
      if (json.success) {
        alert(`Duplicated successfully as index ${json.data.variationIndex}! Redirecting to new variant...`);
        router.push(`/admin/questions/${json.data.id}`);
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error duplicating");
    }
  };

  const handleDeprecate = async () => {
    if (!confirm("Are you sure you want to mark this question as DEPRECATED? It will be excluded from homework slates.")) return;
    try {
      const res = await fetch(`/api/admin/questions/${variationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variation_data: variationData,
          evaluation_spec: evaluationSpec,
          status: "deprecated",
          verifier_notes: "Deprecated manually by editor."
        })
      });
      const json = await res.json();
      if (json.success) {
        alert("Status updated to deprecated!");
        fetchQuestionDetails();
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error deprecating question");
    }
  };

  // Form value change helpers
  const handleFieldChange = (key: string, value: any) => {
    setVariationData((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  // Render watermarked ribbon style
  const getWatermarkClass = () => {
    if (status === "active") return "watermark active-watermark";
    if (status === "review") return "watermark review-watermark";
    if (status === "deprecated") return "watermark deprecated-watermark";
    return "watermark draft-watermark";
  };

  if (loading) {
    return (
      <div className="detail-loading-screen">
        <RefreshCw size={36} className="spin-icon" />
        <h3>Loading variation details...</h3>
      </div>
    );
  }

  if (!question) return null;

  // Render form fields dynamically based on the props_schema
  const schemaProperties = question.props_schema?.properties || {};

  return (
    <div className="detail-view-container">
      {/* Top Breadcrumb Bar */}
      <div className="breadcrumb-nav">
        <button onClick={() => router.push("/admin/questions")} className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Question Bank</span>
        </button>
        <div className="crumb-meta">
          <span>{question.topic}</span>
          <span className="crumb-divider">/</span>
          <span className="text-bold">{question.template_slug} ({question.variation_index})</span>
        </div>
      </div>

      <div className="two-column-main-layout">
        
        {/* Left Column: Live Preview Sandbox */}
        <section className="preview-column">
          <div className="column-card flex-col-container">
            <div className="card-header-bar">
              <h3>Live Interactive Sandbox</h3>
              <button className="preview-reload-btn" onClick={forceReloadPreview}>
                <RefreshCw size={14} />
                <span>Reload Sandbox</span>
              </button>
            </div>
            
            {/* Sandboxed iframe holder */}
            <div className="sandbox-wrapper">
              {status && (
                <div className={getWatermarkClass()}>
                  {status}
                </div>
              )}
              {previewSrcDoc ? (
                <iframe
                  title="Question Game Preview"
                  sandbox="allow-scripts"
                  srcDoc={previewSrcDoc}
                  className="game-iframe"
                />
              ) : (
                <div className="iframe-loader">
                  <RefreshCw size={24} className="spin-icon" />
                  <p>Hydrating template...</p>
                </div>
              )}
            </div>
            
            <div className="preview-meta-footer">
              <span className="meta-capsule">Interaction: {question.interaction_type}</span>
              <span className="meta-capsule">Target Grade: {question.grade === 0 ? "KG" : `Grade ${question.grade}`}</span>
              <span className="meta-capsule">Locale: {question.locale}</span>
            </div>
          </div>
        </section>

        {/* Right Column: Edit Controls Panel */}
        <section className="edit-column">
          <div className="column-card flex-col-container select-scroll">
            
            {/* Section 1: Variation Data Schema Form */}
            <div className="panel-section">
              <div className="section-title-wrap">
                <Settings size={16} className="text-grape" />
                <h4>Variation Parameters</h4>
              </div>
              <div className="form-stack">
                {Object.keys(schemaProperties).map((key) => {
                  const propDef = schemaProperties[key];
                  const currentVal = variationData[key] !== undefined ? variationData[key] : "";

                  // Handle different types
                  if (propDef.type === "string" && !propDef.enum) {
                    return (
                      <div key={key} className="form-group">
                        <label>{key} <span className="type-lbl">(string)</span></label>
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="form-control"
                        />
                      </div>
                    );
                  }

                  if (propDef.type === "number") {
                    return (
                      <div key={key} className="form-group">
                        <label>{key} <span className="type-lbl">(number)</span></label>
                        <input
                          type="number"
                          value={currentVal}
                          onChange={(e) => handleFieldChange(key, parseFloat(e.target.value) || 0)}
                          className="form-control"
                        />
                      </div>
                    );
                  }

                  if (propDef.type === "boolean") {
                    return (
                      <div key={key} className="form-group row-align-checkbox">
                        <input
                          type="checkbox"
                          checked={!!currentVal}
                          onChange={(e) => handleFieldChange(key, e.target.checked)}
                          id={`chk-${key}`}
                        />
                        <label htmlFor={`chk-${key}`}>{key} <span className="type-lbl">(boolean)</span></label>
                      </div>
                    );
                  }

                  if (propDef.type === "array" || propDef.type === "object") {
                    // Fallback to raw JSON Textarea
                    const jsonString = typeof currentVal === "string" ? currentVal : JSON.stringify(currentVal, null, 2);
                    return (
                      <div key={key} className="form-group">
                        <label>{key} <span className="type-lbl">({propDef.type} - JSON)</span></label>
                        <textarea
                          value={jsonString}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleFieldChange(key, parsed);
                            } catch (err) {
                              // If invalid JSON, write as raw text and let it update
                              handleFieldChange(key, e.target.value);
                            }
                          }}
                          rows={4}
                          className="form-control font-mono"
                          placeholder="Must be valid JSON formatting..."
                        />
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>

            {/* Section 2: Evaluation Spec Verification */}
            <div className="panel-section bg-panel-light">
              <div className="section-title-wrap">
                <CheckCircle size={16} className="text-good" />
                <h4>Server Evaluation Spec (Read-only)</h4>
              </div>
              <div className="answer-key-content">
                <pre className="font-mono">{JSON.stringify(evaluationSpec, null, 2)}</pre>
                <div style={{ marginTop: '10px' }}>
                  <button className="btn-secondary btn-sleek" onClick={handleRecomputeKey}>
                    Recompute Evaluation Spec
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Metadata & Verifier Fields */}
            <div className="panel-section">
              <div className="section-title-wrap">
                <ShieldAlert size={16} className="text-mango" />
                <h4>Metadata &amp; Verification</h4>
              </div>
              
              <div className="form-stack">
                <div className="form-group">
                  <label>Syllabus Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-control">
                    <option value="draft">Draft (Excluded from assignments)</option>
                    <option value="review">Review (QA evaluation)</option>
                    <option value="active">Active (Served to student workspaces)</option>
                    <option value="deprecated">Deprecated (Archived)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Verifier Notes / Audit Log</label>
                  <textarea 
                    value={verifierNotes}
                    onChange={(e) => setVerifierNotes(e.target.value)}
                    rows={3}
                    className="form-control"
                    placeholder="Enter audit logs or manual review notes here..."
                  />
                </div>
                
                <div className="read-only-meta-row">
                  <div className="meta-cell">
                    <span className="lbl">Last Edited By:</span>
                    <span className="val">{question.last_edited_by || "System Initial"}</span>
                  </div>
                  <div className="meta-cell">
                    <span className="lbl">Last Edited At:</span>
                    <span className="val">
                      {question.last_edited_at ? new Date(question.last_edited_at).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Action Controls Row */}
            <div className="actions-card-footer">
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={14} style={{ marginRight: '6px' }} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              
              <button className="btn-secondary" onClick={handleVerify}>
                Verify Scheme
              </button>

              <button className="btn-secondary" onClick={handleDuplicate}>
                <Copy size={14} style={{ marginRight: '6px' }} />
                Duplicate
              </button>

              <button className="btn-bad-outline" onClick={handleDeprecate}>
                <Trash2 size={14} style={{ marginRight: '6px' }} />
                Deprecate
              </button>
            </div>

          </div>
        </section>

      </div>

      <style>{`
        .detail-view-container {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid #E4E7F2;
          padding-bottom: 12px;
        }

        .back-link {
          border: none;
          background: transparent;
          color: #6C5CE7;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          font-size: 0.82rem;
          cursor: pointer;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .crumb-meta {
          font-size: 0.8rem;
          color: #52586F;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .crumb-divider {
          color: #CBD5E1;
        }

        .text-bold {
          font-weight: 850;
          color: #20243A;
        }

        .two-column-main-layout {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 20px;
          flex: 1;
          align-items: stretch;
        }

        .preview-column, .edit-column {
          display: flex;
          flex-direction: column;
        }

        .column-card {
          background: white;
          border: 1px solid #E4E7F2;
          border-radius: 16px;
          padding: 20px;
          flex: 1;
        }

        .flex-col-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .select-scroll {
          max-height: 80vh;
          overflow-y: auto;
        }

        .card-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header-bar h3 {
          font-size: 0.95rem;
          font-weight: 850;
          color: #20243A;
          margin: 0;
        }

        .preview-reload-btn {
          background: transparent;
          border: 1.5px solid #CBD5E1;
          color: #52586F;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }

        .preview-reload-btn:hover {
          border-color: #20243A;
          color: #20243A;
        }

        .sandbox-wrapper {
          border: 1px solid #E4E7F2;
          border-radius: 12px;
          background: #F8F9FC;
          width: 760px;
          height: 520px;
          max-width: 100%;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.015);
          align-self: center;
        }

        .game-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
        }

        .iframe-loader {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #52586F;
          gap: 8px;
        }

        .watermark {
          position: absolute;
          top: 15px;
          right: -40px;
          transform: rotate(45deg);
          width: 150px;
          text-align: center;
          font-size: 0.65rem;
          font-weight: 950;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 4px 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          z-index: 99;
          user-select: none;
          pointer-events: none;
        }

        .draft-watermark { background: #E2E8F0; color: #475569; }
        .review-watermark { background: #FF9F43; color: white; }
        .active-watermark { background: #16B981; color: white; }
        .deprecated-watermark { background: #F0556B; color: white; }

        .preview-meta-footer {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 4px;
        }

        .meta-capsule {
          font-size: 0.72rem;
          background: #F1F3FA;
          color: #52586F;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 700;
        }

        .panel-section {
          border-bottom: 1.5px solid #F1F3FA;
          padding-bottom: 20px;
        }

        .panel-section:last-of-type {
          border-bottom: none;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .section-title-wrap h4 {
          font-size: 0.85rem;
          font-weight: 850;
          color: #20243A;
          margin: 0;
        }

        .text-grape { color: #6C5CE7; }
        .text-good { color: #16B981; }
        .text-mango { color: #FF9F43; }

        .form-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.76rem;
          font-weight: 800;
          color: #52586F;
        }

        .type-lbl {
          font-weight: 600;
          font-family: monospace;
          color: #94A3B8;
          font-size: 0.7rem;
        }

        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid #E5E7F0;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          color: #20243A;
          background: white;
          font-family: inherit;
        }

        .form-control:focus {
          border-color: #6C5CE7;
        }

        .form-control.font-mono {
          font-family: monospace;
          font-size: 0.76rem;
        }

        .row-align-checkbox {
          flex-direction: row;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }

        .bg-panel-light {
          background: #F8F9FC;
          border: 1px solid #E4E7F2;
          border-radius: 12px;
          padding: 14px 16px !important;
        }

        .answer-key-content pre {
          margin: 0;
          background: #20243A;
          color: #ffffff;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          overflow-x: auto;
          max-height: 150px;
        }

        .btn-sleek {
          font-size: 0.72rem !important;
          padding: 5px 10px !important;
        }

        .read-only-meta-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #F8F9FC;
          border: 1px solid #F1F3FA;
          padding: 10px 14px;
          border-radius: 8px;
          margin-top: 14px;
        }

        .meta-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-cell .lbl {
          font-size: 0.65rem;
          font-weight: 800;
          color: #94A3B8;
          text-transform: uppercase;
        }

        .meta-cell .val {
          font-size: 0.76rem;
          font-weight: 750;
          color: #52586F;
        }

        .actions-card-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 12px;
          border-top: 1.5px solid #F1F3FA;
        }

        .actions-card-footer button {
          flex: 1;
          min-width: 100px;
        }

        .btn-bad-outline {
          background: transparent;
          border: 1.5px solid #F0556B;
          color: #F0556B;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-bad-outline:hover {
          background: rgba(240, 85, 107, 0.05);
        }

        .detail-loading-screen {
          height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #52586F;
          gap: 10px;
        }

        .detail-loading-screen h3 {
          font-size: 1.1rem;
          font-weight: 850;
        }
      `}</style>
    </div>
  );
}
