// AUTO-GENERE par scripts/citybus_ingest.mjs --city chania — NE PAS EDITER A LA MAIN.
// Reseau bus urbain de Chania (plateforme citybus.gr), aspire le 2026-07-09.
// Temps = estimations (vitesse urbaine 18 km/h), pas d'horaire officiel.
import type { CitybusData } from "@/lib/citybus/types";

export const CITYBUS_DATA: CitybusData = {
  "info": {
    "operator": "Chania Urban Bus (Astiko KTEL Chanion)",
    "sourceUrl": "https://chania.citybus.gr/",
    "city": "Chania"
  },
  "stops": {
    "cha-1866-square-city-center": {
      "slug": "cha-1866-square-city-center",
      "name": "1866 Square - City Center",
      "nameEl": "ΤΣ ΠΛΑΤΕΙΑ 1866",
      "lat": 35.5128561,
      "lng": 24.0179623
    },
    "cha-ts-plateia-1866": {
      "slug": "cha-ts-plateia-1866",
      "name": "Ts_plateia_1866",
      "nameEl": "ΤΣ ΠΛΑΤΕΙΑ-1866",
      "lat": 35.51281913311825,
      "lng": 24.017394794477454
    },
    "cha-ts-zymvrakakidon": {
      "slug": "cha-ts-zymvrakakidon",
      "name": "Ts_zymvrakakidon",
      "nameEl": "ΤΣ ΖΥΜΒΡΑΚΑΚΗΔΩΝ",
      "lat": 35.5120332,
      "lng": 24.0174431
    },
    "cha-nikolaou-skoula": {
      "slug": "cha-nikolaou-skoula",
      "name": "Nikolaou Skoula",
      "nameEl": "ΝΙΚΟΛΑΟΥ ΣΚΟΥΛΑ",
      "lat": 35.5088612,
      "lng": 24.0176042
    },
    "cha-papadaki": {
      "slug": "cha-papadaki",
      "name": "Papadaki",
      "nameEl": "ΠΑΠΑΔΑΚΗ",
      "lat": 35.5071791,
      "lng": 24.0176628
    },
    "cha-mournion": {
      "slug": "cha-mournion",
      "name": "Mournion",
      "nameEl": "ΜΟΥΡΝΙΩΝ",
      "lat": 35.4969318,
      "lng": 24.0182241
    },
    "cha-agias-marinas": {
      "slug": "cha-agias-marinas",
      "name": "Agias Marinas",
      "nameEl": "ΑΓΙΑΣ ΜΑΡΙΝΑΣ",
      "lat": 35.4939193474316,
      "lng": 24.0177681328166
    },
    "cha-naskri": {
      "slug": "cha-naskri",
      "name": "Naskri",
      "nameEl": "ΝΑΣΚΡΗ",
      "lat": 35.4920936755153,
      "lng": 24.0175213695872
    },
    "cha-national-road": {
      "slug": "cha-national-road",
      "name": "National Road",
      "nameEl": "ΕΘΝΙΚΗ ΟΔΟΣ",
      "lat": 35.488477,
      "lng": 24.0152843
    },
    "cha-konstantinoupoleos": {
      "slug": "cha-konstantinoupoleos",
      "name": "Konstantinoupoleos",
      "nameEl": "ΚΩΝΣΤΑΝΤΙΝΟΥΠΟΛΕΩΣ",
      "lat": 35.4858759646095,
      "lng": 24.0136040984035
    },
    "cha-mournies": {
      "slug": "cha-mournies",
      "name": "Mournies",
      "nameEl": "ΜΟΥΡΝΙΕΣ",
      "lat": 35.48394064336417,
      "lng": 24.012786956039886
    },
    "cha-zoodochou-pigis": {
      "slug": "cha-zoodochou-pigis",
      "name": "Zoodochou Pigis",
      "nameEl": "ΖΩΟΔΟΧΟΥ ΠΗΓΗΣ",
      "lat": 35.48166834435197,
      "lng": 24.0121836274759
    },
    "cha-agios-eleftherios": {
      "slug": "cha-agios-eleftherios",
      "name": "Agios Eleftherios",
      "nameEl": "ΑΓΙΟΣ ΕΛΕΥΘΕΡΙΟΣ",
      "lat": 35.4807445,
      "lng": 24.0144568
    },
    "cha-hospital": {
      "slug": "cha-hospital",
      "name": "Hospital",
      "nameEl": "ΝΟΣΟΚΟΜΕΙΟ",
      "lat": 35.4788982,
      "lng": 24.0159403
    },
    "cha-hospital-gate": {
      "slug": "cha-hospital-gate",
      "name": "Hospital Gate",
      "nameEl": "ΠΥΛΗ ΝΟΣΟΚΟΜΕΙΟ",
      "lat": 35.480712,
      "lng": 24.0175597
    },
    "cha-elpidas": {
      "slug": "cha-elpidas",
      "name": "Elpidas",
      "nameEl": "ΕΛΠΙΔΑΣ",
      "lat": 35.4808400442457,
      "lng": 24.0223414394804
    },
    "cha-megalou-alexandrou": {
      "slug": "cha-megalou-alexandrou",
      "name": "Megalou Alexandrou",
      "nameEl": "ΜΕΓΑΛΟΥ ΑΛΕΞΑΝΔΡΟΥ",
      "lat": 35.4840507,
      "lng": 24.0231421
    },
    "cha-chnara": {
      "slug": "cha-chnara",
      "name": "Chnara",
      "nameEl": "ΧΝΑΡΑ",
      "lat": 35.4865918,
      "lng": 24.0233486
    },
    "cha-sofokli-venizelou": {
      "slug": "cha-sofokli-venizelou",
      "name": "Sofokli Venizelou",
      "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ",
      "lat": 35.48901815252652,
      "lng": 24.023164234935557
    },
    "cha-karadimitri": {
      "slug": "cha-karadimitri",
      "name": "Karadimitri",
      "nameEl": "ΚΑΡΑΔΗΜΗΤΡΗ",
      "lat": 35.49202467831112,
      "lng": 24.022335685250095
    },
    "cha-kokkino-metochi": {
      "slug": "cha-kokkino-metochi",
      "name": "Kokkino Metochi",
      "nameEl": "ΚΟΚΚΙΝΟ ΜΕΤΟΧΙ",
      "lat": 35.4941223,
      "lng": 24.022716
    },
    "cha-ergatikes-katoikies": {
      "slug": "cha-ergatikes-katoikies",
      "name": "Ergatikes Katoikies",
      "nameEl": "ΕΡΓΑΤΙΚΕΣ ΚΑΤΟΙΚΙΕΣ",
      "lat": 35.4962092676503,
      "lng": 24.022214805487817
    },
    "cha-agios-panteleimonas": {
      "slug": "cha-agios-panteleimonas",
      "name": "Agios Panteleimonas",
      "nameEl": "ΑΓΙΟΣ ΠΑΝΤΕΛΕΗΜΟΝΑΣ",
      "lat": 35.4972334,
      "lng": 24.0217428
    },
    "cha-dei": {
      "slug": "cha-dei",
      "name": "DEI",
      "nameEl": "ΔΕΗ",
      "lat": 35.5014010003072,
      "lng": 24.02167282149581
    },
    "cha-palia-ilektriki": {
      "slug": "cha-palia-ilektriki",
      "name": "Palia Ilektriki",
      "nameEl": "ΠΑΛΙΑ ΗΛΕΚΤΡΙΚΗ",
      "lat": 35.5035395193396,
      "lng": 24.021463949155304
    },
    "cha-kornarou": {
      "slug": "cha-kornarou",
      "name": "Kornarou",
      "nameEl": "ΚΟΡΝΑΡΟΥ",
      "lat": 35.505083744828084,
      "lng": 24.01976308394831
    },
    "cha-agios-loukas": {
      "slug": "cha-agios-loukas",
      "name": "Agios Loukas",
      "nameEl": "ΑΓΙΟΣ ΛΟΥΚΑΣ",
      "lat": 35.5077667,
      "lng": 24.01984
    },
    "cha-markou-botsari": {
      "slug": "cha-markou-botsari",
      "name": "Markou Botsari",
      "nameEl": "ΜΑΡΚΟΥ ΜΠΟΤΣΑΡΗ",
      "lat": 35.5101271050475,
      "lng": 24.0201301969461
    },
    "cha-peridou": {
      "slug": "cha-peridou",
      "name": "Peridou",
      "nameEl": "ΠΕΡΙΔΟΥ",
      "lat": 35.5121183,
      "lng": 24.0203042
    },
    "cha-chatzimichali-giannari": {
      "slug": "cha-chatzimichali-giannari",
      "name": "Chatzimichali Giannari",
      "nameEl": "ΧΑΤΖΗΜΙΧΑΛΗ ΓΙΑΝΝΑΡΗ",
      "lat": 35.51395269162429,
      "lng": 24.018421175463097
    },
    "cha-plastira": {
      "slug": "cha-plastira",
      "name": "Plastira",
      "nameEl": "ΠΛΑΣΤΗΡΑ",
      "lat": 35.5037274,
      "lng": 24.0166033
    },
    "cha-mikras-asias": {
      "slug": "cha-mikras-asias",
      "name": "Mikras Asias",
      "nameEl": "ΜΙΚΡΑΣ ΑΣΙΑΣ",
      "lat": 35.501508180221194,
      "lng": 24.016911295896683
    },
    "cha-parodos-plastira": {
      "slug": "cha-parodos-plastira",
      "name": "Parodos Plastira",
      "nameEl": "ΠΑΡΟΔΟΣ ΠΛΑΣΤΗΡΑ",
      "lat": 35.49947541245311,
      "lng": 24.016395403670145
    },
    "cha-sklavenitis": {
      "slug": "cha-sklavenitis",
      "name": "Sklavenitis",
      "nameEl": "ΣΚΛΑΒΕΝΙΤΗΣ",
      "lat": 35.497015,
      "lng": 24.0163305
    },
    "cha-sofokli-venizelou-ag-eleftheriou": {
      "slug": "cha-sofokli-venizelou-ag-eleftheriou",
      "name": "Sofokli Venizelou & AG. Eleftheriou",
      "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ & ΑΓ. ΕΛΕΥΘΕΡΙΟΥ",
      "lat": 35.480693306945,
      "lng": 24.0228164885627
    },
    "cha-ag-aikaterinis": {
      "slug": "cha-ag-aikaterinis",
      "name": "AG. Aikaterinis",
      "nameEl": "ΑΓ. ΑΙΚΑΤΕΡΙΝΗΣ",
      "lat": 35.4796324,
      "lng": 24.0286829
    },
    "cha-ikarou": {
      "slug": "cha-ikarou",
      "name": "Ikarou",
      "nameEl": "ΙΚΑΡΟΥ",
      "lat": 35.4780765767562,
      "lng": 24.031189772805
    },
    "cha-nerokourou-ag-aikaterinis": {
      "slug": "cha-nerokourou-ag-aikaterinis",
      "name": "Nerokourou & AG. Aikaterinis",
      "nameEl": "ΝΕΡΟΚΟΥΡΟΥ & ΑΓ. ΑΙΚΑΤΕΡΙΝΗΣ",
      "lat": 35.4759447,
      "lng": 24.0346874
    },
    "cha-junction-nerokourou": {
      "slug": "cha-junction-nerokourou",
      "name": "Junction Nerokourou",
      "nameEl": "ΔΙΑΣΤΑΥΡΩΣΗ ΝΕΡΟΚΟΥΡΟΥ",
      "lat": 35.47599954635098,
      "lng": 24.037675211904386
    },
    "cha-nerokourou": {
      "slug": "cha-nerokourou",
      "name": "Nerokourou",
      "nameEl": "ΤΣ ΝΕΡΟΚΟΥΡΟΥ",
      "lat": 35.47537443053649,
      "lng": 24.041671980438398
    },
    "cha-junction-nerokourou-2": {
      "slug": "cha-junction-nerokourou-2",
      "name": "Junction Nerokourou",
      "nameEl": "ΔΙΑΣΤΑΥΡΩΣΗ ΝΕΡΟΚΟΥΡΟΥ",
      "lat": 35.47633541296052,
      "lng": 24.037088104898334
    },
    "cha-agioi-saranta": {
      "slug": "cha-agioi-saranta",
      "name": "Agioi Saranta",
      "nameEl": "ΑΓΙΟΙ ΣΑΡΑΝΤΑ",
      "lat": 35.4816529,
      "lng": 24.0368059
    },
    "cha-tompazi": {
      "slug": "cha-tompazi",
      "name": "Tompazi",
      "nameEl": "ΤΟΜΠΑΖΗ",
      "lat": 35.4836731,
      "lng": 24.0366477
    },
    "cha-katsifariana": {
      "slug": "cha-katsifariana",
      "name": "Katsifariana",
      "nameEl": "ΚΑΤΣΙΦΑΡΙΑΝΑ",
      "lat": 35.48767390597991,
      "lng": 24.035836487320672
    },
    "cha-xylokamara": {
      "slug": "cha-xylokamara",
      "name": "Xylokamara",
      "nameEl": "ΞΥΛΟΚΑΜΑΡΑ",
      "lat": 35.4909948993806,
      "lng": 24.0337768474605
    },
    "cha-ethnarchou-venizelou": {
      "slug": "cha-ethnarchou-venizelou",
      "name": "Ethnarchou Venizelou",
      "nameEl": "ΕΘΝΑΡΧΟΥ ΒΕΝΙΖΕΛΟΥ",
      "lat": 35.4918654,
      "lng": 24.0308641
    },
    "cha-chrysopigi": {
      "slug": "cha-chrysopigi",
      "name": "Chrysopigi",
      "nameEl": "ΧΡΥΣΟΠΗΓΗ",
      "lat": 35.492737,
      "lng": 24.0285776
    },
    "cha-ag-apostolon": {
      "slug": "cha-ag-apostolon",
      "name": "AG. Apostolon",
      "nameEl": "ΑΓ. ΑΠΟΣΤΟΛΩΝ",
      "lat": 35.4940342,
      "lng": 24.0240017
    },
    "cha-ypsilantou": {
      "slug": "cha-ypsilantou",
      "name": "Ypsilantou",
      "nameEl": "ΥΨΗΛΑΝΤΟΥ",
      "lat": 35.497519,
      "lng": 24.0242893
    },
    "cha-kolokotroni": {
      "slug": "cha-kolokotroni",
      "name": "Kolokotroni",
      "nameEl": "ΚΟΛΟΚΟΤΡΩΝΗ",
      "lat": 35.50073390233412,
      "lng": 24.025100992071422
    },
    "cha-agios-stefanos": {
      "slug": "cha-agios-stefanos",
      "name": "Agios Stefanos",
      "nameEl": "ΑΓΙΟΣ ΣΤΕΦΑΝΟΣ",
      "lat": 35.502703,
      "lng": 24.0255523
    },
    "cha-mavrokordatou": {
      "slug": "cha-mavrokordatou",
      "name": "Mavrokordatou",
      "nameEl": "ΜΑΥΡΟΚΟΡΔΑΤΟΥ",
      "lat": 35.50386134640866,
      "lng": 24.025557653372953
    },
    "cha-police-department": {
      "slug": "cha-police-department",
      "name": "Police Department",
      "nameEl": "ΑΣΤΥΝΟΜΙΚΟ ΜΕΓΑΡΟ",
      "lat": 35.50533292543363,
      "lng": 24.025732842106798
    },
    "cha-nearchou": {
      "slug": "cha-nearchou",
      "name": "Nearchou",
      "nameEl": "ΝΕΑΡΧΟΥ",
      "lat": 35.50741412821392,
      "lng": 24.025085035581974
    },
    "cha-war-museum": {
      "slug": "cha-war-museum",
      "name": "WAR Museum",
      "nameEl": "ΠΟΛΕΜΙΚΟ ΜΟΥΣΕΙΟ",
      "lat": 35.5109422,
      "lng": 24.0249125
    },
    "cha-ktistaki": {
      "slug": "cha-ktistaki",
      "name": "Ktistaki",
      "nameEl": "ΚΤΙΣΤΑΚΗ",
      "lat": 35.5129978,
      "lng": 24.0221163
    },
    "cha-ktistaki-2": {
      "slug": "cha-ktistaki-2",
      "name": "Ktistaki",
      "nameEl": "ΚΤΙΣΤΑΚΗ",
      "lat": 35.5133515,
      "lng": 24.0230886
    },
    "cha-roloi": {
      "slug": "cha-roloi",
      "name": "Roloi",
      "nameEl": "ΡΟΛΟΙ",
      "lat": 35.5120859714983,
      "lng": 24.0259282936655
    },
    "cha-olympia": {
      "slug": "cha-olympia",
      "name": "Olympia",
      "nameEl": "ΟΛΥΜΠΙΑ",
      "lat": 35.5109563597665,
      "lng": 24.0284016387566
    },
    "cha-dikastiria": {
      "slug": "cha-dikastiria",
      "name": "Dikastiria",
      "nameEl": "ΔΙΚΑΣΤΗΡΙΑ",
      "lat": 35.5097969,
      "lng": 24.0309023
    },
    "cha-kamaraki": {
      "slug": "cha-kamaraki",
      "name": "Kamaraki",
      "nameEl": "ΚΑΜΑΡΑΚΙ",
      "lat": 35.512364,
      "lng": 24.0309136
    },
    "cha-iroon-polytechneiou": {
      "slug": "cha-iroon-polytechneiou",
      "name": "Iroon Polytechneiou",
      "nameEl": "ΗΡΩΩΝ ΠΟΛΥΤΕΧΝΕΙΟΥ",
      "lat": 35.5144414107749,
      "lng": 24.0310583015559
    },
    "cha-chonoloulou": {
      "slug": "cha-chonoloulou",
      "name": "Chonoloulou",
      "nameEl": "8ης ΔΕΚΕΜΒΡΙΟΥ",
      "lat": 35.5158019879458,
      "lng": 24.0315847708636
    },
    "cha-katsampa": {
      "slug": "cha-katsampa",
      "name": "Katsampa",
      "nameEl": "ΚΑΤΣΑΜΠΑ",
      "lat": 35.5153444,
      "lng": 24.0373301
    },
    "cha-meintani": {
      "slug": "cha-meintani",
      "name": "Meintani",
      "nameEl": "ΜΕΙΝΤΑΝΙ",
      "lat": 35.514868,
      "lng": 24.0409297
    },
    "cha-agia-foteini": {
      "slug": "cha-agia-foteini",
      "name": "Agia Foteini",
      "nameEl": "ΑΓΙΑ ΦΩΤΕΙΝΗ",
      "lat": 35.514651,
      "lng": 24.043925
    },
    "cha-ergatikes-katoikies-2": {
      "slug": "cha-ergatikes-katoikies-2",
      "name": "Ergatikes Katoikies",
      "nameEl": "ΕΡΓΑΤΙΚΕΣ ΚΑΤΟΙΚΙΕΣ",
      "lat": 35.5136506,
      "lng": 24.0470994
    },
    "cha-andrianaki": {
      "slug": "cha-andrianaki",
      "name": "Andrianaki",
      "nameEl": "ΑΝΔΡΙΑΝΑΚΗ",
      "lat": 35.5148973,
      "lng": 24.0502751
    },
    "cha-protomi-iliaki": {
      "slug": "cha-protomi-iliaki",
      "name": "Protomi Iliaki",
      "nameEl": "ΠΡΟΤΟΜΗ ΗΛΙΑΚΗ",
      "lat": 35.5171291,
      "lng": 24.0514854
    },
    "cha-venizelon-graves": {
      "slug": "cha-venizelon-graves",
      "name": "Venizelon Graves",
      "nameEl": "ΤΑΦΟΙ ΒΕΝΙΖΕΛΩΝ",
      "lat": 35.5221161,
      "lng": 24.0604457
    },
    "cha-entrance-university-of-crete": {
      "slug": "cha-entrance-university-of-crete",
      "name": "Entrance University OF Crete",
      "nameEl": "ΕΙΣΟΔΟΣ ΠΟΛΥΤΕΧΝΕΙΟΥ",
      "lat": 35.5249704,
      "lng": 24.0676384
    },
    "cha-venizelon-graves-2": {
      "slug": "cha-venizelon-graves-2",
      "name": "Venizelon Graves",
      "nameEl": "ΣΧΟΛΕΙΑ ΚΟΥΝΟΥΠΙΔΙΑΝΩΝ",
      "lat": 35.5222024,
      "lng": 24.0603739
    },
    "cha-andrianaki-2": {
      "slug": "cha-andrianaki-2",
      "name": "Andrianaki",
      "nameEl": "ΑΝΔΡΙΑΝΑΚΗ",
      "lat": 35.5152903,
      "lng": 24.0503383
    },
    "cha-ergatikes-katoikies-3": {
      "slug": "cha-ergatikes-katoikies-3",
      "name": "Ergatikes Katoikies",
      "nameEl": "ΕΡΓΑΤΙΚΕΣ ΚΑΤΟΙΚΙΕΣ",
      "lat": 35.5140944,
      "lng": 24.0462131
    },
    "cha-agia-foteini-2": {
      "slug": "cha-agia-foteini-2",
      "name": "Agia Foteini",
      "nameEl": "ΑΓΙΑ ΦΩΤΕΙΝΗ",
      "lat": 35.5148138,
      "lng": 24.0435604
    },
    "cha-meintani-2": {
      "slug": "cha-meintani-2",
      "name": "Meintani",
      "nameEl": "MEINTANI",
      "lat": 35.5149884,
      "lng": 24.0403324
    },
    "cha-katsampa-2": {
      "slug": "cha-katsampa-2",
      "name": "Katsampa",
      "nameEl": "ΚΑΤΣΑΜΠΑ",
      "lat": 35.515627,
      "lng": 24.0367543
    },
    "cha-iroon-polytechneiou-2": {
      "slug": "cha-iroon-polytechneiou-2",
      "name": "Iroon Polytechneiou",
      "nameEl": "ΗΡΩΩΝ ΠΟΛΥΤΕΧΝΕΙΟΥ",
      "lat": 35.5147494,
      "lng": 24.0309047
    },
    "cha-kamaraki-2": {
      "slug": "cha-kamaraki-2",
      "name": "Kamaraki",
      "nameEl": "ΚΑΜΑΡΑΚΙ",
      "lat": 35.5127994,
      "lng": 24.0307865
    },
    "cha-dikastiria-2": {
      "slug": "cha-dikastiria-2",
      "name": "Dikastiria",
      "nameEl": "ΔΙΚΑΣΤΗΡΙΑ",
      "lat": 35.5103689,
      "lng": 24.0304584
    },
    "cha-olympia-2": {
      "slug": "cha-olympia-2",
      "name": "Olympia",
      "nameEl": "ΟΛΥΜΠΙΑ",
      "lat": 35.5115511,
      "lng": 24.0273243
    },
    "cha-roloi-2": {
      "slug": "cha-roloi-2",
      "name": "Roloi",
      "nameEl": "ΡΟΛΟΙ",
      "lat": 35.512586,
      "lng": 24.0249881
    },
    "cha-ktistaki-3": {
      "slug": "cha-ktistaki-3",
      "name": "Ktistaki",
      "nameEl": "ΚΤΙΣΤΑΚΗ",
      "lat": 35.5136918,
      "lng": 24.0225526
    },
    "cha-schools": {
      "slug": "cha-schools",
      "name": "Schools",
      "nameEl": "ΣΧΟΛΕΙΑ",
      "lat": 35.5224194,
      "lng": 24.0590819
    },
    "cha-venizelon-graves-3": {
      "slug": "cha-venizelon-graves-3",
      "name": "Venizelon Graves",
      "nameEl": "ΤΑΦΟΙ ΒΕΝΙΖΕΛΩΝ",
      "lat": 35.5240881,
      "lng": 24.0572665
    },
    "cha-koukouvagia": {
      "slug": "cha-koukouvagia",
      "name": "Koukouvagia",
      "nameEl": "ΚΟΥΚΟΥΒΑΓΙΑ",
      "lat": 35.5256565,
      "lng": 24.0562285
    },
    "cha-agorastaki": {
      "slug": "cha-agorastaki",
      "name": "Agorastaki",
      "nameEl": "ΑΓΟΡΑΣΤΑΚΗ",
      "lat": 35.526712,
      "lng": 24.0555432
    },
    "cha-adamantiou-aretaki": {
      "slug": "cha-adamantiou-aretaki",
      "name": "Adamantiou Aretaki",
      "nameEl": "ΑΔΑΜΑΝΤΙΟΥ ΑΡΕΤΑΚΗ",
      "lat": 35.5283939,
      "lng": 24.0548096
    },
    "cha-emmanouil-symvoulaki": {
      "slug": "cha-emmanouil-symvoulaki",
      "name": "Emmanouil Symvoulaki",
      "nameEl": "ΕΜΜΑΝΟΥΗΛ ΣΥΜΒΟΥΛΑΚΗ",
      "lat": 35.5278298,
      "lng": 24.0539447
    },
    "cha-ioanni-kalogeri": {
      "slug": "cha-ioanni-kalogeri",
      "name": "Ioanni Kalogeri",
      "nameEl": "ΙΩΑΝΝΗ ΚΑΛΟΓΕΡΗ",
      "lat": 35.5274751,
      "lng": 24.0535129
    },
    "cha-koumpeli": {
      "slug": "cha-koumpeli",
      "name": "Koumpeli",
      "nameEl": "ΚΟΥΜΠΕΛΗ",
      "lat": 35.52652313333014,
      "lng": 24.05209908098563
    },
    "cha-megalou-alexandrou-2": {
      "slug": "cha-megalou-alexandrou-2",
      "name": "Megalou Alexandrou",
      "nameEl": "ΜΕΓΑΛΟΥ ΑΛΕΞΑΝΔΡΟΥ",
      "lat": 35.5326976,
      "lng": 24.0500875
    },
    "cha-aristofanous": {
      "slug": "cha-aristofanous",
      "name": "Aristofanous",
      "nameEl": "ΑΡΙΣΤΟΦΑΝΟΥΣ",
      "lat": 35.53527356632366,
      "lng": 24.048182603041077
    },
    "cha-solonos": {
      "slug": "cha-solonos",
      "name": "Solonos",
      "nameEl": "ΣΟΛΩΝΟΣ",
      "lat": 35.5338165,
      "lng": 24.0497044
    },
    "cha-nea-froudia": {
      "slug": "cha-nea-froudia",
      "name": "NEA Froudia",
      "nameEl": "ΝΕΑ ΦΡΟΥΔΙΑ",
      "lat": 35.52098096794474,
      "lng": 24.049733193546313
    },
    "cha-georgiou-papadaki": {
      "slug": "cha-georgiou-papadaki",
      "name": "Georgiou Papadaki",
      "nameEl": "ΓΕΩΡΓΙΟΥ ΠΑΠΑΔΑΚΗ",
      "lat": 35.52013725244255,
      "lng": 24.047693680011136
    },
    "cha-amfimaliou": {
      "slug": "cha-amfimaliou",
      "name": "Amfimaliou",
      "nameEl": "ΑΜΦΙΜΑΛΙΟΥ",
      "lat": 35.519901,
      "lng": 24.044471
    },
    "cha-evangelistrias": {
      "slug": "cha-evangelistrias",
      "name": "Evangelistrias",
      "nameEl": "ΕΥΑΓΓΕΛΙΣΤΡΙΑΣ",
      "lat": 35.5197252,
      "lng": 24.0427611
    },
    "cha-treis-kamares": {
      "slug": "cha-treis-kamares",
      "name": "Treis Kamares",
      "nameEl": "ΤΡΕΙΣ ΚΑΜΑΡΕΣ",
      "lat": 35.5186515,
      "lng": 24.040548
    },
    "cha-residence-of-el-venizelos": {
      "slug": "cha-residence-of-el-venizelos",
      "name": "Residence of EL. Venizelos",
      "nameEl": "ΟΙΚΙΑ ΒΕΝΙΖΕΛΟΥ",
      "lat": 35.51827608434553,
      "lng": 24.03807312572556
    },
    "cha-proxeneio": {
      "slug": "cha-proxeneio",
      "name": "Proxeneio",
      "nameEl": "ΠΡΟΞΕΝΕΙΟ",
      "lat": 35.5182127,
      "lng": 24.0360858
    },
    "cha-chonoloulou-2": {
      "slug": "cha-chonoloulou-2",
      "name": "Chonoloulou",
      "nameEl": "ΧΟΝΟΛΟΥΛΟΥ",
      "lat": 35.5172341,
      "lng": 24.0334023
    },
    "cha-hotel-akrotiri": {
      "slug": "cha-hotel-akrotiri",
      "name": "Hotel Akrotiri",
      "nameEl": "ΞΕΝΟΔΟΧΕΙΟ ΑΚΡΩΤΗΡΙ",
      "lat": 35.5192662,
      "lng": 24.0518604
    },
    "cha-ts-plateia-machis-kritis": {
      "slug": "cha-ts-plateia-machis-kritis",
      "name": "Ts_plateia Machis Kritis",
      "nameEl": "ΤΣ ΠΛΑΤΕΙΑ ΜΑΧΗΣ ΚΡΗΤΗΣ",
      "lat": 35.5135644,
      "lng": 24.0196215
    },
    "cha-apokoronou": {
      "slug": "cha-apokoronou",
      "name": "Apokoronou",
      "nameEl": "ΑΠΟΚΟΡΩΝΟΥ",
      "lat": 35.5121901637819,
      "lng": 24.0205211766889
    },
    "cha-paparrigopoulou": {
      "slug": "cha-paparrigopoulou",
      "name": "Paparrigopoulou",
      "nameEl": "ΠΑΠΑΡΡΗΓΟΠΟΥΛΟΥ",
      "lat": 35.5091722,
      "lng": 24.022973
    },
    "cha-kritovoulidou": {
      "slug": "cha-kritovoulidou",
      "name": "Kritovoulidou",
      "nameEl": "ΚΡΙΤΟΒΟΥΛΙΔΟΥ",
      "lat": 35.50783390731713,
      "lng": 24.02613723572083
    },
    "cha-naos-petrou-kai-pavlou": {
      "slug": "cha-naos-petrou-kai-pavlou",
      "name": "Naos Petrou KAI Pavlou",
      "nameEl": "ΝΑΟΣ ΠΕΤΡΟΥ ΚΑΙ ΠΑΥΛΟΥ",
      "lat": 35.50761213629074,
      "lng": 24.03101177996584
    },
    "cha-dexameni": {
      "slug": "cha-dexameni",
      "name": "Dexameni",
      "nameEl": "ΔΕΞΑΜΕΝΗ",
      "lat": 35.507045600619676,
      "lng": 24.034845918385315
    },
    "cha-parko-ag-ioannou": {
      "slug": "cha-parko-ag-ioannou",
      "name": "Parko AG. Ioannou",
      "nameEl": "ΠΑΡΚΟ ΑΓ. ΙΩΑΝΝΟΥ",
      "lat": 35.506784632884056,
      "lng": 24.036842823048225
    },
    "cha-volani": {
      "slug": "cha-volani",
      "name": "Volani",
      "nameEl": "ΒΟΛΑΝΗ",
      "lat": 35.50697781782464,
      "lng": 24.03940970059434
    },
    "cha-terma-makedonomachon": {
      "slug": "cha-terma-makedonomachon",
      "name": "Terma Makedonomachon",
      "nameEl": "ΤΕΡΜΑ ΜΑΚΕΔΟΝΟΜΑΧΩΝ",
      "lat": 35.5070849,
      "lng": 24.0421254
    },
    "cha-kontekaki": {
      "slug": "cha-kontekaki",
      "name": "Kontekaki",
      "nameEl": "ΚΟΝΤΕΚΑΚΗ",
      "lat": 35.507616513466935,
      "lng": 24.040852771897114
    },
    "cha-k-gerakaki": {
      "slug": "cha-k-gerakaki",
      "name": "K. Gerakaki",
      "nameEl": "Κ. ΓΕΡΑΚΑΚΗ",
      "lat": 35.50769840727109,
      "lng": 24.03795326130753
    },
    "cha-parko-ag-ioanni": {
      "slug": "cha-parko-ag-ioanni",
      "name": "Parko AG. Ioanni",
      "nameEl": "ΠΑΡΚΟ ΑΓ. ΙΩΑΝΝΗ",
      "lat": 35.5069549412988,
      "lng": 24.0365477800567
    },
    "cha-prevantorio": {
      "slug": "cha-prevantorio",
      "name": "Prevantorio",
      "nameEl": "ΠΡΕΒΑΝΤΟΡΙΟ",
      "lat": 35.5055374,
      "lng": 24.0346199
    },
    "cha-ag-ioannis": {
      "slug": "cha-ag-ioannis",
      "name": "AG. Ioannis",
      "nameEl": "ΑΓ. ΙΩΑΝΝΗΣ",
      "lat": 35.50665589796308,
      "lng": 24.031071947815704
    },
    "cha-xanthoudidou": {
      "slug": "cha-xanthoudidou",
      "name": "Xanthoudidou",
      "nameEl": "ΞΑΝΘΟΥΔΙΔΟΥ",
      "lat": 35.5067972318012,
      "lng": 24.027996483467113
    },
    "cha-terma-malinou": {
      "slug": "cha-terma-malinou",
      "name": "Terma Malinou",
      "nameEl": "ΤΕΡΜΑ ΜΑΛΙΝΟΥ",
      "lat": 35.5068523,
      "lng": 24.025347
    },
    "cha-apteron": {
      "slug": "cha-apteron",
      "name": "Apteron",
      "nameEl": "ΑΠΤΕΡΩΝ",
      "lat": 35.50730821335214,
      "lng": 24.024486410637678
    },
    "cha-police-department-2": {
      "slug": "cha-police-department-2",
      "name": "Police Department",
      "nameEl": "ΑΣΤΥΝΟΜΙΚΟ ΜΕΓΑΡΟ",
      "lat": 35.50563235855373,
      "lng": 24.025444752114854
    },
    "cha-agios-stefanos-2": {
      "slug": "cha-agios-stefanos-2",
      "name": "Agios Stefanos",
      "nameEl": "ΑΓΙΟΣ ΣΤΕΦΑΝΟΣ",
      "lat": 35.50243723910393,
      "lng": 24.02740269497078
    },
    "cha-kalykas": {
      "slug": "cha-kalykas",
      "name": "Kalykas",
      "nameEl": "ΚΑΛΥΚΑΣ",
      "lat": 35.5003978,
      "lng": 24.0294823
    },
    "cha-ika": {
      "slug": "cha-ika",
      "name": "IKA",
      "nameEl": "ΙΚΑ",
      "lat": 35.4986489,
      "lng": 24.0318955
    },
    "cha-kamini": {
      "slug": "cha-kamini",
      "name": "Kamini",
      "nameEl": "KAMINI",
      "lat": 35.497119695818206,
      "lng": 24.037711565814988
    },
    "cha-grafeia-anek": {
      "slug": "cha-grafeia-anek",
      "name": "Grafeia Anek",
      "nameEl": "ΓΡΑΦΕΙΑ ΑΝΕΚ",
      "lat": 35.49608681267652,
      "lng": 24.040417865745543
    },
    "cha-agrokipio": {
      "slug": "cha-agrokipio",
      "name": "Agrokipio",
      "nameEl": "ΑΓΡΟΚΗΠΙΟ",
      "lat": 35.49389741342313,
      "lng": 24.043919641594712
    },
    "cha-maich": {
      "slug": "cha-maich",
      "name": "MAICh",
      "nameEl": "ΜΑΙΧ",
      "lat": 35.491605517530225,
      "lng": 24.048031197344976
    },
    "cha-maich-2": {
      "slug": "cha-maich-2",
      "name": "MAICh",
      "nameEl": "MAIX",
      "lat": 35.4911873,
      "lng": 24.0494112
    },
    "cha-tsikalaria": {
      "slug": "cha-tsikalaria",
      "name": "Tsikalaria",
      "nameEl": "ΤΣΙΚΑΛΑΡΙΑ",
      "lat": 35.48989963036003,
      "lng": 24.053956899475118
    },
    "cha-tsikalaria-2": {
      "slug": "cha-tsikalaria-2",
      "name": "Tsikalaria",
      "nameEl": "ΤΣΙΚΑΛΑΡΙΑ",
      "lat": 35.4902086,
      "lng": 24.0530517
    },
    "cha-kokkinos-pyrgos": {
      "slug": "cha-kokkinos-pyrgos",
      "name": "Kokkinos Pyrgos",
      "nameEl": "ΚΟΚΚΙΝΟΣ ΠΥΡΓΟΣ",
      "lat": 35.4890894,
      "lng": 24.056973
    },
    "cha-kokkinos-pyrgos-2": {
      "slug": "cha-kokkinos-pyrgos-2",
      "name": "Kokkinos Pyrgos",
      "nameEl": "ΚΟΚΚΙΝΟΣ ΠΥΡΓΟΣ",
      "lat": 35.4891986,
      "lng": 24.0569207
    },
    "cha-avra": {
      "slug": "cha-avra",
      "name": "Avra",
      "nameEl": "ΑΥΡΑ",
      "lat": 35.48846207215499,
      "lng": 24.058940619435116
    },
    "cha-avra-2": {
      "slug": "cha-avra-2",
      "name": "Avra",
      "nameEl": "ΑΥΡΑ",
      "lat": 35.48826656242665,
      "lng": 24.059668968876675
    },
    "cha-kato-souda": {
      "slug": "cha-kato-souda",
      "name": "Kato Souda",
      "nameEl": "ΚΑΤΩ ΣΟΥΔΑ",
      "lat": 35.48921665530156,
      "lng": 24.06120953369367
    },
    "cha-maridaki": {
      "slug": "cha-maridaki",
      "name": "Maridaki",
      "nameEl": "ΜΑΡΙΔΑΚΗ",
      "lat": 35.489474552507254,
      "lng": 24.063259834918227
    },
    "cha-maridaki-2": {
      "slug": "cha-maridaki-2",
      "name": "Maridaki",
      "nameEl": "ΜΑΡΙΔΑΚΗ",
      "lat": 35.488639251243804,
      "lng": 24.063340317127242
    },
    "cha-soudas-schools": {
      "slug": "cha-soudas-schools",
      "name": "Soudas Schools",
      "nameEl": "ΣΧΟΛΕΙΑ ΣΟΥΔΑΣ",
      "lat": 35.4888423,
      "lng": 24.0674479
    },
    "cha-myloi": {
      "slug": "cha-myloi",
      "name": "Myloi",
      "nameEl": "ΜΥΛΟΙ",
      "lat": 35.4887469516713,
      "lng": 24.0710883873867
    },
    "cha-myloi-2": {
      "slug": "cha-myloi-2",
      "name": "Myloi",
      "nameEl": "ΜΥΛΟΙ",
      "lat": 35.4888966,
      "lng": 24.0710562
    },
    "cha-agios-nikolaos": {
      "slug": "cha-agios-nikolaos",
      "name": "Agios Nikolaos",
      "nameEl": "ΑΓΙΟΣ ΝΙΚΟΛΑΟΣ",
      "lat": 35.4881779449269,
      "lng": 24.0709578236744
    },
    "cha-soudas-square": {
      "slug": "cha-soudas-square",
      "name": "Soudas Square",
      "nameEl": "ΠΛΑΤΕΙΑ ΣΟΥΔΑΣ",
      "lat": 35.48752424178995,
      "lng": 24.075273623789467
    },
    "cha-gipedo-nafstathmou": {
      "slug": "cha-gipedo-nafstathmou",
      "name": "Gipedo Nafstathmou",
      "nameEl": "ΓΗΠΕΔΟ ΝΑΥΣΤΑΘΜΟΥ",
      "lat": 35.48613309795589,
      "lng": 24.08191703356705
    },
    "cha-crete-naval-hospital": {
      "slug": "cha-crete-naval-hospital",
      "name": "Crete Naval Hospital",
      "nameEl": "ΝΑΥΤΙΚΟ ΝΟΣΟΚΟΜΕΙΟ ΚΡΗΤΗΣ",
      "lat": 35.4847548,
      "lng": 24.0881728
    },
    "cha-leschi-axiomatikon": {
      "slug": "cha-leschi-axiomatikon",
      "name": "Leschi Axiomatikon",
      "nameEl": "ΛΕΣΧΗ ΑΞΙΩΜΑΤΙΚΩΝ",
      "lat": 35.4854598,
      "lng": 24.0863041
    },
    "cha-junction-tsikalarion": {
      "slug": "cha-junction-tsikalarion",
      "name": "Junction Tsikalarion",
      "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΤΣΙΚΑΛΑΡΙΩΝ",
      "lat": 35.4898124143471,
      "lng": 24.0532037304551
    },
    "cha-junction-tsikalarion-2": {
      "slug": "cha-junction-tsikalarion-2",
      "name": "Junction Tsikalarion",
      "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΤΣΙΚΑΛΑΡΙΩΝ",
      "lat": 35.48918233873744,
      "lng": 24.05344248039131
    },
    "cha-tsikalarion": {
      "slug": "cha-tsikalarion",
      "name": "Tsikalarion",
      "nameEl": "ΤΣΙΚΑΛΑΡΙΩΝ",
      "lat": 35.4852771,
      "lng": 24.054637
    },
    "cha-tsikalarion-2": {
      "slug": "cha-tsikalarion-2",
      "name": "Tsikalarion",
      "nameEl": "ΤΣΙΚΑΛΑΡΙΩΝ",
      "lat": 35.4856112,
      "lng": 24.0546061
    },
    "cha-nikolaou-skoula-2": {
      "slug": "cha-nikolaou-skoula-2",
      "name": "Nikolaou Skoula",
      "nameEl": "ΝΙΚΟΛΑΟΥ ΣΚΟΥΛΑ",
      "lat": 35.4822955,
      "lng": 24.0557113
    },
    "cha-nikolaou-skoula-3": {
      "slug": "cha-nikolaou-skoula-3",
      "name": "Nikolaou Skoula",
      "nameEl": "ΝΙΚΟΛΑΟΥ ΣΚΟΥΛΑ",
      "lat": 35.482468,
      "lng": 24.0557341
    },
    "cha-k-karyotaki": {
      "slug": "cha-k-karyotaki",
      "name": "K. Karyotaki",
      "nameEl": "Κ. ΚΑΡΥΩΤΑΚΗ",
      "lat": 35.4789774,
      "lng": 24.054337
    },
    "cha-ch-giannari": {
      "slug": "cha-ch-giannari",
      "name": "Ch. Giannari",
      "nameEl": "Χ. ΓΙΑΝΝΑΡΗ",
      "lat": 35.47708182382139,
      "lng": 24.055355615413593
    },
    "cha-primary-school": {
      "slug": "cha-primary-school",
      "name": "Primary School",
      "nameEl": "ΔΗΜΟΤΙΚΟ ΣΧΟΛΕΙΟ",
      "lat": 35.4770347,
      "lng": 24.0584634
    },
    "cha-parallilos-ethniki-odou": {
      "slug": "cha-parallilos-ethniki-odou",
      "name": "Parallilos Ethniki Odou",
      "nameEl": "ΠΑΡΑΛΛΗΛΟΣ ΕΘΝΙΚΗ ΟΔΟΥ",
      "lat": 35.4802753,
      "lng": 24.0570628
    },
    "cha-makedonias": {
      "slug": "cha-makedonias",
      "name": "Makedonias",
      "nameEl": "ΜΑΚΕΔΟΝΙΑΣ",
      "lat": 35.49662642842577,
      "lng": 24.04687929180902
    },
    "cha-makedonias-2": {
      "slug": "cha-makedonias-2",
      "name": "Makedonias",
      "nameEl": "ΜΑΚΕΔΟΝΙΑΣ",
      "lat": 35.4960674,
      "lng": 24.0468592
    },
    "cha-sofokli-venizelou-2": {
      "slug": "cha-sofokli-venizelou-2",
      "name": "Sofokli Venizelou",
      "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ",
      "lat": 35.4980078688481,
      "lng": 24.045890817825715
    },
    "cha-sofokli-venizelou-3": {
      "slug": "cha-sofokli-venizelou-3",
      "name": "Sofokli Venizelou",
      "nameEl": "ΣΟΦΟΚΛΗ ΒΕΝΙΖΕΛΟΥ",
      "lat": 35.4981881,
      "lng": 24.0455475
    },
    "cha-pefkakia": {
      "slug": "cha-pefkakia",
      "name": "Pefkakia",
      "nameEl": "ΠΕΥΚΑΚΙΑ",
      "lat": 35.50333941126739,
      "lng": 24.03869197811813
    },
    "cha-pefkakia-2": {
      "slug": "cha-pefkakia-2",
      "name": "Pefkakia",
      "nameEl": "ΠΕΥΚΑΚΙΑ",
      "lat": 35.503219632388394,
      "lng": 24.038806609004393
    },
    "cha-chatzisavva-square": {
      "slug": "cha-chatzisavva-square",
      "name": "Chatzisavva Square",
      "nameEl": "ΠΛΑΤΕΙΑ ΧΑΤΖΗΣΑΒΒΑ",
      "lat": 35.50392117678801,
      "lng": 24.034915210485455
    },
    "cha-chatzisavva-square-2": {
      "slug": "cha-chatzisavva-square-2",
      "name": "Chatzisavva Square",
      "nameEl": "ΠΛΑΤΕΙΑ ΧΑΤΖΗΣΑΒΒΑ",
      "lat": 35.5039103016994,
      "lng": 24.0345503865171
    },
    "cha-agrokipio-2": {
      "slug": "cha-agrokipio-2",
      "name": "Agrokipio",
      "nameEl": "ΑΓΡΟΚΗΠΙΟ",
      "lat": 35.49384466204997,
      "lng": 24.04420345092623
    },
    "cha-grafeia-anek-2": {
      "slug": "cha-grafeia-anek-2",
      "name": "Grafeia Anek",
      "nameEl": "ΓΡΑΦΕΙΑ ΑΝΕΚ",
      "lat": 35.4963821,
      "lng": 24.0399897
    },
    "cha-kamini-2": {
      "slug": "cha-kamini-2",
      "name": "Kamini",
      "nameEl": "ΚΑΜΙΝΙ",
      "lat": 35.4975622,
      "lng": 24.0364683
    },
    "cha-ika-2": {
      "slug": "cha-ika-2",
      "name": "IKA",
      "nameEl": "ΙΚΑ",
      "lat": 35.4986304,
      "lng": 24.0321856
    },
    "cha-kalykas-2": {
      "slug": "cha-kalykas-2",
      "name": "Kalykas",
      "nameEl": "ΚΑΛΥΚΑΣ",
      "lat": 35.50088700897072,
      "lng": 24.029124035512524
    },
    "cha-maich-kege": {
      "slug": "cha-maich-kege",
      "name": "MAICh - Kege",
      "nameEl": "ΜΑΙΧ - ΚΕΓΕ",
      "lat": 35.4927851297046,
      "lng": 24.0483289001222
    },
    "cha-technical-university-of-crete": {
      "slug": "cha-technical-university-of-crete",
      "name": "Technical University OF Crete",
      "nameEl": "ΠΟΛΥΤΕΧΝΕΙΟ",
      "lat": 35.5262476,
      "lng": 24.0721091
    },
    "cha-technical-university-of-crete-2": {
      "slug": "cha-technical-university-of-crete-2",
      "name": "Technical University OF Crete",
      "nameEl": "ΠΟΛΥΤΕΧΝΕΙΟ",
      "lat": 35.5263862,
      "lng": 24.0713983
    },
    "cha-markou-botsari-2": {
      "slug": "cha-markou-botsari-2",
      "name": "Markou Botsari",
      "nameEl": "ΜΑΡΚΟΥ ΜΠΟΤΣΑΡΗ",
      "lat": 35.5278356533631,
      "lng": 24.0735776192586
    },
    "cha-markou-botsari-3": {
      "slug": "cha-markou-botsari-3",
      "name": "Markou Botsari",
      "nameEl": "ΜΑΡΚΟΥ ΜΠΟΤΣΑΡΗ",
      "lat": 35.5278073,
      "lng": 24.073418
    },
    "cha-kounoupidianon-square": {
      "slug": "cha-kounoupidianon-square",
      "name": "Kounoupidianon Square",
      "nameEl": "ΠΛΑΤΕΙΑ ΚΟΥΝΟΥΠΙΔΙΑΝΩΝ",
      "lat": 35.53139362070831,
      "lng": 24.07599840015915
    },
    "cha-omirou": {
      "slug": "cha-omirou",
      "name": "Omirou",
      "nameEl": "ΟΜΗΡΟΥ",
      "lat": 35.5297653,
      "lng": 24.0782971
    },
    "cha-parodos-akrotiriou": {
      "slug": "cha-parodos-akrotiriou",
      "name": "Parodos Akrotiriou",
      "nameEl": "ΠΑΡΟΔΟΣ ΑΚΡΩΤΗΡΙΟΥ",
      "lat": 35.5323702,
      "lng": 24.0828056
    },
    "cha-athinas-tzougkaris": {
      "slug": "cha-athinas-tzougkaris",
      "name": "Athinas Tzougkaris",
      "nameEl": "ΑΘΗΝΑΣ ΤΖΟΥΓΚΑΡΗΣ",
      "lat": 35.5345177060068,
      "lng": 24.0850281682946
    },
    "cha-plakoures": {
      "slug": "cha-plakoures",
      "name": "Plakoures",
      "nameEl": "ΠΛΑΚΟΥΡΕΣ",
      "lat": 35.5357498,
      "lng": 24.0868507
    },
    "cha-kampani": {
      "slug": "cha-kampani",
      "name": "Kampani",
      "nameEl": "ΚΑΜΠΑΝΙ",
      "lat": 35.5393522,
      "lng": 24.0912135
    },
    "cha-filias-ton-laon": {
      "slug": "cha-filias-ton-laon",
      "name": "Filias TON Laon",
      "nameEl": "ΦΙΛΙΑΣ ΤΩΝ ΛΑΩΝ",
      "lat": 35.5358771,
      "lng": 24.0810891
    },
    "cha-primary-school-kounoupidianon": {
      "slug": "cha-primary-school-kounoupidianon",
      "name": "Primary School Kounoupidianon",
      "nameEl": "ΔΗΜΟΤΙΚΟ ΣΧΟΛΕΙΟ ΚΟΥΝΟΥΠΙΔΙΑΝΩΝ",
      "lat": 35.535935654839,
      "lng": 24.078505410826097
    },
    "cha-ikarou-2": {
      "slug": "cha-ikarou-2",
      "name": "Ikarou",
      "nameEl": "ΙΚΑΡΟΥ",
      "lat": 35.5346624904821,
      "lng": 24.07702021534422
    },
    "cha-agion-panton": {
      "slug": "cha-agion-panton",
      "name": "Agion Panton",
      "nameEl": "ΑΓΙΩΝ ΠΑΝΤΩΝ",
      "lat": 35.5325831,
      "lng": 24.0765254
    },
    "cha-kounoupidianon-square-2": {
      "slug": "cha-kounoupidianon-square-2",
      "name": "Kounoupidianon Square",
      "nameEl": "ΠΛΑΤΕΙΑ ΚΟΥΝΟΥΠΙΔΙΑΝΩΝ",
      "lat": 35.5312224,
      "lng": 24.0756362
    },
    "cha-knosou": {
      "slug": "cha-knosou",
      "name": "Knosou",
      "nameEl": "ΚΝΩΣΟΥ",
      "lat": 35.5356273035092,
      "lng": 24.0746005398431
    },
    "cha-knosou-2": {
      "slug": "cha-knosou-2",
      "name": "Knosou",
      "nameEl": "ΚΝΩΣΟΥ",
      "lat": 35.5356556780717,
      "lng": 24.0744422895112
    },
    "cha-n-kazantzaki": {
      "slug": "cha-n-kazantzaki",
      "name": "N. Kazantzaki",
      "nameEl": "Ν. ΚΑΖΑΝΤΖΑΚΗ",
      "lat": 35.5402551,
      "lng": 24.072695
    },
    "cha-k-manou": {
      "slug": "cha-k-manou",
      "name": "K. Manou",
      "nameEl": "Κ. ΜΑΝΟΥ",
      "lat": 35.5473827,
      "lng": 24.0624471
    },
    "cha-aristotelous": {
      "slug": "cha-aristotelous",
      "name": "Aristotelous",
      "nameEl": "ΑΡΙΣΤΟΤΕΛΟΥΣ",
      "lat": 35.5292236,
      "lng": 24.076861
    },
    "cha-evangelistrias-2": {
      "slug": "cha-evangelistrias-2",
      "name": "Evangelistrias",
      "nameEl": "ΕΥΑΓΓΕΛΙΣΤΡΙΑΣ",
      "lat": 35.5267109,
      "lng": 24.0779629
    },
    "cha-timiou-prodromou": {
      "slug": "cha-timiou-prodromou",
      "name": "Timiou Prodromou",
      "nameEl": "ΤΙΜΙΟΥ ΠΡΟΔΡΟΜΟΥ",
      "lat": 35.5247300241579,
      "lng": 24.078679193779003
    },
    "cha-olympion": {
      "slug": "cha-olympion",
      "name": "Olympion",
      "nameEl": "ΟΛΥΜΠΙΟΝ",
      "lat": 35.519474507463,
      "lng": 24.0827032283931
    },
    "cha-pithari": {
      "slug": "cha-pithari",
      "name": "Pithari",
      "nameEl": "ΠΙΘΑΡΙ",
      "lat": 35.5182017376786,
      "lng": 24.0844309798318
    },
    "cha-national-bank": {
      "slug": "cha-national-bank",
      "name": "National Bank",
      "nameEl": "ΕΘΝΙΚΗ ΤΡΑΠΕΖΑ",
      "lat": 35.5138225522767,
      "lng": 24.0209705073591
    },
    "cha-pyrgos": {
      "slug": "cha-pyrgos",
      "name": "Pyrgos",
      "nameEl": "ΠΥΡΓΟΣ",
      "lat": 35.5143894,
      "lng": 24.0453314
    },
    "cha-plastira-2": {
      "slug": "cha-plastira-2",
      "name": "Plastira",
      "nameEl": "ΠΛΑΣΤΗΡΑ",
      "lat": 35.504168002180315,
      "lng": 24.017450510520195
    },
    "cha-kilikias": {
      "slug": "cha-kilikias",
      "name": "Kilikias",
      "nameEl": "ΚΙΛΙΚΙΑΣ",
      "lat": 35.504014,
      "lng": 24.0146087
    },
    "cha-eleftherias": {
      "slug": "cha-eleftherias",
      "name": "Eleftherias",
      "nameEl": "ΕΛΕΥΘΕΡΙΑΣ",
      "lat": 35.50293422142972,
      "lng": 24.01315985947374
    },
    "cha-pasakaki": {
      "slug": "cha-pasakaki",
      "name": "Pasakaki",
      "nameEl": "ΠΑΣΑΚΑΚΙ",
      "lat": 35.5000934,
      "lng": 24.0118621
    },
    "cha-ag-vasileiou": {
      "slug": "cha-ag-vasileiou",
      "name": "AG. Vasileiou",
      "nameEl": "ΑΓ. ΒΑΣΙΛΕΙΟΥ",
      "lat": 35.4987539,
      "lng": 24.0105543
    },
    "cha-charakias": {
      "slug": "cha-charakias",
      "name": "Charakias",
      "nameEl": "ΧΑΡΑΚΙΑΣ",
      "lat": 35.49723278523448,
      "lng": 24.009053310450746
    },
    "cha-oasi": {
      "slug": "cha-oasi",
      "name": "Oasi",
      "nameEl": "ΟΑΣΗ",
      "lat": 35.4938476255155,
      "lng": 24.0073752942412
    },
    "cha-gipedo-perivolion": {
      "slug": "cha-gipedo-perivolion",
      "name": "Gipedo Perivolion",
      "nameEl": "ΓΗΠΕΔΟ ΠΕΡΙΒΟΛΙΩΝ",
      "lat": 35.48710828642704,
      "lng": 23.99953915277861
    },
    "cha-gkariana": {
      "slug": "cha-gkariana",
      "name": "Gkariana",
      "nameEl": "ΓΚΑΡΙΑΝΑ",
      "lat": 35.48446494309446,
      "lng": 23.998577403041082
    },
    "cha-profiti-ilia": {
      "slug": "cha-profiti-ilia",
      "name": "Profiti Ilia",
      "nameEl": "ΠΡΟΦΗΤΗ ΗΛΙΑ",
      "lat": 35.4835421,
      "lng": 23.9980684
    },
    "cha-orfanidi": {
      "slug": "cha-orfanidi",
      "name": "Orfanidi",
      "nameEl": "ΟΡΦΑΝΙΔΗ",
      "lat": 35.4832855,
      "lng": 23.9965826
    },
    "cha-pente-dromoi": {
      "slug": "cha-pente-dromoi",
      "name": "Pente Dromoi",
      "nameEl": "ΠΕΝΤΕ ΔΡΟΜΟΙ",
      "lat": 35.48178610473912,
      "lng": 23.99463511911849
    },
    "cha-war-heroes-1941": {
      "slug": "cha-war-heroes-1941",
      "name": "WAR Heroes 1941",
      "nameEl": "ΗΡΩΩΝ ΠΟΛΕΜΟΥ 1941",
      "lat": 35.4822338,
      "lng": 23.993121
    },
    "cha-agios-ioannis": {
      "slug": "cha-agios-ioannis",
      "name": "Agios Ioannis",
      "nameEl": "ΑΓΙΟΣ ΙΩΑΝΝΗΣ",
      "lat": 35.4829371,
      "lng": 23.9914366
    },
    "cha-pyrgos-2": {
      "slug": "cha-pyrgos-2",
      "name": "Pyrgos",
      "nameEl": "ΠΥΡΓΟΣ",
      "lat": 35.4840977,
      "lng": 23.987988
    },
    "cha-ionias": {
      "slug": "cha-ionias",
      "name": "Ionias",
      "nameEl": "ΙΩΝΙΑΣ",
      "lat": 35.485749771934515,
      "lng": 23.988603840319623
    },
    "cha-petrou-kai-pavlou": {
      "slug": "cha-petrou-kai-pavlou",
      "name": "Petrou KAI Pavlou",
      "nameEl": "ΠΕΤΡΟΥ ΚΑΙ ΠΑΥΛΟΥ",
      "lat": 35.48673370047058,
      "lng": 23.988953819014327
    },
    "cha-kastrochori": {
      "slug": "cha-kastrochori",
      "name": "Kastrochori",
      "nameEl": "ΚΑΣΤΡΟΧΩΡΙ",
      "lat": 35.4879662,
      "lng": 23.9925992
    },
    "cha-poulaka": {
      "slug": "cha-poulaka",
      "name": "Poulaka",
      "nameEl": "ΠΟΥΛΑΚΑ",
      "lat": 35.49031258144352,
      "lng": 23.993951161238122
    },
    "cha-menekleri": {
      "slug": "cha-menekleri",
      "name": "Menekleri",
      "nameEl": "ΜΕΝΕΚΛΕΡΙ",
      "lat": 35.491954162029494,
      "lng": 23.995856207409652
    },
    "cha-parallilos-ethnikis-odou": {
      "slug": "cha-parallilos-ethnikis-odou",
      "name": "Parallilos Ethnikis Odou",
      "nameEl": "ΠΑΡΑΛΛΗΛΟΣ ΕΘΝΙΚΗΣ ΟΔΟΥ",
      "lat": 35.4942095,
      "lng": 23.9983509
    },
    "cha-k-manoy": {
      "slug": "cha-k-manoy",
      "name": "K. Manoy",
      "nameEl": "K. MANOY",
      "lat": 35.4959153,
      "lng": 24.0003033
    },
    "cha-giampoudaki": {
      "slug": "cha-giampoudaki",
      "name": "Giampoudaki",
      "nameEl": "ΓΙΑΜΠΟΥΔΑΚΗ",
      "lat": 35.497615293783824,
      "lng": 24.00192189215066
    },
    "cha-lachanagora": {
      "slug": "cha-lachanagora",
      "name": "Lachanagora",
      "nameEl": "ΛΑΧΑΝΑΓΟΡΑ",
      "lat": 35.50008360457714,
      "lng": 24.00423545648345
    },
    "cha-osias-eirinis": {
      "slug": "cha-osias-eirinis",
      "name": "Osias Eirinis",
      "nameEl": "ΟΣΙΑΣ ΕΙΡΗΝΗΣ",
      "lat": 35.5029301,
      "lng": 24.005741
    },
    "cha-atlas": {
      "slug": "cha-atlas",
      "name": "Atlas",
      "nameEl": "ΑΤΛΑΣ",
      "lat": 35.5041289,
      "lng": 24.0071223
    },
    "cha-foteinakis": {
      "slug": "cha-foteinakis",
      "name": "Foteinakis",
      "nameEl": "ΦΩΤΕΙΝΑΚΗΣ",
      "lat": 35.50408190110314,
      "lng": 24.011365587696822
    },
    "cha-kilikias-2": {
      "slug": "cha-kilikias-2",
      "name": "Kilikias",
      "nameEl": "ΚΙΛΙΚΙΑΣ",
      "lat": 35.503897,
      "lng": 24.0142778
    },
    "cha-plastira-3": {
      "slug": "cha-plastira-3",
      "name": "Plastira",
      "nameEl": "ΠΛΑΣΤΗΡΑ",
      "lat": 35.504016,
      "lng": 24.016319
    },
    "cha-ts-lentariana": {
      "slug": "cha-ts-lentariana",
      "name": "Ts_lentariana",
      "nameEl": "ΤΣ ΛΕΝΤΑΡΙΑΝΑ",
      "lat": 35.5085785,
      "lng": 24.0506963
    },
    "cha-ergatikes-katoikies-4": {
      "slug": "cha-ergatikes-katoikies-4",
      "name": "Ergatikes Katoikies",
      "nameEl": "ΕΡΓΑΤΙΚΕΣ ΚΑΤΟΙΚΙΕΣ",
      "lat": 35.5086586,
      "lng": 24.0489187
    },
    "cha-kanteridon": {
      "slug": "cha-kanteridon",
      "name": "Kanteridon",
      "nameEl": "ΚΑΝΤΕΡΗΔΩΝ",
      "lat": 35.50661438038577,
      "lng": 24.049747469311523
    },
    "cha-proimou": {
      "slug": "cha-proimou",
      "name": "Proimou",
      "nameEl": "ΠΡΩΙΜΟΥ",
      "lat": 35.50749711932552,
      "lng": 24.048084173610672
    },
    "cha-doxogianni": {
      "slug": "cha-doxogianni",
      "name": "Doxogianni",
      "nameEl": "ΔΟΞΟΓΙΑΝΝΗ",
      "lat": 35.508446754213004,
      "lng": 24.04600473981172
    },
    "cha-gerogianni": {
      "slug": "cha-gerogianni",
      "name": "Gerogianni",
      "nameEl": "ΓΕΡΟΓΙΑΝΝΗ",
      "lat": 35.5092455,
      "lng": 24.0446773
    },
    "cha-vryson": {
      "slug": "cha-vryson",
      "name": "Vryson",
      "nameEl": "ΒΡΥΣΩΝ",
      "lat": 35.5099671,
      "lng": 24.042801
    },
    "cha-ag-charalampos": {
      "slug": "cha-ag-charalampos",
      "name": "AG. Charalampos",
      "nameEl": "ΑΓ. ΧΑΡΑΛΑΜΠΟΣ",
      "lat": 35.5098077,
      "lng": 24.0403304
    },
    "cha-vlastou": {
      "slug": "cha-vlastou",
      "name": "Vlastou",
      "nameEl": "ΒΛΑΣΤΟΥ",
      "lat": 35.5100347,
      "lng": 24.0375798
    },
    "cha-ag-anna": {
      "slug": "cha-ag-anna",
      "name": "AG. Anna",
      "nameEl": "ΑΓ. ΑΝΝΑ",
      "lat": 35.51068426888328,
      "lng": 24.035700873016367
    },
    "cha-tsontou-varda": {
      "slug": "cha-tsontou-varda",
      "name": "Tsontou Varda",
      "nameEl": "ΤΣΟΝΤΟΥ ΒΑΡΔΑ",
      "lat": 35.5111777,
      "lng": 24.0333768
    },
    "cha-skalidi": {
      "slug": "cha-skalidi",
      "name": "Skalidi",
      "nameEl": "ΣΚΑΛΙΔΗ",
      "lat": 35.5133815,
      "lng": 24.0157197
    },
    "cha-eikonostasi": {
      "slug": "cha-eikonostasi",
      "name": "Eikonostasi",
      "nameEl": "ΕΙΚΟΝΟΣΤΑΣΙ",
      "lat": 35.5118711,
      "lng": 24.0119835
    },
    "cha-ag-nektariou": {
      "slug": "cha-ag-nektariou",
      "name": "AG. Nektariou",
      "nameEl": "ΑΓ. ΝΕΚΤΑΡΙΟΥ",
      "lat": 35.5095198,
      "lng": 24.00893
    },
    "cha-varousi": {
      "slug": "cha-varousi",
      "name": "Varousi",
      "nameEl": "ΒΑΡΟΥΣΙ",
      "lat": 35.5078415,
      "lng": 24.0065102
    },
    "cha-georgakakidon": {
      "slug": "cha-georgakakidon",
      "name": "Georgakakidon",
      "nameEl": "ΓΕΩΡΓΑΚΑΚΗΔΩΝ",
      "lat": 35.5093901,
      "lng": 24.0027503
    },
    "cha-kydonias": {
      "slug": "cha-kydonias",
      "name": "Kydonias",
      "nameEl": "ΚΥΔΩΝΙΑΣ",
      "lat": 35.5122801606675,
      "lng": 24.0143849971512
    },
    "cha-ag-anna-2": {
      "slug": "cha-ag-anna-2",
      "name": "AG. Anna",
      "nameEl": "ΑΓ. ΑΝΝΑ",
      "lat": 35.5101614,
      "lng": 24.035253
    },
    "cha-vlastou-2": {
      "slug": "cha-vlastou-2",
      "name": "Vlastou",
      "nameEl": "ΒΛΑΣΤΟΥ",
      "lat": 35.5098961,
      "lng": 24.0381954
    },
    "cha-agios-charalampos": {
      "slug": "cha-agios-charalampos",
      "name": "Agios Charalampos",
      "nameEl": "ΑΓΙΟΣ ΧΑΡΑΛΑΜΠΟΣ",
      "lat": 35.50938298542943,
      "lng": 24.04126113082227
    },
    "cha-kantanoleontos": {
      "slug": "cha-kantanoleontos",
      "name": "Kantanoleontos",
      "nameEl": "ΚΑΝΤΑΝΟΛΕΟΝΤΟΣ",
      "lat": 35.5089877,
      "lng": 24.0422125
    },
    "cha-gerogianni-2": {
      "slug": "cha-gerogianni-2",
      "name": "Gerogianni",
      "nameEl": "ΓΕΡΟΓΙΑΝΝΗ",
      "lat": 35.509103617476676,
      "lng": 24.044697358266454
    },
    "cha-doxogianni-2": {
      "slug": "cha-doxogianni-2",
      "name": "Doxogianni",
      "nameEl": "ΔΟΞΟΓΙΑΝΝΗ",
      "lat": 35.508185840424375,
      "lng": 24.046382928311157
    },
    "cha-proimou-2": {
      "slug": "cha-proimou-2",
      "name": "Proimou",
      "nameEl": "ΠΡΩΙΜΟΥ",
      "lat": 35.50708573847128,
      "lng": 24.048248285913857
    },
    "cha-kanteridon-2": {
      "slug": "cha-kanteridon-2",
      "name": "Kanteridon",
      "nameEl": "ΚΑΝΤΕΡΗΔΩΝ",
      "lat": 35.50611809769988,
      "lng": 24.049957730688472
    },
    "cha-roumeliotaki": {
      "slug": "cha-roumeliotaki",
      "name": "Roumeliotaki",
      "nameEl": "ΡΟΥΜΕΛΙΩΤΑΚΗ",
      "lat": 35.50613113686857,
      "lng": 24.052317240864156
    },
    "cha-georgiou-sgourou": {
      "slug": "cha-georgiou-sgourou",
      "name": "Georgiou Sgourou",
      "nameEl": "ΓΕΩΡΓΙΟΥ ΣΓΟΥΡΟΥ",
      "lat": 35.50718048889194,
      "lng": 24.05316598769685
    },
    "cha-flamingko": {
      "slug": "cha-flamingko",
      "name": "Flamingko",
      "nameEl": "ΦΛΑΜΙΝΓΚΟ",
      "lat": 35.5080691,
      "lng": 24.0519312
    },
    "cha-kladisos": {
      "slug": "cha-kladisos",
      "name": "Kladisos",
      "nameEl": "ΚΛΑΔΙΣΟΣ",
      "lat": 35.505967,
      "lng": 24.0031382
    },
    "cha-kladisos-2": {
      "slug": "cha-kladisos-2",
      "name": "Kladisos",
      "nameEl": "ΚΛΑΔΙΣΟΣ",
      "lat": 35.5059932,
      "lng": 24.0033823
    },
    "cha-tourna": {
      "slug": "cha-tourna",
      "name": "Tourna",
      "nameEl": "ΤΟΥΡΝΑ",
      "lat": 35.503528317737285,
      "lng": 24.001355510346603
    },
    "cha-tourna-2": {
      "slug": "cha-tourna-2",
      "name": "Tourna",
      "nameEl": "ΤΟΥΡΝΑ",
      "lat": 35.5040436,
      "lng": 24.0019845
    },
    "cha-monachi-elia": {
      "slug": "cha-monachi-elia",
      "name": "Monachi Elia",
      "nameEl": "ΜΟΝΑΧΗ ΕΛΙΑ",
      "lat": 35.50073234110333,
      "lng": 23.998265083397694
    },
    "cha-monachi-elia-2": {
      "slug": "cha-monachi-elia-2",
      "name": "Monachi Elia",
      "nameEl": "ΜΟΝΑΧΗ ΕΛΙΑ",
      "lat": 35.50088191557687,
      "lng": 23.998582966201013
    },
    "cha-synka": {
      "slug": "cha-synka",
      "name": "Synka",
      "nameEl": "ΣΥΝΚΑ",
      "lat": 35.49823598839453,
      "lng": 23.995588655923846
    },
    "cha-synka-2": {
      "slug": "cha-synka-2",
      "name": "Synka",
      "nameEl": "ΣΥΝΚΑ",
      "lat": 35.49793903985047,
      "lng": 23.99511655297991
    },
    "cha-national-road-2": {
      "slug": "cha-national-road-2",
      "name": "National Road",
      "nameEl": "ΕΘΝΙΚΗ ΟΔΟΣ",
      "lat": 35.497067,
      "lng": 23.992459
    },
    "cha-national-road-3": {
      "slug": "cha-national-road-3",
      "name": "National Road",
      "nameEl": "ΕΘΝΙΚΗ ΟΔΟΣ",
      "lat": 35.4971522,
      "lng": 23.9927728
    },
    "cha-vamvakopoulo": {
      "slug": "cha-vamvakopoulo",
      "name": "Vamvakopoulo",
      "nameEl": "ΒΑΜΒΑΚΟΠΟΥΛΟ",
      "lat": 35.4953984,
      "lng": 23.9888303
    },
    "cha-vamvakopoulo-2": {
      "slug": "cha-vamvakopoulo-2",
      "name": "Vamvakopoulo",
      "nameEl": "ΒΑΜΒΑΚΟΠΟΥΛΟ",
      "lat": 35.4952641,
      "lng": 23.9886251
    },
    "cha-neas-kydonias": {
      "slug": "cha-neas-kydonias",
      "name": "Neas Kydonias",
      "nameEl": "ΝΕΑΣ ΚΥΔΩΝΙΑΣ",
      "lat": 35.4935906,
      "lng": 23.9831324
    },
    "cha-neas-kydonias-2": {
      "slug": "cha-neas-kydonias-2",
      "name": "Neas Kydonias",
      "nameEl": "ΝΕΑΣ ΚΥΔΩΝΙΑΣ",
      "lat": 35.4937216,
      "lng": 23.9836916
    },
    "cha-ag-antoniou": {
      "slug": "cha-ag-antoniou",
      "name": "AG. Antoniou",
      "nameEl": "ΑΓ. ΑΝΤΩΝΙΟΥ",
      "lat": 35.49156133136022,
      "lng": 23.978366057429138
    },
    "cha-ag-antoniou-2": {
      "slug": "cha-ag-antoniou-2",
      "name": "AG. Antoniou",
      "nameEl": "ΑΓ. ΑΝΤΩΝΙΟΥ",
      "lat": 35.49218699088321,
      "lng": 23.97983463925209
    },
    "cha-vourkia": {
      "slug": "cha-vourkia",
      "name": "Vourkia",
      "nameEl": "ΒΟΥΡΚΙΑ",
      "lat": 35.4911244,
      "lng": 23.9772315
    },
    "cha-vourkia-2": {
      "slug": "cha-vourkia-2",
      "name": "Vourkia",
      "nameEl": "ΒΟΥΡΚΙΑ",
      "lat": 35.4910937963895,
      "lng": 23.9774702017109
    },
    "cha-city-bus-station": {
      "slug": "cha-city-bus-station",
      "name": "City BUS Station",
      "nameEl": "ΣΤΑΘΜΟΣ ΑΣΤΙΚΟΥ ΚΤΕΛ",
      "lat": 35.4892585,
      "lng": 23.9720925
    },
    "cha-city-bus-station-2": {
      "slug": "cha-city-bus-station-2",
      "name": "City BUS Station",
      "nameEl": "ΣΤΑΘΜΟΣ ΑΣΤΙΚΟΥ ΚΤΕΛ",
      "lat": 35.48942116322312,
      "lng": 23.972984329569265
    },
    "cha-ag-konstantinou": {
      "slug": "cha-ag-konstantinou",
      "name": "AG. Konstantinou",
      "nameEl": "ΑΓ. ΚΩΝΣΤΑΝΤΙΝΟΥ",
      "lat": 35.4880639,
      "lng": 23.9694147
    },
    "cha-ag-konstantinou-2": {
      "slug": "cha-ag-konstantinou-2",
      "name": "AG. Konstantinou",
      "nameEl": "ΑΓ. ΚΩΝΣΤΑΝΤΙΝΟΥ",
      "lat": 35.4881164,
      "lng": 23.9697982
    },
    "cha-sykolia": {
      "slug": "cha-sykolia",
      "name": "Sykolia",
      "nameEl": "ΣΥΚΟΛΙA",
      "lat": 35.4872143,
      "lng": 23.9666399
    },
    "cha-sykolia-2": {
      "slug": "cha-sykolia-2",
      "name": "Sykolia",
      "nameEl": "ΣΥΚΟΛΙΑ",
      "lat": 35.4872198,
      "lng": 23.967061
    },
    "cha-junction-galata": {
      "slug": "cha-junction-galata",
      "name": "Junction Galata",
      "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΓΑΛΑΤΑ",
      "lat": 35.4848184,
      "lng": 23.9614485
    },
    "cha-junction-galata-2": {
      "slug": "cha-junction-galata-2",
      "name": "Junction Galata",
      "nameEl": "ΔΙΑΚΛΑΔΩΣΗ ΓΑΛΑΤΑ",
      "lat": 35.4851602,
      "lng": 23.9619877
    },
    "cha-fylakes-agias": {
      "slug": "cha-fylakes-agias",
      "name": "Fylakes Agias",
      "nameEl": "ΦΥΛΑΚΕΣ ΑΓΙΑΣ",
      "lat": 35.4830258,
      "lng": 23.958986
    },
    "cha-fylakes-agias-2": {
      "slug": "cha-fylakes-agias-2",
      "name": "Fylakes Agias",
      "nameEl": "ΦΥΛΑΚΕΣ ΑΓΙΑΣ",
      "lat": 35.4831831,
      "lng": 23.9595734
    },
    "cha-varypetro": {
      "slug": "cha-varypetro",
      "name": "Varypetro",
      "nameEl": "ΒΑΡΥΠΕΤΡΟ",
      "lat": 35.4816054615995,
      "lng": 23.9563385651208
    },
    "cha-varypetro-2": {
      "slug": "cha-varypetro-2",
      "name": "Varypetro",
      "nameEl": "ΒΑΡΥΠΕΤΡΟ",
      "lat": 35.4818369788255,
      "lng": 23.9570788548089
    },
    "cha-ts-oadyk": {
      "slug": "cha-ts-oadyk",
      "name": "Ts_oadyk",
      "nameEl": "ΤΣ ΟΑΔΥΚ",
      "lat": 35.4809555,
      "lng": 23.9526638
    },
    "cha-eikonostasi-2": {
      "slug": "cha-eikonostasi-2",
      "name": "Eikonostasi",
      "nameEl": "ΕΙΚΟΝΟΣΤΑΣΙ",
      "lat": 35.5119674,
      "lng": 24.0123421
    },
    "cha-ag-nektariou-2": {
      "slug": "cha-ag-nektariou-2",
      "name": "AG. Nektariou",
      "nameEl": "ΑΓ. ΝΕΚΤΑΡΙΟΥ",
      "lat": 35.509395,
      "lng": 24.00899
    },
    "cha-varousi-2": {
      "slug": "cha-varousi-2",
      "name": "Varousi",
      "nameEl": "ΒΑΡΟΥΣΙ",
      "lat": 35.5075481709044,
      "lng": 24.0063337823412
    },
    "cha-marmaras": {
      "slug": "cha-marmaras",
      "name": "Marmaras",
      "nameEl": "ΜΑΡΜΑΡΑΣ",
      "lat": 35.479055129183784,
      "lng": 23.96221017238636
    },
    "cha-potistiria": {
      "slug": "cha-potistiria",
      "name": "Potistiria",
      "nameEl": "ΠΟΤΙΣΤΗΡΙΑ",
      "lat": 35.4768383,
      "lng": 23.9706584
    },
    "cha-ligides": {
      "slug": "cha-ligides",
      "name": "Ligides",
      "nameEl": "ΛΙΓΙΔΕΣ",
      "lat": 35.4835691,
      "lng": 23.9697569
    },
    "cha-kladisos-3": {
      "slug": "cha-kladisos-3",
      "name": "Kladisos",
      "nameEl": "ΚΛΑΔΙΣΟΣ",
      "lat": 35.506472,
      "lng": 24.002278
    },
    "cha-kladisos-4": {
      "slug": "cha-kladisos-4",
      "name": "Kladisos",
      "nameEl": "ΚΛΑΔΙΣΟΣ",
      "lat": 35.5063323,
      "lng": 24.0025825
    },
    "cha-parigoria": {
      "slug": "cha-parigoria",
      "name": "Parigoria",
      "nameEl": "ΠΑΡΗΓΟΡΙΑ",
      "lat": 35.5059812,
      "lng": 24.0000229
    },
    "cha-parigoria-2": {
      "slug": "cha-parigoria-2",
      "name": "Parigoria",
      "nameEl": "ΠΑΡΗΓΟΡΙΑ",
      "lat": 35.5057705,
      "lng": 23.9995066
    },
    "cha-hotel-kedrissos": {
      "slug": "cha-hotel-kedrissos",
      "name": "Hotel Kedrissos",
      "nameEl": "ΚΕΔΡΙΣΣΟΣ",
      "lat": 35.50631226324486,
      "lng": 23.99542156141166
    },
    "cha-hotel-kedrissos-2": {
      "slug": "cha-hotel-kedrissos-2",
      "name": "Hotel Kedrissos",
      "nameEl": "ΚΕΔΡΙΣΣΟΣ",
      "lat": 35.5062315,
      "lng": 23.9960331
    },
    "cha-germaniko-pouli": {
      "slug": "cha-germaniko-pouli",
      "name": "Germaniko Pouli",
      "nameEl": "ΓΕΡΜΑΝΙΚΟ ΠΟΥΛΙ",
      "lat": 35.507353762372276,
      "lng": 23.993097810450767
    },
    "cha-germaniko-pouli-2": {
      "slug": "cha-germaniko-pouli-2",
      "name": "Germaniko Pouli",
      "nameEl": "ΓΕΡΜΑΝΙΚΟ ΠΟΥΛΙ",
      "lat": 35.50698097263179,
      "lng": 23.99352959014361
    },
    "cha-triton-hotel-jumbo": {
      "slug": "cha-triton-hotel-jumbo",
      "name": "Triton Hotel - Jumbo",
      "nameEl": "ΤΡΙΤΩΝ - JUMBO",
      "lat": 35.5075511741123,
      "lng": 23.989211935443116
    },
    "cha-triton-hotel": {
      "slug": "cha-triton-hotel",
      "name": "Triton Hotel",
      "nameEl": "ΤΡΙΤΩΝ",
      "lat": 35.507680000516174,
      "lng": 23.990762289618676
    },
    "cha-chrysi-akti-jumbo": {
      "slug": "cha-chrysi-akti-jumbo",
      "name": "Chrysi Akti - Jumbo",
      "nameEl": "ΧΡΥΣΗ ΑΚΤΗ - JUMBO",
      "lat": 35.50713275976095,
      "lng": 23.987397734848805
    },
    "cha-chrysi-akti-jumbo-2": {
      "slug": "cha-chrysi-akti-jumbo-2",
      "name": "Chrysi Akti - Jumbo",
      "nameEl": "ΧΡΥΣΗ ΑΚΤΗ - JUMBO",
      "lat": 35.5071208,
      "lng": 23.9880388
    },
    "cha-makrys-toichos": {
      "slug": "cha-makrys-toichos",
      "name": "Makrys Toichos",
      "nameEl": "ΜΑΚΡΥΣ ΤΟΙΧΟΣ",
      "lat": 35.50687074457663,
      "lng": 23.984156191926562
    },
    "cha-makrys-toichos-2": {
      "slug": "cha-makrys-toichos-2",
      "name": "Makrys Toichos",
      "nameEl": "ΜΑΚΡΥΣ ΤΟΙΧΟΣ",
      "lat": 35.5068883,
      "lng": 23.9849595
    },
    "cha-bmw": {
      "slug": "cha-bmw",
      "name": "BMW",
      "nameEl": "BMW",
      "lat": 35.5074982,
      "lng": 23.9810546
    },
    "cha-bmw-2": {
      "slug": "cha-bmw-2",
      "name": "BMW",
      "nameEl": "BMW",
      "lat": 35.5074971,
      "lng": 23.980439
    },
    "cha-strati-pantelaki": {
      "slug": "cha-strati-pantelaki",
      "name": "Strati Pantelaki",
      "nameEl": "ΣΤΡΑΤΗ ΠΑΝΤΕΛΑΚΗ",
      "lat": 35.50904206532308,
      "lng": 23.977243031317514
    },
    "cha-strati-pantelaki-2": {
      "slug": "cha-strati-pantelaki-2",
      "name": "Strati Pantelaki",
      "nameEl": "ΣΤΡΑΤΗ ΠΑΝΤΕΛΑΚΗ",
      "lat": 35.50875281114338,
      "lng": 23.977575655294796
    },
    "cha-hotel-kalliston": {
      "slug": "cha-hotel-kalliston",
      "name": "Hotel Kalliston",
      "nameEl": "ΚΑΛΛΙΣΤΟΝ",
      "lat": 35.5104872,
      "lng": 23.9737839
    },
    "cha-hotel-kalliston-2": {
      "slug": "cha-hotel-kalliston-2",
      "name": "Hotel Kalliston",
      "nameEl": "ΚΑΛΛΙΣΤΟΝ",
      "lat": 35.51042381694101,
      "lng": 23.974533522753916
    },
    "cha-glaros": {
      "slug": "cha-glaros",
      "name": "Glaros",
      "nameEl": "ΓΛΑΡΟΣ",
      "lat": 35.511525937465436,
      "lng": 23.971481337472525
    },
    "cha-glaros-2": {
      "slug": "cha-glaros-2",
      "name": "Glaros",
      "nameEl": "ΓΛΑΡΟΣ",
      "lat": 35.5110699,
      "lng": 23.9717835
    },
    "cha-kalamaki": {
      "slug": "cha-kalamaki",
      "name": "Kalamaki",
      "nameEl": "ΚΑΛΑΜΑΚΙ",
      "lat": 35.51304868291386,
      "lng": 23.96838935138168
    },
    "cha-kalamaki-2": {
      "slug": "cha-kalamaki-2",
      "name": "Kalamaki",
      "nameEl": "ΚΑΛΑΜΑΚΙ",
      "lat": 35.51299519826641,
      "lng": 23.969026317756285
    },
    "cha-ag-dimitrios": {
      "slug": "cha-ag-dimitrios",
      "name": "AG. Dimitrios",
      "nameEl": "ΑΓ. ΔΗΜΗΤΡΙΟΣ",
      "lat": 35.51230105707115,
      "lng": 23.964424376651777
    },
    "cha-ag-dimitrios-2": {
      "slug": "cha-ag-dimitrios-2",
      "name": "AG. Dimitrios",
      "nameEl": "ΑΓ. ΔΗΜΗΤΡΙΟΣ",
      "lat": 35.5121395,
      "lng": 23.9646027
    },
    "cha-panorama": {
      "slug": "cha-panorama",
      "name": "Panorama",
      "nameEl": "ΠΑΝΟΡΑΜΑ",
      "lat": 35.5126273582984,
      "lng": 23.9620824560653
    },
    "cha-jumbo": {
      "slug": "cha-jumbo",
      "name": "Jumbo",
      "nameEl": "ΤΖΑΜΠΟ",
      "lat": 35.5077255,
      "lng": 23.9881731
    },
    "cha-hotel-anais": {
      "slug": "cha-hotel-anais",
      "name": "Hotel Anais",
      "nameEl": "ΑΝΑΙΣ",
      "lat": 35.50954465531738,
      "lng": 23.988828346302988
    },
    "cha-hotel-anais-2": {
      "slug": "cha-hotel-anais-2",
      "name": "Hotel Anais",
      "nameEl": "ΑΝΑΙΣ",
      "lat": 35.5093628715194,
      "lng": 23.9886315555732
    },
    "cha-golden-beach": {
      "slug": "cha-golden-beach",
      "name": "Golden Beach",
      "nameEl": "ΠΑΡΑΛΙΑ ΧΡΥΣΗ ΑΚΤΗ",
      "lat": 35.5114398,
      "lng": 23.98977
    },
    "cha-golden-beach-2": {
      "slug": "cha-golden-beach-2",
      "name": "Golden Beach",
      "nameEl": "ΠΑΡΑΛΙΑ ΧΡΥΣΗ ΑΚΤΗ",
      "lat": 35.511561,
      "lng": 23.9896506
    },
    "cha-forum": {
      "slug": "cha-forum",
      "name": "Forum",
      "nameEl": "ΦΟΡΟΥΜ",
      "lat": 35.51256640202708,
      "lng": 23.98846512397729
    },
    "cha-forum-2": {
      "slug": "cha-forum-2",
      "name": "Forum",
      "nameEl": "ΦΟΡΟΥΜ",
      "lat": 35.51254776886894,
      "lng": 23.98798236630517
    },
    "cha-first-beach-of-ag-apostolon": {
      "slug": "cha-first-beach-of-ag-apostolon",
      "name": "First Beach of AG. Apostolon",
      "nameEl": "ΠΑΡΚΟ ΑΓ. ΑΠΟΣΤΟΛΩΝ",
      "lat": 35.5136176,
      "lng": 23.9839157
    },
    "cha-first-beach-of-ag-apostolon-2": {
      "slug": "cha-first-beach-of-ag-apostolon-2",
      "name": "First Beach of AG. Apostolon",
      "nameEl": "ΠΑΡΚΟ ΑΓ. ΑΠΟΣΤΟΛΩΝ",
      "lat": 35.513491,
      "lng": 23.9841021
    },
    "cha-ag-apostolon-beach": {
      "slug": "cha-ag-apostolon-beach",
      "name": "AG. Apostolon Beach",
      "nameEl": "ΠΑΡΑΛΙΕΣ ΑΓ. ΑΠΟΣΤΟΛΩΝ",
      "lat": 35.5131429,
      "lng": 23.9783149
    },
    "cha-ag-apostolon-beach-2": {
      "slug": "cha-ag-apostolon-beach-2",
      "name": "AG. Apostolon Beach",
      "nameEl": "ΠΑΡΑΛΙΕΣ ΑΓ. ΑΠΟΣΤΟΛΩΝ",
      "lat": 35.5131407,
      "lng": 23.9784356
    },
    "cha-drakonianou": {
      "slug": "cha-drakonianou",
      "name": "Drakonianou",
      "nameEl": "ΔΡΑΚΟΝΙΑΝΟΥ",
      "lat": 35.51242906581289,
      "lng": 23.98090544044073
    },
    "cha-drakonianou-2": {
      "slug": "cha-drakonianou-2",
      "name": "Drakonianou",
      "nameEl": "ΔΡΑΚΟΝΙΑΝΟΥ",
      "lat": 35.5124542,
      "lng": 23.9813346
    },
    "cha-nearchou-2": {
      "slug": "cha-nearchou-2",
      "name": "Nearchou",
      "nameEl": "ΝΕΑΡΧΟΥ - ΚΑΜΠΙΝΓΚ",
      "lat": 35.5120088181532,
      "lng": 23.9830096471917
    },
    "cha-nearchou-3": {
      "slug": "cha-nearchou-3",
      "name": "Nearchou",
      "nameEl": "ΝΕΑΡΧΟΥ - ΚΑΜΠΙΝΓΚ",
      "lat": 35.511951,
      "lng": 23.9831357
    },
    "cha-anoixis": {
      "slug": "cha-anoixis",
      "name": "Anoixis",
      "nameEl": "ΑΝΟΙΞΗΣ",
      "lat": 35.5107476,
      "lng": 23.9822992
    },
    "cha-anoixis-2": {
      "slug": "cha-anoixis-2",
      "name": "Anoixis",
      "nameEl": "ΑΝΟΙΞΗΣ",
      "lat": 35.5107149,
      "lng": 23.9823837
    },
    "cha-lidl": {
      "slug": "cha-lidl",
      "name": "Lidl",
      "nameEl": "ΛΙΝΤΛ",
      "lat": 35.5084504,
      "lng": 23.9818826
    },
    "cha-synka-3": {
      "slug": "cha-synka-3",
      "name": "Synka",
      "nameEl": "ΣΥΝΚΑ",
      "lat": 35.5086141,
      "lng": 23.9820208
    },
    "cha-althea": {
      "slug": "cha-althea",
      "name": "Althea",
      "nameEl": "ΑΛΘΕΑ",
      "lat": 35.5066069,
      "lng": 23.9775581
    },
    "cha-lamprinaki": {
      "slug": "cha-lamprinaki",
      "name": "Lamprinaki",
      "nameEl": "ΛΑΜΠΡΙΝΑΚΗ",
      "lat": 35.5026617,
      "lng": 23.9752924
    },
    "cha-daratsos": {
      "slug": "cha-daratsos",
      "name": "Daratsos",
      "nameEl": "ΔΑΡΑΤΣΟΣ",
      "lat": 35.49991507651902,
      "lng": 23.97415639199602
    },
    "cha-star-daratsos": {
      "slug": "cha-star-daratsos",
      "name": "Star Daratsos",
      "nameEl": "ΣΤΑΡ ΔΑΡΑΤΣΟΣ",
      "lat": 35.500179,
      "lng": 23.9715374
    },
    "cha-vechakidon": {
      "slug": "cha-vechakidon",
      "name": "Vechakidon",
      "nameEl": "ΒΕΧΑΚΗΔΩΝ",
      "lat": 35.5005534,
      "lng": 23.9691461
    },
    "cha-gipedo-galata": {
      "slug": "cha-gipedo-galata",
      "name": "Gipedo Galata",
      "nameEl": "ΓΗΠΕΔΟ ΓΑΛΑΤΑ",
      "lat": 35.501866201898245,
      "lng": 23.967917335581955
    },
    "cha-tourist-police": {
      "slug": "cha-tourist-police",
      "name": "Tourist Police",
      "nameEl": "ΤΟΥΡΙΣΤΙΚΗ ΑΣΤΥΝΟΜΙΑ",
      "lat": 35.50126580090254,
      "lng": 23.966307242327872
    },
    "cha-galatiano-perasma": {
      "slug": "cha-galatiano-perasma",
      "name": "Galatiano Perasma",
      "nameEl": "ΓΑΛΑΤΙΑΝΟ ΠΕΡΑΣΜΑ",
      "lat": 35.50040436383306,
      "lng": 23.964560831282814
    },
    "cha-galatas": {
      "slug": "cha-galatas",
      "name": "Galatas",
      "nameEl": "ΓΑΛΑΤΑΣ",
      "lat": 35.4993072,
      "lng": 23.9632951
    },
    "cha-bigkaza": {
      "slug": "cha-bigkaza",
      "name": "Bigkaza",
      "nameEl": "ΜΠΙΓΚΑΖΑ",
      "lat": 35.497778044680935,
      "lng": 23.961960419643393
    },
    "cha-ag-antonios": {
      "slug": "cha-ag-antonios",
      "name": "AG. Antonios",
      "nameEl": "ΑΓ. ΑΝΤΩΝΙΟΣ",
      "lat": 35.4979095081576,
      "lng": 23.964443456448763
    },
    "cha-ag-georgiou": {
      "slug": "cha-ag-georgiou",
      "name": "AG. Georgiou",
      "nameEl": "ΑΓ. ΓΕΩΡΓΙΟΥ",
      "lat": 35.504330575586756,
      "lng": 23.968184424536908
    },
    "cha-eirinis": {
      "slug": "cha-eirinis",
      "name": "Eirinis",
      "nameEl": "ΕΙΡΗΝΗΣ",
      "lat": 35.50718306326891,
      "lng": 23.968166031924433
    },
    "cha-ag-fanouriou": {
      "slug": "cha-ag-fanouriou",
      "name": "AG. Fanouriou",
      "nameEl": "ΑΓ. ΦΑΝΟΥΡΙΟΥ",
      "lat": 35.51119873342389,
      "lng": 23.969336581020364
    },
    "cha-ag-fanouriou-2": {
      "slug": "cha-ag-fanouriou-2",
      "name": "AG. Fanouriou",
      "nameEl": "ΑΓ. ΦΑΝΟΥΡΙΟΥ",
      "lat": 35.51049791846824,
      "lng": 23.968995894705728
    },
    "cha-eirinis-2": {
      "slug": "cha-eirinis-2",
      "name": "Eirinis",
      "nameEl": "ΕΙΡΗΝΗΣ",
      "lat": 35.507905332562956,
      "lng": 23.96829726268733
    },
    "cha-ag-georgiou-2": {
      "slug": "cha-ag-georgiou-2",
      "name": "AG. Georgiou",
      "nameEl": "ΑΓ. ΓΕΩΡΓΙΟΥ",
      "lat": 35.50420832992,
      "lng": 23.96807846899025
    },
    "cha-ts-limani-soudas": {
      "slug": "cha-ts-limani-soudas",
      "name": "Ts_limani Soudas",
      "nameEl": "ΤΣ ΛΙΜΑΝΙ ΣΟΥΔΑΣ",
      "lat": 35.4890243,
      "lng": 24.0742266
    },
    "cha-chamber-of-chania-old-market": {
      "slug": "cha-chamber-of-chania-old-market",
      "name": "Chamber OF Chania - OLD Market",
      "nameEl": "ΕΠΙΜΕΛΗΤΗΡΙΟ - ΑΓΟΡΑ",
      "lat": 35.51405427557033,
      "lng": 24.020964603736374
    },
    "cha-merarchia": {
      "slug": "cha-merarchia",
      "name": "Merarchia",
      "nameEl": "ΜΕΡΑΡΧΙΑ",
      "lat": 35.50121642305979,
      "lng": 24.052011052571512
    },
    "cha-dexamenis": {
      "slug": "cha-dexamenis",
      "name": "Dexamenis",
      "nameEl": "ΔΕΞΑΜΕΝΗΣ",
      "lat": 35.54251933535287,
      "lng": 24.067966005688795
    },
    "cha-merarchia-2": {
      "slug": "cha-merarchia-2",
      "name": "Merarchia",
      "nameEl": "ΜΕΡΑΡΧΙΑ",
      "lat": 35.500387584077664,
      "lng": 24.05266343386302
    },
    "cha-dimotaki": {
      "slug": "cha-dimotaki",
      "name": "Dimotaki",
      "nameEl": "ΔΗΜΟΤΑΚΗ",
      "lat": 35.498530727566724,
      "lng": 24.05695895577631
    },
    "cha-symmachon": {
      "slug": "cha-symmachon",
      "name": "Symmachon",
      "nameEl": "ΣΥΜΜΑΧΩΝ",
      "lat": 35.49776021710347,
      "lng": 24.05882911891598
    },
    "cha-ts-tsikalaria": {
      "slug": "cha-ts-tsikalaria",
      "name": "TS Tsikalaria",
      "nameEl": "ΤΣ ΤΣΙΚΑΛΑΡΙΑ",
      "lat": 35.4821850243806,
      "lng": 24.05539410288432
    },
    "cha-dimotiko-scholeio-tsikalarion": {
      "slug": "cha-dimotiko-scholeio-tsikalarion",
      "name": "Dimotiko Scholeio Tsikalarion",
      "nameEl": "ΔΗΜΟΤΙΚΟ ΣΧΟΛΕΙΟ ΤΣΙΚΑΛΑΡΙΩΝ",
      "lat": 35.477271154759656,
      "lng": 24.058618304899653
    },
    "cha-deligiannaki": {
      "slug": "cha-deligiannaki",
      "name": "Deligiannaki",
      "nameEl": "ΔΕΛΗΓΙΑΝΝΑΚΗ",
      "lat": 35.50079711808015,
      "lng": 24.042801190824715
    },
    "cha-deligiannaki-2": {
      "slug": "cha-deligiannaki-2",
      "name": "Deligiannaki",
      "nameEl": "ΔΕΛΗΓΙΑΝΝΑΚΗ",
      "lat": 35.50120763501796,
      "lng": 24.041873146505562
    },
    "cha-antoniadou": {
      "slug": "cha-antoniadou",
      "name": "Antoniadou",
      "nameEl": "ΑΝΤΩΝΙΑΔΟΥ",
      "lat": 35.50519258693279,
      "lng": 24.031629784043353
    },
    "cha-ts-nea-chora": {
      "slug": "cha-ts-nea-chora",
      "name": "TS NEA Chora",
      "nameEl": "ΤΣ ΝΕΑ ΧΩΡΑ",
      "lat": 35.51205947222168,
      "lng": 24.002221881228756
    },
    "cha-georgakakidon-kladisos": {
      "slug": "cha-georgakakidon-kladisos",
      "name": "Georgakakidon & Kladisos",
      "nameEl": "ΓΕΩΡΓΑΚΑΚΗΔΩΝ & ΚΛΑΔΙΣΟΣ",
      "lat": 35.50725065740351,
      "lng": 24.00376656351316
    },
    "cha-chonoloulou-3": {
      "slug": "cha-chonoloulou-3",
      "name": "Chonoloulou",
      "nameEl": "ΧΟΝΟΛΟΥΛΟΥ",
      "lat": 35.51723583982017,
      "lng": 24.03455672098477
    },
    "cha-archaeological-museum": {
      "slug": "cha-archaeological-museum",
      "name": "Archaeological Museum",
      "nameEl": "ΑΡΧΑΙΟΛΟΓΙΚΟ ΜΟΥΣΕΙΟ",
      "lat": 35.5182407806917,
      "lng": 24.037326303347616
    },
    "cha-treis-kamares-2": {
      "slug": "cha-treis-kamares-2",
      "name": "Treis Kamares",
      "nameEl": "ΤΡΕΙΣ ΚΑΜΑΡΕΣ",
      "lat": 35.518249513219246,
      "lng": 24.039988735258078
    },
    "cha-evangelistria": {
      "slug": "cha-evangelistria",
      "name": "Evangelistria",
      "nameEl": "ΕΥΑΓΓΕΛΙΣΤΡΙΑ",
      "lat": 35.519586688097945,
      "lng": 24.042287009042642
    },
    "cha-parko": {
      "slug": "cha-parko",
      "name": "Parko",
      "nameEl": "ΠΑΡΚΟ",
      "lat": 35.520081731407544,
      "lng": 24.048078963330944
    },
    "cha-profiti-ilia-2": {
      "slug": "cha-profiti-ilia-2",
      "name": "Profiti Ilia",
      "nameEl": "ΠΡΟΦΗΤΗ ΗΛΙΑ",
      "lat": 35.52150487604885,
      "lng": 24.05084235200775
    },
    "cha-mousiko-scholeio-chanion": {
      "slug": "cha-mousiko-scholeio-chanion",
      "name": "Mousiko Scholeio Chanion",
      "nameEl": "ΜΟΥΣΙΚΟ ΣΧΟΛΕΙΟ ΧΑΝΙΩΝ",
      "lat": 35.52265628108866,
      "lng": 24.052246712838176
    },
    "cha-profiti-ilia-3": {
      "slug": "cha-profiti-ilia-3",
      "name": "Profiti Ilia",
      "nameEl": "ΠΡΟΦΗΤΗ ΗΛΙΑ",
      "lat": 35.52122384510861,
      "lng": 24.050507533291036
    },
    "cha-gerasimou-pardali": {
      "slug": "cha-gerasimou-pardali",
      "name": "Gerasimou Pardali",
      "nameEl": "ΓΕΡΑΣΙΜΟΥ ΠΑΡΔΑΛΗ",
      "lat": 35.51341389553125,
      "lng": 24.01253383189884
    },
    "cha-koustogerakou": {
      "slug": "cha-koustogerakou",
      "name": "Koustogerakou",
      "nameEl": "ΚΟΥΣΤΟΓΕΡΑΚΟΥ",
      "lat": 35.51285858765809,
      "lng": 24.00925036704303
    },
    "cha-ag-grigorios": {
      "slug": "cha-ag-grigorios",
      "name": "AG. Grigorios",
      "nameEl": "ΑΓ. ΓΡΗΓΟΡΙΟΣ",
      "lat": 35.512411062599384,
      "lng": 24.00548193550673
    },
    "cha-mousiko-scholeio-chanion-2": {
      "slug": "cha-mousiko-scholeio-chanion-2",
      "name": "Mousiko Scholeio Chanion",
      "nameEl": "ΜΟΥΣΙΚΟ ΣΧΟΛΕΙΟ ΧΑΝΙΩΝ",
      "lat": 35.52304703926899,
      "lng": 24.051734410916332
    },
    "cha-georgiou-seimeni": {
      "slug": "cha-georgiou-seimeni",
      "name": "Georgiou Seimeni",
      "nameEl": "ΓΕΩΡΓΙΟΥ ΣΕΙΜΕΝΗ",
      "lat": 35.526727198300776,
      "lng": 24.052001225025258
    },
    "cha-georgiou-seimeni-2": {
      "slug": "cha-georgiou-seimeni-2",
      "name": "Georgiou Seimeni",
      "nameEl": "ΓΕΩΡΓΙΟΥ ΣΕΙΜΕΝΗ",
      "lat": 35.52719652068088,
      "lng": 24.051829563648262
    },
    "cha-7o-gymnasio-chanion": {
      "slug": "cha-7o-gymnasio-chanion",
      "name": "7o Gymnasio Chanion",
      "nameEl": "7ο ΓΥΜΝΑΣΙΟ ΧΑΝΙΩΝ",
      "lat": 35.53393498857518,
      "lng": 24.051314489116958
    },
    "cha-omirou-2": {
      "slug": "cha-omirou-2",
      "name": "Omirou",
      "nameEl": "ΟΜΗΡΟΥ",
      "lat": 35.53547746171292,
      "lng": 24.04992591749711
    },
    "cha-papaflessa": {
      "slug": "cha-papaflessa",
      "name": "Papaflessa",
      "nameEl": "ΠΑΠΑΦΛΕΣΣΑ",
      "lat": 35.51908819897363,
      "lng": 24.05177449346929
    },
    "cha-ts-kalamaki-panorama": {
      "slug": "cha-ts-kalamaki-panorama",
      "name": "TS Kalamaki - Panorama",
      "nameEl": "ΤΣ ΚΑΛΑΜΑΚΙ - ΠΑΝΟΡΑΜΑ",
      "lat": 35.512624943443946,
      "lng": 23.96201888207245
    },
    "cha-kalafati": {
      "slug": "cha-kalafati",
      "name": "Kalafati",
      "nameEl": "ΚΑΛΑΦΑΤΗ",
      "lat": 35.50606721229385,
      "lng": 24.0177248099805
    },
    "cha-gianni-ritsou": {
      "slug": "cha-gianni-ritsou",
      "name": "Gianni Ritsou",
      "nameEl": "ΓΙΑΝΝΗ ΡΙΤΣΟΥ",
      "lat": 35.50330409544612,
      "lng": 24.017787592536493
    },
    "cha-irakleous": {
      "slug": "cha-irakleous",
      "name": "Irakleous",
      "nameEl": "ΗΡΑΚΛΕΟΥΣ",
      "lat": 35.490297985722286,
      "lng": 24.023787045780413
    },
    "cha-markou-botsari-4": {
      "slug": "cha-markou-botsari-4",
      "name": "Markou Botsari",
      "nameEl": "ΜΑΡΚΟΥ ΜΠΟΤΣΑΡΗ",
      "lat": 35.51011706388158,
      "lng": 24.01356302607132
    },
    "cha-ts-plakoures": {
      "slug": "cha-ts-plakoures",
      "name": "TS Plakoures",
      "nameEl": "ΤΣ ΠΛΑΚΟΥΡΕΣ",
      "lat": 35.53764093044944,
      "lng": 24.08711693999929
    },
    "cha-agion-panton-2": {
      "slug": "cha-agion-panton-2",
      "name": "Agion Panton",
      "nameEl": "ΑΓΙΩΝ ΠΑΝΤΩΝ",
      "lat": 35.53306747778515,
      "lng": 24.076761550758228
    },
    "cha-ikarou-3": {
      "slug": "cha-ikarou-3",
      "name": "Ikarou",
      "nameEl": "ΙΚΑΡΟΥ",
      "lat": 35.53446197178518,
      "lng": 24.077096668664414
    },
    "cha-dimotiko-scholeio-kounoupidianon": {
      "slug": "cha-dimotiko-scholeio-kounoupidianon",
      "name": "Dimotiko Scholeio Kounoupidianon",
      "nameEl": "ΔΗΜΟΤΙΚΟ ΣΧΟΛΕΙΟ ΚΟΥΝΟΥΠΙΔΙΑΝΩΝ",
      "lat": 35.536090242560235,
      "lng": 24.079153922978836
    },
    "cha-filias-ton-laon-2": {
      "slug": "cha-filias-ton-laon-2",
      "name": "Filias TON Laon",
      "nameEl": "ΦΙΛΙΑΣ ΤΩΝ ΛΑΩΝ",
      "lat": 35.53544417660994,
      "lng": 24.081718114797035
    },
    "cha-plakoures-2": {
      "slug": "cha-plakoures-2",
      "name": "Plakoures",
      "nameEl": "ΠΛΑΚΟΥΡΕΣ",
      "lat": 35.53461238331974,
      "lng": 24.084844140225783
    },
    "cha-ag-saranta": {
      "slug": "cha-ag-saranta",
      "name": "AG. Saranta",
      "nameEl": "ΑΓ. ΣΑΡΑΝΤΑ",
      "lat": 35.481035534622904,
      "lng": 24.03677628998784
    },
    "cha-tompazi-2": {
      "slug": "cha-tompazi-2",
      "name": "Tompazi",
      "nameEl": "ΤΟΜΠΑΖΗ",
      "lat": 35.484250529418325,
      "lng": 24.036438331651926
    },
    "cha-katsifariana-2": {
      "slug": "cha-katsifariana-2",
      "name": "Katsifariana",
      "nameEl": "ΚΑΤΣΙΦΑΡΙΑΝΑ",
      "lat": 35.487268497880905,
      "lng": 24.036015872894907
    },
    "cha-xylokamara-2": {
      "slug": "cha-xylokamara-2",
      "name": "Xylokamara",
      "nameEl": "ΞΥΛΟΚΑΜΑΡΑ",
      "lat": 35.49031180806512,
      "lng": 24.033942525326395
    },
    "cha-in-panagias-gorgoupikoou": {
      "slug": "cha-in-panagias-gorgoupikoou",
      "name": "IN Panagias Gorgoupikoou",
      "nameEl": "ΙΝ ΠΑΝΑΓΙΑΣ ΓΟΡΓΟΥΠΗΚΟΟΥ",
      "lat": 35.49323932191914,
      "lng": 24.028396201528203
    },
    "cha-in-panagias-gorgoupikoou-2": {
      "slug": "cha-in-panagias-gorgoupikoou-2",
      "name": "IN Panagias Gorgoupikoou",
      "nameEl": "ΙΝ ΠΑΝΑΓΙΑΣ ΓΟΡΓΟΥΠΗΚΟΟΥ",
      "lat": 35.49443385806857,
      "lng": 24.028742206491167
    },
    "cha-chrysopigis": {
      "slug": "cha-chrysopigis",
      "name": "Chrysopigis",
      "nameEl": "ΧΡΥΣΟΠΗΓΗΣ",
      "lat": 35.49764238623887,
      "lng": 24.029362325430924
    },
    "cha-chrysopigis-2": {
      "slug": "cha-chrysopigis-2",
      "name": "Chrysopigis",
      "nameEl": "ΧΡΥΣΟΠΗΓΗΣ",
      "lat": 35.498096592905725,
      "lng": 24.029560808897983
    },
    "cha-ag-stefanos": {
      "slug": "cha-ag-stefanos",
      "name": "AG. Stefanos",
      "nameEl": "ΑΓ. ΣΤΕΦΑΝΟΣ",
      "lat": 35.50280078056671,
      "lng": 24.027271820032094
    },
    "cha-kerameion": {
      "slug": "cha-kerameion",
      "name": "Kerameion",
      "nameEl": "ΚΕΡΑΜΕΙΩΝ",
      "lat": 35.47597901273963,
      "lng": 24.039802840707843
    },
    "cha-dimotaki-2": {
      "slug": "cha-dimotaki-2",
      "name": "Dimotaki",
      "nameEl": "ΔΗΜΟΤΑΚΗ",
      "lat": 35.498786216307465,
      "lng": 24.056395691883182
    },
    "cha-kourkoutaki": {
      "slug": "cha-kourkoutaki",
      "name": "Kourkoutaki",
      "nameEl": "ΚΟΥΡΚΟΥΤΑΚΗ",
      "lat": 35.49777699039535,
      "lng": 24.05928883050749
    },
    "cha-akrotiriou": {
      "slug": "cha-akrotiriou",
      "name": "Akrotiriou",
      "nameEl": "ΑΚΡΩΤΗΡΙΟΥ",
      "lat": 35.494847095983125,
      "lng": 24.058750212714244
    },
    "cha-akrotiriou-2": {
      "slug": "cha-akrotiriou-2",
      "name": "Akrotiriou",
      "nameEl": "ΑΚΡΩΤΗΡΙΟΥ",
      "lat": 35.49504581863024,
      "lng": 24.05914717964845
    },
    "cha-kato-souda-2": {
      "slug": "cha-kato-souda-2",
      "name": "Kato Souda",
      "nameEl": "ΚΑΤΩ ΣΟΥΔΑ",
      "lat": 35.4903764384777,
      "lng": 24.06070244535767
    },
    "cha-varypetro-3": {
      "slug": "cha-varypetro-3",
      "name": "Varypetro",
      "nameEl": "ΒΑΡΥΠΕΤΡΟ",
      "lat": 35.481168634828634,
      "lng": 23.956681887874712
    },
    "cha-ag-fanouriou-3": {
      "slug": "cha-ag-fanouriou-3",
      "name": "AG. Fanouriou",
      "nameEl": "ΑΓ. ΦΑΝΟΥΡΙΟΥ",
      "lat": 35.48138463272772,
      "lng": 23.96202208428003
    },
    "cha-diastavrosi-2-marmara": {
      "slug": "cha-diastavrosi-2-marmara",
      "name": "Diastavrosi 2 Marmara",
      "nameEl": "ΔΙΑΣΤΑΥΡΩΣΗ 2 ΜΑΡΜΑΡΑ",
      "lat": 35.4759714901444,
      "lng": 23.963630919990962
    },
    "cha-diastavrosi-oadyk": {
      "slug": "cha-diastavrosi-oadyk",
      "name": "Diastavrosi Oadyk",
      "nameEl": "ΔΙΑΣΤΑΥΡΩΣΗ ΟΑΔΥΚ",
      "lat": 35.47166278782127,
      "lng": 23.96531663702037
    },
    "cha-gipedo-varypetrou": {
      "slug": "cha-gipedo-varypetrou",
      "name": "Gipedo Varypetrou",
      "nameEl": "ΓΗΠΕΔΟ ΒΑΡΥΠΕΤΡΟΥ",
      "lat": 35.47431991423991,
      "lng": 23.969095544248503
    },
    "cha-ligides-1i-stasi": {
      "slug": "cha-ligides-1i-stasi",
      "name": "Ligides 1i Stasi",
      "nameEl": "ΛΙΓΙΔΕΣ 1η ΣΤΑΣΗ",
      "lat": 35.481477150387406,
      "lng": 23.96704818731176
    },
    "cha-sykolia-3": {
      "slug": "cha-sykolia-3",
      "name": "Sykolia",
      "nameEl": "ΣΥΚΟΛΙΑ",
      "lat": 35.48598687511637,
      "lng": 23.967056578436512
    },
    "cha-sykolia-4": {
      "slug": "cha-sykolia-4",
      "name": "Sykolia",
      "nameEl": "ΣΥΚΟΛΙΑ.",
      "lat": 35.48650885153864,
      "lng": 23.966707891264576
    },
    "cha-plateia-ligide": {
      "slug": "cha-plateia-ligide",
      "name": "Plateia Ligide",
      "nameEl": "ΠΛΑΤΕΙΑ ΛΙΓΙΔΕ",
      "lat": 35.48347991666305,
      "lng": 23.9690847540885
    },
    "cha-ligides-2i-stasi": {
      "slug": "cha-ligides-2i-stasi",
      "name": "Ligides 2i Stasi",
      "nameEl": "ΛΙΓΙΔΕΣ 2η ΣΤΑΣΗ",
      "lat": 35.48099539484028,
      "lng": 23.966558348438657
    },
    "cha-gipedo-varypetrou-2": {
      "slug": "cha-gipedo-varypetrou-2",
      "name": "Gipedo Varypetrou",
      "nameEl": "ΓΗΠΕΔΟ ΒΑΡΥΠΕΤΡΟΥ",
      "lat": 35.47418011726284,
      "lng": 23.968333796888274
    },
    "cha-diastavrosi-oadyk-2": {
      "slug": "cha-diastavrosi-oadyk-2",
      "name": "Diastavrosi Oadyk",
      "nameEl": "ΔΙΑΣΤΑΥΡΩΣΗ ΟΑΔΥΚ",
      "lat": 35.472392373461105,
      "lng": 23.965077920418043
    },
    "cha-diastavrosi-1-marmara": {
      "slug": "cha-diastavrosi-1-marmara",
      "name": "Diastavrosi 1 Marmara",
      "nameEl": "ΔΙΑΣΤΑΥΡΩΣΗ 1 ΜΑΡΜΑΡΑ",
      "lat": 35.476727247817315,
      "lng": 23.963429754314845
    },
    "cha-ieros-naos-genniseos-tis-theotokou": {
      "slug": "cha-ieros-naos-genniseos-tis-theotokou",
      "name": "Ieros Naos Genniseos TIS Theotokou",
      "nameEl": "ΙΕΡΟΣ ΝΑΟΣ ΓΕΝΝΗΣΕΩΣ ΤΗΣ ΘΕΟΤΟΚΟΥ",
      "lat": 35.48153315369706,
      "lng": 23.96203281311609
    },
    "cha-marmaras-2": {
      "slug": "cha-marmaras-2",
      "name": "Marmaras",
      "nameEl": "ΜΑΡΜΑΡΑΣ",
      "lat": 35.47934125850987,
      "lng": 23.96222291287918
    },
    "cha-varypetro-4": {
      "slug": "cha-varypetro-4",
      "name": "Varypetro",
      "nameEl": "ΒΑΡΥΠΕΤΡΟ",
      "lat": 35.48093274738531,
      "lng": 23.956802587280382
    },
    "cha-potistiria-2": {
      "slug": "cha-potistiria-2",
      "name": "Potistiria",
      "nameEl": "ΠΟΤΙΣΤΗΡΙΑ",
      "lat": 35.47634902484301,
      "lng": 23.97055781716194
    },
    "cha-georgiladon": {
      "slug": "cha-georgiladon",
      "name": "Georgiladon",
      "nameEl": "ΓΕΩΡΓΙΛΑΔΩΝ",
      "lat": 35.509691713245175,
      "lng": 24.022012957669915
    },
    "cha-diktynis": {
      "slug": "cha-diktynis",
      "name": "Diktynis",
      "nameEl": "ΔΙΚΤΥΝΗΣ",
      "lat": 35.507175252023686,
      "lng": 24.021606165477785
    },
    "cha-palia-ilektriki-2": {
      "slug": "cha-palia-ilektriki-2",
      "name": "Palia Ilektriki",
      "nameEl": "ΠΑΛΙΑ ΗΛΕΚΤΡΙΚΗ",
      "lat": 35.504769748204865,
      "lng": 24.02123950156679
    },
    "cha-eleftheriou-venizelou": {
      "slug": "cha-eleftheriou-venizelou",
      "name": "Eleftheriou Venizelou",
      "nameEl": "ΕΛΕΥΘΕΡΙΟΥ ΒΕΝΙΖΕΛΟΥ",
      "lat": 35.517761998801085,
      "lng": 24.07354000153316
    },
    "cha-gipedo-basket": {
      "slug": "cha-gipedo-basket",
      "name": "Gipedo Basket",
      "nameEl": "ΓΗΠΕΔΟ ΜΠΑΣΚΕΤ",
      "lat": 35.518222641079376,
      "lng": 24.07615783753174
    },
    "cha-paidiki-chara": {
      "slug": "cha-paidiki-chara",
      "name": "Paidiki Chara",
      "nameEl": "ΠΑΙΔΙΚΗ ΧΑΡΑ",
      "lat": 35.51966689697136,
      "lng": 24.077996465841778
    },
    "cha-iera-moni-ag-prodromou": {
      "slug": "cha-iera-moni-ag-prodromou",
      "name": "Iera Moni AG. Prodromou",
      "nameEl": "ΙΕΡΑ ΜΟΝΗ ΑΓ.ΙΩΑΝΝΗ ΠΡΟΔΡΟΜΟΥ",
      "lat": 35.521408986452265,
      "lng": 24.077752384821423
    },
    "cha-timiou-prodromou-2": {
      "slug": "cha-timiou-prodromou-2",
      "name": "Timiou Prodromou",
      "nameEl": "ΤΙΜΙΟΥ ΠΡΟΔΡΟΜΟΥ",
      "lat": 35.52380309088233,
      "lng": 24.078992778198955
    },
    "cha-iridos": {
      "slug": "cha-iridos",
      "name": "Iridos",
      "nameEl": "ΙΡΙΔΟΣ",
      "lat": 35.52695042337908,
      "lng": 24.07809720543033
    },
    "cha-1i-andreadaki": {
      "slug": "cha-1i-andreadaki",
      "name": "1i Andreadaki",
      "nameEl": "1η ΑΝΔΡΕΑΔΑΚΗ",
      "lat": 35.53852864986205,
      "lng": 24.092086768800264
    },
    "cha-2i-andreadaki": {
      "slug": "cha-2i-andreadaki",
      "name": "2i Andreadaki",
      "nameEl": "2η ΑΝΔΡΕΑΔΑΚΗ",
      "lat": 35.53711433445341,
      "lng": 24.0912650131933
    },
    "cha-g-kalamaridi": {
      "slug": "cha-g-kalamaridi",
      "name": "G. Kalamaridi",
      "nameEl": "Γ. ΚΑΛΑΜΑΡΙΔΗ",
      "lat": 35.537933636824825,
      "lng": 24.092605496414926
    },
    "cha-plakoures-3": {
      "slug": "cha-plakoures-3",
      "name": "Plakoures",
      "nameEl": "ΠΛΑΚΟΥΡΕΣ",
      "lat": 35.53490923537213,
      "lng": 24.085489546403686
    },
    "cha-filias-ton-laon-3": {
      "slug": "cha-filias-ton-laon-3",
      "name": "ΦΙΛΙΑΣ ΤΩΝ ΛΑΩΝ",
      "nameEl": "ΦΙΛΙΑΣ ΤΩΝ ΛΑΩΝ",
      "lat": 35.53538159924345,
      "lng": 24.081790690116986
    },
    "cha-12-dimotiko-scholeio": {
      "slug": "cha-12-dimotiko-scholeio",
      "name": "12 Dimotiko Scholeio",
      "nameEl": "12 ΔΗΜΟΤΙΚΟ ΣΧΟΛΕΙΟ",
      "lat": 35.53596684138185,
      "lng": 24.078684349234067
    },
    "cha-kazantzaki": {
      "slug": "cha-kazantzaki",
      "name": "Kazantzaki",
      "nameEl": "ΚΑΖΑΝΤΖΑΚΗ",
      "lat": 35.54106993674096,
      "lng": 24.071629318653407
    },
    "cha-ag-fanouriou-4": {
      "slug": "cha-ag-fanouriou-4",
      "name": "AG. Fanouriou",
      "nameEl": "ΑΓ. ΦΑΝΟΥΡΙΟΥ",
      "lat": 35.54266686130824,
      "lng": 24.06750240768437
    },
    "cha-kalergi": {
      "slug": "cha-kalergi",
      "name": "Kalergi",
      "nameEl": "ΚΑΛΕΡΓΗ",
      "lat": 35.54483000657534,
      "lng": 24.061815365911663
    },
    "cha-theotokopoulou": {
      "slug": "cha-theotokopoulou",
      "name": "Theotokopoulou",
      "nameEl": "ΘΕΟΤΟΚΟΠΟΥΛΟΥ",
      "lat": 35.542483912037355,
      "lng": 24.061615542430182
    },
    "cha-arkadiou": {
      "slug": "cha-arkadiou",
      "name": "Arkadiou",
      "nameEl": "ΑΡΚΑΔΙΟΥ",
      "lat": 35.54331852058981,
      "lng": 24.063775940689588
    },
    "cha-kounoupidianon-square-3": {
      "slug": "cha-kounoupidianon-square-3",
      "name": "Kounoupidianon Square",
      "nameEl": "ΠΛ. ΚΟΥΝΟΥΠΙΔΙΑΝΩΝ",
      "lat": 35.53122780972949,
      "lng": 24.075800661166255
    },
    "cha-agiou-antoniou": {
      "slug": "cha-agiou-antoniou",
      "name": "Agiou Antoniou",
      "nameEl": "ΑΓΙΟΥ ΑΝΤΩΝΙΟΥ",
      "lat": 35.52151301701316,
      "lng": 24.080905160758867
    },
    "cha-agion-panton-3": {
      "slug": "cha-agion-panton-3",
      "name": "Agion Panton",
      "nameEl": "ΑΓΙΩΝ ΠΑΝΤΩΝ",
      "lat": 35.533075838155575,
      "lng": 24.07676654735093
    },
    "cha-ikarou-4": {
      "slug": "cha-ikarou-4",
      "name": "Ikarou",
      "nameEl": "ΙΚΑΡΟΥ",
      "lat": 35.53445312799332,
      "lng": 24.077083048014643
    },
    "cha-aristotelous-2": {
      "slug": "cha-aristotelous-2",
      "name": "Aristotelous",
      "nameEl": "ΑΡΙΣΤΟΤΕΛΟΥΣ.",
      "lat": 35.52940738535018,
      "lng": 24.076759853635266
    },
    "cha-n-katastimata": {
      "slug": "cha-n-katastimata",
      "name": "N. Katastimata",
      "nameEl": "Ν. ΚΑΤΑΣΤΗΜΑΤΑ..",
      "lat": 35.51238953150633,
      "lng": 24.016848334009538
    },
    "cha-m-metaxaki": {
      "slug": "cha-m-metaxaki",
      "name": "M. Metaxaki",
      "nameEl": "Μ. ΜΕΤΑΞΑΚΗ",
      "lat": 35.51347096540854,
      "lng": 24.01367166054554
    },
    "cha-nea-froudia-2": {
      "slug": "cha-nea-froudia-2",
      "name": "NEA Froudia",
      "nameEl": "ΝΕΑ ΦΡΟΥΔΙΑ",
      "lat": 35.520699353036335,
      "lng": 24.049647362857836
    },
    "cha-athanasiou-diakou": {
      "slug": "cha-athanasiou-diakou",
      "name": "Athanasiou Diakou",
      "nameEl": "ΑΘ. ΔΙΑΚΟΥ",
      "lat": 35.51991124472461,
      "lng": 24.045467127305127
    },
    "cha-v-psilaki": {
      "slug": "cha-v-psilaki",
      "name": "V. Psilaki",
      "nameEl": "Β. ΨΙΛΑΚΗ",
      "lat": 35.50782299024137,
      "lng": 24.02619490321453
    },
    "cha-g-chatzidaki": {
      "slug": "cha-g-chatzidaki",
      "name": "G. Chatzidaki",
      "nameEl": "Γ. ΧΑΤΖΗΔΑΚΗ",
      "lat": 35.50771813164889,
      "lng": 24.02881004491348
    },
    "cha-i-archontaki": {
      "slug": "cha-i-archontaki",
      "name": "I. Archontaki",
      "nameEl": "Ι. ΑΡΧΟΝΤΑΚΗ",
      "lat": 35.506760615001646,
      "lng": 24.036901831646553
    },
    "cha-p-vavoule": {
      "slug": "cha-p-vavoule",
      "name": "P. Vavoule",
      "nameEl": "Π. ΒΑΒΟΥΛΕ",
      "lat": 35.50644721362272,
      "lng": 24.035496663619696
    },
    "cha-vryson-2": {
      "slug": "cha-vryson-2",
      "name": "Vryson",
      "nameEl": "ΒΡΥΣΩΝ",
      "lat": 35.509153636984266,
      "lng": 24.042754306220996
    },
    "cha-m-papadaki": {
      "slug": "cha-m-papadaki",
      "name": "M. Papadaki",
      "nameEl": "Μ. ΠΑΠΑΔΑΚΗ",
      "lat": 35.50942890342647,
      "lng": 24.04393969252091
    },
    "cha-parodos-eleftherias": {
      "slug": "cha-parodos-eleftherias",
      "name": "Parodos Eleftherias",
      "nameEl": "ΠΑΡΟΔΟΣ ΕΛΕΥΘΕΡΙΑΣ",
      "lat": 35.49022366558895,
      "lng": 24.001269131916352
    },
    "cha-patriarchou-vartholomaiou": {
      "slug": "cha-patriarchou-vartholomaiou",
      "name": "Patriarchou Vartholomaiou",
      "nameEl": "ΠΑΤΡΙΑΡΧΟΥ ΒΑΡΘΟΛΟΜΑΙΟΥ",
      "lat": 35.49204210283062,
      "lng": 24.029905403900358
    },
    "cha-nerokourou-2": {
      "slug": "cha-nerokourou-2",
      "name": "Nerokourou",
      "nameEl": "ΝΕΡΟΚΟΥΡΟΥ",
      "lat": 35.47607402889795,
      "lng": 24.03953730201533
    },
    "cha-28is-oktovriou": {
      "slug": "cha-28is-oktovriou",
      "name": "28is Oktovriou",
      "nameEl": "28ΗΣ ΟΚΤΩΒΡΙΟΥ",
      "lat": 35.529790417586305,
      "lng": 24.075045471911203
    },
    "cha-vothonas": {
      "slug": "cha-vothonas",
      "name": "Vothonas",
      "nameEl": "ΒΟΘΩΝΑΣ",
      "lat": 35.53609429839282,
      "lng": 24.086952853600422
    },
    "cha-panteli-vavoule": {
      "slug": "cha-panteli-vavoule",
      "name": "Panteli Vavoule",
      "nameEl": "ΠΑΝΤΕΛΗ ΒΑΒΟΥΛΕ",
      "lat": 35.506462513786666,
      "lng": 24.03550036589474
    },
    "cha-konstantinou-manou": {
      "slug": "cha-konstantinou-manou",
      "name": "Konstantinou Manou",
      "nameEl": "ΚΩΝΣΤΑΝΤΙΝΟΥ ΜΑΝΟΥ",
      "lat": 35.50731213015346,
      "lng": 24.0314916043826
    },
    "cha-th-kolokotroni": {
      "slug": "cha-th-kolokotroni",
      "name": "Th. Kolokotroni",
      "nameEl": "Θ. ΚΟΛΟΚΟΤΡΩΝΗ",
      "lat": 35.4989569035771,
      "lng": 24.02157643883376
    },
    "cha-p-ilektriki": {
      "slug": "cha-p-ilektriki",
      "name": "P. Ilektriki",
      "nameEl": "Π. ΗΛΕΚΤΡΙΚΗ",
      "lat": 35.50435920639728,
      "lng": 24.021970335622143
    },
    "cha-ag-fanourios": {
      "slug": "cha-ag-fanourios",
      "name": "AG. Fanourios",
      "nameEl": "ΑΓ. ΦΑΝΟΥΡΙΟΣ",
      "lat": 35.48087783713817,
      "lng": 23.95998336348177
    },
    "cha-ag-fanourios-2": {
      "slug": "cha-ag-fanourios-2",
      "name": "AG. Fanourios",
      "nameEl": "ΑΓ. ΦΑΝΟΥΡΙΟΣ",
      "lat": 35.480468878509974,
      "lng": 23.959137244758843
    },
    "cha-maridaki-3": {
      "slug": "cha-maridaki-3",
      "name": "Maridaki",
      "nameEl": "ΜΑΡΙΔΑΚΗ",
      "lat": 35.48837529191744,
      "lng": 24.063067591449403
    }
  },
  "lines": [
    {
      "code": "CHA-11",
      "apiCode": "11",
      "name": "NEA Chora - Xalepa - Sodi - Koumpeli",
      "nameEl": "ΝΕΑ ΧΩΡΑ ΧΑΛΕΠΑ ΣΟΔΥ ΚΟΥΜΠΕΛΗ",
      "hex": "#4a148c",
      "textHex": "#ffffff",
      "totalMinutes": 60,
      "lengthKm": 16.205
    },
    {
      "code": "CHA-12",
      "apiCode": "12",
      "name": "Pithari - Korakies - AG. Onoufrios - Kampani",
      "nameEl": "ΠΙΘΑΡΙ - ΚΟΡΑΚΙΕΣ - ΑΓ. ΟΝΟΥΦΡΙΟΣ - ΚΑΜΠΑΝΙ",
      "hex": "#d50000",
      "textHex": "#ffffff",
      "totalMinutes": 19,
      "lengthKm": 5.207
    },
    {
      "code": "CHA-13",
      "apiCode": "13",
      "name": "Souda - Navy Hospital- Limani",
      "nameEl": "ΣΟΥΔΑ- ΝΝΚ - ΛΙΜΑΝΙ",
      "hex": "#2e7d32",
      "textHex": "#ffffff",
      "totalMinutes": 70,
      "lengthKm": 16.948
    },
    {
      "code": "CHA-15",
      "apiCode": "15",
      "name": "Daratso - Galata - Kalamaki - Hotel Panorama",
      "nameEl": "ΔΑΡΑΤΣΟ - ΓΑΛΑΤΑ - ΚΑΛΑΜΑΚΙ - ΠΑΝΟΡΑΜΑ",
      "hex": "#d500f9",
      "textHex": "#ffffff",
      "totalMinutes": 61,
      "lengthKm": 15.099
    },
    {
      "code": "CHA-16",
      "apiCode": "16",
      "name": "Perivolia",
      "nameEl": "ΠΕΡΙΒΟΛΙΑ",
      "hex": "#00838f",
      "textHex": "#ffffff",
      "totalMinutes": 49,
      "lengthKm": 12.059
    },
    {
      "code": "CHA-17",
      "apiCode": "17",
      "name": "Nerokourou",
      "nameEl": "ΝΕΡΟΚΟΥΡΟΥ",
      "hex": "#3c0008",
      "textHex": "#ffffff",
      "totalMinutes": 53,
      "lengthKm": 10.865
    },
    {
      "code": "CHA-18",
      "apiCode": "18",
      "name": "Kounoupidiana",
      "nameEl": "ΚΟΥΝΟΥΠΙΔΙΑΝΑ",
      "hex": "#ff9800",
      "textHex": "#ffffff",
      "totalMinutes": 72,
      "lengthKm": 18.521
    },
    {
      "code": "CHA-19",
      "apiCode": "19",
      "name": "Agia - Marmara - Potistiria - Ligides",
      "nameEl": "ΦΥΛΑΚΕΣ ΑΓΥΙΑΣ - ΜΑΡΜΑΡΑ - ΠΟΤΙΣΤΗΡΙΑ - ΛΥΓΙΔΕΣ",
      "hex": "#ff4081",
      "textHex": "#ffffff",
      "totalMinutes": 85,
      "lengthKm": 21.903
    },
    {
      "code": "CHA-20",
      "apiCode": "20",
      "name": "Lentariana - AG. Ioannis",
      "nameEl": "ΛΕΝΤΑΡΙΑΝΑ - ΑΓ. ΙΩΑΝΝΗΣ",
      "hex": "#304ffe",
      "textHex": "#ffffff",
      "totalMinutes": 69,
      "lengthKm": 18.088
    },
    {
      "code": "CHA-21",
      "apiCode": "21",
      "name": "Kalamaki - Cryssi Akti - Agii Apostoli - Hotel Panorama",
      "nameEl": "ΚΑΛΑΜΑΚΙ - ΧΡΥΣΗ ΑΚΤΗ - ΑΓ. ΑΠΟΣΤΟΛΟΙ- ΠΑΝΟΡΑΜΑ",
      "hex": "#2196f3",
      "textHex": "#ffffff",
      "totalMinutes": 64,
      "lengthKm": 15.903
    },
    {
      "code": "CHA-22",
      "apiCode": "22",
      "name": "Tsikalaria",
      "nameEl": "ΤΣΙΚΑΛΑΡΙΑ",
      "hex": "#787878",
      "textHex": "#ffffff",
      "totalMinutes": 52,
      "lengthKm": 12.719
    },
    {
      "code": "CHA-24",
      "apiCode": "24",
      "name": "Hospital - Mournies",
      "nameEl": "ΝΟΣΟΚΟΜΕΙΟ - ΜΟΥΡΝΙΕΣ",
      "hex": "#3c0008",
      "textHex": "#ffffff",
      "totalMinutes": 39,
      "lengthKm": 9.881
    }
  ],
  "routes": [
    {
      "code": "047",
      "lineCode": "CHA-11",
      "name": "NEA ChORA - ChALEPA",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-nea-chora",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-georgakakidon",
          "seq": 1,
          "cumKm": 0.391,
          "cumMin": 1.3
        },
        {
          "slug": "cha-georgakakidon-kladisos",
          "seq": 2,
          "cumKm": 0.722,
          "cumMin": 2.41
        },
        {
          "slug": "cha-varousi-2",
          "seq": 3,
          "cumKm": 1.028,
          "cumMin": 3.43
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 4,
          "cumKm": 1.439,
          "cumMin": 4.8
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 5,
          "cumKm": 1.981,
          "cumMin": 6.6
        },
        {
          "slug": "cha-kydonias",
          "seq": 6,
          "cumKm": 2.225,
          "cumMin": 7.42
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 7,
          "cumKm": 2.516,
          "cumMin": 8.39
        },
        {
          "slug": "cha-national-bank",
          "seq": 8,
          "cumKm": 3.043,
          "cumMin": 10.14
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 9,
          "cumKm": 3.301,
          "cumMin": 11
        },
        {
          "slug": "cha-roloi",
          "seq": 10,
          "cumKm": 3.682,
          "cumMin": 12.27
        },
        {
          "slug": "cha-olympia",
          "seq": 11,
          "cumKm": 4.016,
          "cumMin": 13.39
        },
        {
          "slug": "cha-dikastiria",
          "seq": 12,
          "cumKm": 4.355,
          "cumMin": 14.52
        },
        {
          "slug": "cha-kamaraki",
          "seq": 13,
          "cumKm": 4.726,
          "cumMin": 15.75
        },
        {
          "slug": "cha-iroon-polytechneiou",
          "seq": 14,
          "cumKm": 5.026,
          "cumMin": 16.75
        },
        {
          "slug": "cha-chonoloulou",
          "seq": 15,
          "cumKm": 5.233,
          "cumMin": 17.44
        },
        {
          "slug": "cha-chonoloulou-3",
          "seq": 16,
          "cumKm": 5.639,
          "cumMin": 18.8
        },
        {
          "slug": "cha-archaeological-museum",
          "seq": 17,
          "cumKm": 5.996,
          "cumMin": 19.99
        },
        {
          "slug": "cha-treis-kamares-2",
          "seq": 18,
          "cumKm": 6.309,
          "cumMin": 21.03
        },
        {
          "slug": "cha-evangelistria",
          "seq": 19,
          "cumKm": 6.642,
          "cumMin": 22.14
        },
        {
          "slug": "cha-athanasiou-diakou",
          "seq": 20,
          "cumKm": 7.019,
          "cumMin": 23.4
        },
        {
          "slug": "cha-parko",
          "seq": 21,
          "cumKm": 7.327,
          "cumMin": 24.42
        },
        {
          "slug": "cha-nea-froudia-2",
          "seq": 22,
          "cumKm": 7.532,
          "cumMin": 25.11
        },
        {
          "slug": "cha-profiti-ilia-2",
          "seq": 23,
          "cumKm": 7.714,
          "cumMin": 25.71
        },
        {
          "slug": "cha-mousiko-scholeio-chanion",
          "seq": 24,
          "cumKm": 7.949,
          "cumMin": 26.5
        },
        {
          "slug": "cha-mousiko-scholeio-chanion-2",
          "seq": 25,
          "cumKm": 8.032,
          "cumMin": 26.77
        },
        {
          "slug": "cha-profiti-ilia-3",
          "seq": 26,
          "cumKm": 8.332,
          "cumMin": 27.77
        },
        {
          "slug": "cha-nea-froudia",
          "seq": 27,
          "cumKm": 8.43,
          "cumMin": 28.1
        },
        {
          "slug": "cha-georgiou-papadaki",
          "seq": 28,
          "cumKm": 8.699,
          "cumMin": 29
        },
        {
          "slug": "cha-amfimaliou",
          "seq": 29,
          "cumKm": 9.08,
          "cumMin": 30.27
        },
        {
          "slug": "cha-evangelistrias",
          "seq": 30,
          "cumKm": 9.282,
          "cumMin": 30.94
        },
        {
          "slug": "cha-treis-kamares",
          "seq": 31,
          "cumKm": 9.586,
          "cumMin": 31.95
        },
        {
          "slug": "cha-residence-of-el-venizelos",
          "seq": 32,
          "cumKm": 9.882,
          "cumMin": 32.94
        },
        {
          "slug": "cha-proxeneio",
          "seq": 33,
          "cumKm": 10.116,
          "cumMin": 33.72
        },
        {
          "slug": "cha-chonoloulou-2",
          "seq": 34,
          "cumKm": 10.462,
          "cumMin": 34.87
        },
        {
          "slug": "cha-iroon-polytechneiou-2",
          "seq": 35,
          "cumKm": 10.926,
          "cumMin": 36.42
        },
        {
          "slug": "cha-kamaraki-2",
          "seq": 36,
          "cumKm": 11.208,
          "cumMin": 37.36
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 37,
          "cumKm": 11.561,
          "cumMin": 38.54
        },
        {
          "slug": "cha-olympia-2",
          "seq": 38,
          "cumKm": 11.968,
          "cumMin": 39.89
        },
        {
          "slug": "cha-roloi-2",
          "seq": 39,
          "cumKm": 12.281,
          "cumMin": 40.94
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 40,
          "cumKm": 12.609,
          "cumMin": 42.03
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 41,
          "cumKm": 12.803,
          "cumMin": 42.68
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 42,
          "cumKm": 13.103,
          "cumMin": 43.68
        },
        {
          "slug": "cha-skalidi",
          "seq": 43,
          "cumKm": 13.431,
          "cumMin": 44.77
        },
        {
          "slug": "cha-m-metaxaki",
          "seq": 44,
          "cumKm": 13.672,
          "cumMin": 45.57
        },
        {
          "slug": "cha-gerasimou-pardali",
          "seq": 45,
          "cumKm": 13.807,
          "cumMin": 46.02
        },
        {
          "slug": "cha-koustogerakou",
          "seq": 46,
          "cumKm": 14.201,
          "cumMin": 47.34
        },
        {
          "slug": "cha-ag-grigorios",
          "seq": 47,
          "cumKm": 14.649,
          "cumMin": 48.83
        },
        {
          "slug": "cha-ts-nea-chora",
          "seq": 48,
          "cumKm": 15.036,
          "cumMin": 50.12
        }
      ]
    },
    {
      "code": "048",
      "lineCode": "CHA-11",
      "name": "NEA ChORA - ChALEPA - Koympeli",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-nea-chora",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-georgakakidon",
          "seq": 1,
          "cumKm": 0.391,
          "cumMin": 1.3
        },
        {
          "slug": "cha-georgakakidon-kladisos",
          "seq": 2,
          "cumKm": 0.722,
          "cumMin": 2.41
        },
        {
          "slug": "cha-varousi-2",
          "seq": 3,
          "cumKm": 1.028,
          "cumMin": 3.43
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 4,
          "cumKm": 1.439,
          "cumMin": 4.8
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 5,
          "cumKm": 1.981,
          "cumMin": 6.6
        },
        {
          "slug": "cha-kydonias",
          "seq": 6,
          "cumKm": 2.225,
          "cumMin": 7.42
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 7,
          "cumKm": 2.516,
          "cumMin": 8.39
        },
        {
          "slug": "cha-national-bank",
          "seq": 8,
          "cumKm": 3.043,
          "cumMin": 10.14
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 9,
          "cumKm": 3.301,
          "cumMin": 11
        },
        {
          "slug": "cha-roloi",
          "seq": 10,
          "cumKm": 3.682,
          "cumMin": 12.27
        },
        {
          "slug": "cha-olympia",
          "seq": 11,
          "cumKm": 4.016,
          "cumMin": 13.39
        },
        {
          "slug": "cha-dikastiria",
          "seq": 12,
          "cumKm": 4.355,
          "cumMin": 14.52
        },
        {
          "slug": "cha-kamaraki",
          "seq": 13,
          "cumKm": 4.726,
          "cumMin": 15.75
        },
        {
          "slug": "cha-iroon-polytechneiou",
          "seq": 14,
          "cumKm": 5.026,
          "cumMin": 16.75
        },
        {
          "slug": "cha-chonoloulou",
          "seq": 15,
          "cumKm": 5.233,
          "cumMin": 17.44
        },
        {
          "slug": "cha-chonoloulou-3",
          "seq": 16,
          "cumKm": 5.639,
          "cumMin": 18.8
        },
        {
          "slug": "cha-archaeological-museum",
          "seq": 17,
          "cumKm": 5.996,
          "cumMin": 19.99
        },
        {
          "slug": "cha-treis-kamares-2",
          "seq": 18,
          "cumKm": 6.309,
          "cumMin": 21.03
        },
        {
          "slug": "cha-evangelistria",
          "seq": 19,
          "cumKm": 6.642,
          "cumMin": 22.14
        },
        {
          "slug": "cha-athanasiou-diakou",
          "seq": 20,
          "cumKm": 7.019,
          "cumMin": 23.4
        },
        {
          "slug": "cha-parko",
          "seq": 21,
          "cumKm": 7.327,
          "cumMin": 24.42
        },
        {
          "slug": "cha-nea-froudia-2",
          "seq": 22,
          "cumKm": 7.532,
          "cumMin": 25.11
        },
        {
          "slug": "cha-mousiko-scholeio-chanion",
          "seq": 23,
          "cumKm": 7.949,
          "cumMin": 26.5
        },
        {
          "slug": "cha-georgiou-seimeni",
          "seq": 24,
          "cumKm": 8.538,
          "cumMin": 28.46
        },
        {
          "slug": "cha-megalou-alexandrou-2",
          "seq": 25,
          "cumKm": 9.43,
          "cumMin": 31.43
        },
        {
          "slug": "cha-7o-gymnasio-chanion",
          "seq": 26,
          "cumKm": 9.659,
          "cumMin": 32.2
        },
        {
          "slug": "cha-omirou-2",
          "seq": 27,
          "cumKm": 9.936,
          "cumMin": 33.12
        },
        {
          "slug": "cha-aristofanous",
          "seq": 28,
          "cumKm": 10.143,
          "cumMin": 33.81
        },
        {
          "slug": "cha-solonos",
          "seq": 29,
          "cumKm": 10.419,
          "cumMin": 34.73
        },
        {
          "slug": "cha-georgiou-seimeni-2",
          "seq": 30,
          "cumKm": 11.409,
          "cumMin": 38.03
        },
        {
          "slug": "cha-mousiko-scholeio-chanion-2",
          "seq": 31,
          "cumKm": 12.008,
          "cumMin": 40.03
        },
        {
          "slug": "cha-profiti-ilia-3",
          "seq": 32,
          "cumKm": 12.309,
          "cumMin": 41.03
        },
        {
          "slug": "cha-profiti-ilia-2",
          "seq": 33,
          "cumKm": 12.366,
          "cumMin": 41.22
        },
        {
          "slug": "cha-nea-froudia",
          "seq": 34,
          "cumKm": 12.516,
          "cumMin": 41.72
        },
        {
          "slug": "cha-georgiou-papadaki",
          "seq": 35,
          "cumKm": 12.786,
          "cumMin": 42.62
        },
        {
          "slug": "cha-amfimaliou",
          "seq": 36,
          "cumKm": 13.166,
          "cumMin": 43.89
        },
        {
          "slug": "cha-evangelistrias",
          "seq": 37,
          "cumKm": 13.369,
          "cumMin": 44.56
        },
        {
          "slug": "cha-treis-kamares",
          "seq": 38,
          "cumKm": 13.672,
          "cumMin": 45.57
        },
        {
          "slug": "cha-residence-of-el-venizelos",
          "seq": 39,
          "cumKm": 13.968,
          "cumMin": 46.56
        },
        {
          "slug": "cha-proxeneio",
          "seq": 40,
          "cumKm": 14.202,
          "cumMin": 47.34
        },
        {
          "slug": "cha-chonoloulou-2",
          "seq": 41,
          "cumKm": 14.548,
          "cumMin": 48.49
        },
        {
          "slug": "cha-iroon-polytechneiou-2",
          "seq": 42,
          "cumKm": 15.012,
          "cumMin": 50.04
        },
        {
          "slug": "cha-kamaraki-2",
          "seq": 43,
          "cumKm": 15.295,
          "cumMin": 50.98
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 44,
          "cumKm": 15.648,
          "cumMin": 52.16
        },
        {
          "slug": "cha-olympia-2",
          "seq": 45,
          "cumKm": 16.055,
          "cumMin": 53.52
        },
        {
          "slug": "cha-roloi-2",
          "seq": 46,
          "cumKm": 16.367,
          "cumMin": 54.56
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 47,
          "cumKm": 16.696,
          "cumMin": 55.65
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 48,
          "cumKm": 16.89,
          "cumMin": 56.3
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 49,
          "cumKm": 17.189,
          "cumMin": 57.3
        },
        {
          "slug": "cha-skalidi",
          "seq": 50,
          "cumKm": 17.518,
          "cumMin": 58.39
        },
        {
          "slug": "cha-gerasimou-pardali",
          "seq": 51,
          "cumKm": 17.893,
          "cumMin": 59.64
        },
        {
          "slug": "cha-koustogerakou",
          "seq": 52,
          "cumKm": 18.287,
          "cumMin": 60.96
        },
        {
          "slug": "cha-ag-grigorios",
          "seq": 53,
          "cumKm": 18.735,
          "cumMin": 62.45
        },
        {
          "slug": "cha-ts-nea-chora",
          "seq": 54,
          "cumKm": 19.122,
          "cumMin": 63.74
        }
      ]
    },
    {
      "code": "049",
      "lineCode": "CHA-11",
      "name": "NEA ChORA - ChALEPA - Sody",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-nea-chora",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-georgakakidon",
          "seq": 1,
          "cumKm": 0.391,
          "cumMin": 1.3
        },
        {
          "slug": "cha-georgakakidon-kladisos",
          "seq": 2,
          "cumKm": 0.722,
          "cumMin": 2.41
        },
        {
          "slug": "cha-varousi-2",
          "seq": 3,
          "cumKm": 1.028,
          "cumMin": 3.43
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 4,
          "cumKm": 1.439,
          "cumMin": 4.8
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 5,
          "cumKm": 1.981,
          "cumMin": 6.6
        },
        {
          "slug": "cha-kydonias",
          "seq": 6,
          "cumKm": 2.225,
          "cumMin": 7.42
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 7,
          "cumKm": 2.516,
          "cumMin": 8.39
        },
        {
          "slug": "cha-national-bank",
          "seq": 8,
          "cumKm": 3.043,
          "cumMin": 10.14
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 9,
          "cumKm": 3.301,
          "cumMin": 11
        },
        {
          "slug": "cha-roloi",
          "seq": 10,
          "cumKm": 3.682,
          "cumMin": 12.27
        },
        {
          "slug": "cha-olympia",
          "seq": 11,
          "cumKm": 4.016,
          "cumMin": 13.39
        },
        {
          "slug": "cha-dikastiria",
          "seq": 12,
          "cumKm": 4.355,
          "cumMin": 14.52
        },
        {
          "slug": "cha-kamaraki",
          "seq": 13,
          "cumKm": 4.726,
          "cumMin": 15.75
        },
        {
          "slug": "cha-iroon-polytechneiou",
          "seq": 14,
          "cumKm": 5.026,
          "cumMin": 16.75
        },
        {
          "slug": "cha-chonoloulou",
          "seq": 15,
          "cumKm": 5.233,
          "cumMin": 17.44
        },
        {
          "slug": "cha-chonoloulou-3",
          "seq": 16,
          "cumKm": 5.639,
          "cumMin": 18.8
        },
        {
          "slug": "cha-archaeological-museum",
          "seq": 17,
          "cumKm": 5.996,
          "cumMin": 19.99
        },
        {
          "slug": "cha-treis-kamares-2",
          "seq": 18,
          "cumKm": 6.309,
          "cumMin": 21.03
        },
        {
          "slug": "cha-evangelistria",
          "seq": 19,
          "cumKm": 6.642,
          "cumMin": 22.14
        },
        {
          "slug": "cha-athanasiou-diakou",
          "seq": 20,
          "cumKm": 7.019,
          "cumMin": 23.4
        },
        {
          "slug": "cha-parko",
          "seq": 21,
          "cumKm": 7.327,
          "cumMin": 24.42
        },
        {
          "slug": "cha-nea-froudia-2",
          "seq": 22,
          "cumKm": 7.532,
          "cumMin": 25.11
        },
        {
          "slug": "cha-profiti-ilia-2",
          "seq": 23,
          "cumKm": 7.714,
          "cumMin": 25.71
        },
        {
          "slug": "cha-papaflessa",
          "seq": 24,
          "cumKm": 8.081,
          "cumMin": 26.94
        },
        {
          "slug": "cha-schools",
          "seq": 25,
          "cumKm": 9.066,
          "cumMin": 30.22
        },
        {
          "slug": "cha-venizelon-graves-3",
          "seq": 26,
          "cumKm": 9.388,
          "cumMin": 31.29
        },
        {
          "slug": "cha-koukouvagia",
          "seq": 27,
          "cumKm": 9.646,
          "cumMin": 32.15
        },
        {
          "slug": "cha-agorastaki",
          "seq": 28,
          "cumKm": 9.818,
          "cumMin": 32.73
        },
        {
          "slug": "cha-adamantiou-aretaki",
          "seq": 29,
          "cumKm": 10.076,
          "cumMin": 33.59
        },
        {
          "slug": "cha-emmanouil-symvoulaki",
          "seq": 30,
          "cumKm": 10.207,
          "cumMin": 34.02
        },
        {
          "slug": "cha-ioanni-kalogeri",
          "seq": 31,
          "cumKm": 10.279,
          "cumMin": 34.26
        },
        {
          "slug": "cha-koumpeli",
          "seq": 32,
          "cumKm": 10.495,
          "cumMin": 34.98
        },
        {
          "slug": "cha-mousiko-scholeio-chanion-2",
          "seq": 33,
          "cumKm": 10.999,
          "cumMin": 36.66
        },
        {
          "slug": "cha-profiti-ilia-3",
          "seq": 34,
          "cumKm": 11.3,
          "cumMin": 37.67
        },
        {
          "slug": "cha-nea-froudia",
          "seq": 35,
          "cumKm": 11.397,
          "cumMin": 37.99
        },
        {
          "slug": "cha-georgiou-papadaki",
          "seq": 36,
          "cumKm": 11.666,
          "cumMin": 38.89
        },
        {
          "slug": "cha-amfimaliou",
          "seq": 37,
          "cumKm": 12.047,
          "cumMin": 40.16
        },
        {
          "slug": "cha-evangelistrias",
          "seq": 38,
          "cumKm": 12.25,
          "cumMin": 40.83
        },
        {
          "slug": "cha-treis-kamares",
          "seq": 39,
          "cumKm": 12.553,
          "cumMin": 41.84
        },
        {
          "slug": "cha-residence-of-el-venizelos",
          "seq": 40,
          "cumKm": 12.849,
          "cumMin": 42.83
        },
        {
          "slug": "cha-proxeneio",
          "seq": 41,
          "cumKm": 13.083,
          "cumMin": 43.61
        },
        {
          "slug": "cha-chonoloulou-2",
          "seq": 42,
          "cumKm": 13.429,
          "cumMin": 44.76
        },
        {
          "slug": "cha-iroon-polytechneiou-2",
          "seq": 43,
          "cumKm": 13.893,
          "cumMin": 46.31
        },
        {
          "slug": "cha-kamaraki-2",
          "seq": 44,
          "cumKm": 14.175,
          "cumMin": 47.25
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 45,
          "cumKm": 14.529,
          "cumMin": 48.43
        },
        {
          "slug": "cha-olympia-2",
          "seq": 46,
          "cumKm": 14.935,
          "cumMin": 49.78
        },
        {
          "slug": "cha-roloi-2",
          "seq": 47,
          "cumKm": 15.248,
          "cumMin": 50.83
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 48,
          "cumKm": 15.576,
          "cumMin": 51.92
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 49,
          "cumKm": 15.77,
          "cumMin": 52.57
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 50,
          "cumKm": 16.07,
          "cumMin": 53.57
        },
        {
          "slug": "cha-skalidi",
          "seq": 51,
          "cumKm": 16.398,
          "cumMin": 54.66
        },
        {
          "slug": "cha-gerasimou-pardali",
          "seq": 52,
          "cumKm": 16.773,
          "cumMin": 55.91
        },
        {
          "slug": "cha-koustogerakou",
          "seq": 53,
          "cumKm": 17.168,
          "cumMin": 57.23
        },
        {
          "slug": "cha-ag-grigorios",
          "seq": 54,
          "cumKm": 17.616,
          "cumMin": 58.72
        },
        {
          "slug": "cha-ts-nea-chora",
          "seq": 55,
          "cumKm": 18.003,
          "cumMin": 60.01
        }
      ]
    },
    {
      "code": "089",
      "lineCode": "CHA-11",
      "name": "NEA ChORA - ChALEPA(AKROTIRIOY)",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-nea-chora",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-georgakakidon",
          "seq": 1,
          "cumKm": 0.391,
          "cumMin": 1.3
        },
        {
          "slug": "cha-georgakakidon-kladisos",
          "seq": 2,
          "cumKm": 0.722,
          "cumMin": 2.41
        },
        {
          "slug": "cha-varousi-2",
          "seq": 3,
          "cumKm": 1.028,
          "cumMin": 3.43
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 4,
          "cumKm": 1.439,
          "cumMin": 4.8
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 5,
          "cumKm": 1.981,
          "cumMin": 6.6
        },
        {
          "slug": "cha-kydonias",
          "seq": 6,
          "cumKm": 2.225,
          "cumMin": 7.42
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 7,
          "cumKm": 2.516,
          "cumMin": 8.39
        },
        {
          "slug": "cha-national-bank",
          "seq": 8,
          "cumKm": 3.043,
          "cumMin": 10.14
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 9,
          "cumKm": 3.301,
          "cumMin": 11
        },
        {
          "slug": "cha-roloi",
          "seq": 10,
          "cumKm": 3.682,
          "cumMin": 12.27
        },
        {
          "slug": "cha-olympia",
          "seq": 11,
          "cumKm": 4.016,
          "cumMin": 13.39
        },
        {
          "slug": "cha-dikastiria",
          "seq": 12,
          "cumKm": 4.355,
          "cumMin": 14.52
        },
        {
          "slug": "cha-kamaraki",
          "seq": 13,
          "cumKm": 4.726,
          "cumMin": 15.75
        },
        {
          "slug": "cha-iroon-polytechneiou",
          "seq": 14,
          "cumKm": 5.026,
          "cumMin": 16.75
        },
        {
          "slug": "cha-chonoloulou",
          "seq": 15,
          "cumKm": 5.233,
          "cumMin": 17.44
        },
        {
          "slug": "cha-katsampa",
          "seq": 16,
          "cumKm": 5.912,
          "cumMin": 19.71
        },
        {
          "slug": "cha-meintani",
          "seq": 17,
          "cumKm": 6.341,
          "cumMin": 21.14
        },
        {
          "slug": "cha-agia-foteini",
          "seq": 18,
          "cumKm": 6.695,
          "cumMin": 22.32
        },
        {
          "slug": "cha-pyrgos",
          "seq": 19,
          "cumKm": 6.865,
          "cumMin": 22.88
        },
        {
          "slug": "cha-ergatikes-katoikies-2",
          "seq": 20,
          "cumKm": 7.098,
          "cumMin": 23.66
        },
        {
          "slug": "cha-andrianaki",
          "seq": 21,
          "cumKm": 7.513,
          "cumMin": 25.04
        },
        {
          "slug": "cha-protomi-iliaki",
          "seq": 22,
          "cumKm": 7.866,
          "cumMin": 26.22
        },
        {
          "slug": "cha-hotel-akrotiri",
          "seq": 23,
          "cumKm": 8.178,
          "cumMin": 27.26
        },
        {
          "slug": "cha-profiti-ilia-3",
          "seq": 24,
          "cumKm": 8.503,
          "cumMin": 28.34
        },
        {
          "slug": "cha-nea-froudia",
          "seq": 25,
          "cumKm": 8.6,
          "cumMin": 28.67
        },
        {
          "slug": "cha-georgiou-papadaki",
          "seq": 26,
          "cumKm": 8.869,
          "cumMin": 29.56
        },
        {
          "slug": "cha-amfimaliou",
          "seq": 27,
          "cumKm": 9.25,
          "cumMin": 30.83
        },
        {
          "slug": "cha-evangelistrias",
          "seq": 28,
          "cumKm": 9.453,
          "cumMin": 31.51
        },
        {
          "slug": "cha-treis-kamares",
          "seq": 29,
          "cumKm": 9.756,
          "cumMin": 32.52
        },
        {
          "slug": "cha-residence-of-el-venizelos",
          "seq": 30,
          "cumKm": 10.052,
          "cumMin": 33.51
        },
        {
          "slug": "cha-proxeneio",
          "seq": 31,
          "cumKm": 10.286,
          "cumMin": 34.29
        },
        {
          "slug": "cha-chonoloulou-2",
          "seq": 32,
          "cumKm": 10.632,
          "cumMin": 35.44
        },
        {
          "slug": "cha-iroon-polytechneiou-2",
          "seq": 33,
          "cumKm": 11.096,
          "cumMin": 36.99
        },
        {
          "slug": "cha-kamaraki-2",
          "seq": 34,
          "cumKm": 11.379,
          "cumMin": 37.93
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 35,
          "cumKm": 11.732,
          "cumMin": 39.11
        },
        {
          "slug": "cha-olympia-2",
          "seq": 36,
          "cumKm": 12.138,
          "cumMin": 40.46
        },
        {
          "slug": "cha-roloi-2",
          "seq": 37,
          "cumKm": 12.451,
          "cumMin": 41.5
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 38,
          "cumKm": 12.78,
          "cumMin": 42.6
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 39,
          "cumKm": 12.974,
          "cumMin": 43.25
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 40,
          "cumKm": 13.273,
          "cumMin": 44.24
        },
        {
          "slug": "cha-skalidi",
          "seq": 41,
          "cumKm": 13.602,
          "cumMin": 45.34
        },
        {
          "slug": "cha-m-metaxaki",
          "seq": 42,
          "cumKm": 13.843,
          "cumMin": 46.14
        },
        {
          "slug": "cha-gerasimou-pardali",
          "seq": 43,
          "cumKm": 13.977,
          "cumMin": 46.59
        },
        {
          "slug": "cha-koustogerakou",
          "seq": 44,
          "cumKm": 14.372,
          "cumMin": 47.91
        },
        {
          "slug": "cha-ag-grigorios",
          "seq": 45,
          "cumKm": 14.82,
          "cumMin": 49.4
        },
        {
          "slug": "cha-ts-nea-chora",
          "seq": 46,
          "cumKm": 15.207,
          "cumMin": 50.69
        }
      ]
    },
    {
      "code": "086",
      "lineCode": "CHA-12",
      "name": "PIThARI - Korakies.",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-kounoupidianon-square-2",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-aristotelous",
          "seq": 1,
          "cumKm": 0.323,
          "cumMin": 1.08
        },
        {
          "slug": "cha-evangelistrias-2",
          "seq": 2,
          "cumKm": 0.709,
          "cumMin": 2.36
        },
        {
          "slug": "cha-timiou-prodromou",
          "seq": 3,
          "cumKm": 1.007,
          "cumMin": 3.36
        },
        {
          "slug": "cha-agiou-antoniou",
          "seq": 4,
          "cumKm": 1.541,
          "cumMin": 5.14
        },
        {
          "slug": "cha-olympion",
          "seq": 5,
          "cumKm": 1.903,
          "cumMin": 6.34
        },
        {
          "slug": "cha-pithari",
          "seq": 6,
          "cumKm": 2.178,
          "cumMin": 7.26
        },
        {
          "slug": "cha-eleftheriou-venizelou",
          "seq": 7,
          "cumKm": 3.461,
          "cumMin": 11.54
        },
        {
          "slug": "cha-gipedo-basket",
          "seq": 8,
          "cumKm": 3.776,
          "cumMin": 12.59
        },
        {
          "slug": "cha-paidiki-chara",
          "seq": 9,
          "cumKm": 4.076,
          "cumMin": 13.59
        },
        {
          "slug": "cha-iera-moni-ag-prodromou",
          "seq": 10,
          "cumKm": 4.33,
          "cumMin": 14.43
        },
        {
          "slug": "cha-timiou-prodromou-2",
          "seq": 11,
          "cumKm": 4.705,
          "cumMin": 15.68
        },
        {
          "slug": "cha-iridos",
          "seq": 12,
          "cumKm": 5.172,
          "cumMin": 17.24
        },
        {
          "slug": "cha-aristotelous-2",
          "seq": 13,
          "cumKm": 5.561,
          "cumMin": 18.54
        },
        {
          "slug": "cha-kounoupidianon-square-3",
          "seq": 14,
          "cumKm": 5.847,
          "cumMin": 19.49
        }
      ]
    },
    {
      "code": "087",
      "lineCode": "CHA-12",
      "name": "AG. Onoyfrios.",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-kounoupidianon-square-3",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-knosou",
          "seq": 1,
          "cumKm": 0.651,
          "cumMin": 2.17
        },
        {
          "slug": "cha-n-kazantzaki",
          "seq": 2,
          "cumKm": 1.357,
          "cumMin": 4.52
        },
        {
          "slug": "cha-dexamenis",
          "seq": 3,
          "cumKm": 2.002,
          "cumMin": 6.67
        },
        {
          "slug": "cha-k-manou",
          "seq": 4,
          "cumKm": 2.959,
          "cumMin": 9.86
        },
        {
          "slug": "cha-kalergi",
          "seq": 5,
          "cumKm": 3.336,
          "cumMin": 11.12
        },
        {
          "slug": "cha-theotokopoulou",
          "seq": 6,
          "cumKm": 3.676,
          "cumMin": 12.25
        },
        {
          "slug": "cha-arkadiou",
          "seq": 7,
          "cumKm": 3.957,
          "cumMin": 13.19
        },
        {
          "slug": "cha-ag-fanouriou-4",
          "seq": 8,
          "cumKm": 4.405,
          "cumMin": 14.68
        },
        {
          "slug": "cha-kazantzaki",
          "seq": 9,
          "cumKm": 4.943,
          "cumMin": 16.48
        },
        {
          "slug": "cha-knosou-2",
          "seq": 10,
          "cumKm": 5.792,
          "cumMin": 19.31
        },
        {
          "slug": "cha-kounoupidianon-square-2",
          "seq": 11,
          "cumKm": 6.448,
          "cumMin": 21.49
        }
      ]
    },
    {
      "code": "088",
      "lineCode": "CHA-12",
      "name": "Kampani.",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-kounoupidianon-square-2",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-omirou",
          "seq": 1,
          "cumKm": 0.377,
          "cumMin": 1.26
        },
        {
          "slug": "cha-parodos-akrotiriou",
          "seq": 2,
          "cumKm": 1.028,
          "cumMin": 3.43
        },
        {
          "slug": "cha-athinas-tzougkaris",
          "seq": 3,
          "cumKm": 1.434,
          "cumMin": 4.78
        },
        {
          "slug": "cha-plakoures",
          "seq": 4,
          "cumKm": 1.712,
          "cumMin": 5.71
        },
        {
          "slug": "cha-1i-andreadaki",
          "seq": 5,
          "cumKm": 2.448,
          "cumMin": 8.16
        },
        {
          "slug": "cha-2i-andreadaki",
          "seq": 6,
          "cumKm": 2.674,
          "cumMin": 8.91
        },
        {
          "slug": "cha-g-kalamaridi",
          "seq": 7,
          "cumKm": 2.871,
          "cumMin": 9.57
        },
        {
          "slug": "cha-kampani",
          "seq": 8,
          "cumKm": 3.133,
          "cumMin": 10.44
        },
        {
          "slug": "cha-plakoures-3",
          "seq": 9,
          "cumKm": 4.064,
          "cumMin": 13.55
        },
        {
          "slug": "cha-filias-ton-laon",
          "seq": 10,
          "cumKm": 4.6,
          "cumMin": 15.33
        },
        {
          "slug": "cha-primary-school-kounoupidianon",
          "seq": 11,
          "cumKm": 4.904,
          "cumMin": 16.35
        },
        {
          "slug": "cha-ikarou-2",
          "seq": 12,
          "cumKm": 5.158,
          "cumMin": 17.19
        },
        {
          "slug": "cha-agion-panton",
          "seq": 13,
          "cumKm": 5.464,
          "cumMin": 18.21
        },
        {
          "slug": "cha-kounoupidianon-square-2",
          "seq": 14,
          "cumKm": 5.687,
          "cumMin": 18.96
        }
      ]
    },
    {
      "code": "034",
      "lineCode": "CHA-13",
      "name": "Limani Soydas - ChANIA - Limani Soydas",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-myloi-2",
          "seq": 1,
          "cumKm": 0.374,
          "cumMin": 1.25
        },
        {
          "slug": "cha-maridaki-2",
          "seq": 2,
          "cumKm": 1.283,
          "cumMin": 4.28
        },
        {
          "slug": "cha-avra-2",
          "seq": 3,
          "cumKm": 1.718,
          "cumMin": 5.73
        },
        {
          "slug": "cha-kokkinos-pyrgos-2",
          "seq": 4,
          "cumKm": 2.068,
          "cumMin": 6.89
        },
        {
          "slug": "cha-tsikalaria-2",
          "seq": 5,
          "cumKm": 2.547,
          "cumMin": 8.49
        },
        {
          "slug": "cha-maich-2",
          "seq": 6,
          "cumKm": 2.998,
          "cumMin": 9.99
        },
        {
          "slug": "cha-agrokipio-2",
          "seq": 7,
          "cumKm": 3.721,
          "cumMin": 12.4
        },
        {
          "slug": "cha-grafeia-anek-2",
          "seq": 8,
          "cumKm": 4.338,
          "cumMin": 14.46
        },
        {
          "slug": "cha-kamini-2",
          "seq": 9,
          "cumKm": 4.786,
          "cumMin": 15.95
        },
        {
          "slug": "cha-ika-2",
          "seq": 10,
          "cumKm": 5.313,
          "cumMin": 17.71
        },
        {
          "slug": "cha-kalykas-2",
          "seq": 11,
          "cumKm": 5.799,
          "cumMin": 19.33
        },
        {
          "slug": "cha-ag-stefanos",
          "seq": 12,
          "cumKm": 6.152,
          "cumMin": 20.51
        },
        {
          "slug": "cha-police-department",
          "seq": 13,
          "cumKm": 6.56,
          "cumMin": 21.87
        },
        {
          "slug": "cha-nearchou",
          "seq": 14,
          "cumKm": 6.87,
          "cumMin": 22.9
        },
        {
          "slug": "cha-war-museum",
          "seq": 15,
          "cumKm": 7.381,
          "cumMin": 24.6
        },
        {
          "slug": "cha-roloi-2",
          "seq": 16,
          "cumKm": 7.618,
          "cumMin": 25.39
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 17,
          "cumKm": 7.947,
          "cumMin": 26.49
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 18,
          "cumKm": 8.141,
          "cumMin": 27.14
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 19,
          "cumKm": 8.44,
          "cumMin": 28.13
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 20,
          "cumKm": 8.644,
          "cumMin": 28.81
        },
        {
          "slug": "cha-apokoronou",
          "seq": 21,
          "cumKm": 9.023,
          "cumMin": 30.08
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 22,
          "cumKm": 9.546,
          "cumMin": 31.82
        },
        {
          "slug": "cha-apteron",
          "seq": 23,
          "cumKm": 9.869,
          "cumMin": 32.9
        },
        {
          "slug": "cha-police-department-2",
          "seq": 24,
          "cumKm": 10.136,
          "cumMin": 33.79
        },
        {
          "slug": "cha-agios-stefanos-2",
          "seq": 25,
          "cumKm": 10.652,
          "cumMin": 35.51
        },
        {
          "slug": "cha-kalykas",
          "seq": 26,
          "cumKm": 11.035,
          "cumMin": 36.78
        },
        {
          "slug": "cha-ika",
          "seq": 27,
          "cumKm": 11.415,
          "cumMin": 38.05
        },
        {
          "slug": "cha-kamini",
          "seq": 28,
          "cumKm": 12.135,
          "cumMin": 40.45
        },
        {
          "slug": "cha-grafeia-anek",
          "seq": 29,
          "cumKm": 12.487,
          "cumMin": 41.62
        },
        {
          "slug": "cha-agrokipio",
          "seq": 30,
          "cumKm": 13.006,
          "cumMin": 43.35
        },
        {
          "slug": "cha-maich",
          "seq": 31,
          "cumKm": 13.593,
          "cumMin": 45.31
        },
        {
          "slug": "cha-tsikalaria",
          "seq": 32,
          "cumKm": 14.332,
          "cumMin": 47.77
        },
        {
          "slug": "cha-kokkinos-pyrgos",
          "seq": 33,
          "cumKm": 14.706,
          "cumMin": 49.02
        },
        {
          "slug": "cha-avra",
          "seq": 34,
          "cumKm": 14.955,
          "cumMin": 49.85
        },
        {
          "slug": "cha-kato-souda",
          "seq": 35,
          "cumKm": 15.243,
          "cumMin": 50.81
        },
        {
          "slug": "cha-maridaki",
          "seq": 36,
          "cumKm": 15.488,
          "cumMin": 51.63
        },
        {
          "slug": "cha-soudas-schools",
          "seq": 37,
          "cumKm": 15.989,
          "cumMin": 53.3
        },
        {
          "slug": "cha-myloi",
          "seq": 38,
          "cumKm": 16.418,
          "cumMin": 54.73
        },
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 39,
          "cumKm": 16.789,
          "cumMin": 55.96
        }
      ]
    },
    {
      "code": "036",
      "lineCode": "CHA-13",
      "name": "Limani Soydas - ChANIA - NNK",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-myloi-2",
          "seq": 1,
          "cumKm": 0.374,
          "cumMin": 1.25
        },
        {
          "slug": "cha-maridaki-2",
          "seq": 2,
          "cumKm": 1.283,
          "cumMin": 4.28
        },
        {
          "slug": "cha-avra-2",
          "seq": 3,
          "cumKm": 1.718,
          "cumMin": 5.73
        },
        {
          "slug": "cha-kokkinos-pyrgos-2",
          "seq": 4,
          "cumKm": 2.068,
          "cumMin": 6.89
        },
        {
          "slug": "cha-tsikalaria-2",
          "seq": 5,
          "cumKm": 2.547,
          "cumMin": 8.49
        },
        {
          "slug": "cha-maich-2",
          "seq": 6,
          "cumKm": 2.998,
          "cumMin": 9.99
        },
        {
          "slug": "cha-agrokipio-2",
          "seq": 7,
          "cumKm": 3.721,
          "cumMin": 12.4
        },
        {
          "slug": "cha-grafeia-anek-2",
          "seq": 8,
          "cumKm": 4.338,
          "cumMin": 14.46
        },
        {
          "slug": "cha-kamini-2",
          "seq": 9,
          "cumKm": 4.786,
          "cumMin": 15.95
        },
        {
          "slug": "cha-ika-2",
          "seq": 10,
          "cumKm": 5.313,
          "cumMin": 17.71
        },
        {
          "slug": "cha-kalykas-2",
          "seq": 11,
          "cumKm": 5.799,
          "cumMin": 19.33
        },
        {
          "slug": "cha-ag-stefanos",
          "seq": 12,
          "cumKm": 6.152,
          "cumMin": 20.51
        },
        {
          "slug": "cha-police-department",
          "seq": 13,
          "cumKm": 6.56,
          "cumMin": 21.87
        },
        {
          "slug": "cha-nearchou",
          "seq": 14,
          "cumKm": 6.87,
          "cumMin": 22.9
        },
        {
          "slug": "cha-war-museum",
          "seq": 15,
          "cumKm": 7.381,
          "cumMin": 24.6
        },
        {
          "slug": "cha-roloi-2",
          "seq": 16,
          "cumKm": 7.618,
          "cumMin": 25.39
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 17,
          "cumKm": 7.947,
          "cumMin": 26.49
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 18,
          "cumKm": 8.141,
          "cumMin": 27.14
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 19,
          "cumKm": 8.44,
          "cumMin": 28.13
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 20,
          "cumKm": 8.644,
          "cumMin": 28.81
        },
        {
          "slug": "cha-apokoronou",
          "seq": 21,
          "cumKm": 9.023,
          "cumMin": 30.08
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 22,
          "cumKm": 9.546,
          "cumMin": 31.82
        },
        {
          "slug": "cha-apteron",
          "seq": 23,
          "cumKm": 9.869,
          "cumMin": 32.9
        },
        {
          "slug": "cha-police-department-2",
          "seq": 24,
          "cumKm": 10.136,
          "cumMin": 33.79
        },
        {
          "slug": "cha-agios-stefanos-2",
          "seq": 25,
          "cumKm": 10.652,
          "cumMin": 35.51
        },
        {
          "slug": "cha-kalykas",
          "seq": 26,
          "cumKm": 11.035,
          "cumMin": 36.78
        },
        {
          "slug": "cha-ika",
          "seq": 27,
          "cumKm": 11.415,
          "cumMin": 38.05
        },
        {
          "slug": "cha-kamini",
          "seq": 28,
          "cumKm": 12.135,
          "cumMin": 40.45
        },
        {
          "slug": "cha-grafeia-anek",
          "seq": 29,
          "cumKm": 12.487,
          "cumMin": 41.62
        },
        {
          "slug": "cha-agrokipio",
          "seq": 30,
          "cumKm": 13.006,
          "cumMin": 43.35
        },
        {
          "slug": "cha-maich",
          "seq": 31,
          "cumKm": 13.593,
          "cumMin": 45.31
        },
        {
          "slug": "cha-tsikalaria",
          "seq": 32,
          "cumKm": 14.332,
          "cumMin": 47.77
        },
        {
          "slug": "cha-kokkinos-pyrgos",
          "seq": 33,
          "cumKm": 14.706,
          "cumMin": 49.02
        },
        {
          "slug": "cha-avra",
          "seq": 34,
          "cumKm": 14.955,
          "cumMin": 49.85
        },
        {
          "slug": "cha-maridaki-3",
          "seq": 35,
          "cumKm": 15.441,
          "cumMin": 51.47
        },
        {
          "slug": "cha-soudas-schools",
          "seq": 36,
          "cumKm": 15.961,
          "cumMin": 53.2
        },
        {
          "slug": "cha-agios-nikolaos",
          "seq": 37,
          "cumKm": 16.385,
          "cumMin": 54.62
        },
        {
          "slug": "cha-soudas-square",
          "seq": 38,
          "cumKm": 16.902,
          "cumMin": 56.34
        },
        {
          "slug": "cha-gipedo-nafstathmou",
          "seq": 39,
          "cumKm": 17.709,
          "cumMin": 59.03
        },
        {
          "slug": "cha-crete-naval-hospital",
          "seq": 40,
          "cumKm": 18.472,
          "cumMin": 61.57
        },
        {
          "slug": "cha-leschi-axiomatikon",
          "seq": 41,
          "cumKm": 18.714,
          "cumMin": 62.38
        },
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 42,
          "cumKm": 20.226,
          "cumMin": 67.42
        }
      ]
    },
    {
      "code": "037",
      "lineCode": "CHA-13",
      "name": "Limani Soydas - ChANIA - Tsikalaria",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-myloi-2",
          "seq": 1,
          "cumKm": 0.374,
          "cumMin": 1.25
        },
        {
          "slug": "cha-maridaki-2",
          "seq": 2,
          "cumKm": 1.283,
          "cumMin": 4.28
        },
        {
          "slug": "cha-avra-2",
          "seq": 3,
          "cumKm": 1.718,
          "cumMin": 5.73
        },
        {
          "slug": "cha-kokkinos-pyrgos-2",
          "seq": 4,
          "cumKm": 2.068,
          "cumMin": 6.89
        },
        {
          "slug": "cha-tsikalaria-2",
          "seq": 5,
          "cumKm": 2.547,
          "cumMin": 8.49
        },
        {
          "slug": "cha-maich-2",
          "seq": 6,
          "cumKm": 2.998,
          "cumMin": 9.99
        },
        {
          "slug": "cha-agrokipio-2",
          "seq": 7,
          "cumKm": 3.721,
          "cumMin": 12.4
        },
        {
          "slug": "cha-grafeia-anek-2",
          "seq": 8,
          "cumKm": 4.338,
          "cumMin": 14.46
        },
        {
          "slug": "cha-kamini-2",
          "seq": 9,
          "cumKm": 4.786,
          "cumMin": 15.95
        },
        {
          "slug": "cha-ika-2",
          "seq": 10,
          "cumKm": 5.313,
          "cumMin": 17.71
        },
        {
          "slug": "cha-kalykas-2",
          "seq": 11,
          "cumKm": 5.799,
          "cumMin": 19.33
        },
        {
          "slug": "cha-ag-stefanos",
          "seq": 12,
          "cumKm": 6.152,
          "cumMin": 20.51
        },
        {
          "slug": "cha-police-department",
          "seq": 13,
          "cumKm": 6.56,
          "cumMin": 21.87
        },
        {
          "slug": "cha-nearchou",
          "seq": 14,
          "cumKm": 6.87,
          "cumMin": 22.9
        },
        {
          "slug": "cha-war-museum",
          "seq": 15,
          "cumKm": 7.381,
          "cumMin": 24.6
        },
        {
          "slug": "cha-roloi-2",
          "seq": 16,
          "cumKm": 7.618,
          "cumMin": 25.39
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 17,
          "cumKm": 7.947,
          "cumMin": 26.49
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 18,
          "cumKm": 8.141,
          "cumMin": 27.14
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 19,
          "cumKm": 8.44,
          "cumMin": 28.13
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 20,
          "cumKm": 8.644,
          "cumMin": 28.81
        },
        {
          "slug": "cha-apokoronou",
          "seq": 21,
          "cumKm": 9.023,
          "cumMin": 30.08
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 22,
          "cumKm": 9.546,
          "cumMin": 31.82
        },
        {
          "slug": "cha-apteron",
          "seq": 23,
          "cumKm": 9.869,
          "cumMin": 32.9
        },
        {
          "slug": "cha-police-department-2",
          "seq": 24,
          "cumKm": 10.136,
          "cumMin": 33.79
        },
        {
          "slug": "cha-agios-stefanos-2",
          "seq": 25,
          "cumKm": 10.652,
          "cumMin": 35.51
        },
        {
          "slug": "cha-kalykas",
          "seq": 26,
          "cumKm": 11.035,
          "cumMin": 36.78
        },
        {
          "slug": "cha-ika",
          "seq": 27,
          "cumKm": 11.415,
          "cumMin": 38.05
        },
        {
          "slug": "cha-kamini",
          "seq": 28,
          "cumKm": 12.135,
          "cumMin": 40.45
        },
        {
          "slug": "cha-grafeia-anek",
          "seq": 29,
          "cumKm": 12.487,
          "cumMin": 41.62
        },
        {
          "slug": "cha-agrokipio",
          "seq": 30,
          "cumKm": 13.006,
          "cumMin": 43.35
        },
        {
          "slug": "cha-maich",
          "seq": 31,
          "cumKm": 13.593,
          "cumMin": 45.31
        },
        {
          "slug": "cha-junction-tsikalarion",
          "seq": 32,
          "cumKm": 14.254,
          "cumMin": 47.51
        },
        {
          "slug": "cha-tsikalarion",
          "seq": 33,
          "cumKm": 14.931,
          "cumMin": 49.77
        },
        {
          "slug": "cha-nikolaou-skoula-2",
          "seq": 34,
          "cumKm": 15.38,
          "cumMin": 51.27
        },
        {
          "slug": "cha-k-karyotaki",
          "seq": 35,
          "cumKm": 15.887,
          "cumMin": 52.96
        },
        {
          "slug": "cha-ch-giannari",
          "seq": 36,
          "cumKm": 16.186,
          "cumMin": 53.95
        },
        {
          "slug": "cha-primary-school",
          "seq": 37,
          "cumKm": 16.552,
          "cumMin": 55.17
        },
        {
          "slug": "cha-parallilos-ethniki-odou",
          "seq": 38,
          "cumKm": 17.048,
          "cumMin": 56.83
        },
        {
          "slug": "cha-nikolaou-skoula-3",
          "seq": 39,
          "cumKm": 17.402,
          "cumMin": 58.01
        },
        {
          "slug": "cha-tsikalarion-2",
          "seq": 40,
          "cumKm": 17.875,
          "cumMin": 59.58
        },
        {
          "slug": "cha-junction-tsikalarion-2",
          "seq": 41,
          "cumKm": 18.409,
          "cumMin": 61.36
        },
        {
          "slug": "cha-kokkinos-pyrgos",
          "seq": 42,
          "cumKm": 18.825,
          "cumMin": 62.75
        },
        {
          "slug": "cha-avra",
          "seq": 43,
          "cumKm": 19.074,
          "cumMin": 63.58
        },
        {
          "slug": "cha-kato-souda",
          "seq": 44,
          "cumKm": 19.362,
          "cumMin": 64.54
        },
        {
          "slug": "cha-maridaki",
          "seq": 45,
          "cumKm": 19.606,
          "cumMin": 65.35
        },
        {
          "slug": "cha-soudas-schools",
          "seq": 46,
          "cumKm": 20.108,
          "cumMin": 67.03
        },
        {
          "slug": "cha-myloi",
          "seq": 47,
          "cumKm": 20.536,
          "cumMin": 68.45
        },
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 48,
          "cumKm": 20.908,
          "cumMin": 69.69
        }
      ]
    },
    {
      "code": "039",
      "lineCode": "CHA-13",
      "name": "Limani Soydas - ChANIA(TERMATISMOS)",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-myloi-2",
          "seq": 1,
          "cumKm": 0.374,
          "cumMin": 1.25
        },
        {
          "slug": "cha-maridaki-2",
          "seq": 2,
          "cumKm": 1.283,
          "cumMin": 4.28
        },
        {
          "slug": "cha-avra-2",
          "seq": 3,
          "cumKm": 1.718,
          "cumMin": 5.73
        },
        {
          "slug": "cha-kokkinos-pyrgos-2",
          "seq": 4,
          "cumKm": 2.068,
          "cumMin": 6.89
        },
        {
          "slug": "cha-tsikalaria-2",
          "seq": 5,
          "cumKm": 2.547,
          "cumMin": 8.49
        },
        {
          "slug": "cha-maich-2",
          "seq": 6,
          "cumKm": 2.998,
          "cumMin": 9.99
        },
        {
          "slug": "cha-agrokipio-2",
          "seq": 7,
          "cumKm": 3.721,
          "cumMin": 12.4
        },
        {
          "slug": "cha-grafeia-anek-2",
          "seq": 8,
          "cumKm": 4.338,
          "cumMin": 14.46
        },
        {
          "slug": "cha-kamini-2",
          "seq": 9,
          "cumKm": 4.786,
          "cumMin": 15.95
        },
        {
          "slug": "cha-ika-2",
          "seq": 10,
          "cumKm": 5.313,
          "cumMin": 17.71
        },
        {
          "slug": "cha-kalykas-2",
          "seq": 11,
          "cumKm": 5.799,
          "cumMin": 19.33
        },
        {
          "slug": "cha-police-department",
          "seq": 12,
          "cumKm": 6.556,
          "cumMin": 21.85
        },
        {
          "slug": "cha-nearchou",
          "seq": 13,
          "cumKm": 6.866,
          "cumMin": 22.89
        },
        {
          "slug": "cha-war-museum",
          "seq": 14,
          "cumKm": 7.377,
          "cumMin": 24.59
        },
        {
          "slug": "cha-roloi-2",
          "seq": 15,
          "cumKm": 7.614,
          "cumMin": 25.38
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 16,
          "cumKm": 7.942,
          "cumMin": 26.47
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 17,
          "cumKm": 8.137,
          "cumMin": 27.12
        }
      ]
    },
    {
      "code": "040",
      "lineCode": "CHA-13",
      "name": "Limani Soydas - ChANIA(TERMATISMOS)",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 1,
          "cumKm": 0.3,
          "cumMin": 1
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 2,
          "cumKm": 0.503,
          "cumMin": 1.68
        },
        {
          "slug": "cha-apokoronou",
          "seq": 3,
          "cumKm": 0.882,
          "cumMin": 2.94
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 4,
          "cumKm": 1.405,
          "cumMin": 4.68
        },
        {
          "slug": "cha-apteron",
          "seq": 5,
          "cumKm": 1.728,
          "cumMin": 5.76
        },
        {
          "slug": "cha-police-department-2",
          "seq": 6,
          "cumKm": 1.995,
          "cumMin": 6.65
        },
        {
          "slug": "cha-agios-stefanos-2",
          "seq": 7,
          "cumKm": 2.511,
          "cumMin": 8.37
        },
        {
          "slug": "cha-kalykas",
          "seq": 8,
          "cumKm": 2.895,
          "cumMin": 9.65
        },
        {
          "slug": "cha-ika",
          "seq": 9,
          "cumKm": 3.275,
          "cumMin": 10.92
        },
        {
          "slug": "cha-kamini",
          "seq": 10,
          "cumKm": 3.994,
          "cumMin": 13.31
        },
        {
          "slug": "cha-grafeia-anek",
          "seq": 11,
          "cumKm": 4.346,
          "cumMin": 14.49
        },
        {
          "slug": "cha-agrokipio",
          "seq": 12,
          "cumKm": 4.866,
          "cumMin": 16.22
        },
        {
          "slug": "cha-maich",
          "seq": 13,
          "cumKm": 5.452,
          "cumMin": 18.17
        },
        {
          "slug": "cha-tsikalaria",
          "seq": 14,
          "cumKm": 6.192,
          "cumMin": 20.64
        },
        {
          "slug": "cha-kokkinos-pyrgos",
          "seq": 15,
          "cumKm": 6.566,
          "cumMin": 21.89
        },
        {
          "slug": "cha-avra",
          "seq": 16,
          "cumKm": 6.814,
          "cumMin": 22.71
        },
        {
          "slug": "cha-kato-souda",
          "seq": 17,
          "cumKm": 7.103,
          "cumMin": 23.68
        },
        {
          "slug": "cha-maridaki",
          "seq": 18,
          "cumKm": 7.347,
          "cumMin": 24.49
        },
        {
          "slug": "cha-soudas-schools",
          "seq": 19,
          "cumKm": 7.848,
          "cumMin": 26.16
        },
        {
          "slug": "cha-myloi",
          "seq": 20,
          "cumKm": 8.277,
          "cumMin": 27.59
        },
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 21,
          "cumKm": 8.648,
          "cumMin": 28.83
        }
      ]
    },
    {
      "code": "041",
      "lineCode": "CHA-13",
      "name": "ChANIA - Tsikalaria - Limani Soydas",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 1,
          "cumKm": 0.3,
          "cumMin": 1
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 2,
          "cumKm": 0.503,
          "cumMin": 1.68
        },
        {
          "slug": "cha-apokoronou",
          "seq": 3,
          "cumKm": 0.882,
          "cumMin": 2.94
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 4,
          "cumKm": 1.405,
          "cumMin": 4.68
        },
        {
          "slug": "cha-apteron",
          "seq": 5,
          "cumKm": 1.728,
          "cumMin": 5.76
        },
        {
          "slug": "cha-police-department-2",
          "seq": 6,
          "cumKm": 1.995,
          "cumMin": 6.65
        },
        {
          "slug": "cha-agios-stefanos-2",
          "seq": 7,
          "cumKm": 2.511,
          "cumMin": 8.37
        },
        {
          "slug": "cha-kalykas",
          "seq": 8,
          "cumKm": 2.895,
          "cumMin": 9.65
        },
        {
          "slug": "cha-ika",
          "seq": 9,
          "cumKm": 3.275,
          "cumMin": 10.92
        },
        {
          "slug": "cha-kamini",
          "seq": 10,
          "cumKm": 3.994,
          "cumMin": 13.31
        },
        {
          "slug": "cha-grafeia-anek",
          "seq": 11,
          "cumKm": 4.346,
          "cumMin": 14.49
        },
        {
          "slug": "cha-agrokipio",
          "seq": 12,
          "cumKm": 4.866,
          "cumMin": 16.22
        },
        {
          "slug": "cha-maich",
          "seq": 13,
          "cumKm": 5.452,
          "cumMin": 18.17
        },
        {
          "slug": "cha-junction-tsikalarion",
          "seq": 14,
          "cumKm": 6.114,
          "cumMin": 20.38
        },
        {
          "slug": "cha-tsikalarion",
          "seq": 15,
          "cumKm": 6.791,
          "cumMin": 22.64
        },
        {
          "slug": "cha-nikolaou-skoula-2",
          "seq": 16,
          "cumKm": 7.24,
          "cumMin": 24.13
        },
        {
          "slug": "cha-k-karyotaki",
          "seq": 17,
          "cumKm": 7.746,
          "cumMin": 25.82
        },
        {
          "slug": "cha-ch-giannari",
          "seq": 18,
          "cumKm": 8.045,
          "cumMin": 26.82
        },
        {
          "slug": "cha-primary-school",
          "seq": 19,
          "cumKm": 8.411,
          "cumMin": 28.04
        },
        {
          "slug": "cha-parallilos-ethniki-odou",
          "seq": 20,
          "cumKm": 8.908,
          "cumMin": 29.69
        },
        {
          "slug": "cha-nikolaou-skoula-3",
          "seq": 21,
          "cumKm": 9.261,
          "cumMin": 30.87
        },
        {
          "slug": "cha-tsikalarion-2",
          "seq": 22,
          "cumKm": 9.734,
          "cumMin": 32.45
        },
        {
          "slug": "cha-junction-tsikalarion-2",
          "seq": 23,
          "cumKm": 10.268,
          "cumMin": 34.23
        },
        {
          "slug": "cha-kokkinos-pyrgos",
          "seq": 24,
          "cumKm": 10.684,
          "cumMin": 35.61
        },
        {
          "slug": "cha-avra",
          "seq": 25,
          "cumKm": 10.933,
          "cumMin": 36.44
        },
        {
          "slug": "cha-kato-souda",
          "seq": 26,
          "cumKm": 11.221,
          "cumMin": 37.4
        },
        {
          "slug": "cha-maridaki",
          "seq": 27,
          "cumKm": 11.466,
          "cumMin": 38.22
        },
        {
          "slug": "cha-soudas-schools",
          "seq": 28,
          "cumKm": 11.967,
          "cumMin": 39.89
        },
        {
          "slug": "cha-myloi",
          "seq": 29,
          "cumKm": 12.396,
          "cumMin": 41.32
        },
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 30,
          "cumKm": 12.767,
          "cumMin": 42.56
        }
      ]
    },
    {
      "code": "068",
      "lineCode": "CHA-13",
      "name": "ChANIA - NNK - Limani Soydas",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 1,
          "cumKm": 0.3,
          "cumMin": 1
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 2,
          "cumKm": 0.503,
          "cumMin": 1.68
        },
        {
          "slug": "cha-apokoronou",
          "seq": 3,
          "cumKm": 0.882,
          "cumMin": 2.94
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 4,
          "cumKm": 1.405,
          "cumMin": 4.68
        },
        {
          "slug": "cha-apteron",
          "seq": 5,
          "cumKm": 1.728,
          "cumMin": 5.76
        },
        {
          "slug": "cha-police-department-2",
          "seq": 6,
          "cumKm": 1.995,
          "cumMin": 6.65
        },
        {
          "slug": "cha-agios-stefanos-2",
          "seq": 7,
          "cumKm": 2.511,
          "cumMin": 8.37
        },
        {
          "slug": "cha-kalykas",
          "seq": 8,
          "cumKm": 2.895,
          "cumMin": 9.65
        },
        {
          "slug": "cha-ika",
          "seq": 9,
          "cumKm": 3.275,
          "cumMin": 10.92
        },
        {
          "slug": "cha-kamini",
          "seq": 10,
          "cumKm": 3.994,
          "cumMin": 13.31
        },
        {
          "slug": "cha-grafeia-anek",
          "seq": 11,
          "cumKm": 4.346,
          "cumMin": 14.49
        },
        {
          "slug": "cha-agrokipio",
          "seq": 12,
          "cumKm": 4.866,
          "cumMin": 16.22
        },
        {
          "slug": "cha-maich",
          "seq": 13,
          "cumKm": 5.452,
          "cumMin": 18.17
        },
        {
          "slug": "cha-tsikalaria",
          "seq": 14,
          "cumKm": 6.192,
          "cumMin": 20.64
        },
        {
          "slug": "cha-kokkinos-pyrgos",
          "seq": 15,
          "cumKm": 6.566,
          "cumMin": 21.89
        },
        {
          "slug": "cha-avra",
          "seq": 16,
          "cumKm": 6.814,
          "cumMin": 22.71
        },
        {
          "slug": "cha-maridaki-3",
          "seq": 17,
          "cumKm": 7.3,
          "cumMin": 24.33
        },
        {
          "slug": "cha-soudas-schools",
          "seq": 18,
          "cumKm": 7.82,
          "cumMin": 26.07
        },
        {
          "slug": "cha-agios-nikolaos",
          "seq": 19,
          "cumKm": 8.244,
          "cumMin": 27.48
        },
        {
          "slug": "cha-soudas-square",
          "seq": 20,
          "cumKm": 8.761,
          "cumMin": 29.2
        },
        {
          "slug": "cha-gipedo-nafstathmou",
          "seq": 21,
          "cumKm": 9.568,
          "cumMin": 31.89
        },
        {
          "slug": "cha-crete-naval-hospital",
          "seq": 22,
          "cumKm": 10.331,
          "cumMin": 34.44
        },
        {
          "slug": "cha-leschi-axiomatikon",
          "seq": 23,
          "cumKm": 10.574,
          "cumMin": 35.25
        },
        {
          "slug": "cha-ts-limani-soudas",
          "seq": 24,
          "cumKm": 12.086,
          "cumMin": 40.29
        }
      ]
    },
    {
      "code": "056",
      "lineCode": "CHA-15",
      "name": "Daratso Galata Kalamaki Panorama",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-markou-botsari-4",
          "seq": 1,
          "cumKm": 0.534,
          "cumMin": 1.78
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 2,
          "cumKm": 1.086,
          "cumMin": 3.62
        },
        {
          "slug": "cha-varousi",
          "seq": 3,
          "cumKm": 1.46,
          "cumMin": 4.87
        },
        {
          "slug": "cha-kladisos-3",
          "seq": 4,
          "cumKm": 1.996,
          "cumMin": 6.65
        },
        {
          "slug": "cha-parigoria",
          "seq": 5,
          "cumKm": 2.271,
          "cumMin": 7.57
        },
        {
          "slug": "cha-hotel-kedrissos",
          "seq": 6,
          "cumKm": 2.814,
          "cumMin": 9.38
        },
        {
          "slug": "cha-germaniko-pouli",
          "seq": 7,
          "cumKm": 3.126,
          "cumMin": 10.42
        },
        {
          "slug": "cha-triton-hotel-jumbo",
          "seq": 8,
          "cumKm": 3.585,
          "cumMin": 11.95
        },
        {
          "slug": "cha-chrysi-akti-jumbo",
          "seq": 9,
          "cumKm": 3.806,
          "cumMin": 12.69
        },
        {
          "slug": "cha-makrys-toichos",
          "seq": 10,
          "cumKm": 4.19,
          "cumMin": 13.97
        },
        {
          "slug": "cha-bmw",
          "seq": 11,
          "cumKm": 4.566,
          "cumMin": 15.22
        },
        {
          "slug": "cha-althea",
          "seq": 12,
          "cumKm": 4.997,
          "cumMin": 16.66
        },
        {
          "slug": "cha-lamprinaki",
          "seq": 13,
          "cumKm": 5.626,
          "cumMin": 18.75
        },
        {
          "slug": "cha-daratsos",
          "seq": 14,
          "cumKm": 6.045,
          "cumMin": 20.15
        },
        {
          "slug": "cha-star-daratsos",
          "seq": 15,
          "cumKm": 6.356,
          "cumMin": 21.19
        },
        {
          "slug": "cha-vechakidon",
          "seq": 16,
          "cumKm": 6.643,
          "cumMin": 22.14
        },
        {
          "slug": "cha-tourist-police",
          "seq": 17,
          "cumKm": 6.992,
          "cumMin": 23.31
        },
        {
          "slug": "cha-galatiano-perasma",
          "seq": 18,
          "cumKm": 7.232,
          "cumMin": 24.11
        },
        {
          "slug": "cha-galatas",
          "seq": 19,
          "cumKm": 7.45,
          "cumMin": 24.83
        },
        {
          "slug": "cha-bigkaza",
          "seq": 20,
          "cumKm": 7.721,
          "cumMin": 25.74
        },
        {
          "slug": "cha-ag-antonios",
          "seq": 21,
          "cumKm": 8.014,
          "cumMin": 26.71
        },
        {
          "slug": "cha-gipedo-galata",
          "seq": 22,
          "cumKm": 8.717,
          "cumMin": 29.06
        },
        {
          "slug": "cha-ag-georgiou",
          "seq": 23,
          "cumKm": 9.075,
          "cumMin": 30.25
        },
        {
          "slug": "cha-eirinis",
          "seq": 24,
          "cumKm": 9.487,
          "cumMin": 31.62
        },
        {
          "slug": "cha-ag-fanouriou",
          "seq": 25,
          "cumKm": 10.084,
          "cumMin": 33.61
        },
        {
          "slug": "cha-kalamaki",
          "seq": 26,
          "cumKm": 10.373,
          "cumMin": 34.58
        },
        {
          "slug": "cha-ag-dimitrios",
          "seq": 27,
          "cumKm": 10.852,
          "cumMin": 36.17
        },
        {
          "slug": "cha-panorama",
          "seq": 28,
          "cumKm": 11.132,
          "cumMin": 37.11
        },
        {
          "slug": "cha-ag-dimitrios-2",
          "seq": 29,
          "cumKm": 11.437,
          "cumMin": 38.12
        },
        {
          "slug": "cha-kalamaki-2",
          "seq": 30,
          "cumKm": 11.972,
          "cumMin": 39.91
        },
        {
          "slug": "cha-glaros-2",
          "seq": 31,
          "cumKm": 12.399,
          "cumMin": 41.33
        },
        {
          "slug": "cha-hotel-kalliston-2",
          "seq": 32,
          "cumKm": 12.736,
          "cumMin": 42.45
        },
        {
          "slug": "cha-strati-pantelaki-2",
          "seq": 33,
          "cumKm": 13.168,
          "cumMin": 43.89
        },
        {
          "slug": "cha-bmw-2",
          "seq": 34,
          "cumKm": 13.55,
          "cumMin": 45.17
        },
        {
          "slug": "cha-makrys-toichos-2",
          "seq": 35,
          "cumKm": 14.09,
          "cumMin": 46.97
        },
        {
          "slug": "cha-chrysi-akti-jumbo-2",
          "seq": 36,
          "cumKm": 14.453,
          "cumMin": 48.18
        },
        {
          "slug": "cha-triton-hotel",
          "seq": 37,
          "cumKm": 14.784,
          "cumMin": 49.28
        },
        {
          "slug": "cha-germaniko-pouli-2",
          "seq": 38,
          "cumKm": 15.125,
          "cumMin": 50.42
        },
        {
          "slug": "cha-hotel-kedrissos-2",
          "seq": 39,
          "cumKm": 15.439,
          "cumMin": 51.46
        },
        {
          "slug": "cha-parigoria-2",
          "seq": 40,
          "cumKm": 15.853,
          "cumMin": 52.84
        },
        {
          "slug": "cha-kladisos-4",
          "seq": 41,
          "cumKm": 16.224,
          "cumMin": 54.08
        },
        {
          "slug": "cha-varousi-2",
          "seq": 42,
          "cumKm": 16.699,
          "cumMin": 55.66
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 43,
          "cumKm": 17.11,
          "cumMin": 57.03
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 44,
          "cumKm": 17.652,
          "cumMin": 58.84
        },
        {
          "slug": "cha-kydonias",
          "seq": 45,
          "cumKm": 17.897,
          "cumMin": 59.66
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 46,
          "cumKm": 18.187,
          "cumMin": 60.62
        },
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 47,
          "cumKm": 18.274,
          "cumMin": 60.91
        }
      ]
    },
    {
      "code": "063",
      "lineCode": "CHA-15",
      "name": "Daratso Galata Kalamaki",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-markou-botsari-4",
          "seq": 1,
          "cumKm": 0.534,
          "cumMin": 1.78
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 2,
          "cumKm": 1.086,
          "cumMin": 3.62
        },
        {
          "slug": "cha-varousi",
          "seq": 3,
          "cumKm": 1.46,
          "cumMin": 4.87
        },
        {
          "slug": "cha-kladisos-3",
          "seq": 4,
          "cumKm": 1.996,
          "cumMin": 6.65
        },
        {
          "slug": "cha-parigoria",
          "seq": 5,
          "cumKm": 2.271,
          "cumMin": 7.57
        },
        {
          "slug": "cha-hotel-kedrissos",
          "seq": 6,
          "cumKm": 2.814,
          "cumMin": 9.38
        },
        {
          "slug": "cha-germaniko-pouli",
          "seq": 7,
          "cumKm": 3.126,
          "cumMin": 10.42
        },
        {
          "slug": "cha-triton-hotel-jumbo",
          "seq": 8,
          "cumKm": 3.585,
          "cumMin": 11.95
        },
        {
          "slug": "cha-chrysi-akti-jumbo",
          "seq": 9,
          "cumKm": 3.806,
          "cumMin": 12.69
        },
        {
          "slug": "cha-makrys-toichos",
          "seq": 10,
          "cumKm": 4.19,
          "cumMin": 13.97
        },
        {
          "slug": "cha-bmw",
          "seq": 11,
          "cumKm": 4.566,
          "cumMin": 15.22
        },
        {
          "slug": "cha-althea",
          "seq": 12,
          "cumKm": 4.997,
          "cumMin": 16.66
        },
        {
          "slug": "cha-lamprinaki",
          "seq": 13,
          "cumKm": 5.626,
          "cumMin": 18.75
        },
        {
          "slug": "cha-daratsos",
          "seq": 14,
          "cumKm": 6.045,
          "cumMin": 20.15
        },
        {
          "slug": "cha-star-daratsos",
          "seq": 15,
          "cumKm": 6.356,
          "cumMin": 21.19
        },
        {
          "slug": "cha-vechakidon",
          "seq": 16,
          "cumKm": 6.643,
          "cumMin": 22.14
        },
        {
          "slug": "cha-tourist-police",
          "seq": 17,
          "cumKm": 6.992,
          "cumMin": 23.31
        },
        {
          "slug": "cha-galatiano-perasma",
          "seq": 18,
          "cumKm": 7.232,
          "cumMin": 24.11
        },
        {
          "slug": "cha-galatas",
          "seq": 19,
          "cumKm": 7.45,
          "cumMin": 24.83
        },
        {
          "slug": "cha-bigkaza",
          "seq": 20,
          "cumKm": 7.721,
          "cumMin": 25.74
        },
        {
          "slug": "cha-ag-antonios",
          "seq": 21,
          "cumKm": 8.014,
          "cumMin": 26.71
        },
        {
          "slug": "cha-gipedo-galata",
          "seq": 22,
          "cumKm": 8.717,
          "cumMin": 29.06
        },
        {
          "slug": "cha-ag-georgiou",
          "seq": 23,
          "cumKm": 9.075,
          "cumMin": 30.25
        },
        {
          "slug": "cha-eirinis",
          "seq": 24,
          "cumKm": 9.487,
          "cumMin": 31.62
        },
        {
          "slug": "cha-ag-fanouriou",
          "seq": 25,
          "cumKm": 10.084,
          "cumMin": 33.61
        },
        {
          "slug": "cha-glaros-2",
          "seq": 26,
          "cumKm": 10.372,
          "cumMin": 34.57
        },
        {
          "slug": "cha-hotel-kalliston-2",
          "seq": 27,
          "cumKm": 10.709,
          "cumMin": 35.7
        },
        {
          "slug": "cha-strati-pantelaki-2",
          "seq": 28,
          "cumKm": 11.141,
          "cumMin": 37.14
        },
        {
          "slug": "cha-bmw-2",
          "seq": 29,
          "cumKm": 11.523,
          "cumMin": 38.41
        },
        {
          "slug": "cha-makrys-toichos-2",
          "seq": 30,
          "cumKm": 12.063,
          "cumMin": 40.21
        },
        {
          "slug": "cha-chrysi-akti-jumbo-2",
          "seq": 31,
          "cumKm": 12.427,
          "cumMin": 41.42
        },
        {
          "slug": "cha-triton-hotel",
          "seq": 32,
          "cumKm": 12.757,
          "cumMin": 42.52
        },
        {
          "slug": "cha-germaniko-pouli-2",
          "seq": 33,
          "cumKm": 13.098,
          "cumMin": 43.66
        },
        {
          "slug": "cha-hotel-kedrissos-2",
          "seq": 34,
          "cumKm": 13.412,
          "cumMin": 44.71
        },
        {
          "slug": "cha-parigoria-2",
          "seq": 35,
          "cumKm": 13.826,
          "cumMin": 46.09
        },
        {
          "slug": "cha-kladisos-4",
          "seq": 36,
          "cumKm": 14.197,
          "cumMin": 47.32
        },
        {
          "slug": "cha-varousi-2",
          "seq": 37,
          "cumKm": 14.672,
          "cumMin": 48.91
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 38,
          "cumKm": 15.083,
          "cumMin": 50.28
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 39,
          "cumKm": 15.625,
          "cumMin": 52.08
        },
        {
          "slug": "cha-kydonias",
          "seq": 40,
          "cumKm": 15.87,
          "cumMin": 52.9
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 41,
          "cumKm": 16.16,
          "cumMin": 53.87
        },
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 42,
          "cumKm": 16.247,
          "cumMin": 54.16
        }
      ]
    },
    {
      "code": "067",
      "lineCode": "CHA-15",
      "name": "Panorama Kalamaki Galata Daratso",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-markou-botsari-4",
          "seq": 1,
          "cumKm": 0.534,
          "cumMin": 1.78
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 2,
          "cumKm": 1.086,
          "cumMin": 3.62
        },
        {
          "slug": "cha-varousi",
          "seq": 3,
          "cumKm": 1.46,
          "cumMin": 4.87
        },
        {
          "slug": "cha-kladisos-3",
          "seq": 4,
          "cumKm": 1.996,
          "cumMin": 6.65
        },
        {
          "slug": "cha-parigoria",
          "seq": 5,
          "cumKm": 2.271,
          "cumMin": 7.57
        },
        {
          "slug": "cha-hotel-kedrissos",
          "seq": 6,
          "cumKm": 2.814,
          "cumMin": 9.38
        },
        {
          "slug": "cha-germaniko-pouli",
          "seq": 7,
          "cumKm": 3.126,
          "cumMin": 10.42
        },
        {
          "slug": "cha-triton-hotel-jumbo",
          "seq": 8,
          "cumKm": 3.585,
          "cumMin": 11.95
        },
        {
          "slug": "cha-chrysi-akti-jumbo",
          "seq": 9,
          "cumKm": 3.806,
          "cumMin": 12.69
        },
        {
          "slug": "cha-makrys-toichos",
          "seq": 10,
          "cumKm": 4.19,
          "cumMin": 13.97
        },
        {
          "slug": "cha-bmw",
          "seq": 11,
          "cumKm": 4.566,
          "cumMin": 15.22
        },
        {
          "slug": "cha-strati-pantelaki",
          "seq": 12,
          "cumKm": 5.067,
          "cumMin": 16.89
        },
        {
          "slug": "cha-hotel-kalliston",
          "seq": 13,
          "cumKm": 5.524,
          "cumMin": 18.41
        },
        {
          "slug": "cha-glaros",
          "seq": 14,
          "cumKm": 5.834,
          "cumMin": 19.45
        },
        {
          "slug": "cha-kalamaki",
          "seq": 15,
          "cumKm": 6.259,
          "cumMin": 20.86
        },
        {
          "slug": "cha-ag-dimitrios",
          "seq": 16,
          "cumKm": 6.738,
          "cumMin": 22.46
        },
        {
          "slug": "cha-panorama",
          "seq": 17,
          "cumKm": 7.018,
          "cumMin": 23.39
        },
        {
          "slug": "cha-ag-dimitrios-2",
          "seq": 18,
          "cumKm": 7.323,
          "cumMin": 24.41
        },
        {
          "slug": "cha-kalamaki-2",
          "seq": 19,
          "cumKm": 7.858,
          "cumMin": 26.19
        },
        {
          "slug": "cha-ag-fanouriou-2",
          "seq": 20,
          "cumKm": 8.219,
          "cumMin": 27.4
        },
        {
          "slug": "cha-eirinis-2",
          "seq": 21,
          "cumKm": 8.602,
          "cumMin": 28.67
        },
        {
          "slug": "cha-ag-georgiou-2",
          "seq": 22,
          "cumKm": 9.137,
          "cumMin": 30.46
        },
        {
          "slug": "cha-tourist-police",
          "seq": 23,
          "cumKm": 9.611,
          "cumMin": 32.04
        },
        {
          "slug": "cha-galatiano-perasma",
          "seq": 24,
          "cumKm": 9.851,
          "cumMin": 32.84
        },
        {
          "slug": "cha-galatas",
          "seq": 25,
          "cumKm": 10.069,
          "cumMin": 33.56
        },
        {
          "slug": "cha-bigkaza",
          "seq": 26,
          "cumKm": 10.34,
          "cumMin": 34.47
        },
        {
          "slug": "cha-ag-antonios",
          "seq": 27,
          "cumKm": 10.633,
          "cumMin": 35.44
        },
        {
          "slug": "cha-gipedo-galata",
          "seq": 28,
          "cumKm": 11.336,
          "cumMin": 37.79
        },
        {
          "slug": "cha-daratsos",
          "seq": 29,
          "cumKm": 12.122,
          "cumMin": 40.41
        },
        {
          "slug": "cha-lamprinaki",
          "seq": 30,
          "cumKm": 12.541,
          "cumMin": 41.8
        },
        {
          "slug": "cha-althea",
          "seq": 31,
          "cumKm": 13.171,
          "cumMin": 43.9
        },
        {
          "slug": "cha-bmw-2",
          "seq": 32,
          "cumKm": 13.533,
          "cumMin": 45.11
        },
        {
          "slug": "cha-makrys-toichos-2",
          "seq": 33,
          "cumKm": 14.073,
          "cumMin": 46.91
        },
        {
          "slug": "cha-chrysi-akti-jumbo-2",
          "seq": 34,
          "cumKm": 14.437,
          "cumMin": 48.12
        },
        {
          "slug": "cha-triton-hotel",
          "seq": 35,
          "cumKm": 14.767,
          "cumMin": 49.22
        },
        {
          "slug": "cha-germaniko-pouli-2",
          "seq": 36,
          "cumKm": 15.108,
          "cumMin": 50.36
        },
        {
          "slug": "cha-hotel-kedrissos-2",
          "seq": 37,
          "cumKm": 15.422,
          "cumMin": 51.41
        },
        {
          "slug": "cha-parigoria-2",
          "seq": 38,
          "cumKm": 15.836,
          "cumMin": 52.79
        },
        {
          "slug": "cha-kladisos-4",
          "seq": 39,
          "cumKm": 16.207,
          "cumMin": 54.02
        },
        {
          "slug": "cha-varousi-2",
          "seq": 40,
          "cumKm": 16.682,
          "cumMin": 55.61
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 41,
          "cumKm": 17.093,
          "cumMin": 56.98
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 42,
          "cumKm": 17.635,
          "cumMin": 58.78
        },
        {
          "slug": "cha-kydonias",
          "seq": 43,
          "cumKm": 17.88,
          "cumMin": 59.6
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 44,
          "cumKm": 18.17,
          "cumMin": 60.57
        },
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 45,
          "cumKm": 18.257,
          "cumMin": 60.86
        }
      ]
    },
    {
      "code": "065",
      "lineCode": "CHA-16",
      "name": "Perivolia-roloi",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-apokoronou",
          "seq": 1,
          "cumKm": 0.225,
          "cumMin": 0.75
        },
        {
          "slug": "cha-georgiladon",
          "seq": 2,
          "cumKm": 0.627,
          "cumMin": 2.09
        },
        {
          "slug": "cha-diktynis",
          "seq": 3,
          "cumKm": 0.994,
          "cumMin": 3.31
        },
        {
          "slug": "cha-palia-ilektriki-2",
          "seq": 4,
          "cumKm": 1.344,
          "cumMin": 4.48
        },
        {
          "slug": "cha-plastira-2",
          "seq": 5,
          "cumKm": 1.798,
          "cumMin": 5.99
        },
        {
          "slug": "cha-kilikias",
          "seq": 6,
          "cumKm": 2.133,
          "cumMin": 7.11
        },
        {
          "slug": "cha-eleftherias",
          "seq": 7,
          "cumKm": 2.365,
          "cumMin": 7.88
        },
        {
          "slug": "cha-pasakaki",
          "seq": 8,
          "cumKm": 2.803,
          "cumMin": 9.34
        },
        {
          "slug": "cha-ag-vasileiou",
          "seq": 9,
          "cumKm": 3.05,
          "cumMin": 10.17
        },
        {
          "slug": "cha-charakias",
          "seq": 10,
          "cumKm": 3.332,
          "cumMin": 11.11
        },
        {
          "slug": "cha-oasi",
          "seq": 11,
          "cumKm": 3.86,
          "cumMin": 12.87
        },
        {
          "slug": "cha-gipedo-perivolion",
          "seq": 12,
          "cumKm": 5.201,
          "cumMin": 17.34
        },
        {
          "slug": "cha-gkariana",
          "seq": 13,
          "cumKm": 5.6,
          "cumMin": 18.67
        },
        {
          "slug": "cha-profiti-ilia",
          "seq": 14,
          "cumKm": 5.746,
          "cumMin": 19.15
        },
        {
          "slug": "cha-orfanidi",
          "seq": 15,
          "cumKm": 5.925,
          "cumMin": 19.75
        },
        {
          "slug": "cha-pente-dromoi",
          "seq": 16,
          "cumKm": 6.24,
          "cumMin": 20.8
        },
        {
          "slug": "cha-war-heroes-1941",
          "seq": 17,
          "cumKm": 6.43,
          "cumMin": 21.43
        },
        {
          "slug": "cha-agios-ioannis",
          "seq": 18,
          "cumKm": 6.653,
          "cumMin": 22.18
        },
        {
          "slug": "cha-pyrgos-2",
          "seq": 19,
          "cumKm": 7.092,
          "cumMin": 23.64
        },
        {
          "slug": "cha-ionias",
          "seq": 20,
          "cumKm": 7.342,
          "cumMin": 24.47
        },
        {
          "slug": "cha-petrou-kai-pavlou",
          "seq": 21,
          "cumKm": 7.49,
          "cumMin": 24.97
        },
        {
          "slug": "cha-kastrochori",
          "seq": 22,
          "cumKm": 7.954,
          "cumMin": 26.51
        },
        {
          "slug": "cha-poulaka",
          "seq": 23,
          "cumKm": 8.329,
          "cumMin": 27.76
        },
        {
          "slug": "cha-menekleri",
          "seq": 24,
          "cumKm": 8.655,
          "cumMin": 28.85
        },
        {
          "slug": "cha-parallilos-ethnikis-odou",
          "seq": 25,
          "cumKm": 9.094,
          "cumMin": 30.31
        },
        {
          "slug": "cha-k-manoy",
          "seq": 26,
          "cumKm": 9.431,
          "cumMin": 31.44
        },
        {
          "slug": "cha-giampoudaki",
          "seq": 27,
          "cumKm": 9.742,
          "cumMin": 32.47
        },
        {
          "slug": "cha-lachanagora",
          "seq": 28,
          "cumKm": 10.191,
          "cumMin": 33.97
        },
        {
          "slug": "cha-osias-eirinis",
          "seq": 29,
          "cumKm": 10.639,
          "cumMin": 35.46
        },
        {
          "slug": "cha-atlas",
          "seq": 30,
          "cumKm": 10.876,
          "cumMin": 36.25
        },
        {
          "slug": "cha-foteinakis",
          "seq": 31,
          "cumKm": 11.376,
          "cumMin": 37.92
        },
        {
          "slug": "cha-kilikias-2",
          "seq": 32,
          "cumKm": 11.72,
          "cumMin": 39.07
        },
        {
          "slug": "cha-plastira-3",
          "seq": 33,
          "cumKm": 11.96,
          "cumMin": 39.87
        },
        {
          "slug": "cha-police-department",
          "seq": 34,
          "cumKm": 13.084,
          "cumMin": 43.61
        },
        {
          "slug": "cha-war-museum",
          "seq": 35,
          "cumKm": 13.901,
          "cumMin": 46.34
        },
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 36,
          "cumKm": 14.63,
          "cumMin": 48.77
        }
      ]
    },
    {
      "code": "081",
      "lineCode": "CHA-16",
      "name": "Perivolia Epistr. APO Gogoni",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-apokoronou",
          "seq": 1,
          "cumKm": 0.225,
          "cumMin": 0.75
        },
        {
          "slug": "cha-georgiladon",
          "seq": 2,
          "cumKm": 0.627,
          "cumMin": 2.09
        },
        {
          "slug": "cha-diktynis",
          "seq": 3,
          "cumKm": 0.994,
          "cumMin": 3.31
        },
        {
          "slug": "cha-palia-ilektriki-2",
          "seq": 4,
          "cumKm": 1.344,
          "cumMin": 4.48
        },
        {
          "slug": "cha-plastira-2",
          "seq": 5,
          "cumKm": 1.798,
          "cumMin": 5.99
        },
        {
          "slug": "cha-kilikias",
          "seq": 6,
          "cumKm": 2.133,
          "cumMin": 7.11
        },
        {
          "slug": "cha-eleftherias",
          "seq": 7,
          "cumKm": 2.365,
          "cumMin": 7.88
        },
        {
          "slug": "cha-pasakaki",
          "seq": 8,
          "cumKm": 2.803,
          "cumMin": 9.34
        },
        {
          "slug": "cha-ag-vasileiou",
          "seq": 9,
          "cumKm": 3.05,
          "cumMin": 10.17
        },
        {
          "slug": "cha-charakias",
          "seq": 10,
          "cumKm": 3.332,
          "cumMin": 11.11
        },
        {
          "slug": "cha-oasi",
          "seq": 11,
          "cumKm": 3.86,
          "cumMin": 12.87
        },
        {
          "slug": "cha-parodos-eleftherias",
          "seq": 12,
          "cumKm": 4.749,
          "cumMin": 15.83
        },
        {
          "slug": "cha-gipedo-perivolion",
          "seq": 13,
          "cumKm": 5.243,
          "cumMin": 17.48
        },
        {
          "slug": "cha-gkariana",
          "seq": 14,
          "cumKm": 5.642,
          "cumMin": 18.81
        },
        {
          "slug": "cha-orfanidi",
          "seq": 15,
          "cumKm": 5.932,
          "cumMin": 19.77
        },
        {
          "slug": "cha-pente-dromoi",
          "seq": 16,
          "cumKm": 6.247,
          "cumMin": 20.82
        },
        {
          "slug": "cha-war-heroes-1941",
          "seq": 17,
          "cumKm": 6.437,
          "cumMin": 21.46
        },
        {
          "slug": "cha-agios-ioannis",
          "seq": 18,
          "cumKm": 6.66,
          "cumMin": 22.2
        },
        {
          "slug": "cha-pyrgos-2",
          "seq": 19,
          "cumKm": 7.099,
          "cumMin": 23.66
        },
        {
          "slug": "cha-ionias",
          "seq": 20,
          "cumKm": 7.349,
          "cumMin": 24.5
        },
        {
          "slug": "cha-petrou-kai-pavlou",
          "seq": 21,
          "cumKm": 7.497,
          "cumMin": 24.99
        },
        {
          "slug": "cha-kastrochori",
          "seq": 22,
          "cumKm": 7.961,
          "cumMin": 26.54
        },
        {
          "slug": "cha-poulaka",
          "seq": 23,
          "cumKm": 8.336,
          "cumMin": 27.79
        },
        {
          "slug": "cha-menekleri",
          "seq": 24,
          "cumKm": 8.662,
          "cumMin": 28.87
        },
        {
          "slug": "cha-parallilos-ethnikis-odou",
          "seq": 25,
          "cumKm": 9.101,
          "cumMin": 30.34
        },
        {
          "slug": "cha-k-manoy",
          "seq": 26,
          "cumKm": 9.438,
          "cumMin": 31.46
        },
        {
          "slug": "cha-giampoudaki",
          "seq": 27,
          "cumKm": 9.749,
          "cumMin": 32.5
        },
        {
          "slug": "cha-lachanagora",
          "seq": 28,
          "cumKm": 10.198,
          "cumMin": 33.99
        },
        {
          "slug": "cha-atlas",
          "seq": 29,
          "cumKm": 10.874,
          "cumMin": 36.25
        },
        {
          "slug": "cha-foteinakis",
          "seq": 30,
          "cumKm": 11.374,
          "cumMin": 37.91
        },
        {
          "slug": "cha-kilikias-2",
          "seq": 31,
          "cumKm": 11.717,
          "cumMin": 39.06
        },
        {
          "slug": "cha-plastira-3",
          "seq": 32,
          "cumKm": 11.958,
          "cumMin": 39.86
        },
        {
          "slug": "cha-kornarou",
          "seq": 33,
          "cumKm": 12.392,
          "cumMin": 41.31
        },
        {
          "slug": "cha-agios-loukas",
          "seq": 34,
          "cumKm": 12.78,
          "cumMin": 42.6
        },
        {
          "slug": "cha-markou-botsari",
          "seq": 35,
          "cumKm": 13.123,
          "cumMin": 43.74
        },
        {
          "slug": "cha-peridou",
          "seq": 36,
          "cumKm": 13.411,
          "cumMin": 44.7
        }
      ]
    },
    {
      "code": "062",
      "lineCode": "CHA-17",
      "name": "Nerokoyroy",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-nerokourou",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-nerokourou-2",
          "seq": 1,
          "cumKm": 0.271,
          "cumMin": 0.9
        },
        {
          "slug": "cha-junction-nerokourou-2",
          "seq": 2,
          "cumKm": 0.562,
          "cumMin": 1.87
        },
        {
          "slug": "cha-agioi-saranta",
          "seq": 3,
          "cumKm": 1.331,
          "cumMin": 4.44
        },
        {
          "slug": "cha-tompazi",
          "seq": 4,
          "cumKm": 1.624,
          "cumMin": 5.41
        },
        {
          "slug": "cha-katsifariana",
          "seq": 5,
          "cumKm": 2.21,
          "cumMin": 7.37
        },
        {
          "slug": "cha-xylokamara",
          "seq": 6,
          "cumKm": 2.748,
          "cumMin": 9.16
        },
        {
          "slug": "cha-ethnarchou-venizelou",
          "seq": 7,
          "cumKm": 3.113,
          "cumMin": 10.38
        },
        {
          "slug": "cha-chrysopigi",
          "seq": 8,
          "cumKm": 3.41,
          "cumMin": 11.37
        },
        {
          "slug": "cha-in-panagias-gorgoupikoou-2",
          "seq": 9,
          "cumKm": 3.656,
          "cumMin": 12.19
        },
        {
          "slug": "cha-chrysopigis-2",
          "seq": 10,
          "cumKm": 4.194,
          "cumMin": 13.98
        },
        {
          "slug": "cha-kalykas-2",
          "seq": 11,
          "cumKm": 4.601,
          "cumMin": 15.34
        },
        {
          "slug": "cha-ag-stefanos",
          "seq": 12,
          "cumKm": 4.953,
          "cumMin": 16.51
        },
        {
          "slug": "cha-police-department",
          "seq": 13,
          "cumKm": 5.361,
          "cumMin": 17.87
        },
        {
          "slug": "cha-nearchou",
          "seq": 14,
          "cumKm": 5.672,
          "cumMin": 18.91
        },
        {
          "slug": "cha-war-museum",
          "seq": 15,
          "cumKm": 6.182,
          "cumMin": 20.61
        },
        {
          "slug": "cha-ktistaki",
          "seq": 16,
          "cumKm": 6.625,
          "cumMin": 22.08
        },
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 17,
          "cumKm": 6.93,
          "cumMin": 23.1
        },
        {
          "slug": "cha-apokoronou",
          "seq": 18,
          "cumKm": 7.155,
          "cumMin": 23.85
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 19,
          "cumKm": 7.678,
          "cumMin": 25.59
        },
        {
          "slug": "cha-apteron",
          "seq": 20,
          "cumKm": 8.001,
          "cumMin": 26.67
        },
        {
          "slug": "cha-police-department-2",
          "seq": 21,
          "cumKm": 8.269,
          "cumMin": 27.56
        },
        {
          "slug": "cha-agios-stefanos-2",
          "seq": 22,
          "cumKm": 8.785,
          "cumMin": 29.28
        },
        {
          "slug": "cha-kalykas",
          "seq": 23,
          "cumKm": 9.168,
          "cumMin": 30.56
        },
        {
          "slug": "cha-chrysopigis",
          "seq": 24,
          "cumKm": 9.566,
          "cumMin": 31.89
        },
        {
          "slug": "cha-in-panagias-gorgoupikoou",
          "seq": 25,
          "cumKm": 10.213,
          "cumMin": 34.04
        },
        {
          "slug": "cha-patriarchou-vartholomaiou",
          "seq": 26,
          "cumKm": 10.461,
          "cumMin": 34.87
        },
        {
          "slug": "cha-xylokamara-2",
          "seq": 27,
          "cumKm": 10.998,
          "cumMin": 36.66
        },
        {
          "slug": "cha-katsifariana-2",
          "seq": 28,
          "cumKm": 11.501,
          "cumMin": 38.34
        },
        {
          "slug": "cha-tompazi-2",
          "seq": 29,
          "cumKm": 11.94,
          "cumMin": 39.8
        },
        {
          "slug": "cha-ag-saranta",
          "seq": 30,
          "cumKm": 12.406,
          "cumMin": 41.35
        },
        {
          "slug": "cha-junction-nerokourou",
          "seq": 31,
          "cumKm": 13.142,
          "cumMin": 43.81
        },
        {
          "slug": "cha-kerameion",
          "seq": 32,
          "cumKm": 13.393,
          "cumMin": 44.64
        },
        {
          "slug": "cha-nerokourou",
          "seq": 33,
          "cumKm": 13.629,
          "cumMin": 45.43
        }
      ]
    },
    {
      "code": "091",
      "lineCode": "CHA-17",
      "name": "Moyrnies Nosokomeio Nerokoyroy APO Kokkino METOChI",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-nikolaou-skoula",
          "seq": 1,
          "cumKm": 0.459,
          "cumMin": 1.53
        },
        {
          "slug": "cha-kalafati",
          "seq": 2,
          "cumKm": 0.863,
          "cumMin": 2.88
        },
        {
          "slug": "cha-gianni-ritsou",
          "seq": 3,
          "cumKm": 1.263,
          "cumMin": 4.21
        },
        {
          "slug": "cha-mournion",
          "seq": 4,
          "cumKm": 2.185,
          "cumMin": 7.28
        },
        {
          "slug": "cha-agias-marinas",
          "seq": 5,
          "cumKm": 2.624,
          "cumMin": 8.75
        },
        {
          "slug": "cha-naskri",
          "seq": 6,
          "cumKm": 2.889,
          "cumMin": 9.63
        },
        {
          "slug": "cha-national-road",
          "seq": 7,
          "cumKm": 3.475,
          "cumMin": 11.58
        },
        {
          "slug": "cha-konstantinoupoleos",
          "seq": 8,
          "cumKm": 3.9,
          "cumMin": 13
        },
        {
          "slug": "cha-mournies",
          "seq": 9,
          "cumKm": 4.195,
          "cumMin": 13.98
        },
        {
          "slug": "cha-zoodochou-pigis",
          "seq": 10,
          "cumKm": 4.531,
          "cumMin": 15.1
        },
        {
          "slug": "cha-agios-eleftherios",
          "seq": 11,
          "cumKm": 4.83,
          "cumMin": 16.1
        },
        {
          "slug": "cha-hospital",
          "seq": 12,
          "cumKm": 5.149,
          "cumMin": 17.16
        },
        {
          "slug": "cha-hospital-gate",
          "seq": 13,
          "cumKm": 5.474,
          "cumMin": 18.25
        },
        {
          "slug": "cha-sofokli-venizelou-ag-eleftheriou",
          "seq": 14,
          "cumKm": 6.092,
          "cumMin": 20.31
        },
        {
          "slug": "cha-ag-aikaterinis",
          "seq": 15,
          "cumKm": 6.8,
          "cumMin": 22.67
        },
        {
          "slug": "cha-ikarou",
          "seq": 16,
          "cumKm": 7.171,
          "cumMin": 23.9
        },
        {
          "slug": "cha-nerokourou-ag-aikaterinis",
          "seq": 17,
          "cumKm": 7.685,
          "cumMin": 25.62
        },
        {
          "slug": "cha-junction-nerokourou",
          "seq": 18,
          "cumKm": 8.037,
          "cumMin": 26.79
        },
        {
          "slug": "cha-nerokourou",
          "seq": 19,
          "cumKm": 8.516,
          "cumMin": 28.39
        },
        {
          "slug": "cha-junction-nerokourou-2",
          "seq": 20,
          "cumKm": 9.073,
          "cumMin": 30.24
        },
        {
          "slug": "cha-agioi-saranta",
          "seq": 21,
          "cumKm": 9.843,
          "cumMin": 32.81
        },
        {
          "slug": "cha-tompazi",
          "seq": 22,
          "cumKm": 10.135,
          "cumMin": 33.78
        },
        {
          "slug": "cha-katsifariana",
          "seq": 23,
          "cumKm": 10.721,
          "cumMin": 35.74
        },
        {
          "slug": "cha-xylokamara",
          "seq": 24,
          "cumKm": 11.259,
          "cumMin": 37.53
        },
        {
          "slug": "cha-ethnarchou-venizelou",
          "seq": 25,
          "cumKm": 11.624,
          "cumMin": 38.75
        },
        {
          "slug": "cha-chrysopigi",
          "seq": 26,
          "cumKm": 11.921,
          "cumMin": 39.74
        },
        {
          "slug": "cha-kokkino-metochi",
          "seq": 27,
          "cumKm": 12.64,
          "cumMin": 42.13
        },
        {
          "slug": "cha-ergatikes-katoikies",
          "seq": 28,
          "cumKm": 12.947,
          "cumMin": 43.16
        },
        {
          "slug": "cha-agios-panteleimonas",
          "seq": 29,
          "cumKm": 13.105,
          "cumMin": 43.68
        },
        {
          "slug": "cha-dei",
          "seq": 30,
          "cumKm": 13.708,
          "cumMin": 45.69
        },
        {
          "slug": "cha-palia-ilektriki",
          "seq": 31,
          "cumKm": 14.018,
          "cumMin": 46.73
        },
        {
          "slug": "cha-kornarou",
          "seq": 32,
          "cumKm": 14.318,
          "cumMin": 47.73
        },
        {
          "slug": "cha-agios-loukas",
          "seq": 33,
          "cumKm": 14.706,
          "cumMin": 49.02
        },
        {
          "slug": "cha-markou-botsari",
          "seq": 34,
          "cumKm": 15.049,
          "cumMin": 50.16
        },
        {
          "slug": "cha-peridou",
          "seq": 35,
          "cumKm": 15.337,
          "cumMin": 51.12
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 36,
          "cumKm": 15.683,
          "cumMin": 52.28
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 37,
          "cumKm": 15.886,
          "cumMin": 52.95
        }
      ]
    },
    {
      "code": "014",
      "lineCode": "CHA-18",
      "name": "Koynoypidiana - Kyriaki",
      "direction": 2,
      "stops": [
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-national-bank",
          "seq": 1,
          "cumKm": 0.445,
          "cumMin": 1.48
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 2,
          "cumKm": 0.703,
          "cumMin": 2.34
        },
        {
          "slug": "cha-roloi",
          "seq": 3,
          "cumKm": 1.084,
          "cumMin": 3.61
        },
        {
          "slug": "cha-olympia",
          "seq": 4,
          "cumKm": 1.418,
          "cumMin": 4.73
        },
        {
          "slug": "cha-dikastiria",
          "seq": 5,
          "cumKm": 1.757,
          "cumMin": 5.86
        },
        {
          "slug": "cha-kamaraki",
          "seq": 6,
          "cumKm": 2.128,
          "cumMin": 7.09
        },
        {
          "slug": "cha-iroon-polytechneiou",
          "seq": 7,
          "cumKm": 2.429,
          "cumMin": 8.1
        },
        {
          "slug": "cha-chonoloulou",
          "seq": 8,
          "cumKm": 2.635,
          "cumMin": 8.78
        },
        {
          "slug": "cha-katsampa",
          "seq": 9,
          "cumKm": 3.314,
          "cumMin": 11.05
        },
        {
          "slug": "cha-meintani",
          "seq": 10,
          "cumKm": 3.743,
          "cumMin": 12.48
        },
        {
          "slug": "cha-agia-foteini",
          "seq": 11,
          "cumKm": 4.097,
          "cumMin": 13.66
        },
        {
          "slug": "cha-ergatikes-katoikies-2",
          "seq": 12,
          "cumKm": 4.497,
          "cumMin": 14.99
        },
        {
          "slug": "cha-andrianaki",
          "seq": 13,
          "cumKm": 4.912,
          "cumMin": 16.37
        },
        {
          "slug": "cha-protomi-iliaki",
          "seq": 14,
          "cumKm": 5.265,
          "cumMin": 17.55
        },
        {
          "slug": "cha-venizelon-graves",
          "seq": 15,
          "cumKm": 6.542,
          "cumMin": 21.81
        },
        {
          "slug": "cha-entrance-university-of-crete",
          "seq": 16,
          "cumKm": 7.483,
          "cumMin": 24.94
        },
        {
          "slug": "cha-technical-university-of-crete",
          "seq": 17,
          "cumKm": 8.041,
          "cumMin": 26.8
        },
        {
          "slug": "cha-markou-botsari-2",
          "seq": 18,
          "cumKm": 8.328,
          "cumMin": 27.76
        },
        {
          "slug": "cha-kounoupidianon-square",
          "seq": 19,
          "cumKm": 8.916,
          "cumMin": 29.72
        },
        {
          "slug": "cha-agion-panton-3",
          "seq": 20,
          "cumKm": 9.175,
          "cumMin": 30.58
        },
        {
          "slug": "cha-ikarou-4",
          "seq": 21,
          "cumKm": 9.378,
          "cumMin": 31.26
        },
        {
          "slug": "cha-12-dimotiko-scholeio",
          "seq": 22,
          "cumKm": 9.667,
          "cumMin": 32.22
        },
        {
          "slug": "cha-filias-ton-laon-3",
          "seq": 23,
          "cumKm": 10.042,
          "cumMin": 33.47
        },
        {
          "slug": "cha-plakoures-2",
          "seq": 24,
          "cumKm": 10.418,
          "cumMin": 34.73
        },
        {
          "slug": "cha-vothonas",
          "seq": 25,
          "cumKm": 10.746,
          "cumMin": 35.82
        },
        {
          "slug": "cha-ts-plakoures",
          "seq": 26,
          "cumKm": 10.97,
          "cumMin": 36.57
        },
        {
          "slug": "cha-plakoures-3",
          "seq": 27,
          "cumKm": 11.409,
          "cumMin": 38.03
        },
        {
          "slug": "cha-filias-ton-laon",
          "seq": 28,
          "cumKm": 11.945,
          "cumMin": 39.82
        },
        {
          "slug": "cha-primary-school-kounoupidianon",
          "seq": 29,
          "cumKm": 12.249,
          "cumMin": 40.83
        },
        {
          "slug": "cha-ikarou-2",
          "seq": 30,
          "cumKm": 12.503,
          "cumMin": 41.68
        },
        {
          "slug": "cha-agion-panton",
          "seq": 31,
          "cumKm": 12.809,
          "cumMin": 42.7
        },
        {
          "slug": "cha-kounoupidianon-square-2",
          "seq": 32,
          "cumKm": 13.032,
          "cumMin": 43.44
        },
        {
          "slug": "cha-markou-botsari-3",
          "seq": 33,
          "cumKm": 13.59,
          "cumMin": 45.3
        },
        {
          "slug": "cha-technical-university-of-crete-2",
          "seq": 34,
          "cumKm": 13.904,
          "cumMin": 46.35
        },
        {
          "slug": "cha-venizelon-graves-2",
          "seq": 35,
          "cumKm": 15.335,
          "cumMin": 51.12
        },
        {
          "slug": "cha-andrianaki-2",
          "seq": 36,
          "cumKm": 16.882,
          "cumMin": 56.27
        },
        {
          "slug": "cha-ergatikes-katoikies-3",
          "seq": 37,
          "cumKm": 17.397,
          "cumMin": 57.99
        },
        {
          "slug": "cha-agia-foteini-2",
          "seq": 38,
          "cumKm": 17.726,
          "cumMin": 59.09
        },
        {
          "slug": "cha-meintani-2",
          "seq": 39,
          "cumKm": 18.107,
          "cumMin": 60.36
        },
        {
          "slug": "cha-katsampa-2",
          "seq": 40,
          "cumKm": 18.538,
          "cumMin": 61.79
        },
        {
          "slug": "cha-iroon-polytechneiou-2",
          "seq": 41,
          "cumKm": 19.238,
          "cumMin": 64.13
        },
        {
          "slug": "cha-kamaraki-2",
          "seq": 42,
          "cumKm": 19.52,
          "cumMin": 65.07
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 43,
          "cumKm": 19.873,
          "cumMin": 66.24
        },
        {
          "slug": "cha-olympia-2",
          "seq": 44,
          "cumKm": 20.28,
          "cumMin": 67.6
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 45,
          "cumKm": 21.111,
          "cumMin": 70.37
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 46,
          "cumKm": 21.411,
          "cumMin": 71.37
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 47,
          "cumKm": 21.614,
          "cumMin": 72.05
        }
      ]
    },
    {
      "code": "058",
      "lineCode": "CHA-18",
      "name": "Koynoypidiana",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-plakoures",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-plakoures-3",
          "seq": 1,
          "cumKm": 0.439,
          "cumMin": 1.46
        },
        {
          "slug": "cha-filias-ton-laon",
          "seq": 2,
          "cumKm": 0.975,
          "cumMin": 3.25
        },
        {
          "slug": "cha-primary-school-kounoupidianon",
          "seq": 3,
          "cumKm": 1.279,
          "cumMin": 4.26
        },
        {
          "slug": "cha-ikarou-2",
          "seq": 4,
          "cumKm": 1.533,
          "cumMin": 5.11
        },
        {
          "slug": "cha-agion-panton",
          "seq": 5,
          "cumKm": 1.839,
          "cumMin": 6.13
        },
        {
          "slug": "cha-kounoupidianon-square-2",
          "seq": 6,
          "cumKm": 2.062,
          "cumMin": 6.87
        },
        {
          "slug": "cha-markou-botsari-3",
          "seq": 7,
          "cumKm": 2.62,
          "cumMin": 8.73
        },
        {
          "slug": "cha-technical-university-of-crete-2",
          "seq": 8,
          "cumKm": 2.934,
          "cumMin": 9.78
        },
        {
          "slug": "cha-venizelon-graves-2",
          "seq": 9,
          "cumKm": 4.365,
          "cumMin": 14.55
        },
        {
          "slug": "cha-andrianaki-2",
          "seq": 10,
          "cumKm": 5.912,
          "cumMin": 19.71
        },
        {
          "slug": "cha-ergatikes-katoikies-3",
          "seq": 11,
          "cumKm": 6.427,
          "cumMin": 21.42
        },
        {
          "slug": "cha-agia-foteini-2",
          "seq": 12,
          "cumKm": 6.756,
          "cumMin": 22.52
        },
        {
          "slug": "cha-meintani-2",
          "seq": 13,
          "cumKm": 7.137,
          "cumMin": 23.79
        },
        {
          "slug": "cha-katsampa-2",
          "seq": 14,
          "cumKm": 7.568,
          "cumMin": 25.23
        },
        {
          "slug": "cha-iroon-polytechneiou-2",
          "seq": 15,
          "cumKm": 8.268,
          "cumMin": 27.56
        },
        {
          "slug": "cha-kamaraki-2",
          "seq": 16,
          "cumKm": 8.55,
          "cumMin": 28.5
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 17,
          "cumKm": 8.904,
          "cumMin": 29.68
        },
        {
          "slug": "cha-olympia-2",
          "seq": 18,
          "cumKm": 9.31,
          "cumMin": 31.03
        },
        {
          "slug": "cha-roloi-2",
          "seq": 19,
          "cumKm": 9.623,
          "cumMin": 32.08
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 20,
          "cumKm": 9.951,
          "cumMin": 33.17
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 21,
          "cumKm": 10.145,
          "cumMin": 33.82
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 22,
          "cumKm": 10.445,
          "cumMin": 34.82
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 23,
          "cumKm": 10.648,
          "cumMin": 35.49
        },
        {
          "slug": "cha-national-bank",
          "seq": 24,
          "cumKm": 11.093,
          "cumMin": 36.98
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 25,
          "cumKm": 11.352,
          "cumMin": 37.84
        },
        {
          "slug": "cha-roloi",
          "seq": 26,
          "cumKm": 11.733,
          "cumMin": 39.11
        },
        {
          "slug": "cha-olympia",
          "seq": 27,
          "cumKm": 12.066,
          "cumMin": 40.22
        },
        {
          "slug": "cha-dikastiria",
          "seq": 28,
          "cumKm": 12.405,
          "cumMin": 41.35
        },
        {
          "slug": "cha-kamaraki",
          "seq": 29,
          "cumKm": 12.776,
          "cumMin": 42.59
        },
        {
          "slug": "cha-iroon-polytechneiou",
          "seq": 30,
          "cumKm": 13.077,
          "cumMin": 43.59
        },
        {
          "slug": "cha-chonoloulou",
          "seq": 31,
          "cumKm": 13.283,
          "cumMin": 44.28
        },
        {
          "slug": "cha-katsampa",
          "seq": 32,
          "cumKm": 13.962,
          "cumMin": 46.54
        },
        {
          "slug": "cha-meintani",
          "seq": 33,
          "cumKm": 14.391,
          "cumMin": 47.97
        },
        {
          "slug": "cha-agia-foteini",
          "seq": 34,
          "cumKm": 14.745,
          "cumMin": 49.15
        },
        {
          "slug": "cha-ergatikes-katoikies-2",
          "seq": 35,
          "cumKm": 15.146,
          "cumMin": 50.49
        },
        {
          "slug": "cha-andrianaki",
          "seq": 36,
          "cumKm": 15.561,
          "cumMin": 51.87
        },
        {
          "slug": "cha-protomi-iliaki",
          "seq": 37,
          "cumKm": 15.913,
          "cumMin": 53.04
        },
        {
          "slug": "cha-venizelon-graves",
          "seq": 38,
          "cumKm": 17.19,
          "cumMin": 57.3
        },
        {
          "slug": "cha-entrance-university-of-crete",
          "seq": 39,
          "cumKm": 18.132,
          "cumMin": 60.44
        },
        {
          "slug": "cha-technical-university-of-crete",
          "seq": 40,
          "cumKm": 18.689,
          "cumMin": 62.3
        },
        {
          "slug": "cha-markou-botsari-2",
          "seq": 41,
          "cumKm": 18.976,
          "cumMin": 63.25
        },
        {
          "slug": "cha-28is-oktovriou",
          "seq": 42,
          "cumKm": 19.308,
          "cumMin": 64.36
        },
        {
          "slug": "cha-kounoupidianon-square",
          "seq": 43,
          "cumKm": 19.565,
          "cumMin": 65.22
        },
        {
          "slug": "cha-agion-panton-2",
          "seq": 44,
          "cumKm": 19.823,
          "cumMin": 66.08
        },
        {
          "slug": "cha-ikarou-3",
          "seq": 45,
          "cumKm": 20.029,
          "cumMin": 66.76
        },
        {
          "slug": "cha-dimotiko-scholeio-kounoupidianon",
          "seq": 46,
          "cumKm": 20.366,
          "cumMin": 67.89
        },
        {
          "slug": "cha-filias-ton-laon-2",
          "seq": 47,
          "cumKm": 20.682,
          "cumMin": 68.94
        },
        {
          "slug": "cha-plakoures-2",
          "seq": 48,
          "cumKm": 21.069,
          "cumMin": 70.23
        },
        {
          "slug": "cha-vothonas",
          "seq": 49,
          "cumKm": 21.397,
          "cumMin": 71.32
        },
        {
          "slug": "cha-ts-plakoures",
          "seq": 50,
          "cumKm": 21.621,
          "cumMin": 72.07
        }
      ]
    },
    {
      "code": "084",
      "lineCode": "CHA-18",
      "name": "ChANIA - Koynoypidiana.",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-national-bank",
          "seq": 1,
          "cumKm": 0.445,
          "cumMin": 1.48
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 2,
          "cumKm": 0.703,
          "cumMin": 2.34
        },
        {
          "slug": "cha-roloi",
          "seq": 3,
          "cumKm": 1.084,
          "cumMin": 3.61
        },
        {
          "slug": "cha-olympia",
          "seq": 4,
          "cumKm": 1.418,
          "cumMin": 4.73
        },
        {
          "slug": "cha-dikastiria",
          "seq": 5,
          "cumKm": 1.757,
          "cumMin": 5.86
        },
        {
          "slug": "cha-kamaraki",
          "seq": 6,
          "cumKm": 2.128,
          "cumMin": 7.09
        },
        {
          "slug": "cha-iroon-polytechneiou",
          "seq": 7,
          "cumKm": 2.429,
          "cumMin": 8.1
        },
        {
          "slug": "cha-chonoloulou",
          "seq": 8,
          "cumKm": 2.635,
          "cumMin": 8.78
        },
        {
          "slug": "cha-katsampa",
          "seq": 9,
          "cumKm": 3.314,
          "cumMin": 11.05
        },
        {
          "slug": "cha-meintani",
          "seq": 10,
          "cumKm": 3.743,
          "cumMin": 12.48
        },
        {
          "slug": "cha-agia-foteini",
          "seq": 11,
          "cumKm": 4.097,
          "cumMin": 13.66
        },
        {
          "slug": "cha-ergatikes-katoikies-2",
          "seq": 12,
          "cumKm": 4.497,
          "cumMin": 14.99
        },
        {
          "slug": "cha-andrianaki",
          "seq": 13,
          "cumKm": 4.912,
          "cumMin": 16.37
        },
        {
          "slug": "cha-protomi-iliaki",
          "seq": 14,
          "cumKm": 5.265,
          "cumMin": 17.55
        },
        {
          "slug": "cha-venizelon-graves",
          "seq": 15,
          "cumKm": 6.542,
          "cumMin": 21.81
        },
        {
          "slug": "cha-entrance-university-of-crete",
          "seq": 16,
          "cumKm": 7.483,
          "cumMin": 24.94
        },
        {
          "slug": "cha-technical-university-of-crete",
          "seq": 17,
          "cumKm": 8.041,
          "cumMin": 26.8
        },
        {
          "slug": "cha-markou-botsari-2",
          "seq": 18,
          "cumKm": 8.328,
          "cumMin": 27.76
        },
        {
          "slug": "cha-28is-oktovriou",
          "seq": 19,
          "cumKm": 8.659,
          "cumMin": 28.86
        },
        {
          "slug": "cha-kounoupidianon-square",
          "seq": 20,
          "cumKm": 8.917,
          "cumMin": 29.72
        },
        {
          "slug": "cha-agion-panton-3",
          "seq": 21,
          "cumKm": 9.176,
          "cumMin": 30.59
        },
        {
          "slug": "cha-ikarou-4",
          "seq": 22,
          "cumKm": 9.379,
          "cumMin": 31.26
        },
        {
          "slug": "cha-12-dimotiko-scholeio",
          "seq": 23,
          "cumKm": 9.667,
          "cumMin": 32.22
        },
        {
          "slug": "cha-filias-ton-laon-3",
          "seq": 24,
          "cumKm": 10.043,
          "cumMin": 33.48
        },
        {
          "slug": "cha-plakoures-2",
          "seq": 25,
          "cumKm": 10.419,
          "cumMin": 34.73
        },
        {
          "slug": "cha-vothonas",
          "seq": 26,
          "cumKm": 10.746,
          "cumMin": 35.82
        },
        {
          "slug": "cha-ts-plakoures",
          "seq": 27,
          "cumKm": 10.971,
          "cumMin": 36.57
        }
      ]
    },
    {
      "code": "085",
      "lineCode": "CHA-18",
      "name": "Koynoypidiana - ChANIA",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-plakoures",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-plakoures-3",
          "seq": 1,
          "cumKm": 0.439,
          "cumMin": 1.46
        },
        {
          "slug": "cha-filias-ton-laon",
          "seq": 2,
          "cumKm": 0.975,
          "cumMin": 3.25
        },
        {
          "slug": "cha-primary-school-kounoupidianon",
          "seq": 3,
          "cumKm": 1.279,
          "cumMin": 4.26
        },
        {
          "slug": "cha-ikarou-2",
          "seq": 4,
          "cumKm": 1.533,
          "cumMin": 5.11
        },
        {
          "slug": "cha-agion-panton",
          "seq": 5,
          "cumKm": 1.839,
          "cumMin": 6.13
        },
        {
          "slug": "cha-kounoupidianon-square-2",
          "seq": 6,
          "cumKm": 2.062,
          "cumMin": 6.87
        },
        {
          "slug": "cha-markou-botsari-3",
          "seq": 7,
          "cumKm": 2.62,
          "cumMin": 8.73
        },
        {
          "slug": "cha-technical-university-of-crete-2",
          "seq": 8,
          "cumKm": 2.934,
          "cumMin": 9.78
        },
        {
          "slug": "cha-venizelon-graves-2",
          "seq": 9,
          "cumKm": 4.365,
          "cumMin": 14.55
        },
        {
          "slug": "cha-andrianaki-2",
          "seq": 10,
          "cumKm": 5.912,
          "cumMin": 19.71
        },
        {
          "slug": "cha-ergatikes-katoikies-3",
          "seq": 11,
          "cumKm": 6.427,
          "cumMin": 21.42
        },
        {
          "slug": "cha-agia-foteini-2",
          "seq": 12,
          "cumKm": 6.756,
          "cumMin": 22.52
        },
        {
          "slug": "cha-meintani-2",
          "seq": 13,
          "cumKm": 7.137,
          "cumMin": 23.79
        },
        {
          "slug": "cha-katsampa-2",
          "seq": 14,
          "cumKm": 7.568,
          "cumMin": 25.23
        },
        {
          "slug": "cha-iroon-polytechneiou-2",
          "seq": 15,
          "cumKm": 8.268,
          "cumMin": 27.56
        },
        {
          "slug": "cha-kamaraki-2",
          "seq": 16,
          "cumKm": 8.55,
          "cumMin": 28.5
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 17,
          "cumKm": 8.904,
          "cumMin": 29.68
        },
        {
          "slug": "cha-olympia-2",
          "seq": 18,
          "cumKm": 9.31,
          "cumMin": 31.03
        },
        {
          "slug": "cha-roloi-2",
          "seq": 19,
          "cumKm": 9.623,
          "cumMin": 32.08
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 20,
          "cumKm": 9.951,
          "cumMin": 33.17
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 21,
          "cumKm": 10.145,
          "cumMin": 33.82
        }
      ]
    },
    {
      "code": "053",
      "lineCode": "CHA-19",
      "name": "Fylakes Agyias -ChANIA.",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-oadyk",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-varypetro-2",
          "seq": 1,
          "cumKm": 0.535,
          "cumMin": 1.78
        },
        {
          "slug": "cha-fylakes-agias-2",
          "seq": 2,
          "cumKm": 0.887,
          "cumMin": 2.96
        },
        {
          "slug": "cha-junction-galata-2",
          "seq": 3,
          "cumKm": 1.29,
          "cumMin": 4.3
        },
        {
          "slug": "cha-sykolia-2",
          "seq": 4,
          "cumKm": 1.958,
          "cumMin": 6.53
        },
        {
          "slug": "cha-ag-konstantinou-2",
          "seq": 5,
          "cumKm": 2.305,
          "cumMin": 7.68
        },
        {
          "slug": "cha-city-bus-station-2",
          "seq": 6,
          "cumKm": 2.725,
          "cumMin": 9.08
        },
        {
          "slug": "cha-vourkia-2",
          "seq": 7,
          "cumKm": 3.305,
          "cumMin": 11.02
        },
        {
          "slug": "cha-ag-antoniou-2",
          "seq": 8,
          "cumKm": 3.625,
          "cumMin": 12.08
        },
        {
          "slug": "cha-neas-kydonias-2",
          "seq": 9,
          "cumKm": 4.131,
          "cumMin": 13.77
        },
        {
          "slug": "cha-vamvakopoulo-2",
          "seq": 10,
          "cumKm": 4.753,
          "cumMin": 15.84
        },
        {
          "slug": "cha-national-road-3",
          "seq": 11,
          "cumKm": 5.312,
          "cumMin": 17.71
        },
        {
          "slug": "cha-synka-2",
          "seq": 12,
          "cumKm": 5.61,
          "cumMin": 18.7
        },
        {
          "slug": "cha-monachi-elia-2",
          "seq": 13,
          "cumKm": 6.2,
          "cumMin": 20.67
        },
        {
          "slug": "cha-tourna-2",
          "seq": 14,
          "cumKm": 6.807,
          "cumMin": 22.69
        },
        {
          "slug": "cha-kladisos-2",
          "seq": 15,
          "cumKm": 7.133,
          "cumMin": 23.78
        },
        {
          "slug": "cha-varousi-2",
          "seq": 16,
          "cumKm": 7.547,
          "cumMin": 25.16
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 17,
          "cumKm": 7.958,
          "cumMin": 26.53
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 18,
          "cumKm": 8.5,
          "cumMin": 28.33
        },
        {
          "slug": "cha-kydonias",
          "seq": 19,
          "cumKm": 8.745,
          "cumMin": 29.15
        }
      ]
    },
    {
      "code": "054",
      "lineCode": "CHA-19",
      "name": "AGYIA-MARMARA-POTISTIRIA-LIGIDES-ChANIA-AGYIA.",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-oadyk",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-varypetro-3",
          "seq": 1,
          "cumKm": 0.474,
          "cumMin": 1.58
        },
        {
          "slug": "cha-ag-fanourios-2",
          "seq": 2,
          "cumKm": 0.78,
          "cumMin": 2.6
        },
        {
          "slug": "cha-ag-fanouriou-3",
          "seq": 3,
          "cumKm": 1.145,
          "cumMin": 3.82
        },
        {
          "slug": "cha-marmaras",
          "seq": 4,
          "cumKm": 1.482,
          "cumMin": 4.94
        },
        {
          "slug": "cha-diastavrosi-2-marmara",
          "seq": 5,
          "cumKm": 1.958,
          "cumMin": 6.53
        },
        {
          "slug": "cha-diastavrosi-oadyk",
          "seq": 6,
          "cumKm": 2.612,
          "cumMin": 8.71
        },
        {
          "slug": "cha-gipedo-varypetrou",
          "seq": 7,
          "cumKm": 3.2,
          "cumMin": 10.67
        },
        {
          "slug": "cha-potistiria",
          "seq": 8,
          "cumKm": 3.608,
          "cumMin": 12.03
        },
        {
          "slug": "cha-ligides-1i-stasi",
          "seq": 9,
          "cumKm": 4.401,
          "cumMin": 14.67
        },
        {
          "slug": "cha-ligides",
          "seq": 10,
          "cumKm": 4.841,
          "cumMin": 16.14
        },
        {
          "slug": "cha-sykolia-3",
          "seq": 11,
          "cumKm": 5.313,
          "cumMin": 17.71
        },
        {
          "slug": "cha-sykolia-2",
          "seq": 12,
          "cumKm": 5.491,
          "cumMin": 18.3
        },
        {
          "slug": "cha-ag-konstantinou-2",
          "seq": 13,
          "cumKm": 5.839,
          "cumMin": 19.46
        },
        {
          "slug": "cha-city-bus-station-2",
          "seq": 14,
          "cumKm": 6.259,
          "cumMin": 20.86
        },
        {
          "slug": "cha-vourkia-2",
          "seq": 15,
          "cumKm": 6.839,
          "cumMin": 22.8
        },
        {
          "slug": "cha-ag-antoniou-2",
          "seq": 16,
          "cumKm": 7.159,
          "cumMin": 23.86
        },
        {
          "slug": "cha-neas-kydonias-2",
          "seq": 17,
          "cumKm": 7.664,
          "cumMin": 25.55
        },
        {
          "slug": "cha-vamvakopoulo-2",
          "seq": 18,
          "cumKm": 8.286,
          "cumMin": 27.62
        },
        {
          "slug": "cha-national-road-3",
          "seq": 19,
          "cumKm": 8.846,
          "cumMin": 29.49
        },
        {
          "slug": "cha-synka-2",
          "seq": 20,
          "cumKm": 9.144,
          "cumMin": 30.48
        },
        {
          "slug": "cha-monachi-elia-2",
          "seq": 21,
          "cumKm": 9.733,
          "cumMin": 32.44
        },
        {
          "slug": "cha-tourna-2",
          "seq": 22,
          "cumKm": 10.341,
          "cumMin": 34.47
        },
        {
          "slug": "cha-kladisos-2",
          "seq": 23,
          "cumKm": 10.667,
          "cumMin": 35.56
        },
        {
          "slug": "cha-varousi-2",
          "seq": 24,
          "cumKm": 11.081,
          "cumMin": 36.94
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 25,
          "cumKm": 11.492,
          "cumMin": 38.31
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 26,
          "cumKm": 12.034,
          "cumMin": 40.11
        },
        {
          "slug": "cha-kydonias",
          "seq": 27,
          "cumKm": 12.279,
          "cumMin": 40.93
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 28,
          "cumKm": 12.569,
          "cumMin": 41.9
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 29,
          "cumKm": 12.861,
          "cumMin": 42.87
        },
        {
          "slug": "cha-skalidi",
          "seq": 30,
          "cumKm": 13.19,
          "cumMin": 43.97
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 31,
          "cumKm": 13.68,
          "cumMin": 45.6
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 32,
          "cumKm": 14.175,
          "cumMin": 47.25
        },
        {
          "slug": "cha-varousi",
          "seq": 33,
          "cumKm": 14.549,
          "cumMin": 48.5
        },
        {
          "slug": "cha-kladisos",
          "seq": 34,
          "cumKm": 15.03,
          "cumMin": 50.1
        },
        {
          "slug": "cha-tourna",
          "seq": 35,
          "cumKm": 15.44,
          "cumMin": 51.47
        },
        {
          "slug": "cha-monachi-elia",
          "seq": 36,
          "cumKm": 15.983,
          "cumMin": 53.28
        },
        {
          "slug": "cha-synka",
          "seq": 37,
          "cumKm": 16.462,
          "cumMin": 54.87
        },
        {
          "slug": "cha-national-road-2",
          "seq": 38,
          "cumKm": 16.868,
          "cumMin": 56.23
        },
        {
          "slug": "cha-vamvakopoulo",
          "seq": 39,
          "cumKm": 17.358,
          "cumMin": 57.86
        },
        {
          "slug": "cha-neas-kydonias",
          "seq": 40,
          "cumKm": 18.078,
          "cumMin": 60.26
        },
        {
          "slug": "cha-ag-antoniou",
          "seq": 41,
          "cumKm": 18.711,
          "cumMin": 62.37
        },
        {
          "slug": "cha-vourkia",
          "seq": 42,
          "cumKm": 18.859,
          "cumMin": 62.86
        },
        {
          "slug": "cha-city-bus-station",
          "seq": 43,
          "cumKm": 19.521,
          "cumMin": 65.07
        },
        {
          "slug": "cha-ag-konstantinou",
          "seq": 44,
          "cumKm": 19.88,
          "cumMin": 66.27
        },
        {
          "slug": "cha-sykolia",
          "seq": 45,
          "cumKm": 20.229,
          "cumMin": 67.43
        },
        {
          "slug": "cha-junction-galata",
          "seq": 46,
          "cumKm": 20.932,
          "cumMin": 69.77
        },
        {
          "slug": "cha-fylakes-agias",
          "seq": 47,
          "cumKm": 21.32,
          "cumMin": 71.07
        },
        {
          "slug": "cha-varypetro",
          "seq": 48,
          "cumKm": 21.694,
          "cumMin": 72.31
        },
        {
          "slug": "cha-ts-oadyk",
          "seq": 49,
          "cumKm": 22.136,
          "cumMin": 73.79
        }
      ]
    },
    {
      "code": "064",
      "lineCode": "CHA-19",
      "name": "ChANIA - Fylakes Agyias.",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-n-katastimata",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 1,
          "cumKm": 0.292,
          "cumMin": 0.97
        },
        {
          "slug": "cha-skalidi",
          "seq": 2,
          "cumKm": 0.62,
          "cumMin": 2.07
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 3,
          "cumKm": 1.111,
          "cumMin": 3.7
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 4,
          "cumKm": 1.606,
          "cumMin": 5.35
        },
        {
          "slug": "cha-varousi",
          "seq": 5,
          "cumKm": 1.98,
          "cumMin": 6.6
        },
        {
          "slug": "cha-kladisos",
          "seq": 6,
          "cumKm": 2.46,
          "cumMin": 8.2
        },
        {
          "slug": "cha-tourna",
          "seq": 7,
          "cumKm": 2.871,
          "cumMin": 9.57
        },
        {
          "slug": "cha-monachi-elia",
          "seq": 8,
          "cumKm": 3.414,
          "cumMin": 11.38
        },
        {
          "slug": "cha-synka",
          "seq": 9,
          "cumKm": 3.893,
          "cumMin": 12.98
        },
        {
          "slug": "cha-national-road-2",
          "seq": 10,
          "cumKm": 4.299,
          "cumMin": 14.33
        },
        {
          "slug": "cha-vamvakopoulo",
          "seq": 11,
          "cumKm": 4.789,
          "cumMin": 15.96
        },
        {
          "slug": "cha-neas-kydonias",
          "seq": 12,
          "cumKm": 5.509,
          "cumMin": 18.36
        },
        {
          "slug": "cha-ag-antoniou",
          "seq": 13,
          "cumKm": 6.142,
          "cumMin": 20.47
        },
        {
          "slug": "cha-vourkia",
          "seq": 14,
          "cumKm": 6.29,
          "cumMin": 20.97
        },
        {
          "slug": "cha-city-bus-station",
          "seq": 15,
          "cumKm": 6.952,
          "cumMin": 23.17
        },
        {
          "slug": "cha-ag-konstantinou",
          "seq": 16,
          "cumKm": 7.311,
          "cumMin": 24.37
        },
        {
          "slug": "cha-sykolia",
          "seq": 17,
          "cumKm": 7.66,
          "cumMin": 25.53
        },
        {
          "slug": "cha-junction-galata",
          "seq": 18,
          "cumKm": 8.362,
          "cumMin": 27.87
        },
        {
          "slug": "cha-fylakes-agias",
          "seq": 19,
          "cumKm": 8.751,
          "cumMin": 29.17
        },
        {
          "slug": "cha-varypetro",
          "seq": 20,
          "cumKm": 9.124,
          "cumMin": 30.41
        },
        {
          "slug": "cha-ts-oadyk",
          "seq": 21,
          "cumKm": 9.567,
          "cumMin": 31.89
        }
      ]
    },
    {
      "code": "066",
      "lineCode": "CHA-19",
      "name": "Fylakes Agyias",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-oadyk",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-varypetro-2",
          "seq": 1,
          "cumKm": 0.535,
          "cumMin": 1.78
        },
        {
          "slug": "cha-fylakes-agias-2",
          "seq": 2,
          "cumKm": 0.887,
          "cumMin": 2.96
        },
        {
          "slug": "cha-junction-galata-2",
          "seq": 3,
          "cumKm": 1.29,
          "cumMin": 4.3
        },
        {
          "slug": "cha-sykolia-2",
          "seq": 4,
          "cumKm": 1.958,
          "cumMin": 6.53
        },
        {
          "slug": "cha-ag-konstantinou-2",
          "seq": 5,
          "cumKm": 2.305,
          "cumMin": 7.68
        },
        {
          "slug": "cha-city-bus-station-2",
          "seq": 6,
          "cumKm": 2.725,
          "cumMin": 9.08
        },
        {
          "slug": "cha-ag-antoniou-2",
          "seq": 7,
          "cumKm": 3.625,
          "cumMin": 12.08
        },
        {
          "slug": "cha-neas-kydonias-2",
          "seq": 8,
          "cumKm": 4.13,
          "cumMin": 13.77
        },
        {
          "slug": "cha-vamvakopoulo-2",
          "seq": 9,
          "cumKm": 4.752,
          "cumMin": 15.84
        },
        {
          "slug": "cha-national-road-3",
          "seq": 10,
          "cumKm": 5.311,
          "cumMin": 17.7
        },
        {
          "slug": "cha-synka-2",
          "seq": 11,
          "cumKm": 5.609,
          "cumMin": 18.7
        },
        {
          "slug": "cha-monachi-elia-2",
          "seq": 12,
          "cumKm": 6.199,
          "cumMin": 20.66
        },
        {
          "slug": "cha-tourna-2",
          "seq": 13,
          "cumKm": 6.806,
          "cumMin": 22.69
        },
        {
          "slug": "cha-kladisos-2",
          "seq": 14,
          "cumKm": 7.133,
          "cumMin": 23.78
        },
        {
          "slug": "cha-varousi-2",
          "seq": 15,
          "cumKm": 7.546,
          "cumMin": 25.15
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 16,
          "cumKm": 7.957,
          "cumMin": 26.52
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 17,
          "cumKm": 8.5,
          "cumMin": 28.33
        },
        {
          "slug": "cha-kydonias",
          "seq": 18,
          "cumKm": 8.744,
          "cumMin": 29.15
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 19,
          "cumKm": 9.034,
          "cumMin": 30.11
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 20,
          "cumKm": 9.326,
          "cumMin": 31.09
        },
        {
          "slug": "cha-skalidi",
          "seq": 21,
          "cumKm": 9.655,
          "cumMin": 32.18
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 22,
          "cumKm": 10.146,
          "cumMin": 33.82
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 23,
          "cumKm": 10.64,
          "cumMin": 35.47
        },
        {
          "slug": "cha-varousi",
          "seq": 24,
          "cumKm": 11.014,
          "cumMin": 36.71
        },
        {
          "slug": "cha-kladisos",
          "seq": 25,
          "cumKm": 11.495,
          "cumMin": 38.32
        },
        {
          "slug": "cha-tourna",
          "seq": 26,
          "cumKm": 11.905,
          "cumMin": 39.68
        },
        {
          "slug": "cha-monachi-elia",
          "seq": 27,
          "cumKm": 12.449,
          "cumMin": 41.5
        },
        {
          "slug": "cha-synka",
          "seq": 28,
          "cumKm": 12.928,
          "cumMin": 43.09
        },
        {
          "slug": "cha-national-road-2",
          "seq": 29,
          "cumKm": 13.333,
          "cumMin": 44.44
        },
        {
          "slug": "cha-vamvakopoulo",
          "seq": 30,
          "cumKm": 13.823,
          "cumMin": 46.08
        },
        {
          "slug": "cha-neas-kydonias",
          "seq": 31,
          "cumKm": 14.543,
          "cumMin": 48.48
        },
        {
          "slug": "cha-ag-antoniou",
          "seq": 32,
          "cumKm": 15.176,
          "cumMin": 50.59
        },
        {
          "slug": "cha-city-bus-station",
          "seq": 33,
          "cumKm": 15.986,
          "cumMin": 53.29
        },
        {
          "slug": "cha-ag-konstantinou",
          "seq": 34,
          "cumKm": 16.346,
          "cumMin": 54.49
        },
        {
          "slug": "cha-sykolia",
          "seq": 35,
          "cumKm": 16.694,
          "cumMin": 55.65
        },
        {
          "slug": "cha-junction-galata",
          "seq": 36,
          "cumKm": 17.397,
          "cumMin": 57.99
        },
        {
          "slug": "cha-fylakes-agias",
          "seq": 37,
          "cumKm": 17.786,
          "cumMin": 59.29
        },
        {
          "slug": "cha-varypetro",
          "seq": 38,
          "cumKm": 18.159,
          "cumMin": 60.53
        },
        {
          "slug": "cha-ts-oadyk",
          "seq": 39,
          "cumKm": 18.601,
          "cumMin": 62
        }
      ]
    },
    {
      "code": "074",
      "lineCode": "CHA-19",
      "name": "AGYIA-MARMARA-POTISTIRIA-LIGIDES-ChANIA-LIG-POTMAR",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-oadyk",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-varypetro-3",
          "seq": 1,
          "cumKm": 0.474,
          "cumMin": 1.58
        },
        {
          "slug": "cha-ag-fanourios-2",
          "seq": 2,
          "cumKm": 0.78,
          "cumMin": 2.6
        },
        {
          "slug": "cha-ag-fanouriou-3",
          "seq": 3,
          "cumKm": 1.145,
          "cumMin": 3.82
        },
        {
          "slug": "cha-marmaras",
          "seq": 4,
          "cumKm": 1.482,
          "cumMin": 4.94
        },
        {
          "slug": "cha-diastavrosi-2-marmara",
          "seq": 5,
          "cumKm": 1.958,
          "cumMin": 6.53
        },
        {
          "slug": "cha-diastavrosi-oadyk",
          "seq": 6,
          "cumKm": 2.612,
          "cumMin": 8.71
        },
        {
          "slug": "cha-gipedo-varypetrou",
          "seq": 7,
          "cumKm": 3.2,
          "cumMin": 10.67
        },
        {
          "slug": "cha-potistiria",
          "seq": 8,
          "cumKm": 3.608,
          "cumMin": 12.03
        },
        {
          "slug": "cha-ligides-1i-stasi",
          "seq": 9,
          "cumKm": 4.401,
          "cumMin": 14.67
        },
        {
          "slug": "cha-ligides",
          "seq": 10,
          "cumKm": 4.841,
          "cumMin": 16.14
        },
        {
          "slug": "cha-sykolia-3",
          "seq": 11,
          "cumKm": 5.313,
          "cumMin": 17.71
        },
        {
          "slug": "cha-sykolia-2",
          "seq": 12,
          "cumKm": 5.491,
          "cumMin": 18.3
        },
        {
          "slug": "cha-ag-konstantinou-2",
          "seq": 13,
          "cumKm": 5.839,
          "cumMin": 19.46
        },
        {
          "slug": "cha-city-bus-station-2",
          "seq": 14,
          "cumKm": 6.259,
          "cumMin": 20.86
        },
        {
          "slug": "cha-vourkia-2",
          "seq": 15,
          "cumKm": 6.839,
          "cumMin": 22.8
        },
        {
          "slug": "cha-ag-antoniou-2",
          "seq": 16,
          "cumKm": 7.159,
          "cumMin": 23.86
        },
        {
          "slug": "cha-neas-kydonias-2",
          "seq": 17,
          "cumKm": 7.664,
          "cumMin": 25.55
        },
        {
          "slug": "cha-vamvakopoulo-2",
          "seq": 18,
          "cumKm": 8.286,
          "cumMin": 27.62
        },
        {
          "slug": "cha-national-road-3",
          "seq": 19,
          "cumKm": 8.846,
          "cumMin": 29.49
        },
        {
          "slug": "cha-synka-2",
          "seq": 20,
          "cumKm": 9.144,
          "cumMin": 30.48
        },
        {
          "slug": "cha-monachi-elia-2",
          "seq": 21,
          "cumKm": 9.733,
          "cumMin": 32.44
        },
        {
          "slug": "cha-tourna-2",
          "seq": 22,
          "cumKm": 10.341,
          "cumMin": 34.47
        },
        {
          "slug": "cha-kladisos-2",
          "seq": 23,
          "cumKm": 10.667,
          "cumMin": 35.56
        },
        {
          "slug": "cha-varousi-2",
          "seq": 24,
          "cumKm": 11.081,
          "cumMin": 36.94
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 25,
          "cumKm": 11.492,
          "cumMin": 38.31
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 26,
          "cumKm": 12.034,
          "cumMin": 40.11
        },
        {
          "slug": "cha-kydonias",
          "seq": 27,
          "cumKm": 12.279,
          "cumMin": 40.93
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 28,
          "cumKm": 12.569,
          "cumMin": 41.9
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 29,
          "cumKm": 12.861,
          "cumMin": 42.87
        },
        {
          "slug": "cha-skalidi",
          "seq": 30,
          "cumKm": 13.19,
          "cumMin": 43.97
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 31,
          "cumKm": 13.68,
          "cumMin": 45.6
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 32,
          "cumKm": 14.175,
          "cumMin": 47.25
        },
        {
          "slug": "cha-varousi",
          "seq": 33,
          "cumKm": 14.549,
          "cumMin": 48.5
        },
        {
          "slug": "cha-kladisos",
          "seq": 34,
          "cumKm": 15.03,
          "cumMin": 50.1
        },
        {
          "slug": "cha-tourna",
          "seq": 35,
          "cumKm": 15.44,
          "cumMin": 51.47
        },
        {
          "slug": "cha-monachi-elia",
          "seq": 36,
          "cumKm": 15.983,
          "cumMin": 53.28
        },
        {
          "slug": "cha-synka",
          "seq": 37,
          "cumKm": 16.462,
          "cumMin": 54.87
        },
        {
          "slug": "cha-national-road-2",
          "seq": 38,
          "cumKm": 16.868,
          "cumMin": 56.23
        },
        {
          "slug": "cha-vamvakopoulo",
          "seq": 39,
          "cumKm": 17.358,
          "cumMin": 57.86
        },
        {
          "slug": "cha-neas-kydonias",
          "seq": 40,
          "cumKm": 18.078,
          "cumMin": 60.26
        },
        {
          "slug": "cha-ag-antoniou",
          "seq": 41,
          "cumKm": 18.711,
          "cumMin": 62.37
        },
        {
          "slug": "cha-vourkia",
          "seq": 42,
          "cumKm": 18.859,
          "cumMin": 62.86
        },
        {
          "slug": "cha-city-bus-station",
          "seq": 43,
          "cumKm": 19.521,
          "cumMin": 65.07
        },
        {
          "slug": "cha-ag-konstantinou",
          "seq": 44,
          "cumKm": 19.88,
          "cumMin": 66.27
        },
        {
          "slug": "cha-sykolia-4",
          "seq": 45,
          "cumKm": 20.27,
          "cumMin": 67.57
        },
        {
          "slug": "cha-plateia-ligide",
          "seq": 46,
          "cumKm": 20.79,
          "cumMin": 69.3
        },
        {
          "slug": "cha-ligides-2i-stasi",
          "seq": 47,
          "cumKm": 21.256,
          "cumMin": 70.85
        },
        {
          "slug": "cha-potistiria-2",
          "seq": 48,
          "cumKm": 22.076,
          "cumMin": 73.59
        },
        {
          "slug": "cha-gipedo-varypetrou-2",
          "seq": 49,
          "cumKm": 22.485,
          "cumMin": 74.95
        },
        {
          "slug": "cha-diastavrosi-oadyk-2",
          "seq": 50,
          "cumKm": 22.947,
          "cumMin": 76.49
        },
        {
          "slug": "cha-diastavrosi-1-marmara",
          "seq": 51,
          "cumKm": 23.603,
          "cumMin": 78.68
        },
        {
          "slug": "cha-marmaras-2",
          "seq": 52,
          "cumKm": 24.007,
          "cumMin": 80.02
        },
        {
          "slug": "cha-ieros-naos-genniseos-tis-theotokou",
          "seq": 53,
          "cumKm": 24.324,
          "cumMin": 81.08
        },
        {
          "slug": "cha-ag-fanourios",
          "seq": 54,
          "cumKm": 24.583,
          "cumMin": 81.94
        },
        {
          "slug": "cha-varypetro-4",
          "seq": 55,
          "cumKm": 24.958,
          "cumMin": 83.19
        },
        {
          "slug": "cha-ts-oadyk",
          "seq": 56,
          "cumKm": 25.445,
          "cumMin": 84.82
        }
      ]
    },
    {
      "code": "078",
      "lineCode": "CHA-19",
      "name": "AGYIA-ChANIA-LIGIDE-POTISTIRIA-MARMARA-AGYIA",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-oadyk",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-varypetro-2",
          "seq": 1,
          "cumKm": 0.535,
          "cumMin": 1.78
        },
        {
          "slug": "cha-fylakes-agias-2",
          "seq": 2,
          "cumKm": 0.887,
          "cumMin": 2.96
        },
        {
          "slug": "cha-junction-galata-2",
          "seq": 3,
          "cumKm": 1.29,
          "cumMin": 4.3
        },
        {
          "slug": "cha-sykolia-2",
          "seq": 4,
          "cumKm": 1.958,
          "cumMin": 6.53
        },
        {
          "slug": "cha-ag-konstantinou-2",
          "seq": 5,
          "cumKm": 2.305,
          "cumMin": 7.68
        },
        {
          "slug": "cha-city-bus-station-2",
          "seq": 6,
          "cumKm": 2.725,
          "cumMin": 9.08
        },
        {
          "slug": "cha-vourkia-2",
          "seq": 7,
          "cumKm": 3.305,
          "cumMin": 11.02
        },
        {
          "slug": "cha-ag-antoniou-2",
          "seq": 8,
          "cumKm": 3.625,
          "cumMin": 12.08
        },
        {
          "slug": "cha-neas-kydonias-2",
          "seq": 9,
          "cumKm": 4.131,
          "cumMin": 13.77
        },
        {
          "slug": "cha-vamvakopoulo-2",
          "seq": 10,
          "cumKm": 4.753,
          "cumMin": 15.84
        },
        {
          "slug": "cha-national-road-3",
          "seq": 11,
          "cumKm": 5.312,
          "cumMin": 17.71
        },
        {
          "slug": "cha-synka-2",
          "seq": 12,
          "cumKm": 5.61,
          "cumMin": 18.7
        },
        {
          "slug": "cha-monachi-elia-2",
          "seq": 13,
          "cumKm": 6.2,
          "cumMin": 20.67
        },
        {
          "slug": "cha-tourna-2",
          "seq": 14,
          "cumKm": 6.807,
          "cumMin": 22.69
        },
        {
          "slug": "cha-kladisos-2",
          "seq": 15,
          "cumKm": 7.133,
          "cumMin": 23.78
        },
        {
          "slug": "cha-varousi-2",
          "seq": 16,
          "cumKm": 7.547,
          "cumMin": 25.16
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 17,
          "cumKm": 7.958,
          "cumMin": 26.53
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 18,
          "cumKm": 8.5,
          "cumMin": 28.33
        },
        {
          "slug": "cha-kydonias",
          "seq": 19,
          "cumKm": 8.745,
          "cumMin": 29.15
        },
        {
          "slug": "cha-n-katastimata",
          "seq": 20,
          "cumKm": 9.035,
          "cumMin": 30.12
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 21,
          "cumKm": 9.327,
          "cumMin": 31.09
        },
        {
          "slug": "cha-skalidi",
          "seq": 22,
          "cumKm": 9.656,
          "cumMin": 32.19
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 23,
          "cumKm": 10.147,
          "cumMin": 33.82
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 24,
          "cumKm": 10.641,
          "cumMin": 35.47
        },
        {
          "slug": "cha-varousi",
          "seq": 25,
          "cumKm": 11.015,
          "cumMin": 36.72
        },
        {
          "slug": "cha-kladisos",
          "seq": 26,
          "cumKm": 11.496,
          "cumMin": 38.32
        },
        {
          "slug": "cha-tourna",
          "seq": 27,
          "cumKm": 11.906,
          "cumMin": 39.69
        },
        {
          "slug": "cha-monachi-elia",
          "seq": 28,
          "cumKm": 12.45,
          "cumMin": 41.5
        },
        {
          "slug": "cha-synka",
          "seq": 29,
          "cumKm": 12.929,
          "cumMin": 43.1
        },
        {
          "slug": "cha-national-road-2",
          "seq": 30,
          "cumKm": 13.334,
          "cumMin": 44.45
        },
        {
          "slug": "cha-vamvakopoulo",
          "seq": 31,
          "cumKm": 13.824,
          "cumMin": 46.08
        },
        {
          "slug": "cha-neas-kydonias",
          "seq": 32,
          "cumKm": 14.544,
          "cumMin": 48.48
        },
        {
          "slug": "cha-ag-antoniou",
          "seq": 33,
          "cumKm": 15.177,
          "cumMin": 50.59
        },
        {
          "slug": "cha-vourkia",
          "seq": 34,
          "cumKm": 15.325,
          "cumMin": 51.08
        },
        {
          "slug": "cha-city-bus-station",
          "seq": 35,
          "cumKm": 15.987,
          "cumMin": 53.29
        },
        {
          "slug": "cha-ag-konstantinou",
          "seq": 36,
          "cumKm": 16.346,
          "cumMin": 54.49
        },
        {
          "slug": "cha-sykolia",
          "seq": 37,
          "cumKm": 16.695,
          "cumMin": 55.65
        },
        {
          "slug": "cha-sykolia-4",
          "seq": 38,
          "cumKm": 16.798,
          "cumMin": 55.99
        },
        {
          "slug": "cha-plateia-ligide",
          "seq": 39,
          "cumKm": 17.317,
          "cumMin": 57.72
        },
        {
          "slug": "cha-ligides-2i-stasi",
          "seq": 40,
          "cumKm": 17.783,
          "cumMin": 59.28
        },
        {
          "slug": "cha-potistiria-2",
          "seq": 41,
          "cumKm": 18.604,
          "cumMin": 62.01
        },
        {
          "slug": "cha-gipedo-varypetrou-2",
          "seq": 42,
          "cumKm": 19.012,
          "cumMin": 63.37
        },
        {
          "slug": "cha-diastavrosi-oadyk-2",
          "seq": 43,
          "cumKm": 19.474,
          "cumMin": 64.91
        },
        {
          "slug": "cha-diastavrosi-1-marmara",
          "seq": 44,
          "cumKm": 20.13,
          "cumMin": 67.1
        },
        {
          "slug": "cha-marmaras-2",
          "seq": 45,
          "cumKm": 20.534,
          "cumMin": 68.45
        },
        {
          "slug": "cha-ieros-naos-genniseos-tis-theotokou",
          "seq": 46,
          "cumKm": 20.852,
          "cumMin": 69.51
        },
        {
          "slug": "cha-ag-fanourios",
          "seq": 47,
          "cumKm": 21.111,
          "cumMin": 70.37
        },
        {
          "slug": "cha-varypetro-4",
          "seq": 48,
          "cumKm": 21.485,
          "cumMin": 71.62
        },
        {
          "slug": "cha-ts-oadyk",
          "seq": 49,
          "cumKm": 21.973,
          "cumMin": 73.24
        }
      ]
    },
    {
      "code": "021",
      "lineCode": "CHA-20",
      "name": "Agora - Lentariana",
      "direction": 2,
      "stops": [
        {
          "slug": "cha-national-bank",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 1,
          "cumKm": 0.258,
          "cumMin": 0.86
        },
        {
          "slug": "cha-roloi",
          "seq": 2,
          "cumKm": 0.639,
          "cumMin": 2.13
        },
        {
          "slug": "cha-olympia",
          "seq": 3,
          "cumKm": 0.973,
          "cumMin": 3.24
        },
        {
          "slug": "cha-dikastiria",
          "seq": 4,
          "cumKm": 1.312,
          "cumMin": 4.37
        },
        {
          "slug": "cha-ag-anna-2",
          "seq": 5,
          "cumKm": 1.826,
          "cumMin": 6.09
        },
        {
          "slug": "cha-vlastou-2",
          "seq": 6,
          "cumKm": 2.175,
          "cumMin": 7.25
        },
        {
          "slug": "cha-agios-charalampos",
          "seq": 7,
          "cumKm": 2.543,
          "cumMin": 8.48
        },
        {
          "slug": "cha-kantanoleontos",
          "seq": 8,
          "cumKm": 2.669,
          "cumMin": 8.9
        },
        {
          "slug": "cha-gerogianni-2",
          "seq": 9,
          "cumKm": 2.961,
          "cumMin": 9.87
        },
        {
          "slug": "cha-doxogianni-2",
          "seq": 10,
          "cumKm": 3.2,
          "cumMin": 10.67
        },
        {
          "slug": "cha-proimou-2",
          "seq": 11,
          "cumKm": 3.471,
          "cumMin": 11.57
        },
        {
          "slug": "cha-kanteridon-2",
          "seq": 12,
          "cumKm": 3.716,
          "cumMin": 12.39
        },
        {
          "slug": "cha-roumeliotaki",
          "seq": 13,
          "cumKm": 3.994,
          "cumMin": 13.31
        },
        {
          "slug": "cha-georgiou-sgourou",
          "seq": 14,
          "cumKm": 4.175,
          "cumMin": 13.92
        },
        {
          "slug": "cha-flamingko",
          "seq": 15,
          "cumKm": 4.369,
          "cumMin": 14.56
        },
        {
          "slug": "cha-ts-lentariana",
          "seq": 16,
          "cumKm": 4.532,
          "cumMin": 15.11
        },
        {
          "slug": "cha-ergatikes-katoikies-4",
          "seq": 17,
          "cumKm": 4.742,
          "cumMin": 15.81
        },
        {
          "slug": "cha-kanteridon",
          "seq": 18,
          "cumKm": 5.053,
          "cumMin": 16.84
        },
        {
          "slug": "cha-proimou",
          "seq": 19,
          "cumKm": 5.287,
          "cumMin": 17.62
        },
        {
          "slug": "cha-doxogianni",
          "seq": 20,
          "cumKm": 5.567,
          "cumMin": 18.56
        },
        {
          "slug": "cha-gerogianni",
          "seq": 21,
          "cumKm": 5.761,
          "cumMin": 19.2
        },
        {
          "slug": "cha-vryson",
          "seq": 22,
          "cumKm": 6.006,
          "cumMin": 20.02
        },
        {
          "slug": "cha-ag-charalampos",
          "seq": 23,
          "cumKm": 6.297,
          "cumMin": 20.99
        },
        {
          "slug": "cha-vlastou",
          "seq": 24,
          "cumKm": 6.623,
          "cumMin": 22.08
        },
        {
          "slug": "cha-ag-anna",
          "seq": 25,
          "cumKm": 6.863,
          "cumMin": 22.88
        },
        {
          "slug": "cha-tsontou-varda",
          "seq": 26,
          "cumKm": 7.145,
          "cumMin": 23.82
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 27,
          "cumKm": 7.508,
          "cumMin": 25.03
        },
        {
          "slug": "cha-olympia-2",
          "seq": 28,
          "cumKm": 7.915,
          "cumMin": 26.38
        },
        {
          "slug": "cha-roloi-2",
          "seq": 29,
          "cumKm": 8.228,
          "cumMin": 27.43
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 30,
          "cumKm": 8.556,
          "cumMin": 28.52
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 31,
          "cumKm": 8.75,
          "cumMin": 29.17
        }
      ]
    },
    {
      "code": "059",
      "lineCode": "CHA-20",
      "name": "Lentariana - AG. Ioannis - MERARChIA - Vlite",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-lentariana",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ergatikes-katoikies-4",
          "seq": 1,
          "cumKm": 0.209,
          "cumMin": 0.7
        },
        {
          "slug": "cha-kanteridon",
          "seq": 2,
          "cumKm": 0.521,
          "cumMin": 1.74
        },
        {
          "slug": "cha-proimou",
          "seq": 3,
          "cumKm": 0.754,
          "cumMin": 2.51
        },
        {
          "slug": "cha-doxogianni",
          "seq": 4,
          "cumKm": 1.035,
          "cumMin": 3.45
        },
        {
          "slug": "cha-gerogianni",
          "seq": 5,
          "cumKm": 1.229,
          "cumMin": 4.1
        },
        {
          "slug": "cha-vryson",
          "seq": 6,
          "cumKm": 1.473,
          "cumMin": 4.91
        },
        {
          "slug": "cha-ag-charalampos",
          "seq": 7,
          "cumKm": 1.765,
          "cumMin": 5.88
        },
        {
          "slug": "cha-vlastou",
          "seq": 8,
          "cumKm": 2.09,
          "cumMin": 6.97
        },
        {
          "slug": "cha-ag-anna",
          "seq": 9,
          "cumKm": 2.33,
          "cumMin": 7.77
        },
        {
          "slug": "cha-tsontou-varda",
          "seq": 10,
          "cumKm": 2.613,
          "cumMin": 8.71
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 11,
          "cumKm": 2.976,
          "cumMin": 9.92
        },
        {
          "slug": "cha-olympia-2",
          "seq": 12,
          "cumKm": 3.382,
          "cumMin": 11.27
        },
        {
          "slug": "cha-roloi-2",
          "seq": 13,
          "cumKm": 3.695,
          "cumMin": 12.32
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 14,
          "cumKm": 4.023,
          "cumMin": 13.41
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 15,
          "cumKm": 4.217,
          "cumMin": 14.06
        },
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 16,
          "cumKm": 4.391,
          "cumMin": 14.64
        },
        {
          "slug": "cha-apokoronou",
          "seq": 17,
          "cumKm": 4.616,
          "cumMin": 15.39
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 18,
          "cumKm": 5.139,
          "cumMin": 17.13
        },
        {
          "slug": "cha-kritovoulidou",
          "seq": 19,
          "cumKm": 5.558,
          "cumMin": 18.53
        },
        {
          "slug": "cha-g-chatzidaki",
          "seq": 20,
          "cumKm": 5.873,
          "cumMin": 19.58
        },
        {
          "slug": "cha-naos-petrou-kai-pavlou",
          "seq": 21,
          "cumKm": 6.133,
          "cumMin": 20.44
        },
        {
          "slug": "cha-dexameni",
          "seq": 22,
          "cumKm": 6.591,
          "cumMin": 21.97
        },
        {
          "slug": "cha-parko-ag-ioannou",
          "seq": 23,
          "cumKm": 6.829,
          "cumMin": 22.76
        },
        {
          "slug": "cha-volani",
          "seq": 24,
          "cumKm": 7.133,
          "cumMin": 23.78
        },
        {
          "slug": "cha-terma-makedonomachon",
          "seq": 25,
          "cumKm": 7.453,
          "cumMin": 24.84
        },
        {
          "slug": "cha-kontekaki",
          "seq": 26,
          "cumKm": 7.621,
          "cumMin": 25.4
        },
        {
          "slug": "cha-k-gerakaki",
          "seq": 27,
          "cumKm": 7.962,
          "cumMin": 26.54
        },
        {
          "slug": "cha-parko-ag-ioanni",
          "seq": 28,
          "cumKm": 8.16,
          "cumMin": 27.2
        },
        {
          "slug": "cha-panteli-vavoule",
          "seq": 29,
          "cumKm": 8.302,
          "cumMin": 27.67
        },
        {
          "slug": "cha-prevantorio",
          "seq": 30,
          "cumKm": 8.471,
          "cumMin": 28.24
        },
        {
          "slug": "cha-ag-ioannis",
          "seq": 31,
          "cumKm": 8.919,
          "cumMin": 29.73
        },
        {
          "slug": "cha-xanthoudidou",
          "seq": 32,
          "cumKm": 9.281,
          "cumMin": 30.94
        },
        {
          "slug": "cha-nearchou",
          "seq": 33,
          "cumKm": 9.635,
          "cumMin": 32.12
        },
        {
          "slug": "cha-war-museum",
          "seq": 34,
          "cumKm": 10.146,
          "cumMin": 33.82
        },
        {
          "slug": "cha-ktistaki",
          "seq": 35,
          "cumKm": 10.589,
          "cumMin": 35.3
        },
        {
          "slug": "cha-national-bank",
          "seq": 36,
          "cumKm": 10.769,
          "cumMin": 35.9
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 37,
          "cumKm": 11.027,
          "cumMin": 36.76
        },
        {
          "slug": "cha-roloi",
          "seq": 38,
          "cumKm": 11.408,
          "cumMin": 38.03
        },
        {
          "slug": "cha-olympia",
          "seq": 39,
          "cumKm": 11.742,
          "cumMin": 39.14
        },
        {
          "slug": "cha-dikastiria",
          "seq": 40,
          "cumKm": 12.081,
          "cumMin": 40.27
        },
        {
          "slug": "cha-ag-anna-2",
          "seq": 41,
          "cumKm": 12.595,
          "cumMin": 41.98
        },
        {
          "slug": "cha-vlastou-2",
          "seq": 42,
          "cumKm": 12.944,
          "cumMin": 43.15
        },
        {
          "slug": "cha-agios-charalampos",
          "seq": 43,
          "cumKm": 13.312,
          "cumMin": 44.37
        },
        {
          "slug": "cha-kantanoleontos",
          "seq": 44,
          "cumKm": 13.438,
          "cumMin": 44.79
        },
        {
          "slug": "cha-gerogianni-2",
          "seq": 45,
          "cumKm": 13.73,
          "cumMin": 45.77
        },
        {
          "slug": "cha-doxogianni-2",
          "seq": 46,
          "cumKm": 13.969,
          "cumMin": 46.56
        },
        {
          "slug": "cha-proimou-2",
          "seq": 47,
          "cumKm": 14.24,
          "cumMin": 47.47
        },
        {
          "slug": "cha-kanteridon-2",
          "seq": 48,
          "cumKm": 14.485,
          "cumMin": 48.28
        },
        {
          "slug": "cha-merarchia",
          "seq": 49,
          "cumKm": 15.234,
          "cumMin": 50.78
        },
        {
          "slug": "cha-dimotaki",
          "seq": 50,
          "cumKm": 15.934,
          "cumMin": 53.11
        },
        {
          "slug": "cha-symmachon",
          "seq": 51,
          "cumKm": 16.18,
          "cumMin": 53.93
        },
        {
          "slug": "cha-akrotiriou",
          "seq": 52,
          "cumKm": 16.601,
          "cumMin": 55.34
        },
        {
          "slug": "cha-kato-souda-2",
          "seq": 53,
          "cumKm": 17.287,
          "cumMin": 57.62
        },
        {
          "slug": "cha-akrotiriou-2",
          "seq": 54,
          "cumKm": 17.987,
          "cumMin": 59.96
        },
        {
          "slug": "cha-kourkoutaki",
          "seq": 55,
          "cumKm": 18.382,
          "cumMin": 61.27
        },
        {
          "slug": "cha-dimotaki-2",
          "seq": 56,
          "cumKm": 18.752,
          "cumMin": 62.51
        },
        {
          "slug": "cha-merarchia-2",
          "seq": 57,
          "cumKm": 19.249,
          "cumMin": 64.16
        },
        {
          "slug": "cha-roumeliotaki",
          "seq": 58,
          "cumKm": 20.08,
          "cumMin": 66.93
        },
        {
          "slug": "cha-georgiou-sgourou",
          "seq": 59,
          "cumKm": 20.262,
          "cumMin": 67.54
        },
        {
          "slug": "cha-flamingko",
          "seq": 60,
          "cumKm": 20.456,
          "cumMin": 68.19
        },
        {
          "slug": "cha-ts-lentariana",
          "seq": 61,
          "cumKm": 20.618,
          "cumMin": 68.73
        }
      ]
    },
    {
      "code": "060",
      "lineCode": "CHA-20",
      "name": "Lentariana - AG. Ioannis",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-lentariana",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ergatikes-katoikies-4",
          "seq": 1,
          "cumKm": 0.209,
          "cumMin": 0.7
        },
        {
          "slug": "cha-kanteridon",
          "seq": 2,
          "cumKm": 0.521,
          "cumMin": 1.74
        },
        {
          "slug": "cha-proimou",
          "seq": 3,
          "cumKm": 0.754,
          "cumMin": 2.51
        },
        {
          "slug": "cha-doxogianni",
          "seq": 4,
          "cumKm": 1.035,
          "cumMin": 3.45
        },
        {
          "slug": "cha-m-papadaki",
          "seq": 5,
          "cumKm": 1.316,
          "cumMin": 4.39
        },
        {
          "slug": "cha-vryson",
          "seq": 6,
          "cumKm": 1.471,
          "cumMin": 4.9
        },
        {
          "slug": "cha-ag-charalampos",
          "seq": 7,
          "cumKm": 1.763,
          "cumMin": 5.88
        },
        {
          "slug": "cha-vlastou",
          "seq": 8,
          "cumKm": 2.088,
          "cumMin": 6.96
        },
        {
          "slug": "cha-ag-anna",
          "seq": 9,
          "cumKm": 2.328,
          "cumMin": 7.76
        },
        {
          "slug": "cha-tsontou-varda",
          "seq": 10,
          "cumKm": 2.611,
          "cumMin": 8.7
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 11,
          "cumKm": 2.974,
          "cumMin": 9.91
        },
        {
          "slug": "cha-olympia-2",
          "seq": 12,
          "cumKm": 3.38,
          "cumMin": 11.27
        },
        {
          "slug": "cha-roloi-2",
          "seq": 13,
          "cumKm": 3.693,
          "cumMin": 12.31
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 14,
          "cumKm": 4.021,
          "cumMin": 13.4
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 15,
          "cumKm": 4.215,
          "cumMin": 14.05
        },
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 16,
          "cumKm": 4.389,
          "cumMin": 14.63
        },
        {
          "slug": "cha-apokoronou",
          "seq": 17,
          "cumKm": 4.614,
          "cumMin": 15.38
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 18,
          "cumKm": 5.137,
          "cumMin": 17.12
        },
        {
          "slug": "cha-v-psilaki",
          "seq": 19,
          "cumKm": 5.563,
          "cumMin": 18.54
        },
        {
          "slug": "cha-g-chatzidaki",
          "seq": 20,
          "cumKm": 5.871,
          "cumMin": 19.57
        },
        {
          "slug": "cha-naos-petrou-kai-pavlou",
          "seq": 21,
          "cumKm": 6.131,
          "cumMin": 20.44
        },
        {
          "slug": "cha-dexameni",
          "seq": 22,
          "cumKm": 6.589,
          "cumMin": 21.96
        },
        {
          "slug": "cha-i-archontaki",
          "seq": 23,
          "cumKm": 6.835,
          "cumMin": 22.78
        },
        {
          "slug": "cha-volani",
          "seq": 24,
          "cumKm": 7.131,
          "cumMin": 23.77
        },
        {
          "slug": "cha-terma-makedonomachon",
          "seq": 25,
          "cumKm": 7.451,
          "cumMin": 24.84
        },
        {
          "slug": "cha-kontekaki",
          "seq": 26,
          "cumKm": 7.62,
          "cumMin": 25.4
        },
        {
          "slug": "cha-k-gerakaki",
          "seq": 27,
          "cumKm": 7.961,
          "cumMin": 26.54
        },
        {
          "slug": "cha-parko-ag-ioanni",
          "seq": 28,
          "cumKm": 8.158,
          "cumMin": 27.19
        },
        {
          "slug": "cha-p-vavoule",
          "seq": 29,
          "cumKm": 8.302,
          "cumMin": 27.67
        },
        {
          "slug": "cha-prevantorio",
          "seq": 30,
          "cumKm": 8.469,
          "cumMin": 28.23
        },
        {
          "slug": "cha-ag-ioannis",
          "seq": 31,
          "cumKm": 8.917,
          "cumMin": 29.72
        },
        {
          "slug": "cha-xanthoudidou",
          "seq": 32,
          "cumKm": 9.279,
          "cumMin": 30.93
        },
        {
          "slug": "cha-nearchou",
          "seq": 33,
          "cumKm": 9.633,
          "cumMin": 32.11
        },
        {
          "slug": "cha-war-museum",
          "seq": 34,
          "cumKm": 10.144,
          "cumMin": 33.81
        },
        {
          "slug": "cha-ktistaki",
          "seq": 35,
          "cumKm": 10.587,
          "cumMin": 35.29
        },
        {
          "slug": "cha-national-bank",
          "seq": 36,
          "cumKm": 10.767,
          "cumMin": 35.89
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 37,
          "cumKm": 11.026,
          "cumMin": 36.75
        },
        {
          "slug": "cha-roloi",
          "seq": 38,
          "cumKm": 11.406,
          "cumMin": 38.02
        },
        {
          "slug": "cha-olympia",
          "seq": 39,
          "cumKm": 11.74,
          "cumMin": 39.13
        },
        {
          "slug": "cha-dikastiria",
          "seq": 40,
          "cumKm": 12.079,
          "cumMin": 40.26
        },
        {
          "slug": "cha-ag-anna-2",
          "seq": 41,
          "cumKm": 12.593,
          "cumMin": 41.98
        },
        {
          "slug": "cha-vlastou-2",
          "seq": 42,
          "cumKm": 12.942,
          "cumMin": 43.14
        },
        {
          "slug": "cha-agios-charalampos",
          "seq": 43,
          "cumKm": 13.31,
          "cumMin": 44.37
        },
        {
          "slug": "cha-vryson-2",
          "seq": 44,
          "cumKm": 13.489,
          "cumMin": 44.96
        },
        {
          "slug": "cha-gerogianni-2",
          "seq": 45,
          "cumKm": 13.718,
          "cumMin": 45.73
        },
        {
          "slug": "cha-doxogianni-2",
          "seq": 46,
          "cumKm": 13.956,
          "cumMin": 46.52
        },
        {
          "slug": "cha-proimou-2",
          "seq": 47,
          "cumKm": 14.227,
          "cumMin": 47.42
        },
        {
          "slug": "cha-kanteridon-2",
          "seq": 48,
          "cumKm": 14.472,
          "cumMin": 48.24
        },
        {
          "slug": "cha-roumeliotaki",
          "seq": 49,
          "cumKm": 14.75,
          "cumMin": 49.17
        },
        {
          "slug": "cha-georgiou-sgourou",
          "seq": 50,
          "cumKm": 14.932,
          "cumMin": 49.77
        },
        {
          "slug": "cha-ts-lentariana",
          "seq": 51,
          "cumKm": 15.286,
          "cumMin": 50.95
        }
      ]
    },
    {
      "code": "073",
      "lineCode": "CHA-20",
      "name": "Agora - Lentariana - AG. Ioannis",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-national-bank",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ktistaki-2",
          "seq": 1,
          "cumKm": 0.258,
          "cumMin": 0.86
        },
        {
          "slug": "cha-roloi",
          "seq": 2,
          "cumKm": 0.639,
          "cumMin": 2.13
        },
        {
          "slug": "cha-olympia",
          "seq": 3,
          "cumKm": 0.973,
          "cumMin": 3.24
        },
        {
          "slug": "cha-dikastiria",
          "seq": 4,
          "cumKm": 1.312,
          "cumMin": 4.37
        },
        {
          "slug": "cha-ag-anna-2",
          "seq": 5,
          "cumKm": 1.826,
          "cumMin": 6.09
        },
        {
          "slug": "cha-vlastou-2",
          "seq": 6,
          "cumKm": 2.175,
          "cumMin": 7.25
        },
        {
          "slug": "cha-agios-charalampos",
          "seq": 7,
          "cumKm": 2.543,
          "cumMin": 8.48
        },
        {
          "slug": "cha-kantanoleontos",
          "seq": 8,
          "cumKm": 2.669,
          "cumMin": 8.9
        },
        {
          "slug": "cha-gerogianni-2",
          "seq": 9,
          "cumKm": 2.961,
          "cumMin": 9.87
        },
        {
          "slug": "cha-doxogianni-2",
          "seq": 10,
          "cumKm": 3.2,
          "cumMin": 10.67
        },
        {
          "slug": "cha-proimou-2",
          "seq": 11,
          "cumKm": 3.471,
          "cumMin": 11.57
        },
        {
          "slug": "cha-kanteridon-2",
          "seq": 12,
          "cumKm": 3.716,
          "cumMin": 12.39
        },
        {
          "slug": "cha-roumeliotaki",
          "seq": 13,
          "cumKm": 3.994,
          "cumMin": 13.31
        },
        {
          "slug": "cha-georgiou-sgourou",
          "seq": 14,
          "cumKm": 4.175,
          "cumMin": 13.92
        },
        {
          "slug": "cha-flamingko",
          "seq": 15,
          "cumKm": 4.369,
          "cumMin": 14.56
        },
        {
          "slug": "cha-ts-lentariana",
          "seq": 16,
          "cumKm": 4.532,
          "cumMin": 15.11
        },
        {
          "slug": "cha-ergatikes-katoikies-4",
          "seq": 17,
          "cumKm": 4.742,
          "cumMin": 15.81
        },
        {
          "slug": "cha-kanteridon",
          "seq": 18,
          "cumKm": 5.053,
          "cumMin": 16.84
        },
        {
          "slug": "cha-proimou",
          "seq": 19,
          "cumKm": 5.287,
          "cumMin": 17.62
        },
        {
          "slug": "cha-doxogianni",
          "seq": 20,
          "cumKm": 5.567,
          "cumMin": 18.56
        },
        {
          "slug": "cha-gerogianni",
          "seq": 21,
          "cumKm": 5.761,
          "cumMin": 19.2
        },
        {
          "slug": "cha-vryson",
          "seq": 22,
          "cumKm": 6.006,
          "cumMin": 20.02
        },
        {
          "slug": "cha-ag-charalampos",
          "seq": 23,
          "cumKm": 6.297,
          "cumMin": 20.99
        },
        {
          "slug": "cha-vlastou",
          "seq": 24,
          "cumKm": 6.623,
          "cumMin": 22.08
        },
        {
          "slug": "cha-ag-anna",
          "seq": 25,
          "cumKm": 6.863,
          "cumMin": 22.88
        },
        {
          "slug": "cha-tsontou-varda",
          "seq": 26,
          "cumKm": 7.145,
          "cumMin": 23.82
        },
        {
          "slug": "cha-dikastiria-2",
          "seq": 27,
          "cumKm": 7.508,
          "cumMin": 25.03
        },
        {
          "slug": "cha-olympia-2",
          "seq": 28,
          "cumKm": 7.915,
          "cumMin": 26.38
        },
        {
          "slug": "cha-roloi-2",
          "seq": 29,
          "cumKm": 8.228,
          "cumMin": 27.43
        },
        {
          "slug": "cha-ktistaki-3",
          "seq": 30,
          "cumKm": 8.556,
          "cumMin": 28.52
        },
        {
          "slug": "cha-chamber-of-chania-old-market",
          "seq": 31,
          "cumKm": 8.75,
          "cumMin": 29.17
        },
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 32,
          "cumKm": 8.923,
          "cumMin": 29.74
        },
        {
          "slug": "cha-apokoronou",
          "seq": 33,
          "cumKm": 9.148,
          "cumMin": 30.49
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 34,
          "cumKm": 9.671,
          "cumMin": 32.24
        },
        {
          "slug": "cha-kritovoulidou",
          "seq": 35,
          "cumKm": 10.091,
          "cumMin": 33.64
        },
        {
          "slug": "cha-g-chatzidaki",
          "seq": 36,
          "cumKm": 10.406,
          "cumMin": 34.69
        },
        {
          "slug": "cha-naos-petrou-kai-pavlou",
          "seq": 37,
          "cumKm": 10.665,
          "cumMin": 35.55
        },
        {
          "slug": "cha-dexameni",
          "seq": 38,
          "cumKm": 11.124,
          "cumMin": 37.08
        },
        {
          "slug": "cha-parko-ag-ioannou",
          "seq": 39,
          "cumKm": 11.362,
          "cumMin": 37.87
        },
        {
          "slug": "cha-volani",
          "seq": 40,
          "cumKm": 11.665,
          "cumMin": 38.88
        },
        {
          "slug": "cha-terma-makedonomachon",
          "seq": 41,
          "cumKm": 11.985,
          "cumMin": 39.95
        },
        {
          "slug": "cha-kontekaki",
          "seq": 42,
          "cumKm": 12.153,
          "cumMin": 40.51
        },
        {
          "slug": "cha-k-gerakaki",
          "seq": 43,
          "cumKm": 12.495,
          "cumMin": 41.65
        },
        {
          "slug": "cha-parko-ag-ioanni",
          "seq": 44,
          "cumKm": 12.692,
          "cumMin": 42.31
        },
        {
          "slug": "cha-prevantorio",
          "seq": 45,
          "cumKm": 12.998,
          "cumMin": 43.33
        },
        {
          "slug": "cha-ag-ioannis",
          "seq": 46,
          "cumKm": 13.445,
          "cumMin": 44.82
        },
        {
          "slug": "cha-xanthoudidou",
          "seq": 47,
          "cumKm": 13.808,
          "cumMin": 46.03
        },
        {
          "slug": "cha-terma-malinou",
          "seq": 48,
          "cumKm": 14.12,
          "cumMin": 47.07
        },
        {
          "slug": "cha-nearchou",
          "seq": 49,
          "cumKm": 14.206,
          "cumMin": 47.35
        },
        {
          "slug": "cha-war-museum",
          "seq": 50,
          "cumKm": 14.717,
          "cumMin": 49.06
        },
        {
          "slug": "cha-ktistaki",
          "seq": 51,
          "cumKm": 15.16,
          "cumMin": 50.53
        }
      ]
    },
    {
      "code": "051",
      "lineCode": "CHA-21",
      "name": "KALAMAKI(Th)",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ag-dimitrios-2",
          "seq": 1,
          "cumKm": 0.312,
          "cumMin": 1.04
        },
        {
          "slug": "cha-kalamaki-2",
          "seq": 2,
          "cumKm": 0.847,
          "cumMin": 2.82
        },
        {
          "slug": "cha-glaros-2",
          "seq": 3,
          "cumKm": 1.274,
          "cumMin": 4.25
        },
        {
          "slug": "cha-hotel-kalliston-2",
          "seq": 4,
          "cumKm": 1.611,
          "cumMin": 5.37
        },
        {
          "slug": "cha-strati-pantelaki-2",
          "seq": 5,
          "cumKm": 2.043,
          "cumMin": 6.81
        },
        {
          "slug": "cha-bmw-2",
          "seq": 6,
          "cumKm": 2.426,
          "cumMin": 8.09
        },
        {
          "slug": "cha-synka-3",
          "seq": 7,
          "cumKm": 2.672,
          "cumMin": 8.91
        },
        {
          "slug": "cha-anoixis-2",
          "seq": 8,
          "cumKm": 2.979,
          "cumMin": 9.93
        },
        {
          "slug": "cha-nearchou-3",
          "seq": 9,
          "cumKm": 3.178,
          "cumMin": 10.59
        },
        {
          "slug": "cha-drakonianou-2",
          "seq": 10,
          "cumKm": 3.402,
          "cumMin": 11.34
        },
        {
          "slug": "cha-ag-apostolon-beach-2",
          "seq": 11,
          "cumKm": 3.758,
          "cumMin": 12.53
        },
        {
          "slug": "cha-first-beach-of-ag-apostolon-2",
          "seq": 12,
          "cumKm": 4.426,
          "cumMin": 14.75
        },
        {
          "slug": "cha-forum-2",
          "seq": 13,
          "cumKm": 4.903,
          "cumMin": 16.34
        },
        {
          "slug": "cha-golden-beach-2",
          "seq": 14,
          "cumKm": 5.145,
          "cumMin": 17.15
        },
        {
          "slug": "cha-hotel-anais-2",
          "seq": 15,
          "cumKm": 5.485,
          "cumMin": 18.28
        },
        {
          "slug": "cha-jumbo",
          "seq": 16,
          "cumKm": 5.728,
          "cumMin": 19.09
        },
        {
          "slug": "cha-triton-hotel",
          "seq": 17,
          "cumKm": 6.033,
          "cumMin": 20.11
        },
        {
          "slug": "cha-germaniko-pouli-2",
          "seq": 18,
          "cumKm": 6.373,
          "cumMin": 21.24
        },
        {
          "slug": "cha-hotel-kedrissos-2",
          "seq": 19,
          "cumKm": 6.687,
          "cumMin": 22.29
        },
        {
          "slug": "cha-parigoria-2",
          "seq": 20,
          "cumKm": 7.101,
          "cumMin": 23.67
        },
        {
          "slug": "cha-kladisos-4",
          "seq": 21,
          "cumKm": 7.472,
          "cumMin": 24.91
        },
        {
          "slug": "cha-varousi-2",
          "seq": 22,
          "cumKm": 7.948,
          "cumMin": 26.49
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 23,
          "cumKm": 8.359,
          "cumMin": 27.86
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 24,
          "cumKm": 8.901,
          "cumMin": 29.67
        },
        {
          "slug": "cha-kydonias",
          "seq": 25,
          "cumKm": 9.145,
          "cumMin": 30.48
        },
        {
          "slug": "cha-1866-square-city-center",
          "seq": 26,
          "cumKm": 9.574,
          "cumMin": 31.91
        },
        {
          "slug": "cha-skalidi",
          "seq": 27,
          "cumKm": 9.849,
          "cumMin": 32.83
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 28,
          "cumKm": 10.34,
          "cumMin": 34.47
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 29,
          "cumKm": 10.834,
          "cumMin": 36.11
        },
        {
          "slug": "cha-varousi",
          "seq": 30,
          "cumKm": 11.208,
          "cumMin": 37.36
        },
        {
          "slug": "cha-kladisos-3",
          "seq": 31,
          "cumKm": 11.744,
          "cumMin": 39.15
        },
        {
          "slug": "cha-parigoria",
          "seq": 32,
          "cumKm": 12.019,
          "cumMin": 40.06
        },
        {
          "slug": "cha-hotel-kedrissos",
          "seq": 33,
          "cumKm": 12.563,
          "cumMin": 41.88
        },
        {
          "slug": "cha-germaniko-pouli",
          "seq": 34,
          "cumKm": 12.875,
          "cumMin": 42.92
        },
        {
          "slug": "cha-triton-hotel-jumbo",
          "seq": 35,
          "cumKm": 13.333,
          "cumMin": 44.44
        },
        {
          "slug": "cha-hotel-anais",
          "seq": 36,
          "cumKm": 13.625,
          "cumMin": 45.42
        },
        {
          "slug": "cha-golden-beach",
          "seq": 37,
          "cumKm": 13.92,
          "cumMin": 46.4
        },
        {
          "slug": "cha-forum",
          "seq": 38,
          "cumKm": 14.144,
          "cumMin": 47.15
        },
        {
          "slug": "cha-first-beach-of-ag-apostolon",
          "seq": 39,
          "cumKm": 14.7,
          "cumMin": 49
        },
        {
          "slug": "cha-ag-apostolon-beach",
          "seq": 40,
          "cumKm": 15.363,
          "cumMin": 51.21
        },
        {
          "slug": "cha-drakonianou",
          "seq": 41,
          "cumKm": 15.685,
          "cumMin": 52.28
        },
        {
          "slug": "cha-nearchou-2",
          "seq": 42,
          "cumKm": 15.94,
          "cumMin": 53.13
        },
        {
          "slug": "cha-anoixis",
          "seq": 43,
          "cumKm": 16.14,
          "cumMin": 53.8
        },
        {
          "slug": "cha-lidl",
          "seq": 44,
          "cumKm": 16.476,
          "cumMin": 54.92
        },
        {
          "slug": "cha-bmw",
          "seq": 45,
          "cumKm": 16.645,
          "cumMin": 55.48
        },
        {
          "slug": "cha-strati-pantelaki",
          "seq": 46,
          "cumKm": 17.146,
          "cumMin": 57.15
        },
        {
          "slug": "cha-hotel-kalliston",
          "seq": 47,
          "cumKm": 17.603,
          "cumMin": 58.68
        },
        {
          "slug": "cha-glaros",
          "seq": 48,
          "cumKm": 17.913,
          "cumMin": 59.71
        },
        {
          "slug": "cha-kalamaki",
          "seq": 49,
          "cumKm": 18.338,
          "cumMin": 61.13
        },
        {
          "slug": "cha-ag-dimitrios",
          "seq": 50,
          "cumKm": 18.817,
          "cumMin": 62.72
        },
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 51,
          "cumKm": 19.104,
          "cumMin": 63.68
        }
      ]
    },
    {
      "code": "052",
      "lineCode": "CHA-21",
      "name": "Kalamaki (Th) P. EThNIKI ODO",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ag-dimitrios-2",
          "seq": 1,
          "cumKm": 0.312,
          "cumMin": 1.04
        },
        {
          "slug": "cha-kalamaki-2",
          "seq": 2,
          "cumKm": 0.847,
          "cumMin": 2.82
        },
        {
          "slug": "cha-glaros-2",
          "seq": 3,
          "cumKm": 1.274,
          "cumMin": 4.25
        },
        {
          "slug": "cha-hotel-kalliston-2",
          "seq": 4,
          "cumKm": 1.611,
          "cumMin": 5.37
        },
        {
          "slug": "cha-strati-pantelaki-2",
          "seq": 5,
          "cumKm": 2.043,
          "cumMin": 6.81
        },
        {
          "slug": "cha-bmw-2",
          "seq": 6,
          "cumKm": 2.426,
          "cumMin": 8.09
        },
        {
          "slug": "cha-makrys-toichos-2",
          "seq": 7,
          "cumKm": 2.965,
          "cumMin": 9.88
        },
        {
          "slug": "cha-chrysi-akti-jumbo-2",
          "seq": 8,
          "cumKm": 3.329,
          "cumMin": 11.1
        },
        {
          "slug": "cha-triton-hotel",
          "seq": 9,
          "cumKm": 3.659,
          "cumMin": 12.2
        },
        {
          "slug": "cha-germaniko-pouli-2",
          "seq": 10,
          "cumKm": 4,
          "cumMin": 13.33
        },
        {
          "slug": "cha-hotel-kedrissos-2",
          "seq": 11,
          "cumKm": 4.314,
          "cumMin": 14.38
        },
        {
          "slug": "cha-parigoria-2",
          "seq": 12,
          "cumKm": 4.728,
          "cumMin": 15.76
        },
        {
          "slug": "cha-kladisos-4",
          "seq": 13,
          "cumKm": 5.099,
          "cumMin": 17
        },
        {
          "slug": "cha-varousi-2",
          "seq": 14,
          "cumKm": 5.574,
          "cumMin": 18.58
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 15,
          "cumKm": 5.986,
          "cumMin": 19.95
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 16,
          "cumKm": 6.528,
          "cumMin": 21.76
        },
        {
          "slug": "cha-kydonias",
          "seq": 17,
          "cumKm": 6.772,
          "cumMin": 22.57
        },
        {
          "slug": "cha-1866-square-city-center",
          "seq": 18,
          "cumKm": 7.201,
          "cumMin": 24
        },
        {
          "slug": "cha-skalidi",
          "seq": 19,
          "cumKm": 7.476,
          "cumMin": 24.92
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 20,
          "cumKm": 7.967,
          "cumMin": 26.56
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 21,
          "cumKm": 8.461,
          "cumMin": 28.2
        },
        {
          "slug": "cha-varousi",
          "seq": 22,
          "cumKm": 8.835,
          "cumMin": 29.45
        },
        {
          "slug": "cha-kladisos-3",
          "seq": 23,
          "cumKm": 9.371,
          "cumMin": 31.24
        },
        {
          "slug": "cha-parigoria",
          "seq": 24,
          "cumKm": 9.646,
          "cumMin": 32.15
        },
        {
          "slug": "cha-hotel-kedrissos",
          "seq": 25,
          "cumKm": 10.19,
          "cumMin": 33.97
        },
        {
          "slug": "cha-germaniko-pouli",
          "seq": 26,
          "cumKm": 10.502,
          "cumMin": 35.01
        },
        {
          "slug": "cha-triton-hotel-jumbo",
          "seq": 27,
          "cumKm": 10.96,
          "cumMin": 36.53
        },
        {
          "slug": "cha-hotel-anais",
          "seq": 28,
          "cumKm": 11.252,
          "cumMin": 37.51
        },
        {
          "slug": "cha-golden-beach",
          "seq": 29,
          "cumKm": 11.547,
          "cumMin": 38.49
        },
        {
          "slug": "cha-forum",
          "seq": 30,
          "cumKm": 11.771,
          "cumMin": 39.24
        },
        {
          "slug": "cha-first-beach-of-ag-apostolon",
          "seq": 31,
          "cumKm": 12.327,
          "cumMin": 41.09
        },
        {
          "slug": "cha-ag-apostolon-beach",
          "seq": 32,
          "cumKm": 12.99,
          "cumMin": 43.3
        },
        {
          "slug": "cha-drakonianou",
          "seq": 33,
          "cumKm": 13.312,
          "cumMin": 44.37
        },
        {
          "slug": "cha-nearchou-2",
          "seq": 34,
          "cumKm": 13.567,
          "cumMin": 45.22
        },
        {
          "slug": "cha-anoixis",
          "seq": 35,
          "cumKm": 13.767,
          "cumMin": 45.89
        },
        {
          "slug": "cha-lidl",
          "seq": 36,
          "cumKm": 14.103,
          "cumMin": 47.01
        },
        {
          "slug": "cha-bmw",
          "seq": 37,
          "cumKm": 14.271,
          "cumMin": 47.57
        },
        {
          "slug": "cha-strati-pantelaki",
          "seq": 38,
          "cumKm": 14.772,
          "cumMin": 49.24
        },
        {
          "slug": "cha-hotel-kalliston",
          "seq": 39,
          "cumKm": 15.23,
          "cumMin": 50.77
        },
        {
          "slug": "cha-glaros",
          "seq": 40,
          "cumKm": 15.54,
          "cumMin": 51.8
        },
        {
          "slug": "cha-kalamaki",
          "seq": 41,
          "cumKm": 15.965,
          "cumMin": 53.22
        },
        {
          "slug": "cha-ag-dimitrios",
          "seq": 42,
          "cumKm": 16.444,
          "cumMin": 54.81
        },
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 43,
          "cumKm": 16.731,
          "cumMin": 55.77
        }
      ]
    },
    {
      "code": "069",
      "lineCode": "CHA-21",
      "name": "ChANIA - Kalamaki(x)",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-1866-square-city-center",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-skalidi",
          "seq": 1,
          "cumKm": 0.275,
          "cumMin": 0.92
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 2,
          "cumKm": 0.765,
          "cumMin": 2.55
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 3,
          "cumKm": 1.26,
          "cumMin": 4.2
        },
        {
          "slug": "cha-varousi",
          "seq": 4,
          "cumKm": 1.634,
          "cumMin": 5.45
        },
        {
          "slug": "cha-kladisos-3",
          "seq": 5,
          "cumKm": 2.17,
          "cumMin": 7.23
        },
        {
          "slug": "cha-parigoria",
          "seq": 6,
          "cumKm": 2.445,
          "cumMin": 8.15
        },
        {
          "slug": "cha-hotel-kedrissos",
          "seq": 7,
          "cumKm": 2.988,
          "cumMin": 9.96
        },
        {
          "slug": "cha-germaniko-pouli",
          "seq": 8,
          "cumKm": 3.3,
          "cumMin": 11
        },
        {
          "slug": "cha-triton-hotel-jumbo",
          "seq": 9,
          "cumKm": 3.759,
          "cumMin": 12.53
        },
        {
          "slug": "cha-chrysi-akti-jumbo",
          "seq": 10,
          "cumKm": 3.98,
          "cumMin": 13.27
        },
        {
          "slug": "cha-makrys-toichos",
          "seq": 11,
          "cumKm": 4.364,
          "cumMin": 14.55
        },
        {
          "slug": "cha-bmw",
          "seq": 12,
          "cumKm": 4.74,
          "cumMin": 15.8
        },
        {
          "slug": "cha-strati-pantelaki",
          "seq": 13,
          "cumKm": 5.241,
          "cumMin": 17.47
        },
        {
          "slug": "cha-hotel-kalliston",
          "seq": 14,
          "cumKm": 5.698,
          "cumMin": 18.99
        },
        {
          "slug": "cha-glaros",
          "seq": 15,
          "cumKm": 6.008,
          "cumMin": 20.03
        },
        {
          "slug": "cha-kalamaki",
          "seq": 16,
          "cumKm": 6.433,
          "cumMin": 21.44
        },
        {
          "slug": "cha-ag-dimitrios",
          "seq": 17,
          "cumKm": 6.912,
          "cumMin": 23.04
        },
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 18,
          "cumKm": 7.199,
          "cumMin": 24
        }
      ]
    },
    {
      "code": "071",
      "lineCode": "CHA-21",
      "name": "KALAMAKI-ChANIA(X)",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ag-dimitrios-2",
          "seq": 1,
          "cumKm": 0.312,
          "cumMin": 1.04
        },
        {
          "slug": "cha-kalamaki-2",
          "seq": 2,
          "cumKm": 0.847,
          "cumMin": 2.82
        },
        {
          "slug": "cha-glaros-2",
          "seq": 3,
          "cumKm": 1.274,
          "cumMin": 4.25
        },
        {
          "slug": "cha-hotel-kalliston-2",
          "seq": 4,
          "cumKm": 1.611,
          "cumMin": 5.37
        },
        {
          "slug": "cha-strati-pantelaki-2",
          "seq": 5,
          "cumKm": 2.043,
          "cumMin": 6.81
        },
        {
          "slug": "cha-bmw-2",
          "seq": 6,
          "cumKm": 2.426,
          "cumMin": 8.09
        },
        {
          "slug": "cha-makrys-toichos-2",
          "seq": 7,
          "cumKm": 2.965,
          "cumMin": 9.88
        },
        {
          "slug": "cha-chrysi-akti-jumbo-2",
          "seq": 8,
          "cumKm": 3.329,
          "cumMin": 11.1
        },
        {
          "slug": "cha-triton-hotel",
          "seq": 9,
          "cumKm": 3.659,
          "cumMin": 12.2
        },
        {
          "slug": "cha-germaniko-pouli-2",
          "seq": 10,
          "cumKm": 4,
          "cumMin": 13.33
        },
        {
          "slug": "cha-hotel-kedrissos-2",
          "seq": 11,
          "cumKm": 4.314,
          "cumMin": 14.38
        },
        {
          "slug": "cha-parigoria-2",
          "seq": 12,
          "cumKm": 4.728,
          "cumMin": 15.76
        },
        {
          "slug": "cha-kladisos-4",
          "seq": 13,
          "cumKm": 5.099,
          "cumMin": 17
        },
        {
          "slug": "cha-varousi-2",
          "seq": 14,
          "cumKm": 5.574,
          "cumMin": 18.58
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 15,
          "cumKm": 5.986,
          "cumMin": 19.95
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 16,
          "cumKm": 6.528,
          "cumMin": 21.76
        },
        {
          "slug": "cha-kydonias",
          "seq": 17,
          "cumKm": 6.772,
          "cumMin": 22.57
        },
        {
          "slug": "cha-1866-square-city-center",
          "seq": 18,
          "cumKm": 7.201,
          "cumMin": 24
        }
      ]
    },
    {
      "code": "079",
      "lineCode": "CHA-21",
      "name": "ChANIA - KALAMAKI(Th)",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-1866-square-city-center",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-skalidi",
          "seq": 1,
          "cumKm": 0.275,
          "cumMin": 0.92
        },
        {
          "slug": "cha-eikonostasi",
          "seq": 2,
          "cumKm": 0.765,
          "cumMin": 2.55
        },
        {
          "slug": "cha-ag-nektariou",
          "seq": 3,
          "cumKm": 1.26,
          "cumMin": 4.2
        },
        {
          "slug": "cha-varousi",
          "seq": 4,
          "cumKm": 1.634,
          "cumMin": 5.45
        },
        {
          "slug": "cha-kladisos-3",
          "seq": 5,
          "cumKm": 2.17,
          "cumMin": 7.23
        },
        {
          "slug": "cha-parigoria",
          "seq": 6,
          "cumKm": 2.445,
          "cumMin": 8.15
        },
        {
          "slug": "cha-hotel-kedrissos",
          "seq": 7,
          "cumKm": 2.988,
          "cumMin": 9.96
        },
        {
          "slug": "cha-germaniko-pouli",
          "seq": 8,
          "cumKm": 3.3,
          "cumMin": 11
        },
        {
          "slug": "cha-triton-hotel-jumbo",
          "seq": 9,
          "cumKm": 3.759,
          "cumMin": 12.53
        },
        {
          "slug": "cha-hotel-anais",
          "seq": 10,
          "cumKm": 4.05,
          "cumMin": 13.5
        },
        {
          "slug": "cha-golden-beach",
          "seq": 11,
          "cumKm": 4.346,
          "cumMin": 14.49
        },
        {
          "slug": "cha-forum",
          "seq": 12,
          "cumKm": 4.57,
          "cumMin": 15.23
        },
        {
          "slug": "cha-first-beach-of-ag-apostolon",
          "seq": 13,
          "cumKm": 5.126,
          "cumMin": 17.09
        },
        {
          "slug": "cha-ag-apostolon-beach",
          "seq": 14,
          "cumKm": 5.789,
          "cumMin": 19.3
        },
        {
          "slug": "cha-drakonianou",
          "seq": 15,
          "cumKm": 6.11,
          "cumMin": 20.37
        },
        {
          "slug": "cha-nearchou-2",
          "seq": 16,
          "cumKm": 6.365,
          "cumMin": 21.22
        },
        {
          "slug": "cha-anoixis",
          "seq": 17,
          "cumKm": 6.566,
          "cumMin": 21.89
        },
        {
          "slug": "cha-lidl",
          "seq": 18,
          "cumKm": 6.902,
          "cumMin": 23.01
        },
        {
          "slug": "cha-bmw",
          "seq": 19,
          "cumKm": 7.07,
          "cumMin": 23.57
        },
        {
          "slug": "cha-strati-pantelaki",
          "seq": 20,
          "cumKm": 7.571,
          "cumMin": 25.24
        },
        {
          "slug": "cha-hotel-kalliston",
          "seq": 21,
          "cumKm": 8.029,
          "cumMin": 26.76
        },
        {
          "slug": "cha-glaros",
          "seq": 22,
          "cumKm": 8.338,
          "cumMin": 27.79
        },
        {
          "slug": "cha-kalamaki",
          "seq": 23,
          "cumKm": 8.764,
          "cumMin": 29.21
        },
        {
          "slug": "cha-ag-dimitrios",
          "seq": 24,
          "cumKm": 9.243,
          "cumMin": 30.81
        },
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 25,
          "cumKm": 9.529,
          "cumMin": 31.76
        }
      ]
    },
    {
      "code": "082",
      "lineCode": "CHA-21",
      "name": "KALAMAKI-ChANIA(Th).",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-kalamaki-panorama",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-ag-dimitrios-2",
          "seq": 1,
          "cumKm": 0.312,
          "cumMin": 1.04
        },
        {
          "slug": "cha-kalamaki-2",
          "seq": 2,
          "cumKm": 0.847,
          "cumMin": 2.82
        },
        {
          "slug": "cha-glaros-2",
          "seq": 3,
          "cumKm": 1.274,
          "cumMin": 4.25
        },
        {
          "slug": "cha-hotel-kalliston-2",
          "seq": 4,
          "cumKm": 1.611,
          "cumMin": 5.37
        },
        {
          "slug": "cha-strati-pantelaki-2",
          "seq": 5,
          "cumKm": 2.043,
          "cumMin": 6.81
        },
        {
          "slug": "cha-bmw-2",
          "seq": 6,
          "cumKm": 2.426,
          "cumMin": 8.09
        },
        {
          "slug": "cha-synka-3",
          "seq": 7,
          "cumKm": 2.672,
          "cumMin": 8.91
        },
        {
          "slug": "cha-anoixis-2",
          "seq": 8,
          "cumKm": 2.979,
          "cumMin": 9.93
        },
        {
          "slug": "cha-nearchou-3",
          "seq": 9,
          "cumKm": 3.178,
          "cumMin": 10.59
        },
        {
          "slug": "cha-drakonianou-2",
          "seq": 10,
          "cumKm": 3.402,
          "cumMin": 11.34
        },
        {
          "slug": "cha-ag-apostolon-beach-2",
          "seq": 11,
          "cumKm": 3.758,
          "cumMin": 12.53
        },
        {
          "slug": "cha-first-beach-of-ag-apostolon-2",
          "seq": 12,
          "cumKm": 4.426,
          "cumMin": 14.75
        },
        {
          "slug": "cha-forum-2",
          "seq": 13,
          "cumKm": 4.903,
          "cumMin": 16.34
        },
        {
          "slug": "cha-golden-beach-2",
          "seq": 14,
          "cumKm": 5.145,
          "cumMin": 17.15
        },
        {
          "slug": "cha-hotel-anais-2",
          "seq": 15,
          "cumKm": 5.485,
          "cumMin": 18.28
        },
        {
          "slug": "cha-jumbo",
          "seq": 16,
          "cumKm": 5.728,
          "cumMin": 19.09
        },
        {
          "slug": "cha-triton-hotel",
          "seq": 17,
          "cumKm": 6.033,
          "cumMin": 20.11
        },
        {
          "slug": "cha-germaniko-pouli-2",
          "seq": 18,
          "cumKm": 6.373,
          "cumMin": 21.24
        },
        {
          "slug": "cha-hotel-kedrissos-2",
          "seq": 19,
          "cumKm": 6.687,
          "cumMin": 22.29
        },
        {
          "slug": "cha-parigoria-2",
          "seq": 20,
          "cumKm": 7.101,
          "cumMin": 23.67
        },
        {
          "slug": "cha-kladisos-4",
          "seq": 21,
          "cumKm": 7.472,
          "cumMin": 24.91
        },
        {
          "slug": "cha-varousi-2",
          "seq": 22,
          "cumKm": 7.948,
          "cumMin": 26.49
        },
        {
          "slug": "cha-ag-nektariou-2",
          "seq": 23,
          "cumKm": 8.359,
          "cumMin": 27.86
        },
        {
          "slug": "cha-eikonostasi-2",
          "seq": 24,
          "cumKm": 8.901,
          "cumMin": 29.67
        },
        {
          "slug": "cha-kydonias",
          "seq": 25,
          "cumKm": 9.145,
          "cumMin": 30.48
        },
        {
          "slug": "cha-1866-square-city-center",
          "seq": 26,
          "cumKm": 9.574,
          "cumMin": 31.91
        }
      ]
    },
    {
      "code": "045",
      "lineCode": "CHA-22",
      "name": "Tsikalaria",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-tsikalaria",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-k-karyotaki",
          "seq": 1,
          "cumKm": 0.48,
          "cumMin": 1.6
        },
        {
          "slug": "cha-ch-giannari",
          "seq": 2,
          "cumKm": 0.779,
          "cumMin": 2.6
        },
        {
          "slug": "cha-dimotiko-scholeio-tsikalarion",
          "seq": 3,
          "cumKm": 1.164,
          "cumMin": 3.88
        },
        {
          "slug": "cha-parallilos-ethniki-odou",
          "seq": 4,
          "cumKm": 1.636,
          "cumMin": 5.45
        },
        {
          "slug": "cha-nikolaou-skoula-3",
          "seq": 5,
          "cumKm": 1.989,
          "cumMin": 6.63
        },
        {
          "slug": "cha-tsikalarion-2",
          "seq": 6,
          "cumKm": 2.462,
          "cumMin": 8.21
        },
        {
          "slug": "cha-junction-tsikalarion-2",
          "seq": 7,
          "cumKm": 2.996,
          "cumMin": 9.99
        },
        {
          "slug": "cha-tsikalaria-2",
          "seq": 8,
          "cumKm": 3.152,
          "cumMin": 10.51
        },
        {
          "slug": "cha-maich-2",
          "seq": 9,
          "cumKm": 3.603,
          "cumMin": 12.01
        },
        {
          "slug": "cha-makedonias",
          "seq": 10,
          "cumKm": 4.444,
          "cumMin": 14.81
        },
        {
          "slug": "cha-sofokli-venizelou-2",
          "seq": 11,
          "cumKm": 4.675,
          "cumMin": 15.58
        },
        {
          "slug": "cha-deligiannaki",
          "seq": 12,
          "cumKm": 5.218,
          "cumMin": 17.39
        },
        {
          "slug": "cha-pefkakia",
          "seq": 13,
          "cumKm": 5.825,
          "cumMin": 19.42
        },
        {
          "slug": "cha-chatzisavva-square",
          "seq": 14,
          "cumKm": 6.277,
          "cumMin": 20.92
        },
        {
          "slug": "cha-ag-ioannis",
          "seq": 15,
          "cumKm": 6.878,
          "cumMin": 22.93
        },
        {
          "slug": "cha-xanthoudidou",
          "seq": 16,
          "cumKm": 7.241,
          "cumMin": 24.14
        },
        {
          "slug": "cha-nearchou",
          "seq": 17,
          "cumKm": 7.595,
          "cumMin": 25.32
        },
        {
          "slug": "cha-war-museum",
          "seq": 18,
          "cumKm": 8.105,
          "cumMin": 27.02
        },
        {
          "slug": "cha-ktistaki",
          "seq": 19,
          "cumKm": 8.548,
          "cumMin": 28.49
        },
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 20,
          "cumKm": 8.853,
          "cumMin": 29.51
        },
        {
          "slug": "cha-apokoronou",
          "seq": 21,
          "cumKm": 9.078,
          "cumMin": 30.26
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 22,
          "cumKm": 9.601,
          "cumMin": 32
        },
        {
          "slug": "cha-kritovoulidou",
          "seq": 23,
          "cumKm": 10.021,
          "cumMin": 33.4
        },
        {
          "slug": "cha-g-chatzidaki",
          "seq": 24,
          "cumKm": 10.336,
          "cumMin": 34.45
        },
        {
          "slug": "cha-naos-petrou-kai-pavlou",
          "seq": 25,
          "cumKm": 10.595,
          "cumMin": 35.32
        },
        {
          "slug": "cha-konstantinou-manou",
          "seq": 26,
          "cumKm": 10.667,
          "cumMin": 35.56
        },
        {
          "slug": "cha-antoniadou",
          "seq": 27,
          "cumKm": 10.973,
          "cumMin": 36.58
        },
        {
          "slug": "cha-chatzisavva-square-2",
          "seq": 28,
          "cumKm": 11.364,
          "cumMin": 37.88
        },
        {
          "slug": "cha-pefkakia-2",
          "seq": 29,
          "cumKm": 11.875,
          "cumMin": 39.58
        },
        {
          "slug": "cha-deligiannaki-2",
          "seq": 30,
          "cumKm": 12.338,
          "cumMin": 41.13
        },
        {
          "slug": "cha-sofokli-venizelou-3",
          "seq": 31,
          "cumKm": 12.952,
          "cumMin": 43.17
        },
        {
          "slug": "cha-makedonias-2",
          "seq": 32,
          "cumKm": 13.296,
          "cumMin": 44.32
        },
        {
          "slug": "cha-maich-kege",
          "seq": 33,
          "cumKm": 13.801,
          "cumMin": 46
        },
        {
          "slug": "cha-junction-tsikalarion",
          "seq": 34,
          "cumKm": 14.518,
          "cumMin": 48.39
        },
        {
          "slug": "cha-tsikalarion",
          "seq": 35,
          "cumKm": 15.194,
          "cumMin": 50.65
        },
        {
          "slug": "cha-ts-tsikalaria",
          "seq": 36,
          "cumKm": 15.65,
          "cumMin": 52.17
        }
      ]
    },
    {
      "code": "077",
      "lineCode": "CHA-22",
      "name": "ChANIA - Tsikalaria",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-plateia-machis-kritis",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-apokoronou",
          "seq": 1,
          "cumKm": 0.225,
          "cumMin": 0.75
        },
        {
          "slug": "cha-paparrigopoulou",
          "seq": 2,
          "cumKm": 0.748,
          "cumMin": 2.49
        },
        {
          "slug": "cha-kritovoulidou",
          "seq": 3,
          "cumKm": 1.168,
          "cumMin": 3.89
        },
        {
          "slug": "cha-g-chatzidaki",
          "seq": 4,
          "cumKm": 1.483,
          "cumMin": 4.94
        },
        {
          "slug": "cha-naos-petrou-kai-pavlou",
          "seq": 5,
          "cumKm": 1.742,
          "cumMin": 5.81
        },
        {
          "slug": "cha-konstantinou-manou",
          "seq": 6,
          "cumKm": 1.813,
          "cumMin": 6.04
        },
        {
          "slug": "cha-antoniadou",
          "seq": 7,
          "cumKm": 2.12,
          "cumMin": 7.07
        },
        {
          "slug": "cha-chatzisavva-square-2",
          "seq": 8,
          "cumKm": 2.511,
          "cumMin": 8.37
        },
        {
          "slug": "cha-pefkakia-2",
          "seq": 9,
          "cumKm": 3.021,
          "cumMin": 10.07
        },
        {
          "slug": "cha-deligiannaki-2",
          "seq": 10,
          "cumKm": 3.485,
          "cumMin": 11.62
        },
        {
          "slug": "cha-sofokli-venizelou-3",
          "seq": 11,
          "cumKm": 4.099,
          "cumMin": 13.66
        },
        {
          "slug": "cha-makedonias-2",
          "seq": 12,
          "cumKm": 4.443,
          "cumMin": 14.81
        },
        {
          "slug": "cha-maich-kege",
          "seq": 13,
          "cumKm": 4.948,
          "cumMin": 16.49
        },
        {
          "slug": "cha-junction-tsikalarion",
          "seq": 14,
          "cumKm": 5.664,
          "cumMin": 18.88
        },
        {
          "slug": "cha-tsikalarion",
          "seq": 15,
          "cumKm": 6.341,
          "cumMin": 21.14
        },
        {
          "slug": "cha-ts-tsikalaria",
          "seq": 16,
          "cumKm": 6.797,
          "cumMin": 22.66
        }
      ]
    },
    {
      "code": "001",
      "lineCode": "CHA-24",
      "name": "Moyrnies Nosokomeio",
      "direction": 2,
      "stops": [
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-nikolaou-skoula",
          "seq": 1,
          "cumKm": 0.459,
          "cumMin": 1.53
        },
        {
          "slug": "cha-kalafati",
          "seq": 2,
          "cumKm": 0.863,
          "cumMin": 2.88
        },
        {
          "slug": "cha-gianni-ritsou",
          "seq": 3,
          "cumKm": 1.263,
          "cumMin": 4.21
        },
        {
          "slug": "cha-mournion",
          "seq": 4,
          "cumKm": 2.185,
          "cumMin": 7.28
        },
        {
          "slug": "cha-agias-marinas",
          "seq": 5,
          "cumKm": 2.624,
          "cumMin": 8.75
        },
        {
          "slug": "cha-naskri",
          "seq": 6,
          "cumKm": 2.889,
          "cumMin": 9.63
        },
        {
          "slug": "cha-national-road",
          "seq": 7,
          "cumKm": 3.475,
          "cumMin": 11.58
        },
        {
          "slug": "cha-konstantinoupoleos",
          "seq": 8,
          "cumKm": 3.9,
          "cumMin": 13
        },
        {
          "slug": "cha-mournies",
          "seq": 9,
          "cumKm": 4.195,
          "cumMin": 13.98
        },
        {
          "slug": "cha-zoodochou-pigis",
          "seq": 10,
          "cumKm": 4.531,
          "cumMin": 15.1
        },
        {
          "slug": "cha-agios-eleftherios",
          "seq": 11,
          "cumKm": 4.83,
          "cumMin": 16.1
        },
        {
          "slug": "cha-hospital",
          "seq": 12,
          "cumKm": 5.149,
          "cumMin": 17.16
        },
        {
          "slug": "cha-hospital-gate",
          "seq": 13,
          "cumKm": 5.474,
          "cumMin": 18.25
        },
        {
          "slug": "cha-elpidas",
          "seq": 14,
          "cumKm": 6.037,
          "cumMin": 20.12
        },
        {
          "slug": "cha-megalou-alexandrou",
          "seq": 15,
          "cumKm": 6.51,
          "cumMin": 21.7
        },
        {
          "slug": "cha-chnara",
          "seq": 16,
          "cumKm": 6.878,
          "cumMin": 22.93
        },
        {
          "slug": "cha-sofokli-venizelou",
          "seq": 17,
          "cumKm": 7.23,
          "cumMin": 24.1
        },
        {
          "slug": "cha-karadimitri",
          "seq": 18,
          "cumKm": 7.675,
          "cumMin": 25.58
        },
        {
          "slug": "cha-kokkino-metochi",
          "seq": 19,
          "cumKm": 7.982,
          "cumMin": 26.61
        },
        {
          "slug": "cha-ergatikes-katoikies",
          "seq": 20,
          "cumKm": 8.289,
          "cumMin": 27.63
        },
        {
          "slug": "cha-th-kolokotroni",
          "seq": 21,
          "cumKm": 8.693,
          "cumMin": 28.98
        },
        {
          "slug": "cha-dei",
          "seq": 22,
          "cumKm": 9.047,
          "cumMin": 30.16
        },
        {
          "slug": "cha-palia-ilektriki",
          "seq": 23,
          "cumKm": 9.357,
          "cumMin": 31.19
        },
        {
          "slug": "cha-kornarou",
          "seq": 24,
          "cumKm": 9.657,
          "cumMin": 32.19
        },
        {
          "slug": "cha-agios-loukas",
          "seq": 25,
          "cumKm": 10.045,
          "cumMin": 33.48
        },
        {
          "slug": "cha-markou-botsari",
          "seq": 26,
          "cumKm": 10.388,
          "cumMin": 34.63
        },
        {
          "slug": "cha-peridou",
          "seq": 27,
          "cumKm": 10.676,
          "cumMin": 35.59
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 28,
          "cumKm": 11.022,
          "cumMin": 36.74
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 29,
          "cumKm": 11.225,
          "cumMin": 37.42
        }
      ]
    },
    {
      "code": "055",
      "lineCode": "CHA-24",
      "name": "Moyrnies AG. Apostolon",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-nikolaou-skoula",
          "seq": 1,
          "cumKm": 0.459,
          "cumMin": 1.53
        },
        {
          "slug": "cha-kalafati",
          "seq": 2,
          "cumKm": 0.863,
          "cumMin": 2.88
        },
        {
          "slug": "cha-gianni-ritsou",
          "seq": 3,
          "cumKm": 1.263,
          "cumMin": 4.21
        },
        {
          "slug": "cha-mournion",
          "seq": 4,
          "cumKm": 2.185,
          "cumMin": 7.28
        },
        {
          "slug": "cha-agias-marinas",
          "seq": 5,
          "cumKm": 2.624,
          "cumMin": 8.75
        },
        {
          "slug": "cha-naskri",
          "seq": 6,
          "cumKm": 2.889,
          "cumMin": 9.63
        },
        {
          "slug": "cha-national-road",
          "seq": 7,
          "cumKm": 3.475,
          "cumMin": 11.58
        },
        {
          "slug": "cha-konstantinoupoleos",
          "seq": 8,
          "cumKm": 3.9,
          "cumMin": 13
        },
        {
          "slug": "cha-mournies",
          "seq": 9,
          "cumKm": 4.195,
          "cumMin": 13.98
        },
        {
          "slug": "cha-zoodochou-pigis",
          "seq": 10,
          "cumKm": 4.531,
          "cumMin": 15.1
        },
        {
          "slug": "cha-agios-eleftherios",
          "seq": 11,
          "cumKm": 4.83,
          "cumMin": 16.1
        },
        {
          "slug": "cha-hospital",
          "seq": 12,
          "cumKm": 5.149,
          "cumMin": 17.16
        },
        {
          "slug": "cha-hospital-gate",
          "seq": 13,
          "cumKm": 5.474,
          "cumMin": 18.25
        },
        {
          "slug": "cha-elpidas",
          "seq": 14,
          "cumKm": 6.037,
          "cumMin": 20.12
        },
        {
          "slug": "cha-megalou-alexandrou",
          "seq": 15,
          "cumKm": 6.51,
          "cumMin": 21.7
        },
        {
          "slug": "cha-chnara",
          "seq": 16,
          "cumKm": 6.878,
          "cumMin": 22.93
        },
        {
          "slug": "cha-irakleous",
          "seq": 17,
          "cumKm": 7.417,
          "cumMin": 24.72
        },
        {
          "slug": "cha-ag-apostolon",
          "seq": 18,
          "cumKm": 7.957,
          "cumMin": 26.52
        },
        {
          "slug": "cha-ypsilantou",
          "seq": 19,
          "cumKm": 8.462,
          "cumMin": 28.21
        },
        {
          "slug": "cha-kolokotroni",
          "seq": 20,
          "cumKm": 8.937,
          "cumMin": 29.79
        },
        {
          "slug": "cha-mavrokordatou",
          "seq": 21,
          "cumKm": 9.392,
          "cumMin": 31.31
        },
        {
          "slug": "cha-p-ilektriki",
          "seq": 22,
          "cumKm": 9.82,
          "cumMin": 32.73
        },
        {
          "slug": "cha-kornarou",
          "seq": 23,
          "cumKm": 10.1,
          "cumMin": 33.67
        },
        {
          "slug": "cha-agios-loukas",
          "seq": 24,
          "cumKm": 10.488,
          "cumMin": 34.96
        },
        {
          "slug": "cha-markou-botsari",
          "seq": 25,
          "cumKm": 10.831,
          "cumMin": 36.1
        },
        {
          "slug": "cha-peridou",
          "seq": 26,
          "cumKm": 11.12,
          "cumMin": 37.07
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 27,
          "cumKm": 11.465,
          "cumMin": 38.22
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 28,
          "cumKm": 11.669,
          "cumMin": 38.9
        }
      ]
    },
    {
      "code": "076",
      "lineCode": "CHA-24",
      "name": "Plastira Moyrnies AG. Apostolon",
      "direction": 1,
      "stops": [
        {
          "slug": "cha-ts-zymvrakakidon",
          "seq": 0,
          "cumKm": 0,
          "cumMin": 0
        },
        {
          "slug": "cha-nikolaou-skoula",
          "seq": 1,
          "cumKm": 0.459,
          "cumMin": 1.53
        },
        {
          "slug": "cha-papadaki",
          "seq": 2,
          "cumKm": 0.702,
          "cumMin": 2.34
        },
        {
          "slug": "cha-kalafati",
          "seq": 3,
          "cumKm": 0.863,
          "cumMin": 2.88
        },
        {
          "slug": "cha-plastira",
          "seq": 4,
          "cumKm": 1.226,
          "cumMin": 4.09
        },
        {
          "slug": "cha-mikras-asias",
          "seq": 5,
          "cumKm": 1.549,
          "cumMin": 5.16
        },
        {
          "slug": "cha-parodos-plastira",
          "seq": 6,
          "cumKm": 1.849,
          "cumMin": 6.16
        },
        {
          "slug": "cha-sklavenitis",
          "seq": 7,
          "cumKm": 2.205,
          "cumMin": 7.35
        },
        {
          "slug": "cha-agias-marinas",
          "seq": 8,
          "cumKm": 2.683,
          "cumMin": 8.94
        },
        {
          "slug": "cha-naskri",
          "seq": 9,
          "cumKm": 2.949,
          "cumMin": 9.83
        },
        {
          "slug": "cha-national-road",
          "seq": 10,
          "cumKm": 3.534,
          "cumMin": 11.78
        },
        {
          "slug": "cha-konstantinoupoleos",
          "seq": 11,
          "cumKm": 3.959,
          "cumMin": 13.2
        },
        {
          "slug": "cha-mournies",
          "seq": 12,
          "cumKm": 4.255,
          "cumMin": 14.18
        },
        {
          "slug": "cha-zoodochou-pigis",
          "seq": 13,
          "cumKm": 4.591,
          "cumMin": 15.3
        },
        {
          "slug": "cha-agios-eleftherios",
          "seq": 14,
          "cumKm": 4.89,
          "cumMin": 16.3
        },
        {
          "slug": "cha-hospital",
          "seq": 15,
          "cumKm": 5.209,
          "cumMin": 17.36
        },
        {
          "slug": "cha-hospital-gate",
          "seq": 16,
          "cumKm": 5.533,
          "cumMin": 18.44
        },
        {
          "slug": "cha-elpidas",
          "seq": 17,
          "cumKm": 6.096,
          "cumMin": 20.32
        },
        {
          "slug": "cha-megalou-alexandrou",
          "seq": 18,
          "cumKm": 6.57,
          "cumMin": 21.9
        },
        {
          "slug": "cha-chnara",
          "seq": 19,
          "cumKm": 6.938,
          "cumMin": 23.13
        },
        {
          "slug": "cha-irakleous",
          "seq": 20,
          "cumKm": 7.476,
          "cumMin": 24.92
        },
        {
          "slug": "cha-ag-apostolon",
          "seq": 21,
          "cumKm": 8.017,
          "cumMin": 26.72
        },
        {
          "slug": "cha-ypsilantou",
          "seq": 22,
          "cumKm": 8.522,
          "cumMin": 28.41
        },
        {
          "slug": "cha-kolokotroni",
          "seq": 23,
          "cumKm": 8.996,
          "cumMin": 29.99
        },
        {
          "slug": "cha-agios-stefanos",
          "seq": 24,
          "cumKm": 9.286,
          "cumMin": 30.95
        },
        {
          "slug": "cha-mavrokordatou",
          "seq": 25,
          "cumKm": 9.453,
          "cumMin": 31.51
        },
        {
          "slug": "cha-p-ilektriki",
          "seq": 26,
          "cumKm": 9.881,
          "cumMin": 32.94
        },
        {
          "slug": "cha-kornarou",
          "seq": 27,
          "cumKm": 10.161,
          "cumMin": 33.87
        },
        {
          "slug": "cha-agios-loukas",
          "seq": 28,
          "cumKm": 10.549,
          "cumMin": 35.16
        },
        {
          "slug": "cha-markou-botsari",
          "seq": 29,
          "cumKm": 10.892,
          "cumMin": 36.31
        },
        {
          "slug": "cha-peridou",
          "seq": 30,
          "cumKm": 11.181,
          "cumMin": 37.27
        },
        {
          "slug": "cha-chatzimichali-giannari",
          "seq": 31,
          "cumKm": 11.526,
          "cumMin": 38.42
        },
        {
          "slug": "cha-ts-plateia-1866",
          "seq": 32,
          "cumKm": 11.73,
          "cumMin": 39.1
        }
      ]
    }
  ]
};
