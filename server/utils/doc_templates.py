from datetime import datetime
from typing import List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
import re

# types are loose to avoid circular imports
from utils.doc_cleaner import process_docstring_for_markdown, clean_for_html, clean_for_pdf


def render_markdown(project_id: str, results: List[dict], *, project_name: Optional[str] = None, project_description: Optional[str] = None, revision_id: Optional[str] = None) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    title = project_name or f"Project {project_id}"
    lines = [
        f"# {title}",
        "",
        f"> {project_description or 'No description provided.'}",
        "",
        f"_Version: {revision_id or 'N/A'} • Generated: {ts}_",
        "",
        "---",
        "",
    ]

    # Group results; alphabetize within type buckets
    results = results or []
    functions = sorted(
        [r for r in results if (r.get("type") == "function")],
        key=lambda r: (str(r.get("name","")) or "").lower()
    )
    classes_map = {}
    # initialize class entries
    for r in results:
        if r.get("type") == "class":
            key = f"{r.get('file','')}::{r.get('name','')}"
            classes_map[key] = {"cls": r, "methods": []}
    # attach methods, track classes even if class missing
    for r in results:
        if r.get("type") == "method" and r.get("parent_class"):
            key = f"{r.get('file','')}::{r.get('parent_class')}"
            classes_map.setdefault(key, {"cls": None, "methods": []})["methods"].append(r)

    # Sort classes by class name
    classes_items = sorted(classes_map.items(), key=lambda kv: (str((kv[1]["cls"] or {}).get("name") or (kv[1]["methods"][0].get("parent_class") if kv[1]["methods"] else "")).lower()))

    if functions:
        lines.extend(["## Functions", ""])
        for r in functions:
            lines.extend([f"### {r.get('name','')}", ""])
            code = (r.get("original_code") or "").strip()
            if code:
                lines.extend(["```python", code, "```", ""]) 
            doc = process_docstring_for_markdown((r.get("generated_docstring") or "").strip())
            if doc:
                lines.extend([doc, ""]) 
        lines.append("")

    if classes_items:
        lines.extend(["## Classes", ""])
        for _, entry in classes_items:
            cls = entry.get("cls")
            methods = entry.get("methods") or []
            # Sort methods by name
            methods = sorted(methods, key=lambda m: (str(m.get("name","")) or "").lower())
            cls_name = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else "")
            lines.extend([f"### {cls_name}", ""])
            cls_code = ((cls or {}).get("original_code") or "").strip()
            if cls_code:
                lines.extend(["```python", cls_code, "```", ""]) 
            cls_doc = process_docstring_for_markdown(((cls or {}).get("generated_docstring") or "").strip())
            if cls_doc:
                lines.extend([cls_doc, ""]) 

            for m in methods:
                lines.extend([f"#### {m.get('name','')}", ""])
                m_code = (m.get("original_code") or "").strip()
                if m_code:
                    lines.extend(["```python", m_code, "```", ""]) 
                m_doc = process_docstring_for_markdown((m.get("generated_docstring") or "").strip())
                if m_doc:
                    lines.extend([m_doc, ""]) 

    return "\n".join(lines)


def render_html(project_id: str, results: List[dict], *, project_name: Optional[str] = None, project_description: Optional[str] = None, revision_id: Optional[str] = None) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    title = project_name or f"Project {project_id}"
    desc = project_description or "No description provided."

    # Group results; alphabetize within type buckets
    results = results or []
    functions = sorted(
        [r for r in results if (r.get("type") == "function")],
        key=lambda r: (str(r.get("name","")) or "").lower()
    )
    class_map = []  # list of dicts to preserve order
    cls_index = {}
    for r in results:
        if r.get("type") == "class":
            key = f"{r.get('file','')}::{r.get('name','')}"
            cls_index[key] = len(class_map)
            class_map.append({"cls": r, "methods": []})
    for r in results:
        if r.get("type") == "method" and r.get("parent_class"):
            key = f"{r.get('file','')}::{r.get('parent_class')}"
            if key not in cls_index:
                cls_index[key] = len(class_map)
                class_map.append({"cls": None, "methods": []})
            class_map[cls_index[key]]["methods"].append(r)

    # Sort classes and methods alphabetically
    # Build sortable tuples of (name_lower, entry)
    sortable_classes = []
    for entry in class_map:
        cls = entry.get("cls")
        methods = entry.get("methods") or []
        name = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else "")
        sortable_classes.append(((name or "").lower(), entry))
    sortable_classes.sort(key=lambda t: t[0])

    # Build item cards and anchors
    items = []
    # Functions first (alphabetical)
    for i, r in enumerate(functions):
        items.append({
            "id": f"fn-{i}",
            "title": r.get("name", ""),
            "code": (r.get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;"),
            "doc": clean_for_html((r.get("generated_docstring") or "")),
        })
    # Then classes and methods (alphabetical)
    for idx, (_, entry) in enumerate(sortable_classes):
        cls = entry.get("cls")
        methods = sorted(entry.get("methods") or [], key=lambda m: (str(m.get("name","")) or "").lower())
        title_txt = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else f"Class {idx}")
        items.append({
            "id": f"cls-{idx}",
            "title": title_txt,
            "code": ((cls or {}).get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;"),
            "doc": clean_for_html(((cls or {}).get("generated_docstring") or "")),
        })
        for j, m in enumerate(methods):
            items.append({
                "id": f"cls-{idx}-m-{j}",
                "title": f"{title_txt}::{m.get('name','')}",
                "code": (m.get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;"),
                "doc": clean_for_html((m.get("generated_docstring") or "")),
            })

    # Sidebar links (dropdowns) — alphabetized
    fn_nav = [f"<a href=\"#fn-{i}\" class=\"nav-link\">{r.get('name','')}</a>" for i, r in enumerate(functions)]
    cls_nav = []
    for idx, (_, entry) in enumerate(sortable_classes):
        cls = entry.get("cls")
        methods = sorted(entry.get("methods") or [], key=lambda m: (str(m.get("name","")) or "").lower())
        title_txt = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else f"Class {idx}")
        inner = [f"<a href=\"#cls-{idx}\" class=\"nav-link\">{title_txt}</a>"]
        for j, m in enumerate(methods):
            inner.append(f"<a href=\"#cls-{idx}-m-{j}\" class=\"nav-sublink\">{m.get('name','')}</a>")
        cls_nav.append("".join(inner))

    styles = """
      :root{--bg:#ffffff;--muted:#6b7280;--border:#e5e7eb;--code:#f5f5f5}
      body{font-family:Arial,Helvetica,sans-serif; margin:24px; background:#fff; color:#111827}
      header{margin-bottom:16px}
      h1{margin:0}
      .meta{color:var(--muted); font-size:12px; margin-top:4px}
      .desc{margin-top:8px; color:#111827}
      .layout{display:grid; grid-template-columns: 260px 1fr; gap:16px}
      nav{border:1px solid var(--border); border-radius:8px; padding:12px; position:sticky; top:16px; height: calc(100vh - 64px); overflow:auto}
      nav h3{margin:0 0 8px}
      nav details{margin:6px 0}
      nav summary{cursor:pointer; font-weight:600}
      .nav-group{margin:6px 0 0 8px}
      .nav-link, .nav-sublink{display:block; color:#1f2937; text-decoration:none; padding:4px 0; font-size:14px}
      .nav-link:hover, .nav-sublink:hover{text-decoration:underline}
      main{display:flex; justify-content:center}
      .viewer{max-width:900px; width:100%; padding:0 24px}
      .item-card{border:1px solid var(--border); border-radius:8px; padding:16px; background:#fff; margin:24px 0}
      .item-title{font-weight:600; font-size:16px; margin-bottom:8px}
      pre{white-space:pre-wrap}
      .code{background:var(--code); color:#111827; padding:12px; border-radius:6px; overflow:auto}
      .doc{background:#ffffff; color:#111827; padding:12px; border-radius:6px; border:1px solid var(--border); overflow:auto; margin-top:10px}
      .item-card:hover .item-title{text-decoration:underline}
      .item-card:focus-within, .item-card:focus{outline:none; box-shadow:0 0 0 2px #9ca3af}
    """

    sidebar_html = f"""
      <h3>Contents</h3>
      <details open>
        <summary>Functions</summary>
        <div class=\"nav-group\">{''.join(f'<div class=\"nav-item\">{lnk}</div>' for lnk in fn_nav) or '<div class=\"empty\">None</div>'}</div>
      </details>
      <details open>
        <summary>Classes</summary>
        <div class=\"nav-group\">{''.join(f'<div class=\"nav-item\">{lnk}</div>' for lnk in cls_nav) or '<div class=\"empty\">None</div>'}</div>
      </details>
    """

    viewer_html = "".join(
        f"""
        <section class=\"item-card\" id=\"{it['id']}\" tabindex=\"0\">
          <div class=\"item-title\">{it['title']}</div>
          {f'<pre class=\"code\">{it['code']}</pre>' if it['code'] else ''}
          {f'<pre class=\"doc\">{it['doc']}</pre>' if it['doc'] else ''}
        </section>
        """
        for it in items
    )

    return f"""
    <!doctype html>
    <html>
      <head>
        <meta charset=\"utf-8\" />
        <title>{title}</title>
        <style>{styles}</style>
      </head>
      <body>
        <header>
          <h1>{title}</h1>
          <div class=\"meta\">Version: {revision_id or 'N/A'} • Generated at: {ts}</div>
          <div class=\"desc\">{desc}</div>
        </header>
        <div class=\"layout\">
          <nav>
            {sidebar_html}
          </nav>
          <main>
            <div class=\"viewer\">
              {viewer_html}
            </div>
          </main>
        </div>
      </body>
    </html>
    """


def render_pdf(project_id: str, results: List[dict], *, project_name: Optional[str] = None, project_description: Optional[str] = None, revision_id: Optional[str] = None) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)

    width, height = letter
    x_margin = 50
    y = height - 50

    def sanitize_code_block(text: str) -> str:
        if not text:
            return ""
        s = (text or "").replace("\r\n", "\n").replace("\r", "\n")
        # Remove leading/trailing fenced code markers if any leaked in
        s = re.sub(r"^\s*```\w*\s*\n", "", s)
        s = re.sub(r"\n\s*```\s*$", "", s)
        # Remove standalone section markers that don't belong in code
        lines = s.splitlines()
        cleaned = []
        for ln in lines:
            if re.match(r"\s*(Args:|Arguments:|Parameters:|Returns:|Examples?:)", ln):
                continue
            # If a doc sentence leaked onto the same line after a return, keep code before it
            ln = re.sub(r"(\breturn\b[^\n]*?)\s+Returns?:.*$", r"\1", ln)
            # Strip stray inline double/single backticks in code
            ln = re.sub(r"``([^`]+)``|`([^`]+)`", lambda m: m.group(1) or m.group(2) or "", ln)
            cleaned.append(ln)
        return "\n".join(cleaned).strip()

    def new_page_header():
        nonlocal y
        c.setFont("Helvetica-Bold", 16)
        c.drawString(x_margin, y, title)
        y -= 20
        c.setFont("Helvetica", 9)
        c.drawString(x_margin, y, meta)
        y -= 16

    def draw_line(text: str, leading: int = 14, bold: bool = False, x_offset: int = 0):
        nonlocal y
        if y < 80:
            c.showPage()
            y = height - 50
            new_page_header()
        local_x = x_margin + x_offset
        if bold:
            c.setFont("Helvetica-Bold", 12)
        else:
            c.setFont("Helvetica", 10)
        for line in (text or "").splitlines() or [""]:
            c.drawString(local_x, y, line[:110])
            y -= leading

    def compute_code_block_height(text: str) -> int:
        if not text:
            return 0
        text = sanitize_code_block(text)
        lines = (text or "").splitlines() or [""]
        return max(18, 12 * len(lines) + 12) + 12  # block rect + separation

    def draw_code_block(text: str, x_offset: int = 0):
        nonlocal y
        if not text:
            return
        text = sanitize_code_block(text)
        lines = (text or "").splitlines() or [""]
        block_height = max(18, 12 * len(lines) + 12)
        if y - block_height < 60:
            c.showPage()
            y = height - 50
            new_page_header()
        local_x = x_margin + x_offset
        c.setFillColorRGB(0.95, 0.95, 0.95)
        c.rect(local_x - 4, y - block_height + 6, (width - 2 * x_margin) - x_offset + 8, block_height, fill=1, stroke=0)
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 10)
        for line in lines:
            if y - 12 < 60:
                # move entire remaining block to next page to avoid cutting
                c.showPage()
                y = height - 50
                new_page_header()
                c.setFillColorRGB(0.95, 0.95, 0.95)
                c.rect(local_x - 4, y - block_height + 6, (width - 2 * x_margin) - x_offset + 8, block_height, fill=1, stroke=0)
                c.setFillColorRGB(0, 0, 0)
                c.setFont("Helvetica", 10)
            c.drawString(local_x, y - 12, line[:110])
            y -= 12
        # Provide clearer separation after code blocks
        y -= 12

    def item_divider():
        nonlocal y
        c.setStrokeColorRGB(0.88, 0.88, 0.88)
        c.line(x_margin, y, width - x_margin, y)
        y -= 14  # increased gap below the line to separate from the next title

    title = (project_name or f"Project {project_id}") + " - Documentation"
    meta = f"Version: {revision_id or 'N/A'} • Generated at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"

    new_page_header()

    if project_description:
        c.setFont("Helvetica", 10)
        for line in project_description.splitlines():
            c.drawString(x_margin, y, line[:110])
            y -= 12
        y -= 8

    def separator():
        nonlocal y
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.line(x_margin, y, width - x_margin, y)
        y -= 16  # extra space after section separator before first item title

    # Build groups
    functions = [r for r in (results or []) if (r.get("type") == "function")]
    classes = {}
    for r in (results or []):
        if r.get("type") == "class":
            key = f"{r.get('file','')}::{r.get('name','')}"
            classes[key] = {"cls": r, "methods": []}
    for r in (results or []):
        if r.get("type") == "method" and r.get("parent_class"):
            key = f"{r.get('file','')}::{r.get('parent_class')}"
            classes.setdefault(key, {"cls": None, "methods": []})["methods"].append(r)

    # ---------- Table of Contents (bulleted, no links) ----------
    def new_toc_page_header():
        nonlocal y
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x_margin, y, "Table of Contents")
        y -= 18
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.line(x_margin, y, width - x_margin, y)
        y -= 12

    def draw_toc_entry(text: str, indent: int = 0):
        nonlocal y
        if y < 80:
            c.showPage()
            y = height - 50
            new_page_header()
            new_toc_page_header()
        local_x = x_margin + indent
        c.setFont("Helvetica", 10)
        c.drawString(local_x, y, f"• {(text or '')[:106]}")
        y -= 14

    # Reserve TOC page
    new_toc_page_header()

    if functions:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x_margin, y, "Functions")
        y -= 14
        for r in functions:
            draw_toc_entry(r.get("name", ""), indent=12)
        y -= 6
    if classes:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x_margin, y, "Classes")
        y -= 14
        for entry in classes.values():
            cls = entry.get("cls")
            methods = entry.get("methods") or []
            title_txt = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else "")
            draw_toc_entry(title_txt, indent=12)
            for m in methods:
                draw_toc_entry(m.get("name", ""), indent=28)
        y -= 6

    # Start main content on a fresh page
    c.showPage()
    y = height - 50
    new_page_header()

    # Helper to ensure an item fits before starting
    def ensure_item_fits(title_text: str, code_text: str, doc_text: str, x_offset: int = 0):
        nonlocal y
        title_h = 14
        gap_after_title = 4
        code_h = compute_code_block_height(code_text) if code_text else 0
        gap_before_doc = 4 if doc_text else 0
        doc_lines = (doc_text or "").splitlines() if doc_text else []
        doc_h = 12 * len(doc_lines)
        gap_after_item = 10
        required = title_h + gap_after_title + code_h + gap_before_doc + doc_h + gap_after_item
        if y - required < 80:
            c.showPage()
            y = height - 50
            new_page_header()

    # ---------- Main content ----------
    if functions:
        draw_line("Functions", 16, bold=True)
        separator()
        for idx, r in enumerate(functions):
            if idx > 0:
                item_divider()
            title_text = r.get("name", "")
            code = (r.get("original_code") or "").strip()
            doc = clean_for_pdf((r.get("generated_docstring") or "").strip())
            ensure_item_fits(title_text, code, doc)
            draw_line(title_text, 14, bold=True)
            y -= 4
            if code:
                draw_code_block(code)
            if doc:
                y -= 4
                draw_line(doc, 12, bold=False)
            y -= 10

    if classes:
        draw_line("Classes", 16, bold=True)
        separator()
        for cidx, entry in enumerate(classes.values()):
            if cidx > 0:
                item_divider()
            cls = entry.get("cls")
            methods = entry.get("methods") or []
            title_txt = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else "")
            cls_code = ((cls or {}).get("original_code") or "").strip()
            cls_doc = clean_for_pdf(((cls or {}).get("generated_docstring") or "").strip())
            ensure_item_fits(title_txt, cls_code, cls_doc)
            draw_line(title_txt, 14, bold=True)
            y -= 4
            if cls_code:
                draw_code_block(cls_code)
            if cls_doc:
                y -= 4
                draw_line(cls_doc, 12, bold=False)
            for m in methods:
                y -= 6
                m_title = m.get("name", "")
                m_code = (m.get("original_code") or "").strip()
                m_doc = clean_for_pdf((m.get("generated_docstring") or "").strip())
                ensure_item_fits(m_title, m_code, m_doc, x_offset=12)
                draw_line(m_title, 12, bold=True, x_offset=12)
                if m_code:
                    draw_code_block(m_code, x_offset=12)
                if m_doc:
                    y -= 4
                    draw_line(m_doc, 12, bold=False, x_offset=12)
                y -= 6
            y -= 10

    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
