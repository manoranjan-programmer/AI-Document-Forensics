import React, { useState } from "react";
import { UserCheck, ShieldCheck, AlertTriangle, HelpCircle, CheckCircle2, Clock, Award, Sparkles } from "lucide-react";

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
      setSuccessMsg("Investigator review successfully recorded, digitally signed, and locked.");
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
      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-cyan-400 font-bold">
            HUMAN-IN-THE-LOOP ADJUDICATION
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Authorized Investigator Sign-off Protocol
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Forensic Principle: AI models provide evidentiary observations, but the final determination of
          document authenticity and fraud risk remains strictly under human investigator control.
        </p>

        {existingReview && (
          <div className="mt-4 p-4.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Case Officially Adjudicated & Signed by {existingReview.reviewer_name}
              </span>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                {existingReview.reviewed_at}
              </span>
            </div>
            <div className="text-xs text-emerald-800 dark:text-emerald-200">
              <b>Final Decision:</b> {existingReview.decision}
            </div>
            <div className="text-xs text-emerald-800 dark:text-emerald-200/90 leading-relaxed">
              <b>Investigator Notes:</b> {existingReview.comments}
            </div>
          </div>
        )}
      </div>

      {/* Review Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold">
            {existingReview ? "SUBMIT AMENDED / SUPPLEMENTAL DECISION" : "RECORD FORMAL CASE ADJUDICATION"}
          </h4>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">* Required fields</span>
        </div>

        {/* Investigator Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Investigator Name & ID *
          </label>
          <input
            type="text"
            placeholder="e.g. Inspector J. Miller (Forensics Unit #4)"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
            required
          />
        </div>

        {/* Decision Radio Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Final Case Disposition *
          </label>
          <div className="space-y-2.5">
            {decisionOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = decision === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 dark:border-cyan-500 bg-blue-50/30 dark:bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] ring-1 ring-blue-500/20 dark:ring-cyan-500/30"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value={opt.value}
                    checked={isSelected}
                    onChange={(e) => setDecision(e.target.value)}
                    className="mt-0.5 text-blue-600 dark:text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                      <Icon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Forensic Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Investigator Comments & Justification *
          </label>
          <textarea
            rows={4}
            placeholder="Detail your findings, manual verification steps, or rationale for clearing or escalating the document anomalies..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
            required
          />
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            {isSubmitting ? (
              <span>Saving & Generating Digital Signature...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Submit Final Human Decision & Generate Signature</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
