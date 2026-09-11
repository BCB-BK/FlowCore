/**
 * Zuordnungstabelle des Markensystem-Imports — der fachliche Kern.
 *
 * Bewusst als Datenstruktur und nicht in Code verstreut: Wer prüfen will, ob
 * ein Dokumentabschnitt am richtigen Ort landet, liest hier eine Tabelle statt
 * eine Ablaufsteuerung.
 *
 * LESEART
 *   `plattform`       Zeilen der Plattformtabelle (Spalte 1, exakter Text).
 *   `kapitel`         Überschriften des Quelldokuments (ohne Nummer, Teiltreffer).
 *                     Die Kapitelüberschrift bleibt im Abschnitt als
 *                     Zwischenüberschrift sichtbar.
 *   `kapitelAlsListe` wie `kapitel`, die zweispaltige Tabelle des Kapitels wird
 *                     aber als »Feld: Wert«-Absätze übernommen — Abschnittsfelder
 *                     können keine Tabellen darstellen.
 *   `dokumentdaten`   Zeilen der Dokumentdaten-Tabelle ganz oben.
 *
 * TITEL folgen den Dokumenttiteln der Quelle in der Form »Marke – Dokument«
 * (Ablageleitfaden 6.10). Die Schreibweise »EHiP academy« gibt die Marke selbst
 * vor (Plattformzeile »Schreibweise«).
 *
 * VERLUSTSCHUTZ: Der Import prüft je Markenprofil, dass JEDE Plattformzeile
 * zugeordnet ist. Nicht zugeordnete Kapitel wandern vollständig in den
 * Inhaltsbereich — dort können sie auch Tabellen tragen.
 */

/** Seitentypen, die dieser Import verwendet. */
export type Seitentyp = "doc_registry" | "brand_profile" | "policy";

export interface Abschnittsquelle {
  plattform?: string[];
  kapitel?: string[];
  kapitelAlsListe?: string[];
  dokumentdaten?: string[];
}

export interface Seitenbauplan {
  /** Titel in FlowCore — ohne Dateinummern. */
  titel: string;
  typ: Seitentyp;
  /** Pfad relativ zum Wurzelverzeichnis des Pakets; fehlt bei reinen Behältern. */
  datei?: string;
  /** Pflicht für Behälter: Abschnitt »Beschreibung« des Dokumentationsregisters. */
  beschreibung?: string;
  /** Marke; vererbt sich als Schlagwort auf alle Unterseiten. */
  markenname?: string;
  markenebene?: "dachmarke" | "einzelmarke" | "submarke" | "kampagnenmarke";
  /** Nur für brand_profile: Abschnittsschlüssel → Quellen im Dokument. */
  abschnitte?: Record<string, Abschnittsquelle>;
  kinder?: Seitenbauplan[];
}

/**
 * Zuordnung, die alle fünf Markenprofile gemeinsam haben. Die Zeile
 * »Strategische Inhaltsfreigabe« entfällt mit der Dokumentdaten-Tabelle
 * (Entscheidung vom 11.09.2026): Ihr Wortlaut »noch zu erteilen« widerspräche
 * der veröffentlichten Seite.
 */
const GEMEINSAM = {
  brand_mandate: { dokumentdaten: ["Geltung", "Pflegeverantwortung"] },
  core_promise: { plattform: ["Kernversprechen"] },
};

export const BAUPLAN: Seitenbauplan[] = [
  {
    titel: "Gruppenrahmen",
    typ: "doc_registry",
    beschreibung:
      "Gruppenweite Grundlagen des Markensystems: Geltung, Markenarchitektur, Kommunikationsgrundsätze, Kanalhandbuch, visuelle Grundsätze sowie Qualität und Freigabe.",
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
    beschreibung:
      "Gemeinsame Zielgruppenprofile und gemeinsamer Kommunikationsstandard für die Ansprache von Unternehmen und Institutionen über alle Marken.",
    kinder: [
      {
        titel: "Gemeinsame B2B-Zielgruppenprofile",
        typ: "policy",
        datei: "01-b2b/01_zielgruppenprofile.md",
      },
      {
        titel: "Gemeinsamer B2B-Kommunikationsstandard",
        typ: "policy",
        datei: "01-b2b/02_kommunikationsstandard.md",
      },
    ],
  },
  {
    titel: "Einzelmarkenprofile",
    typ: "doc_registry",
    beschreibung:
      "Markenprofile der Gruppenmarken mit ihren Zielgruppenprofilen, Kommunikationskonzepten und Bildsprachen.",
    kinder: [
      {
        titel: "OneCampus Group",
        typ: "doc_registry",
        markenname: "OneCampus Group",
        beschreibung:
          "Markenprofil, Angebotskommunikation und Bildsprache der Dachmarke OneCampus Group.",
        kinder: [
          {
            titel: "OneCampus Group – Markenprofil",
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
              // Die Dachmarke spricht Unternehmen an; ihre Zielgruppen sind die
              // gemeinsamen B2B-Rollen, auf die das Kapitel verweist.
              primary_target_groups: {
                plattform: ["Beziehung zur Zielgruppe"],
                kapitelAlsListe: ["Gemeinsamer B2B-Verweis"],
              },
              // Wie die übrigen Profile: Werte → Prinzipien, Wirkung/Bild → Tonalität.
              brand_principles: { kapitel: ["Werte und Markenpersönlichkeit"] },
              tonality: { kapitel: ["Markenwirkung und sichtbare Identität"] },
              service_logic: {
                kapitel: ["Die Leistungsidentität: sechs Kompetenzfelder"],
              },
              brand_delimitation: {
                kapitel: ["Bildungswege und institutionelle Substanz"],
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
            titel: "OneCampus Group – Angebotskommunikation",
            typ: "policy",
            datei: "onecampus-group/02_angebotskommunikation.md",
          },
          {
            titel: "OneCampus Group – Bildsprache",
            typ: "policy",
            datei: "onecampus-group/03_bildsprache.md",
          },
        ],
      },
      {
        titel: "Academy of Sports",
        typ: "doc_registry",
        markenname: "Academy of Sports",
        beschreibung:
          "Markenprofil, Zielgruppenprofile, Kommunikationskonzept und Bildsprache der Academy of Sports.",
        kinder: [
          {
            titel: "Academy of Sports – Markenprofil",
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
            titel: "Academy of Sports – Zielgruppenprofile",
            typ: "policy",
            datei: "academy-of-sports/02_zielgruppenprofile.md",
          },
          {
            titel: "Academy of Sports – Kommunikationskonzept",
            typ: "policy",
            datei: "academy-of-sports/03_kommunikationskonzept.md",
          },
          {
            titel: "Academy of Sports – Bildsprache",
            typ: "policy",
            datei: "academy-of-sports/04_bildsprache.md",
          },
        ],
      },
      {
        titel: "DeLSt",
        typ: "doc_registry",
        markenname: "DeLSt",
        beschreibung:
          "Markenprofil, Zielgruppenprofile, Kommunikationskonzept und Bildsprache von DeLSt.",
        kinder: [
          {
            titel: "DeLSt – Markenprofil",
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
            titel: "DeLSt – Zielgruppenprofile",
            typ: "policy",
            datei: "delst/02_zielgruppenprofile.md",
          },
          {
            titel: "DeLSt – Kommunikationskonzept",
            typ: "policy",
            datei: "delst/03_kommunikationskonzept.md",
          },
          {
            titel: "DeLSt – Bildsprache",
            typ: "policy",
            datei: "delst/04_bildsprache.md",
          },
        ],
      },
      {
        titel: "EHiP Hochschule",
        typ: "doc_registry",
        markenname: "EHiP Hochschule",
        beschreibung:
          "Markenprofil der EHiP Hochschule sowie Zielgruppenprofile, Kommunikationskonzepte und Bildsprachen für Fernstudium und duales Fernstudium.",
        kinder: [
          {
            titel: "EHiP Hochschule – Markenprofil",
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
            titel: "EHiP Fernstudium",
            typ: "doc_registry",
            beschreibung:
              "Zielgruppenprofile, Kommunikationskonzept und Bildsprache für das Fernstudium der EHiP.",
            kinder: [
              {
                titel: "EHiP Fernstudium – Zielgruppenprofile",
                typ: "policy",
                datei: "ehip/fernstudium/01_zielgruppenprofile.md",
              },
              {
                titel: "EHiP Fernstudium – Kommunikationskonzept",
                typ: "policy",
                datei: "ehip/fernstudium/02_kommunikationskonzept.md",
              },
              {
                titel: "EHiP Fernstudium – Bildsprache",
                typ: "policy",
                datei: "ehip/fernstudium/03_bildsprache.md",
              },
            ],
          },
          {
            titel: "EHiP duales Fernstudium",
            typ: "doc_registry",
            beschreibung:
              "Zielgruppenprofile, Kommunikationskonzept und Bildsprache für das duale Fernstudium der EHiP.",
            kinder: [
              {
                titel: "EHiP duales Fernstudium – Zielgruppenprofile",
                typ: "policy",
                datei: "ehip/duales-fernstudium/01_zielgruppenprofile.md",
              },
              {
                titel: "EHiP duales Fernstudium – Kommunikationskonzept",
                typ: "policy",
                datei: "ehip/duales-fernstudium/02_kommunikationskonzept.md",
              },
              {
                titel: "EHiP duales Fernstudium – Bildsprache",
                typ: "policy",
                datei: "ehip/duales-fernstudium/03_bildsprache.md",
              },
            ],
          },
        ],
      },
      {
        titel: "EHiP academy",
        typ: "doc_registry",
        markenname: "EHiP academy",
        beschreibung:
          "Markenprofil, Zielgruppenprofile, Kommunikationskonzept und Bildsprache der EHiP academy.",
        kinder: [
          {
            titel: "EHiP academy – Markenprofil",
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
            titel: "EHiP academy – Zielgruppenprofile",
            typ: "policy",
            datei: "ehip/academy/01_zielgruppenprofile.md",
          },
          {
            titel: "EHiP academy – Kommunikationskonzept",
            typ: "policy",
            datei: "ehip/academy/02_kommunikationskonzept.md",
          },
          {
            titel: "EHiP academy – Bildsprache",
            typ: "policy",
            datei: "ehip/academy/03_bildsprache.md",
          },
        ],
      },
    ],
  },
];

/**
 * Wortlautänderungen gegenüber der Quellfassung — nur mit ausdrücklicher
 * Entscheidung. `alt` muss im Dokument genau einmal vorkommen, sonst bricht der
 * Import ab; eine nicht angewandte Anpassung ebenfalls.
 */
export interface Textanpassung {
  datei: string;
  alt: string;
  neu: string;
  /** Wer hat wann entschieden, und warum. */
  grund: string;
}

export const TEXTANPASSUNGEN: Textanpassung[] = [
  {
    datei: "00-gruppe/00_system_und_geltung.md",
    alt: "**Die Dateistruktur ist durch Tobias Wenninger freigegeben. Die hier ausgearbeiteten Inhalte bilden die Sollfassung 1.0 zur inhaltlichen Freigabe.** Sie wurden noch nicht in die Websites, Repositories, Agenten oder Prüfprogramme ausgerollt. Bis zur dokumentierten Umstellung bleiben deren aktive technische Regeln bestehen.",
    neu: "**Die Dateistruktur ist durch Tobias Wenninger freigegeben. Die hier ausgearbeiteten Inhalte bilden die Sollfassung zur inhaltlichen Freigabe.** Bis zur dokumentierten Umstellung bleiben die aktiven technischen Regeln der Websites, Repositories, Agenten und Prüfprogramme bestehen.",
    grund:
      "Tobias Wenninger, 11.09.2026: Mit der Erfassung in FlowCore wird das Paket ausgerollt; der Hinweis »noch nicht ausgerollt« entfällt.",
  },
];
