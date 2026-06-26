from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


# ─── MANAGER UTILISATEUR ──────────────────────────────────────────────────────
class UtilisateurManager(BaseUserManager):
    def create_user(self, email, nom_utilisateur, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, nom_utilisateur=nom_utilisateur, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nom_utilisateur, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, nom_utilisateur, password, **extra_fields)


# ─── UTILISATEUR ──────────────────────────────────────────────────────────────
class Utilisateur(AbstractBaseUser, PermissionsMixin):
    nom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    nom_utilisateur = models.CharField(max_length=50, unique=True)
    telephone = models.CharField(max_length=20)
    date_inscription = models.DateTimeField(auto_now_add=True)
    est_actif = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    objects = UtilisateurManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom_utilisateur', 'nom']

    class Meta:
        db_table = 'utilisateur'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.nom} ({self.email})"


# ─── FOYER ────────────────────────────────────────────────────────────────────
class Foyer(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='foyers')
    nom_foyer = models.CharField(max_length=100)
    adresse = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    adresse_repere = models.CharField(max_length=255, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'foyer'
        verbose_name = 'Foyer'

    def __str__(self):
        return f"{self.nom_foyer} — {self.utilisateur.nom}"


# ─── APPAREIL ─────────────────────────────────────────────────────────────────
class Appareil(models.Model):
    STATUT_CHOICES = [
        ('normal', 'Normal'),
        ('prechauffage', 'Préchauffage'),
        ('alerte_moderee', 'Alerte modérée'),
        ('alerte_critique', 'Alerte critique'),
    ]

    foyer = models.OneToOneField(Foyer, on_delete=models.CASCADE, related_name='appareil')
    token = models.CharField(max_length=255, unique=True)
    derniere_connexion = models.DateTimeField(null=True, blank=True)
    est_actif = models.BooleanField(default=True)
    valeur_actuelle = models.IntegerField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='normal')
    seuil_modere = models.IntegerField(default=200)
    seuil_critique = models.IntegerField(default=400)

    class Meta:
        db_table = 'appareil'
        verbose_name = 'Appareil'

    def __str__(self):
        return f"Appareil — {self.foyer.nom_foyer}"


# ─── ALERTE ───────────────────────────────────────────────────────────────────
class Alerte(models.Model):
    NIVEAU_CHOICES = [
        ('moderee', 'Modérée'),
        ('critique', 'Critique'),
    ]

    foyer = models.ForeignKey(Foyer, on_delete=models.CASCADE, related_name='alertes')
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES)
    valeur_gaz = models.IntegerField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    date_alerte = models.DateTimeField(auto_now_add=True)
    est_resolue = models.BooleanField(default=False)
    message_sms = models.TextField(null=True, blank=True)
    sms_envoye = models.BooleanField(default=False)

    class Meta:
        db_table = 'alerte'
        verbose_name = 'Alerte'
        ordering = ['-date_alerte']

    def __str__(self):
        return f"Alerte {self.niveau} — {self.foyer.nom_foyer} — {self.date_alerte}"


# ─── CONTACT SMS ──────────────────────────────────────────────────────────────
class Contact(models.Model):
    foyer = models.ForeignKey(Foyer, on_delete=models.CASCADE, related_name='contacts')
    nom = models.CharField(max_length=100)
    telephone = models.CharField(max_length=20)
    est_actif = models.BooleanField(default=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact'
        verbose_name = 'Contact SMS'

    def __str__(self):
        return f"{self.nom} — {self.telephone}"


# ─── ROLE ─────────────────────────────────────────────────────────────────────
class Role(models.Model):
    nom = models.CharField(max_length=50, unique=True)
    peut_voir_historique = models.BooleanField(default=True)
    peut_voir_tableau_bord = models.BooleanField(default=True)
    peut_modifier_contacts = models.BooleanField(default=False)
    peut_modifier_foyer = models.BooleanField(default=False)
    peut_gerer_membres = models.BooleanField(default=False)

    class Meta:
        db_table = 'role'
        verbose_name = 'Rôle'

    def __str__(self):
        return self.nom


# ─── MEMBRE FAMILLE ───────────────────────────────────────────────────────────
class MembreFamille(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('approuve', 'Approuvé'),
        ('refuse', 'Refusé'),
        ('desapprouve', 'Désapprouvé'),
    ]

    foyer = models.ForeignKey(Foyer, on_delete=models.CASCADE, related_name='membres')
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='memberships')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    date_demande = models.DateTimeField(auto_now_add=True)
    date_approbation = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'membre_famille'
        verbose_name = 'Membre de la famille'
        unique_together = ('foyer', 'utilisateur')

    def __str__(self):
        return f"{self.utilisateur.nom} → {self.foyer.nom_foyer} ({self.statut})"


# ─── NOTIFICATION ─────────────────────────────────────────────────────────────
class Notification(models.Model):
    TYPE_CHOICES = [
        ('alerte_gaz', 'Alerte gaz'),
        ('systeme_inactif', 'Système inactif'),
        ('demande_approbation', 'Demande d\'approbation'),
    ]

    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='notifications')
    alerte = models.ForeignKey(Alerte, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    type_notification = models.CharField(max_length=30, choices=TYPE_CHOICES, default='alerte_gaz')
    message = models.TextField(null=True, blank=True)
    est_lue = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notification'
        verbose_name = 'Notification'
        ordering = ['-date_envoi']

    def __str__(self):
        return f"Notif → {self.utilisateur.nom} ({self.type_notification})"


# ─── CONSEIL DE SÉCURITÉ ──────────────────────────────────────────────────────
class ConseilSecurite(models.Model):
    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    icone = models.CharField(max_length=50, null=True, blank=True)
    ordre = models.IntegerField(default=0)
    est_actif = models.BooleanField(default=True)

    class Meta:
        db_table = 'conseil_securite'
        verbose_name = 'Conseil de sécurité'
        ordering = ['ordre']

    def __str__(self):
        return self.titre


# ─── INVITATION FOYER ─────────────────────────────────────────────────────────
class InvitationFoyer(models.Model):
    foyer = models.ForeignKey(Foyer, on_delete=models.CASCADE, related_name='invitations')
    code = models.CharField(max_length=20, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField()
    est_consomme = models.BooleanField(default=False)

    class Meta:
        db_table = 'invitation_foyer'
        verbose_name = 'Invitation Foyer'

    def __str__(self):
        return f"Invitation {self.code} — {self.foyer.nom_foyer}"

    def est_valide(self):
        from django.utils import timezone
        return not self.est_consomme and self.date_expiration > timezone.now()


# ─── TOKEN EMAIL ──────────────────────────────────────────────────────────────
class TokenEmail(models.Model):
    TYPE_CHOICES = [
        ('verification', 'Vérification'),
        ('reinitialisation', 'Réinitialisation'),
    ]
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='tokens_email')
    token = models.CharField(max_length=64, unique=True)
    type_token = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date_expiration = models.DateTimeField()
    est_utilise = models.BooleanField(default=False)

    class Meta:
        db_table = 'token_email'

    def est_valide(self):
        from django.utils import timezone
        return not self.est_utilise and self.date_expiration > timezone.now()
