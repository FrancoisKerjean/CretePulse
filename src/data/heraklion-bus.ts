// AUTO-GENERE par scripts/citybus_irakleio_ingest.mjs — NE PAS EDITER A LA MAIN.
// Reseau bus urbain d'Heraklion (Αστικό ΚΤΕΛ Ηρακλείου, plateforme citybus.gr),
// aspire le 2026-07-09. Source du calculateur urbain
// (src/lib/urban-journey.ts, generalise). Temps = estimations (vitesse urbaine 18 km/h),
// pas d'horaire officiel (la cadence Heraklion n'est pas uniforme).

export interface HklStop { slug: string; name: string; nameEl: string; lat: number; lng: number; }
export interface HklLine {
  code: string; apiCode: string; name: string; nameEl: string;
  hex: string | null; textHex: string | null; totalMinutes: number; lengthKm: number;
}
export interface HklRouteStop { slug: string; seq: number; cumKm: number; cumMin: number; }
export interface HklRoute {
  code: string; lineCode: string; name: string; direction: number | null; stops: HklRouteStop[];
}

export const HKL_INFO = {
  operator: "Heraklion Urban Bus (Astiko KTEL Irakleiou)",
  sourceUrl: "https://astiko-irakleiou.gr/",
  city: "Heraklion",
  note: "Frequencies vary by line; check the operator for exact times.",
} as const;

export const HKL_STOPS: Record<string, HklStop> = {
  "hkl-irakleitou-29": {
    "slug": "hkl-irakleitou-29",
    "name": "Irakleitou 29",
    "nameEl": "ΗΡΑΚΛΕΙΤΟΥ 29",
    "lat": 35.3428691521937,
    "lng": 25.156744888322315
  },
  "hkl-street-stadiou-22": {
    "slug": "hkl-street-stadiou-22",
    "name": "Street Stadiou 22",
    "nameEl": "ΟΔΟΣ ΣΤΑΔΙΟΥ 22",
    "lat": 35.34318255525226,
    "lng": 25.159426162077136
  },
  "hkl-ts-elmepa": {
    "slug": "hkl-ts-elmepa",
    "name": "TS Elmepa",
    "nameEl": "ΤΣ ΕΛΜΕΠΑ",
    "lat": 35.30959080338453,
    "lng": 25.102455161102068
  },
  "hkl-ts-idryma-texnologias-ereunas-i-t-e": {
    "slug": "hkl-ts-idryma-texnologias-ereunas-i-t-e",
    "name": "TS_ Idryma Texnologias & Ereunas (i.t.e)",
    "nameEl": "ΤΣ  ΙΔΡΥΜΑ ΤΕΧΝΟΛΟΓΙΑΣ ΚΑΙ ΕΡΕΥΝΑΣ (Ι.Τ.Ε)",
    "lat": 35.3053489,
    "lng": 25.0731358
  },
  "hkl-ts-giofyro-e": {
    "slug": "hkl-ts-giofyro-e",
    "name": "TS Giofyro (E)",
    "nameEl": "ΤΣ ΓΙΟΦΥΡΟ (Ε)",
    "lat": 35.3290339,
    "lng": 25.1068002
  },
  "hkl-ts-ammoudara": {
    "slug": "hkl-ts-ammoudara",
    "name": "TS Ammoudara",
    "nameEl": "ΤΣ ΑΜΜΟΥΔΑΡΑ",
    "lat": 35.3400704,
    "lng": 25.0534417
  },
  "hkl-ts-gazi": {
    "slug": "hkl-ts-gazi",
    "name": "TS Gazi",
    "nameEl": "ΤΣ ΓΑΖΙ",
    "lat": 35.3218506,
    "lng": 25.0546348
  },
  "hkl-ts-kavroxori": {
    "slug": "hkl-ts-kavroxori",
    "name": "Ts_kavroxori",
    "nameEl": "ΤΣ ΚΑΒΡΟΧΩΡΙ",
    "lat": 35.30836,
    "lng": 25.0463167
  },
  "hkl-ts-athanati": {
    "slug": "hkl-ts-athanati",
    "name": "TS_ Athanati",
    "nameEl": "ΤΣ - ΑΘΑΝΑΤΟΙ",
    "lat": 35.27983217349887,
    "lng": 25.078883819907162
  },
  "hkl-ts-cemetery": {
    "slug": "hkl-ts-cemetery",
    "name": "TS Cemetery",
    "nameEl": "ΤΣ ΚΟΙΜΗΤΗΡΙΟ",
    "lat": 35.3217012,
    "lng": 25.157988
  },
  "hkl-ts-port": {
    "slug": "hkl-ts-port",
    "name": "TS Port",
    "nameEl": "ΤΣ ΛΙΜΑΝΙ",
    "lat": 35.34099608740013,
    "lng": 25.138825882838052
  },
  "hkl-ts-knossos": {
    "slug": "hkl-ts-knossos",
    "name": "TS Knossos",
    "nameEl": "ΤΣ ΚΝΩΣΣΟΣ (Ε)",
    "lat": 35.29942044815481,
    "lng": 25.1607967048935
  },
  "hkl-ts-giofyro": {
    "slug": "hkl-ts-giofyro",
    "name": "TS Giofyro",
    "nameEl": "ΤΣ ΓΙΟΦΥΡΟ",
    "lat": 35.3293,
    "lng": 25.1065647
  },
  "hkl-manou-katraki-34": {
    "slug": "hkl-manou-katraki-34",
    "name": "Manou Katraki 34",
    "nameEl": "ΜΑΝΟΥ ΚΑΤΡΑΚΗ 34",
    "lat": 35.3170675,
    "lng": 25.1133263
  },
  "hkl-ts-foinikia": {
    "slug": "hkl-ts-foinikia",
    "name": "TS Foinikia",
    "nameEl": "ΤΣ ΦΟΙΝΙΚΙΑ",
    "lat": 35.2819883,
    "lng": 25.1062546
  },
  "hkl-avenue-knossou-259": {
    "slug": "hkl-avenue-knossou-259",
    "name": "Avenue Knossou 259",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΚΝΩΣΣΟΥ 259",
    "lat": 35.30978614536969,
    "lng": 25.150298419014355
  },
  "hkl-avenue-knossou-202-agios-ioannis": {
    "slug": "hkl-avenue-knossou-202-agios-ioannis",
    "name": "Avenue Knossou 202 Agios Ioannis",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΚΝΩΣΣΟΥ 202  ΑΓΙΟΣ ΙΩΑΝΝΗΣ",
    "lat": 35.3153197,
    "lng": 25.1472964
  },
  "hkl-venizelio-iospital-fortetsa": {
    "slug": "hkl-venizelio-iospital-fortetsa",
    "name": "Venizelio Iospital Fortetsa",
    "nameEl": "ΒΕΝΙΖΕΛΙΟ ΝΟΣΟΚΟΜΕΙΟ ΦΟΡΤΕΤΣΑ",
    "lat": 35.3058882,
    "lng": 25.1523957
  },
  "hkl-ikarou-85": {
    "slug": "hkl-ikarou-85",
    "name": "Ikarou 85",
    "nameEl": "ΙΚΑΡΟΥ 85",
    "lat": 35.3379924,
    "lng": 25.1620282
  },
  "hkl-papanastasiou-92": {
    "slug": "hkl-papanastasiou-92",
    "name": "Papanastasiou 92",
    "nameEl": "ΠΑΠΑΝΑΣΤΑΣΙΟΥ 92",
    "lat": 35.3256912,
    "lng": 25.138676
  },
  "hkl-prassa": {
    "slug": "hkl-prassa",
    "name": "Prassa",
    "nameEl": "ΠΡΑΣΣΑ",
    "lat": 35.3147478,
    "lng": 25.188234
  },
  "hkl-gournes": {
    "slug": "hkl-gournes",
    "name": "Gournes",
    "nameEl": "ΓΟΥΡΝΕΣ",
    "lat": 35.2960181,
    "lng": 25.0931365
  },
  "hkl-avenue-ikarou-91": {
    "slug": "hkl-avenue-ikarou-91",
    "name": "Avenue Ikarou 91",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΙΚΑΡΟΥ 91",
    "lat": 35.3376025,
    "lng": 25.163895
  },
  "hkl-nea-alikarnassos": {
    "slug": "hkl-nea-alikarnassos",
    "name": "NEA Alikarnassos",
    "nameEl": "ΝΕΑ ΑΛΙΚΑΡΝΑΣΣΟΣ",
    "lat": 35.3385454,
    "lng": 25.1589288
  },
  "hkl-katsampas": {
    "slug": "hkl-katsampas",
    "name": "Katsampas",
    "nameEl": "ΚΑΤΣΑΜΠΑΣ",
    "lat": 35.3393986,
    "lng": 25.153165
  },
  "hkl-ikarou-79-drakou": {
    "slug": "hkl-ikarou-79-drakou",
    "name": "Ikarou 79 - Drakou.",
    "nameEl": "ΙΚΑΡΟΥ 79 - ΔΡΑΚΟΥ.",
    "lat": 35.3398555,
    "lng": 25.1494764
  },
  "hkl-poros": {
    "slug": "hkl-poros",
    "name": "Poros",
    "nameEl": "ΠΟΡΟΣ",
    "lat": 35.3386272,
    "lng": 25.1470028
  },
  "hkl-kalogeridi-leoforo-ikarou-17": {
    "slug": "hkl-kalogeridi-leoforo-ikarou-17",
    "name": "Kalogeridi Leoforo Ikarou 17",
    "nameEl": "ΚΑΛΟΓΕΡΙΔΗ ΛΕΩΦΟΡΟ ΙΚΑΡΟΥ 17",
    "lat": 35.3388961,
    "lng": 25.1454101
  },
  "hkl-liana-avenue-ikarou-15": {
    "slug": "hkl-liana-avenue-ikarou-15",
    "name": "Liana Avenue Ikarou 15",
    "nameEl": "ΛΙΑΝΑ ΛΕΩΦΟΡΟΣ ΙΚΑΡΟΥ 15",
    "lat": 35.338634,
    "lng": 25.1431
  },
  "hkl-central-station-yperastikon-leoforeion": {
    "slug": "hkl-central-station-yperastikon-leoforeion",
    "name": "Central Station Yperastikon Leoforeion",
    "nameEl": "ΚΕΝΤΡΙΚΟΣ ΣΤΑΘΜΟΣ ΥΠΕΡΑΣΤΙΚΩΝ ΛΕΩΦΟΡΕΙΩΝ",
    "lat": 35.3389921,
    "lng": 25.1400282
  },
  "hkl-square-eleutierias-astoria": {
    "slug": "hkl-square-eleutierias-astoria",
    "name": "Square Eleutierias - Astoria",
    "nameEl": "ΠΛΑΤΕΙΑ ΕΛΕΥΘΕΡΙΑΣ - ΑΣΤΟΡΙΑ",
    "lat": 35.3384751,
    "lng": 25.1366217
  },
  "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio": {
    "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
    "name": "Kamaraki Avenue Kalo&rinou 166 - Hotel Iraklio",
    "nameEl": "ΚΑΜΑΡΑΚΙ Λ. ΚΑΛΟΚΑΙΡΙΝΟΥ 166 - ΞΕΝΟΔΟΧΕΙΟ ΗΡΑΚΛΕΙΟ",
    "lat": 35.3379766,
    "lng": 25.1286661
  },
  "hkl-avenue-kalo-rinou-236": {
    "slug": "hkl-avenue-kalo-rinou-236",
    "name": "Avenue Kalo&rinou 236",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΚΑΛΟΚΑΙΡΙΝΟΥ 236",
    "lat": 35.3376124,
    "lng": 25.1259851
  },
  "hkl-chanioporta": {
    "slug": "hkl-chanioporta",
    "name": "Chanioporta",
    "nameEl": "ΧΑΝΙΟΠΟΡΤΑ",
    "lat": 35.3365615,
    "lng": 25.124303
  },
  "hkl-avenue-62-martyron-36": {
    "slug": "hkl-avenue-62-martyron-36",
    "name": "Avenue 62 Martyron 36",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 36",
    "lat": 35.336272,
    "lng": 25.1219751
  },
  "hkl-minoos-avenue-62-martyron-78": {
    "slug": "hkl-minoos-avenue-62-martyron-78",
    "name": "Minoos & Avenue 62 Martyron 78",
    "nameEl": "ΜΙΝΩΟΣ ΚΑΙ ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 78",
    "lat": 35.3358298,
    "lng": 25.1192488
  },
  "hkl-kaminia": {
    "slug": "hkl-kaminia",
    "name": "Kaminia",
    "nameEl": "ΚΑΜΙΝΙΑ",
    "lat": 35.3353944,
    "lng": 25.1173558
  },
  "hkl-deilina": {
    "slug": "hkl-deilina",
    "name": "Deilina",
    "nameEl": "ΔΕΙΛΙΝΑ",
    "lat": 35.3331161,
    "lng": 25.1143328
  },
  "hkl-avenue-62-martyron-182": {
    "slug": "hkl-avenue-62-martyron-182",
    "name": "Avenue 62 Martyron 182",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 182",
    "lat": 35.3312218,
    "lng": 25.1116468
  },
  "hkl-62-martyron-200-jumbo": {
    "slug": "hkl-62-martyron-200-jumbo",
    "name": "62 Martyron 200 - Jumbo",
    "nameEl": "62 ΜΑΡΤΥΡΩΝ 200 - JAMBO",
    "lat": 35.3301472,
    "lng": 25.1094763
  },
  "hkl-mausolou-gefyra-ethnikis": {
    "slug": "hkl-mausolou-gefyra-ethnikis",
    "name": "Mausolou Gefyra Ethnikis",
    "nameEl": "ΜΑΥΣΩΛΟΥ ΓΕΦΥΡΑ ΕΘΝΙΚΗΣ",
    "lat": 35.3325638,
    "lng": 25.1587474
  },
  "hkl-avenue-62-martyron-190-jumbo": {
    "slug": "hkl-avenue-62-martyron-190-jumbo",
    "name": "Avenue 62 Martyron 190 - Jumbo",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 190  - JAMBO",
    "lat": 35.3302001,
    "lng": 25.1102338
  },
  "hkl-avenue-62-martyron-180": {
    "slug": "hkl-avenue-62-martyron-180",
    "name": "Avenue 62 Martyron 180",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 180",
    "lat": 35.3310831,
    "lng": 25.111749
  },
  "hkl-deilina-2": {
    "slug": "hkl-deilina-2",
    "name": "Deilina",
    "nameEl": "ΔΕΙΛΙΝΑ",
    "lat": 35.3330233,
    "lng": 25.1144863
  },
  "hkl-kaminia-2": {
    "slug": "hkl-kaminia-2",
    "name": "Kaminia",
    "nameEl": "ΚΑΜΙΝΙΑ",
    "lat": 35.3354645,
    "lng": 25.1183382
  },
  "hkl-minoos-avenue-62-martyron-55": {
    "slug": "hkl-minoos-avenue-62-martyron-55",
    "name": "Minoos & Avenue 62 Martyron 55",
    "nameEl": "ΜΙΝΩΟΣ ΚΑΙ ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 55",
    "lat": 35.3358396,
    "lng": 25.1198712
  },
  "hkl-avenue-62-martyron-15": {
    "slug": "hkl-avenue-62-martyron-15",
    "name": "Avenue 62 Martyron 15",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 15",
    "lat": 35.336221,
    "lng": 25.1226716
  },
  "hkl-chanioporta-e": {
    "slug": "hkl-chanioporta-e",
    "name": "Chanioporta (E)",
    "nameEl": "ΧΑΝΙΟΠΟΡΤΑ (Ε)",
    "lat": 35.3364267,
    "lng": 25.1245845
  },
  "hkl-kalo-rinou-209": {
    "slug": "hkl-kalo-rinou-209",
    "name": "Kalo&rinou 209",
    "nameEl": "ΚΑΛΟΚΑΙΡΙΝΟΥ 209",
    "lat": 35.3376061,
    "lng": 25.1268184
  },
  "hkl-kalo-rinou-33": {
    "slug": "hkl-kalo-rinou-33",
    "name": "Kalo&rinou 33",
    "nameEl": "ΚΑΛΟΚΑΙΡΙΝΟΥ 33",
    "lat": 35.3379535,
    "lng": 25.1288813
  },
  "hkl-agiou-mina": {
    "slug": "hkl-agiou-mina",
    "name": "Agiou Mina",
    "nameEl": "ΑΓΙΟΥ ΜΗΝΑ",
    "lat": 35.3372542,
    "lng": 25.1303848
  },
  "hkl-square-kornarou": {
    "slug": "hkl-square-kornarou",
    "name": "Square Kornarou",
    "nameEl": "ΠΛΑΤΕΙΑ ΚΟΡΝΑΡΟΥ",
    "lat": 35.33624252564293,
    "lng": 25.133030925760256
  },
  "hkl-square-eleutierias": {
    "slug": "hkl-square-eleutierias",
    "name": "Square Eleutierias",
    "nameEl": "ΠΛΑΤΕΙΑ ΕΛΕΥΘΕΡΙΑΣ",
    "lat": 35.338168182949055,
    "lng": 25.136980243551253
  },
  "hkl-central-station-yperastikon-leoforeion-2": {
    "slug": "hkl-central-station-yperastikon-leoforeion-2",
    "name": "Central Station Yperastikon Leoforeion",
    "nameEl": "ΚΕΝΤΡΙΚΟΣ ΣΤΑΘΜΟΣ ΥΠΕΡΑΣΤΙΚΩΝ ΛΕΩΦΟΡΕΙΩΝ",
    "lat": 35.3387492,
    "lng": 25.1412196
  },
  "hkl-ikarou-48": {
    "slug": "hkl-ikarou-48",
    "name": "Ikarou 48",
    "nameEl": "ΙΚΑΡΟΥ 48",
    "lat": 35.3384873,
    "lng": 25.1432106
  },
  "hkl-poros-2": {
    "slug": "hkl-poros-2",
    "name": "Poros",
    "nameEl": "ΠΟΡΟΣ",
    "lat": 35.3385867,
    "lng": 25.1466492
  },
  "hkl-ikarou-132-drakou": {
    "slug": "hkl-ikarou-132-drakou",
    "name": "Ikarou 132 - Drakou.",
    "nameEl": "ΙΚΑΡΟΥ 132 - ΔΡΑΚΟΥ.",
    "lat": 35.3398158,
    "lng": 25.1495768
  },
  "hkl-katsampas-2": {
    "slug": "hkl-katsampas-2",
    "name": "Katsampas",
    "nameEl": "ΚΑΤΣΑΜΠΑΣ",
    "lat": 35.3392462,
    "lng": 25.15315
  },
  "hkl-nea-alikarnassos-2": {
    "slug": "hkl-nea-alikarnassos-2",
    "name": "NEA Alikarnassos",
    "nameEl": "ΝΕΑ ΑΛΙΚΑΡΝΑΣΣΟΣ",
    "lat": 35.3383801,
    "lng": 25.1594664
  },
  "hkl-mournies-ikarou-80": {
    "slug": "hkl-mournies-ikarou-80",
    "name": "Mournies Ikarou 80",
    "nameEl": "ΜΟΥΡΝΙΕΣ ΙΚΑΡΟΥ 80",
    "lat": 35.3379975,
    "lng": 25.1614643
  },
  "hkl-ikarou-106": {
    "slug": "hkl-ikarou-106",
    "name": "Ikarou 106",
    "nameEl": "ΙΚΑΡΟΥ 106",
    "lat": 35.337534,
    "lng": 25.1635065
  },
  "hkl-megalou-alexandrou-147": {
    "slug": "hkl-megalou-alexandrou-147",
    "name": "Megalou Alexandrou 147",
    "nameEl": "ΜΕΓΑΛΟΥ ΑΛΕΞΑΝΔΡΟΥ 147",
    "lat": 35.3217922,
    "lng": 25.137149
  },
  "hkl-megalou-alexandrou-165": {
    "slug": "hkl-megalou-alexandrou-165",
    "name": "Megalou Alexandrou 165",
    "nameEl": "ΜΕΓΑΛΟΥ ΑΛΕΞΑΝΔΡΟΥ 165",
    "lat": 35.3216875685549,
    "lng": 25.1393189634884
  },
  "hkl-ikarou-19": {
    "slug": "hkl-ikarou-19",
    "name": "Ikarou 19",
    "nameEl": "ΙΚΑΡΟΥ 19",
    "lat": 35.3391311,
    "lng": 25.1556893
  },
  "hkl-ikarou-20": {
    "slug": "hkl-ikarou-20",
    "name": "Ikarou 20",
    "nameEl": "ΙΚΑΡΟΥ 20",
    "lat": 35.3389785,
    "lng": 25.1556985
  },
  "hkl-estauromenou": {
    "slug": "hkl-estauromenou",
    "name": "Estauromenou",
    "nameEl": "ΕΣΤΑΥΡΩΜΕΝΟΥ",
    "lat": 35.3235422,
    "lng": 25.1010228
  },
  "hkl-diomidi-i-k-a": {
    "slug": "hkl-diomidi-i-k-a",
    "name": "Diomidi - I.k.a.",
    "nameEl": "ΔΙΟΜΗΔΗ - Ι.Κ.Α.",
    "lat": 35.3193009,
    "lng": 25.099555
  },
  "hkl-avenue-panepistimiou-kefalogianni": {
    "slug": "hkl-avenue-panepistimiou-kefalogianni",
    "name": "Avenue Panepistimiou & Kefalogianni",
    "nameEl": "ΛΕΟΦΩΡΟΣ ΠΑΝΕΠΙΣΤΙΜΙΟΥ & ΚΕΦΑΛΟΓΙΑΝΝΗ",
    "lat": 35.3207926,
    "lng": 25.0987367
  },
  "hkl-avenue-panepistimiou-parasyri-m": {
    "slug": "hkl-avenue-panepistimiou-parasyri-m",
    "name": "Avenue Panepistimiou & Parasyri (M)",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΠΑΝΕΠΙΣΤΙΜΙΟΥ & ΠΑΡΑΣΥΡΗ (Μ)",
    "lat": 35.3205267,
    "lng": 25.0957047
  },
  "hkl-agioi-theodoroi": {
    "slug": "hkl-agioi-theodoroi",
    "name": "Agioi Theodoroi",
    "nameEl": "ΑΓΙΟΙ ΘΕΟΔΩΡΟΙ",
    "lat": 35.3182586,
    "lng": 25.0933493
  },
  "hkl-aretousas": {
    "slug": "hkl-aretousas",
    "name": "Aretousas",
    "nameEl": "ΑΡΕΤΟΥΣΑΣ",
    "lat": 35.3144087,
    "lng": 25.0918267
  },
  "hkl-university-of-crete": {
    "slug": "hkl-university-of-crete",
    "name": "University OF Crete",
    "nameEl": "ΠΑΝΕΠΙΣΤΗΜΙΟ ΚΡΗΤΗΣ",
    "lat": 35.3057986,
    "lng": 25.0825932
  },
  "hkl-aretousas-2": {
    "slug": "hkl-aretousas-2",
    "name": "Aretousas",
    "nameEl": "ΑΡΕΤΟΥΣΑΣ",
    "lat": 35.3141645,
    "lng": 25.0919079
  },
  "hkl-agioi-theodoroi-2": {
    "slug": "hkl-agioi-theodoroi-2",
    "name": "Agioi Theodoroi",
    "nameEl": "ΑΓΙΟΙ ΘΕΟΔΩΡΟΙ",
    "lat": 35.3182881,
    "lng": 25.0938658
  },
  "hkl-diomidi-ika": {
    "slug": "hkl-diomidi-ika",
    "name": "Diomidi - IKA",
    "nameEl": "ΔΙΟΜΗΔΗ - ΙΚΑ",
    "lat": 35.3193662,
    "lng": 25.0999549
  },
  "hkl-estauromenou-2": {
    "slug": "hkl-estauromenou-2",
    "name": "Estauromenou",
    "nameEl": "ΕΣΤΑΥΡΩΜΕΝΟΥ",
    "lat": 35.3235039,
    "lng": 25.1014192
  },
  "hkl-agiou-mina-2": {
    "slug": "hkl-agiou-mina-2",
    "name": "Agiou Mina",
    "nameEl": "ΑΓΙΟΥ ΜΗΝΑ",
    "lat": 35.3374924,
    "lng": 25.13024
  },
  "hkl-sminarchia": {
    "slug": "hkl-sminarchia",
    "name": "Sminarchia",
    "nameEl": "ΣΜΗΝΑΡΧΙΑ",
    "lat": 35.3291548,
    "lng": 25.1791509
  },
  "hkl-petroemporiki": {
    "slug": "hkl-petroemporiki",
    "name": "Petroemporiki",
    "nameEl": "ΠΕΤΡΟΕΜΠΟΡΙΚΗ",
    "lat": 35.3328747,
    "lng": 25.1852987
  },
  "hkl-agios-ioannis-amnissos": {
    "slug": "hkl-agios-ioannis-amnissos",
    "name": "Agios Ioannis Amnissos",
    "nameEl": "ΑΓΙΟΣ ΙΩΑΝΝΗΣ ΑΜΝΙΣΣΟΣ",
    "lat": 35.3332021,
    "lng": 25.1899908
  },
  "hkl-agiou-alexandrou": {
    "slug": "hkl-agiou-alexandrou",
    "name": "Agiou Alexandrou",
    "nameEl": "ΑΓΙΟΥ ΑΛΕΞΑΝΔΡΟΥ",
    "lat": 35.3299464,
    "lng": 25.1914288
  },
  "hkl-riding-academy-crete": {
    "slug": "hkl-riding-academy-crete",
    "name": "Riding Academy Crete",
    "nameEl": "Ιππική Ακαδημία Κρήτης / Riding Academy Crete (Μ)",
    "lat": 35.32784177945645,
    "lng": 25.196677079974638
  },
  "hkl-amnissos-paralia-karterou-karteros-beach-sports-center": {
    "slug": "hkl-amnissos-paralia-karterou-karteros-beach-sports-center",
    "name": "Amnissos - Paralia Karterou - Karteros Beach Sports Center",
    "nameEl": "ΑΜΝΙΣΣΟΣ -ΠΑΡΑΛΙΑ ΚΑΡΤΕΡΟΥ-ΑΘΛΗΤΙΚΕΣ ΕΓΚΑΤΑΣΤΑΣΕΙΣ",
    "lat": 35.3277463,
    "lng": 25.1998195
  },
  "hkl-michail-archaggelou": {
    "slug": "hkl-michail-archaggelou",
    "name": "Michail Archaggelou",
    "nameEl": "ΜΙΧΑΗΛ ΑΡΧΑΓΓΕΛΟΥ",
    "lat": 35.3288855,
    "lng": 25.2042347
  },
  "hkl-amnissos-paralia-amnissou": {
    "slug": "hkl-amnissos-paralia-amnissou",
    "name": "Amnissos - Paralia Amnissou.",
    "nameEl": "ΑΜΝΙΣΣΟΣ - ΠΑΡΑΛΙΑ ΑΜΝΙΣΣΟΥ.",
    "lat": 35.3304237,
    "lng": 25.2079585
  },
  "hkl-amnissos-paralia-amnissou-2": {
    "slug": "hkl-amnissos-paralia-amnissou-2",
    "name": "Amnissos - Paralia Amnissou.",
    "nameEl": "ΑΜΝΙΣΣΟΣ - ΠΑΡΑΛΙΑ ΑΜΝΙΣΣΟΥ.",
    "lat": 35.330603,
    "lng": 25.2080875
  },
  "hkl-michail-archaggelou-2": {
    "slug": "hkl-michail-archaggelou-2",
    "name": "Michail Archaggelou",
    "nameEl": "ΜΙΧΑΗΛ ΑΡΧΑΓΓΕΛΟΥ",
    "lat": 35.3288765,
    "lng": 25.2039018
  },
  "hkl-amnissos-paralia-karterou": {
    "slug": "hkl-amnissos-paralia-karterou",
    "name": "Amnissos - Paralia Karterou.",
    "nameEl": "ΑΜΝΙΣΣΟΣ - ΠΑΡΑΛΙΑ ΚΑΡΤΕΡΟΥ.",
    "lat": 35.3277856,
    "lng": 25.1994928
  },
  "hkl-riding-academy-crete-2": {
    "slug": "hkl-riding-academy-crete-2",
    "name": "Riding Academy Crete",
    "nameEl": "Ιππική Ακαδημία Κρήτης / Riding Academy Crete (Ε)",
    "lat": 35.32792678016635,
    "lng": 25.196593205765506
  },
  "hkl-agiou-alexandrou-2": {
    "slug": "hkl-agiou-alexandrou-2",
    "name": "Agiou Alexandrou",
    "nameEl": "ΑΓΙΟΥ ΑΛΕΞΑΝΔΡΟΥ",
    "lat": 35.330031,
    "lng": 25.1916191
  },
  "hkl-agios-ioannis-amnissos-2": {
    "slug": "hkl-agios-ioannis-amnissos-2",
    "name": "Agios Ioannis Amnissos",
    "nameEl": "ΑΓΙΟΣ ΙΩΑΝΝΗΣ ΑΜΝΙΣΣΟΣ",
    "lat": 35.3333659,
    "lng": 25.1901982
  },
  "hkl-petroemporiki-2": {
    "slug": "hkl-petroemporiki-2",
    "name": "Petroemporiki",
    "nameEl": "ΠΕΤΡΟΕΜΠΟΡΙΚΗ",
    "lat": 35.3332165,
    "lng": 25.1857446
  },
  "hkl-sminarchia-2": {
    "slug": "hkl-sminarchia-2",
    "name": "Sminarchia",
    "nameEl": "ΣΜΗΝΑΡΧΙΑ",
    "lat": 35.3294277,
    "lng": 25.1783888
  },
  "hkl-anagenniseos": {
    "slug": "hkl-anagenniseos",
    "name": "Anagenniseos",
    "nameEl": "ΑΝΑΓΕΝΝΗΣΕΩΣ ( Ε )",
    "lat": 35.335553,
    "lng": 25.1652015
  },
  "hkl-anagenniseos-2": {
    "slug": "hkl-anagenniseos-2",
    "name": "Anagenniseos",
    "nameEl": "ΑΝΑΓΕΝΝΗΣΕΩΣ ( Μ)",
    "lat": 35.3353265,
    "lng": 25.1651102
  },
  "hkl-mausolou-161": {
    "slug": "hkl-mausolou-161",
    "name": "Mausolou 161",
    "nameEl": "ΜΑΥΣΩΛΟΥ 161",
    "lat": 35.3304328,
    "lng": 25.1604041
  },
  "hkl-mausolou-200": {
    "slug": "hkl-mausolou-200",
    "name": "Mausolou 200",
    "nameEl": "ΜΑΥΣΩΛΟΥ 200",
    "lat": 35.329288,
    "lng": 25.1626697
  },
  "hkl-mausolou-217": {
    "slug": "hkl-mausolou-217",
    "name": "Mausolou 217",
    "nameEl": "ΜΑΥΣΩΛΟΥ 217",
    "lat": 35.3268174,
    "lng": 25.1641936
  },
  "hkl-mausolou-235": {
    "slug": "hkl-mausolou-235",
    "name": "Mausolou 235",
    "nameEl": "ΜΑΥΣΩΛΟΥ 235",
    "lat": 35.3250011,
    "lng": 25.1654458
  },
  "hkl-street-gama-zita": {
    "slug": "hkl-street-gama-zita",
    "name": "Street Gama & Zita",
    "nameEl": "ΟΔΟΣ ΓΑΜΑ ΚΑΙ ΖΗΤΑ",
    "lat": 35.3239513758623,
    "lng": 25.168163906261
  },
  "hkl-street-gama-zita-2": {
    "slug": "hkl-street-gama-zita-2",
    "name": "Street Gama & Zita",
    "nameEl": "ΟΔΟΣ ΓΑΜΑ ΚΑΙ ΖΗΤΑ",
    "lat": 35.3239430442826,
    "lng": 25.1711298184967
  },
  "hkl-kallitiea": {
    "slug": "hkl-kallitiea",
    "name": "Kallitiea",
    "nameEl": "ΚΑΛΛΙΘΕΑ",
    "lat": 35.3137088,
    "lng": 25.1731017
  },
  "hkl-dimopoulou-34": {
    "slug": "hkl-dimopoulou-34",
    "name": "Dimopoulou 34",
    "nameEl": "ΔΗΜΟΠΟΥΛΟΥ 34",
    "lat": 35.3118714,
    "lng": 25.1754931
  },
  "hkl-dimopoulou-2": {
    "slug": "hkl-dimopoulou-2",
    "name": "Dimopoulou 2",
    "nameEl": "ΔΗΜΟΠΟΥΛΟΥ 2",
    "lat": 35.3144882,
    "lng": 25.1735667
  },
  "hkl-kazantzidi": {
    "slug": "hkl-kazantzidi",
    "name": "Kazantzidi",
    "nameEl": "ΚΑΖΑΝΤΖΙΔΗ",
    "lat": 35.3311934,
    "lng": 25.1596788
  },
  "hkl-street-gama-thita": {
    "slug": "hkl-street-gama-thita",
    "name": "Street Gama & Thita",
    "nameEl": "ΟΔΟΣ ΓΑΜΑ ΚΑΙ ΘΗΤΑ",
    "lat": 35.3239488,
    "lng": 25.1739133
  },
  "hkl-street-gama-giota": {
    "slug": "hkl-street-gama-giota",
    "name": "Street Gama & Giota",
    "nameEl": "ΟΔΟΣ ΓΑΜΑ ΚΑΙ ΓΙΩΤΑ",
    "lat": 35.3239562885402,
    "lng": 25.1759395805452
  },
  "hkl-street-ro-lamda": {
    "slug": "hkl-street-ro-lamda",
    "name": "Street RO & Lamda",
    "nameEl": "ΟΔΟΣ ΡΟ ΚΑΙ ΛΑΜΔΑ",
    "lat": 35.3219153,
    "lng": 25.1777205
  },
  "hkl-street-ro-vita": {
    "slug": "hkl-street-ro-vita",
    "name": "Street RO & Vita",
    "nameEl": "ΟΔΟΣ ΡΟ ΚΑΙ ΒΗΤΑ",
    "lat": 35.31933605338507,
    "lng": 25.16987040082979
  },
  "hkl-street-alfa-ro": {
    "slug": "hkl-street-alfa-ro",
    "name": "Street Alfa & RO",
    "nameEl": "ΟΔΟΣ ΑΛΦΑ ΚΑΙ ΡΟ",
    "lat": 35.3174719,
    "lng": 25.170835
  },
  "hkl-giannari": {
    "slug": "hkl-giannari",
    "name": "Giannari",
    "nameEl": "ΓΙΑΝΝΑΡΗ",
    "lat": 35.3107402,
    "lng": 25.1745858
  },
  "hkl-street-ro-vita-2": {
    "slug": "hkl-street-ro-vita-2",
    "name": "Street RO & Vita",
    "nameEl": "ΟΔΟΣ ΡΟ ΚΑΙ ΒΗΤΑ",
    "lat": 35.3196119,
    "lng": 25.1698835
  },
  "hkl-florinis": {
    "slug": "hkl-florinis",
    "name": "Florinis",
    "nameEl": "ΦΛΩΡΙΝΗΣ",
    "lat": 35.3375853,
    "lng": 25.1481772
  },
  "hkl-konitsis": {
    "slug": "hkl-konitsis",
    "name": "Konitsis",
    "nameEl": "ΚΟΝΙΤΣΗΣ",
    "lat": 35.336668,
    "lng": 25.1476806
  },
  "hkl-agios-georgios": {
    "slug": "hkl-agios-georgios",
    "name": "Agios Georgios",
    "nameEl": "ΑΓΙΟΣ ΓΕΩΡΓΙΟΣ",
    "lat": 35.3363113,
    "lng": 25.1465499
  },
  "hkl-komninon": {
    "slug": "hkl-komninon",
    "name": "Komninon",
    "nameEl": "ΚΟΜΝΗΝΩΝ",
    "lat": 35.3350377,
    "lng": 25.1464405
  },
  "hkl-miltiadou": {
    "slug": "hkl-miltiadou",
    "name": "Miltiadou",
    "nameEl": "ΜΙΛΤΙΑΔΟΥ",
    "lat": 35.33294169421566,
    "lng": 25.145184478148657
  },
  "hkl-serron": {
    "slug": "hkl-serron",
    "name": "Serron",
    "nameEl": "ΣΕΡΡΩΝ",
    "lat": 35.3310418,
    "lng": 25.1437455
  },
  "hkl-odysseos": {
    "slug": "hkl-odysseos",
    "name": "Odysseos",
    "nameEl": "ΟΔΥΣΣΕΩΣ",
    "lat": 35.3299362,
    "lng": 25.1431321
  },
  "hkl-agia-anna": {
    "slug": "hkl-agia-anna",
    "name": "Agia Anna",
    "nameEl": "ΑΓΙΑ ΑΝΝΑ",
    "lat": 35.3303803,
    "lng": 25.1407479
  },
  "hkl-tierissou-16": {
    "slug": "hkl-tierissou-16",
    "name": "Tierissou 16",
    "nameEl": "ΘΕΡΙΣΣΟΥ 16",
    "lat": 35.3351949,
    "lng": 25.1234505
  },
  "hkl-tierissou-38": {
    "slug": "hkl-tierissou-38",
    "name": "Tierissou 38",
    "nameEl": "ΘΕΡΙΣΣΟΥ 38",
    "lat": 35.3339073,
    "lng": 25.1225856
  },
  "hkl-tierissou-84": {
    "slug": "hkl-tierissou-84",
    "name": "Tierissou 84",
    "nameEl": "ΘΕΡΙΣΣΟΥ 84",
    "lat": 35.3321331,
    "lng": 25.1209612
  },
  "hkl-tierissou-110": {
    "slug": "hkl-tierissou-110",
    "name": "Tierissou 110",
    "nameEl": "ΘΕΡΙΣΣΟΥ 110",
    "lat": 35.3309077,
    "lng": 25.1201549
  },
  "hkl-kondylaki-101": {
    "slug": "hkl-kondylaki-101",
    "name": "Kondylaki 101",
    "nameEl": "ΚΟΝΔΥΛΑΚΗ 101",
    "lat": 35.3292913,
    "lng": 25.1206196
  },
  "hkl-kondylaki-77": {
    "slug": "hkl-kondylaki-77",
    "name": "Kondylaki 77",
    "nameEl": "ΚΟΝΔΥΛΑΚΗ 77",
    "lat": 35.3298511,
    "lng": 25.1226111
  },
  "hkl-kondylaki-27": {
    "slug": "hkl-kondylaki-27",
    "name": "Kondylaki 27",
    "nameEl": "ΚΟΝΔΥΛΑΚΗ 27",
    "lat": 35.3311239,
    "lng": 25.1248586
  },
  "hkl-m-merkouri": {
    "slug": "hkl-m-merkouri",
    "name": "M. Merkouri",
    "nameEl": "Μ. ΜΕΡΚΟΥΡΗ",
    "lat": 35.3322363,
    "lng": 25.1266959
  },
  "hkl-pananeio": {
    "slug": "hkl-pananeio",
    "name": "Pananeio",
    "nameEl": "ΠΑΝΑΝΕΙΟ",
    "lat": 35.3350348,
    "lng": 25.1278092
  },
  "hkl-chanioporta-nik-plastira": {
    "slug": "hkl-chanioporta-nik-plastira",
    "name": "Chanioporta - Nik. Plastira",
    "nameEl": "ΧΑΝΙΟΠΟΡΤΑ - ΝΙΚ. ΠΛΑΣΤΗΡΑ",
    "lat": 35.3368846,
    "lng": 25.1254415
  },
  "hkl-dimokratias": {
    "slug": "hkl-dimokratias",
    "name": "Dimokratias",
    "nameEl": "ΔΗΜΟΚΡΑΤΙΑΣ",
    "lat": 35.3370042,
    "lng": 25.1370805
  },
  "hkl-analipsi-m": {
    "slug": "hkl-analipsi-m",
    "name": "Analipsi M",
    "nameEl": "ΑΝΑΛΗΨΗ M",
    "lat": 35.3360232,
    "lng": 25.1387722
  },
  "hkl-ergatiko-kentro": {
    "slug": "hkl-ergatiko-kentro",
    "name": "Ergatiko Kentro",
    "nameEl": "ΕΡΓΑΤΙΚΟ ΚΕΝΤΡΟ",
    "lat": 35.3329399,
    "lng": 25.138389
  },
  "hkl-georgiou-papandreou": {
    "slug": "hkl-georgiou-papandreou",
    "name": "Georgiou Papandreou",
    "nameEl": "ΓΕΩΡΓΙΟΥ ΠΑΠΑΝΔΡΕΟΥ",
    "lat": 35.331656,
    "lng": 25.1386118
  },
  "hkl-agia-anna-2": {
    "slug": "hkl-agia-anna-2",
    "name": "Agia Anna",
    "nameEl": "ΑΓΙΑ ΑΝΝΑ",
    "lat": 35.330679,
    "lng": 25.1402942
  },
  "hkl-odysseos-2": {
    "slug": "hkl-odysseos-2",
    "name": "Odysseos",
    "nameEl": "ΟΔΥΣΣΕΩΣ",
    "lat": 35.3299415,
    "lng": 25.1433458
  },
  "hkl-emmanouil-mpantouva-57": {
    "slug": "hkl-emmanouil-mpantouva-57",
    "name": "Emmanouil Mpantouva 57",
    "nameEl": "ΕΜΜΑΝΟΥΗΛ ΜΠΑΝΤΟΥΒΑ 57",
    "lat": 35.3317898,
    "lng": 25.1447498
  },
  "hkl-geronomaki": {
    "slug": "hkl-geronomaki",
    "name": "Geronomaki",
    "nameEl": "ΓΕΡΩΝΥΜΑΚΗ",
    "lat": 35.3319949,
    "lng": 25.1461944
  },
  "hkl-komninon-73": {
    "slug": "hkl-komninon-73",
    "name": "Komninon 73",
    "nameEl": "ΚΟΜΝΗΝΩΝ 73",
    "lat": 35.3335037,
    "lng": 25.146493
  },
  "hkl-komninon-29": {
    "slug": "hkl-komninon-29",
    "name": "Komninon 29",
    "nameEl": "ΚΟΜΝΗΝΩΝ 29",
    "lat": 35.3350985,
    "lng": 25.1465658
  },
  "hkl-agios-georgios-2": {
    "slug": "hkl-agios-georgios-2",
    "name": "Agios Georgios",
    "nameEl": "ΑΓΙΟΣ ΓΕΩΡΓΙΟΣ",
    "lat": 35.3363344,
    "lng": 25.1467133
  },
  "hkl-konitsis-2": {
    "slug": "hkl-konitsis-2",
    "name": "Konitsis",
    "nameEl": "ΚΟΝΙΤΣΗΣ",
    "lat": 35.3364546,
    "lng": 25.1489816
  },
  "hkl-lyktou": {
    "slug": "hkl-lyktou",
    "name": "Lyktou",
    "nameEl": "ΛΥΚΤΟΥ",
    "lat": 35.3379438,
    "lng": 25.1491532
  },
  "hkl-eleutheriou-venizelou-papandreou": {
    "slug": "hkl-eleutheriou-venizelou-papandreou",
    "name": "Eleutheriou Venizelou & Papandreou",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ ΚΑΙ ΠΑΠΑΝΔΡΕΟΥ",
    "lat": 35.333232,
    "lng": 25.0961891
  },
  "hkl-tsalikaki": {
    "slug": "hkl-tsalikaki",
    "name": "Tsalikaki",
    "nameEl": "ΤΣΑΛΙΚΑΚΙ",
    "lat": 35.3285811,
    "lng": 25.0890608
  },
  "hkl-georgiou-gennimata-67": {
    "slug": "hkl-georgiou-gennimata-67",
    "name": "Georgiou Gennimata 67",
    "nameEl": "ΓΕΩΡΓΙΟΥ ΓΕΝΝΗΜΑΤΑ 67",
    "lat": 35.3288957,
    "lng": 25.0873254
  },
  "hkl-georgiou-gennimata-21": {
    "slug": "hkl-georgiou-gennimata-21",
    "name": "Georgiou Gennimata 21",
    "nameEl": "ΓΕΩΡΓΙΟΥ ΓΕΝΝΗΜΑΤΑ 21",
    "lat": 35.3294555,
    "lng": 25.0852946
  },
  "hkl-georgiou-gennimata-21-2": {
    "slug": "hkl-georgiou-gennimata-21-2",
    "name": "Georgiou Gennimata 21",
    "nameEl": "ΓΕΩΡΓΙΟΥ ΓΕΝΝΗΜΑΤΑ 21",
    "lat": 35.3293667,
    "lng": 25.0853185
  },
  "hkl-georgiou-gennimata-36": {
    "slug": "hkl-georgiou-gennimata-36",
    "name": "Georgiou Gennimata 36",
    "nameEl": "ΓΕΩΡΓΙΟΥ ΓΕΝΝΗΜΑΤΑ 36",
    "lat": 35.3288945,
    "lng": 25.0870888
  },
  "hkl-tsalikaki-2": {
    "slug": "hkl-tsalikaki-2",
    "name": "Tsalikaki",
    "nameEl": "ΤΣΑΛΙΚΑΚΙ",
    "lat": 35.3284935,
    "lng": 25.0891568
  },
  "hkl-eleutheriou-venizelou-papandreou-2": {
    "slug": "hkl-eleutheriou-venizelou-papandreou-2",
    "name": "Eleutheriou Venizelou & Papandreou",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ ΚΑΙ ΠΑΠΑΝΔΡΕΟΥ",
    "lat": 35.3330821,
    "lng": 25.0960833
  },
  "hkl-gennimata-venizelou": {
    "slug": "hkl-gennimata-venizelou",
    "name": "Gennimata & Venizelou",
    "nameEl": "ΓΕΝΝΗΜΑΤΑ ΚΑΙ ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.3299744,
    "lng": 25.0838259
  },
  "hkl-gennimata-venizelou-2": {
    "slug": "hkl-gennimata-venizelou-2",
    "name": "Gennimata & Venizelou",
    "nameEl": "ΓΕΝΝΗΜΑΤΑ ΚΑΙ ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.3300458,
    "lng": 25.083814
  },
  "hkl-eleutheriou-venizelou": {
    "slug": "hkl-eleutheriou-venizelou",
    "name": "Eleutheriou Venizelou",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.329344970272615,
    "lng": 25.080140729430383
  },
  "hkl-eleutheriou-venizelou-2": {
    "slug": "hkl-eleutheriou-venizelou-2",
    "name": "Eleutheriou Venizelou",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.3291631,
    "lng": 25.0800198
  },
  "hkl-eleutheriou-venizelou-aromatika": {
    "slug": "hkl-eleutheriou-venizelou-aromatika",
    "name": "Eleutheriou Venizelou Aromatika",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ ΑΡΩΜΑΤΙΚΑ",
    "lat": 35.3270878,
    "lng": 25.0754991
  },
  "hkl-eleutheriou-venizelou-aromatika-2": {
    "slug": "hkl-eleutheriou-venizelou-aromatika-2",
    "name": "Eleutheriou Venizelou Aromatika",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ ΑΡΩΜΑΤΙΚΑ",
    "lat": 35.3269797,
    "lng": 25.0755542
  },
  "hkl-eleutheriou-venizelou-3": {
    "slug": "hkl-eleutheriou-venizelou-3",
    "name": "Eleutheriou Venizelou",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.3268059,
    "lng": 25.0713274
  },
  "hkl-eleutheriou-venizelou-196": {
    "slug": "hkl-eleutheriou-venizelou-196",
    "name": "Eleutheriou Venizelou 196",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ 196",
    "lat": 35.3262372,
    "lng": 25.0695616
  },
  "hkl-eleutheriou-venizelou-164": {
    "slug": "hkl-eleutheriou-venizelou-164",
    "name": "Eleutheriou Venizelou 164",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ 164",
    "lat": 35.3263565,
    "lng": 25.0702373
  },
  "hkl-eleutheriou-venizelou-4": {
    "slug": "hkl-eleutheriou-venizelou-4",
    "name": "Eleutheriou Venizelou",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.3257279,
    "lng": 25.0684837
  },
  "hkl-town-hall-gaziou": {
    "slug": "hkl-town-hall-gaziou",
    "name": "Town Hall Gaziou",
    "nameEl": "ΔΗΜΑΡΧΕΙΟ ΓΑΖΙΟΥ",
    "lat": 35.32540563963474,
    "lng": 25.0666567766865
  },
  "hkl-town-hall-gaziou-2": {
    "slug": "hkl-town-hall-gaziou-2",
    "name": "Town Hall Gaziou",
    "nameEl": "ΔΗΜΑΡΧΕΙΟ ΓΑΖΙΟΥ",
    "lat": 35.3252453,
    "lng": 25.0664855
  },
  "hkl-eleutheriou-venizelou-260": {
    "slug": "hkl-eleutheriou-venizelou-260",
    "name": "Eleutheriou Venizelou 260",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ 260",
    "lat": 35.3247278,
    "lng": 25.0648624
  },
  "hkl-eleutheriou-venizelou-249": {
    "slug": "hkl-eleutheriou-venizelou-249",
    "name": "Eleutheriou Venizelou 249",
    "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ 249",
    "lat": 35.3244329,
    "lng": 25.0646354
  },
  "hkl-agiou-spyridonos": {
    "slug": "hkl-agiou-spyridonos",
    "name": "Agiou Spyridonos",
    "nameEl": "ΑΓΙΟΥ ΣΠΥΡΙΔΩΝΟΣ",
    "lat": 35.3222904,
    "lng": 25.0611901
  },
  "hkl-agiou-spyridonos-2": {
    "slug": "hkl-agiou-spyridonos-2",
    "name": "Agiou Spyridonos",
    "nameEl": "ΑΓΙΟΥ ΣΠΥΡΙΔΩΝΟΣ",
    "lat": 35.3222056,
    "lng": 25.0613524
  },
  "hkl-komvos-reddi": {
    "slug": "hkl-komvos-reddi",
    "name": "Komvos Reddi",
    "nameEl": "ΚΟΜΒΟΣ ΚΟΚΚΙΝΙΔΗ (ΠΡΟΣ ΚΑΒΡΟΧΩΡΙ)",
    "lat": 35.3214286883767,
    "lng": 25.057991622615067
  },
  "hkl-komvos-reddi-2": {
    "slug": "hkl-komvos-reddi-2",
    "name": "Komvos Reddi",
    "nameEl": "ΚΟΜΒΟΣ ΚΟΚΚΙΝΙΔΗ ΠΡΟΣ ΤΣ ΓΑΖΙ",
    "lat": 35.32218094588865,
    "lng": 25.05834466012589
  },
  "hkl-agios-georgios-3": {
    "slug": "hkl-agios-georgios-3",
    "name": "Agios Georgios",
    "nameEl": "ΑΓΙΟΣ ΓΕΩΡΓΙΟΣ",
    "lat": 35.3188436,
    "lng": 25.0576221
  },
  "hkl-agios-georgios-4": {
    "slug": "hkl-agios-georgios-4",
    "name": "Agios Georgios",
    "nameEl": "ΑΓΙΟΣ ΓΕΩΡΓΙΟΣ",
    "lat": 35.3192432,
    "lng": 25.0579576
  },
  "hkl-diakladosi-krousona": {
    "slug": "hkl-diakladosi-krousona",
    "name": "Diakladosi Krousona",
    "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΚΡΟΥΣΩΝΑ 2 (Μ)",
    "lat": 35.3132561,
    "lng": 25.0551539
  },
  "hkl-kavroxori-stasi-1": {
    "slug": "hkl-kavroxori-stasi-1",
    "name": "Kavroxori Stasi 1",
    "nameEl": "ΚΑΒΡΟΧΩΡΙ ΣΤΑΣΗ 1",
    "lat": 35.31303,
    "lng": 25.0514386
  },
  "hkl-kavroxori-stasi-2": {
    "slug": "hkl-kavroxori-stasi-2",
    "name": "Kavroxori Stasi 2",
    "nameEl": "ΚΑΒΡΟΧΩΡΙ ΣΤΑΣΗ 2",
    "lat": 35.3114183,
    "lng": 25.0492718
  },
  "hkl-kavroxori-stasi-2-2": {
    "slug": "hkl-kavroxori-stasi-2-2",
    "name": "Kavroxori Stasi 2",
    "nameEl": "ΚΑΒΡΟΧΩΡΙ ΣΤΑΣΗ 2",
    "lat": 35.3113482,
    "lng": 25.0493338
  },
  "hkl-kavroxori-stasi-3": {
    "slug": "hkl-kavroxori-stasi-3",
    "name": "Kavroxori Stasi 3",
    "nameEl": "ΚΑΒΡΟΧΩΡΙ ΣΤΑΣΗ 3",
    "lat": 35.3094982,
    "lng": 25.0480762
  },
  "hkl-kavroxori-stasi-3-2": {
    "slug": "hkl-kavroxori-stasi-3-2",
    "name": "Kavroxori Stasi 3",
    "nameEl": "ΚΑΒΡΟΧΩΡΙ ΣΤΑΣΗ 3",
    "lat": 35.3095934,
    "lng": 25.0479327
  },
  "hkl-kavroxori-stasi-4": {
    "slug": "hkl-kavroxori-stasi-4",
    "name": "Kavroxori Stasi 4",
    "nameEl": "ΚΑΒΡΟΧΩΡΙ ΣΤΑΣΗ 4",
    "lat": 35.3067277,
    "lng": 25.0471609
  },
  "hkl-diakladosi-krousona-2": {
    "slug": "hkl-diakladosi-krousona-2",
    "name": "Diakladosi Krousona",
    "nameEl": "ΠΑΛΙΑ ΔΙΑΚΛΑΔΩΣΗ ΚΡΟΥΣΩΝΑ 1 (Μ)",
    "lat": 35.3154702,
    "lng": 25.0551305
  },
  "hkl-athanasioy-moysi-ag-aik-e": {
    "slug": "hkl-athanasioy-moysi-ag-aik-e",
    "name": "AThANASIOY Moysi - AG. AIK (E)",
    "nameEl": "ΑΘΑΝΑΣΙΟΥ ΜΟΥΣΗ - ΑΓ. ΑΙΚ (Ε)",
    "lat": 35.31847899394434,
    "lng": 25.15131788184287
  },
  "hkl-agios-ioanni-xostos": {
    "slug": "hkl-agios-ioanni-xostos",
    "name": "Agios Ioanni Xostos",
    "nameEl": "ΑΓΙΟΣ ΙΩΑΝΝΗ ΧΩΣΤΟΣ",
    "lat": 35.3205808,
    "lng": 25.1144655
  },
  "hkl-eirinis-filias": {
    "slug": "hkl-eirinis-filias",
    "name": "Eirinis & Filias",
    "nameEl": "ΕΙΡΗΝΗΣ ΚΑΙ ΦΙΛΙΑΣ",
    "lat": 35.3183762,
    "lng": 25.1141019
  },
  "hkl-pinelopis": {
    "slug": "hkl-pinelopis",
    "name": "Pinelopis",
    "nameEl": "ΠΗΝΕΛΟΠΗΣ",
    "lat": 35.310521,
    "lng": 25.1092093
  },
  "hkl-manou-katraki-168": {
    "slug": "hkl-manou-katraki-168",
    "name": "Manou Katraki 168",
    "nameEl": "ΜΑΝΟΥ ΚΑΤΡΑΚΗ 168",
    "lat": 35.2954254,
    "lng": 25.1088411
  },
  "hkl-church-agiou-ioanni-xostou": {
    "slug": "hkl-church-agiou-ioanni-xostou",
    "name": "Church Agiou Ioanni Xostou",
    "nameEl": "ΕΚΚΛΗΣΙΑ ΑΓΙΟΥ ΙΩΑΝΝΗ ΧΩΣΤΟΥ",
    "lat": 35.3211588,
    "lng": 25.1146672
  },
  "hkl-christomichali-chylouri-103": {
    "slug": "hkl-christomichali-chylouri-103",
    "name": "Christomichali Chylouri 103",
    "nameEl": "ΧΡΙΣΤΟΜΙΧΑΛΗ ΞΥΛΟΥΡΗ 103",
    "lat": 35.3249873,
    "lng": 25.1155044
  },
  "hkl-police-station-prassa": {
    "slug": "hkl-police-station-prassa",
    "name": "Police Station Prassa",
    "nameEl": "ΑΣΤΥΝΑΜΙΚΟ ΜΕΓΑΡΟ ΠΡΑΣΣΑ",
    "lat": 35.3315961,
    "lng": 25.1671391
  },
  "hkl-prassa-2": {
    "slug": "hkl-prassa-2",
    "name": "Prassa 2",
    "nameEl": "ΠΡΑΣΣΑ 2",
    "lat": 35.3213666,
    "lng": 25.1930994
  },
  "hkl-ethnomartyron-antheon-mesampelis": {
    "slug": "hkl-ethnomartyron-antheon-mesampelis",
    "name": "Ethnomartyron & Antheon Mesampelis",
    "nameEl": "ΕΘΝΟΜΑΡΤΥΡΩΝ ΚΑΙ ΑΝΘΕΩΝ ΜΕΣΑΜΠΕΛΙΣ",
    "lat": 35.315587,
    "lng": 25.1401931
  },
  "hkl-antieon-nefelis": {
    "slug": "hkl-antieon-nefelis",
    "name": "Antieon & Nefelis",
    "nameEl": "ΑΝΘΕΩΝ ΚΑΙ ΝΕΦΕΛΗΣ",
    "lat": 35.3140771,
    "lng": 25.1397576
  },
  "hkl-sperxiou-oulaf-palme": {
    "slug": "hkl-sperxiou-oulaf-palme",
    "name": "Sperxiou & Oulaf Palme",
    "nameEl": "ΣΠΕΡΧΙΟΥ ΚΑΙ ΟΥΛΩΦ ΠΑΛΜΕ",
    "lat": 35.3126406,
    "lng": 25.1354818
  },
  "hkl-manou-katraki-antistaseos-vasilies": {
    "slug": "hkl-manou-katraki-antistaseos-vasilies",
    "name": "Manou Katraki - Antistaseos - Vasilies",
    "nameEl": "ΜΑΝΟΥ ΚΑΤΡΑΚΗ - ΑΝΤΙΣΤΑΣΕΩΣ - ΒΑΣΙΛΙΕΣ",
    "lat": 35.2678256,
    "lng": 25.1375586
  },
  "hkl-chatzaki-agiou-antoniou-diastaurosi-gournes": {
    "slug": "hkl-chatzaki-agiou-antoniou-diastaurosi-gournes",
    "name": "Chatzaki - & Agiou Antoniou - Diastaurosi Gournes",
    "nameEl": "ΧΑΤΖΑΚΗ - & ΑΓΙΟΥ ΑΝΤΩΝΙΟΥ - ΔΙΑΣΤΑΥΡΟΣΗ ΓΟΥΡΝΕΣ",
    "lat": 35.2987137,
    "lng": 25.0959568
  },
  "hkl-dafermou-filikis-etairias-ag-aikaterini": {
    "slug": "hkl-dafermou-filikis-etairias-ag-aikaterini",
    "name": "Dafermou - Filikis Etairias Ag.aikaterini",
    "nameEl": "ΔΑΦΕΡΜΟΥ - ΦΙΛΙΚΗΣ ΕΤΑΙΡΙΑΣ ΑΓ.ΑΙΚΑΤΕΡΙΝΗ",
    "lat": 35.332297945906,
    "lng": 25.1500509437443
  },
  "hkl-dafermou-agiou-nektariou-ag-aik": {
    "slug": "hkl-dafermou-agiou-nektariou-ag-aik",
    "name": "Dafermou & Agiou Nektariou - AG. AIK",
    "nameEl": "ΔΑΦΕΡΜΟΥ ΚΑΙ ΑΓΙΟΥ ΝΕΚΤΑΡΙΟΥ - ΑΓ. ΑΙΚ",
    "lat": 35.3343769,
    "lng": 25.1507812
  },
  "hkl-agiou-nektariou-filikis-etairias-ag-aik": {
    "slug": "hkl-agiou-nektariou-filikis-etairias-ag-aik",
    "name": "Agiou Nektariou & Filikis Etairias AG. AIK",
    "nameEl": "ΑΓΙΟΥ ΝΕΚΤΑΡΙΟΥ ΚΑΙ ΦΙΛΙΚΗΣ ΕΤΑΙΡΙΑΣ ΑΓ. ΑΙΚ",
    "lat": 35.3318267,
    "lng": 25.1509458
  },
  "hkl-ts-elmepa-epis": {
    "slug": "hkl-ts-elmepa-epis",
    "name": "TS Elmepa Epis.",
    "nameEl": "ΤΣ ΕΛΜΕΠΑ ΑΝΑΧ/ΗΣ.",
    "lat": 35.3096174,
    "lng": 25.1025825
  },
  "hkl-avenue-62-martyron-360": {
    "slug": "hkl-avenue-62-martyron-360",
    "name": "Avenue 62 Martyron 360",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 360",
    "lat": 35.3317425,
    "lng": 25.103781
  },
  "hkl-avenue-62-martyron-369-pagkritio-stadio": {
    "slug": "hkl-avenue-62-martyron-369-pagkritio-stadio",
    "name": "Avenue 62 Martyron 369 - Pagkritio Stadio",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 369 - ΠΑΓΚΡΗΤΙΟ ΣΤΑΔΙΟ",
    "lat": 35.3326717,
    "lng": 25.1013739
  },
  "hkl-avenue-62-martyron-377-xeropotamos": {
    "slug": "hkl-avenue-62-martyron-377-xeropotamos",
    "name": "Avenue 62 Martyron 377 - Xeropotamos",
    "nameEl": "ΛΕΩΦΟΡΟΣ 62 ΜΑΡΤΥΡΩΝ 377 - ΞΕΡΟΠΟΤΑΜΟΣ",
    "lat": 35.3327886,
    "lng": 25.0989599
  },
  "hkl-hotel-vanisko": {
    "slug": "hkl-hotel-vanisko",
    "name": "Hotel Vanisko",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ VANISKO",
    "lat": 35.3339745,
    "lng": 25.0953522
  },
  "hkl-andrea-papandreou-56-vagia": {
    "slug": "hkl-andrea-papandreou-56-vagia",
    "name": "Andrea Papandreou 56 Vagia",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 56 ΒΑΓΙΑ",
    "lat": 35.3354736,
    "lng": 25.0880411
  },
  "hkl-hotel-candia-maris": {
    "slug": "hkl-hotel-candia-maris",
    "name": "Hotel Candia Maris",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ  CANDIA MARIS",
    "lat": 35.3355985,
    "lng": 25.0842965
  },
  "hkl-hotel-creta-beach": {
    "slug": "hkl-hotel-creta-beach",
    "name": "Hotel Creta Beach",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ CRETA BEACH.",
    "lat": 35.3358169,
    "lng": 25.0803518
  },
  "hkl-hotel-agapi-beach-hotel-marilena": {
    "slug": "hkl-hotel-agapi-beach-hotel-marilena",
    "name": "Hotel Agapi Beach - Hotel Marilena.",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ AGAPI BEACH - ΞΕΝΟΔΟΧΕΙΟ MARILENA.",
    "lat": 35.3358567,
    "lng": 25.0782883
  },
  "hkl-hotel-santa-marina": {
    "slug": "hkl-hotel-santa-marina",
    "name": "Hotel Santa Marina.",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ SANTA MARINA.",
    "lat": 35.3360174,
    "lng": 25.0730509
  },
  "hkl-technopolis-hotel-marirena": {
    "slug": "hkl-technopolis-hotel-marirena",
    "name": "Technopolis - Hotel Marirena",
    "nameEl": "ΤΕΧΝΟΠΟΛΙΣ -  ΞΕΝΟΔΟΧΕΙΟ MARIRENA",
    "lat": 35.3357179,
    "lng": 25.0702086
  },
  "hkl-petousis-hotel-roxani": {
    "slug": "hkl-petousis-hotel-roxani",
    "name": "Petousis - Hotel Roxani",
    "nameEl": "ΠΕΤΟΥΣΗΣ - ΞΕΝΟΔΟΧΕΙΟ  ROXANI",
    "lat": 35.3354127,
    "lng": 25.0684576
  },
  "hkl-castro-hotel": {
    "slug": "hkl-castro-hotel",
    "name": "Castro Hotel",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ CASTRO",
    "lat": 35.3350639,
    "lng": 25.0657271
  },
  "hkl-police-station-hotel-dolphin-bay": {
    "slug": "hkl-police-station-hotel-dolphin-bay",
    "name": "Police Station - Hotel Dolphin BAY",
    "nameEl": "ΑΣΤΥΝΟΜΙΚΟ ΤΜΗΜΑ - ΞΕΝΟΔΟΧΕΙΟ DOLPHIN BAY",
    "lat": 35.335129659763574,
    "lng": 25.063156315774208
  },
  "hkl-hotel-amounda-vay": {
    "slug": "hkl-hotel-amounda-vay",
    "name": "Hotel Amounda VAY",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ AMOUNDA BAY",
    "lat": 35.3352141,
    "lng": 25.0613054
  },
  "hkl-hotel-poseidon": {
    "slug": "hkl-hotel-poseidon",
    "name": "Hotel Poseidon",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ ΠΟΣΕΙΔΩΝ",
    "lat": 35.334712,
    "lng": 25.0582847
  },
  "hkl-hotel-apollonia": {
    "slug": "hkl-hotel-apollonia",
    "name": "Hotel Apollonia",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ ΑΠΟΛΛΩΝΙA",
    "lat": 35.3368751,
    "lng": 25.0569691
  },
  "hkl-hotel-akti-zeus": {
    "slug": "hkl-hotel-akti-zeus",
    "name": "Hotel Akti Zeus",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ ΑΚΤΗ ΖΕΥΣ",
    "lat": 35.3386646,
    "lng": 25.0561807
  },
  "hkl-oaed": {
    "slug": "hkl-oaed",
    "name": "Oaed",
    "nameEl": "ΟΑΕΔ",
    "lat": 35.3254222,
    "lng": 25.1146922
  },
  "hkl-hotel-zeus": {
    "slug": "hkl-hotel-zeus",
    "name": "Hotel Zeus",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ ΖΕΥΣ",
    "lat": 35.3381677,
    "lng": 25.0561476
  },
  "hkl-hotel-apollonia-2": {
    "slug": "hkl-hotel-apollonia-2",
    "name": "Hotel Apollonia",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ ΑΠΟΛΛΩΝΙΑ",
    "lat": 35.3367887,
    "lng": 25.0567538
  },
  "hkl-hotel-poseidon-2": {
    "slug": "hkl-hotel-poseidon-2",
    "name": "Hotel Poseidon",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ ΠΟΣΕΙΔΩΝ",
    "lat": 35.3346272,
    "lng": 25.057736
  },
  "hkl-hotel-amounda-vay-hotel-minoas": {
    "slug": "hkl-hotel-amounda-vay-hotel-minoas",
    "name": "Hotel Amounda VAY - Hotel Minoas",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ AMOUNDA BAY.",
    "lat": 35.3350803,
    "lng": 25.0625944
  },
  "hkl-andrea-papandreou-301": {
    "slug": "hkl-andrea-papandreou-301",
    "name": "Andrea Papandreou 301",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 301",
    "lat": 35.3349685,
    "lng": 25.0661039
  },
  "hkl-petousis-hotel-roxani-2": {
    "slug": "hkl-petousis-hotel-roxani-2",
    "name": "Petousis - Hotel Roxani",
    "nameEl": "ΠΕΤΟΥΣΗΣ - ΞΕΝΟΔΟΧΕΙΟ  ROXANI",
    "lat": 35.3352979,
    "lng": 25.0683662
  },
  "hkl-technopolis-hotel-marirena-2": {
    "slug": "hkl-technopolis-hotel-marirena-2",
    "name": "Technopolis - Hotel Marirena",
    "nameEl": "ΤΕΧΝΟΠΟΛΙΣ -  ΞΕΝΟΔΟΧΕΙΟ MARIRENA",
    "lat": 35.3355769,
    "lng": 25.0700351
  },
  "hkl-andrea-papandreou-230": {
    "slug": "hkl-andrea-papandreou-230",
    "name": "Andrea Papandreou 230",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 230",
    "lat": 35.335918,
    "lng": 25.0730204
  },
  "hkl-andrea-papandreou-hotel-marilena-hotel-agapi": {
    "slug": "hkl-andrea-papandreou-hotel-marilena-hotel-agapi",
    "name": "Andrea Papandreou Hotel Marilena - Hotel Agapi",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ HOTEL MARILENA - HOTEL AGAPI",
    "lat": 35.3357341,
    "lng": 25.0782121
  },
  "hkl-hotel-creta-beach-2": {
    "slug": "hkl-hotel-creta-beach-2",
    "name": "Hotel Creta Beach",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ CRETA BEACH.",
    "lat": 35.3356852,
    "lng": 25.0808484
  },
  "hkl-hotel-candia-maris-2": {
    "slug": "hkl-hotel-candia-maris-2",
    "name": "Hotel Candia Maris",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ  CANDIA MARIS",
    "lat": 35.3355377,
    "lng": 25.083663
  },
  "hkl-andrea-papandreou-87": {
    "slug": "hkl-andrea-papandreou-87",
    "name": "Andrea Papandreou 87",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 87",
    "lat": 35.3353791,
    "lng": 25.087768
  },
  "hkl-andrea-papandreou-49": {
    "slug": "hkl-andrea-papandreou-49",
    "name": "Andrea Papandreou 49",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 49",
    "lat": 35.3349552,
    "lng": 25.0911179
  },
  "hkl-hotel-malena-akti-corali": {
    "slug": "hkl-hotel-malena-akti-corali",
    "name": "Hotel Malena. - Akti Corali.",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ MALENA. - AKTI CORALI.",
    "lat": 35.3346485,
    "lng": 25.0929603
  },
  "hkl-hotel-vanisko-2": {
    "slug": "hkl-hotel-vanisko-2",
    "name": "Hotel Vanisko",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ VANISKO",
    "lat": 35.3340493,
    "lng": 25.094727
  },
  "hkl-xeropotamos-vamvoukaki": {
    "slug": "hkl-xeropotamos-vamvoukaki",
    "name": "Xeropotamos - Vamvoukaki",
    "nameEl": "ΞΕΡΟΠΟΤΑΜΟΣ - ΒΑΜΒΟΥΚΑΚΗ",
    "lat": 35.3326059,
    "lng": 25.099105
  },
  "hkl-62-martyron-370-pagkritio-stadium": {
    "slug": "hkl-62-martyron-370-pagkritio-stadium",
    "name": "62 Martyron 370 - Pagkritio Stadium",
    "nameEl": "62 ΜΑΡΤΥΡΩΝ 370 - ΠΑΓΚΡΗΤΙΟ ΣΤΑΔΙΟ",
    "lat": 35.3324737,
    "lng": 25.1015153
  },
  "hkl-62-martyron-366": {
    "slug": "hkl-62-martyron-366",
    "name": "62 Martyron 366",
    "nameEl": "62 ΜΑΡΤΥΡΩΝ 366",
    "lat": 35.3318435,
    "lng": 25.1032618
  },
  "hkl-andrea-papandreou-175": {
    "slug": "hkl-andrea-papandreou-175",
    "name": "Andrea Papandreou 175",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 175",
    "lat": 35.3358191,
    "lng": 25.0756248
  },
  "hkl-andrea-papandreou-86": {
    "slug": "hkl-andrea-papandreou-86",
    "name": "Andrea Papandreou 86",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 86",
    "lat": 35.3359015,
    "lng": 25.0758349
  },
  "hkl-hotel-malena-akti-corali-2": {
    "slug": "hkl-hotel-malena-akti-corali-2",
    "name": "Hotel Malena. - Akti Corali.",
    "nameEl": "ΞΕΝΟΔΟΧΕΙΟ MALENA. - AKTI CORALI.",
    "lat": 35.3349282,
    "lng": 25.0923778
  },
  "hkl-ts-agion-panton": {
    "slug": "hkl-ts-agion-panton",
    "name": "TS Agion Panton",
    "nameEl": "ΤΣ ΑΓΙΩΝ ΠΑΝΤΩΝ",
    "lat": 35.3108942,
    "lng": 25.1736811
  },
  "hkl-ts-skalani": {
    "slug": "hkl-ts-skalani",
    "name": "TS Skalani",
    "nameEl": "ΤΣ ΣΚΑΛΑΝΙ",
    "lat": 35.2830445,
    "lng": 25.1863136
  },
  "hkl-ts-square-sinani": {
    "slug": "hkl-ts-square-sinani",
    "name": "Ts_square Sinani",
    "nameEl": "ΤΣ ΠΛΑΤΕΙΑ ΣΙΝΑΝΗ",
    "lat": 35.3192917,
    "lng": 25.1328814
  },
  "hkl-ts-mesampelies": {
    "slug": "hkl-ts-mesampelies",
    "name": "Ts_mesampelies",
    "nameEl": "ΤΣ ΜΕΣΑΜΠΕΛΙΕΣ",
    "lat": 35.30416220830279,
    "lng": 25.137923543154802
  },
  "hkl-ts-green-line": {
    "slug": "hkl-ts-green-line",
    "name": "Ts_green Line",
    "nameEl": "ΤΣ ΠΡΑΣΙΝΗ ΓΡΑΜΜΗ",
    "lat": 35.3215149,
    "lng": 25.1426351
  },
  "hkl-l-plastira-pyli-vitileem": {
    "slug": "hkl-l-plastira-pyli-vitileem",
    "name": "L. Plastira Pyli Vitileem",
    "nameEl": "Λ. ΠΛΑΣΤΗΡΑ ΠΥΛΗ ΒΗΘΛΕΕΜ",
    "lat": 35.3361425,
    "lng": 25.1261827
  },
  "hkl-l-plastira-stoa-makasi": {
    "slug": "hkl-l-plastira-stoa-makasi",
    "name": "L. Plastira Stoa Makasi",
    "nameEl": "Λ. ΠΛΑΣΤΗΡΑ ΣΤΟΑ ΜΑΚΑΣΙ",
    "lat": 35.3334916,
    "lng": 25.1296052
  },
  "hkl-l-plastira-kipotheatro-xatzidaki": {
    "slug": "hkl-l-plastira-kipotheatro-xatzidaki",
    "name": "L. Plastira Kipotheatro Xatzidaki",
    "nameEl": "Λ. ΠΛΑΣΤΗΡΑ ΚΗΠΟΘΕΑΤΡΟ ΧΑΤΖΗΔΑΚΗ",
    "lat": 35.3336087134609,
    "lng": 25.1333442043701
  },
  "hkl-manou-katraki-64": {
    "slug": "hkl-manou-katraki-64",
    "name": "Manou Katraki 64",
    "nameEl": "ΜΑΝΟΥ ΚΑΤΡΑΚΗ 64",
    "lat": 35.3077531,
    "lng": 25.1094422
  },
  "hkl-charilaou-trikoupi": {
    "slug": "hkl-charilaou-trikoupi",
    "name": "Charilaou Trikoupi",
    "nameEl": "ΧΑΡΙΛΑΟΥ ΤΡΙΚΟΥΠΗ",
    "lat": 35.333934,
    "lng": 25.135933
  },
  "hkl-charilaou-trikoupi-2": {
    "slug": "hkl-charilaou-trikoupi-2",
    "name": "Charilaou Trikoupi 2",
    "nameEl": "ΧΑΡΙΛΑΟΥ ΤΡΙΚΟΥΠΗ 2",
    "lat": 35.3345559,
    "lng": 25.1382206
  },
  "hkl-l-knossou-244": {
    "slug": "hkl-l-knossou-244",
    "name": "L.knossou 244",
    "nameEl": "Λ.ΚΝΩΣΣΟΥ 244",
    "lat": 35.3123927,
    "lng": 25.1491388
  },
  "hkl-dimokratias-24": {
    "slug": "hkl-dimokratias-24",
    "name": "Dimokratias 24",
    "nameEl": "ΔΗΜΟΚΡΑΤΙΑΣ 24",
    "lat": 35.3307472,
    "lng": 25.1381075
  },
  "hkl-megalou-alexandrou-85": {
    "slug": "hkl-megalou-alexandrou-85",
    "name": "Megalou Alexandrou 85",
    "nameEl": "ΜΕΓΑΛΟΥ ΑΛΕΞΑΝΔΡΟΥ 85",
    "lat": 35.3219803,
    "lng": 25.1301358
  },
  "hkl-oulof-palme-52": {
    "slug": "hkl-oulof-palme-52",
    "name": "Oulof Palme 52",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 52",
    "lat": 35.3152002,
    "lng": 25.1337066
  },
  "hkl-oulof-palme-158": {
    "slug": "hkl-oulof-palme-158",
    "name": "Oulof Palme 158",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 158",
    "lat": 35.305849,
    "lng": 25.1373186
  },
  "hkl-antieon-nikis": {
    "slug": "hkl-antieon-nikis",
    "name": "Antieon & Nikis",
    "nameEl": "ΑΝΘΕΩΝ ΚΑΙ ΝΙΚΗΣ",
    "lat": 35.3043175,
    "lng": 25.143277
  },
  "hkl-zervou": {
    "slug": "hkl-zervou",
    "name": "Zervou",
    "nameEl": "ΖΕΡΒΟΥ",
    "lat": 35.304374,
    "lng": 25.1442879
  },
  "hkl-markou-karanastasi": {
    "slug": "hkl-markou-karanastasi",
    "name": "Markou Karanastasi",
    "nameEl": "ΜΑΡΚΟΥ ΚΑΡΑΝΑΣΤΑΣΗ",
    "lat": 35.3067449,
    "lng": 25.1458393
  },
  "hkl-eam-papanastasiou-197": {
    "slug": "hkl-eam-papanastasiou-197",
    "name": "EAM Papanastasiou 197",
    "nameEl": "ΕΑΜ ΠΑΠΑΝΑΣΤΑΣΙΟΥ 197",
    "lat": 35.3097953,
    "lng": 25.1446173
  },
  "hkl-kampos-agiou-sylla": {
    "slug": "hkl-kampos-agiou-sylla",
    "name": "Kampos Agiou Sylla",
    "nameEl": "ΚΑΜΠΟΣ ΑΓΙΟΥ ΣΥΛΛΑ",
    "lat": 35.2562669,
    "lng": 25.1082692
  },
  "hkl-avenue-menelaou-parlama-26": {
    "slug": "hkl-avenue-menelaou-parlama-26",
    "name": "Avenue Menelaou Parlama 26",
    "nameEl": "ΛΕΩΦΟΡΟΣ  ΜΕΝΕΛΑΟΥ ΠΑΡΛΑΜΑ 26",
    "lat": 35.3273635,
    "lng": 25.1063927
  },
  "hkl-avenue-menelaou-parlama-58": {
    "slug": "hkl-avenue-menelaou-parlama-58",
    "name": "Avenue Menelaou Parlama 58",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΜΕΝΕΛΑΟΥ ΠΑΡΛΑΜΑ  58",
    "lat": 35.32373254111598,
    "lng": 25.10670878352328
  },
  "hkl-athitaki": {
    "slug": "hkl-athitaki",
    "name": "Athitaki",
    "nameEl": "ΑΘΗΤΑΚΗ",
    "lat": 35.3214665,
    "lng": 25.1028848
  },
  "hkl-hellenic-mediterranean-university-m": {
    "slug": "hkl-hellenic-mediterranean-university-m",
    "name": "Hellenic Mediterranean University (M)",
    "nameEl": "ΕΛΛΗΝΙΚΟ ΜΕΣΟΓΕΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ (ΕΛΜΕΠΑ (Μ)",
    "lat": 35.3196445,
    "lng": 25.1020345
  },
  "hkl-basketball-court-elmepa": {
    "slug": "hkl-basketball-court-elmepa",
    "name": "Basketball Court Elmepa",
    "nameEl": "ΓΗΠΕΔΟ ΜΠΑΣΚΕΤ ΕΛΜΕΠΑ",
    "lat": 35.3161336,
    "lng": 25.1017985
  },
  "hkl-protypo-high-school-m": {
    "slug": "hkl-protypo-high-school-m",
    "name": "Protypo High School (M)",
    "nameEl": "ΠΡΟΤΥΠΟ ΓΥΜΝΑΣΙΟ ΛΥΚΕΙΟ  (Μ)",
    "lat": 35.3114566,
    "lng": 25.1020371
  },
  "hkl-basketball-court-elmepa-2": {
    "slug": "hkl-basketball-court-elmepa-2",
    "name": "Basketball Court Elmepa",
    "nameEl": "ΓΗΠΕΔΟ ΜΠΑΣΚΕΤ ΕΛΜΕΠΑ",
    "lat": 35.3159208,
    "lng": 25.1019091
  },
  "hkl-hellenic-mediterranean-university-e": {
    "slug": "hkl-hellenic-mediterranean-university-e",
    "name": "Hellenic Mediterranean University (Ε)",
    "nameEl": "ΕΛΛΗΝΙΚΟ ΜΕΣΟΓΕΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ  (ΕΛΜΕΠΑ (Ε)",
    "lat": 35.3195065,
    "lng": 25.1022563
  },
  "hkl-athitaki-2": {
    "slug": "hkl-athitaki-2",
    "name": "Athitaki",
    "nameEl": "ΑΘΗΤΑΚΗ",
    "lat": 35.3223776,
    "lng": 25.1031769
  },
  "hkl-athitaki-2-2": {
    "slug": "hkl-athitaki-2-2",
    "name": "Athitaki 2",
    "nameEl": "ΑΘΗΤΑΚΗ 2",
    "lat": 35.3240282,
    "lng": 25.1035132
  },
  "hkl-avenue-menelaou-parlama-77": {
    "slug": "hkl-avenue-menelaou-parlama-77",
    "name": "Avenue Menelaou Parlama 77",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΜΕΝΕΛΑΟΥ ΠΑΡΛΑΜΑ  77",
    "lat": 35.3231258,
    "lng": 25.1054217
  },
  "hkl-avenue-menelaou-parlama-27": {
    "slug": "hkl-avenue-menelaou-parlama-27",
    "name": "Avenue Menelaou Parlama 27",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΜΕΝΕΛΑΟΥ ΠΑΡΛΑΜΑ  27",
    "lat": 35.3271665,
    "lng": 25.1066477
  },
  "hkl-student-residence-elmepa": {
    "slug": "hkl-student-residence-elmepa",
    "name": "Student Residence Elmepa",
    "nameEl": "ΦΟΙΤΙΤΙΚΗ ΕΣΤΙΑ ΕΛΜΕΠΑ",
    "lat": 35.3138666,
    "lng": 25.1017448
  },
  "hkl-student-residence-elmepa-2": {
    "slug": "hkl-student-residence-elmepa-2",
    "name": "Student Residence Elmepa",
    "nameEl": "ΦΟΙΤΙΤΙΚΗ ΕΣΤΙΑ ΕΛΜΕΠΑ",
    "lat": 35.3137502,
    "lng": 25.101849
  },
  "hkl-protypo-high-school-e": {
    "slug": "hkl-protypo-high-school-e",
    "name": "Protypo High School (E)",
    "nameEl": "ΠΡΟΤΥΠΟ ΓΥΜΝΑΣΙΟ ΛΥΚΕΙΟ  (Ε)",
    "lat": 35.3115259,
    "lng": 25.1021169
  },
  "hkl-ts-panepistimio": {
    "slug": "hkl-ts-panepistimio",
    "name": "TS Panepistimio",
    "nameEl": "ΤΣ ΠΑΝΕΠΙΣΤΗΜΙΟ",
    "lat": 35.30584571394926,
    "lng": 25.08286461534425
  },
  "hkl-megalou-alexandrou-120": {
    "slug": "hkl-megalou-alexandrou-120",
    "name": "Megalou Alexandrou 120",
    "nameEl": "ΜΕΓΑΛΟΥ ΑΛΕΞΑΝΔΡΟΥ 120",
    "lat": 35.3221311,
    "lng": 25.1346131
  },
  "hkl-irodotou": {
    "slug": "hkl-irodotou",
    "name": "Irodotou",
    "nameEl": "ΗΡΟΔΟΤΟΥ",
    "lat": 35.3381104,
    "lng": 25.1586025
  },
  "hkl-sofokli-venizelou": {
    "slug": "hkl-sofokli-venizelou",
    "name": "Sofokli Venizelou",
    "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.33608277310879,
    "lng": 25.10866294352194
  },
  "hkl-talos": {
    "slug": "hkl-talos",
    "name": "Talos",
    "nameEl": "ΤΑΛΩΣ",
    "lat": 35.3405894,
    "lng": 25.1194951
  },
  "hkl-sofokli-venizelou-arxiepiskopou-makariou": {
    "slug": "hkl-sofokli-venizelou-arxiepiskopou-makariou",
    "name": "Sofokli Venizelou-arxiepiskopou Makariou",
    "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ-ΑΡΧΙΕΠΙΣΚΟΠΟΥ ΜΑΚΑΡΙΟΥ",
    "lat": 35.341449824865855,
    "lng": 25.12322344037132
  },
  "hkl-sofokli-venizelou-giamalaki": {
    "slug": "hkl-sofokli-venizelou-giamalaki",
    "name": "Sofokli Venizelou-giamalaki",
    "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ-ΓΙΑΜΑΛΑΚΗ",
    "lat": 35.34115763946936,
    "lng": 25.129891840496086
  },
  "hkl-sofokli-venizelou-historical-museum": {
    "slug": "hkl-sofokli-venizelou-historical-museum",
    "name": "Sofokli Venizelou-historical Museum",
    "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ-ΙΣΤΟΡΙΚΟ ΜΟΥΣΕΙΟ",
    "lat": 35.3419461,
    "lng": 25.1307783
  },
  "hkl-fort-koule-square-18": {
    "slug": "hkl-fort-koule-square-18",
    "name": "Fort Koule Square 18",
    "nameEl": "ΦΡΟΥΡΕΙΟ ΚΟΥΛΕ ΠΛΑΤΕΙΑ 18 ΑΓΓΛΩΝ",
    "lat": 35.3427544,
    "lng": 25.134354
  },
  "hkl-square-sinani": {
    "slug": "hkl-square-sinani",
    "name": "Square Sinani",
    "nameEl": "ΠΛΑΤΕΙΑ ΣΙΝΑΝΗ",
    "lat": 35.3196714,
    "lng": 25.1330819
  },
  "hkl-papanastasiou-145": {
    "slug": "hkl-papanastasiou-145",
    "name": "Papanastasiou 145",
    "nameEl": "ΠΑΠΑΝΑΣΤΑΣΙΟΥ 145",
    "lat": 35.3145743,
    "lng": 25.1414378
  },
  "hkl-talos-2": {
    "slug": "hkl-talos-2",
    "name": "Talos",
    "nameEl": "ΤΑΛΩΣ",
    "lat": 35.3407065,
    "lng": 25.1190986
  },
  "hkl-arxiepiskopou-makariou-2": {
    "slug": "hkl-arxiepiskopou-makariou-2",
    "name": "Arxiepiskopou Makariou 2",
    "nameEl": "ΑΡΧΙΕΠΙΣΚΟΠΟΥ ΜΑΚΑΡΙΟΥ 2",
    "lat": 35.3387271,
    "lng": 25.1235981
  },
  "hkl-mouseio-fysikis-istorias": {
    "slug": "hkl-mouseio-fysikis-istorias",
    "name": "Mouseio Fysikis Istorias",
    "nameEl": "ΜΟΥΣΕΙΟ ΦΥΣΙΚΗΣ ΙΣΤΟΡΙΑΣ",
    "lat": 35.3417569,
    "lng": 25.1264946
  },
  "hkl-ts-agia-aikaterini": {
    "slug": "hkl-ts-agia-aikaterini",
    "name": "TS Agia Aikaterini",
    "nameEl": "ΤΣ ΑΓΙΑ ΑΙΚΑΤΕΡΙΝΗ",
    "lat": 35.30929967379131,
    "lng": 25.155717862631825
  },
  "hkl-metaxaki-2": {
    "slug": "hkl-metaxaki-2",
    "name": "Metaxaki 2",
    "nameEl": "ΜΕΤΑΞΑΚΗ 2",
    "lat": 35.3278098,
    "lng": 25.1151125
  },
  "hkl-mitera": {
    "slug": "hkl-mitera",
    "name": "Mitera",
    "nameEl": "ΜΗΤΕΡΑ",
    "lat": 35.3414103,
    "lng": 25.1233932
  },
  "hkl-ts-epivatikos-statimos": {
    "slug": "hkl-ts-epivatikos-statimos",
    "name": "TS Epivatikos Statimos",
    "nameEl": "ΤΣ ΕΠΙΒΑΤΙΚΟΣ ΣΤΑΘΜΟΣ",
    "lat": 35.3414914,
    "lng": 25.1450586
  },
  "hkl-police-station": {
    "slug": "hkl-police-station",
    "name": "Police Station",
    "nameEl": "ΑΣΤΥΝΟΜΙΚΟ ΜΕΓΑΡΟ",
    "lat": 35.3330382,
    "lng": 25.165418
  },
  "hkl-police-station-2": {
    "slug": "hkl-police-station-2",
    "name": "Police Station",
    "nameEl": "ΑΣΤΥΝΟΜΙΚΟ ΜΕΓΑΡΟ",
    "lat": 35.3331127,
    "lng": 25.1656614
  },
  "hkl-limnis-kourna": {
    "slug": "hkl-limnis-kourna",
    "name": "Limnis Kourna",
    "nameEl": "ΛΙΜΝΗΣ ΚΟΥΡΝΑ",
    "lat": 35.3269958,
    "lng": 25.113654
  },
  "hkl-papanastasiou-179": {
    "slug": "hkl-papanastasiou-179",
    "name": "Papanastasiou 179",
    "nameEl": "ΠΑΠΑΝΑΣΤΑΣΙΟΥ 179",
    "lat": 35.3114454,
    "lng": 25.1433215
  },
  "hkl-krasadaki-1": {
    "slug": "hkl-krasadaki-1",
    "name": "Krasadaki 1",
    "nameEl": "ΚΡΑΣΑΔΑΚΗ 1",
    "lat": 35.3227086,
    "lng": 25.1499135
  },
  "hkl-krasadaki-4": {
    "slug": "hkl-krasadaki-4",
    "name": "Krasadaki 4",
    "nameEl": "ΚΡΑΣΑΔΑΚΗ 4",
    "lat": 35.3226692,
    "lng": 25.1500512
  },
  "hkl-krasadaki-2": {
    "slug": "hkl-krasadaki-2",
    "name": "Krasadaki 2",
    "nameEl": "ΚΡΑΣΑΔΑΚΗ 2",
    "lat": 35.318939,
    "lng": 25.1489937
  },
  "hkl-krasadaki-xatzaki": {
    "slug": "hkl-krasadaki-xatzaki",
    "name": "Krasadaki Xatzaki",
    "nameEl": "ΚΡΑΣΑΔΑΚΗ ΧΑΤΖΑΚΗ",
    "lat": 35.3154197,
    "lng": 25.1479208
  },
  "hkl-chatzaki-ag-ioannis": {
    "slug": "hkl-chatzaki-ag-ioannis",
    "name": "Chatzaki AG Ioannis",
    "nameEl": "ΧΑΤΖΑΚΗ ΑΓ ΙΩΑΝΝΗΣ",
    "lat": 35.3162414,
    "lng": 25.1500879
  },
  "hkl-ermi-1": {
    "slug": "hkl-ermi-1",
    "name": "Ermi 1",
    "nameEl": "ΕΡΜΗ 1",
    "lat": 35.315519,
    "lng": 25.1521411
  },
  "hkl-ermi-5": {
    "slug": "hkl-ermi-5",
    "name": "Ermi 5",
    "nameEl": "ΕΡΜΗ 5",
    "lat": 35.3155107,
    "lng": 25.1522525
  },
  "hkl-emm-voreadi": {
    "slug": "hkl-emm-voreadi",
    "name": "EMM Voreadi",
    "nameEl": "ΕΜΜ ΒΟΡΕΑΔΗ",
    "lat": 35.3134724,
    "lng": 25.1535883
  },
  "hkl-emm-voreadi-2": {
    "slug": "hkl-emm-voreadi-2",
    "name": "EMM Voreadi",
    "nameEl": "ΕΜΜ ΒΟΡΕΑΔΗ",
    "lat": 35.3135535,
    "lng": 25.1537328
  },
  "hkl-ermi-2": {
    "slug": "hkl-ermi-2",
    "name": "Ermi 2",
    "nameEl": "ΕΡΜΗ 2",
    "lat": 35.3122413,
    "lng": 25.1544564
  },
  "hkl-ermi-4": {
    "slug": "hkl-ermi-4",
    "name": "Ermi 4",
    "nameEl": "ΕΡΜΗ 4",
    "lat": 35.3123983,
    "lng": 25.1545076
  },
  "hkl-ermi-3": {
    "slug": "hkl-ermi-3",
    "name": "Ermi 3",
    "nameEl": "ΕΡΜΗ 3",
    "lat": 35.3102745,
    "lng": 25.1552561
  },
  "hkl-natiena": {
    "slug": "hkl-natiena",
    "name": "Natiena",
    "nameEl": "ΝΑΘΕΝΑ",
    "lat": 35.309585361213074,
    "lng": 25.15404363575217
  },
  "hkl-pikrodafni": {
    "slug": "hkl-pikrodafni",
    "name": "Pikrodafni",
    "nameEl": "ΠΙΚΡΟΔΑΦΝΗ",
    "lat": 35.3172549,
    "lng": 25.1517895
  },
  "hkl-square-kyprou": {
    "slug": "hkl-square-kyprou",
    "name": "Square Kyprou",
    "nameEl": "ΠΛΑΤΕΙΑ ΚΥΠΡΟΥ",
    "lat": 35.3339667,
    "lng": 25.1348898
  },
  "hkl-katsoulogiorgi-l-knossou-6": {
    "slug": "hkl-katsoulogiorgi-l-knossou-6",
    "name": "Katsoulogiorgi L.knossou 6",
    "nameEl": "ΚΑΤΣΟΥΛΟΓΙΩΡΓΗ Λ.ΚΝΩΣΣΟΥ 6",
    "lat": 35.3313206,
    "lng": 25.1355287
  },
  "hkl-tria-peuka-l-knossou-40": {
    "slug": "hkl-tria-peuka-l-knossou-40",
    "name": "Tria Peuka L.knossou 40",
    "nameEl": "ΤΡΙΑ ΠΕΥΚΑ Λ.ΚΝΩΣΣΟΥ 40",
    "lat": 35.3299592,
    "lng": 25.1365314
  },
  "hkl-agios-konstantinos": {
    "slug": "hkl-agios-konstantinos",
    "name": "Agios Konstantinos",
    "nameEl": "ΑΓΙΟΣ ΚΩΝΣΤΑΝΤΙΝΟΣ",
    "lat": 35.3280012,
    "lng": 25.1378467
  },
  "hkl-pertselaki": {
    "slug": "hkl-pertselaki",
    "name": "Pertselaki",
    "nameEl": "ΠΕΡΤΣΕΛΑΚΗ",
    "lat": 35.3256111,
    "lng": 25.1390378
  },
  "hkl-mpentevi": {
    "slug": "hkl-mpentevi",
    "name": "Mpentevi",
    "nameEl": "ΜΠΕΝΤΕΒΗ",
    "lat": 35.3229126,
    "lng": 25.1413633
  },
  "hkl-varelatzi-l-knossou-158": {
    "slug": "hkl-varelatzi-l-knossou-158",
    "name": "Varelatzi L.knossou 158",
    "nameEl": "ΒΑΡΕΛΑΤΖΗ Λ.ΚΝΩΣΣΟΥ 158",
    "lat": 35.3195873,
    "lng": 25.1441635
  },
  "hkl-kefalogianni-l-knossou-178": {
    "slug": "hkl-kefalogianni-l-knossou-178",
    "name": "Kefalogianni L.knossou 178",
    "nameEl": "ΚΕΦΑΛΟΓΙΑΝΝΗ Λ.ΚΝΩΣΣΟΥ 178",
    "lat": 35.3181884,
    "lng": 25.1449355
  },
  "hkl-avenue-knossou-zervonikola": {
    "slug": "hkl-avenue-knossou-zervonikola",
    "name": "Avenue Knossou & Zervonikola",
    "nameEl": "ΛΕΩΦ. ΚΝΩΣΣΟΥ & ΖΕΡΒΟΝΙΚΟΛΑ",
    "lat": 35.3164661,
    "lng": 25.1461946
  },
  "hkl-l-knossou-226": {
    "slug": "hkl-l-knossou-226",
    "name": "L.knossou 226",
    "nameEl": "Λ.ΚΝΩΣΣΟΥ 226",
    "lat": 35.3132598,
    "lng": 25.1486958
  },
  "hkl-l-knossou-270": {
    "slug": "hkl-l-knossou-270",
    "name": "L.knossou 270",
    "nameEl": "Λ.ΚΝΩΣΣΟΥ 270",
    "lat": 35.3105135,
    "lng": 25.1498445
  },
  "hkl-euryalis": {
    "slug": "hkl-euryalis",
    "name": "Euryalis",
    "nameEl": "ΕΥΡΥΑΛΗΣ",
    "lat": 35.3097968,
    "lng": 25.1496554
  },
  "hkl-eforia-nea-alatsata": {
    "slug": "hkl-eforia-nea-alatsata",
    "name": "Eforia NEA Alatsata",
    "nameEl": "ΕΦΟΡΙΑ ΝΕΑ ΑΛΑΤΣΑΤΑ",
    "lat": 35.3083208,
    "lng": 25.15095
  },
  "hkl-venizelio-iospital": {
    "slug": "hkl-venizelio-iospital",
    "name": "Venizelio Iospital",
    "nameEl": "ΒΕΝΙΖΕΛΙΟ ΝΟΣΟΚΟΜΕΙΟ",
    "lat": 35.3059139,
    "lng": 25.1527773
  },
  "hkl-knossos": {
    "slug": "hkl-knossos",
    "name": "Knossos",
    "nameEl": "ΚΝΩΣΣΟΣ",
    "lat": 35.2990906,
    "lng": 25.1606213
  },
  "hkl-polyneikous": {
    "slug": "hkl-polyneikous",
    "name": "Polyneikous",
    "nameEl": "ΠΟΛΥΝΕΙΚΟΥΣ",
    "lat": 35.304181,
    "lng": 25.1518015
  },
  "hkl-ippokratous": {
    "slug": "hkl-ippokratous",
    "name": "Ippokratous",
    "nameEl": "ΙΠΠΟΚΡΑΤΟΥΣ",
    "lat": 35.3046588,
    "lng": 25.1501115
  },
  "hkl-central-station-avenue-pros-limani": {
    "slug": "hkl-central-station-avenue-pros-limani",
    "name": "Central Station Avenue Pros Limani",
    "nameEl": "ΚΕΝΤΡΙΚ. ΣΤΑΘΜΟΣ ΥΠΕΡ.ΛΕΩΦ. ΠΡΟΣ ΛΙΜΑΝΙ",
    "lat": 35.3391666,
    "lng": 25.140798
  },
  "hkl-diakladosi-fortetsas": {
    "slug": "hkl-diakladosi-fortetsas",
    "name": "Diakladosi Fortetsas",
    "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΦΟΡΤΕΤΣΑΣ",
    "lat": 35.3062912,
    "lng": 25.1524744
  },
  "hkl-knossou-235": {
    "slug": "hkl-knossou-235",
    "name": "Knossou 235",
    "nameEl": "ΚΝΩΣΣΟΥ 235",
    "lat": 35.31143409890769,
    "lng": 25.149709203999894
  },
  "hkl-knossou-207": {
    "slug": "hkl-knossou-207",
    "name": "Knossou 207",
    "nameEl": "ΚΝΩΣΣΟΥ 207",
    "lat": 35.314076,
    "lng": 25.1484869
  },
  "hkl-knossou-193-agios-ioannis": {
    "slug": "hkl-knossou-193-agios-ioannis",
    "name": "Knossou 193 - Agios Ioannis",
    "nameEl": "ΚΝΩΣΣΟΥ 193 - ΑΓΙΟΣ ΙΩΑΝΝΗΣ",
    "lat": 35.3150152,
    "lng": 25.147847
  },
  "hkl-avenue-knossou-169": {
    "slug": "hkl-avenue-knossou-169",
    "name": "Avenue Knossou 169",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΚΝΩΣΣΟΥ 169",
    "lat": 35.3165409,
    "lng": 25.1463535
  },
  "hkl-knossou-143": {
    "slug": "hkl-knossou-143",
    "name": "Knossou 143",
    "nameEl": "ΚΝΩΣΣΟΥ 143",
    "lat": 35.3183785,
    "lng": 25.1450211
  },
  "hkl-knossou-125": {
    "slug": "hkl-knossou-125",
    "name": "Knossou 125",
    "nameEl": "ΚΝΩΣΣΟΥ 125",
    "lat": 35.3197251,
    "lng": 25.1443128
  },
  "hkl-mpentevi-2": {
    "slug": "hkl-mpentevi-2",
    "name": "Mpentevi",
    "nameEl": "ΜΠΕΝΤΕΒΗ",
    "lat": 35.3231907,
    "lng": 25.1413536
  },
  "hkl-pertselaki-2": {
    "slug": "hkl-pertselaki-2",
    "name": "Pertselaki",
    "nameEl": "ΠΕΡΤΣΕΛΑΚΗ",
    "lat": 35.3247937,
    "lng": 25.1399309
  },
  "hkl-agiou-konstantinou-avenue-knossou-95": {
    "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
    "name": "Agiou Konstantinou Avenue Knossou 95",
    "nameEl": "ΑΓΙΟΥ ΚΩΝΣΤΑΝΤΙΝΟΥ ΛΕΩΦΟΡΟΣ ΚΝΩΣΣΟΥ 95",
    "lat": 35.32885581514677,
    "lng": 25.138016359418756
  },
  "hkl-krintsas": {
    "slug": "hkl-krintsas",
    "name": "Krintsas",
    "nameEl": "ΚΡΙΝΤΣΑΣ",
    "lat": 35.3320155,
    "lng": 25.1384268
  },
  "hkl-ergatiko-kentro-2": {
    "slug": "hkl-ergatiko-kentro-2",
    "name": "Ergatiko Kentro",
    "nameEl": "ΕΡΓΑΤΙΚΟ ΚΕΝΤΡΟ",
    "lat": 35.3337763,
    "lng": 25.1386838
  },
  "hkl-analipsi": {
    "slug": "hkl-analipsi",
    "name": "Analipsi",
    "nameEl": "ΑΝΑΛΗΨΗ",
    "lat": 35.3360621,
    "lng": 25.1389786
  },
  "hkl-venizeleio-iospital": {
    "slug": "hkl-venizeleio-iospital",
    "name": "Venizeleio Iospital",
    "nameEl": "ΒΕΝΙΖΕΛΕΙΟ ΝΟΣΟΚΟΜΕΙΟ",
    "lat": 35.3050521,
    "lng": 25.154112
  },
  "hkl-agios-rafail": {
    "slug": "hkl-agios-rafail",
    "name": "Agios Rafail",
    "nameEl": "ΑΓΙΟΣ ΡΑΦΑΗΛ",
    "lat": 35.2856506,
    "lng": 25.1414474
  },
  "hkl-oulof-palme": {
    "slug": "hkl-oulof-palme",
    "name": "Oulof Palme",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ",
    "lat": 35.2823739,
    "lng": 25.1401309
  },
  "hkl-chatzidaki": {
    "slug": "hkl-chatzidaki",
    "name": "Chatzidaki",
    "nameEl": "ΧΑΤΖΙΔΑΚΗ",
    "lat": 35.2789157,
    "lng": 25.1400268
  },
  "hkl-foka": {
    "slug": "hkl-foka",
    "name": "Foka",
    "nameEl": "ΦΩΚΑ",
    "lat": 35.2754445,
    "lng": 25.139398
  },
  "hkl-profiti-ilia": {
    "slug": "hkl-profiti-ilia",
    "name": "Profiti Ilia",
    "nameEl": "ΠΡΟΦΗΤΗ ΗΛΙΑ",
    "lat": 35.2694021,
    "lng": 25.1380657
  },
  "hkl-katraki": {
    "slug": "hkl-katraki",
    "name": "Katraki",
    "nameEl": "ΚΑΤΡΑΚΗ",
    "lat": 35.2675324,
    "lng": 25.1375372
  },
  "hkl-agiou-panteleimona": {
    "slug": "hkl-agiou-panteleimona",
    "name": "Agiou Panteleimona",
    "nameEl": "ΑΓΙΟΥ ΠΑΝΤΕΛΕΗΜΟΝΑ",
    "lat": 35.2583835,
    "lng": 25.1317047
  },
  "hkl-agiou-vlassi": {
    "slug": "hkl-agiou-vlassi",
    "name": "Agiou Vlassi",
    "nameEl": "ΑΓΙΟΥ ΒΛΑΣΣΗ",
    "lat": 35.2555272,
    "lng": 25.1332291
  },
  "hkl-agiou-dimitriou": {
    "slug": "hkl-agiou-dimitriou",
    "name": "Agiou Dimitriou",
    "nameEl": "ΑΓΙΟΥ ΔΗΜΗΤΡΙΟΥ",
    "lat": 35.2467389,
    "lng": 25.1210886
  },
  "hkl-agiou-sylla-1": {
    "slug": "hkl-agiou-sylla-1",
    "name": "Agiou Sylla 1",
    "nameEl": "ΑΓΙΟΥ ΣΥΛΛΑ 1",
    "lat": 35.243642,
    "lng": 25.1173491
  },
  "hkl-agiou-dimitriou-2": {
    "slug": "hkl-agiou-dimitriou-2",
    "name": "Agiou Dimitriou",
    "nameEl": "ΑΓΙΟΥ ΔΗΜΗΤΡΙΟΥ",
    "lat": 35.2467622,
    "lng": 25.1212892
  },
  "hkl-agiou-nikolaou": {
    "slug": "hkl-agiou-nikolaou",
    "name": "Agiou Nikolaou",
    "nameEl": "ΑΓΙΟΥ ΝΙΚΟΛΑΟΥ",
    "lat": 35.2542678,
    "lng": 25.1322689
  },
  "hkl-agiou-vlassi-2": {
    "slug": "hkl-agiou-vlassi-2",
    "name": "Agiou Vlassi",
    "nameEl": "ΑΓΙΟΥ ΒΛΑΣΣΗ",
    "lat": 35.2553642,
    "lng": 25.133129
  },
  "hkl-agios-panteleimonas": {
    "slug": "hkl-agios-panteleimonas",
    "name": "Agios Panteleimonas",
    "nameEl": "ΑΓΙΟΣ ΠΑΝΤΕΛΕΗΜΟΝΑΣ",
    "lat": 35.258553,
    "lng": 25.1317419
  },
  "hkl-zoodoxou-pigis": {
    "slug": "hkl-zoodoxou-pigis",
    "name": "Zoodoxou Pigis",
    "nameEl": "ΖΩΟΔΟΧΟΥ ΠΗΓΗΣ",
    "lat": 35.2720653,
    "lng": 25.1386625
  },
  "hkl-foka-2": {
    "slug": "hkl-foka-2",
    "name": "Foka",
    "nameEl": "ΦΩΚΑ",
    "lat": 35.2753774,
    "lng": 25.139477
  },
  "hkl-chatzidaki-2": {
    "slug": "hkl-chatzidaki-2",
    "name": "Chatzidaki",
    "nameEl": "ΧΑΤΖΗΔΑΚΗ",
    "lat": 35.2791563,
    "lng": 25.1402101
  },
  "hkl-oulof-palme-2": {
    "slug": "hkl-oulof-palme-2",
    "name": "Oulof Palme",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ",
    "lat": 35.2828416881507,
    "lng": 25.14023687850436
  },
  "hkl-aglaopis": {
    "slug": "hkl-aglaopis",
    "name": "Aglaopis",
    "nameEl": "ΑΓΛΑΟΠΗΣ",
    "lat": 35.287067,
    "lng": 25.1431137
  },
  "hkl-kyparissias": {
    "slug": "hkl-kyparissias",
    "name": "Kyparissias",
    "nameEl": "ΚΥΠΑΡΙΣΣΙΑΣ",
    "lat": 35.2890447,
    "lng": 25.1445376
  },
  "hkl-vasileies": {
    "slug": "hkl-vasileies",
    "name": "Vasileies",
    "nameEl": "ΒΑΣΙΛΕΙΕΣ",
    "lat": 35.2706965,
    "lng": 25.1348289
  },
  "hkl-nefelis": {
    "slug": "hkl-nefelis",
    "name": "Nefelis",
    "nameEl": "ΝΕΦΕΛΗΣ",
    "lat": 35.273338,
    "lng": 25.1367306
  },
  "hkl-viannou": {
    "slug": "hkl-viannou",
    "name": "Viannou",
    "nameEl": "ΒΙΑΝΝΟΥ",
    "lat": 35.2737562,
    "lng": 25.1383681
  },
  "hkl-evans": {
    "slug": "hkl-evans",
    "name": "Evans",
    "nameEl": "ΕΒΑΝΣ",
    "lat": 35.3357457,
    "lng": 25.1342345
  },
  "hkl-ariadni": {
    "slug": "hkl-ariadni",
    "name": "Ariadni",
    "nameEl": "ΑΡΙΑΔΝΗ",
    "lat": 35.3010647,
    "lng": 25.1592927
  },
  "hkl-ariadni-2": {
    "slug": "hkl-ariadni-2",
    "name": "Ariadni",
    "nameEl": "ΑΡΙΑΔΝΗ",
    "lat": 35.3012388,
    "lng": 25.159156
  },
  "hkl-vlixia": {
    "slug": "hkl-vlixia",
    "name": "Vlixia",
    "nameEl": "ΒΛΥΧΙΑ (Ε)",
    "lat": 35.2919038,
    "lng": 25.1646742
  },
  "hkl-agia-eirini": {
    "slug": "hkl-agia-eirini",
    "name": "Agia Eirini",
    "nameEl": "ΑΓΙΑ ΕΙΡΗΝΗ (Μ)",
    "lat": 35.2848579,
    "lng": 25.1651481
  },
  "hkl-spilia": {
    "slug": "hkl-spilia",
    "name": "Spilia",
    "nameEl": "ΣΠΗΛΙΑ (Ε)",
    "lat": 35.2856528,
    "lng": 25.1686394
  },
  "hkl-spilia-2": {
    "slug": "hkl-spilia-2",
    "name": "Spilia",
    "nameEl": "ΣΠΗΛΙΑ (Μ)",
    "lat": 35.2852842,
    "lng": 25.168845
  },
  "hkl-diakladosi-skalaniou": {
    "slug": "hkl-diakladosi-skalaniou",
    "name": "Diakladosi Skalaniou",
    "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΣΚΑΛΑΝΙΟΥ (Μ)",
    "lat": 35.2809416,
    "lng": 25.1743412
  },
  "hkl-skalani-1": {
    "slug": "hkl-skalani-1",
    "name": "Skalani 1",
    "nameEl": "ΣΚΑΛΑΝΙ 1",
    "lat": 35.2835349,
    "lng": 25.1752255
  },
  "hkl-skalani-2": {
    "slug": "hkl-skalani-2",
    "name": "Skalani 2",
    "nameEl": "ΣΚΑΛΑΝΙ 2",
    "lat": 35.282928,
    "lng": 25.1770659
  },
  "hkl-skalani-2-2": {
    "slug": "hkl-skalani-2-2",
    "name": "Skalani 2",
    "nameEl": "ΣΚΑΛΑΝΙ 2",
    "lat": 35.282998,
    "lng": 25.17653
  },
  "hkl-skalani-3": {
    "slug": "hkl-skalani-3",
    "name": "Skalani 3",
    "nameEl": "ΣΚΑΛΑΝΙ 3",
    "lat": 35.2826165,
    "lng": 25.1807352
  },
  "hkl-skalani-3-2": {
    "slug": "hkl-skalani-3-2",
    "name": "Skalani 3",
    "nameEl": "ΣΚΑΛΑΝΙ 3",
    "lat": 35.2825411,
    "lng": 25.1808625
  },
  "hkl-skalani-4": {
    "slug": "hkl-skalani-4",
    "name": "Skalani 4",
    "nameEl": "ΣΚΑΛΑΝΙ 4",
    "lat": 35.2821998,
    "lng": 25.1847166
  },
  "hkl-skalani-strofi-kato": {
    "slug": "hkl-skalani-strofi-kato",
    "name": "Skalani Strofi Kato",
    "nameEl": "ΣΚΑΛΑΝΙ 4 ΣΤΡΟΦΗ ΚΑΤΩ",
    "lat": 35.282063501454985,
    "lng": 25.18483595830118
  },
  "hkl-manou-katraki-106": {
    "slug": "hkl-manou-katraki-106",
    "name": "Manou Katraki 106",
    "nameEl": "ΜΑΝΟΥ ΚΑΤΡΑΚΗ 106",
    "lat": 35.3022912,
    "lng": 25.1096642
  },
  "hkl-papanastasiou-34": {
    "slug": "hkl-papanastasiou-34",
    "name": "Papanastasiou 34",
    "nameEl": "ΠΑΠΑΝΑΣΤΑΣΙΟΥ 34",
    "lat": 35.323592,
    "lng": 25.1392878
  },
  "hkl-ts-tierissos": {
    "slug": "hkl-ts-tierissos",
    "name": "TS Tierissos",
    "nameEl": "ΤΣ ΘΕΡΙΣΣΟΣ",
    "lat": 35.329362,
    "lng": 25.1194452
  },
  "hkl-andrea-papandreou-rolen": {
    "slug": "hkl-andrea-papandreou-rolen",
    "name": "Andrea Papandreou & Rolen",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ & ΡΟΛΕΝ",
    "lat": 35.3311627,
    "lng": 25.133658
  },
  "hkl-gefyraki-andrea-papandreou-46": {
    "slug": "hkl-gefyraki-andrea-papandreou-46",
    "name": "Gefyraki Andrea Papandreou 46",
    "nameEl": "ΓΕΦΥΡΑΚΙ ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 46",
    "lat": 35.3297804,
    "lng": 25.1317371
  },
  "hkl-romantiki-gonia": {
    "slug": "hkl-romantiki-gonia",
    "name": "Romantiki Gonia",
    "nameEl": "ΡΟΜΑΝΤΙΚΗ ΓΩΝΙΑ",
    "lat": 35.3287441,
    "lng": 25.1300607
  },
  "hkl-square-ni-as": {
    "slug": "hkl-square-ni-as",
    "name": "Square Ni&as",
    "nameEl": "ΠΛΑΤΕΙΑ ΝΙΚΑΙΑΣ",
    "lat": 35.3276089,
    "lng": 25.1279212
  },
  "hkl-andrea-papandreou-126": {
    "slug": "hkl-andrea-papandreou-126",
    "name": "Andrea Papandreou 126",
    "nameEl": "ΑΝΔΡΕΑ ΠΑΠΑΝΔΡΕΟΥ 126",
    "lat": 35.3270773,
    "lng": 25.1266567
  },
  "hkl-atlantidos-45": {
    "slug": "hkl-atlantidos-45",
    "name": "Atlantidos 45",
    "nameEl": "ΑΤΛΑΝΤΙΔΟΣ 45",
    "lat": 35.325872,
    "lng": 25.1250045
  },
  "hkl-atlantidos-33": {
    "slug": "hkl-atlantidos-33",
    "name": "Atlantidos 33",
    "nameEl": "ΑΤΛΑΝΤΙΔΟΣ 33",
    "lat": 35.325501,
    "lng": 25.1263931
  },
  "hkl-panagitsa": {
    "slug": "hkl-panagitsa",
    "name": "Panagitsa",
    "nameEl": "ΠΑΝΑΓΙΤΣΑ",
    "lat": 35.3246785,
    "lng": 25.1293519
  },
  "hkl-ieroloxiton-76-daskalaki": {
    "slug": "hkl-ieroloxiton-76-daskalaki",
    "name": "Ieroloxiton 76 Daskalaki",
    "nameEl": "ΙΕΡΟΛΟΧΙΤΩΝ 76 ΔΑΣΚΑΛΑΚΗ",
    "lat": 35.323155,
    "lng": 25.1290771
  },
  "hkl-errikou-ntynan-dexamenes": {
    "slug": "hkl-errikou-ntynan-dexamenes",
    "name": "Errikou Ntynan Dexamenes",
    "nameEl": "ΕΡΡΙΚΟΥ ΝΤΥΝΑΝ ΔΕΞΑΜΕΝΕΣ",
    "lat": 35.3200689,
    "lng": 25.1298575
  },
  "hkl-ionias-209": {
    "slug": "hkl-ionias-209",
    "name": "Ionias 209",
    "nameEl": "ΙΩΝΙΑΣ 209",
    "lat": 35.3213891,
    "lng": 25.1332347
  },
  "hkl-ionias-111-square-atsaleniou": {
    "slug": "hkl-ionias-111-square-atsaleniou",
    "name": "Ionias 111 Square Atsaleniou",
    "nameEl": "ΙΩΝΙΑΣ 111 ΠΛΑΤΕΙΑ ΠΛΑΤΕΙΑ ΑΤΣΑΛΕΝΙΟΥ",
    "lat": 35.325643,
    "lng": 25.1336042
  },
  "hkl-ionias-85-agia-sofia": {
    "slug": "hkl-ionias-85-agia-sofia",
    "name": "Ionias 85 Agia Sofia",
    "nameEl": "ΙΩΝΙΑΣ 85 ΑΓΙΑ ΣΟΦΙΑ",
    "lat": 35.3269068,
    "lng": 25.1338317
  },
  "hkl-ionias-35": {
    "slug": "hkl-ionias-35",
    "name": "Ionias 35",
    "nameEl": "ΙΩΝΙΑΣ 35",
    "lat": 35.328378246078294,
    "lng": 25.13434501042198
  },
  "hkl-georgiou-papandreou-47": {
    "slug": "hkl-georgiou-papandreou-47",
    "name": "Georgiou Papandreou 47",
    "nameEl": "ΓΕΩΡΓΙΟΥ ΠΑΠΑΝΔΡΕΟΥ 47",
    "lat": 35.3305657,
    "lng": 25.1349638
  },
  "hkl-chrysostomou-29": {
    "slug": "hkl-chrysostomou-29",
    "name": "Chrysostomou 29",
    "nameEl": "ΧΡΥΣΟΣΤΟΜΟΥ 29",
    "lat": 35.3319973,
    "lng": 25.1365112
  },
  "hkl-square-kyprou-2": {
    "slug": "hkl-square-kyprou-2",
    "name": "Square Kyprou",
    "nameEl": "ΠΛΑΤΕΙΑ ΚΥΠΡΟΥ",
    "lat": 35.3340414,
    "lng": 25.1352134
  },
  "hkl-evans-2": {
    "slug": "hkl-evans-2",
    "name": "Evans",
    "nameEl": "ΕΒΑΝΣ",
    "lat": 35.3354922,
    "lng": 25.1344201
  },
  "hkl-dialinomixali": {
    "slug": "hkl-dialinomixali",
    "name": "Dialinomixali",
    "nameEl": "ΔΙΑΛΙΝΟΜΙΧΑΛΗ",
    "lat": 35.3214688,
    "lng": 25.1290351
  },
  "hkl-ionias-165-kavali": {
    "slug": "hkl-ionias-165-kavali",
    "name": "Ionias 165 Kavali",
    "nameEl": "ΙΩΝΙΑΣ 165 ΚΑΒΑΛΗ",
    "lat": 35.3231229,
    "lng": 25.1333482
  },
  "hkl-ts-amnissos-terminal-station": {
    "slug": "hkl-ts-amnissos-terminal-station",
    "name": "TS Amnissos Terminal Station",
    "nameEl": "ΤΣ _ ΤΕΡΜΑΤΙΚΟΣ ΣΤΑΘΜΟΣ ΑΜΝΙΣΣΟΣ",
    "lat": 35.331439872962214,
    "lng": 25.21063595109387
  },
  "hkl-ts-fortetsas": {
    "slug": "hkl-ts-fortetsas",
    "name": "TS Fortetsas",
    "nameEl": "ΤΣ ΦΟΡΤΕΤΣΑΣ",
    "lat": 35.3021358,
    "lng": 25.1488956
  },
  "hkl-diakladosi-sakalaniou": {
    "slug": "hkl-diakladosi-sakalaniou",
    "name": "Diakladosi Sakalaniou",
    "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΣΚΑΛΑΝΙΟΥ (Ε)",
    "lat": 35.2809273293863,
    "lng": 25.1742647889671
  },
  "hkl-oulof-palme-28": {
    "slug": "hkl-oulof-palme-28",
    "name": "Oulof Palme 28",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 28",
    "lat": 35.3169049,
    "lng": 25.1332075
  },
  "hkl-chrysovalantou": {
    "slug": "hkl-chrysovalantou",
    "name": "Chrysovalantou",
    "nameEl": "ΧΡΥΣΟΒΑΛΑΝΤΟΥ",
    "lat": 35.3138907,
    "lng": 25.1340738
  },
  "hkl-oulof-palme-102": {
    "slug": "hkl-oulof-palme-102",
    "name": "Oulof Palme 102",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 102",
    "lat": 35.3113672,
    "lng": 25.1354046
  },
  "hkl-oulof-palme-134": {
    "slug": "hkl-oulof-palme-134",
    "name": "Oulof Palme 134",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 134",
    "lat": 35.3083852,
    "lng": 25.1367911
  },
  "hkl-oulof-palme-alkyonos-terma": {
    "slug": "hkl-oulof-palme-alkyonos-terma",
    "name": "Oulof Palme & Alkyonos (terma)",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ ΚΑΙ ΑΛΚΥΩΝΟΣ (ΤΕΡΜΑ)",
    "lat": 35.30415825764521,
    "lng": 25.13807720827611
  },
  "hkl-alkmaionos-17": {
    "slug": "hkl-alkmaionos-17",
    "name": "Alkmaionos 17",
    "nameEl": "ΑΛΚΜΑΙΟΝΟΣ 17",
    "lat": 35.3044538,
    "lng": 25.1402336
  },
  "hkl-alkmaionos-antieon": {
    "slug": "hkl-alkmaionos-antieon",
    "name": "Alkmaionos & Antieon",
    "nameEl": "ΑΛΚΜΑΙΟΝΟΣ ΚΑΙ ΑΝΘΕΩΝ",
    "lat": 35.305243,
    "lng": 25.1417848
  },
  "hkl-papanastasiou-123": {
    "slug": "hkl-papanastasiou-123",
    "name": "Papanastasiou 123",
    "nameEl": "ΠΑΠΑΝΑΣΤΑΣΙΟΥ 123",
    "lat": 35.3170597,
    "lng": 25.1404601
  },
  "hkl-papanastasiou-91": {
    "slug": "hkl-papanastasiou-91",
    "name": "Papanastasiou 91",
    "nameEl": "ΠΑΠΑΝΑΣΤΑΣΙΟΥ 91",
    "lat": 35.3186303,
    "lng": 25.1404579
  },
  "hkl-metaxaki-1": {
    "slug": "hkl-metaxaki-1",
    "name": "Metaxaki 1",
    "nameEl": "ΜΕΤΑΞΑΚΗ 1",
    "lat": 35.3309106,
    "lng": 25.1133119
  },
  "hkl-eumatiiou": {
    "slug": "hkl-eumatiiou",
    "name": "Eumatiiou",
    "nameEl": "ΕΥΜΑΘΙΟΥ",
    "lat": 35.308356,
    "lng": 25.1372911
  },
  "hkl-geronymaki-titou-georgiadou": {
    "slug": "hkl-geronymaki-titou-georgiadou",
    "name": "Geronymaki & Titou Georgiadou",
    "nameEl": "ΓΕΡΟΝΥΜΑΚΗ & ΤΙΤΟΥ ΓΕΩΡΓΙΑΔΟΥ",
    "lat": 35.3342721,
    "lng": 25.1401739
  },
  "hkl-monis-gouvernetou": {
    "slug": "hkl-monis-gouvernetou",
    "name": "Monis Gouvernetou",
    "nameEl": "ΜΟΝΗΣ ΓΟΥΒΕΡΝΕΤΟΥ",
    "lat": 35.3328074,
    "lng": 25.1432198
  },
  "hkl-emmanouil-mpantouva": {
    "slug": "hkl-emmanouil-mpantouva",
    "name": "Emmanouil Mpantouva",
    "nameEl": "ΕΜΜΑΝΟΥΗΛ ΜΠΑΝΤΟΥΒΑ",
    "lat": 35.3323137,
    "lng": 25.1444526
  },
  "hkl-kaxou": {
    "slug": "hkl-kaxou",
    "name": "Kaxou",
    "nameEl": "ΚΑΧΟΥ",
    "lat": 35.3249345,
    "lng": 25.1476412
  },
  "hkl-chatzidaki-3": {
    "slug": "hkl-chatzidaki-3",
    "name": "Chatzidaki",
    "nameEl": "ΧΑΤΖΗΔΑΚΗ",
    "lat": 35.3266693,
    "lng": 25.1475594
  },
  "hkl-square-agias-aikaterinis": {
    "slug": "hkl-square-agias-aikaterinis",
    "name": "Square Agias Aikaterinis",
    "nameEl": "ΠΛΑΤΕΙΑ ΑΓΙΑΣ ΑΙΚΑΤΕΡΙΝΗΣ",
    "lat": 35.328788,
    "lng": 25.1474541
  },
  "hkl-markogiannaki": {
    "slug": "hkl-markogiannaki",
    "name": "Markogiannaki",
    "nameEl": "ΜΑΡΚΟΓΙΑΝΝΑΚΗ",
    "lat": 35.32987810006809,
    "lng": 25.148784091996014
  },
  "hkl-proklou": {
    "slug": "hkl-proklou",
    "name": "Proklou",
    "nameEl": "ΠΡΟΚΛΟΥ",
    "lat": 35.3312858,
    "lng": 25.1484833
  },
  "hkl-lagkada": {
    "slug": "hkl-lagkada",
    "name": "Lagkada",
    "nameEl": "ΛΑΓΚΑΔΑ",
    "lat": 35.3311153,
    "lng": 25.146343
  },
  "hkl-monis-gouvernetou-2": {
    "slug": "hkl-monis-gouvernetou-2",
    "name": "Monis Gouvernetou",
    "nameEl": "ΜΟΝΗΣ ΓΟΥΒΕΡΝΕΤΟΥ",
    "lat": 35.33295,
    "lng": 25.1431005
  },
  "hkl-titou-georgiadou": {
    "slug": "hkl-titou-georgiadou",
    "name": "Titou Georgiadou",
    "nameEl": "ΤΙΤΟΥ ΓΕΩΡΓΙΑΔΟΥ",
    "lat": 35.3344654,
    "lng": 25.1400486
  },
  "hkl-pitsoulaki": {
    "slug": "hkl-pitsoulaki",
    "name": "Pitsoulaki",
    "nameEl": "ΠΙΤΣΟΥΛΑΚΗ",
    "lat": 35.3248311,
    "lng": 25.1435887
  },
  "hkl-emmanouil-mpantouva-2": {
    "slug": "hkl-emmanouil-mpantouva-2",
    "name": "Emmanouil Mpantouva",
    "nameEl": "ΕΜΜΑΝΟΥΗΛ ΜΠΑΝΤΟΥΒΑ",
    "lat": 35.3323996,
    "lng": 25.1444794
  },
  "hkl-christomichali-chylouri-1": {
    "slug": "hkl-christomichali-chylouri-1",
    "name": "Christomichali Chylouri 1",
    "nameEl": "ΧΡΙΣΤΟΜΙΧΑΛΗ ΞΥΛΟΥΡΗ 1",
    "lat": 35.3264115,
    "lng": 25.1135185
  },
  "hkl-avenue-dimokratias-79": {
    "slug": "hkl-avenue-dimokratias-79",
    "name": "Avenue Dimokratias 79",
    "nameEl": "ΛΕΩΦΟΡΟΣ ΔΗΜΟΚΡΑΤΙΑΣ 79",
    "lat": 35.3304143,
    "lng": 25.138222
  },
  "hkl-solonos-32": {
    "slug": "hkl-solonos-32",
    "name": "Solonos 32",
    "nameEl": "ΣΟΛΩΝΟΣ 32",
    "lat": 35.3041109,
    "lng": 25.1516015
  },
  "hkl-solonos-57": {
    "slug": "hkl-solonos-57",
    "name": "Solonos 57",
    "nameEl": "ΣΟΛΩΝΟΣ 57",
    "lat": 35.3045726,
    "lng": 25.1502279
  },
  "hkl-averof": {
    "slug": "hkl-averof",
    "name": "Averof",
    "nameEl": "ΑΒΕΡΩΦ",
    "lat": 35.3372015,
    "lng": 25.1361587
  },
  "hkl-diakladosi-vouton": {
    "slug": "hkl-diakladosi-vouton",
    "name": "Diakladosi Vouton",
    "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΒΟΥΤΩΝ",
    "lat": 35.3034512,
    "lng": 25.0782494
  },
  "hkl-oikismos-agias-paraskeuis": {
    "slug": "hkl-oikismos-agias-paraskeuis",
    "name": "Oikismos Agias Paraskeuis",
    "nameEl": "ΟΙΚΙΣΜΟΣ ΑΓΙΑΣ ΠΑΡΑΣΚΕΥΗΣ",
    "lat": 35.3113532,
    "lng": 25.0878998
  },
  "hkl-agiou-nektariou": {
    "slug": "hkl-agiou-nektariou",
    "name": "Agiou Nektariou",
    "nameEl": "ΑΓΙΟΥ ΝΕΚΤΑΡΙΟΥ",
    "lat": 35.3120935,
    "lng": 25.0912522
  },
  "hkl-asklipeiou": {
    "slug": "hkl-asklipeiou",
    "name": "Asklipeiou",
    "nameEl": "ΑΣΚΛΗΠΕΙΟΥ",
    "lat": 35.3098994,
    "lng": 25.0907926
  },
  "hkl-krimpa": {
    "slug": "hkl-krimpa",
    "name": "Krimpa",
    "nameEl": "ΚΡΙΜΠΑ",
    "lat": 35.3080603,
    "lng": 25.0895951
  },
  "hkl-pagni-hospital": {
    "slug": "hkl-pagni-hospital",
    "name": "Pagni - Hospital",
    "nameEl": "ΠΑΓΝΗ - ΝΟΣΟΚΟΜΕΙΟ",
    "lat": 35.303562008582574,
    "lng": 25.08482290062906
  },
  "hkl-diastaurosi-staurakia": {
    "slug": "hkl-diastaurosi-staurakia",
    "name": "Diastaurosi Staurakia",
    "nameEl": "ΔΙΑΣΤΑΥΡΩΣΗ ΣΤΑΥΡΑΚΙΑ",
    "lat": 35.3020637,
    "lng": 25.0826801
  },
  "hkl-parasyri": {
    "slug": "hkl-parasyri",
    "name": "Parasyri",
    "nameEl": "ΠΑΡΑΣΥΡΗ",
    "lat": 35.32041191889172,
    "lng": 25.09582348009213
  },
  "hkl-avenue-panepistimiou-kefalogianni-e": {
    "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
    "name": "Avenue Panepistimiou & Kefalogianni (E)",
    "nameEl": "ΛΕΟΦΩΡΟΣ ΠΑΝΕΠΙΣΤΙΜΙΟΥ & ΚΕΦΑΛΟΓΙΑΝΝΗ (Ε)",
    "lat": 35.3200169,
    "lng": 25.0985078
  },
  "hkl-seap": {
    "slug": "hkl-seap",
    "name": "Seap",
    "nameEl": "ΣΕΑΠ",
    "lat": 35.33747670895456,
    "lng": 25.166984496472704
  },
  "hkl-megalou-alexandrou-105": {
    "slug": "hkl-megalou-alexandrou-105",
    "name": "Megalou Alexandrou 105",
    "nameEl": "ΜΕΓΑΛΟΥ ΑΛΕΞΑΝΔΡΟΥ 105",
    "lat": 35.3221904,
    "lng": 25.1328804
  },
  "hkl-seap-2": {
    "slug": "hkl-seap-2",
    "name": "Seap",
    "nameEl": "ΣΕΑΠ",
    "lat": 35.3374032,
    "lng": 25.1672712
  },
  "hkl-ptolemaion-karditsi": {
    "slug": "hkl-ptolemaion-karditsi",
    "name": "Ptolemaion & Karditsi",
    "nameEl": "ΠΤΟΛΕΜΑΙΩΝ & ΚΑΡΔΙΤΣΗ",
    "lat": 35.30842748181416,
    "lng": 25.15414555969474
  },
  "hkl-ts-pagkritio-stadio": {
    "slug": "hkl-ts-pagkritio-stadio",
    "name": "Ts_pagkritio Stadio",
    "nameEl": "ΤΣ ΠΑΓΚΡΗΤΙΟ ΣΤΑΔΙΟ",
    "lat": 35.33612570321385,
    "lng": 25.107702893215166
  },
  "hkl-yperastiko-ktel": {
    "slug": "hkl-yperastiko-ktel",
    "name": "Yperastiko Ktel",
    "nameEl": "ΥΠΕΡΑΣΤΙΚΟ ΚΤΕΛ",
    "lat": 35.3412878,
    "lng": 25.1393395
  },
  "hkl-square-kornarou-m": {
    "slug": "hkl-square-kornarou-m",
    "name": "Square Kornarou M",
    "nameEl": "ΠΛΑΤΕΙΑ ΚΟΡΝΑΡΟΥ Μ",
    "lat": 35.3362934,
    "lng": 25.1328722
  },
  "hkl-tmima-epistimis-ypologiston": {
    "slug": "hkl-tmima-epistimis-ypologiston",
    "name": "Tmima Epistimis Ypologiston",
    "nameEl": "ΤΜΗΜΑ ΕΠΙΣΤΗΜΗΣ ΥΠΟΛΟΓΙΣΤΩΝ",
    "lat": 35.30863726035576,
    "lng": 25.08466238852381
  },
  "hkl-st-giamalaki-kazantzaki": {
    "slug": "hkl-st-giamalaki-kazantzaki",
    "name": "ST. Giamalaki & Kazantzaki",
    "nameEl": "ΣΤ. ΓΙΑΜΑΛΑΚΗ ΚΑΙ ΚΑΖΑΝΤΖΑΚΗ",
    "lat": 35.339288,
    "lng": 25.1296956
  },
  "hkl-vritomartidos": {
    "slug": "hkl-vritomartidos",
    "name": "Vritomartidos",
    "nameEl": "ΒΡΙΤΟΜΑΡΤΙΔΟΣ",
    "lat": 35.3233851,
    "lng": 25.1460996
  },
  "hkl-neofytou-oikonomou": {
    "slug": "hkl-neofytou-oikonomou",
    "name": "Neofytou Oikonomou",
    "nameEl": "ΝΕΟΦΥΤΟΥ ΟΙΚΟΝΟΜΟΥ",
    "lat": 35.322523,
    "lng": 25.1506293
  },
  "hkl-vritomartidos-2": {
    "slug": "hkl-vritomartidos-2",
    "name": "Vritomartidos",
    "nameEl": "ΒΡΙΤΟΜΑΡΤΙΔΟΣ",
    "lat": 35.3235006,
    "lng": 25.1462941
  },
  "hkl-neofytou-oikonomou-2": {
    "slug": "hkl-neofytou-oikonomou-2",
    "name": "Neofytou Oikonomou",
    "nameEl": "ΝΕΟΦΥΤΟΥ ΟΙΚΟΝΟΜΟΥ",
    "lat": 35.3224606,
    "lng": 25.15086
  },
  "hkl-pitsoulaki-sxoliko-peiramatiko": {
    "slug": "hkl-pitsoulaki-sxoliko-peiramatiko",
    "name": "Pitsoulaki Sxoliko Peiramatiko",
    "nameEl": "ΠΙΤΣΟΥΛΑΚΗ ΣΧΟΛΙΚΟ ΠΕΙΡΑΜΑΤΙΚΟ",
    "lat": 35.323138423149125,
    "lng": 25.142879291401652
  },
  "hkl-ika": {
    "slug": "hkl-ika",
    "name": "IKA",
    "nameEl": "ΙΚΑ",
    "lat": 35.3178024,
    "lng": 25.0984269
  },
  "hkl-kakridi-11": {
    "slug": "hkl-kakridi-11",
    "name": "Kakridi 11",
    "nameEl": "ΚΑΚΡΙΔΗ 11",
    "lat": 35.3144113,
    "lng": 25.1459646
  },
  "hkl-fotaki": {
    "slug": "hkl-fotaki",
    "name": "Fotaki",
    "nameEl": "ΦΩΤΑΚΗ",
    "lat": 35.3143982,
    "lng": 25.1442925
  },
  "hkl-kakridi-11-2": {
    "slug": "hkl-kakridi-11-2",
    "name": "Kakridi 11",
    "nameEl": "ΚΑKΡΙΔΗ 11",
    "lat": 35.3143615,
    "lng": 25.1461215
  },
  "hkl-ethnomartyron-46": {
    "slug": "hkl-ethnomartyron-46",
    "name": "Ethnomartyron 46",
    "nameEl": "ΕΘΝΟΜΑΡΤΥΡΩΝ 35",
    "lat": 35.3161965,
    "lng": 25.1379361
  },
  "hkl-ethnomartyron-47": {
    "slug": "hkl-ethnomartyron-47",
    "name": "Ethnomartyron 47",
    "nameEl": "ΕΘΝΟΜΑΡΤΥΡΩΝ 11",
    "lat": 35.3174123,
    "lng": 25.1360424
  },
  "hkl-mantineias": {
    "slug": "hkl-mantineias",
    "name": "Mantineias",
    "nameEl": "ΜΑΝΤΙΝΕΙΑΣ",
    "lat": 35.3179666,
    "lng": 25.13379
  },
  "hkl-eok-11": {
    "slug": "hkl-eok-11",
    "name": "EOK 11",
    "nameEl": "ΕΟΚ 11",
    "lat": 35.330361598146645,
    "lng": 25.12472602904697
  },
  "hkl-vasileiou-smpokou-60": {
    "slug": "hkl-vasileiou-smpokou-60",
    "name": "Vasileiou Smpokou 60",
    "nameEl": "ΒΑΣΙΛΕΙΟΥ ΣΜΠΩΚΟΥ 60",
    "lat": 35.3268869,
    "lng": 25.1317123
  },
  "hkl-vasileiou-smpokou": {
    "slug": "hkl-vasileiou-smpokou",
    "name": "Vasileiou Smpokou",
    "nameEl": "ΒΑΣΙΛΕΙΟΥ ΣΜΠΩΚΟΥ",
    "lat": 35.3271719,
    "lng": 25.1289631
  },
  "hkl-eok-33": {
    "slug": "hkl-eok-33",
    "name": "EOK 33",
    "nameEl": "ΕΟΚ 33",
    "lat": 35.3278656,
    "lng": 25.1272713
  },
  "hkl-eok-25": {
    "slug": "hkl-eok-25",
    "name": "EOK 25",
    "nameEl": "ΕΟΚ 25",
    "lat": 35.329324782678526,
    "lng": 25.125919090405993
  },
  "hkl-minoos": {
    "slug": "hkl-minoos",
    "name": "Minoos",
    "nameEl": "ΜΙΝΩΟΣ",
    "lat": 35.3320255,
    "lng": 25.1227566
  },
  "hkl-minoos-79": {
    "slug": "hkl-minoos-79",
    "name": "Minoos 79",
    "nameEl": "ΜΙΝΩΟΣ 79",
    "lat": 35.33397820149202,
    "lng": 25.120833237386147
  },
  "hkl-eok-10": {
    "slug": "hkl-eok-10",
    "name": "EOK 10",
    "nameEl": "ΕΟΚ 10",
    "lat": 35.330381950568324,
    "lng": 25.12453886169723
  },
  "hkl-minoos-90": {
    "slug": "hkl-minoos-90",
    "name": "Minoos 90",
    "nameEl": "ΜΙΝΩΟΣ 90",
    "lat": 35.33396767974615,
    "lng": 25.120687433530517
  },
  "hkl-lasaias": {
    "slug": "hkl-lasaias",
    "name": "Lasaias",
    "nameEl": "ΛΑΣΑΙΑΣ",
    "lat": 35.3320667,
    "lng": 25.1225606
  },
  "hkl-eok-28": {
    "slug": "hkl-eok-28",
    "name": "EOK 28",
    "nameEl": "ΕΟΚ 28",
    "lat": 35.329277452226165,
    "lng": 25.125730473854535
  },
  "hkl-eok-44": {
    "slug": "hkl-eok-44",
    "name": "EOK 44",
    "nameEl": "ΕΟΚ 44",
    "lat": 35.328003729402695,
    "lng": 25.12697013310051
  },
  "hkl-mantineias-2": {
    "slug": "hkl-mantineias-2",
    "name": "Mantineias",
    "nameEl": "ΜΑΝΤΙΝΕΙΑΣ",
    "lat": 35.3178084,
    "lng": 25.1335477
  },
  "hkl-ethnomartyron": {
    "slug": "hkl-ethnomartyron",
    "name": "Ethnomartyron",
    "nameEl": "ΕΘΝΟΜΑΡΤΥΡΩΝ",
    "lat": 35.3174735,
    "lng": 25.1357753
  },
  "hkl-lindou": {
    "slug": "hkl-lindou",
    "name": "Lindou",
    "nameEl": "ΛΙΝΔΟΥ",
    "lat": 35.3159935,
    "lng": 25.1380498
  },
  "hkl-antieon": {
    "slug": "hkl-antieon",
    "name": "Antieon",
    "nameEl": "ΑΝΘΕΩΝ",
    "lat": 35.3152411,
    "lng": 25.1398214
  },
  "hkl-agios-eugenios": {
    "slug": "hkl-agios-eugenios",
    "name": "Agios Eugenios",
    "nameEl": "ΑΓΙΟΣ ΕΥΓΕΝΙΟΣ",
    "lat": 35.3129387,
    "lng": 25.1424894
  },
  "hkl-papanastasiou-217": {
    "slug": "hkl-papanastasiou-217",
    "name": "Papanastasiou 217",
    "nameEl": "ΠΑΠΑΝΑΣΤΑΣΙΟΥ 217",
    "lat": 35.3082621,
    "lng": 25.1459196
  },
  "hkl-foinikia-4": {
    "slug": "hkl-foinikia-4",
    "name": "Foinikia 4",
    "nameEl": "ΦΟΙΝΙΚΙΑ 4 - Επαρ.Οδ. Ηρακλείου - Πραιτωρίας",
    "lat": 35.258406625181685,
    "lng": 25.10757742338796
  },
  "hkl-foinikia-5": {
    "slug": "hkl-foinikia-5",
    "name": "Foinikia 5",
    "nameEl": "ΦΟΙΝΙΚΙΑ 5 - Επαρ.Οδ. Ηρακλείου - Ζερβού Μετόχι",
    "lat": 35.263893571757905,
    "lng": 25.107491782237584
  },
  "hkl-foinikia-6": {
    "slug": "hkl-foinikia-6",
    "name": "Foinikia 6",
    "nameEl": "ΦΟΙΝΙΚΙΑ 6 - Επαρ.Οδ. Ηρακλείου - ΜΑΛΑΔΕΣ",
    "lat": 35.27048575056667,
    "lng": 25.111912512204636
  },
  "hkl-foinikia-7": {
    "slug": "hkl-foinikia-7",
    "name": "Foinikia 7",
    "nameEl": "ΦΟΙΝΙΚΙΑ 7 - Επαρ.Οδ. Ηρακλείου - ΜΑΛΑΔΕΣ 2",
    "lat": 35.27907990185466,
    "lng": 25.113176894378753
  },
  "hkl-foinikia-8": {
    "slug": "hkl-foinikia-8",
    "name": "Foinikia 8",
    "nameEl": "ΦΟΙΝΙΚΙΑ 8 - ΕΙΡΗΝΗΣ ΚΑΙ ΦΙΛΙΑΣ - ΒΛΑΧΟΓΓΙΑΝΗ",
    "lat": 35.2947604230401,
    "lng": 25.116502833557224
  },
  "hkl-foinikia-9": {
    "slug": "hkl-foinikia-9",
    "name": "Foinikia 9",
    "nameEl": "ΦΟΙΝΙΚΙΑ 9 - ΕΙΡΗΝΗΣ ΚΑΙ ΦΙΛΙΑΣ",
    "lat": 35.301616541376795,
    "lng": 25.116206766451032
  },
  "hkl-foinikia-11": {
    "slug": "hkl-foinikia-11",
    "name": "Foinikia 11",
    "nameEl": "ΦΟΙΝΙΚΙΑ 11 - ΕΙΡΗΝΗΣ ΚΑΙ ΦΙΛΙΑΣ 50",
    "lat": 35.311493930482534,
    "lng": 25.11571036930864
  },
  "hkl-mausolou-gefyra-ethnikis-return": {
    "slug": "hkl-mausolou-gefyra-ethnikis-return",
    "name": "Mausolou Gefyra Ethnikis Return",
    "nameEl": "ΜΑΥΣΩΛΟΥ ΓΕΦΥΡΑ ΕΘΝΙΚΗΣ ΕΠΙΣΤΡΟΦΗ",
    "lat": 35.3322049165378,
    "lng": 25.1591309420249
  },
  "hkl-ts-airport-returns": {
    "slug": "hkl-ts-airport-returns",
    "name": "TS Airport Returns",
    "nameEl": "ΤΣ ΑΕΡΟΔΡΟΜΙΟ ΕΠΙΣΤΡΟΦΗΣ",
    "lat": 35.3363817,
    "lng": 25.172392
  },
  "hkl-amaxostasio": {
    "slug": "hkl-amaxostasio",
    "name": "Amaxostasio",
    "nameEl": "ΤΣ ΑΜΑΞΟΣΤΑΣΙΟ",
    "lat": 35.331846771485196,
    "lng": 25.172616548543093
  },
  "hkl-ts-airport": {
    "slug": "hkl-ts-airport",
    "name": "TS Airport",
    "nameEl": "ΤΣ ΑΕΡΟΔΡΟΜΙΟ",
    "lat": 35.335864,
    "lng": 25.1737746
  },
  "hkl-irodotou-return-kallitheas": {
    "slug": "hkl-irodotou-return-kallitheas",
    "name": "Irodotou Return Kallitheas",
    "nameEl": "ΗΡΟΔΟΤΟΥ ΕΠΙΣΤΡΟΦΗ ΚΑΛΛΙΘΕΑΣ",
    "lat": 35.3375311571209,
    "lng": 25.1588921706062
  },
  "hkl-oulaf-palme-kyparissias": {
    "slug": "hkl-oulaf-palme-kyparissias",
    "name": "Oulaf Palme - Kyparissias",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ - ΚΥΠΑΡΙΣΣΙΑΣ (Ε)",
    "lat": 35.29278728178307,
    "lng": 25.141697517791
  },
  "hkl-entrance-limani-pili": {
    "slug": "hkl-entrance-limani-pili",
    "name": "Entrance Limani - ( Pili )",
    "nameEl": "ΕΜΜΑΝΟΥΗΛ ΧΑΤΖΑΚΗ (Μ)",
    "lat": 35.303908915679635,
    "lng": 25.09479930204396
  },
  "hkl-eo-irakleiou-faistou": {
    "slug": "hkl-eo-irakleiou-faistou",
    "name": "EO. Irakleiou - Faistou",
    "nameEl": "ΕΟ. ΗΡΑΚΛΕΙΟΥ - ΦΑΙΣΤΟΥ",
    "lat": 35.3004585,
    "lng": 25.0894597
  },
  "hkl-eo-irakleiou-faistou-2": {
    "slug": "hkl-eo-irakleiou-faistou-2",
    "name": "EO Irakleiou Faistou 2",
    "nameEl": "ΕΟ ΗΡΑΚΛΕΙΟΥ ΦΑΙΣΤΟΥ 2",
    "lat": 35.2947818,
    "lng": 25.0860777
  },
  "hkl-eo-irakleiou-faistou-3": {
    "slug": "hkl-eo-irakleiou-faistou-3",
    "name": "EO Irakleiou Faistou 3",
    "nameEl": "ΕΟ ΗΡΑΚΛΕΙΟΥ ΦΑΙΣΤΟΥ 3",
    "lat": 35.2880431,
    "lng": 25.0829107
  },
  "hkl-eo-irakleiou-faistou-4": {
    "slug": "hkl-eo-irakleiou-faistou-4",
    "name": "EO Irakleiou Faistou 4",
    "nameEl": "ΕΟ ΗΡΑΚΛΕΙΟΥ ΦΑΙΣΤΟΥ 4",
    "lat": 35.2939715,
    "lng": 25.0860808
  },
  "hkl-eo-irakleiou-faistou-5": {
    "slug": "hkl-eo-irakleiou-faistou-5",
    "name": "EO Irakleiou Faistou 5",
    "nameEl": "ΕΟ ΗΡΑΚΛΕΙΟΥ ΦΑΙΣΤΟΥ 5",
    "lat": 35.2994975,
    "lng": 25.0887322
  },
  "hkl-agiou-antoniou-nikolaou-gelasiou-kalaitzaki": {
    "slug": "hkl-agiou-antoniou-nikolaou-gelasiou-kalaitzaki",
    "name": "Agiou Antoniou & Nikolaou Gelasiou Kalaitzaki",
    "nameEl": "ΑΓΙΟΥ ΑΝΤΩΝΙΟΥ & ΝΙΚΟΛΑΟΥ ΓΕΛΑΣΙΟΥ ΚΑΛΑΙΤΖΑΚΗ",
    "lat": 35.3003861,
    "lng": 25.0993766
  },
  "hkl-agiou-antoniou-nikolaou": {
    "slug": "hkl-agiou-antoniou-nikolaou",
    "name": "Agiou Antoniou & Nikolaou",
    "nameEl": "ΑΓΙΟΥ ΑΝΤΩΝΙΟΥ & ΝΙΚΟΛΑΟΥ",
    "lat": 35.3009806,
    "lng": 25.0995819
  },
  "hkl-agiou-antoniou-nikolaou-38": {
    "slug": "hkl-agiou-antoniou-nikolaou-38",
    "name": "Agiou Antoniou & Nikolaou 38",
    "nameEl": "ΑΓΙΟΥ ΑΝΤΩΝΙΟΥ & ΝΙΚΟΛΑΟΥ 38",
    "lat": 35.304724,
    "lng": 25.1016534
  },
  "hkl-oulof-palme-191": {
    "slug": "hkl-oulof-palme-191",
    "name": "Oulof Palme 191",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 191",
    "lat": 35.3013051,
    "lng": 25.1391817
  },
  "hkl-oulof-palme-219": {
    "slug": "hkl-oulof-palme-219",
    "name": "Oulof Palme 219",
    "nameEl": "Ούλωφ Πάλμε 219",
    "lat": 35.2970856,
    "lng": 25.1405307
  },
  "hkl-avenue-eth-antistasis-99-zoodoxou-pigis": {
    "slug": "hkl-avenue-eth-antistasis-99-zoodoxou-pigis",
    "name": "Avenue Eth. Antistasis 99 - Zoodoxou Pigis",
    "nameEl": "Λεωφ. Εθ. Αντίστασης 99 - Ζωοδόχου Πηγής",
    "lat": 35.2721157,
    "lng": 25.138802
  },
  "hkl-avenue-eth-antistasis-giouxta": {
    "slug": "hkl-avenue-eth-antistasis-giouxta",
    "name": "Avenue Eth. Antistasis & Giouxta",
    "nameEl": "Λεωφ. Εθ. Αντίστασης & Γιουχτα",
    "lat": 35.267664688960785,
    "lng": 25.137734023437
  },
  "hkl-avenue-eth-antistasis-ag-vlasi-e": {
    "slug": "hkl-avenue-eth-antistasis-ag-vlasi-e",
    "name": "Avenue Eth. Antistasis - Ag Vlasi (E)",
    "nameEl": "Λεωφ. Εθ. Αντίστασης - Αγ Βλαση (Ε)",
    "lat": 35.2595912,
    "lng": 25.1330213
  },
  "hkl-avenue-eth-antistasis-ag-vlasi-m": {
    "slug": "hkl-avenue-eth-antistasis-ag-vlasi-m",
    "name": "Avenue Eth. Antistasis - Ag Vlasi (M)",
    "nameEl": "Λεωφ. Εθ. Αντίστασης - Αγ Βλαση (Μ)",
    "lat": 35.2597908,
    "lng": 25.1330313
  },
  "hkl-ag-vlasis-2": {
    "slug": "hkl-ag-vlasis-2",
    "name": "Ag Vlasis 2",
    "nameEl": "Αγ Βλασης  2",
    "lat": 35.2541313,
    "lng": 25.1321757
  },
  "hkl-agia-eirini-spilia": {
    "slug": "hkl-agia-eirini-spilia",
    "name": "Agia Eirini - Spilia",
    "nameEl": "ΑΓΙΑ ΕΙΡΗΝΗ - ΣΠΗΛΙΑ (Ε)",
    "lat": 35.2849424,
    "lng": 25.1650022
  },
  "hkl-skalani-kato": {
    "slug": "hkl-skalani-kato",
    "name": "Skalani Kato",
    "nameEl": "ΣΚΑΛΑΝΙ ΚΑΤΩ",
    "lat": 35.2821232,
    "lng": 25.1846572
  },
  "hkl-vl-xia-m": {
    "slug": "hkl-vl-xia-m",
    "name": "Vl?xia (M)",
    "nameEl": "ΒΛΥΧΙΑ (Μ)",
    "lat": 35.2920249,
    "lng": 25.1645629
  },
  "hkl-vlixia-1": {
    "slug": "hkl-vlixia-1",
    "name": "Vlixia 1",
    "nameEl": "ΒΛΥΧΙΑ 0 (Μ)",
    "lat": 35.2960633,
    "lng": 25.161702
  },
  "hkl-avenue-knossou-265-eforeia-e": {
    "slug": "hkl-avenue-knossou-265-eforeia-e",
    "name": "Avenue Knossou 265 - Eforeia (E)",
    "nameEl": "ΛΕΩΦ. ΚΝΩΣΣΟΥ 265 - ΕΦΟΡΕΙΑ (Ε)",
    "lat": 35.307708,
    "lng": 25.1514262
  },
  "hkl-kallitiea-2": {
    "slug": "hkl-kallitiea-2",
    "name": "Kallitiea 2",
    "nameEl": "ΚΑΛΛΙΘΕΑ 2",
    "lat": 35.3116432,
    "lng": 25.1729714
  },
  "hkl-ep-od-ag-sylla-298": {
    "slug": "hkl-ep-od-ag-sylla-298",
    "name": "Ep.od.ag.sylla 298",
    "nameEl": "ΕΠ.ΟΔ.ΑΓ.ΣΥΛΛΑ 298",
    "lat": 35.246472,
    "lng": 25.1184236
  },
  "hkl-agios-vlasis-4": {
    "slug": "hkl-agios-vlasis-4",
    "name": "Agios Vlasis 4",
    "nameEl": "ΑΓΙΟΣ ΒΛΑΣΗΣ 4",
    "lat": 35.2507355,
    "lng": 25.1322452
  },
  "hkl-agios-vlasis-3": {
    "slug": "hkl-agios-vlasis-3",
    "name": "Agios Vlasis 3",
    "nameEl": "ΑΓΙΟΣ ΒΛΑΣΗΣ 3",
    "lat": 35.2516708,
    "lng": 25.1322841
  },
  "hkl-foinikia-1": {
    "slug": "hkl-foinikia-1",
    "name": "Foinikia 1",
    "nameEl": "ΦΟΙΝΙΚΙΑ 1",
    "lat": 35.2761291,
    "lng": 25.1050057
  },
  "hkl-foinikia-2": {
    "slug": "hkl-foinikia-2",
    "name": "Foinikia 2",
    "nameEl": "ΦΟΙΝΙΚΙΑ 2",
    "lat": 35.2669254,
    "lng": 25.1013779
  },
  "hkl-foinikia-3": {
    "slug": "hkl-foinikia-3",
    "name": "Foinikia 3",
    "nameEl": "ΦΟΙΝΙΚΙΑ 3",
    "lat": 35.2550782,
    "lng": 25.1040189
  },
  "hkl-entrance-limani-pili-2": {
    "slug": "hkl-entrance-limani-pili-2",
    "name": "Entrance Limani - ( Pili )",
    "nameEl": "ΕΜΜΑΝΟΥΗΛ ΧΑΤΖΑΚΗ (ΕΠΙΣΤΡΟΦΗ)",
    "lat": 35.303716668833914,
    "lng": 25.094889834567716
  },
  "hkl-street-ro-vita-3": {
    "slug": "hkl-street-ro-vita-3",
    "name": "Street RO & Vita",
    "nameEl": "ΟΔΟΣ ΡΟ ΚΑΙ ΒΗΤΑ Ι (Μ)",
    "lat": 35.31988180085718,
    "lng": 25.17668621148546
  },
  "hkl-street-ro-vita-4": {
    "slug": "hkl-street-ro-vita-4",
    "name": "Street RO & Vita",
    "nameEl": "ΟΔΟΣ ΡΟ ΚΑΙ ΒΗΤΑ ΙΙ  (Μ)",
    "lat": 35.320305884920046,
    "lng": 25.171931168033158
  },
  "hkl-oulof-palme-255-kyparisias": {
    "slug": "hkl-oulof-palme-255-kyparisias",
    "name": "Oulof Palme 255 - Kyparisias",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 255 -  ( Μ )",
    "lat": 35.29174742352629,
    "lng": 25.141393700837366
  },
  "hkl-oulof-palme-312": {
    "slug": "hkl-oulof-palme-312",
    "name": "Oulof Palme 312",
    "nameEl": "ΟΥΛΩΦ ΠΑΛΜΕ 312 - (Μ)",
    "lat": 35.28752939628831,
    "lng": 25.14132392141137
  }
};

export const HKL_LINES: HklLine[] = [
  {
    "code": "HKL-01",
    "apiCode": "01",
    "name": "Airport",
    "nameEl": "ΑΕΡΟΔΡΟΜΙΟ",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 54,
    "lengthKm": 13.618
  },
  {
    "code": "HKL-02",
    "apiCode": "02",
    "name": "Knossos - Knossos Skalani",
    "nameEl": "ΚΝΩΣΣΟΣ - ΚΝΩΣΣΟΣ ΣΚΑΛΑΝΙ",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 43,
    "lengthKm": 10.897
  },
  {
    "code": "HKL-03",
    "apiCode": "03",
    "name": "Fortetsa",
    "nameEl": "ΦΟΡΤΕΤΣΑ",
    "hex": "#8d6e63",
    "textHex": "#ffffff",
    "totalMinutes": 23,
    "lengthKm": 6.315
  },
  {
    "code": "HKL-04",
    "apiCode": "04",
    "name": "Mastampas",
    "nameEl": "ΜΑΣΤΑΜΠΑΣ",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 26,
    "lengthKm": 6.187
  },
  {
    "code": "HKL-05",
    "apiCode": "05",
    "name": "Dimitriou Therisos",
    "nameEl": "ΔΗΜΗΤΡΙΟΥ ΘΕΡΙΣΣΟΣ",
    "hex": "#880e4f",
    "textHex": "#ffffff",
    "totalMinutes": 61,
    "lengthKm": 14.856
  },
  {
    "code": "HKL-06",
    "apiCode": "06",
    "name": "Amoudara",
    "nameEl": "ΑΜΜΟΥΔΑΡΑ",
    "hex": "#ff4081",
    "textHex": "#ffffff",
    "totalMinutes": 52,
    "lengthKm": 12.588
  },
  {
    "code": "HKL-07",
    "apiCode": "07",
    "name": "Amnissos",
    "nameEl": "ΑΜΝΙΣΣΟΣ",
    "hex": "#2196f3",
    "textHex": "#ffffff",
    "totalMinutes": 72,
    "lengthKm": 18.444
  },
  {
    "code": "HKL-09",
    "apiCode": "09",
    "name": "Agios Silas",
    "nameEl": "ΑΓ. ΣΥΛΛΑΣ",
    "hex": "#3c0008",
    "textHex": "#ffffff",
    "totalMinutes": 58,
    "lengthKm": 15.189
  },
  {
    "code": "HKL-10",
    "apiCode": "10",
    "name": "Gazi - Gazi Kavrochori",
    "nameEl": "ΓΑΖΙ - ΓΑΖΙ ΚΑΒΡΟΧΩΡΙ",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 59,
    "lengthKm": 12.569
  },
  {
    "code": "HKL-11",
    "apiCode": "11",
    "name": "General University Hospital OF Heraklion ( Pa.g.n.i.)",
    "nameEl": "ΠΑ.Γ.Ν.Η.- ΠΑΝΕΠΙΣΤΗΜΙΟ",
    "hex": "#b71c1c",
    "textHex": "#ffffff",
    "totalMinutes": 57,
    "lengthKm": 13.33
  },
  {
    "code": "HKL-12",
    "apiCode": "12",
    "name": "Hellenic Mediterranean University ( El.me.pa.)",
    "nameEl": "ΕΛ.ΜΕ.ΠΑ. (ΕΛΛΗΝΙΚΟ ΜΕΣΟΓΕΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ)",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 58,
    "lengthKm": 14.531
  },
  {
    "code": "HKL-14",
    "apiCode": "14",
    "name": "Heraklion Industrial Area",
    "nameEl": "ΒΙ.ΠΕ.Η.- ΚΑΛΛΙΘΕΑ ( Βιομηχανική Περιοχή  Ηρακλείου)",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 57,
    "lengthKm": 15.014
  },
  {
    "code": "HKL-15",
    "apiCode": "15",
    "name": "Finikia - Malades",
    "nameEl": "ΦΟΙΝΙΚΙΑ - ΜΑΛΑΔΕΣ",
    "hex": "#00838f",
    "textHex": "#ffffff",
    "totalMinutes": 51,
    "lengthKm": 12.686
  },
  {
    "code": "HKL-16",
    "apiCode": "16",
    "name": "Agia Ekaterini.",
    "nameEl": "ΑΓΙΑ ΑΙΚΑΤΕΡΙΝΗ.",
    "hex": "#4a148c",
    "textHex": "#ffffff",
    "totalMinutes": 26,
    "lengthKm": 7.896
  },
  {
    "code": "HKL-17",
    "apiCode": "17",
    "name": "Giofiro",
    "nameEl": "ΓΙΟΦΥΡΟ",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 26,
    "lengthKm": 7.04
  },
  {
    "code": "HKL-19",
    "apiCode": "19",
    "name": "Gournes - Athanati",
    "nameEl": "ΓΟΥΡΝΕΣ - ΑΘΑΝΑΤΟΙ",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 83,
    "lengthKm": 20.681
  },
  {
    "code": "HKL-20",
    "apiCode": "20",
    "name": "Port",
    "nameEl": "ΛΙΜΑΝΙ",
    "hex": "#787878",
    "textHex": "#ffffff",
    "totalMinutes": 48,
    "lengthKm": 15.218
  },
  {
    "code": "HKL-21",
    "apiCode": "21",
    "name": "Knossos - Mastampa - Pagni",
    "nameEl": "ΚΝΩΣΣΟΣ - ΠΑ.Γ.Ν.Η.",
    "hex": "#827717",
    "textHex": "#ffffff",
    "totalMinutes": 107,
    "lengthKm": 24.785
  },
  {
    "code": "HKL-23",
    "apiCode": "23",
    "name": "NEO Koimitirio",
    "nameEl": "ΝΕΟ ΚΟΙΜΗΤΗΡΙΟ",
    "hex": "#212121",
    "textHex": "#ffffff",
    "totalMinutes": 25,
    "lengthKm": 6.777
  },
  {
    "code": "HKL-31",
    "apiCode": "31",
    "name": "IKA",
    "nameEl": "Ι.Κ.Α.",
    "hex": "#455a64",
    "textHex": "#ffffff",
    "totalMinutes": 45,
    "lengthKm": 9.218
  },
  {
    "code": "HKL-91",
    "apiCode": "91",
    "name": "RED Line",
    "nameEl": "ΚΟΚΚΙΝΗ ΓΡΑΜΜΗ",
    "hex": "#000000",
    "textHex": "#ffffff",
    "totalMinutes": 26,
    "lengthKm": 7.052
  },
  {
    "code": "HKL-92",
    "apiCode": "92",
    "name": "Blue Line",
    "nameEl": "ΜΠΛΕ ΓΡΑΜΜΗ",
    "hex": "#000000",
    "textHex": "#ffffff",
    "totalMinutes": 24,
    "lengthKm": 6.978
  },
  {
    "code": "HKL-93",
    "apiCode": "93",
    "name": "Green Line",
    "nameEl": "ΠΡΑΣΙΝΗ ΓΡΑΜΜΗ",
    "hex": "#000000",
    "textHex": "#ffffff",
    "totalMinutes": 22,
    "lengthKm": 5.949
  }
];

export const HKL_ROUTES: HklRoute[] = [
  {
    "code": "0032",
    "lineCode": "HKL-01",
    "name": "Elmepa - Aerodromio",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-elmepa",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.283,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.606,
        "cumMin": 2.02
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.919,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.439,
        "cumMin": 4.8
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.868,
        "cumMin": 6.23
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.11,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.37,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.972,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.243,
        "cumMin": 10.81
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 10,
        "cumKm": 3.681,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 11,
        "cumKm": 3.901,
        "cumMin": 13
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 12,
        "cumKm": 4.329,
        "cumMin": 14.43
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 13,
        "cumKm": 4.904,
        "cumMin": 16.35
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 14,
        "cumKm": 5.092,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 15,
        "cumKm": 5.427,
        "cumMin": 18.09
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 16,
        "cumKm": 5.655,
        "cumMin": 18.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 17,
        "cumKm": 5.969,
        "cumMin": 19.9
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 18,
        "cumKm": 6.217,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 19,
        "cumKm": 6.421,
        "cumMin": 21.4
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 20,
        "cumKm": 6.766,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-evans",
        "seq": 21,
        "cumKm": 6.925,
        "cumMin": 23.08
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 22,
        "cumKm": 7.193,
        "cumMin": 23.98
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 23,
        "cumKm": 7.316,
        "cumMin": 24.39
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 24,
        "cumKm": 7.601,
        "cumMin": 25.34
      },
      {
        "slug": "hkl-analipsi",
        "seq": 25,
        "cumKm": 7.836,
        "cumMin": 26.12
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 26,
        "cumKm": 8.221,
        "cumMin": 27.4
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 27,
        "cumKm": 8.728,
        "cumMin": 29.09
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 28,
        "cumKm": 8.966,
        "cumMin": 29.89
      },
      {
        "slug": "hkl-poros-2",
        "seq": 29,
        "cumKm": 9.372,
        "cumMin": 31.24
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 30,
        "cumKm": 9.76,
        "cumMin": 32.53
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 31,
        "cumKm": 10.189,
        "cumMin": 33.96
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 32,
        "cumKm": 10.492,
        "cumMin": 34.97
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 33,
        "cumKm": 10.945,
        "cumMin": 36.48
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 34,
        "cumKm": 11.187,
        "cumMin": 37.29
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 35,
        "cumKm": 11.437,
        "cumMin": 38.12
      },
      {
        "slug": "hkl-seap-2",
        "seq": 36,
        "cumKm": 11.881,
        "cumMin": 39.6
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 37,
        "cumKm": 12.503,
        "cumMin": 41.68
      }
    ]
  },
  {
    "code": "30051",
    "lineCode": "HKL-01",
    "name": "Giofyro - Aerodromio -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 1,
        "cumKm": 0.439,
        "cumMin": 1.46
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 2,
        "cumKm": 0.658,
        "cumMin": 2.19
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 3,
        "cumKm": 1.086,
        "cumMin": 3.62
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 4,
        "cumKm": 1.661,
        "cumMin": 5.54
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 5,
        "cumKm": 1.85,
        "cumMin": 6.17
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 6,
        "cumKm": 2.185,
        "cumMin": 7.28
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 7,
        "cumKm": 2.412,
        "cumMin": 8.04
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 8,
        "cumKm": 2.726,
        "cumMin": 9.09
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 9,
        "cumKm": 2.974,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 10,
        "cumKm": 3.178,
        "cumMin": 10.59
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 11,
        "cumKm": 3.523,
        "cumMin": 11.74
      },
      {
        "slug": "hkl-evans",
        "seq": 12,
        "cumKm": 3.682,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 13,
        "cumKm": 4.012,
        "cumMin": 13.37
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 14,
        "cumKm": 4.296,
        "cumMin": 14.32
      },
      {
        "slug": "hkl-analipsi",
        "seq": 15,
        "cumKm": 4.531,
        "cumMin": 15.1
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 16,
        "cumKm": 4.916,
        "cumMin": 16.39
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 17,
        "cumKm": 5.423,
        "cumMin": 18.08
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 18,
        "cumKm": 5.661,
        "cumMin": 18.87
      },
      {
        "slug": "hkl-poros-2",
        "seq": 19,
        "cumKm": 6.067,
        "cumMin": 20.22
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 20,
        "cumKm": 6.455,
        "cumMin": 21.52
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 21,
        "cumKm": 6.884,
        "cumMin": 22.95
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 22,
        "cumKm": 7.187,
        "cumMin": 23.96
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 23,
        "cumKm": 7.64,
        "cumMin": 25.47
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 24,
        "cumKm": 7.882,
        "cumMin": 26.27
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 25,
        "cumKm": 8.132,
        "cumMin": 27.11
      },
      {
        "slug": "hkl-seap-2",
        "seq": 26,
        "cumKm": 8.576,
        "cumMin": 28.59
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 27,
        "cumKm": 9.198,
        "cumMin": 30.66
      }
    ]
  },
  {
    "code": "31000",
    "lineCode": "HKL-01",
    "name": "Astoria - Aerodromio",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-square-eleutierias",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 1,
        "cumKm": 0.507,
        "cumMin": 1.69
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 2,
        "cumKm": 0.745,
        "cumMin": 2.48
      },
      {
        "slug": "hkl-poros-2",
        "seq": 3,
        "cumKm": 1.15,
        "cumMin": 3.83
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 4,
        "cumKm": 1.539,
        "cumMin": 5.13
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 5,
        "cumKm": 1.968,
        "cumMin": 6.56
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 6,
        "cumKm": 2.271,
        "cumMin": 7.57
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 7,
        "cumKm": 2.724,
        "cumMin": 9.08
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 8,
        "cumKm": 2.966,
        "cumMin": 9.89
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 9,
        "cumKm": 3.216,
        "cumMin": 10.72
      },
      {
        "slug": "hkl-seap-2",
        "seq": 10,
        "cumKm": 3.66,
        "cumMin": 12.2
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 11,
        "cumKm": 4.282,
        "cumMin": 14.27
      }
    ]
  },
  {
    "code": "31009",
    "lineCode": "HKL-01",
    "name": "Ammoydara - Aerodromio ( E )",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-ammoudara",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-hotel-zeus",
        "seq": 1,
        "cumKm": 0.421,
        "cumMin": 1.4
      },
      {
        "slug": "hkl-hotel-apollonia-2",
        "seq": 2,
        "cumKm": 0.633,
        "cumMin": 2.11
      },
      {
        "slug": "hkl-hotel-poseidon-2",
        "seq": 3,
        "cumKm": 0.966,
        "cumMin": 3.22
      },
      {
        "slug": "hkl-hotel-amounda-vay-hotel-minoas",
        "seq": 4,
        "cumKm": 1.543,
        "cumMin": 5.14
      },
      {
        "slug": "hkl-andrea-papandreou-301",
        "seq": 5,
        "cumKm": 1.957,
        "cumMin": 6.52
      },
      {
        "slug": "hkl-petousis-hotel-roxani-2",
        "seq": 6,
        "cumKm": 2.228,
        "cumMin": 7.43
      },
      {
        "slug": "hkl-technopolis-hotel-marirena-2",
        "seq": 7,
        "cumKm": 2.429,
        "cumMin": 8.1
      },
      {
        "slug": "hkl-andrea-papandreou-230",
        "seq": 8,
        "cumKm": 2.784,
        "cumMin": 9.28
      },
      {
        "slug": "hkl-andrea-papandreou-175",
        "seq": 9,
        "cumKm": 3.092,
        "cumMin": 10.31
      },
      {
        "slug": "hkl-andrea-papandreou-hotel-marilena-hotel-agapi",
        "seq": 10,
        "cumKm": 3.397,
        "cumMin": 11.32
      },
      {
        "slug": "hkl-hotel-creta-beach-2",
        "seq": 11,
        "cumKm": 3.708,
        "cumMin": 12.36
      },
      {
        "slug": "hkl-hotel-candia-maris-2",
        "seq": 12,
        "cumKm": 4.041,
        "cumMin": 13.47
      },
      {
        "slug": "hkl-andrea-papandreou-87",
        "seq": 13,
        "cumKm": 4.525,
        "cumMin": 15.08
      },
      {
        "slug": "hkl-andrea-papandreou-49",
        "seq": 14,
        "cumKm": 4.925,
        "cumMin": 16.42
      },
      {
        "slug": "hkl-hotel-malena-akti-corali",
        "seq": 15,
        "cumKm": 5.147,
        "cumMin": 17.16
      },
      {
        "slug": "hkl-hotel-vanisko-2",
        "seq": 16,
        "cumKm": 5.373,
        "cumMin": 17.91
      },
      {
        "slug": "hkl-xeropotamos-vamvoukaki",
        "seq": 17,
        "cumKm": 5.929,
        "cumMin": 19.76
      },
      {
        "slug": "hkl-62-martyron-370-pagkritio-stadium",
        "seq": 18,
        "cumKm": 6.214,
        "cumMin": 20.71
      },
      {
        "slug": "hkl-62-martyron-366",
        "seq": 19,
        "cumKm": 6.439,
        "cumMin": 21.46
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 20,
        "cumKm": 7.295,
        "cumMin": 24.32
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 21,
        "cumKm": 7.515,
        "cumMin": 25.05
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 22,
        "cumKm": 7.943,
        "cumMin": 26.48
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 23,
        "cumKm": 8.518,
        "cumMin": 28.39
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 24,
        "cumKm": 8.706,
        "cumMin": 29.02
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 25,
        "cumKm": 9.041,
        "cumMin": 30.14
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 26,
        "cumKm": 9.269,
        "cumMin": 30.9
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 27,
        "cumKm": 9.583,
        "cumMin": 31.94
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 28,
        "cumKm": 9.831,
        "cumMin": 32.77
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 29,
        "cumKm": 10.035,
        "cumMin": 33.45
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 30,
        "cumKm": 10.38,
        "cumMin": 34.6
      },
      {
        "slug": "hkl-evans",
        "seq": 31,
        "cumKm": 10.539,
        "cumMin": 35.13
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 32,
        "cumKm": 10.868,
        "cumMin": 36.23
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 33,
        "cumKm": 11.153,
        "cumMin": 37.18
      },
      {
        "slug": "hkl-analipsi",
        "seq": 34,
        "cumKm": 11.388,
        "cumMin": 37.96
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 35,
        "cumKm": 11.773,
        "cumMin": 39.24
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 36,
        "cumKm": 12.28,
        "cumMin": 40.93
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 37,
        "cumKm": 12.518,
        "cumMin": 41.73
      },
      {
        "slug": "hkl-poros-2",
        "seq": 38,
        "cumKm": 12.924,
        "cumMin": 43.08
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 39,
        "cumKm": 13.312,
        "cumMin": 44.37
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 40,
        "cumKm": 13.741,
        "cumMin": 45.8
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 41,
        "cumKm": 14.044,
        "cumMin": 46.81
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 42,
        "cumKm": 14.497,
        "cumMin": 48.32
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 43,
        "cumKm": 14.739,
        "cumMin": 49.13
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 44,
        "cumKm": 14.989,
        "cumMin": 49.96
      },
      {
        "slug": "hkl-seap-2",
        "seq": 45,
        "cumKm": 15.433,
        "cumMin": 51.44
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 46,
        "cumKm": 16.055,
        "cumMin": 53.52
      }
    ]
  },
  {
    "code": "31015",
    "lineCode": "HKL-01",
    "name": "Pagni Panep/mio - Aerodromio -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-pagni-hospital",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-diastaurosi-staurakia",
        "seq": 1,
        "cumKm": 0.333,
        "cumMin": 1.11
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 2,
        "cumKm": 0.893,
        "cumMin": 2.98
      },
      {
        "slug": "hkl-ts-panepistimio",
        "seq": 3,
        "cumKm": 1.538,
        "cumMin": 5.13
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 4,
        "cumKm": 1.994,
        "cumMin": 6.65
      },
      {
        "slug": "hkl-oikismos-agias-paraskeuis",
        "seq": 5,
        "cumKm": 2.541,
        "cumMin": 8.47
      },
      {
        "slug": "hkl-aretousas-2",
        "seq": 6,
        "cumKm": 3.165,
        "cumMin": 10.55
      },
      {
        "slug": "hkl-agioi-theodoroi-2",
        "seq": 7,
        "cumKm": 3.804,
        "cumMin": 12.68
      },
      {
        "slug": "hkl-parasyri",
        "seq": 8,
        "cumKm": 4.188,
        "cumMin": 13.96
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 9,
        "cumKm": 4.51,
        "cumMin": 15.03
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 10,
        "cumKm": 4.705,
        "cumMin": 15.68
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 11,
        "cumKm": 5.327,
        "cumMin": 17.76
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 12,
        "cumKm": 5.803,
        "cumMin": 19.34
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 13,
        "cumKm": 6.404,
        "cumMin": 21.35
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 14,
        "cumKm": 6.675,
        "cumMin": 22.25
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 15,
        "cumKm": 7.114,
        "cumMin": 23.71
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 16,
        "cumKm": 7.333,
        "cumMin": 24.44
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 17,
        "cumKm": 7.761,
        "cumMin": 25.87
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 18,
        "cumKm": 8.336,
        "cumMin": 27.79
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 19,
        "cumKm": 8.525,
        "cumMin": 28.42
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 20,
        "cumKm": 8.86,
        "cumMin": 29.53
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 21,
        "cumKm": 9.087,
        "cumMin": 30.29
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 22,
        "cumKm": 9.401,
        "cumMin": 31.34
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 23,
        "cumKm": 9.649,
        "cumMin": 32.16
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 24,
        "cumKm": 9.853,
        "cumMin": 32.84
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 25,
        "cumKm": 10.198,
        "cumMin": 33.99
      },
      {
        "slug": "hkl-evans",
        "seq": 26,
        "cumKm": 10.357,
        "cumMin": 34.52
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 27,
        "cumKm": 10.687,
        "cumMin": 35.62
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 28,
        "cumKm": 10.971,
        "cumMin": 36.57
      },
      {
        "slug": "hkl-analipsi",
        "seq": 29,
        "cumKm": 11.206,
        "cumMin": 37.35
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 30,
        "cumKm": 11.591,
        "cumMin": 38.64
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 31,
        "cumKm": 12.098,
        "cumMin": 40.33
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 32,
        "cumKm": 12.336,
        "cumMin": 41.12
      },
      {
        "slug": "hkl-poros-2",
        "seq": 33,
        "cumKm": 12.742,
        "cumMin": 42.47
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 34,
        "cumKm": 13.13,
        "cumMin": 43.77
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 35,
        "cumKm": 13.559,
        "cumMin": 45.2
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 36,
        "cumKm": 13.862,
        "cumMin": 46.21
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 37,
        "cumKm": 14.315,
        "cumMin": 47.72
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 38,
        "cumKm": 14.557,
        "cumMin": 48.52
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 39,
        "cumKm": 14.807,
        "cumMin": 49.36
      },
      {
        "slug": "hkl-seap-2",
        "seq": 40,
        "cumKm": 15.251,
        "cumMin": 50.84
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 41,
        "cumKm": 15.873,
        "cumMin": 52.91
      }
    ]
  },
  {
    "code": "31018",
    "lineCode": "HKL-01",
    "name": "Elmepa - Aerodromio.",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.281,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.604,
        "cumMin": 2.01
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.918,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.438,
        "cumMin": 4.79
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.867,
        "cumMin": 6.22
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.109,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.369,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.971,
        "cumMin": 9.9
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.241,
        "cumMin": 10.8
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 10,
        "cumKm": 3.68,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 11,
        "cumKm": 3.9,
        "cumMin": 13
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 12,
        "cumKm": 4.327,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 13,
        "cumKm": 4.902,
        "cumMin": 16.34
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 14,
        "cumKm": 5.091,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 15,
        "cumKm": 5.426,
        "cumMin": 18.09
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 16,
        "cumKm": 5.654,
        "cumMin": 18.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 17,
        "cumKm": 5.967,
        "cumMin": 19.89
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 18,
        "cumKm": 6.216,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 19,
        "cumKm": 6.42,
        "cumMin": 21.4
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 20,
        "cumKm": 6.764,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-evans",
        "seq": 21,
        "cumKm": 6.923,
        "cumMin": 23.08
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 22,
        "cumKm": 7.253,
        "cumMin": 24.18
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 23,
        "cumKm": 7.538,
        "cumMin": 25.13
      },
      {
        "slug": "hkl-analipsi",
        "seq": 24,
        "cumKm": 7.773,
        "cumMin": 25.91
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 25,
        "cumKm": 8.158,
        "cumMin": 27.19
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 26,
        "cumKm": 8.665,
        "cumMin": 28.88
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 27,
        "cumKm": 8.903,
        "cumMin": 29.68
      },
      {
        "slug": "hkl-poros-2",
        "seq": 28,
        "cumKm": 9.308,
        "cumMin": 31.03
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 29,
        "cumKm": 9.697,
        "cumMin": 32.32
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 30,
        "cumKm": 10.126,
        "cumMin": 33.75
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 31,
        "cumKm": 10.429,
        "cumMin": 34.76
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 32,
        "cumKm": 10.882,
        "cumMin": 36.27
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 33,
        "cumKm": 11.124,
        "cumMin": 37.08
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 34,
        "cumKm": 11.374,
        "cumMin": 37.91
      },
      {
        "slug": "hkl-seap-2",
        "seq": 35,
        "cumKm": 11.818,
        "cumMin": 39.39
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 36,
        "cumKm": 12.439,
        "cumMin": 41.46
      }
    ]
  },
  {
    "code": "31022",
    "lineCode": "HKL-01",
    "name": "Foinikia - Aerodromio-3990",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-foinikia",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-foinikia-1",
        "seq": 1,
        "cumKm": 0.86,
        "cumMin": 2.87
      },
      {
        "slug": "hkl-foinikia-2",
        "seq": 2,
        "cumKm": 2.257,
        "cumMin": 7.52
      },
      {
        "slug": "hkl-foinikia-3",
        "seq": 3,
        "cumKm": 3.998,
        "cumMin": 13.33
      },
      {
        "slug": "hkl-kampos-agiou-sylla",
        "seq": 4,
        "cumKm": 4.528,
        "cumMin": 15.09
      },
      {
        "slug": "hkl-foinikia-4",
        "seq": 5,
        "cumKm": 4.848,
        "cumMin": 16.16
      },
      {
        "slug": "hkl-foinikia-5",
        "seq": 6,
        "cumKm": 5.641,
        "cumMin": 18.8
      },
      {
        "slug": "hkl-foinikia-6",
        "seq": 7,
        "cumKm": 6.728,
        "cumMin": 22.43
      },
      {
        "slug": "hkl-foinikia-7",
        "seq": 8,
        "cumKm": 7.979,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-foinikia-8",
        "seq": 9,
        "cumKm": 10.279,
        "cumMin": 34.26
      },
      {
        "slug": "hkl-foinikia-9",
        "seq": 10,
        "cumKm": 11.271,
        "cumMin": 37.57
      },
      {
        "slug": "hkl-foinikia-11",
        "seq": 11,
        "cumKm": 12.7,
        "cumMin": 42.33
      },
      {
        "slug": "hkl-church-agiou-ioanni-xostou",
        "seq": 12,
        "cumKm": 14.103,
        "cumMin": 47.01
      },
      {
        "slug": "hkl-christomichali-chylouri-103",
        "seq": 13,
        "cumKm": 14.665,
        "cumMin": 48.88
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 14,
        "cumKm": 15.833,
        "cumMin": 52.78
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 15,
        "cumKm": 16.408,
        "cumMin": 54.69
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 16,
        "cumKm": 16.597,
        "cumMin": 55.32
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 17,
        "cumKm": 16.931,
        "cumMin": 56.44
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 18,
        "cumKm": 17.159,
        "cumMin": 57.2
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 19,
        "cumKm": 17.473,
        "cumMin": 58.24
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 20,
        "cumKm": 17.721,
        "cumMin": 59.07
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 21,
        "cumKm": 17.925,
        "cumMin": 59.75
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 22,
        "cumKm": 18.27,
        "cumMin": 60.9
      },
      {
        "slug": "hkl-evans",
        "seq": 23,
        "cumKm": 18.429,
        "cumMin": 61.43
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 24,
        "cumKm": 18.759,
        "cumMin": 62.53
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 25,
        "cumKm": 19.043,
        "cumMin": 63.48
      },
      {
        "slug": "hkl-analipsi",
        "seq": 26,
        "cumKm": 19.278,
        "cumMin": 64.26
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 27,
        "cumKm": 19.663,
        "cumMin": 65.54
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 28,
        "cumKm": 20.17,
        "cumMin": 67.23
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 29,
        "cumKm": 20.408,
        "cumMin": 68.03
      },
      {
        "slug": "hkl-poros-2",
        "seq": 30,
        "cumKm": 20.814,
        "cumMin": 69.38
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 31,
        "cumKm": 21.202,
        "cumMin": 70.67
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 32,
        "cumKm": 21.631,
        "cumMin": 72.1
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 33,
        "cumKm": 21.934,
        "cumMin": 73.11
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 34,
        "cumKm": 22.387,
        "cumMin": 74.62
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 35,
        "cumKm": 22.629,
        "cumMin": 75.43
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 36,
        "cumKm": 22.879,
        "cumMin": 76.26
      },
      {
        "slug": "hkl-seap-2",
        "seq": 37,
        "cumKm": 23.323,
        "cumMin": 77.74
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 38,
        "cumKm": 23.945,
        "cumMin": 79.82
      }
    ]
  },
  {
    "code": "31025",
    "lineCode": "HKL-01",
    "name": "AThANATOYS - Goyrnes - Elmepa - Aerodromio-3995",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-athanati",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-4",
        "seq": 1,
        "cumKm": 2.213,
        "cumMin": 7.38
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-5",
        "seq": 2,
        "cumKm": 3.071,
        "cumMin": 10.24
      },
      {
        "slug": "hkl-entrance-limani-pili-2",
        "seq": 3,
        "cumKm": 4.02,
        "cumMin": 13.4
      },
      {
        "slug": "hkl-gournes",
        "seq": 4,
        "cumKm": 5.152,
        "cumMin": 17.17
      },
      {
        "slug": "hkl-chatzaki-agiou-antoniou-diastaurosi-gournes",
        "seq": 5,
        "cumKm": 5.664,
        "cumMin": 18.88
      },
      {
        "slug": "hkl-agiou-antoniou-nikolaou-gelasiou-kalaitzaki",
        "seq": 6,
        "cumKm": 6.134,
        "cumMin": 20.45
      },
      {
        "slug": "hkl-agiou-antoniou-nikolaou-38",
        "seq": 7,
        "cumKm": 6.816,
        "cumMin": 22.72
      },
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 8,
        "cumKm": 7.532,
        "cumMin": 25.11
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 9,
        "cumKm": 7.814,
        "cumMin": 26.05
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 10,
        "cumKm": 8.137,
        "cumMin": 27.12
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 11,
        "cumKm": 8.45,
        "cumMin": 28.17
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 12,
        "cumKm": 8.97,
        "cumMin": 29.9
      },
      {
        "slug": "hkl-athitaki",
        "seq": 13,
        "cumKm": 9.263,
        "cumMin": 30.88
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 14,
        "cumKm": 9.641,
        "cumMin": 32.14
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 15,
        "cumKm": 9.901,
        "cumMin": 33
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 16,
        "cumKm": 10.503,
        "cumMin": 35.01
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 17,
        "cumKm": 10.773,
        "cumMin": 35.91
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 18,
        "cumKm": 11.212,
        "cumMin": 37.37
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 19,
        "cumKm": 11.432,
        "cumMin": 38.11
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 20,
        "cumKm": 11.859,
        "cumMin": 39.53
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 21,
        "cumKm": 12.434,
        "cumMin": 41.45
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 22,
        "cumKm": 12.623,
        "cumMin": 42.08
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 23,
        "cumKm": 12.958,
        "cumMin": 43.19
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 24,
        "cumKm": 13.185,
        "cumMin": 43.95
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 25,
        "cumKm": 13.499,
        "cumMin": 45
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 26,
        "cumKm": 13.748,
        "cumMin": 45.83
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 27,
        "cumKm": 13.952,
        "cumMin": 46.51
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 28,
        "cumKm": 14.296,
        "cumMin": 47.65
      },
      {
        "slug": "hkl-evans",
        "seq": 29,
        "cumKm": 14.455,
        "cumMin": 48.18
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 30,
        "cumKm": 14.785,
        "cumMin": 49.28
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 31,
        "cumKm": 15.069,
        "cumMin": 50.23
      },
      {
        "slug": "hkl-analipsi",
        "seq": 32,
        "cumKm": 15.305,
        "cumMin": 51.02
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 33,
        "cumKm": 15.69,
        "cumMin": 52.3
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 34,
        "cumKm": 16.197,
        "cumMin": 53.99
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 35,
        "cumKm": 16.435,
        "cumMin": 54.78
      },
      {
        "slug": "hkl-poros-2",
        "seq": 36,
        "cumKm": 16.84,
        "cumMin": 56.13
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 37,
        "cumKm": 17.229,
        "cumMin": 57.43
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 38,
        "cumKm": 17.658,
        "cumMin": 58.86
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 39,
        "cumKm": 17.961,
        "cumMin": 59.87
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 40,
        "cumKm": 18.413,
        "cumMin": 61.38
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 41,
        "cumKm": 18.655,
        "cumMin": 62.18
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 42,
        "cumKm": 18.905,
        "cumMin": 63.02
      },
      {
        "slug": "hkl-seap-2",
        "seq": 43,
        "cumKm": 19.35,
        "cumMin": 64.5
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 44,
        "cumKm": 19.971,
        "cumMin": 66.57
      }
    ]
  },
  {
    "code": "31026",
    "lineCode": "HKL-01",
    "name": "AThANATOI - Elmepa - Aerodromio-3996",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-athanati",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-4",
        "seq": 1,
        "cumKm": 2.213,
        "cumMin": 7.38
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-5",
        "seq": 2,
        "cumKm": 3.071,
        "cumMin": 10.24
      },
      {
        "slug": "hkl-entrance-limani-pili-2",
        "seq": 3,
        "cumKm": 4.02,
        "cumMin": 13.4
      },
      {
        "slug": "hkl-chatzaki-agiou-antoniou-diastaurosi-gournes",
        "seq": 4,
        "cumKm": 4.754,
        "cumMin": 15.85
      },
      {
        "slug": "hkl-agiou-antoniou-nikolaou-gelasiou-kalaitzaki",
        "seq": 5,
        "cumKm": 5.224,
        "cumMin": 17.41
      },
      {
        "slug": "hkl-agiou-antoniou-nikolaou-38",
        "seq": 6,
        "cumKm": 5.906,
        "cumMin": 19.69
      },
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 7,
        "cumKm": 6.622,
        "cumMin": 22.07
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 8,
        "cumKm": 6.903,
        "cumMin": 23.01
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 9,
        "cumKm": 7.226,
        "cumMin": 24.09
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 10,
        "cumKm": 7.54,
        "cumMin": 25.13
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 11,
        "cumKm": 8.06,
        "cumMin": 26.87
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 12,
        "cumKm": 8.489,
        "cumMin": 28.3
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 13,
        "cumKm": 8.731,
        "cumMin": 29.1
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 14,
        "cumKm": 8.991,
        "cumMin": 29.97
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 15,
        "cumKm": 9.593,
        "cumMin": 31.98
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 16,
        "cumKm": 9.863,
        "cumMin": 32.88
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 17,
        "cumKm": 10.302,
        "cumMin": 34.34
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 18,
        "cumKm": 10.522,
        "cumMin": 35.07
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 19,
        "cumKm": 10.949,
        "cumMin": 36.5
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 20,
        "cumKm": 11.525,
        "cumMin": 38.42
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 21,
        "cumKm": 11.713,
        "cumMin": 39.04
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 22,
        "cumKm": 12.048,
        "cumMin": 40.16
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 23,
        "cumKm": 12.276,
        "cumMin": 40.92
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 24,
        "cumKm": 12.589,
        "cumMin": 41.96
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 25,
        "cumKm": 12.838,
        "cumMin": 42.79
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 26,
        "cumKm": 13.042,
        "cumMin": 43.47
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 27,
        "cumKm": 13.386,
        "cumMin": 44.62
      },
      {
        "slug": "hkl-evans",
        "seq": 28,
        "cumKm": 13.546,
        "cumMin": 45.15
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 29,
        "cumKm": 13.875,
        "cumMin": 46.25
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 30,
        "cumKm": 14.16,
        "cumMin": 47.2
      },
      {
        "slug": "hkl-analipsi",
        "seq": 31,
        "cumKm": 14.395,
        "cumMin": 47.98
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 32,
        "cumKm": 14.78,
        "cumMin": 49.27
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 33,
        "cumKm": 15.287,
        "cumMin": 50.96
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 34,
        "cumKm": 15.525,
        "cumMin": 51.75
      },
      {
        "slug": "hkl-poros-2",
        "seq": 35,
        "cumKm": 15.93,
        "cumMin": 53.1
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 36,
        "cumKm": 16.319,
        "cumMin": 54.4
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 37,
        "cumKm": 16.748,
        "cumMin": 55.83
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 38,
        "cumKm": 17.051,
        "cumMin": 56.84
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 39,
        "cumKm": 17.504,
        "cumMin": 58.35
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 40,
        "cumKm": 17.746,
        "cumMin": 59.15
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 41,
        "cumKm": 17.996,
        "cumMin": 59.99
      },
      {
        "slug": "hkl-seap-2",
        "seq": 42,
        "cumKm": 18.44,
        "cumMin": 61.47
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 43,
        "cumKm": 19.062,
        "cumMin": 63.54
      }
    ]
  },
  {
    "code": "31029",
    "lineCode": "HKL-01",
    "name": "IKA - Aerodromio -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ika",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-parasyri",
        "seq": 1,
        "cumKm": 0.486,
        "cumMin": 1.62
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 2,
        "cumKm": 0.808,
        "cumMin": 2.69
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 3,
        "cumKm": 1.003,
        "cumMin": 3.34
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 4,
        "cumKm": 1.626,
        "cumMin": 5.42
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 5,
        "cumKm": 2.101,
        "cumMin": 7
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 6,
        "cumKm": 2.702,
        "cumMin": 9.01
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 7,
        "cumKm": 2.973,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 8,
        "cumKm": 3.412,
        "cumMin": 11.37
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 9,
        "cumKm": 3.631,
        "cumMin": 12.1
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 10,
        "cumKm": 4.059,
        "cumMin": 13.53
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 11,
        "cumKm": 4.634,
        "cumMin": 15.45
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 12,
        "cumKm": 4.823,
        "cumMin": 16.08
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 13,
        "cumKm": 5.158,
        "cumMin": 17.19
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 14,
        "cumKm": 5.385,
        "cumMin": 17.95
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 15,
        "cumKm": 5.699,
        "cumMin": 19
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 16,
        "cumKm": 5.947,
        "cumMin": 19.82
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 17,
        "cumKm": 6.151,
        "cumMin": 20.5
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 18,
        "cumKm": 6.496,
        "cumMin": 21.65
      },
      {
        "slug": "hkl-evans-2",
        "seq": 19,
        "cumKm": 6.692,
        "cumMin": 22.31
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 20,
        "cumKm": 6.98,
        "cumMin": 23.27
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 21,
        "cumKm": 7.264,
        "cumMin": 24.21
      },
      {
        "slug": "hkl-analipsi",
        "seq": 22,
        "cumKm": 7.5,
        "cumMin": 25
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 23,
        "cumKm": 7.884,
        "cumMin": 26.28
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 24,
        "cumKm": 8.391,
        "cumMin": 27.97
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 25,
        "cumKm": 8.629,
        "cumMin": 28.76
      },
      {
        "slug": "hkl-poros-2",
        "seq": 26,
        "cumKm": 9.035,
        "cumMin": 30.12
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 27,
        "cumKm": 9.423,
        "cumMin": 31.41
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 28,
        "cumKm": 9.853,
        "cumMin": 32.84
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 29,
        "cumKm": 10.156,
        "cumMin": 33.85
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 30,
        "cumKm": 10.608,
        "cumMin": 35.36
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 31,
        "cumKm": 10.85,
        "cumMin": 36.17
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 32,
        "cumKm": 11.1,
        "cumMin": 37
      },
      {
        "slug": "hkl-seap-2",
        "seq": 33,
        "cumKm": 11.544,
        "cumMin": 38.48
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 34,
        "cumKm": 12.166,
        "cumMin": 40.55
      }
    ]
  },
  {
    "code": "31033",
    "lineCode": "HKL-01",
    "name": "Gazi - Aerodromio - 3947",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-gazi",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-agiou-spyridonos-2",
        "seq": 1,
        "cumKm": 0.794,
        "cumMin": 2.65
      },
      {
        "slug": "hkl-eleutheriou-venizelou-249",
        "seq": 2,
        "cumKm": 1.298,
        "cumMin": 4.33
      },
      {
        "slug": "hkl-town-hall-gaziou-2",
        "seq": 3,
        "cumKm": 1.545,
        "cumMin": 5.15
      },
      {
        "slug": "hkl-eleutheriou-venizelou-4",
        "seq": 4,
        "cumKm": 1.791,
        "cumMin": 5.97
      },
      {
        "slug": "hkl-eleutheriou-venizelou-164",
        "seq": 5,
        "cumKm": 2.017,
        "cumMin": 6.72
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika-2",
        "seq": 6,
        "cumKm": 2.65,
        "cumMin": 8.83
      },
      {
        "slug": "hkl-eleutheriou-venizelou-2",
        "seq": 7,
        "cumKm": 3.264,
        "cumMin": 10.88
      },
      {
        "slug": "hkl-gennimata-venizelou",
        "seq": 8,
        "cumKm": 3.728,
        "cumMin": 12.43
      },
      {
        "slug": "hkl-georgiou-gennimata-21-2",
        "seq": 9,
        "cumKm": 3.925,
        "cumMin": 13.08
      },
      {
        "slug": "hkl-georgiou-gennimata-36",
        "seq": 10,
        "cumKm": 4.145,
        "cumMin": 13.82
      },
      {
        "slug": "hkl-tsalikaki-2",
        "seq": 11,
        "cumKm": 4.395,
        "cumMin": 14.65
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou-2",
        "seq": 12,
        "cumKm": 5.448,
        "cumMin": 18.16
      },
      {
        "slug": "hkl-xeropotamos-vamvoukaki",
        "seq": 13,
        "cumKm": 5.811,
        "cumMin": 19.37
      },
      {
        "slug": "hkl-62-martyron-370-pagkritio-stadium",
        "seq": 14,
        "cumKm": 6.096,
        "cumMin": 20.32
      },
      {
        "slug": "hkl-62-martyron-366",
        "seq": 15,
        "cumKm": 6.321,
        "cumMin": 21.07
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 16,
        "cumKm": 7.177,
        "cumMin": 23.92
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 17,
        "cumKm": 7.396,
        "cumMin": 24.65
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 18,
        "cumKm": 7.824,
        "cumMin": 26.08
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 19,
        "cumKm": 8.399,
        "cumMin": 28
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 20,
        "cumKm": 8.588,
        "cumMin": 28.63
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 21,
        "cumKm": 8.923,
        "cumMin": 29.74
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 22,
        "cumKm": 9.15,
        "cumMin": 30.5
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 23,
        "cumKm": 9.464,
        "cumMin": 31.55
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 24,
        "cumKm": 9.712,
        "cumMin": 32.37
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 25,
        "cumKm": 9.916,
        "cumMin": 33.05
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 26,
        "cumKm": 10.261,
        "cumMin": 34.2
      },
      {
        "slug": "hkl-evans",
        "seq": 27,
        "cumKm": 10.42,
        "cumMin": 34.73
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 28,
        "cumKm": 10.75,
        "cumMin": 35.83
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 29,
        "cumKm": 11.034,
        "cumMin": 36.78
      },
      {
        "slug": "hkl-analipsi",
        "seq": 30,
        "cumKm": 11.269,
        "cumMin": 37.56
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 31,
        "cumKm": 11.654,
        "cumMin": 38.85
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 32,
        "cumKm": 12.161,
        "cumMin": 40.54
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 33,
        "cumKm": 12.399,
        "cumMin": 41.33
      },
      {
        "slug": "hkl-poros-2",
        "seq": 34,
        "cumKm": 12.805,
        "cumMin": 42.68
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 35,
        "cumKm": 13.193,
        "cumMin": 43.98
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 36,
        "cumKm": 13.622,
        "cumMin": 45.41
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 37,
        "cumKm": 13.925,
        "cumMin": 46.42
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 38,
        "cumKm": 14.378,
        "cumMin": 47.93
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 39,
        "cumKm": 14.62,
        "cumMin": 48.73
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 40,
        "cumKm": 14.87,
        "cumMin": 49.57
      },
      {
        "slug": "hkl-seap-2",
        "seq": 41,
        "cumKm": 15.314,
        "cumMin": 51.05
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 42,
        "cumKm": 15.936,
        "cumMin": 53.12
      }
    ]
  },
  {
    "code": "31034",
    "lineCode": "HKL-01",
    "name": "KAVROChORI - Gazi - Aerodromio",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-kavroxori",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-kavroxori-stasi-3-2",
        "seq": 1,
        "cumKm": 0.261,
        "cumMin": 0.87
      },
      {
        "slug": "hkl-kavroxori-stasi-2-2",
        "seq": 2,
        "cumKm": 0.564,
        "cumMin": 1.88
      },
      {
        "slug": "hkl-diakladosi-krousona",
        "seq": 3,
        "cumKm": 1.304,
        "cumMin": 4.35
      },
      {
        "slug": "hkl-agios-georgios-4",
        "seq": 4,
        "cumKm": 2.23,
        "cumMin": 7.43
      },
      {
        "slug": "hkl-agiou-spyridonos-2",
        "seq": 5,
        "cumKm": 2.816,
        "cumMin": 9.39
      },
      {
        "slug": "hkl-eleutheriou-venizelou-249",
        "seq": 6,
        "cumKm": 3.32,
        "cumMin": 11.07
      },
      {
        "slug": "hkl-town-hall-gaziou-2",
        "seq": 7,
        "cumKm": 3.568,
        "cumMin": 11.89
      },
      {
        "slug": "hkl-eleutheriou-venizelou-4",
        "seq": 8,
        "cumKm": 3.813,
        "cumMin": 12.71
      },
      {
        "slug": "hkl-eleutheriou-venizelou-164",
        "seq": 9,
        "cumKm": 4.039,
        "cumMin": 13.46
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika-2",
        "seq": 10,
        "cumKm": 4.673,
        "cumMin": 15.58
      },
      {
        "slug": "hkl-eleutheriou-venizelou-2",
        "seq": 11,
        "cumKm": 5.287,
        "cumMin": 17.62
      },
      {
        "slug": "hkl-gennimata-venizelou",
        "seq": 12,
        "cumKm": 5.751,
        "cumMin": 19.17
      },
      {
        "slug": "hkl-georgiou-gennimata-21-2",
        "seq": 13,
        "cumKm": 5.948,
        "cumMin": 19.83
      },
      {
        "slug": "hkl-georgiou-gennimata-36",
        "seq": 14,
        "cumKm": 6.167,
        "cumMin": 20.56
      },
      {
        "slug": "hkl-tsalikaki-2",
        "seq": 15,
        "cumKm": 6.418,
        "cumMin": 21.39
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou-2",
        "seq": 16,
        "cumKm": 7.47,
        "cumMin": 24.9
      },
      {
        "slug": "hkl-xeropotamos-vamvoukaki",
        "seq": 17,
        "cumKm": 7.833,
        "cumMin": 26.11
      },
      {
        "slug": "hkl-62-martyron-370-pagkritio-stadium",
        "seq": 18,
        "cumKm": 8.118,
        "cumMin": 27.06
      },
      {
        "slug": "hkl-62-martyron-366",
        "seq": 19,
        "cumKm": 8.343,
        "cumMin": 27.81
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 20,
        "cumKm": 9.199,
        "cumMin": 30.66
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 21,
        "cumKm": 9.419,
        "cumMin": 31.4
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 22,
        "cumKm": 9.846,
        "cumMin": 32.82
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 23,
        "cumKm": 10.421,
        "cumMin": 34.74
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 24,
        "cumKm": 10.61,
        "cumMin": 35.37
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 25,
        "cumKm": 10.945,
        "cumMin": 36.48
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 26,
        "cumKm": 11.172,
        "cumMin": 37.24
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 27,
        "cumKm": 11.486,
        "cumMin": 38.29
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 28,
        "cumKm": 11.735,
        "cumMin": 39.12
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 29,
        "cumKm": 11.939,
        "cumMin": 39.8
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 30,
        "cumKm": 12.283,
        "cumMin": 40.94
      },
      {
        "slug": "hkl-evans",
        "seq": 31,
        "cumKm": 12.442,
        "cumMin": 41.47
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 32,
        "cumKm": 12.772,
        "cumMin": 42.57
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 33,
        "cumKm": 13.056,
        "cumMin": 43.52
      },
      {
        "slug": "hkl-analipsi",
        "seq": 34,
        "cumKm": 13.292,
        "cumMin": 44.31
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 35,
        "cumKm": 13.677,
        "cumMin": 45.59
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 36,
        "cumKm": 14.184,
        "cumMin": 47.28
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 37,
        "cumKm": 14.421,
        "cumMin": 48.07
      },
      {
        "slug": "hkl-poros-2",
        "seq": 38,
        "cumKm": 14.827,
        "cumMin": 49.42
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 39,
        "cumKm": 15.215,
        "cumMin": 50.72
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 40,
        "cumKm": 15.645,
        "cumMin": 52.15
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 41,
        "cumKm": 15.948,
        "cumMin": 53.16
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 42,
        "cumKm": 16.4,
        "cumMin": 54.67
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 43,
        "cumKm": 16.642,
        "cumMin": 55.47
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 44,
        "cumKm": 16.892,
        "cumMin": 56.31
      },
      {
        "slug": "hkl-seap-2",
        "seq": 45,
        "cumKm": 17.337,
        "cumMin": 57.79
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 46,
        "cumKm": 17.958,
        "cumMin": 59.86
      }
    ]
  },
  {
    "code": "39310",
    "lineCode": "HKL-01",
    "name": "ITE Forth - Panepistimio - Aerodromio-3936",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-idryma-texnologias-ereunas-i-t-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 1,
        "cumKm": 0.663,
        "cumMin": 2.21
      },
      {
        "slug": "hkl-ts-panepistimio",
        "seq": 2,
        "cumKm": 1.308,
        "cumMin": 4.36
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 3,
        "cumKm": 1.764,
        "cumMin": 5.88
      },
      {
        "slug": "hkl-oikismos-agias-paraskeuis",
        "seq": 4,
        "cumKm": 2.311,
        "cumMin": 7.7
      },
      {
        "slug": "hkl-aretousas-2",
        "seq": 5,
        "cumKm": 2.935,
        "cumMin": 9.78
      },
      {
        "slug": "hkl-agioi-theodoroi-2",
        "seq": 6,
        "cumKm": 3.574,
        "cumMin": 11.91
      },
      {
        "slug": "hkl-parasyri",
        "seq": 7,
        "cumKm": 3.958,
        "cumMin": 13.19
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 8,
        "cumKm": 4.28,
        "cumMin": 14.27
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 9,
        "cumKm": 4.475,
        "cumMin": 14.92
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 10,
        "cumKm": 5.097,
        "cumMin": 16.99
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 11,
        "cumKm": 5.573,
        "cumMin": 18.58
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 12,
        "cumKm": 6.174,
        "cumMin": 20.58
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 13,
        "cumKm": 6.445,
        "cumMin": 21.48
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 14,
        "cumKm": 6.883,
        "cumMin": 22.94
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 15,
        "cumKm": 7.103,
        "cumMin": 23.68
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 16,
        "cumKm": 7.531,
        "cumMin": 25.1
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 17,
        "cumKm": 8.106,
        "cumMin": 27.02
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 18,
        "cumKm": 8.295,
        "cumMin": 27.65
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 19,
        "cumKm": 8.629,
        "cumMin": 28.76
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 20,
        "cumKm": 8.857,
        "cumMin": 29.52
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 21,
        "cumKm": 9.171,
        "cumMin": 30.57
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 22,
        "cumKm": 9.419,
        "cumMin": 31.4
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 23,
        "cumKm": 9.623,
        "cumMin": 32.08
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 24,
        "cumKm": 9.968,
        "cumMin": 33.23
      },
      {
        "slug": "hkl-evans",
        "seq": 25,
        "cumKm": 10.127,
        "cumMin": 33.76
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 26,
        "cumKm": 10.457,
        "cumMin": 34.86
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 27,
        "cumKm": 10.741,
        "cumMin": 35.8
      },
      {
        "slug": "hkl-analipsi",
        "seq": 28,
        "cumKm": 10.976,
        "cumMin": 36.59
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 29,
        "cumKm": 11.361,
        "cumMin": 37.87
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 30,
        "cumKm": 11.868,
        "cumMin": 39.56
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 31,
        "cumKm": 12.106,
        "cumMin": 40.35
      },
      {
        "slug": "hkl-poros-2",
        "seq": 32,
        "cumKm": 12.512,
        "cumMin": 41.71
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 33,
        "cumKm": 12.9,
        "cumMin": 43
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 34,
        "cumKm": 13.329,
        "cumMin": 44.43
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 35,
        "cumKm": 13.632,
        "cumMin": 45.44
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 36,
        "cumKm": 14.085,
        "cumMin": 46.95
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 37,
        "cumKm": 14.327,
        "cumMin": 47.76
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 38,
        "cumKm": 14.577,
        "cumMin": 48.59
      },
      {
        "slug": "hkl-seap-2",
        "seq": 39,
        "cumKm": 15.021,
        "cumMin": 50.07
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 40,
        "cumKm": 15.643,
        "cumMin": 52.14
      }
    ]
  },
  {
    "code": "9931",
    "lineCode": "HKL-01",
    "name": "Amnissos Aerodromio",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou-2",
        "seq": 1,
        "cumKm": 0.324,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-michail-archaggelou-2",
        "seq": 2,
        "cumKm": 0.877,
        "cumMin": 2.92
      },
      {
        "slug": "hkl-amnissos-paralia-karterou",
        "seq": 3,
        "cumKm": 1.42,
        "cumMin": 4.73
      },
      {
        "slug": "hkl-riding-academy-crete-2",
        "seq": 4,
        "cumKm": 1.763,
        "cumMin": 5.88
      },
      {
        "slug": "hkl-agiou-alexandrou-2",
        "seq": 5,
        "cumKm": 2.424,
        "cumMin": 8.08
      },
      {
        "slug": "hkl-agios-ioannis-amnissos-2",
        "seq": 6,
        "cumKm": 2.934,
        "cumMin": 9.78
      },
      {
        "slug": "hkl-petroemporiki-2",
        "seq": 7,
        "cumKm": 3.46,
        "cumMin": 11.53
      },
      {
        "slug": "hkl-sminarchia-2",
        "seq": 8,
        "cumKm": 4.486,
        "cumMin": 14.95
      },
      {
        "slug": "hkl-anagenniseos",
        "seq": 9,
        "cumKm": 6.275,
        "cumMin": 20.92
      },
      {
        "slug": "hkl-seap-2",
        "seq": 10,
        "cumKm": 6.637,
        "cumMin": 22.12
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 11,
        "cumKm": 7.259,
        "cumMin": 24.2
      }
    ]
  },
  {
    "code": "9944",
    "lineCode": "HKL-01",
    "name": "(kleisto) - Elmepa - Aerodromio",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.281,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.604,
        "cumMin": 2.01
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.918,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.438,
        "cumMin": 4.79
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.867,
        "cumMin": 6.22
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.109,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.369,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.971,
        "cumMin": 9.9
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.241,
        "cumMin": 10.8
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 10,
        "cumKm": 3.68,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 11,
        "cumKm": 3.9,
        "cumMin": 13
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 12,
        "cumKm": 4.327,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 13,
        "cumKm": 4.902,
        "cumMin": 16.34
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 14,
        "cumKm": 5.091,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 15,
        "cumKm": 5.426,
        "cumMin": 18.09
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 16,
        "cumKm": 5.654,
        "cumMin": 18.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 17,
        "cumKm": 5.967,
        "cumMin": 19.89
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 18,
        "cumKm": 6.216,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 19,
        "cumKm": 6.42,
        "cumMin": 21.4
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 20,
        "cumKm": 6.764,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-evans",
        "seq": 21,
        "cumKm": 6.923,
        "cumMin": 23.08
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 22,
        "cumKm": 7.192,
        "cumMin": 23.97
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 23,
        "cumKm": 7.315,
        "cumMin": 24.38
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 24,
        "cumKm": 7.599,
        "cumMin": 25.33
      },
      {
        "slug": "hkl-analipsi",
        "seq": 25,
        "cumKm": 7.835,
        "cumMin": 26.12
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 26,
        "cumKm": 8.22,
        "cumMin": 27.4
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 27,
        "cumKm": 8.727,
        "cumMin": 29.09
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 28,
        "cumKm": 8.965,
        "cumMin": 29.88
      },
      {
        "slug": "hkl-poros-2",
        "seq": 29,
        "cumKm": 9.37,
        "cumMin": 31.23
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 30,
        "cumKm": 9.759,
        "cumMin": 32.53
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 31,
        "cumKm": 10.188,
        "cumMin": 33.96
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 32,
        "cumKm": 10.491,
        "cumMin": 34.97
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 33,
        "cumKm": 10.943,
        "cumMin": 36.48
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 34,
        "cumKm": 11.185,
        "cumMin": 37.28
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 35,
        "cumKm": 11.435,
        "cumMin": 38.12
      },
      {
        "slug": "hkl-seap-2",
        "seq": 36,
        "cumKm": 11.88,
        "cumMin": 39.6
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 37,
        "cumKm": 12.501,
        "cumMin": 41.67
      }
    ]
  },
  {
    "code": "20002",
    "lineCode": "HKL-02",
    "name": "Limani - Skalani (Si Ka)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-katsoulogiorgi-l-knossou-6",
        "seq": 6,
        "cumKm": 1.891,
        "cumMin": 6.3
      },
      {
        "slug": "hkl-tria-peuka-l-knossou-40",
        "seq": 7,
        "cumKm": 2.121,
        "cumMin": 7.07
      },
      {
        "slug": "hkl-agios-konstantinos",
        "seq": 8,
        "cumKm": 2.443,
        "cumMin": 8.14
      },
      {
        "slug": "hkl-pertselaki",
        "seq": 9,
        "cumKm": 2.816,
        "cumMin": 9.39
      },
      {
        "slug": "hkl-mpentevi",
        "seq": 10,
        "cumKm": 3.293,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-varelatzi-l-knossou-158",
        "seq": 11,
        "cumKm": 3.876,
        "cumMin": 12.92
      },
      {
        "slug": "hkl-kefalogianni-l-knossou-178",
        "seq": 12,
        "cumKm": 4.098,
        "cumMin": 13.66
      },
      {
        "slug": "hkl-avenue-knossou-zervonikola",
        "seq": 13,
        "cumKm": 4.388,
        "cumMin": 14.63
      },
      {
        "slug": "hkl-avenue-knossou-202-agios-ioannis",
        "seq": 14,
        "cumKm": 4.599,
        "cumMin": 15.33
      },
      {
        "slug": "hkl-l-knossou-226",
        "seq": 15,
        "cumKm": 4.939,
        "cumMin": 16.46
      },
      {
        "slug": "hkl-l-knossou-244",
        "seq": 16,
        "cumKm": 5.075,
        "cumMin": 16.92
      },
      {
        "slug": "hkl-l-knossou-270",
        "seq": 17,
        "cumKm": 5.359,
        "cumMin": 17.86
      },
      {
        "slug": "hkl-eforia-nea-alatsata",
        "seq": 18,
        "cumKm": 5.702,
        "cumMin": 19.01
      },
      {
        "slug": "hkl-venizelio-iospital",
        "seq": 19,
        "cumKm": 6.111,
        "cumMin": 20.37
      },
      {
        "slug": "hkl-ariadni",
        "seq": 20,
        "cumKm": 7.151,
        "cumMin": 23.84
      },
      {
        "slug": "hkl-knossos",
        "seq": 21,
        "cumKm": 7.477,
        "cumMin": 24.92
      },
      {
        "slug": "hkl-vlixia-1",
        "seq": 22,
        "cumKm": 7.933,
        "cumMin": 26.44
      },
      {
        "slug": "hkl-vl-xia-m",
        "seq": 23,
        "cumKm": 8.607,
        "cumMin": 28.69
      },
      {
        "slug": "hkl-agia-eirini",
        "seq": 24,
        "cumKm": 9.645,
        "cumMin": 32.15
      },
      {
        "slug": "hkl-spilia-2",
        "seq": 25,
        "cumKm": 10.086,
        "cumMin": 33.62
      },
      {
        "slug": "hkl-diakladosi-skalaniou",
        "seq": 26,
        "cumKm": 10.988,
        "cumMin": 36.63
      },
      {
        "slug": "hkl-skalani-1",
        "seq": 27,
        "cumKm": 11.378,
        "cumMin": 37.93
      },
      {
        "slug": "hkl-skalani-2-2",
        "seq": 28,
        "cumKm": 11.55,
        "cumMin": 38.5
      },
      {
        "slug": "hkl-skalani-3-2",
        "seq": 29,
        "cumKm": 12.065,
        "cumMin": 40.22
      },
      {
        "slug": "hkl-skalani-strofi-kato",
        "seq": 30,
        "cumKm": 12.539,
        "cumMin": 41.8
      }
    ]
  },
  {
    "code": "21001",
    "lineCode": "HKL-02",
    "name": "Limani - Knossos (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-katsoulogiorgi-l-knossou-6",
        "seq": 6,
        "cumKm": 1.891,
        "cumMin": 6.3
      },
      {
        "slug": "hkl-tria-peuka-l-knossou-40",
        "seq": 7,
        "cumKm": 2.121,
        "cumMin": 7.07
      },
      {
        "slug": "hkl-agios-konstantinos",
        "seq": 8,
        "cumKm": 2.443,
        "cumMin": 8.14
      },
      {
        "slug": "hkl-pertselaki",
        "seq": 9,
        "cumKm": 2.816,
        "cumMin": 9.39
      },
      {
        "slug": "hkl-mpentevi",
        "seq": 10,
        "cumKm": 3.293,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-varelatzi-l-knossou-158",
        "seq": 11,
        "cumKm": 3.876,
        "cumMin": 12.92
      },
      {
        "slug": "hkl-kefalogianni-l-knossou-178",
        "seq": 12,
        "cumKm": 4.098,
        "cumMin": 13.66
      },
      {
        "slug": "hkl-avenue-knossou-zervonikola",
        "seq": 13,
        "cumKm": 4.388,
        "cumMin": 14.63
      },
      {
        "slug": "hkl-avenue-knossou-202-agios-ioannis",
        "seq": 14,
        "cumKm": 4.599,
        "cumMin": 15.33
      },
      {
        "slug": "hkl-l-knossou-226",
        "seq": 15,
        "cumKm": 4.939,
        "cumMin": 16.46
      },
      {
        "slug": "hkl-l-knossou-244",
        "seq": 16,
        "cumKm": 5.075,
        "cumMin": 16.92
      },
      {
        "slug": "hkl-l-knossou-270",
        "seq": 17,
        "cumKm": 5.359,
        "cumMin": 17.86
      },
      {
        "slug": "hkl-eforia-nea-alatsata",
        "seq": 18,
        "cumKm": 5.702,
        "cumMin": 19.01
      },
      {
        "slug": "hkl-venizelio-iospital",
        "seq": 19,
        "cumKm": 6.111,
        "cumMin": 20.37
      },
      {
        "slug": "hkl-ariadni",
        "seq": 20,
        "cumKm": 7.151,
        "cumMin": 23.84
      },
      {
        "slug": "hkl-knossos",
        "seq": 21,
        "cumKm": 7.477,
        "cumMin": 24.92
      }
    ]
  },
  {
    "code": "21002",
    "lineCode": "HKL-02",
    "name": "Limani - Skalani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-katsoulogiorgi-l-knossou-6",
        "seq": 6,
        "cumKm": 1.891,
        "cumMin": 6.3
      },
      {
        "slug": "hkl-tria-peuka-l-knossou-40",
        "seq": 7,
        "cumKm": 2.121,
        "cumMin": 7.07
      },
      {
        "slug": "hkl-agios-konstantinos",
        "seq": 8,
        "cumKm": 2.443,
        "cumMin": 8.14
      },
      {
        "slug": "hkl-pertselaki",
        "seq": 9,
        "cumKm": 2.816,
        "cumMin": 9.39
      },
      {
        "slug": "hkl-mpentevi",
        "seq": 10,
        "cumKm": 3.293,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-varelatzi-l-knossou-158",
        "seq": 11,
        "cumKm": 3.876,
        "cumMin": 12.92
      },
      {
        "slug": "hkl-kefalogianni-l-knossou-178",
        "seq": 12,
        "cumKm": 4.098,
        "cumMin": 13.66
      },
      {
        "slug": "hkl-avenue-knossou-zervonikola",
        "seq": 13,
        "cumKm": 4.388,
        "cumMin": 14.63
      },
      {
        "slug": "hkl-avenue-knossou-202-agios-ioannis",
        "seq": 14,
        "cumKm": 4.599,
        "cumMin": 15.33
      },
      {
        "slug": "hkl-l-knossou-226",
        "seq": 15,
        "cumKm": 4.939,
        "cumMin": 16.46
      },
      {
        "slug": "hkl-l-knossou-244",
        "seq": 16,
        "cumKm": 5.075,
        "cumMin": 16.92
      },
      {
        "slug": "hkl-l-knossou-270",
        "seq": 17,
        "cumKm": 5.359,
        "cumMin": 17.86
      },
      {
        "slug": "hkl-eforia-nea-alatsata",
        "seq": 18,
        "cumKm": 5.702,
        "cumMin": 19.01
      },
      {
        "slug": "hkl-venizelio-iospital",
        "seq": 19,
        "cumKm": 6.111,
        "cumMin": 20.37
      },
      {
        "slug": "hkl-ariadni",
        "seq": 20,
        "cumKm": 7.151,
        "cumMin": 23.84
      },
      {
        "slug": "hkl-knossos",
        "seq": 21,
        "cumKm": 7.477,
        "cumMin": 24.92
      },
      {
        "slug": "hkl-vlixia-1",
        "seq": 22,
        "cumKm": 7.933,
        "cumMin": 26.44
      },
      {
        "slug": "hkl-vl-xia-m",
        "seq": 23,
        "cumKm": 8.607,
        "cumMin": 28.69
      },
      {
        "slug": "hkl-agia-eirini",
        "seq": 24,
        "cumKm": 9.645,
        "cumMin": 32.15
      },
      {
        "slug": "hkl-spilia-2",
        "seq": 25,
        "cumKm": 10.086,
        "cumMin": 33.62
      },
      {
        "slug": "hkl-diakladosi-skalaniou",
        "seq": 26,
        "cumKm": 10.988,
        "cumMin": 36.63
      },
      {
        "slug": "hkl-skalani-1",
        "seq": 27,
        "cumKm": 11.378,
        "cumMin": 37.93
      },
      {
        "slug": "hkl-skalani-2-2",
        "seq": 28,
        "cumKm": 11.55,
        "cumMin": 38.5
      },
      {
        "slug": "hkl-skalani-3-2",
        "seq": 29,
        "cumKm": 12.065,
        "cumMin": 40.22
      },
      {
        "slug": "hkl-skalani-kato",
        "seq": 30,
        "cumKm": 12.517,
        "cumMin": 41.72
      },
      {
        "slug": "hkl-ts-skalani",
        "seq": 31,
        "cumKm": 12.754,
        "cumMin": 42.51
      }
    ]
  },
  {
    "code": "21003",
    "lineCode": "HKL-03",
    "name": "Limani - Fortetsa (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-katsoulogiorgi-l-knossou-6",
        "seq": 6,
        "cumKm": 1.891,
        "cumMin": 6.3
      },
      {
        "slug": "hkl-tria-peuka-l-knossou-40",
        "seq": 7,
        "cumKm": 2.121,
        "cumMin": 7.07
      },
      {
        "slug": "hkl-agios-konstantinos",
        "seq": 8,
        "cumKm": 2.443,
        "cumMin": 8.14
      },
      {
        "slug": "hkl-pertselaki",
        "seq": 9,
        "cumKm": 2.816,
        "cumMin": 9.39
      },
      {
        "slug": "hkl-mpentevi",
        "seq": 10,
        "cumKm": 3.293,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-varelatzi-l-knossou-158",
        "seq": 11,
        "cumKm": 3.876,
        "cumMin": 12.92
      },
      {
        "slug": "hkl-kefalogianni-l-knossou-178",
        "seq": 12,
        "cumKm": 4.098,
        "cumMin": 13.66
      },
      {
        "slug": "hkl-avenue-knossou-zervonikola",
        "seq": 13,
        "cumKm": 4.388,
        "cumMin": 14.63
      },
      {
        "slug": "hkl-avenue-knossou-202-agios-ioannis",
        "seq": 14,
        "cumKm": 4.599,
        "cumMin": 15.33
      },
      {
        "slug": "hkl-l-knossou-226",
        "seq": 15,
        "cumKm": 4.939,
        "cumMin": 16.46
      },
      {
        "slug": "hkl-l-knossou-244",
        "seq": 16,
        "cumKm": 5.075,
        "cumMin": 16.92
      },
      {
        "slug": "hkl-l-knossou-270",
        "seq": 17,
        "cumKm": 5.359,
        "cumMin": 17.86
      },
      {
        "slug": "hkl-eforia-nea-alatsata",
        "seq": 18,
        "cumKm": 5.702,
        "cumMin": 19.01
      },
      {
        "slug": "hkl-venizelio-iospital-fortetsa",
        "seq": 19,
        "cumKm": 6.093,
        "cumMin": 20.31
      },
      {
        "slug": "hkl-polyneikous",
        "seq": 20,
        "cumKm": 6.349,
        "cumMin": 21.16
      },
      {
        "slug": "hkl-ippokratous",
        "seq": 21,
        "cumKm": 6.56,
        "cumMin": 21.87
      },
      {
        "slug": "hkl-ts-fortetsas",
        "seq": 22,
        "cumKm": 6.952,
        "cumMin": 23.17
      }
    ]
  },
  {
    "code": "20073",
    "lineCode": "HKL-04",
    "name": "Limani - Mastampa - Mesampelies",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-andrea-papandreou-rolen",
        "seq": 6,
        "cumKm": 1.932,
        "cumMin": 6.44
      },
      {
        "slug": "hkl-gefyraki-andrea-papandreou-46",
        "seq": 7,
        "cumKm": 2.234,
        "cumMin": 7.45
      },
      {
        "slug": "hkl-romantiki-gonia",
        "seq": 8,
        "cumKm": 2.482,
        "cumMin": 8.27
      },
      {
        "slug": "hkl-square-ni-as",
        "seq": 9,
        "cumKm": 2.783,
        "cumMin": 9.28
      },
      {
        "slug": "hkl-andrea-papandreou-126",
        "seq": 10,
        "cumKm": 2.951,
        "cumMin": 9.84
      },
      {
        "slug": "hkl-atlantidos-45",
        "seq": 11,
        "cumKm": 3.212,
        "cumMin": 10.71
      },
      {
        "slug": "hkl-atlantidos-33",
        "seq": 12,
        "cumKm": 3.384,
        "cumMin": 11.28
      },
      {
        "slug": "hkl-panagitsa",
        "seq": 13,
        "cumKm": 3.753,
        "cumMin": 12.51
      },
      {
        "slug": "hkl-ieroloxiton-76-daskalaki",
        "seq": 14,
        "cumKm": 3.976,
        "cumMin": 13.25
      },
      {
        "slug": "hkl-dialinomixali",
        "seq": 15,
        "cumKm": 4.219,
        "cumMin": 14.06
      },
      {
        "slug": "hkl-errikou-ntynan-dexamenes",
        "seq": 16,
        "cumKm": 4.444,
        "cumMin": 14.81
      },
      {
        "slug": "hkl-ts-square-sinani",
        "seq": 17,
        "cumKm": 4.818,
        "cumMin": 16.06
      },
      {
        "slug": "hkl-oulof-palme-28",
        "seq": 18,
        "cumKm": 5.165,
        "cumMin": 17.22
      },
      {
        "slug": "hkl-oulof-palme-52",
        "seq": 19,
        "cumKm": 5.418,
        "cumMin": 18.06
      },
      {
        "slug": "hkl-chrysovalantou",
        "seq": 20,
        "cumKm": 5.612,
        "cumMin": 18.71
      },
      {
        "slug": "hkl-oulof-palme-102",
        "seq": 21,
        "cumKm": 6.009,
        "cumMin": 20.03
      },
      {
        "slug": "hkl-oulof-palme-134",
        "seq": 22,
        "cumKm": 6.471,
        "cumMin": 21.57
      },
      {
        "slug": "hkl-oulof-palme-158",
        "seq": 23,
        "cumKm": 6.842,
        "cumMin": 22.81
      },
      {
        "slug": "hkl-ts-mesampelies",
        "seq": 24,
        "cumKm": 7.096,
        "cumMin": 23.65
      }
    ]
  },
  {
    "code": "21006",
    "lineCode": "HKL-04",
    "name": "Limani - Mastampa",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-andrea-papandreou-rolen",
        "seq": 6,
        "cumKm": 1.932,
        "cumMin": 6.44
      },
      {
        "slug": "hkl-gefyraki-andrea-papandreou-46",
        "seq": 7,
        "cumKm": 2.234,
        "cumMin": 7.45
      },
      {
        "slug": "hkl-romantiki-gonia",
        "seq": 8,
        "cumKm": 2.482,
        "cumMin": 8.27
      },
      {
        "slug": "hkl-square-ni-as",
        "seq": 9,
        "cumKm": 2.783,
        "cumMin": 9.28
      },
      {
        "slug": "hkl-andrea-papandreou-126",
        "seq": 10,
        "cumKm": 2.951,
        "cumMin": 9.84
      },
      {
        "slug": "hkl-atlantidos-45",
        "seq": 11,
        "cumKm": 3.212,
        "cumMin": 10.71
      },
      {
        "slug": "hkl-atlantidos-33",
        "seq": 12,
        "cumKm": 3.384,
        "cumMin": 11.28
      },
      {
        "slug": "hkl-panagitsa",
        "seq": 13,
        "cumKm": 3.753,
        "cumMin": 12.51
      },
      {
        "slug": "hkl-ieroloxiton-76-daskalaki",
        "seq": 14,
        "cumKm": 3.976,
        "cumMin": 13.25
      },
      {
        "slug": "hkl-dialinomixali",
        "seq": 15,
        "cumKm": 4.219,
        "cumMin": 14.06
      },
      {
        "slug": "hkl-errikou-ntynan-dexamenes",
        "seq": 16,
        "cumKm": 4.444,
        "cumMin": 14.81
      },
      {
        "slug": "hkl-square-sinani",
        "seq": 17,
        "cumKm": 4.828,
        "cumMin": 16.09
      }
    ]
  },
  {
    "code": "21007",
    "lineCode": "HKL-04",
    "name": "Limani - Mesampelies - APO MEG Alexandroy (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 6,
        "cumKm": 1.624,
        "cumMin": 5.41
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 7,
        "cumKm": 1.909,
        "cumMin": 6.36
      },
      {
        "slug": "hkl-ergatiko-kentro",
        "seq": 8,
        "cumKm": 2.143,
        "cumMin": 7.14
      },
      {
        "slug": "hkl-dimokratias-24",
        "seq": 9,
        "cumKm": 2.462,
        "cumMin": 8.21
      },
      {
        "slug": "hkl-agios-konstantinos",
        "seq": 10,
        "cumKm": 2.86,
        "cumMin": 9.53
      },
      {
        "slug": "hkl-papanastasiou-92",
        "seq": 11,
        "cumKm": 3.208,
        "cumMin": 10.69
      },
      {
        "slug": "hkl-papanastasiou-34",
        "seq": 12,
        "cumKm": 3.52,
        "cumMin": 11.73
      },
      {
        "slug": "hkl-megalou-alexandrou-165",
        "seq": 13,
        "cumKm": 3.795,
        "cumMin": 12.65
      },
      {
        "slug": "hkl-megalou-alexandrou-147",
        "seq": 14,
        "cumKm": 4.051,
        "cumMin": 13.5
      },
      {
        "slug": "hkl-megalou-alexandrou-120",
        "seq": 15,
        "cumKm": 4.354,
        "cumMin": 14.51
      },
      {
        "slug": "hkl-megalou-alexandrou-105",
        "seq": 16,
        "cumKm": 4.559,
        "cumMin": 15.2
      },
      {
        "slug": "hkl-megalou-alexandrou-85",
        "seq": 17,
        "cumKm": 4.884,
        "cumMin": 16.28
      },
      {
        "slug": "hkl-dialinomixali",
        "seq": 18,
        "cumKm": 5.034,
        "cumMin": 16.78
      },
      {
        "slug": "hkl-errikou-ntynan-dexamenes",
        "seq": 19,
        "cumKm": 5.258,
        "cumMin": 17.53
      },
      {
        "slug": "hkl-ts-square-sinani",
        "seq": 20,
        "cumKm": 5.632,
        "cumMin": 18.77
      },
      {
        "slug": "hkl-oulof-palme-28",
        "seq": 21,
        "cumKm": 5.979,
        "cumMin": 19.93
      },
      {
        "slug": "hkl-oulof-palme-52",
        "seq": 22,
        "cumKm": 6.232,
        "cumMin": 20.77
      },
      {
        "slug": "hkl-chrysovalantou",
        "seq": 23,
        "cumKm": 6.427,
        "cumMin": 21.42
      },
      {
        "slug": "hkl-oulof-palme-102",
        "seq": 24,
        "cumKm": 6.824,
        "cumMin": 22.75
      },
      {
        "slug": "hkl-oulof-palme-134",
        "seq": 25,
        "cumKm": 7.285,
        "cumMin": 24.28
      },
      {
        "slug": "hkl-oulof-palme-158",
        "seq": 26,
        "cumKm": 7.657,
        "cumMin": 25.52
      },
      {
        "slug": "hkl-ts-mesampelies",
        "seq": 27,
        "cumKm": 7.911,
        "cumMin": 26.37
      }
    ]
  },
  {
    "code": "1008",
    "lineCode": "HKL-05",
    "name": "Aerodromio - Dimitrioy- ThERISSOS - Aerodromio",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-florinis",
        "seq": 8,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-konitsis",
        "seq": 9,
        "cumKm": 3.439,
        "cumMin": 11.46
      },
      {
        "slug": "hkl-agios-georgios",
        "seq": 10,
        "cumKm": 3.582,
        "cumMin": 11.94
      },
      {
        "slug": "hkl-komninon",
        "seq": 11,
        "cumKm": 3.766,
        "cumMin": 12.55
      },
      {
        "slug": "hkl-miltiadou",
        "seq": 12,
        "cumKm": 4.103,
        "cumMin": 13.68
      },
      {
        "slug": "hkl-emmanouil-mpantouva-2",
        "seq": 13,
        "cumKm": 4.218,
        "cumMin": 14.06
      },
      {
        "slug": "hkl-serron",
        "seq": 14,
        "cumKm": 4.432,
        "cumMin": 14.77
      },
      {
        "slug": "hkl-odysseos",
        "seq": 15,
        "cumKm": 4.608,
        "cumMin": 15.36
      },
      {
        "slug": "hkl-agia-anna",
        "seq": 16,
        "cumKm": 4.896,
        "cumMin": 16.32
      },
      {
        "slug": "hkl-krintsas",
        "seq": 17,
        "cumKm": 5.258,
        "cumMin": 17.53
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 18,
        "cumKm": 5.514,
        "cumMin": 18.38
      },
      {
        "slug": "hkl-analipsi",
        "seq": 19,
        "cumKm": 5.846,
        "cumMin": 19.49
      },
      {
        "slug": "hkl-averof",
        "seq": 20,
        "cumKm": 6.217,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 21,
        "cumKm": 6.626,
        "cumMin": 22.09
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 22,
        "cumKm": 6.982,
        "cumMin": 23.27
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 23,
        "cumKm": 7.18,
        "cumMin": 23.93
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 24,
        "cumKm": 7.501,
        "cumMin": 25
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 25,
        "cumKm": 7.751,
        "cumMin": 25.84
      },
      {
        "slug": "hkl-tierissou-16",
        "seq": 26,
        "cumKm": 7.972,
        "cumMin": 26.57
      },
      {
        "slug": "hkl-tierissou-38",
        "seq": 27,
        "cumKm": 8.185,
        "cumMin": 27.28
      },
      {
        "slug": "hkl-tierissou-84",
        "seq": 28,
        "cumKm": 8.505,
        "cumMin": 28.35
      },
      {
        "slug": "hkl-tierissou-110",
        "seq": 29,
        "cumKm": 8.706,
        "cumMin": 29.02
      },
      {
        "slug": "hkl-ts-tierissos",
        "seq": 30,
        "cumKm": 8.944,
        "cumMin": 29.81
      },
      {
        "slug": "hkl-kondylaki-101",
        "seq": 31,
        "cumKm": 9.083,
        "cumMin": 30.28
      },
      {
        "slug": "hkl-kondylaki-77",
        "seq": 32,
        "cumKm": 9.332,
        "cumMin": 31.11
      },
      {
        "slug": "hkl-kondylaki-27",
        "seq": 33,
        "cumKm": 9.654,
        "cumMin": 32.18
      },
      {
        "slug": "hkl-m-merkouri",
        "seq": 34,
        "cumKm": 9.924,
        "cumMin": 33.08
      },
      {
        "slug": "hkl-pananeio",
        "seq": 35,
        "cumKm": 10.349,
        "cumMin": 34.5
      },
      {
        "slug": "hkl-chanioporta-nik-plastira",
        "seq": 36,
        "cumKm": 10.736,
        "cumMin": 35.79
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 37,
        "cumKm": 10.929,
        "cumMin": 36.43
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 38,
        "cumKm": 11.177,
        "cumMin": 37.26
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 39,
        "cumKm": 11.381,
        "cumMin": 37.94
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 40,
        "cumKm": 11.726,
        "cumMin": 39.09
      },
      {
        "slug": "hkl-evans",
        "seq": 41,
        "cumKm": 11.885,
        "cumMin": 39.62
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 42,
        "cumKm": 12.215,
        "cumMin": 40.72
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 43,
        "cumKm": 12.499,
        "cumMin": 41.66
      },
      {
        "slug": "hkl-ergatiko-kentro",
        "seq": 44,
        "cumKm": 12.734,
        "cumMin": 42.45
      },
      {
        "slug": "hkl-georgiou-papandreou",
        "seq": 45,
        "cumKm": 12.921,
        "cumMin": 43.07
      },
      {
        "slug": "hkl-agia-anna-2",
        "seq": 46,
        "cumKm": 13.165,
        "cumMin": 43.88
      },
      {
        "slug": "hkl-odysseos-2",
        "seq": 47,
        "cumKm": 13.54,
        "cumMin": 45.13
      },
      {
        "slug": "hkl-emmanouil-mpantouva-57",
        "seq": 48,
        "cumKm": 13.854,
        "cumMin": 46.18
      },
      {
        "slug": "hkl-geronomaki",
        "seq": 49,
        "cumKm": 14.027,
        "cumMin": 46.76
      },
      {
        "slug": "hkl-komninon-73",
        "seq": 50,
        "cumKm": 14.248,
        "cumMin": 47.49
      },
      {
        "slug": "hkl-komninon-29",
        "seq": 51,
        "cumKm": 14.479,
        "cumMin": 48.26
      },
      {
        "slug": "hkl-agios-georgios-2",
        "seq": 52,
        "cumKm": 14.658,
        "cumMin": 48.86
      },
      {
        "slug": "hkl-konitsis-2",
        "seq": 53,
        "cumKm": 14.926,
        "cumMin": 49.75
      },
      {
        "slug": "hkl-lyktou",
        "seq": 54,
        "cumKm": 15.142,
        "cumMin": 50.47
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 55,
        "cumKm": 15.418,
        "cumMin": 51.39
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 56,
        "cumKm": 15.847,
        "cumMin": 52.82
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 57,
        "cumKm": 16.15,
        "cumMin": 53.83
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 58,
        "cumKm": 16.603,
        "cumMin": 55.34
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 59,
        "cumKm": 16.845,
        "cumMin": 56.15
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 60,
        "cumKm": 17.095,
        "cumMin": 56.98
      },
      {
        "slug": "hkl-seap-2",
        "seq": 61,
        "cumKm": 17.539,
        "cumMin": 58.46
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 62,
        "cumKm": 18.161,
        "cumMin": 60.54
      }
    ]
  },
  {
    "code": "1110",
    "lineCode": "HKL-05",
    "name": "AERODROMIO-DIMITRIOY-ThERISSOS-AERODROMIO (savvato)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-florinis",
        "seq": 8,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-konitsis",
        "seq": 9,
        "cumKm": 3.439,
        "cumMin": 11.46
      },
      {
        "slug": "hkl-agios-georgios",
        "seq": 10,
        "cumKm": 3.582,
        "cumMin": 11.94
      },
      {
        "slug": "hkl-komninon",
        "seq": 11,
        "cumKm": 3.766,
        "cumMin": 12.55
      },
      {
        "slug": "hkl-miltiadou",
        "seq": 12,
        "cumKm": 4.103,
        "cumMin": 13.68
      },
      {
        "slug": "hkl-emmanouil-mpantouva-2",
        "seq": 13,
        "cumKm": 4.218,
        "cumMin": 14.06
      },
      {
        "slug": "hkl-monis-gouvernetou-2",
        "seq": 14,
        "cumKm": 4.399,
        "cumMin": 14.66
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 15,
        "cumKm": 4.933,
        "cumMin": 16.44
      },
      {
        "slug": "hkl-analipsi",
        "seq": 16,
        "cumKm": 5.265,
        "cumMin": 17.55
      },
      {
        "slug": "hkl-averof",
        "seq": 17,
        "cumKm": 5.636,
        "cumMin": 18.79
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 18,
        "cumKm": 6.045,
        "cumMin": 20.15
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 19,
        "cumKm": 6.401,
        "cumMin": 21.34
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 20,
        "cumKm": 6.599,
        "cumMin": 22
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 21,
        "cumKm": 6.92,
        "cumMin": 23.07
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 22,
        "cumKm": 7.17,
        "cumMin": 23.9
      },
      {
        "slug": "hkl-tierissou-16",
        "seq": 23,
        "cumKm": 7.391,
        "cumMin": 24.64
      },
      {
        "slug": "hkl-tierissou-38",
        "seq": 24,
        "cumKm": 7.604,
        "cumMin": 25.35
      },
      {
        "slug": "hkl-tierissou-84",
        "seq": 25,
        "cumKm": 7.924,
        "cumMin": 26.41
      },
      {
        "slug": "hkl-tierissou-110",
        "seq": 26,
        "cumKm": 8.125,
        "cumMin": 27.08
      },
      {
        "slug": "hkl-ts-tierissos",
        "seq": 27,
        "cumKm": 8.363,
        "cumMin": 27.88
      },
      {
        "slug": "hkl-kondylaki-101",
        "seq": 28,
        "cumKm": 8.502,
        "cumMin": 28.34
      },
      {
        "slug": "hkl-kondylaki-77",
        "seq": 29,
        "cumKm": 8.751,
        "cumMin": 29.17
      },
      {
        "slug": "hkl-kondylaki-27",
        "seq": 30,
        "cumKm": 9.073,
        "cumMin": 30.24
      },
      {
        "slug": "hkl-m-merkouri",
        "seq": 31,
        "cumKm": 9.343,
        "cumMin": 31.14
      },
      {
        "slug": "hkl-pananeio",
        "seq": 32,
        "cumKm": 9.768,
        "cumMin": 32.56
      },
      {
        "slug": "hkl-chanioporta-nik-plastira",
        "seq": 33,
        "cumKm": 10.155,
        "cumMin": 33.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 34,
        "cumKm": 10.348,
        "cumMin": 34.49
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 35,
        "cumKm": 10.596,
        "cumMin": 35.32
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 36,
        "cumKm": 10.8,
        "cumMin": 36
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 37,
        "cumKm": 11.145,
        "cumMin": 37.15
      },
      {
        "slug": "hkl-evans",
        "seq": 38,
        "cumKm": 11.304,
        "cumMin": 37.68
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 39,
        "cumKm": 11.634,
        "cumMin": 38.78
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 40,
        "cumKm": 11.918,
        "cumMin": 39.73
      },
      {
        "slug": "hkl-geronymaki-titou-georgiadou",
        "seq": 41,
        "cumKm": 12.152,
        "cumMin": 40.51
      },
      {
        "slug": "hkl-geronomaki",
        "seq": 42,
        "cumKm": 12.935,
        "cumMin": 43.12
      },
      {
        "slug": "hkl-komninon-73",
        "seq": 43,
        "cumKm": 13.156,
        "cumMin": 43.85
      },
      {
        "slug": "hkl-komninon-29",
        "seq": 44,
        "cumKm": 13.386,
        "cumMin": 44.62
      },
      {
        "slug": "hkl-agios-georgios-2",
        "seq": 45,
        "cumKm": 13.566,
        "cumMin": 45.22
      },
      {
        "slug": "hkl-konitsis-2",
        "seq": 46,
        "cumKm": 13.834,
        "cumMin": 46.11
      },
      {
        "slug": "hkl-lyktou",
        "seq": 47,
        "cumKm": 14.05,
        "cumMin": 46.83
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 48,
        "cumKm": 14.325,
        "cumMin": 47.75
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 49,
        "cumKm": 14.755,
        "cumMin": 49.18
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 50,
        "cumKm": 15.058,
        "cumMin": 50.19
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 51,
        "cumKm": 15.51,
        "cumMin": 51.7
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 52,
        "cumKm": 15.752,
        "cumMin": 52.51
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 53,
        "cumKm": 16.002,
        "cumMin": 53.34
      },
      {
        "slug": "hkl-seap-2",
        "seq": 54,
        "cumKm": 16.447,
        "cumMin": 54.82
      },
      {
        "slug": "hkl-ts-airport-returns",
        "seq": 55,
        "cumKm": 17.068,
        "cumMin": 56.89
      }
    ]
  },
  {
    "code": "21009",
    "lineCode": "HKL-06",
    "name": "Aerodromio - Ammoydara (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 23,
        "cumKm": 7.981,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 24,
        "cumKm": 8.28,
        "cumMin": 27.6
      },
      {
        "slug": "hkl-avenue-62-martyron-360",
        "seq": 25,
        "cumKm": 8.991,
        "cumMin": 29.97
      },
      {
        "slug": "hkl-avenue-62-martyron-369-pagkritio-stadio",
        "seq": 26,
        "cumKm": 9.305,
        "cumMin": 31.02
      },
      {
        "slug": "hkl-avenue-62-martyron-377-xeropotamos",
        "seq": 27,
        "cumKm": 9.59,
        "cumMin": 31.97
      },
      {
        "slug": "hkl-hotel-vanisko",
        "seq": 28,
        "cumKm": 10.049,
        "cumMin": 33.5
      },
      {
        "slug": "hkl-hotel-malena-akti-corali-2",
        "seq": 29,
        "cumKm": 10.425,
        "cumMin": 34.75
      },
      {
        "slug": "hkl-andrea-papandreou-56-vagia",
        "seq": 30,
        "cumKm": 10.943,
        "cumMin": 36.48
      },
      {
        "slug": "hkl-hotel-candia-maris",
        "seq": 31,
        "cumKm": 11.385,
        "cumMin": 37.95
      },
      {
        "slug": "hkl-hotel-creta-beach",
        "seq": 32,
        "cumKm": 11.851,
        "cumMin": 39.5
      },
      {
        "slug": "hkl-hotel-agapi-beach-hotel-marilena",
        "seq": 33,
        "cumKm": 12.094,
        "cumMin": 40.31
      },
      {
        "slug": "hkl-andrea-papandreou-86",
        "seq": 34,
        "cumKm": 12.384,
        "cumMin": 41.28
      },
      {
        "slug": "hkl-hotel-santa-marina",
        "seq": 35,
        "cumKm": 12.713,
        "cumMin": 42.38
      },
      {
        "slug": "hkl-technopolis-hotel-marirena",
        "seq": 36,
        "cumKm": 13.05,
        "cumMin": 43.5
      },
      {
        "slug": "hkl-petousis-hotel-roxani",
        "seq": 37,
        "cumKm": 13.262,
        "cumMin": 44.21
      },
      {
        "slug": "hkl-castro-hotel",
        "seq": 38,
        "cumKm": 13.588,
        "cumMin": 45.29
      },
      {
        "slug": "hkl-police-station-hotel-dolphin-bay",
        "seq": 39,
        "cumKm": 13.891,
        "cumMin": 46.3
      },
      {
        "slug": "hkl-hotel-amounda-vay",
        "seq": 40,
        "cumKm": 14.109,
        "cumMin": 47.03
      },
      {
        "slug": "hkl-hotel-poseidon",
        "seq": 41,
        "cumKm": 14.473,
        "cumMin": 48.24
      },
      {
        "slug": "hkl-hotel-apollonia",
        "seq": 42,
        "cumKm": 14.822,
        "cumMin": 49.41
      },
      {
        "slug": "hkl-hotel-akti-zeus",
        "seq": 43,
        "cumKm": 15.097,
        "cumMin": 50.32
      },
      {
        "slug": "hkl-ts-ammoudara",
        "seq": 44,
        "cumKm": 15.479,
        "cumMin": 51.6
      }
    ]
  },
  {
    "code": "20064",
    "lineCode": "HKL-07",
    "name": "Elmepa - Amnisso -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.281,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.604,
        "cumMin": 2.01
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.918,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.438,
        "cumMin": 4.79
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.867,
        "cumMin": 6.22
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.109,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.369,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.971,
        "cumMin": 9.9
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.241,
        "cumMin": 10.8
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 10,
        "cumKm": 3.68,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 11,
        "cumKm": 3.9,
        "cumMin": 13
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 12,
        "cumKm": 4.327,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 13,
        "cumKm": 4.902,
        "cumMin": 16.34
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 14,
        "cumKm": 5.091,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 15,
        "cumKm": 5.426,
        "cumMin": 18.09
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 16,
        "cumKm": 5.654,
        "cumMin": 18.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 17,
        "cumKm": 5.967,
        "cumMin": 19.89
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 18,
        "cumKm": 6.216,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 19,
        "cumKm": 6.42,
        "cumMin": 21.4
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 20,
        "cumKm": 6.764,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-evans",
        "seq": 21,
        "cumKm": 6.923,
        "cumMin": 23.08
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 22,
        "cumKm": 7.253,
        "cumMin": 24.18
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 23,
        "cumKm": 7.538,
        "cumMin": 25.13
      },
      {
        "slug": "hkl-analipsi",
        "seq": 24,
        "cumKm": 7.773,
        "cumMin": 25.91
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 25,
        "cumKm": 8.158,
        "cumMin": 27.19
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 26,
        "cumKm": 8.665,
        "cumMin": 28.88
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 27,
        "cumKm": 8.903,
        "cumMin": 29.68
      },
      {
        "slug": "hkl-poros-2",
        "seq": 28,
        "cumKm": 9.308,
        "cumMin": 31.03
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 29,
        "cumKm": 9.697,
        "cumMin": 32.32
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 30,
        "cumKm": 10.126,
        "cumMin": 33.75
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 31,
        "cumKm": 10.429,
        "cumMin": 34.76
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 32,
        "cumKm": 10.882,
        "cumMin": 36.27
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 33,
        "cumKm": 11.124,
        "cumMin": 37.08
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 34,
        "cumKm": 11.374,
        "cumMin": 37.91
      },
      {
        "slug": "hkl-anagenniseos-2",
        "seq": 35,
        "cumKm": 11.744,
        "cumMin": 39.15
      },
      {
        "slug": "hkl-police-station",
        "seq": 36,
        "cumKm": 12.077,
        "cumMin": 40.26
      },
      {
        "slug": "hkl-sminarchia",
        "seq": 37,
        "cumKm": 13.791,
        "cumMin": 45.97
      },
      {
        "slug": "hkl-petroemporiki",
        "seq": 38,
        "cumKm": 14.694,
        "cumMin": 48.98
      },
      {
        "slug": "hkl-agios-ioannis-amnissos",
        "seq": 39,
        "cumKm": 15.249,
        "cumMin": 50.83
      },
      {
        "slug": "hkl-agiou-alexandrou",
        "seq": 40,
        "cumKm": 15.75,
        "cumMin": 52.5
      },
      {
        "slug": "hkl-riding-academy-crete",
        "seq": 41,
        "cumKm": 16.439,
        "cumMin": 54.8
      },
      {
        "slug": "hkl-amnissos-paralia-karterou-karteros-beach-sports-center",
        "seq": 42,
        "cumKm": 16.81,
        "cumMin": 56.03
      },
      {
        "slug": "hkl-michail-archaggelou",
        "seq": 43,
        "cumKm": 17.356,
        "cumMin": 57.85
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou",
        "seq": 44,
        "cumKm": 17.848,
        "cumMin": 59.49
      },
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 45,
        "cumKm": 18.197,
        "cumMin": 60.66
      }
    ]
  },
  {
    "code": "21011",
    "lineCode": "HKL-07",
    "name": "Giofyro - Amnissos -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 1,
        "cumKm": 0.439,
        "cumMin": 1.46
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 2,
        "cumKm": 0.658,
        "cumMin": 2.19
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 3,
        "cumKm": 1.086,
        "cumMin": 3.62
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 4,
        "cumKm": 1.661,
        "cumMin": 5.54
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 5,
        "cumKm": 1.85,
        "cumMin": 6.17
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 6,
        "cumKm": 2.185,
        "cumMin": 7.28
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 7,
        "cumKm": 2.412,
        "cumMin": 8.04
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 8,
        "cumKm": 2.726,
        "cumMin": 9.09
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 9,
        "cumKm": 2.974,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 10,
        "cumKm": 3.178,
        "cumMin": 10.59
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 11,
        "cumKm": 3.523,
        "cumMin": 11.74
      },
      {
        "slug": "hkl-evans",
        "seq": 12,
        "cumKm": 3.682,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 13,
        "cumKm": 4.012,
        "cumMin": 13.37
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 14,
        "cumKm": 4.296,
        "cumMin": 14.32
      },
      {
        "slug": "hkl-analipsi",
        "seq": 15,
        "cumKm": 4.531,
        "cumMin": 15.1
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 16,
        "cumKm": 4.916,
        "cumMin": 16.39
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 17,
        "cumKm": 5.423,
        "cumMin": 18.08
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 18,
        "cumKm": 5.661,
        "cumMin": 18.87
      },
      {
        "slug": "hkl-poros-2",
        "seq": 19,
        "cumKm": 6.067,
        "cumMin": 20.22
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 20,
        "cumKm": 6.455,
        "cumMin": 21.52
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 21,
        "cumKm": 6.884,
        "cumMin": 22.95
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 22,
        "cumKm": 7.187,
        "cumMin": 23.96
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 23,
        "cumKm": 7.64,
        "cumMin": 25.47
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 24,
        "cumKm": 7.882,
        "cumMin": 26.27
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 25,
        "cumKm": 8.132,
        "cumMin": 27.11
      },
      {
        "slug": "hkl-anagenniseos-2",
        "seq": 26,
        "cumKm": 8.503,
        "cumMin": 28.34
      },
      {
        "slug": "hkl-police-station",
        "seq": 27,
        "cumKm": 8.836,
        "cumMin": 29.45
      },
      {
        "slug": "hkl-sminarchia",
        "seq": 28,
        "cumKm": 10.55,
        "cumMin": 35.17
      },
      {
        "slug": "hkl-petroemporiki",
        "seq": 29,
        "cumKm": 11.452,
        "cumMin": 38.17
      },
      {
        "slug": "hkl-agios-ioannis-amnissos",
        "seq": 30,
        "cumKm": 12.008,
        "cumMin": 40.03
      },
      {
        "slug": "hkl-agiou-alexandrou",
        "seq": 31,
        "cumKm": 12.508,
        "cumMin": 41.69
      },
      {
        "slug": "hkl-riding-academy-crete",
        "seq": 32,
        "cumKm": 13.198,
        "cumMin": 43.99
      },
      {
        "slug": "hkl-amnissos-paralia-karterou-karteros-beach-sports-center",
        "seq": 33,
        "cumKm": 13.569,
        "cumMin": 45.23
      },
      {
        "slug": "hkl-michail-archaggelou",
        "seq": 34,
        "cumKm": 14.115,
        "cumMin": 47.05
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou",
        "seq": 35,
        "cumKm": 14.607,
        "cumMin": 48.69
      },
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 36,
        "cumKm": 14.955,
        "cumMin": 49.85
      }
    ]
  },
  {
    "code": "21012",
    "lineCode": "HKL-07",
    "name": "Giofyro - Prassa Amnissos (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 1,
        "cumKm": 0.439,
        "cumMin": 1.46
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 2,
        "cumKm": 0.658,
        "cumMin": 2.19
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 3,
        "cumKm": 1.086,
        "cumMin": 3.62
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 4,
        "cumKm": 1.661,
        "cumMin": 5.54
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 5,
        "cumKm": 1.85,
        "cumMin": 6.17
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 6,
        "cumKm": 2.185,
        "cumMin": 7.28
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 7,
        "cumKm": 2.412,
        "cumMin": 8.04
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 8,
        "cumKm": 2.726,
        "cumMin": 9.09
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 9,
        "cumKm": 2.974,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 10,
        "cumKm": 3.178,
        "cumMin": 10.59
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 11,
        "cumKm": 3.523,
        "cumMin": 11.74
      },
      {
        "slug": "hkl-evans",
        "seq": 12,
        "cumKm": 3.682,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 13,
        "cumKm": 4.012,
        "cumMin": 13.37
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 14,
        "cumKm": 4.296,
        "cumMin": 14.32
      },
      {
        "slug": "hkl-analipsi",
        "seq": 15,
        "cumKm": 4.531,
        "cumMin": 15.1
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 16,
        "cumKm": 4.916,
        "cumMin": 16.39
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 17,
        "cumKm": 5.423,
        "cumMin": 18.08
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 18,
        "cumKm": 5.661,
        "cumMin": 18.87
      },
      {
        "slug": "hkl-poros-2",
        "seq": 19,
        "cumKm": 6.067,
        "cumMin": 20.22
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 20,
        "cumKm": 6.455,
        "cumMin": 21.52
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 21,
        "cumKm": 6.884,
        "cumMin": 22.95
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 22,
        "cumKm": 7.187,
        "cumMin": 23.96
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 23,
        "cumKm": 7.64,
        "cumMin": 25.47
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 24,
        "cumKm": 7.882,
        "cumMin": 26.27
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 25,
        "cumKm": 8.132,
        "cumMin": 27.11
      },
      {
        "slug": "hkl-anagenniseos-2",
        "seq": 26,
        "cumKm": 8.503,
        "cumMin": 28.34
      },
      {
        "slug": "hkl-police-station-prassa",
        "seq": 27,
        "cumKm": 9.093,
        "cumMin": 30.31
      },
      {
        "slug": "hkl-prassa",
        "seq": 28,
        "cumKm": 12.575,
        "cumMin": 41.92
      },
      {
        "slug": "hkl-prassa-2",
        "seq": 29,
        "cumKm": 13.69,
        "cumMin": 45.63
      },
      {
        "slug": "hkl-agiou-alexandrou",
        "seq": 30,
        "cumKm": 14.946,
        "cumMin": 49.82
      },
      {
        "slug": "hkl-riding-academy-crete",
        "seq": 31,
        "cumKm": 15.636,
        "cumMin": 52.12
      },
      {
        "slug": "hkl-amnissos-paralia-karterou-karteros-beach-sports-center",
        "seq": 32,
        "cumKm": 16.007,
        "cumMin": 53.36
      },
      {
        "slug": "hkl-michail-archaggelou",
        "seq": 33,
        "cumKm": 16.553,
        "cumMin": 55.18
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou",
        "seq": 34,
        "cumKm": 17.045,
        "cumMin": 56.82
      },
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 35,
        "cumKm": 17.393,
        "cumMin": 57.98
      }
    ]
  },
  {
    "code": "30096",
    "lineCode": "HKL-07",
    "name": "Pagni - Amnisso",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-pagni-hospital",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-diastaurosi-staurakia",
        "seq": 1,
        "cumKm": 0.333,
        "cumMin": 1.11
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 2,
        "cumKm": 0.893,
        "cumMin": 2.98
      },
      {
        "slug": "hkl-university-of-crete",
        "seq": 3,
        "cumKm": 1.507,
        "cumMin": 5.02
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 4,
        "cumKm": 1.985,
        "cumMin": 6.62
      },
      {
        "slug": "hkl-oikismos-agias-paraskeuis",
        "seq": 5,
        "cumKm": 2.532,
        "cumMin": 8.44
      },
      {
        "slug": "hkl-aretousas-2",
        "seq": 6,
        "cumKm": 3.156,
        "cumMin": 10.52
      },
      {
        "slug": "hkl-agioi-theodoroi-2",
        "seq": 7,
        "cumKm": 3.795,
        "cumMin": 12.65
      },
      {
        "slug": "hkl-parasyri",
        "seq": 8,
        "cumKm": 4.179,
        "cumMin": 13.93
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 9,
        "cumKm": 4.501,
        "cumMin": 15
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 10,
        "cumKm": 4.696,
        "cumMin": 15.65
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 11,
        "cumKm": 5.318,
        "cumMin": 17.73
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 12,
        "cumKm": 5.794,
        "cumMin": 19.31
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 13,
        "cumKm": 6.395,
        "cumMin": 21.32
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 14,
        "cumKm": 6.666,
        "cumMin": 22.22
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 15,
        "cumKm": 7.105,
        "cumMin": 23.68
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 16,
        "cumKm": 7.324,
        "cumMin": 24.41
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 17,
        "cumKm": 7.752,
        "cumMin": 25.84
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 18,
        "cumKm": 8.327,
        "cumMin": 27.76
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 19,
        "cumKm": 8.516,
        "cumMin": 28.39
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 20,
        "cumKm": 8.851,
        "cumMin": 29.5
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 21,
        "cumKm": 9.078,
        "cumMin": 30.26
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 22,
        "cumKm": 9.392,
        "cumMin": 31.31
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 23,
        "cumKm": 9.64,
        "cumMin": 32.13
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 24,
        "cumKm": 9.844,
        "cumMin": 32.81
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 25,
        "cumKm": 10.189,
        "cumMin": 33.96
      },
      {
        "slug": "hkl-evans",
        "seq": 26,
        "cumKm": 10.348,
        "cumMin": 34.49
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 27,
        "cumKm": 10.678,
        "cumMin": 35.59
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 28,
        "cumKm": 10.962,
        "cumMin": 36.54
      },
      {
        "slug": "hkl-analipsi",
        "seq": 29,
        "cumKm": 11.197,
        "cumMin": 37.32
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 30,
        "cumKm": 11.582,
        "cumMin": 38.61
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 31,
        "cumKm": 12.089,
        "cumMin": 40.3
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 32,
        "cumKm": 12.327,
        "cumMin": 41.09
      },
      {
        "slug": "hkl-poros-2",
        "seq": 33,
        "cumKm": 12.733,
        "cumMin": 42.44
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 34,
        "cumKm": 13.121,
        "cumMin": 43.74
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 35,
        "cumKm": 13.55,
        "cumMin": 45.17
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 36,
        "cumKm": 13.853,
        "cumMin": 46.18
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 37,
        "cumKm": 14.306,
        "cumMin": 47.69
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 38,
        "cumKm": 14.548,
        "cumMin": 48.49
      },
      {
        "slug": "hkl-anagenniseos-2",
        "seq": 39,
        "cumKm": 15.126,
        "cumMin": 50.42
      },
      {
        "slug": "hkl-police-station",
        "seq": 40,
        "cumKm": 15.459,
        "cumMin": 51.53
      },
      {
        "slug": "hkl-sminarchia",
        "seq": 41,
        "cumKm": 17.173,
        "cumMin": 57.24
      },
      {
        "slug": "hkl-petroemporiki",
        "seq": 42,
        "cumKm": 18.075,
        "cumMin": 60.25
      },
      {
        "slug": "hkl-agios-ioannis-amnissos",
        "seq": 43,
        "cumKm": 18.631,
        "cumMin": 62.1
      },
      {
        "slug": "hkl-agiou-alexandrou",
        "seq": 44,
        "cumKm": 19.131,
        "cumMin": 63.77
      },
      {
        "slug": "hkl-riding-academy-crete",
        "seq": 45,
        "cumKm": 19.821,
        "cumMin": 66.07
      },
      {
        "slug": "hkl-amnissos-paralia-karterou-karteros-beach-sports-center",
        "seq": 46,
        "cumKm": 20.191,
        "cumMin": 67.3
      },
      {
        "slug": "hkl-michail-archaggelou",
        "seq": 47,
        "cumKm": 20.738,
        "cumMin": 69.13
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou",
        "seq": 48,
        "cumKm": 21.23,
        "cumMin": 70.77
      },
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 49,
        "cumKm": 21.578,
        "cumMin": 71.93
      }
    ]
  },
  {
    "code": "9947",
    "lineCode": "HKL-07",
    "name": "(kleisto) - Giofyro - Amnissos",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 1,
        "cumKm": 0.439,
        "cumMin": 1.46
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 2,
        "cumKm": 0.658,
        "cumMin": 2.19
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 3,
        "cumKm": 1.086,
        "cumMin": 3.62
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 4,
        "cumKm": 1.661,
        "cumMin": 5.54
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 5,
        "cumKm": 1.85,
        "cumMin": 6.17
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 6,
        "cumKm": 2.185,
        "cumMin": 7.28
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 7,
        "cumKm": 2.412,
        "cumMin": 8.04
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 8,
        "cumKm": 2.726,
        "cumMin": 9.09
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 9,
        "cumKm": 2.974,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 10,
        "cumKm": 3.178,
        "cumMin": 10.59
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 11,
        "cumKm": 3.523,
        "cumMin": 11.74
      },
      {
        "slug": "hkl-evans",
        "seq": 12,
        "cumKm": 3.682,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 13,
        "cumKm": 3.951,
        "cumMin": 13.17
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 14,
        "cumKm": 4.074,
        "cumMin": 13.58
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 15,
        "cumKm": 4.358,
        "cumMin": 14.53
      },
      {
        "slug": "hkl-analipsi",
        "seq": 16,
        "cumKm": 4.593,
        "cumMin": 15.31
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 17,
        "cumKm": 4.978,
        "cumMin": 16.59
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 18,
        "cumKm": 5.485,
        "cumMin": 18.28
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 19,
        "cumKm": 5.723,
        "cumMin": 19.08
      },
      {
        "slug": "hkl-poros-2",
        "seq": 20,
        "cumKm": 6.129,
        "cumMin": 20.43
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 21,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 22,
        "cumKm": 6.946,
        "cumMin": 23.15
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 23,
        "cumKm": 7.249,
        "cumMin": 24.16
      },
      {
        "slug": "hkl-nea-alikarnassos-2",
        "seq": 24,
        "cumKm": 7.702,
        "cumMin": 25.67
      },
      {
        "slug": "hkl-mournies-ikarou-80",
        "seq": 25,
        "cumKm": 7.944,
        "cumMin": 26.48
      },
      {
        "slug": "hkl-ikarou-106",
        "seq": 26,
        "cumKm": 8.194,
        "cumMin": 27.31
      },
      {
        "slug": "hkl-anagenniseos-2",
        "seq": 27,
        "cumKm": 8.565,
        "cumMin": 28.55
      },
      {
        "slug": "hkl-police-station",
        "seq": 28,
        "cumKm": 8.898,
        "cumMin": 29.66
      },
      {
        "slug": "hkl-sminarchia",
        "seq": 29,
        "cumKm": 10.612,
        "cumMin": 35.37
      },
      {
        "slug": "hkl-petroemporiki",
        "seq": 30,
        "cumKm": 11.514,
        "cumMin": 38.38
      },
      {
        "slug": "hkl-agios-ioannis-amnissos",
        "seq": 31,
        "cumKm": 12.07,
        "cumMin": 40.23
      },
      {
        "slug": "hkl-agiou-alexandrou",
        "seq": 32,
        "cumKm": 12.57,
        "cumMin": 41.9
      },
      {
        "slug": "hkl-riding-academy-crete",
        "seq": 33,
        "cumKm": 13.26,
        "cumMin": 44.2
      },
      {
        "slug": "hkl-amnissos-paralia-karterou-karteros-beach-sports-center",
        "seq": 34,
        "cumKm": 13.631,
        "cumMin": 45.44
      },
      {
        "slug": "hkl-michail-archaggelou",
        "seq": 35,
        "cumKm": 14.177,
        "cumMin": 47.26
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou",
        "seq": 36,
        "cumKm": 14.669,
        "cumMin": 48.9
      },
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 37,
        "cumKm": 15.017,
        "cumMin": 50.06
      }
    ]
  },
  {
    "code": "21031",
    "lineCode": "HKL-09",
    "name": "Limani - AG. Syllas (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-evans",
        "seq": 4,
        "cumKm": 1.233,
        "cumMin": 4.11
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 5,
        "cumKm": 1.501,
        "cumMin": 5
      },
      {
        "slug": "hkl-katsoulogiorgi-l-knossou-6",
        "seq": 6,
        "cumKm": 1.891,
        "cumMin": 6.3
      },
      {
        "slug": "hkl-tria-peuka-l-knossou-40",
        "seq": 7,
        "cumKm": 2.121,
        "cumMin": 7.07
      },
      {
        "slug": "hkl-agios-konstantinos",
        "seq": 8,
        "cumKm": 2.443,
        "cumMin": 8.14
      },
      {
        "slug": "hkl-pertselaki",
        "seq": 9,
        "cumKm": 2.816,
        "cumMin": 9.39
      },
      {
        "slug": "hkl-mpentevi",
        "seq": 10,
        "cumKm": 3.293,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-varelatzi-l-knossou-158",
        "seq": 11,
        "cumKm": 3.876,
        "cumMin": 12.92
      },
      {
        "slug": "hkl-kefalogianni-l-knossou-178",
        "seq": 12,
        "cumKm": 4.098,
        "cumMin": 13.66
      },
      {
        "slug": "hkl-avenue-knossou-zervonikola",
        "seq": 13,
        "cumKm": 4.388,
        "cumMin": 14.63
      },
      {
        "slug": "hkl-avenue-knossou-202-agios-ioannis",
        "seq": 14,
        "cumKm": 4.599,
        "cumMin": 15.33
      },
      {
        "slug": "hkl-l-knossou-226",
        "seq": 15,
        "cumKm": 4.939,
        "cumMin": 16.46
      },
      {
        "slug": "hkl-l-knossou-244",
        "seq": 16,
        "cumKm": 5.075,
        "cumMin": 16.92
      },
      {
        "slug": "hkl-l-knossou-270",
        "seq": 17,
        "cumKm": 5.359,
        "cumMin": 17.86
      },
      {
        "slug": "hkl-oulof-palme-158",
        "seq": 18,
        "cumKm": 6.983,
        "cumMin": 23.28
      },
      {
        "slug": "hkl-oulof-palme-191",
        "seq": 19,
        "cumKm": 7.676,
        "cumMin": 25.59
      },
      {
        "slug": "hkl-oulof-palme-219",
        "seq": 20,
        "cumKm": 8.306,
        "cumMin": 27.69
      },
      {
        "slug": "hkl-oulof-palme-255-kyparisias",
        "seq": 21,
        "cumKm": 9.084,
        "cumMin": 30.28
      },
      {
        "slug": "hkl-oulof-palme-312",
        "seq": 22,
        "cumKm": 9.694,
        "cumMin": 32.31
      },
      {
        "slug": "hkl-oulof-palme-2",
        "seq": 23,
        "cumKm": 10.384,
        "cumMin": 34.61
      },
      {
        "slug": "hkl-chatzidaki",
        "seq": 24,
        "cumKm": 10.952,
        "cumMin": 36.51
      },
      {
        "slug": "hkl-foka-2",
        "seq": 25,
        "cumKm": 11.468,
        "cumMin": 38.23
      },
      {
        "slug": "hkl-zoodoxou-pigis",
        "seq": 26,
        "cumKm": 11.956,
        "cumMin": 39.85
      },
      {
        "slug": "hkl-profiti-ilia",
        "seq": 27,
        "cumKm": 12.347,
        "cumMin": 41.16
      },
      {
        "slug": "hkl-katraki",
        "seq": 28,
        "cumKm": 12.625,
        "cumMin": 42.08
      },
      {
        "slug": "hkl-avenue-eth-antistasis-ag-vlasi-m",
        "seq": 29,
        "cumKm": 13.864,
        "cumMin": 46.21
      },
      {
        "slug": "hkl-agiou-panteleimona",
        "seq": 30,
        "cumKm": 14.12,
        "cumMin": 47.07
      },
      {
        "slug": "hkl-agiou-vlassi-2",
        "seq": 31,
        "cumKm": 14.588,
        "cumMin": 48.63
      },
      {
        "slug": "hkl-ag-vlasis-2",
        "seq": 32,
        "cumKm": 14.799,
        "cumMin": 49.33
      },
      {
        "slug": "hkl-agios-vlasis-3",
        "seq": 33,
        "cumKm": 15.155,
        "cumMin": 50.52
      },
      {
        "slug": "hkl-agiou-dimitriou",
        "seq": 34,
        "cumKm": 16.656,
        "cumMin": 55.52
      },
      {
        "slug": "hkl-ep-od-ag-sylla-298",
        "seq": 35,
        "cumKm": 16.973,
        "cumMin": 56.58
      },
      {
        "slug": "hkl-agiou-sylla-1",
        "seq": 36,
        "cumKm": 17.402,
        "cumMin": 58.01
      }
    ]
  },
  {
    "code": "20083",
    "lineCode": "HKL-10",
    "name": "Limani - Gazi",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 4,
        "cumKm": 1.332,
        "cumMin": 4.44
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 5,
        "cumKm": 1.688,
        "cumMin": 5.63
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 6,
        "cumKm": 1.886,
        "cumMin": 6.29
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 7,
        "cumKm": 2.207,
        "cumMin": 7.36
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 8,
        "cumKm": 2.457,
        "cumMin": 8.19
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 9,
        "cumKm": 2.734,
        "cumMin": 9.11
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 10,
        "cumKm": 3.062,
        "cumMin": 10.21
      },
      {
        "slug": "hkl-kaminia",
        "seq": 11,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-deilina",
        "seq": 12,
        "cumKm": 3.779,
        "cumMin": 12.6
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 13,
        "cumKm": 4.198,
        "cumMin": 13.99
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 14,
        "cumKm": 4.497,
        "cumMin": 14.99
      },
      {
        "slug": "hkl-avenue-62-martyron-360",
        "seq": 15,
        "cumKm": 5.207,
        "cumMin": 17.36
      },
      {
        "slug": "hkl-avenue-62-martyron-369-pagkritio-stadio",
        "seq": 16,
        "cumKm": 5.522,
        "cumMin": 18.41
      },
      {
        "slug": "hkl-avenue-62-martyron-377-xeropotamos",
        "seq": 17,
        "cumKm": 5.807,
        "cumMin": 19.36
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou",
        "seq": 18,
        "cumKm": 6.14,
        "cumMin": 20.47
      },
      {
        "slug": "hkl-tsalikaki",
        "seq": 19,
        "cumKm": 7.216,
        "cumMin": 24.05
      },
      {
        "slug": "hkl-georgiou-gennimata-67",
        "seq": 20,
        "cumKm": 7.426,
        "cumMin": 24.75
      },
      {
        "slug": "hkl-georgiou-gennimata-21",
        "seq": 21,
        "cumKm": 7.679,
        "cumMin": 25.6
      },
      {
        "slug": "hkl-gennimata-venizelou-2",
        "seq": 22,
        "cumKm": 7.873,
        "cumMin": 26.24
      },
      {
        "slug": "hkl-eleutheriou-venizelou",
        "seq": 23,
        "cumKm": 8.318,
        "cumMin": 27.73
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika",
        "seq": 24,
        "cumKm": 8.955,
        "cumMin": 29.85
      },
      {
        "slug": "hkl-eleutheriou-venizelou-3",
        "seq": 25,
        "cumKm": 9.449,
        "cumMin": 31.5
      },
      {
        "slug": "hkl-eleutheriou-venizelou-196",
        "seq": 26,
        "cumKm": 9.673,
        "cumMin": 32.24
      },
      {
        "slug": "hkl-town-hall-gaziou",
        "seq": 27,
        "cumKm": 10.036,
        "cumMin": 33.45
      },
      {
        "slug": "hkl-eleutheriou-venizelou-260",
        "seq": 28,
        "cumKm": 10.269,
        "cumMin": 34.23
      },
      {
        "slug": "hkl-agiou-spyridonos",
        "seq": 29,
        "cumKm": 10.827,
        "cumMin": 36.09
      },
      {
        "slug": "hkl-komvos-reddi-2",
        "seq": 30,
        "cumKm": 11.163,
        "cumMin": 37.21
      },
      {
        "slug": "hkl-ts-gazi",
        "seq": 31,
        "cumKm": 11.603,
        "cumMin": 38.68
      }
    ]
  },
  {
    "code": "20095",
    "lineCode": "HKL-10",
    "name": "Limani - Gazi KAVROChORI",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 4,
        "cumKm": 1.332,
        "cumMin": 4.44
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 5,
        "cumKm": 1.688,
        "cumMin": 5.63
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 6,
        "cumKm": 1.886,
        "cumMin": 6.29
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 7,
        "cumKm": 2.207,
        "cumMin": 7.36
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 8,
        "cumKm": 2.457,
        "cumMin": 8.19
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 9,
        "cumKm": 2.734,
        "cumMin": 9.11
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 10,
        "cumKm": 3.062,
        "cumMin": 10.21
      },
      {
        "slug": "hkl-kaminia",
        "seq": 11,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-deilina",
        "seq": 12,
        "cumKm": 3.779,
        "cumMin": 12.6
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 13,
        "cumKm": 4.198,
        "cumMin": 13.99
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 14,
        "cumKm": 4.497,
        "cumMin": 14.99
      },
      {
        "slug": "hkl-avenue-62-martyron-360",
        "seq": 15,
        "cumKm": 5.207,
        "cumMin": 17.36
      },
      {
        "slug": "hkl-avenue-62-martyron-369-pagkritio-stadio",
        "seq": 16,
        "cumKm": 5.522,
        "cumMin": 18.41
      },
      {
        "slug": "hkl-avenue-62-martyron-377-xeropotamos",
        "seq": 17,
        "cumKm": 5.807,
        "cumMin": 19.36
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou",
        "seq": 18,
        "cumKm": 6.14,
        "cumMin": 20.47
      },
      {
        "slug": "hkl-tsalikaki",
        "seq": 19,
        "cumKm": 7.216,
        "cumMin": 24.05
      },
      {
        "slug": "hkl-georgiou-gennimata-67",
        "seq": 20,
        "cumKm": 7.426,
        "cumMin": 24.75
      },
      {
        "slug": "hkl-georgiou-gennimata-21",
        "seq": 21,
        "cumKm": 7.679,
        "cumMin": 25.6
      },
      {
        "slug": "hkl-gennimata-venizelou-2",
        "seq": 22,
        "cumKm": 7.873,
        "cumMin": 26.24
      },
      {
        "slug": "hkl-eleutheriou-venizelou",
        "seq": 23,
        "cumKm": 8.318,
        "cumMin": 27.73
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika",
        "seq": 24,
        "cumKm": 8.955,
        "cumMin": 29.85
      },
      {
        "slug": "hkl-eleutheriou-venizelou-3",
        "seq": 25,
        "cumKm": 9.449,
        "cumMin": 31.5
      },
      {
        "slug": "hkl-eleutheriou-venizelou-196",
        "seq": 26,
        "cumKm": 9.673,
        "cumMin": 32.24
      },
      {
        "slug": "hkl-town-hall-gaziou",
        "seq": 27,
        "cumKm": 10.036,
        "cumMin": 33.45
      },
      {
        "slug": "hkl-eleutheriou-venizelou-260",
        "seq": 28,
        "cumKm": 10.269,
        "cumMin": 34.23
      },
      {
        "slug": "hkl-agiou-spyridonos",
        "seq": 29,
        "cumKm": 10.827,
        "cumMin": 36.09
      },
      {
        "slug": "hkl-komvos-reddi",
        "seq": 30,
        "cumKm": 11.225,
        "cumMin": 37.42
      },
      {
        "slug": "hkl-agios-georgios-3",
        "seq": 31,
        "cumKm": 11.601,
        "cumMin": 38.67
      },
      {
        "slug": "hkl-diakladosi-krousona-2",
        "seq": 32,
        "cumKm": 12.17,
        "cumMin": 40.57
      },
      {
        "slug": "hkl-kavroxori-stasi-1",
        "seq": 33,
        "cumKm": 12.73,
        "cumMin": 42.43
      },
      {
        "slug": "hkl-kavroxori-stasi-2",
        "seq": 34,
        "cumKm": 13.076,
        "cumMin": 43.59
      },
      {
        "slug": "hkl-kavroxori-stasi-3",
        "seq": 35,
        "cumKm": 13.388,
        "cumMin": 44.63
      },
      {
        "slug": "hkl-kavroxori-stasi-4",
        "seq": 36,
        "cumKm": 13.802,
        "cumMin": 46.01
      },
      {
        "slug": "hkl-ts-kavroxori",
        "seq": 37,
        "cumKm": 14.059,
        "cumMin": 46.86
      }
    ]
  },
  {
    "code": "21033",
    "lineCode": "HKL-10",
    "name": "Aerodromio - Gazi NEO",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 23,
        "cumKm": 7.981,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 24,
        "cumKm": 8.28,
        "cumMin": 27.6
      },
      {
        "slug": "hkl-avenue-62-martyron-360",
        "seq": 25,
        "cumKm": 8.991,
        "cumMin": 29.97
      },
      {
        "slug": "hkl-avenue-62-martyron-369-pagkritio-stadio",
        "seq": 26,
        "cumKm": 9.305,
        "cumMin": 31.02
      },
      {
        "slug": "hkl-avenue-62-martyron-377-xeropotamos",
        "seq": 27,
        "cumKm": 9.59,
        "cumMin": 31.97
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou",
        "seq": 28,
        "cumKm": 9.923,
        "cumMin": 33.08
      },
      {
        "slug": "hkl-tsalikaki",
        "seq": 29,
        "cumKm": 10.999,
        "cumMin": 36.66
      },
      {
        "slug": "hkl-georgiou-gennimata-67",
        "seq": 30,
        "cumKm": 11.209,
        "cumMin": 37.36
      },
      {
        "slug": "hkl-georgiou-gennimata-21",
        "seq": 31,
        "cumKm": 11.462,
        "cumMin": 38.21
      },
      {
        "slug": "hkl-gennimata-venizelou-2",
        "seq": 32,
        "cumKm": 11.656,
        "cumMin": 38.85
      },
      {
        "slug": "hkl-eleutheriou-venizelou",
        "seq": 33,
        "cumKm": 12.101,
        "cumMin": 40.34
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika",
        "seq": 34,
        "cumKm": 12.738,
        "cumMin": 42.46
      },
      {
        "slug": "hkl-eleutheriou-venizelou-3",
        "seq": 35,
        "cumKm": 13.232,
        "cumMin": 44.11
      },
      {
        "slug": "hkl-eleutheriou-venizelou-196",
        "seq": 36,
        "cumKm": 13.456,
        "cumMin": 44.85
      },
      {
        "slug": "hkl-town-hall-gaziou",
        "seq": 37,
        "cumKm": 13.819,
        "cumMin": 46.06
      },
      {
        "slug": "hkl-eleutheriou-venizelou-260",
        "seq": 38,
        "cumKm": 14.052,
        "cumMin": 46.84
      },
      {
        "slug": "hkl-agiou-spyridonos",
        "seq": 39,
        "cumKm": 14.61,
        "cumMin": 48.7
      },
      {
        "slug": "hkl-komvos-reddi-2",
        "seq": 40,
        "cumKm": 14.946,
        "cumMin": 49.82
      },
      {
        "slug": "hkl-ts-gazi",
        "seq": 41,
        "cumKm": 15.386,
        "cumMin": 51.29
      }
    ]
  },
  {
    "code": "21034",
    "lineCode": "HKL-10",
    "name": "Aerodromio - Gazi KAVROChORI",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 23,
        "cumKm": 7.981,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 24,
        "cumKm": 8.28,
        "cumMin": 27.6
      },
      {
        "slug": "hkl-avenue-62-martyron-360",
        "seq": 25,
        "cumKm": 8.991,
        "cumMin": 29.97
      },
      {
        "slug": "hkl-avenue-62-martyron-369-pagkritio-stadio",
        "seq": 26,
        "cumKm": 9.305,
        "cumMin": 31.02
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou",
        "seq": 27,
        "cumKm": 9.921,
        "cumMin": 33.07
      },
      {
        "slug": "hkl-tsalikaki",
        "seq": 28,
        "cumKm": 10.998,
        "cumMin": 36.66
      },
      {
        "slug": "hkl-georgiou-gennimata-67",
        "seq": 29,
        "cumKm": 11.207,
        "cumMin": 37.36
      },
      {
        "slug": "hkl-georgiou-gennimata-21",
        "seq": 30,
        "cumKm": 11.46,
        "cumMin": 38.2
      },
      {
        "slug": "hkl-gennimata-venizelou-2",
        "seq": 31,
        "cumKm": 11.655,
        "cumMin": 38.85
      },
      {
        "slug": "hkl-eleutheriou-venizelou",
        "seq": 32,
        "cumKm": 12.1,
        "cumMin": 40.33
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika",
        "seq": 33,
        "cumKm": 12.737,
        "cumMin": 42.46
      },
      {
        "slug": "hkl-eleutheriou-venizelou-3",
        "seq": 34,
        "cumKm": 13.23,
        "cumMin": 44.1
      },
      {
        "slug": "hkl-eleutheriou-venizelou-196",
        "seq": 35,
        "cumKm": 13.454,
        "cumMin": 44.85
      },
      {
        "slug": "hkl-town-hall-gaziou",
        "seq": 36,
        "cumKm": 13.817,
        "cumMin": 46.06
      },
      {
        "slug": "hkl-eleutheriou-venizelou-260",
        "seq": 37,
        "cumKm": 14.051,
        "cumMin": 46.84
      },
      {
        "slug": "hkl-agiou-spyridonos",
        "seq": 38,
        "cumKm": 14.609,
        "cumMin": 48.7
      },
      {
        "slug": "hkl-komvos-reddi",
        "seq": 39,
        "cumKm": 15.006,
        "cumMin": 50.02
      },
      {
        "slug": "hkl-agios-georgios-3",
        "seq": 40,
        "cumKm": 15.382,
        "cumMin": 51.27
      },
      {
        "slug": "hkl-diakladosi-krousona-2",
        "seq": 41,
        "cumKm": 15.952,
        "cumMin": 53.17
      },
      {
        "slug": "hkl-kavroxori-stasi-1",
        "seq": 42,
        "cumKm": 16.512,
        "cumMin": 55.04
      },
      {
        "slug": "hkl-kavroxori-stasi-2",
        "seq": 43,
        "cumKm": 16.858,
        "cumMin": 56.19
      },
      {
        "slug": "hkl-kavroxori-stasi-3",
        "seq": 44,
        "cumKm": 17.169,
        "cumMin": 57.23
      },
      {
        "slug": "hkl-kavroxori-stasi-4",
        "seq": 45,
        "cumKm": 17.584,
        "cumMin": 58.61
      },
      {
        "slug": "hkl-ts-kavroxori",
        "seq": 46,
        "cumKm": 17.84,
        "cumMin": 59.47
      }
    ]
  },
  {
    "code": "20093",
    "lineCode": "HKL-11",
    "name": "Limani - Pagni - ITE (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 4,
        "cumKm": 1.332,
        "cumMin": 4.44
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 5,
        "cumKm": 1.688,
        "cumMin": 5.63
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 6,
        "cumKm": 1.886,
        "cumMin": 6.29
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 7,
        "cumKm": 2.207,
        "cumMin": 7.36
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 8,
        "cumKm": 2.457,
        "cumMin": 8.19
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 9,
        "cumKm": 2.734,
        "cumMin": 9.11
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 10,
        "cumKm": 3.062,
        "cumMin": 10.21
      },
      {
        "slug": "hkl-kaminia",
        "seq": 11,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-deilina",
        "seq": 12,
        "cumKm": 3.779,
        "cumMin": 12.6
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 13,
        "cumKm": 4.198,
        "cumMin": 13.99
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 14,
        "cumKm": 4.497,
        "cumMin": 14.99
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 15,
        "cumKm": 4.862,
        "cumMin": 16.21
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 16,
        "cumKm": 5.143,
        "cumMin": 17.14
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 17,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 18,
        "cumKm": 6.34,
        "cumMin": 21.13
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 19,
        "cumKm": 6.977,
        "cumMin": 23.26
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni",
        "seq": 20,
        "cumKm": 7.213,
        "cumMin": 24.04
      },
      {
        "slug": "hkl-avenue-panepistimiou-parasyri-m",
        "seq": 21,
        "cumKm": 7.573,
        "cumMin": 25.24
      },
      {
        "slug": "hkl-agioi-theodoroi",
        "seq": 22,
        "cumKm": 8.003,
        "cumMin": 26.68
      },
      {
        "slug": "hkl-aretousas",
        "seq": 23,
        "cumKm": 8.587,
        "cumMin": 28.62
      },
      {
        "slug": "hkl-agiou-nektariou",
        "seq": 24,
        "cumKm": 8.929,
        "cumMin": 29.76
      },
      {
        "slug": "hkl-asklipeiou",
        "seq": 25,
        "cumKm": 9.251,
        "cumMin": 30.84
      },
      {
        "slug": "hkl-krimpa",
        "seq": 26,
        "cumKm": 9.552,
        "cumMin": 31.84
      },
      {
        "slug": "hkl-pagni-hospital",
        "seq": 27,
        "cumKm": 10.412,
        "cumMin": 34.71
      },
      {
        "slug": "hkl-diastaurosi-staurakia",
        "seq": 28,
        "cumKm": 10.745,
        "cumMin": 35.82
      },
      {
        "slug": "hkl-ts-idryma-texnologias-ereunas-i-t-e",
        "seq": 29,
        "cumKm": 11.967,
        "cumMin": 39.89
      }
    ]
  },
  {
    "code": "21013",
    "lineCode": "HKL-11",
    "name": "Limani - Pagni",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 4,
        "cumKm": 1.332,
        "cumMin": 4.44
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 5,
        "cumKm": 1.688,
        "cumMin": 5.63
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 6,
        "cumKm": 1.886,
        "cumMin": 6.29
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 7,
        "cumKm": 2.207,
        "cumMin": 7.36
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 8,
        "cumKm": 2.457,
        "cumMin": 8.19
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 9,
        "cumKm": 2.734,
        "cumMin": 9.11
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 10,
        "cumKm": 3.062,
        "cumMin": 10.21
      },
      {
        "slug": "hkl-kaminia",
        "seq": 11,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-deilina",
        "seq": 12,
        "cumKm": 3.779,
        "cumMin": 12.6
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 13,
        "cumKm": 4.198,
        "cumMin": 13.99
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 14,
        "cumKm": 4.497,
        "cumMin": 14.99
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 15,
        "cumKm": 4.862,
        "cumMin": 16.21
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 16,
        "cumKm": 5.143,
        "cumMin": 17.14
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 17,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 18,
        "cumKm": 6.34,
        "cumMin": 21.13
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 19,
        "cumKm": 6.977,
        "cumMin": 23.26
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni",
        "seq": 20,
        "cumKm": 7.213,
        "cumMin": 24.04
      },
      {
        "slug": "hkl-avenue-panepistimiou-parasyri-m",
        "seq": 21,
        "cumKm": 7.573,
        "cumMin": 25.24
      },
      {
        "slug": "hkl-agioi-theodoroi",
        "seq": 22,
        "cumKm": 8.003,
        "cumMin": 26.68
      },
      {
        "slug": "hkl-aretousas",
        "seq": 23,
        "cumKm": 8.587,
        "cumMin": 28.62
      },
      {
        "slug": "hkl-agiou-nektariou",
        "seq": 24,
        "cumKm": 8.929,
        "cumMin": 29.76
      },
      {
        "slug": "hkl-asklipeiou",
        "seq": 25,
        "cumKm": 9.251,
        "cumMin": 30.84
      },
      {
        "slug": "hkl-krimpa",
        "seq": 26,
        "cumKm": 9.552,
        "cumMin": 31.84
      },
      {
        "slug": "hkl-pagni-hospital",
        "seq": 27,
        "cumKm": 10.412,
        "cumMin": 34.71
      }
    ]
  },
  {
    "code": "21015",
    "lineCode": "HKL-11",
    "name": "Aerodromio - Pagni",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 23,
        "cumKm": 7.981,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 24,
        "cumKm": 8.28,
        "cumMin": 27.6
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 25,
        "cumKm": 8.645,
        "cumMin": 28.82
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 26,
        "cumKm": 8.926,
        "cumMin": 29.75
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 27,
        "cumKm": 9.452,
        "cumMin": 31.51
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 28,
        "cumKm": 10.123,
        "cumMin": 33.74
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 29,
        "cumKm": 10.76,
        "cumMin": 35.87
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni",
        "seq": 30,
        "cumKm": 10.996,
        "cumMin": 36.65
      },
      {
        "slug": "hkl-avenue-panepistimiou-parasyri-m",
        "seq": 31,
        "cumKm": 11.356,
        "cumMin": 37.85
      },
      {
        "slug": "hkl-agioi-theodoroi",
        "seq": 32,
        "cumKm": 11.786,
        "cumMin": 39.29
      },
      {
        "slug": "hkl-aretousas",
        "seq": 33,
        "cumKm": 12.371,
        "cumMin": 41.24
      },
      {
        "slug": "hkl-agiou-nektariou",
        "seq": 34,
        "cumKm": 12.712,
        "cumMin": 42.37
      },
      {
        "slug": "hkl-asklipeiou",
        "seq": 35,
        "cumKm": 13.034,
        "cumMin": 43.45
      },
      {
        "slug": "hkl-krimpa",
        "seq": 36,
        "cumKm": 13.335,
        "cumMin": 44.45
      },
      {
        "slug": "hkl-pagni-hospital",
        "seq": 37,
        "cumKm": 14.195,
        "cumMin": 47.32
      }
    ]
  },
  {
    "code": "21016",
    "lineCode": "HKL-11",
    "name": "Limani - Pagni - Panepistimio",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 4,
        "cumKm": 1.332,
        "cumMin": 4.44
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 5,
        "cumKm": 1.688,
        "cumMin": 5.63
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 6,
        "cumKm": 1.886,
        "cumMin": 6.29
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 7,
        "cumKm": 2.207,
        "cumMin": 7.36
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 8,
        "cumKm": 2.457,
        "cumMin": 8.19
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 9,
        "cumKm": 2.734,
        "cumMin": 9.11
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 10,
        "cumKm": 3.062,
        "cumMin": 10.21
      },
      {
        "slug": "hkl-kaminia",
        "seq": 11,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-deilina",
        "seq": 12,
        "cumKm": 3.779,
        "cumMin": 12.6
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 13,
        "cumKm": 4.198,
        "cumMin": 13.99
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 14,
        "cumKm": 4.497,
        "cumMin": 14.99
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 15,
        "cumKm": 4.862,
        "cumMin": 16.21
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 16,
        "cumKm": 5.143,
        "cumMin": 17.14
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 17,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 18,
        "cumKm": 6.34,
        "cumMin": 21.13
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 19,
        "cumKm": 6.977,
        "cumMin": 23.26
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni",
        "seq": 20,
        "cumKm": 7.213,
        "cumMin": 24.04
      },
      {
        "slug": "hkl-avenue-panepistimiou-parasyri-m",
        "seq": 21,
        "cumKm": 7.573,
        "cumMin": 25.24
      },
      {
        "slug": "hkl-agioi-theodoroi",
        "seq": 22,
        "cumKm": 8.003,
        "cumMin": 26.68
      },
      {
        "slug": "hkl-aretousas",
        "seq": 23,
        "cumKm": 8.587,
        "cumMin": 28.62
      },
      {
        "slug": "hkl-agiou-nektariou",
        "seq": 24,
        "cumKm": 8.929,
        "cumMin": 29.76
      },
      {
        "slug": "hkl-asklipeiou",
        "seq": 25,
        "cumKm": 9.251,
        "cumMin": 30.84
      },
      {
        "slug": "hkl-krimpa",
        "seq": 26,
        "cumKm": 9.552,
        "cumMin": 31.84
      },
      {
        "slug": "hkl-pagni-hospital",
        "seq": 27,
        "cumKm": 10.412,
        "cumMin": 34.71
      },
      {
        "slug": "hkl-diastaurosi-staurakia",
        "seq": 28,
        "cumKm": 10.745,
        "cumMin": 35.82
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 29,
        "cumKm": 11.305,
        "cumMin": 37.68
      },
      {
        "slug": "hkl-ts-panepistimio",
        "seq": 30,
        "cumKm": 11.95,
        "cumMin": 39.83
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 31,
        "cumKm": 12.406,
        "cumMin": 41.35
      }
    ]
  },
  {
    "code": "29310",
    "lineCode": "HKL-11",
    "name": "Aerodromio - Pagni - ITE",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 23,
        "cumKm": 7.981,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 24,
        "cumKm": 8.28,
        "cumMin": 27.6
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 25,
        "cumKm": 8.645,
        "cumMin": 28.82
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 26,
        "cumKm": 8.926,
        "cumMin": 29.75
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 27,
        "cumKm": 9.452,
        "cumMin": 31.51
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 28,
        "cumKm": 10.123,
        "cumMin": 33.74
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 29,
        "cumKm": 10.76,
        "cumMin": 35.87
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni",
        "seq": 30,
        "cumKm": 10.996,
        "cumMin": 36.65
      },
      {
        "slug": "hkl-avenue-panepistimiou-parasyri-m",
        "seq": 31,
        "cumKm": 11.356,
        "cumMin": 37.85
      },
      {
        "slug": "hkl-agioi-theodoroi",
        "seq": 32,
        "cumKm": 11.786,
        "cumMin": 39.29
      },
      {
        "slug": "hkl-aretousas",
        "seq": 33,
        "cumKm": 12.371,
        "cumMin": 41.24
      },
      {
        "slug": "hkl-agiou-nektariou",
        "seq": 34,
        "cumKm": 12.712,
        "cumMin": 42.37
      },
      {
        "slug": "hkl-asklipeiou",
        "seq": 35,
        "cumKm": 13.034,
        "cumMin": 43.45
      },
      {
        "slug": "hkl-krimpa",
        "seq": 36,
        "cumKm": 13.335,
        "cumMin": 44.45
      },
      {
        "slug": "hkl-pagni-hospital",
        "seq": 37,
        "cumKm": 14.195,
        "cumMin": 47.32
      },
      {
        "slug": "hkl-diastaurosi-staurakia",
        "seq": 38,
        "cumKm": 14.528,
        "cumMin": 48.43
      },
      {
        "slug": "hkl-ts-idryma-texnologias-ereunas-i-t-e",
        "seq": 39,
        "cumKm": 15.75,
        "cumMin": 52.5
      }
    ]
  },
  {
    "code": "29923",
    "lineCode": "HKL-11",
    "name": "KALLIThEA - Allikarnasos - Pagni -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-giannari",
        "seq": 1,
        "cumKm": 0.109,
        "cumMin": 0.36
      },
      {
        "slug": "hkl-dimopoulou-34",
        "seq": 2,
        "cumKm": 0.304,
        "cumMin": 1.01
      },
      {
        "slug": "hkl-dimopoulou-2",
        "seq": 3,
        "cumKm": 0.746,
        "cumMin": 2.49
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 4,
        "cumKm": 1.284,
        "cumMin": 4.28
      },
      {
        "slug": "hkl-street-ro-vita-2",
        "seq": 5,
        "cumKm": 1.613,
        "cumMin": 5.38
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 6,
        "cumKm": 2.552,
        "cumMin": 8.51
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 7,
        "cumKm": 2.853,
        "cumMin": 9.51
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 8,
        "cumKm": 3.253,
        "cumMin": 10.84
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 9,
        "cumKm": 3.567,
        "cumMin": 11.89
      },
      {
        "slug": "hkl-mausolou-gefyra-ethnikis-return",
        "seq": 10,
        "cumKm": 3.864,
        "cumMin": 12.88
      },
      {
        "slug": "hkl-irodotou-return-kallitheas",
        "seq": 11,
        "cumKm": 4.634,
        "cumMin": 15.45
      },
      {
        "slug": "hkl-katsampas",
        "seq": 12,
        "cumKm": 5.362,
        "cumMin": 17.87
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 13,
        "cumKm": 5.802,
        "cumMin": 19.34
      },
      {
        "slug": "hkl-poros",
        "seq": 14,
        "cumKm": 6.143,
        "cumMin": 20.48
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 15,
        "cumKm": 6.335,
        "cumMin": 21.12
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 16,
        "cumKm": 6.61,
        "cumMin": 22.03
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 17,
        "cumKm": 6.976,
        "cumMin": 23.25
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 18,
        "cumKm": 7.384,
        "cumMin": 24.61
      },
      {
        "slug": "hkl-averof",
        "seq": 19,
        "cumKm": 7.576,
        "cumMin": 25.25
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 20,
        "cumKm": 7.986,
        "cumMin": 26.62
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 21,
        "cumKm": 8.341,
        "cumMin": 27.8
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 22,
        "cumKm": 8.539,
        "cumMin": 28.46
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 23,
        "cumKm": 8.86,
        "cumMin": 29.53
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 24,
        "cumKm": 9.11,
        "cumMin": 30.37
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 25,
        "cumKm": 9.387,
        "cumMin": 31.29
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 26,
        "cumKm": 9.715,
        "cumMin": 32.38
      },
      {
        "slug": "hkl-kaminia",
        "seq": 27,
        "cumKm": 9.947,
        "cumMin": 33.16
      },
      {
        "slug": "hkl-deilina",
        "seq": 28,
        "cumKm": 10.433,
        "cumMin": 34.78
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 29,
        "cumKm": 10.851,
        "cumMin": 36.17
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 30,
        "cumKm": 11.151,
        "cumMin": 37.17
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 31,
        "cumKm": 11.515,
        "cumMin": 38.38
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 32,
        "cumKm": 11.796,
        "cumMin": 39.32
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 33,
        "cumKm": 12.322,
        "cumMin": 41.07
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 34,
        "cumKm": 12.993,
        "cumMin": 43.31
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 35,
        "cumKm": 13.63,
        "cumMin": 45.43
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni",
        "seq": 36,
        "cumKm": 13.867,
        "cumMin": 46.22
      },
      {
        "slug": "hkl-avenue-panepistimiou-parasyri-m",
        "seq": 37,
        "cumKm": 14.226,
        "cumMin": 47.42
      },
      {
        "slug": "hkl-agioi-theodoroi",
        "seq": 38,
        "cumKm": 14.656,
        "cumMin": 48.85
      },
      {
        "slug": "hkl-aretousas",
        "seq": 39,
        "cumKm": 15.241,
        "cumMin": 50.8
      },
      {
        "slug": "hkl-agiou-nektariou",
        "seq": 40,
        "cumKm": 15.582,
        "cumMin": 51.94
      },
      {
        "slug": "hkl-asklipeiou",
        "seq": 41,
        "cumKm": 15.904,
        "cumMin": 53.01
      },
      {
        "slug": "hkl-krimpa",
        "seq": 42,
        "cumKm": 16.205,
        "cumMin": 54.02
      },
      {
        "slug": "hkl-pagni-hospital",
        "seq": 43,
        "cumKm": 17.065,
        "cumMin": 56.88
      }
    ]
  },
  {
    "code": "21018",
    "lineCode": "HKL-12",
    "name": "Aerodromio - Elmepa.",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 23,
        "cumKm": 7.981,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 24,
        "cumKm": 8.28,
        "cumMin": 27.6
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 25,
        "cumKm": 8.645,
        "cumMin": 28.82
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 26,
        "cumKm": 8.926,
        "cumMin": 29.75
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 27,
        "cumKm": 9.452,
        "cumMin": 31.51
      },
      {
        "slug": "hkl-athitaki",
        "seq": 28,
        "cumKm": 10.009,
        "cumMin": 33.36
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-m",
        "seq": 29,
        "cumKm": 10.291,
        "cumMin": 34.3
      },
      {
        "slug": "hkl-basketball-court-elmepa",
        "seq": 30,
        "cumKm": 10.799,
        "cumMin": 36
      },
      {
        "slug": "hkl-student-residence-elmepa",
        "seq": 31,
        "cumKm": 11.127,
        "cumMin": 37.09
      },
      {
        "slug": "hkl-protypo-high-school-m",
        "seq": 32,
        "cumKm": 11.477,
        "cumMin": 38.26
      },
      {
        "slug": "hkl-ts-elmepa",
        "seq": 33,
        "cumKm": 11.751,
        "cumMin": 39.17
      }
    ]
  },
  {
    "code": "30065",
    "lineCode": "HKL-12",
    "name": "KALLIThEA - EIThEIA Vipei - Katsampa - Elmepa",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-giannari",
        "seq": 1,
        "cumKm": 0.109,
        "cumMin": 0.36
      },
      {
        "slug": "hkl-dimopoulou-34",
        "seq": 2,
        "cumKm": 0.304,
        "cumMin": 1.01
      },
      {
        "slug": "hkl-dimopoulou-2",
        "seq": 3,
        "cumKm": 0.746,
        "cumMin": 2.49
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 4,
        "cumKm": 1.284,
        "cumMin": 4.28
      },
      {
        "slug": "hkl-street-ro-vita-2",
        "seq": 5,
        "cumKm": 1.613,
        "cumMin": 5.38
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 6,
        "cumKm": 2.552,
        "cumMin": 8.51
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 7,
        "cumKm": 2.853,
        "cumMin": 9.51
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 8,
        "cumKm": 3.253,
        "cumMin": 10.84
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 9,
        "cumKm": 3.567,
        "cumMin": 11.89
      },
      {
        "slug": "hkl-kazantzidi",
        "seq": 10,
        "cumKm": 3.706,
        "cumMin": 12.35
      },
      {
        "slug": "hkl-mausolou-gefyra-ethnikis-return",
        "seq": 11,
        "cumKm": 3.866,
        "cumMin": 12.89
      },
      {
        "slug": "hkl-katsampas",
        "seq": 12,
        "cumKm": 5.122,
        "cumMin": 17.07
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 13,
        "cumKm": 5.562,
        "cumMin": 18.54
      },
      {
        "slug": "hkl-poros",
        "seq": 14,
        "cumKm": 5.903,
        "cumMin": 19.68
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 15,
        "cumKm": 6.095,
        "cumMin": 20.32
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 16,
        "cumKm": 6.37,
        "cumMin": 21.23
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 17,
        "cumKm": 6.736,
        "cumMin": 22.45
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 18,
        "cumKm": 7.144,
        "cumMin": 23.81
      },
      {
        "slug": "hkl-averof",
        "seq": 19,
        "cumKm": 7.336,
        "cumMin": 24.45
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 20,
        "cumKm": 7.746,
        "cumMin": 25.82
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 21,
        "cumKm": 8.101,
        "cumMin": 27
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 22,
        "cumKm": 8.299,
        "cumMin": 27.66
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 23,
        "cumKm": 8.62,
        "cumMin": 28.73
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 24,
        "cumKm": 8.87,
        "cumMin": 29.57
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 25,
        "cumKm": 9.147,
        "cumMin": 30.49
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 26,
        "cumKm": 9.475,
        "cumMin": 31.58
      },
      {
        "slug": "hkl-kaminia",
        "seq": 27,
        "cumKm": 9.707,
        "cumMin": 32.36
      },
      {
        "slug": "hkl-deilina",
        "seq": 28,
        "cumKm": 10.193,
        "cumMin": 33.98
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 29,
        "cumKm": 10.611,
        "cumMin": 35.37
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 30,
        "cumKm": 10.911,
        "cumMin": 36.37
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 31,
        "cumKm": 11.275,
        "cumMin": 37.58
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 32,
        "cumKm": 11.556,
        "cumMin": 38.52
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 33,
        "cumKm": 12.082,
        "cumMin": 40.27
      },
      {
        "slug": "hkl-athitaki",
        "seq": 34,
        "cumKm": 12.639,
        "cumMin": 42.13
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-m",
        "seq": 35,
        "cumKm": 12.921,
        "cumMin": 43.07
      },
      {
        "slug": "hkl-basketball-court-elmepa",
        "seq": 36,
        "cumKm": 13.43,
        "cumMin": 44.77
      },
      {
        "slug": "hkl-student-residence-elmepa",
        "seq": 37,
        "cumKm": 13.757,
        "cumMin": 45.86
      },
      {
        "slug": "hkl-protypo-high-school-m",
        "seq": 38,
        "cumKm": 14.107,
        "cumMin": 47.02
      },
      {
        "slug": "hkl-ts-elmepa",
        "seq": 39,
        "cumKm": 14.382,
        "cumMin": 47.94
      }
    ]
  },
  {
    "code": "30066",
    "lineCode": "HKL-12",
    "name": "Amnisso - Elmepa -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou-2",
        "seq": 1,
        "cumKm": 0.324,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-michail-archaggelou-2",
        "seq": 2,
        "cumKm": 0.877,
        "cumMin": 2.92
      },
      {
        "slug": "hkl-amnissos-paralia-karterou",
        "seq": 3,
        "cumKm": 1.42,
        "cumMin": 4.73
      },
      {
        "slug": "hkl-riding-academy-crete-2",
        "seq": 4,
        "cumKm": 1.763,
        "cumMin": 5.88
      },
      {
        "slug": "hkl-agiou-alexandrou-2",
        "seq": 5,
        "cumKm": 2.424,
        "cumMin": 8.08
      },
      {
        "slug": "hkl-agios-ioannis-amnissos-2",
        "seq": 6,
        "cumKm": 2.934,
        "cumMin": 9.78
      },
      {
        "slug": "hkl-petroemporiki-2",
        "seq": 7,
        "cumKm": 3.46,
        "cumMin": 11.53
      },
      {
        "slug": "hkl-sminarchia-2",
        "seq": 8,
        "cumKm": 4.486,
        "cumMin": 14.95
      },
      {
        "slug": "hkl-police-station-2",
        "seq": 9,
        "cumKm": 6.078,
        "cumMin": 20.26
      },
      {
        "slug": "hkl-anagenniseos",
        "seq": 10,
        "cumKm": 6.435,
        "cumMin": 21.45
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 11,
        "cumKm": 6.769,
        "cumMin": 22.56
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 12,
        "cumKm": 6.996,
        "cumMin": 23.32
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 13,
        "cumKm": 7.371,
        "cumMin": 24.57
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 14,
        "cumKm": 7.762,
        "cumMin": 25.87
      },
      {
        "slug": "hkl-katsampas",
        "seq": 15,
        "cumKm": 8.062,
        "cumMin": 26.87
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 16,
        "cumKm": 8.502,
        "cumMin": 28.34
      },
      {
        "slug": "hkl-poros",
        "seq": 17,
        "cumKm": 8.843,
        "cumMin": 29.48
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 18,
        "cumKm": 9.035,
        "cumMin": 30.12
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 19,
        "cumKm": 9.31,
        "cumMin": 31.03
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 20,
        "cumKm": 9.676,
        "cumMin": 32.25
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 21,
        "cumKm": 10.085,
        "cumMin": 33.62
      },
      {
        "slug": "hkl-averof",
        "seq": 22,
        "cumKm": 10.277,
        "cumMin": 34.26
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 23,
        "cumKm": 10.686,
        "cumMin": 35.62
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 24,
        "cumKm": 11.041,
        "cumMin": 36.8
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 25,
        "cumKm": 11.24,
        "cumMin": 37.47
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 26,
        "cumKm": 11.56,
        "cumMin": 38.53
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 27,
        "cumKm": 11.81,
        "cumMin": 39.37
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 28,
        "cumKm": 12.088,
        "cumMin": 40.29
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 29,
        "cumKm": 12.416,
        "cumMin": 41.39
      },
      {
        "slug": "hkl-kaminia",
        "seq": 30,
        "cumKm": 12.648,
        "cumMin": 42.16
      },
      {
        "slug": "hkl-deilina",
        "seq": 31,
        "cumKm": 13.133,
        "cumMin": 43.78
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 32,
        "cumKm": 13.552,
        "cumMin": 45.17
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 33,
        "cumKm": 13.851,
        "cumMin": 46.17
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 34,
        "cumKm": 14.216,
        "cumMin": 47.39
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 35,
        "cumKm": 14.496,
        "cumMin": 48.32
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 36,
        "cumKm": 15.022,
        "cumMin": 50.07
      },
      {
        "slug": "hkl-athitaki",
        "seq": 37,
        "cumKm": 15.58,
        "cumMin": 51.93
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-m",
        "seq": 38,
        "cumKm": 15.862,
        "cumMin": 52.87
      },
      {
        "slug": "hkl-basketball-court-elmepa",
        "seq": 39,
        "cumKm": 16.37,
        "cumMin": 54.57
      },
      {
        "slug": "hkl-student-residence-elmepa",
        "seq": 40,
        "cumKm": 16.698,
        "cumMin": 55.66
      },
      {
        "slug": "hkl-protypo-high-school-m",
        "seq": 41,
        "cumKm": 17.048,
        "cumMin": 56.83
      },
      {
        "slug": "hkl-ts-elmepa",
        "seq": 42,
        "cumKm": 17.322,
        "cumMin": 57.74
      }
    ]
  },
  {
    "code": "30067",
    "lineCode": "HKL-12",
    "name": "KALLIThEA - EYThEIA Vipei - Allikarnasos - Elmepa",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-giannari",
        "seq": 1,
        "cumKm": 0.109,
        "cumMin": 0.36
      },
      {
        "slug": "hkl-dimopoulou-34",
        "seq": 2,
        "cumKm": 0.304,
        "cumMin": 1.01
      },
      {
        "slug": "hkl-dimopoulou-2",
        "seq": 3,
        "cumKm": 0.746,
        "cumMin": 2.49
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 4,
        "cumKm": 1.284,
        "cumMin": 4.28
      },
      {
        "slug": "hkl-street-ro-vita-2",
        "seq": 5,
        "cumKm": 1.613,
        "cumMin": 5.38
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 6,
        "cumKm": 2.552,
        "cumMin": 8.51
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 7,
        "cumKm": 2.853,
        "cumMin": 9.51
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 8,
        "cumKm": 3.253,
        "cumMin": 10.84
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 9,
        "cumKm": 3.567,
        "cumMin": 11.89
      },
      {
        "slug": "hkl-mausolou-gefyra-ethnikis-return",
        "seq": 10,
        "cumKm": 3.864,
        "cumMin": 12.88
      },
      {
        "slug": "hkl-irodotou-return-kallitheas",
        "seq": 11,
        "cumKm": 4.634,
        "cumMin": 15.45
      },
      {
        "slug": "hkl-katsampas",
        "seq": 12,
        "cumKm": 5.362,
        "cumMin": 17.87
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 13,
        "cumKm": 5.802,
        "cumMin": 19.34
      },
      {
        "slug": "hkl-poros",
        "seq": 14,
        "cumKm": 6.143,
        "cumMin": 20.48
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 15,
        "cumKm": 6.335,
        "cumMin": 21.12
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 16,
        "cumKm": 6.61,
        "cumMin": 22.03
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 17,
        "cumKm": 6.976,
        "cumMin": 23.25
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 18,
        "cumKm": 7.384,
        "cumMin": 24.61
      },
      {
        "slug": "hkl-averof",
        "seq": 19,
        "cumKm": 7.576,
        "cumMin": 25.25
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 20,
        "cumKm": 7.986,
        "cumMin": 26.62
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 21,
        "cumKm": 8.341,
        "cumMin": 27.8
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 22,
        "cumKm": 8.539,
        "cumMin": 28.46
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 23,
        "cumKm": 8.86,
        "cumMin": 29.53
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 24,
        "cumKm": 9.11,
        "cumMin": 30.37
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 25,
        "cumKm": 9.387,
        "cumMin": 31.29
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 26,
        "cumKm": 9.715,
        "cumMin": 32.38
      },
      {
        "slug": "hkl-kaminia",
        "seq": 27,
        "cumKm": 9.947,
        "cumMin": 33.16
      },
      {
        "slug": "hkl-deilina",
        "seq": 28,
        "cumKm": 10.433,
        "cumMin": 34.78
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 29,
        "cumKm": 10.851,
        "cumMin": 36.17
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 30,
        "cumKm": 11.151,
        "cumMin": 37.17
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 31,
        "cumKm": 11.515,
        "cumMin": 38.38
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 32,
        "cumKm": 11.796,
        "cumMin": 39.32
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 33,
        "cumKm": 12.322,
        "cumMin": 41.07
      },
      {
        "slug": "hkl-athitaki",
        "seq": 34,
        "cumKm": 12.879,
        "cumMin": 42.93
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-m",
        "seq": 35,
        "cumKm": 13.161,
        "cumMin": 43.87
      },
      {
        "slug": "hkl-basketball-court-elmepa",
        "seq": 36,
        "cumKm": 13.67,
        "cumMin": 45.57
      },
      {
        "slug": "hkl-student-residence-elmepa",
        "seq": 37,
        "cumKm": 13.997,
        "cumMin": 46.66
      },
      {
        "slug": "hkl-protypo-high-school-m",
        "seq": 38,
        "cumKm": 14.347,
        "cumMin": 47.82
      },
      {
        "slug": "hkl-ts-elmepa",
        "seq": 39,
        "cumKm": 14.622,
        "cumMin": 48.74
      }
    ]
  },
  {
    "code": "20033",
    "lineCode": "HKL-14",
    "name": "Giofyro - Mesa Vipei - KALLIThEA",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 1,
        "cumKm": 0.439,
        "cumMin": 1.46
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 2,
        "cumKm": 0.658,
        "cumMin": 2.19
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 3,
        "cumKm": 1.086,
        "cumMin": 3.62
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 4,
        "cumKm": 1.661,
        "cumMin": 5.54
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 5,
        "cumKm": 1.85,
        "cumMin": 6.17
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 6,
        "cumKm": 2.185,
        "cumMin": 7.28
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 7,
        "cumKm": 2.412,
        "cumMin": 8.04
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 8,
        "cumKm": 2.726,
        "cumMin": 9.09
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 9,
        "cumKm": 2.974,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 10,
        "cumKm": 3.178,
        "cumMin": 10.59
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 11,
        "cumKm": 3.523,
        "cumMin": 11.74
      },
      {
        "slug": "hkl-evans",
        "seq": 12,
        "cumKm": 3.682,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 13,
        "cumKm": 4.012,
        "cumMin": 13.37
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 14,
        "cumKm": 4.296,
        "cumMin": 14.32
      },
      {
        "slug": "hkl-analipsi",
        "seq": 15,
        "cumKm": 4.531,
        "cumMin": 15.1
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 16,
        "cumKm": 4.916,
        "cumMin": 16.39
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 17,
        "cumKm": 5.423,
        "cumMin": 18.08
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 18,
        "cumKm": 5.661,
        "cumMin": 18.87
      },
      {
        "slug": "hkl-poros-2",
        "seq": 19,
        "cumKm": 6.067,
        "cumMin": 20.22
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 20,
        "cumKm": 6.455,
        "cumMin": 21.52
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 21,
        "cumKm": 6.884,
        "cumMin": 22.95
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 22,
        "cumKm": 7.187,
        "cumMin": 23.96
      },
      {
        "slug": "hkl-irodotou",
        "seq": 23,
        "cumKm": 7.552,
        "cumMin": 25.17
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 24,
        "cumKm": 8.682,
        "cumMin": 28.94
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 25,
        "cumKm": 8.996,
        "cumMin": 29.99
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 26,
        "cumKm": 9.396,
        "cumMin": 31.32
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 27,
        "cumKm": 9.697,
        "cumMin": 32.32
      },
      {
        "slug": "hkl-street-gama-zita",
        "seq": 28,
        "cumKm": 10.052,
        "cumMin": 33.51
      },
      {
        "slug": "hkl-street-gama-zita-2",
        "seq": 29,
        "cumKm": 10.402,
        "cumMin": 34.67
      },
      {
        "slug": "hkl-street-gama-thita",
        "seq": 30,
        "cumKm": 10.73,
        "cumMin": 35.77
      },
      {
        "slug": "hkl-street-gama-giota",
        "seq": 31,
        "cumKm": 10.969,
        "cumMin": 36.56
      },
      {
        "slug": "hkl-street-ro-lamda",
        "seq": 32,
        "cumKm": 11.331,
        "cumMin": 37.77
      },
      {
        "slug": "hkl-street-ro-vita-3",
        "seq": 33,
        "cumKm": 11.65,
        "cumMin": 38.83
      },
      {
        "slug": "hkl-street-ro-vita-4",
        "seq": 34,
        "cumKm": 12.214,
        "cumMin": 40.71
      },
      {
        "slug": "hkl-street-ro-vita",
        "seq": 35,
        "cumKm": 12.494,
        "cumMin": 41.65
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 36,
        "cumKm": 12.787,
        "cumMin": 42.62
      },
      {
        "slug": "hkl-kallitiea",
        "seq": 37,
        "cumKm": 13.393,
        "cumMin": 44.64
      },
      {
        "slug": "hkl-kallitiea-2",
        "seq": 38,
        "cumKm": 13.692,
        "cumMin": 45.64
      },
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 39,
        "cumKm": 13.829,
        "cumMin": 46.1
      }
    ]
  },
  {
    "code": "20056",
    "lineCode": "HKL-14",
    "name": "Elmepa - EYThEIA Vipei - KALLIThEA",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.281,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.604,
        "cumMin": 2.01
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.918,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.438,
        "cumMin": 4.79
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.867,
        "cumMin": 6.22
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.109,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.369,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.971,
        "cumMin": 9.9
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.241,
        "cumMin": 10.8
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 10,
        "cumKm": 3.68,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 11,
        "cumKm": 3.9,
        "cumMin": 13
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 12,
        "cumKm": 4.327,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 13,
        "cumKm": 4.902,
        "cumMin": 16.34
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 14,
        "cumKm": 5.091,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 15,
        "cumKm": 5.426,
        "cumMin": 18.09
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 16,
        "cumKm": 5.654,
        "cumMin": 18.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 17,
        "cumKm": 5.967,
        "cumMin": 19.89
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 18,
        "cumKm": 6.216,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 19,
        "cumKm": 6.42,
        "cumMin": 21.4
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 20,
        "cumKm": 6.764,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-evans",
        "seq": 21,
        "cumKm": 6.923,
        "cumMin": 23.08
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 22,
        "cumKm": 7.192,
        "cumMin": 23.97
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 23,
        "cumKm": 7.315,
        "cumMin": 24.38
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 24,
        "cumKm": 7.599,
        "cumMin": 25.33
      },
      {
        "slug": "hkl-analipsi",
        "seq": 25,
        "cumKm": 7.835,
        "cumMin": 26.12
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 26,
        "cumKm": 8.22,
        "cumMin": 27.4
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 27,
        "cumKm": 8.727,
        "cumMin": 29.09
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 28,
        "cumKm": 8.965,
        "cumMin": 29.88
      },
      {
        "slug": "hkl-poros-2",
        "seq": 29,
        "cumKm": 9.37,
        "cumMin": 31.23
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 30,
        "cumKm": 9.759,
        "cumMin": 32.53
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 31,
        "cumKm": 10.188,
        "cumMin": 33.96
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 32,
        "cumKm": 10.491,
        "cumMin": 34.97
      },
      {
        "slug": "hkl-irodotou",
        "seq": 33,
        "cumKm": 10.856,
        "cumMin": 36.19
      },
      {
        "slug": "hkl-mausolou-gefyra-ethnikis",
        "seq": 34,
        "cumKm": 11.657,
        "cumMin": 38.86
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 35,
        "cumKm": 12.022,
        "cumMin": 40.07
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 36,
        "cumKm": 12.337,
        "cumMin": 41.12
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 37,
        "cumKm": 12.736,
        "cumMin": 42.45
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 38,
        "cumKm": 13.038,
        "cumMin": 43.46
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 39,
        "cumKm": 14.298,
        "cumMin": 47.66
      },
      {
        "slug": "hkl-kallitiea",
        "seq": 40,
        "cumKm": 14.904,
        "cumMin": 49.68
      },
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 41,
        "cumKm": 15.317,
        "cumMin": 51.06
      }
    ]
  },
  {
    "code": "20065",
    "lineCode": "HKL-14",
    "name": "Elmepa - Mesa Vipei - KALLIThEA.",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.281,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.604,
        "cumMin": 2.01
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.918,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.438,
        "cumMin": 4.79
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.867,
        "cumMin": 6.22
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.109,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.369,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.971,
        "cumMin": 9.9
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.241,
        "cumMin": 10.8
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 10,
        "cumKm": 3.68,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 11,
        "cumKm": 3.9,
        "cumMin": 13
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 12,
        "cumKm": 4.327,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 13,
        "cumKm": 4.902,
        "cumMin": 16.34
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 14,
        "cumKm": 5.091,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 15,
        "cumKm": 5.426,
        "cumMin": 18.09
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 16,
        "cumKm": 5.654,
        "cumMin": 18.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 17,
        "cumKm": 5.967,
        "cumMin": 19.89
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 18,
        "cumKm": 6.216,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 19,
        "cumKm": 6.42,
        "cumMin": 21.4
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 20,
        "cumKm": 6.764,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-evans",
        "seq": 21,
        "cumKm": 6.923,
        "cumMin": 23.08
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 22,
        "cumKm": 7.253,
        "cumMin": 24.18
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 23,
        "cumKm": 7.538,
        "cumMin": 25.13
      },
      {
        "slug": "hkl-analipsi",
        "seq": 24,
        "cumKm": 7.773,
        "cumMin": 25.91
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 25,
        "cumKm": 8.158,
        "cumMin": 27.19
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 26,
        "cumKm": 8.665,
        "cumMin": 28.88
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 27,
        "cumKm": 8.903,
        "cumMin": 29.68
      },
      {
        "slug": "hkl-poros-2",
        "seq": 28,
        "cumKm": 9.308,
        "cumMin": 31.03
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 29,
        "cumKm": 9.697,
        "cumMin": 32.32
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 30,
        "cumKm": 10.126,
        "cumMin": 33.75
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 31,
        "cumKm": 10.429,
        "cumMin": 34.76
      },
      {
        "slug": "hkl-irodotou",
        "seq": 32,
        "cumKm": 10.794,
        "cumMin": 35.98
      },
      {
        "slug": "hkl-mausolou-gefyra-ethnikis",
        "seq": 33,
        "cumKm": 11.596,
        "cumMin": 38.65
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 34,
        "cumKm": 11.96,
        "cumMin": 39.87
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 35,
        "cumKm": 12.275,
        "cumMin": 40.92
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 36,
        "cumKm": 12.674,
        "cumMin": 42.25
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 37,
        "cumKm": 12.976,
        "cumMin": 43.25
      },
      {
        "slug": "hkl-street-gama-zita",
        "seq": 38,
        "cumKm": 13.33,
        "cumMin": 44.43
      },
      {
        "slug": "hkl-street-gama-zita-2",
        "seq": 39,
        "cumKm": 13.68,
        "cumMin": 45.6
      },
      {
        "slug": "hkl-street-gama-thita",
        "seq": 40,
        "cumKm": 14.008,
        "cumMin": 46.69
      },
      {
        "slug": "hkl-street-gama-giota",
        "seq": 41,
        "cumKm": 14.247,
        "cumMin": 47.49
      },
      {
        "slug": "hkl-street-ro-lamda",
        "seq": 42,
        "cumKm": 14.61,
        "cumMin": 48.7
      },
      {
        "slug": "hkl-street-ro-vita-3",
        "seq": 43,
        "cumKm": 14.928,
        "cumMin": 49.76
      },
      {
        "slug": "hkl-street-ro-vita-4",
        "seq": 44,
        "cumKm": 15.492,
        "cumMin": 51.64
      },
      {
        "slug": "hkl-street-ro-vita",
        "seq": 45,
        "cumKm": 15.773,
        "cumMin": 52.58
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 46,
        "cumKm": 16.065,
        "cumMin": 53.55
      },
      {
        "slug": "hkl-kallitiea",
        "seq": 47,
        "cumKm": 16.671,
        "cumMin": 55.57
      },
      {
        "slug": "hkl-kallitiea-2",
        "seq": 48,
        "cumKm": 16.97,
        "cumMin": 56.57
      },
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 49,
        "cumKm": 17.107,
        "cumMin": 57.02
      }
    ]
  },
  {
    "code": "29124",
    "lineCode": "HKL-14",
    "name": "ITE Forth - EYThEIA Vipei - KALLIThEA",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-idryma-texnologias-ereunas-i-t-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 1,
        "cumKm": 0.663,
        "cumMin": 2.21
      },
      {
        "slug": "hkl-ts-panepistimio",
        "seq": 2,
        "cumKm": 1.308,
        "cumMin": 4.36
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 3,
        "cumKm": 1.764,
        "cumMin": 5.88
      },
      {
        "slug": "hkl-oikismos-agias-paraskeuis",
        "seq": 4,
        "cumKm": 2.311,
        "cumMin": 7.7
      },
      {
        "slug": "hkl-aretousas-2",
        "seq": 5,
        "cumKm": 2.935,
        "cumMin": 9.78
      },
      {
        "slug": "hkl-agioi-theodoroi-2",
        "seq": 6,
        "cumKm": 3.574,
        "cumMin": 11.91
      },
      {
        "slug": "hkl-parasyri",
        "seq": 7,
        "cumKm": 3.958,
        "cumMin": 13.19
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 8,
        "cumKm": 4.28,
        "cumMin": 14.27
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 9,
        "cumKm": 4.475,
        "cumMin": 14.92
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 10,
        "cumKm": 5.097,
        "cumMin": 16.99
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 11,
        "cumKm": 5.573,
        "cumMin": 18.58
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 12,
        "cumKm": 6.174,
        "cumMin": 20.58
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 13,
        "cumKm": 6.445,
        "cumMin": 21.48
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 14,
        "cumKm": 6.883,
        "cumMin": 22.94
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 15,
        "cumKm": 7.103,
        "cumMin": 23.68
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 16,
        "cumKm": 7.531,
        "cumMin": 25.1
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 17,
        "cumKm": 8.106,
        "cumMin": 27.02
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 18,
        "cumKm": 8.295,
        "cumMin": 27.65
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 19,
        "cumKm": 8.629,
        "cumMin": 28.76
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 20,
        "cumKm": 8.857,
        "cumMin": 29.52
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 21,
        "cumKm": 9.171,
        "cumMin": 30.57
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 22,
        "cumKm": 9.419,
        "cumMin": 31.4
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 23,
        "cumKm": 9.623,
        "cumMin": 32.08
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 24,
        "cumKm": 9.968,
        "cumMin": 33.23
      },
      {
        "slug": "hkl-evans",
        "seq": 25,
        "cumKm": 10.127,
        "cumMin": 33.76
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 26,
        "cumKm": 10.457,
        "cumMin": 34.86
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 27,
        "cumKm": 10.741,
        "cumMin": 35.8
      },
      {
        "slug": "hkl-analipsi",
        "seq": 28,
        "cumKm": 10.976,
        "cumMin": 36.59
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 29,
        "cumKm": 11.361,
        "cumMin": 37.87
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion-2",
        "seq": 30,
        "cumKm": 11.868,
        "cumMin": 39.56
      },
      {
        "slug": "hkl-ikarou-48",
        "seq": 31,
        "cumKm": 12.106,
        "cumMin": 40.35
      },
      {
        "slug": "hkl-poros-2",
        "seq": 32,
        "cumKm": 12.512,
        "cumMin": 41.71
      },
      {
        "slug": "hkl-ikarou-132-drakou",
        "seq": 33,
        "cumKm": 12.9,
        "cumMin": 43
      },
      {
        "slug": "hkl-katsampas-2",
        "seq": 34,
        "cumKm": 13.329,
        "cumMin": 44.43
      },
      {
        "slug": "hkl-ikarou-20",
        "seq": 35,
        "cumKm": 13.632,
        "cumMin": 45.44
      },
      {
        "slug": "hkl-irodotou",
        "seq": 36,
        "cumKm": 13.997,
        "cumMin": 46.66
      },
      {
        "slug": "hkl-mausolou-gefyra-ethnikis",
        "seq": 37,
        "cumKm": 14.799,
        "cumMin": 49.33
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 38,
        "cumKm": 15.164,
        "cumMin": 50.55
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 39,
        "cumKm": 15.478,
        "cumMin": 51.59
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 40,
        "cumKm": 15.878,
        "cumMin": 52.93
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 41,
        "cumKm": 16.179,
        "cumMin": 53.93
      },
      {
        "slug": "hkl-street-ro-vita",
        "seq": 42,
        "cumKm": 17.15,
        "cumMin": 57.17
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 43,
        "cumKm": 17.443,
        "cumMin": 58.14
      },
      {
        "slug": "hkl-kallitiea",
        "seq": 44,
        "cumKm": 18.049,
        "cumMin": 60.16
      },
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 45,
        "cumKm": 18.461,
        "cumMin": 61.54
      }
    ]
  },
  {
    "code": "21022",
    "lineCode": "HKL-15",
    "name": "Aerodromio - Foinikia",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-metaxaki-1",
        "seq": 23,
        "cumKm": 7.903,
        "cumMin": 26.34
      },
      {
        "slug": "hkl-metaxaki-2",
        "seq": 24,
        "cumKm": 8.399,
        "cumMin": 28
      },
      {
        "slug": "hkl-limnis-kourna",
        "seq": 25,
        "cumKm": 8.608,
        "cumMin": 28.69
      },
      {
        "slug": "hkl-christomichali-chylouri-1",
        "seq": 26,
        "cumKm": 8.693,
        "cumMin": 28.98
      },
      {
        "slug": "hkl-oaed",
        "seq": 27,
        "cumKm": 8.893,
        "cumMin": 29.64
      },
      {
        "slug": "hkl-agios-ioanni-xostos",
        "seq": 28,
        "cumKm": 9.593,
        "cumMin": 31.98
      },
      {
        "slug": "hkl-eirinis-filias",
        "seq": 29,
        "cumKm": 9.914,
        "cumMin": 33.05
      },
      {
        "slug": "hkl-manou-katraki-34",
        "seq": 30,
        "cumKm": 10.125,
        "cumMin": 33.75
      },
      {
        "slug": "hkl-pinelopis",
        "seq": 31,
        "cumKm": 11.188,
        "cumMin": 37.29
      },
      {
        "slug": "hkl-manou-katraki-64",
        "seq": 32,
        "cumKm": 11.589,
        "cumMin": 38.63
      },
      {
        "slug": "hkl-manou-katraki-106",
        "seq": 33,
        "cumKm": 12.379,
        "cumMin": 41.26
      },
      {
        "slug": "hkl-manou-katraki-168",
        "seq": 34,
        "cumKm": 13.376,
        "cumMin": 44.59
      },
      {
        "slug": "hkl-ts-foinikia",
        "seq": 35,
        "cumKm": 15.343,
        "cumMin": 51.14
      }
    ]
  },
  {
    "code": "20090",
    "lineCode": "HKL-16",
    "name": "Limani - Ag.aikaterini",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-dimokratias",
        "seq": 3,
        "cumKm": 0.95,
        "cumMin": 3.17
      },
      {
        "slug": "hkl-analipsi-m",
        "seq": 4,
        "cumKm": 1.195,
        "cumMin": 3.98
      },
      {
        "slug": "hkl-geronymaki-titou-georgiadou",
        "seq": 5,
        "cumKm": 1.498,
        "cumMin": 4.99
      },
      {
        "slug": "hkl-monis-gouvernetou",
        "seq": 6,
        "cumKm": 1.915,
        "cumMin": 6.38
      },
      {
        "slug": "hkl-emmanouil-mpantouva",
        "seq": 7,
        "cumKm": 2.076,
        "cumMin": 6.92
      },
      {
        "slug": "hkl-geronomaki",
        "seq": 8,
        "cumKm": 2.287,
        "cumMin": 7.62
      },
      {
        "slug": "hkl-lagkada",
        "seq": 9,
        "cumKm": 2.415,
        "cumMin": 8.05
      },
      {
        "slug": "hkl-proklou",
        "seq": 10,
        "cumKm": 2.669,
        "cumMin": 8.9
      },
      {
        "slug": "hkl-dafermou-filikis-etairias-ag-aikaterini",
        "seq": 11,
        "cumKm": 2.905,
        "cumMin": 9.68
      },
      {
        "slug": "hkl-dafermou-agiou-nektariou-ag-aik",
        "seq": 12,
        "cumKm": 3.217,
        "cumMin": 10.72
      },
      {
        "slug": "hkl-agiou-nektariou-filikis-etairias-ag-aik",
        "seq": 13,
        "cumKm": 3.586,
        "cumMin": 11.95
      },
      {
        "slug": "hkl-markogiannaki",
        "seq": 14,
        "cumKm": 3.966,
        "cumMin": 13.22
      },
      {
        "slug": "hkl-square-agias-aikaterinis",
        "seq": 15,
        "cumKm": 4.189,
        "cumMin": 13.96
      },
      {
        "slug": "hkl-chatzidaki-3",
        "seq": 16,
        "cumKm": 4.495,
        "cumMin": 14.98
      },
      {
        "slug": "hkl-kaxou",
        "seq": 17,
        "cumKm": 4.746,
        "cumMin": 15.82
      },
      {
        "slug": "hkl-krasadaki-1",
        "seq": 18,
        "cumKm": 5.165,
        "cumMin": 17.22
      },
      {
        "slug": "hkl-krasadaki-2",
        "seq": 19,
        "cumKm": 5.721,
        "cumMin": 19.07
      },
      {
        "slug": "hkl-krasadaki-xatzaki",
        "seq": 20,
        "cumKm": 6.245,
        "cumMin": 20.82
      },
      {
        "slug": "hkl-chatzaki-ag-ioannis",
        "seq": 21,
        "cumKm": 6.527,
        "cumMin": 21.76
      },
      {
        "slug": "hkl-ermi-1",
        "seq": 22,
        "cumKm": 6.79,
        "cumMin": 22.63
      },
      {
        "slug": "hkl-emm-voreadi",
        "seq": 23,
        "cumKm": 7.132,
        "cumMin": 23.77
      },
      {
        "slug": "hkl-ermi-2",
        "seq": 24,
        "cumKm": 7.337,
        "cumMin": 24.46
      },
      {
        "slug": "hkl-ermi-3",
        "seq": 25,
        "cumKm": 7.637,
        "cumMin": 25.46
      },
      {
        "slug": "hkl-ts-agia-aikaterini",
        "seq": 26,
        "cumKm": 7.788,
        "cumMin": 25.96
      }
    ]
  },
  {
    "code": "19945",
    "lineCode": "HKL-17",
    "name": "(kleisto) - Elmepa - Giofyro",
    "direction": 1,
    "stops": [
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.281,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.604,
        "cumMin": 2.01
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.918,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.438,
        "cumMin": 4.79
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.867,
        "cumMin": 6.22
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.109,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.369,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.971,
        "cumMin": 9.9
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.241,
        "cumMin": 10.8
      }
    ]
  },
  {
    "code": "20052",
    "lineCode": "HKL-17",
    "name": "Kleisto APO Aerodromio --> Giofyro",
    "direction": 1,
    "stops": [
      {
        "slug": "hkl-amaxostasio",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 1,
        "cumKm": 7.772,
        "cumMin": 25.91
      }
    ]
  },
  {
    "code": "31028",
    "lineCode": "HKL-17",
    "name": "NEO Koimitirio - Giofyro - 4005",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-cemetery",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-neofytou-oikonomou-2",
        "seq": 1,
        "cumKm": 0.848,
        "cumMin": 2.83
      },
      {
        "slug": "hkl-vritomartidos-2",
        "seq": 2,
        "cumKm": 1.407,
        "cumMin": 4.69
      },
      {
        "slug": "hkl-pitsoulaki-sxoliko-peiramatiko",
        "seq": 3,
        "cumKm": 1.813,
        "cumMin": 6.04
      },
      {
        "slug": "hkl-mpentevi-2",
        "seq": 4,
        "cumKm": 1.993,
        "cumMin": 6.64
      },
      {
        "slug": "hkl-pertselaki-2",
        "seq": 5,
        "cumKm": 2.279,
        "cumMin": 7.6
      },
      {
        "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
        "seq": 6,
        "cumKm": 2.908,
        "cumMin": 9.69
      },
      {
        "slug": "hkl-avenue-dimokratias-79",
        "seq": 7,
        "cumKm": 3.135,
        "cumMin": 10.45
      },
      {
        "slug": "hkl-krintsas",
        "seq": 8,
        "cumKm": 3.368,
        "cumMin": 11.23
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 9,
        "cumKm": 3.624,
        "cumMin": 12.08
      },
      {
        "slug": "hkl-analipsi",
        "seq": 10,
        "cumKm": 3.956,
        "cumMin": 13.19
      },
      {
        "slug": "hkl-averof",
        "seq": 11,
        "cumKm": 4.327,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 12,
        "cumKm": 4.737,
        "cumMin": 15.79
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 13,
        "cumKm": 5.092,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 14,
        "cumKm": 5.29,
        "cumMin": 17.63
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 15,
        "cumKm": 5.611,
        "cumMin": 18.7
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 16,
        "cumKm": 5.861,
        "cumMin": 19.54
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 17,
        "cumKm": 6.138,
        "cumMin": 20.46
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 18,
        "cumKm": 6.466,
        "cumMin": 21.55
      },
      {
        "slug": "hkl-kaminia",
        "seq": 19,
        "cumKm": 6.698,
        "cumMin": 22.33
      },
      {
        "slug": "hkl-deilina",
        "seq": 20,
        "cumKm": 7.183,
        "cumMin": 23.94
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 21,
        "cumKm": 7.602,
        "cumMin": 25.34
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 22,
        "cumKm": 7.902,
        "cumMin": 26.34
      }
    ]
  },
  {
    "code": "20100",
    "lineCode": "HKL-19",
    "name": "Amnissos - IKA - AThANATOYS. (goyrnes)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou-2",
        "seq": 1,
        "cumKm": 0.324,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-michail-archaggelou-2",
        "seq": 2,
        "cumKm": 0.877,
        "cumMin": 2.92
      },
      {
        "slug": "hkl-amnissos-paralia-karterou",
        "seq": 3,
        "cumKm": 1.42,
        "cumMin": 4.73
      },
      {
        "slug": "hkl-riding-academy-crete-2",
        "seq": 4,
        "cumKm": 1.763,
        "cumMin": 5.88
      },
      {
        "slug": "hkl-agiou-alexandrou-2",
        "seq": 5,
        "cumKm": 2.424,
        "cumMin": 8.08
      },
      {
        "slug": "hkl-agios-ioannis-amnissos-2",
        "seq": 6,
        "cumKm": 2.934,
        "cumMin": 9.78
      },
      {
        "slug": "hkl-petroemporiki-2",
        "seq": 7,
        "cumKm": 3.46,
        "cumMin": 11.53
      },
      {
        "slug": "hkl-sminarchia-2",
        "seq": 8,
        "cumKm": 4.486,
        "cumMin": 14.95
      },
      {
        "slug": "hkl-police-station-2",
        "seq": 9,
        "cumKm": 6.078,
        "cumMin": 20.26
      },
      {
        "slug": "hkl-anagenniseos",
        "seq": 10,
        "cumKm": 6.435,
        "cumMin": 21.45
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 11,
        "cumKm": 6.769,
        "cumMin": 22.56
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 12,
        "cumKm": 6.996,
        "cumMin": 23.32
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 13,
        "cumKm": 7.371,
        "cumMin": 24.57
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 14,
        "cumKm": 7.762,
        "cumMin": 25.87
      },
      {
        "slug": "hkl-katsampas",
        "seq": 15,
        "cumKm": 8.062,
        "cumMin": 26.87
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 16,
        "cumKm": 8.502,
        "cumMin": 28.34
      },
      {
        "slug": "hkl-poros",
        "seq": 17,
        "cumKm": 8.843,
        "cumMin": 29.48
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 18,
        "cumKm": 9.035,
        "cumMin": 30.12
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 19,
        "cumKm": 9.31,
        "cumMin": 31.03
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 20,
        "cumKm": 9.676,
        "cumMin": 32.25
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 21,
        "cumKm": 10.085,
        "cumMin": 33.62
      },
      {
        "slug": "hkl-averof",
        "seq": 22,
        "cumKm": 10.277,
        "cumMin": 34.26
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 23,
        "cumKm": 10.686,
        "cumMin": 35.62
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 24,
        "cumKm": 11.041,
        "cumMin": 36.8
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 25,
        "cumKm": 11.24,
        "cumMin": 37.47
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 26,
        "cumKm": 11.56,
        "cumMin": 38.53
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 27,
        "cumKm": 11.81,
        "cumMin": 39.37
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 28,
        "cumKm": 12.088,
        "cumMin": 40.29
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 29,
        "cumKm": 12.416,
        "cumMin": 41.39
      },
      {
        "slug": "hkl-kaminia",
        "seq": 30,
        "cumKm": 12.648,
        "cumMin": 42.16
      },
      {
        "slug": "hkl-deilina",
        "seq": 31,
        "cumKm": 13.133,
        "cumMin": 43.78
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 32,
        "cumKm": 13.552,
        "cumMin": 45.17
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 33,
        "cumKm": 13.851,
        "cumMin": 46.17
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 34,
        "cumKm": 14.216,
        "cumMin": 47.39
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 35,
        "cumKm": 14.496,
        "cumMin": 48.32
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 36,
        "cumKm": 15.022,
        "cumMin": 50.07
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 37,
        "cumKm": 15.694,
        "cumMin": 52.31
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 38,
        "cumKm": 16.331,
        "cumMin": 54.44
      },
      {
        "slug": "hkl-eo-irakleiou-faistou",
        "seq": 39,
        "cumKm": 19.303,
        "cumMin": 64.34
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-2",
        "seq": 40,
        "cumKm": 20.216,
        "cumMin": 67.39
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-3",
        "seq": 41,
        "cumKm": 21.259,
        "cumMin": 70.86
      },
      {
        "slug": "hkl-ts-athanati",
        "seq": 42,
        "cumKm": 22.538,
        "cumMin": 75.13
      }
    ]
  },
  {
    "code": "20101",
    "lineCode": "HKL-19",
    "name": "Amnissos - Elmepa - Goyrnes - AThANATOI",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-amnissos-terminal-station",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-amnissos-paralia-amnissou-2",
        "seq": 1,
        "cumKm": 0.324,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-michail-archaggelou-2",
        "seq": 2,
        "cumKm": 0.877,
        "cumMin": 2.92
      },
      {
        "slug": "hkl-amnissos-paralia-karterou",
        "seq": 3,
        "cumKm": 1.42,
        "cumMin": 4.73
      },
      {
        "slug": "hkl-riding-academy-crete-2",
        "seq": 4,
        "cumKm": 1.763,
        "cumMin": 5.88
      },
      {
        "slug": "hkl-agiou-alexandrou-2",
        "seq": 5,
        "cumKm": 2.424,
        "cumMin": 8.08
      },
      {
        "slug": "hkl-agios-ioannis-amnissos-2",
        "seq": 6,
        "cumKm": 2.934,
        "cumMin": 9.78
      },
      {
        "slug": "hkl-petroemporiki-2",
        "seq": 7,
        "cumKm": 3.46,
        "cumMin": 11.53
      },
      {
        "slug": "hkl-sminarchia-2",
        "seq": 8,
        "cumKm": 4.486,
        "cumMin": 14.95
      },
      {
        "slug": "hkl-police-station-2",
        "seq": 9,
        "cumKm": 6.078,
        "cumMin": 20.26
      },
      {
        "slug": "hkl-anagenniseos",
        "seq": 10,
        "cumKm": 6.435,
        "cumMin": 21.45
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 11,
        "cumKm": 6.769,
        "cumMin": 22.56
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 12,
        "cumKm": 6.996,
        "cumMin": 23.32
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 13,
        "cumKm": 7.371,
        "cumMin": 24.57
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 14,
        "cumKm": 7.762,
        "cumMin": 25.87
      },
      {
        "slug": "hkl-katsampas",
        "seq": 15,
        "cumKm": 8.062,
        "cumMin": 26.87
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 16,
        "cumKm": 8.502,
        "cumMin": 28.34
      },
      {
        "slug": "hkl-poros",
        "seq": 17,
        "cumKm": 8.843,
        "cumMin": 29.48
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 18,
        "cumKm": 9.035,
        "cumMin": 30.12
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 19,
        "cumKm": 9.31,
        "cumMin": 31.03
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 20,
        "cumKm": 9.676,
        "cumMin": 32.25
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 21,
        "cumKm": 10.085,
        "cumMin": 33.62
      },
      {
        "slug": "hkl-averof",
        "seq": 22,
        "cumKm": 10.277,
        "cumMin": 34.26
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 23,
        "cumKm": 10.686,
        "cumMin": 35.62
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 24,
        "cumKm": 11.041,
        "cumMin": 36.8
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 25,
        "cumKm": 11.24,
        "cumMin": 37.47
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 26,
        "cumKm": 11.56,
        "cumMin": 38.53
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 27,
        "cumKm": 11.81,
        "cumMin": 39.37
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 28,
        "cumKm": 12.088,
        "cumMin": 40.29
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 29,
        "cumKm": 12.416,
        "cumMin": 41.39
      },
      {
        "slug": "hkl-kaminia",
        "seq": 30,
        "cumKm": 12.648,
        "cumMin": 42.16
      },
      {
        "slug": "hkl-deilina",
        "seq": 31,
        "cumKm": 13.133,
        "cumMin": 43.78
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 32,
        "cumKm": 13.552,
        "cumMin": 45.17
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 33,
        "cumKm": 13.851,
        "cumMin": 46.17
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 34,
        "cumKm": 14.216,
        "cumMin": 47.39
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 35,
        "cumKm": 14.496,
        "cumMin": 48.32
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 36,
        "cumKm": 15.022,
        "cumMin": 50.07
      },
      {
        "slug": "hkl-athitaki",
        "seq": 37,
        "cumKm": 15.58,
        "cumMin": 51.93
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-m",
        "seq": 38,
        "cumKm": 15.862,
        "cumMin": 52.87
      },
      {
        "slug": "hkl-basketball-court-elmepa",
        "seq": 39,
        "cumKm": 16.37,
        "cumMin": 54.57
      },
      {
        "slug": "hkl-student-residence-elmepa",
        "seq": 40,
        "cumKm": 16.698,
        "cumMin": 55.66
      },
      {
        "slug": "hkl-protypo-high-school-m",
        "seq": 41,
        "cumKm": 17.048,
        "cumMin": 56.83
      },
      {
        "slug": "hkl-ts-elmepa",
        "seq": 42,
        "cumKm": 17.322,
        "cumMin": 57.74
      },
      {
        "slug": "hkl-agiou-antoniou-nikolaou",
        "seq": 43,
        "cumKm": 18.612,
        "cumMin": 62.04
      },
      {
        "slug": "hkl-gournes",
        "seq": 44,
        "cumKm": 19.657,
        "cumMin": 65.52
      },
      {
        "slug": "hkl-entrance-limani-pili",
        "seq": 45,
        "cumKm": 20.815,
        "cumMin": 69.38
      },
      {
        "slug": "hkl-eo-irakleiou-faistou",
        "seq": 46,
        "cumKm": 21.618,
        "cumMin": 72.06
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-2",
        "seq": 47,
        "cumKm": 22.531,
        "cumMin": 75.1
      },
      {
        "slug": "hkl-eo-irakleiou-faistou-3",
        "seq": 48,
        "cumKm": 23.574,
        "cumMin": 78.58
      },
      {
        "slug": "hkl-ts-athanati",
        "seq": 49,
        "cumKm": 24.852,
        "cumMin": 82.84
      }
    ]
  },
  {
    "code": "30073",
    "lineCode": "HKL-20",
    "name": "Mesampelies - Mastampa - Kornaroy - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-mesampelies",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-alkmaionos-17",
        "seq": 1,
        "cumKm": 0.276,
        "cumMin": 0.92
      },
      {
        "slug": "hkl-alkmaionos-antieon",
        "seq": 2,
        "cumKm": 0.491,
        "cumMin": 1.64
      },
      {
        "slug": "hkl-antieon-nikis",
        "seq": 3,
        "cumKm": 0.712,
        "cumMin": 2.37
      },
      {
        "slug": "hkl-zervou",
        "seq": 4,
        "cumKm": 0.832,
        "cumMin": 2.77
      },
      {
        "slug": "hkl-markou-karanastasi",
        "seq": 5,
        "cumKm": 1.221,
        "cumMin": 4.07
      },
      {
        "slug": "hkl-papanastasiou-217",
        "seq": 6,
        "cumKm": 1.44,
        "cumMin": 4.8
      },
      {
        "slug": "hkl-eam-papanastasiou-197",
        "seq": 7,
        "cumKm": 1.71,
        "cumMin": 5.7
      },
      {
        "slug": "hkl-papanastasiou-179",
        "seq": 8,
        "cumKm": 1.993,
        "cumMin": 6.64
      },
      {
        "slug": "hkl-agios-eugenios",
        "seq": 9,
        "cumKm": 2.23,
        "cumMin": 7.43
      },
      {
        "slug": "hkl-papanastasiou-145",
        "seq": 10,
        "cumKm": 2.497,
        "cumMin": 8.32
      },
      {
        "slug": "hkl-ethnomartyron-antheon-mesampelis",
        "seq": 11,
        "cumKm": 2.704,
        "cumMin": 9.01
      },
      {
        "slug": "hkl-antieon-nefelis",
        "seq": 12,
        "cumKm": 2.929,
        "cumMin": 9.76
      },
      {
        "slug": "hkl-sperxiou-oulaf-palme",
        "seq": 13,
        "cumKm": 3.474,
        "cumMin": 11.58
      },
      {
        "slug": "hkl-square-sinani",
        "seq": 14,
        "cumKm": 4.529,
        "cumMin": 15.1
      },
      {
        "slug": "hkl-ionias-209",
        "seq": 15,
        "cumKm": 4.778,
        "cumMin": 15.93
      },
      {
        "slug": "hkl-ionias-165-kavali",
        "seq": 16,
        "cumKm": 5.029,
        "cumMin": 16.76
      },
      {
        "slug": "hkl-ionias-111-square-atsaleniou",
        "seq": 17,
        "cumKm": 5.395,
        "cumMin": 17.98
      },
      {
        "slug": "hkl-ionias-85-agia-sofia",
        "seq": 18,
        "cumKm": 5.579,
        "cumMin": 18.6
      },
      {
        "slug": "hkl-ionias-35",
        "seq": 19,
        "cumKm": 5.8,
        "cumMin": 19.33
      },
      {
        "slug": "hkl-georgiou-papandreou-47",
        "seq": 20,
        "cumKm": 6.125,
        "cumMin": 20.42
      },
      {
        "slug": "hkl-chrysostomou-29",
        "seq": 21,
        "cumKm": 6.401,
        "cumMin": 21.34
      },
      {
        "slug": "hkl-square-kyprou-2",
        "seq": 22,
        "cumKm": 6.734,
        "cumMin": 22.45
      },
      {
        "slug": "hkl-evans-2",
        "seq": 23,
        "cumKm": 6.963,
        "cumMin": 23.21
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 24,
        "cumKm": 7.179,
        "cumMin": 23.93
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 25,
        "cumKm": 7.535,
        "cumMin": 25.12
      },
      {
        "slug": "hkl-st-giamalaki-kazantzaki",
        "seq": 26,
        "cumKm": 7.802,
        "cumMin": 26.01
      },
      {
        "slug": "hkl-sofokli-venizelou-giamalaki",
        "seq": 27,
        "cumKm": 8.074,
        "cumMin": 26.91
      },
      {
        "slug": "hkl-sofokli-venizelou-historical-museum",
        "seq": 28,
        "cumKm": 8.228,
        "cumMin": 27.43
      },
      {
        "slug": "hkl-fort-koule-square-18",
        "seq": 29,
        "cumKm": 8.666,
        "cumMin": 28.89
      },
      {
        "slug": "hkl-ts-port",
        "seq": 30,
        "cumKm": 9.251,
        "cumMin": 30.84
      }
    ]
  },
  {
    "code": "30075",
    "lineCode": "HKL-20",
    "name": "Elmepa - Limani-3974",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-elmepa-epis",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-protypo-high-school-e",
        "seq": 1,
        "cumKm": 0.281,
        "cumMin": 0.94
      },
      {
        "slug": "hkl-student-residence-elmepa-2",
        "seq": 2,
        "cumKm": 0.604,
        "cumMin": 2.01
      },
      {
        "slug": "hkl-basketball-court-elmepa-2",
        "seq": 3,
        "cumKm": 0.918,
        "cumMin": 3.06
      },
      {
        "slug": "hkl-hellenic-mediterranean-university-e",
        "seq": 4,
        "cumKm": 1.438,
        "cumMin": 4.79
      },
      {
        "slug": "hkl-athitaki-2",
        "seq": 5,
        "cumKm": 1.867,
        "cumMin": 6.22
      },
      {
        "slug": "hkl-athitaki-2-2",
        "seq": 6,
        "cumKm": 2.109,
        "cumMin": 7.03
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 7,
        "cumKm": 2.369,
        "cumMin": 7.9
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 8,
        "cumKm": 2.971,
        "cumMin": 9.9
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 9,
        "cumKm": 3.241,
        "cumMin": 10.8
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 10,
        "cumKm": 3.68,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 11,
        "cumKm": 3.9,
        "cumMin": 13
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 12,
        "cumKm": 4.327,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 13,
        "cumKm": 4.902,
        "cumMin": 16.34
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 14,
        "cumKm": 5.091,
        "cumMin": 16.97
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 15,
        "cumKm": 5.426,
        "cumMin": 18.09
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 16,
        "cumKm": 5.654,
        "cumMin": 18.85
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 17,
        "cumKm": 5.967,
        "cumMin": 19.89
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 18,
        "cumKm": 6.216,
        "cumMin": 20.72
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 19,
        "cumKm": 6.42,
        "cumMin": 21.4
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 20,
        "cumKm": 6.764,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-evans",
        "seq": 21,
        "cumKm": 6.923,
        "cumMin": 23.08
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 22,
        "cumKm": 7.253,
        "cumMin": 24.18
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 23,
        "cumKm": 7.538,
        "cumMin": 25.13
      },
      {
        "slug": "hkl-analipsi",
        "seq": 24,
        "cumKm": 7.773,
        "cumMin": 25.91
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 25,
        "cumKm": 8.158,
        "cumMin": 27.19
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 26,
        "cumKm": 8.631,
        "cumMin": 28.77
      },
      {
        "slug": "hkl-ts-port",
        "seq": 27,
        "cumKm": 8.983,
        "cumMin": 29.94
      }
    ]
  },
  {
    "code": "30083",
    "lineCode": "HKL-20",
    "name": "Gazi - Limani ( E )",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-gazi",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-agiou-spyridonos-2",
        "seq": 1,
        "cumKm": 0.794,
        "cumMin": 2.65
      },
      {
        "slug": "hkl-eleutheriou-venizelou-249",
        "seq": 2,
        "cumKm": 1.298,
        "cumMin": 4.33
      },
      {
        "slug": "hkl-town-hall-gaziou-2",
        "seq": 3,
        "cumKm": 1.545,
        "cumMin": 5.15
      },
      {
        "slug": "hkl-eleutheriou-venizelou-4",
        "seq": 4,
        "cumKm": 1.791,
        "cumMin": 5.97
      },
      {
        "slug": "hkl-eleutheriou-venizelou-164",
        "seq": 5,
        "cumKm": 2.017,
        "cumMin": 6.72
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika-2",
        "seq": 6,
        "cumKm": 2.65,
        "cumMin": 8.83
      },
      {
        "slug": "hkl-eleutheriou-venizelou-2",
        "seq": 7,
        "cumKm": 3.264,
        "cumMin": 10.88
      },
      {
        "slug": "hkl-gennimata-venizelou",
        "seq": 8,
        "cumKm": 3.728,
        "cumMin": 12.43
      },
      {
        "slug": "hkl-georgiou-gennimata-21-2",
        "seq": 9,
        "cumKm": 3.925,
        "cumMin": 13.08
      },
      {
        "slug": "hkl-georgiou-gennimata-36",
        "seq": 10,
        "cumKm": 4.145,
        "cumMin": 13.82
      },
      {
        "slug": "hkl-tsalikaki-2",
        "seq": 11,
        "cumKm": 4.395,
        "cumMin": 14.65
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou-2",
        "seq": 12,
        "cumKm": 5.448,
        "cumMin": 18.16
      },
      {
        "slug": "hkl-xeropotamos-vamvoukaki",
        "seq": 13,
        "cumKm": 5.811,
        "cumMin": 19.37
      },
      {
        "slug": "hkl-62-martyron-370-pagkritio-stadium",
        "seq": 14,
        "cumKm": 6.096,
        "cumMin": 20.32
      },
      {
        "slug": "hkl-62-martyron-366",
        "seq": 15,
        "cumKm": 6.321,
        "cumMin": 21.07
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 16,
        "cumKm": 7.177,
        "cumMin": 23.92
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 17,
        "cumKm": 7.396,
        "cumMin": 24.65
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 18,
        "cumKm": 7.824,
        "cumMin": 26.08
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 19,
        "cumKm": 8.399,
        "cumMin": 28
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 20,
        "cumKm": 8.588,
        "cumMin": 28.63
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 21,
        "cumKm": 8.923,
        "cumMin": 29.74
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 22,
        "cumKm": 9.15,
        "cumMin": 30.5
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 23,
        "cumKm": 9.464,
        "cumMin": 31.55
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 24,
        "cumKm": 9.712,
        "cumMin": 32.37
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 25,
        "cumKm": 9.916,
        "cumMin": 33.05
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 26,
        "cumKm": 10.261,
        "cumMin": 34.2
      },
      {
        "slug": "hkl-evans",
        "seq": 27,
        "cumKm": 10.42,
        "cumMin": 34.73
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 28,
        "cumKm": 10.75,
        "cumMin": 35.83
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 29,
        "cumKm": 11.034,
        "cumMin": 36.78
      },
      {
        "slug": "hkl-analipsi",
        "seq": 30,
        "cumKm": 11.269,
        "cumMin": 37.56
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 31,
        "cumKm": 11.654,
        "cumMin": 38.85
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 32,
        "cumKm": 12.127,
        "cumMin": 40.42
      },
      {
        "slug": "hkl-ts-port",
        "seq": 33,
        "cumKm": 12.479,
        "cumMin": 41.6
      }
    ]
  },
  {
    "code": "30090",
    "lineCode": "HKL-20",
    "name": "Ag.aikaterini - Limani-3992",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-agia-aikaterini",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-ptolemaion-karditsi",
        "seq": 1,
        "cumKm": 0.224,
        "cumMin": 0.75
      },
      {
        "slug": "hkl-natiena",
        "seq": 2,
        "cumKm": 0.392,
        "cumMin": 1.31
      },
      {
        "slug": "hkl-ermi-4",
        "seq": 3,
        "cumKm": 0.802,
        "cumMin": 2.67
      },
      {
        "slug": "hkl-emm-voreadi-2",
        "seq": 4,
        "cumKm": 0.993,
        "cumMin": 3.31
      },
      {
        "slug": "hkl-ermi-5",
        "seq": 5,
        "cumKm": 1.325,
        "cumMin": 4.42
      },
      {
        "slug": "hkl-pikrodafni",
        "seq": 6,
        "cumKm": 1.583,
        "cumMin": 5.28
      },
      {
        "slug": "hkl-athanasioy-moysi-ag-aik-e",
        "seq": 7,
        "cumKm": 1.769,
        "cumMin": 5.9
      },
      {
        "slug": "hkl-krasadaki-4",
        "seq": 8,
        "cumKm": 2.393,
        "cumMin": 7.98
      },
      {
        "slug": "hkl-vritomartidos-2",
        "seq": 9,
        "cumKm": 2.852,
        "cumMin": 9.51
      },
      {
        "slug": "hkl-pitsoulaki",
        "seq": 10,
        "cumKm": 3.224,
        "cumMin": 10.75
      },
      {
        "slug": "hkl-emmanouil-mpantouva-2",
        "seq": 11,
        "cumKm": 4.323,
        "cumMin": 14.41
      },
      {
        "slug": "hkl-monis-gouvernetou-2",
        "seq": 12,
        "cumKm": 4.504,
        "cumMin": 15.01
      },
      {
        "slug": "hkl-titou-georgiadou",
        "seq": 13,
        "cumKm": 4.926,
        "cumMin": 16.42
      },
      {
        "slug": "hkl-analipsi",
        "seq": 14,
        "cumKm": 5.189,
        "cumMin": 17.3
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 15,
        "cumKm": 5.574,
        "cumMin": 18.58
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 16,
        "cumKm": 6.046,
        "cumMin": 20.15
      },
      {
        "slug": "hkl-ts-port",
        "seq": 17,
        "cumKm": 6.399,
        "cumMin": 21.33
      }
    ]
  },
  {
    "code": "30094",
    "lineCode": "HKL-20",
    "name": "ITE - Panepistimio - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-idryma-texnologias-ereunas-i-t-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 1,
        "cumKm": 0.663,
        "cumMin": 2.21
      },
      {
        "slug": "hkl-ts-panepistimio",
        "seq": 2,
        "cumKm": 1.308,
        "cumMin": 4.36
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 3,
        "cumKm": 1.764,
        "cumMin": 5.88
      },
      {
        "slug": "hkl-oikismos-agias-paraskeuis",
        "seq": 4,
        "cumKm": 2.311,
        "cumMin": 7.7
      },
      {
        "slug": "hkl-aretousas-2",
        "seq": 5,
        "cumKm": 2.935,
        "cumMin": 9.78
      },
      {
        "slug": "hkl-agioi-theodoroi-2",
        "seq": 6,
        "cumKm": 3.574,
        "cumMin": 11.91
      },
      {
        "slug": "hkl-parasyri",
        "seq": 7,
        "cumKm": 3.958,
        "cumMin": 13.19
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 8,
        "cumKm": 4.28,
        "cumMin": 14.27
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 9,
        "cumKm": 4.475,
        "cumMin": 14.92
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 10,
        "cumKm": 5.097,
        "cumMin": 16.99
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 11,
        "cumKm": 5.573,
        "cumMin": 18.58
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 12,
        "cumKm": 6.174,
        "cumMin": 20.58
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 13,
        "cumKm": 6.445,
        "cumMin": 21.48
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 14,
        "cumKm": 6.883,
        "cumMin": 22.94
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 15,
        "cumKm": 7.103,
        "cumMin": 23.68
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 16,
        "cumKm": 7.531,
        "cumMin": 25.1
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 17,
        "cumKm": 8.106,
        "cumMin": 27.02
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 18,
        "cumKm": 8.295,
        "cumMin": 27.65
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 19,
        "cumKm": 8.629,
        "cumMin": 28.76
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 20,
        "cumKm": 8.857,
        "cumMin": 29.52
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 21,
        "cumKm": 9.171,
        "cumMin": 30.57
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 22,
        "cumKm": 9.419,
        "cumMin": 31.4
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 23,
        "cumKm": 9.623,
        "cumMin": 32.08
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 24,
        "cumKm": 9.968,
        "cumMin": 33.23
      },
      {
        "slug": "hkl-evans",
        "seq": 25,
        "cumKm": 10.127,
        "cumMin": 33.76
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 26,
        "cumKm": 10.457,
        "cumMin": 34.86
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 27,
        "cumKm": 10.741,
        "cumMin": 35.8
      },
      {
        "slug": "hkl-analipsi",
        "seq": 28,
        "cumKm": 10.976,
        "cumMin": 36.59
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 29,
        "cumKm": 11.361,
        "cumMin": 37.87
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 30,
        "cumKm": 11.834,
        "cumMin": 39.45
      },
      {
        "slug": "hkl-ts-port",
        "seq": 31,
        "cumKm": 12.186,
        "cumMin": 40.62
      }
    ]
  },
  {
    "code": "30095",
    "lineCode": "HKL-20",
    "name": "KAVROChORI - Gazi - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-kavroxori",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-kavroxori-stasi-3-2",
        "seq": 1,
        "cumKm": 0.261,
        "cumMin": 0.87
      },
      {
        "slug": "hkl-kavroxori-stasi-2-2",
        "seq": 2,
        "cumKm": 0.564,
        "cumMin": 1.88
      },
      {
        "slug": "hkl-diakladosi-krousona",
        "seq": 3,
        "cumKm": 1.304,
        "cumMin": 4.35
      },
      {
        "slug": "hkl-agios-georgios-4",
        "seq": 4,
        "cumKm": 2.23,
        "cumMin": 7.43
      },
      {
        "slug": "hkl-agiou-spyridonos-2",
        "seq": 5,
        "cumKm": 2.816,
        "cumMin": 9.39
      },
      {
        "slug": "hkl-eleutheriou-venizelou-249",
        "seq": 6,
        "cumKm": 3.32,
        "cumMin": 11.07
      },
      {
        "slug": "hkl-town-hall-gaziou-2",
        "seq": 7,
        "cumKm": 3.568,
        "cumMin": 11.89
      },
      {
        "slug": "hkl-eleutheriou-venizelou-4",
        "seq": 8,
        "cumKm": 3.813,
        "cumMin": 12.71
      },
      {
        "slug": "hkl-eleutheriou-venizelou-164",
        "seq": 9,
        "cumKm": 4.039,
        "cumMin": 13.46
      },
      {
        "slug": "hkl-eleutheriou-venizelou-aromatika-2",
        "seq": 10,
        "cumKm": 4.673,
        "cumMin": 15.58
      },
      {
        "slug": "hkl-eleutheriou-venizelou-2",
        "seq": 11,
        "cumKm": 5.287,
        "cumMin": 17.62
      },
      {
        "slug": "hkl-gennimata-venizelou",
        "seq": 12,
        "cumKm": 5.751,
        "cumMin": 19.17
      },
      {
        "slug": "hkl-georgiou-gennimata-21-2",
        "seq": 13,
        "cumKm": 5.948,
        "cumMin": 19.83
      },
      {
        "slug": "hkl-georgiou-gennimata-36",
        "seq": 14,
        "cumKm": 6.167,
        "cumMin": 20.56
      },
      {
        "slug": "hkl-tsalikaki-2",
        "seq": 15,
        "cumKm": 6.418,
        "cumMin": 21.39
      },
      {
        "slug": "hkl-eleutheriou-venizelou-papandreou-2",
        "seq": 16,
        "cumKm": 7.47,
        "cumMin": 24.9
      },
      {
        "slug": "hkl-xeropotamos-vamvoukaki",
        "seq": 17,
        "cumKm": 7.833,
        "cumMin": 26.11
      },
      {
        "slug": "hkl-62-martyron-370-pagkritio-stadium",
        "seq": 18,
        "cumKm": 8.118,
        "cumMin": 27.06
      },
      {
        "slug": "hkl-62-martyron-366",
        "seq": 19,
        "cumKm": 8.343,
        "cumMin": 27.81
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 20,
        "cumKm": 9.199,
        "cumMin": 30.66
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 21,
        "cumKm": 9.419,
        "cumMin": 31.4
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 22,
        "cumKm": 9.846,
        "cumMin": 32.82
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 23,
        "cumKm": 10.421,
        "cumMin": 34.74
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 24,
        "cumKm": 10.61,
        "cumMin": 35.37
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 25,
        "cumKm": 10.945,
        "cumMin": 36.48
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 26,
        "cumKm": 11.172,
        "cumMin": 37.24
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 27,
        "cumKm": 11.486,
        "cumMin": 38.29
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 28,
        "cumKm": 11.735,
        "cumMin": 39.12
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 29,
        "cumKm": 11.939,
        "cumMin": 39.8
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 30,
        "cumKm": 12.283,
        "cumMin": 40.94
      },
      {
        "slug": "hkl-evans",
        "seq": 31,
        "cumKm": 12.442,
        "cumMin": 41.47
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 32,
        "cumKm": 12.772,
        "cumMin": 42.57
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 33,
        "cumKm": 13.056,
        "cumMin": 43.52
      },
      {
        "slug": "hkl-analipsi",
        "seq": 34,
        "cumKm": 13.292,
        "cumMin": 44.31
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 35,
        "cumKm": 13.677,
        "cumMin": 45.59
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 36,
        "cumKm": 14.15,
        "cumMin": 47.17
      },
      {
        "slug": "hkl-ts-port",
        "seq": 37,
        "cumKm": 14.502,
        "cumMin": 48.34
      }
    ]
  },
  {
    "code": "30107",
    "lineCode": "HKL-20",
    "name": "Mastampa - Limani ( Epistrofi Trikoypi )",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-square-sinani",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-ionias-209",
        "seq": 1,
        "cumKm": 0.249,
        "cumMin": 0.83
      },
      {
        "slug": "hkl-ionias-165-kavali",
        "seq": 2,
        "cumKm": 0.5,
        "cumMin": 1.67
      },
      {
        "slug": "hkl-ionias-111-square-atsaleniou",
        "seq": 3,
        "cumKm": 0.865,
        "cumMin": 2.88
      },
      {
        "slug": "hkl-ionias-85-agia-sofia",
        "seq": 4,
        "cumKm": 1.05,
        "cumMin": 3.5
      },
      {
        "slug": "hkl-ionias-35",
        "seq": 5,
        "cumKm": 1.271,
        "cumMin": 4.24
      },
      {
        "slug": "hkl-georgiou-papandreou-47",
        "seq": 6,
        "cumKm": 1.596,
        "cumMin": 5.32
      },
      {
        "slug": "hkl-chrysostomou-29",
        "seq": 7,
        "cumKm": 1.872,
        "cumMin": 6.24
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 8,
        "cumKm": 2.16,
        "cumMin": 7.2
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 9,
        "cumKm": 2.444,
        "cumMin": 8.15
      },
      {
        "slug": "hkl-analipsi",
        "seq": 10,
        "cumKm": 2.68,
        "cumMin": 8.93
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 11,
        "cumKm": 3.065,
        "cumMin": 10.22
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 12,
        "cumKm": 3.537,
        "cumMin": 11.79
      },
      {
        "slug": "hkl-ts-port",
        "seq": 13,
        "cumKm": 3.889,
        "cumMin": 12.96
      }
    ]
  },
  {
    "code": "30108",
    "lineCode": "HKL-20",
    "name": "Mesampelies- Mastampa - Limani ( Trikoypi )",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-mesampelies",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-alkmaionos-17",
        "seq": 1,
        "cumKm": 0.276,
        "cumMin": 0.92
      },
      {
        "slug": "hkl-alkmaionos-antieon",
        "seq": 2,
        "cumKm": 0.491,
        "cumMin": 1.64
      },
      {
        "slug": "hkl-antieon-nikis",
        "seq": 3,
        "cumKm": 0.712,
        "cumMin": 2.37
      },
      {
        "slug": "hkl-zervou",
        "seq": 4,
        "cumKm": 0.832,
        "cumMin": 2.77
      },
      {
        "slug": "hkl-markou-karanastasi",
        "seq": 5,
        "cumKm": 1.221,
        "cumMin": 4.07
      },
      {
        "slug": "hkl-papanastasiou-217",
        "seq": 6,
        "cumKm": 1.44,
        "cumMin": 4.8
      },
      {
        "slug": "hkl-eam-papanastasiou-197",
        "seq": 7,
        "cumKm": 1.71,
        "cumMin": 5.7
      },
      {
        "slug": "hkl-papanastasiou-179",
        "seq": 8,
        "cumKm": 1.993,
        "cumMin": 6.64
      },
      {
        "slug": "hkl-agios-eugenios",
        "seq": 9,
        "cumKm": 2.23,
        "cumMin": 7.43
      },
      {
        "slug": "hkl-papanastasiou-145",
        "seq": 10,
        "cumKm": 2.497,
        "cumMin": 8.32
      },
      {
        "slug": "hkl-ethnomartyron-antheon-mesampelis",
        "seq": 11,
        "cumKm": 2.704,
        "cumMin": 9.01
      },
      {
        "slug": "hkl-antieon-nefelis",
        "seq": 12,
        "cumKm": 2.929,
        "cumMin": 9.76
      },
      {
        "slug": "hkl-sperxiou-oulaf-palme",
        "seq": 13,
        "cumKm": 3.474,
        "cumMin": 11.58
      },
      {
        "slug": "hkl-square-sinani",
        "seq": 14,
        "cumKm": 4.529,
        "cumMin": 15.1
      },
      {
        "slug": "hkl-ionias-209",
        "seq": 15,
        "cumKm": 4.778,
        "cumMin": 15.93
      },
      {
        "slug": "hkl-ionias-165-kavali",
        "seq": 16,
        "cumKm": 5.029,
        "cumMin": 16.76
      },
      {
        "slug": "hkl-ionias-111-square-atsaleniou",
        "seq": 17,
        "cumKm": 5.395,
        "cumMin": 17.98
      },
      {
        "slug": "hkl-ionias-85-agia-sofia",
        "seq": 18,
        "cumKm": 5.579,
        "cumMin": 18.6
      },
      {
        "slug": "hkl-ionias-35",
        "seq": 19,
        "cumKm": 5.8,
        "cumMin": 19.33
      },
      {
        "slug": "hkl-georgiou-papandreou-47",
        "seq": 20,
        "cumKm": 6.125,
        "cumMin": 20.42
      },
      {
        "slug": "hkl-chrysostomou-29",
        "seq": 21,
        "cumKm": 6.401,
        "cumMin": 21.34
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 22,
        "cumKm": 6.689,
        "cumMin": 22.3
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 23,
        "cumKm": 6.973,
        "cumMin": 23.24
      },
      {
        "slug": "hkl-analipsi",
        "seq": 24,
        "cumKm": 7.209,
        "cumMin": 24.03
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 25,
        "cumKm": 7.594,
        "cumMin": 25.31
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 26,
        "cumKm": 8.066,
        "cumMin": 26.89
      },
      {
        "slug": "hkl-ts-port",
        "seq": 27,
        "cumKm": 8.419,
        "cumMin": 28.06
      }
    ]
  },
  {
    "code": "31001",
    "lineCode": "HKL-20",
    "name": "Knossos - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-knossos",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-ariadni-2",
        "seq": 1,
        "cumKm": 0.326,
        "cumMin": 1.09
      },
      {
        "slug": "hkl-venizeleio-iospital",
        "seq": 2,
        "cumKm": 1.138,
        "cumMin": 3.79
      },
      {
        "slug": "hkl-diakladosi-fortetsas",
        "seq": 3,
        "cumKm": 1.401,
        "cumMin": 4.67
      },
      {
        "slug": "hkl-avenue-knossou-265-eforeia-e",
        "seq": 4,
        "cumKm": 1.64,
        "cumMin": 5.47
      },
      {
        "slug": "hkl-avenue-knossou-259",
        "seq": 5,
        "cumKm": 1.969,
        "cumMin": 6.56
      },
      {
        "slug": "hkl-knossou-235",
        "seq": 6,
        "cumKm": 2.217,
        "cumMin": 7.39
      },
      {
        "slug": "hkl-knossou-207",
        "seq": 7,
        "cumKm": 2.625,
        "cumMin": 8.75
      },
      {
        "slug": "hkl-knossou-193-agios-ioannis",
        "seq": 8,
        "cumKm": 2.78,
        "cumMin": 9.27
      },
      {
        "slug": "hkl-avenue-knossou-169",
        "seq": 9,
        "cumKm": 3.063,
        "cumMin": 10.21
      },
      {
        "slug": "hkl-knossou-143",
        "seq": 10,
        "cumKm": 3.371,
        "cumMin": 11.24
      },
      {
        "slug": "hkl-knossou-125",
        "seq": 11,
        "cumKm": 3.583,
        "cumMin": 11.94
      },
      {
        "slug": "hkl-mpentevi-2",
        "seq": 12,
        "cumKm": 4.194,
        "cumMin": 13.98
      },
      {
        "slug": "hkl-pertselaki-2",
        "seq": 13,
        "cumKm": 4.48,
        "cumMin": 14.93
      },
      {
        "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
        "seq": 14,
        "cumKm": 5.109,
        "cumMin": 17.03
      },
      {
        "slug": "hkl-avenue-dimokratias-79",
        "seq": 15,
        "cumKm": 5.336,
        "cumMin": 17.79
      },
      {
        "slug": "hkl-krintsas",
        "seq": 16,
        "cumKm": 5.568,
        "cumMin": 18.56
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 17,
        "cumKm": 5.825,
        "cumMin": 19.42
      },
      {
        "slug": "hkl-analipsi",
        "seq": 18,
        "cumKm": 6.157,
        "cumMin": 20.52
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 19,
        "cumKm": 6.542,
        "cumMin": 21.81
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 20,
        "cumKm": 7.015,
        "cumMin": 23.38
      },
      {
        "slug": "hkl-ts-port",
        "seq": 21,
        "cumKm": 7.367,
        "cumMin": 24.56
      }
    ]
  },
  {
    "code": "31002",
    "lineCode": "HKL-20",
    "name": "Skalani - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-skalani",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-skalani-4",
        "seq": 1,
        "cumKm": 0.225,
        "cumMin": 0.75
      },
      {
        "slug": "hkl-skalani-3",
        "seq": 2,
        "cumKm": 0.698,
        "cumMin": 2.33
      },
      {
        "slug": "hkl-skalani-2",
        "seq": 3,
        "cumKm": 1.134,
        "cumMin": 3.78
      },
      {
        "slug": "hkl-diakladosi-sakalaniou",
        "seq": 4,
        "cumKm": 1.573,
        "cumMin": 5.24
      },
      {
        "slug": "hkl-spilia",
        "seq": 5,
        "cumKm": 2.525,
        "cumMin": 8.42
      },
      {
        "slug": "hkl-agia-eirini-spilia",
        "seq": 6,
        "cumKm": 2.966,
        "cumMin": 9.89
      },
      {
        "slug": "hkl-vlixia",
        "seq": 7,
        "cumKm": 3.974,
        "cumMin": 13.25
      },
      {
        "slug": "hkl-ts-knossos",
        "seq": 8,
        "cumKm": 5.152,
        "cumMin": 17.17
      },
      {
        "slug": "hkl-ariadni-2",
        "seq": 9,
        "cumKm": 5.479,
        "cumMin": 18.26
      },
      {
        "slug": "hkl-venizeleio-iospital",
        "seq": 10,
        "cumKm": 6.29,
        "cumMin": 20.97
      },
      {
        "slug": "hkl-diakladosi-fortetsas",
        "seq": 11,
        "cumKm": 6.553,
        "cumMin": 21.84
      },
      {
        "slug": "hkl-avenue-knossou-265-eforeia-e",
        "seq": 12,
        "cumKm": 6.793,
        "cumMin": 22.64
      },
      {
        "slug": "hkl-avenue-knossou-259",
        "seq": 13,
        "cumKm": 7.121,
        "cumMin": 23.74
      },
      {
        "slug": "hkl-knossou-235",
        "seq": 14,
        "cumKm": 7.369,
        "cumMin": 24.56
      },
      {
        "slug": "hkl-knossou-193-agios-ioannis",
        "seq": 15,
        "cumKm": 7.932,
        "cumMin": 26.44
      },
      {
        "slug": "hkl-avenue-knossou-169",
        "seq": 16,
        "cumKm": 8.214,
        "cumMin": 27.38
      },
      {
        "slug": "hkl-knossou-143",
        "seq": 17,
        "cumKm": 8.523,
        "cumMin": 28.41
      },
      {
        "slug": "hkl-knossou-125",
        "seq": 18,
        "cumKm": 8.734,
        "cumMin": 29.11
      },
      {
        "slug": "hkl-mpentevi-2",
        "seq": 19,
        "cumKm": 9.345,
        "cumMin": 31.15
      },
      {
        "slug": "hkl-pertselaki-2",
        "seq": 20,
        "cumKm": 9.631,
        "cumMin": 32.1
      },
      {
        "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
        "seq": 21,
        "cumKm": 10.26,
        "cumMin": 34.2
      },
      {
        "slug": "hkl-avenue-dimokratias-79",
        "seq": 22,
        "cumKm": 10.487,
        "cumMin": 34.96
      },
      {
        "slug": "hkl-krintsas",
        "seq": 23,
        "cumKm": 10.72,
        "cumMin": 35.73
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 24,
        "cumKm": 10.976,
        "cumMin": 36.59
      },
      {
        "slug": "hkl-analipsi",
        "seq": 25,
        "cumKm": 11.308,
        "cumMin": 37.69
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 26,
        "cumKm": 11.693,
        "cumMin": 38.98
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 27,
        "cumKm": 12.166,
        "cumMin": 40.55
      },
      {
        "slug": "hkl-ts-port",
        "seq": 28,
        "cumKm": 12.518,
        "cumMin": 41.73
      }
    ]
  },
  {
    "code": "31003",
    "lineCode": "HKL-20",
    "name": "Fortetsa - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-fortetsas",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-solonos-57",
        "seq": 1,
        "cumKm": 0.386,
        "cumMin": 1.29
      },
      {
        "slug": "hkl-solonos-32",
        "seq": 2,
        "cumKm": 0.561,
        "cumMin": 1.87
      },
      {
        "slug": "hkl-diakladosi-fortetsas",
        "seq": 3,
        "cumKm": 0.893,
        "cumMin": 2.98
      },
      {
        "slug": "hkl-avenue-knossou-265-eforeia-e",
        "seq": 4,
        "cumKm": 1.132,
        "cumMin": 3.77
      },
      {
        "slug": "hkl-avenue-knossou-259",
        "seq": 5,
        "cumKm": 1.46,
        "cumMin": 4.87
      },
      {
        "slug": "hkl-knossou-235",
        "seq": 6,
        "cumKm": 1.708,
        "cumMin": 5.69
      },
      {
        "slug": "hkl-knossou-207",
        "seq": 7,
        "cumKm": 2.117,
        "cumMin": 7.06
      },
      {
        "slug": "hkl-knossou-193-agios-ioannis",
        "seq": 8,
        "cumKm": 2.272,
        "cumMin": 7.57
      },
      {
        "slug": "hkl-avenue-knossou-169",
        "seq": 9,
        "cumKm": 2.554,
        "cumMin": 8.51
      },
      {
        "slug": "hkl-knossou-143",
        "seq": 10,
        "cumKm": 2.863,
        "cumMin": 9.54
      },
      {
        "slug": "hkl-knossou-125",
        "seq": 11,
        "cumKm": 3.075,
        "cumMin": 10.25
      },
      {
        "slug": "hkl-mpentevi-2",
        "seq": 12,
        "cumKm": 3.685,
        "cumMin": 12.28
      },
      {
        "slug": "hkl-pertselaki-2",
        "seq": 13,
        "cumKm": 3.971,
        "cumMin": 13.24
      },
      {
        "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
        "seq": 14,
        "cumKm": 4.6,
        "cumMin": 15.33
      },
      {
        "slug": "hkl-avenue-dimokratias-79",
        "seq": 15,
        "cumKm": 4.827,
        "cumMin": 16.09
      },
      {
        "slug": "hkl-krintsas",
        "seq": 16,
        "cumKm": 5.06,
        "cumMin": 16.87
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 17,
        "cumKm": 5.316,
        "cumMin": 17.72
      },
      {
        "slug": "hkl-analipsi",
        "seq": 18,
        "cumKm": 5.648,
        "cumMin": 18.83
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 19,
        "cumKm": 6.033,
        "cumMin": 20.11
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 20,
        "cumKm": 6.506,
        "cumMin": 21.69
      },
      {
        "slug": "hkl-ts-port",
        "seq": 21,
        "cumKm": 6.858,
        "cumMin": 22.86
      }
    ]
  },
  {
    "code": "31006",
    "lineCode": "HKL-20",
    "name": "Mastampa - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-square-sinani",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-ionias-209",
        "seq": 1,
        "cumKm": 0.249,
        "cumMin": 0.83
      },
      {
        "slug": "hkl-ionias-165-kavali",
        "seq": 2,
        "cumKm": 0.5,
        "cumMin": 1.67
      },
      {
        "slug": "hkl-ionias-111-square-atsaleniou",
        "seq": 3,
        "cumKm": 0.865,
        "cumMin": 2.88
      },
      {
        "slug": "hkl-ionias-85-agia-sofia",
        "seq": 4,
        "cumKm": 1.05,
        "cumMin": 3.5
      },
      {
        "slug": "hkl-ionias-35",
        "seq": 5,
        "cumKm": 1.271,
        "cumMin": 4.24
      },
      {
        "slug": "hkl-georgiou-papandreou-47",
        "seq": 6,
        "cumKm": 1.596,
        "cumMin": 5.32
      },
      {
        "slug": "hkl-chrysostomou-29",
        "seq": 7,
        "cumKm": 1.872,
        "cumMin": 6.24
      },
      {
        "slug": "hkl-square-kyprou-2",
        "seq": 8,
        "cumKm": 2.204,
        "cumMin": 7.35
      },
      {
        "slug": "hkl-evans-2",
        "seq": 9,
        "cumKm": 2.434,
        "cumMin": 8.11
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 10,
        "cumKm": 2.65,
        "cumMin": 8.83
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 11,
        "cumKm": 3.006,
        "cumMin": 10.02
      },
      {
        "slug": "hkl-st-giamalaki-kazantzaki",
        "seq": 12,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-sofokli-venizelou-giamalaki",
        "seq": 13,
        "cumKm": 3.544,
        "cumMin": 11.81
      },
      {
        "slug": "hkl-sofokli-venizelou-historical-museum",
        "seq": 14,
        "cumKm": 3.699,
        "cumMin": 12.33
      },
      {
        "slug": "hkl-fort-koule-square-18",
        "seq": 15,
        "cumKm": 4.137,
        "cumMin": 13.79
      },
      {
        "slug": "hkl-ts-port",
        "seq": 16,
        "cumKm": 4.722,
        "cumMin": 15.74
      }
    ]
  },
  {
    "code": "31007",
    "lineCode": "HKL-20",
    "name": "Mesampelies - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-mesampelies",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-alkmaionos-17",
        "seq": 1,
        "cumKm": 0.276,
        "cumMin": 0.92
      },
      {
        "slug": "hkl-alkmaionos-antieon",
        "seq": 2,
        "cumKm": 0.491,
        "cumMin": 1.64
      },
      {
        "slug": "hkl-antieon-nikis",
        "seq": 3,
        "cumKm": 0.712,
        "cumMin": 2.37
      },
      {
        "slug": "hkl-zervou",
        "seq": 4,
        "cumKm": 0.832,
        "cumMin": 2.77
      },
      {
        "slug": "hkl-markou-karanastasi",
        "seq": 5,
        "cumKm": 1.221,
        "cumMin": 4.07
      },
      {
        "slug": "hkl-papanastasiou-217",
        "seq": 6,
        "cumKm": 1.44,
        "cumMin": 4.8
      },
      {
        "slug": "hkl-eam-papanastasiou-197",
        "seq": 7,
        "cumKm": 1.71,
        "cumMin": 5.7
      },
      {
        "slug": "hkl-papanastasiou-179",
        "seq": 8,
        "cumKm": 1.993,
        "cumMin": 6.64
      },
      {
        "slug": "hkl-agios-eugenios",
        "seq": 9,
        "cumKm": 2.23,
        "cumMin": 7.43
      },
      {
        "slug": "hkl-papanastasiou-145",
        "seq": 10,
        "cumKm": 2.497,
        "cumMin": 8.32
      },
      {
        "slug": "hkl-papanastasiou-123",
        "seq": 11,
        "cumKm": 2.874,
        "cumMin": 9.58
      },
      {
        "slug": "hkl-papanastasiou-91",
        "seq": 12,
        "cumKm": 3.102,
        "cumMin": 10.34
      },
      {
        "slug": "hkl-mpentevi-2",
        "seq": 13,
        "cumKm": 3.769,
        "cumMin": 12.56
      },
      {
        "slug": "hkl-pertselaki-2",
        "seq": 14,
        "cumKm": 4.055,
        "cumMin": 13.52
      },
      {
        "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
        "seq": 15,
        "cumKm": 4.684,
        "cumMin": 15.61
      },
      {
        "slug": "hkl-avenue-dimokratias-79",
        "seq": 16,
        "cumKm": 4.911,
        "cumMin": 16.37
      },
      {
        "slug": "hkl-krintsas",
        "seq": 17,
        "cumKm": 5.144,
        "cumMin": 17.15
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 18,
        "cumKm": 5.4,
        "cumMin": 18
      },
      {
        "slug": "hkl-analipsi",
        "seq": 19,
        "cumKm": 5.732,
        "cumMin": 19.11
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 20,
        "cumKm": 6.117,
        "cumMin": 20.39
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 21,
        "cumKm": 6.59,
        "cumMin": 21.97
      },
      {
        "slug": "hkl-ts-port",
        "seq": 22,
        "cumKm": 6.942,
        "cumMin": 23.14
      }
    ]
  },
  {
    "code": "31010",
    "lineCode": "HKL-20",
    "name": "Ammoydara - Limani -",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-ammoudara",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-hotel-zeus",
        "seq": 1,
        "cumKm": 0.421,
        "cumMin": 1.4
      },
      {
        "slug": "hkl-hotel-apollonia-2",
        "seq": 2,
        "cumKm": 0.633,
        "cumMin": 2.11
      },
      {
        "slug": "hkl-hotel-poseidon-2",
        "seq": 3,
        "cumKm": 0.966,
        "cumMin": 3.22
      },
      {
        "slug": "hkl-hotel-amounda-vay-hotel-minoas",
        "seq": 4,
        "cumKm": 1.543,
        "cumMin": 5.14
      },
      {
        "slug": "hkl-andrea-papandreou-301",
        "seq": 5,
        "cumKm": 1.957,
        "cumMin": 6.52
      },
      {
        "slug": "hkl-petousis-hotel-roxani-2",
        "seq": 6,
        "cumKm": 2.228,
        "cumMin": 7.43
      },
      {
        "slug": "hkl-technopolis-hotel-marirena-2",
        "seq": 7,
        "cumKm": 2.429,
        "cumMin": 8.1
      },
      {
        "slug": "hkl-andrea-papandreou-230",
        "seq": 8,
        "cumKm": 2.784,
        "cumMin": 9.28
      },
      {
        "slug": "hkl-andrea-papandreou-175",
        "seq": 9,
        "cumKm": 3.092,
        "cumMin": 10.31
      },
      {
        "slug": "hkl-andrea-papandreou-hotel-marilena-hotel-agapi",
        "seq": 10,
        "cumKm": 3.397,
        "cumMin": 11.32
      },
      {
        "slug": "hkl-hotel-creta-beach-2",
        "seq": 11,
        "cumKm": 3.708,
        "cumMin": 12.36
      },
      {
        "slug": "hkl-hotel-candia-maris-2",
        "seq": 12,
        "cumKm": 4.041,
        "cumMin": 13.47
      },
      {
        "slug": "hkl-andrea-papandreou-87",
        "seq": 13,
        "cumKm": 4.525,
        "cumMin": 15.08
      },
      {
        "slug": "hkl-andrea-papandreou-49",
        "seq": 14,
        "cumKm": 4.925,
        "cumMin": 16.42
      },
      {
        "slug": "hkl-hotel-malena-akti-corali",
        "seq": 15,
        "cumKm": 5.147,
        "cumMin": 17.16
      },
      {
        "slug": "hkl-hotel-vanisko-2",
        "seq": 16,
        "cumKm": 5.373,
        "cumMin": 17.91
      },
      {
        "slug": "hkl-xeropotamos-vamvoukaki",
        "seq": 17,
        "cumKm": 5.929,
        "cumMin": 19.76
      },
      {
        "slug": "hkl-62-martyron-370-pagkritio-stadium",
        "seq": 18,
        "cumKm": 6.214,
        "cumMin": 20.71
      },
      {
        "slug": "hkl-62-martyron-366",
        "seq": 19,
        "cumKm": 6.439,
        "cumMin": 21.46
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 20,
        "cumKm": 7.295,
        "cumMin": 24.32
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 21,
        "cumKm": 7.515,
        "cumMin": 25.05
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 22,
        "cumKm": 7.943,
        "cumMin": 26.48
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 23,
        "cumKm": 8.518,
        "cumMin": 28.39
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 24,
        "cumKm": 8.706,
        "cumMin": 29.02
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 25,
        "cumKm": 9.041,
        "cumMin": 30.14
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 26,
        "cumKm": 9.269,
        "cumMin": 30.9
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 27,
        "cumKm": 9.583,
        "cumMin": 31.94
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 28,
        "cumKm": 9.831,
        "cumMin": 32.77
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 29,
        "cumKm": 10.035,
        "cumMin": 33.45
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 30,
        "cumKm": 10.38,
        "cumMin": 34.6
      },
      {
        "slug": "hkl-evans",
        "seq": 31,
        "cumKm": 10.539,
        "cumMin": 35.13
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 32,
        "cumKm": 10.868,
        "cumMin": 36.23
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 33,
        "cumKm": 11.153,
        "cumMin": 37.18
      },
      {
        "slug": "hkl-analipsi",
        "seq": 34,
        "cumKm": 11.388,
        "cumMin": 37.96
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 35,
        "cumKm": 11.773,
        "cumMin": 39.24
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 36,
        "cumKm": 12.246,
        "cumMin": 40.82
      },
      {
        "slug": "hkl-ts-port",
        "seq": 37,
        "cumKm": 12.598,
        "cumMin": 41.99
      }
    ]
  },
  {
    "code": "31013",
    "lineCode": "HKL-20",
    "name": "Pagni Panep/mio - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-pagni-hospital",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-diastaurosi-staurakia",
        "seq": 1,
        "cumKm": 0.333,
        "cumMin": 1.11
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 2,
        "cumKm": 0.893,
        "cumMin": 2.98
      },
      {
        "slug": "hkl-ts-panepistimio",
        "seq": 3,
        "cumKm": 1.538,
        "cumMin": 5.13
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 4,
        "cumKm": 1.994,
        "cumMin": 6.65
      },
      {
        "slug": "hkl-oikismos-agias-paraskeuis",
        "seq": 5,
        "cumKm": 2.541,
        "cumMin": 8.47
      },
      {
        "slug": "hkl-aretousas-2",
        "seq": 6,
        "cumKm": 3.165,
        "cumMin": 10.55
      },
      {
        "slug": "hkl-agioi-theodoroi-2",
        "seq": 7,
        "cumKm": 3.804,
        "cumMin": 12.68
      },
      {
        "slug": "hkl-parasyri",
        "seq": 8,
        "cumKm": 4.188,
        "cumMin": 13.96
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 9,
        "cumKm": 4.51,
        "cumMin": 15.03
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 10,
        "cumKm": 4.705,
        "cumMin": 15.68
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 11,
        "cumKm": 5.327,
        "cumMin": 17.76
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 12,
        "cumKm": 5.803,
        "cumMin": 19.34
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 13,
        "cumKm": 6.404,
        "cumMin": 21.35
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 14,
        "cumKm": 6.675,
        "cumMin": 22.25
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 15,
        "cumKm": 7.114,
        "cumMin": 23.71
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 16,
        "cumKm": 7.333,
        "cumMin": 24.44
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 17,
        "cumKm": 7.761,
        "cumMin": 25.87
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 18,
        "cumKm": 8.336,
        "cumMin": 27.79
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 19,
        "cumKm": 8.525,
        "cumMin": 28.42
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 20,
        "cumKm": 8.86,
        "cumMin": 29.53
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 21,
        "cumKm": 9.087,
        "cumMin": 30.29
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 22,
        "cumKm": 9.401,
        "cumMin": 31.34
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 23,
        "cumKm": 9.649,
        "cumMin": 32.16
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 24,
        "cumKm": 9.853,
        "cumMin": 32.84
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 25,
        "cumKm": 10.198,
        "cumMin": 33.99
      },
      {
        "slug": "hkl-evans",
        "seq": 26,
        "cumKm": 10.357,
        "cumMin": 34.52
      },
      {
        "slug": "hkl-charilaou-trikoupi",
        "seq": 27,
        "cumKm": 10.687,
        "cumMin": 35.62
      },
      {
        "slug": "hkl-charilaou-trikoupi-2",
        "seq": 28,
        "cumKm": 10.971,
        "cumMin": 36.57
      },
      {
        "slug": "hkl-analipsi",
        "seq": 29,
        "cumKm": 11.206,
        "cumMin": 37.35
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 30,
        "cumKm": 11.591,
        "cumMin": 38.64
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 31,
        "cumKm": 12.064,
        "cumMin": 40.21
      },
      {
        "slug": "hkl-ts-port",
        "seq": 32,
        "cumKm": 12.416,
        "cumMin": 41.39
      }
    ]
  },
  {
    "code": "31031",
    "lineCode": "HKL-20",
    "name": "AG. Syllas - Ag.vlassis - Mesa Vasileies - Limani",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-agiou-sylla-1",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-agiou-dimitriou-2",
        "seq": 1,
        "cumKm": 0.648,
        "cumMin": 2.16
      },
      {
        "slug": "hkl-agios-vlasis-4",
        "seq": 2,
        "cumKm": 2.063,
        "cumMin": 6.88
      },
      {
        "slug": "hkl-agiou-nikolaou",
        "seq": 3,
        "cumKm": 2.574,
        "cumMin": 8.58
      },
      {
        "slug": "hkl-agiou-vlassi",
        "seq": 4,
        "cumKm": 2.788,
        "cumMin": 9.29
      },
      {
        "slug": "hkl-agios-panteleimonas",
        "seq": 5,
        "cumKm": 3.259,
        "cumMin": 10.86
      },
      {
        "slug": "hkl-avenue-eth-antistasis-ag-vlasi-e",
        "seq": 6,
        "cumKm": 3.472,
        "cumMin": 11.57
      },
      {
        "slug": "hkl-manou-katraki-antistaseos-vasilies",
        "seq": 7,
        "cumKm": 4.778,
        "cumMin": 15.93
      },
      {
        "slug": "hkl-vasileies",
        "seq": 8,
        "cumKm": 5.303,
        "cumMin": 17.68
      },
      {
        "slug": "hkl-nefelis",
        "seq": 9,
        "cumKm": 5.746,
        "cumMin": 19.15
      },
      {
        "slug": "hkl-viannou",
        "seq": 10,
        "cumKm": 5.948,
        "cumMin": 19.83
      },
      {
        "slug": "hkl-foka",
        "seq": 11,
        "cumKm": 6.221,
        "cumMin": 20.74
      },
      {
        "slug": "hkl-chatzidaki-2",
        "seq": 12,
        "cumKm": 6.766,
        "cumMin": 22.55
      },
      {
        "slug": "hkl-oulof-palme",
        "seq": 13,
        "cumKm": 7.231,
        "cumMin": 24.1
      },
      {
        "slug": "hkl-agios-rafail",
        "seq": 14,
        "cumKm": 7.73,
        "cumMin": 25.77
      },
      {
        "slug": "hkl-aglaopis",
        "seq": 15,
        "cumKm": 8.014,
        "cumMin": 26.71
      },
      {
        "slug": "hkl-kyparissias",
        "seq": 16,
        "cumKm": 8.345,
        "cumMin": 27.82
      },
      {
        "slug": "hkl-oulaf-palme-kyparissias",
        "seq": 17,
        "cumKm": 8.982,
        "cumMin": 29.94
      },
      {
        "slug": "hkl-oulof-palme-alkyonos-terma",
        "seq": 18,
        "cumKm": 10.68,
        "cumMin": 35.6
      },
      {
        "slug": "hkl-eumatiiou",
        "seq": 19,
        "cumKm": 11.294,
        "cumMin": 37.65
      },
      {
        "slug": "hkl-euryalis",
        "seq": 20,
        "cumKm": 12.767,
        "cumMin": 42.56
      },
      {
        "slug": "hkl-knossou-235",
        "seq": 21,
        "cumKm": 13.004,
        "cumMin": 43.35
      },
      {
        "slug": "hkl-knossou-207",
        "seq": 22,
        "cumKm": 13.412,
        "cumMin": 44.71
      },
      {
        "slug": "hkl-knossou-193-agios-ioannis",
        "seq": 23,
        "cumKm": 13.567,
        "cumMin": 45.22
      },
      {
        "slug": "hkl-avenue-knossou-169",
        "seq": 24,
        "cumKm": 13.85,
        "cumMin": 46.17
      },
      {
        "slug": "hkl-knossou-143",
        "seq": 25,
        "cumKm": 14.158,
        "cumMin": 47.19
      },
      {
        "slug": "hkl-knossou-125",
        "seq": 26,
        "cumKm": 14.37,
        "cumMin": 47.9
      },
      {
        "slug": "hkl-mpentevi-2",
        "seq": 27,
        "cumKm": 14.981,
        "cumMin": 49.94
      },
      {
        "slug": "hkl-pertselaki-2",
        "seq": 28,
        "cumKm": 15.267,
        "cumMin": 50.89
      },
      {
        "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
        "seq": 29,
        "cumKm": 15.896,
        "cumMin": 52.99
      },
      {
        "slug": "hkl-avenue-dimokratias-79",
        "seq": 30,
        "cumKm": 16.122,
        "cumMin": 53.74
      },
      {
        "slug": "hkl-krintsas",
        "seq": 31,
        "cumKm": 16.355,
        "cumMin": 54.52
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 32,
        "cumKm": 16.611,
        "cumMin": 55.37
      },
      {
        "slug": "hkl-analipsi",
        "seq": 33,
        "cumKm": 16.944,
        "cumMin": 56.48
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 34,
        "cumKm": 17.329,
        "cumMin": 57.76
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 35,
        "cumKm": 17.801,
        "cumMin": 59.34
      },
      {
        "slug": "hkl-ts-port",
        "seq": 36,
        "cumKm": 18.154,
        "cumMin": 60.51
      }
    ]
  },
  {
    "code": "31032",
    "lineCode": "HKL-20",
    "name": "AG Syllas-ag. Vlassi- EXO Vasileies-limani-3941",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-agiou-sylla-1",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-agiou-dimitriou-2",
        "seq": 1,
        "cumKm": 0.648,
        "cumMin": 2.16
      },
      {
        "slug": "hkl-agios-vlasis-4",
        "seq": 2,
        "cumKm": 2.063,
        "cumMin": 6.88
      },
      {
        "slug": "hkl-agiou-nikolaou",
        "seq": 3,
        "cumKm": 2.574,
        "cumMin": 8.58
      },
      {
        "slug": "hkl-agiou-vlassi",
        "seq": 4,
        "cumKm": 2.788,
        "cumMin": 9.29
      },
      {
        "slug": "hkl-agios-panteleimonas",
        "seq": 5,
        "cumKm": 3.259,
        "cumMin": 10.86
      },
      {
        "slug": "hkl-avenue-eth-antistasis-ag-vlasi-e",
        "seq": 6,
        "cumKm": 3.472,
        "cumMin": 11.57
      },
      {
        "slug": "hkl-avenue-eth-antistasis-giouxta",
        "seq": 7,
        "cumKm": 4.765,
        "cumMin": 15.88
      },
      {
        "slug": "hkl-avenue-eth-antistasis-99-zoodoxou-pigis",
        "seq": 8,
        "cumKm": 5.421,
        "cumMin": 18.07
      },
      {
        "slug": "hkl-foka",
        "seq": 9,
        "cumKm": 5.907,
        "cumMin": 19.69
      },
      {
        "slug": "hkl-chatzidaki-2",
        "seq": 10,
        "cumKm": 6.452,
        "cumMin": 21.51
      },
      {
        "slug": "hkl-oulof-palme",
        "seq": 11,
        "cumKm": 6.917,
        "cumMin": 23.06
      },
      {
        "slug": "hkl-agios-rafail",
        "seq": 12,
        "cumKm": 7.416,
        "cumMin": 24.72
      },
      {
        "slug": "hkl-aglaopis",
        "seq": 13,
        "cumKm": 7.7,
        "cumMin": 25.67
      },
      {
        "slug": "hkl-kyparissias",
        "seq": 14,
        "cumKm": 8.031,
        "cumMin": 26.77
      },
      {
        "slug": "hkl-oulaf-palme-kyparissias",
        "seq": 15,
        "cumKm": 8.668,
        "cumMin": 28.89
      },
      {
        "slug": "hkl-oulof-palme-alkyonos-terma",
        "seq": 16,
        "cumKm": 10.366,
        "cumMin": 34.55
      },
      {
        "slug": "hkl-eumatiiou",
        "seq": 17,
        "cumKm": 10.98,
        "cumMin": 36.6
      },
      {
        "slug": "hkl-euryalis",
        "seq": 18,
        "cumKm": 12.453,
        "cumMin": 41.51
      },
      {
        "slug": "hkl-knossou-235",
        "seq": 19,
        "cumKm": 12.69,
        "cumMin": 42.3
      },
      {
        "slug": "hkl-knossou-207",
        "seq": 20,
        "cumKm": 13.098,
        "cumMin": 43.66
      },
      {
        "slug": "hkl-knossou-193-agios-ioannis",
        "seq": 21,
        "cumKm": 13.253,
        "cumMin": 44.18
      },
      {
        "slug": "hkl-avenue-knossou-169",
        "seq": 22,
        "cumKm": 13.536,
        "cumMin": 45.12
      },
      {
        "slug": "hkl-knossou-143",
        "seq": 23,
        "cumKm": 13.844,
        "cumMin": 46.15
      },
      {
        "slug": "hkl-knossou-125",
        "seq": 24,
        "cumKm": 14.056,
        "cumMin": 46.85
      },
      {
        "slug": "hkl-mpentevi-2",
        "seq": 25,
        "cumKm": 14.667,
        "cumMin": 48.89
      },
      {
        "slug": "hkl-pertselaki-2",
        "seq": 26,
        "cumKm": 14.953,
        "cumMin": 49.84
      },
      {
        "slug": "hkl-agiou-konstantinou-avenue-knossou-95",
        "seq": 27,
        "cumKm": 15.582,
        "cumMin": 51.94
      },
      {
        "slug": "hkl-avenue-dimokratias-79",
        "seq": 28,
        "cumKm": 15.809,
        "cumMin": 52.7
      },
      {
        "slug": "hkl-krintsas",
        "seq": 29,
        "cumKm": 16.041,
        "cumMin": 53.47
      },
      {
        "slug": "hkl-ergatiko-kentro-2",
        "seq": 30,
        "cumKm": 16.298,
        "cumMin": 54.33
      },
      {
        "slug": "hkl-analipsi",
        "seq": 31,
        "cumKm": 16.63,
        "cumMin": 55.43
      },
      {
        "slug": "hkl-square-eleutierias",
        "seq": 32,
        "cumKm": 17.015,
        "cumMin": 56.72
      },
      {
        "slug": "hkl-central-station-avenue-pros-limani",
        "seq": 33,
        "cumKm": 17.488,
        "cumMin": 58.29
      },
      {
        "slug": "hkl-ts-port",
        "seq": 34,
        "cumKm": 17.84,
        "cumMin": 59.47
      }
    ]
  },
  {
    "code": "1027",
    "lineCode": "HKL-21",
    "name": "Knossos - Mastampas - Pagni - Mastampa - Knossos",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-knossos",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-ariadni-2",
        "seq": 1,
        "cumKm": 0.326,
        "cumMin": 1.09
      },
      {
        "slug": "hkl-venizeleio-iospital",
        "seq": 2,
        "cumKm": 1.138,
        "cumMin": 3.79
      },
      {
        "slug": "hkl-diakladosi-fortetsas",
        "seq": 3,
        "cumKm": 1.401,
        "cumMin": 4.67
      },
      {
        "slug": "hkl-avenue-knossou-265-eforeia-e",
        "seq": 4,
        "cumKm": 1.64,
        "cumMin": 5.47
      },
      {
        "slug": "hkl-avenue-knossou-259",
        "seq": 5,
        "cumKm": 1.969,
        "cumMin": 6.56
      },
      {
        "slug": "hkl-knossou-235",
        "seq": 6,
        "cumKm": 2.217,
        "cumMin": 7.39
      },
      {
        "slug": "hkl-knossou-207",
        "seq": 7,
        "cumKm": 2.625,
        "cumMin": 8.75
      },
      {
        "slug": "hkl-knossou-193-agios-ioannis",
        "seq": 8,
        "cumKm": 2.78,
        "cumMin": 9.27
      },
      {
        "slug": "hkl-kakridi-11",
        "seq": 9,
        "cumKm": 3.019,
        "cumMin": 10.06
      },
      {
        "slug": "hkl-fotaki",
        "seq": 10,
        "cumKm": 3.216,
        "cumMin": 10.72
      },
      {
        "slug": "hkl-papanastasiou-145",
        "seq": 11,
        "cumKm": 3.554,
        "cumMin": 11.85
      },
      {
        "slug": "hkl-ethnomartyron-antheon-mesampelis",
        "seq": 12,
        "cumKm": 3.761,
        "cumMin": 12.54
      },
      {
        "slug": "hkl-ethnomartyron-46",
        "seq": 13,
        "cumKm": 4.042,
        "cumMin": 13.47
      },
      {
        "slug": "hkl-ethnomartyron-47",
        "seq": 14,
        "cumKm": 4.326,
        "cumMin": 14.42
      },
      {
        "slug": "hkl-mantineias",
        "seq": 15,
        "cumKm": 4.603,
        "cumMin": 15.34
      },
      {
        "slug": "hkl-square-sinani",
        "seq": 16,
        "cumKm": 4.864,
        "cumMin": 16.21
      },
      {
        "slug": "hkl-ionias-209",
        "seq": 17,
        "cumKm": 5.113,
        "cumMin": 17.04
      },
      {
        "slug": "hkl-ionias-165-kavali",
        "seq": 18,
        "cumKm": 5.364,
        "cumMin": 17.88
      },
      {
        "slug": "hkl-ionias-111-square-atsaleniou",
        "seq": 19,
        "cumKm": 5.729,
        "cumMin": 19.1
      },
      {
        "slug": "hkl-ionias-85-agia-sofia",
        "seq": 20,
        "cumKm": 5.914,
        "cumMin": 19.71
      },
      {
        "slug": "hkl-vasileiou-smpokou-60",
        "seq": 21,
        "cumKm": 6.164,
        "cumMin": 20.55
      },
      {
        "slug": "hkl-vasileiou-smpokou",
        "seq": 22,
        "cumKm": 6.491,
        "cumMin": 21.64
      },
      {
        "slug": "hkl-eok-33",
        "seq": 23,
        "cumKm": 6.714,
        "cumMin": 22.38
      },
      {
        "slug": "hkl-eok-25",
        "seq": 24,
        "cumKm": 6.978,
        "cumMin": 23.26
      },
      {
        "slug": "hkl-eok-11",
        "seq": 25,
        "cumKm": 7.184,
        "cumMin": 23.95
      },
      {
        "slug": "hkl-minoos",
        "seq": 26,
        "cumKm": 7.518,
        "cumMin": 25.06
      },
      {
        "slug": "hkl-minoos-79",
        "seq": 27,
        "cumKm": 7.88,
        "cumMin": 26.27
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 28,
        "cumKm": 8.207,
        "cumMin": 27.36
      },
      {
        "slug": "hkl-kaminia",
        "seq": 29,
        "cumKm": 8.439,
        "cumMin": 28.13
      },
      {
        "slug": "hkl-deilina",
        "seq": 30,
        "cumKm": 8.924,
        "cumMin": 29.75
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 31,
        "cumKm": 9.343,
        "cumMin": 31.14
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 32,
        "cumKm": 9.642,
        "cumMin": 32.14
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 33,
        "cumKm": 10.007,
        "cumMin": 33.36
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 34,
        "cumKm": 10.287,
        "cumMin": 34.29
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 35,
        "cumKm": 10.814,
        "cumMin": 36.05
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 36,
        "cumKm": 11.485,
        "cumMin": 38.28
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 37,
        "cumKm": 12.122,
        "cumMin": 40.41
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni",
        "seq": 38,
        "cumKm": 12.358,
        "cumMin": 41.19
      },
      {
        "slug": "hkl-avenue-panepistimiou-parasyri-m",
        "seq": 39,
        "cumKm": 12.718,
        "cumMin": 42.39
      },
      {
        "slug": "hkl-agioi-theodoroi",
        "seq": 40,
        "cumKm": 13.147,
        "cumMin": 43.82
      },
      {
        "slug": "hkl-aretousas",
        "seq": 41,
        "cumKm": 13.732,
        "cumMin": 45.77
      },
      {
        "slug": "hkl-agiou-nektariou",
        "seq": 42,
        "cumKm": 14.074,
        "cumMin": 46.91
      },
      {
        "slug": "hkl-asklipeiou",
        "seq": 43,
        "cumKm": 14.395,
        "cumMin": 47.98
      },
      {
        "slug": "hkl-krimpa",
        "seq": 44,
        "cumKm": 14.696,
        "cumMin": 48.99
      },
      {
        "slug": "hkl-pagni-hospital",
        "seq": 45,
        "cumKm": 15.557,
        "cumMin": 51.86
      },
      {
        "slug": "hkl-diastaurosi-staurakia",
        "seq": 46,
        "cumKm": 15.889,
        "cumMin": 52.96
      },
      {
        "slug": "hkl-diakladosi-vouton",
        "seq": 47,
        "cumKm": 16.449,
        "cumMin": 54.83
      },
      {
        "slug": "hkl-ts-panepistimio",
        "seq": 48,
        "cumKm": 17.094,
        "cumMin": 56.98
      },
      {
        "slug": "hkl-tmima-epistimis-ypologiston",
        "seq": 49,
        "cumKm": 17.55,
        "cumMin": 58.5
      },
      {
        "slug": "hkl-oikismos-agias-paraskeuis",
        "seq": 50,
        "cumKm": 18.098,
        "cumMin": 60.33
      },
      {
        "slug": "hkl-aretousas-2",
        "seq": 51,
        "cumKm": 18.721,
        "cumMin": 62.4
      },
      {
        "slug": "hkl-agioi-theodoroi-2",
        "seq": 52,
        "cumKm": 19.361,
        "cumMin": 64.54
      },
      {
        "slug": "hkl-parasyri",
        "seq": 53,
        "cumKm": 19.745,
        "cumMin": 65.82
      },
      {
        "slug": "hkl-avenue-panepistimiou-kefalogianni-e",
        "seq": 54,
        "cumKm": 20.067,
        "cumMin": 66.89
      },
      {
        "slug": "hkl-diomidi-ika",
        "seq": 55,
        "cumKm": 20.261,
        "cumMin": 67.54
      },
      {
        "slug": "hkl-estauromenou-2",
        "seq": 56,
        "cumKm": 20.884,
        "cumMin": 69.61
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-77",
        "seq": 57,
        "cumKm": 21.359,
        "cumMin": 71.2
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-27",
        "seq": 58,
        "cumKm": 21.961,
        "cumMin": 73.2
      },
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 59,
        "cumKm": 22.231,
        "cumMin": 74.1
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 60,
        "cumKm": 22.67,
        "cumMin": 75.57
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 61,
        "cumKm": 22.89,
        "cumMin": 76.3
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 62,
        "cumKm": 23.317,
        "cumMin": 77.72
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 63,
        "cumKm": 23.893,
        "cumMin": 79.64
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 64,
        "cumKm": 24.081,
        "cumMin": 80.27
      },
      {
        "slug": "hkl-minoos-90",
        "seq": 65,
        "cumKm": 24.368,
        "cumMin": 81.23
      },
      {
        "slug": "hkl-lasaias",
        "seq": 66,
        "cumKm": 24.721,
        "cumMin": 82.4
      },
      {
        "slug": "hkl-eok-10",
        "seq": 67,
        "cumKm": 25.058,
        "cumMin": 83.53
      },
      {
        "slug": "hkl-eok-28",
        "seq": 68,
        "cumKm": 25.271,
        "cumMin": 84.24
      },
      {
        "slug": "hkl-eok-44",
        "seq": 69,
        "cumKm": 25.506,
        "cumMin": 85.02
      },
      {
        "slug": "hkl-andrea-papandreou-126",
        "seq": 70,
        "cumKm": 25.645,
        "cumMin": 85.48
      },
      {
        "slug": "hkl-atlantidos-45",
        "seq": 71,
        "cumKm": 25.906,
        "cumMin": 86.35
      },
      {
        "slug": "hkl-atlantidos-33",
        "seq": 72,
        "cumKm": 26.079,
        "cumMin": 86.93
      },
      {
        "slug": "hkl-panagitsa",
        "seq": 73,
        "cumKm": 26.447,
        "cumMin": 88.16
      },
      {
        "slug": "hkl-ieroloxiton-76-daskalaki",
        "seq": 74,
        "cumKm": 26.67,
        "cumMin": 88.9
      },
      {
        "slug": "hkl-dialinomixali",
        "seq": 75,
        "cumKm": 26.914,
        "cumMin": 89.71
      },
      {
        "slug": "hkl-errikou-ntynan-dexamenes",
        "seq": 76,
        "cumKm": 27.138,
        "cumMin": 90.46
      },
      {
        "slug": "hkl-ts-square-sinani",
        "seq": 77,
        "cumKm": 27.512,
        "cumMin": 91.71
      },
      {
        "slug": "hkl-mantineias-2",
        "seq": 78,
        "cumKm": 27.74,
        "cumMin": 92.47
      },
      {
        "slug": "hkl-ethnomartyron",
        "seq": 79,
        "cumKm": 28.008,
        "cumMin": 93.36
      },
      {
        "slug": "hkl-lindou",
        "seq": 80,
        "cumKm": 28.351,
        "cumMin": 94.5
      },
      {
        "slug": "hkl-antieon",
        "seq": 81,
        "cumKm": 28.586,
        "cumMin": 95.29
      },
      {
        "slug": "hkl-kakridi-11-2",
        "seq": 82,
        "cumKm": 29.34,
        "cumMin": 97.8
      },
      {
        "slug": "hkl-l-knossou-226",
        "seq": 83,
        "cumKm": 29.683,
        "cumMin": 98.94
      },
      {
        "slug": "hkl-l-knossou-244",
        "seq": 84,
        "cumKm": 29.819,
        "cumMin": 99.4
      },
      {
        "slug": "hkl-l-knossou-270",
        "seq": 85,
        "cumKm": 30.103,
        "cumMin": 100.34
      },
      {
        "slug": "hkl-eforia-nea-alatsata",
        "seq": 86,
        "cumKm": 30.446,
        "cumMin": 101.49
      },
      {
        "slug": "hkl-venizelio-iospital",
        "seq": 87,
        "cumKm": 30.855,
        "cumMin": 102.85
      },
      {
        "slug": "hkl-ariadni",
        "seq": 88,
        "cumKm": 31.895,
        "cumMin": 106.32
      },
      {
        "slug": "hkl-knossos",
        "seq": 89,
        "cumKm": 32.221,
        "cumMin": 107.4
      }
    ]
  },
  {
    "code": "21028",
    "lineCode": "HKL-23",
    "name": "Giofyro - NEO Koimitirio - (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-giofyro-e",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-avenue-62-martyron-190-jumbo",
        "seq": 1,
        "cumKm": 0.439,
        "cumMin": 1.46
      },
      {
        "slug": "hkl-avenue-62-martyron-180",
        "seq": 2,
        "cumKm": 0.658,
        "cumMin": 2.19
      },
      {
        "slug": "hkl-deilina-2",
        "seq": 3,
        "cumKm": 1.086,
        "cumMin": 3.62
      },
      {
        "slug": "hkl-kaminia-2",
        "seq": 4,
        "cumKm": 1.661,
        "cumMin": 5.54
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-55",
        "seq": 5,
        "cumKm": 1.85,
        "cumMin": 6.17
      },
      {
        "slug": "hkl-avenue-62-martyron-15",
        "seq": 6,
        "cumKm": 2.185,
        "cumMin": 7.28
      },
      {
        "slug": "hkl-chanioporta-e",
        "seq": 7,
        "cumKm": 2.412,
        "cumMin": 8.04
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 8,
        "cumKm": 2.726,
        "cumMin": 9.09
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 9,
        "cumKm": 2.974,
        "cumMin": 9.91
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 10,
        "cumKm": 3.178,
        "cumMin": 10.59
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 11,
        "cumKm": 3.523,
        "cumMin": 11.74
      },
      {
        "slug": "hkl-evans",
        "seq": 12,
        "cumKm": 3.682,
        "cumMin": 12.27
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 13,
        "cumKm": 3.951,
        "cumMin": 13.17
      },
      {
        "slug": "hkl-katsoulogiorgi-l-knossou-6",
        "seq": 14,
        "cumKm": 4.34,
        "cumMin": 14.47
      },
      {
        "slug": "hkl-tria-peuka-l-knossou-40",
        "seq": 15,
        "cumKm": 4.57,
        "cumMin": 15.23
      },
      {
        "slug": "hkl-agios-konstantinos",
        "seq": 16,
        "cumKm": 4.893,
        "cumMin": 16.31
      },
      {
        "slug": "hkl-vritomartidos",
        "seq": 17,
        "cumKm": 6.073,
        "cumMin": 20.24
      },
      {
        "slug": "hkl-neofytou-oikonomou",
        "seq": 18,
        "cumKm": 6.621,
        "cumMin": 22.07
      },
      {
        "slug": "hkl-ts-cemetery",
        "seq": 19,
        "cumKm": 7.497,
        "cumMin": 24.99
      }
    ]
  },
  {
    "code": "21029",
    "lineCode": "HKL-31",
    "name": "Aerodromio - IKA - (M)",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-airport",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-seap",
        "seq": 1,
        "cumKm": 0.834,
        "cumMin": 2.78
      },
      {
        "slug": "hkl-avenue-ikarou-91",
        "seq": 2,
        "cumKm": 1.199,
        "cumMin": 4
      },
      {
        "slug": "hkl-ikarou-85",
        "seq": 3,
        "cumKm": 1.426,
        "cumMin": 4.75
      },
      {
        "slug": "hkl-nea-alikarnassos",
        "seq": 4,
        "cumKm": 1.8,
        "cumMin": 6
      },
      {
        "slug": "hkl-ikarou-19",
        "seq": 5,
        "cumKm": 2.191,
        "cumMin": 7.3
      },
      {
        "slug": "hkl-katsampas",
        "seq": 6,
        "cumKm": 2.492,
        "cumMin": 8.31
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 7,
        "cumKm": 2.931,
        "cumMin": 9.77
      },
      {
        "slug": "hkl-poros",
        "seq": 8,
        "cumKm": 3.273,
        "cumMin": 10.91
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 9,
        "cumKm": 3.465,
        "cumMin": 11.55
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 10,
        "cumKm": 3.74,
        "cumMin": 12.47
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 11,
        "cumKm": 4.106,
        "cumMin": 13.69
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 12,
        "cumKm": 4.514,
        "cumMin": 15.05
      },
      {
        "slug": "hkl-averof",
        "seq": 13,
        "cumKm": 4.706,
        "cumMin": 15.69
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 14,
        "cumKm": 5.115,
        "cumMin": 17.05
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 15,
        "cumKm": 5.471,
        "cumMin": 18.24
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 16,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 17,
        "cumKm": 5.99,
        "cumMin": 19.97
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 18,
        "cumKm": 6.24,
        "cumMin": 20.8
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 19,
        "cumKm": 6.517,
        "cumMin": 21.72
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 20,
        "cumKm": 6.845,
        "cumMin": 22.82
      },
      {
        "slug": "hkl-kaminia",
        "seq": 21,
        "cumKm": 7.077,
        "cumMin": 23.59
      },
      {
        "slug": "hkl-deilina",
        "seq": 22,
        "cumKm": 7.562,
        "cumMin": 25.21
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 23,
        "cumKm": 7.981,
        "cumMin": 26.6
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 24,
        "cumKm": 8.28,
        "cumMin": 27.6
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 25,
        "cumKm": 8.645,
        "cumMin": 28.82
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 26,
        "cumKm": 8.926,
        "cumMin": 29.75
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 27,
        "cumKm": 9.452,
        "cumMin": 31.51
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 28,
        "cumKm": 10.123,
        "cumMin": 33.74
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 29,
        "cumKm": 10.76,
        "cumMin": 35.87
      },
      {
        "slug": "hkl-ika",
        "seq": 30,
        "cumKm": 11.014,
        "cumMin": 36.71
      }
    ]
  },
  {
    "code": "23029",
    "lineCode": "HKL-31",
    "name": "Limani - IKA",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-port",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 1,
        "cumKm": 0.323,
        "cumMin": 1.08
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 2,
        "cumKm": 0.731,
        "cumMin": 2.44
      },
      {
        "slug": "hkl-averof",
        "seq": 3,
        "cumKm": 0.923,
        "cumMin": 3.08
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 4,
        "cumKm": 1.332,
        "cumMin": 4.44
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 5,
        "cumKm": 1.688,
        "cumMin": 5.63
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 6,
        "cumKm": 1.886,
        "cumMin": 6.29
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 7,
        "cumKm": 2.207,
        "cumMin": 7.36
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 8,
        "cumKm": 2.457,
        "cumMin": 8.19
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 9,
        "cumKm": 2.734,
        "cumMin": 9.11
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 10,
        "cumKm": 3.062,
        "cumMin": 10.21
      },
      {
        "slug": "hkl-kaminia",
        "seq": 11,
        "cumKm": 3.294,
        "cumMin": 10.98
      },
      {
        "slug": "hkl-deilina",
        "seq": 12,
        "cumKm": 3.779,
        "cumMin": 12.6
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 13,
        "cumKm": 4.198,
        "cumMin": 13.99
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 14,
        "cumKm": 4.497,
        "cumMin": 14.99
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 15,
        "cumKm": 4.862,
        "cumMin": 16.21
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 16,
        "cumKm": 5.143,
        "cumMin": 17.14
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 17,
        "cumKm": 5.669,
        "cumMin": 18.9
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 18,
        "cumKm": 6.34,
        "cumMin": 21.13
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 19,
        "cumKm": 6.977,
        "cumMin": 23.26
      },
      {
        "slug": "hkl-ika",
        "seq": 20,
        "cumKm": 7.231,
        "cumMin": 24.1
      }
    ]
  },
  {
    "code": "33032",
    "lineCode": "HKL-31",
    "name": "KALLIThEA - EYThEIA Vipei - Katsampa - IKA",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-agion-panton",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-giannari",
        "seq": 1,
        "cumKm": 0.109,
        "cumMin": 0.36
      },
      {
        "slug": "hkl-dimopoulou-34",
        "seq": 2,
        "cumKm": 0.304,
        "cumMin": 1.01
      },
      {
        "slug": "hkl-dimopoulou-2",
        "seq": 3,
        "cumKm": 0.746,
        "cumMin": 2.49
      },
      {
        "slug": "hkl-street-alfa-ro",
        "seq": 4,
        "cumKm": 1.284,
        "cumMin": 4.28
      },
      {
        "slug": "hkl-street-ro-vita-2",
        "seq": 5,
        "cumKm": 1.613,
        "cumMin": 5.38
      },
      {
        "slug": "hkl-mausolou-235",
        "seq": 6,
        "cumKm": 2.552,
        "cumMin": 8.51
      },
      {
        "slug": "hkl-mausolou-217",
        "seq": 7,
        "cumKm": 2.853,
        "cumMin": 9.51
      },
      {
        "slug": "hkl-mausolou-200",
        "seq": 8,
        "cumKm": 3.253,
        "cumMin": 10.84
      },
      {
        "slug": "hkl-mausolou-161",
        "seq": 9,
        "cumKm": 3.567,
        "cumMin": 11.89
      },
      {
        "slug": "hkl-kazantzidi",
        "seq": 10,
        "cumKm": 3.706,
        "cumMin": 12.35
      },
      {
        "slug": "hkl-mausolou-gefyra-ethnikis-return",
        "seq": 11,
        "cumKm": 3.866,
        "cumMin": 12.89
      },
      {
        "slug": "hkl-katsampas",
        "seq": 12,
        "cumKm": 5.122,
        "cumMin": 17.07
      },
      {
        "slug": "hkl-ikarou-79-drakou",
        "seq": 13,
        "cumKm": 5.562,
        "cumMin": 18.54
      },
      {
        "slug": "hkl-poros",
        "seq": 14,
        "cumKm": 5.903,
        "cumMin": 19.68
      },
      {
        "slug": "hkl-kalogeridi-leoforo-ikarou-17",
        "seq": 15,
        "cumKm": 6.095,
        "cumMin": 20.32
      },
      {
        "slug": "hkl-liana-avenue-ikarou-15",
        "seq": 16,
        "cumKm": 6.37,
        "cumMin": 21.23
      },
      {
        "slug": "hkl-central-station-yperastikon-leoforeion",
        "seq": 17,
        "cumKm": 6.736,
        "cumMin": 22.45
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 18,
        "cumKm": 7.144,
        "cumMin": 23.81
      },
      {
        "slug": "hkl-averof",
        "seq": 19,
        "cumKm": 7.336,
        "cumMin": 24.45
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 20,
        "cumKm": 7.746,
        "cumMin": 25.82
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 21,
        "cumKm": 8.101,
        "cumMin": 27
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 22,
        "cumKm": 8.299,
        "cumMin": 27.66
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 23,
        "cumKm": 8.62,
        "cumMin": 28.73
      },
      {
        "slug": "hkl-chanioporta",
        "seq": 24,
        "cumKm": 8.87,
        "cumMin": 29.57
      },
      {
        "slug": "hkl-avenue-62-martyron-36",
        "seq": 25,
        "cumKm": 9.147,
        "cumMin": 30.49
      },
      {
        "slug": "hkl-minoos-avenue-62-martyron-78",
        "seq": 26,
        "cumKm": 9.475,
        "cumMin": 31.58
      },
      {
        "slug": "hkl-kaminia",
        "seq": 27,
        "cumKm": 9.707,
        "cumMin": 32.36
      },
      {
        "slug": "hkl-deilina",
        "seq": 28,
        "cumKm": 10.193,
        "cumMin": 33.98
      },
      {
        "slug": "hkl-avenue-62-martyron-182",
        "seq": 29,
        "cumKm": 10.611,
        "cumMin": 35.37
      },
      {
        "slug": "hkl-62-martyron-200-jumbo",
        "seq": 30,
        "cumKm": 10.911,
        "cumMin": 36.37
      },
      {
        "slug": "hkl-ts-giofyro",
        "seq": 31,
        "cumKm": 11.275,
        "cumMin": 37.58
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-26",
        "seq": 32,
        "cumKm": 11.556,
        "cumMin": 38.52
      },
      {
        "slug": "hkl-avenue-menelaou-parlama-58",
        "seq": 33,
        "cumKm": 12.082,
        "cumMin": 40.27
      },
      {
        "slug": "hkl-estauromenou",
        "seq": 34,
        "cumKm": 12.753,
        "cumMin": 42.51
      },
      {
        "slug": "hkl-diomidi-i-k-a",
        "seq": 35,
        "cumKm": 13.39,
        "cumMin": 44.63
      },
      {
        "slug": "hkl-ika",
        "seq": 36,
        "cumKm": 13.645,
        "cumMin": 45.48
      }
    ]
  },
  {
    "code": "1036",
    "lineCode": "HKL-91",
    "name": "Grammi 1 Kokkini Grammi",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-street-stadiou-22",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-irakleitou-29",
        "seq": 1,
        "cumKm": 0.319,
        "cumMin": 1.06
      },
      {
        "slug": "hkl-ts-epivatikos-statimos",
        "seq": 2,
        "cumKm": 1.712,
        "cumMin": 5.71
      },
      {
        "slug": "hkl-square-eleutierias-astoria",
        "seq": 3,
        "cumKm": 2.798,
        "cumMin": 9.33
      },
      {
        "slug": "hkl-averof",
        "seq": 4,
        "cumKm": 2.99,
        "cumMin": 9.97
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 5,
        "cumKm": 3.399,
        "cumMin": 11.33
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 6,
        "cumKm": 3.755,
        "cumMin": 12.52
      },
      {
        "slug": "hkl-st-giamalaki-kazantzaki",
        "seq": 7,
        "cumKm": 4.022,
        "cumMin": 13.41
      },
      {
        "slug": "hkl-sofokli-venizelou-giamalaki",
        "seq": 8,
        "cumKm": 4.293,
        "cumMin": 14.31
      },
      {
        "slug": "hkl-fort-koule-square-18",
        "seq": 9,
        "cumKm": 4.868,
        "cumMin": 16.23
      },
      {
        "slug": "hkl-yperastiko-ktel",
        "seq": 10,
        "cumKm": 5.493,
        "cumMin": 18.31
      },
      {
        "slug": "hkl-street-stadiou-22",
        "seq": 11,
        "cumKm": 7.877,
        "cumMin": 26.26
      }
    ]
  },
  {
    "code": "1035",
    "lineCode": "HKL-92",
    "name": "Grammi 2 Mple Grammi",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-pagkritio-stadio",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-sofokli-venizelou",
        "seq": 1,
        "cumKm": 0.113,
        "cumMin": 0.38
      },
      {
        "slug": "hkl-talos",
        "seq": 2,
        "cumKm": 1.547,
        "cumMin": 5.16
      },
      {
        "slug": "hkl-mitera",
        "seq": 3,
        "cumKm": 2.022,
        "cumMin": 6.74
      },
      {
        "slug": "hkl-arxiepiskopou-makariou-2",
        "seq": 4,
        "cumKm": 2.411,
        "cumMin": 8.04
      },
      {
        "slug": "hkl-kalo-rinou-209",
        "seq": 5,
        "cumKm": 2.823,
        "cumMin": 9.41
      },
      {
        "slug": "hkl-kalo-rinou-33",
        "seq": 6,
        "cumKm": 3.072,
        "cumMin": 10.24
      },
      {
        "slug": "hkl-agiou-mina",
        "seq": 7,
        "cumKm": 3.276,
        "cumMin": 10.92
      },
      {
        "slug": "hkl-square-kornarou",
        "seq": 8,
        "cumKm": 3.621,
        "cumMin": 12.07
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 9,
        "cumKm": 3.641,
        "cumMin": 12.14
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 10,
        "cumKm": 3.996,
        "cumMin": 13.32
      },
      {
        "slug": "hkl-st-giamalaki-kazantzaki",
        "seq": 11,
        "cumKm": 4.264,
        "cumMin": 14.21
      },
      {
        "slug": "hkl-sofokli-venizelou-giamalaki",
        "seq": 12,
        "cumKm": 4.535,
        "cumMin": 15.12
      },
      {
        "slug": "hkl-mouseio-fysikis-istorias",
        "seq": 13,
        "cumKm": 4.945,
        "cumMin": 16.48
      },
      {
        "slug": "hkl-sofokli-venizelou-arxiepiskopou-makariou",
        "seq": 14,
        "cumKm": 5.333,
        "cumMin": 17.78
      },
      {
        "slug": "hkl-talos-2",
        "seq": 15,
        "cumKm": 5.831,
        "cumMin": 19.44
      },
      {
        "slug": "hkl-ts-pagkritio-stadio",
        "seq": 16,
        "cumKm": 7.329,
        "cumMin": 24.43
      }
    ]
  },
  {
    "code": "1037",
    "lineCode": "HKL-93",
    "name": "Grammi 3 Prasini Grammi",
    "direction": 2,
    "stops": [
      {
        "slug": "hkl-ts-green-line",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "hkl-square-kyprou-2",
        "seq": 1,
        "cumKm": 2.011,
        "cumMin": 6.7
      },
      {
        "slug": "hkl-square-kornarou-m",
        "seq": 2,
        "cumKm": 2.438,
        "cumMin": 8.13
      },
      {
        "slug": "hkl-agiou-mina-2",
        "seq": 3,
        "cumKm": 2.794,
        "cumMin": 9.31
      },
      {
        "slug": "hkl-kamaraki-avenue-kalo-rinou-166-hotel-iraklio",
        "seq": 4,
        "cumKm": 2.992,
        "cumMin": 9.97
      },
      {
        "slug": "hkl-avenue-kalo-rinou-236",
        "seq": 5,
        "cumKm": 3.312,
        "cumMin": 11.04
      },
      {
        "slug": "hkl-l-plastira-pyli-vitileem",
        "seq": 6,
        "cumKm": 3.526,
        "cumMin": 11.75
      },
      {
        "slug": "hkl-l-plastira-stoa-makasi",
        "seq": 7,
        "cumKm": 4.083,
        "cumMin": 13.61
      },
      {
        "slug": "hkl-l-plastira-kipotheatro-xatzidaki",
        "seq": 8,
        "cumKm": 4.524,
        "cumMin": 15.08
      },
      {
        "slug": "hkl-square-kyprou",
        "seq": 9,
        "cumKm": 4.713,
        "cumMin": 15.71
      },
      {
        "slug": "hkl-ts-green-line",
        "seq": 10,
        "cumKm": 6.732,
        "cumMin": 22.44
      }
    ]
  }
];
