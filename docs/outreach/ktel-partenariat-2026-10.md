# Approche des 4 KTEL de Crète, octobre 2026 (BROUILLON, rien d'envoyé)

> Plan saison 2027, point 3 « le bus comme produit ». Ce fichier vit dans un dépôt
> multi-terminal ; l'état daté vit dans `memory/project_crete_direct.md`.
> ⛔ Aucun envoi sans relecture de Kami et sans le skill `kairos-email-send`.

## Statut : 🔧 ÉCRIT, NON ENVOYÉ (27/10/2026)

## Les quatre destinataires

| # | Opérateur | Réseau | Contact connu | Ce qu'on leur demande en priorité |
|---|-----------|--------|---------------|-----------------------------------|
| 1 | KTEL Ηρακλείου-Λασιθίου Α.Ε. (ktelherlas.gr) | interurbain est | info@ktelherlas.gr [FACT mémoire] | flux horaires officiel + positions GPS (télématique) |
| 2 | KTEL Χανίων-Ρεθύμνου Α.Ε. (e-ktel.com) | interurbain ouest | info@e-ktel.gr [FACT mémoire] | flux horaires officiel (PDF aujourd'hui) + positions GPS |
| 3 | Αστικό ΚΤΕΛ Ηρακλείου (Citybus Héraklion) | urbain | à trouver (site astiko-irakleiou.gr) [HYP] | accord d'usage de l'API passages + logo |
| 4 | Αστικό ΚΤΕΛ Χανίων (Citybus Chania) | urbain | à trouver (site chaniabus.gr) [HYP] | accord d'usage de l'API passages + logo |

Réalité technique à ne pas re-déduire (`memory/project_crete_direct_bus_live.md`) : aucun
KTEL interurbain n'expose de position GPS ; l'API `backoffice.ktelherlas.gr` bloque les IP
datacenter. Le live « vrai » est un palier partenariat, pas technique. Les deux urbains
exposent déjà des passages en direct que crete.direct lit (1 017 arrêts avec `api_code`).

## Les chiffres qu'on peut avancer (sourcés)

- ~2 100 visiteurs par semaine en septembre-octobre [FACT 2026-09-29 Plausible, plateau depuis le 03/08].
- 698 recherches de trajet interurbain en 30 jours sur /buses, + 178 recherches sans
  liaison directe et 72 sans résultat [FACT 2026-10-27 `flux_intent_daily`, 27/09→26/10].
- Top paires demandées 30 j : Héraklion→Chania 65, Héraklion→Réthymnon 51, Héraklion→Agios
  Nikolaos 32, Chania→Héraklion 32, Agios Nikolaos→Héraklion 23 [même source].
- 42 intentions d'achat de billet (`ticket_intent`) en 30 j [même source].
- 4 langues (en/fr/de/el), 76 % de l'usage bus sur mobile [FACT 2026-07-10 Plausible].
- ⛔ Ne pas écrire « 74 % du trafic passe par /buses » : chiffre de juin, non remesuré.

## Ce qu'on offre, ce qu'on demande

Offre : une vitrine gratuite en 4 langues, un rapport mensuel de la demande par paire
(dérivé de `flux_intent_daily`, le numéro « La Crète en chiffres » en montre le format),
un lien direct vers leur vente de billets, les alertes voyageurs relayées.
Demande : (1) un export horaire structuré (GTFS ou CSV) avec préavis des changements ;
(2) le flux de positions des véhicules, ou un accès au fournisseur télématique ;
(3) l'autorisation d'afficher le nom et le logo ; (4) un interlocuteur nommé.

---

## Courrier EN (interurbains 1 et 2, base commune)

Subject: crete.direct, 4-language bus timetables for Crete: a data partnership proposal

Dear Sir or Madam,

I run crete.direct, an independent travel guide for Crete in English, French, German and
Greek. Its most used section is the bus planner: it lets visitors find a KTEL connection
between two places, in their language, from their phone.

Some figures from the last 30 days, from our own analytics:

- 698 intercity journey searches, plus 178 searches for connections without a direct
  line and 72 with no result at all;
- the most requested pairs: Heraklion to Chania (65), Heraklion to Rethymno (51),
  Heraklion to Agios Nikolaos (32), Chania to Heraklion (32);
- 42 visitors asked where to buy a ticket.

Today our timetables come from your public website. This works, but it means a change on
your side can take days to reach travellers, and we cannot show them where a bus actually is.

I would like to propose a simple partnership, at no cost to you:

1. A structured timetable export (GTFS or a CSV file) and a short notice when it changes,
   so that travellers always see the current schedule.
2. If your vehicles are equipped with GPS, access to the position feed, or an
   introduction to your telematics provider, so that the live map shows your buses.
3. Permission to display your name and logo on the relevant pages, with a direct link to
   your ticket sales.

In return, crete.direct offers you a free showcase in four languages, a monthly report of
the journeys people look for (including the pairs you do not serve today), and the relay
of your service alerts to our readers.

I would be glad to present this in a short call, in English or Greek, at your convenience.

Kind regards,

Kami
Founder, crete.direct
kami@crete.direct

## Courrier EL (même contenu, pour les interurbains)

Θέμα: crete.direct, δρομολόγια λεωφορείων Κρήτης σε 4 γλώσσες: πρόταση συνεργασίας δεδομένων

Αξιότιμοι κύριοι,

Ονομάζομαι Kami και διαχειρίζομαι το crete.direct, έναν ανεξάρτητο ταξιδιωτικό οδηγό για
την Κρήτη στα αγγλικά, γαλλικά, γερμανικά και ελληνικά. Η πιο χρησιμοποιούμενη ενότητά
του είναι ο σχεδιασμός διαδρομής με λεωφορείο: επιτρέπει στους επισκέπτες να βρουν μια
σύνδεση ΚΤΕΛ ανάμεσα σε δύο μέρη, στη γλώσσα τους, από το κινητό τους.

Μερικά στοιχεία των τελευταίων 30 ημερών, από τα δικά μας αναλυτικά:

- 698 αναζητήσεις υπεραστικής διαδρομής, συν 178 αναζητήσεις για συνδέσεις χωρίς
  απευθείας γραμμή και 72 χωρίς κανένα αποτέλεσμα·
- οι πιο ζητούμενες διαδρομές: Ηράκλειο–Χανιά (65), Ηράκλειο–Ρέθυμνο (51),
  Ηράκλειο–Άγιος Νικόλαος (32), Χανιά–Ηράκλειο (32)·
- 42 επισκέπτες ρώτησαν πού αγοράζεται εισιτήριο.

Σήμερα τα δρομολόγιά μας προέρχονται από τον δημόσιο ιστότοπό σας. Λειτουργεί, αλλά μια
αλλαγή από την πλευρά σας μπορεί να αργήσει μέρες να φτάσει στους ταξιδιώτες, και δεν
μπορούμε να τους δείξουμε πού βρίσκεται πραγματικά ένα λεωφορείο.

Θα ήθελα να σας προτείνω μια απλή συνεργασία, χωρίς κόστος για εσάς:

1. Μια δομημένη εξαγωγή δρομολογίων (GTFS ή αρχείο CSV) και μια σύντομη ειδοποίηση όταν
   αλλάζουν, ώστε οι ταξιδιώτες να βλέπουν πάντα το ισχύον πρόγραμμα.
2. Αν τα οχήματά σας διαθέτουν GPS, πρόσβαση στη ροή θέσεων ή μια σύσταση στον πάροχο
   τηλεματικής σας, ώστε ο ζωντανός χάρτης να δείχνει τα λεωφορεία σας.
3. Άδεια να εμφανίζουμε το όνομα και το λογότυπό σας στις σχετικές σελίδες, με απευθείας
   σύνδεσμο στην πώληση εισιτηρίων σας.

Σε αντάλλαγμα, το crete.direct σας προσφέρει δωρεάν προβολή σε τέσσερις γλώσσες, μηνιαία
αναφορά των διαδρομών που αναζητά ο κόσμος (και εκείνων που δεν εξυπηρετείτε σήμερα) και
την αναμετάδοση των ανακοινώσεών σας στους αναγνώστες μας.

Θα χαρώ να σας το παρουσιάσω σε μια σύντομη κλήση, στα αγγλικά ή στα ελληνικά, όποτε σας
βολεύει.

Με εκτίμηση,

Kami
Ιδρυτής, crete.direct
kami@crete.direct

## Variante urbains (3 et 4) : paragraphe à substituer aux points 1-3

Today crete.direct already shows the next departures at your stops, read from your public
passenger information service, at 533 stops in Heraklion and 484 in Chania. I would like
to put this on a clear footing: your written agreement to use that service, your logo on
the live map, and a contact for the day the service changes. In return you get the same
showcase, the same monthly report of demand, and we relay your alerts.

Σήμερα το crete.direct δείχνει ήδη τις επόμενες αναχωρήσεις στις στάσεις σας, από το
δημόσιο σύστημα πληροφόρησης επιβατών σας, σε 533 στάσεις στο Ηράκλειο και 484 στα Χανιά.
Θα ήθελα να το βάλουμε σε σαφή βάση: τη γραπτή συγκατάθεσή σας για τη χρήση αυτής της
υπηρεσίας, το λογότυπό σας στον ζωντανό χάρτη και έναν υπεύθυνο επικοινωνίας για την
ημέρα που θα αλλάξει η υπηρεσία. Σε αντάλλαγμα έχετε την ίδια προβολή, την ίδια μηνιαία
αναφορά ζήτησης, και αναμεταδίδουμε τις ανακοινώσεις σας.

## Avant envoi

- [ ] Trouver les adresses des deux Αστικό ΚΤΕΛ (sites, pages contact) [owner Kami/François, 03/11/2026]
- [ ] Relecture Kami du texte EN + EL, puis `kairos-email-send`, From `kami@crete.direct` [François, 03/11/2026]
- [ ] Préparer le rapport mensuel « demande par paire » promis (requête `flux_intent_daily`, même format que « La Crète en chiffres ») avant toute réponse positive [Claude, 10/11/2026]
