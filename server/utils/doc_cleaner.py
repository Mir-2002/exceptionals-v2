# filepath: server/utils/doc_cleaner.py
import re
from typing import List, Dict, Tuple

_md_heading_re = re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE)
_bullet_re = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)
_rst_role_re = re.compile(r":\w+:`([^`]+)`")
_code_fence_re = re.compile(r"```(?:\w+)?\n?([\s\S]*?)```", re.MULTILINE)
_inline_backticks_re = re.compile(r"``([^`]+)``|`([^`]+)`")

_SECTION_HEADERS = (
    "Args:", "Arguments:", "Parameters:", "Returns:", "Yields:", "Raises:",
    "Attributes:", "Methods:", "Notes:", "Note:", "Warnings:", "Warning:",
)

_examples_header_re = re.compile(r"^\s*Examples?:\s*$", re.IGNORECASE | re.MULTILINE)

# ---------- generic helpers ----------

def _find_section_bounds(text: str, start_idx: int) -> Tuple[int, int]:
    end = len(text)
    for m in re.finditer(r"^\s*([A-Za-z][A-Za-z ]{0,20}):\s*$", text, re.MULTILINE):
        if m.start() <= start_idx:
            continue
        header = m.group(1).strip() + ":"
        if header in _SECTION_HEADERS or header.lower().startswith("example"):
            end = m.start()
            break
    return start_idx, end


def _strip_param_asterisks(text: str) -> str:
    """Remove stray asterisks around parameter names like '* name:' or '*name*:'
    without touching italics such as '*optional*' (no trailing colon) or any parentheses.
    Applied across all output formats.
    """
    s = text
    # 1) Convert bullets like '* name:' into '- name:' (Markdown-friendly), only when a param name is followed by ':'
    s = re.sub(r"(?m)^(\s*)\*\s*([A-Za-z_][\w ]*?):", r"\1- \2:", s)
    # 2) Unwrap asterisks around parameter names before a colon: '*name*:' -> 'name:'
    s = re.sub(r"(?m)(^|\s)\*([A-Za-z_][\w ]*?)\*\s*:", r"\1\2:", s)
    # 3) Remove a single leading asterisk before a param name (not already handled by step 1): '*NAME:' -> 'NAME:'
    s = re.sub(r"(?m)(^|\s)\*([A-Za-z_][\w ]*?):", r"\1\2:", s)
    return s


def _strip_backticks_and_asterisks_plain(text: str) -> str:
    """HTML/PDF-safe cleanup: remove stray backticks (including orphan fences)
    and decorative asterisks, but keep parentheses and convert leading '*' bullets to '-'.
    """
    s = text
    # Drop any orphan code fence lines like ``` or ```python
    s = re.sub(r"(?m)^\s*```.*$", "", s)
    # Remove inline backticks whether paired or lone by just removing the character
    s = s.replace("`", "")
    # Convert star bullets at line start to dash bullets for readability
    s = re.sub(r"(?m)^(\s*)\*\s+", r"\1- ", s)
    # Remove remaining decorative asterisks (italics markers), keep parentheses intact
    s = s.replace("*", "")
    return s


def strip_examples_sections(text: str) -> str:
    if not text:
        return ""
    s = str(text)
    while True:
        m = _examples_header_re.search(s)
        if not m:
            break
        sec_start_line = s.rfind("\n", 0, m.start()) + 1
        start, end = _find_section_bounds(s, m.start())
        tail = s[end:]
        code_m = re.match(r"^(?:\s*```[\s\S]*?```\s*\n?)", tail)
        if code_m:
            end = end + code_m.end()
        s = s[:sec_start_line] + s[end:]
    return s

# ---------- markdown-specific ----------

def reformat_args_for_markdown(text: str) -> str:
    if not text:
        return ""
    s = str(text)
    args_header = None
    for hdr in ("Args:", "Arguments:", "Parameters:"):
        idx = s.find(hdr)
        if idx != -1:
            args_header = (hdr, idx)
            break
    if not args_header:
        return s
    hdr, idx = args_header
    line_start = s.rfind("\n", 0, idx) + 1
    start, end = _find_section_bounds(s, line_start)
    body = s[start + len(hdr):end].strip()
    if not body:
        return s
    if "\n- " in body or re.search(r"^\s*[-*+]\s+", body, re.MULTILINE):
        return s
    parts = []
    pattern = re.compile(r"([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*:\s*")
    for m in pattern.finditer(body):
        next_m = pattern.search(body, m.end())
        chunk_end = next_m.start() if next_m else len(body)
        desc = body[m.end():chunk_end].strip()
        parts.append(f"- {m.group(1)} ({m.group(2)}): {desc}")
    if not parts:
        pattern2 = re.compile(r"([A-Za-z_][\w]*)\s*:\s*")
        for m in pattern2.finditer(body):
            next_m = pattern2.search(body, m.end())
            chunk_end = next_m.start() if next_m else len(body)
            desc = body[m.end():chunk_end].strip()
            parts.append(f"- {m.group(1)}: {desc}")
    if not parts:
        return s
    new_section = hdr + "\n" + "\n".join(parts) + "\n"
    return s[:line_start] + new_section + s[end:]


def clean_for_markdown(text: str) -> str:
    s = strip_examples_sections(text or "")
    # Keep backticks/bullets for MD readability; unwrap code fences but keep inner
    s = _code_fence_re.sub(lambda m: m.group(1), s)
    s = _rst_role_re.sub(r"\1", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = reformat_args_for_markdown(s)
    # Remove stray asterisks around parameter names
    s = _strip_param_asterisks(s)
    return s.strip()

# ---------- html-specific ----------

def clean_for_html(text: str) -> str:
    s = strip_examples_sections(text or "")
    s = _rst_role_re.sub(r"\1", s)
    # Remove fenced code markers entirely; keep inner content
    s = _code_fence_re.sub(lambda m: m.group(1), s)
    # Remove inline backticks (single or double) but keep content
    s = _inline_backticks_re.sub(lambda m: (m.group(1) or m.group(2) or ""), s)
    # Drop markdown headings
    s = _md_heading_re.sub("", s)
    # Keep bullets for readability in <pre>
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"[ \t]+\n", "\n")
    # Remove stray asterisks around parameter names
    s = _strip_param_asterisks(s)
    # Additionally remove any remaining backticks and decorative asterisks
    s = _strip_backticks_and_asterisks_plain(s)
    return s.strip()

# ---------- pdf-specific ----------

def clean_for_pdf(text: str) -> str:
    s = strip_examples_sections(text or "")
    s = _rst_role_re.sub(r"\1", s)
    # Remove code fences and inline backticks completely
    s = _code_fence_re.sub(lambda m: m.group(1), s)
    s = _inline_backticks_re.sub(lambda m: (m.group(1) or m.group(2) or ""), s)
    # Remove markdown headings
    s = _md_heading_re.sub("", s)
    # Normalize spacing to avoid lines sticking to code blocks
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r"[ \t]+\n", "\n")
    # Remove stray asterisks around parameter names
    s = _strip_param_asterisks(s)
    # Additionally remove any remaining backticks and decorative asterisks
    s = _strip_backticks_and_asterisks_plain(s)
    return s.strip()

# Back-compat wrappers used in other modules (if any)
def clean_docstring(text: str) -> str:
    # Default to HTML-safe cleaning
    return clean_for_html(text)


def clean_results_docstrings(results: List[Dict]) -> List[Dict]:
    cleaned = []
    for r in results:
        d = dict(r)
        d["generated_docstring"] = clean_for_html(d.get("generated_docstring", ""))
        cleaned.append(d)
    return cleaned


def process_docstring_for_markdown(text: str) -> str:
    return clean_for_markdown(text)
