import React from "react";
import {
  LayoutDashboard,
  Upload,
  Cpu,
  Image as ImageIcon,
  FileText,
  Search,
  GitCompare,
  ShieldAlert,
  FileDown,
  UserCheck,
  ChevronRight,
  Shield,
  Fingerprint,
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, currentInvId, invStatus, report }) {
  const navSections = [
    {
      group: "MISSION CONTROL",
      items: [
        { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
        { id: "upload", label: "New Document Scan", icon: Upload },
        { id: "pipeline", label: "6-Agent Pipeline", icon: Cpu, badge: invStatus?.status === "processing" ? "RUNNING" : null },
      ],
    },
    {
      group: "FORENSIC AGENTS",
      items: [
        { id: "visual", label: "Visual Anomaly (YOLO)", icon: ImageIcon },
        { id: "ocr", label: "OCR Spatial Matrix", icon: FileText },
        { id: "context", label: "Contextual NLP Agent", icon: Search },
        { id: "comparison", label: "Cross-Doc Relational Diff", icon: GitCompare },
      ],
    },
    {
      group: "DECISION & AUDIT",
      items: [
        { id: "evidence", label: "Evidence Matrix", icon: ShieldAlert, count: report?.executive_summary?.total_evidence_items },
        { id: "report", label: "Forensic PDF Report", icon: FileDown },
        { id: "review", label: "Human Sign-off Review", icon: UserCheck, isHighlight: true },
      ],
    },
  ];

  const isTampered =
    report?.overall_classification?.includes("Tampered") ||
    invStatus?.review_decision === "Confirmed Tampered";

  return (
    <aside className="w-68 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-screen select-none shrink-0 transition-colors">
      {/* Brand & Badge */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="/logo.png"
              alt="DocForensics Logo"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="w-9 h-9 rounded-xl object-contain shadow-md shadow-blue-500/10 shrink-0 border border-slate-200 dark:border-slate-700/80 p-0.5 bg-slate-50 dark:bg-slate-900"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                DocForensics
              </h1>
              <span className="text-[10px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Autonomous Verification
            </p>
          </div>
        </div>

        {/* Active Case Telemetry Card */}
        {currentInvId ? (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Active Case
              </span>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                  invStatus?.is_reviewed
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60"
                    : isTampered
                    ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800/60"
                    : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800/60"
                }`}
              >
                {invStatus?.is_reviewed
                  ? "Adjudicated"
                  : invStatus?.status === "processing"
                  ? "Analyzing"
                  : isTampered
                  ? "Tampered"
                  : "Authentic"}
              </span>
            </div>

            <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              {currentInvId}
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate pr-1">
                {invStatus?.is_reviewed
                  ? `Signed: ${invStatus.review_decision}`
                  : invStatus?.current_step || "Case loaded"}
              </span>
              <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">No active investigation loaded</span>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              {section.group}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-400/30 animate-pulse">
                      {item.badge}
                    </span>
                  ) : item.count !== undefined && item.count > 0 ? (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : isActive ? (
                    <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-500" />
            Integrity Guard
          </span>
          <span className="font-mono text-[10px] text-emerald-500">ACTIVE</span>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
          MobileNetV2 + YOLOv8 + Sentence-BERT
        </div>
      </div>
    </aside>
  );
}
