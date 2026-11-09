import React, { useState } from "react";
import { Upload, FileUp, CheckCircle, AlertTriangle, Play, Sparkles } from "lucide-react";

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
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900">Upload Documents for Forensic Examination</h3>
        <p className="text-xs text-slate-500 mt-1">
          Upload single or multiple PDF reports, medical invoices, identity cards, or laboratory test results.
          The 6-agent system coordinates visual tampering detection, text extraction, contextual verification,
          and relational comparison.
        </p>

        {/* Drag and Drop Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer relative"
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
              <FileUp className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Drag and drop files here, or <span className="text-blue-600 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports PDF, PNG, JPG, JPEG, TIFF (Max 50MB per file)
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Selected Files Queue */}
      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Queued Documents ({selectedFiles.length})
            </h4>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Clear All
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {selectedFiles.map((file, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 truncate pr-4">
                  <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                    {file.name.split(".").pop().toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-red-600 px-2 py-1 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Action Trigger */}
          <div className="mt-6 flex justify-end">
            <button
              disabled={isUploading}
              onClick={handleTrigger}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading & Triggering Agents...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Multi-Agent Forensic Investigation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Forensic Advisory Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
        <span className="font-bold">Investigator Notice:</span> This application deploys deep-learning models
        (MobileNetV2 binary classification and YOLOv8 spatial localization) alongside semantic transformers and
        OCR. Detected anomalies and visual bounding boxes highlight areas requiring closer examination.
        Model predictions do NOT constitute legal proof of fraud. Final determination remains under human investigator control.
      </div>
    </div>
  );
}

