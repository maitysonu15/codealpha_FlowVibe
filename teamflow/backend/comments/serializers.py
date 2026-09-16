from rest_framework import serializers
from .models import Comment
from users.serializers import UserSerializer

class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    is_author = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'task', 'author', 'content',
            'is_author', 'can_delete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'task', 'author', 'created_at', 'updated_at']

    def get_is_author(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author_id == request.user.id
        return False

    def get_can_delete(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author_id == request.user.id or obj.task.project.is_owner(request.user)
        return False

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Comment content cannot be empty.")
        return value.strip()
