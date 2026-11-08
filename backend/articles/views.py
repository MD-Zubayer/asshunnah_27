from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import CursorPagination
from django.shortcuts import get_object_or_404, render
from django.http import Http404
from .models import Article, ArticleReaction, ArticleComment, ArticleView, ArticleShare
from .serializers import (
    ArticleSerializer, ArticleCreateSerializer,
    ArticleCommentSerializer, ArticleCommentCreateSerializer,
    ArticleShareSerializer
)


class ArticleCursorPagination(CursorPagination):
    """Facebook-style cursor pagination for infinite scroll"""
    page_size = 10
    ordering = '-created_at'
    cursor_query_param = 'cursor'


class ArticleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for articles with Facebook-style interactions.
    Guest users can read; login required for write actions.
    """
    pagination_class = ArticleCursorPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Article.objects.filter(is_published=True).select_related('user')
        
        # Annotate reach counts (Reactions, Comments, Shares, Views)
        from django.db.models import Count, Case, When, Value, ExpressionWrapper, F, FloatField, IntegerField
        from django.db.models.expressions import RawSQL
        from django.utils import timezone
        import datetime
        
        queryset = queryset.annotate(
            num_reactions=Count('reactions', distinct=True),
            num_comments=Count('comments', distinct=True),
            num_shares=Count('shares', distinct=True),
            num_views=Count('views', distinct=True)
        )
        
        # Global Reach Score = Reactions * 4 + Comments * 5 + Shares * 6 + Views
        queryset = queryset.annotate(
            global_reach_score=ExpressionWrapper(
                F('num_reactions') * 4 + F('num_comments') * 5 + F('num_shares') * 6 + F('num_views'),
                output_field=FloatField()
            )
        )
        
        # Time-decay score = (Reach Score + 1) / (Age in Hours + 2) ^ 1.5
        # We calculate Age in Hours using PostgreSQL EXTRACT EPOCH
        from django.db.models.functions import Power
        queryset = queryset.annotate(
            age_hours=RawSQL(
                "EXTRACT(EPOCH FROM (NOW() - articles_article.created_at)) / 3600.0",
                [],
                output_field=FloatField()
            )
        ).annotate(
            decay_score=ExpressionWrapper(
                (F('num_reactions') * 4 + F('num_comments') * 5 + F('num_shares') * 6 + F('num_views') + 1.0) / Power(F('age_hours') + 2.0, 1.5),
                output_field=FloatField()
            )
        )
        
        # Prioritize own fresh posts (created in the last 2 hours)
        two_hours_ago = timezone.now() - datetime.timedelta(hours=2)
        if user.is_authenticated:
            queryset = queryset.annotate(
                is_own_fresh_post=Case(
                    When(user=user, created_at__gte=two_hours_ago, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField()
                )
            )
        
        if user.is_authenticated:
            from django.core.cache import cache
            interactions = cache.get(f"user_interactions_{user.id}", [])
            
            if interactions:
                article_weights = {}
                for art_id, weight, timestamp in interactions:
                    article_weights[art_id] = article_weights.get(art_id, 0) + weight
                
                interacted_articles = Article.objects.filter(id__in=article_weights.keys(), embedding__isnull=False)
                
                vectors = []
                weights = []
                for art in interacted_articles:
                    vectors.append(art.embedding)
                    weights.append(article_weights[art.id])
                
                if vectors:
                    pref_vector = [0.0] * 768
                    total_weight = sum(weights)
                    for vec, w in zip(vectors, weights):
                        for i in range(768):
                            pref_vector[i] += vec[i] * w
                    for i in range(768):
                        pref_vector[i] /= total_weight
                        
                    from pgvector.django import CosineDistance
                    # Ordering:
                    # 1. User's own fresh posts (descending)
                    # 2. Similarity (distance asc, closest first)
                    # 3. Decay score (popularity + age decay descending)
                    # 4. Standard time fallback
                    queryset = queryset.annotate(
                        distance=CosineDistance('embedding', pref_vector)
                    ).order_by(
                        '-is_own_fresh_post',
                        F('distance').asc(nulls_last=True),
                        '-decay_score',
                        '-created_at'
                    )
                    return queryset
            
            # Authenticated but no interaction history: Own fresh posts first, then decay score
            return queryset.order_by('-is_own_fresh_post', '-decay_score', '-created_at')
            
        # Anonymous users: sort by decay score
        return queryset.order_by('-decay_score', '-created_at')

    def get_pagination_class(self):
        # Use standard PageNumberPagination when ranking dynamically for authenticated users
        if self.action == 'list' and self.request.user.is_authenticated:
            from rest_framework.pagination import PageNumberPagination
            return PageNumberPagination
        return ArticleCursorPagination

    @property
    def pagination_class(self):
        return self.get_pagination_class()

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'user_articles', 'summary']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return ArticleCreateSerializer
        return ArticleSerializer

    def perform_create(self, serializer):
        article = serializer.save(user=self.request.user)
        # Broadcast new article via WebSocket
        from .consumers import broadcast_new_article
        broadcast_new_article(article)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Track view only for authenticated users
        if request.user.is_authenticated:
            ArticleView.objects.get_or_create(user=request.user, article=instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response(
                {'error': 'You can only delete your own articles'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """React to an article"""
        article = get_object_or_404(Article, pk=pk)
        reaction_type = request.data.get('reaction_type', 'like')
        
        valid_reactions = [r[0] for r in ArticleReaction.REACTION_CHOICES]
        if reaction_type not in valid_reactions:
            return Response(
                {'error': f'Invalid reaction type. Must be one of: {valid_reactions}'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        reaction, created = ArticleReaction.objects.get_or_create(
            user=request.user,
            article=article,
            defaults={'reaction_type': reaction_type}
        )
        
        if not created:
            if reaction.reaction_type == reaction_type:
                reaction.delete()
                user_reacted = None
            else:
                reaction.reaction_type = reaction_type
                reaction.save(update_fields=['reaction_type'])
                user_reacted = reaction_type
        else:
            user_reacted = reaction_type
            
        # Log reaction interaction with weight 4
        from django.core.cache import cache
        from django.utils import timezone
        cache_key = f"user_interactions_{request.user.id}"
        interactions = cache.get(cache_key, [])
        interactions.append((article.id, 4, timezone.now()))
        cache.set(cache_key, interactions[-200:], timeout=60*60*24*30)
            
        from django.db.models import Count
        counts = article.reactions.values('reaction_type').annotate(count=Count('id'))
        counts_dict = {r[0]: 0 for r in ArticleReaction.REACTION_CHOICES}
        total = 0
        for item in counts:
            rtype = item['reaction_type']
            cnt = item['count']
            if rtype in counts_dict:
                counts_dict[rtype] = cnt
                total += cnt
        counts_dict['total'] = total
        
        return Response({
            'user_reaction': user_reacted,
            'reaction_counts': counts_dict,
            'reaction_count': total
        })

    @action(detail=True, methods=['post'])
    def dwell(self, request, pk=None):
        """Record reading dwell time on an article (>10s)"""
        article = get_object_or_404(Article, pk=pk)
        if request.user.is_authenticated:
            from django.core.cache import cache
            from django.utils import timezone
            cache_key = f"user_interactions_{request.user.id}"
            interactions = cache.get(cache_key, [])
            interactions.append((article.id, 2, timezone.now()))
            cache.set(cache_key, interactions[-200:], timeout=60*60*24*30)
        return Response({'status': 'dwell time recorded'})

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        """Get or create comments on an article"""
        article = get_object_or_404(Article, pk=pk)
        
        if request.method == 'GET':
            # Get top-level comments with replies
            comments = article.comments.filter(parent_comment__isnull=True)
            serializer = ArticleCommentSerializer(
                comments, many=True, context={'request': request}
            )
            return Response(serializer.data)
        
        # POST - Create comment
        serializer = ArticleCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        comment = ArticleComment.objects.create(
            user=request.user,
            article=article,
            text=serializer.validated_data['text'],
            parent_comment=serializer.validated_data.get('parent_comment')
        )
        
        # Log comment interaction with weight 5
        if request.user.is_authenticated:
            from django.core.cache import cache
            from django.utils import timezone
            cache_key = f"user_interactions_{request.user.id}"
            interactions = cache.get(cache_key, [])
            interactions.append((article.id, 5, timezone.now()))
            cache.set(cache_key, interactions[-200:], timeout=60*60*24*30)
        
        # Broadcast comment via WebSocket
        from .consumers import broadcast_new_comment
        broadcast_new_comment(comment)
        
        return Response(
            ArticleCommentSerializer(comment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        """Track view on an article"""
        article = get_object_or_404(Article, pk=pk)
        ArticleView.objects.get_or_create(user=request.user, article=article)
        
        # Log view interaction with weight 1
        if request.user.is_authenticated:
            from django.core.cache import cache
            from django.utils import timezone
            cache_key = f"user_interactions_{request.user.id}"
            interactions = cache.get(cache_key, [])
            interactions.append((article.id, 1, timezone.now()))
            cache.set(cache_key, interactions[-200:], timeout=60*60*24*30)
            
        return Response({'view_count': article.view_count})

    @action(detail=True, methods=['get', 'post'])
    def summary(self, request, pk=None):
        """Retrieve or generate AI summary for an article"""
        article = get_object_or_404(Article, pk=pk)
        if not article.summary:
            from .ai_service import generate_summary
            article.summary = generate_summary(article.content)
            article.save(update_fields=['summary'])
        return Response({'summary': article.summary})

    @action(detail=False, methods=['get'])
    def user_articles(self, request):
        """
        Get articles by a specific user.
        Query params: user_id (required), page (optional)
        """
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        articles = Article.objects.filter(
            user_id=user_id,
            is_published=True
        ).select_related('user').order_by('-created_at')
        
        page = int(request.query_params.get('page', 1))
        page_size = 10
        start = (page - 1) * page_size
        end = start + page_size
        
        articles_page = articles[start:end]
        has_next = articles.count() > end
        
        serializer = ArticleSerializer(
            articles_page, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'results': serializer.data,
            'has_next': has_next,
            'page': page,
        })

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Track share on an article"""
        article = get_object_or_404(Article, pk=pk)
        platform = request.data.get('platform', 'copy_link')
        
        share = ArticleShare.objects.create(
            user=request.user,
            article=article,
            platform=platform
        )
        
        # Log share interaction with weight 6
        if request.user.is_authenticated:
            from django.core.cache import cache
            from django.utils import timezone
            cache_key = f"user_interactions_{request.user.id}"
            interactions = cache.get(cache_key, [])
            interactions.append((article.id, 6, timezone.now()))
            cache.set(cache_key, interactions[-200:], timeout=60*60*24*30)
        
        # Broadcast share via WebSocket
        from .consumers import broadcast_article_shared
        broadcast_article_shared(article, platform)
        
        return Response({
            'share_count': article.share_count,
            'platform': platform
        }, status=status.HTTP_201_CREATED)


def article_detail_view(request, pk):
    """
    Public HTML view for article detail page.
    This is the page shown when someone clicks on a shared article link.
    """
    try:
        article = Article.objects.select_related('user').get(pk=pk, is_published=True)
    except Article.DoesNotExist:
        return render(request, 'articles/article_detail.html', {
            'article': None
        }, status=404)
    
    # Get user name
    user = article.user
    if user.first_name or user.last_name:
        author_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    else:
        author_name = user.email.split('@')[0] if user.email else 'ব্যবহারকারী'
    
    # Get author initial
    author_initial = author_name[0].upper() if author_name else 'A'
    
    # Format created at
    created_at = article.created_at.strftime('%d %B %Y')
    
    # Get article excerpt for meta description
    content = article.content or ''
    excerpt = content[:150] + '...' if len(content) > 150 else content
    
    # Get article image URL
    article_image = None
    if article.image:
        article_image = request.build_absolute_uri(article.image.url)
    
    # Build article URL
    article_url = request.build_absolute_uri(f'/article/{pk}')
    
    # Track view (anonymous views are not tracked, only logged-in users)
    if request.user.is_authenticated:
        ArticleView.objects.get_or_create(user=request.user, article=article)
    
    context = {
        'article': article,
        'article_title': excerpt[:50] + '...' if len(excerpt) > 50 else excerpt,
        'article_content': content,
        'article_excerpt': excerpt,
        'article_image': article_image,
        'article_url': article_url,
        'author_name': author_name,
        'author_initial': author_initial,
        'created_at': created_at,
        'like_count': article.like_count,
        'comment_count': article.comment_count,
        'view_count': article.view_count,
    }
    
    return render(request, 'articles/article_detail.html', context)
