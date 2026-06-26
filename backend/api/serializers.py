from rest_framework import serializers
from core.models import (
    Utilisateur, Foyer, Appareil, Alerte,
    Contact, Role, MembreFamille, Notification, ConseilSecurite
)


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ('id', 'nom', 'email', 'nom_utilisateur', 'telephone', 'date_inscription', 'is_verified')
        read_only_fields = ('id', 'date_inscription', 'is_verified', 'email', 'nom_utilisateur')


class FoyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Foyer
        fields = '__all__'
        read_only_fields = ('id', 'date_creation', 'utilisateur')
        extra_kwargs = {
            'adresse': {'allow_blank': True},
        }


class AppareilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appareil
        fields = '__all__'
        read_only_fields = ('id',)


class AlerteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alerte
        fields = '__all__'
        read_only_fields = ('id', 'date_alerte')


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ('id', 'date_ajout')


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class MembreFamilleSerializer(serializers.ModelSerializer):
    utilisateur_detail = UtilisateurSerializer(source='utilisateur', read_only=True)
    role_detail = RoleSerializer(source='role', read_only=True)

    class Meta:
        model = MembreFamille
        fields = '__all__'
        read_only_fields = ('id', 'date_demande')


class NotificationSerializer(serializers.ModelSerializer):
    alerte_detail = AlerteSerializer(source='alerte', read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('id', 'date_envoi')


class ConseilSecuriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConseilSecurite
        fields = '__all__'


# ─── INSCRIPTION ──────────────────────────────────────────────────────────────
class InscriptionSerializer(serializers.Serializer):
    """Gère les deux types d'inscription : propriétaire et famille."""
    nom = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    nom_utilisateur = serializers.CharField(max_length=50)
    telephone = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=6)
    type_inscription = serializers.ChoiceField(choices=['proprietaire', 'famille'])
    # Seulement pour type 'famille'
    code_invitation = serializers.CharField(max_length=20, required=False, allow_blank=True)
    # Seulement pour type 'proprietaire'
    nom_foyer = serializers.CharField(max_length=100, required=False, allow_blank=True)


# ─── ALERTE ARDUINO ───────────────────────────────────────────────────────────
class AlerteArduinoSerializer(serializers.Serializer):
    """Données envoyées par l'Arduino via ESP8266."""
    token = serializers.CharField()
    niveau = serializers.ChoiceField(choices=['moderee', 'critique'])
    valeur_gaz = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    message_sms = serializers.CharField(required=False, allow_blank=True)
