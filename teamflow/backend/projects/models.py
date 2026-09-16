from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    CATEGORY_CHOICES = [
        ('PRODUCT', 'Product & Engineering'),
        ('DESIGN', 'UI/UX & Brand Design'),
        ('MARKETING', 'Marketing & Growth'),
        ('OPERATIONS', 'Client & Operations'),
        ('INFRA', 'Security & Infrastructure'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active / In Progress'),
        ('PLANNING', 'Planning & Discovery'),
        ('ON_HOLD', 'On Hold / Paused'),
        ('COMPLETED', 'Completed / Shipped'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='PRODUCT')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='ACTIVE')
    color = models.CharField(max_length=20, default='#6366F1')
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_projects'
    )
    members = models.ManyToManyField(
        User,
        related_name='projects',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name

    def is_owner(self, user):
        return self.owner == user

    def is_member(self, user):
        if not user or not user.is_authenticated:
            return False
        return self.owner == user or self.members.filter(id=user.id).exists()
