from django.db import models
from django.conf import settings

class ChatRoom(models.Model):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chat_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Room {self.id} ({self.participants.count()} participants)"

class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    audio_file = models.FileField(upload_to='chat_audio/', blank=True, null=True)
    image_file = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg {self.id} from {self.sender} in Room {self.room_id}"

class CallLog(models.Model):
    CALL_TYPES = [
        ('audio', 'Audio'),
        ('video', 'Video'),
    ]
    CALL_STATUSES = [
        ('ringing', 'Ringing'),
        ('connected', 'Connected'),
        ('missed', 'Missed'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    caller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='initiated_calls')
    callee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_calls')
    call_type = models.CharField(max_length=10, choices=CALL_TYPES)
    status = models.CharField(max_length=15, choices=CALL_STATUSES, default='ringing')
    duration = models.IntegerField(default=0, help_text="Duration in seconds")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.call_type.capitalize()} Call {self.id} from {self.caller} to {self.callee} ({self.status})"
