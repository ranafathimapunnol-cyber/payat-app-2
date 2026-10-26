
from rest_framework import serializers

from .models import (
    Payat,
    Transaction,
    OldData,
    Person,
    PersonPayatRecord,
    PersonPayatEntry,
)



class PayatSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(
        source="owner.email",
        read_only=True,
    )

    class Meta:
        model = Payat
        fields = [
            "id",
            "owner",
            "owner_name",
            "owner_email",
            "date",
            "status",
            "users",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "owner_name",
            "owner_email",
            "users",
            "created_at",
            "updated_at",
        ]

    def get_owner_name(self, obj):
        return (
            obj.owner.get_full_name().strip()
            or obj.owner.username
            or obj.owner.email
        )



class TransactionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "payat",
            "user",
            "user_name",
            "owner_name",
            "amount",
            "date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_name",
            "owner_name",
            "created_at",
            "updated_at",
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name().strip() or obj.user.username or obj.user.email

    def get_owner_name(self, obj):
        owner = obj.payat.owner
        return owner.get_full_name().strip() or owner.username or owner.email

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Amount must be greater than zero."
            )
        return value


class OldDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = OldData
        fields = [
            "id",
            "from_user",
            "to_user",
            "till_date",
            "amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        from_user = attrs.get(
            "from_user",
            getattr(self.instance, "from_user", None),
        )
        to_user = attrs.get(
            "to_user",
            getattr(self.instance, "to_user", None),
        )
        amount = attrs.get(
            "amount",
            getattr(self.instance, "amount", None),
        )

        if from_user and from_user == to_user:
            raise serializers.ValidationError(
                "From user and to user must be different."
            )

        if amount is not None and amount <= 0:
            raise serializers.ValidationError({
                "amount": "Amount must be greater than zero."
            })

        return attrs



class PersonSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = Person
        fields = [
            "id",
            "name",
            "phone",
            "address",
            "status",
            "linked_user",
            "invited_email",
            "profile_picture",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "linked_user",
            "profile_picture",
            "created_at",
            "updated_at",
        ]

    def get_profile_picture(self, obj):
        # Always return this person's own image; never borrow a linked user's image.
        if not obj.profile_picture:
            return None

        request = self.context.get("request")
        picture_url = obj.profile_picture.url

        if request:
            return request.build_absolute_uri(picture_url)

        return picture_url

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Person name cannot be empty."
            )
        return value



class PersonPayatRecordSerializer(serializers.ModelSerializer):
    total_my_payat = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    total_ippol_payattiyath = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    displayed_kodukkan = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    bakki_kittan = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = PersonPayatRecord
        fields = [
            "id",
            "person",
            "mumb_kittuvaan",
            "total_my_payat",
            "total_ippol_payattiyath",
            "displayed_kodukkan",
            "bakki_kittan",
            # Legacy fields retained for compatibility.
            "payatt",
            "payatt_date",
            "kodukkan",
            "ippol_payattiyath",
            "ippol_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "person",
            "total_my_payat",
            "total_ippol_payattiyath",
            "displayed_kodukkan",
            "bakki_kittan",
            "payatt",
            "payatt_date",
            "kodukkan",
            "ippol_payattiyath",
            "ippol_date",
            "created_at",
            "updated_at",
        ]

    def validate_mumb_kittuvaan(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Amount cannot be negative."
            )
        return value


class PersonPayatEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonPayatEntry
        fields = [
            "id",
            "person",
            "entry_type",
            "amount",
            "date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "person",
            "created_at",
            "updated_at",
        ]

    def validate_entry_type(self, value):
        if value not in PersonPayatEntry.EntryType.values:
            raise serializers.ValidationError(
                "Choose a valid entry type."
            )
        return value

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Amount cannot be negative."
            )
        return value
