from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Alerte, Appareil, Foyer, Notification, Utilisateur

DEMO_DOMAIN = '@gazalert-demo.ci'
REAL_EMAIL = 'karamokoamy879@gmail.com'


class Command(BaseCommand):
    help = 'Supprime uniquement les données de démonstration (@gazalert-demo.ci)'

    def handle(self, *args, **options):
        demo_users = Utilisateur.objects.filter(email__endswith=DEMO_DOMAIN)
        count_users = demo_users.count()

        if count_users == 0:
            self.stdout.write('Aucune donnée démo à supprimer.')
            return

        # Safety: real account must never be in the demo set
        if demo_users.filter(email=REAL_EMAIL).exists():
            self.stderr.write(
                self.style.ERROR(
                    f'ERREUR : le compte réel {REAL_EMAIL} serait supprimé. Abandon.'
                )
            )
            return

        demo_user_ids = list(demo_users.values_list('id', flat=True))
        demo_foyer_ids = list(
            Foyer.objects.filter(utilisateur_id__in=demo_user_ids).values_list('id', flat=True)
        )

        nb_notifs = Notification.objects.filter(utilisateur_id__in=demo_user_ids).count()
        nb_alertes = Alerte.objects.filter(foyer_id__in=demo_foyer_ids).count()
        nb_appareils = Appareil.objects.filter(foyer_id__in=demo_foyer_ids).count()
        nb_foyers = len(demo_foyer_ids)

        with transaction.atomic():
            Notification.objects.filter(utilisateur_id__in=demo_user_ids).delete()
            Alerte.objects.filter(foyer_id__in=demo_foyer_ids).delete()
            Appareil.objects.filter(foyer_id__in=demo_foyer_ids).delete()
            Foyer.objects.filter(id__in=demo_foyer_ids).delete()
            demo_users.delete()

        self.stdout.write(self.style.SUCCESS('Données démo supprimées :'))
        self.stdout.write(f'  {count_users} utilisateurs')
        self.stdout.write(f'  {nb_foyers} foyers')
        self.stdout.write(f'  {nb_appareils} appareils')
        self.stdout.write(f'  {nb_alertes} alertes')
        self.stdout.write(f'  {nb_notifs} notifications')

        # Confirm real account is untouched
        real_ok = Utilisateur.objects.filter(email=REAL_EMAIL).exists()
        self.stdout.write('')
        if real_ok:
            self.stdout.write(self.style.SUCCESS(f'OK Compte réel intact : {REAL_EMAIL}'))
        else:
            self.stdout.write(f'  Compte réel ({REAL_EMAIL}) absent (non affecté par ce nettoyage).')
