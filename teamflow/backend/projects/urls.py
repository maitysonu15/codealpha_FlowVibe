from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectMemberManagementView,
    ProjectStatsView
)

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project_list_create'),
    path('<int:pk>/', ProjectDetailView.as_view(), name='project_detail'),
    path('<int:pk>/members/', ProjectMemberManagementView.as_view(), name='project_members_add'),
    path('<int:pk>/members/<int:user_id>/', ProjectMemberManagementView.as_view(), name='project_members_remove'),
    path('<int:pk>/stats/', ProjectStatsView.as_view(), name='project_stats'),
]
