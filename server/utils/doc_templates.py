from datetime import datetime
from typing import List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO

# types are loose to avoid circular imports

def render_markdown(project_id: str, results: List[dict], *, project_name: Optional[str] = None, project_description: Optional[str] = None, revision_id: Optional[str] = None) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    title = project_name or f"Project {project_id}"
    lines = [
        f"# {title}",
        "",
        f"_Description_: {project_description or 'No description provided.'}",
        "",
        f"_Version_: {revision_id or 'N/A'}",
        "",
        f"_Generated at: {ts}_",
        "",
    ]

    # Group results
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

    if functions:
        lines.append("## Functions")
        lines.append("")
        for r in functions:
            name = r.get("name", "")
            lines.append(f"### {name}")
            lines.append("")
            code = (r.get("original_code") or "").strip()
            if code:
                lines.append("```python")
                lines.append(code)
                lines.append("```")
                lines.append("")
            doc = (r.get("generated_docstring") or "").strip()
            if doc:
                lines.append(doc)
                lines.append("")

    if classes:
        lines.append("## Classes")
        lines.append("")
        for entry in classes.values():
            cls = entry.get("cls")
            methods = entry.get("methods") or []
            cls_name = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else "")
            lines.append(f"### {cls_name}")
            lines.append("")
            cls_code = ((cls or {}).get("original_code") or "").strip()
            if cls_code:
                lines.append("```python")
                lines.append(cls_code)
                lines.append("```")
                lines.append("")
            cls_doc = ((cls or {}).get("generated_docstring") or "").strip()
            if cls_doc:
                lines.append(cls_doc)
                lines.append("")

            for m in methods:
                lines.append(f"#### {m.get('name','')}")
                lines.append("")
                m_code = (m.get("original_code") or "").strip()
                if m_code:
                    lines.append("```python")
                    lines.append(m_code)
                    lines.append("```")
                    lines.append("")
                m_doc = (m.get("generated_docstring") or "").strip()
                if m_doc:
                    lines.append(m_doc)
                    lines.append("")

    return "\n".join(lines)


def render_html(project_id: str, results: List[dict], *, project_name: Optional[str] = None, project_description: Optional[str] = None, revision_id: Optional[str] = None) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    title = project_name or f"Project {project_id}"
    desc = project_description or "No description provided."

    # Group results
    functions = [r for r in (results or []) if (r.get("type") == "function")]
    class_map = []  # list of dicts to preserve order
    cls_index = {}
    for r in (results or []):
        if r.get("type") == "class":
            key = f"{r.get('file','')}::{r.get('name','')}"
            cls_index[key] = len(class_map)
            class_map.append({"cls": r, "methods": []})
    for r in (results or []):
        if r.get("type") == "method" and r.get("parent_class"):
            key = f"{r.get('file','')}::{r.get('parent_class')}"
            if key not in cls_index:
                cls_index[key] = len(class_map)
                class_map.append({"cls": None, "methods": []})
            class_map[cls_index[key]]["methods"].append(r)

    # Build item cards and anchors
    fn_cards = []
    fn_nav_links = []
    for i, r in enumerate(functions):
        anchor = f"fn-{i}"
        header = r.get("name", "")
        code = (r.get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;")
        doc = (r.get("generated_docstring") or "").replace("<", "&lt;").replace(">", "&gt;")
        fn_nav_links.append(f"<a href=\"#{anchor}\">{header}</a>")
        fn_cards.append(
            f"""
            <section class=\"item-card\" id=\"{anchor}\">
              <div class=\"item-title\">{header}</div>
              {f'<pre class=\"code\">{code}</pre>' if code else ''}
              {f'<pre class=\"doc\">{doc}</pre>' if doc else ''}
            </section>
            """
        )

    cls_cards = []
    cls_nav_links = []
    for i, entry in enumerate(class_map):
        cls = entry.get("cls")
        methods = entry.get("methods") or []
        title_txt = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else f"Class {i}")
        anchor = f"cls-{i}"
        cls_nav_links.append(f"<a href=\"#{anchor}\">{title_txt}</a>")
        cls_code = ((cls or {}).get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;")
        cls_doc = ((cls or {}).get("generated_docstring") or "").replace("<", "&lt;").replace(">", "&gt;")
        method_blocks = []
        for m in methods:
            m_code = (m.get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;")
            m_doc = (m.get("generated_docstring") or "").replace("<", "&lt;").replace(">", "&gt;")
            method_blocks.append(
                f"""
                <div class=\"method\">
                  <div class=\"method-title\">{m.get('name','')}</div>
                  {f'<pre class=\"code small\">{m_code}</pre>' if m_code else ''}
                  {f'<pre class=\"doc small\">{m_doc}</pre>' if m_doc else ''}
                </div>
                """
            )
        cls_cards.append(
            f"""
            <section class=\"item-card\" id=\"{anchor}\">
              <div class=\"item-title\">{title_txt}</div>
              {f'<pre class=\"code\">{cls_code}</pre>' if cls_code else ''}
              {f'<pre class=\"doc\">{cls_doc}</pre>' if cls_doc else ''}
              {''.join(method_blocks)}
            </section>
            """
        )

    # Sidebar with dropdowns
    nav_functions = f"""
      <details>
        <summary>Functions</summary>
        <div class=\"nav-group\">{''.join(f'<div class=\"nav-item\">{lnk}</div>' for lnk in fn_nav_links) or '<div class=\"empty\">None</div>'}</div>
      </details>
    """
    nav_classes = f"""
      <details>
        <summary>Classes</summary>
        <div class=\"nav-group\">{''.join(f'<div class=\"nav-item\">{lnk}</div>' for lnk in cls_nav_links) or '<div class=\"empty\">None</div>'}</div>
      </details>
    """

    styles = """
      :root{--bg:#ffffff;--muted:#6b7280;--border:#e5e7eb}
      body{font-family:Arial,Helvetica,sans-serif; margin:24px; background:#fff; color:#111827}
      header{margin-bottom:16px}
      h1{margin:0}
      .meta{color:var(--muted); font-size:12px; margin-top:4px}
      .desc{margin-top:8px; color:#111827}
      .layout{display:grid; grid-template-columns: 260px 1fr; gap:16px}
      nav{border:1px solid var(--border); border-radius:8px; padding:12px; position:sticky; top:16px; height: calc(100vh - 64px); overflow:auto}
      nav h3{margin-top:0}
      nav details{margin:6px 0}
      nav summary{cursor:pointer; font-weight:600}
      .nav-group{margin:6px 0 0 8px}
      .nav-item a{display:block; color:#1f2937; text-decoration:none; padding:2px 0; font-size:14px}
      .empty{color:#9ca3af; font-size:12px}
      main section{margin-bottom:24px}
      .grid{display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:12px}
      .item-card{border:1px solid var(--border); border-radius:8px; padding:12px; background:#fff}
      .item-title{font-weight:600; font-size:14px; margin-bottom:6px}
      pre{white-space:pre-wrap}
      .code{background:#2f2f2f; color:#f5f5f5; padding:10px; border-radius:6px; overflow:auto}
      .code.small{font-size:12px}
      .doc{background:#ffffff; color:#111827; padding:10px; border-radius:6px; border:1px solid var(--border); overflow:auto; margin-top:8px}
      .doc.small{font-size:12px}
      .method{border:1px dashed var(--border); border-radius:6px; padding:8px; margin-top:8px; background:#f3f4f6}
      .method-title{font-weight:600; font-size:12px; margin-bottom:6px}
    """

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
            <h3>Contents</h3>
            {nav_functions}
            {nav_classes}
          </nav>
          <main>
            <section id=\"sec-functions\">
              <h2>Functions</h2>
              <div class=\"grid\">{''.join(fn_cards)}</div>
            </section>
            <section id=\"sec-classes\">
              <h2>Classes</h2>
              <div class=\"grid\">{''.join(cls_cards)}</div>
            </section>
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

    def draw_line(text: str, leading: int = 14, bold: bool = False):
        nonlocal y
        if y < 60:
            c.showPage()
            y = height - 50
            # redraw header on new page
            c.setFont("Helvetica-Bold", 16)
            c.drawString(x_margin, y, title)
            y -= 24
            c.setFont("Helvetica", 9)
            c.drawString(x_margin, y, meta)
            y -= 16
        if bold:
            c.setFont("Helvetica-Bold", 12)
        else:
            c.setFont("Helvetica", 10)
        for line in (text or "").splitlines() or [""]:
            c.drawString(x_margin, y, line[:120])
            y -= leading

    # Title and meta
    title = (project_name or f"Project {project_id}") + " - Documentation"
    meta = f"Version: {revision_id or 'N/A'} • Generated at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"

    c.setFont("Helvetica-Bold", 16)
    c.drawString(x_margin, y, title)
    y -= 24

    if project_description:
        c.setFont("Helvetica", 10)
        for line in project_description.splitlines():
            c.drawString(x_margin, y, line[:120])
            y -= 12
        y -= 8

    c.setFont("Helvetica", 9)
    c.drawString(x_margin, y, meta)
    y -= 16

    # Grouping for PDF to mirror other formats (without heavy styling)
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

    if functions:
        draw_line("Functions", 14, bold=True)
        for r in functions:
            draw_line(r.get("name",""), 14, bold=True)
            code = (r.get("original_code") or "").strip()
            if code:
                draw_line(code, 12, bold=False)
            doc = (r.get("generated_docstring") or "").strip()
            if doc:
                draw_line(doc, 12, bold=False)
            y -= 6

    if classes:
        draw_line("Classes", 14, bold=True)
        for entry in classes.values():
            cls = entry.get("cls")
            methods = entry.get("methods") or []
            title_txt = (cls or {}).get("name") or (methods[0].get("parent_class") if methods else "")
            draw_line(title_txt, 14, bold=True)
            code = ((cls or {}).get("original_code") or "").strip()
            if code:
                draw_line(code, 12, bold=False)
            doc = ((cls or {}).get("generated_docstring") or "").strip()
            if doc:
                draw_line(doc, 12, bold=False)
            for m in methods:
                draw_line(m.get("name",""), 12, bold=True)
                m_code = (m.get("original_code") or "").strip()
                if m_code:
                    draw_line(m_code, 12, bold=False)
                m_doc = (m.get("generated_docstring") or "").strip()
                if m_doc:
                    draw_line(m_doc, 12, bold=False)
            y -= 6

    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
