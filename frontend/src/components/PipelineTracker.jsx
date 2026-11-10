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
  Sparkles,
  Cpu,
  Layers,
  ArrowRight,
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
      badge: "Vision / OCR",
    },
    {
      id: "visual",
      label: "Agent 2: Visual Forensics",
      desc: "MobileNetV2 classifier + YOLOv8 region detector",
      icon: Eye,
      pctRange: [30, 50],
      agentKey: "visual_agent",
      badge: "Deep Learning",
    },
    {
      id: "context",
      label: "Agent 3: Contextual Analysis",
      desc: "Entity extraction, missing fields, syntactic flags",
      icon: Search,
      pctRange: [50, 65],
      agentKey: "context_agent",
      badge: "NLP Semantics",
    },
    {
      id: "comparison",
      label: "Agent 4: Cross-Document Comparison",
      desc: "Sentence-BERT semantic embedding & diffs",
      icon: GitCompare,
      pctRange: [65, 80],
      agentKey: "comparison_agent",
      badge: "Sentence-BERT",
    },
    {
      id: "evidence",
      label: "Agent 5: Evidence Investigation",
      desc: "Spatial mapping & source level synthesis",
      icon: ShieldAlert,
      pctRange: [80, 90],
      agentKey: "evidence_agent",
      badge: "Synthesis Engine",
    },
    {
      id: "report",
      label: "Agent 6: Report Generation",
      desc: "ReportLab PDF & structured JSON creation",
      icon: FileCheck,
      pctRange: [90, 100],
      agentKey: "report_agent",
      badge: "Reporting / PDF",
    },
    {
      id: "review",
      label: "Human Investigator Review",
      desc: "Authorized expert adjudication & digital sign-off",
      icon: UserCheck,
      pctRange: [100, 100],
      agentKey: null,
      badge: "Human-in-the-Loop",
    },
  ];

  const currentProgress = invStatus?.progress || 0;
  const isComplete = invStatus?.status === "completed" || invStatus?.status === "reviewed";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Header */}
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-blue-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-cyan-400">
                <Cpu className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-cyan-400 font-bold">
                LANGGRAPH MULTI-AGENT STATE GRAPH
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Autonomous Pipeline Execution Tracker
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Current Step:{" "}
              <span className="font-semibold text-blue-700 dark:text-cyan-400 font-mono">
                {invStatus?.current_step || "Idle"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100">
                {currentProgress.toFixed(0)}%
              </div>
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 capitalize">
                Status: {invStatus?.status || "Waiting"}
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.5)] animate-pulse"
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

          return (
            <div
              key={step.id}
              className={`rounded-xl border p-4.5 transition-all duration-300 flex items-center justify-between ${
                isActive
                  ? "bg-blue-50/40 dark:bg-blue-950/30 border-blue-400 dark:border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-blue-400/20"
                  : isDone
                  ? "bg-white/80 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  : "bg-white/40 dark:bg-slate-900/30 border-slate-200/40 dark:border-slate-800/40 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : isActive
                      ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25 animate-pulse"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {step.label}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {step.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {step.id === "review" ? (
                  invStatus?.is_reviewed ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Adjudicated: {invStatus.review_decision}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Pending Human Sign-off
                    </span>
                  )
                ) : isDone ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Agent Completed
                  </span>
                ) : isActive ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-200 dark:border-cyan-800 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                    Inference Active...
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    Waiting in Graph
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
