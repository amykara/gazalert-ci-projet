import uuid
from django.db import migrations, models


def generer_token():
    return f"GAZ-{uuid.uuid4().hex[:16].upper()}"


def peupler_tokens(apps, schema_editor):
    Foyer = apps.get_model('core', 'Foyer')
    for foyer in Foyer.objects.all():
        foyer.token = f"GAZ-{uuid.uuid4().hex[:16].upper()}"
        foyer.save(update_fields=['token'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_utilisateur_is_verified_tokenemail'),
    ]

    operations = [
        migrations.AddField(
            model_name='foyer',
            name='token',
            field=models.CharField(default=generer_token, max_length=50),
        ),
        migrations.RunPython(peupler_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='foyer',
            name='token',
            field=models.CharField(default=generer_token, max_length=50, unique=True),
        ),
    ]
