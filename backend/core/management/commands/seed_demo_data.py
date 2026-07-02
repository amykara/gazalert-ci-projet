import datetime
import random
import string
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import Alerte, Appareil, Foyer, Notification, Utilisateur

DEMO_DOMAIN = '@gazalert-demo.ci'
REAL_EMAIL = 'karamokoamy879@gmail.com'

# 22 foyers: (commune, lat_base, lon_base, quartier)
FOYERS_DATA = [
    ('Cocody',      5.3600, -3.9810, 'Riviera 2'),
    ('Cocody',      5.3750, -3.9720, 'Angré'),
    ('Cocody',      5.3480, -3.9650, 'Deux Plateaux'),
    ('Yopougon',    5.3540, -4.0730, 'Attié'),
    ('Yopougon',    5.3420, -4.0650, 'Kouté'),
    ('Yopougon',    5.3720, -4.0950, 'Selmer'),
    ('Yopougon',    5.3650, -4.0820, 'Niangon'),
    ('Abobo',       5.4180, -4.0200, 'Sagbé'),
    ('Abobo',       5.4320, -4.0120, 'Baoulé'),
    ('Abobo',       5.4050, -4.0300, 'Kennedy'),
    ('Marcory',     5.3020, -3.9850, 'Zone 4'),
    ('Marcory',     5.2980, -3.9780, 'Résidentiel'),
    ('Treichville', 5.3010, -4.0080, 'Centre'),
    ('Koumassi',    5.3050, -3.9600, 'Campement'),
    ('Koumassi',    5.2990, -3.9520, 'Grand Campement'),
    ('Adjamé',      5.3620, -4.0230, '220 Logements'),
    ('Adjamé',      5.3580, -4.0280, 'Marché'),
    ('Plateau',     5.3210, -4.0180, 'Administration'),
    ('Port-Bouët',  5.2530, -3.9630, 'Vridi'),
    ('Port-Bouët',  5.2450, -3.9580, 'Abatta'),
    ('Bingerville', 5.3590, -3.8880, 'Centre'),
    ('Bingerville', 5.3680, -3.8760, 'Résidentiel'),
]

PRENOMS = [
    'Kouamé', 'Adjoua', 'Yao', 'Aya', 'Koffi', 'Akissi', 'Konan', 'Amoin',
    'Adou', 'Affoué', 'Brou', 'Yapo', 'Assi', 'Gnagnon', 'Ahou', 'Kouakou',
    'Achi', 'Edwige', 'Serge', 'Marie', 'Jean', 'Sylvain',
]
NOMS = [
    'Koné', 'Ouattara', 'Coulibaly', 'Yao', 'Konan', 'Brou',
    'Diallo', 'Traoré', 'Adou', 'Assi', 'Fofana', 'Bamba',
    'Cissé', 'Dosso', 'Sanogo', 'Séry', 'Guei', 'Diomandé',
    'Soro', "N'Guessan", 'Kacou', 'Ekra',
]

# 22 entries: 15 normal, 4 alerte_moderee, 2 alerte_critique, 1 hors_ligne
STATUTS_FOYERS = (
    ['normal'] * 15 +
    ['alerte_moderee'] * 4 +
    ['alerte_critique'] * 2 +
    ['hors_ligne'] * 1
)


def _slugify_fr(s):
    replacements = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'î': 'i', 'ï': 'i',
        'ô': 'o', 'ö': 'o',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', "'": '', ' ': '-',
    }
    result = s.lower()
    for src, dst in replacements.items():
        result = result.replace(src, dst)
    return result


class Command(BaseCommand):
    help = 'Génère des données de démonstration pour GazAlert CI (idempotent)'

    def handle(self, *args, **options):
        # Safety: never touch real account
        real_present = Utilisateur.objects.filter(email=REAL_EMAIL).exists()

        # Idempotency: bail out if demo data already exists
        existing = Utilisateur.objects.filter(email__endswith=DEMO_DOMAIN).count()
        if existing > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'{existing} utilisateurs démo déjà présents. '
                    'Utilisez clear_demo_data pour réinitialiser.'
                )
            )
            return

        with transaction.atomic():
            summary = self._seed()

        # Display summary outside the transaction so encoding errors don't rollback
        self._print_summary(summary, real_present)

    def _seed(self):
        now = timezone.now()
        today = now.date()
        seuil_resolue = now - timedelta(hours=24)

        random.seed(42)  # reproducible layout

        prenoms = PRENOMS[:]
        noms_list = NOMS[:]
        random.shuffle(prenoms)
        random.shuffle(noms_list)

        foyers_created = []
        statuts_count = {'normal': 0, 'alerte_moderee': 0, 'alerte_critique': 0, 'hors_ligne': 0}

        for i, (commune, lat_base, lon_base, quartier) in enumerate(FOYERS_DATA):
            prenom = prenoms[i % len(prenoms)]
            nom = noms_list[i % len(noms_list)]

            slug_p = _slugify_fr(prenom)
            slug_n = _slugify_fr(nom)
            email = f'demo.{slug_p}.{slug_n}.{i + 1}{DEMO_DOMAIN}'
            nom_utilisateur = f'demo_{slug_p}_{slug_n}_{i + 1}'[:50]

            # Small jitter so markers don't stack in the same commune
            lat = round(lat_base + random.uniform(-0.004, 0.004), 6)
            lon = round(lon_base + random.uniform(-0.004, 0.004), 6)

            tel_digits = ''.join([str(random.randint(0, 9)) for _ in range(8)])
            telephone = f'+225 07 {tel_digits[:2]} {tel_digits[2:4]} {tel_digits[4:6]} {tel_digits[6:]}'

            user = Utilisateur.objects.create_user(
                email=email,
                nom_utilisateur=nom_utilisateur,
                nom=f'{prenom} {nom}',
                telephone=telephone,
                password='demo_not_used',
                is_verified=True,
            )

            foyer = Foyer.objects.create(
                utilisateur=user,
                nom_foyer=f'Démo — {commune} ({quartier})',
                adresse=f'Quartier {quartier}, {commune}, Abidjan',
                latitude=lat,
                longitude=lon,
                adresse_repere=f'{quartier}, {commune}',
            )

            statut_foyer = STATUTS_FOYERS[i]
            token_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
            token = f'GAZ-DEMO-{token_suffix}'

            if statut_foyer == 'hors_ligne':
                # Several days without ping — well past the 24h admin threshold
                derniere_connexion = now - timedelta(days=random.randint(3, 10))
                statut_app = 'normal'
            else:
                # Recent ping: within the last hour, inside the 24h admin threshold
                derniere_connexion = now - timedelta(minutes=random.randint(5, 60))
                statut_app = statut_foyer

            valeur = None if statut_foyer == 'hors_ligne' else (
                random.randint(50, 180) if statut_foyer == 'normal' else
                random.randint(200, 350) if statut_foyer == 'alerte_moderee' else
                random.randint(400, 700)
            )

            Appareil.objects.create(
                foyer=foyer,
                token=token,
                derniere_connexion=derniere_connexion,
                est_actif=True,
                statut=statut_app,
                valeur_actuelle=valeur,
            )

            statuts_count[statut_foyer] += 1
            foyers_created.append(foyer)

        # ── Alertes (150–200 sur 90 jours, distribution non uniforme) ───────────
        nb_alertes = random.randint(150, 200)
        all_days = [today - timedelta(days=d) for d in range(89, -1, -1)]
        # Weights grow exponentially: last 2 weeks get ~3× more alerts than first 2 weeks
        weights = [max(1, int(100 * (1.04 ** j))) for j in range(90)]

        alertes_count = {'moderee': 0, 'critique': 0}
        recent_alert_info = []  # (pk, user, dt) for last 7 days → notifications

        foyer_user = {f.pk: f.utilisateur for f in foyers_created}

        for _ in range(nb_alertes):
            foyer = random.choice(foyers_created)
            niveau = 'moderee' if random.random() < 0.70 else 'critique'
            target_day = random.choices(all_days, weights=weights, k=1)[0]

            hour = random.randint(6, 23)
            minute = random.randint(0, 59)
            target_dt = timezone.make_aware(
                datetime.datetime(target_day.year, target_day.month, target_day.day, hour, minute)
            )

            valeur_gaz = (
                random.randint(200, 380) if niveau == 'moderee'
                else random.randint(400, 750)
            )
            est_resolue = target_dt < seuil_resolue

            alerte = Alerte(
                foyer=foyer,
                niveau=niveau,
                valeur_gaz=valeur_gaz,
                latitude=foyer.latitude,
                longitude=foyer.longitude,
                est_resolue=est_resolue,
                message_sms=f'ALERTE GAZ {niveau.upper()} — {foyer.nom_foyer}',
                sms_envoye=est_resolue,
            )
            alerte.save()
            Alerte.objects.filter(pk=alerte.pk).update(date_alerte=target_dt)

            alertes_count[niveau] += 1

            if target_day >= today - timedelta(days=6):
                recent_alert_info.append((alerte.pk, foyer_user[foyer.pk], target_dt))

        # ── Notifications (7 derniers jours) ─────────────────────────────────────
        notifs_count = 0
        for alerte_pk, owner, target_dt in recent_alert_info:
            notif = Notification(
                utilisateur=owner,
                alerte_id=alerte_pk,
                type_notification='alerte_gaz',
                message='Alerte gaz détectée dans votre foyer.',
                est_lue=random.random() > 0.35,
            )
            notif.save()
            Notification.objects.filter(pk=notif.pk).update(date_envoi=target_dt)
            notifs_count += 1

        return {  # consumed by _print_summary outside the transaction
            'nb_foyers': len(foyers_created),
            'statuts': statuts_count,
            'alertes': alertes_count,
            'notifs': notifs_count,
        }

    def _print_summary(self, s, real_present):
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=== Seed termine ==='))
        self.stdout.write(
            'Foyers  : %d (normal=%d, alerte_moderee=%d, alerte_critique=%d, hors_ligne=%d)' % (
                s['nb_foyers'],
                s['statuts']['normal'], s['statuts']['alerte_moderee'],
                s['statuts']['alerte_critique'], s['statuts']['hors_ligne'],
            )
        )
        self.stdout.write(
            'Alertes : %d (moderee=%d, critique=%d)' % (
                s['alertes']['moderee'] + s['alertes']['critique'],
                s['alertes']['moderee'], s['alertes']['critique'],
            )
        )
        self.stdout.write('Notifs  : %d (7 derniers jours)' % s['notifs'])

        if real_present:
            real_user = Utilisateur.objects.filter(email=REAL_EMAIL).first()
            real_foyers = Foyer.objects.filter(utilisateur=real_user).count() if real_user else 0
            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS(
                    'OK Compte reel intact : %s (%d foyer(s) preserve(s))' % (REAL_EMAIL, real_foyers)
                )
            )
        else:
            self.stdout.write('\n  Compte reel (%s) absent de la base.' % REAL_EMAIL)
