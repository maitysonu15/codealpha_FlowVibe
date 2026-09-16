from django.db import models
from django.contrib.auth.models import User
import hashlib

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, default='')
    role_title = models.CharField(max_length=100, blank=True, default='Team Member')
    avatar_color = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.avatar_color:
            # Deterministic pleasant color from username
            colors = [
                '#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', 
                '#10B981', '#F59E0B', '#EF4444', '#14B8A6',
                '#06B6D4', '#84CC16', '#F97316', '#A855F7'
            ]
            hash_val = int(hashlib.md5(self.user.username.encode('utf-8')).hexdigest(), 16)
            self.avatar_color = colors[hash_val % len(colors)]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username}'s Profile"
