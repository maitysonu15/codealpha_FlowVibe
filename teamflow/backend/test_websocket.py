import os
import django
import asyncio
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from channels.testing import WebsocketCommunicator
from config.asgi import application
from projects.models import Project
from projects.utils import broadcast_project_event

async def test_channels_consumer():
    print("=== Testing FlowVibe Django Channels ASGI Project Consumer ===")

    # Get project
    project = await asyncio.to_thread(Project.objects.first)

    # 1. Test Unauthenticated WebSocket connection (Authentication removed)
    anon_communicator = WebsocketCommunicator(application, f"/ws/projects/{project.id}/")
    anon_connected, _ = await anon_communicator.connect()
    assert anon_connected, "Unauthenticated WebSocket connection was rejected!"
    print(f"  [PASS] Unauthenticated WebSocket Connected successfully to Project {project.id}")
    anon_response = await anon_communicator.receive_json_from(timeout=3)
    assert anon_response.get('type') == 'connection_established'
    print(f"  [PASS] Unauthenticated WebSocket handshake: {anon_response.get('message')}")
    await anon_communicator.disconnect()

    # 2. Test Authenticated/Active User WebSocket
    alex = await asyncio.to_thread(User.objects.get, username='alex')
    communicator = WebsocketCommunicator(application, f"/ws/projects/{project.id}/")
    communicator.scope['user'] = alex
    
    connected, subprotocol = await communicator.connect()
    assert connected, "WebSocket connection was rejected!"
    print(f"  [PASS] WebSocket Connected to Project {project.id}")

    # Read welcome message
    response = await communicator.receive_json_from(timeout=3)
    assert response.get('type') == 'connection_established'
    print(f"  [PASS] Received connection handshake: {response.get('message')}")

    # Test ping-pong
    await communicator.send_json_to({'type': 'ping'})
    pong = await communicator.receive_json_from(timeout=3)
    assert pong.get('type') == 'pong'
    print(f"  [PASS] Received pong heartbeat: {pong}")

    # Test group broadcast
    await asyncio.to_thread(
        broadcast_project_event,
        project.id,
        'task_created',
        {'id': 999, 'title': 'Test Async Broadcast'},
        alex
    )

    event = await communicator.receive_json_from(timeout=3)
    assert event.get('type') == 'task_created'
    assert event.get('data', {}).get('title') == 'Test Async Broadcast'
    print(f"  [PASS] Received group broadcast event over WebSocket: {event}")

    await communicator.disconnect()
    print("\n=======================================================")
    print("  ALL CHANNELS WEBSOCKET TESTS PASSED! [PASS]")
    print("=======================================================")

if __name__ == '__main__':
    asyncio.run(test_channels_consumer())
