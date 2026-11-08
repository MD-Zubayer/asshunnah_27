import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class ArticleConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time article updates.
    Clients connect to receive live updates for:
    - New articles
    - Article likes
    - New comments
    - Article shares
    """
    
    async def connect(self):
        """Join the articles group when client connects"""
        self.group_name = 'articles'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        """Leave the articles group when client disconnects"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming messages from client"""
        data = json.loads(text_data)
        message_type = data.get('type')
        
        # Client can send ping to keep connection alive
        if message_type == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    # Event handlers - these are called from broadcast functions
    async def new_article(self, event):
        """Send new article notification to client"""
        await self.send(text_data=json.dumps({
            'type': 'new_article',
            'article': event['article']
        }))

    async def article_liked(self, event):
        """Send article liked notification to client"""
        await self.send(text_data=json.dumps({
            'type': 'article_liked',
            'article_id': event['article_id'],
            'like_count': event['like_count'],
            'liked_by': event['liked_by']
        }))

    async def new_comment(self, event):
        """Send new comment notification to client"""
        await self.send(text_data=json.dumps({
            'type': 'new_comment',
            'article_id': event['article_id'],
            'comment': event['comment'],
            'comment_count': event['comment_count']
        }))

    async def article_shared(self, event):
        """Send article shared notification to client"""
        await self.send(text_data=json.dumps({
            'type': 'article_shared',
            'article_id': event['article_id'],
            'share_count': event['share_count'],
            'platform': event['platform']
        }))


# Broadcast helper functions (called from views.py)

def broadcast_new_article(article):
    """Broadcast a new article to all connected clients"""
    try:
        channel_layer = get_channel_layer()
        article_data = {
            'id': article.id,
            'content': article.content,
            'user': {
                'id': article.user.id,
                'email': article.user.email,
                'first_name': article.user.first_name,
                'last_name': article.user.last_name,
            },
            'like_count': 0,
            'comment_count': 0,
            'view_count': 0,
            'share_count': 0,
            'created_at': article.created_at.isoformat(),
        }
        async_to_sync(channel_layer.group_send)(
            'articles',
            {
                'type': 'new_article',
                'article': article_data
            }
        )
    except Exception as e:
        print(f"Error broadcasting new article: {e}")


def broadcast_article_liked(article, user):
    """Broadcast an article like to all connected clients"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'articles',
            {
                'type': 'article_liked',
                'article_id': article.id,
                'like_count': article.like_count,
                'liked_by': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }
        )
    except Exception as e:
        print(f"Error broadcasting article like: {e}")


def broadcast_new_comment(comment):
    """Broadcast a new comment to all connected clients"""
    try:
        channel_layer = get_channel_layer()
        comment_data = {
            'id': comment.id,
            'text': comment.text,
            'user': {
                'id': comment.user.id,
                'email': comment.user.email,
                'first_name': comment.user.first_name,
                'last_name': comment.user.last_name,
            },
            'parent_comment': comment.parent_comment_id,
            'created_at': comment.created_at.isoformat(),
        }
        async_to_sync(channel_layer.group_send)(
            'articles',
            {
                'type': 'new_comment',
                'article_id': comment.article.id,
                'comment': comment_data,
                'comment_count': comment.article.comment_count
            }
        )
    except Exception as e:
        print(f"Error broadcasting new comment: {e}")


def broadcast_article_shared(article, platform):
    """Broadcast an article share to all connected clients"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'articles',
            {
                'type': 'article_shared',
                'article_id': article.id,
                'share_count': article.share_count,
                'platform': platform
            }
        )
    except Exception as e:
        print(f"Error broadcasting article share: {e}")