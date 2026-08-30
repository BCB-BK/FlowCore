import { useRef, useState, useCallback } from "react";
import TiptapImage from "@tiptap/extension-image";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Separator } from "@workspace/ui/separator";

/**
 * Bild-Node mit einstellbarer Breite und Textumfluss.
 *
 * Lag vorher nur im `SimpleEditor` (Glossar) und war dort auf feste
 * Prozentstufen beschraenkt; der grosse `BlockEditor` — der Abschnitt
 * "Inhalt" — nutzte die unveraenderte TipTap-Extension und bot deshalb gar
 * keine Groessenanpassung. Beide teilen sich jetzt diese Datei.
 *
 * Die Breite wird als Prozentwert der Textspalte gehalten, nicht in Pixeln:
 * so bleibt das Bild auf schmalen Fenstern und im Ausdruck im Verhaeltnis.
 */

/** Schmaler als das ist kein Bild mehr sinnvoll bedienbar. */
const MIN_PROZENT = 10;

export const BILD_BREITEN: Array<{ label: string; value: string | null }> = [
  { label: "25%", value: "25%" },
  { label: "50%", value: "50%" },
  { label: "75%", value: "75%" },
  { label: "100%", value: null },
];

const UMFLUSS_OPTIONEN = [
  { label: "Block", value: "none" },
  { label: "Links", value: "left" },
  { label: "Rechts", value: "right" },
];

function BildNodeView({
  node,
  updateAttributes,
  editor,
  selected,
  getPos,
}: NodeViewProps) {
  const breite = (node.attrs.width as string | null) ?? null;
  const umfluss = (node.attrs["data-float"] as string) || "none";

  const bildRef = useRef<HTMLImageElement>(null);
  const ziehenRef = useRef<{ startX: number; startPx: number } | null>(null);
  const vorschauRef = useRef<string | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);

  // Waehrend des Ziehens nur lokal anzeigen. Ein `updateAttributes` je
  // Mausbewegung erzeugte sonst pro Pixel eine Transaktion samt Autospeichern.
  const angezeigteBreite = vorschau ?? breite;

  const beiZiehStart = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const bild = bildRef.current;
      if (!bild || !editor.isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      ziehenRef.current = {
        startX: e.clientX,
        startPx: bild.getBoundingClientRect().width,
      };
    },
    [editor],
  );

  const beiZiehen = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const zug = ziehenRef.current;
      if (!zug) return;
      const spalte = (editor.view.dom as HTMLElement).clientWidth;
      if (!spalte) return;
      const neuPx = zug.startPx + (e.clientX - zug.startX);
      const prozent = Math.min(
        100,
        Math.max(MIN_PROZENT, Math.round((neuPx / spalte) * 100)),
      );
      vorschauRef.current = `${prozent}%`;
      setVorschau(vorschauRef.current);
    },
    [editor],
  );

  const beiZiehEnde = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!ziehenRef.current) return;
      ziehenRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      const gezogen = vorschauRef.current;
      vorschauRef.current = null;
      setVorschau(null);
      if (!gezogen) return;
      // 100 % entspricht der Vorgabe "keine Breite gesetzt" — sonst zeigte die
      // Auswahlleiste danach keinen aktiven Knopf mehr an.
      updateAttributes({ width: gezogen === "100%" ? null : gezogen });
    },
    [updateAttributes],
  );

  const griffProps = {
    onPointerDown: beiZiehStart,
    onPointerMove: beiZiehen,
    onPointerUp: beiZiehEnde,
    onPointerCancel: beiZiehEnde,
    contentEditable: false as const,
  };

  return (
    <NodeViewWrapper
      className="fc-bild"
      data-float={umfluss}
      style={{ width: angezeigteBreite ?? "fit-content" }}
    >
      <img
        ref={bildRef}
        src={node.attrs.src as string}
        alt={(node.attrs.alt as string) ?? ""}
        title={(node.attrs.title as string) ?? undefined}
        draggable={false}
        onClick={() => {
          // Ohne das bleibt der Klick auf ein NodeView-Bild ohne Auswahl —
          // dann erscheint weder der Auswahlrahmen noch die Breitenleiste.
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos === "number") {
            editor.chain().focus().setNodeSelection(pos).run();
          }
        }}
        style={
          angezeigteBreite
            ? { width: "100%", height: "auto" }
            : { maxWidth: "100%", height: "auto" }
        }
        className={selected ? "ring-2 ring-primary" : undefined}
      />
      {editor.isEditable && (
        <>
          <span
            {...griffProps}
            title="Breite ziehen"
            aria-hidden
            className="fc-bild-griff fc-bild-griff-kante"
          />
          <span
            {...griffProps}
            title="Breite ziehen"
            aria-hidden
            className="fc-bild-griff fc-bild-griff-ecke"
          />
        </>
      )}
    </NodeViewWrapper>
  );
}

export const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML(attributes) {
          if (!attributes.width) return {};
          return {
            "data-width": attributes.width,
            style: `width: ${attributes.width}; max-width: 100%;`,
          };
        },
        parseHTML(element) {
          // Neben dem eigenen `data-width` auch das lesen, was ein
          // eingefuegtes Fremd-HTML mitbringt — sonst geht die Breite beim
          // Kopieren aus einer anderen Seite verloren.
          return (
            element.getAttribute("data-width") ||
            element.style.width ||
            element.getAttribute("width") ||
            null
          );
        },
      },
      "data-float": {
        default: "none",
        renderHTML(attributes) {
          const f = attributes["data-float"];
          if (!f || f === "none") return { "data-float": "none" };
          return { "data-float": f };
        },
        parseHTML(element) {
          return element.getAttribute("data-float") || "none";
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(BildNodeView);
  },
});

export function ImageBubbleMenuContent({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes("image");
  const aktuellerUmfluss = (attrs["data-float"] as string) || "none";
  const aktuelleBreite = (attrs.width as string) || null;

  const setzeBreite = useCallback(
    (w: string | null) =>
      editor.chain().focus().updateAttributes("image", { width: w }).run(),
    [editor],
  );

  const setzeUmfluss = useCallback(
    (f: string) =>
      editor
        .chain()
        .focus()
        .updateAttributes("image", { "data-float": f })
        .run(),
    [editor],
  );

  return (
    <div className="flex items-center gap-1 bg-background border rounded-md shadow-md p-1 flex-wrap">
      <span className="text-xs text-muted-foreground">Breite:</span>
      {BILD_BREITEN.map(({ label, value }) => {
        const aktiv =
          value === null ? !aktuelleBreite : aktuelleBreite === value;
        return (
          <button
            key={label}
            type="button"
            className={`text-xs px-1.5 py-0.5 rounded ${aktiv ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setzeBreite(value)}
          >
            {label}
          </button>
        );
      })}
      <Separator orientation="vertical" className="mx-0.5 h-4" />
      <span className="text-xs text-muted-foreground">Umfluss:</span>
      {UMFLUSS_OPTIONEN.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          className={`text-xs px-1.5 py-0.5 rounded ${aktuellerUmfluss === value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          onClick={() => setzeUmfluss(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
