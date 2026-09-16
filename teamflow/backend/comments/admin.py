from django.contrib import admin
from .models import Comment

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'task', 'content_preview', 'created_at']
    search_fields = ['content', 'author__username', 'task__title']
    list_filter = ['created_at']

    def content_preview(self, obj):
        return obj.content[:50] + ('...' if len(obj.content) > 50 else '')
    content_preview.short_description = 'Content'
