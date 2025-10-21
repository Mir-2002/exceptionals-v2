import os
import asyncio
import httpx
from typing import Any, Dict, List, Optional
import random

class HFConfigError(RuntimeError):
    pass

def _get_hf_config() -> tuple[str, str]:
    endpoint = os.getenv("HF_ENDPOINT")
    token = os.getenv("HF_TOKEN")
    if not endpoint or not token:
        raise HFConfigError("HF_ENDPOINT or HF_TOKEN not set in environment.")
    return endpoint, token

async def hf_query_json_async(payload: Dict[str, Any], timeout: int = 600, max_retries: int = 8) -> Any:
    endpoint, token = _get_hf_config()
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Allow immediate pass-through of upstream errors for better client UX
    passthrough = (os.getenv("HF_PASSTHROUGH_ERRORS", "1").strip() not in ("0", "false", "False"))

    async with httpx.AsyncClient(timeout=timeout) as client:
        last_error: Optional[Exception] = None
        for attempt in range(max_retries):
            try:
                resp = await client.post(endpoint, headers=headers, json=payload)

                # Best-effort JSON parse
                try:
                    data = resp.json()
                except Exception:
                    data = None

                # Handle warm-up / loading and transient errors
                loading_signal = False
                if data is not None and isinstance(data, (dict, list)):
                    s = str(data).lower()
                    loading_signal = ("loading" in s) or ("estimated_time" in s) or ("warm" in s)

                if resp.status_code in (429, 502, 503) or loading_signal:
                    if passthrough:
                        # Return control to caller immediately; they can surface status to client
                        raise httpx.HTTPStatusError(f"HF error: {resp.status_code}", request=resp.request, response=resp)
                    if attempt < max_retries - 1:
                        base = 5 * (2 ** attempt)  # slower exponential backoff
                        wait_time = min(base + random.uniform(0, 3), 90)
                        await asyncio.sleep(wait_time)
                        continue
                    last_error = httpx.HTTPStatusError(f"HF error: {resp.status_code}", request=resp.request, response=resp)
                    break

                if resp.is_success:
                    return data if data is not None else {}

                # Other HTTP errors
                if passthrough:
                    # e.g., 400 paused
                    raise httpx.HTTPStatusError(f"Error: {data}", request=resp.request, response=resp)

                last_error = httpx.HTTPStatusError(f"Error: {data}", request=resp.request, response=resp)
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 + attempt)
                    continue
                break

            except (httpx.TimeoutException, httpx.RequestError) as e:
                last_error = e
                if attempt < max_retries - 1:
                    base = 5 * (2 ** attempt)
                    wait_time = min(base + random.uniform(0, 3), 90)
                    await asyncio.sleep(wait_time)
                else:
                    break

        # Graceful warm-up fallback (only if passthrough disabled)
        if not passthrough:
            try:
                for i in range(6):  # 6 polls ~20s apart
                    await asyncio.sleep(20)
                    try:
                        resp = await client.post(endpoint, headers=headers, json=payload)
                        if resp.is_success:
                            try:
                                return resp.json()
                            except Exception:
                                return {}
                    except Exception:
                        # keep trying until loop finishes
                        pass
            except Exception:
                pass

        if last_error:
            raise last_error
        raise httpx.HTTPStatusError(f"Failed after {max_retries} attempts", request=None, response=None)

async def hf_generate_batch_async(inputs: List[str], parameters: Optional[Dict[str, Any]] = None) -> List[str]:
    payload: Dict[str, Any] = {"inputs": inputs}
    if parameters:
        payload["parameters"] = parameters

    data = await hf_query_json_async(payload)

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
