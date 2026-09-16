from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth.models import User

from .models import Project
from .serializers import (
    ProjectSerializer,
    ProjectCreateUpdateSerializer,
    AddMemberSerializer
)
from .permissions import IsProjectOwner, IsProjectMemberOrOwner
from .utils import broadcast_project_event
from users.serializers import UserSerializer


class ProjectListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Open access: Return all projects ordered by update date
        projects = Project.objects.all().distinct().order_by('-updated_at')
        serializer = ProjectSerializer(projects, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = ProjectCreateUpdateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            project = serializer.save()
            data = ProjectSerializer(project, context={'request': request}).data
            return Response(data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk, user=None):
        return get_object_or_404(Project, pk=pk)

    def get(self, request, pk):
        project = self.get_object(pk, request.user)
        serializer = ProjectSerializer(project, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        project = self.get_object(pk, request.user)
        serializer = ProjectCreateUpdateSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            project = serializer.save()
            data = ProjectSerializer(project, context={'request': request}).data
            broadcast_project_event(project.id, 'project_updated', data, request.user)
            return Response(data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        project_id = project.id
        project.delete()
        broadcast_project_event(project_id, 'project_deleted', {'project_id': project_id}, request.user)
        return Response({'detail': 'Project deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


class ProjectMemberManagementView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        serializer = AddMemberSerializer(data=request.data)
        if serializer.is_valid():
            member_user = serializer.validated_data['username_or_email']
            if project.members.filter(id=member_user.id).exists():
                return Response(
                    {'detail': f'{member_user.username} is already a member of this project.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            project.members.add(member_user)
            user_data = UserSerializer(member_user).data
            broadcast_project_event(project.id, 'member_added', {
                'project_id': project.id,
                'member': user_data
            }, request.user)
            return Response({
                'detail': f'Added {member_user.username} to project.',
                'member': user_data
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, user_id=None):
        project = get_object_or_404(Project, pk=pk)
        target_user = get_object_or_404(User, pk=user_id)

        if target_user == project.owner:
            return Response(
                {'detail': 'Project owner cannot be removed from project.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        project.members.remove(target_user)
        broadcast_project_event(project.id, 'member_removed', {
            'project_id': project.id,
            'user_id': target_user.id,
            'username': target_user.username
        }, request.user)

        return Response({'detail': f'Removed {target_user.username} from project.'}, status=status.HTTP_200_OK)


class ProjectStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        tasks = project.tasks.all()
        total_tasks = tasks.count()
        todo = tasks.filter(status='TODO').count()
        in_progress = tasks.filter(status='IN_PROGRESS').count()
        done = tasks.filter(status='DONE').count()

        high_priority = tasks.filter(priority='HIGH').count()
        med_priority = tasks.filter(priority='MEDIUM').count()
        low_priority = tasks.filter(priority='LOW').count()

        # Member workload
        members_workload = []
        for m in project.members.all():
            m_tasks = tasks.filter(assigned_to=m)
            members_workload.append({
                'user': UserSerializer(m).data,
                'total_tasks': m_tasks.count(),
                'done_tasks': m_tasks.filter(status='DONE').count(),
                'active_tasks': m_tasks.exclude(status='DONE').count(),
            })

        return Response({
            'total_tasks': total_tasks,
            'status_counts': {
                'todo': todo,
                'in_progress': in_progress,
                'done': done,
            },
            'priority_counts': {
                'high': high_priority,
                'medium': med_priority,
                'low': low_priority,
            },
            'members_workload': members_workload,
            'progress_percent': round((done / total_tasks * 100)) if total_tasks > 0 else 0
        })
