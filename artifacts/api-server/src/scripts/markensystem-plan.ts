/**
 * Zuordnungstabelle des Markensystem-Imports — der fachliche Kern.
 *
 * Bewusst als Datenstruktur und nicht in Code verstreut: Wer prüfen will, ob
 * ein Dokumentabschnitt am richtigen Ort landet, liest hier eine Tabelle statt
 * eine Ablaufsteuerung.
 *
 * LESEART (einfache Abschnitte)
 *   `plattform`       Zeilen der Plattformtabelle (Spalte 1, exakter Text).
 *   `kapitel`         Überschriften des Quelldokuments (ohne Nummer, Teiltreffer).
 *                     Die Kapitelüberschrift bleibt als Zwischenüberschrift sichtbar.
 *   `kapitelAlsListe` wie `kapitel`, die zweispaltige Tabelle wird zu »Feld: Wert«.
 *   `dokumentdaten`   Zeilen der Dokumentdaten-Tabelle ganz oben.
 *
 * `teile` (geordnete Abschnitte, Überarbeitungsauftrag FC-MSA-20260911-REV, AP-01):
 *   Ein Feld beginnt mit der fachlichen Einordnung, die die Feldüberschrift
 *   verspricht, und erschließt die vollständigen Quellen. Einordnungen sind
 *   entweder aus der Quelle abgeleitet (Profilliste, Tabellenspalte, wörtliche
 *   Auszüge) oder als dokumentierte Einordnung mit Quellenverweis gesetzt.
 *   Verweise in `text`/`einleitung` stehen als Markdown-Links auf Paketdateien
 *   (relativ zur Datei des Profils) und werden zu FlowCore-Seitenlinks.
 *
 * `inhaltPraefix`: Kapitel, die im Inhaltsbereich unter einer Einordnung stehen
 *   (»Visuelle Markenwirkung: Markenwirkung und sichtbare Identität«).
 *
 * TITEL folgen den Dokumenttiteln der Quelle in der Form »Marke – Dokument«
 * (Ablageleitfaden 6.10). Die Schreibweise »EHiP academy« gibt die Marke selbst
 * vor (Plattformzeile »Schreibweise«).
 */

/** Seitentypen, die dieser Import verwendet. */
export type Seitentyp = "doc_registry" | "brand_profile" | "policy";

export type Teil =
  | { art: "plattform"; zeilen: string[] }
  | { art: "kapitel"; titel: string; praefix?: string }
  | { art: "kapitelAlsListe"; titel: string }
  | { art: "dokumentdaten"; zeilen: Array<[quelle: string, anzeige: string]> }
  | { art: "ueberschrift"; text: string }
  | { art: "text"; markdown: string }
  | {
      art: "tabellenspalteAlsListe";
      kapitel: string;
      spalte: number;
      einleitung: string;
    }
  | {
      art: "tabelleAlsKontextliste";
      kapitel: string;
      beschriftung: number;
      beschreibung: number;
      anwendung: number;
    }
  | { art: "profilListe"; datei: string; kennung: string; einleitung: string }
  | { art: "auszuege"; saetze: Array<{ kapitel: string; satz: string }> };

export interface Abschnittsquelle {
  plattform?: string[];
  kapitel?: string[];
  kapitelAlsListe?: string[];
  dokumentdaten?: string[];
  /** Geordnete Teile — ersetzt die einfachen Schlüssel oben. */
  teile?: Teil[];
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
  /** Kapitel im Inhaltsbereich mit vorangestellter Einordnung. */
  inhaltPraefix?: Record<string, string>;
  /** Abweichender Prüfzyklus in Monaten (Standard 12). */
  pruefzyklusMonate?: number;
  kinder?: Seitenbauplan[];
}

/** Datei der Seite, an die alle normativen Seiten gebunden sind (Quellenrang und Anwendung). */
export const SYSTEM_UND_GELTUNG = "00-gruppe/00_system_und_geltung.md";

/**
 * Feld »Mandat und Verantwortungsrahmen« (AP-01, 3.5): Die Vorlage meint
 * Richtlinienkompetenz, Zuständigkeiten und Grenzen — nicht Dokumentgeltung.
 * Das Feld führt deshalb wörtliche Auszüge aus dem Profil mit Kapitelangabe und
 * darunter, abgesetzt und eindeutig bezeichnet, die Dokumentdaten.
 */
function mandat(
  saetze: Array<{ kapitel: string; satz: string }>,
): Abschnittsquelle {
  return {
    teile: [
      { art: "ueberschrift", text: "Mandat und Grenzen laut Markenprofil" },
      { art: "auszuege", saetze },
      { art: "ueberschrift", text: "Dokumentdaten" },
      {
        art: "dokumentdaten",
        zeilen: [
          ["Geltung", "Dokumentgeltung"],
          ["Pflegeverantwortung", "Pflegeverantwortung"],
        ],
      },
    ],
  };
}

const KERNVERSPRECHEN: Abschnittsquelle = { plattform: ["Kernversprechen"] };

export const BAUPLAN: Seitenbauplan[] = [
  {
    titel: "Gruppenrahmen",
    typ: "doc_registry",
    beschreibung:
      "Gruppenweite Grundlagen des Markensystems: Geltung, Markenarchitektur, Kommunikationsgrundsätze, Kanalhandbuch, visuelle Grundsätze sowie Qualität und Freigabe.",
    kinder: [
      { titel: "System und Geltung", typ: "policy", datei: SYSTEM_UND_GELTUNG },
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
        // AP-06: führende Seite der quartalsweisen Systemprüfung
        pruefzyklusMonate: 3,
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
            inhaltPraefix: {
              "Markenwirkung und sichtbare Identität": "Visuelle Markenwirkung",
            },
            abschnitte: {
              core_promise: KERNVERSPRECHEN,
              brand_mandate: mandat([
                {
                  kapitel: "Die Leistungsidentität: sechs Kompetenzfelder",
                  satz: "Ein Unternehmen kann eine klar abgegrenzte Leistung oder ein verbundenes Vorhaben beauftragen; die Marke behauptet keine pauschale Vollverantwortung für alle institutionellen Entscheidungen.",
                },
                {
                  kapitel: "Bildungswege und institutionelle Substanz",
                  satz: "Die zuständige Institution verantwortet ihre Fachinhalte, Zugangsentscheidungen, Prüfungen und Abschlüsse.",
                },
              ]),
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
              brand_principles: { kapitel: ["Werte und Markenpersönlichkeit"] },
              // AP-01, 3.2: sprachliche B2B-Haltung zuerst; die visuelle
              // Markenwirkung steht vollständig im Inhaltsbereich.
              tonality: {
                teile: [
                  {
                    art: "text",
                    markdown:
                      "Souverän, unternehmerisch, zugewandt, konkret und überzeugt von der eigenen Bildungsarbeit. Die Kommunikation führt mit betrieblichem Entwicklungsziel, eigener Leistung und fachlich nachvollziehbarem Nutzen. Ansprache, Anrede und Kanalvarianten gelten nach dem gemeinsamen B2B-Kommunikationsstandard.",
                  },
                  {
                    art: "text",
                    markdown:
                      "Verbindlicher Standard: [Gemeinsamer B2B-Kommunikationsstandard](../01-b2b/02_kommunikationsstandard.md)",
                  },
                  {
                    art: "text",
                    markdown:
                      "Einordnung aus: Kapitel „Werte und Markenpersönlichkeit“ dieses Profils, [Kommunikationsgrundsätze](../00-gruppe/02_kommunikationsgrundsaetze.md) und [Gemeinsamer B2B-Kommunikationsstandard](../01-b2b/02_kommunikationsstandard.md).",
                  },
                  {
                    art: "text",
                    markdown:
                      "Visuelle Markenwirkung: Abschnitt „Visuelle Markenwirkung: Markenwirkung und sichtbare Identität“ im Inhaltsbereich dieser Seite sowie [OneCampus Group – Bildsprache](03_bildsprache.md).",
                  },
                ],
              },
              // AP-01, 3.2: sechs Kompetenzfelder, abgeleitet aus der Tabelle
              service_logic: {
                teile: [
                  {
                    art: "kapitel",
                    titel: "Die Leistungsidentität: sechs Kompetenzfelder",
                  },
                  {
                    art: "tabellenspalteAlsListe",
                    kapitel: "Die Leistungsidentität: sechs Kompetenzfelder",
                    spalte: 0,
                    einleitung: "Die sechs Kompetenzfelder:",
                  },
                  {
                    art: "text",
                    markdown:
                      "Vollständige Tabelle mit Gestaltungsinhalten und Wert für die Organisation: Abschnitt „Die Leistungsidentität: sechs Kompetenzfelder“ im Inhaltsbereich dieser Seite.",
                  },
                ],
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
            inhaltPraefix: {
              "Beziehung zur Zielgruppe": "Beratungs- und Servicehaltung",
            },
            abschnitte: {
              core_promise: KERNVERSPRECHEN,
              brand_mandate: mandat([
                {
                  kapitel: "Haltung: Begeisterung wird handlungsfähig",
                  satz: "Die Marke verspricht Qualifikation und Kompetenzaufbau. Sie macht keine pauschalen Gesundheits-, Körper-, Gewichts- oder Einkommenszusagen.",
                },
                {
                  kapitel: "Werte in der Kommunikation",
                  satz: "Grenzen eines Angebots, berufliche Zuständigkeiten und gesundheitsbezogene Fragen werden fachlich korrekt eingeordnet.",
                },
              ]),
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
              // AP-01, 3.3: die fünf Lernendenprofile; Servicehaltung im Inhaltsbereich
              primary_target_groups: {
                teile: [
                  {
                    art: "profilListe",
                    datei: "academy-of-sports/02_zielgruppenprofile.md",
                    kennung: "AOS",
                    einleitung:
                      "Die fünf Lernendenprofile, führend gepflegt in [Academy of Sports – Zielgruppenprofile](02_zielgruppenprofile.md):",
                  },
                  {
                    art: "text",
                    markdown:
                      "Unternehmensadressaten werden über die zentralen B2B-Rollen erschlossen, nicht über eigene Personas: [Gemeinsame B2B-Zielgruppenprofile](../01-b2b/01_zielgruppenprofile.md); markenspezifische Anwendung in [Academy of Sports – Kommunikationskonzept](03_kommunikationskonzept.md).",
                  },
                  {
                    art: "text",
                    markdown:
                      "Beratungs- und Servicehaltung: Abschnitt „Beratungs- und Servicehaltung: Beziehung zur Zielgruppe“ im Inhaltsbereich dieser Seite.",
                  },
                ],
              },
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
            inhaltPraefix: {
              "Beziehung und Service-Idee": "Beratungs- und Servicehaltung",
            },
            abschnitte: {
              core_promise: KERNVERSPRECHEN,
              brand_mandate: mandat([
                {
                  kapitel: "Werte in beobachtbarem Verhalten",
                  satz: "Zusagen beruhen auf Produkt- und Prozessdaten. Die lernende Person versteht, was als Nächstes geschieht und welche Stelle für eine Entscheidung zuständig ist.",
                },
                {
                  kapitel: "Nachweise und Weiterentwicklung",
                  satz: "Die Marke unterscheidet klar zwischen eigenem Abschluss, Vorbereitung auf eine externe Prüfung und einer formalen Anerkennungsentscheidung.",
                },
              ]),
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
              // AP-01, 3.3: die fünf Entwicklungsprofile; Servicehaltung im Inhaltsbereich
              primary_target_groups: {
                teile: [
                  {
                    art: "profilListe",
                    datei: "delst/02_zielgruppenprofile.md",
                    kennung: "DEL",
                    einleitung:
                      "Die fünf Entwicklungsprofile, führend gepflegt in [DeLSt – Zielgruppenprofile](02_zielgruppenprofile.md):",
                  },
                  {
                    art: "text",
                    markdown:
                      "Unternehmensadressaten werden über die zentralen B2B-Rollen erschlossen, nicht über eigene Personas: [Gemeinsame B2B-Zielgruppenprofile](../01-b2b/01_zielgruppenprofile.md); markenspezifische Anwendung in [DeLSt – Kommunikationskonzept](03_kommunikationskonzept.md).",
                  },
                  {
                    art: "text",
                    markdown:
                      "Beratungs- und Servicehaltung: Abschnitt „Beratungs- und Servicehaltung: Beziehung und Service-Idee“ im Inhaltsbereich dieser Seite.",
                  },
                ],
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
              core_promise: KERNVERSPRECHEN,
              brand_mandate: mandat([
                {
                  kapitel: "Gruppenrolle",
                  satz: "Für Unternehmen bleibt die EHiP fachlich zuständiger Hochschulpartner innerhalb der gemeinsamen B2B-Kommunikation. OCG kann passende Entwicklungsprogramme koordinieren. Die akademische Verantwortung wird dadurch nicht auf die Holding übertragen.",
                },
                {
                  kapitel: "Werte und Haltung",
                  satz: "Digitale Orientierung und KI können Informationen erschließen; institutionelle Entscheidungen bleiben im zuständigen Verfahren.",
                },
              ]),
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
              // AP-01, 3.4: drei Kontexte unterscheidbar, Tabelle referenziert, B2B-Regel verlinkt
              strategic_decision: {
                teile: [
                  {
                    art: "kapitel",
                    titel: "Eine Hochschule, drei Kommunikationskontexte",
                  },
                  {
                    art: "tabelleAlsKontextliste",
                    kapitel: "Eine Hochschule, drei Kommunikationskontexte",
                    beschriftung: 0,
                    beschreibung: 1,
                    anwendung: 3,
                  },
                  {
                    art: "text",
                    markdown:
                      "Die vollständige Gegenüberstellung mit Entwicklungsauftrag, primärer Linie und führender Anwendung steht als Tabelle unter „Eine Hochschule, drei Kommunikationskontexte“ im Inhaltsbereich dieser Seite. Gemeinsame B2B-Regel für alle drei Kontexte: [Gemeinsamer B2B-Kommunikationsstandard](../01-b2b/02_kommunikationsstandard.md).",
                  },
                  {
                    art: "kapitel",
                    titel: "Weiterentwicklung des Ausgangsprofils",
                  },
                ],
              },
              service_logic: {
                kapitel: ["Akademischer Anspruch und Praxisbezug"],
              },
              brand_principles: { kapitel: ["Werte und Haltung"] },
              // AP-01, 3.4: Entscheidungskontexte zuerst, Zugänglichkeit als Querschnitt
              primary_target_groups: {
                teile: [
                  {
                    art: "text",
                    markdown:
                      "Menschen, die einen akademischen Abschluss mit Beruf und Lebensverantwortung verbinden, sowie Studieninteressierte, die ihren akademischen Einstieg mit betrieblicher Praxis gestalten. Die differenzierten Profile werden unter [EHiP Fernstudium – Zielgruppenprofile](fernstudium/01_zielgruppenprofile.md) und [EHiP duales Fernstudium – Zielgruppenprofile](duales-fernstudium/01_zielgruppenprofile.md) geführt. Unternehmensadressaten und Praxispartner nutzen die gemeinsamen B2B-Rollen ([Gemeinsame B2B-Zielgruppenprofile](../01-b2b/01_zielgruppenprofile.md)). Die akademische Weiterbildung ist im eigenständigen Profil der EHiP academy beschrieben ([EHiP academy – Markenprofil](02_markenprofil_academy.md)).",
                  },
                  {
                    art: "kapitel",
                    titel: "Zugang und unterschiedliche Lebensrealitäten",
                    praefix: "Zielgruppenübergreifende Zugänglichkeit",
                  },
                  {
                    art: "kapitel",
                    titel: "Studienwahl, Beratung und digitale Begleitung",
                    praefix: "Zielgruppenübergreifende Zugänglichkeit",
                  },
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
              core_promise: KERNVERSPRECHEN,
              brand_mandate: mandat([
                {
                  kapitel: "Eigenständige Identität unter der Hochschule",
                  satz: "Die EHiP academy ist klar unter der akademischen Identität der EHiP verankert, siehe [MS-E01 - EHiP Hochschule - Markenprofil](01_markenprofil_hochschule.md).",
                },
                {
                  kapitel: "Digitale Orientierung, Beratung und B2B",
                  satz: "Individuelle Zulassungs-, Anrechnungs- oder Förderfragen werden an die zuständige Fachstelle angebunden.",
                },
              ]),
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
 *
 * Platzhalter in `neu`, zur Laufzeit gesetzt: {STICHTAG_DE}, {NAECHSTE_SYSTEMPRUEFUNG_DE},
 * {ARCHIV_NAME}, {ARCHIV_SHA256}.
 */
export interface Textanpassung {
  datei: string;
  alt: string;
  neu: string;
  /** Wer hat wann entschieden, und warum. */
  grund: string;
}

const REV =
  "Überarbeitungsauftrag FC-MSA-20260911-REV, Freigabe Tobias Wenninger 11.09.2026";

export const TEXTANPASSUNGEN: Textanpassung[] = [
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "**Die Dateistruktur ist durch Tobias Wenninger freigegeben. Die hier ausgearbeiteten Inhalte bilden die Sollfassung 1.0 zur inhaltlichen Freigabe.** Sie wurden noch nicht in die Websites, Repositories, Agenten oder Prüfprogramme ausgerollt. Bis zur dokumentierten Umstellung bleiben deren aktive technische Regeln bestehen.",
    neu: "**Dieses Markensystem ist in FlowCore in der ausgewiesenen Revision als normative Grundlage veröffentlicht. Es beschreibt die verbindliche Marken- und Kommunikationsausrichtung.** Die Übernahme in Websites, Repositories, KI-Assistenten und weitere Anwendungen wird je Anwendung separat dokumentiert. Eine Veröffentlichung in FlowCore bestätigt weder diesen technischen Rollout noch die fachliche Freigabe einzelner Produkt-, Zulassungs- oder Förderaussagen. Bis zur dokumentierten Umstellung bleiben die aktiven technischen Regeln der Websites, Repositories, Agenten und Prüfprogramme bestehen.",
    grund: `AP-05 (${REV}): Veröffentlichung, fachliche Freigabe und Anwendungsrollout getrennt; ersetzt die Anpassung vom 11.09.2026 (Umsetzung 1).`,
  },
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "Während der Inhaltsprüfung wird keine Version als bereits freigegeben ausgegeben.",
    neu: "Regel für künftige Entwürfe: Während einer Inhaltsprüfung wird keine Version als bereits freigegeben ausgegeben.",
    grund: `AP-05 (${REV}): Regel als allgemeine Regel für künftige Entwürfe gekennzeichnet.`,
  },
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "Für die erste Freigabe: System,",
    neu: "Empfohlene Prüf- und Lesereihenfolge: System,",
    grund: `AP-05 (${REV}): Lesereihenfolge statt Hinweis auf eine erste Freigabe.`,
  },
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "G01-G05, B01/B02, E01, U02/U03, freigegebene Kooperations- und Studienmodelldaten",
    neu: "[Markenarchitektur](01_markenarchitektur.md), [Kommunikationsgrundsätze](02_kommunikationsgrundsaetze.md), [Kanalhandbuch](03_kanalhandbuch.md), [Visuelle Grundsätze](04_visuelle_grundsaetze.md), [Qualität und Freigabe](05_qualitaet_und_freigabe.md), [Gemeinsame B2B-Zielgruppenprofile](../01-b2b/01_zielgruppenprofile.md), [Gemeinsamer B2B-Kommunikationsstandard](../01-b2b/02_kommunikationsstandard.md), [EHiP Hochschule – Markenprofil](../ehip/01_markenprofil_hochschule.md), [EHiP duales Fernstudium – Kommunikationskonzept](../ehip/duales-fernstudium/02_kommunikationskonzept.md), [EHiP duales Fernstudium – Bildsprache](../ehip/duales-fernstudium/03_bildsprache.md), freigegebene Kooperations- und Studienmodelldaten",
    grund: `AP-04 (${REV}): Dokumentkürzel durch vollständig benannte Seitenverweise ersetzt.`,
  },
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "G02/G03, A01-A03, passendes Produkt und vorhandener Kontaktstatus",
    neu: "[Kommunikationsgrundsätze](02_kommunikationsgrundsaetze.md), [Kanalhandbuch](03_kanalhandbuch.md), [Academy of Sports – Markenprofil](../academy-of-sports/01_markenprofil.md), [Academy of Sports – Zielgruppenprofile](../academy-of-sports/02_zielgruppenprofile.md), [Academy of Sports – Kommunikationskonzept](../academy-of-sports/03_kommunikationskonzept.md), passendes Produkt und vorhandener Kontaktstatus",
    grund: `AP-04 (${REV}): Dokumentkürzel durch vollständig benannte Seitenverweise ersetzt.`,
  },
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "G02-G05, E02, C01-C03, aktuelle Finanzierungsquelle; bei Arbeitgeberrolle zusätzlich B01/B02",
    neu: "[Kommunikationsgrundsätze](02_kommunikationsgrundsaetze.md), [Kanalhandbuch](03_kanalhandbuch.md), [Visuelle Grundsätze](04_visuelle_grundsaetze.md), [Qualität und Freigabe](05_qualitaet_und_freigabe.md), [EHiP academy – Markenprofil](../ehip/02_markenprofil_academy.md), [EHiP academy – Zielgruppenprofile](../ehip/academy/01_zielgruppenprofile.md), [EHiP academy – Kommunikationskonzept](../ehip/academy/02_kommunikationskonzept.md), [EHiP academy – Bildsprache](../ehip/academy/03_bildsprache.md), aktuelle Finanzierungsquelle; bei Arbeitgeberrolle zusätzlich [Gemeinsame B2B-Zielgruppenprofile](../01-b2b/01_zielgruppenprofile.md) und [Gemeinsamer B2B-Kommunikationsstandard](../01-b2b/02_kommunikationsstandard.md)",
    grund: `AP-04 (${REV}): Dokumentkürzel durch vollständig benannte Seitenverweise ersetzt.`,
  },
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "Die zusätzliche Datei `migration/00_bestandsabgleich.md` ist ein **Arbeits- und Herkunftsnachweis**, kein 31. Kommunikationsstandard. Sie dokumentiert Quellen, Übernahmen, Weiterentwicklungen, Konfliktentscheidungen und Umstellungsaufgaben.",
    neu: "Das externe Herkunftsarchiv – das unveränderte Originalpaket `{ARCHIV_NAME}` mit der Datei `migration/00_bestandsabgleich.md` – ist ein **Arbeits- und Herkunftsnachweis**, kein 31. Kommunikationsstandard und keine FlowCore-Seite. Es dokumentiert Quellen, Übernahmen, Weiterentwicklungen, Konfliktentscheidungen und Umstellungsaufgaben. Das Archiv ist unter „Referenzen & mitgeltende Dokumente“ dieser Seite hinterlegt (SHA-256 `{ARCHIV_SHA256}`).",
    grund: `Abschnitt 12 (${REV}): externes Herkunftsarchiv benannt und erreichbar hinterlegt.`,
  },
  {
    datei: SYSTEM_UND_GELTUNG,
    alt: "| 1.0 | 09.09.2026 | Erstkonsolidierung in der freigegebenen 30-Dateien-Struktur; ausgearbeitete Inhalte zur Prüfung. |",
    neu: "| 1.0 | 09.09.2026 | Erstkonsolidierung in der freigegebenen 30-Dateien-Struktur; ausgearbeitete Inhalte zur Prüfung. |\n| 2.0 (FlowCore) | {STICHTAG_DE} | Korrektur der FlowCore-Übertragung nach Audit FC-MSA-20260911: Feldzuordnung der Markenprofile, Seitenbeziehungen, Quellenanweisungen, Freigabestatus und quartalsweise Systemprüfung; Markeninhalte unverändert. |",
    grund: `AP-05 (${REV}): neuer Änderungsverlaufseintrag; der historische Eintrag bleibt unverändert.`,
  },
  {
    datei: "00-gruppe/05_qualitaet_und_freigabe.md",
    alt: "Diese Frequenz ist eine interne Governance-Entscheidung.",
    neu: "Diese Frequenz ist eine interne Governance-Entscheidung.\n\n**Umsetzung in FlowCore:** Die Systemprüfung des gesamten Markensystems wird an dieser Seite geführt: Prüfzyklus 3 Monate, verantwortlich Tobias Wenninger (gruppenweite Markenführung), nächste Systemprüfung spätestens am {NAECHSTE_SYSTEMPRUEFUNG_DE}. Sie umfasst Status und Versionen, neue fachliche Anlässe, Marken- und B2B-Konsistenz, Verweise, Kontextabrufe sowie ausgewählte reale Kommunikations- und Bildbeispiele. Ergebnis und erforderliche Änderungen werden als neue Revision dieser Seite mit Prüfvermerk dokumentiert. Die übrigen Seiten behalten ihren jährlichen Prüfzyklus für die Einzelprüfung ihres Dokuments.",
    grund: `AP-06 (${REV}): quartalsweise Systemprüfung mit Verantwortung und Fälligkeit verankert.`,
  },
];
