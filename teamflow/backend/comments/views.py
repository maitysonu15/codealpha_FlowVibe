from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Comment
from .serializers import CommentSerializer
from tasks.models import Task
from projects.utils import broadcast_project_event


class TaskCommentListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_task(self, task_id, user=None):
        return get_object_or_404(Task, pk=task_id)

    def get(self, request, task_id):
        task = self.get_task(task_id, request.user)
        comments = Comment.objects.filter(task=task)
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, task_id):
        task = self.get_task(task_id, request.user)
        serializer = CommentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            author = request.user if request.user and request.user.is_authenticated else None
            if not author:
                from users.middleware import get_default_flowvibe_user
                author = get_default_flowvibe_user()
            comment = serializer.save(author=author, task=task)
            output = CommentSerializer(comment, context={'request': request}).data
            broadcast_project_event(task.project_id, 'comment_created', {
                'task_id': task.id,
                'comment': output
            }, author)
            return Response(output, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_comment(self, pk, user=None):
        return get_object_or_404(Comment, pk=pk)

    def patch(self, request, pk):
        comment = self.get_comment(pk, request.user)
        serializer = CommentSerializer(comment, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated_comment = serializer.save()
            output = CommentSerializer(updated_comment, context={'request': request}).data
            broadcast_project_event(comment.task.project_id, 'comment_updated', {
                'task_id': comment.task_id,
                'comment': output
            }, request.user)
            return Response(output)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        comment = self.get_comment(pk, request.user)
        task_id = comment.task_id
        project_id = comment.task.project_id
        comment_id = comment.id
        comment.delete()
        broadcast_project_event(project_id, 'comment_deleted', {
            'task_id': task_id,
            'comment_id': comment_id
        }, request.user)
        return Response({'detail': 'Comment deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
