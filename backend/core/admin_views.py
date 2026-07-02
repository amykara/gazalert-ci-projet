import json
from datetime import date, timedelta
from django.shortcuts import render
from django.utils import timezone
from django.db.models.functions import TruncDate
from django.db.models import Count
from .models import Foyer, Alerte, Appareil, Notification

SEUIL_HORS_LIGNE = 60  # secondes


def carte_foyers(request):
    seuil = timezone.now() - timedelta(seconds=SEUIL_HORS_LIGNE)
    foyers = Foyer.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False,
    ).select_related('appareil', 'utilisateur')

    markers = []
    for foyer in foyers:
        try:
            app = foyer.appareil
            if app.derniere_connexion and app.derniere_connexion >= seuil:
                statut = app.statut
            else:
                statut = 'hors_ligne'
        except Exception:
            statut = 'hors_ligne'

        markers.append({
            'lat': float(foyer.latitude),
            'lon': float(foyer.longitude),
            'nom': foyer.nom_foyer,
            'adresse': foyer.adresse_repere or foyer.adresse or '',
            'statut': statut,
        })

    return render(request, 'admin/carte_foyers.html', {
        'title': 'Carte des foyers',
        'markers_json': json.dumps(markers),
    })


def statistiques_alertes(request):
    date_fin = date.today()
    date_debut = date_fin - timedelta(days=29)

    if request.GET.get('date_debut'):
        try:
            date_debut = date.fromisoformat(request.GET['date_debut'])
        except ValueError:
            pass
    if request.GET.get('date_fin'):
        try:
            date_fin = date.fromisoformat(request.GET['date_fin'])
        except ValueError:
            pass

    qs = Alerte.objects.filter(
        date_alerte__date__gte=date_debut,
        date_alerte__date__lte=date_fin,
    )

    par_jour = (
        qs.annotate(jour=TruncDate('date_alerte'))
          .values('jour', 'niveau')
          .annotate(total=Count('id'))
          .order_by('jour')
    )

    jours = []
    current = date_debut
    while current <= date_fin:
        jours.append(str(current))
        current += timedelta(days=1)

    moderees = {j: 0 for j in jours}
    critiques = {j: 0 for j in jours}
    for row in par_jour:
        j = str(row['jour'])
        if row['niveau'] == 'moderee':
            moderees[j] = row['total']
        elif row['niveau'] == 'critique':
            critiques[j] = row['total']

    total = qs.count()
    resolues = qs.filter(est_resolue=True).count()
    taux_resolution = round(resolues / total * 100) if total > 0 else 0

    return render(request, 'admin/statistiques_alertes.html', {
        'title': 'Statistiques des alertes',
        'date_debut': str(date_debut),
        'date_fin': str(date_fin),
        'jours_json': json.dumps(jours),
        'moderees_json': json.dumps([moderees[j] for j in jours]),
        'critiques_json': json.dumps([critiques[j] for j in jours]),
        'total': total,
        'taux_resolution': taux_resolution,
    })


MOIS_FR = {
    1: 'janvier', 2: 'février', 3: 'mars', 4: 'avril',
    5: 'mai', 6: 'juin', 7: 'juillet', 8: 'août',
    9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'décembre',
}


def _temps_relatif(delta):
    secs = int(delta.total_seconds())
    if secs < 60:
        return "à l'instant"
    elif secs < 3600:
        return f"il y a {secs // 60} min"
    elif secs < 86400:
        return f"il y a {secs // 3600} h"
    else:
        return f"il y a {delta.days} j"


def tableau_de_bord(request):
    now = timezone.now()
    today = now.date()
    seuil = now - timedelta(seconds=SEUIL_HORS_LIGNE)

    # ── Stat cards ──────────────────────────────────────────────────────────
    foyers_total = Foyer.objects.count()
    foyers_30j = Foyer.objects.filter(date_creation__gte=now - timedelta(days=30)).count()
    evolution_foyers = round(foyers_30j / foyers_total * 100) if foyers_total > 0 else 0

    appareils_total = Appareil.objects.count()
    appareils_en_ligne = Appareil.objects.filter(derniere_connexion__gte=seuil).count()
    appareils_en_alerte = Appareil.objects.filter(
        statut__in=['alerte_moderee', 'alerte_critique'],
        derniere_connexion__gte=seuil,
    ).count()
    appareils_normaux = max(0, appareils_en_ligne - appareils_en_alerte)
    appareils_hors_ligne = max(0, appareils_total - appareils_en_ligne)
    pct_connectes = round(appareils_en_ligne / appareils_total * 100) if appareils_total > 0 else 0

    alertes_actives = Alerte.objects.filter(est_resolue=False).count()
    alertes_aujourd_hui = Alerte.objects.filter(date_alerte__date=today).count()

    notifs_7j = Notification.objects.filter(date_envoi__gte=now - timedelta(days=7)).count()

    # ── Graphique en anneau ──────────────────────────────────────────────────
    statuts_json = json.dumps([appareils_normaux, appareils_hors_ligne, appareils_en_alerte])

    # ── Graphique en aire (multi-période) ────────────────────────────────────
    def _data_alertes(nb_jours):
        debut = today - timedelta(days=nb_jours - 1)
        qs = (
            Alerte.objects
            .filter(date_alerte__date__gte=debut, date_alerte__date__lte=today)
            .annotate(jour=TruncDate('date_alerte'))
            .values('jour', 'niveau')
            .annotate(total=Count('id'))
            .order_by('jour')
        )
        dates = []
        cur = debut
        while cur <= today:
            dates.append(cur)
            cur += timedelta(days=1)

        mod = {str(d): 0 for d in dates}
        crit = {str(d): 0 for d in dates}
        for row in qs:
            j = str(row['jour'])
            if row['niveau'] == 'moderee':
                mod[j] = row['total']
            elif row['niveau'] == 'critique':
                crit[j] = row['total']

        return {
            'labels': [f"{d.day:02d}/{d.month:02d}" for d in dates],
            'moderees': [mod[str(d)] for d in dates],
            'critiques': [crit[str(d)] for d in dates],
        }

    # ── Fil d'activité ──────────────────────────────────────────────────────
    raw = []
    for alerte in Alerte.objects.select_related('foyer').order_by('-date_alerte')[:4]:
        raw.append({
            'dt': alerte.date_alerte,
            'initiales': (alerte.foyer.nom_foyer[:2] or '??').upper(),
            'description': f"Alerte {alerte.niveau} — {alerte.foyer.nom_foyer}",
            'couleur_fond': '#fff7ed',
            'couleur_txt': '#c2410c',
        })
    for foyer in Foyer.objects.select_related('utilisateur').order_by('-date_creation')[:3]:
        raw.append({
            'dt': foyer.date_creation,
            'initiales': (foyer.utilisateur.nom[:2] or '??').upper(),
            'description': f"Nouveau foyer — {foyer.nom_foyer}",
            'couleur_fond': '#f0fdf4',
            'couleur_txt': '#15803d',
        })
    raw.sort(key=lambda x: x['dt'], reverse=True)
    activites = [{**item, 'temps': _temps_relatif(now - item['dt'])} for item in raw[:6]]

    today_str = f"{today.day} {MOIS_FR[today.month]} {today.year}"

    return render(request, 'admin/tableau_de_bord.html', {
        'title': 'Tableau de bord',
        'foyers_total': foyers_total,
        'evolution_foyers': evolution_foyers,
        'appareils_en_ligne': appareils_en_ligne,
        'appareils_hors_ligne': appareils_hors_ligne,
        'appareils_en_alerte': appareils_en_alerte,
        'pct_connectes': pct_connectes,
        'alertes_actives': alertes_actives,
        'alertes_aujourd_hui': alertes_aujourd_hui,
        'notifs_7j': notifs_7j,
        'statuts_json': statuts_json,
        'data_13j_json': json.dumps(_data_alertes(13)),
        'data_30j_json': json.dumps(_data_alertes(30)),
        'data_90j_json': json.dumps(_data_alertes(90)),
        'activites': activites,
        'today_str': today_str,
    })
