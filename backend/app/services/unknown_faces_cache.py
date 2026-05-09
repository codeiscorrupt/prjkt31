from collections import deque
from typing import Dict, Optional, Tuple, Union
import threading
import time
import numpy as np
from app.core.config import settings

class UnknownFaceCache:
    def __init__(
        self, 
        max_size: int = settings.UNKNOWN_FACE_CACHE_MAX,
        required_nbr: int = settings.UNKNOWN_FACE_CACHE_REQUIRED,
        threshold: float = settings.UNKNOWN_FACE_THRESHOLD,
        metric: str = settings.UNKNOWN_FACE_METRIC,
        ttl_seconds: int = settings.UNKNOWN_FACE_TTL
    ):
        self.max_size = max_size
        self.threshold = threshold
        self.metric = metric.lower()
        self.ttl = ttl_seconds
        
        # FIFO store: each item = {"id": int, "embedding": np.ndarray, "timestamp": float}
        self._store: deque = deque(maxlen=self.max_size)
        self._lock = threading.Lock()
        self._next_id = 0

    def _to_numpy(self, emb: Union[np.ndarray, list]) -> np.ndarray:
        return np.asarray(emb, dtype=np.float32).flatten()

    def _compute_distance(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        if self.metric == "cosine":
            # Assumes L2-normalized embeddings (standard for ArcFace, FaceNet, etc.)
            return 1.0 - np.dot(emb1, emb2)
        elif self.metric == "l2":
            return np.linalg.norm(emb1 - emb2)
        elif self.metric == "ip":
            # Higher dot = more similar → invert for distance logic
            return -np.dot(emb1, emb2)
        else:
            raise ValueError(f"Unsupported distance metric: {self.metric}")
        
    def check_consensus(self, required_nbr: int) -> Tuple[bool, Optional[int], int]:
        """
        Scans the FIFO cache to see if ANY face ID has appeared `required_nbr` times.
        Returns: (has_consensus: bool, winning_id: Optional[int], highest_count: int)
        """
        with self._lock:
            votes: Dict[int, int] = {}
            max_count = 0

            for item in self._store:
                uid = item["id"]
                count = votes.get(uid, 0) + 1
                votes[uid] = count

                if count > max_count:
                    max_count = count
                    winning_id = uid

            if max_count >= required_nbr:
                return True
            return False
        
    def register(self, embedding: Union[np.ndarray, list]) -> bool:
        """
        Register a new face embedding.
        Returns: False (if no unknown face is reoccuring)
            or   True (if an unknown face is reoccuring)
        """
        emb = self._to_numpy(embedding)
        
        with self._lock:
            now = time.time()
            
            # Lazy TTL cleanup (O(N) but lightweight for typical cache sizes)
            if self._store:
                self._store = deque(
                    [item for item in self._store if (now - item["timestamp"]) <= self.ttl],
                    maxlen=self.max_size
                )

            min_dist = float("inf")

            # Linear scan against all cached embeddings
            for item in self._store:
                dist = self._compute_distance(emb, item["embedding"])
                if dist < min_dist:
                    min_dist = dist
                    if dist <= self.threshold:
                        self._store.append({"id": item["id"], "embedding": emb, "timestamp": now})
                        return self.check_consensus(self._store)
                    
                last_id = item["id"]
            
            self._next_id = last_id + 1
            self._store.append({"id": self._next_id, "embedding": emb, "timestamp": now})
            return self.check_consensus(self._store)

# Global singleton instance
unknown_faces_cache = UnknownFaceCache()