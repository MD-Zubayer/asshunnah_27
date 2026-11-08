from rest_framework import serializers
from .models import Mosque

class MosqueSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)

    class Meta:
        model = Mosque
        fields = ['id', 'name', 'latitude', 'longitude', 'radius', 'created_by', 'created_by_email', 'created_at']
        read_only_fields = ['created_by', 'created_at']
