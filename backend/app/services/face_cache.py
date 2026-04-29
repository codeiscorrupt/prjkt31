# app/services/face_cache.py
from collections import deque
from typing import Dict, Tuple, Optional
import threading
import time
from app.core.config import settings

class FaceConsensusCache:
    def __init__(self, max_size: int = 10, threshold: int = 5, ttl_seconds: int = 15):
        self.max_size = max_size
        self.threshold = threshold
        self.ttl = ttl_seconds
        self._store: Dict[str, dict] = {}  # {client_id: {"queue": deque, "created": float}}
        self._lock = threading.Lock()

    def record(self, client_id: str, user_id: int) -> Tuple[Optional[int], int]:
        """Adds a match to FIFO cache. Returns (winning_user_id or None, current_vote_count)"""
        with self._lock:
            now = time.time()
            if client_id not in self._store or (now - self._store[client_id]["created"]) > self.ttl:
                self._store[client_id] = {"queue": deque(maxlen=self.max_size), "created": now}

            self._store[client_id]["queue"].append(user_id)

            # Count votes per user
            votes = {}
            for uid in self._store[client_id]["queue"]:
                votes[uid] = votes.get(uid, 0) + 1

            # Check consensus
            for uid, count in votes.items():
                if count >= self.threshold:
                    del self._store[client_id]  # Clear cache on success
                    return uid, count

            return None, votes.get(user_id, 0)

# Global instance (singleton)
face_cache = FaceConsensusCache(settings.CACHE_MAX, settings.CACH_REQUIRED)