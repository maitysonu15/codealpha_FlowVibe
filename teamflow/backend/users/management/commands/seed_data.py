from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserProfile
from projects.models import Project
from tasks.models import Task
from comments.models import Comment
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'Seeds the database with demo users, projects, tasks, and comments'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database with rich demo data...')

        users_data = [
            {
                'username': 'alex',
                'email': 'alex.chen@flowvibe.io',
                'first_name': 'Alex',
                'last_name': 'Chen',
                'role_title': 'Product Lead',
                'bio': 'Passionate about agile product management and intuitive software.',
                'avatar_color': '#6366F1'
            },
            {
                'username': 'sarah',
                'email': 'sarah.miller@flowvibe.io',
                'first_name': 'Sarah',
                'last_name': 'Miller',
                'role_title': 'Senior Frontend Engineer',
                'bio': 'JavaScript enthusiast crafting responsive, accessible user interfaces.',
                'avatar_color': '#10B981'
            },
            {
                'username': 'david',
                'email': 'david.kim@flowvibe.io',
                'first_name': 'David',
                'last_name': 'Kim',
                'role_title': 'Backend Architect',
                'bio': 'Python, Django & real-time distributed systems specialist.',
                'avatar_color': '#F59E0B'
            },
            {
                'username': 'elena',
                'email': 'elena.rostova@flowvibe.io',
                'first_name': 'Elena',
                'last_name': 'Rostova',
                'role_title': 'UI/UX Designer',
                'bio': 'Designing pixel-perfect experiences and design systems.',
                'avatar_color': '#EC4899'
            },
            {
                'username': 'demo',
                'email': 'demo@flowvibe.io',
                'first_name': 'Demo',
                'last_name': 'User',
                'role_title': 'Full-Stack Developer',
                'bio': 'Exploring FlowVibe features and collaborative workflow.',
                'avatar_color': '#06B6D4'
            },
        ]

        created_users = {}
        for u in users_data:
            user, created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'email': u['email'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name']
                }
            )
            user.set_password('password123')
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role_title = u['role_title']
            profile.bio = u['bio']
            profile.avatar_color = u['avatar_color']
            profile.save()
            created_users[u['username']] = user

        # Create Projects
        p1, _ = Project.objects.get_or_create(
            name='FlowVibe 2.0 Web Platform',
            defaults={
                'description': 'Main release tracking for FlowVibe collaborative kanban, real-time sync, and notification system.',
                'owner': created_users['alex']
            }
        )
        p1.members.set([
            created_users['alex'],
            created_users['sarah'],
            created_users['david'],
            created_users['elena'],
            created_users['demo']
        ])

        p2, _ = Project.objects.get_or_create(
            name='Mobile App Design System',
            defaults={
                'description': 'Cross-platform design token consolidation, dark mode UI assets, and interaction guidelines.',
                'owner': created_users['elena']
            }
        )
        p2.members.set([
            created_users['elena'],
            created_users['alex'],
            created_users['sarah']
        ])

        p3, _ = Project.objects.get_or_create(
            name='Cloud Infrastructure & DevOps',
            defaults={
                'description': 'Automated CI/CD pipelines, Docker containerization, ASGI WebSocket deployment, and telemetry.',
                'owner': created_users['david']
            }
        )
        p3.members.set([
            created_users['david'],
            created_users['alex'],
            created_users['demo']
        ])

        today = date.today()

        # Seed Tasks for Project 1
        tasks_p1 = [
            {
                'title': 'Design Glassmorphic Dark UI Theme',
                'description': 'Create comprehensive CSS design system with HSL tailored colors, smooth shadows, and responsive glass cards.',
                'status': 'DONE',
                'priority': 'HIGH',
                'due_date': today - timedelta(days=2),
                'assigned_to': created_users['elena'],
                'created_by': created_users['alex'],
                'order': 0,
            },
            {
                'title': 'Implement WebSocket Channels Consumer',
                'description': 'Setup Django Channels with ASGI routing, room group broadcasting, and connection auth verification.',
                'status': 'DONE',
                'priority': 'HIGH',
                'due_date': today - timedelta(days=1),
                'assigned_to': created_users['david'],
                'created_by': created_users['alex'],
                'order': 1,
            },
            {
                'title': 'Build Drag-and-Drop Kanban Board',
                'description': 'Develop smooth native HTML5 drag-and-drop Kanban interface with instant status update and fallback controls.',
                'status': 'IN_PROGRESS',
                'priority': 'HIGH',
                'due_date': today + timedelta(days=2),
                'assigned_to': created_users['sarah'],
                'created_by': created_users['alex'],
                'order': 0,
            },
            {
                'title': 'Implement Real-time Task Comments Stream',
                'description': 'Allow project members to post, edit, and delete comments on task modal with live updates.',
                'status': 'IN_PROGRESS',
                'priority': 'MEDIUM',
                'due_date': today + timedelta(days=4),
                'assigned_to': created_users['demo'],
                'created_by': created_users['sarah'],
                'order': 1,
            },
            {
                'title': 'Automate PostgreSQL Production Migration',
                'description': 'Verify compatibility of models and migrations with PostgreSQL connection string and environment variables.',
                'status': 'TODO',
                'priority': 'MEDIUM',
                'due_date': today + timedelta(days=7),
                'assigned_to': created_users['david'],
                'created_by': created_users['alex'],
                'order': 0,
            },
            {
                'title': 'Perform Cross-browser & Mobile Testing',
                'description': 'Test responsive viewport transitions across mobile, tablet, and high-DPI desktop screens.',
                'status': 'TODO',
                'priority': 'LOW',
                'due_date': today + timedelta(days=9),
                'assigned_to': created_users['demo'],
                'created_by': created_users['elena'],
                'order': 1,
            },
        ]

        created_tasks = []
        for t in tasks_p1:
            task, _ = Task.objects.get_or_create(
                project=p1,
                title=t['title'],
                defaults={
                    'description': t['description'],
                    'status': t['status'],
                    'priority': t['priority'],
                    'due_date': t['due_date'],
                    'assigned_to': t['assigned_to'],
                    'created_by': t['created_by'],
                    'order': t['order']
                }
            )
            created_tasks.append(task)

        # Comments on tasks
        if len(created_tasks) >= 3:
            Comment.objects.get_or_create(
                task=created_tasks[0],
                author=created_users['elena'],
                content='Completed the palette tokens and card blur filters! Ready for styling.'
            )
            Comment.objects.get_or_create(
                task=created_tasks[0],
                author=created_users['alex'],
                content='Looks super crisp and modern. Great work Elena!'
            )
            Comment.objects.get_or_create(
                task=created_tasks[2],
                author=created_users['sarah'],
                content='Drag-and-drop handlers are connected. Adding optimistic UI feedback now.'
            )
            Comment.objects.get_or_create(
                task=created_tasks[2],
                author=created_users['david'],
                content='Verified the PATCH /status endpoint is receiving the payload correctly.'
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded database with demo data!'))
        self.stdout.write('Demo credentials: all passwords are "password123"')
        self.stdout.write('Accounts: alex, sarah, david, elena, demo')
