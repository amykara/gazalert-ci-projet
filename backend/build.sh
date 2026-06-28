#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py loaddata core/fixtures/roles.json
python manage.py loaddata core/fixtures/conseils.json

python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
nom_utilisateur = os.environ.get('DJANGO_SUPERUSER_USERNAME')
nom = os.environ.get('DJANGO_SUPERUSER_NOM', 'Admin')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if email and password and not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, nom_utilisateur=nom_utilisateur, password=password, nom=nom)
    print('Superutilisateur cree.')
else:
    print('Superutilisateur deja existant ou variables manquantes.')
"

python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
print('=== SUPERUSERS EXISTANTS ===')
for u in User.objects.filter(is_superuser=True):
    print(f'Email: {u.email}, Nom utilisateur: {u.nom_utilisateur}')
print('=== FIN ===')
"
