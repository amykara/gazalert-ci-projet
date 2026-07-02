import json
from datetime import date, timedelta
from django.shortcuts import render
from django.utils import timezone
from django.db.models.functions import TruncDate
from django.db.models import Count
from .models import Foyer, Alerte

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
