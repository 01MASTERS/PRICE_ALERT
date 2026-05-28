# Price Alert

A small FastAPI and React app for tracking product prices and sending Telegram alerts when a target price is reached.

## Tech Stack

- FastAPI, SQLAlchemy, SQLite
- Playwright for price lookup
- APScheduler for background checks
- React, TypeScript, Vite, Tailwind CSS

## Setup

### Backend

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
playwright install chromium
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Add your Telegram bot token and chat ID to `.env` before expecting notifications to send.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend defaults to `http://localhost:8000` for the API. Set `VITE_API_URL` in `frontend/.env` if the backend runs somewhere else.

## Useful Commands

```powershell
# Backend
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run lint
npm run build
```

## Repository Notes

Local secrets, virtual environments, installed packages, bytecode caches, build output, logs, and the SQLite database are ignored by Git. Keep using `.env.example` for shareable configuration names and `.env` for local values.
