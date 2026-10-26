
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class RegistrationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        validators=[validate_password],
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        return value
