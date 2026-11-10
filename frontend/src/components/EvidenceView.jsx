import React, { useState } from "react";
import { ShieldAlert, Filter, Search, Tag, ExternalLink, Sparkles, Database } from "lucide-react";

export default function EvidenceView({ evidence, report }) {
  const items = evidence || report?.evidence_items || [];
  const [filterLevel, setFilterLevel] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = items.filter((ev) => {
    const matchesLevel = filterLevel === "all" ? true : ev.source_level === filterLevel;
    const matchesSearch = searchTerm
      ? ev.explanation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.evidence_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.document?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter Bar */}
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-cyan-400">
              <Database className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-cyan-400 font-bold">
              AGENT 5: SYNTHESIZED EVIDENCE MATRIX
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Synthesized Forensic Evidence Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Indexed Multi-Agent Observations with Strict Source-Level Separation & Traceability
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs border border-slate-200 dark:border-slate-700">
            {["all", "model_prediction", "inferred_concern", "extracted_fact"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all capitalize text-[11px] ${
                  filterLevel === lvl
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {lvl.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/60 font-semibold">
                <th className="py-3 px-4">Evidence ID</th>
                <th className="py-3 px-4">Source Document & Page</th>
                <th className="py-3 px-4">Type / Category</th>
                <th className="py-3 px-4">Evidence Classification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Explanation & Grounded Text</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((ev, idx) => {
                const isModel = ev.source_level === "model_prediction";
                const isInferred = ev.source_level === "inferred_concern";
                const isFact = ev.source_level === "extracted_fact";

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-cyan-400">
                      {ev.evidence_id}
                    </td>

                    {/* Doc & Page */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      <div>{ev.document}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Page {ev.page || 1}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {ev.evidence_type}
                    </td>

                    {/* Source Level Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          isModel
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            : isInferred
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        {ev.source_level?.replace("_", " ")}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {ev.detection_confidence != null
                        ? `${(ev.detection_confidence * 100).toFixed(1)}%`
                        : "N/A"}
                    </td>

                    {/* Explanation */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-md leading-relaxed">
                      <p>{ev.explanation}</p>
                      {ev.related_text && ev.related_text.length > 0 && (
                        <p className="mt-1 font-mono text-[11px] text-blue-600 dark:text-cyan-400 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-1 rounded inline-block">
                          Text: "{ev.related_text.join(" ")}"
                        </p>
                      )}
                      {ev.bounding_box && (
                        <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Box: [{ev.bounding_box.map((v) => Math.round(v)).join(", ")}]
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
