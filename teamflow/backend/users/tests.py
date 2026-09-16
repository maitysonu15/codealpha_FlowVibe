from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

class UserAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@flowvibe.com',
            password='TestPassword123!',
            first_name='Test',
            last_name='User'
        )

    def test_register_user(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'newuser',
            'email': 'newuser@flowvibe.com',
            'password': 'StrongPassword123!',
            'first_name': 'New',
            'last_name': 'Member'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'newuser')
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_login_user(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'TestPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_login_with_email(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'test@flowvibe.com',
            'password': 'TestPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_current_user_and_stats(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertIn('stats', response.data)

    def test_logout_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_current_user(self):
        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
