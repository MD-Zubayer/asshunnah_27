import json
import urllib.parse
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ChatRoom, ChatMessage, CallLog

User = get_user_model()

# Global set to track online users by their User ID
ONLINE_USERS = set()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        # Extract user_id from query parameters
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = urllib.parse.parse_qs(query_string)
        self.user_id = params.get('user_id', [None])[0]

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Broadcast online status
        if self.user_id:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_user_status',
                    'user_id': int(self.user_id),
                    'status': 'online'
                }
            )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        # Broadcast offline status
        if self.user_id:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_user_status',
                    'user_id': int(self.user_id),
                    'status': 'offline'
                }
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')

        if event_type == 'chat_message':
            sender_id = data.get('sender_id')
            content = data.get('content')
            parent_id = data.get('parent_id')

            message_data = await self.save_message(self.room_id, sender_id, content, parent_id)

            if message_data:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_chat_message',
                        'message': message_data
                    }
                )

                # Send global presence push notification trigger
                participants = await self.get_room_participants(self.room_id)
                for p_id in participants:
                    if p_id != int(sender_id):
                        await self.channel_layer.group_send(
                            f"user_{p_id}",
                            {
                                'type': 'broadcast_incoming_notification',
                                'notification_type': 'chat_message',
                                'title': message_data['sender_name'],
                                'body': message_data['content'],
                                'room_id': self.room_id
                            }
                        )
        
        elif event_type == 'edit_message':
            message_id = data.get('message_id')
            new_content = data.get('content')
            
            success = await self.edit_message(message_id, new_content)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_message_update',
                        'event': 'edit',
                        'message_id': message_id,
                        'content': new_content
                    }
                )

        elif event_type == 'delete_message':
            message_id = data.get('message_id')
            
            success = await self.delete_message(message_id)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_message_update',
                        'event': 'delete',
                        'message_id': message_id
                    }
                )

        elif event_type == 'call_signal':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_call_signal',
                    'sender_id': data.get('sender_id'),
                    'signal_type': data.get('signal_type'),
                    'call_type': data.get('call_type'),
                    'payload': data.get('payload')
                }
            )

            # Trigger call alert notification globally via presence group
            if data.get('signal_type') == 'initiate':
                participants = await self.get_room_participants(self.room_id)
                for p_id in participants:
                    if p_id != int(data.get('sender_id')):
                        sender_name = await self.get_user_name(data.get('sender_id'))
                        sender_image = await self.get_user_image(data.get('sender_id'))
                        await self.channel_layer.group_send(
                            f"user_{p_id}",
                            {
                                'type': 'broadcast_incoming_notification',
                                'notification_type': 'call',
                                'title': f"ইনকামিং { 'ভিডিও' if data.get('call_type') == 'video' else 'অডিও' } কল",
                                'body': f"{sender_name} আপনাকে কল করছেন...",
                                'room_id': self.room_id,
                                'sender_id': data.get('sender_id'),
                                'call_type': data.get('call_type'),
                                'sender_image': sender_image,
                                'sender_name': sender_name
                            }
                        )
            elif data.get('signal_type') in ['hangup', 'reject']:
                participants = await self.get_room_participants(self.room_id)
                for p_id in participants:
                    if p_id != int(data.get('sender_id')):
                        await self.channel_layer.group_send(
                            f"user_{p_id}",
                            {
                                'type': 'broadcast_incoming_notification',
                                'notification_type': 'call_cancel',
                                'title': 'কল বাতিল',
                                'body': 'কলটি কেটে দেওয়া হয়েছে',
                                'room_id': self.room_id,
                                'sender_id': data.get('sender_id')
                            }
                        )

        elif event_type == 'query_status':
            if self.user_id:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_user_status',
                        'user_id': int(self.user_id),
                        'status': 'online'
                    }
                )

    # Receive message from room group
    async def broadcast_chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))

    # Receive message edit/delete updates from group
    async def broadcast_message_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_update',
            'event': event['event'],
            'message_id': event['message_id'],
            'content': event.get('content', '')
        }))

    # Receive messages read event from group
    async def broadcast_messages_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'reader_id': event['reader_id'],
            'message_ids': event['message_ids']
        }))

    # Receive call signal from room group
    async def broadcast_call_signal(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_signal',
            'sender_id': event['sender_id'],
            'signal_type': event['signal_type'],
            'call_type': event['call_type'],
            'payload': event['payload']
        }))

    # Receive user status broadcast from group
    async def broadcast_user_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'status': event['status']
        }))

    @database_sync_to_async
    def get_room_participants(self, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
            return [p.id for p in room.participants.all()]
        except Exception:
            return []

    @database_sync_to_async
    def get_user_name(self, user_id):
        try:
            u = User.objects.get(id=user_id)
            return u.get_full_name() or u.email.split('@')[0]
        except Exception:
            return "ব্যবহারকারী"

    @database_sync_to_async
    def get_user_image(self, user_id):
        try:
            u = User.objects.get(id=user_id)
            if u.profile_image:
                img_path = u.profile_image
                if not img_path.startswith('/media/') and not img_path.startswith('media/'):
                    img_path = f"media/{img_path}"
                if not img_path.startswith('/'):
                    img_path = f"/{img_path}"
                return img_path
            return ""
        except Exception:
            return ""

    @database_sync_to_async
    def save_message(self, room_id, sender_id, content, parent_id=None):
        try:
            room = ChatRoom.objects.get(id=room_id)
            sender = User.objects.get(id=sender_id)
            
            parent = None
            if parent_id:
                parent = ChatMessage.objects.get(id=parent_id)

            msg = ChatMessage.objects.create(room=room, sender=sender, content=content, parent=parent)
            room.save() 
            
            parent_detail = None
            if parent:
                parent_detail = {
                    'id': parent.id,
                    'sender': parent.sender.id,
                    'sender_name': parent.sender.get_full_name() or parent.sender.email.split('@')[0],
                    'content': parent.content,
                    'is_deleted': parent.is_deleted
                }

            return {
                'id': msg.id,
                'room': room.id,
                'sender': sender.id,
                'sender_name': sender.get_full_name() or sender.email.split('@')[0],
                'content': msg.content,
                'is_read': msg.is_read,
                'is_edited': msg.is_edited,
                'is_deleted': msg.is_deleted,
                'parent': parent.id if parent else None,
                'parent_detail': parent_detail,
                'created_at': msg.created_at.isoformat()
            }
        except Exception as e:
            print("Error saving message:", e)
            return None

    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        try:
            msg = ChatMessage.objects.get(id=message_id)
            msg.content = new_content
            msg.is_edited = True
            msg.save()
            return True
        except Exception as e:
            print("Error editing message:", e)
            return False

    @database_sync_to_async
    def delete_message(self, message_id):
        try:
            msg = ChatMessage.objects.get(id=message_id)
            msg.content = "বার্তাটি মুছে ফেলা হয়েছে"
            msg.is_deleted = True
            msg.save()
            return True
        except Exception as e:
            print("Error deleting message:", e)
            return False


class PresenceConsumer(AsyncWebsocketConsumer):
    """
    Global presence tracking WebSocket connection.
    Keeps users online while the app is active and has internet (data/wifi).
    """
    async def connect(self):
        self.presence_group_name = 'global_presence'

        # Extract user_id from query parameters
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = urllib.parse.parse_qs(query_string)
        self.user_id = params.get('user_id', [None])[0]

        # Join global presence group
        await self.channel_layer.group_add(
            self.presence_group_name,
            self.channel_name
        )

        # Join personal user notification group
        if self.user_id:
            uid = int(self.user_id)
            self.user_group_name = f"user_{uid}"
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )

        await self.accept()

        if self.user_id:
            uid = int(self.user_id)
            ONLINE_USERS.add(uid)
            # Broadcast to everyone globally that user is online
            await self.channel_layer.group_send(
                self.presence_group_name,
                {
                    'type': 'broadcast_presence_change',
                    'user_id': uid,
                    'status': 'online'
                }
            )

    async def disconnect(self, close_code):
        # Leave presence group
        await self.channel_layer.group_discard(
            self.presence_group_name,
            self.channel_name
        )

        # Leave personal user group
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

        if self.user_id:
            uid = int(self.user_id)
            ONLINE_USERS.discard(uid)
            # Broadcast to everyone globally that user is offline
            await self.channel_layer.group_send(
                self.presence_group_name,
                {
                    'type': 'broadcast_presence_change',
                    'user_id': uid,
                    'status': 'offline'
                }
            )

    async def broadcast_presence_change(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence_change',
            'user_id': event['user_id'],
            'status': event['status']
        }))

    async def broadcast_incoming_notification(self, event):
        # Relay incoming notification directly to the connected device
        await self.send(text_data=json.dumps({
            'type': 'incoming_notification',
            'notification_type': event['notification_type'], # 'chat_message' or 'call'
            'title': event['title'],
            'body': event['body'],
            'room_id': event['room_id'],
            'sender_id': event.get('sender_id'),
            'call_type': event.get('call_type'),
            'sender_image': event.get('sender_image'),
            'sender_name': event.get('sender_name')
        }))
