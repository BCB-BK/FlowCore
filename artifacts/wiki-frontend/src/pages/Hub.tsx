import { useRootNodes } from "@/hooks/use-nodes";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  BookOpen,
  FolderOpen,
  Plus,
  Search,
  FileText,
  BarChart3,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { PAGE_TYPE_LABELS } from "@/lib/types";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { CreateNodeDialog } from "@/components/CreateNodeDialog";
import { useState } from "react";

export function Hub() {
  const { data: user } = useAuth();
  const { data: roots, isLoading } = useRootNodes();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FlowCore</h1>
          <p className="text-muted-foreground mt-1">
            {user
              ? `Willkommen, ${user.displayName}`
              : "Bildungscampus Backnang – Wissens- und Prozessplattform"}
          </p>
        </div>
        {(user?.permissions ?? []).includes("create_page") && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neu anlegen
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/search")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Suche</p>
              <p className="text-xs text-muted-foreground">Inhalte finden</p>
            </div>
          </CardContent>
        </Card>

        {(user?.permissions ?? []).includes("view_dashboard") && (
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/dashboard")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Dashboard</p>
              <p className="text-xs text-muted-foreground">
                Qualitätsübersicht
              </p>
            </div>
          </CardContent>
        </Card>
        )}

        <Card className="cursor-not-allowed opacity-60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">AI-Assistent</p>
              <p className="text-xs text-muted-foreground">Fragen stellen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Kernprozesse & Bereiche</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : roots && roots.length > 0 ? (
          <div className="flex flex-col gap-2">
            {roots.map((node) => (
              <Card
                key={node.id}
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/node/${node.id}`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {node.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{node.displayCode}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">{PAGE_TYPE_LABELS[node.templateType] || node.templateType}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 shrink-0 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(node.updatedAt).toLocaleDateString("de-DE")}</span>
                    </div>
                  </div>
                  <StatusBadge
                    status={
                      node.status as Parameters<
                        typeof StatusBadge
                      >[0]["status"]
                    }
                    compact
                  />
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">
                Noch keine Kernprozesse angelegt
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Erstellen Sie den ersten Kernprozess, um die Wissensstruktur
                aufzubauen.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Kernprozess anlegen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateNodeDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        parentNodeId={null}
      />
    </div>
  );
}
