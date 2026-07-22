import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      /** Erhöht die Einrückung (Listen: verschachteln, sonst Einzug-Attribut). */
      indent: () => ReturnType;
      /** Verringert die Einrückung. */
      outdent: () => ReturnType;
    };
  }
}

/** Maximale Einzugstiefe für Absätze/Überschriften (visuelle Stufen à 1.5em). */
const MAX_INDENT = 8;

/** Blocktypen, die das Einzug-Attribut tragen. */
const INDENTABLE_TYPES = ["paragraph", "heading", "listItem"];

function changeIndentAttr(delta: 1 | -1) {
  return ({
    tr,
    state,
    dispatch,
  }: {
    tr: import("@tiptap/pm/state").Transaction;
    state: import("@tiptap/pm/state").EditorState;
    dispatch?: (tr: import("@tiptap/pm/state").Transaction) => void;
  }) => {
    const { from, to } = state.selection;
    let changed = false;

    state.doc.nodesBetween(from, to, (node, pos, parent) => {
      if (!INDENTABLE_TYPES.includes(node.type.name)) return true;
      // Absätze/Überschriften innerhalb von Listenpunkten überspringen —
      // dort wird der Einzug am listItem selbst geführt.
      if (
        node.type.name !== "listItem" &&
        (parent?.type.name === "listItem" || parent?.type.name === "taskItem")
      ) {
        return true;
      }
      const current = (node.attrs.indent as number | undefined) ?? 0;
      const next = Math.min(MAX_INDENT, Math.max(0, current + delta));
      if (next !== current) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
        changed = true;
      }
      return true;
    });

    if (changed && dispatch) dispatch(tr);
    return changed;
  };
}

/**
 * Einrückung für Absätze, Überschriften und Listen.
 *
 * - Listenpunkte: zuerst echte Verschachtelung (sinkListItem). Geht das nicht
 *   (z.B. erster Punkt einer Ebene), wird stattdessen das Einzug-Attribut
 *   erhöht — damit sind auch mehr als eine Einrückstufe möglich.
 * - Absätze/Überschriften: Einzug-Attribut (Tab / Shift+Tab und Toolbar).
 * - In Tabellen, Aufgabenlisten und Code-Blöcken bleibt Tab unangetastet.
 */
export const Indent = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: INDENTABLE_TYPES,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const raw = parseInt(element.getAttribute("data-indent") || "0", 10);
              return Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_INDENT) : 0;
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const indent = (attributes.indent as number | undefined) ?? 0;
              if (!indent) return {};
              return {
                "data-indent": String(indent),
                style: `margin-left: ${indent * 1.5}em;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ editor, commands, state, dispatch, tr }) => {
          if (editor.isActive("listItem")) {
            if (editor.can().sinkListItem("listItem")) {
              return commands.sinkListItem("listItem");
            }
            return changeIndentAttr(1)({ tr, state, dispatch });
          }
          return changeIndentAttr(1)({ tr, state, dispatch });
        },
      outdent:
        () =>
        ({ editor, commands, state, dispatch, tr }) => {
          if (editor.isActive("listItem")) {
            const attrChanged = changeIndentAttr(-1)({ tr, state, dispatch });
            if (attrChanged) return true;
            if (editor.can().liftListItem("listItem")) {
              return commands.liftListItem("listItem");
            }
            return false;
          }
          return changeIndentAttr(-1)({ tr, state, dispatch });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (
          this.editor.isActive("table") ||
          this.editor.isActive("taskItem") ||
          this.editor.isActive("codeBlock")
        ) {
          return false;
        }
        // Auch bei erreichter Maximaltiefe true zurückgeben, damit Tab nicht
        // den Fokus aus dem Editor bewegt.
        this.editor.commands.indent();
        return true;
      },
      "Shift-Tab": () => {
        if (
          this.editor.isActive("table") ||
          this.editor.isActive("taskItem") ||
          this.editor.isActive("codeBlock")
        ) {
          return false;
        }
        this.editor.commands.outdent();
        return true;
      },
    };
  },
});
