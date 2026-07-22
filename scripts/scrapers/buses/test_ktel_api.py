"""Tests TDD pour ktel_api.py — enrichissement via_stops herlas depuis l'API backoffice.

Référence : .spike/booking_sample.json (cretepulse-bus-gps)
API : backoffice.ktelherlas.gr (Spring Boot + Keycloak)
  POST /oauth2/token  -> Bearer token ~24h
  GET  /api/v1/departures/timetables/{date}/links -> {"pairs": ["fromDestId,toDestId", ...]}
  GET  /api/v1/booking/search/{from}/0/{to}/0?d={date} -> [{fromPoint, toPoint, routes:[{nameEN,...}]}]

Stratégie : via_stops = _route_stops(nameEN)[1:-1] (arrêts entre terminus, dans l'ordre).
"""
import pytest
from unittest.mock import patch, MagicMock

from ktel_api import (
    parse_route_stops_from_name_en,
    get_token,
    get_od_pairs,
    get_name_en,
)

# --- Fixture inline (extrait de .spike/booking_sample.json) ---

BOOKING_RESPONSE = [{
    "fromPoint": {
        "id": 10349, "code": "603",
        "nameEL": "ΚΕΝΤΡΙΚΟΣ ΣΤΑΘΜΟΣ ΗΡΑΚΛΕΙΟΥ (Αθηνά)",
        "nameEN": "HERAKLION CENTRAL BUS STATION (Athina)",
        "destinationId": 10097, "externalId": 603,
        "latitude": 35.33889, "longitude": 25.140941,
        "pointType": "station", "priority": 1628925,
    },
    "toPoint": {
        "id": 10263, "code": "481",
        "nameEL": "ΜΑΤΑΛΑ", "nameEN": "MATALA",
        "destinationId": 10020, "externalId": 481,
        "latitude": 34.9932, "longitude": 24.7499,
        "pointType": "stop-node", "priority": 21796,
    },
    "routes": [
        {
            "arrivalTime": "09:15", "id": 17147, "itineraryItemId": 102788,
            "nameEL": "ΗΡΑΚΛΕΙΟ- ΒΕΝΕΡΑΤΟ-ΑΥΓΕΝΙΚΗ-ΦΑΙΣΤΟΣ-ΜΑΤΑΛΑ",
            "nameEN": "IRAKLEIO- BENERATO-AVGENIKI-FAISTOS-MATALA",
            "departureTime": "07:30",
            "fromStepOrder": 0, "toStepOrder": 28,
            "points": [{"latitude": 35.3302, "longitude": 25.1068}],
        },
        {
            "arrivalTime": "12:00", "id": 17148, "itineraryItemId": 102789,
            "nameEL": "ΗΡΑΚΛΕΙΟ-ΜΑΤΑΛΑ",
            "nameEN": "IRAKLEIO-MATALA",
            "departureTime": "10:00",
            "fromStepOrder": 0, "toStepOrder": 10,
            "points": [],
        },
    ],
}]

TIMETABLES_LINKS_RESPONSE = {
    "date": "2026-06-20",
    "pairs": ["10097,10020", "10020,10097", "10097,10021"],
    "docs": [],
}

TOKEN_RESPONSE = {
    "access_token": "eyJhbGciOiJSUzI1NiJ9.testtoken",
    "token_type": "Bearer",
    "expires_in": 86400,
}


# ─── parse_route_stops_from_name_en ─────────────────────────────────────────

def test_parse_via_stops_multi_segment():
    """nameEN avec intermédiaires -> liste complète sauf terminus."""
    result = parse_route_stops_from_name_en("IRAKLEIO- BENERATO-AVGENIKI-FAISTOS-MATALA")
    assert result is not None
    # terminus exclus, ordre préservé
    assert result == ["Benerato", "Avgeniki", "Faistos"]


def test_parse_via_stops_direct_route_returns_none():
    """Route directe sans intermédiaires -> None (pas de via_stops)."""
    result = parse_route_stops_from_name_en("IRAKLEIO-MATALA")
    assert result is None


def test_parse_via_stops_normalises_irakleio_alias():
    """IRAKLEIO est un alias herlas de HERAKLION : on l'accepte sans erreur."""
    result = parse_route_stops_from_name_en("IRAKLEIO-AGIOS NIKOLAOS-IERAPETRA")
    assert result is not None
    assert "Agios Nikolaos" in result


def test_parse_via_stops_handles_space_after_dash():
    """L'API herlas émet 'IRAKLEIO- BENERATO' (espace après tiret) -> pas de stop vide."""
    result = parse_route_stops_from_name_en("IRAKLEIO- BENERATO-AVGENIKI-MATALA")
    assert result is not None
    assert "" not in result
    assert all(s.strip() for s in result)


def test_parse_via_stops_filters_hotel_stops():
    """Les arrêts hôtels sont filtrés comme dans le parser PDF."""
    result = parse_route_stops_from_name_en("IRAKLEIO-MALIA PALACE HOTEL-MALIA-MATALA")
    assert result is not None
    assert "Malia" in result
    assert not any("Hotel" in s or "Palace" in s for s in result)


# ─── get_token ───────────────────────────────────────────────────────────────

def test_get_token_posts_client_credentials():
    """get_token envoie client_credentials en Basic auth et retourne le token."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = TOKEN_RESPONSE

    with patch("ktel_api.requests.post", return_value=mock_resp) as mock_post:
        token = get_token("ktelhlmw", "khlmw!1908")

    mock_post.assert_called_once()
    call_kwargs = mock_post.call_args
    assert "oauth2/token" in call_kwargs.args[0]
    assert call_kwargs.kwargs.get("data", {}).get("grant_type") == "client_credentials"
    assert token == "eyJhbGciOiJSUzI1NiJ9.testtoken"


def test_get_token_raises_on_http_error():
    """get_token lève une exception si l'API répond non-200."""
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.text = "Unauthorized"

    with patch("ktel_api.requests.post", return_value=mock_resp):
        with pytest.raises(RuntimeError, match="token"):
            get_token("bad", "creds")


# ─── get_od_pairs ────────────────────────────────────────────────────────────

def test_get_od_pairs_parses_pairs_field():
    """get_od_pairs retourne la liste de tuples (fromDestId, toDestId)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = TIMETABLES_LINKS_RESPONSE

    with patch("ktel_api.requests.get", return_value=mock_resp):
        pairs = get_od_pairs("token", "2026-06-20")

    assert (10097, 10020) in pairs
    assert (10020, 10097) in pairs
    assert (10097, 10021) in pairs
    assert len(pairs) == 3


def test_get_od_pairs_parses_list_of_groups():
    """L'API réelle retourne une liste de groupes {title, startDate, pairs}.
    get_od_pairs doit aplatir les paires de tous les groupes."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {"title": "BUS ROUTES TO Agia Marina", "startDate": "2026-07-15",
         "pairs": ["10097,10149", "10149,10097"]},
        {"title": "HER to Matala", "startDate": "2026-07-12",
         "pairs": ["10097,10020", "10020,10097"]},
    ]

    with patch("ktel_api.requests.get", return_value=mock_resp):
        pairs = get_od_pairs("token", "2026-07-12")

    assert (10097, 10149) in pairs
    assert (10149, 10097) in pairs
    assert (10097, 10020) in pairs
    assert (10020, 10097) in pairs
    assert len(pairs) == 4


def test_get_od_pairs_returns_empty_on_error():
    """get_od_pairs retourne [] si l'API répond 500 (fail-safe)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 500

    with patch("ktel_api.requests.get", return_value=mock_resp):
        pairs = get_od_pairs("token", "2026-06-20")

    assert pairs == []


# ─── CURATED_HERLAS_VIA_STOPS ────────────────────────────────────────────────

def test_curated_heraklion_ierapetra_has_pachia_ammos():
    """HER→Ierapetra doit inclure Pachia Ammos (confirmé par ID 10276)."""
    from ktel_api import CURATED_HERLAS_VIA_STOPS
    stops = CURATED_HERLAS_VIA_STOPS.get(("heraklion", "ierapetra"))
    assert stops is not None
    assert "Pachia Ammos" in stops


def test_curated_heraklion_siteia_has_kavoysi_and_lastros():
    """HER→Siteia doit inclure Kavoysi et Lastros (confirmés par IDs 10275/10291)."""
    from ktel_api import CURATED_HERLAS_VIA_STOPS
    stops = CURATED_HERLAS_VIA_STOPS.get(("heraklion", "siteia"))
    assert stops is not None
    assert "Kavoysi" in stops
    assert "Lastros" in stops


def test_curated_routes_are_symmetric():
    """Chaque route curatée doit avoir sa version retour."""
    from ktel_api import CURATED_HERLAS_VIA_STOPS
    for (f, t), stops in list(CURATED_HERLAS_VIA_STOPS.items()):
        reverse = CURATED_HERLAS_VIA_STOPS.get((t, f))
        assert reverse is not None, f"Pas de retour pour ({f!r}, {t!r})"
        assert list(reversed(reverse)) == stops, f"Retour non-inversé pour ({f!r}, {t!r})"


def test_enrich_uses_curated_for_null_via_stops():
    """enrich_herlas_via_stops utilise CURATED pour les routes encore à None après l'API."""
    from ktel_api import enrich_herlas_via_stops, CURATED_HERLAS_VIA_STOPS

    mock_sb = MagicMock()
    # Route HER→Ierapetra sans via_stops
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": 42, "from_place": "Heraklion", "to_place": "Ierapetra", "via_stops": None}
    ]
    # L'API ne retourne aucune paire pour cette date
    mock_token = MagicMock()
    mock_token.status_code = 200
    mock_token.json.return_value = {"access_token": "tok"}
    mock_links = MagicMock()
    mock_links.status_code = 200
    mock_links.json.return_value = []  # pas de paires API

    with patch("ktel_api.requests.post", return_value=mock_token), \
         patch("ktel_api.requests.get", return_value=mock_links):
        stats = enrich_herlas_via_stops(mock_sb, "id", "secret", "2026-07-14")

    # La route doit avoir été enrichie depuis la curation
    update_calls = mock_sb.table.return_value.update.call_args_list
    assert len(update_calls) == 1
    updated_via = update_calls[0][0][0]["via_stops"]
    assert "Pachia Ammos" in updated_via
    assert stats["enriched"] == 1


# ─── get_name_en ─────────────────────────────────────────────────────────────

def test_get_name_en_returns_first_route_name():
    """get_name_en retourne le nameEN du premier route de la paire O-D."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = BOOKING_RESPONSE

    with patch("ktel_api.requests.get", return_value=mock_resp):
        name = get_name_en("token", 10097, 10020, "2026-06-20")

    assert name == "IRAKLEIO- BENERATO-AVGENIKI-FAISTOS-MATALA"


def test_get_name_en_returns_none_on_500():
    """get_name_en retourne None si l'API répond 500 (paire non servable)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 500

    with patch("ktel_api.requests.get", return_value=mock_resp):
        name = get_name_en("token", 10097, 99999, "2026-06-20")

    assert name is None


def test_get_name_en_returns_none_on_empty_routes():
    """get_name_en retourne None si la réponse ne contient aucune route."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [{"routes": [], "fromPoint": {}, "toPoint": {}}]

    with patch("ktel_api.requests.get", return_value=mock_resp):
        name = get_name_en("token", 10097, 10020, "2026-06-20")

    assert name is None
