from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, dashboard

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", dashboard, name="dashboard"),
]
