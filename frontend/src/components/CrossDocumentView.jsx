import React, { useState } from "react";
import { GitCompare, AlertTriangle, CheckCircle2, ArrowRightLeft } from "lucide-react";

export default function CrossDocumentView({ findings, report }) {
  const compData = findings?.agents?.comparison_agent?.data || report?.cross_document_comparison || {};
  const comparisons = compData.comparisons || [];
  const contradictions = compData.potential_contradictions || [];
  const [selectedPairIdx, setSelectedPairIdx] = useState(0);

  if (!comparisons.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <GitCompare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm">Cross-document comparison requires at least two uploaded documents.</p>
      </div>
    );
  }

  const currentPair = comparisons[selectedPairIdx] || comparisons[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Cross-Document Relational Forensics</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sentence-BERT (all-MiniLM-L6-v2) Semantic Alignment & Value Discrepancy Detection
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
            {comparisons.length} Evaluated Pairs
          </span>
          {contradictions.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
              {contradictions.length} Contradictions Detected
            </span>
          )}
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {contradictions.length > 0 && (
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-4.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>Detected Cross-Document Value Inconsistencies ({contradictions.length})</span>
          </div>
          <div className="space-y-1.5 pl-6 text-xs text-red-700">
            {contradictions.map((c, i) => (
              <p key={i}>• {c}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Document Pairs List */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Pairwise Alignments ({comparisons.length})
          </h4>

          <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
            {comparisons.map((pair, idx) => {
              const isSelected = selectedPairIdx === idx;
              const hasDiff = pair.contradictions && pair.contradictions.length > 0;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedPairIdx(idx)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-50 bg-blue-50/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="truncate pr-2">{pair.document_1}</span>
                    <span className="font-mono text-blue-600 shrink-0">
                      {(pair.similarity_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <ArrowRightLeft className="w-3 h-3 shrink-0" />
                    <span className="truncate">{pair.document_2}</span>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">{pair.status}</span>
                    {hasDiff && (
                      <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
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
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Field-by-Field Correlation Analysis
            </h4>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold text-blue-700">{currentPair.document_1}</span>
              <span className="text-slate-400">vs</span>
              <span className="font-semibold text-blue-700">{currentPair.document_2}</span>
            </div>
          </div>

          {/* Compared Fields Table */}
          {currentPair.key_field_comparisons && currentPair.key_field_comparisons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Doc A Value</th>
                    <th className="py-2.5 px-3">Doc B Value</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentPair.key_field_comparisons.map((fc, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{fc.field}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{fc.doc_a_value}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{fc.doc_b_value}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                            fc.status === "Match"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {fc.status === "Match" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {fc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
              No overlapping structured identifiers found for this pair.
            </div>
          )}

          {/* Pair Contradictions List */}
          {currentPair.contradictions && currentPair.contradictions.length > 0 && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-lg space-y-1.5 text-xs">
              <div className="font-bold text-red-800">Pair Discrepancies:</div>
              {currentPair.contradictions.map((diff, i) => (
                <div key={i} className="text-red-700 pl-3">
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

