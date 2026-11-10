import React, { useState } from "react";
import { GitCompare, AlertTriangle, CheckCircle2, ArrowRightLeft, Sparkles, Layers } from "lucide-react";

export default function CrossDocumentView({ findings, report }) {
  const compData = findings?.agents?.comparison_agent?.data || report?.cross_document_comparison || {};
  const comparisons = compData.comparisons || [];
  const contradictions = compData.potential_contradictions || [];
  const [selectedPairIdx, setSelectedPairIdx] = useState(0);

  if (!comparisons.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
        <GitCompare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Cross-Document Pairs</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Cross-document comparison requires at least two uploaded documents to perform semantic relational forensics.
        </p>
      </div>
    );
  }

  const currentPair = comparisons[selectedPairIdx] || comparisons[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-cyan-400">
              <GitCompare className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-cyan-400 font-bold">
              AGENT 4: RELATIONAL CROSS-DOC DIFF
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Cross-Document Relational Forensics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sentence-BERT (<code className="font-mono text-blue-600 dark:text-cyan-400">all-MiniLM-L6-v2</code>) Semantic Alignment & Value Discrepancy Detection
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
            {comparisons.length} Evaluated Pairs
          </span>
          {contradictions.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-semibold animate-pulse">
              {contradictions.length} Contradictions Detected
            </span>
          )}
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {contradictions.length > 0 && (
        <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-red-800 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>Cross-Document Value Inconsistencies Flagged ({contradictions.length})</span>
          </div>
          <div className="space-y-1.5 pl-6 text-xs text-red-700 dark:text-red-300/90">
            {contradictions.map((c, i) => (
              <p key={i}>• {c}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Document Pairs List */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-3">
            PAIRWISE ALIGNMENTS ({comparisons.length})
          </h4>

          <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
            {comparisons.map((pair, idx) => {
              const isSelected = selectedPairIdx === idx;
              const hasDiff = pair.contradictions && pair.contradictions.length > 0;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedPairIdx(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                    isSelected
                      ? "border-blue-500 dark:border-cyan-500 bg-blue-50/30 dark:bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] ring-1 ring-blue-500/20 dark:ring-cyan-500/30"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span className="truncate pr-2">{pair.document_1}</span>
                    <span className="font-mono text-blue-600 dark:text-cyan-400 font-bold shrink-0">
                      {(pair.similarity_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
                    <ArrowRightLeft className="w-3 h-3 shrink-0" />
                    <span className="truncate">{pair.document_2}</span>
                  </div>

                  {/* Similarity Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-cyan-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, pair.similarity_score * 100)}%` }}
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{pair.status}</span>
                    {hasDiff && (
                      <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded">
                        {pair.contradictions.length} diff
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Detailed Field Comparison */}
        <div className="lg:col-span-2 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              FIELD-BY-FIELD CORRELATION ANALYSIS
            </h4>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-blue-700 dark:text-cyan-400 truncate max-w-[45%]">
                {currentPair.document_1}
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">vs</span>
              <span className="font-semibold text-blue-700 dark:text-cyan-400 truncate max-w-[45%]">
                {currentPair.document_2}
              </span>
            </div>
          </div>

          {/* Compared Fields Table */}
          {currentPair.key_field_comparisons && currentPair.key_field_comparisons.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 font-semibold">
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Doc A Value</th>
                    <th className="py-2.5 px-3">Doc B Value</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentPair.key_field_comparisons.map((fc, i) => {
                    const isMatch = fc.status === "Match";
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {fc.field}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {fc.doc_a_value}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {fc.doc_b_value}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                              isMatch
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold"
                            }`}
                          >
                            {isMatch ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            )}
                            {fc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
              No overlapping structured identifiers found for this pair.
            </div>
          )}

          {/* Pair Contradictions List */}
          {currentPair.contradictions && currentPair.contradictions.length > 0 && (
            <div className="mt-4 p-4 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl space-y-1.5 text-xs">
              <div className="font-bold text-red-800 dark:text-red-300">Pair Discrepancies:</div>
              {currentPair.contradictions.map((diff, i) => (
                <div key={i} className="text-red-700 dark:text-red-300/90 pl-3">
                  • {diff}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
