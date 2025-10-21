from slowapi import Limiter
from slowapi.util import get_remote_address

# Global limiter instance. For multi-process deployments, configure storage (e.g., Redis) via Limiter(..., storage_uri="redis://...")
limiter = Limiter(key_func=get_remote_address)
