from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Task
from .serializers import TaskSerializer, TaskStatusUpdateSerializer
from projects.models import Project
from projects.utils import broadcast_project_event


class ProjectTaskListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_project(self, project_id, user=None):
        return get_object_or_404(Project, pk=project_id)

    def get(self, request, project_id):
        project = self.get_project(project_id, request.user)
        tasks = Task.objects.filter(project=project)

        # Filters
        task_status = request.query_params.get('status')
        if task_status:
            tasks = tasks.filter(status=task_status.upper())

        priority = request.query_params.get('priority')
        if priority:
            tasks = tasks.filter(priority=priority.upper())

        assigned_to = request.query_params.get('assigned_to')
        if assigned_to:
            if assigned_to == 'unassigned':
                tasks = tasks.filter(assigned_to__isnull=True)
            elif assigned_to.isdigit():
                tasks = tasks.filter(assigned_to_id=int(assigned_to))

        search = request.query_params.get('search', '').strip()
        if search:
            tasks = tasks.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def post(self, request, project_id):
        project = self.get_project(project_id, request.user)
        data = request.data.copy()
        data['project'] = project.id

        serializer = TaskSerializer(data=data)
        if serializer.is_valid():
            creator = request.user if request.user and request.user.is_authenticated else None
            if not creator:
                from users.middleware import get_default_flowvibe_user
                creator = get_default_flowvibe_user()
            task = serializer.save(created_by=creator)
            output = TaskSerializer(task).data
            broadcast_project_event(project.id, 'task_created', output, creator)
            return Response(output, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_task(self, pk, user=None):
        return get_object_or_404(Task, pk=pk)

    def get(self, request, pk):
        task = self.get_task(pk, request.user)
        serializer = TaskSerializer(task)
        return Response(serializer.data)

    def patch(self, request, pk):
        task = self.get_task(pk, request.user)
        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            updated_task = serializer.save()
            output = TaskSerializer(updated_task).data
            broadcast_project_event(updated_task.project_id, 'task_updated', output, request.user)
            return Response(output)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        task = self.get_task(pk, request.user)
        project_id = task.project_id
        task_id = task.id
        task.delete()
        broadcast_project_event(project_id, 'task_deleted', {'task_id': task_id}, request.user)
        return Response({'detail': 'Task deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


class TaskStatusUpdateView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, pk):
        task = get_object_or_404(Task, pk=pk)

        old_status = task.status
        serializer = TaskStatusUpdateSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            updated_task = serializer.save()
            output = TaskSerializer(updated_task).data
            broadcast_project_event(updated_task.project_id, 'task_moved', {
                'task': output,
                'old_status': old_status,
                'new_status': updated_task.status,
                'task_id': updated_task.id
            }, request.user)
            return Response(output)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MyTasksListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user
        if user and user.is_authenticated:
            tasks = Task.objects.filter(assigned_to=user).order_by('due_date', '-created_at')[:20]
            if not tasks.exists():
                tasks = Task.objects.all().order_by('due_date', '-created_at')[:20]
        else:
            tasks = Task.objects.all().order_by('due_date', '-created_at')[:20]
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
