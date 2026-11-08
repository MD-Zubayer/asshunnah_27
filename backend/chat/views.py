from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import ChatRoom, ChatMessage, CallLog
from .serializers import ChatRoomSerializer, ChatMessageSerializer, CallLogSerializer, ChatUserSerializer

User = get_user_model()

class ChatViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def rooms(self, request):
        rooms = ChatRoom.objects.filter(participants=request.user).order_by('-updated_at')
        serializer = ChatRoomSerializer(rooms, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_room(self, request):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'Cannot chat with yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Look for direct room between request.user and target_user
        rooms = ChatRoom.objects.filter(participants=request.user).filter(participants=target_user)
        
        if rooms.exists():
            room = rooms.first()
        else:
            room = ChatRoom.objects.create()
            room.participants.add(request.user, target_user)
            room.save()

        serializer = ChatRoomSerializer(room, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        try:
            room = ChatRoom.objects.get(id=pk, participants=request.user)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        try:
            limit = int(request.query_params.get('limit', 30))
            offset = int(request.query_params.get('offset', 0))
        except ValueError:
            limit = 30
            offset = 0

        messages_queryset = room.messages.all().order_by('-created_at')
        paginated_messages = messages_queryset[offset:offset+limit]
        messages = list(paginated_messages)[::-1]

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        try:
            room = ChatRoom.objects.get(id=pk, participants=request.user)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        unread_messages = room.messages.filter(is_read=False).exclude(sender=request.user)
        if unread_messages.exists():
            unread_message_ids = list(unread_messages.values_list('id', flat=True))
            unread_messages.update(is_read=True)

            # Broadcast read status update to WebSocket group
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{room.id}",
                    {
                        'type': 'broadcast_messages_read',
                        'reader_id': request.user.id,
                        'message_ids': unread_message_ids
                    }
                )
        return Response({'status': 'messages marked as read'})

    @action(detail=True, methods=['post'])
    def upload_audio(self, request, pk=None):
        try:
            room = ChatRoom.objects.get(id=pk, participants=request.user)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({'error': 'No audio file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Upload to MinIO
        import uuid
        import os
        from accounts.views import get_minio_client

        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')
            
            # Generate unique object name
            ext = audio_file.name.rsplit('.', 1)[-1] if '.' in audio_file.name else 'm4a'
            object_name = f"chat_audio/{uuid.uuid4()}.{ext}"

            # Upload to MinIO
            client.put_object(
                bucket, object_name,
                audio_file, audio_file.size,
                content_type=audio_file.content_type or 'audio/m4a'
            )
        except Exception as e:
            return Response({'error': f'Failed to upload to MinIO: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create message with audio
        msg = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            content="🎙️ ভয়েস মেসেজ",
            audio_file=object_name
        )
        room.save()

        # Serialize and broadcast via channels channel_layer
        serializer = ChatMessageSerializer(msg)
        message_data = serializer.data

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"chat_{room.id}",
                {
                    'type': 'broadcast_chat_message',
                    'message': message_data
                }
            )

            for p in room.participants.all():
                if p.id != request.user.id:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{p.id}",
                        {
                            'type': 'broadcast_incoming_notification',
                            'notification_type': 'chat_message',
                            'title': message_data['sender_name'],
                            'body': "🎙️ আপনাকে একটি ভয়েস মেসেজ পাঠিয়েছেন",
                            'room_id': room.id
                        }
                    )

        return Response(message_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def upload_image(self, request, pk=None):
        try:
            room = ChatRoom.objects.get(id=pk, participants=request.user)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        images = request.FILES.getlist('images')
        if not images:
            single_image = request.FILES.get('image')
            if single_image:
                images = [single_image]

        if not images:
            return Response({'error': 'No image files provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Upload to MinIO
        import uuid
        import os
        from accounts.views import get_minio_client
        import json

        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')
            
            uploaded_objects = []
            for img in images:
                ext = img.name.rsplit('.', 1)[-1] if '.' in img.name else 'jpg'
                object_name = f"chat_images/{uuid.uuid4()}.{ext}"

                client.put_object(
                    bucket, object_name,
                    img, img.size,
                    content_type=img.content_type or 'image/jpeg'
                )
                uploaded_objects.append(object_name)
        except Exception as e:
            return Response({'error': f'Failed to upload to MinIO: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create message with multiple images (stored as JSON array in image_file)
        if len(uploaded_objects) > 1:
            image_val = json.dumps(uploaded_objects)
            body_text = f"📷 {len(uploaded_objects)}টি ছবি"
        else:
            image_val = uploaded_objects[0]
            body_text = "📷 আপনাকে একটি ছবি পাঠিয়েছেন"

        msg = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            content="📷 ছবি" if len(uploaded_objects) == 1 else f"📷 {len(uploaded_objects)}টি ছবি",
            image_file=image_val
        )
        room.save()

        # Serialize and broadcast via channels channel_layer
        serializer = ChatMessageSerializer(msg)
        message_data = serializer.data

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"chat_{room.id}",
                {
                    'type': 'broadcast_chat_message',
                    'message': message_data
                }
            )

            for p in room.participants.all():
                if p.id != request.user.id:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{p.id}",
                        {
                            'type': 'broadcast_incoming_notification',
                            'notification_type': 'chat_message',
                            'title': message_data['sender_name'],
                            'body': body_text,
                            'room_id': room.id
                        }
                    )

        return Response(message_data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def users(self, request):
        query = request.query_params.get('search', '')
        users = User.objects.exclude(id=request.user.id)
        if query:
            users = users.filter(
                Q(email__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(phone_number__icontains=query)
            )
        serializer = ChatUserSerializer(users[:20], many=True)
        return Response(serializer.data)

class CallLogViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CallLogSerializer
    queryset = CallLog.objects.all()

    def get_queryset(self):
        return CallLog.objects.filter(Q(caller=self.request.user) | Q(callee=self.request.user)).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(caller=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        # If call transitions to a final state, create a call log system message in the room
        if instance.status in ['completed', 'missed', 'rejected']:
            rooms = ChatRoom.objects.filter(participants=instance.caller).filter(participants=instance.callee)
            if rooms.exists():
                room = rooms.first()
                call_type_str = "অডিও কল" if instance.call_type == 'audio' else "ভিডিও কল"
                
                if instance.status == 'missed':
                    content = f"📴 মিসড {call_type_str}"
                elif instance.status == 'rejected':
                    content = f"🚫 {call_type_str} প্রত্যাখ্যান করা হয়েছে"
                else:
                    mins = instance.duration // 60
                    secs = instance.duration % 60
                    duration_str = f"{mins:02d}:{secs:02d}"
                    content = f"📞 {call_type_str} সম্পন্ন হয়েছে ({duration_str})"

                # Create the message
                msg = ChatMessage.objects.create(
                    room=room,
                    sender=instance.caller,
                    content=content,
                    is_read=False
                )
                room.save() # Update room's updated_at timestamp

                # Serialize and broadcast the call status message to the chat room websocket
                serializer = ChatMessageSerializer(msg)
                message_data = serializer.data

                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"chat_{room.id}",
                        {
                            'type': 'broadcast_chat_message',
                            'message': message_data
                        }
                    )
