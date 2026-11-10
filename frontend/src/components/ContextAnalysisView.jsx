import React from "react";
import { Search, AlertTriangle, AlertCircle, FileText, CheckCircle2, Tag, ShieldAlert } from "lucide-react";

export default function ContextAnalysisView({ findings, report }) {
  const contextData = findings?.agents?.context_agent?.data || report?.contextual_analysis || {};

  const entities = contextData.entities || [];
  const anomalies = contextData.anomalies || [];
  const missingFields = contextData.missing_fields || [];
  const modelUsed = contextData.model_used || "Factual Entity Engine";
  const status = contextData.status || "Unknown";

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-cyan-400">
              <Search className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-cyan-400 font-bold">
              AGENT 3: CONTEXTUAL & SYNTACTIC FORENSICS
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Contextual and Syntactic Forensic Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Model Engine: <span className="font-semibold text-blue-700 dark:text-cyan-400 font-mono">{modelUsed}</span> ({status})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-800 font-semibold font-mono">
            {entities.length} Verified Entities
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold font-mono">
            {anomalies.length} Contextual Flags
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Anomalies & Missing Fields */}
        <div className="space-y-6">
          {/* Anomalies Card */}
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold">
                POTENTIAL TEXT INCONSISTENCIES ({anomalies.length})
              </h4>
            </div>

            {anomalies.length > 0 ? (
              <div className="space-y-2.5">
                {anomalies.map((anom, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed"
                  >
                    • {anom}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>No syntactic or typography contradictions flagged.</span>
              </div>
            )}
          </div>

          {/* Missing Fields Card */}
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold">
                MISSING REQUIRED FIELDS ({missingFields.length})
              </h4>
            </div>

            {missingFields.length > 0 ? (
              <div className="space-y-2.5">
                {missingFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-900 dark:text-red-200 leading-relaxed"
                  >
                    • {field}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Standard verification and signature fields present.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Factual Extracted Entities Table */}
        <div className="lg:col-span-2 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold">
              EXTRACTED & GROUNDED FORENSIC ENTITIES ({entities.length})
            </h4>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Strictly grounded in OCR source text
            </span>
          </div>

          <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/60 font-semibold">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Extracted Entity Value</th>
                  <th className="py-2.5 px-3">Verbatim Match in Document</th>
                  <th className="py-2.5 px-3">Doc & Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entities.map((ent, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        <Tag className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {ent.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {ent.value}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-xs">
                      {ent.source_text}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                      {ent.document} (p.{ent.page})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
