
from django.contrib import admin
from .models import Payat, Transaction, OldData, OTP, AuditLog


@admin.register(Payat)
class PayatAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "date", "status", "created_at")
    list_filter = ("status", "date")
    search_fields = ("owner__email",)
    filter_horizontal = ("users",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "payat", "user", "amount", "date")
    list_filter = ("date",)
    search_fields = ("user__email",)


@admin.register(OldData)
class OldDataAdmin(admin.ModelAdmin):
    list_display = ("id", "from_user", "to_user", "amount", "till_date")
    list_filter = ("till_date",)


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "expires_at", "attempts")
    list_filter = ("status",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "actor", "action", "target_type", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("actor__email", "action", "target_type")
    readonly_fields = (
        "actor", "action", "target_type", "target_id",
        "details", "created_at", "ip_address",
    )
