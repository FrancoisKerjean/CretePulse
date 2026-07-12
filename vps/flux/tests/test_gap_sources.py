from flux.bog_regional import extract_crete_annual
from flux.elstat_ports import extract_crete_ports
from flux.road_traffic import normalize_flow


def test_extract_crete_ports_sums_passenger_columns():
    rows = [
        ["Ηράκλειο", 157550.0, 12.0, "Heraklio"],
        ["Σούδα", 73642.0, "", "Souda Bay"],
        ["Πειραιάς", 643498.0, 25627.0, "Piraeus"],
    ]
    assert extract_crete_ports(rows) == [("heraklion", 157562), ("souda", 73642)]


def test_extract_crete_annual_from_minimal_workbook():
    from io import BytesIO
    from openpyxl import Workbook

    book = Workbook()
    sheet = book.active
    sheet.append(["Region", "Country", 2023, 2024, 2025])
    sheet.append(["ATTICA (EL3)", None, 2083.1, 2050.2, 2043.0])  # valeurs, jamais des annees
    sheet.append(["CRETE (EL43)", None, 700.0, 750.5, 800.0])
    stream = BytesIO()
    book.save(stream)
    assert extract_crete_annual(stream.getvalue()) == [(2023, 700.0), (2024, 750.5), (2025, 800.0)]


def test_normalize_flow():
    payload = {"flowSegmentData": {
        "currentSpeed": 41, "freeFlowSpeed": 70,
        "currentTravelTime": 153, "freeFlowTravelTime": 90,
        "confidence": 0.59, "roadClosure": False,
    }}
    assert normalize_flow(payload) == (41, 70, 153, 90, 0.59, False)
