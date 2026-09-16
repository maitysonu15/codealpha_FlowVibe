from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'created_at', 'updated_at']
    search_fields = ['name', 'description', 'owner__username']
    list_filter = ['created_at', 'updated_at']
    filter_horizontal = ['members']
