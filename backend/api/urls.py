from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Authentification
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/inscription/', views.inscription, name='inscription'),
    path('auth/verifier-proprietaire/', views.verifier_proprietaire, name='verifier_proprietaire'),
    path('auth/changer-mot-de-passe/', views.changer_mot_de_passe, name='changer_mot_de_passe'),
    path('auth/envoyer-verification/', views.envoyer_verification_email, name='envoyer_verification'),
    path('auth/verifier-email/', views.verifier_email, name='verifier_email'),
    path('auth/demander-reinitialisation/', views.demander_reinitialisation, name='demander_reinitialisation'),
    path('auth/reinitialiser-mot-de-passe/', views.reinitialiser_mot_de_passe, name='reinitialiser_mot_de_passe'),

    # Profil
    path('profil/', views.profil, name='profil'),

    # Foyer
    path('foyer/', views.mon_foyer, name='mon_foyer'),

    # Appareil
    path('appareil/statut/', views.statut_appareil, name='statut_appareil'),
    path('appareil/alerte/', views.alerte_arduino, name='alerte_arduino'),
    path('appareil/mise-a-jour/', views.mise_a_jour_appareil, name='mise_a_jour_appareil'),
    path('appareil/verifier-inactivite/', views.verifier_inactivite, name='verifier_inactivite'),

    # Alertes
    path('alertes/', views.mes_alertes, name='mes_alertes'),

    # Contacts SMS
    path('contacts/', views.contacts, name='contacts'),
    path('contacts/<int:pk>/', views.contact_detail, name='contact_detail'),

    # Famille
    path('famille/generer-invitation/', views.generer_invitation, name='generer_invitation'),
    path('famille/valider-invitation/', views.valider_invitation, name='valider_invitation'),
    path('famille/rejoindre/', views.rejoindre_foyer, name='rejoindre_foyer'),
    path('famille/', views.membres_famille, name='membres_famille'),
    path('famille/<int:pk>/action/', views.membre_action, name='membre_action'),
    path('famille/<int:pk>/supprimer/', views.supprimer_membre, name='supprimer_membre'),

    # Notifications
    path('notifications/', views.mes_notifications, name='mes_notifications'),
    path('notifications/<int:pk>/lire/', views.marquer_lue, name='marquer_lue'),

    # Conseils sécurité
    path('conseils/', views.conseils_securite, name='conseils_securite'),

    # Rôles
    path('roles/', views.roles, name='roles'),
]