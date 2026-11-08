from django.contrib import admin
from .models import Article, ArticleReaction, ArticleComment, ArticleView, ArticleShare


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'content_preview', 'is_published', 'reaction_count', 'comment_count', 'view_count', 'created_at']
    list_filter = ['is_published', 'created_at']
    search_fields = ['content', 'user__email', 'user__first_name']
    readonly_fields = ['created_at', 'updated_at']

    def content_preview(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content Preview'


@admin.register(ArticleReaction)
class ArticleReactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'article', 'reaction_type', 'created_at']
    list_filter = ['reaction_type', 'created_at']
    search_fields = ['user__email', 'article__id']


@admin.register(ArticleComment)
class ArticleCommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'article', 'text_preview', 'parent_comment', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text', 'user__email']

    def text_preview(self, obj):
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Comment Preview'


@admin.register(ArticleView)
class ArticleViewAdmin(admin.ModelAdmin):
    list_display = ['user', 'article', 'viewed_at']
    list_filter = ['viewed_at']
    search_fields = ['user__email']


@admin.register(ArticleShare)
class ArticleShareAdmin(admin.ModelAdmin):
    list_display = ['user', 'article', 'platform', 'created_at']
    list_filter = ['platform', 'created_at']
    search_fields = ['user__email']