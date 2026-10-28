# Les test_*.py a la racine sont des scripts autonomes, lances sur le VPS depuis ce dossier
# (`.venv/bin/python3 test_parsers.py`) : ils importent `parsers`, pas `flux.parsers`.
# pytest ne collecte que tests/.
collect_ignore_glob = ["test_*.py"]
