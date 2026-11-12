from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatRoom, ChatMessage, CallLog
from accounts.serializers import _build_minio_url

from .consumers import ONLINE_USERS

User = get_user_model()

class ChatUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'profile_image', 'profile_type', 'is_online']

    def get_name(self, obj):
        return obj.get_full_name() or obj.email.split('@')[0]

    def get_is_online(self, obj):
        return obj.id in ONLINE_USERS

    def get_profile_image(self, obj):
        if obj.profile_image:
            url = _build_minio_url(obj.profile_image)
            request = self.context.get('request')
            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return None

class ParentMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'content', 'audio_file', 'image_file', 'is_deleted']

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    parent_detail = ParentMessageSerializer(source='parent', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'sender_name', 'content', 'is_read', 'is_edited', 'is_deleted', 'parent', 'parent_detail', 'audio_file', 'image_file', 'created_at']

class ChatRoomSerializer(serializers.ModelSerializer):
    participants = ChatUserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'participants', 'last_message', 'unread_count', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return ChatMessageSerializer(last_msg).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

class CallLogSerializer(serializers.ModelSerializer):
    caller_detail = ChatUserSerializer(source='caller', read_only=True)
    callee_detail = ChatUserSerializer(source='callee', read_only=True)

    class Meta:
        model = CallLog
        fields = ['id', 'caller', 'caller_detail', 'callee', 'callee_detail', 'call_type', 'status', 'duration', 'created_at']
        read_only_fields = ['caller']
