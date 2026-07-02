import os
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-changez-cette-cle-en-production')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'core',
    'api',
]

JAZZMIN_SETTINGS = {
    "site_title": "GazAlert CI Admin",
    "site_header": "GazAlert CI",
    "site_brand": "GazAlert CI",
    "welcome_sign": "Bienvenue sur l'administration GazAlert CI",
    "copyright": "GazAlert CI",
    "show_sidebar": True,
    "navigation_expanded": True,
    "icons": {
        "core": "fas fa-shield-alt",
        "core.utilisateur": "fas fa-user",
        "core.foyer": "fas fa-home",
        "core.appareil": "fas fa-microchip",
        "core.alerte": "fas fa-exclamation-triangle",
        "core.contact": "fas fa-address-book",
        "core.role": "fas fa-shield-alt",
        "core.membrefamille": "fas fa-users",
        "core.notification": "fas fa-bell",
        "core.conseilsecurite": "fas fa-info-circle",
        "core.invitationfoyer": "fas fa-envelope",
        "auth": "fas fa-users-cog",
    },
    "topmenu_links": [
        {"name": "Tableau de bord", "url": "admin:index"},
        {"name": "Carte des foyers", "url": "admin_carte_foyers", "icon": "fas fa-map-marked-alt"},
        {"name": "Statistiques alertes", "url": "admin_statistiques_alertes", "icon": "fas fa-chart-bar"},
    ],
    "custom_links": {
        "core": [
            {
                "name": "Carte des foyers",
                "url": "admin_carte_foyers",
                "icon": "fas fa-map-marked-alt",
            },
            {
                "name": "Statistiques alertes",
                "url": "admin_statistiques_alertes",
                "icon": "fas fa-chart-bar",
            },
        ]
    },
    "order_with_respect_to": [
        "core",
        "core.foyer",
        "core.appareil",
        "core.alerte",
        "core.contact",
        "core.utilisateur",
        "core.membrefamille",
    ],
    "custom_css": "css/admin-custom.css",
}

JAZZMIN_UI_TWEAKS = {
    "theme": "flatly",
    "default_theme_mode": "light",
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'gazalert_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'gazalert_backend.wsgi.application'

import dj_database_url as _dj_db_url
_DATABASE_URL = config('DATABASE_URL', default=None)
if _DATABASE_URL:
    DATABASES = {'default': _dj_db_url.parse(_DATABASE_URL)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='gazalert_db'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {
                'client_encoding': 'UTF8',
            },
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Abidjan'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}



from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=365),
    'ROTATE_REFRESH_TOKENS': True,
}
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://10.251.8.246:8080",
    "http://10.232.115.176:8080",
    "http://172.30.80.176:8080",
    "http://192.168.126.1:8080",
    "https://gazalert-ci-projet-lls9u9t42-gaz-alert.vercel.app",
    "https://gazalert-ci-projet.missdiana944.workers.dev",
]
CORS_ALLOW_CREDENTIALS = True

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = f'GazAlert CI <{config("EMAIL_HOST_USER", default="")}>'
RESEND_API_KEY = config('RESEND_API_KEY', default='')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:8080')
AUTH_USER_MODEL = 'core.Utilisateur'
