import logging
import os
from decimal import Decimal

import requests
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

from .models import (
    Payat,
    Transaction,
    OldData,
    Person,
    PersonPayatRecord,
    PersonPayatEntry,
    PendingInvitation,
)

from .serializers import (
    PayatSerializer,
    TransactionSerializer,
    OldDataSerializer,
    PersonSerializer,
    PersonPayatRecordSerializer,
    PersonPayatEntrySerializer,
)

logger = logging.getLogger(__name__)


# =========================================================
# BREVO EMAIL API
# =========================================================

def send_brevo_email(to_email, to_name, subject, text_content):
    """Send an email using Brevo's HTTP API."""

    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL")

    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured.")

    if not sender_email:
        raise RuntimeError("BREVO_SENDER_EMAIL is not configured.")

    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        json={
            "sender": {
                "email": sender_email,
                "name": "PAYAT",
            },
            "to": [
                {
                    "email": to_email,
                    "name": to_name,
                }
            ],
            "subject": subject,
            "textContent": text_content,
        },
        timeout=20,
    )

    if not response.ok:
        logger.error(
            "Brevo API failed: status=%s response=%s",
            response.status_code,
            response.text[:1000],
        )
        response.raise_for_status()

    return response.json() if response.content else {}


# =========================================================
# PAYATS
# =========================================================

class PayatListCreateView(generics.ListCreateAPIView):
    """List Payats owned by or joined by the authenticated user."""

    serializer_class = PayatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            Payat.objects.filter(Q(owner=user) | Q(users=user))
            .select_related("owner")
            .prefetch_related("users")
            .distinct()
            .order_by("-date", "-created_at", "-id")
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            payat = serializer.save(owner=self.request.user)
            payat.users.add(self.request.user)


class PayatDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Only the owner can retrieve, update, or delete a Payat."""

    serializer_class = PayatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Payat.objects.filter(owner=self.request.user)
            .select_related("owner")
            .prefetch_related("users")
        )


# =========================================================
# TRANSACTIONS
# =========================================================

class TransactionListCreateView(generics.ListCreateAPIView):
    """List transactions for Payats the user owns or has joined."""

    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        queryset = (
            Transaction.objects.filter(
                Q(payat__owner=user) | Q(payat__users=user)
            )
            .select_related("user", "payat", "payat__owner")
            .distinct()
        )

        payat_id = self.request.query_params.get("payat")

        if payat_id:
            if not payat_id.isdigit():
                return queryset.none()

            queryset = queryset.filter(payat_id=int(payat_id))

        return queryset.order_by("date", "created_at", "id")

    def perform_create(self, serializer):
        payat = serializer.validated_data["payat"]
        user = self.request.user

        can_access = (
            payat.owner_id == user.id
            or payat.users.filter(id=user.id).exists()
        )

        if not can_access:
            raise PermissionDenied(
                "You cannot add transactions to this Payat."
            )

        serializer.save(user=user)


# =========================================================
# OLD DATA
# =========================================================

class OldDataListCreateView(generics.ListCreateAPIView):
    serializer_class = OldDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            OldData.objects.filter(
                Q(from_user=user) | Q(to_user=user)
            )
            .select_related("from_user", "to_user")
            .distinct()
        )

    def perform_create(self, serializer):
        from_user = serializer.validated_data["from_user"]
        to_user = serializer.validated_data["to_user"]

        if self.request.user not in (from_user, to_user):
            raise PermissionDenied(
                "You must be involved in this record to create it."
            )

        serializer.save()


# =========================================================
# PEOPLE
# =========================================================

class PersonListCreateView(generics.ListCreateAPIView):
    serializer_class = PersonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Person.objects.filter(
                owner=self.request.user,
                is_deleted=False,
            )
            .select_related("owner", "linked_user")
        )

        person_status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if person_status in Person.Status.values:
            queryset = queryset.filter(status=person_status)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by("-created_at", "-id")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PersonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PersonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Person.objects.filter(
                owner=self.request.user,
                is_deleted=False,
            )
            .select_related("owner", "linked_user")
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])


class RecentlyDeletedPeopleView(generics.ListAPIView):
    serializer_class = PersonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Person.objects.filter(
                owner=self.request.user,
                is_deleted=True,
            )
            .select_related("owner", "linked_user")
            .order_by("-deleted_at", "-id")
        )


class RestorePersonView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        person = get_object_or_404(
            Person,
            pk=pk,
            owner=request.user,
            is_deleted=True,
        )

        person.is_deleted = False
        person.deleted_at = None
        person.save(update_fields=["is_deleted", "deleted_at"])

        return Response(
            {
                "detail": "Person restored successfully.",
                "person": PersonSerializer(
                    person,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class PermanentDeletePersonView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        person = get_object_or_404(
            Person,
            pk=pk,
            owner=request.user,
            is_deleted=True,
        )

        person.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class PersonProfilePictureView(APIView):
    """Upload a profile picture for a Person owned by the requester."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, person_id):
        person = get_object_or_404(
            Person,
            pk=person_id,
            owner=request.user,
        )

        uploaded_file = request.FILES.get("profile_picture")

        if not uploaded_file:
            return Response(
                {"detail": "Choose an image file to upload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not uploaded_file.content_type
            or not uploaded_file.content_type.startswith("image/")
        ):
            return Response(
                {"detail": "The uploaded file must be an image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "The image must be 5 MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        person.profile_picture = uploaded_file
        person.save(update_fields=["profile_picture", "updated_at"])

        return Response(
            {
                "person_id": person.id,
                "profile_picture": request.build_absolute_uri(
                    person.profile_picture.url
                ),
                "detail": "Person photo saved successfully.",
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# PERSON PAYAT SUMMARY
# =========================================================

class PersonPayatRecordView(generics.RetrieveUpdateAPIView):
    serializer_class = PersonPayatRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        person = get_object_or_404(
            Person,
            pk=self.kwargs["person_id"],
            owner=self.request.user,
        )

        record, _ = PersonPayatRecord.objects.get_or_create(
            person=person
        )

        return record


# =========================================================
# LINK AN EXISTING REGISTERED USER
# =========================================================

class LinkRegisteredUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"detail": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            linked_user = User.objects.get(
                id=user_id,
                is_active=True,
                is_blocked=False,
            )
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Registered user not found or unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if linked_user.id == request.user.id:
            return Response(
                {"detail": "You cannot add yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Person.objects.filter(
            owner=request.user,
            linked_user=linked_user,
        ).first()

        if existing:
            return Response(
                {
                    "detail": "This person is already in your list.",
                    "person": PersonSerializer(existing).data,
                },
                status=status.HTTP_200_OK,
            )

        try:
            with transaction.atomic():
                person = Person.objects.create(
                    owner=request.user,
                    linked_user=linked_user,
                    name=(
                        linked_user.first_name.strip()
                        or linked_user.username
                        or linked_user.email
                    ),
                    invited_email=linked_user.email,
                )

                PersonPayatRecord.objects.get_or_create(person=person)

        except IntegrityError:
            existing = Person.objects.filter(
                owner=request.user,
                linked_user=linked_user,
            ).first()

            if existing:
                return Response(
                    {
                        "detail": "This person is already in your list.",
                        "person": PersonSerializer(existing).data,
                    },
                    status=status.HTTP_200_OK,
                )

            logger.exception(
                "Failed to link registered user %s",
                user_id,
            )

            return Response(
                {"detail": "Could not link this user."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            PersonSerializer(person).data,
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# INVITATIONS — BREVO API
# =========================================================

class InvitePersonView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = str(request.data.get("name", "")).strip()
        email = str(request.data.get("email", "")).strip().lower()
        phone = str(request.data.get("phone", "")).strip()

        if not name or not email:
            return Response(
                {"detail": "Name and email are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"detail": "Enter a valid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if email == (request.user.email or "").lower():
            return Response(
                {"detail": "You cannot invite yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_user = User.objects.filter(
            email__iexact=email
        ).first()

        if existing_user and existing_user.is_blocked:
            return Response(
                {"detail": "This account is currently unavailable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Link an existing active account immediately.
        if existing_user and existing_user.is_active:
            existing_person = Person.objects.filter(
                owner=request.user,
                linked_user=existing_user,
            ).first()

            if existing_person:
                return Response(
                    {
                        "detail": "This person is already in your list.",
                        "person": PersonSerializer(existing_person).data,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            try:
                with transaction.atomic():
                    person = Person.objects.create(
                        owner=request.user,
                        name=name,
                        phone=phone,
                        linked_user=existing_user,
                        invited_email="",
                    )

                    PersonPayatRecord.objects.get_or_create(
                        person=person
                    )

            except IntegrityError:
                logger.exception(
                    "Failed to create Person for invited user %s",
                    email,
                )

                return Response(
                    {"detail": "This person could not be linked."},
                    status=status.HTTP_409_CONFLICT,
                )

            return Response(
                {
                    "detail": "Registered user added successfully.",
                    "person": PersonSerializer(person).data,
                },
                status=status.HTTP_201_CREATED,
            )

        # Save the pending invitation before sending the email.
        try:
            with transaction.atomic():
                PendingInvitation.objects.update_or_create(
                    inviter=request.user,
                    email=email,
                    defaults={
                        "name": name,
                        "phone": phone,
                    },
                )

        except (IntegrityError, TypeError, ValueError):
            logger.exception(
                "Could not save pending invitation for %s",
                email,
            )

            return Response(
                {"detail": "The invitation could not be saved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        frontend_url = getattr(
            settings,
            "FRONTEND_URL",
            "http://localhost:3000",
        ).rstrip("/")

        registration_url = f"{frontend_url}/register"

        message = (
            f"Hello {name},\n\n"
            "You have been invited to join PAYAT.\n"
            f"Register using this email address: {email}\n\n"
            f"Register here: {registration_url}\n\n"
            "After registering, verify your email using the OTP "
            "to complete registration."
        )

        try:
            send_brevo_email(
                to_email=email,
                to_name=name,
                subject="You're invited to join PAYAT",
                text_content=message,
            )

        except Exception:
            logger.exception(
                "Invitation email failed for %s",
                email,
            )

            return Response(
                {
                    "detail": (
                        "Invitation details were saved, but the email "
                        "could not be sent. Check the Django server logs."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "detail": "Invitation email sent successfully.",
                "email": email,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# INDIVIDUAL PAYAT ENTRIES FOR A PERSON
# =========================================================

class PersonPayatEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = PersonPayatEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_person(self):
        return get_object_or_404(
            Person,
            pk=self.kwargs["person_id"],
            owner=self.request.user,
        )

    def get_queryset(self):
        person = self.get_person()

        return (
            PersonPayatEntry.objects.filter(
                person=person,
                person__owner=self.request.user,
            )
            .select_related("person")
            .order_by("-date", "-created_at", "-id")
        )

    def perform_create(self, serializer):
        serializer.save(person=self.get_person())


class PersonPayatEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PersonPayatEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PersonPayatEntry.objects.filter(
            person__owner=self.request.user,
            person_id=self.kwargs["person_id"],
        )


# =========================================================
# DASHBOARD SUMMARY
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Return dashboard summary and recent activity."""

    user = request.user

    registered_users_count = User.objects.filter(
        is_active=True,
        is_blocked=False,
    ).count()

    people = Person.objects.filter(
        owner=user,
        is_deleted=False,
    )

    people_count = people.count()

    active_payats_count = (
        Payat.objects.filter(
            Q(owner=user) | Q(users=user),
            status=Payat.Status.ACTIVE,
        )
        .distinct()
        .count()
    )

    to_give = Decimal("0.00")
    to_receive = Decimal("0.00")

    for person in people.iterator():
        try:
            record = person.payat_record
        except PersonPayatRecord.DoesNotExist:
            continue

        to_give += max(
            Decimal("0.00"),
            record.total_my_payat - record.mumb_kittuvaan,
        )

        to_receive += record.bakki_kittan

    recent_entries = (
        PersonPayatEntry.objects.filter(
            person__owner=user
        )
        .select_related("person")
        .order_by("-created_at", "-id")
    )

    recent_activity = [
        {
            "id": entry.id,
            "person_id": entry.person_id,
            "person_name": entry.person.name,
            "entry_type": entry.entry_type,
            "entry_label": entry.get_entry_type_display(),
            "amount": str(entry.amount),
            "date": entry.date.isoformat(),
            "created_at": entry.created_at.isoformat(),
        }
        for entry in recent_entries
    ]

    return Response(
        {
            "people_count": people_count,
            "registered_users_count": registered_users_count,
            "active_payats_count": active_payats_count,
            "to_give": str(to_give),
            "to_receive": str(to_receive),
            "net_position": str(to_receive - to_give),
            "recent_activity": recent_activity,
        },
        status=status.HTTP_200_OK,
    )