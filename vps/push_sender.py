# vps/push_sender.py
"""Envoi de notifications web push (VAPID) aux abonnés.

Pur côté payloads (testable) ; effets de bord isolés dans send_topic().
Branché en fin des scrapers existants (news.py, alerts.py). Pas de cron.
"""
import json
import os

SITE = "https://crete.direct"
TRANSLATED = ("en", "fr", "de", "el")


def _loc(row: dict, field: str, locale: str) -> str:
    """Valeur localisée avec fallback en."""
    val = row.get(f"{field}_{locale}") if locale in TRANSLATED else None
    if val:
        return val
    return row.get(f"{field}_en") or ""


def build_news_payload(row: dict, locale: str) -> dict:
    loc = locale if locale in TRANSLATED else "en"
    return {
        "title": _loc(row, "title", loc) or "Crete Direct",
        "body": _loc(row, "summary", loc),
        "url": f"{SITE}/{loc}/news/{row['slug']}",
        "tag": f"news-{row['slug']}",
    }


def build_alert_payload(row: dict, locale: str) -> dict:
    loc = locale if locale in TRANSLATED else "en"
    return {
        "title": row.get("title") or "Alerte bus",
        "body": "",
        "url": f"{SITE}/{loc}/buses",
        "tag": f"alert-{row['slug']}",
    }


def should_purge(status_code: int) -> bool:
    return status_code in (404, 410)


def subscription_to_info(row: dict) -> dict:
    return {"endpoint": row["endpoint"], "keys": {"p256dh": row["p256dh"], "auth": row["auth"]}}


def send_topic(supabase, topic: str, source_row: dict, build_payload) -> int:
    """Envoie source_row à tous les abonnés du topic, dans leur langue.
    Renvoie le nombre d'envois réussis. Purge les endpoints morts."""
    from pywebpush import webpush, WebPushException

    # pywebpush attend le CHEMIN du fichier PEM (chargé via py-vapid), PAS son
    # contenu : passer le contenu lève "Could not deserialize key data".
    priv_path = os.environ["VAPID_PRIVATE_KEY_PATH"]
    claims_sub = os.environ.get("VAPID_SUBJECT", "mailto:hello@crete.direct")

    # Chargement des abonnes : un echec ici = aucun envoi (sur, le caller retentera
    # sans risque de doublon car pushed reste false et rien n'a ete envoye).
    try:
        res = (supabase.table("push_subscriptions").select("*")
               .contains("topics", [topic]).execute())
        subs = res.data or []
    except Exception as e:
        print(f"[push] cannot load subscribers for {topic}: {e}")
        return 0

    # send_topic ne DOIT JAMAIS lever apres avoir commence a envoyer : sinon le
    # caller ne marque pas pushed=true et re-envoie tout au run suivant (doublon).
    # Chaque abonne est isole dans son propre try/except.
    sent = 0
    for sub in subs:
        try:
            payload = build_payload(source_row, sub.get("locale", "en"))
            webpush(
                subscription_info=subscription_to_info(sub),
                data=json.dumps(payload),
                vapid_private_key=priv_path,
                vapid_claims={"sub": claims_sub},
            )
            sent += 1
            try:
                supabase.table("push_subscriptions").update(
                    {"last_ok_at": "now()"}).eq("endpoint", sub["endpoint"]).execute()
            except Exception as e:
                print(f"[push] last_ok_at update failed: {e}")
        except WebPushException as e:
            code = getattr(getattr(e, "response", None), "status_code", 0)
            if should_purge(code):
                try:
                    supabase.table("push_subscriptions").delete().eq("endpoint", sub["endpoint"]).execute()
                except Exception as ee:
                    print(f"[push] purge failed: {ee}")
            else:
                print(f"[push] send error {code}: {e}")
        except Exception as e:
            print(f"[push] unexpected send error: {e}")
    print(f"[push] topic={topic} sent={sent}/{len(subs)}")
    return sent
