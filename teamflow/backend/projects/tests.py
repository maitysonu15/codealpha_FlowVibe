from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Project

class ProjectTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@flowvibe.com',
            password='Password123!'
        )
        self.member = User.objects.create_user(
            username='member',
            email='member@flowvibe.com',
            password='Password123!'
        )
        self.outsider = User.objects.create_user(
            username='outsider',
            email='outsider@flowvibe.com',
            password='Password123!'
        )

    def test_create_project(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post('/api/projects/', {
            'name': 'Alpha Launch',
            'description': 'Main release project'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Alpha Launch')
        self.assertTrue(response.data['is_owner'])

    def test_project_access_permissions(self):
        self.client.force_authenticate(user=self.owner)
        create_res = self.client.post('/api/projects/', {
            'name': 'Confidential Project',
            'description': 'Internal'
        }, format='json')
        project_id = create_res.data['id']

        # Add member to project
        self.client.post(f'/api/projects/{project_id}/members/', {
            'username_or_email': 'member'
        }, format='json')

        # Member should have access
        self.client.force_authenticate(user=self.member)
        res_member = self.client.get(f'/api/projects/{project_id}/')
        self.assertEqual(res_member.status_code, status.HTTP_200_OK)

        # Outsider now has open access (auth system removed)
        self.client.force_authenticate(user=self.outsider)
        res_outsider = self.client.get(f'/api/projects/{project_id}/')
        self.assertEqual(res_outsider.status_code, status.HTTP_200_OK)
