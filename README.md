# NurseConnect

**NurseConnect** is a secure, full-stack platform for coordinating non-emergency nursing visits. It connects patients with specialised nurses, gives nurses tools to manage their schedule and availability, and gives administrators complete oversight — all backed by role-based access control, AES-256-GCM encrypted messaging, and real-time WebSocket chat.

---

## Technology Stack

### Backend
| Package | Purpose |
|---|---|
| Django 6.0.5 | Core web framework |
| Django REST Framework 3.17.1 | JSON API layer |
| Simple JWT 5.5.1 | Stateless JWT authentication (access 15 min / refresh 7 days) |
| Django Channels 4.2.0 | WebSocket support (real-time messaging) |
| Daphne 4.2.1 | ASGI server (handles both HTTP and WebSocket) |
| cryptography 43.0.3 | AES-256-GCM message encryption at rest |
| ReportLab 4.2.5 | PDF report generation |
| Pillow 12.2.0 | Image processing |
| SQLite3 | Development database (drop-in replacement with PostgreSQL for production) |

### Frontend
| Package | Purpose |
|---|---|
| React 19 + Vite | UI framework and build tooling |
| Axios | HTTP client with JWT header injection |
| Lucide React | Icon set |
| Custom CSS | Glassmorphism design system with dark/light mode |

---

## Features

### Authentication & Access Control
- JWT login with role-based routing (`PATIENT`, `NURSE`, `ADMIN`, `SUPERADMIN`)
- Protected API endpoints via DRF permission classes per role
- Patient self-registration

### Patient Dashboard
- **Smart visit booking** — patient selects care type and date; the system auto-matches the best nurse by specialisation → availability → workload (fewest active appointments wins)
- Live appointment tracker with status badges (PENDING / CONFIRMED / COMPLETED / CANCELLED)

### Nurse Dashboard
- Full schedule view with confirm/complete actions per visit
- **Availability Manager** — set availability slots over a date range, pick days of the week, add multiple time slots per day
- Specialisation change request workflow (nurse submits → admin reviews)
- Downloadable schedule reports (CSV and PDF)
- Downloadable availability report (CSV)

### Admin Dashboard
- Platform-wide appointment table with inline status editor and date/time editing
- User management: create patients, nurses, and admins; search and filter
- **Bulk availability assignment** — set availability for multiple nurses at once across a date range
- Nurse workload bar chart (sorted by active appointment count)
- Direct specialisation assignment to nurses (bypasses request workflow)
- Specialisation change request review (approve / reject with notes)
- Five downloadable reports: appointments CSV, appointments PDF, nurse workload PDF, users CSV, availability CSV

### Secure Messaging
- Per-appointment chat threads (one thread per appointment)
- **Real-time via WebSocket** — messages appear instantly for both participants
- **AES-256-GCM encryption at rest** — all messages stored encrypted; decrypted only on read
- Message history loaded on thread open; WebSocket delivers new messages live
- Accessible to the patient, the assigned nurse, and any admin

### Reports & Exports
| Report | Who | Format |
|---|---|---|
| My Schedule | Nurse | CSV, PDF |
| My Availability | Nurse | CSV |
| All Appointments | Admin | CSV, PDF |
| Nurse Workload | Admin | PDF |
| All Users | Admin | CSV |
| All Availability | Admin | CSV |
| User Directory (credentials) | CLI | PDF |

---

## Demo Accounts

All accounts use password: `password123`

The database is seeded by running `python manage.py populate_data`.

| Role | Username | Notes |
|---|---|---|
| Superadmin | `superadmin` | Full platform access |
| Admin | `test_admin1` | Alexandra Turner, Chicago |
| Admin | `test_admin2` | Marcus Reynolds, Houston |
| Admin | `test_admin3` | Priya Sharma, Los Angeles |
| Nurse | `test_nurse1` – `test_nurse25` | 15 different specialisations |
| Patient | `test_patient1` – `test_patient100` | 100 patients across 15 cities |

Seeded mock data includes **200+ appointments** and **270+ encrypted messages**.

To export all credentials to a formatted PDF:
```
python manage.py export_users_pdf
```
Output: `NurseConnect_User_Directory.pdf` in the project root.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js LTS

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py populate_data
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Run the Application

You need **two terminals**.

**Terminal 1 — ASGI/WebSocket server (Daphne):**
```bash
cd backend
venv\Scripts\python.exe -m daphne -p 8000 config.asgi:application
```

> Daphne is required. Do **not** use `python manage.py runserver` — that starts a WSGI server which has no WebSocket support and will cause messaging to fail with 404 errors on `/ws/chat/`.

**Terminal 2 — React dev server:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React Frontend  (Vite, port 5173)                      │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ PatientDash  │  │ NurseDash │  │   AdminDashboard │  │
│  └──────────────┘  └───────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Messaging.jsx  (WebSocket client)               │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  AvailabilityManager.jsx  (standalone view)      │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (Axios)  +  WebSocket
┌─────────────────────▼───────────────────────────────────┐
│  Daphne ASGI Server  (port 8000)                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │  ProtocolTypeRouter                              │    │
│  │  ├─ http  → Django REST Framework               │    │
│  │  └─ websocket → URLRouter → ChatConsumer        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌───────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  api/     │  │  api/       │  │  api/            │   │
│  │  views.py │  │  consumers  │  │  reports.py      │   │
│  │  (REST)   │  │  (WS chat)  │  │  (CSV/PDF)       │   │
│  └───────────┘  └─────────────┘  └──────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  SQLite DB  (AES-256-GCM encrypted messages)    │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Nurse Matching Algorithm

When a patient requests a visit:
1. Filter nurses whose specialisation contains the requested care type
2. From those, keep only nurses with an unbooked availability slot on the requested date
3. Sort by active appointment count (fewest wins — load balancing)
4. Create the appointment and mark the slot as booked (atomic)

### Message Encryption

Each message is encrypted before being written to the database:
- Generate a random 12-byte nonce
- Encrypt with AES-256-GCM using the app's 32-byte base64 key
- Store `base64(nonce + ciphertext)` in the `encrypted_content` field
- Decrypt on every read; WebSocket broadcasts the plaintext only in memory

---

## API Reference

### Auth
| Method | URL | Description |
|---|---|---|
| POST | `/api/token/` | Login — returns access + refresh tokens |
| POST | `/api/token/refresh/` | Refresh access token |
| POST | `/api/register/` | Patient self-registration |
| GET | `/api/me/` | Current user info |

### Appointments
| Method | URL | Description |
|---|---|---|
| GET | `/api/appointments/` | List appointments (filtered by role) |
| POST | `/api/appointments/request/` | Smart nurse-matched visit request |
| PATCH | `/api/appointments/{id}/` | Update status / date / time |
| DELETE | `/api/appointments/{id}/` | Admin only |

### Nurses & Profiles
| Method | URL | Description |
|---|---|---|
| GET | `/api/nurses/` | List all nurse profiles |
| GET | `/api/nurses/me/` | Logged-in nurse's own profile |
| PATCH | `/api/nurses/{id}/set-specialisation/` | Admin: direct spec assignment |

### Availability
| Method | URL | Description |
|---|---|---|
| GET | `/api/availabilities/` | List slots (nurse sees own; admin sees all) |
| POST | `/api/availabilities/` | Create single slot |
| POST | `/api/availabilities/bulk-create/` | Create slots across a date range |
| DELETE | `/api/availabilities/{id}/` | Delete a slot |

Query params on GET: `nurse_id`, `date_from`, `date_to`, `status` (open/booked)

### Messages
| Method | URL | Description |
|---|---|---|
| GET | `/api/messages/?appointment={id}` | Decrypted message history |
| POST | `/api/messages/send/` | Send encrypted message (REST fallback) |

### Specialisation Requests
| Method | URL | Description |
|---|---|---|
| GET | `/api/spec-requests/` | List requests (nurse sees own; admin sees all) |
| POST | `/api/spec-requests/` | Nurse submits change request |
| POST | `/api/spec-requests/{id}/approve/` | Admin approves |
| POST | `/api/spec-requests/{id}/reject/` | Admin rejects |

### Reports (authenticated)
```
GET /api/reports/nurse/schedule/csv/
GET /api/reports/nurse/schedule/pdf/
GET /api/reports/nurse/availability/csv/
GET /api/reports/admin/appointments/csv/
GET /api/reports/admin/appointments/pdf/
GET /api/reports/admin/workload/pdf/
GET /api/reports/admin/users/csv/
GET /api/reports/admin/availability/csv/
```

### WebSocket
```
ws://localhost:8000/ws/chat/{appointment_id}/?token={jwt_access_token}
```
- Authenticate by passing the JWT as a query parameter
- Send: `{ "content": "message text" }`
- Receive: `{ "type": "message", "id": ..., "content": ..., "sender_name": ..., "timestamp": ... }`

---

## Directory Structure

```
COORDINATING NON-EMERGENCY NURSING VISITS/
│
├── backend/
│   ├── api/
│   │   ├── management/commands/
│   │   │   ├── populate_data.py       # Seeds 1 superadmin, 3 admins, 25 nurses, 100 patients
│   │   │   └── export_users_pdf.py    # Exports all credentials to PDF
│   │   ├── consumers.py               # WebSocket chat consumer (AES-256-GCM)
│   │   ├── encryption.py              # AES-256-GCM encrypt/decrypt helpers
│   │   ├── models.py                  # CustomUser, NurseProfile, Appointment, Message, ...
│   │   ├── permissions.py             # IsAdminRole, IsNurseRole, IsNurseOrAdmin
│   │   ├── reports.py                 # CSV and PDF report views
│   │   ├── routing.py                 # WebSocket URL patterns
│   │   ├── serializers.py             # DRF serializers
│   │   ├── urls.py                    # REST URL patterns
│   │   └── views.py                   # ViewSets + smart nurse matching
│   ├── config/
│   │   ├── asgi.py                    # ASGI app (ProtocolTypeRouter for HTTP + WS)
│   │   ├── settings.py
│   │   └── urls.py
│   ├── venv/
│   ├── db.sqlite3
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AdminDashboard.jsx      # Appointments, users, workload, availability, reports
│       │   ├── AvailabilityManager.jsx # Standalone availability manager (create + view + delete)
│       │   ├── Login.jsx
│       │   ├── Messaging.jsx           # Real-time WebSocket chat
│       │   ├── NurseDashboard.jsx      # Schedule, availability summary, spec requests
│       │   ├── PatientDashboard.jsx    # Smart visit booking
│       │   ├── ProfileView.jsx
│       │   └── SettingsView.jsx
│       ├── App.jsx                     # Layout, sidebar nav, role-based routing
│       └── index.css                   # Glassmorphism design system
│
└── README.md
```

---

## Security Notes (MVP)

- `SECRET_KEY` and `MESSAGE_ENCRYPTION_KEY` in `settings.py` are development values — rotate before any deployment
- `CORS_ALLOW_ALL_ORIGINS = True` is set for the MVP — restrict to your domain in production
- `AllowedHostsOriginValidator` is disabled for WebSocket in dev — re-enable for production
- SQLite is not suitable for production under concurrent load — migrate to PostgreSQL
- Access tokens expire in 15 minutes; refresh tokens in 7 days
