import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)

class ProjectConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs'].get('project_id')
        self.room_group_name = f"project_{self.project_id}"
        self.user = self.scope.get('user', AnonymousUser())

        # When backend auth is open/removed, assign default user if anonymous
        if not self.user.is_authenticated:
            self.user = await self.get_default_user()

        # Join project room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send welcome/connection confirmation
        await self.send_json({
            'type': 'connection_established',
            'project_id': self.project_id,
            'message': f'Connected to real-time updates for project {self.project_id}',
            'user': {
                'id': self.user.id,
                'username': self.user.username,
            }
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        """
        Handle incoming messages from client WebSocket.
        """
        msg_type = content.get('type')
        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})
        elif msg_type == 'typing':
            # Broadcast user typing notification
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'project_event',
                    'event_type': 'user_typing',
                    'data': {
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'task_id': content.get('task_id')
                    },
                    'sender_id': self.user.id
                }
            )

    async def project_event(self, event):
        """
        Handler for messages broadcasted to project group.
        """
        # Forward event data to the client WebSocket
        await self.send_json({
            'type': event.get('event_type'),
            'data': event.get('data'),
            'sender_id': event.get('sender_id'),
            'sender_username': event.get('sender_username')
        })

    @database_sync_to_async
    def get_default_user(self):
        from users.middleware import get_default_flowvibe_user
        return get_default_flowvibe_user()

    @database_sync_to_async
    def check_project_membership(self, project_id, user):
        return True
