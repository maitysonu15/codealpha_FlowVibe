"""
URL configuration for FlowVibe project.
"""

from django.contrib import admin
from django.urls import path, re_path, include
from django.shortcuts import render
from django.views.static import serve
from django.conf import settings
from tasks.views import ProjectTaskListCreateView

def serve_page(template_name):
    def view(request, *args, **kwargs):
        return render(request, template_name)
    return view

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('users.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/projects/<int:project_id>/tasks/', ProjectTaskListCreateView.as_view(), name='project_tasks_list_create'),
    path('api/tasks/', include('tasks.urls')),
    path('api/comments/', include('comments.urls')),

    # Direct static asset serving for css/js/images/favicons from frontend
    re_path(r'^css/(?P<path>.*)$', serve, {'document_root': settings.FRONTEND_DIR / 'css'}),
    re_path(r'^js/(?P<path>.*)$', serve, {'document_root': settings.FRONTEND_DIR / 'js'}),
    re_path(r'^(?P<path>favicon\.(?:ico|svg|png))$', serve, {'document_root': settings.FRONTEND_DIR}),

    # Frontend Page Routes
    path('', serve_page('index.html'), name='page_index'),
    path('index.html', serve_page('index.html')),
    path('login/', serve_page('login.html'), name='page_login'),
    path('login.html', serve_page('login.html')),
    path('register/', serve_page('register.html'), name='page_register'),
    path('register.html', serve_page('register.html')),
    path('dashboard/', serve_page('dashboard.html'), name='page_dashboard'),
    path('dashboard.html', serve_page('dashboard.html')),
    path('project/', serve_page('project.html'), name='page_project'),
    path('project.html', serve_page('project.html')),
    path('profile/', serve_page('profile.html'), name='page_profile'),
    path('profile.html', serve_page('profile.html')),
]
