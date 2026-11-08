from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatViewSet, CallLogViewSet

router = DefaultRouter()
router.register(r'calls', CallLogViewSet, basename='calls')

urlpatterns = [
    path('', include(router.urls)),
    path('rooms/', ChatViewSet.as_view({'get': 'rooms'}), name='chat-rooms'),
    path('rooms/get_or_create/', ChatViewSet.as_view({'post': 'get_or_create_room'}), name='chat-get-or-create-room'),
    path('rooms/<int:pk>/messages/', ChatViewSet.as_view({'get': 'messages'}), name='chat-room-messages'),
    path('rooms/<int:pk>/mark_read/', ChatViewSet.as_view({'post': 'mark_read'}), name='chat-room-mark-read'),
    path('rooms/<int:pk>/upload_audio/', ChatViewSet.as_view({'post': 'upload_audio'}), name='chat-room-upload-audio'),
    path('rooms/<int:pk>/upload_image/', ChatViewSet.as_view({'post': 'upload_image'}), name='chat-room-upload-image'),
    path('users/', ChatViewSet.as_view({'get': 'users'}), name='chat-users'),
]
