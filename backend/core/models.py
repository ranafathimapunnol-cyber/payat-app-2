
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum
from django.db.models.functions import Coalesce


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Payat(TimestampedModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_payats",
    )
    date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="payats",
        blank=True,
    )

    def __str__(self):
        return f"Payat #{self.pk}"


class Transaction(TimestampedModel):
    payat = models.ForeignKey(
        Payat,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()

    def __str__(self):
        return f"Transaction #{self.pk} - {self.amount}"


class OldData(TimestampedModel):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="old_data_sent",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="old_data_received",
    )
    till_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Old data #{self.pk} - {self.amount}"


class OTP(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        EXPIRED = "EXPIRED", "Expired"
        USED = "USED", "Used"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="otp_records",
    )
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    attempts = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"OTP #{self.pk} - {self.status}"


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} ({self.created_at:%Y-%m-%d %H:%M})"


class Person(TimestampedModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        DECEASED = "DECEASED", "Deceased"
        CLOSED = "CLOSED", "Closed"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="people",
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    linked_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_person_records",
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    invited_email = models.EmailField(blank=True, default="")
    # A photo belongs to this Person record, not to their linked login account.
    profile_picture = models.ImageField(
        upload_to="person_profile_pictures/",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "linked_user"],
                condition=models.Q(linked_user__isnull=False),
                name="unique_linked_person_per_owner",
            )
        ]

    def __str__(self):
        return self.name


class PersonPayatRecord(TimestampedModel):
    person = models.OneToOneField(
        Person,
        on_delete=models.CASCADE,
        related_name="payat_record",
    )

    # Amount they previously invited you to receive.
    mumb_kittuvaan = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Legacy fields retained so existing database data is not deleted.
    # New My Payat and Ippol amounts belong in PersonPayatEntry.
    payatt = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    payatt_date = models.DateField(null=True, blank=True)
    kodukkan = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    ippol_payattiyath = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    ippol_date = models.DateField(null=True, blank=True)

    @property
    def total_my_payat(self):
        return self.person.payat_entries.filter(
            entry_type=PersonPayatEntry.EntryType.MY_PAYAT
        ).aggregate(
            total=Coalesce(
                Sum("amount"),
                Decimal("0.00"),
            )
        )["total"]

    @property
    def total_ippol_payattiyath(self):
        return self.person.payat_entries.filter(
            entry_type=PersonPayatEntry.EntryType.IPPOL_PAYATTIYATH
        ).aggregate(
            total=Coalesce(
                Sum("amount"),
                Decimal("0.00"),
            )
        )["total"]

    @property
    def displayed_kodukkan(self):
        return self.mumb_kittuvaan - self.total_my_payat

    @property
    def bakki_kittan(self):
        # Keep the existing Kodukkan calculation and apply the requested
        # Bakki Kittan formula: Mumb + Ippol - Kodukkan + My Payat.
        kodukkan = max(Decimal("0.00"), self.total_my_payat - self.mumb_kittuvaan)
        return (
            self.mumb_kittuvaan
            + self.total_ippol_payattiyath
            - kodukkan
            + self.total_my_payat
        )

    def __str__(self):
        return f"PAYAT record for {self.person.name}"


class PersonPayatEntry(TimestampedModel):
    class EntryType(models.TextChoices):
        MY_PAYAT = "MY_PAYAT", "My Payat"
        IPPOL_PAYATTIYATH = (
            "IPPOL_PAYATTIYATH",
            "Ippol Payattiyath",
        )

    person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name="payat_entries",
    )
    entry_type = models.CharField(
        max_length=30,
        choices=EntryType.choices,
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    date = models.DateField()

    class Meta:
        ordering = ["-date", "-created_at", "-id"]

    def __str__(self):
        return (
            f"{self.person.name} - "
            f"{self.get_entry_type_display()} - {self.amount}"
        )

class PendingInvitation(TimestampedModel):
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_payat_invitations",
    )
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["inviter", "email"],
                name="unique_pending_invitation_per_inviter_email",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.email})"
