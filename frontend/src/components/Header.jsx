import React from "react";
import { ShieldCheck, AlertCircle, RefreshCw, Layers } from "lucide-react";

export default function Header({
  health,
  recentInvestigations,
  currentInvId,
  setCurrentInvId,
  refreshInvestigation,
}) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-semibold text-slate-800">
          Agentic Document Authenticity & Forensic Analysis
        </h2>

        {/* Model status badges */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            MobileNetV2
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            YOLOv8
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            LangGraph 6-Agent
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Switch Case Selector */}
        {recentInvestigations.length > 0 && (
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <select
              value={currentInvId || ""}
              onChange={(e) => setCurrentInvId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="" disabled>Select Investigation</option>
              {recentInvestigations.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} ({inv.status} - {inv.is_reviewed ? inv.review_decision : "Pending Review"})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Refresh Button */}
        {currentInvId && (
          <button
            onClick={refreshInvestigation}
            title="Refresh active case state"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Health status */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs">
          {health?.status === "healthy" ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-4 h-4" />
              API Ready
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertCircle className="w-4 h-4" />
              Connecting...
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

