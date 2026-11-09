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
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, currentInvId, invStatus }) {
  const navItems = [
    { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "upload", label: "Document Upload", icon: Upload },
    { id: "pipeline", label: "Investigation Pipeline", icon: Cpu },
    { id: "visual", label: "Visual Forensics", icon: ImageIcon },
    { id: "ocr", label: "OCR & Text Viewer", icon: FileText },
    { id: "context", label: "Contextual Findings", icon: Search },
    { id: "comparison", label: "Cross-Document Diff", icon: GitCompare },
    { id: "evidence", label: "Evidence Matrix", icon: ShieldAlert },
    { id: "report", label: "Investigation Report", icon: FileDown },
    { id: "review", label: "Investigator Review", icon: UserCheck },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0">
      {/* Brand & Badge */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="DocForensics Logo"
            className="w-8 h-8 rounded-lg object-contain shadow-xs shrink-0"
          />
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">DocForensics AI</h1>
            <p className="text-xs text-slate-500">Intelligent Investigation</p>
          </div>
        </div>

        {currentInvId && (
          <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Case</div>
            <div className="text-xs font-mono font-semibold text-blue-700 truncate">{currentInvId}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  invStatus?.is_reviewed
                    ? "bg-emerald-500"
                    : invStatus?.status === "completed"
                    ? "bg-amber-500"
                    : "bg-blue-500 animate-pulse"
                }`}
              />
              <span className="text-[11px] text-slate-600 capitalize">
                {invStatus?.is_reviewed
                  ? `Reviewed (${invStatus.review_decision})`
                  : invStatus?.current_step || "Active"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="text-[11px] text-slate-500 font-medium">Forensic Integrity Mode</div>
        <div className="text-[10px] text-slate-400 mt-0.5">MobileNetV2 + YOLOv8 + LangGraph</div>
      </div>
    </aside>
  );
}

