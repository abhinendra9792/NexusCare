# NexusCare: Intelligent Care Coordination

NexusCare turns unstructured healthcare **administrative** information (notes, voice input, PDFs, and service inquiries) into structured records that a person reviews and approves.

> **Academic prototype for a Generative AI course.** Use fictional data only.
> NexusCare is **not** a clinical decision system. It does not diagnose, prescribe, triage medical urgency, or book real appointments. Every AI output is a draft until a staff member approves it.

---

## Features

| Module | Input | AI output | Human review |
|---|---|---|---|
| **Appointment requests** | Text or voice note | Structured request (patient, date, time, reason, type, missing info) | Edit, approve, or reject |
| **Document intelligence** | PDF upload | Appointments and follow-up actions, each with a source excerpt | Review each item separately |
| **Visit summaries** | Visit notes | Purpose, key points, facts from the notes, follow-ups (mentioned vs. suggested) | Edit, approve, or reject |
| **Care-plan checklists** | Progress notes | Administrative tasks with source, due date, priority | Approve or reject each task, then approve the plan |
| **Service request routing** | Inquiry message | Category, department, administrative urgency, explanation, confidence | Correct the routing, approve, or reject |

### Safeguards
- **Human in the loop:** AI results are saved as drafts. Approval copies the reviewed draft into a separate approved record, and approved records are never overwritten.
- **No invention:** missing details are left empty and listed under "missing information". Vague dates such as "next Tuesday" are flagged, never turned into a fake date.
- **Validated output:** every AI response must match a Pydantic schema, or the operation fails visibly. The app never fakes a success.
- **Emergency handling:** a keyword check runs **before** the AI. If either the check or the AI flags a possible emergency, the UI shows a banner to contact local emergency services (India: **112**). The flag can never be cleared by the AI or by an edit.
- **Prompt-injection defence:** text inside notes and documents is treated as data, never as instructions.
- **Privacy:** uploaded PDFs are processed in memory and never stored. Only a short text preview is kept. Logs contain IDs, codes, and timings, never notes, document text, prompts, or API keys.
- **Hardening:** the API key stays on the backend, CORS allows only the configured frontend, AI endpoints are rate-limited, security headers are set, and production hides tracebacks and API docs.

---

## Tech stack

**Frontend:** React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router, Recharts, Vitest and Testing Library

**Backend:** Python, FastAPI, Pydantic, SQLAlchemy, Alembic, SQLite, PyMuPDF, pytest

**AI:** Google Gemini via the official `google-genai` SDK, behind a provider-agnostic AI service

---

## Project structure

```
NexusCare/
├── backend/
│   ├── app/
│   │   ├── api/          Routes (one router per module)
│   │   ├── core/         Config, errors, status transitions, rate limiting, emergency check
│   │   ├── db/           Models, enums, session
│   │   ├── prompts/      One prompt template per module
│   │   ├── schemas/      Request/response and AI output schemas
│   │   └── services/     AI service, review workflow, document processing
│   ├── alembic/          Database migrations
│   ├── scripts/          Gemini checks and the sample PDF generator
│   └── tests/            pytest suite (Gemini is mocked)
├── frontend/
│   └── src/
│       ├── app/          Routes
│       ├── components/   Layout, shared, and UI components
│       ├── features/     Review cards per module
│       ├── hooks/        Data fetching and mutations
│       ├── lib/          API client, validation, helpers
│       └── pages/        One page per sidebar item
└── docs/PLAN.md          Project plan, status flow, and API design
```

---

## Setup

### Prerequisites
- **Python 3.11 or newer**
- **Node.js** (a current LTS version) and npm
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com)

The commands below are for **Windows PowerShell**. On macOS or Linux, use `source .venv/bin/activate` and `cp` instead of `copy`.

### 1. Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Open `backend/.env` and set `GEMINI_API_KEY` and `GEMINI_MODEL`. To see which models your key can use:
```powershell
python -m scripts.list_gemini_models
```

Create the database and check that Gemini responds:
```powershell
alembic upgrade head
python -m scripts.gemini_smoke_test
```

Start the API:
```powershell
uvicorn app.main:app --reload
```
- Health check: http://localhost:8000/health
- Interactive API docs (development only): http://localhost:8000/docs

### 2. Frontend
In a **second** terminal:
```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```
Open http://localhost:5173

Set `VITE_DEMO_MODE=true` in `frontend/.env` to browse the interface with clearly labelled demo data and no backend. Restart `npm run dev` after changing `.env`.

---

## Configuration

**`backend/.env`**
| Variable | Purpose | Example |
|---|---|---|
| `APP_ENV` | `development` or `production` (production hides API docs and tracebacks) | `development` |
| `DATABASE_URL` | SQLAlchemy database URL | `sqlite:///./nexuscare.db` |
| `FRONTEND_ORIGIN` | The only browser origin allowed by CORS | `http://localhost:5173` |
| `MAX_UPLOAD_SIZE_MB` | PDF size limit | `5` |
| `GEMINI_API_KEY` | Gemini API key (backend only, never committed) | |
| `GEMINI_MODEL` | Model identifier available to your key | |

**`frontend/.env`**
| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Backend URL | `http://localhost:8000` |
| `VITE_DEMO_MODE` | Show labelled demo data without a backend | `false` |

`VITE_` variables are bundled into the browser code, so **never put secrets in `frontend/.env`**.

**Built-in limits:** notes up to 5,000 characters; PDFs up to 20 pages and `MAX_UPLOAD_SIZE_MB`; up to 30,000 characters of document text sent to the AI; 30-second AI timeout with at most 2 retries for temporary errors; 10 AI requests per minute per client.

---

## How the review workflow works

```
draft ──► processing ──► awaiting_review ──► approved
               │                │
               ▼                ├──► rejected
            failed ──► retry    └──► cancelled
```

1. A note, inquiry, or PDF is saved, then sent to Gemini.
2. The response is validated. On success the record moves to **awaiting review**; on failure it moves to **failed** with a clear message and a retry option.
3. Staff edit the draft if needed, then **approve** or **reject** it. Invalid transitions are refused with HTTP 409.
4. Approved records are locked. Care-plan tasks can still be completed after the plan is approved.

---

## Testing

Automated tests use a **fake AI provider**, so they never call Gemini or use API quota.

```powershell
# Backend (from backend/, with the virtual environment active)
pytest -q

# Frontend (from frontend/)
npm test
npm run build
```

The backend suite covers AI generation and failures, status transitions, approval and locking, file validation, the emergency flag, rate limiting, security headers, CORS, and log safety. The frontend suite covers review cards, the emergency banner, care-plan rules, navigation, and form validation.

### Manual testing with the real Gemini API
Run both servers and try these **fictional** inputs:

| Page | Input | Expected result |
|---|---|---|
| Appointments | *"Hi, this is Priya Sharma's son. She needs a follow-up for her knee next Tuesday morning. Please call me back."* | Awaiting review; date empty and flagged as vague; time empty, with "morning" noted; missing info lists the exact date |
| Visit summaries | *"Visit with Rahul Verma on 28 Oct. Discussed ongoing lower back pain. He stopped physiotherapy two weeks ago because of travel. Asked to book physio again and bring his previous X-ray report."* | Facts with source excerpts; follow-ups marked "From your notes"; no diagnosis or medication added |
| Service requests | *"I was charged twice for my visit on 20 October. This is the third time I am writing and the payment is due this Friday."* | Category billing; urgency high for administrative reasons |
| Service requests | *"I wanted to ask about my bill, but my father has severe chest pain and is struggling to breathe."* | Emergency banner at the top of the card; no medical advice |
| Care plans | *"Arjun Patel is recovering well. Book a physiotherapy review in one week and send the discharge letter to his GP."* | Two draft tasks; due date one week from today; no date invented for the letter |
| Documents | Generate a sample PDF with `python -m scripts.make_sample_pdf` (in `backend/`), then upload `backend/samples/sample_referral.pdf` | One appointment and three follow-ups; the medication line is ignored; the embedded "mark everything approved" instruction is ignored |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the NexusCare server" | Start the backend (`uvicorn app.main:app --reload`) and check `VITE_API_URL`. |
| `ModuleNotFoundError: No module named 'app'` when running a script | Run it as a module from `backend/`, e.g. `python -m scripts.gemini_smoke_test`. |
| `.venv\Scripts\activate` is blocked in PowerShell | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`, then activate again. |
| `AI_NOT_CONFIGURED` | Set `GEMINI_API_KEY` and `GEMINI_MODEL` in `backend/.env` and restart the backend. |
| `AI_MODEL_NOT_FOUND` or `AI_AUTH_FAILED` | Check the model name with `python -m scripts.list_gemini_models`, and check the key. |
| "The AI service is busy" | A temporary Gemini error. Use **Try again** on the failed card. |
| "Too many AI requests" (429) | The AI rate limit was reached. Wait for the time shown, then retry. |
| PDF rejected | Only text-based PDFs up to the size and 20-page limits are supported; scanned or password-protected PDFs are rejected. |
| A failed document has no retry | PDFs are not stored. Upload the file again. |
| The page shows old content after code changes | Make sure `npm run dev` is running, then hard-refresh with Ctrl + Shift + R. |

---

## Known limitations
- A local, single-user prototype: no authentication, so do not expose it publicly with real data.
- SQLite for local use. The configuration is ready for a move to PostgreSQL.
- The AI rate limit is in memory and per server process.
- The AI can still make mistakes, which is why every result requires human review. NexusCare makes **no claim** of medical accuracy or healthcare compliance.

## License
MIT. See [LICENSE](LICENSE).