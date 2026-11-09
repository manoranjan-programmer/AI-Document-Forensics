import React from "react";
import { api } from "../services/api";
import { FileDown, FileCode, Shield, CheckCircle, AlertTriangle, UserCheck } from "lucide-react";

export default function ReportView({ report, currentInvId, setActiveTab }) {
  if (!report) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <FileDown className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm">Investigation report is being compiled or not yet started.</p>
      </div>
    );
  }

  const exec = report.executive_summary || {};
  const pdfUrl = api.getPdfReportUrl(currentInvId);

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `forensics_report_${currentInvId}.json`);
    dlAnchor.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Action Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            CASE: {currentInvId}
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-1">Investigation Report Summary</h3>
          <p className="text-xs text-slate-500">
            Generated: {report.generated_at} • Status:{" "}
            <span className="font-semibold text-amber-700">{report.investigation_status}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <FileCode className="w-4 h-4 text-slate-500" />
            <span>JSON Report</span>
          </button>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Official PDF</span>
          </a>
        </div>
      </div>

      {/* Mandatory Forensic Disclaimer Alert */}
      <div className="bg-red-50/70 border border-red-200 rounded-xl p-4.5 text-xs text-red-900 leading-relaxed">
        <span className="font-bold">LEGAL & FORENSIC ADVISORY:</span> The classifications and anomaly
        detections in this report are automatically compiled to assist authorized investigators.
        Model predictions indicate potential anomalies and visual inconsistencies, <b>NOT conclusive proof of fraud</b>.
        Final adjudication remains strictly under human control.
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] text-slate-400 font-bold uppercase">System Finding</div>
          <div className="text-base font-bold text-slate-900 mt-1">{report.overall_classification}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Examined Documents</div>
          <div className="text-base font-bold text-slate-900 mt-1">{exec.total_documents || 0} docs ({exec.total_pages || 0} pages)</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Visual Anomaly Regions</div>
          <div className="text-base font-bold text-red-600 mt-1">{exec.suspicious_regions_count || 0} regions</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] text-slate-400 font-bold uppercase">Relational Contradictions</div>
          <div className="text-base font-bold text-amber-600 mt-1">{exec.cross_document_mismatches_count || 0} items</div>
        </div>
      </div>

      {/* Recommendations Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
          Automated Pipeline Recommendation
        </h4>
        <p className="text-xs text-slate-700 leading-relaxed">{exec.recommendation}</p>
      </div>

      {/* Document Classification Overview Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
          Document Level Forensic Findings
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2.5 px-3">Document Name</th>
                <th className="py-2.5 px-3">Pages</th>
                <th className="py-2.5 px-3">Visual Classification</th>
                <th className="py-2.5 px-3">Tamper Score</th>
                <th className="py-2.5 px-3">Threshold</th>
                <th className="py-2.5 px-3">Suspicious Regions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(report.documents || []).map((doc, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{doc.document_name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{doc.page_count}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        doc.classification.includes("Tamper")
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {doc.classification}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{doc.tampering_score?.toFixed(4)}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{doc.threshold}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">
                    {doc.suspicious_regions?.length || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 6: Investigator Review & Final Human Sign-off */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              6. Investigator Review & Final Human Sign-off
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Official forensic adjudication protocol by an authorized human investigator.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              report.review
                ? report.review.decision === "Confirmed Tampered"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : report.review.decision === "Verified Authentic"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {report.review ? `Status: ${report.review.decision}` : "Pending Human Review"}
          </span>
        </div>

        {/* The Review Table matching the PDF */}
        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50/70">
            <div className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investigator Name</span>
              <div className="font-semibold text-slate-800 text-xs">
                {report.review?.reviewer_name || <span className="text-slate-400 font-mono italic">_______________________</span>}
              </div>
            </div>
            <div className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Review Date & Time</span>
              <div className="font-semibold text-slate-800 text-xs">
                {report.review?.reviewed_at ? (
                  new Date(report.review.reviewed_at).toLocaleString()
                ) : (
                  <span className="text-slate-400 font-mono italic">____/____/________</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-t border-slate-200 bg-white">
            <div className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Disposition</span>
              <div className="mt-1">
                {report.review ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-xs ${
                      report.review.decision === "Confirmed Tampered"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : report.review.decision === "Verified Authentic"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    [X] {report.review.decision}
                  </span>
                ) : (
                  <span className="text-slate-400 font-mono text-[11px]">
                    [ &nbsp; ] Verified Authentic &nbsp;&nbsp;&nbsp; [ &nbsp; ] Confirmed Tampered &nbsp;&nbsp;&nbsp; [ &nbsp; ] Inconclusive
                  </span>
                )}
              </div>
            </div>
            <div className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investigator Signature</span>
              <div className="text-slate-700 mt-1 min-h-[46px] flex items-center">
                {report.review ? (
                  <div className="flex flex-col gap-1">
                    <img
                      src={api.getAssetUrl(report.review.signature_url || `/static/outputs/signatures/sig_${currentInvId}.png`)}
                      alt={`Signature of ${report.review.reviewer_name}`}
                      className="h-10 object-contain object-left max-w-[240px]"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.display = "block";
                      }}
                    />
                    <div
                      className="hidden relative inline-block py-0.5"
                    >
                      <div
                        className="text-2xl text-blue-900 font-normal select-none tracking-wide -rotate-1 pl-0.5"
                        style={{
                          fontFamily: "'Brush Script MT', 'Segoe Script', 'Caveat', 'Dancing Script', cursive",
                        }}
                      >
                        {report.review.reviewer_name}
                      </div>
                      <div className="w-full border-b border-blue-900/40 -mt-0.5 mb-1"></div>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Digitally Certified &bull; Verified</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 font-mono italic">_______________________</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-3.5 border-t border-slate-200 bg-slate-50/30 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investigator Notes & Comments</span>
            <div className="text-slate-700 leading-relaxed mt-1">
              {report.review?.comments ? (
                <p className="whitespace-pre-wrap">{report.review.comments}</p>
              ) : (
                <span className="text-slate-400 font-mono italic">__________________________________________________________________________________</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => setActiveTab("review")}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            <span>{report.review ? "Modify Review Decision" : "Complete & Sign Human Review"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

