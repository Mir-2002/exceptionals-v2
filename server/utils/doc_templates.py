from datetime import datetime
from typing import List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO

# types are loose to avoid circular imports

def render_markdown(project_id: str, results: List[dict]) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Project {project_id} - Generated Documentation",
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
            lines.append("**Docstring:**")
            lines.append("")
            lines.append(doc)
            lines.append("")
    return "\n".join(lines)


def render_html(project_id: str, results: List[dict]) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    body_sections = []
    for r in results:
        title = (r.get("type") or "item").title()
        name = r.get("name", "")
        parent = r.get("parent_class")
        header = f"{title}: {name}"
        if parent:
            header += f" (class {parent})"
        code = (r.get("original_code") or "").replace("<", "&lt;").replace(">", "&gt;")
        doc = (r.get("generated_docstring") or "").replace("<", "&lt;").replace(">", "&gt;")
        body_sections.append(
            f"""
            <section class=\"item\">
              <h2>{header}</h2>
              {f'<pre class=\"code\">{code}</pre>' if code else ''}
              {f'<div class=\"docstring\"><strong>Docstring:</strong><pre>{doc}</pre></div>' if doc else ''}
            </section>
            """
        )
    styles = """
      body{font-family:Arial,Helvetica,sans-serif; margin:24px;}
      h1{margin-top:0}
      .meta{color:#666; font-size:12px}
      .item{border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin:12px 0; background:#fafafa}
      .code{background:#f3f4f6; padding:8px; overflow:auto}
      pre{white-space:pre-wrap}
    """
    return f"""
    <!doctype html>
    <html>
      <head>
        <meta charset=\"utf-8\" />
        <title>Project {project_id} - Documentation</title>
        <style>{styles}</style>
      </head>
      <body>
        <h1>Project {project_id} - Generated Documentation</h1>
        <div class=\"meta\">Generated at: {ts}</div>
        {''.join(body_sections)}
      </body>
    </html>
    """


def render_pdf(project_id: str, results: List[dict]) -> bytes:
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
        if bold:
            c.setFont("Helvetica-Bold", 12)
        else:
            c.setFont("Helvetica", 10)
        for line in text.splitlines() or [""]:
            c.drawString(x_margin, y, line[:120])
            y -= leading

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x_margin, y, f"Project {project_id} - Documentation")
    y -= 24

    c.setFont("Helvetica", 9)
    from datetime import datetime as _dt
    draw_line(f"Generated at: {_dt.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", 12)
    y -= 8

    for r in results:
        title = (r.get("type") or "item").title()
        name = r.get("name", "")
        parent = r.get("parent_class")
        header = f"{title}: {name}"
        if parent:
            header += f" (class {parent})"
        draw_line(header, 14, bold=True)
        doc = (r.get("generated_docstring") or "").strip()
        if doc:
            draw_line("Docstring:", 12, bold=False)
            draw_line(doc, 12, bold=False)
        code = (r.get("original_code") or "").strip()
        if code:
            draw_line("Code:", 12, bold=False)
            draw_line(code, 12, bold=False)
        y -= 6

    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
