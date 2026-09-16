from rest_framework import serializers
from django.contrib.auth.models import User
from users.serializers import UserSerializer
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'category', 'status', 'color',
            'start_date', 'target_date', 'category_display', 'status_display',
            'owner', 'members', 'is_owner', 'stats', 'member_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'members', 'created_at', 'updated_at']

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.owner_id == request.user.id
        return False

    def get_member_count(self, obj):
        return obj.members.count()

    def get_stats(self, obj):
        tasks = obj.tasks.all()
        total = tasks.count()
        todo = tasks.filter(status='TODO').count()
        in_progress = tasks.filter(status='IN_PROGRESS').count()
        done = tasks.filter(status='DONE').count()
        progress = round((done / total * 100)) if total > 0 else 0

        return {
            'total_tasks': total,
            'todo_tasks': todo,
            'in_progress_tasks': in_progress,
            'done_tasks': done,
            'progress_percent': progress
        }


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['name', 'description', 'category', 'status', 'color', 'start_date', 'target_date']

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Project name cannot be empty.")
        return value.strip()

    def create(self, validated_data):
        user = self.context['request'].user
        if not user or not user.is_authenticated:
            from users.middleware import get_default_flowvibe_user
            user = get_default_flowvibe_user()
        project = Project.objects.create(
            owner=user,
            **validated_data
        )
        project.members.add(user)
        return project


class AddMemberSerializer(serializers.Serializer):
    username_or_email = serializers.CharField(required=True)

    def validate_username_or_email(self, value):
        val = value.strip()
        try:
            if '@' in val:
                user = User.objects.get(email__iexact=val)
            else:
                user = User.objects.get(username__iexact=val)
            return user
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found with this username or email.")
