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
import { api } from "./services/api";

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

  // Initial Health & Case List
  useEffect(() => {
    loadHealthAndCases();
  }, []);

  const loadHealthAndCases = async () => {
    try {
      const h = await api.checkHealth();
      setHealth(h);
    } catch (e) {
      console.warn("Backend not ready:", e);
    }

    try {
      const cases = await api.listInvestigations();
      setRecentInvestigations(cases);
      if (cases.length > 0 && !currentInvId) {
        setCurrentInvId(cases[0].id);
      }
    } catch (e) {
      console.warn("Could not list investigations:", e);
    }
  };

  // Poll active investigation status if in processing
  useEffect(() => {
    if (!currentInvId) return;

    let intervalId = null;

    const fetchCaseDetails = async () => {
      try {
        const statusData = await api.getInvestigationStatus(currentInvId);
        setInvStatus(statusData);

        if (statusData.status === "completed" || statusData.status === "reviewed") {
          // Fetch completed results
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
      // 1. Upload files
      const uploadRes = await api.uploadDocuments(files);
      const docIds = uploadRes.map((d) => d.document_id);

      // 2. Start investigation pipeline
      const startRes = await api.startInvestigation(docIds);
      const newInvId = startRes.investigation_id;

      setCurrentInvId(newInvId);
      setInvStatus(startRes);
      setFindings(null);
      setEvidence([]);
      setReport(null);

      // Refresh list
      const cases = await api.listInvestigations();
      setRecentInvestigations(cases);

      // Navigate to pipeline tracker
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
      const res = await api.submitReview(currentInvId, reviewData);
      // Refresh status and report
      const statusData = await api.getInvestigationStatus(currentInvId);
      const rData = await api.getInvestigationReport(currentInvId);
      setInvStatus(statusData);
      setReport(rData);

      // Refresh cases list
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentInvId={currentInvId}
        invStatus={invStatus}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <Header
          health={health}
          recentInvestigations={recentInvestigations}
          currentInvId={currentInvId}
          setCurrentInvId={setCurrentInvId}
          refreshInvestigation={refreshActiveInvestigation}
        />

        {/* Tab Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === "overview" && (
            <DashboardOverview
              currentInvId={currentInvId}
              invStatus={invStatus}
              report={report}
              recentInvestigations={recentInvestigations}
              setActiveTab={setActiveTab}
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
        </main>
      </div>
    </div>
  );
}
