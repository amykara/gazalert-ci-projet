# GazAlert CI — Projet Complet

## Structure
```
gazalert_project/
├── backend/          ← Django (API)
│   ├── manage.py
│   ├── gazalert_backend/  ← Configuration Django
│   ├── core/         ← Modèles (BD)
│   └── api/          ← Vues et endpoints REST
├── frontend/         ← React (template Lovable)
│   └── gazalert-ci-home/
├── .env              ← Variables d'environnement
└── requirements.txt  ← Dépendances Python
```

## Installation

### 1. Environnement virtuel Python
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
```

### 2. Base de données MySQL (XAMPP)
- Démarrer XAMPP (Apache + MySQL)
- Aller sur http://localhost/phpmyadmin
- Créer une base de données nommée `gazalert_db`
- Modifier le fichier `.env` si nécessaire

### 3. Migrations Django
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py loaddata core/fixtures/roles.json
python manage.py loaddata core/fixtures/conseils.json
python manage.py createsuperuser
```

### 4. Lancer le serveur Django
```bash
python manage.py runserver
```
→ API disponible sur http://localhost:8000/api/

### 5. Lancer le frontend React
```bash
cd frontend/gazalert-ci-home
npm install
npm run dev
```
→ Application disponible sur http://localhost:8080/

## Endpoints API principaux

| Méthode | URL | Description |
|---------|-----|-------------|
| POST | /api/auth/login/ | Connexion (retourne JWT) |
| POST | /api/auth/inscription/ | Créer un compte |
| GET | /api/auth/verifier-proprietaire/ | Vérifier un nom d'utilisateur |
| GET | /api/profil/ | Profil utilisateur |
| GET | /api/foyer/ | Informations du foyer |
| GET | /api/alertes/ | Historique des alertes |
| POST | /api/appareil/alerte/ | Recevoir alerte Arduino |
| POST | /api/appareil/mise-a-jour/ | Mise à jour valeur capteur |
| GET/POST | /api/contacts/ | Contacts SMS |
| GET | /api/famille/ | Membres de la famille |
| PUT | /api/famille/<id>/action/ | Approuver/désapprouver/changer rôle |
| GET | /api/notifications/ | Notifications |
| GET | /api/conseils/ | Conseils de sécurité |

## Code Arduino (ESP8266)
Pour envoyer une alerte depuis l'Arduino, faire un POST sur :
```
POST http://VOTRE_IP:8000/api/appareil/alerte/
{
  "token": "VOTRE_TOKEN_APPAREIL",
  "niveau": "critique",
  "valeur_gaz": 812,
  "latitude": 5.3449,
  "longitude": -4.0620,
  "message_sms": "FUITE GAZ!"
}
```
