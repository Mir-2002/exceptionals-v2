import os
import requests
from typing import Any, Dict, List, Optional
import time
import random

class HFConfigError(RuntimeError):
    pass

def _get_hf_config() -> tuple[str, str]:
    """Get HF endpoint URL and token from environment variables."""
    endpoint = os.getenv("HF_ENDPOINT")
    token = os.getenv("HF_TOKEN")
    if not endpoint or not token:
        raise HFConfigError("HF_ENDPOINT or HF_TOKEN not set in environment.")
    return endpoint, token

def hf_query_json(payload: Dict[str, Any], timeout: int = 300, max_retries: int = 5) -> Any:
    """
    Query HF endpoint with automatic retry for cold start.
    HF endpoints may take time to boot from sleep, so we retry with backoff.
    """
    endpoint, token = _get_hf_config()
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    for attempt in range(max_retries):
        try:
            resp = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
            
            # Try to parse JSON even on non-2xx to surface error message
            try:
                data = resp.json()
            except Exception:
                resp.raise_for_status()
                return {}
            
            if resp.ok:
                return data
            
            # Handle HF endpoint errors
            if isinstance(data, dict):
                error_msg = data.get("error") or data.get("message") or ""
                # Check if it's a cold start error
                if "loading" in error_msg.lower() or "starting" in error_msg.lower() or resp.status_code in (502, 503):
                    if attempt < max_retries - 1:
                        base = 3 * (2 ** attempt)
                        wait_time = base + random.uniform(0, 2)
                        time.sleep(wait_time)
                        continue
                raise requests.HTTPError(error_msg or f"HF error {resp.status_code}", response=resp)
            
            # Non-dict error body
            if attempt < max_retries - 1:
                base = 3 * (2 ** attempt)
                wait_time = base + random.uniform(0, 2)
                time.sleep(wait_time)
                continue
            resp.raise_for_status()
            
        except requests.Timeout:
            if attempt < max_retries - 1:
                base = 3 * (2 ** attempt)
                wait_time = base + random.uniform(0, 2)
                time.sleep(wait_time)
                continue
            raise
        except requests.RequestException:
            if attempt < max_retries - 1:
                base = 3 * (2 ** attempt)
                wait_time = base + random.uniform(0, 2)
                time.sleep(wait_time)
                continue
            raise
    
    raise requests.HTTPError(f"Failed after {max_retries} attempts")

def hf_generate_batch(inputs: List[str], parameters: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Call HF endpoint with a batch of inputs and return list of generated texts.
    Your handler returns: List[Dict[str, str]] with key 'generated_text'.
    """
    payload: Dict[str, Any] = {"inputs": inputs}
    if parameters:
        payload["parameters"] = parameters
    
    data = hf_query_json(payload)
    
    # Normalize response format generously: may be a list of dicts or list of lists
    outputs: List[str] = []
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "generated_text" in item:
                outputs.append(str(item["generated_text"]))
            elif isinstance(item, list) and item and isinstance(item[0], dict) and "generated_text" in item[0]:
                outputs.append(str(item[0]["generated_text"]))
            else:
                outputs.append(str(item))
    elif isinstance(data, dict) and "generated_text" in data:
        outputs.append(str(data["generated_text"]))
    else:
        outputs.append(str(data))
    
    return outputs
