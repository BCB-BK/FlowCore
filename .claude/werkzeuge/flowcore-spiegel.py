#!/usr/bin/env python3
"""FlowCore-Spiegel — holt die freigegebenen Seiten und legt sie als Markdown ab.

WARUM ES DIESES WERKZEUG GIBT
=============================
FlowCore ist die führende Quelle für Marken-, Ton- und Bildregeln (Betreiber-
Entscheidung 09.09.2026, Dossier `docs/auftraege/markensystem-bewertung-und-
ssot-2026-09-09.md`). Redigiert und freigegeben wird dort, gelesen über die
Content-API — nur veröffentlichte Stände, nur lesend.

Nur: **Eine Cloud-Sitzung erreicht FlowCore nicht.** Gemessen am 11.09.2026 aus
einer Sitzung von claude.ai/code: `gateway answered 403 to CONNECT` für
`flowcore.onecampusgroup.de:443` — die Netzrichtlinie der Anthropic-Umgebung
sperrt alle unsere Domänen. Ein Agent, der die Markenregeln nur live abrufen
kann, steht dort ohne sie da. Deshalb ein Spiegel: FlowCore bleibt führend, die
Dateien im Repo sind eine **abgeleitete Kopie** mit Herkunft und Stand im Kopf
jeder Datei — nie von Hand bearbeitet, sonst gäbe es wieder zwei Quellen.

WAS ES NICHT TUT
================
Es schreibt nichts nach FlowCore. Die API hat keinen Schreibpfad, und das ist
Absicht (§7 SSOT: ein Feld, ein führender Ort). Wer den Spiegel bearbeitet,
verliert die Änderung beim nächsten Lauf — und das ist die richtige Richtung.

FAIL-CLOSED
===========
Liefert die API null Seiten, wird **nichts gelöscht** und das Skript bricht mit
Exit 3 ab. Ein abgelaufener Schlüssel, eine zu eng geschnittene Freigabe oder
ein Ausfall der Gegenstelle sähe sonst aus wie "die Marke hat keine Regeln mehr"
— der stille Leer-Fallback aus Kernvertrag §3.7, hier mit Flurschaden über alle
Repos. Dasselbe gilt für einen Einbruch der Seitenzahl über die Schwelle
`--max-schwund` hinaus.

AUFRUF
======
    FLOWCORE_API_KEY=... python3 flowcore-spiegel.py --ziel markensystem/
    FLOWCORE_API_KEY=... python3 flowcore-spiegel.py --ziel markensystem/ --pruefe-nur

`--pruefe-nur` ruft ausschließlich /v1/scope ab und schreibt nichts. Das ist der
schnellste Weg, ein Anbindungsproblem von einem Freigabeproblem zu trennen: Steht
dort `accessiblePageCount: 0`, ist die Freigabe zu eng, nicht die Verbindung kaputt.
"""
import argparse
import datetime
import hashlib
import html
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

STAND = ".stand.json"          # checkpoint + bekannte IDs, im Zielverzeichnis
KOPF = "<!-- Diese Datei ist eine abgeleitete Kopie aus FlowCore. Nicht hier bearbeiten. -->"


def fehler(text, code=3):
    print(f"SPIEGEL-ABBRUCH: {text}", file=sys.stderr)
    sys.exit(code)


class FlowCore:
    def __init__(self, basis, schluessel, timeout=30):
        self.basis = basis.rstrip("/")
        self.schluessel = schluessel
        self.timeout = timeout

    def _ruf(self, pfad, daten=None):
        url = f"{self.basis}{pfad}"
        kopf = {"X-FlowCore-Api-Key": self.schluessel, "Accept": "application/json"}
        rumpf = None
        if daten is not None:
            rumpf = json.dumps(daten).encode()
            kopf["Content-Type"] = "application/json"
        anfrage = urllib.request.Request(url, data=rumpf, headers=kopf)
        try:
            with urllib.request.urlopen(anfrage, timeout=self.timeout) as antwort:
                return json.loads(antwort.read().decode())
        except urllib.error.HTTPError as e:
            # Die API begründet Ablehnungen bewusst — diese Begründung ist das
            # Wertvollste am Fehlerfall und darf nicht verschluckt werden.
            try:
                grund = json.loads(e.read().decode()).get("reason", "")
            except Exception:
                grund = ""
            hinweis = {
                401: "Schlüssel fehlt, ist unbekannt, widerrufen oder abgelaufen",
                403: "Zugriff außerhalb der Freigabe oder von nicht freigegebener IP",
                404: "Seite existiert nicht oder ist nicht veröffentlicht",
                429: "Anfragelimit erreicht — Retry-After beachten",
            }.get(e.code, "")
            fehler(f"HTTP {e.code} bei {pfad}"
                   + (f" — {hinweis}" if hinweis else "")
                   + (f" (reason: {grund})" if grund else ""))
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            # TimeoutError und OSError gehoeren ausdruecklich dazu: Eine haengende
            # Gegenstelle loest KEIN URLError aus, sondern laeuft in den Socket-Timeout
            # — ohne diesen Zweig endete der Lauf mit einem Python-Traceback und Exit 1
            # statt mit einer lesbaren Meldung und Exit 3. Gemessen 11.09.2026 in der
            # Gegenprobe, Fall 9. Ein Werkzeug, das beim Ausfall der Gegenstelle einen
            # Stacktrace wirft, ist im Lauf-Protokoll eines Runners praktisch stumm.
            grund = getattr(e, "reason", e)
            fehler(f"{pfad} nicht erreichbar — {grund}. Laeuft dieser Lauf in einer "
                   f"Umgebung mit Netzzugang zu FlowCore? Cloud-Sitzungen von claude.ai "
                   f"erreichen unsere Domaenen nicht (Egress-Sperre).")

    def _ruf_roh(self, pfad):
        """Wie _ruf, aber ein Fehler beendet nur diesen Aufruf — fuer die Diagnose,
        die absichtlich auch Pfade probiert, die es vielleicht nicht gibt."""
        return self._ruf(pfad)

    def scope(self):
        return self._ruf("/v1/scope")

    def seiten(self, limit=100):
        offset, alle = 0, []
        while True:
            block = self._ruf(f"/v1/pages?limit={limit}&offset={offset}")
            alle.extend(block.get("items", []))
            if not block.get("hasMore"):
                return alle, block.get("total", len(alle))
            offset += limit
            if offset > 100000:
                fehler("Pagination endet nicht — Abbruch bei 100000 Seiten")

    def seite(self, kennung, format="markdown"):
        """Holt eine Seite im schlanken Markdown-Format.

        FlowCore hat am 11.09.2026 drei Formate eingefuehrt (gemessen im Diagnoselauf):
          markdown  contentMarkdown + structuredData — fertig aufbereitet
          text      contentText + structuredData — Klartext ohne Auszeichnung
          full      zusaetzlich structuredFields mit dem HTML der Felder
        Der Spiegel nimmt `markdown`: Es ist das kleinste Format, das die Auszeichnung
        erhaelt. `full` brauchte nur, wer das rohe HTML einzelner Felder auswerten will —
        fuer einen lesenden Agenten ist das Ballast.
        """
        return self._ruf(f"/v1/pages/{kennung}?format={format}")

    def changes(self, seit, bekannte):
        pfad = "/v1/changes"
        teile = []
        if seit:
            teile.append(f"since={urllib.parse.quote(seit)}")
        if bekannte:
            teile.append(f"knownIds={','.join(bekannte)}")
        return self._ruf(pfad + ("?" + "&".join(teile) if teile else ""))


def saeubere(text, laenge, klein=True):
    """Macht aus fremdem Text ein Stück Dateiname — und nichts anderes.

    FlowCore-Seiten schreiben Menschen. `displayCode` und `title` sind damit
    **Daten aus fremder Hand** (`rules/security-supply-chain.md`), und bis zum
    11.09.2026 gingen sie ungefiltert in den Pfad. Ein Anzeigecode `../../ausbruch`
    schrieb zwei Ebenen ÜBER dem Zielverzeichnis, also außerhalb des Repos; ein `/`
    darin erzeugte einen Traceback statt einer Meldung. Im GitHub-Workflow begrenzt
    `git add markensystem` den Schaden — beim Lauf auf einer Maschine nicht.
    (Wächter-Befund 11.09.2026.)

    Erlaubt bleiben ausschließlich Kleinbuchstaben, Ziffern, Punkt und Bindestrich.
    """
    t = text.strip()
    if klein:
        t = t.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"),
                 ("Ä", "Ae"), ("Ö", "Oe"), ("Ü", "Ue")):
        t = t.replace(a, b)
    t = re.sub(r"[^A-Za-z0-9.]+", "-", t)
    t = re.sub(r"\.{2,}", ".", t)          # ".." kann keinen Verzeichniswechsel mehr bilden
    return t.strip("-.")[:laenge]


def dateiname(seite, vergeben=None):
    """Stabiler, sortierbarer Name: Anzeigecode + Titel-Slug.

    Der Anzeigecode steht vorn, weil er die Ordnung aus FlowCore mitbringt und
    sich nicht ändert, wenn jemand den Titel umformuliert. Ohne ihn würde eine
    Titeländerung als Löschung plus Neuanlage erscheinen.

    `vergeben` ist die Zuordnung Name → Seiten-ID der bereits geschriebenen Dateien.
    Zwei Seiten mit gleichem Anzeigecode UND gleichem Titel gibt es in FlowCore —
    ohne Kollisionsschutz überschrieb die zweite die erste **still**, und die
    Meldung sagte trotzdem "3 geschrieben" bei zwei Dateien auf der Platte
    (Wächter-Befund 11.09.2026). Jetzt bekommt die zweite ein ID-Kürzel angehängt:
    Abbrechen wäre die schlechtere Wahl — eine Dublette in FlowCore legte sonst den
    Spiegel aller Marken lahm.
    """
    code = saeubere(seite.get("displayCode") or "", 40, klein=False)
    slug = saeubere(seite.get("title") or "ohne-titel", 70) or "ohne-titel"
    basis = f"{code + '-' if code else ''}{slug}"
    name = f"{basis}.md"
    if vergeben is None:
        return name
    kennung = seite.get("nodeId") or ""
    belegt = {n.lower(): k for n, k in vergeben.items()}
    if belegt.get(name.lower()) in (None, kennung):
        return name
    # Der Ausweichname wird ebenso geprüft wie der reguläre. Ohne diese Schleife
    # konnte die Kollisionsauflösung SELBST kollidieren: zwei Seiten mit gleichem
    # Basisnamen und gleichem 8-Zeichen-Präfix der ID ergaben denselben Ausweichnamen,
    # eine überschrieb die andere still — und die Schlussmeldung zählte trotzdem
    # beide (Wächter-Befund 11.09.2026, O2). Der Namensraum ist disjunkt, weil ein
    # regulärer Name nie `--` enthalten kann: Zeichenläufe verdichtet `saeubere` zu
    # einem einzelnen `-`.
    for laenge in (8, 16, 36):
        kandidat = f"{basis}--{kennung[:laenge]}.md"
        if belegt.get(kandidat.lower()) in (None, kennung):
            return kandidat
    fehler(f"Für Seite {kennung} lässt sich kein eindeutiger Dateiname bilden — "
           f"'{basis}' ist bereits vergeben und auch die volle ID kollidiert. "
           f"Es wird nichts geschrieben.")


# Felder, die FlowCore fuer den Editor mitfuehrt und die keine Information tragen.
# `_editorContent` ist der ProseMirror-Dokumentbaum — dieselben Saetze noch einmal, nur
# als verschachtelte Knoten. Gemessen am ersten echten Abzug (11.09.2026): 678 KB von
# 1889 KB, also 36 % der gesamten Spiegelgroesse, ohne ein einziges zusaetzliches Wort.
BALLAST = ("_editorContent", "_editorState", "_html", "__typename")


def entwirre(wert, tiefe=0):
    """Macht aus einem strukturierten Feld lesbaren Text.

    FlowCore liefert die Feldinhalte als HTML-Schnipsel, teils als JSON-String mit
    HTML darin. Wer das roh als JSON-Block ablegt, zwingt jeden Leser — Mensch wie
    Agent — die Saetze aus Anfuehrungszeichen und Tags zu klauben. Genau das war der
    erste Abzug: formal vollstaendig, praktisch unlesbar. Hier wird daraus Markdown.
    """
    if wert is None or wert == "":
        return ""
    if isinstance(wert, (int, float, bool)):
        return str(wert)
    if isinstance(wert, list):
        teile = [entwirre(w, tiefe + 1) for w in wert]
        return "\n".join(f"- {t}" for t in teile if t)
    if isinstance(wert, dict):
        zeilen = []
        for k, v in wert.items():
            if k in BALLAST:
                continue
            t = entwirre(v, tiefe + 1)
            if t:
                zeilen.append(f"**{k}:** {t}" if "\n" not in t else f"**{k}:**\n{t}")
        return "\n".join(zeilen)

    t = str(wert).strip()
    # Ein String, der selbst wieder JSON ist (FlowCore tut das bei `references`).
    if t[:1] in "[{" and t[-1:] in "]}":
        try:
            return entwirre(json.loads(t), tiefe + 1)
        except Exception:
            pass
    return html_zu_text(t)


def html_zu_text(t):
    """Genau so viel HTML-Umwandlung, wie die FlowCore-Felder brauchen.

    Bewusst keine Bibliothek: Das Standardpaket kommt ohne Fremdabhaengigkeiten aus
    (dieselbe Begruendung wie beim MCP-Server — `aos1` hat kein npm). Und bewusst
    kein allgemeiner HTML-Parser: Was hier ankommt, ist der Ausgabesatz eines
    Rich-Text-Editors, kein beliebiges Web.
    """
    # Entities zuerst und IMMER: `&auml;hnlich` trägt kein einziges Tag und wäre
    # sonst am frühen Ausstieg vorbeigelaufen (Gegenprobe 11.09.2026). `html.unescape`
    # kommt aus der Standardbibliothek, kennt alle benannten Entities und ist damit
    # jeder handgepflegten Ersetzungsliste überlegen — ohne eine Fremdabhängigkeit
    # einzuführen.
    t = html.unescape(t)
    if "<" not in t:
        return t
    t = re.sub(r"<\s*br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</\s*(p|div|h[1-6]|li|tr)\s*>", "\n", t, flags=re.I)
    t = re.sub(r"<\s*li[^>]*>", "- ", t, flags=re.I)
    for stufe in range(6, 0, -1):
        t = re.sub(rf"<\s*h{stufe}[^>]*>", "\n" + "#" * min(stufe + 2, 6) + " ", t, flags=re.I)
    t = re.sub(r"<\s*(strong|b)\s*>(.*?)</\s*\1\s*>", r"**\2**", t, flags=re.I | re.S)
    t = re.sub(r"<\s*(em|i)\s*>(.*?)</\s*\1\s*>", r"*\2*", t, flags=re.I | re.S)
    t = re.sub(r"<a[^>]*href=\"([^\"]*)\"[^>]*>(.*?)</a>", r"[\2](\1)", t, flags=re.I | re.S)
    t = re.sub(r"<[^>]+>", "", t)
    # Zweiter Durchgang: Ein `&amp;lt;` im Quelltext wird erst jetzt zu `<`, nachdem
    # die echten Tags entfernt sind — sonst hätte die Tag-Entfernung daran geknabbert.
    t = html.unescape(t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def felder_als_text(felder):
    """Die strukturierten Felder als lesbare Abschnitte statt als JSON-Block."""
    zeilen = []
    for name, wert in felder.items():
        if name in BALLAST:
            continue
        text = entwirre(wert)
        if not text:
            continue
        ueberschrift = name.replace("_", " ").strip().capitalize()
        zeilen += [f"## {ueberschrift}", "", text, ""]
    return zeilen


def schreibe(ziel, seite, vergeben=None):
    inhalt = (seite.get("contentMarkdown") or seite.get("contentText")
              or seite.get("shortDescription") or "")
    kopf = {
        "quelle": "flowcore",
        "seite": seite.get("nodeId"),
        "anzeigecode": seite.get("displayCode"),
        "titel": seite.get("title"),
        "seitentyp": seite.get("pageType"),
        "version": seite.get("version"),
        "vertraulichkeit": seite.get("confidentiality"),
        # `ownerName` ist in der neuen Fassung durchgaengig null; die Person steht in
        # `contentOwner`. Beide werden gelesen, damit der Kopf nicht je nach
        # FlowCore-Stand mal leer bleibt.
        "verantwortlich": seite.get("contentOwner") or seite.get("ownerName"),
        # Ab hier: Felder aus der Fassung vom 11.09.2026. Sie sind kein Beiwerk —
        # `verbindlichkeit` und `quellrang` sagen einem Agenten, WIE bindend eine Seite
        # ist, `elternpfad` und `unterseiten` sagen ihm, wo er steht und was noch dazu
        # gehoert. Ohne sie liest er 41 gleichrangige Dateien ohne Ordnung.
        "kennung_stabil": seite.get("immutableId"),
        "revision": seite.get("revision"),
        "zustand": seite.get("status"),
        "entscheidungsstand": seite.get("decisionStatus"),
        "verbindlichkeit": seite.get("authorityLevel"),
        "quellrang": seite.get("sourcePriority"),
        "elternpfad": seite.get("parentPath"),
        "marken": seite.get("brandScope") or [],
        "bereiche": seite.get("agentScope") or [],
        "unterseiten": seite.get("childPageTitles") or [],
        "glossarbegriffe": seite.get("glossaryTerms") or [],
        "gueltig_ab": seite.get("validFrom"),
        "pruefung_faellig": seite.get("reviewDue"),
        "veroeffentlicht": seite.get("publishedAt"),
        "zuletzt_geaendert": seite.get("lastModifiedAt"),
        "inhalts_hash": seite.get("contentHash"),
        "tags": seite.get("tags") or [],
        "adresse": seite.get("sourceUrl"),
        "abgerufen": datetime.datetime.now(datetime.timezone.utc)
                     .replace(microsecond=0).isoformat(),
    }
    zeilen = ["---"]
    for k, v in kopf.items():
        if v in (None, "", []):
            continue
        zeilen.append(f"{k}: {json.dumps(v, ensure_ascii=False)}"
                      if isinstance(v, list) else f"{k}: {v}")
    zeilen += ["---", "", KOPF, ""]

    # `structuredData` ist die aufbereitete Fassung (seit 11.09.2026), `structuredFields`
    # die alte mit HTML darin. Beide werden gelesen: Wer auf einer aelteren FlowCore-
    # Fassung sitzt, bekommt weiterhin ein lesbares Ergebnis, und die Umwandlung in
    # `felder_als_text` schadet aufbereiteten Feldern nicht (sie findet dort einfach
    # kein HTML mehr).
    zeilen += felder_als_text(seite.get("structuredData")
                              or seite.get("structuredFields") or {})
    zeilen += [inhalt.rstrip(), ""]

    # Registerseiten tragen kaum Fliesstext — im ersten Abzug waren 11 von 41 Seiten
    # praktisch leer. Ihr Inhalt IST die Gliederung: welche Unterseiten es gibt und
    # wozu. FlowCore liefert das seit dem 11.09.2026 mit; ohne diesen Block stuenden
    # diese Seiten im Spiegel als leere Huelsen, und ein Agent haelte sie fuer
    # ungepflegt statt fuer ein Inhaltsverzeichnis.
    hinweis = (seite.get("childPagesGuidance") or "").strip()
    kinder = seite.get("childPages") or []
    if hinweis or kinder:
        zeilen += ["## Unterseiten", ""]
        if hinweis:
            zeilen += [html_zu_text(hinweis), ""]
        for k in kinder:
            if not isinstance(k, dict):
                continue
            code = (k.get("displayCode") or "").strip()
            titel = (k.get("title") or "").strip()
            kurz = (k.get("summary") or k.get("shortDescription") or "").strip()
            zeile = f"- **{titel}**" + (f" (`{code}`)" if code else "")
            if kurz:
                zeile += f" — {html_zu_text(kurz)}"
            zeilen.append(zeile)
        zeilen.append("")
    pfad = ziel / dateiname(seite, vergeben)
    # Gürtel und Hosenträger: Auch nach dem Säubern wird geprüft, dass der Pfad
    # WIRKLICH im Zielverzeichnis landet. Eine Namensregel, die man beim nächsten
    # Umbau versehentlich lockert, ist keine Grenze — der aufgelöste Pfad ist eine.
    if not pfad.resolve().is_relative_to(ziel.resolve()):
        fehler(f"Seite {seite.get('nodeId')} ergäbe den Pfad {pfad} außerhalb von "
               f"{ziel} — Anzeigecode oder Titel enthalten einen Verzeichniswechsel. "
               f"Es wird nichts geschrieben.")
    pfad.write_text("\n".join(zeilen), encoding="utf-8")
    return pfad


def main():
    p = argparse.ArgumentParser()
    # Siehe unten: ein leeres Secret verdraengt sonst den Vorgabewert.
    p.add_argument("--basis", default=(os.environ.get("FLOWCORE_API_BASE")
                   or "https://flowcore.onecampusgroup.de/api/content"))
    p.add_argument("--ziel", default="markensystem")
    p.add_argument("--pruefe-nur", action="store_true",
                   help="Nur /v1/scope abrufen, nichts schreiben")
    p.add_argument("--diagnose", action="store_true",
                   help="Antwortform einer Seite je Format vermessen, nichts schreiben")
    p.add_argument("--voll", action="store_true",
                   help="Vollabzug statt Änderungs-Feed erzwingen")
    p.add_argument("--max-schwund", type=float, default=0.5,
                   help="Abbruch, wenn die Seitenzahl um mehr als diesen Anteil faellt "
                        "(Standard 0.5 = die Haelfte). Schuetzt gegen eine versehentlich "
                        "verengte Freigabe, die den Spiegel leerraeumen wuerde.")
    a = p.parse_args()

    schluessel = os.environ.get("FLOWCORE_API_KEY", "").strip()
    if not schluessel:
        fehler("FLOWCORE_API_KEY ist nicht gesetzt. Der Schlüssel gehört in ein "
               "GitHub-Secret bzw. in die Umgebung — niemals ins Repo.", 2)

    if not str(a.basis).startswith(("http://", "https://")):
        fehler(f"Basisadresse '{a.basis}' ist keine http(s)-Adresse. Meist ist die "
               f"Umgebungsvariable FLOWCORE_API_BASE gesetzt, aber LEER — ein nicht "
               f"angelegtes GitHub-Secret kommt so an. Entweder das Secret fuellen oder "
               f"die Zeile aus dem Workflow nehmen; ohne sie gilt der Vorgabewert.", 2)

    fc = FlowCore(a.basis, schluessel)

    scope = fc.scope()
    anzahl = scope.get("accessiblePageCount", 0)
    print(f"Freigabe '{scope.get('name')}' — {anzahl} Seite(n) lesbar, "
          f"Stufe {scope.get('maxConfidentialityLevel')}, "
          f"Typen {scope.get('pageTypes')}, "
          f"Limit {scope.get('rateLimitPerMinute')}/min")
    if a.diagnose:
        # WARUM ES DIESEN MODUS GIBT: Die Gegenstelle ist ein eigenes Projekt mit
        # eigenem Entwicklungstakt. Aendert sich dort das Antwortformat, ist Raten der
        # teuerste Weg — und aus einer Cloud-Sitzung laesst sich die API gar nicht
        # befragen (Egress-Sperre). Dieser Modus laeuft auf einem Runner und meldet die
        # FORM der Antwort: welche Felder, wie gross, welcher Typ. Inhalte werden auf
        # 60 Zeichen gekuerzt — es geht um die Struktur, nicht um den Text.
        liste, gesamt = fc.seiten(limit=3)
        if not liste:
            fehler("Keine Seite abrufbar — Diagnose nicht moeglich.")
        kennung = liste[0].get("id")
        print(f"\nBEISPIELSEITE {kennung} ({liste[0].get('displayCode')})")
        for kennzeichen, pfad in (("ohne format", f"/v1/pages/{kennung}"),
                                  ("format=markdown", f"/v1/pages/{kennung}?format=markdown"),
                                  ("format=text", f"/v1/pages/{kennung}?format=text"),
                                  ("format=full", f"/v1/pages/{kennung}?format=full")):
            try:
                antwort = fc._ruf_roh(pfad)
            except SystemExit:
                print(f"\n--- {kennzeichen}: nicht verfuegbar ---")
                continue
            print(f"\n--- {kennzeichen} · {len(json.dumps(antwort, ensure_ascii=False))} B ---")
            for feld, wert in sorted(antwort.items()):
                roh = json.dumps(wert, ensure_ascii=False) if not isinstance(wert, str) else wert
                art = type(wert).__name__
                probe = re.sub(r"\s+", " ", str(roh))[:60]
                print(f"   {feld:22} {art:6} {len(roh):8} B  {probe}")
        return 0

    if a.pruefe_nur:
        return 0 if anzahl > 0 else fehler(
            "Die Verbindung steht, aber die Freigabe umfasst 0 Seiten. Das ist ein "
            "Freigabe-, kein Anbindungsproblem: in FlowCore unter Einstellungen → "
            "Content-API den Zuschnitt weiten (Marken, Struktur, Seitentypen).")
    if anzahl == 0:
        fehler("Die Freigabe umfasst 0 Seiten — es wird nichts geschrieben und nichts "
               "gelöscht. Ein leerer Spiegel sähe aus wie 'diese Marke hat keine Regeln'.")

    ziel = pathlib.Path(a.ziel)
    ziel.mkdir(parents=True, exist_ok=True)
    standpfad = ziel / STAND
    # Der Stand wird IMMER gelesen, auch bei --voll. `--voll` steuert nur, ob der
    # Änderungs-Feed benutzt wird — nicht, ob wir wissen, was vorher im Spiegel lag.
    # Vorher blieb `stand` bei --voll leer; damit war die Schwundprüfung im
    # Vollabzug-Pfad wirkungslos (sie verglich gegen 0) und das Abräumen fand nichts
    # zum Aufräumen. Beide Korrekturen dieses Tages liefen ins Leere, bis die
    # Gegenprobe Fall 14 es zeigte.
    stand = {}
    if standpfad.exists():
        try:
            stand = json.loads(standpfad.read_text())
        except Exception:
            print("Stand-Datei unlesbar — es wird ein Vollabzug gefahren.", file=sys.stderr)

    bekannt = list(stand.get("seiten", {}).keys())
    vollabzug_alt = None
    geschrieben, entfernt = [], []

    if bekannt and stand.get("checkpoint") and not a.voll:
        aend = fc.changes(stand["checkpoint"], bekannt)
        roh = aend.get("changed", [])
        zu_holen = [s["id"] for s in roh if isinstance(s, dict) and s.get("id")]
        if len(zu_holen) != len(roh):
            # `s["id"]` ohne Absicherung endete in einem KeyError-Traceback und Exit 1
            # — fail-closed zwar, aber stumm, und damit gegen die erklärte Absicht
            # dieses Werkzeugs (Wächter-Befund 11.09.2026).
            fehler(f"{len(roh) - len(zu_holen)} Eintrag/Einträge im Änderungs-Feed ohne "
                   f"'id' — die Antwort passt nicht zum vereinbarten Format. Es wird "
                   f"nichts geschrieben und nichts gelöscht.")
        weg = aend.get("removed", [])
        checkpoint = aend.get("checkpoint")
        print(f"Änderungs-Feed seit {stand['checkpoint']}: "
              f"{len(zu_holen)} geändert, {len(weg)} zurückgezogen")
        if len(weg) > max(1, len(bekannt) * a.max_schwund):
            fehler(f"{len(weg)} von {len(bekannt)} Seiten sollen entfernt werden — "
                   f"das überschreitet die Schwelle von {a.max_schwund:.0%}. Vermutlich "
                   f"wurde die Freigabe verengt oder der Schlüssel getauscht. Es wird "
                   f"nichts gelöscht. Mit --max-schwund 1.0 erzwingen, wenn gewollt.")
        for kennung in weg:
            name = stand["seiten"].get(kennung)
            if name and (ziel / name).exists():
                (ziel / name).unlink()
                entfernt.append(name)
            stand["seiten"].pop(kennung, None)
    else:
        liste, gesamt = fc.seiten()
        zu_holen = [s["id"] for s in liste if s.get("id")]
        ohne_id = len(liste) - len(zu_holen)
        if ohne_id:
            fehler(f"{ohne_id} Eintrag/Einträge in /v1/pages ohne 'id' — die Antwort der "
                   f"Gegenstelle passt nicht zum vereinbarten Format. Es wird nichts "
                   f"geschrieben und nichts gelöscht.")
        # DER VOLLABZUG BRAUCHT DIESELBE SCHWUNDPRÜFUNG WIE DER ÄNDERUNGS-FEED
        # (ergänzt 11.09.2026, Wächter-Befund). Vorher hatte nur der Feed-Pfad eine:
        # Meldete /v1/scope fünf Seiten und lieferte /v1/pages eine Antwort ohne
        # `items`, lief der Spiegel mit Exit 0 durch, schrieb `INDEX.md` mit
        # "0 Seite(n)" und setzte den Stand zurück. Der Workflow hätte das
        # committet — ein GRÜNER Lauf, der im Repo behauptet, die Marke habe keine
        # Regeln. Genau der Zustand, den fail-closed verhindern soll.
        vorher = len(stand.get("seiten") or {})
        if len(zu_holen) < gesamt:
            fehler(f"/v1/scope meldet {gesamt} lesbare Seite(n), /v1/pages liefert aber "
                   f"{len(zu_holen)}. Solange die beiden Auskünfte sich widersprechen, "
                   f"wird nichts geschrieben — ein unvollständiger Vollabzug sähe im "
                   f"Repo aus wie eine zurückgezogene Regel.")
        if vorher and len(zu_holen) < vorher * (1 - a.max_schwund):
            fehler(f"Der Spiegel hätte statt {vorher} nur noch {len(zu_holen)} Seite(n) — "
                   f"ein Einbruch über die Schwelle von {a.max_schwund:.0%}. Vermutlich "
                   f"wurde die Freigabe verengt oder der Schlüssel getauscht. Es wird "
                   f"nichts geschrieben. Mit --max-schwund 1.0 erzwingen, wenn gewollt.")
        checkpoint = datetime.datetime.now(datetime.timezone.utc) \
                     .replace(microsecond=0).isoformat().replace("+00:00", "Z")
        print(f"Vollabzug: {len(zu_holen)} von {gesamt} Seite(n)")
        # Der Vollabzug RÄUMT AB. Vorher wurde nur `stand["seiten"]` geleert, die
        # Dateien blieben liegen — die Doku versprach das Gegenteil. Eine Karteileiche
        # im Spiegel ist eine Regel, die FlowCore nicht mehr deckt, und niemand sieht
        # ihr das an (Wächter-Befund 11.09.2026).
        vollabzug_alt = dict(stand.get("seiten") or {})
        stand["seiten"] = {}

    seiten = stand.setdefault("seiten", {})
    # Name → ID der bereits in DIESEM Lauf vergebenen Dateien. Ohne diese Zuordnung
    # kann `dateiname` eine Kollision nicht von einem regulären Überschreiben
    # derselben Seite unterscheiden.
    vergeben = {name: kennung for kennung, name in seiten.items()}
    # Reserviert: Diese beiden schreibt der Spiegel selbst. Eine FlowCore-Seite mit
    # dem Titel "Index" würde sonst auf einem case-insensitiven Dateisystem die
    # erzeugte INDEX.md überschreiben — und damit das Inhaltsverzeichnis durch eine
    # Markenseite ersetzen (Wächter-Hinweis 11.09.2026).
    vergeben.setdefault("INDEX.md", "__reserviert__")
    vergeben.setdefault(STAND, "__reserviert__")
    for kennung in zu_holen:
        volle = fc.seite(kennung)
        volle.setdefault("nodeId", kennung)
        alter_name = seiten.get(kennung)
        pfad = schreibe(ziel, volle, vergeben)
        vergeben[pfad.name] = kennung
        # Ein umbenannter Titel darf keine Karteileiche hinterlassen.
        if alter_name and alter_name != pfad.name and (ziel / alter_name).exists():
            (ziel / alter_name).unlink()
            entfernt.append(alter_name)
        seiten[kennung] = pfad.name
        geschrieben.append(pfad.name)

    # Nach einem Vollabzug: alles wegräumen, was FlowCore nicht mehr ausliefert.
    if vollabzug_alt is not None:
        for kennung, name in vollabzug_alt.items():
            if kennung not in seiten and (ziel / name).exists() and name not in vergeben:
                (ziel / name).unlink()
                entfernt.append(name)

    stand["checkpoint"] = checkpoint
    stand["basis"] = a.basis
    stand["freigabe"] = scope.get("name")
    stand["seiten_gesamt"] = len(seiten)
    standpfad.write_text(json.dumps(stand, ensure_ascii=False, indent=2, sort_keys=True))

    index = ["# Markensystem — Spiegel aus FlowCore", "",
             KOPF, "",
             f"Freigabe **{scope.get('name')}** · {len(seiten)} Seite(n) · "
             f"Stand {checkpoint}", "",
             "FlowCore ist die führende Quelle. Änderungen werden **dort** redigiert und",
             "freigegeben; dieser Spiegel wird bei jedem Lauf überschrieben.", "",
             "| Datei | Seite |", "|---|---|"]
    for kennung, name in sorted(seiten.items(), key=lambda x: x[1]):
        index.append(f"| [`{name}`]({name}) | `{kennung}` |")
    (ziel / "INDEX.md").write_text("\n".join(index) + "\n", encoding="utf-8")

    # Die Schlussmeldung wird gegen die Platte geprüft. Eine Meldung, die mehr
    # behauptet, als da ist, ist schlimmer als keine — sie macht einen stillen
    # Verlust unsichtbar (Wächter-Empfehlung 11.09.2026, O2).
    auf_platte = len([q for q in ziel.glob("*.md") if q.name != "INDEX.md"])
    if auf_platte != len(seiten):
        fehler(f"Der Stand führt {len(seiten)} Seite(n), im Verzeichnis liegen aber "
               f"{auf_platte}. Die beiden müssen übereinstimmen — sonst ist entweder "
               f"eine Datei verlorengegangen oder eine liegt dort, die niemand kennt.")
    print(f"geschrieben: {len(geschrieben)} · entfernt: {len(entfernt)} · "
          f"im Spiegel: {len(seiten)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
