import React, { useState } from "react";
import { Upload, FileUp, CheckCircle, AlertTriangle, Play, Sparkles, Shield, FileCheck2, Trash2 } from "lucide-react";

export default function UploadView({ onStartInvestigation, isUploading }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    validateAndSetFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      validateAndSetFiles(files);
    }
  };

  const validateAndSetFiles = (files) => {
    const allowedExts = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"];
    const valid = [];
    let err = "";

    files.forEach((file) => {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (allowedExts.includes(ext)) {
        if (file.size <= 50 * 1024 * 1024) {
          valid.push(file);
        } else {
          err = `File '${file.name}' exceeds the 50MB size limit.`;
        }
      } else {
        err = `File '${file.name}' is an unsupported format.`;
      }
    });

    if (err) setUploadError(err);
    else setUploadError("");

    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTrigger = () => {
    if (!selectedFiles.length) {
      setUploadError("Please select at least one document to examine.");
      return;
    }
    onStartInvestigation(selectedFiles);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Intake & Forensic Scan Portal
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Upload single or paired documents (e.g. salary slip vs bank statement, or medical bills).
          The LangGraph orchestrator dispatches 6 specialized neural agents for spatial anomaly detection,
          optical extraction, and cross-document semantic comparison.
        </p>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-cyan-400 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-950/40 hover:bg-blue-50/20 dark:hover:bg-slate-900/60 transition-all cursor-pointer relative group"
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white mb-3 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <FileUp className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Drag and drop target files here, or <span className="text-blue-600 dark:text-cyan-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Supports PDF, PNG, JPG, JPEG, TIFF, WEBP (Up to 50MB per file)
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Selected Files Queue */}
      {selectedFiles.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Queued For Examination ({selectedFiles.length})
              </h4>
            </div>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
            >
              Clear All
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {selectedFiles.map((file, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 truncate pr-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px]">
                    {file.name.split(".").pop().toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Trigger */}
          <div className="pt-2 flex justify-end">
            <button
              disabled={isUploading}
              onClick={handleTrigger}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching 6 Agents...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Initiate Multi-Agent Forensic Investigation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Forensic Notice Banner */}
      <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">Autonomous Evaluation Framework:</span>{" "}
          MobileNetV2 outputs binary document-level classification, YOLOv8 flags candidate anomaly patches, and Sentence-BERT
          checks semantic coherence. Model predictions represent statistical variances and require certified human sign-off.
        </div>
      </div>
    </div>
  );
}
