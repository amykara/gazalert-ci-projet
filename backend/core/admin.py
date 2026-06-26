from datetime import timedelta
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import (
    Utilisateur, Foyer, Appareil, Alerte,
    Contact, Role, MembreFamille, Notification, ConseilSecurite,
    InvitationFoyer, TokenEmail
)


class FoyerStatutAppareilFilter(admin.SimpleListFilter):
    title = 'Statut appareil'
    parameter_name = 'statut_appareil'

    def lookups(self, request, model_admin):
        return [
            ('actif', 'En ligne (actif)'),
            ('inactif', 'Hors ligne (inactif)'),
        ]

    def queryset(self, request, queryset):
        seuil = timezone.now() - timedelta(seconds=60)
        if self.value() == 'actif':
            return queryset.filter(appareil__derniere_connexion__gte=seuil)
        if self.value() == 'inactif':
            return queryset.exclude(appareil__derniere_connexion__gte=seuil)
        return queryset

@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ('email', 'nom', 'nom_utilisateur', 'telephone', 'est_actif', 'date_inscription')
    list_filter = ('est_actif', 'is_staff')
    search_fields = ('email', 'nom', 'nom_utilisateur')
    ordering = ('-date_inscription',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informations', {'fields': ('nom', 'nom_utilisateur', 'telephone')}),
        ('Permissions', {'fields': ('est_actif', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nom_utilisateur', 'nom', 'telephone', 'password1', 'password2'),
        }),
    )

@admin.register(Foyer)
class FoyerAdmin(admin.ModelAdmin):
    list_display = ('nom_foyer', 'utilisateur', 'adresse', 'latitude', 'longitude', 'adresse_repere', 'statut_appareil', 'date_creation')
    search_fields = ('nom_foyer', 'adresse', 'adresse_repere')
    list_filter = (FoyerStatutAppareilFilter,)

    @admin.display(description='Statut appareil')
    def statut_appareil(self, obj):
        try:
            appareil = obj.appareil
            if appareil.derniere_connexion:
                delta = timezone.now() - appareil.derniere_connexion
                if delta.total_seconds() <= 60:
                    return '🟢 En ligne'
            return '🔴 Hors ligne'
        except Exception:
            return '⚪ Aucun appareil'

@admin.register(Appareil)
class AppareilAdmin(admin.ModelAdmin):
    list_display = ('foyer', 'token', 'statut', 'valeur_actuelle', 'est_actif', 'derniere_connexion')
    list_filter = ('statut', 'est_actif')

@admin.register(Alerte)
class AlerteAdmin(admin.ModelAdmin):
    list_display = ('foyer', 'niveau', 'valeur_gaz', 'date_alerte', 'est_resolue', 'sms_envoye')
    list_filter = ('niveau', 'est_resolue', 'sms_envoye')
    ordering = ('-date_alerte',)

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('nom', 'telephone', 'foyer', 'est_actif', 'date_ajout')

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('nom', 'peut_voir_historique', 'peut_modifier_contacts', 'peut_modifier_foyer', 'peut_gerer_membres')

@admin.register(MembreFamille)
class MembreFamilleAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'foyer', 'role', 'statut', 'date_demande')
    list_filter = ('statut', 'role')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'alerte', 'est_lue', 'date_envoi')
    list_filter = ('est_lue',)

@admin.register(ConseilSecurite)
class ConseilSecuriteAdmin(admin.ModelAdmin):
    list_display = ('titre', 'ordre', 'est_actif')
    list_editable = ('ordre', 'est_actif')
    ordering = ('ordre',)

@admin.register(InvitationFoyer)
class InvitationFoyerAdmin(admin.ModelAdmin):
    list_display = ('code', 'foyer', 'date_creation', 'date_expiration', 'est_consomme')
    list_filter = ('est_consomme',)

@admin.register(TokenEmail)
class TokenEmailAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'type_token', 'date_expiration', 'est_utilise')
    list_filter = ('type_token', 'est_utilise')
