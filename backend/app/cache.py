"""Bộ nhớ đệm ngắn hạn cho các API thống kê đọc nhiều, ghi ít."""

from collections import OrderedDict
from threading import RLock
from time import monotonic
from typing import Any


class TTLCache:
    def __init__(self, ttl_seconds: int = 60, max_entries: int = 256):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._entries: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = RLock()

    def get(self, key: str):
        now = monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None

            expires_at, value = entry
            if expires_at <= now:
                self._entries.pop(key, None)
                return None

            self._entries.move_to_end(key)
            return value

    def set(self, key: str, value: Any, ttl_seconds: int | None = None):
        ttl = self.ttl_seconds if ttl_seconds is None else max(1, ttl_seconds)
        with self._lock:
            self._entries[key] = (monotonic() + ttl, value)
            self._entries.move_to_end(key)
            while len(self._entries) > self.max_entries:
                self._entries.popitem(last=False)
        return value

    def invalidate_prefix(self, prefix: str):
        with self._lock:
            for key in [item for item in self._entries if item.startswith(prefix)]:
                self._entries.pop(key, None)


analytics_cache = TTLCache(ttl_seconds=60, max_entries=256)


def user_cache_key(user_id: str, area: str, *parts: object) -> str:
    suffix = ":".join(str(part or "") for part in parts)
    return f"user:{user_id}:{area}:{suffix}"
