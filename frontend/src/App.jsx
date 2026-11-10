import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardOverview from "./components/DashboardOverview";
import UploadView from "./components/UploadView";
import PipelineTracker from "./components/PipelineTracker";
import VisualForensicsView from "./components/VisualForensicsView";
import OcrTextView from "./components/OcrTextView";
import ContextAnalysisView from "./components/ContextAnalysisView";
import CrossDocumentView from "./components/CrossDocumentView";
import EvidenceView from "./components/EvidenceView";
import ReportView from "./components/ReportView";
import HumanReviewView from "./components/HumanReviewView";
import AiCopilotDrawer from "./components/AiCopilotDrawer";
import { api } from "./services/api";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("DocForensics UI Render Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 m-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            Component Rendering Deviation Caught
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 font-mono">
            {this.state.error?.message || "An unexpected rendering deviation occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [health, setHealth] = useState(null);
  const [currentInvId, setCurrentInvId] = useState(null);
  const [invStatus, setInvStatus] = useState(null);
  const [findings, setFindings] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [report, setReport] = useState(null);
  const [recentInvestigations, setRecentInvestigations] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Pure White Light Theme (Permanent)
  const isDarkMode = false;

  useEffect(() => {
    try {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("docforensics_theme", "light");
    } catch {
      // Storage access protected
    }
  }, []);

  const toggleTheme = () => {};

  const loadHealthAndCases = async () => {
    try {
      const h = await api.checkHealth();
      setHealth(h);
    } catch (e) {
      console.warn("Backend not ready:", e);
    }

    try {
      const cases = await api.listInvestigations();
      setRecentInvestigations(cases || []);
      if (cases && cases.length > 0 && !currentInvId) {
        setCurrentInvId(cases[0].id);
      }
    } catch (e) {
      console.warn("Could not list investigations:", e);
    }
  };

  // Initial Health & Case List
  useEffect(() => {
    loadHealthAndCases();
  }, []);

  // Poll active investigation status if in processing
  useEffect(() => {
    if (!currentInvId) return;

    let intervalId = null;

    const fetchCaseDetails = async () => {
      try {
        const statusData = await api.getInvestigationStatus(currentInvId);
        setInvStatus(statusData);

        if (statusData.status === "completed" || statusData.status === "reviewed") {
          const [fData, eData, rData] = await Promise.all([
            api.getInvestigationFindings(currentInvId).catch(() => null),
            api.getInvestigationEvidence(currentInvId).catch(() => ({ evidence_items: [] })),
            api.getInvestigationReport(currentInvId).catch(() => null),
          ]);
          setFindings(fData);
          setEvidence(eData?.evidence_items || []);
          setReport(rData);
        }
      } catch (err) {
        console.error("Error polling investigation:", err);
      }
    };

    fetchCaseDetails();

    if (invStatus?.status === "processing") {
      intervalId = setInterval(fetchCaseDetails, 2500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentInvId, invStatus?.status]);

  // Upload handler
  const handleStartInvestigation = async (files) => {
    try {
      setIsUploading(true);
      const uploadRes = await api.uploadDocuments(files);
      const docIds = uploadRes.map((d) => d.document_id);

      const startRes = await api.startInvestigation(docIds);
      const newInvId = startRes.investigation_id;

      setCurrentInvId(newInvId);
      setInvStatus(startRes);
      setFindings(null);
      setEvidence([]);
      setReport(null);

      const cases = await api.listInvestigations();
      setRecentInvestigations(cases);

      setActiveTab("pipeline");
    } catch (err) {
      alert(`Error starting investigation: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Human Review handler
  const handleSubmitReview = async (reviewData) => {
    if (!currentInvId) return;
    try {
      setIsSubmittingReview(true);
      await api.submitReview(currentInvId, reviewData);

      const statusData = await api.getInvestigationStatus(currentInvId);
      const rData = await api.getInvestigationReport(currentInvId);
      setInvStatus(statusData);
      setReport(rData);

      const cases = await api.listInvestigations();
      setRecentInvestigations(cases);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const refreshActiveInvestigation = async () => {
    if (!currentInvId) return;
    try {
      const statusData = await api.getInvestigationStatus(currentInvId);
      setInvStatus(statusData);
      const [fData, eData, rData] = await Promise.all([
        api.getInvestigationFindings(currentInvId).catch(() => null),
        api.getInvestigationEvidence(currentInvId).catch(() => ({ evidence_items: [] })),
        api.getInvestigationReport(currentInvId).catch(() => null),
      ]);
      setFindings(fData);
      setEvidence(eData?.evidence_items || []);
      setReport(rData);
    } catch (e) {
      console.error("Refresh failed:", e);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentInvId={currentInvId}
        invStatus={invStatus}
        report={report}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden cyber-grid">
        {/* Header */}
        <Header
          health={health}
          recentInvestigations={recentInvestigations}
          currentInvId={currentInvId}
          setCurrentInvId={setCurrentInvId}
          refreshInvestigation={refreshActiveInvestigation}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onNewScan={() => setActiveTab("upload")}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />

        {/* Tab Content Body */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-8 relative">
          <ErrorBoundary>
            {activeTab === "overview" && (
              <DashboardOverview
                currentInvId={currentInvId}
                invStatus={invStatus}
                report={report}
                recentInvestigations={recentInvestigations}
                setActiveTab={setActiveTab}
                onOpenCopilot={() => setIsCopilotOpen(true)}
              />
            )}

            {activeTab === "upload" && (
              <UploadView
                onStartInvestigation={handleStartInvestigation}
                isUploading={isUploading}
              />
            )}

            {activeTab === "pipeline" && (
              <PipelineTracker invStatus={invStatus} findings={findings} />
            )}

            {activeTab === "visual" && (
              <VisualForensicsView findings={findings} report={report} />
            )}

            {activeTab === "ocr" && (
              <OcrTextView findings={findings} report={report} />
            )}

            {activeTab === "context" && (
              <ContextAnalysisView findings={findings} report={report} />
            )}

            {activeTab === "comparison" && (
              <CrossDocumentView findings={findings} report={report} />
            )}

            {activeTab === "evidence" && (
              <EvidenceView evidence={evidence} report={report} />
            )}

            {activeTab === "report" && (
              <ReportView
                report={report}
                currentInvId={currentInvId}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "review" && (
              <HumanReviewView
                currentInvId={currentInvId}
                report={report}
                onSubmitReview={handleSubmitReview}
                isSubmitting={isSubmittingReview}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Interactive AI Copilot Drawer */}
      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        report={report}
        findings={findings}
        evidence={evidence}
        invStatus={invStatus}
        currentInvId={currentInvId}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
