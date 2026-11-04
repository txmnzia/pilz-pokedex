import type { Lang } from "./types";

const fr = {
  dex: "PILZDEX", caught: "attrapés", all: "Tous", got: "Attrapés", missing: "Manquants",
  catch: "ATTRAPER", back: "RETOUR", page: "PAGE", grid: "Grille", list: "Liste",
  season: "Saison", allYear: "toute l'année", spores: "Sporée", cap: "Chapeau", hymenium: "Hyménium",
  stipe: "Pied", ecology: "Ecologie", where: "Où le trouver", look: "Sosies", finds: "Mes trouvailles",
  noFinds: "Pas encore trouvé. Appuie sur ATTRAPER quand tu le vois.", obs: "obs.",
  exHead: "Sosies hors Pilzdex", exTag: "hors Pilzdex", raresHead: "Raretés", compare: "comparer", itsIt: "C'EST LUI", yourPhoto: "TA PHOTO", reference: "REFERENCE", noRef: "PAS DE PHOTO", enlarge: "Agrandir", yourChoice: "ton choix", refCredits: "Photos de référence", refCreditsText: "Photos iNaturalist sous licence libre, réduites. Auteurs :", rareTag: "rareté", noDataTitle: "Données non disponibles", noDataText: "Espèce hors Pilzdex, reconnue par le modèle photo : on n'a que son nom. Comestibilité inconnue.", source: "Source", textIn: "texte en",
  settings: "Réglages", language: "Langue", view: "Affichage", sort: "Tri", sortNo: "Numéro", sortAz: "A–Z", account: "Compte", signout: "Se déconnecter",
  export: "Exporter ma collection (JSON)", download: "Télécharger", restore: "Restaurer une sauvegarde", restored: "trouvailles restaurées", badBackup: "Fichier de sauvegarde invalide", credits: "Sources des données",
  disclaimer: "Collection personnelle, pas un guide d'identification. Ne mange jamais un champignon sur la foi de cette app.",
  loginTitle: "Connexion par lien magique", email: "E-mail", send: "Envoyer le lien",
  inbox: "Lien envoyé. Ouvre l'e-mail sur cet appareil.", notConfigured: "Supabase n'est pas configuré pour ce build.",
  offline: "Continuer sans compte (local)", photo: "Prendre une photo", species: "Espèce", date: "Date",
  place: "Lieu", placeHint: "ex. Grunewald", gps: "Position GPS", gpsOk: "Position enregistrée", gpsFail: "GPS indisponible",
  note: "Note", save: "ENREGISTRER", gotcha: "ATTRAPE !", photoNeeded: "Ajoute une photo d'abord",
  edible: "Comestible", none: "Sans intérêt", toxic: "Toxique", deadly: "Mortel", unknown: "Non vérifié",
  bEdible: "COMEST", bNone: "FADE", bToxic: "TOXIQUE", bDeadly: "MORTEL", bUnknown: "???",
  swipe: "glisse ou PAGE", del: "Supprimer", confirmDel: "Supprimer cette trouvaille ?", yes: "Oui", no: "Non",
  syncing: "synchro…", synced: "synchronisé", localOnly: "local", loading: "Chargement…",
  unknownHint: "Sources contradictoires, à vérifier.",
  filters: "Filtres", progress: "Progression", byEd: "Par comestibilité", regions: "Régions", recent: "DERNIERES PRISES", prev: "PREC", next: "SUIV", info: "INFO",
  photos: "Photos", dragToReorder: "glisse les photos pour changer l'ordre", removePhoto: "Retirer la photo", fromPhotos: "{n} photos",
  tapToCatch: "Touche pour attraper", tapToChange: "Touche pour recadrer ou changer", addPhoto: "Ajouter une photo", otherPhoto: "Autre photo", crop: "Recadrer", cropHint: "Pince ou glisse puis", cmpOk: "Valider", cmpBack: "Précédent", useCrop: "Valider", cancel: "Annuler", tapToCrop: "Toucher pour recadrer",
  choose: "Choisir l'espèce…", pickSpecies: "Choisis l'espèce d'abord",
  areYouSure: "Tu es sûr que c'est {x} ? Ça ressemble plutôt à {y} ({p}).", switchTo: "Mettre {y}", keep: "Garder {x}",
  fromPhotoMeta: "Date et lieu repris de la photo.", fromPhotoDate: "Date reprise de la photo (pas de position enregistrée).", noPhotoMeta: "Pas de date dans la photo : vérifie la date.",
  suggestion: "Suggestion", analysing: "Analyse de la photo…", probably: "Probablement :", notSure: "Pas sûr. Possibilités :",
  notInDex: "hors Pilzdex", idFailed: "Analyse impossible sur cet appareil.",
  whichSpecies: "Quelle espèce est-ce ?", otherSpecies: "AUTRE ESPECE", searchSpecies: "Cherche un nom (français, latin…)", noMatch: "Aucune espèce trouvée", similarHead: "SOSIES", saveFind: "Enregistrer", notSureTap: "Pas sûr. Touche pour comparer.",
  idCredit: "Suggestions photo : modèle FungiTastic DINOv3 ViT-S/16 (P. Bauriegel), poids dérivés de DINOv3 (Meta, licence DINOv3), entraîné sur FungiTastic (Picek et al., CC BY-NC-SA 4.0)",
};
type Dict = typeof fr;

const en: Dict = {
  dex: "PILZDEX", caught: "caught", all: "All", got: "Caught", missing: "Missing",
  catch: "CATCH", back: "BACK", page: "PAGE", grid: "Grid", list: "List",
  season: "Season", allYear: "all year", spores: "Spore print", cap: "Cap", hymenium: "Hymenium",
  stipe: "Stem", ecology: "Ecology", where: "Where to find", look: "Lookalikes", finds: "My finds",
  noFinds: "Not found yet. Press CATCH when you spot it.", obs: "obs.",
  exHead: "Lookalikes outside the Pilzdex", exTag: "not in Pilzdex", raresHead: "Rarities", compare: "compare", itsIt: "THAT'S IT", yourPhoto: "YOUR PHOTO", reference: "REFERENCE", noRef: "NO PHOTO", enlarge: "Enlarge", yourChoice: "your choice", refCredits: "Reference photos", refCreditsText: "iNaturalist photos under open licences, resized. Authors:", rareTag: "rarity", noDataTitle: "No data available", noDataText: "Species outside the Pilzdex, known to the photo model: only its name is known. Edibility unknown.", source: "Source", textIn: "text in",
  settings: "Settings", language: "Language", view: "View", sort: "Order", sortNo: "Number", sortAz: "A–Z", account: "Account", signout: "Sign out",
  export: "Export my collection (JSON)", download: "Download", restore: "Restore from backup", restored: "finds restored", badBackup: "Not a valid backup file", credits: "Data sources",
  disclaimer: "Personal collection, not an identification guide. Never eat a mushroom based on this app.",
  loginTitle: "Sign in with a magic link", email: "Email", send: "Send link",
  inbox: "Link sent. Open the email on this device.", notConfigured: "Supabase is not configured for this build.",
  offline: "Continue without account (local)", photo: "Take a photo", species: "Species", date: "Date",
  place: "Place", placeHint: "e.g. Grunewald", gps: "GPS position", gpsOk: "Position saved", gpsFail: "GPS unavailable",
  note: "Note", save: "SAVE", gotcha: "GOTCHA!", photoNeeded: "Add a photo first",
  edible: "Edible", none: "No interest", toxic: "Toxic", deadly: "Deadly", unknown: "Unverified",
  bEdible: "EDIBLE", bNone: "BLAND", bToxic: "TOXIC", bDeadly: "DEADLY", bUnknown: "???",
  swipe: "swipe or PAGE", del: "Delete", confirmDel: "Delete this find?", yes: "Yes", no: "No",
  syncing: "syncing…", synced: "synced", localOnly: "local", loading: "Loading…",
  unknownHint: "Sources disagree, needs checking.",
  filters: "Filters", progress: "Progress", byEd: "By edibility", regions: "Regions", recent: "LATEST CATCHES", prev: "PREV", next: "NEXT", info: "INFO",
  photos: "Photos", dragToReorder: "drag photos to reorder", removePhoto: "Remove photo", fromPhotos: "{n} photos",
  tapToCatch: "Tap to catch", tapToChange: "Tap to crop or change", addPhoto: "Add photo", otherPhoto: "Other photo", crop: "Crop", cropHint: "Pinch or drag, then", cmpOk: "Confirm", cmpBack: "Back", useCrop: "Use", cancel: "Cancel", tapToCrop: "Tap to crop",
  choose: "Choose species…", pickSpecies: "Choose the species first",
  areYouSure: "Are you sure this is {x}? It looks more like {y} ({p}).", switchTo: "Switch to {y}", keep: "Keep {x}",
  fromPhotoMeta: "Date and place taken from the photo.", fromPhotoDate: "Date taken from the photo (no location saved in it).", noPhotoMeta: "No date in the photo: check the date.",
  suggestion: "Suggestion", analysing: "Analysing photo…", probably: "Probably:", notSure: "Not sure. Could be:",
  notInDex: "not in Pilzdex", idFailed: "Photo analysis is not available on this device.",
  whichSpecies: "Which species is it?", otherSpecies: "OTHER SPECIES", searchSpecies: "Search a name (English, Latin…)", noMatch: "No species found", similarHead: "LOOKALIKES", saveFind: "Save", notSureTap: "Not sure. Tap to compare.",
  idCredit: "Photo suggestions: FungiTastic DINOv3 ViT-S/16 model (P. Bauriegel), weights derived from DINOv3 (Meta, DINOv3 License), trained on FungiTastic (Picek et al., CC BY-NC-SA 4.0)",
};

const de: Dict = {
  dex: "PILZDEX", caught: "gefangen", all: "Alle", got: "Gefangen", missing: "Fehlend",
  catch: "FANGEN", back: "ZURÜCK", page: "SEITE", grid: "Raster", list: "Liste",
  season: "Saison", allYear: "ganzjährig", spores: "Sporen", cap: "Hut", hymenium: "Hymenium",
  stipe: "Stiel", ecology: "Ökologie", where: "Fundort", look: "Doppelgänger", finds: "Meine Funde",
  noFinds: "Noch nicht gefunden. Drück FANGEN, wenn du ihn siehst.", obs: "Beob.",
  exHead: "Doppelgänger außerhalb des Pilzdex", exTag: "nicht im Pilzdex", raresHead: "Raritäten", compare: "vergleichen", itsIt: "DAS IST ER", yourPhoto: "DEIN FOTO", reference: "REFERENZ", noRef: "KEIN FOTO", enlarge: "Vergrößern", yourChoice: "deine Wahl", refCredits: "Referenzfotos", refCreditsText: "iNaturalist-Fotos unter freier Lizenz, verkleinert. Urheber:", rareTag: "Rarität", noDataTitle: "Keine Daten", noDataText: "Art außerhalb des Pilzdex, vom Fotomodell erkannt: nur der Name ist bekannt. Essbarkeit unbekannt.", source: "Quelle", textIn: "Text auf",
  settings: "Einstellungen", language: "Sprache", view: "Ansicht", sort: "Sortierung", sortNo: "Nummer", sortAz: "A–Z", account: "Konto", signout: "Abmelden",
  export: "Sammlung exportieren (JSON)", download: "Herunterladen", restore: "Backup wiederherstellen", restored: "Funde wiederhergestellt", badBackup: "Keine gültige Backup-Datei", credits: "Datenquellen",
  disclaimer: "Persönliche Sammlung, kein Bestimmungsbuch. Iss nie einen Pilz auf Grundlage dieser App.",
  loginTitle: "Anmelden per Magic Link", email: "E-Mail", send: "Link senden",
  inbox: "Link gesendet. Öffne die Mail auf diesem Gerät.", notConfigured: "Supabase ist für diesen Build nicht konfiguriert.",
  offline: "Ohne Konto fortfahren (lokal)", photo: "Foto aufnehmen", species: "Art", date: "Datum",
  place: "Ort", placeHint: "z. B. Grunewald", gps: "GPS-Position", gpsOk: "Position gespeichert", gpsFail: "GPS nicht verfügbar",
  note: "Notiz", save: "SPEICHERN", gotcha: "GEFANGEN!", photoNeeded: "Erst ein Foto hinzufügen",
  edible: "Essbar", none: "Ohne Wert", toxic: "Giftig", deadly: "Tödlich", unknown: "Ungeprüft",
  bEdible: "ESSBAR", bNone: "FADE", bToxic: "GIFTIG", bDeadly: "TÖDLICH", bUnknown: "???",
  swipe: "wischen oder SEITE", del: "Löschen", confirmDel: "Diesen Fund löschen?", yes: "Ja", no: "Nein",
  syncing: "Sync…", synced: "synchronisiert", localOnly: "lokal", loading: "Lädt…",
  unknownHint: "Quellen widersprechen sich, muss geprüft werden.",
  filters: "Filter", progress: "Fortschritt", byEd: "Nach Essbarkeit", regions: "Regionen", recent: "LETZTE FÄNGE", prev: "ZURÜCK", next: "WEITER", info: "INFO",
  photos: "Fotos", dragToReorder: "Fotos ziehen zum Sortieren", removePhoto: "Foto entfernen", fromPhotos: "{n} Fotos",
  tapToCatch: "Tippen zum Fangen", tapToChange: "Tippen zum Zuschneiden oder Ändern", addPhoto: "Foto hinzufügen", otherPhoto: "Anderes Foto", crop: "Zuschneiden", cropHint: "Ziehen oder zoomen, dann", cmpOk: "Bestätigen", cmpBack: "Zurück", useCrop: "Übernehmen", cancel: "Abbrechen", tapToCrop: "Tippen zum Zuschneiden",
  choose: "Art wählen…", pickSpecies: "Erst die Art wählen",
  areYouSure: "Bist du sicher, dass das {x} ist? Sieht eher aus wie {y} ({p}).", switchTo: "{y} nehmen", keep: "{x} behalten",
  fromPhotoMeta: "Datum und Ort aus dem Foto übernommen.", fromPhotoDate: "Datum aus dem Foto übernommen (kein Ort gespeichert).", noPhotoMeta: "Kein Datum im Foto: Datum prüfen.",
  suggestion: "Vorschlag", analysing: "Foto wird analysiert…", probably: "Wahrscheinlich:", notSure: "Unsicher. Möglich:",
  notInDex: "nicht im Pilzdex", idFailed: "Fotoanalyse auf diesem Gerät nicht verfügbar.",
  whichSpecies: "Welche Art ist das?", otherSpecies: "ANDERE ART", searchSpecies: "Namen suchen (deutsch, lateinisch…)", noMatch: "Keine Art gefunden", similarHead: "DOPPELGÄNGER", saveFind: "Speichern", notSureTap: "Unsicher. Antippen zum Vergleichen.",
  idCredit: "Fotovorschläge: Modell FungiTastic DINOv3 ViT-S/16 (P. Bauriegel), Gewichte aus DINOv3 (Meta, DINOv3-Lizenz), trainiert mit FungiTastic (Picek et al., CC BY-NC-SA 4.0)",
};

export const STRINGS: Record<Lang, Dict> = { fr, en, de };
export type StringKey = keyof Dict;

export function defaultLang(nav: readonly string[] = typeof navigator !== "undefined" ? navigator.languages : []): Lang {
  for (const l of nav) {
    const c = l.slice(0, 2).toLowerCase();
    if (c === "fr" || c === "en" || c === "de") return c;
  }
  return "en";
}
