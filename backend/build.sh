#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py loaddata core/fixtures/roles.json
python manage.py loaddata core/fixtures/conseils.json

if [ "$SEED_DEMO_DATA" = "true" ]; then
    echo "SEED_DEMO_DATA=true détecté — génération des données démo..."
    python manage.py seed_demo_data
fi

python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
nom_utilisateur = os.environ.get('DJANGO_SUPERUSER_USERNAME')
nom = os.environ.get('DJANGO_SUPERUSER_NOM', 'Admin')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if not email or not password:
    print('Variables superutilisateur non configurees, creation ignoree.')
else:
    try:
        user = User.objects.filter(email=email).first() or User.objects.filter(nom_utilisateur=nom_utilisateur).first()
        if user:
            user.email = email
            user.nom_utilisateur = nom_utilisateur
            user.is_staff = True
            user.is_superuser = True
            user.set_password(password)
            user.save()
            print('Superutilisateur mis a jour.')
        else:
            User.objects.create_superuser(email=email, nom_utilisateur=nom_utilisateur, password=password, nom=nom)
            print('Superutilisateur cree.')
    except Exception as e:
        print(f'Avertissement superutilisateur: {e}')
"
