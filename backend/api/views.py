import uuid
from datetime import timedelta
from django.conf import settings
import resend
from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404


from core.models import (
    Utilisateur, Foyer, Appareil, Alerte,
    Contact, Role, MembreFamille, Notification, ConseilSecurite
)
from .serializers import (
    UtilisateurSerializer, FoyerSerializer, AppareilSerializer,
    AlerteSerializer, ContactSerializer, RoleSerializer,
    MembreFamilleSerializer, NotificationSerializer,
    ConseilSecuriteSerializer, InscriptionSerializer, AlerteArduinoSerializer
)


# ─── UTILITAIRES ──────────────────────────────────────────────────────────────
def get_foyer_utilisateur(user):
    """Retourne le foyer de l'utilisateur — propriétaire ou membre approuvé."""
    foyer = Foyer.objects.filter(utilisateur=user).first()
    if foyer:
        return foyer, 'proprietaire'
    membre = MembreFamille.objects.filter(
        utilisateur=user,
        statut='approuve'
    ).select_related('foyer', 'role').first()
    if membre:
        return membre.foyer, membre.role.nom if membre.role else 'membre'
    return None, None


# ─── INSCRIPTION ──────────────────────────────────────────────────────────────
@api_view(['POST']) #cette vue accepte uniquement les requetes POST
@permission_classes([AllowAny]) #n'importe qui peut accéder à cette vue, même sans être authentifié
def inscription(request):
    serializer = InscriptionSerializer(data=request.data) #on utilise un serializer spécifique pour l'inscription qui valide les champs nécessaires
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) #si les données ne sont pas valides, on retourne les erreurs avec un statut 400 Bad Request

    data = serializer.validated_data #si les données sont valides, on les récupère à partir du serializer

    # Vérifier que email et nom_utilisateur sont uniques
    if Utilisateur.objects.filter(email=data['email']).exists():
        return Response({'email': 'Cet email est déjà utilisé.'}, status=400)
    if Utilisateur.objects.filter(nom_utilisateur=data['nom_utilisateur']).exists():
        return Response({'nom_utilisateur': 'Ce nom d\'utilisateur est déjà pris.'}, status=400)

    # Créer l'utilisateur
    user = Utilisateur.objects.create_user(
        email=data['email'],
        nom_utilisateur=data['nom_utilisateur'],
        nom=data['nom'],
        telephone=data['telephone'],
        password=data['password'],
    )

    if data['type_inscription'] == 'proprietaire':
        nom_foyer = data.get('nom_foyer') or f"Foyer de {data['nom']}"
        foyer = Foyer.objects.create(utilisateur=user, nom_foyer=nom_foyer, adresse='')
        token_appareil = f"GAZ-{uuid.uuid4().hex[:16].upper()}"
        Appareil.objects.create(
            foyer=foyer,
            token=token_appareil,
            statut='hors_ligne'
        )

        # Envoyer email de vérification automatiquement
        from core.models import TokenEmail
        token_verif = uuid.uuid4().hex
        TokenEmail.objects.create(
            utilisateur=user,
            token=token_verif,
            type_token='verification',
            date_expiration=timezone.now() + timedelta(hours=24)
        )
        lien = f"{settings.FRONTEND_URL}/verify-email?token={token_verif}"
        try:
            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from": "GazAlert CI <onboarding@resend.dev>",
                "to": [user.email],
                "subject": "GazAlert CI — Vérifiez votre adresse email",
                "html": f"<p>Bonjour {user.nom},</p><p>Bienvenue sur GazAlert CI !</p><p>Cliquez sur ce lien pour vérifier votre compte :<br><a href='{lien}'>{lien}</a></p><p>Ce lien expire dans 24 heures.</p><p>L'équipe GazAlert CI</p>",
            })
        except Exception:
            pass

        return Response({'message': 'Compte propriétaire créé avec succès.'}, status=201)

    else:  # famille avec code invitation
        code = data.get('code_invitation', '').strip().upper()

        from core.models import InvitationFoyer
        try:
            invitation = InvitationFoyer.objects.get(code=code)
        except InvitationFoyer.DoesNotExist:
            return Response({'code_invitation': 'Code d\'invitation invalide.'}, status=400)

        if not invitation.est_valide():
            return Response({'code_invitation': 'Code expiré ou déjà utilisé.'}, status=400)

        foyer = invitation.foyer
        proprietaire = foyer.utilisateur
        role_membre = Role.objects.filter(nom='membre').first()

        membre_existant = MembreFamille.objects.filter(foyer=foyer, utilisateur=user).first()

        if membre_existant:
            membre_existant.statut = 'en_attente'
            membre_existant.date_demande = timezone.now()
            membre_existant.save()
        else:
            MembreFamille.objects.create(
                foyer=foyer, utilisateur=user, role=role_membre, statut='en_attente'
            )

        # Consommer le code SEULEMENT après création réussie du membre
        invitation.est_consomme = True
        invitation.save()

        Notification.objects.create(
            utilisateur=proprietaire,
            type_notification='demande_approbation',
            message=f"{user.nom} souhaite rejoindre votre foyer."
        )

        return Response({'message': 'Demande envoyée. En attente d\'approbation.'}, status=201)


# ─── VÉRIFICATION NOM D'UTILISATEUR ──────────────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def verifier_proprietaire(request):
    nom_utilisateur = request.query_params.get('nom_utilisateur', '')
    existe = Utilisateur.objects.filter(nom_utilisateur=nom_utilisateur).exists()
    return Response({'existe': existe})


# ─── PROFIL UTILISATEUR ───────────────────────────────────────────────────────
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profil(request):
    if request.method == 'GET':
        serializer = UtilisateurSerializer(request.user)
        data = serializer.data
        foyer = Foyer.objects.filter(utilisateur=request.user).first()
        if foyer:
            data['role'] = 'proprietaire'
        else:
            membre = MembreFamille.objects.filter(
                utilisateur=request.user
            ).select_related('role').first()
            if membre:
                if membre.statut == 'en_attente':
                    data['role'] = 'en_attente'
                elif membre.statut == 'approuve':
                    data['role'] = membre.role.nom if membre.role else 'membre'
                elif membre.statut == 'desapprouve':
                    data['role'] = 'desapprouve'
                else:
                    data['role'] = None
            else:
                data['role'] = None
        data['is_verified'] = request.user.is_verified
        return Response(data)
    serializer = UtilisateurSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ─── FOYER ────────────────────────────────────────────────────────────────────
_CHAMPS_PROPRIETAIRE = {'nom_foyer', 'latitude', 'longitude', 'adresse_repere'}

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def mon_foyer(request):
    foyer, role = get_foyer_utilisateur(request.user)
    if not foyer:
        return Response({'detail': 'Aucun foyer trouvé.'}, status=404)
    if request.method == 'GET':
        return Response(FoyerSerializer(foyer).data)
    if _CHAMPS_PROPRIETAIRE.intersection(request.data.keys()) and role != 'proprietaire':
        return Response({'detail': 'Modification réservée au propriétaire du foyer.'}, status=403)
    if role == 'membre':
        return Response({'detail': 'Action non autorisée.'}, status=403)
    serializer = FoyerSerializer(foyer, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ─── ALERTES ──────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_alertes(request):
    foyer, role = get_foyer_utilisateur(request.user)
    if not foyer:
        return Response([], status=200)
    alertes = Alerte.objects.filter(foyer=foyer).order_by('-date_alerte')[:50]
    return Response(AlerteSerializer(alertes, many=True).data)

    

# ─── ALERTE DE L'ARDUINO ─────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def alerte_arduino(request):
    """Endpoint appelé par l'Arduino via ESP8266."""
    serializer = AlerteArduinoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    try:
        appareil = Appareil.objects.get(token=data['token'])
    except Appareil.DoesNotExist:
        return Response({'detail': 'Token invalide.'}, status=403)

    # Créer l'alerte
    alerte = Alerte.objects.create(
        foyer=appareil.foyer,
        niveau=data['niveau'],
        valeur_gaz=data['valeur_gaz'],
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        message_sms=data.get('message_sms', ''),
        sms_envoye=True,
    )

    # Mettre à jour l'appareil
    appareil.valeur_actuelle = data['valeur_gaz']
    appareil.statut = 'alerte_critique' if data['niveau'] == 'critique' else 'alerte_moderee'
    appareil.derniere_connexion = timezone.now()
    appareil.save()

    # Créer notifications pour le propriétaire et les membres approuvés
    utilisateurs_a_notifier = [appareil.foyer.utilisateur]
    membres = MembreFamille.objects.filter(foyer=appareil.foyer, statut='approuve')
    for m in membres:
        utilisateurs_a_notifier.append(m.utilisateur)

    for u in utilisateurs_a_notifier:
        Notification.objects.create(utilisateur=u, alerte=alerte)



    return Response({'message': 'Alerte enregistrée.', 'alerte_id': alerte.id}, status=201)

# ─── MISE À JOUR STATUT APPAREIL ─────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def mise_a_jour_appareil(request):
    """L'Arduino envoie ses valeurs régulièrement."""
    token = request.data.get('token')
    valeur = request.data.get('valeur_actuelle')
    statut = request.data.get('statut', 'normal')
    seuil_modere = request.data.get('seuil_modere')
    seuil_critique = request.data.get('seuil_critique')
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')

    try:
        appareil = Appareil.objects.get(token=token)

        if valeur is not None:
            appareil.valeur_actuelle = valeur
        if statut:
            appareil.statut = statut
        if seuil_modere is not None:
            appareil.seuil_modere = seuil_modere
        if seuil_critique is not None:
            appareil.seuil_critique = seuil_critique

        appareil.derniere_connexion = timezone.now()
        appareil.save()

        foyer = appareil.foyer
        if latitude is not None and longitude is not None:
            foyer.latitude = latitude
            foyer.longitude = longitude
            foyer.save(update_fields=['latitude', 'longitude'])

        # Résoudre automatiquement les alertes actives si retour à la normale
        if statut == 'normal':
            Alerte.objects.filter(foyer=foyer, est_resolue=False).update(est_resolue=True)

        return Response({
            'message': 'Mis à jour.',
            'adresse_repere': foyer.adresse_repere,
        })
    except Appareil.DoesNotExist:
        return Response({'detail': 'Token invalide.'}, status=403)

# ─── CONTACTS SMS ─────────────────────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def contacts(request):
    foyer, role = get_foyer_utilisateur(request.user)
    if not foyer:
        return Response({'detail': 'Aucun foyer.'}, status=404)
    if request.method == 'GET':
        return Response(ContactSerializer(foyer.contacts.all(), many=True).data)
    if role == 'membre':
        return Response({'detail': 'Action non autorisée pour un membre.'}, status=403)
    serializer = ContactSerializer(data={**request.data, 'foyer': foyer.id})
    if serializer.is_valid():
        serializer.save(foyer=foyer)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def contact_detail(request, pk):
    foyer, role = get_foyer_utilisateur(request.user)
    if role == 'membre':
        return Response({'detail': 'Action non autorisée pour un membre.'}, status=403)
    contact = get_object_or_404(Contact, pk=pk, foyer=foyer)
    if request.method == 'DELETE':
        contact.delete()
        return Response(status=204)
    serializer = ContactSerializer(contact, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ─── MEMBRES DE LA FAMILLE ────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def membres_famille(request):
    foyer, role = get_foyer_utilisateur(request.user)
    if not foyer:
        return Response([], status=200)
    membres = MembreFamille.objects.filter(foyer=foyer).select_related('utilisateur', 'role')
    return Response(MembreFamilleSerializer(membres, many=True).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def membre_action(request, pk):
    """Approuver, désapprouver ou changer le rôle d'un membre."""
    foyer, role = get_foyer_utilisateur(request.user)
    if role != 'proprietaire':
        return Response({'detail': 'Action réservée au propriétaire.'}, status=403)
    membre = get_object_or_404(MembreFamille, pk=pk, foyer=foyer)
    action = request.data.get('action')
    if action == 'approuver':
        membre.statut = 'approuve'
        membre.date_approbation = timezone.now()
    elif action == 'desapprouver':
        membre.statut = 'desapprouve'
    elif action == 'changer_role':
        role_id = request.data.get('role_id')
        role = get_object_or_404(Role, pk=role_id)
        membre.role = role
    else:
        return Response({'detail': 'Action invalide.'}, status=400)
    membre.save()
    return Response(MembreFamilleSerializer(membre).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def supprimer_membre(request, pk):
    foyer, role = get_foyer_utilisateur(request.user)
    if role != 'proprietaire':
        return Response({'detail': 'Action réservée au propriétaire.'}, status=403)
    membre = get_object_or_404(MembreFamille, pk=pk, foyer=foyer)
    membre.delete()
    return Response(status=204)


# ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_notifications(request):
    notifs = Notification.objects.filter(utilisateur=request.user).order_by('-date_envoi')[:20]
    return Response(NotificationSerializer(notifs, many=True).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def marquer_lue(request, pk):
    notif = get_object_or_404(Notification, pk=pk, utilisateur=request.user)
    notif.est_lue = True
    notif.save()
    return Response({'message': 'Marquée comme lue.'})


# ─── CONSEILS DE SÉCURITÉ ─────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def conseils_securite(request):
    conseils = ConseilSecurite.objects.filter(est_actif=True).order_by('ordre')
    return Response(ConseilSecuriteSerializer(conseils, many=True).data)


# ─── APPAREIL STATUT TEMPS RÉEL ───────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statut_appareil(request):
    foyer, role = get_foyer_utilisateur(request.user)
    if not foyer:
        return Response({'detail': 'Aucun foyer.'}, status=404)
    try:
        appareil = foyer.appareil
        data = AppareilSerializer(appareil).data

        # Si derniere_connexion > 60 secondes → hors ligne
        if appareil.derniere_connexion:
            delta = timezone.now() - appareil.derniere_connexion
            if delta.total_seconds() > 60:
                data['statut'] = 'hors_ligne'
        else:
            data['statut'] = 'hors_ligne'

        return Response(data)
    except Appareil.DoesNotExist:
        return Response({'detail': 'Aucun appareil configuré.'}, status=404)


# ─── VÉRIFICATION INACTIVITÉ APPAREIL ────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verifier_inactivite(request):
    foyer, role = get_foyer_utilisateur(request.user)
    if not foyer:
        return Response({'detail': 'Aucun foyer.'}, status=404)
    try:
        appareil = foyer.appareil
        if appareil.derniere_connexion:
            delta = timezone.now() - appareil.derniere_connexion
            if delta.total_seconds() > 120:
                notif_recente = Notification.objects.filter(
                    utilisateur=request.user,
                    type_notification='systeme_inactif',
                    date_envoi__gte=timezone.now() - timezone.timedelta(minutes=10)
                ).exists()
                if not notif_recente:
                    utilisateurs = [foyer.utilisateur]
                    membres = MembreFamille.objects.filter(foyer=foyer, statut='approuve')
                    for m in membres:
                        utilisateurs.append(m.utilisateur)
                    for u in utilisateurs:
                        Notification.objects.create(
                            utilisateur=u,
                            type_notification='systeme_inactif',
                            message="⚠️ Système inactif depuis plus de 2 minutes. Vérifiez la connexion WiFi de votre appareil ou l'alimentation du capteur."
                        )
                    return Response({'notifie': True})
        return Response({'notifie': False})
    except Appareil.DoesNotExist:
        return Response({'detail': 'Aucun appareil.'}, status=404)


# ─── ENVOYER EMAIL VÉRIFICATION ──────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def envoyer_verification_email(request):
    """Envoie un email de vérification à l'utilisateur connecté."""
    from core.models import TokenEmail

    if request.user.is_verified:
        return Response({'detail': 'Compte déjà vérifié.'}, status=400)

    TokenEmail.objects.filter(
        utilisateur=request.user, type_token='verification', est_utilise=False
    ).update(est_utilise=True)

    token = uuid.uuid4().hex
    expiration = timezone.now() + timedelta(hours=24)
    TokenEmail.objects.create(
        utilisateur=request.user, token=token,
        type_token='verification', date_expiration=expiration
    )

    lien = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": "GazAlert CI <onboarding@resend.dev>",
            "to": [request.user.email],
            "subject": "GazAlert CI — Vérifiez votre adresse email",
            "html": f"<p>Bonjour {request.user.nom},</p><p>Cliquez sur ce lien pour vérifier votre compte :<br><a href='{lien}'>{lien}</a></p><p>Ce lien expire dans 24 heures.</p><p>L'équipe GazAlert CI</p>",
        })
        return Response({'message': 'Email envoyé avec succès.'})
    except Exception:
        return Response({'detail': 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.'}, status=500)


# ─── VÉRIFIER EMAIL ───────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def verifier_email(request):
    """Valide le token de vérification et active le compte."""
    from core.models import TokenEmail

    token = request.data.get('token', '')

    try:
        token_obj = TokenEmail.objects.get(token=token, type_token='verification')
    except TokenEmail.DoesNotExist:
        return Response({'detail': 'Token invalide.'}, status=400)

    if not token_obj.est_valide():
        return Response({'detail': 'Token expiré ou déjà utilisé.'}, status=400)

    token_obj.utilisateur.is_verified = True
    token_obj.utilisateur.save()
    token_obj.est_utilise = True
    token_obj.save()

    return Response({'message': 'Email vérifié avec succès !'})


# ─── DEMANDER RÉINITIALISATION MDP ────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def demander_reinitialisation(request):
    """Envoie un email de réinitialisation de mot de passe."""
    from core.models import TokenEmail

    email = request.data.get('email', '')

    try:
        user = Utilisateur.objects.get(email=email)
    except Utilisateur.DoesNotExist:
        return Response({'message': 'Si cet email existe, un lien a été envoyé.'})

    TokenEmail.objects.filter(
        utilisateur=user, type_token='reinitialisation', est_utilise=False
    ).update(est_utilise=True)

    token = uuid.uuid4().hex
    expiration = timezone.now() + timedelta(minutes=15)
    TokenEmail.objects.create(
        utilisateur=user, token=token,
        type_token='reinitialisation', date_expiration=expiration
    )

    lien = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": "GazAlert CI <onboarding@resend.dev>",
            "to": [user.email],
            "subject": "GazAlert CI — Réinitialisation de mot de passe",
            "html": f"<p>Bonjour {user.nom},</p><p>Cliquez sur ce lien pour réinitialiser votre mot de passe :<br><a href='{lien}'>{lien}</a></p><p>Ce lien expire dans 15 minutes.</p><p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p><p>L'équipe GazAlert CI</p>",
        })
    except Exception:
        pass

    return Response({'message': 'Si cet email existe, un lien a été envoyé.'})


# ─── RÉINITIALISER MDP ────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def reinitialiser_mot_de_passe(request):
    """Valide le token et réinitialise le mot de passe."""
    from core.models import TokenEmail

    token = request.data.get('token', '')
    nouveau_mdp = request.data.get('nouveau_mot_de_passe', '')

    if len(nouveau_mdp) < 6:
        return Response({'detail': 'Le mot de passe doit contenir au moins 6 caractères.'}, status=400)

    try:
        token_obj = TokenEmail.objects.get(token=token, type_token='reinitialisation')
    except TokenEmail.DoesNotExist:
        return Response({'detail': 'Token invalide.'}, status=400)

    if not token_obj.est_valide():
        return Response({'detail': 'Token expiré ou déjà utilisé.'}, status=400)

    token_obj.utilisateur.set_password(nouveau_mdp)
    token_obj.utilisateur.save()
    token_obj.est_utilise = True
    token_obj.save()

    return Response({'message': 'Mot de passe réinitialisé avec succès.'})


# ─── CHANGER MOT DE PASSE ────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def changer_mot_de_passe(request):
    ancien_mdp = request.data.get('ancien_mot_de_passe')
    nouveau_mdp = request.data.get('nouveau_mot_de_passe')

    if not ancien_mdp or not nouveau_mdp:
        return Response({'detail': 'Ancien et nouveau mot de passe requis.'}, status=400)

    if len(nouveau_mdp) < 6:
        return Response({'detail': 'Le nouveau mot de passe doit contenir au moins 6 caractères.'}, status=400)

    if not request.user.check_password(ancien_mdp):
        return Response({'detail': 'Ancien mot de passe incorrect.'}, status=400)

    request.user.set_password(nouveau_mdp)
    request.user.save()
    return Response({'message': 'Mot de passe modifié avec succès.'})


# ─── GÉNÉRER CODE INVITATION ─────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generer_invitation(request):
    """Le propriétaire génère un code d'invitation unique valable 24h."""
    foyer = Foyer.objects.filter(utilisateur=request.user).first()
    if not foyer:
        return Response({'detail': 'Vous n\'êtes pas propriétaire d\'un foyer.'}, status=403)

    from core.models import InvitationFoyer
    code = f"GAZ-{uuid.uuid4().hex[:6].upper()}"
    expiration = timezone.now() + timedelta(hours=24)

    invitation = InvitationFoyer.objects.create(
        foyer=foyer, code=code, date_expiration=expiration
    )

    return Response({
        'code': invitation.code,
        'expire_le': invitation.date_expiration.strftime('%d/%m/%Y à %Hh%M')
    }, status=201)


# ─── VALIDER CODE INVITATION ─────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def valider_invitation(request):
    """Vérifie qu'un code est valide — NE consomme PAS le code."""
    code = request.data.get('code', '').strip().upper()

    from core.models import InvitationFoyer
    try:
        invitation = InvitationFoyer.objects.get(code=code)
        if not invitation.est_valide():
            return Response({'detail': 'Code expiré ou déjà utilisé.'}, status=400)
        return Response({
            'valide': True,
            'foyer': invitation.foyer.nom_foyer,
            'proprietaire': invitation.foyer.utilisateur.nom
        })
    except InvitationFoyer.DoesNotExist:
        return Response({'detail': 'Code invalide.'}, status=404)


# ─── REJOINDRE UN FOYER ───────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rejoindre_foyer(request):
    """Permet à un membre sans foyer de rejoindre avec un code d'invitation."""
    code = request.data.get('code_invitation', '').strip().upper()

    if Foyer.objects.filter(utilisateur=request.user).exists():
        return Response({'detail': 'Vous êtes déjà propriétaire d\'un foyer.'}, status=400)

    demande_existante = MembreFamille.objects.filter(
        utilisateur=request.user, statut='en_attente'
    ).first()
    if demande_existante:
        return Response({'detail': 'Vous avez déjà une demande en attente.'}, status=400)

    from core.models import InvitationFoyer
    try:
        invitation = InvitationFoyer.objects.get(code=code)
    except InvitationFoyer.DoesNotExist:
        return Response({'detail': 'Code invalide.'}, status=404)

    if not invitation.est_valide():
        return Response({'detail': 'Code expiré ou déjà utilisé. Demandez un nouveau code au propriétaire.'}, status=400)

    foyer = invitation.foyer
    role_membre = Role.objects.filter(nom='membre').first()

    membre_existant = MembreFamille.objects.filter(foyer=foyer, utilisateur=request.user).first()

    if membre_existant:
        membre_existant.statut = 'en_attente'
        membre_existant.date_demande = timezone.now()
        membre_existant.save()
    else:
        MembreFamille.objects.create(
            foyer=foyer, utilisateur=request.user, role=role_membre, statut='en_attente'
        )

    # Consommer le code SEULEMENT après création réussie
    invitation.est_consomme = True
    invitation.save()

    Notification.objects.create(
        utilisateur=foyer.utilisateur,
        type_notification='demande_approbation',
        message=f"{request.user.nom} souhaite rejoindre votre foyer."
    )

    return Response({'message': 'Demande envoyée avec succès.'})


# ─── ROLES ────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def roles(request):
    return Response(RoleSerializer(Role.objects.all(), many=True).data)
