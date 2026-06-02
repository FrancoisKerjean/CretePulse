"""AEO post-generation compliance check for crete.direct articles."""
from dataclasses import dataclass, field
from typing import List, Dict, Any
import re
from bs4 import BeautifulSoup


@dataclass
class AEOFailure:
    passed: bool
    failures: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


_NUMBER_RE = re.compile(r"\b\d+([.,]\d+)?\b|\b\d+%|\b\d+\s*(eur|EUR|€|km|°C|min|h|m|kg|m²)\b")


def check_aeo_compliance(html: str, faq_jsonld: dict) -> AEOFailure:
    soup = BeautifulSoup(html, "html.parser")
    failures: List[str] = []
    details: Dict[str, Any] = {}

    h1 = soup.find("h1")
    heading_tags = soup.find_all(["h1", "h2", "h3", "h4"])
    has_question = any("?" in el.get_text() for el in heading_tags)
    if not has_question:
        for el in soup.find_all(["strong", "b"]):
            text = el.get_text(strip=True)
            if "?" in text and 5 < len(text) < 200:
                has_question = True
                break
    if not has_question:
        failures.append("no_question_heading")

    text = soup.get_text(" ", strip=True)
    words = text.split()
    intro = " ".join(words[:100])
    if not _NUMBER_RE.search(intro):
        failures.append("no_number_in_intro")
    details["intro_word_count"] = min(100, len(words))

    has_table = bool(soup.find("table"))
    has_long_list = False
    for ul in soup.find_all(["ul", "ol"]):
        if len(ul.find_all("li")) >= 4:
            has_long_list = True
            break
    if not (has_table or has_long_list):
        failures.append("no_table_or_long_list")

    main_entity = (faq_jsonld or {}).get("mainEntity", [])
    if not isinstance(main_entity, list) or len(main_entity) < 3:
        failures.append("faq_too_short")
    details["faq_count"] = len(main_entity) if isinstance(main_entity, list) else 0

    return AEOFailure(passed=len(failures) == 0, failures=failures, details=details)
