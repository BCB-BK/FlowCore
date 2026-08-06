import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { LogOut, RefreshCw, User, Clock, AlertCircle } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

interface SessionUser {
  principalId: string | null;
  externalId: string | null;
  displayName: string | null;
  email: string | null;
}

interface Session {
  sid: string;
  expire: string;
  user: SessionUser | null;
}

function formatExpire(expire: string): string {
  const d = new Date(expire);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return "Abgelaufen";
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffH > 0) return `Noch ${diffH}h ${diffM}m`;
  return `Noch ${diffM}m`;
}

export function SessionsTab() {
  const { data: currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminating, setTerminating] = useState<Set<string>>(new Set());

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customFetch<{ sessions: Session[] }>(
        "/api/admin/sessions",
      );
      setSessions(data.sessions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sitzungen konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const terminateSession = async (sid: string) => {
    setTerminating((prev) => new Set(prev).add(sid));
    try {
      await customFetch(`/api/admin/sessions/${encodeURIComponent(sid)}`, {
        method: "DELETE",
      });
      setSessions((prev) => prev.filter((s) => s.sid !== sid));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sitzung konnte nicht beendet werden",
      );
    } finally {
      setTerminating((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Aktive Sitzungen
              </CardTitle>
              <CardDescription className="mt-1">
                Alle derzeit aktiven Benutzersitzungen. Sitzungen werden
                automatisch ungültig, wenn der Benutzer nicht mehr in der
                Entra-Gruppe ist.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Aktualisieren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 mb-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Keine aktiven Sitzungen gefunden.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                {sessions.length} aktive{" "}
                {sessions.length === 1 ? "Sitzung" : "Sitzungen"}
              </p>
              {sessions.map((session) => {
                const isOwnSession =
                  session.user?.principalId === currentUser?.principalId;
                const isTerminating = terminating.has(session.sid);
                return (
                  <div
                    key={session.sid}
                    className="flex items-center justify-between rounded-md border bg-card px-4 py-3 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {session.user?.displayName ??
                              "Unbekannter Benutzer"}
                          </span>
                          {isOwnSession && (
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                            >
                              Ihre Sitzung
                            </Badge>
                          )}
                        </div>
                        {session.user?.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {session.user.email}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatExpire(session.expire)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTerminating || isOwnSession}
                      onClick={() => terminateSession(session.sid)}
                      title={
                        isOwnSession
                          ? "Eigene Sitzung kann nicht beendet werden"
                          : "Sitzung beenden"
                      }
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 disabled:opacity-50"
                    >
                      {isTerminating ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-1.5" />
                          Beenden
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Automatische Sitzungsvalidierung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Bei jedem API-Aufruf wird die Entra-Gruppenmitgliedschaft des
            Benutzers geprüft (gecacht für 15 Minuten). Wird ein Benutzer aus
            der Entra-Gruppe entfernt, wird seine Sitzung beim nächsten Aufruf
            automatisch beendet und er wird zur Login-Seite umgeleitet.
          </p>
          <p>
            Über diese Ansicht können Administratoren aktive Sitzungen auch
            manuell und sofort beenden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
