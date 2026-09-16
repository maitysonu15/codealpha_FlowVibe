from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from projects.models import Project
from tasks.models import Task
from comments.models import Comment

class CommentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='comment_owner', password='Password123!')
        self.member = User.objects.create_user(username='comment_member', password='Password123!')
        self.project = Project.objects.create(name='Comment Testing', owner=self.owner)
        self.project.members.add(self.owner, self.member)
        self.task = Task.objects.create(
            project=self.project,
            title='Test Task Comments',
            created_by=self.owner
        )

    def test_create_and_delete_comment(self):
        self.client.force_authenticate(user=self.member)
        
        # Post comment
        res = self.client.post(f'/api/comments/task/{self.task.id}/', {
            'content': 'This task is looking great!'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        comment_id = res.data['id']
        self.assertEqual(res.data['author']['username'], 'comment_member')

        # Edit comment
        edit_res = self.client.patch(f'/api/comments/{comment_id}/', {
            'content': 'Updated: This task is looking awesome!'
        }, format='json')
        self.assertEqual(edit_res.status_code, status.HTTP_200_OK)
        self.assertEqual(edit_res.data['content'], 'Updated: This task is looking awesome!')

        # Delete comment
        del_res = self.client.delete(f'/api/comments/{comment_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
