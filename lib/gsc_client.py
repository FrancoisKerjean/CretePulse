"""GSC service account wrapper + striking distance scoring."""
import re
from typing import List, Dict, Optional


GSC_CRED_PATH = "/opt/cretepulse-content/gsc-service-account.json"
GSC_SITE_URL = "sc-domain:crete.direct"
GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def get_client():
    """Build the Search Console client. Imports Google libs lazily so this module
    can be unit-tested on machines where credentials are not yet configured."""
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(GSC_CRED_PATH, scopes=GSC_SCOPES)
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def fetch_striking_distance(days: int = 28, row_limit: int = 500) -> List[Dict]:
    from datetime import date, timedelta
    end = date.today()
    start = end - timedelta(days=days)
    sc = get_client()
    resp = sc.searchanalytics().query(
        siteUrl=GSC_SITE_URL,
        body={
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query"],
            "rowLimit": row_limit,
        },
    ).execute()
    rows = resp.get("rows", [])
    out = []
    for r in rows:
        q = r["keys"][0]
        out.append({
            "query": q,
            "impressions": int(r.get("impressions", 0)),
            "clicks": int(r.get("clicks", 0)),
            "ctr": float(r.get("ctr", 0.0)),
            "position": float(r.get("position", 99.0)),
        })
    return out


def compute_score(impressions: int, position: float, ctr: float) -> float:
    """Score = impressions × (1/position) × ctr_potential. Higher = more priority."""
    ctr_potential = max(0.0, 0.30 - ctr)
    return impressions * (1.0 / max(position, 1.0)) * (ctr_potential + 0.01)


def classify_format(impressions: int, position: float) -> Optional[str]:
    """Map (impressions, position) to format tier or None (below threshold)."""
    if impressions >= 50 and 5.0 <= position <= 15.0:
        return "pillar"
    if impressions >= 20 and 8.0 <= position <= 30.0:
        return "mid"
    return None


def _slug_fuzzy_match(query: str, slug: str) -> bool:
    """Loose match: query tokens covered >= 70% by slug tokens."""
    q_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    s_tokens = set(re.findall(r"[a-z0-9]+", slug.lower()))
    if not q_tokens:
        return False
    overlap = len(q_tokens & s_tokens)
    return (overlap / len(q_tokens)) >= 0.70


def filter_candidates(candidates: List[Dict], existing_slugs: List[str]) -> List[Dict]:
    return [c for c in candidates if not any(_slug_fuzzy_match(c["query"], s) for s in existing_slugs)]
