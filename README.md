# PAYAT

A full-stack Payat management application built with **Django REST Framework**, **Next.js**, **TypeScript**, and **PostgreSQL**.

PAYAT helps users manage people, Payats, and related financial records through a structured dashboard with authenticated API access.

## 🌐 Production Links

- **Live Application:** https://payat-app-2.vercel.app/
- **Backend API:** https://payat-backend.onrender.com
- **Repository:** https://github.com/ranafathimapunnol-cyber/payat-app-2

> The production application and API are deployed separately. Some features may require further configuration or testing.

## ✨ Features

- User registration and email OTP verification
- JWT authentication using secure cookies
- Access-token refresh and refresh-token rotation
- User profile management
- People management
- Payat management
- Payat-related records and transactions
- PostgreSQL database integration
- Protected frontend routes and authenticated API requests

## 🛠️ Tech Stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS

### Backend
- Python
- Django
- Django REST Framework
- Simple JWT
- PostgreSQL

### Deployment
- **Vercel** — Frontend hosting
- **Render** — Django backend hosting
- **Supabase** — PostgreSQL database

## 📁 Project Structure

```text
payat-app-2/
├── backend/
│   ├── accounts/
│   ├── config/
│   ├── core/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── lib/
│   └── package.json
├── .gitignore
└── README.md
```

## 🚀 Local Development Setup

### Prerequisites

- Python compatible with the backend dependencies
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ranafathimapunnol-cyber/payat-app-2.git
cd payat-app-2
```

### 2. Configure the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `backend/.env` file with your local database, Django, CORS, CSRF, and email settings. Use the variable names supported by your current Django configuration.

Run migrations and start Django:

```bash
python3 manage.py migrate
python3 manage.py runserver
```

The local backend will be available at `http://localhost:8000`.

### 3. Configure the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Start Next.js:

```bash
npm run dev
```

The local frontend will be available at `http://localhost:3000`.

## 🔐 Security

- Keep Django secret keys, database credentials, and email API keys private.
- Never commit `.env` or `.env.local` files.
- Keep `DEBUG=False` in production.
- Configure HTTPS, secure cookies, CORS, and CSRF trusted origins correctly.
- Validate uploaded files and enforce upload-size limits.
- Apply appropriate authorization checks to people, Payats, and financial records.
- Use persistent object storage for production profile images.

Never expose database credentials or service-role keys through `NEXT_PUBLIC_` environment variables.

## 🚢 Deployment

### Frontend — Vercel

- Root directory: `frontend`
- Environment variable:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://payat-backend.onrender.com
```

### Backend — Render

Configure the backend service with:

- Root directory: `backend`
- Production WSGI start command
- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- Production database credentials
- CORS and CSRF trusted origins
- Email provider credentials

Run database migrations as part of the deployment process.

### Database — Supabase

Use the production PostgreSQL connection details supplied by Supabase. Keep database credentials in the backend environment, never in frontend variables.

## 🧪 Development Checks

Backend:

```bash
python3 manage.py check
python3 manage.py check --deploy
```

Frontend:

```bash
npm run build
```

Before release, test registration, email OTP verification, login, logout, token refresh, profile updates, image uploads, and access permissions against the deployed application.


