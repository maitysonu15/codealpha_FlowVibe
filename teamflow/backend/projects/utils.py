from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

def broadcast_project_event(project_id, event_type, payload, sender_user=None):
    """
    Broadcasts an event to all connected WebSocket clients in the project room.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        
        group_name = f"project_{project_id}"
        message_data = {
            "type": "project_event",
            "event_type": event_type,
            "data": payload,
            "sender_id": sender_user.id if sender_user else None,
            "sender_username": sender_user.username if sender_user else None,
        }
        async_to_sync(channel_layer.group_send)(group_name, message_data)
    except Exception as e:
        logger.error(f"Error broadcasting project event: {e}")
