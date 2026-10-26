
from django.urls import path

from .views import (
    RegisterView,
    VerifyOTPView,
    LoginView,
    RefreshCookieView,
    LogoutView,
    csrf_cookie_view,
    MeView,
    ProfilePictureView,
    RegisteredUserSearchView
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("otp/verify/", VerifyOTPView.as_view(), name="otp-verify"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", RefreshCookieView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("csrf/", csrf_cookie_view, name="csrf"),
    path("me/", MeView.as_view(), name="me"),
    path(
        "profile-picture/",
        ProfilePictureView.as_view(),
        name="profile-picture",
    ),
    path(
    "users/search/",
    RegisteredUserSearchView.as_view(),
    name="registered-user-search",
),
]
