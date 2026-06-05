<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/bell-ring.svg" alt="Price Alert Logo" width="100" height="100">
  
  # Price Alert
  
  **Never miss a price drop again.**  
  A modern, full-stack web application that tracks e-commerce product prices and sends instant Telegram alerts when your target price is hit.
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-pricealertapp.netlify.app-00C7B7?style=for-the-badge&logo=netlify)](https://pricealertapp.netlify.app/)
</div>

<br />

## 🌟 Features

- 🔐 **Secure User Accounts:** JWT-based registration and login system.
- 📱 **Telegram Integration:** Connect your personal Telegram account via deep-linking to receive private bot alerts.
- ⚡ **Automated Scraping:** Periodically checks prices in the background using Apify's robust scraping infrastructure.
- 🎛️ **Alert Management:** An intuitive dashboard to pause, resume, edit, or delete your price alerts.
- 🕒 **Custom Scheduling:** Set specific tracking intervals for each product.
- 🔑 **Bring Your Own API Key:** Users can optionally add their own Apify token to manage their scraping limits.

---

## 🛠️ Tech Stack

### Frontend
<p align="left">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

### Backend & Infrastructure
<p align="left">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" />
</p>

---

## 🚀 Local Setup

### 1. Backend

```powershell
# Navigate to the project root
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Configure environment variables
Copy-Item .env.example .env
# Edit .env and add your JWT_SECRET_KEY, TELEGRAM_BOT_TOKEN, and TELEGRAM_BOT_USERNAME

# Start the FastAPI server
uvicorn app.main:app --reload
```

### 2. Frontend

```powershell
cd frontend
npm install

# Configure environment variables
Copy-Item .env.example .env
# Set VITE_API_URL if your backend is not on http://localhost:8000

# Start the dev server
npm run dev
```

---

## ☁️ Deployment Architecture

- **Frontend:** Deployed globally via Netlify.
- **Backend:** Hosted on an Oracle Cloud VM running `uvicorn` and APScheduler.
- **Database:** Persistent SQLite database stored securely on the VM.
