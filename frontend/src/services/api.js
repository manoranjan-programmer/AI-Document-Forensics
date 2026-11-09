/**
 * Centralized API Service for Document Forensics Investigation System
 */

// Uses Vite proxy '/api' by default to eliminate CORS, or explicit VITE_API_URL if provided
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const api = {
  getBaseUrl() {
    return API_BASE_URL;
  },

  getAssetUrl(relativePath) {
    if (!relativePath) return "";
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
      return relativePath;
    }
    const normalized = relativePath.replace(/\\/g, "/");
    if (normalized.includes("outputs/")) {
      const sub = normalized.split("outputs/")[1];
      return `/static/outputs/${sub}`;
    }
    if (normalized.includes("uploads/")) {
      const sub = normalized.split("uploads/")[1];
      return `/static/uploads/${sub}`;
    }
    return `${API_BASE_URL}/${normalized}`;
  },

  async checkHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("Backend service unavailable");
    return res.json();
  },

  async uploadDocuments(files, investigationId = null) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    if (investigationId) {
      formData.append("investigation_id", investigationId);
    }

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Document upload failed");
    }
    return res.json();
  },

  async startInvestigation(documentIds, notes = "") {
    const res = await fetch(`${API_BASE_URL}/investigation/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds, notes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Start investigation failed" }));
      throw new Error(err.detail || "Failed to trigger investigation");
    }
    return res.json();
  },

  async getInvestigationStatus(investigationId) {
    const res = await fetch(`${API_BASE_URL}/investigation/${investigationId}`);
    if (!res.ok) throw new Error(`Investigation ${investigationId} not found`);
    return res.json();
  },

  async getInvestigationFindings(investigationId) {
    const res = await fetch(`${API_BASE_URL}/investigation/${investigationId}/findings`);
    if (!res.ok) throw new Error("Could not retrieve agent findings");
    return res.json();
  },

  async getInvestigationEvidence(investigationId) {
    const res = await fetch(`${API_BASE_URL}/investigation/${investigationId}/evidence`);
    if (!res.ok) throw new Error("Could not retrieve evidence items");
    return res.json();
  },

  async getInvestigationReport(investigationId) {
    const res = await fetch(`${API_BASE_URL}/investigation/${investigationId}/report`);
    if (!res.ok) throw new Error("Report not yet compiled or unavailable");
    return res.json();
  },

  getPdfReportUrl(investigationId) {
    return `${API_BASE_URL}/investigation/${investigationId}/report/pdf`;
  },

  async submitReview(investigationId, reviewData) {
    const res = await fetch(`${API_BASE_URL}/investigation/${investigationId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Review submission failed" }));
      throw new Error(err.detail || "Failed to submit review");
    }
    return res.json();
  },

  async listInvestigations() {
    const res = await fetch(`${API_BASE_URL}/investigations`);
    if (!res.ok) return [];
    return res.json();
  },
};
