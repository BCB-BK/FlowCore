#!/usr/bin/env python3
"""FlowCore-MCP — die Content-API als Werkzeuge für den Agenten.

WOFÜR
=====
Auf den Maschinen (`ehip1`, `aos1`, `delst1`, Tool-Server) erreicht der Agent
FlowCore direkt. Dort ist Fragen besser als Blättern: Volltextsuche über den
ganzen freigegebenen Ausschnitt, auch über das hinaus, was der Spiegel im Repo
abdeckt, und immer der Stand von jetzt statt der von der letzten vollen Stunde.

In einer Cloud-Sitzung von claude.ai/code ist dieser Server nutzlos — dort ist
die API gesperrt (gemessen 11.09.2026: `403 to CONNECT`). Deshalb gibt es
zusätzlich den Spiegel; die Regel `.claude/rules/markensystem.md` sagt, welcher
Weg wann gilt.

WARUM PYTHON OHNE FREMDBIBLIOTHEKEN
===================================
`aos1` hat weder `node` noch `npm` installiert (gemessen 08.09.2026, Server-
Register Abschnitt 5). Ein MCP-Server, der ein Node-Paket voraussetzt, wäre auf
genau der Maschine nicht lauffähig, deren Marke er bedienen soll. Python 3 ist
auf allen vier Maschinen vorhanden; das MCP-Protokoll über stdio ist schlank
genug, um es ohne SDK zu sprechen.

NUR LESEND
==========
Alle fünf Werkzeuge sind Leseoperationen. Die Content-API hat keinen Schreibpfad
— FlowCore bleibt führend, angebundene Systeme spiegeln, sie verändern nicht.

EINRICHTUNG (je Repo, `.mcp.json`)
==================================
    {
      "mcpServers": {
        "flowcore": {
          "command": "python3",
          "args": [".claude/mcp/flowcore-mcp.py"],
          "env": { "FLOWCORE_API_KEY": "${FLOWCORE_API_KEY}" }
        }
      }
    }

Der Schlüssel kommt aus der Umgebung, nie aus einer Datei im Repo.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

# `or` statt des Vorgabewerts von `.get()`: Ein nicht gesetztes GitHub-Secret
# kommt als LEERER STRING in der Umgebung an, nicht als fehlende Variable. `.get(name,
# vorgabe)` liefert dann "" — und die Vorgabe greift nie. Der erste echte Lauf endete
# genau daran: `ValueError: unknown url type: '/v1/scope'`, weil die Basisadresse leer
# war (11.09.2026). Kein Nachbau haette das gefunden; die Gegenprobe setzte die Variable
# immer. Genau dafuer ist der erste Lauf in der Zielumgebung Teil der Abnahme
# (Kernvertrag Paragraf 5, Umgebungsparitaet).
BASIS = (os.environ.get("FLOWCORE_API_BASE")
         or "https://flowcore.onecampusgroup.de/api/content").rstrip("/")
SCHLUESSEL = os.environ.get("FLOWCORE_API_KEY", "").strip()
TIMEOUT = int(os.environ.get("FLOWCORE_TIMEOUT", "30"))

WERKZEUGE = [
    {
        "name": "flowcore_freigabe",
        "description": (
            "Selbstauskunft: Was darf dieser Zugang lesen? Liefert Name der Freigabe, "
            "höchste Vertraulichkeitsstufe, erlaubte Seitentypen und die Zahl der "
            "zugänglichen Seiten. Zuerst aufrufen, wenn eine Suche nichts findet — "
            "steht dort 0, ist die Freigabe zu eng und nicht die Verbindung kaputt."),
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "flowcore_suche",
        "description": (
            "Volltextsuche im freigegebenen Ausschnitt. Der erste Griff für Fragen nach "
            "Marken-, Ton-, Ansprache- und Bildregeln: erst suchen, dann die Treffer mit "
            "flowcore_seite ganz lesen. Was nicht freigegeben ist, taucht auch hier nicht auf."),
        "inputSchema": {
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string", "description": "Suchbegriff oder Frage"},
                "pageType": {"type": "string", "description": "Auf einen Seitentyp einschränken"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 10},
            },
        },
    },
    {
        "name": "flowcore_seite",
        "description": (
            "Eine Seite vollständig lesen: Text, strukturierte Felder, Tags, verantwortliche "
            "Person, Gültigkeit und Prüffrist. Die id stammt aus flowcore_suche oder "
            "flowcore_liste. Antwortet die API mit 403, liegt die Seite außerhalb der "
            "Freigabe — der genannte Grund sagt, welche Dimension es war."),
        "inputSchema": {
            "type": "object",
            "required": ["id"],
            "properties": {"id": {"type": "string", "description": "Seiten-UUID"}},
        },
    },
    {
        "name": "flowcore_liste",
        "description": (
            "Freigegebene Seiten auflisten, mit Pagination. Für den Überblick, wenn nicht "
            "klar ist, wonach zu suchen wäre. updatedSince grenzt auf kürzlich Geändertes ein."),
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "minimum": 1, "maximum": 100, "default": 25},
                "offset": {"type": "integer", "minimum": 0, "default": 0},
                "pageType": {"type": "string"},
                "updatedSince": {"type": "string", "description": "ISO-8601-Zeitpunkt"},
            },
        },
    },
    {
        "name": "flowcore_glossar",
        "description": (
            "Die Glossarbegriffe des freigegebenen Ausschnitts. Nützlich, bevor ein Begriff "
            "im eigenen Text neu erfunden wird — die Gruppe hat für vieles bereits ein Wort."),
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def ruf(pfad, daten=None):
    """Ruft die API und gibt (text, ist_fehler) zurück.

    Fehler werden als lesbarer Text zurückgegeben, nicht geworfen: Ein MCP-Werkzeug,
    das eine Ausnahme wirft, sagt dem Agenten nur "Fehler" — die Begründung der API
    (welche Freigabedimension, welcher Schlüsselzustand) ist aber genau das, was er
    braucht, um weiterzukommen oder sauber aufzugeben.
    """
    if not SCHLUESSEL:
        return ("FLOWCORE_API_KEY ist in dieser Umgebung nicht gesetzt. Der Schlüssel "
                "gehört in die Umgebung des Agenten, nie ins Repo. Ohne ihn ist FlowCore "
                "nicht abfragbar — in einer Cloud-Sitzung ist die API ohnehin gesperrt; "
                "dort steht der Spiegel unter markensystem/.", True)
    kopf = {"X-FlowCore-Api-Key": SCHLUESSEL, "Accept": "application/json"}
    rumpf = None
    if daten is not None:
        rumpf = json.dumps(daten).encode()
        kopf["Content-Type"] = "application/json"
    try:
        req = urllib.request.Request(BASIS + pfad, data=rumpf, headers=kopf)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as a:
            return (a.read().decode(), False)
    except urllib.error.HTTPError as e:
        try:
            koerper = json.loads(e.read().decode())
        except Exception:
            koerper = {}
        klartext = {
            401: "Schlüssel fehlt, ist unbekannt, widerrufen oder abgelaufen",
            403: "außerhalb der Freigabe dieses Schlüssels oder von nicht freigegebener IP",
            404: "Seite existiert nicht oder ist nicht veröffentlicht",
            429: "Anfragelimit erreicht — kurz warten und erneut versuchen",
        }.get(e.code, "")
        return (f"HTTP {e.code} bei {pfad}"
                + (f" — {klartext}" if klartext else "")
                + (f" (reason: {koerper['reason']})" if koerper.get("reason") else ""), True)
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return (f"FlowCore nicht erreichbar — {getattr(e, 'reason', e)}. Läuft diese "
                f"Sitzung auf einer Maschine oder in der Cloud? Cloud-Sitzungen von "
                f"claude.ai erreichen unsere Domänen nicht (Egress-Sperre); dort ist der "
                f"Spiegel unter markensystem/ der Weg.", True)


def fuehre_aus(name, args):
    if name == "flowcore_freigabe":
        return ruf("/v1/scope")
    if name == "flowcore_glossar":
        return ruf("/v1/glossary")
    if name == "flowcore_seite":
        kennung = (args.get("id") or "").strip()
        if not kennung:
            return ("Pflichtfeld 'id' fehlt.", True)
        return ruf(f"/v1/pages/{urllib.parse.quote(kennung)}")
    if name == "flowcore_suche":
        frage = (args.get("query") or "").strip()
        if not frage:
            return ("Pflichtfeld 'query' fehlt.", True)
        last = {"query": frage, "limit": args.get("limit", 10)}
        if args.get("pageType"):
            last["pageType"] = args["pageType"]
        return ruf("/v1/search", last)
    if name == "flowcore_liste":
        teile = [f"limit={args.get('limit', 25)}", f"offset={args.get('offset', 0)}"]
        for feld in ("pageType", "updatedSince"):
            if args.get(feld):
                teile.append(f"{feld}={urllib.parse.quote(str(args[feld]))}")
        return ruf("/v1/pages?" + "&".join(teile))
    return (f"Unbekanntes Werkzeug: {name}", True)


def sende(nachricht):
    sys.stdout.write(json.dumps(nachricht) + "\n")
    sys.stdout.flush()


def main():
    for zeile in sys.stdin:
        zeile = zeile.strip()
        if not zeile:
            continue
        try:
            anfrage = json.loads(zeile)
        except json.JSONDecodeError:
            continue

        methode = anfrage.get("method")
        kennung = anfrage.get("id")

        # Benachrichtigungen tragen keine id und bekommen keine Antwort. Wer hier
        # trotzdem antwortet, bringt manche Clients aus dem Tritt.
        if kennung is None:
            continue

        if methode == "initialize":
            sende({"jsonrpc": "2.0", "id": kennung, "result": {
                # Die vom Client angebotene Protokollversion wird gespiegelt, statt
                # eine eigene zu behaupten — so bleibt der Server gültig, wenn Claude
                # Code auf eine neuere Fassung geht.
                "protocolVersion": anfrage.get("params", {})
                                   .get("protocolVersion", "2024-11-05"),
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "flowcore", "version": "1.0.0"}}})
        elif methode == "tools/list":
            sende({"jsonrpc": "2.0", "id": kennung, "result": {"tools": WERKZEUGE}})
        elif methode == "tools/call":
            p = anfrage.get("params", {})
            text, ist_fehler = fuehre_aus(p.get("name", ""), p.get("arguments") or {})
            sende({"jsonrpc": "2.0", "id": kennung, "result": {
                "content": [{"type": "text", "text": text}],
                "isError": ist_fehler}})
        elif methode in ("ping",):
            sende({"jsonrpc": "2.0", "id": kennung, "result": {}})
        else:
            sende({"jsonrpc": "2.0", "id": kennung,
                   "error": {"code": -32601, "message": f"Methode unbekannt: {methode}"}})


if __name__ == "__main__":
    try:
        main()
    except (BrokenPipeError, KeyboardInterrupt):
        pass
