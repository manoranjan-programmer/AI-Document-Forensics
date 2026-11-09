import React, { useState } from "react";
import { UserCheck, ShieldCheck, AlertTriangle, HelpCircle, CheckCircle2, Clock } from "lucide-react";

export default function HumanReviewView({ currentInvId, report, onSubmitReview, isSubmitting }) {
  const existingReview = report?.review;
  const [reviewerName, setReviewerName] = useState(existingReview?.reviewer_name || "");
  const [decision, setDecision] = useState(existingReview?.decision || "Verified Authentic");
  const [comments, setComments] = useState(existingReview?.comments || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewerName.trim()) {
      setErrorMsg("Investigator name is required.");
      return;
    }
    if (!comments.trim()) {
      setErrorMsg("Investigator notes and rationale are required.");
      return;
    }

    try {
      setErrorMsg("");
      await onSubmitReview({
        reviewer_name: reviewerName.trim(),
        decision,
        comments: comments.trim(),
      });
      setSuccessMsg("Investigator review successfully recorded and locked.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to record human review");
    }
  };

  const decisionOptions = [
    {
      value: "Verified Authentic",
      label: "Verified Authentic",
      desc: "Anomalies explained or dismissed upon manual forensic inspection; document is cleared.",
      icon: ShieldCheck,
      color: "emerald",
    },
    {
      value: "Confirmed Tampered",
      label: "Confirmed Tampered",
      desc: "Manual review validates localized pixel alterations or cross-document data manipulation.",
      icon: AlertTriangle,
      color: "red",
    },
    {
      value: "Inconclusive",
      label: "Inconclusive / Requires Physical Re-scan",
      desc: "Ambiguous scan artifacts or insufficient contrast; request original paper/source file.",
      icon: HelpCircle,
      color: "amber",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900">Authorized Investigator Sign-off</h3>
        <p className="text-xs text-slate-500 mt-1">
          Forensic Principle: AI models provide evidentiary observations, but the final determination of
          document authenticity and fraud risk remains strictly under human investigator control.
        </p>

        {existingReview && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Case Officially Signed by {existingReview.reviewer_name}
              </span>
              <span className="text-[11px] font-mono text-emerald-700">{existingReview.reviewed_at}</span>
            </div>
            <div className="text-xs text-emerald-800">
              <b>Final Decision:</b> {existingReview.decision}
            </div>
            <div className="text-xs text-emerald-800">
              <b>Investigator Notes:</b> {existingReview.comments}
            </div>
          </div>
        )}
      </div>

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {existingReview ? "Submit Amended / Supplemental Decision" : "Record Formal Case Adjudication"}
        </h4>

        {/* Investigator Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Investigator Name & ID *
          </label>
          <input
            type="text"
            placeholder="e.g. Inspector J. Miller (Forensics Unit #4)"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Decision Radio Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Final Case Disposition *
          </label>
          <div className="space-y-2.5">
            {decisionOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = decision === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-50 bg-blue-50/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value={opt.value}
                    checked={isSelected}
                    onChange={(e) => setDecision(e.target.value)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <Icon className="w-3.5 h-3.5 text-slate-600" />
                      <span>{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Forensic Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Investigator Comments & Justification *
          </label>
          <textarea
            rows={4}
            placeholder="Detail your findings, manual verification steps, or rationale for clearing or escalating the document anomalies..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
            {successMsg}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            {isSubmitting ? (
              <span>Saving Decision...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Submit Final Human Decision</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

