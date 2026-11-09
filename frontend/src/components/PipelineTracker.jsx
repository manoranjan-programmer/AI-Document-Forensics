import React from "react";
import {
  FileText,
  Eye,
  Search,
  GitCompare,
  ShieldAlert,
  FileCheck,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function PipelineTracker({ invStatus, findings }) {
  const steps = [
    {
      id: "ocr",
      label: "Agent 1: OCR Extraction",
      desc: "EasyOCR + PyMuPDF text & bounding boxes",
      icon: FileText,
      pctRange: [0, 30],
      agentKey: "ocr_agent",
    },
    {
      id: "visual",
      label: "Agent 2: Visual Forensics",
      desc: "MobileNetV2 classifier + YOLOv8 region detector",
      icon: Eye,
      pctRange: [30, 50],
      agentKey: "visual_agent",
    },
    {
      id: "context",
      label: "Agent 3: Contextual Analysis",
      desc: "Entity extraction, missing fields, syntactic flags",
      icon: Search,
      pctRange: [50, 65],
      agentKey: "context_agent",
    },
    {
      id: "comparison",
      label: "Agent 4: Cross-Document Comparison",
      desc: "Sentence-BERT semantic embedding & diffs",
      icon: GitCompare,
      pctRange: [65, 80],
      agentKey: "comparison_agent",
    },
    {
      id: "evidence",
      label: "Agent 5: Evidence Investigation",
      desc: "Spatial mapping & source level synthesis",
      icon: ShieldAlert,
      pctRange: [80, 90],
      agentKey: "evidence_agent",
    },
    {
      id: "report",
      label: "Agent 6: Report Generation",
      desc: "ReportLab PDF & structured JSON creation",
      icon: FileCheck,
      pctRange: [90, 100],
      agentKey: "report_agent",
    },
    {
      id: "review",
      label: "Human Investigator Review",
      desc: "Authorized expert adjudication & sign-off",
      icon: UserCheck,
      pctRange: [100, 100],
      agentKey: null,
    },
  ];

  const currentProgress = invStatus?.progress || 0;
  const isComplete = invStatus?.status === "completed" || invStatus?.status === "reviewed";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">LangGraph Multi-Agent Orchestration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current Step: <span className="font-semibold text-blue-700">{invStatus?.current_step || "Idle"}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-slate-800">{currentProgress.toFixed(0)}%</div>
            <div className="text-[11px] font-medium text-slate-400 capitalize">{invStatus?.status || "Waiting"}</div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete ? "bg-emerald-500" : "bg-blue-600 animate-pulse"
            }`}
            style={{ width: `${Math.max(currentProgress, 5)}%` }}
          />
        </div>
      </div>

      {/* Agent Workflow Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const [startPct, endPct] = step.pctRange;
          const isDone = currentProgress >= endPct && currentProgress > 0;
          const isActive = currentProgress >= startPct && currentProgress < endPct;
          const isPending = currentProgress < startPct;

          const hasAgentOutput = step.agentKey && findings?.agents?.[step.agentKey];

          return (
            <div
              key={step.id}
              className={`bg-white rounded-xl border p-4.5 transition-all flex items-center justify-between ${
                isActive
                  ? "border-blue-400 ring-2 ring-blue-50 bg-blue-50/20"
                  : isDone
                  ? "border-slate-200"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700"
                      : isActive
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{step.label}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {step.id === "review" ? (
                  invStatus?.is_reviewed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Reviewed: {invStatus.review_decision}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Human Sign-off
                    </span>
                  )
                ) : isDone ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                ) : isActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    Executing...
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Waiting in Graph</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

