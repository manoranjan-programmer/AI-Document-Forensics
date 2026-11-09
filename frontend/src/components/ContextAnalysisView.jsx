import React from "react";
import { Search, AlertTriangle, AlertCircle, FileText, CheckCircle2, Tag } from "lucide-react";

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
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Contextual and Syntactic Forensic Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Model Engine: <span className="font-semibold text-blue-700">{modelUsed}</span> ({status})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
            {entities.length} Verified Entities
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
            {anomalies.length} Contextual Flags
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Anomalies & Missing Fields */}
        <div className="space-y-6">
          {/* Anomalies Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Potential Text Inconsistencies ({anomalies.length})
              </h4>
            </div>

            {anomalies.length > 0 ? (
              <div className="space-y-2.5">
                {anomalies.map((anom, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed"
                  >
                    • {anom}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No syntactic or typography contradictions flagged.</span>
              </div>
            )}
          </div>

          {/* Missing Fields Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Missing Required Fields ({missingFields.length})
              </h4>
            </div>

            {missingFields.length > 0 ? (
              <div className="space-y-2.5">
                {missingFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50/60 border border-red-200 rounded-lg text-xs text-red-900 leading-relaxed"
                  >
                    • {field}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Standard verification and signature fields present.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Factual Extracted Entities Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Extracted & Grounded Forensic Entities ({entities.length})
            </h4>
            <span className="text-[11px] text-slate-400">Strictly grounded in OCR source text</span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60 font-semibold">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Extracted Entity Value</th>
                  <th className="py-2.5 px-3">Verbatim Match in Document</th>
                  <th className="py-2.5 px-3">Doc & Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entities.map((ent, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {ent.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{ent.value}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                      {ent.source_text}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
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

