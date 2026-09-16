from django.contrib import admin
from .models import Task

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'status', 'priority', 'assigned_to', 'due_date', 'created_at']
    list_filter = ['status', 'priority', 'project', 'due_date']
    search_fields = ['title', 'description', 'project__name', 'assigned_to__username']
