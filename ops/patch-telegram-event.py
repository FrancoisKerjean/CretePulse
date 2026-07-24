#!/usr/bin/env python3
"""Patch /opt/cretepulse/telegram.py fetch_next_event + build_message:
the events table uses date_start/date_end/location_name, not start_date/location.
Also only surface verified events (unverified = admin-review only). Fixes the
silent 'events.start_date does not exist' error so the recap can show events.
"""
import shutil, sys

PATH = "/opt/cretepulse/telegram.py"
shutil.copy(PATH, PATH + ".bak-20260609-event")
src = open(PATH, encoding="utf-8").read()

repls = [
    ('.select("title_en,start_date,location")',
     '.select("title_en,date_start,location_name,verified")'),
    ('.gte("start_date", today)',
     '.gte("date_start", today)\n            .eq("verified", True)'),
    ('.order("start_date")',
     '.order("date_start")'),
    ('ev_date = next_event.get("start_date", "")',
     'ev_date = next_event.get("date_start", "")'),
    ('ev_loc = next_event.get("location", "")',
     'ev_loc = next_event.get("location_name", "")'),
]

for old, new in repls:
    if old not in src:
        print(f"!! ABORT: not found verbatim -> {old!r}")
        sys.exit(1)
    src = src.replace(old, new)

open(PATH, "w", encoding="utf-8").write(src)
print("patched fetch_next_event/build_message OK (backup .bak-20260609-event)")
