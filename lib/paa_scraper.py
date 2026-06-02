"""Google PAA + autocomplete scraping with realistic UA + delays."""
import json
import time
import random
from typing import List
import requests
from bs4 import BeautifulSoup


USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _http_get_text(url: str, headers: dict = None) -> str:
    h = HEADERS.copy()
    if headers:
        h.update(headers)
    resp = requests.get(url, headers=h, timeout=15)
    resp.raise_for_status()
    return resp.text


def _http_get_json(url: str, headers: dict = None):
    text = _http_get_text(url, headers)
    return json.loads(text)


def extract_paa_questions(html: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    questions = []
    for el in soup.find_all(attrs={"jsname": "Cpkphb"}):
        text = el.get_text(" ", strip=True)
        if "?" in text and 10 < len(text) < 200:
            questions.append(text)
    for el in soup.select(".related-question-pair, div[data-q]"):
        text = el.get_text(" ", strip=True)
        if "?" in text and 10 < len(text) < 200:
            questions.append(text)
    seen = set()
    out = []
    for q in questions:
        nq = q.strip().rstrip("?") + "?"
        if nq.lower() not in seen:
            seen.add(nq.lower())
            out.append(nq)
    return out


def fetch_paa_for_query(query: str, delay_seconds: float = 5.0) -> List[str]:
    url = f"https://www.google.com/search?q={requests.utils.quote(query)}&hl=en&gl=us"
    try:
        html = _http_get_text(url)
        time.sleep(delay_seconds + random.uniform(-1.5, 1.5))
        return extract_paa_questions(html)
    except Exception:
        return []


def fetch_autocomplete(query: str) -> List[str]:
    url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={requests.utils.quote(query)}"
    try:
        data = _http_get_json(url, headers={"Accept": "application/json"})
        if isinstance(data, list) and len(data) >= 2 and isinstance(data[1], list):
            return data[1]
        return []
    except Exception:
        return []
