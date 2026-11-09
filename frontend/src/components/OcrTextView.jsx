import React, { useState } from "react";
import { FileText, Search, Copy, Check, Hash } from "lucide-react";

export default function OcrTextView({ findings, report }) {
  const ocrDocs = findings?.agents?.ocr_agent?.data?.documents || [];
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  if (!ocrDocs.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm">No OCR text extraction available yet.</p>
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
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">OCR & Document Text Extraction</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            EasyOCR Deep Character Recognition with Page-Level Spatial Coordinates
          </p>
        </div>

        {/* Document Selector */}
        <div className="flex items-center gap-2">
          {ocrDocs.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDocIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDocIdx === idx
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {doc.document_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Full Extracted Text Stream */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Extracted Raw Text ({currentDoc.document_name})
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Text"}</span>
            </button>
          </div>

          <pre className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto">
            {fullText || "No text extracted from document."}
          </pre>
        </div>

        {/* Right Col: Word Tokens with Bounding Boxes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Token Coordinates & Confidences
            </span>
            <div className="mt-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[480px] pr-1">
            {pages.flatMap((page) =>
              (page.text_items || [])
                .filter((item) =>
                  searchTerm ? item.text.toLowerCase().includes(searchTerm.toLowerCase()) : true
                )
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-1 hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{item.text}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        p.{item.page_number} ({(item.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      [{item.box.map((v) => Math.round(v)).join(", ")}]
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

