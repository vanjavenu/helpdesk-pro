from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Ticket
from .serializers import TicketSerializer

class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    queryset = Ticket.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        search = self.request.query_params.get("search")
        if status:
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(requester__icontains=search) |
                Q(email__icontains=search)
            )
        return qs

@api_view(["GET"])
def dashboard(request):
    tickets = Ticket.objects.all()
    return Response({
        "total": tickets.count(),
        "open": tickets.filter(status="OPEN").count(),
        "in_progress": tickets.filter(status="IN_PROGRESS").count(),
        "resolved": tickets.filter(status="RESOLVED").count(),
        "urgent": tickets.filter(priority="URGENT").count(),
    })
