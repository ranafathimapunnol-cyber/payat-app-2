# PAYAT

A full-stack Payat management application built with **Django REST Framework**, **Next.js**, **TypeScript**, and **PostgreSQL**.

PAYAT is designed to help users manage people, Payats, and related financial records through a structured dashboard with authenticated API access.

## Features

- User registration and email OTP verification
- Login and logout using JWT authentication cookies
- Access-token refresh and refresh-token rotation
- User profile management
- People management
- Payat management
- Payat-related records and transactions
- PostgreSQL database integration
- Protected frontend routes and authenticated API requests

> Features listed here describe the project scope. Verify each feature in the current codebase before treating it as complete.

## Tech Stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS, where configured

### Backend
- Python
- Django
- Django REST Framework
- Simple JWT
- PostgreSQL

### Planned / deployment infrastructure
- Vercel for the frontend
- Render for the Django API
- Supabase PostgreSQL for the production database
- Supabase Storage for profile images
- Shared Redis-compatible cache for coordinated rate limiting

Infrastructure marked as planned must be configured and tested before production use.

## Project Structure

```text
payat-app/
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

The exact structure may vary as the project evolves.

## Prerequisites

Install the following before starting development:

- Python compatible with the backend dependencies
- Node.js and npm
- PostgreSQL
- Git

## Local Development Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd payat-app
```

Replace `<YOUR_REPOSITORY_URL>` with your Git repository URL.

### 2. Configure the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `backend/.env` file containing your local configuration.

Example template:

```dotenv
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=replace-with-a-local-development-secret
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=payat_app_db
DB_USER=your_local_postgres_user
DB_PASSWORD=your_local_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=prefer

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=your_email_address
EMAIL_HOST_PASSWORD=your_email_app_password
DEFAULT_FROM_EMAIL=your_email_address
```

Use the variable names supported by your current Django settings. Never commit real secrets.

Run database migrations:

```bash
python3 manage.py migrate
```

Create an administrator account if required:

```bash
python3 manage.py createsuperuser
```

Start the backend development server:

```bash
python3 manage.py runserver
```

The API will normally be available at `http://localhost:8000`.

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

The frontend will normally be available at `http://localhost:3000`.

Keep the frontend API URL consistent with the backend CORS and CSRF configuration.

## Authentication and Security

The backend is configured to use JWT authentication cookies and a custom user model.

Production security requirements include:

- A strong, private Django secret key
- `DEBUG=False`
- Explicit allowed hosts
- HTTPS and secure cookies
- Correct CORS and CSRF trusted origins
- Email credentials stored as environment variables
- Object-level authorization for people, Payats, and transactions
- Rate limiting for authentication and OTP endpoints
- Validation and size limits for uploaded files

Do not store production credentials in source code, frontend variables, or public repositories.

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put database passwords, Django secrets, email passwords, or service-role keys in them.

## Deployment

### Frontend — Vercel

Configure the frontend project with:

- Root directory: `frontend`
- Build command: the configured Next.js build command
- `NEXT_PUBLIC_API_BASE_URL`: the deployed backend API URL

### Backend — Render

Configure the Django service with:

- Root directory: `backend`
- A production WSGI start command appropriate for the installed dependencies
- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- Production database credentials
- CORS and CSRF trusted origins
- Email environment variables

Run database migrations as part of the deployment process using a controlled release step or deployment command.

### Database and storage

Use a production PostgreSQL connection with SSL when supported by the provider's connection configuration.

Use persistent object storage for profile images instead of relying on an ephemeral application filesystem.

Before going live, test login, registration, OTP verification, token refresh, logout, permissions, and uploads against the deployed domains.

## Development Checks

Run Django's basic checks:

```bash
cd backend
python3 manage.py check
python3 manage.py check --deploy
```

Build the frontend:

```bash
cd frontend
npm run build
```

Address any reported errors and security warnings before release.

## Contributing

1. Create a branch for your change.
2. Keep secrets and local environment files out of Git.
3. Test backend and frontend changes.
4. Review authorization and validation for API changes.
5. Submit your changes through a pull request.

## License

Add a license before distributing or publishing the project as open source.
