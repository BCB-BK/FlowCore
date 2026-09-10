/**
 * Zuordnungstabelle des Markensystem-Imports — der fachliche Kern.
 *
 * Bewusst als Datenstruktur und nicht in Code verstreut: Wer prüfen will, ob
 * ein Dokumentabschnitt am richtigen Ort landet, liest hier eine Tabelle statt
 * eine Ablaufsteuerung.
 *
 * LESEART
 *   `kapitel`      Überschriften des Quelldokuments (ohne Nummer, Teiltreffer).
 *   `plattform`    Zeilen der Kopf-/Plattformtabelle (Spalte 1, exakter Text).
 *   `dokumentdaten`Zeilen der Dokumentdaten-Tabelle ganz oben.
 *
 * VERLUSTSCHUTZ: Der Import prüft je Markenprofil, dass JEDES Kapitel und JEDE
 * Plattformzeile mindestens einmal zugeordnet ist. Fehlt etwas, bricht er ab
 * und nennt Datei und Fundstelle. Nicht zugeordnete Kapitel wandern zusätzlich
 * vollständig in den Inhaltsbereich — dort können sie auch Tabellen tragen.
 */

/** Seitentypen, die dieser Import verwendet. */
export type Seitentyp = "doc_registry" | "brand_profile" | "policy";

export interface Abschnittsquelle {
  kapitel?: string[];
  plattform?: string[];
  dokumentdaten?: string[];
}

export interface Seitenbauplan {
  /** Titel in FlowCore — ohne Dateinummern. */
  titel: string;
  typ: Seitentyp;
  /** Pfad relativ zum Wurzelverzeichnis des Pakets; fehlt bei reinen Behältern. */
  datei?: string;
  /** Für brand_profile Pflicht. */
  markenname?: string;
  markenebene?: "dachmarke" | "einzelmarke" | "submarke" | "kampagnenmarke";
  /** Nur für brand_profile: Abschnittsschlüssel → Quellen im Dokument. */
  abschnitte?: Record<string, Abschnittsquelle>;
  kinder?: Seitenbauplan[];
}

/** Zuordnung, die alle fünf Markenprofile gemeinsam haben. */
const GEMEINSAM = {
  brand_mandate: {
    dokumentdaten: [
      "Geltung",
      "Pflegeverantwortung",
      "Strategische Inhaltsfreigabe",
    ],
  },
  core_promise: { plattform: ["Kernversprechen"] },
};

export const BAUPLAN: Seitenbauplan[] = [
  {
    titel: "Gruppenrahmen",
    typ: "doc_registry",
    kinder: [
      {
        titel: "System und Geltung",
        typ: "policy",
        datei: "00-gruppe/00_system_und_geltung.md",
      },
      {
        titel: "Markenarchitektur",
        typ: "policy",
        datei: "00-gruppe/01_markenarchitektur.md",
      },
      {
        titel: "Kommunikationsgrundsätze",
        typ: "policy",
        datei: "00-gruppe/02_kommunikationsgrundsaetze.md",
      },
      {
        titel: "Kanalhandbuch",
        typ: "policy",
        datei: "00-gruppe/03_kanalhandbuch.md",
      },
      {
        titel: "Visuelle Grundsätze",
        typ: "policy",
        datei: "00-gruppe/04_visuelle_grundsaetze.md",
      },
      {
        titel: "Qualität und Freigabe",
        typ: "policy",
        datei: "00-gruppe/05_qualitaet_und_freigabe.md",
      },
    ],
  },
  {
    titel: "B2B-Standards",
    typ: "doc_registry",
    kinder: [
      {
        titel: "Zielgruppenprofile",
        typ: "policy",
        datei: "01-b2b/01_zielgruppenprofile.md",
      },
      {
        titel: "Kommunikationsstandard",
        typ: "policy",
        datei: "01-b2b/02_kommunikationsstandard.md",
      },
    ],
  },
  {
    titel: "Einzelmarkenprofile",
    typ: "doc_registry",
    kinder: [
      {
        titel: "OneCampus Group",
        typ: "doc_registry",
        kinder: [
          {
            titel: "Markenprofil",
            typ: "brand_profile",
            datei: "onecampus-group/01_markenprofil.md",
            markenname: "OneCampus Group",
            markenebene: "dachmarke",
            abschnitte: {
              ...GEMEINSAM,
              brand_purpose: { kapitel: ["Markenauftrag"] },
              brand_role: {
                plattform: ["Markenrolle", "Positionierung"],
                kapitel: ["Zwei Rollen der Gruppe"],
              },
              recommended_claim: {
                plattform: ["Primäre Markenlinie", "Fachliche Profilzeile"],
              },
              guiding_idea: { plattform: ["Leitgedanke"] },
              tonality: {
                plattform: ["Beziehung zur Zielgruppe"],
                kapitel: ["Werte und Markenpersönlichkeit"],
              },
              service_logic: {
                kapitel: ["Die Leistungsidentität: sechs Kompetenzfelder"],
              },
              primary_target_groups: {
                kapitel: ["Markenwirkung und sichtbare Identität"],
              },
              brand_delimitation: {
                kapitel: ["Bildungswege und institutionelle Substanz"],
              },
              brand_principles: {
                kapitel: ["Erfolgskriterien der Markenführung"],
              },
              strategic_decision: {
                kapitel: [
                  "Positionierung und Kernversprechen",
                  "Weiterentwicklung der bisherigen Markenformulierungen",
                ],
              },
            },
          },
          {
            titel: "Angebotskommunikation",
            typ: "policy",
            datei: "onecampus-group/02_angebotskommunikation.md",
          },
          {
            titel: "Bildsprache",
            typ: "policy",
            datei: "onecampus-group/03_bildsprache.md",
          },
        ],
      },
      {
        titel: "Academy of Sports",
        typ: "doc_registry",
        kinder: [
          {
            titel: "Markenprofil",
            typ: "brand_profile",
            datei: "academy-of-sports/01_markenprofil.md",
            markenname: "Academy of Sports",
            markenebene: "einzelmarke",
            abschnitte: {
              ...GEMEINSAM,
              brand_purpose: { kapitel: ["Markenauftrag"] },
              brand_role: { plattform: ["Markenrolle", "Positionierung"] },
              recommended_claim: {
                plattform: [
                  "Primäre Markenlinie",
                  "Ergänzende Markenlinie",
                  "Aktivierung für berufliche Einstiege",
                  "Fachliche Kurzbeschreibung",
                ],
              },
              tonality: {
                plattform: ["Markenpersönlichkeit"],
                kapitel: ["Sprach- und Bildcharakter"],
              },
              strategic_decision: {
                kapitel: [
                  "Haltung: Begeisterung wird handlungsfähig",
                  "Bewahrte und weiterentwickelte Markeninhalte",
                ],
              },
              service_logic: { kapitel: ["Fachliche Identität"] },
              brand_principles: { kapitel: ["Werte in der Kommunikation"] },
              primary_target_groups: { kapitel: ["Beziehung zur Zielgruppe"] },
              brand_delimitation: {
                kapitel: ["Bildungswege und Gruppenrolle"],
              },
            },
          },
          {
            titel: "Zielgruppenprofile",
            typ: "policy",
            datei: "academy-of-sports/02_zielgruppenprofile.md",
          },
          {
            titel: "Kommunikationskonzept",
            typ: "policy",
            datei: "academy-of-sports/03_kommunikationskonzept.md",
          },
          {
            titel: "Bildsprache",
            typ: "policy",
            datei: "academy-of-sports/04_bildsprache.md",
          },
        ],
      },
      {
        titel: "DeLSt",
        typ: "doc_registry",
        kinder: [
          {
            titel: "Markenprofil",
            typ: "brand_profile",
            datei: "delst/01_markenprofil.md",
            markenname: "DeLSt",
            markenebene: "einzelmarke",
            abschnitte: {
              ...GEMEINSAM,
              brand_purpose: { kapitel: ["Markenauftrag"] },
              brand_role: { plattform: ["Markenrolle", "Positionierung"] },
              recommended_claim: {
                plattform: [
                  "Primäre Markenlinie",
                  "Aktivierungslinie",
                  "Erfahrungslinie",
                ],
              },
              tonality: {
                plattform: ["Markenpersönlichkeit"],
                kapitel: ["Sprach- und Bildcharakter"],
              },
              strategic_decision: {
                kapitel: [
                  "Eigenständiger Wert der Marke",
                  "Nachweise und Weiterentwicklung",
                ],
              },
              service_logic: {
                kapitel: ["Fachliche Identität und Angebotslogik"],
              },
              brand_principles: {
                kapitel: ["Werte in beobachtbarem Verhalten"],
              },
              primary_target_groups: {
                kapitel: ["Beziehung und Service-Idee"],
              },
              brand_delimitation: { kapitel: ["Markenübergreifende Wege"] },
            },
          },
          {
            titel: "Zielgruppenprofile",
            typ: "policy",
            datei: "delst/02_zielgruppenprofile.md",
          },
          {
            titel: "Kommunikationskonzept",
            typ: "policy",
            datei: "delst/03_kommunikationskonzept.md",
          },
          {
            titel: "Bildsprache",
            typ: "policy",
            datei: "delst/04_bildsprache.md",
          },
        ],
      },
      {
        titel: "EHiP Hochschule",
        typ: "doc_registry",
        kinder: [
          {
            titel: "Markenprofil",
            typ: "brand_profile",
            datei: "ehip/01_markenprofil_hochschule.md",
            markenname: "EHiP Hochschule",
            markenebene: "einzelmarke",
            abschnitte: {
              ...GEMEINSAM,
              brand_purpose: { kapitel: ["Markenauftrag"] },
              brand_role: { plattform: ["Markenrolle", "Positionierung"] },
              recommended_claim: {
                plattform: [
                  "Gemeinsame Identitätslinie",
                  "Gemeinsame Substanzlinie",
                ],
              },
              tonality: {
                plattform: ["Persönlichkeit"],
                kapitel: ["Sprache, Bildwelt und institutionelle Nachweise"],
              },
              strategic_decision: {
                kapitel: [
                  "Eine Hochschule, drei Kommunikationskontexte",
                  "Weiterentwicklung des Ausgangsprofils",
                ],
              },
              service_logic: {
                kapitel: ["Akademischer Anspruch und Praxisbezug"],
              },
              brand_principles: { kapitel: ["Werte und Haltung"] },
              primary_target_groups: {
                kapitel: [
                  "Zugang und unterschiedliche Lebensrealitäten",
                  "Studienwahl, Beratung und digitale Begleitung",
                ],
              },
              brand_delimitation: { kapitel: ["Gruppenrolle"] },
            },
          },
          {
            titel: "Fernstudium",
            typ: "doc_registry",
            kinder: [
              {
                titel: "Zielgruppenprofile",
                typ: "policy",
                datei: "ehip/fernstudium/01_zielgruppenprofile.md",
              },
              {
                titel: "Kommunikationskonzept",
                typ: "policy",
                datei: "ehip/fernstudium/02_kommunikationskonzept.md",
              },
              {
                titel: "Bildsprache",
                typ: "policy",
                datei: "ehip/fernstudium/03_bildsprache.md",
              },
            ],
          },
          {
            titel: "Duales Fernstudium",
            typ: "doc_registry",
            kinder: [
              {
                titel: "Zielgruppenprofile",
                typ: "policy",
                datei: "ehip/duales-fernstudium/01_zielgruppenprofile.md",
              },
              {
                titel: "Kommunikationskonzept",
                typ: "policy",
                datei: "ehip/duales-fernstudium/02_kommunikationskonzept.md",
              },
              {
                titel: "Bildsprache",
                typ: "policy",
                datei: "ehip/duales-fernstudium/03_bildsprache.md",
              },
            ],
          },
        ],
      },
      {
        titel: "EHiP Academy",
        typ: "doc_registry",
        kinder: [
          {
            titel: "Markenprofil",
            typ: "brand_profile",
            datei: "ehip/02_markenprofil_academy.md",
            markenname: "EHiP academy",
            markenebene: "submarke",
            abschnitte: {
              ...GEMEINSAM,
              brand_purpose: { kapitel: ["Markenauftrag"] },
              brand_role: { plattform: ["Markenrolle", "Positionierung"] },
              recommended_claim: {
                plattform: [
                  "Primäre Markenlinie",
                  "Aktivierungslinie",
                  "Sekundäre Anschlusslinie",
                ],
              },
              tonality: {
                plattform: ["Persönlichkeit"],
                kapitel: ["Sprache und visuelle Identität"],
              },
              strategic_decision: {
                kapitel: [
                  "Eigenständige Identität unter der Hochschule",
                  "Weiterentwicklung des ursprünglichen Profils",
                ],
              },
              service_logic: { kapitel: ["Fachliche Nutzenlogik"] },
              brand_principles: {
                plattform: ["Schreibweise"],
                kapitel: ["Werte und Beziehung"],
              },
              primary_target_groups: {
                kapitel: ["Zielgruppen und Fachfelder"],
              },
              brand_delimitation: {
                kapitel: ["Digitale Orientierung, Beratung und B2B"],
              },
            },
          },
          {
            titel: "Zielgruppenprofile",
            typ: "policy",
            datei: "ehip/academy/01_zielgruppenprofile.md",
          },
          {
            titel: "Kommunikationskonzept",
            typ: "policy",
            datei: "ehip/academy/02_kommunikationskonzept.md",
          },
          {
            titel: "Bildsprache",
            typ: "policy",
            datei: "ehip/academy/03_bildsprache.md",
          },
        ],
      },
    ],
  },
];
