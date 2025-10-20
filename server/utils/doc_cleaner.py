# filepath: server/utils/doc_cleaner.py
import re
from typing import List, Dict

_md_heading_re = re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE)
_bullet_re = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)
_rst_role_re = re.compile(r":\w+:`([^`]+)`")
_code_fence_re = re.compile(r"```(?:\w+)?\n?([\s\S]*?)```", re.MULTILINE)

def clean_docstring(text: str) -> str:
    if not text:
        return ""
    s = str(text)
    # Replace RST roles like :class:`Task` -> Task
    s = _rst_role_re.sub(r"\1", s)
    # Unwrap fenced code blocks but keep inner content
    s = _code_fence_re.sub(lambda m: m.group(1), s)
    # Drop markdown headings and bullet markers
    s = _md_heading_re.sub("", s)
    s = _bullet_re.sub("", s)
    # Remove common markdown emphasis and backticks
    s = s.replace("`", "")
    s = s.replace("*", "")
    s = s.replace("_", "")
    s = s.replace("#", "")
    # Collapse excessive whitespace
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def clean_results_docstrings(results: List[Dict]) -> List[Dict]:
    cleaned = []
    for r in results:
        d = dict(r)
        d["generated_docstring"] = clean_docstring(d.get("generated_docstring", ""))
        cleaned.append(d)
    return cleaned
