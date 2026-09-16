from django.urls import path
from .views import (
    ProjectTaskListCreateView,
    TaskDetailView,
    TaskStatusUpdateView,
    MyTasksListView
)

urlpatterns = [
    path('my-tasks/', MyTasksListView.as_view(), name='my_tasks'),
    path('<int:pk>/', TaskDetailView.as_view(), name='task_detail'),
    path('<int:pk>/status/', TaskStatusUpdateView.as_view(), name='task_status_update'),
]
