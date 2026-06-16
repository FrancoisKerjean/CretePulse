import os
from gtfs_writer import write_csv

def test_writes_header_and_rows(tmp_path):
    p = tmp_path / "agency.txt"
    n = write_csv(str(p), ["a", "b"], [[1, "x"], [2, "y"]])
    assert n == 2
    content = p.read_text(encoding="utf-8")
    assert content == "a,b\n1,x\n2,y\n"

def test_escapes_comma_and_quotes(tmp_path):
    p = tmp_path / "stops.txt"
    write_csv(str(p), ["stop_id", "stop_name"], [["x", 'A, "B"']])
    content = p.read_text(encoding="utf-8")
    # virgule + guillemets => champ entouré de guillemets, guillemets doublés
    assert content == 'stop_id,stop_name\nx,"A, ""B"""\n'

def test_no_bom_and_lf_only(tmp_path):
    p = tmp_path / "f.txt"
    write_csv(str(p), ["h"], [["v"]])
    raw = p.read_bytes()
    assert not raw.startswith(b"\xef\xbb\xbf")   # pas de BOM
    assert b"\r" not in raw                        # pas de CRLF

def test_creates_parent_dir(tmp_path):
    p = tmp_path / "sub" / "deep" / "f.txt"
    write_csv(str(p), ["h"], [])
    assert p.exists()
