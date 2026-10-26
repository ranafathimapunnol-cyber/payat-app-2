
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# =========================================================
# BASE DIRECTORY AND ENVIRONMENT
# =========================================================

# Base directory: payat-app/backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from backend/.env
load_dotenv(BASE_DIR / ".env")


# =========================================================
# SECURITY SETTINGS
# =========================================================

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-this-key-before-deployment",
)

DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1",
    ).split(",")
    if host.strip()
]


# =========================================================
# APPLICATIONS
# =========================================================

INSTALLED_APPS = [
    # Django applications
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party applications
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",

    # Local applications
    "accounts",
    "core",
]


# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# =========================================================
# URLS AND APPLICATION SERVERS
# =========================================================

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"


# =========================================================
# TEMPLATES
# =========================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# =========================================================
# DATABASE: POSTGRESQL
# =========================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "payat_app_db"),
        "USER": os.getenv("DB_USER", "ismailpunnol"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}


# =========================================================
# CUSTOM USER MODEL
# =========================================================

AUTH_USER_MODEL = "accounts.User"


# =========================================================
# PASSWORD VALIDATION
# =========================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# =========================================================
# DJANGO REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Reads JWT access tokens from the HttpOnly cookie.
        "accounts.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}


# =========================================================
# JWT SETTINGS
# =========================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
}

# Cookie configuration
JWT_ACCESS_COOKIE_NAME = "access_token"
JWT_REFRESH_COOKIE_NAME = "refresh_token"
JWT_CSRF_COOKIE_NAME = "csrftoken"

JWT_COOKIE_HTTPONLY = True

# Secure cookies are enabled automatically when DEBUG=False.
JWT_COOKIE_SECURE = not DEBUG

# Suitable for local development when frontend and backend
# use localhost consistently.
JWT_COOKIE_SAMESITE = "Lax"

JWT_ACCESS_COOKIE_MAX_AGE = 15 * 60
JWT_REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60


# =========================================================
# CORS AND CSRF
# =========================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

# Allow the frontend to send the CSRF token header.
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-csrftoken",
    "x-requested-with",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


# =========================================================
# EMAIL
# =========================================================


DEFAULT_FROM_EMAIL = "Payat <noreply@payat.local>"


# =========================================================
# INTERNATIONALIZATION
# =========================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# =========================================================
# STATIC FILES
# =========================================================

STATIC_URL = "static/"


# =========================================================
# DEFAULT PRIMARY KEY
# =========================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True

EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER,
)

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"