import io
import zipfile

from utils.parser import extract_functions_classes_from_content, extract_py_files_from_zip


def test_extract_functions_and_classes():
    code = """
async def af():
    return 1

def f(x: int) -> int:
    return x

class A:
    def m(self):
        pass
"""
    res = extract_functions_classes_from_content(code)
    fn_names = {f["name"] for f in res["functions"]}
    cls_names = {c["name"] for c in res["classes"]}
    assert {"af", "f"}.issubset(fn_names)
    assert "A" in cls_names
    m_names = {m["name"] for m in res["classes"][0]["methods"]}
    assert "m" in m_names


def test_extract_py_files_from_zip(tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("pkg/a.py", "def x():\n  return 1\n")
        z.writestr("pkg/b.txt", "not python\n")
    out = extract_py_files_from_zip(buf.getvalue())
    names = {f["filename"] for f in out}
    assert "pkg/a.py" in names
