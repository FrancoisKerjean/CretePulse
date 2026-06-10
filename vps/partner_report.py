#!/usr/bin/env python3
"""Rapport Plausible mensuel aux partenaires taxi (cron 1er du mois).

Lit /opt/cretepulse/taxi-partners.json (copie de src/data/taxi-partners.json,
deployee avec ce script). Zero partenaire -> exit 0 silencieux.
Par partenaire : Stats API v2 Plausible self-hosted -> events "Taxi Call"
(props.zone) + pageviews des pages /buses contenant un slug de la zone,
sur le mois civil precedent. Email via Resend (from = hello@crete.direct,
domaine deja verifie pour la newsletter). --dry-run imprime sans envoyer.

Env requis (charge depuis /opt/cretepulse/.env) :
  PLAUSIBLE_API_KEY (Stats API key, admin analytics.crete.direct)
  RESEND_API_KEY
"""
import json
import os
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parent
PLAUSIBLE_URL = "https://analytics.crete.direct/api/v2/query"
RESEND_URL = "https://api.resend.com/emails"
SITE_ID = "crete.direct"
FROM_EMAIL = "Crete Direct <hello@crete.direct>"
COPY_TO = "contact@kairosguest.com"


def load_env() -> None:
    env_file = BASE / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def prev_month_range(today: date) -> tuple[str, str]:
    first_this = today.replace(day=1)
    last_prev = first_this - timedelta(days=1)
    return last_prev.replace(day=1).isoformat(), last_prev.isoformat()


def plausible_query(payload: dict) -> dict:
    req = urllib.request.Request(
        PLAUSIBLE_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['PLAUSIBLE_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def zone_stats(zone_id: str, place_slugs: list[str], date_range: list[str]) -> dict:
    calls = plausible_query({
        "site_id": SITE_ID,
        "metrics": ["visitors", "events"],
        "date_range": date_range,
        "filters": [
            ["is", "event:name", ["Taxi Call"]],
            ["is", "event:props:zone", [zone_id]],
        ],
    })
    pageviews = plausible_query({
        "site_id": SITE_ID,
        "metrics": ["visitors", "pageviews"],
        "date_range": date_range,
        "filters": [
            ["contains", "event:page", ["/buses/"]],
            ["contains", "event:page", place_slugs],
        ],
    })
    c = (calls.get("results") or [{}])[0].get("metrics", [0, 0])
    p = (pageviews.get("results") or [{}])[0].get("metrics", [0, 0])
    return {"call_visitors": c[0], "call_events": c[1],
            "page_visitors": p[0], "pageviews": p[1]}


def build_email(partner: dict, zone: dict, stats: dict, period: list[str]) -> dict:
    month = period[0][:7]
    text = f"""Hello {partner['name']},

Your sponsored taxi spot on crete.direct — {zone['label']} — for {month}:

  Calls from the taxi block (tel: taps): {stats['call_events']} ({stats['call_visitors']} unique visitors)
  Bus pages of your zone: {stats['pageviews']} page views ({stats['page_visitors']} unique visitors)

Numbers come straight from our self-hosted Plausible analytics. No estimates,
no inflation — what you see is what happened.

Questions or cancellation: just reply to this email.

Crete Direct
"""
    return {
        "from": FROM_EMAIL,
        "to": [partner["reportEmail"]],
        "cc": [COPY_TO],
        "subject": f"Your crete.direct taxi report — {zone['label']} — {month}",
        "text": text,
    }


def send_email(payload: dict) -> None:
    req = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()


def main() -> int:
    dry = "--dry-run" in sys.argv
    load_env()
    # utf-8-sig : tolere un BOM si le JSON a ete copie depuis Windows
    data = json.loads((BASE / "taxi-partners.json").read_text(encoding="utf-8-sig"))
    if not data["partners"]:
        return 0
    period = list(prev_month_range(date.today()))
    zones = {z["id"]: z for z in data["zones"]}
    failures = []
    for partner in data["partners"]:
        zone = zones[partner["zoneId"]]
        try:
            stats = zone_stats(zone["id"], zone["placeSlugs"], period)
            email = build_email(partner, zone, stats, period)
            if dry:
                print(json.dumps(email, indent=2))
            else:
                send_email(email)
        except Exception as exc:  # un partenaire en echec ne bloque pas les autres
            failures.append(f"{partner['name']}: {exc}")
    if failures:
        alert = {
            "from": FROM_EMAIL, "to": [COPY_TO],
            "subject": "partner_report.py: failures",
            "text": "\n".join(failures),
        }
        if dry:
            print(json.dumps(alert, indent=2))
        else:
            send_email(alert)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
