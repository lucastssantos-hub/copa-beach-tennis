import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[Copa] Erro capturado:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              minHeight: "100dvh",
              background: "#0E0518",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div
              style={{
                maxWidth: 400,
                width: "100%",
                background: "rgba(255,77,77,0.08)",
                border: "1px solid rgba(255,77,77,0.3)",
                borderRadius: 20,
                padding: "28px 24px",
                color: "#FBF7EE",
              }}
            >
              <p style={{ fontSize: 32, marginBottom: 8 }}>⚠️</p>
              <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: "#FF7070" }}>
                O app encontrou um erro
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "#C9BBA0", marginBottom: 20 }}>
                Tire um print desta tela e envie para a organização. Em seguida, tente recarregar a página.
              </p>
              <details style={{ marginBottom: 16, fontSize: 11, color: "#9080a0" }}>
                <summary style={{ cursor: "pointer", marginBottom: 8 }}>Detalhe técnico</summary>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {this.state.error.message}
                </pre>
              </details>
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  background: "rgba(255,90,78,0.2)",
                  border: "1px solid rgba(255,90,78,0.4)",
                  borderRadius: 12,
                  color: "#FF7070",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Recarregar página
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
