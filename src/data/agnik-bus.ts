// AUTO-GENERE par scripts/agncitybus_ingest.mjs — NE PAS EDITER A LA MAIN.
// Reseau bus urbain gratuit d'Agios Nikolaos (agncitybus.gr), aspire le 2026-07-01.
// Source du calculateur de trajets urbain (src/lib/urban-journey.ts).

export interface AgnikStop { slug: string; name: string; nameEl: string; lat: number; lng: number; }
export interface AgnikLineStop { slug: string; seq: number; cumKm: number; cumMin: number; }
export interface AgnikLine {
  id: string; code: string; color: "yellow" | "red" | "green"; hex: string;
  nameEn: string; nameEl: string; totalMinutes: number; lengthKm: number; stops: AgnikLineStop[];
}

export const AGNIK_SERVICE = {
  headwayMin: 30, firstDep: "07:00", lastDep: "22:00",
  days: "Every Day", free: true,
  departures: ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00"],
} as const;

export const AGNIK_STOPS: Record<string, AgnikStop> = {
  "agn-terminal": {
    "slug": "agn-terminal",
    "name": "Terminal",
    "nameEl": "ΤΕΡΜΑ",
    "lat": 35.193073372876,
    "lng": 25.711977481842
  },
  "agn-epimenidou-33": {
    "slug": "agn-epimenidou-33",
    "name": "Epimenidou 33",
    "nameEl": "ΕΠΙΜΕΝΙΔΟΥ 33",
    "lat": 35.1901654,
    "lng": 25.7137109
  },
  "agn-kritsas-3": {
    "slug": "agn-kritsas-3",
    "name": "Kritsas 3",
    "nameEl": "ΚΡΙΤΣΑΣ 3",
    "lat": 35.187505,
    "lng": 25.7130543
  },
  "agn-karamanlh-elta": {
    "slug": "agn-karamanlh-elta",
    "name": "Karamanlh (elta)",
    "nameEl": "Κ.ΚΑΡΑΜΑΝΛΗ (ΕΛΤΑ)",
    "lat": 35.186691,
    "lng": 25.7101033
  },
  "agn-karamanlh-46": {
    "slug": "agn-karamanlh-46",
    "name": "Karamanlh 46",
    "nameEl": "Κ.ΚΑΡΑΜΑΝΛΗ 46",
    "lat": 35.1861759,
    "lng": 25.708148
  },
  "agn-karamanlh": {
    "slug": "agn-karamanlh",
    "name": "Karamanlh",
    "nameEl": "Κ.ΚΑΡΑΜΑΝΛΗ (Ένωση Μεραμβέλλου)",
    "lat": 35.1868916,
    "lng": 25.7120576
  },
  "agn-latous": {
    "slug": "agn-latous",
    "name": "Latous",
    "nameEl": "ΛΑΤΟΥΣ (ΔΕΗ - ΔΕΥΑΑΝ)",
    "lat": 35.187464,
    "lng": 25.714253
  },
  "agn-rousou-kapetanakh-7": {
    "slug": "agn-rousou-kapetanakh-7",
    "name": "Rousou Kapetanakh 7",
    "nameEl": "ΡΟΥΣΟΥ ΚΑΠΕΤΑΝΑΚΗ 7 (Παλαιό Δημαρχείο)",
    "lat": 35.187913,
    "lng": 25.715711
  },
  "agn-square-el-benizelou": {
    "slug": "agn-square-el-benizelou",
    "name": "Square EL. Benizelou",
    "nameEl": "ΠΛΑΤΕΙΑ ΕΛ. ΒΕΝΙΖΕΛΟΥ",
    "lat": 35.189084,
    "lng": 25.717475
  },
  "agn-sfakianakh-rex": {
    "slug": "agn-sfakianakh-rex",
    "name": "Sfakianakh (rex)",
    "nameEl": "ΜΙΧ. ΣΦΑΚΙΑΝΑΚΗ (ΡΕΞ)",
    "lat": 35.1898035,
    "lng": 25.7198726
  },
  "agn-akth-themistokleous": {
    "slug": "agn-akth-themistokleous",
    "name": "Akth Themistokleous",
    "nameEl": "ΑΚΤΗ ΘΕΜΙΣΤΟΚΛΕΟΥΣ (Κέρατο Αμάλθειας)",
    "lat": 35.189376,
    "lng": 25.722211
  },
  "agn-akth-themistokleous-dock": {
    "slug": "agn-akth-themistokleous-dock",
    "name": "Akth Themistokleous (dock)",
    "nameEl": "ΑΚΤΗ ΘΕΜΙΣΤΟΚΛΕΟΥΣ (Λιμάνι)",
    "lat": 35.1916542,
    "lng": 25.7216574
  },
  "agn-akth-koundourou": {
    "slug": "agn-akth-koundourou",
    "name": "Akth Koundourou",
    "nameEl": "ΑΚΤΗ Ι. ΚΟΥΝΔΟΥΡΟΥ (Επιμελητήριο)",
    "lat": 35.1904444,
    "lng": 25.7196466
  },
  "agn-k-palaiologou-lake": {
    "slug": "agn-k-palaiologou-lake",
    "name": "K. Palaiologou (lake)",
    "nameEl": "Κ. ΠΑΛΑΙΟΛΟΓΟΥ (Λίμνη)",
    "lat": 35.1912066,
    "lng": 25.7182173
  },
  "agn-k-palaiologou-54": {
    "slug": "agn-k-palaiologou-54",
    "name": "K. Palaiologou 54",
    "nameEl": "Κ. ΠΑΛΑΙΟΛΟΓΟΥ 54",
    "lat": 35.192482,
    "lng": 25.716559
  },
  "agn-k-palaiologou": {
    "slug": "agn-k-palaiologou",
    "name": "K. Palaiologou",
    "nameEl": "Κ. ΠΑΛΑΙΟΛΟΓΟΥ (2ο Δημοτικό σχολείο)",
    "lat": 35.194083,
    "lng": 25.7144739
  },
  "agn-a-papandreou-8": {
    "slug": "agn-a-papandreou-8",
    "name": "A. Papandreou 8",
    "nameEl": "Α. ΠΑΠΑΝΔΡΕΟΥ 8",
    "lat": 35.1954889,
    "lng": 25.7129095
  },
  "agn-a-papandreou-64": {
    "slug": "agn-a-papandreou-64",
    "name": "A. Papandreou 64",
    "nameEl": "Α. ΠΑΠΑΝΔΡΕΟΥ 64",
    "lat": 35.1976917,
    "lng": 25.7102847
  },
  "agn-platakh": {
    "slug": "agn-platakh",
    "name": "Platakh",
    "nameEl": "ΕΛΕΥΘ. ΠΛΑΤΑΚΗ",
    "lat": 35.1993325,
    "lng": 25.7077768
  },
  "agn-gnoseos": {
    "slug": "agn-gnoseos",
    "name": "Gnoseos",
    "nameEl": "ΓΝΩΣΕΩΣ (ΕΠΑΛ)",
    "lat": 35.2006736,
    "lng": 25.7077409
  },
  "agn-gnoseos-ekab": {
    "slug": "agn-gnoseos-ekab",
    "name": "Gnoseos (ekab)",
    "nameEl": "ΓΝΩΣΕΩΣ (ΕΚΑΒ)",
    "lat": 35.2019134,
    "lng": 25.7093808
  },
  "agn-eloudas": {
    "slug": "agn-eloudas",
    "name": "Eloudas",
    "nameEl": "ΕΛΟΥΝΤΑΣ (Δημαρχείο)",
    "lat": 35.2029891,
    "lng": 25.7069581
  },
  "agn-eloudas-xhrokampos": {
    "slug": "agn-eloudas-xhrokampos",
    "name": "Eloudas (xhrokampos)",
    "nameEl": "ΕΛΟΥΝΤΑΣ (Ξηρόκαμπος)",
    "lat": 35.20193,
    "lng": 25.7058195
  },
  "agn-a-papandreou": {
    "slug": "agn-a-papandreou",
    "name": "A. Papandreou",
    "nameEl": "Α. ΠΑΠΑΝΔΡΕΟΥ",
    "lat": 35.1977881,
    "lng": 25.7096839
  },
  "agn-a-papandreou-hospital": {
    "slug": "agn-a-papandreou-hospital",
    "name": "A. Papandreou (hospital)",
    "nameEl": "Α. ΠΑΠΑΝΔΡΕΟΥ (Νοσοκομείο)",
    "lat": 35.19432,
    "lng": 25.7128938
  },
  "agn-minos": {
    "slug": "agn-minos",
    "name": "Minos",
    "nameEl": "Μίνωος",
    "lat": 35.20359619671137,
    "lng": 25.70998460054398
  },
  "agn-minos-agios-antonios": {
    "slug": "agn-minos-agios-antonios",
    "name": "Minos (Agios Antonios)",
    "nameEl": "Μίνωος (Αγιος Αντώνιος)",
    "lat": 35.20080617023362,
    "lng": 25.711025297641758
  },
  "agn-minoos-ammoudi-beach": {
    "slug": "agn-minoos-ammoudi-beach",
    "name": "Minoos (Ammoudi Beach)",
    "nameEl": "Μίνωος (Παραλία Αμμούδι)",
    "lat": 35.19864947764863,
    "lng": 25.712006986141205
  },
  "agn-akti-st-koundourou-a": {
    "slug": "agn-akti-st-koundourou-a",
    "name": "Akti St. Koundourou A",
    "nameEl": "Ακτή Στ. Κουνδούρου Α",
    "lat": 35.19702315329486,
    "lng": 25.71307718753815
  },
  "agn-akti-st-koundourou-b": {
    "slug": "agn-akti-st-koundourou-b",
    "name": "Akti St. Koundourou B",
    "nameEl": "Ακτή Στ. Κουνδούρου Β",
    "lat": 35.195826403257705,
    "lng": 25.715024471282963
  },
  "agn-akti-st-koundourou-c": {
    "slug": "agn-akti-st-koundourou-c",
    "name": "Akti St. Koundourou C",
    "nameEl": "Ακτή Στ. Κουνδούρου Γ",
    "lat": 35.194452091631724,
    "lng": 25.71689397096634
  },
  "agn-akti-st-koundourou-d": {
    "slug": "agn-akti-st-koundourou-d",
    "name": "Akti St. Koundourou D",
    "nameEl": "Ακτή Στ. Κουνδούρου Δ",
    "lat": 35.19180861347228,
    "lng": 25.719023644924167
  }
};

export const AGNIK_LINES: AgnikLine[] = [
  {
    "id": "AGN-1",
    "code": "AGN-1",
    "color": "yellow",
    "hex": "#F2C21E",
    "nameEn": "Agios Nikolaos City Bus - Yellow Line",
    "nameEl": "Κίτρινη Γραμμή",
    "totalMinutes": 26,
    "lengthKm": 7.742,
    "stops": [
      {
        "slug": "agn-terminal",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "agn-epimenidou-33",
        "seq": 1,
        "cumKm": 0.42,
        "cumMin": 1.4
      },
      {
        "slug": "agn-kritsas-3",
        "seq": 2,
        "cumKm": 0.761,
        "cumMin": 2.54
      },
      {
        "slug": "agn-karamanlh-elta",
        "seq": 3,
        "cumKm": 1.064,
        "cumMin": 3.55
      },
      {
        "slug": "agn-karamanlh-46",
        "seq": 4,
        "cumKm": 1.25,
        "cumMin": 4.17
      },
      {
        "slug": "agn-karamanlh",
        "seq": 5,
        "cumKm": 1.823,
        "cumMin": 6.08
      },
      {
        "slug": "agn-latous",
        "seq": 6,
        "cumKm": 2.034,
        "cumMin": 6.78
      },
      {
        "slug": "agn-rousou-kapetanakh-7",
        "seq": 7,
        "cumKm": 2.19,
        "cumMin": 7.3
      },
      {
        "slug": "agn-square-el-benizelou",
        "seq": 8,
        "cumKm": 2.482,
        "cumMin": 8.27
      },
      {
        "slug": "agn-sfakianakh-rex",
        "seq": 9,
        "cumKm": 2.798,
        "cumMin": 9.33
      },
      {
        "slug": "agn-akth-themistokleous",
        "seq": 10,
        "cumKm": 3.052,
        "cumMin": 10.17
      },
      {
        "slug": "agn-akth-themistokleous-dock",
        "seq": 11,
        "cumKm": 3.351,
        "cumMin": 11.17
      },
      {
        "slug": "agn-akth-koundourou",
        "seq": 12,
        "cumKm": 3.596,
        "cumMin": 11.99
      },
      {
        "slug": "agn-k-palaiologou-lake",
        "seq": 13,
        "cumKm": 3.78,
        "cumMin": 12.6
      },
      {
        "slug": "agn-k-palaiologou-54",
        "seq": 14,
        "cumKm": 3.986,
        "cumMin": 13.29
      },
      {
        "slug": "agn-k-palaiologou",
        "seq": 15,
        "cumKm": 4.246,
        "cumMin": 14.15
      },
      {
        "slug": "agn-a-papandreou-8",
        "seq": 16,
        "cumKm": 4.46,
        "cumMin": 14.87
      },
      {
        "slug": "agn-a-papandreou-64",
        "seq": 17,
        "cumKm": 4.805,
        "cumMin": 16.02
      },
      {
        "slug": "agn-platakh",
        "seq": 18,
        "cumKm": 5.107,
        "cumMin": 17.02
      },
      {
        "slug": "agn-gnoseos",
        "seq": 19,
        "cumKm": 5.294,
        "cumMin": 17.65
      },
      {
        "slug": "agn-gnoseos-ekab",
        "seq": 20,
        "cumKm": 5.498,
        "cumMin": 18.33
      },
      {
        "slug": "agn-eloudas",
        "seq": 21,
        "cumKm": 6.178,
        "cumMin": 20.59
      },
      {
        "slug": "agn-eloudas-xhrokampos",
        "seq": 22,
        "cumKm": 6.336,
        "cumMin": 21.12
      },
      {
        "slug": "agn-a-papandreou",
        "seq": 23,
        "cumKm": 7.027,
        "cumMin": 23.42
      },
      {
        "slug": "agn-a-papandreou-hospital",
        "seq": 24,
        "cumKm": 7.55,
        "cumMin": 25.17
      }
    ]
  },
  {
    "id": "AGN-2",
    "code": "AGN-2",
    "color": "red",
    "hex": "#E0342B",
    "nameEn": "Agios Nikolaos City Bus - Red Line",
    "nameEl": "Κόκκινη Γραμμή",
    "totalMinutes": 16,
    "lengthKm": 4.725,
    "stops": [
      {
        "slug": "agn-terminal",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "agn-epimenidou-33",
        "seq": 1,
        "cumKm": 0.424,
        "cumMin": 1.41
      },
      {
        "slug": "agn-kritsas-3",
        "seq": 2,
        "cumKm": 0.763,
        "cumMin": 2.54
      },
      {
        "slug": "agn-karamanlh-elta",
        "seq": 3,
        "cumKm": 1.066,
        "cumMin": 3.55
      },
      {
        "slug": "agn-karamanlh-46",
        "seq": 4,
        "cumKm": 1.253,
        "cumMin": 4.18
      },
      {
        "slug": "agn-karamanlh",
        "seq": 5,
        "cumKm": 1.822,
        "cumMin": 6.07
      },
      {
        "slug": "agn-latous",
        "seq": 6,
        "cumKm": 2.032,
        "cumMin": 6.77
      },
      {
        "slug": "agn-rousou-kapetanakh-7",
        "seq": 7,
        "cumKm": 2.187,
        "cumMin": 7.29
      },
      {
        "slug": "agn-square-el-benizelou",
        "seq": 8,
        "cumKm": 2.479,
        "cumMin": 8.26
      },
      {
        "slug": "agn-sfakianakh-rex",
        "seq": 9,
        "cumKm": 2.796,
        "cumMin": 9.32
      },
      {
        "slug": "agn-akth-themistokleous",
        "seq": 10,
        "cumKm": 3.054,
        "cumMin": 10.18
      },
      {
        "slug": "agn-akth-themistokleous-dock",
        "seq": 11,
        "cumKm": 3.358,
        "cumMin": 11.19
      },
      {
        "slug": "agn-akth-koundourou",
        "seq": 12,
        "cumKm": 3.603,
        "cumMin": 12.01
      },
      {
        "slug": "agn-k-palaiologou-lake",
        "seq": 13,
        "cumKm": 3.786,
        "cumMin": 12.62
      },
      {
        "slug": "agn-k-palaiologou-54",
        "seq": 14,
        "cumKm": 3.993,
        "cumMin": 13.31
      },
      {
        "slug": "agn-k-palaiologou",
        "seq": 15,
        "cumKm": 4.253,
        "cumMin": 14.18
      },
      {
        "slug": "agn-a-papandreou-hospital",
        "seq": 16,
        "cumKm": 4.537,
        "cumMin": 15.12
      }
    ]
  },
  {
    "id": "AGN-3",
    "code": "AGN-3",
    "color": "green",
    "hex": "#2FA24C",
    "nameEn": "Agios Nikolaos City Bus - Green Line",
    "nameEl": "Πράσινη Γραμμή",
    "totalMinutes": 16,
    "lengthKm": 4.744,
    "stops": [
      {
        "slug": "agn-terminal",
        "seq": 0,
        "cumKm": 0,
        "cumMin": 0
      },
      {
        "slug": "agn-a-papandreou-8",
        "seq": 1,
        "cumKm": 0.445,
        "cumMin": 1.48
      },
      {
        "slug": "agn-a-papandreou-64",
        "seq": 2,
        "cumKm": 0.786,
        "cumMin": 2.62
      },
      {
        "slug": "agn-platakh",
        "seq": 3,
        "cumKm": 1.09,
        "cumMin": 3.63
      },
      {
        "slug": "agn-eloudas",
        "seq": 4,
        "cumKm": 1.618,
        "cumMin": 5.39
      },
      {
        "slug": "agn-minos",
        "seq": 5,
        "cumKm": 1.966,
        "cumMin": 6.55
      },
      {
        "slug": "agn-minos-agios-antonios",
        "seq": 6,
        "cumKm": 2.301,
        "cumMin": 7.67
      },
      {
        "slug": "agn-minoos-ammoudi-beach",
        "seq": 7,
        "cumKm": 2.562,
        "cumMin": 8.54
      },
      {
        "slug": "agn-akti-st-koundourou-a",
        "seq": 8,
        "cumKm": 2.779,
        "cumMin": 9.26
      },
      {
        "slug": "agn-akti-st-koundourou-b",
        "seq": 9,
        "cumKm": 3.001,
        "cumMin": 10
      },
      {
        "slug": "agn-akti-st-koundourou-c",
        "seq": 10,
        "cumKm": 3.233,
        "cumMin": 10.78
      },
      {
        "slug": "agn-akti-st-koundourou-d",
        "seq": 11,
        "cumKm": 3.592,
        "cumMin": 11.97
      },
      {
        "slug": "agn-k-palaiologou-lake",
        "seq": 12,
        "cumKm": 3.801,
        "cumMin": 12.67
      },
      {
        "slug": "agn-k-palaiologou-54",
        "seq": 13,
        "cumKm": 4.008,
        "cumMin": 13.36
      },
      {
        "slug": "agn-k-palaiologou",
        "seq": 14,
        "cumKm": 4.268,
        "cumMin": 14.23
      },
      {
        "slug": "agn-a-papandreou-hospital",
        "seq": 15,
        "cumKm": 4.553,
        "cumMin": 15.18
      }
    ]
  }
];
