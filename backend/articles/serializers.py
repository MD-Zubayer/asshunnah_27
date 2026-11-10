from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Article, ArticleReaction, ArticleComment, ArticleView, ArticleShare
from accounts.serializers import _build_minio_url

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for articles"""
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'profile_image']

    def get_profile_image(self, obj):
        if obj.profile_image:
            url = _build_minio_url(obj.profile_image)
            request = self.context.get('request')
            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return None


class ArticleCommentSerializer(serializers.ModelSerializer):
    """Serializer for article comments with nested replies"""
    user = UserMinimalSerializer(read_only=True)
    reply_count = serializers.ReadOnlyField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ArticleComment
        fields = ['id', 'user', 'text', 'parent_comment', 'reply_count', 'replies', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_replies(self, obj):
        if obj.parent_comment is None:
            replies = obj.replies.all()
            return ArticleCommentSerializer(replies, many=True, context=self.context).data
        return []


class ArticleCommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments"""
    class Meta:
        model = ArticleComment
        fields = ['id', 'text', 'parent_comment']
        read_only_fields = ['id']


class ArticleSerializer(serializers.ModelSerializer):
    """Main article serializer with counts and user actions"""
    user = UserMinimalSerializer(read_only=True)
    reaction_count = serializers.ReadOnlyField()
    comment_count = serializers.ReadOnlyField()
    view_count = serializers.ReadOnlyField()
    share_count = serializers.ReadOnlyField()
    user_reaction = serializers.SerializerMethodField()
    reaction_counts = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'user', 'content', 'summary', 'image', 'image_url',
            'background_theme', 'is_published', 'reaction_count', 'comment_count',
            'view_count', 'share_count', 'user_reaction', 'reaction_counts',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            reaction = obj.reactions.filter(user=request.user).first()
            return reaction.reaction_type if reaction else None
        return None

    def get_reaction_counts(self, obj):
        from django.db.models import Count
        counts = obj.reactions.values('reaction_type').annotate(count=Count('id'))
        
        counts_dict = {
            'like': 0,
            'love': 0,
            'haha': 0,
            'wow': 0,
            'sad': 0,
            'angry': 0,
            'total': 0
        }
        
        total = 0
        for item in counts:
            rtype = item['reaction_type']
            cnt = item['count']
            if rtype in counts_dict:
                counts_dict[rtype] = cnt
                total += cnt
                
        counts_dict['total'] = total
        return counts_dict

    def get_image_url(self, obj):
        if obj.image:
            url = _build_minio_url(obj.image)
            request = self.context.get('request')
            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return None


class ArticleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating articles"""
    class Meta:
        model = Article
        fields = ['id', 'content', 'image', 'background_theme', 'is_published']
        read_only_fields = ['id']

    def validate_content(self, value):
        if value:
            from .ai_service import moderate_content
            is_safe = moderate_content(value)
            if not is_safe:
                raise serializers.ValidationError("এই পোস্টটি আমাদের নির্দেশিকা লঙ্ঘন করে। অনুগ্রহ করে শালীন পোস্ট করুন।")
        return value


class ArticleShareSerializer(serializers.ModelSerializer):
    """Serializer for tracking shares"""
    class Meta:
        model = ArticleShare
        fields = ['id', 'platform']
        read_only_fields = ['id']