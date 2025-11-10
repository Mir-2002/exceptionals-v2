from utils.doc_cleaner import clean_for_html, clean_for_markdown, clean_for_pdf, strip_examples_sections


def test_strip_examples_sections():
    text = """Line\nExamples:\n```python\nprint('hi')\n```\nEnd"""
    cleaned = strip_examples_sections(text)
    assert "Examples" not in cleaned
    assert "print" not in cleaned  # code block removed with examples


def test_clean_for_markdown_param_formatting():
    raw = """Args:\n value (int): number\n name: person\n"""
    out = clean_for_markdown(raw)
    assert "- value (int):" in out
    assert "- name:" in out


def test_clean_for_html_removes_backticks_and_asterisks():
    raw = "``code``\n*param*: value"  # backticks & asterisks
    out = clean_for_html(raw)
    assert "`" not in out
    assert "*" not in out


def test_clean_for_pdf_basic():
    raw = "# Title\n```python\nprint('x')\n```\n"  # heading + fenced code
    out = clean_for_pdf(raw)
    assert "Title" in out  # heading kept as plain text (not markdown style)
    assert "```" not in out
