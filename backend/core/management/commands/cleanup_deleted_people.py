
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Person


class Command(BaseCommand):
    help = "Permanently delete people that have been in Recently Deleted for 30 days."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=30)

        expired_people = Person.objects.filter(
            is_deleted=True,
            deleted_at__isnull=False,
            deleted_at__lte=cutoff,
        )

        count = expired_people.count()
        expired_people.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleanup complete. Permanently deleted {count} expired people."
            )
        )
