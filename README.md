# NurseConnect MVP

**NurseConnect** is a secure, role-based web platform designed to streamline and coordinate non-emergency nursing visits. It seamlessly connects patients with specialized nurses while providing administrative oversight for healthcare organizations.

This repository contains the Minimum Viable Product (MVP), fully functional end-to-end with live database interaction, JSON Web Token (JWT) authentication, and a stunning "glassmorphism" React interface.

---

## 🚀 Technology Stack

### Backend
*   **Python 3.11 & Django 6.0**: High-level, robust backend framework.
*   **Django REST Framework (DRF)**: Powers the JSON API endpoints.
*   **Simple JWT**: Stateless, secure token-based authentication.
*   **SQLite3**: Default database for the MVP (easily scalable to PostgreSQL).

### Frontend
*   **React.js 18 & Vite**: Blazing fast modern frontend tooling.
*   **Vanilla CSS**: Custom-built, premium glassmorphism styling with dark/light mode support.
*   **Axios**: For secure HTTP request handling.
*   **Lucide React**: Beautiful, consistent iconography.

---

## ✨ MVP Features

### 1. Robust Authentication Flow
*   Secure Login and Sign Up portals.
*   JWT handling (Access & Refresh tokens).
*   Dynamic role-based routing (`PATIENT`, `NURSE`, `ADMIN`).

### 2. Patient Capabilities
*   **Request Visits**: Patients can select available nurses based on specialty, view their available time slots, and submit booking requests directly to the database.
*   **Dashboard Tracker**: Live tracking of upcoming, pending, and completed visits.

### 3. Nurse Capabilities
*   **Schedule Management**: Nurses can view all dynamically assigned visits and patient locations.
*   **Availability**: Manage and declare available working hours.
*   **Visit Execution**: One-click functionality to mark visits as `COMPLETED`.

### 4. Administrator Capabilities
*   **Global Oversight**: Live metrics tracking total appointments and pending requests.
*   **Schedule Control**: Full read/write access to modify any patient appointment (date/time) and approve/deny statuses (`PENDING`, `CONFIRMED`, `CANCELLED`).
*   **Fleet Tracking**: Complete table view of all nurse availabilities.

---

## 🛠 Quick Start Guide

We have fully automated the startup process for the MVP. You do not need to start the servers manually.

### Prerequisites
Make sure you have the following installed on your Windows machine:
*   [Python 3.11+](https://www.python.org/downloads/)
*   [Node.js (LTS)](https://nodejs.org/)

### Launching the Application
1. Navigate to the project root directory.
2. Double-click the **`run_mvp.bat`** file, or run it via PowerShell/CMD:
   ```cmd
   .\run_mvp.bat
   ```
3. The script will automatically activate the Python virtual environment, start the Django API, and spin up the Vite React server.
4. Your browser will open automatically to `http://localhost:5173`.

---

## 🔑 Demo Accounts

The database is pre-seeded with the following accounts for immediate testing. 

*All accounts use the password:* `password123`

| Role | Username | Description |
| :--- | :--- | :--- |
| **Admin** | `admin` | Full system access and appointment overriding. |
| **Nurse** | `nurse1` | Wound Care & IV Therapy Specialist. |
| **Nurse** | `nurse2` | Pediatrics & General Care Specialist. |
| **Patient** | `patient1` | (There are 6 total: `patient1` through `patient6`) |

---

## 📁 Directory Structure

```text
COORDINATING NON-EMERGENCY NURSING VISITS/
│
├── backend/                  # Django REST API
│   ├── api/                  # Core App (Models, Views, Serializers, URLs)
│   ├── config/               # Project Settings & Config
│   ├── venv/                 # Python Virtual Environment
│   ├── db.sqlite3            # Database (Pre-seeded)
│   └── create_samples.py     # Script to wipe and re-seed demo data
│
├── frontend/                 # Vite + React Application
│   ├── src/
│   │   ├── components/       # Dashboards, Login, Settings, Profile
│   │   ├── App.jsx           # Main Application Router & Layout
│   │   └── index.css         # Global Theme & Glassmorphism Styles
│   ├── package.json          # Node Dependencies
│   └── vite.config.js        # Vite Config
│
└── run_mvp.bat               # Automated dual-server startup script
```
