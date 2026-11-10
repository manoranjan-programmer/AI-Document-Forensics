import React from "react";
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  Moon,
  Sun,
  PlusCircle,
  Activity,
  Cpu,
} from "lucide-react";

export default function Header({
  health,
  recentInvestigations,
  currentInvId,
  setCurrentInvId,
  refreshInvestigation,
  onOpenCopilot,
  onNewScan,
  isDarkMode,
  toggleTheme,
}) {
  return (
    <header className="h-16 bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 glass-panel sticky top-0 z-30 transition-colors">
      {/* Left: AI Title & Model Telemetry */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Agentic Forensics
          </span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Neural Hub v2.0</span>
        </div>

        {/* Live Model Badges */}
        <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>MobileNetV2</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <span>YOLOv8 Localizer</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Sentence-BERT</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 shadow-xs">
            <Cpu className="w-3 h-3 text-purple-500" />
            <span>LangGraph 6-Agent</span>
          </div>
        </div>
      </div>

      {/* Right: Actions, Case Switcher, AI Copilot, Theme */}
      <div className="flex items-center gap-3">
        {/* Switch Case Selector */}
        {Array.isArray(recentInvestigations) && recentInvestigations.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <Layers className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={currentInvId || ""}
              onChange={(e) => setCurrentInvId(e.target.value)}
              className="text-xs bg-transparent rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 font-mono font-semibold focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="dark:bg-slate-900 text-slate-500">
                Select Case...
              </option>
              {recentInvestigations.map((inv) => (
                <option key={inv?.id || Math.random()} value={inv?.id || ""} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {inv?.id} &bull; {inv?.is_reviewed ? `Signed (${inv?.review_decision})` : (inv?.status || "Processing")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Refresh Button */}
        {currentInvId && (
          <button
            onClick={refreshInvestigation}
            title="Refresh case state"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* New Scan Button */}
        <button
          onClick={onNewScan}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-all shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Scan</span>
        </button>

        {/* AI Copilot Toggle Button */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/15 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Copilot</span>
        </button>

        {/* Health status beacon */}
        <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 text-xs">
          {health?.status === "healthy" || health?.fastapi === "ready" ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden md:inline">Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
              <Activity className="w-3 h-3 animate-spin" />
              <span className="hidden md:inline">Connecting</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
