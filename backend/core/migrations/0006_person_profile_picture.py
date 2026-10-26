from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_alter_personpayatentry_options"),
    ]

    operations = [
        migrations.AddField(
            model_name="person",
            name="profile_picture",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="person_profile_pictures/",
            ),
        ),
    ]
