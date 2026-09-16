from django.urls import path
from .views import (
    TaskCommentListCreateView,
    CommentDetailView
)

urlpatterns = [
    path('task/<int:task_id>/', TaskCommentListCreateView.as_view(), name='task_comments'),
    path('<int:pk>/', CommentDetailView.as_view(), name='comment_detail'),
]
