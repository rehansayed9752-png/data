import asyncio
import inspect
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

import httpx
from google import genai
from google.genai.errors import APIError

from config import settings

logger = logging.getLogger("gemini_key_pool")


def mask_api_key(key: str) -> str:
    """Masks API keys for structured logs and diagnostics (e.g. AIza...XXXX)."""
    if not key or len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"


@dataclass
class KeySlot:
    slot_id: str
    api_key: str
    client: genai.Client
    cooldown_until: float = 0.0
    total_requests: int = 0
    total_successes: int = 0
    rate_limit_hits: int = 0
    last_error: Optional[str] = None

    @property
    def masked_key(self) -> str:
        return mask_api_key(self.api_key)

    @property
    def is_healthy(self) -> bool:
        return time.time() >= self.cooldown_until

    @property
    def cooldown_remaining(self) -> float:
        return max(0.0, self.cooldown_until - time.time())


def is_rate_limit_or_transient_error(err: Exception) -> bool:
    """Detects 429 quota exhaustion, 503 service unavailable, timeouts, and resource errors."""
    code = getattr(err, "code", None)
    if code in (429, 503, 504):
        return True

    err_str = str(err).lower()
    transient_indicators = (
        "429",
        "resource_exhausted",
        "quota exceeded",
        "rate limit",
        "rate_limit",
        "503",
        "unavailable",
        "timeout",
        "timed out",
        "deadline exceeded",
        "overloaded",
    )
    if any(indicator in err_str for indicator in transient_indicators):
        return True

    if isinstance(err, (httpx.TimeoutException, TimeoutError, asyncio.TimeoutError)):
        return True

    return False


class GeminiKeyPool:
    """
    Thread-safe & async-safe singleton managing multi-key rotation and automatic failover
    across Google AI Studio projects.
    """

    _instance: Optional["GeminiKeyPool"] = None
    _init_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = super(GeminiKeyPool, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self._lock = threading.Lock()
        self._rr_index = 0
        self.slots: List[KeySlot] = []
        self._reload_keys()
        self._initialized = True

    def _reload_keys(self) -> None:
        """Initializes or re-syncs KeySlots from configured environment keys."""
        configured_keys = settings.GEMINI_API_KEYS
        slots: List[KeySlot] = []

        for i, key in enumerate(configured_keys):
            slot_id = f"key_{i + 1}"
            try:
                client = genai.Client(api_key=key)
                slots.append(
                    KeySlot(
                        slot_id=slot_id,
                        api_key=key,
                        client=client,
                    )
                )
            except Exception as e:
                logger.error(f"[GeminiKeyPool] Failed to instantiate Client for slot {slot_id}: {e}")

        self.slots = slots
        logger.info(f"[GeminiKeyPool] Initialized pool with {len(self.slots)} key slot(s)")

    def get_slot_by_id(self, slot_id: str) -> Optional[KeySlot]:
        for slot in self.slots:
            if slot.slot_id == slot_id:
                return slot
        return None

    def get_next_available_slot(self, exclude_slots: Optional[Set[str]] = None) -> Optional[KeySlot]:
        """
        Round-Robin Selection with Cooldown Bypass:
        1. Selects the next healthy slot in round-robin sequence.
        2. If all eligible slots are in cooldown, falls back to the slot whose cooldown expires soonest.
        """
        with self._lock:
            if not self.slots:
                # Attempt lazy reload in case keys were populated post-startup
                self._reload_keys()
                if not self.slots:
                    return None

            exclude = exclude_slots or set()
            eligible = [s for s in self.slots if s.slot_id not in exclude]
            if not eligible:
                return None

            now = time.time()
            healthy_slots = [s for s in eligible if now >= s.cooldown_until]

            if healthy_slots:
                # Advance round-robin pointer among healthy slots
                selected = healthy_slots[self._rr_index % len(healthy_slots)]
                self._rr_index = (self._rr_index + 1) % len(self.slots)
                return selected

            # If all are cooling down, select the one expiring soonest
            eligible.sort(key=lambda s: s.cooldown_until)
            return eligible[0]

    def get_distinct_slots(self, count: int = 3) -> List[KeySlot]:
        """
        Returns up to `count` distinct slots for parallel execution across accounts (e.g. Variations A/B/C).
        Distributes across separate Google AI Studio keys in round-robin order.
        """
        with self._lock:
            if not self.slots:
                self._reload_keys()
            if not self.slots:
                return []

            available_count = len(self.slots)
            if available_count >= count:
                selected = []
                for i in range(count):
                    idx = (self._rr_index + i) % available_count
                    selected.append(self.slots[idx])
                self._rr_index = (self._rr_index + count) % available_count
                return selected

            # When fewer keys exist than requested count, cycle existing slots
            return [self.slots[i % available_count] for i in range(count)]

    async def execute_with_failover(
        self,
        func: Callable[[genai.Client, KeySlot], Any],
        model_name: str = "",
    ) -> Tuple[Any, str]:
        """
        Executes a Gemini operation across the key pool.
        If a slot encounters a 429/quota/503/timeout error, it marks that slot on cooldown
        and immediately fails over to the next healthy slot without error propagation to the user.
        """
        if not self.slots:
            self._reload_keys()
            if not self.slots:
                raise RuntimeError("No Gemini API keys configured. Please configure GEMINI_API_KEY_1... in .env")

        tried_slots: Set[str] = set()
        max_attempts = len(self.slots)
        last_exception: Optional[Exception] = None

        for attempt in range(max_attempts):
            slot = self.get_next_available_slot(exclude_slots=tried_slots)
            if not slot:
                break

            tried_slots.add(slot.slot_id)
            slot.total_requests += 1

            try:
                # Handle both async and sync callable implementations
                if inspect.iscoroutinefunction(func):
                    result = await func(slot.client, slot)
                else:
                    # Run sync functions in threadpool to keep FastAPI event loop responsive
                    result = await asyncio.to_thread(func, slot.client, slot)

                slot.total_successes += 1
                slot.last_error = None
                provider_tag = f"{model_name} ({slot.slot_id})" if model_name else slot.slot_id
                return result, provider_tag

            except Exception as err:
                last_exception = err
                slot.last_error = str(err)

                if is_rate_limit_or_transient_error(err):
                    slot.rate_limit_hits += 1
                    slot.cooldown_until = time.time() + settings.KEY_COOLDOWN_SECONDS

                    # Find next target slot for log readability
                    next_slot = self.get_next_available_slot(exclude_slots=tried_slots)
                    next_tag = next_slot.slot_id if next_slot else "none remaining"
                    logger.warning(
                        f"[GeminiKeyPool] Slot {slot.slot_id} hit rate limit / quota error -> failing over to {next_tag}. (Error: {err})"
                    )
                    continue

                # Non-transient errors (e.g. fatal validation or invalid schema)
                logger.error(f"[GeminiKeyPool] Non-transient error on {slot.slot_id}: {err}")
                raise err

        # If all slots exhausted
        raise RuntimeError(
            f"All {len(self.slots)} Gemini API keys in pool failed or exhausted rate limits. Last error: {last_exception}"
        )

    def get_pool_status(self) -> Dict[str, Any]:
        """Returns live telemetry across all configured key slots for health/diagnostics."""
        with self._lock:
            now = time.time()
            keys_data = []
            healthy_count = 0

            for slot in self.slots:
                is_active = now >= slot.cooldown_until
                if is_active:
                    healthy_count += 1

                keys_data.append(
                    {
                        "slot_id": slot.slot_id,
                        "masked_key": slot.masked_key,
                        "status": "healthy" if is_active else "cooldown",
                        "cooldown_remaining_seconds": int(slot.cooldown_remaining),
                        "total_requests": slot.total_requests,
                        "total_successes": slot.total_successes,
                        "rate_limit_hits": slot.rate_limit_hits,
                        "last_error": slot.last_error,
                    }
                )

            return {
                "cluster_status": "healthy" if healthy_count > 0 else "degraded",
                "total_keys": len(self.slots),
                "active_healthy_keys": healthy_count,
                "cooldown_keys": len(self.slots) - healthy_count,
                "cooldown_duration_seconds": settings.KEY_COOLDOWN_SECONDS,
                "keys": keys_data,
            }


# Global singleton instance
key_pool = GeminiKeyPool()
