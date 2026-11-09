# Agentic AI-Based Intelligent Document Forensics and Contextual Investigation System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.133+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2+-blue?logo=langchain&logoColor=white)](https://github.com/langchain-ai/langgraph)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.13+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF)](https://docs.ultralytics.com)
[![MobileNetV2](https://img.shields.io/badge/MobileNetV2-Keras-FF6F00?logo=keras&logoColor=white)](https://keras.io)

An enterprise-grade, agentic AI document verification and contextual forensics platform. The system empowers human investigators to examine single or multi-document cases (PDFs, laboratory reports, medical bills, financial statements, IDs), detect localized pixel tampering, extract text, correlate multi-document records, identify factual discrepancies, synthesize evidence, and produce court-admissible forensic reports while strictly preserving human authority over final decisions.

---

## 1. System Architecture

```
[ Uploaded Documents (PDF / Images) ]
                  │
                  ▼
┌────────────────────────────────────────────────────────┐
│            LangGraph Investigation State Graph          │
├────────────────────────────────────────────────────────┤
│ 1. OCR & Document Extraction Agent (EasyOCR + PyMuPDF)  │
│ 2. Visual Forensic Agent (MobileNetV2 + YOLOv8)        │
│ 3. Contextual Analysis Agent (Qwen-2.5 / Factual Rule) │
│ 4. Cross-Document Comparison Agent (Sentence-BERT)     │
│ 5. Evidence Investigation Agent (Spatial Mapping)      │
│ 6. Investigation Report Agent (ReportLab PDF + JSON)   │
└────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────┐
│         Authorized Human Investigator Review           │
│   (Verified Authentic | Confirmed Tampered | Inconcl.) │
└────────────────────────────────────────────────────────┘
```

---

## 2. The Six Specialized AI Agents

### Agent 1: OCR & Document Extraction Agent (`agents/ocr_agent.py`)
- Converts PDF pages into high-resolution images via PyMuPDF (`fitz`).
- Executes character detection and recognition using **EasyOCR**.
- Preserves page-level spatial coordinates `[x1, y1, x2, y2]`, confidences, and structured word tokens.

### Agent 2: Visual Forensic Agent (`agents/visual_agent.py`)
- Evaluates document authenticity using the trained **MobileNetV2** binary classifier (`backend/models/document_forensics_model.keras`).
  - *Preprocessing Integrity:* Passes original pixel values in the `[0, 255]` range into the model's preprocessing layer (never divides by 255 beforehand).
  - *Threshold:* Dynamically loaded from `backend/models/model_config.json` (`threshold: 0.90`). Class 0: Authentic, Class 1: Tampered.
- Detects localized spatial manipulation using **YOLOv8** (`backend/models/best.pt`).
- Generates annotated images with highlighted bounding boxes and confidence overlays for human inspection.
- *Explainability Guarantee:* Model predictions are explicitly defined as anomaly indicators, never as conclusive legal proof of fraud.

### Agent 3: Contextual Analysis Agent (`agents/context_agent.py`)
- Analyzes OCR-extracted text to identify names, dates, amounts, unusual text patterns, and missing mandatory fields.
- Supports pretrained `Qwen/Qwen2.5-1.5B-Instruct` when hardware memory is allocated (`ENABLE_LOCAL_LLM=true`).
- When offline or memory-restricted, executes deterministic, regex-anchored factual extraction directly from the source text.
- *Zero Hallucination Guarantee:* Never fabricates facts or assumes missing fields. All extracted items cite verbatim source text.

### Agent 4: Cross-Document Comparison Agent (`agents/comparison_agent.py`)
- Embeds document text using `sentence-transformers/all-MiniLM-L6-v2`.
- Performs pairwise cosine similarity analysis to identify near-duplicates, amendments, or revision copies.
- Performs field-by-field cross-matching across key identifiers (UHID, Visit ID, Patient ID, Barcode, Dates, and Test Values).
- Flags critical value contradictions (e.g. *Serum Creatinine 1.06 mg/dL* vs altered *106 mg/dL*).

### Agent 5: Evidence Investigation Agent (`agents/evidence_agent.py`)
- Synthesizes findings across visual, textual, and relational agents.
- Performs geometric intersection analysis (`compute_box_intersection_ratio`) mapping YOLOv8 visual anomaly boxes to overlapping OCR word tokens.
- Generates unique sequential evidence IDs (`EVIDENCE_1`, `EVIDENCE_2`, ...).
- Strictly partitions evidence by source level:
  - `model_prediction` (MobileNetV2 classification scores, YOLO bounding boxes).
  - `extracted_fact` (Grounded OCR tokens, patient IDs, dates).
  - `inferred_concern` (Cross-document numerical discrepancies, missing signatures).

### Agent 6: Investigation Report Agent (`agents/report_agent.py`)
- Generates a comprehensive, downloadable **PDF report** via ReportLab and a matching **JSON report**.
- Mandatory status: Initialized as `Pending Human Investigation`.
- Includes executive summary, visual inspection tables, contextual discrepancy warnings, evidence registry, and a formal investigator sign-off block.

---

## 3. Pretrained Model Weights

The system loads and uses the following trained files in `backend/models/`:

| File | Description | Purpose |
|---|---|---|
| `document_forensics_model.keras` | MobileNetV2 Binary Classifier | Document classification (Authentic vs Tampered, 224x224 RGB) |
| `best.pt` | YOLOv8 Spatial Region Detector | Localizes suspicious tampering regions with bounding boxes |
| `model_config.json` | Model Configuration | Classification threshold (`0.90`) and input specifications |
| `extracted_documents.json` | Kaggle Sample Reference | Ground truth test OCR samples from model development |

---

## 4. Setup and Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm 9+
- Windows PowerShell

### Step 1: Clone and Enter Repository
```powershell
cd D:\Document-Forensics
```

### Step 2: Install Python Dependencies
```powershell
pip install -r backend/requirements.txt
```

### Step 3: Configure Environment Variables
```powershell
Copy-Item backend\.env.example backend\.env
```
*(Optional)* Add Supabase credentials to `backend/.env` if using remote PostgreSQL storage. If left unconfigured, the system automatically uses the local SQLite engine (`backend/data/forensics.db`).

### Step 4: Install Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

---

## 5. Running the Application

### Start the FastAPI Backend Server
Open a PowerShell terminal:
```powershell
cd D:\Document-Forensics\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API and Swagger UI will be available at:
- **API Root:** [http://localhost:8000](http://localhost:8000)
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### Start the React Frontend Dashboard
Open a second PowerShell terminal:
```powershell
cd D:\Document-Forensics\frontend
npm run dev
```
The investigation dashboard will be available at:
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)

---

## 6. Verification & Test Suites

The repository contains two end-to-end verification scripts:

### Test 1: Full Multi-Agent & LangGraph Pipeline
Generates synthetic paired medical documents, tests EasyOCR, MobileNetV2, YOLOv8, Sentence-BERT, Evidence Mapping, PDF generation, and LangGraph state coordination:
```powershell
cd D:\Document-Forensics
python backend/test_system.py
```

### Test 2: Complete FastAPI Endpoint Verification
Tests all 10 API endpoints via FastAPI `TestClient`:
```powershell
cd D:\Document-Forensics
python backend/test_api_endpoints.py
```

---

## 7. API Endpoints Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and root welcome |
| `GET` | `/health` | Availability of ML models and storage engine |
| `POST` | `/documents/upload` | Upload multiple PDF and image documents (up to 50MB each) |
| `POST` | `/investigation/start` | Trigger asynchronous multi-agent LangGraph investigation |
| `GET` | `/investigation/{id}` | Live investigation progress, current step, and status |
| `GET` | `/investigation/{id}/findings` | Raw structured findings from all 6 agents |
| `GET` | `/investigation/{id}/evidence` | Mapped evidence matrix with bounding boxes & citations |
| `GET` | `/investigation/{id}/report` | Structured forensic investigation report (JSON) |
| `GET` | `/investigation/{id}/report/pdf` | Download official forensic PDF report |
| `POST` | `/investigation/{id}/review` | Submit human investigator sign-off (`Verified Authentic`, `Confirmed Tampered`, `Inconclusive`) |
| `GET` | `/investigations` | List recent investigations for dashboard navigation |

---

## 8. Forensic Integrity & Human-in-the-Loop Protocol

1. **Explainable AI:** Statistical scores, bounding boxes, and semantic similarities indicate anomalies warranting human attention. They do not constitute automatic proof of fraud.
2. **Human Control:** The AI never automatically accepts or rejects a document. Every investigation status remains `Pending Human Investigation` until an authorized forensic investigator evaluates the findings, enters explanatory notes, and submits a binding decision.
3. **Downloadable PDF Audit Trail:** The generated ReportLab PDF embeds the full evidence matrix, original pixel metrics, contextual flags, and the investigator's electronic signature block.

