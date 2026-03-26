import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  useListGlossaryTerms,
  useCreateGlossaryTerm,
  useUpdateGlossaryTerm,
  useDeleteGlossaryTerm,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { SimpleEditor } from "@/components/editor/SimpleEditor";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface TermFormData {
  term: string;
  definition: string;
  synonyms: string;
  abbreviation: string;
}

export function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TermFormData>({
    term: "",
    definition: "",
    synonyms: "",
    abbreviation: "",
  });
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: terms } = useListGlossaryTerms({
    q: query || undefined,
    letter: !query && activeLetter ? activeLetter : undefined,
  });

  const createMutation = useCreateGlossaryTerm({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/glossary"] });
        closeDialog();
      },
    },
  });

  const updateMutation = useUpdateGlossaryTerm({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/glossary"] });
        closeDialog();
      },
    },
  });

  const deleteMutation = useDeleteGlossaryTerm({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/glossary"] });
      },
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ term: "", definition: "", synonyms: "", abbreviation: "" });
  }

  function openCreate() {
    setForm({ term: "", definition: "", synonyms: "", abbreviation: "" });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(t: {
    id: string;
    term: string;
    definition: string;
    synonyms?: string[] | null;
    abbreviation?: string | null;
  }) {
    setForm({
      term: t.term,
      definition: t.definition,
      synonyms: t.synonyms?.join(", ") || "",
      abbreviation: t.abbreviation || "",
    });
    setEditingId(t.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    const synonymsArr = form.synonyms
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      term: form.term,
      definition: form.definition,
      synonyms: synonymsArr.length > 0 ? synonymsArr : undefined,
      abbreviation: form.abbreviation || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const grouped: Record<string, typeof terms> = {};
  if (Array.isArray(terms)) {
    for (const t of terms) {
      const letter = t.term[0]?.toUpperCase() || "#";
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter]!.push(t);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Glossar</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Neuer Begriff
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Begriff suchen..."
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) setActiveLetter("");
          }}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <Button
          variant={activeLetter === "" ? "default" : "ghost"}
          size="sm"
          className="h-7 w-7 p-0 text-xs"
          onClick={() => {
            setActiveLetter("");
            setQuery("");
          }}
        >
          Alle
        </Button>
        {ALPHABET.map((letter) => (
          <Button
            key={letter}
            variant={activeLetter === letter ? "default" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0 text-xs"
            onClick={() => {
              setActiveLetter(letter);
              setQuery("");
            }}
          >
            {letter}
          </Button>
        ))}
      </div>

      <div className="space-y-6">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([letter, letterTerms]) => (
            <div key={letter}>
              <h2 className="text-lg font-semibold text-primary border-b pb-1 mb-3">
                {letter}
              </h2>
              <div className="space-y-2">
                {letterTerms?.map((t) => (
                  <Card key={t.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{t.term}</h3>
                            {t.abbreviation && (
                              <Badge variant="secondary" className="text-xs">
                                {t.abbreviation}
                              </Badge>
                            )}
                          </div>
                          <div
                            className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none [&>p]:my-0.5"
                            dangerouslySetInnerHTML={{ __html: t.definition }}
                          />
                          {t.synonyms && t.synonyms.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Synonyme: {t.synonyms.join(", ")}
                            </p>
                          )}
                          {t.nodeId && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 mt-1 text-xs"
                              onClick={() => navigate(`/node/${t.nodeId}`)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Verknüpfte Seite
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => deleteMutation.mutate({ id: t.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

        {Array.isArray(terms) && terms.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Keine Glossareinträge gefunden.
          </p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Begriff bearbeiten" : "Neuer Glossarbegriff"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Begriff</Label>
                <Input
                  value={form.term}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, term: e.target.value }))
                  }
                  placeholder="z.B. PDCA-Zyklus"
                />
              </div>
              <div>
                <Label>Abkürzung</Label>
                <Input
                  value={form.abbreviation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, abbreviation: e.target.value }))
                  }
                  placeholder="z.B. PDCA"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Definition</Label>
              <SimpleEditor
                content={form.definition}
                onChange={(html) =>
                  setForm((f) => ({ ...f, definition: html }))
                }
                placeholder="Definition eingeben — Bilder, Videos und Formatierungen möglich..."
                minHeight="180px"
              />
            </div>
            <div>
              <Label>Synonyme (kommagetrennt)</Label>
              <Input
                value={form.synonyms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, synonyms: e.target.value }))
                }
                placeholder="z.B. Deming-Kreis, Plan-Do-Check-Act"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.term.trim() ||
                !form.definition.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingId ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
