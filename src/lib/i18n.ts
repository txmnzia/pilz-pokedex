import type { Lang } from "./types";

const fr = {
  dex: "PILZDEX", caught: "attrapés", all: "Tous", got: "Attrapés", missing: "Manquants",
  catch: "ATTRAPER", back: "RETOUR", page: "PAGE", grid: "Grille", list: "Liste",
  season: "Saison", allYear: "toute l'année", spores: "Sporée", cap: "Chapeau", hymenium: "Hyménium",
  stipe: "Pied", ecology: "Écologie", where: "Où le trouver", look: "Sosies", finds: "Mes trouvailles",
  noFinds: "Pas encore trouvé. Appuie sur ATTRAPER quand tu le vois.", obs: "obs.",
  exHead: "Sosies hors Pilzdex", exTag: "hors Pilzdex", source: "Source", textIn: "texte en",
  settings: "Réglages", language: "Langue", view: "Affichage", account: "Compte", signout: "Se déconnecter",
  export: "Exporter ma collection (JSON)", download: "Télécharger", restore: "Restaurer une sauvegarde", restored: "trouvailles restaurées", badBackup: "Fichier de sauvegarde invalide", credits: "Sources des données",
  disclaimer: "Collection personnelle, pas un guide d'identification. Ne mange jamais un champignon sur la foi de cette app.",
  loginTitle: "Connexion par lien magique", email: "E-mail", send: "Envoyer le lien",
  inbox: "Lien envoyé. Ouvre l'e-mail sur cet appareil.", notConfigured: "Supabase n'est pas configuré pour ce build.",
  offline: "Continuer sans compte (local)", photo: "Prendre une photo", species: "Espèce", date: "Date",
  place: "Lieu", placeHint: "ex. Grunewald", gps: "Position GPS", gpsOk: "Position enregistrée", gpsFail: "GPS indisponible",
  note: "Note", save: "ENREGISTRER", gotcha: "ATTRAPÉ !", photoNeeded: "Ajoute une photo d'abord",
  edible: "Comestible", none: "Sans intérêt", toxic: "Toxique", deadly: "Mortel", unknown: "Non vérifié",
  swipe: "glisse ou PAGE", del: "Supprimer", confirmDel: "Supprimer cette trouvaille ?", yes: "Oui", no: "Non",
  syncing: "synchro…", synced: "synchronisé", localOnly: "local", loading: "Chargement…",
  unknownHint: "Sources contradictoires, à vérifier.",
  suggestion: "Suggestion", analysing: "Analyse de la photo…", probably: "Probablement :", notSure: "Pas sûr. Possibilités :",
  notInDex: "hors Pilzdex", idFailed: "Analyse impossible sur cet appareil.",
  idDisclaimer: "Suggestion automatique, souvent fausse. Vérifie toi-même.",
  idCredit: "Suggestions photo : modèle « species-classifiers » fungi (M. Graham, Apache-2.0), entraîné sur iNaturalist 2021",
};
type Dict = typeof fr;

const en: Dict = {
  dex: "PILZDEX", caught: "caught", all: "All", got: "Caught", missing: "Missing",
  catch: "CATCH", back: "BACK", page: "PAGE", grid: "Grid", list: "List",
  season: "Season", allYear: "all year", spores: "Spore print", cap: "Cap", hymenium: "Hymenium",
  stipe: "Stem", ecology: "Ecology", where: "Where to find", look: "Lookalikes", finds: "My finds",
  noFinds: "Not found yet. Press CATCH when you spot it.", obs: "obs.",
  exHead: "Lookalikes outside the Pilzdex", exTag: "not in Pilzdex", source: "Source", textIn: "text in",
  settings: "Settings", language: "Language", view: "View", account: "Account", signout: "Sign out",
  export: "Export my collection (JSON)", download: "Download", restore: "Restore from backup", restored: "finds restored", badBackup: "Not a valid backup file", credits: "Data sources",
  disclaimer: "Personal collection, not an identification guide. Never eat a mushroom based on this app.",
  loginTitle: "Sign in with a magic link", email: "Email", send: "Send link",
  inbox: "Link sent. Open the email on this device.", notConfigured: "Supabase is not configured for this build.",
  offline: "Continue without account (local)", photo: "Take a photo", species: "Species", date: "Date",
  place: "Place", placeHint: "e.g. Grunewald", gps: "GPS position", gpsOk: "Position saved", gpsFail: "GPS unavailable",
  note: "Note", save: "SAVE", gotcha: "GOTCHA!", photoNeeded: "Add a photo first",
  edible: "Edible", none: "No interest", toxic: "Toxic", deadly: "Deadly", unknown: "Unverified",
  swipe: "swipe or PAGE", del: "Delete", confirmDel: "Delete this find?", yes: "Yes", no: "No",
  syncing: "syncing…", synced: "synced", localOnly: "local", loading: "Loading…",
  unknownHint: "Sources disagree, needs checking.",
  suggestion: "Suggestion", analysing: "Analysing photo…", probably: "Probably:", notSure: "Not sure. Could be:",
  notInDex: "not in Pilzdex", idFailed: "Photo analysis is not available on this device.",
  idDisclaimer: "Automatic suggestion, often wrong. Check it yourself.",
  idCredit: "Photo suggestions: species-classifiers fungi model (M. Graham, Apache-2.0), trained on iNaturalist 2021",
};

const de: Dict = {
  dex: "PILZDEX", caught: "gefangen", all: "Alle", got: "Gefangen", missing: "Fehlend",
  catch: "FANGEN", back: "ZURÜCK", page: "SEITE", grid: "Raster", list: "Liste",
  season: "Saison", allYear: "ganzjährig", spores: "Sporenpulver", cap: "Hut", hymenium: "Hymenium",
  stipe: "Stiel", ecology: "Ökologie", where: "Fundort", look: "Doppelgänger", finds: "Meine Funde",
  noFinds: "Noch nicht gefunden. Drück FANGEN, wenn du ihn siehst.", obs: "Beob.",
  exHead: "Doppelgänger außerhalb des Pilzdex", exTag: "nicht im Pilzdex", source: "Quelle", textIn: "Text auf",
  settings: "Einstellungen", language: "Sprache", view: "Ansicht", account: "Konto", signout: "Abmelden",
  export: "Sammlung exportieren (JSON)", download: "Herunterladen", restore: "Backup wiederherstellen", restored: "Funde wiederhergestellt", badBackup: "Keine gültige Backup-Datei", credits: "Datenquellen",
  disclaimer: "Persönliche Sammlung, kein Bestimmungsbuch. Iss nie einen Pilz auf Grundlage dieser App.",
  loginTitle: "Anmelden per Magic Link", email: "E-Mail", send: "Link senden",
  inbox: "Link gesendet. Öffne die Mail auf diesem Gerät.", notConfigured: "Supabase ist für diesen Build nicht konfiguriert.",
  offline: "Ohne Konto fortfahren (lokal)", photo: "Foto aufnehmen", species: "Art", date: "Datum",
  place: "Ort", placeHint: "z. B. Grunewald", gps: "GPS-Position", gpsOk: "Position gespeichert", gpsFail: "GPS nicht verfügbar",
  note: "Notiz", save: "SPEICHERN", gotcha: "GEFANGEN!", photoNeeded: "Erst ein Foto hinzufügen",
  edible: "Essbar", none: "Ohne Wert", toxic: "Giftig", deadly: "Tödlich", unknown: "Ungeprüft",
  swipe: "wischen oder SEITE", del: "Löschen", confirmDel: "Diesen Fund löschen?", yes: "Ja", no: "Nein",
  syncing: "Sync…", synced: "synchronisiert", localOnly: "lokal", loading: "Lädt…",
  unknownHint: "Quellen widersprechen sich, muss geprüft werden.",
  suggestion: "Vorschlag", analysing: "Foto wird analysiert…", probably: "Wahrscheinlich:", notSure: "Unsicher. Möglich:",
  notInDex: "nicht im Pilzdex", idFailed: "Fotoanalyse auf diesem Gerät nicht verfügbar.",
  idDisclaimer: "Automatischer Vorschlag, oft falsch. Selbst prüfen.",
  idCredit: "Fotovorschläge: species-classifiers-Pilzmodell (M. Graham, Apache-2.0), trainiert mit iNaturalist 2021",
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
