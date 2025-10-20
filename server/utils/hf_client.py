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

async def hf_query_json_async(payload: Dict[str, Any], timeout: int = 300, max_retries: int = 5) -> Any:
    endpoint, token = _get_hf_config()
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(max_retries):
            try:
                resp = await client.post(endpoint, headers=headers, json=payload)

                try:
                    data = resp.json()
                except Exception:
                    resp.raise_for_status()
                    return {}

                if resp.status_code in (502, 503) or "loading" in str(data).lower():
                    if attempt < max_retries - 1:
                        base = 3 * (2 ** attempt)
                        wait_time = base + random.uniform(0, 2)
                        await asyncio.sleep(wait_time)
                        continue
                    raise httpx.HTTPStatusError(f"HF error: {resp.status_code}", request=resp.request, response=resp)

                if resp.is_success:
                    return data

                raise httpx.HTTPStatusError(f"Error: {data}", request=resp.request, response=resp)

            except (httpx.TimeoutException, httpx.RequestError) as e:
                if attempt < max_retries - 1:
                    base = 3 * (2 ** attempt)
                    wait_time = base + random.uniform(0, 2)
                    await asyncio.sleep(wait_time)
                else:
                    raise e

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
