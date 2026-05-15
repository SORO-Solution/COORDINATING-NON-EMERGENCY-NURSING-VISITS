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

#### `requirements.txt`
```text
asgiref==3.11.1
Django==6.0.5
django-cors-headers==4.9.0
djangorestframework==3.17.1
djangorestframework_simplejwt==5.5.1
PyJWT==2.12.1
sqlparse==0.5.5
tzdata==2026.2
```

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

### Initial Setup (Running from Scratch on a New PC)
If you are cloning or copying this project to a new machine, you must install the dependencies and set up the database before running the app.

1. **Backend Setup (Terminal 1)**
   Navigate to the `backend` directory, create a virtual environment, and install the Python dependencies:
   ```cmd
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python create_samples.py
   ```
   *(Note: `create_samples.py` automatically populates the database with demo accounts and sample data).*

2. **Frontend Setup (Terminal 2)**
   Navigate to the `frontend` directory and install the Node modules:
   ```cmd
   cd frontend
   npm install
   ```

### Launching the Application
Once the initial setup is complete (or if you already have the environment set up), you can use the automated startup script:
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

---

## 📝 Database Seeding Script (`create_samples.py`)

For reference, here is the Python script used to wipe and re-seed the demo database with the initial sample data, including all default user roles, nurses, and mock appointments.

```python
import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import CustomUser, NurseProfile, NurseAvailability, Appointment
from datetime import date, time, timedelta

def create_samples():
    print("Clearing existing data...")
    Appointment.objects.all().delete()
    NurseAvailability.objects.all().delete()
    NurseProfile.objects.all().delete()
    CustomUser.objects.all().delete()

    print("Creating Admin...")
    admin = CustomUser.objects.create_superuser(
        username='admin',
        email='admin@nurseconnect.com',
        password='password123',
        role='ADMIN',
        first_name='System',
        last_name='Admin'
    )

    print("Creating Nurses...")
    nurse1_user = CustomUser.objects.create_user(
        username='nurse1', email='nurse1@nurseconnect.com', password='password123',
        role='NURSE', first_name='Sarah', last_name='Jenkins'
    )
    nurse1_profile = NurseProfile.objects.create(user=nurse1_user, specialisation='Wound Care & IV Therapy')

    nurse2_user = CustomUser.objects.create_user(
        username='nurse2', email='nurse2@nurseconnect.com', password='password123',
        role='NURSE', first_name='David', last_name='Chen'
    )
    nurse2_profile = NurseProfile.objects.create(user=nurse2_user, specialisation='Pediatrics & General Care')

    nurses = [nurse1_profile, nurse2_profile]

    print("Creating 6 Patients...")
    patients_data = [
        ('patient1', 'Alex', 'Johnson'),
        ('patient2', 'Maria', 'Garcia'),
        ('patient3', 'James', 'Smith'),
        ('patient4', 'Linda', 'Williams'),
        ('patient5', 'Robert', 'Brown'),
        ('patient6', 'Patricia', 'Jones'),
    ]

    patients = []
    for username, fname, lname in patients_data:
        p = CustomUser.objects.create_user(
            username=username, email=f'{username}@nurseconnect.com', password='password123',
            role='PATIENT', first_name=fname, last_name=lname
        )
        patients.append(p)

    print("Creating Mock Appointments...")
    today = date.today()
    care_types = ['Wound Care', 'IV Therapy', 'General Checkup', 'Pediatrics']
    statuses = ['PENDING', 'CONFIRMED', 'COMPLETED']
    
    for i, p in enumerate(patients):
        Appointment.objects.create(
            patient=p,
            nurse=random.choice(nurses),
            date=today + timedelta(days=random.randint(1, 5)),
            start_time=time(random.randint(9, 16), 0),
            care_type=random.choice(care_types),
            status=random.choice(statuses),
            notes='Patient needs routine care.'
        )

    print("Sample accounts created successfully!")
    print("Admin: admin / password123")
    print("Nurses: nurse1, nurse2 / password123")
    print("Patients: patient1 to patient6 / password123")

if __name__ == '__main__':
    create_samples()
```
