from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from .models import User


class CookieJWTAuthentication(BaseAuthentication):
    """
    Authenticate users using an access JWT stored in an HttpOnly cookie.
    Enforce CSRF validation for authenticated unsafe requests.
    """

    def authenticate_header(self, request):
        """
        Return an authentication challenge so unauthenticated requests
        receive HTTP 401 instead of HTTP 403.
        """
        return "Bearer"

    def authenticate(self, request):
        cookie_name = getattr(
            settings,
            "JWT_ACCESS_COOKIE_NAME",
            "access_token",
        )
        raw_token = request.COOKIES.get(cookie_name)

        # No access cookie: treat the request as unauthenticated.
        if not raw_token:
            return None

        try:
            token = AccessToken(raw_token)
            user_id = token["user_id"]
            user = User.objects.get(pk=user_id)

        except (
            InvalidToken,
            TokenError,
            KeyError,
            User.DoesNotExist,
        ):
            raise AuthenticationFailed(
                "Invalid or expired access token."
            )

        if not user.is_active:
            raise AuthenticationFailed(
                "This account is inactive."
            )

        if user.is_blocked:
            raise PermissionDenied(
                "Your account has been blocked."
            )

        # Enforce CSRF protection for authenticated unsafe requests.
        if request.method not in (
            "GET",
            "HEAD",
            "OPTIONS",
            "TRACE",
        ):
            self.enforce_csrf(request)

        return (user, token)

    def enforce_csrf(self, request):
        check = CsrfViewMiddleware(lambda req: None)
        check.process_request(request)

        reason = check.process_view(
            request,
            None,
            (),
            {},
        )

        if reason:
            raise PermissionDenied(
                f"CSRF verification failed: {reason}"
            )
