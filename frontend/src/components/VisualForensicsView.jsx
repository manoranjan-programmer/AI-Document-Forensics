import React, { useState } from "react";
import { api } from "../services/api";
import { Eye, ShieldAlert, CheckCircle, AlertTriangle, Layers, Info, Sparkles, ZoomIn } from "lucide-react";

export default function VisualForensicsView({ findings, report }) {
  const visualResults = findings?.agents?.visual_agent?.data?.documents || report?.visual_forensics?.results || [];
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedRegionIdx, setSelectedRegionIdx] = useState(null);

  if (!visualResults.length) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
        <Eye className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
        <p className="text-sm">No visual forensic analysis available for this case yet.</p>
      </div>
    );
  }

  const currentDoc = visualResults[selectedDocIndex] || visualResults[0] || {};
  const pages = currentDoc.page_results || [];
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Visual Forensics & Patch Anomaly Inspection
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            MobileNetV2 Binary Document Classifier + YOLOv8 Localized Tampering Detector
          </p>
        </div>

        {/* Document Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {visualResults.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedDocIndex(idx);
                setSelectedPageIndex(0);
                setSelectedRegionIdx(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDocIndex === idx
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {doc.document_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Viewer */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {currentDoc.document_name} (Page {selectedPageIndex + 1} of {pages.length || 1})
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle Annotation Overlay */}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAnnotations}
                  onChange={(e) => setShowAnnotations(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
                />
                Show Candidate Bounding Boxes
              </label>
            </div>
          </div>

          {/* High-tech Image Canvas */}
          <div className="flex-1 min-h-[480px] bg-slate-950 rounded-xl p-3 flex items-center justify-center overflow-auto border border-slate-800 relative group">
            {displayImgUrl ? (
              <div className="relative inline-block">
                <img
                  src={displayImgUrl}
                  alt="Document Forensic Page Preview"
                  className="max-h-[640px] object-contain rounded-lg shadow-2xl block"
                />
              </div>
            ) : (
              <div className="text-slate-500 text-xs">No image preview available for this page</div>
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
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    selectedPageIndex === pIdx
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Page {p.page_number || pIdx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: AI Analysis Card */}
        <div className="space-y-4">
          {/* Classification Result Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              A. DOCUMENT CLASSIFICATION (MOBILENETV2)
            </span>

            <div className="flex items-center justify-between">
              <div>
                <span
                  className={`text-base font-bold ${
                    isTampered ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isTampered ? "Potentially Tampered" : "Likely Authentic"}
                </span>
                <p className="text-[11px] text-slate-400">
                  Binary Classification Target [0: Authentic, 1: Tampered]
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100">
                  {displayScore.toFixed(4)}
                </span>
                <p className="text-[10px] text-slate-400">Score Range: [0.0 - 1.0]</p>
              </div>
            </div>

            {/* Threshold Progress Bar */}
            <div className="pt-2">
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTampered
                      ? "bg-gradient-to-r from-amber-500 to-rose-500"
                      : "bg-gradient-to-r from-emerald-500 to-teal-400"
                  }`}
                  style={{ width: `${Math.min(displayScore * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>0.0 (Authentic)</span>
                <span>Threshold: {currentDoc.threshold || 0.90}</span>
                <span>1.0 (Tampered)</span>
              </div>
            </div>
          </div>

          {/* Anomaly Regions List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                B. CANDIDATE ANOMALY & TAMPER REGION DETECTION
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  candidateRegions.length > 0
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {candidateRegions.length} {candidateRegions.length === 1 ? "Candidate" : "Candidates"}
              </span>
            </div>

            {candidateRegions.length === 0 ? (
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>No localized visual tampering candidates detected on this page.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {candidateRegions.map((region, rIdx) => (
                  <div
                    key={rIdx}
                    onClick={() => setSelectedRegionIdx(rIdx)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedRegionIdx === rIdx
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-cyan-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>Candidate #{rIdx + 1} (Page {region.page_number || selectedPageIndex + 1})</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                        {region.confidence ? `${(region.confidence * 100).toFixed(1)}% conf` : "High Anomaly"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                      Box: [{region.box ? region.box.join(", ") : "N/A"}]
                    </div>

                    {region.overlapping_text && region.overlapping_text.length > 0 && (
                      <div className="mt-1.5 p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        Context: {region.overlapping_text.join(" ")}
                      </div>
                    )}

                    {region.explanation && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic">
                        {region.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Forensic Disclaimer */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>C. Investigation Interpretation</span>
            </div>
            <p>&bull; Model classification and spatial detections represent statistical deviations, not conclusive proof of tampering.</p>
            <p>&bull; All candidate regions require investigator verification before determining document authenticity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
