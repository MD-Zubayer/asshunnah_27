from unittest.mock import patch
from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Article
from .ai_service import call_fireworks_with_rotation, get_key_hash, get_active_api_key

User = get_user_model()

class FireworksRotationTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(FIREWORKS_API_KEYS=["key_one", "key_two"])
    @patch("requests.post")
    def test_key_rotation_on_exhaustion(self, mock_post):
        # First key fails with 429, second key succeeds
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self.json_data = json_data
                self.text = str(json_data)
            
            def json(self):
                return self.json_data
            
            def raise_for_status(self):
                if self.status_code >= 400:
                    import requests
                    raise requests.exceptions.HTTPError(response=self)

        mock_post.side_effect = [
            MockResponse(429, {"error": "Quota exceeded"}),
            MockResponse(200, {"choices": [{"message": {"content": "SAFE"}}]})
        ]

        # Initially, key_one should be active
        self.assertEqual(get_active_api_key(), "key_one")

        # Call the rotated function
        res = call_fireworks_with_rotation([{"role": "user", "content": "hello"}])
        
        # Verify call succeeded
        self.assertEqual(res["choices"][0]["message"]["content"], "SAFE")

        # Verify key_one is now blocked, and key_two is active
        self.assertTrue(cache.get(f"fireworks_key_blocked_{get_key_hash('key_one')}"))
        self.assertEqual(get_active_api_key(), "key_two")


class ArticleAIIntegrationTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="testuser@example.com", password="password123")
        self.client.force_authenticate(user=self.user)

    @override_settings(FIREWORKS_API_KEYS=["test_key"])
    @patch("articles.ai_service.call_fireworks_with_rotation")
    def test_post_moderation_safe(self, mock_ai):
        mock_ai.return_value = {
            "choices": [{"message": {"content": "SAFE"}}]
        }

        response = self.client.post("/api/articles/", {"content": "This is a safe, polite post."})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Article.objects.count(), 1)

    @override_settings(FIREWORKS_API_KEYS=["test_key"])
    @patch("articles.ai_service.call_fireworks_with_rotation")
    def test_post_moderation_unsafe(self, mock_ai):
        mock_ai.return_value = {
            "choices": [{"message": {"content": "UNSAFE"}}]
        }

        response = self.client.post("/api/articles/", {"content": "abusive content!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.data)
        self.assertEqual(Article.objects.count(), 0)

    @override_settings(FIREWORKS_API_KEYS=["test_key"])
    @patch("articles.ai_service.call_fireworks_with_rotation")
    def test_summary_generation_endpoint(self, mock_ai):
        article = Article.objects.create(user=self.user, content="Some article content that needs summarization.")
        
        mock_ai.return_value = {
            "choices": [{"message": {"content": "এটি একটি চমৎকার পোস্ট।"}}]
        }

        response = self.client.post(f"/api/articles/{article.id}/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"], "এটি একটি চমৎকার পোস্ট।")
        
        # Verify it got saved to database
        article.refresh_from_db()
        self.assertEqual(article.summary, "এটি একটি চমৎকার পোস্ট।")


from .ai_service import generate_embedding, get_active_gemini_key

class GeminiRotationTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(GEMINI_API_KEYS=["gemini_one", "gemini_two"])
    @patch("requests.post")
    def test_gemini_key_rotation_on_exhaustion(self, mock_post):
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self.json_data = json_data
            
            def json(self):
                return self.json_data
            
            def raise_for_status(self):
                if self.status_code >= 400:
                    import requests
                    raise requests.exceptions.HTTPError(response=self)

        mock_post.side_effect = [
            MockResponse(429, {"error": "Quota exceeded"}),
            MockResponse(200, {"embedding": {"values": [0.1] * 768}})
        ]

        # Verify key_one active initially
        self.assertEqual(get_active_gemini_key(), "gemini_one")

        # Call generate_embedding
        vec = generate_embedding("hello world")

        # Verify second key embedding values returned
        self.assertEqual(vec[0], 0.1)

        # Verify first key is blocked and second is active
        self.assertTrue(cache.get(f"gemini_key_blocked_{get_key_hash('gemini_one')}"))
        self.assertEqual(get_active_gemini_key(), "gemini_two")


class ArticleReactionAPITests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="user@example.com", password="password")
        self.client.force_authenticate(user=self.user)
        self.article = Article.objects.create(user=self.user, content="Test article content")

    def test_react_endpoint_create_and_toggle(self):
        # 1. Post a reaction
        response = self.client.post(f"/api/articles/{self.article.id}/react/", {"reaction_type": "love"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_reaction"], "love")
        self.assertEqual(response.data["reaction_counts"]["love"], 1)
        self.assertEqual(response.data["reaction_counts"]["total"], 1)

        # 2. Toggle the same reaction off
        response = self.client.post(f"/api/articles/{self.article.id}/react/", {"reaction_type": "love"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["user_reaction"])
        self.assertEqual(response.data["reaction_counts"]["love"], 0)
        self.assertEqual(response.data["reaction_counts"]["total"], 0)
