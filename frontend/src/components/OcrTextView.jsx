import React, { useState } from "react";
import { FileText, Search, Copy, Check, Hash, Terminal } from "lucide-react";

export default function OcrTextView({ findings, report }) {
  const ocrDocs = findings?.agents?.ocr_agent?.data?.documents || [];
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  if (!ocrDocs.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
        <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No OCR Text Available</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          OCR extraction is pending or no documents were submitted for this case.
        </p>
      </div>
    );
  }

  const currentDoc = ocrDocs[selectedDocIdx] || ocrDocs[0];
  const pages = currentDoc.pages || [];
  const fullText = currentDoc.combined_text || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-cyan-400">
              <FileText className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-cyan-400 font-bold">
              AGENT 1: OPTICAL CHARACTER RECOGNITION
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            OCR & Document Text Extraction
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            EasyOCR Deep Character Recognition with Page-Level Spatial Coordinates
          </p>
        </div>

        {/* Document Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {ocrDocs.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDocIdx(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDocIdx === idx
                  ? "bg-blue-600 dark:bg-cyan-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {doc.document_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Full Extracted Text Stream */}
        <div className="lg:col-span-2 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                EXTRACTED RAW TEXT ({currentDoc.document_name})
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Text"}</span>
            </button>
          </div>

          <pre className="flex-1 bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto border border-slate-800 selection:bg-cyan-500/30 selection:text-cyan-200">
            {fullText || "No text extracted from document."}
          </pre>
        </div>

        {/* Right Col: Word Tokens with Bounding Boxes */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
              TOKEN COORDINATES & CONFIDENCES
            </span>
            <div className="mt-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Filter tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[480px] pr-1">
            {pages.flatMap((page) =>
              (page.text_items || [])
                .filter((item) =>
                  searchTerm ? item.text?.toLowerCase().includes(searchTerm.toLowerCase()) : true
                )
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs space-y-1 hover:border-blue-400 dark:hover:border-cyan-500/60 transition-colors"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span className="truncate pr-2 font-mono">"{item.text}"</span>
                      <span className="font-mono text-[10px] text-blue-600 dark:text-cyan-400 shrink-0">
                        {item.confidence != null ? `${(item.confidence * 100).toFixed(0)}%` : ""}
                      </span>
                    </div>
                    {item.bounding_box && (
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        Box: [{item.bounding_box.map((v) => Math.round(v)).join(", ")}]
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
