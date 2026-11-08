from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from pgvector.django import VectorField


class Article(models.Model):
    """Facebook-style article/post model"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='articles',
        verbose_name=_('user')
    )
    content = models.TextField(_('content'), help_text=_('Post content'))
    image = models.ImageField(
        _('image'),
        upload_to='articles/images/',
        blank=True,
        null=True
    )
    is_published = models.BooleanField(_('published'), default=True)
    summary = models.TextField(_('summary'), blank=True, null=True, help_text=_('AI generated summary of the post'))
    embedding = VectorField(dimensions=768, null=True, blank=True, help_text=_('Gemini embedding vector'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('article')
        verbose_name_plural = _('articles')
        ordering = ['-created_at']

    def __str__(self):
        return f"Article by {self.user.email} - {self.created_at.strftime('%Y-%m-%d')}"

    @property
    def reaction_count(self):
        return self.reactions.count()

    @property
    def comment_count(self):
        return self.comments.filter(parent_comment__isnull=True).count()

    @property
    def view_count(self):
        return self.views.count()

    @property
    def share_count(self):
        return self.shares.count()

    def save(self, *args, **kwargs):
        if not self.embedding and self.content:
            from .ai_service import generate_embedding
            try:
                self.embedding = generate_embedding(self.content)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to generate embedding on save: {e}")
        
        super().save(*args, **kwargs)

        # Upload image to MinIO so the MinIOMediaView can serve it
        if self.image:
            try:
                import os
                from minio import Minio
                
                # Check if file exists on local disk
                if os.path.exists(self.image.path):
                    client = Minio(
                        os.getenv('MINIO_ENDPOINT', 'minio:9000'),
                        access_key=os.getenv('MINIO_ACCESS_KEY', ''),
                        secret_key=os.getenv('MINIO_SECRET_KEY', ''),
                        secure=False,
                    )
                    bucket = os.getenv('MINIO_BUCKET', 'media')
                    
                    import mimetypes
                    content_type, _ = mimetypes.guess_type(self.image.path)
                    if not content_type:
                        content_type = 'application/octet-stream'
                        
                    with open(self.image.path, 'rb') as file_data:
                        file_stat = os.stat(self.image.path)
                        client.put_object(
                            bucket,
                            self.image.name,
                            file_data,
                            file_stat.st_size,
                            content_type=content_type
                        )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to upload article image to MinIO: {e}")


class ArticleReaction(models.Model):
    """Track reactions on articles"""
    REACTION_CHOICES = [
        ('like', 'Like'),
        ('love', 'Love'),
        ('haha', 'Haha'),
        ('wow', 'Wow'),
        ('sad', 'Sad'),
        ('angry', 'Angry'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='article_reactions',
        verbose_name=_('user')
    )
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='reactions',
        verbose_name=_('article')
    )
    reaction_type = models.CharField(
        _('reaction type'),
        max_length=10,
        choices=REACTION_CHOICES,
        default='like'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('article reaction')
        verbose_name_plural = _('article reactions')
        unique_together = ['user', 'article']

    def __str__(self):
        return f"{self.user.email} reacted {self.reaction_type} to {self.article.id}"


class ArticleComment(models.Model):
    """Comments on articles with nested reply support"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='article_comments',
        verbose_name=_('user')
    )
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name=_('article')
    )
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name=_('parent comment')
    )
    text = models.TextField(_('comment text'))
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('article comment')
        verbose_name_plural = _('article comments')
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.user.email} on {self.article.id}"

    @property
    def reply_count(self):
        return self.replies.count()


class ArticleView(models.Model):
    """Track views on articles"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='article_views',
        verbose_name=_('user')
    )
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='views',
        verbose_name=_('article')
    )
    viewed_at = models.DateTimeField(_('viewed at'), auto_now_add=True)

    class Meta:
        verbose_name = _('article view')
        verbose_name_plural = _('article views')

    def __str__(self):
        return f"{self.user.email} viewed {self.article.id}"


class ArticleShare(models.Model):
    """Track shares on articles"""
    SHARE_PLATFORM_CHOICES = [
        ('facebook', 'Facebook'),
        ('whatsapp', 'WhatsApp'),
        ('twitter', 'Twitter'),
        ('copy_link', 'Copy Link'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='article_shares',
        verbose_name=_('user')
    )
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='shares',
        verbose_name=_('article')
    )
    platform = models.CharField(
        _('platform'),
        max_length=20,
        choices=SHARE_PLATFORM_CHOICES,
        default='copy_link'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('article share')
        verbose_name_plural = _('article shares')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} shared {self.article.id} on {self.platform}"