import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Unbehandelter Fehler:", error);
    console.error("[ErrorBoundary] Component Stack:", errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = "Etwas ist schiefgelaufen",
        fallbackMessage = "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie, die Seite neu zu laden.",
        compact = false,
      } = this.props;

      if (compact) {
        return (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{fallbackTitle}</span>
            </div>
            <p className="text-muted-foreground text-center text-xs">{fallbackMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
          <div className="flex flex-col items-center gap-3 text-center max-w-md">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{fallbackTitle}</h2>
            <p className="text-muted-foreground">{fallbackMessage}</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Erneut versuchen
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Seite neu laden
              </button>
            </div>
            {import.meta.env.DEV && (
              <>
                <button
                  onClick={this.toggleDetails}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {this.state.showDetails ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Fehlerdetails
                </button>
                {this.state.showDetails && this.state.error && (
                  <div className="mt-1 w-full rounded-md border bg-muted/50 p-3 text-left">
                    <p className="text-xs font-mono text-destructive break-all">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
