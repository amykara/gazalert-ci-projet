#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py loaddata core/fixtures/roles.json
python manage.py loaddata core/fixtures/conseils.json

echo "DEBUG bash: EMAIL=${DJANGO_SUPERUSER_EMAIL:-NOT_SET}"
echo "DEBUG bash: USERNAME=${DJANGO_SUPERUSER_USERNAME:-NOT_SET}"
echo "DEBUG bash: PASSWORD set=$([ -n "$DJANGO_SUPERUSER_PASSWORD" ] && echo YES || echo NO)"

python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
nom_utilisateur = os.environ.get('DJANGO_SUPERUSER_USERNAME')
nom = os.environ.get('DJANGO_SUPERUSER_NOM', 'Admin')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if not email or not password:
    print('Variables manquantes.')
else:
    user = User.objects.filter(email=email).first()
    if user:
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        print(f'Utilisateur existant promu superutilisateur: {email}')
    else:
        User.objects.create_superuser(email=email, nom_utilisateur=nom_utilisateur, password=password, nom=nom)
        print(f'Superutilisateur cree: {email}')
"

python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
print('=== SUPERUSERS EXISTANTS ===')
for u in User.objects.filter(is_superuser=True):
    print(f'Email: {u.email}, Nom utilisateur: {u.nom_utilisateur}')
print('=== FIN ===')
"
