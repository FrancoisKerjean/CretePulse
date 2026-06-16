"""Writer CSV GTFS pur : RFC 4180 (csv.writer, QUOTE_MINIMAL), UTF-8 sans BOM,
fin de ligne \n. Pas de logique métier - juste l'écriture d'une table en mémoire."""
import csv
import os


def write_csv(path, header, rows):
    """Écrit header + rows dans `path` (UTF-8 sans BOM, \n). Crée le dossier
    parent au besoin. Retourne le nombre de lignes de données écrites."""
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        for row in rows:
            w.writerow(row)
    return len(rows)
