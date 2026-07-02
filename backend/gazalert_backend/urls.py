from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.admin_views import carte_foyers, statistiques_alertes, tableau_de_bord

urlpatterns = [
    path('admin/tableau-de-bord/', admin.site.admin_view(tableau_de_bord), name='admin_tableau_de_bord'),
    path('admin/carte-foyers/', admin.site.admin_view(carte_foyers), name='admin_carte_foyers'),
    path('admin/statistiques-alertes/', admin.site.admin_view(statistiques_alertes), name='admin_statistiques_alertes'),
    path('admin/', admin.site.urls),
    # JWT Auth
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # API
    path('api/', include('api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
