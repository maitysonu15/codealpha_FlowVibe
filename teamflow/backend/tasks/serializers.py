from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date
from .models import Task
from users.serializers import UserSerializer

class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assigned_to',
        allow_null=True,
        required=False,
        write_only=True
    )
    created_by = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    comments_count = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'project_name', 'title', 'description',
            'status', 'status_display', 'priority', 'priority_display',
            'due_date', 'assigned_to', 'assigned_to_id', 'created_by',
            'order', 'comments_count', 'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_overdue(self, obj):
        if obj.due_date and obj.status != 'DONE':
            return obj.due_date < timezone.now().date()
        return False

    def validate(self, attrs):
        project = attrs.get('project') or (self.instance.project if self.instance else None)
        assigned_to = attrs.get('assigned_to')
        if project and assigned_to and not project.is_member(assigned_to):
            raise serializers.ValidationError({
                'assigned_to_id': 'Assigned user must be a member of this project.'
            })
        return attrs


class TaskStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['status', 'order']
