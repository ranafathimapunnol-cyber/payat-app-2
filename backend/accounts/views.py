
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser

from .models import User
from .serializers import RegistrationSerializer
from core.models import OTP, AuditLog, Person


# =========================================================
# COOKIE HELPERS
# =========================================================

def set_auth_cookies(response, access_token, refresh_token):
    common_options = {
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": "/",
    }

    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        str(access_token),
        max_age=settings.JWT_ACCESS_COOKIE_MAX_AGE,
        **common_options,
    )

    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        str(refresh_token),
        max_age=settings.JWT_REFRESH_COOKIE_MAX_AGE,
        **common_options,
    )

    return response


def clear_auth_cookies(response):
    response.delete_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        path="/",
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path="/",
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
    return response


def get_client_ip(request):
    return request.META.get("REMOTE_ADDR")


# =========================================================
# CSRF TOKEN ENDPOINT
# =========================================================

@ensure_csrf_cookie
def csrf_cookie_view(request):
    return JsonResponse({"detail": "CSRF cookie is ready."})


# =========================================================
# REGISTRATION
# =========================================================

class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data["name"]
        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]

        rate_key = f"register_otp:{email}"

        if cache.get(rate_key):
            return Response(
                {"detail": "Please wait before requesting another OTP."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        existing_user = User.objects.filter(
            email__iexact=email
        ).first()

        if existing_user and existing_user.is_active:
            return Response(
                {"detail": "An account with this email already exists."},
                status=status.HTTP_409_CONFLICT,
            )

        otp_code = f"{secrets.randbelow(1_000_000):06d}"

        try:
            with transaction.atomic():
                if existing_user:
                    user = existing_user
                    user.username = email
                    user.email = email
                    user.first_name = name
                    user.set_password(password)
                    user.is_active = False
                    user.save()
                else:
                    user = User(
                        username=email,
                        email=email,
                        first_name=name,
                        is_active=False,
                        role=User.Role.USER,
                    )
                    user.set_password(password)
                    user.save()

                OTP.objects.filter(
                    user=user,
                    status=OTP.Status.PENDING,
                ).update(status=OTP.Status.EXPIRED)

                OTP.objects.create(
                    user=user,
                    otp_hash=make_password(otp_code),
                    expires_at=timezone.now() + timedelta(minutes=5),
                    status=OTP.Status.PENDING,
                )

                AuditLog.objects.create(
                    actor=user,
                    action="REGISTRATION_STARTED",
                    target_type="User",
                    target_id=str(user.pk),
                    ip_address=get_client_ip(request),
                )

                send_mail(
                    subject="Verify your Payat account",
                    message=(
                        f"Hello {name},\n\n"
                        f"Your Payat verification code is {otp_code}.\n"
                        "It expires in 5 minutes.\n\n"
                        "If you did not request this, ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )

            cache.set(rate_key, True, timeout=60)

        except Exception:
            return Response(
                {
                    "detail": (
                        "Unable to start registration. "
                        "Please check the server configuration and try again."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "detail": (
                    "Verification code sent. Verify your email "
                    "to complete registration."
                ),
                "email": email,
            },
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# EMAIL OTP VERIFICATION
# =========================================================

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "")
        otp_code = request.data.get("otp", "")

        if not isinstance(email, str) or not isinstance(otp_code, str):
            return Response(
                {"detail": "Email and OTP must be strings."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = email.strip().lower()
        otp_code = otp_code.strip()

        if not email or not otp_code:
            return Response(
                {"detail": "Email and OTP are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp_code.isdigit() or len(otp_code) != 6:
            return Response(
                {"detail": "Enter a valid six-digit OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = User.objects.select_for_update().filter(
                email__iexact=email,
                is_active=False,
            ).first()

            if not user:
                return Response(
                    {"detail": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            otp = OTP.objects.select_for_update().filter(
                user=user,
                status=OTP.Status.PENDING,
            ).order_by("-created_at").first()

            if not otp or otp.expires_at <= timezone.now():
                if otp:
                    otp.status = OTP.Status.EXPIRED
                    otp.save(update_fields=["status"])

                return Response(
                    {"detail": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if otp.attempts >= 5:
                return Response(
                    {"detail": "Too many attempts. Request a new OTP."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            if not check_password(otp_code, otp.otp_hash):
                otp.attempts += 1
                otp.save(update_fields=["attempts"])

                return Response(
                    {"detail": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.is_active = True
            user.save(update_fields=["is_active", "updated_at"])

            otp.status = OTP.Status.USED
            otp.save(update_fields=["status"])

            # Link invitations after the email is verified.
            Person.objects.filter(
                invited_email__iexact=user.email,
                linked_user__isnull=True,
            ).update(
                linked_user=user,
                invited_email="",
            )

            AuditLog.objects.create(
                actor=user,
                action="EMAIL_VERIFIED",
                target_type="User",
                target_id=str(user.pk),
                ip_address=get_client_ip(request),
            )

        cache.delete(f"register_otp:{email}")

        return Response(
            {
                "detail": (
                    "Email verified successfully. "
                    "Registration is complete. You can now log in."
                )
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# LOGIN
# =========================================================

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "")
        password = request.data.get("password", "")

        if not isinstance(email, str) or not isinstance(password, str):
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = email.strip().lower()

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()

        if not user or not user.check_password(password):
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Please verify your email before logging in."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.is_blocked:
            return Response(
                {"detail": "Your account has been blocked."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        AuditLog.objects.create(
            actor=user,
            action="LOGIN_SUCCESS",
            target_type="User",
            target_id=str(user.pk),
            ip_address=get_client_ip(request),
        )

        response = Response(
            {
                "detail": "Login successful.",
                "user": {
                    "id": user.pk,
                    "name": user.first_name,
                    "email": user.email,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )

        return set_auth_cookies(response, access, refresh)
    
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get("credential")

        if not isinstance(token, str) or not token:
            return Response(
                {"detail": "Google credential is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")

        if not client_id:
            return Response(
                {"detail": "Google login is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            google_user = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id,
            )
        except ValueError:
            return Response(
                {"detail": "Invalid Google credential. Please try again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Only accept verified Google email addresses.
        if not google_user.get("email_verified"):
            return Response(
                {"detail": "Your Google email must be verified."},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = google_user.get("email", "").strip().lower()
        name = google_user.get("name", "").strip()

        if not email:
            return Response(
                {"detail": "Google did not provide an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()

        if user is None:
            # Do not silently reactivate an existing inactive account.
            # A new Google user is created as an active account.
            name_parts = name.split(maxsplit=1)

            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=name_parts[0] if name_parts else "",
                last_name=name_parts[1] if len(name_parts) > 1 else "",
                password=None,
                is_active=True,
                role=User.Role.USER,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is inactive. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.is_blocked:
            return Response(
                {"detail": "Your account has been blocked."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        AuditLog.objects.create(
            actor=user,
            action="LOGIN_SUCCESS",
            target_type="User",
            target_id=str(user.pk),
            ip_address=get_client_ip(request),
        )

        response = Response(
            {
                "detail": "Google login successful.",
                "user": {
                    "id": user.pk,
                    "name": user.first_name,
                    "email": user.email,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )

        return set_auth_cookies(response, access, refresh)


# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

class RefreshCookieView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = request.COOKIES.get(
            settings.JWT_REFRESH_COOKIE_NAME
        )

        if not raw_refresh:
            return Response(
                {"detail": "Refresh token is missing. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(raw_refresh)
            user_id = old_refresh["user_id"]
            user = User.objects.get(pk=user_id)

            if not user.is_active or user.is_blocked:
                response = Response(
                    {"detail": "This account cannot refresh its session."},
                    status=status.HTTP_403_FORBIDDEN,
                )
                return clear_auth_cookies(response)

            old_refresh.blacklist()

            new_refresh = RefreshToken.for_user(user)
            new_access = new_refresh.access_token

            response = Response(
                {"detail": "Session refreshed successfully."},
                status=status.HTTP_200_OK,
            )

            return set_auth_cookies(
                response,
                new_access,
                new_refresh,
            )

        except (TokenError, KeyError, User.DoesNotExist):
            response = Response(
                {
                    "detail": (
                        "Invalid or expired refresh token. "
                        "Please log in again."
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_auth_cookies(response)


# =========================================================
# LOGOUT
# =========================================================

class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = request.COOKIES.get(
            settings.JWT_REFRESH_COOKIE_NAME
        )

        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                pass

        response = Response(
            {"detail": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )

        return clear_auth_cookies(response)


# =========================================================
# CURRENT USER PROFILE
# =========================================================

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "email": user.email,
            "role": user.role,
            "profile_picture": (
                request.build_absolute_uri(user.profile_picture.url)
                if user.profile_picture
                else None
            ),
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "is_blocked": user.is_blocked,
            "is_active": user.is_active,
        })


# =========================================================
# PROFILE PICTURE
# POST /api/auth/profile-picture/
# =========================================================

class ProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image = request.FILES.get("profile_picture")

        print("=== PROFILE PICTURE UPLOAD ===")
        print("Authenticated user:", request.user)
        print("User ID:", request.user.id)
        print("File received:", image.name if image else None)

        if not image:
            return Response(
                {"detail": "Please select a profile picture."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not image.content_type
            or not image.content_type.startswith("image/")
        ):
            return Response(
                {"detail": "Please upload an image file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Image must be 5 MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        user.profile_picture = image
        user.save(update_fields=["profile_picture", "updated_at"])
        user.refresh_from_db()

        saved_picture = (
            user.profile_picture.name if user.profile_picture else None
        )
        print("Saved picture:", saved_picture)

        if not saved_picture:
            return Response(
                {"detail": "The profile picture could not be saved."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "user_id": user.id,
                "profile_picture": request.build_absolute_uri(
                    user.profile_picture.url
                ),
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# REGISTERED USER SEARCH
# GET /api/auth/users/search/?q=...
# =========================================================

class RegisteredUserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()

        if len(query) < 2:
            return Response({"results": []})

        users = User.objects.filter(
            is_active=True,
            is_blocked=False,
        ).filter(
            Q(first_name__icontains=query)
            | Q(email__icontains=query)
        ).exclude(
            id=request.user.id
        ).order_by("first_name")[:20]

        results = []

        for user in users:
            already_linked = Person.objects.filter(
                owner=request.user,
                linked_user=user,
            ).exists()

            if not already_linked:
                results.append({
                    "id": user.id,
                    "name": user.first_name or user.username,
                    "email": user.email,
                })

        return Response({"results": results})
