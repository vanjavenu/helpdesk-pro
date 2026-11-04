# HelpDesk Pro — IT Help Desk & Issue Tracking System

A starter full-stack issue-tracking application built with:
- **Frontend:** React + Vite
- **Backend:** Python + Django REST Framework
- **Database:** MySQL

## Features
- Dashboard counts for all, open, in-progress, and resolved tickets
- Create, view, update, and delete support tickets (CRUD)
- Search by ticket title, requester, or description
- Filter by status and priority
- Update ticket status and priority
- REST API with Django REST Framework
- MySQL configuration through environment variables

> This is a learning/resume project starter, not a production-ready help-desk platform. Before production use, add authentication/authorization, audit logs, rate limiting, stronger validation, tests, backups, and deployment security.

## 1. Requirements
- Python 3.11+
- Node.js 20+
- MySQL 8+
- Git (optional)

## 2. Create the MySQL database
Open MySQL Workbench or the MySQL command line and run:

```sql
CREATE DATABASE helpdesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Create a MySQL user if needed:

```sql
CREATE USER 'helpdesk_user'@'localhost' IDENTIFIED BY 'ChangeThisPassword!';
GRANT ALL PRIVILEGES ON helpdesk_db.* TO 'helpdesk_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Start the backend (Windows PowerShell)

```powershell
cd backend
py -m venv venv
.env\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with your MySQL username/password. Then:

```powershell
python manage.py makemigrations tickets
python manage.py migrate
python manage.py runserver
```

Backend API: http://127.0.0.1:8000/api/tickets/

## 4. Start the frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually http://localhost:5173.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tickets/` | List tickets |
| POST | `/api/tickets/` | Create ticket |
| GET | `/api/tickets/<id>/` | Ticket detail |
| PUT/PATCH | `/api/tickets/<id>/` | Update ticket |
| DELETE | `/api/tickets/<id>/` | Delete ticket |
| GET | `/api/dashboard/` | Dashboard counts |

Optional query parameters for ticket list:
- `?status=OPEN`
- `?priority=HIGH`
- `?search=printer`

## Project structure

```text
helpdesk-pro/
├── backend/
│   ├── config/
│   ├── tickets/
│   ├── .env.example
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── src/
    ├── index.html
    ├── package.json
    └── vite.config.js
```
