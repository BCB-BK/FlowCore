import { useState } from "react";

// Stabile React-Keys für Repeater-/Editor-Zeilen, die hinzugefügt, entfernt
// oder verschoben werden können. Die Keys leben ausschließlich im UI-State und
// werden NICHT in die persistierten structuredFields geschrieben.

function makeKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback für Umgebungen ohne crypto.randomUUID (z.B. ältere Browser)
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function makeKeys(length: number): string[] {
  return Array.from({ length }, () => makeKey());
}

export interface RowKeys {
  /** Ein Key je Item, in gleicher Reihenfolge wie das Item-Array. */
  keys: string[];
  /** Beim Anhängen neuer Items am Ende aufrufen (count = Anzahl neuer Items). */
  add: (count?: number) => void;
  /** Beim Einfügen eines Items an Position index aufrufen. */
  insertAt: (index: number) => void;
  /** Beim Entfernen des Items an Position index aufrufen. */
  remove: (index: number) => void;
  /** Beim Vertauschen der Items an den Positionen from und to aufrufen. */
  move: (from: number, to: number) => void;
}

/**
 * Führt parallel zu einem Item-Array ein Key-Array im State. Die Komponente
 * ruft bei ihren Add/Remove/Move-Operationen die entsprechende Key-Operation
 * auf. Weicht die Länge ab (Items wurden von außen komplett ersetzt, z.B. bei
 * Bearbeiten/Abbrechen), werden die Keys neu generiert.
 */
export function useRowKeys(itemCount: number): RowKeys {
  const [keys, setKeys] = useState<string[]>(() => makeKeys(itemCount));

  // State-Anpassung während des Renderns ist hier beabsichtigt
  // (React-Muster "adjusting state during render").
  if (keys.length !== itemCount) {
    setKeys(makeKeys(itemCount));
  }

  return {
    keys,
    add: (count = 1) => setKeys((prev) => [...prev, ...makeKeys(count)]),
    insertAt: (index) =>
      setKeys((prev) => [
        ...prev.slice(0, index),
        makeKey(),
        ...prev.slice(index),
      ]),
    remove: (index) => setKeys((prev) => prev.filter((_, i) => i !== index)),
    move: (from, to) =>
      setKeys((prev) => {
        if (to < 0 || to >= prev.length || from < 0 || from >= prev.length)
          return prev;
        const next = [...prev];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      }),
  };
}
