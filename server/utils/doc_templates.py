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
    for r in results:
        title = r.get("type", "item").title()
        name = r.get("name", "")
        parent = r.get("parent_class")
        header = f"## {title}: {name}"
        if parent:
            header += f" (class {parent})"
        lines.append(header)
        lines.append("")
        code = r.get("original_code", "").strip()
        if code:
            lines.append("```python")
            lines.append(code)
            lines.append("```")
            lines.append("")
        doc = r.get("generated_docstring", "").strip()
        if doc:
            lines.append("**Documentation:**")
            lines.append("")
            lines.append(doc)
            lines.append("")
    return "\n".join(lines)


def render_html(project_id: str, results: List[dict], *, project_name: Optional[str] = None, project_description: Optional[str] = None, revision_id: Optional[str] = None) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    title = project_name or f"Project {project_id}"
    desc = project_description or "No description provided."
    body_sections = []
    nav_links = []
    for idx, r in enumerate(results):
        section_id = f"sec-{idx}"
        title_type = (r.get("type") or "item").title()
        name = r.get("name", "")
        parent = r.get("parent_class")
        header = f"{title_type}: {name}"
        if parent:
            header += f" (class {parent})"
        code = (r.get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;")
        doc = (r.get("generated_docstring") or "").replace("<", "&lt;").replace(">", "&gt;")
        body_sections.append(
            f"""
            <section class=\"item\" id=\"{section_id}\">
              <h2>{header}</h2>
              {f'<div class=\"code-block\"><div class=\"label\">Code</div><pre class=\"code\">{code}</pre></div>' if code else ''}
              {f'<div class=\"doc-block\"><div class=\"label\">Documentation</div><pre class=\"doc\">{doc}</pre></div>' if doc else ''}
            </section>
            """
        )
        nav_links.append(f"<a href=\"#{section_id}\">{header}</a>")
    styles = """
      :root{--bg:#ffffff;--muted:#6b7280;--border:#e5e7eb;--chip:#f3f4f6}
      body{font-family:Arial,Helvetica,sans-serif; margin:24px;}
      header{margin-bottom:16px}
      h1{margin:0}
      .meta{color:var(--muted); font-size:12px; margin-top:4px}
      .desc{margin-top:8px; color:#111827}
      .layout{display:grid; grid-template-columns: 240px 1fr; gap:16px}
      nav{border:1px solid var(--border); border-radius:8px; padding:12px; position:sticky; top:16px; height: calc(100vh - 64px); overflow:auto}
      nav h3{margin-top:0}
      nav a{display:block; color:#1f2937; text-decoration:none; padding:4px 0; font-size:14px}
      .item{border:1px solid var(--border); border-radius:8px; padding:12px; margin:12px 0; background:var(--chip)}
      .code-block,.doc-block{margin-top:8px}
      .label{font-size:12px; color:var(--muted); margin-bottom:4px}
      .code, .doc{background:#f9fafb; padding:10px; overflow:auto; border-radius:6px}
      pre{white-space:pre-wrap}
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
            {''.join(f'<div>{link}</div>' for link in nav_links)}
          </nav>
          <main>
            {''.join(body_sections)}
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

    for r in results:
        title_type = (r.get("type") or "item").title()
        name = r.get("name", "")
        parent = r.get("parent_class")
        header = f"{title_type}: {name}"
        if parent:
            header += f" (class {parent})"
        draw_line(header, 14, bold=True)
        code = (r.get("original_code") or "").strip()
        if code:
            draw_line("Code:", 12, bold=False)
            draw_line(code, 12, bold=False)
        doc = (r.get("generated_docstring") or "").strip()
        if doc:
            draw_line("Documentation:", 12, bold=False)
            draw_line(doc, 12, bold=False)
        y -= 8

    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
