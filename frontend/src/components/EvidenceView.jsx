import React, { useState } from "react";
import { ShieldAlert, Filter, Search, Tag, ExternalLink } from "lucide-react";

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
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Synthesized Forensic Evidence Matrix</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Indexed Multi-Agent Observations with Strict Source-Level Separation
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            {["all", "model_prediction", "inferred_concern", "extracted_fact"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all capitalize text-[11px] ${
                  filterLevel === lvl
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {lvl.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80 font-semibold">
                <th className="py-3 px-4">Evidence ID</th>
                <th className="py-3 px-4">Source Document & Page</th>
                <th className="py-3 px-4">Type / Category</th>
                <th className="py-3 px-4">Evidence Classification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Explanation & Grounded Text</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((ev, idx) => {
                const isModel = ev.source_level === "model_prediction";
                const isInferred = ev.source_level === "inferred_concern";
                const isFact = ev.source_level === "extracted_fact";

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {ev.evidence_id}
                    </td>

                    {/* Doc & Page */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div>{ev.document}</div>
                      <div className="text-[11px] text-slate-400">Page {ev.page || 1}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {ev.evidence_type}
                    </td>

                    {/* Source Level Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          isModel
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : isInferred
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {ev.source_level.replace("_", " ")}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {ev.detection_confidence != null
                        ? `${(ev.detection_confidence * 100).toFixed(1)}%`
                        : "N/A"}
                    </td>

                    {/* Explanation */}
                    <td className="py-3 px-4 text-slate-700 max-w-md leading-relaxed">
                      <p>{ev.explanation}</p>
                      {ev.related_text && ev.related_text.length > 0 && (
                        <p className="mt-1 font-mono text-[11px] text-blue-600 bg-blue-50/60 p-1 rounded inline-block">
                          Text: "{ev.related_text.join(" ")}"
                        </p>
                      )}
                      {ev.bounding_box && (
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">
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

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No evidence records matching the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

