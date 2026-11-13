from django.contrib import admin
from .models import ChatRoom, ChatMessage, CallLog


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'participant_names', 'created_at', 'updated_at')
    search_fields = ('participants__email', 'participants__first_name', 'participants__last_name', 'participants__phone_number')
    date_hierarchy = 'created_at'

    def participant_names(self, obj):
        return ", ".join([u.get_full_name() or u.email for u in obj.participants.all()])
    participant_names.short_description = "Participants"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'room_id', 'sender', 'short_content', 'is_read', 'is_deleted', 'created_at')
    list_filter = ('is_read', 'is_deleted', 'created_at')
    search_fields = ('content', 'sender__email', 'sender__first_name', 'sender__last_name', 'sender__phone_number')
    actions = ['soft_delete_messages', 'restore_messages']
    date_hierarchy = 'created_at'

    def short_content(self, obj):
        return (obj.content[:60] + '...') if len(obj.content) > 60 else obj.content
    short_content.short_description = "Message Content"

    def soft_delete_messages(self, request, queryset):
        updated = queryset.update(is_deleted=True, content="[এই বার্তাটি মডারেশন টিম দ্বারা অপসারিত হয়েছে]")
        self.message_user(request, f"{updated} টি বার্তা সফলভাবে অপসারিত করা হয়েছে।")
    soft_delete_messages.short_description = "Delete/Hide selected messages (মডারেশন)"

    def restore_messages(self, request, queryset):
        updated = queryset.update(is_deleted=False)
        self.message_user(request, f"{updated} টি বার্তা পুনরুজ্জীবিত করা হয়েছে।")
    restore_messages.short_description = "Restore selected messages"


@admin.register(CallLog)
class CallLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'caller', 'callee', 'call_type', 'status', 'duration', 'created_at')
    list_filter = ('call_type', 'status', 'created_at')
    search_fields = ('caller__email', 'caller__first_name', 'callee__email', 'callee__first_name')
    date_hierarchy = 'created_at'
