import json
import logging
from typing import Any

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Redis cache service with safe degradation/fallback when Redis is not reachable or not configured.
    Ensures that failures in the caching layer do not break user-facing read or write workflows.
    """

    def __init__(self, redis_url: str | None = None):
        self.redis_client: redis.Redis | None = None
        self.enabled = False
        url = redis_url or settings.REDIS_URL
        if url:
            try:
                self.redis_client = redis.from_url(
                    url,
                    socket_connect_timeout=1.0,
                    socket_timeout=1.0,
                    decode_responses=True,
                )
                # Attempt ping with brief timeout
                self.redis_client.ping()
                self.enabled = True
                logger.info("Redis cache successfully connected.")
            except Exception as e:
                logger.warning("Redis cache unavailable; operating in bypass fallback mode: %s", e)
                self.enabled = False

    def get(self, key: str) -> Any | None:
        if not self.enabled or not self.redis_client:
            return None
        try:
            val = self.redis_client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning("Redis get error for key %s: %s", key, e)
        return None

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        if not self.enabled or not self.redis_client:
            return
        try:
            ttl_seconds = ttl if ttl is not None else settings.CACHE_TTL_SECONDS
            self.redis_client.set(key, json.dumps(value, default=str), ex=ttl_seconds)
        except Exception as e:
            logger.warning("Redis set error for key %s: %s", key, e)

    def invalidate_user_tasks(self, user_id: int) -> None:
        """Invalidate all cached task queries for a specific user."""
        if not self.enabled or not self.redis_client:
            return
        try:
            pattern = f"tasks:user:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.debug("Invalidated %d cache keys for user %d", len(keys), user_id)
        except Exception as e:
            logger.warning("Redis invalidation error for user %d: %s", user_id, e)

    def ping(self) -> bool:
        """Health check probe for Redis."""
        if not self.redis_client:
            return False
        try:
            return bool(self.redis_client.ping())
        except Exception:
            return False


cache_service = CacheService()
