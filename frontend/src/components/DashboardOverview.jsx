import React from "react";
import {
  FileText,
  Upload,
  ShieldAlert,
  UserCheck,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function DashboardOverview({
  currentInvId,
  invStatus,
  report,
  recentInvestigations,
  setActiveTab,
}) {
  const totalCases = recentInvestigations.length;
  const reviewedCases = recentInvestigations.filter((i) => i.is_reviewed).length;
  const pendingCases = totalCases - reviewedCases;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-7 shadow-sm">
        <div className="max-w-2xl">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-blue-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            Agentic AI Document Forensics System
          </span>
          <h2 className="text-xl font-bold mt-3 leading-snug">
            Intelligent Document Tampering, Contextual Anomaly & Evidence Investigation
          </h2>
          <p className="text-xs text-blue-100 mt-2 leading-relaxed">
            Coordinating 6 specialized agents powered by MobileNetV2, YOLOv8, Sentence-BERT, EasyOCR, and
            LangGraph to examine document authenticity while maintaining human-in-the-loop control.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setActiveTab("upload")}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-900 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Documents</span>
            </button>
            {currentInvId && (
              <button
                onClick={() => setActiveTab("pipeline")}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-800 text-white border border-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <span>View Active Case</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Cases</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCases}</div>
          <div className="text-[11px] text-slate-500 mt-1">Processed investigations</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Awaiting Sign-off
            </span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{pendingCases}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending Human Review</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Reviewed Cases
            </span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{reviewedCases}</div>
          <div className="text-[11px] text-slate-500 mt-1">Human decisions finalized</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Agents
            </span>
            <Cpu className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">6 Agents</div>
          <div className="text-[11px] text-slate-500 mt-1">Coordinated via LangGraph</div>
        </div>
      </div>

      {/* Active Case Snapshot or Recent Investigations */}
      {currentInvId && report ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Case</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{currentInvId}</h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                report.overall_classification?.includes("Tamper")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {report.overall_classification}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-400 font-medium">Examined Documents:</span>
              <p className="font-semibold text-slate-800 mt-0.5">{report.documents?.length || 0} document(s)</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-400 font-medium">Mapped Evidence Items:</span>
              <p className="font-semibold text-slate-800 mt-0.5">{report.evidence_items?.length || 0} item(s)</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-400 font-medium">Human Review Status:</span>
              <p className="font-semibold text-amber-700 mt-0.5">{report.investigation_status}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setActiveTab("visual")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
            >
              Inspect Visual Regions
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              View Full Report
            </button>
          </div>
        </div>
      ) : null}

      {/* Multi-Agent Architecture Blueprint */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Investigation Pipeline Architecture</h3>
        <p className="text-xs text-slate-500 mb-4">
          Each document undergoes sequential processing across 6 decoupled agent workers before human sign-off.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Agent 1</div>
            <div className="text-xs font-bold text-slate-800">OCR Extraction</div>
            <div className="text-[10px] text-slate-500">EasyOCR + PyMuPDF</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Agent 2</div>
            <div className="text-xs font-bold text-slate-800">Visual Forensics</div>
            <div className="text-[10px] text-slate-500">MobileNet + YOLO</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Agent 3</div>
            <div className="text-xs font-bold text-slate-800">Context Analysis</div>
            <div className="text-[10px] text-slate-500">Entities & Inconsistencies</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Agent 4</div>
            <div className="text-xs font-bold text-slate-800">Cross-Document</div>
            <div className="text-[10px] text-slate-500">Sentence-BERT</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Agent 5</div>
            <div className="text-xs font-bold text-slate-800">Evidence Agent</div>
            <div className="text-[10px] text-slate-500">Spatial Box Overlap</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Agent 6</div>
            <div className="text-xs font-bold text-slate-800">Report & Review</div>
            <div className="text-[10px] text-slate-500">PDF & Human Sign-off</div>
          </div>
        </div>
      </div>
    </div>
  );
}

