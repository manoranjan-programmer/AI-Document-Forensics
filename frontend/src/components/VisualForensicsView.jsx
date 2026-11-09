import React, { useState } from "react";
import { api } from "../services/api";
import { Eye, ShieldAlert, CheckCircle, AlertTriangle, Layers, Info } from "lucide-react";

export default function VisualForensicsView({ findings, report }) {
  const visualResults = findings?.agents?.visual_agent?.data?.documents || report?.visual_forensics?.results || [];
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedRegionIdx, setSelectedRegionIdx] = useState(null);

  if (!visualResults.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <Eye className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm">No visual forensic analysis available for this case yet.</p>
      </div>
    );
  }

  const currentDoc = visualResults[selectedDocIndex] || visualResults[0];
  const pages = currentDoc.page_results || [];
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const currentPage = pages[selectedPageIndex] || pages[0] || {};

  const cacheKey = findings?.investigation_id || Date.now();
  const annotatedImgUrl = currentPage.annotated_image_path ? `${api.getAssetUrl(currentPage.annotated_image_path)}?t=${cacheKey}` : "";
  const rawImgUrl = currentPage.image_path ? `${api.getAssetUrl(currentPage.image_path)}?t=${cacheKey}` : "";
  const displayImgUrl = showAnnotations ? (annotatedImgUrl || rawImgUrl) : (rawImgUrl || annotatedImgUrl);
  const isTampered = currentDoc.is_tampered_candidate || currentDoc.classification === "Potentially Tampered";
  const candidateRegions = currentPage.suspicious_regions || [];
  const maxRegionConf = candidateRegions.length > 0 ? Math.max(...candidateRegions.map(r => r.confidence || 0.95)) : 0;
  const displayScore = isTampered ? Math.max(currentDoc.tampering_score || 0, maxRegionConf || 0.95) : (currentDoc.tampering_score || 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Visual Forensics Inspection</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            MobileNetV2 Binary Document Classifier + YOLOv8 Localized Tampering Detector
          </p>
        </div>

        {/* Document Selector Pills */}
        <div className="flex items-center gap-2">
          {visualResults.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedDocIndex(idx);
                setSelectedPageIndex(0);
                setSelectedRegionIdx(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDocIndex === idx
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {doc.document_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Viewer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {currentDoc.document_name} (Page {selectedPageIndex + 1} of {pages.length || 1})
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle Annotation Overlay */}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnnotations}
                  onChange={(e) => setShowAnnotations(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Show Candidate Bounding Boxes
              </label>
            </div>
          </div>

          {/* Image Display */}
          <div className="flex-1 min-h-[480px] bg-slate-900 rounded-lg p-2 flex items-center justify-center overflow-auto border border-slate-800 relative">
            {displayImgUrl ? (
              <div className="relative inline-block">
                <img
                  src={displayImgUrl}
                  alt="Document Forensic Page Preview"
                  className="max-h-[640px] object-contain rounded shadow-lg block"
                />
              </div>
            ) : (
              <div className="text-slate-400 text-xs">No image preview available for this page</div>
            )}
          </div>

          {/* Page Selector if Multi-page */}
          {pages.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {pages.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => {
                    setSelectedPageIndex(pIdx);
                    setSelectedRegionIdx(null);
                  }}
                  className={`w-7 h-7 text-xs rounded font-semibold ${
                    selectedPageIndex === pIdx
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {p.page_number}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Structured Forensic Results */}
        <div className="space-y-4">
          {/* Section A: Document Classification */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              A. Document Classification (MobileNetV2)
            </h4>

            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`text-lg font-bold ${
                    isTampered ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {currentDoc.classification}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Binary Classification Target (0: Authentic, 1: Tampered)
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-mono font-black text-slate-900">
                  {displayScore.toFixed(4)}
                </div>
                <div className="text-[10px] text-slate-400">Score Range: [0.0 - 1.0]</div>
              </div>
            </div>

            {/* Threshold Progress Gauge */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>0.0 (Authentic)</span>
                <span className="font-semibold text-slate-700">Threshold: {currentDoc.threshold}</span>
                <span>1.0 (Tampered)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                <div
                  className={`h-full ${isTampered ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(displayScore * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section B: Candidate Region Detection */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                B. Candidate Anomaly & Tamper Region Detection
              </h4>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  candidateRegions.length > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {candidateRegions.length} Candidate{candidateRegions.length === 1 ? "" : "s"}
              </span>
            </div>

            {candidateRegions.length > 5 && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Notice: Elevated candidate count. Human verification required to distinguish visual compression artifacts from actual tampering.</span>
              </div>
            )}

            {candidateRegions.length > 0 ? (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {candidateRegions.map((reg, rIdx) => {
                  const isSelected = selectedRegionIdx === rIdx;
                  return (
                    <div
                      key={rIdx}
                      onClick={() => setSelectedRegionIdx(isSelected ? null : rIdx)}
                      className={`p-3 rounded-lg text-xs space-y-1 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-amber-100/90 border-2 border-amber-500 shadow-xs"
                          : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>Candidate #{rIdx + 1} (Page {reg.page_number || selectedPageIndex + 1})</span>
                        <span className="font-mono text-amber-700 font-bold shrink-0">
                          {(reg.confidence * 100).toFixed(1)}% conf
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Box: [{reg.box.map((v) => Math.round(v)).join(", ")}]
                      </div>
                      {reg.overlapping_text && reg.overlapping_text.length > 0 && (
                        <div className="text-[11px] text-slate-600 mt-1 bg-white p-1.5 rounded border border-slate-200">
                          <span className="font-semibold text-slate-800">Context:</span> {reg.overlapping_text.join(" ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>No localized visual tampering candidates detected on this page.</span>
              </div>
            )}
          </div>

          {/* Section C: Investigation Interpretation */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>C. Investigation Interpretation</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              • Model classification and spatial detections represent statistical deviations, not conclusive proof of tampering.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              • All candidate regions require investigator verification before determining document authenticity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
