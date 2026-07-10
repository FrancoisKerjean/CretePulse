"""Connexion Postgres locale (self-host cretepulse) pour les scripts flux."""
import os

import psycopg2
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse/.env")
load_dotenv("/opt/cretepulse-db/.env")  # POSTGRES_PASSWORD vit ici


def connect():
    return psycopg2.connect(
        host="localhost", port=5433, dbname="cretepulse",
        user="postgres", password=os.environ["POSTGRES_PASSWORD"],
    )


def insert_rows(sql, rows):
    if not rows:
        return 0
    conn = connect()
    conn.autocommit = True
    with conn, conn.cursor() as cur:
        cur.executemany(sql, rows)
    conn.close()
    return len(rows)
