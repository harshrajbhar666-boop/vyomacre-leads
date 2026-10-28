# VyomAcre — Lead Capture (Standalone)

Ek **alag, self-contained project**: lead form + apna backend + apna database.
Kisi doosre project ki file ko touch nahi karta, isliye main project me kuch bhi
bigadne ka risk nahi.

```
vyomacre-leads/
├── backend/          FastAPI — form API, admin API, notifications
│   ├── app/
│   │   ├── main.py       app + startup (table create)
│   │   ├── config.py     saari settings env se
│   │   ├── database.py   SQLite (default) ya Postgres
│   │   ├── models.py     Lead table
│   │   ├── schemas.py    validation (consent mandatory)
│   │   ├── security.py   admin token (HMAC, koi extra library nahi)
│   │   ├── routes/       auth.py, leads.py
│   │   └── services/     notify.py (Telegram + email)
│   ├── requirements.txt
│   └── .env.example
└── frontend/         React + Vite + Tailwind
    ├── src/components/LeadForm.jsx   public form  →  /
    ├── src/components/AdminApp.jsx   login + inbox →  /admin
    └── src/services/api.js
```

## Local par chalana (5 minute)

**Backend:**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # Windows: copy .env.example .env
# .env me ADMIN_EMAIL / ADMIN_PASSWORD apne hisaab se badal do
uvicorn app.main:app --reload --port 8000
```

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/health
- Database: `backend/leads.db` (SQLite file, khud ban jata hai — kuch install nahi)

**Frontend (dusra terminal):**

```bash
cd frontend
npm install
npm run dev
```

- Form: http://localhost:5173
- Admin: http://localhost:5173/admin

> Backend ka URL badalna ho to `frontend/.env` me:
> `VITE_API_BASE_URL=http://127.0.0.1:8000`

## Free deploy

**Backend → Render (free):**

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance | Free |

Environment variables (Render → Environment):

```
DATABASE_URL     = postgresql://...        (Supabase — neeche dekho)
ADMIN_EMAIL      = tumhara@email.com
ADMIN_PASSWORD   = strong-password
SECRET_KEY       = koi-lamba-random-string
CORS_ORIGINS     = https://<frontend>.vercel.app
NOTIFY_EMAIL_TO  = tumhara@gmail.com,teamleader@gmail.com
SMTP_HOST        = smtp.gmail.com
SMTP_PORT        = 587
SMTP_USER        = tumhara@gmail.com
SMTP_PASSWORD    = Gmail 16-char app password
SMTP_FROM_NAME   = VyomAcre
TELEGRAM_BOT_TOKEN = (optional)
TELEGRAM_CHAT_ID   = (optional, comma se do log)
APP_BASE_URL     = https://<frontend>.vercel.app
```

**Frontend → Vercel (free):**

| Field | Value |
|---|---|
| Root Directory | `frontend` |
| Framework | Vite |
| Env var | `VITE_API_BASE_URL = https://<backend>.onrender.com` |

**Database:** local par SQLite kaafi hai. Production me Postgres use karo — Render ki
disk temporary hoti hai, redeploy par SQLite file chali jati hai. Supabase free
(500 MB) kaafi hai: project banao → Settings → Database → Connection string (URI).

## API

| Method | Path | Auth | Kaam |
|---|---|---|---|
| POST | `/api/leads` | public | form submit |
| POST | `/api/admin/login` | — | email+password → token |
| GET | `/api/leads` | admin | list / `?status=` `?q=` `?wants_to_invest=` |
| GET | `/api/leads/stats` | admin | counters |
| GET | `/api/leads/export.csv` | admin | CSV download |
| PATCH | `/api/leads/{id}` | admin | contacted / qualified / converted / closed |

## Form me kya hai

- Naam, email, phone, city (India ke city suggestions ke saath)
- "I'm here as" — investor / owner / company / student / other
- "Interested in funding VyomAcre?" Yes / Not now + investment range
- Message (2000 char)
- **Consent checkbox (required)** — "apni marzi se details de raha hoon", DB me
  `consent_given` + `consent_at` timestamp save hota hai
- Submit ke baad thank-you screen: submission summary, reference number, next 48 hours
- WhatsApp button (number `LeadForm.jsx` ke top par)

## Spam control

- Honeypot field (bots pakde jate hain)
- Rate limit: 6 submissions / IP / hour
- De-dupe: same email 7 din me dobara → naya row nahi, purana update
- IP ka sirf salted hash save hota hai

## Badalna ho to

| Kya | Kahan |
|---|---|
| WhatsApp number / project link | `frontend/src/components/LeadForm.jsx` (top constants) |
| Investment range options | wahi file → `RANGES` |
| City suggestions | wahi file → `CITIES` |
| Email ka wording | `backend/app/services/notify.py` |
| Rate limit | `backend/app/routes/leads.py` → `_MAX` |
| Admin login | `.env` → `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
