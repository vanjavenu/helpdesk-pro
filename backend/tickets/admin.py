from django.contrib import admin
from .models import Ticket

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "requester", "priority", "status", "created_at")
    list_filter = ("status", "priority", "category")
    search_fields = ("title", "requester", "email")
