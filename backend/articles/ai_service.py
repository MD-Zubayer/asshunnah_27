import requests
import logging
import hashlib
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
DEFAULT_MODEL = "accounts/fireworks/models/deepseek-v4-flash-0731"

def get_key_hash(key: str) -> str:
    """Returns a hash of the key to safely store/reference in cache keys"""
    return hashlib.sha256(key.encode('utf-8')).hexdigest()

def get_active_api_key() -> str:
    """Returns the first non-blocked API key from settings"""
    keys = getattr(settings, 'FIREWORKS_API_KEYS', [])
    for key in keys:
        key_hash = get_key_hash(key)
        # Check if this key is marked as blocked in cache
        if not cache.get(f"fireworks_key_blocked_{key_hash}"):
            return key
    return None

def block_api_key(key: str):
    """Marks an API key as blocked in the cache for 7 days"""
    key_hash = get_key_hash(key)
    cache.set(f"fireworks_key_blocked_{key_hash}", True, timeout=60*60*24*7)
    logger.warning(f"Fireworks API key (...{key[-6:] if len(key) > 6 else ''}) has been blocked in cache.")

def call_fireworks_with_rotation(messages, temperature=0.7, max_tokens=500):
    """
    Attempts to call Fireworks AI Chat Completion.
    If a key fails due to rate/quota limits, it marks the key as blocked in cache and tries the next key.
    """
    while True:
        api_key = get_active_api_key()
        if not api_key:
            raise ValueError("No active Fireworks API keys available. Please add new keys to .env.")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": DEFAULT_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        try:
            response = requests.post(FIREWORKS_API_URL, json=payload, headers=headers, timeout=10)
            
            # Check for quota / rate limit / payment errors
            if response.status_code in [402, 429] or (response.status_code == 400 and "quota" in response.text.lower()):
                logger.warning(f"API Key ...{api_key[-6:] if len(api_key) > 6 else ''} exhausted/blocked (Status: {response.status_code}). Rotating.")
                block_api_key(api_key)
                continue
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                status_code = e.response.status_code
                if status_code in [401, 403, 402, 429]:
                    logger.warning(f"API key ...{api_key[-6:] if len(api_key) > 6 else ''} returned HTTP {status_code}. Rotating.")
                    block_api_key(api_key)
                    continue
            raise e

def moderate_content(content: str) -> bool:
    """
    Returns True if content is safe and allowed.
    Returns False if content contains inappropriate or invalid text.
    """
    if not content or not content.strip():
        return True

    messages = [
        {"role": "system", "content": "You are a content moderation assistant. Check if the post content is appropriate. Do not allow hate speech, sexual content, spam, extreme abuse, or nonsensical gibberish. Respond with exactly one word: 'SAFE' or 'UNSAFE'."},
        {"role": "user", "content": content}
    ]
    try:
        res = call_fireworks_with_rotation(messages, temperature=0.0, max_tokens=10)
        decision = res['choices'][0]['message']['content'].strip().upper()
        return "SAFE" in decision and "UNSAFE" not in decision
    except Exception as e:
        logger.error(f"Error in moderation: {e}")
        # Default to True so AI failures don't block users
        return True

def generate_summary(content: str) -> str:
    """
    Generates a brief summary (max 2 sentences) of the post.
    """
    if not content or not content.strip():
        return ""

    messages = [
        {"role": "system", "content": "You are a summarization assistant. Summarize the user post in Bengali (matching the input language if Bengali, otherwise translate to simple Bengali) in a single concise sentence. Avoid introductory phrases, directly provide the summary."},
        {"role": "user", "content": content}
    ]
    try:
        res = call_fireworks_with_rotation(messages, temperature=0.5, max_tokens=150)
        return res['choices'][0]['message']['content'].strip()
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return "সারসংক্ষেপ তৈরি করতে সমস্যা হয়েছে।"

# --- Gemini Embedding Configuration ---
GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"

def get_active_gemini_key() -> str:
    """Returns the first non-blocked Gemini API key from settings"""
    keys = getattr(settings, 'GEMINI_API_KEYS', [])
    for key in keys:
        key_hash = get_key_hash(key)
        if not cache.get(f"gemini_key_blocked_{key_hash}"):
            return key
    return None

def block_gemini_key(key: str):
    """Marks a Gemini API key as blocked in cache for 15 minutes (rate limit cooling)"""
    key_hash = get_key_hash(key)
    cache.set(f"gemini_key_blocked_{key_hash}", True, timeout=60*15)
    logger.warning(f"Gemini API key (...{key[-6:] if len(key) > 6 else ''}) has been blocked in cache.")

def generate_embedding(text: str) -> list:
    """Generates 768-dimension embedding vector for the text using rotated Gemini keys"""
    if not text or not text.strip():
        return [0.0] * 768

    while True:
        api_key = get_active_gemini_key()
        if not api_key:
            logger.error("No active Gemini API keys available for embedding generation.")
            return [0.0] * 768
        
        url = f"{GEMINI_EMBED_URL}?key={api_key}"
        payload = {
            "model": "models/text-embedding-004",
            "content": {
                "parts": [{"text": text}]
            }
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code in [403, 429]:
                # Rate limit or quota or auth error
                logger.warning(f"Gemini API Key ...{api_key[-6:] if len(api_key) > 6 else ''} failed (Status: {response.status_code}). Rotating.")
                block_gemini_key(api_key)
                continue
            response.raise_for_status()
            return response.json()['embedding']['values']
        except Exception as e:
            logger.error(f"Error in Gemini embedding generation: {e}")
            return [0.0] * 768
