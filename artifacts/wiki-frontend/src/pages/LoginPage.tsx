import { useState } from "react";
import { Loader2 } from "lucide-react";

// OneCampus Charcoal — Primärbutton laut Brand Manual
const OC_CHARCOAL = "#1f2323";
const OC_CHARCOAL_HOVER = "#343a3a";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.loginUrl) {
        window.location.href = data.loginUrl;
      } else {
        setError("Login konnte nicht gestartet werden.");
        setLoading(false);
      }
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
      setLoading(false);
    }
  };

  const authErrorParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("auth_error")
      : null;

  const authErrorMessage = (() => {
    if (!authErrorParam) return null;
    if (authErrorParam === "group_not_authorized") {
      return "Sie gehören nicht zum Team der OneCampus Group und haben keinen Zugang. Bitte wenden Sie sich an Ihren Administrator.";
    }
    if (authErrorParam === "session_invalidated") {
      return "Ihre Sitzung wurde beendet, weil Ihre Zugriffsberechtigung nicht mehr gültig ist. Bitte melden Sie sich erneut an.";
    }
    return "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.";
  })();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* OneCampus Group Logo — 1:1, unverändert (Brand Manual 5.2) */}
        <img
          src={`${import.meta.env.BASE_URL}onecampus-group-logo.png`}
          alt="OneCampus Group"
          className="h-16 sm:h-20 object-contain"
        />

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            FlowCore
          </h1>
          <p className="text-base text-gray-500">
            Wissens- und Prozessplattform
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
          style={{
            backgroundColor:
              hovered && !loading ? OC_CHARCOAL_HOVER : OC_CHARCOAL,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
          )}
          {loading ? "Weiterleitung…" : "Mit Microsoft anmelden"}
        </button>

        {(error || authErrorMessage) && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 w-full">
            <p className="text-sm text-red-700 text-center">
              {error || authErrorMessage}
            </p>
          </div>
        )}
      </div>

      <footer className="absolute bottom-6 text-center text-xs text-gray-400 space-y-0.5">
        <p>FlowCore v0.4</p>
        <p>OneCampus Group</p>
      </footer>
    </div>
  );
}
