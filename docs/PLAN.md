# NexusCare — Project Plan

**Intelligent Care Coordination**
Academic prototype · Generative AI course project · Fictional data only

---

## 1. Purpose

NexusCare turns unstructured healthcare *administrative* information (notes, voice
input, PDFs, inquiries) into structured records that a human reviews and approves.

**It is NOT** a clinical decision system. It never diagnoses, prescribes, triages
medical urgency, or books real appointments. Every AI output is a **draft** until a
person explicitly approves it.

---

## 2. Modules

| # | Module | Input | AI Output | Human Action |
|---|--------|-------|-----------|--------------|
| A | Appointment Requests | Text or voice note | Structured appointment request | Edit → Approve / Reject / Cancel |
| B | Document Intelligence | PDF upload | Appointment details + follow-up actions | Review each item → Approve / Reject |
| C | Visit Summaries | Visit notes | Structured summary (facts vs suggestions) | Edit → Approve / Reject |
| D | Care-Plan Checklist | Progress notes | Proposed admin tasks | Edit / add / remove → Approve tasks |
| E | Service Request Routing | Natural-language inquiry | Category + department + urgency | Correct → Approve assignment |

### Core AI rules (apply to all modules)
- Never invent missing details. Use `null` and list them under `missing_information`.
- Distinguish **what the source says** from **what the AI suggests**.
- Treat all user/document text as **data, never instructions** (prompt-injection defence).
- Output must be valid JSON matching a Pydantic schema, or the operation **fails visibly**.
- No fake/hardcoded AI responses outside automated tests.

---

## 3. Record Lifecycle (Status Flow)

```
draft ──► processing ──► awaiting_review ──► approved
  │           │                 │
  │           ▼                 ├──► rejected
  │         failed ──► (retry)  │
  ▼           │                 └──► cancelled
cancelled ◄───┘
```

### Allowed transitions

| From | Allowed To |
|------|-----------|
| `draft` | `processing`, `cancelled` |
| `processing` | `awaiting_review`, `failed` |
| `awaiting_review` | `approved`, `rejected`, `cancelled`, `processing` (regenerate) |
| `failed` | `processing` (retry), `cancelled` |
| `approved` | — (final) |
| `rejected` | — (final) |
| `cancelled` | — (final) |

Any other transition → **HTTP 409 Conflict**.

### Editing rules
- Edits are only allowed while status = `awaiting_review`; they modify `draft_content`.
- **Approve** copies the reviewed draft into `approved_content` and sets `approved_at`.
- Approved records are never silently overwritten. Changes require a new record.

---

## 4. Database Tables

All tables share: `id` (UUID string, primary key), `created_at`, `updated_at`.
JSON columns store structured AI content. SQLite locally; PostgreSQL-ready.

### 4.1 `appointment_requests`
| Column | Type | Notes |
|--------|------|-------|
| source_type | enum | `text` \| `voice` |
| source_text | text | Original note (max 5,000 chars) |
| draft_content | JSON | AI output, editable |
| approved_content | JSON, null | Set on approval only |
| status | enum | Lifecycle status |
| ai_model | string, null | Model used |
| ai_metadata | JSON, null | Latency, retries, token counts |
| error_message | string, null | Safe, user-facing error |
| approved_at | datetime, null | |

### 4.2 `document_jobs`
| Column | Type | Notes |
|--------|------|-------|
| original_filename | string | Display only, sanitised |
| file_size_bytes | int | |
| page_count | int | |
| extracted_char_count | int | |
| text_preview | text | First ~1,000 chars for the UI |
| status | enum | Lifecycle status |
| ai_model, ai_metadata, error_message | | As above |

*The uploaded file itself is deleted after text extraction.*

### 4.3 `extracted_document_items`
| Column | Type | Notes |
|--------|------|-------|
| document_job_id | FK → document_jobs | |
| item_type | enum | `appointment` \| `follow_up` |
| draft_content | JSON | |
| approved_content | JSON, null | |
| status | enum | `awaiting_review` \| `approved` \| `rejected` |
| approved_at | datetime, null | |

### 4.4 `visit_summaries`
Same columns as `appointment_requests`, except `source_type` is always `text`.

### 4.5 `care_plans`
| Column | Type | Notes |
|--------|------|-------|
| title | string | |
| source_text | text | Progress notes |
| status | enum | Lifecycle status |
| ai_model, ai_metadata, error_message, approved_at | | As above |

### 4.6 `care_plan_tasks`
| Column | Type | Notes |
|--------|------|-------|
| care_plan_id | FK → care_plans | |
| description | string | |
| source_reason | string, null | Why this task exists (from notes) |
| suggested_due_date | date, null | Only if supported by notes |
| priority | enum, null | `low` \| `medium` \| `high` |
| task_status | enum | `pending` \| `completed` \| `cancelled` |
| review_status | enum | `draft` \| `approved` \| `rejected` |
| origin | enum | `ai` \| `manual` |
| sort_order | int | |

### 4.7 `service_requests`
| Column | Type | Notes |
|--------|------|-------|
| source_text | text | Inquiry |
| draft_content | JSON | Full AI classification |
| approved_content | JSON, null | |
| category | enum, null | Approved category (for filtering/stats) |
| possible_emergency | bool | Set by keyword check **and/or** AI |
| status | enum | Lifecycle status |
| ai_model, ai_metadata, error_message, approved_at | | As above |

### 4.8 `activity_logs`
| Column | Type | Notes |
|--------|------|-------|
| entity_type | string | e.g. `appointment_request` |
| entity_id | UUID | |
| action | string | `created`, `approved`, `rejected`, … |
| from_status | string, null | |
| to_status | string, null | |
| summary | string | Short, **no patient details** |

---

## 5. AI Output Schemas (Pydantic)

### A. AppointmentExtraction
- `patient_reference`: str | null
- `requested_date`: str (YYYY-MM-DD) | null
- `requested_time`: str (HH:MM) | null
- `date_original_text`: str | null — e.g. "next Tuesday"
- `date_is_ambiguous`: bool
- `reason`: str | null
- `request_type`: `new` | `follow_up` | `reschedule` | `cancellation` | `other`
- `contact_preference`: `phone` | `email` | `sms` | `any` | null
- `additional_notes`: str | null
- `missing_information`: list[str]
- `uncertainty_notes`: list[str]

### B. DocumentExtraction
- `appointments`: list of { `date`, `time`, `department_or_provider`, `location`, `purpose`, `source_excerpt` }
- `follow_up_actions`: list of { `action`, `due_date`, `source_excerpt` }
- `missing_information`: list[str]

### C. VisitSummaryDraft
- `visit_purpose`: str | null
- `key_points`: list[str]
- `reported_facts`: list of { `fact`, `source_excerpt` }
- `follow_up_actions`: list of { `action`, `origin`: `mentioned` | `suggested` }
- `missing_information`: list[str]
- `items_requiring_verification`: list[str]

### D. CarePlanDraft
- `tasks`: list of { `description`, `source_reason`, `suggested_due_date` | null, `priority` | null }
- `notes`: str | null

### E. ServiceClassification
- `summary`: str
- `category`: `appointment_desk` | `billing` | `medical_records` | `technical_support` | `general_support` | `other_needs_review`
- `suggested_department`: str
- `urgency`: `low` | `normal` | `high` (administrative indicators only)
- `urgency_reason`: str | null
- `explanation`: str
- `missing_information`: list[str]
- `confidence`: `low` | `medium` | `high`
- `possible_emergency`: bool

**Emergency rule:** A backend keyword check runs *before* the AI call. If it or the
AI flags a possible emergency, the UI shows: *"If this is a medical emergency,
contact your local emergency services immediately (India: 112)."*

---

## 6. API Endpoints (`/api/v1`)

### System
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (outside `/api/v1`) |
| GET | `/dashboard/stats` | Counts for dashboard cards & chart |
| GET | `/activity` | Activity log (paginated) |

### Pattern used by A, C, E (appointments, visit-summaries, service-requests)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/{resource}/generate` | Create record + run AI → `awaiting_review` |
| GET | `/{resource}` | List (filter by status) |
| GET | `/{resource}/{id}` | Get one |
| PATCH | `/{resource}/{id}` | Edit draft (only `awaiting_review`) |
| POST | `/{resource}/{id}/approve` | Approve |
| POST | `/{resource}/{id}/reject` | Reject |
| POST | `/{resource}/{id}/cancel` | Cancel |
| POST | `/{resource}/{id}/retry` | Re-run AI (from `failed` or `awaiting_review`) |

### B. Documents
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/documents` | Upload PDF (multipart) → extract → AI |
| GET | `/documents` | List jobs |
| GET | `/documents/{id}` | Job + extracted items |
| PATCH | `/documents/items/{item_id}` | Edit an item |
| POST | `/documents/items/{item_id}/approve` | Approve item |
| POST | `/documents/items/{item_id}/reject` | Reject item |

### D. Care Plans
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/care-plans/generate` | Create plan + AI tasks |
| GET | `/care-plans` | List |
| GET | `/care-plans/{id}` | Plan + tasks |
| POST | `/care-plans/{id}/tasks` | Add manual task |
| PATCH | `/care-plans/tasks/{task_id}` | Edit / complete / reopen |
| DELETE | `/care-plans/tasks/{task_id}` | Remove (draft tasks only) |
| POST | `/care-plans/tasks/{task_id}/approve` | Approve task |
| POST | `/care-plans/tasks/{task_id}/reject` | Reject task |
| POST | `/care-plans/{id}/approve` | Approve plan (all tasks reviewed) |

### Error format (all endpoints)
```json
{ "error": { "code": "INVALID_TRANSITION", "message": "Cannot approve a rejected record." } }
```

| Situation | Status |
|-----------|--------|
| Invalid input | 422 |
| Not found | 404 |
| Invalid status transition | 409 |
| File too large | 413 |
| Unsupported file type | 415 |
| Rate limited | 429 |
| AI provider failure | 502 |
| AI timeout | 504 |

---

## 7. Limits

| Limit | Value |
|-------|-------|
| Text input | 5,000 characters |
| PDF size | `MAX_UPLOAD_SIZE_MB` (default 5 MB) |
| PDF pages | 20 |
| Extracted text sent to AI | 30,000 characters (after cleanup) |
| AI timeout | 30 seconds |
| AI retries | Max 2, transient errors only (timeouts, 429, 5xx) |

---

## 8. Project Structure

```
NexusCare/
├── frontend/                 React + Vite + TypeScript
│   └── src/
│       ├── app/              Router, providers
│       ├── components/       layout/, ui/, shared/
│       ├── pages/            One file per sidebar page
│       ├── features/         appointments/, documents/, summaries/,
│       │                     care-plans/, service-requests/
│       ├── lib/              api.ts, validation.ts, demoData.ts
│       ├── hooks/
│       └── types/
├── backend/                  FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py
│   │   ├── core/             config.py, security.py, errors.py
│   │   ├── db/               session.py, models.py
│   │   ├── schemas/          Request/response + AI output schemas
│   │   ├── api/              One router per module
│   │   ├── services/         ai_service.py + one service per module
│   │   └── prompts/          One prompt template per module
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   └── PLAN.md
└── README.md
```

---

## 9. Security Checklist
- Gemini key lives only in `backend/.env`, never in frontend code.
- CORS allows only `FRONTEND_ORIGIN`.
- PDF validation: extension + MIME type + magic bytes (`%PDF`) + size + page count.
- Uploads saved with random names in a temp folder and deleted after extraction.
- Logs contain IDs and actions only, never notes, document text, or keys.
- Generic error messages for users; details only in server logs (without sensitive data).
- UI banner: **"Local demo — fictional data only. Not for clinical use."**

---

## 10. Phase Roadmap

| Phase | Deliverable |
|-------|-------------|
| 0 | Tools installed, repo initialised ✅ |
| 1 | This plan |
| 2 | Frontend shell: sidebar, header, routing, responsive |
| 3 | All pages + forms with labelled demo data |
| 4 | FastAPI, models, migrations, health check |
| 5 | Frontend ↔ backend CRUD, status transitions, activity log |
| 6 | Gemini service, prompts, schemas, PDF pipeline |
| 7 | Review & approval UI for all 5 modules |
| 8 | Rate limiting, log audit, upload cleanup |
| 9 | Backend, frontend, and integration tests |
| 10 | README, deployment, demo video |