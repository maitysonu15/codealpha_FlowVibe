from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from projects.models import Project
from tasks.models import Task

class TaskTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='taskdev', password='Password123!')
        self.other_user = User.objects.create_user(username='otherdev', password='Password123!')
        self.project = Project.objects.create(name='Dev Project', owner=self.user)
        self.project.members.add(self.user)

    def test_create_task_and_status_update(self):
        self.client.force_authenticate(user=self.user)
        
        # Create task
        res = self.client.post(f'/api/projects/{self.project.id}/tasks/', {
            'title': 'Build Login Page',
            'description': 'Implement pure JS login with CSRF',
            'priority': 'HIGH',
            'status': 'TODO'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        task_id = res.data['id']
        self.assertEqual(res.data['status'], 'TODO')

        # Update status to IN_PROGRESS
        update_res = self.client.patch(f'/api/tasks/{task_id}/status/', {
            'status': 'IN_PROGRESS'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['status'], 'IN_PROGRESS')

        # Update status to DONE
        update_res2 = self.client.patch(f'/api/tasks/{task_id}/status/', {
            'status': 'DONE'
        }, format='json')
        self.assertEqual(update_res2.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res2.data['status'], 'DONE')

    def test_cannot_assign_non_member(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f'/api/projects/{self.project.id}/tasks/', {
            'title': 'Invalid Assignment',
            'assigned_to_id': self.other_user.id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
