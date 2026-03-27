import { useState } from "react";
import { Loader2 } from "lucide-react";

const BCB_GREEN = "hsl(145, 76%, 38%)";
const BCB_GREEN_HOVER = "hsl(145, 76%, 32%)";

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

  const hasAuthError =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("auth_error");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <img
          src={`${import.meta.env.BASE_URL}bcb-logo.png`}
          alt="BildungsCampus Backnang"
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
              hovered && !loading ? BCB_GREEN_HOVER : BCB_GREEN,
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

        {(error || hasAuthError) && (
          <p className="text-sm text-red-600 text-center">
            {error ||
              "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut."}
          </p>
        )}
      </div>

      <footer className="absolute bottom-6 text-center text-xs text-gray-400 space-y-0.5">
        <p>FlowCore v0.4</p>
        <p>Bildungscampus Backnang</p>
      </footer>
    </div>
  );
}
