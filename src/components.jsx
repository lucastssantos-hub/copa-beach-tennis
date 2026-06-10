// ============ Shared UI primitives ============
import { Component, useEffect, useState } from "react";
import { TEAMS, STATUS_META, teamName } from "./data.js";

// Paleta de tons compartilhada (status pills, badges, bordas)
export const TONES = {
  muted:  { bg: "rgba(242,228,201,.14)", fg: "#C9BBA0", dot: "#8a7d63" },
  sand:   { bg: "rgba(242,228,201,.20)", fg: "#E9DEC6", dot: "#D9C79E" },
  warn:   { bg: "rgba(255,176,46,.16)",  fg: "#FFC766", dot: "#FFB02E" },
  go:     { bg: "rgba(120,200,140,.16)", fg: "#8FE0A6", dot: "#5FC97E" },
  fire:   { bg: "rgba(255,138,46,.20)",  fg: "#FFB36B", dot: "#FF8A2E" },
  live:   { bg: "rgba(107,47,217,.28)",  fg: "#C9A9FF", dot: "#9B6BFF" },
  info:   { bg: "rgba(70,140,255,.20)",  fg: "#9CC2FF", dot: "#4C8DFF" },
  alert:  { bg: "rgba(255,64,64,.20)",   fg: "#FF8A8A", dot: "#FF4D4D" },
  coral:  { bg: "rgba(255,90,78,.18)",   fg: "#FF8478", dot: "#FF5A4E" },
  done:   { bg: "rgba(120,200,140,.12)", fg: "#7FCF97", dot: "#5FC97E" },
};
const PULSE_TONES = new Set(["live", "fire", "alert"]);

// Status pill — reads tone from STATUS_META
export function StatusPill({ status, size = "md" }) {
  const meta = STATUS_META[status] || { label: status, tone: "muted" };
  const t = TONES[meta.tone] || TONES.muted;
  const pulse = PULSE_TONES.has(meta.tone);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: t.bg, color: t.fg, borderRadius: 999,
      padding: size === "sm" ? "3px 9px" : "5px 11px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: size === "sm" ? 10.5 : 12, fontWeight: 600,
      letterSpacing: ".02em", whiteSpace: "nowrap", textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: t.dot,
        boxShadow: pulse ? `0 0 0 3px ${t.bg}` : "none",
        animation: pulse ? "pulse 1.4s infinite" : "none" }} />
      {meta.label}
    </span>
  );
}

export function Flag({ code, size = 22 }) {
  return <span style={{ fontSize: size, lineHeight: 1 }}>{(TEAMS[code] || {}).flag}</span>;
}

// Primary button (coral CTA)
export function Button({ children, onClick, variant = "primary", disabled, full, icon }) {
  const styles = {
    primary: { bg: "#FF5A4E", fg: "#1B0B44", border: "none", shadow: "0 8px 24px -8px rgba(255,90,78,.6)" },
    ghost:   { bg: "transparent", fg: "#E9DEC6", border: "1.5px solid rgba(242,228,201,.22)", shadow: "none" },
    solid:   { bg: "#6B2FD9", fg: "#FBF7EE", border: "none", shadow: "0 8px 24px -10px rgba(107,47,217,.7)" },
    sand:    { bg: "#F2E4C9", fg: "#1B0B44", border: "none", shadow: "none" },
    danger:  { bg: "transparent", fg: "#FF8478", border: "1.5px solid rgba(255,90,78,.4)", shadow: "none" },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      width: full ? "100%" : "auto", padding: "14px 20px",
      background: disabled ? "rgba(242,228,201,.1)" : s.bg,
      color: disabled ? "rgba(242,228,201,.35)" : s.fg,
      border: disabled ? "1.5px solid rgba(242,228,201,.12)" : s.border,
      borderRadius: 14, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15,
      letterSpacing: ".01em", boxShadow: disabled ? "none" : s.shadow,
      transition: "transform .12s ease, filter .15s ease",
    }}
    onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(.97)")}
    onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
      {icon}{children}
    </button>
  );
}

// Card surface
export function Card({ children, onClick, style, accent }) {
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
    onKeyDown={e => {
      if (!onClick) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e);
      }
    }}
    style={{
      background: "linear-gradient(180deg, rgba(251,247,238,.05), rgba(251,247,238,.02))",
      borderWidth: 1, borderStyle: "solid",
      borderColor: accent ? "rgba(255,90,78,.3)" : "rgba(242,228,201,.1)",
      borderRadius: 18, padding: 16,
      cursor: onClick ? "pointer" : "default",
      transition: "border-color .15s ease, transform .12s ease",
      ...style,
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = "rgba(242,228,201,.28)")}
    onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = accent ? "rgba(255,90,78,.3)" : "rgba(242,228,201,.1)")}>
      {children}
    </div>
  );
}

// Section label (mono, uppercase, sand)
export function Eyebrow({ children, color = "#8a7d63" }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    letterSpacing: ".16em", textTransform: "uppercase", color, fontWeight: 600 }}>{children}</div>;
}

// Top app bar
export function AppBar({ title, subtitle, right, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px 14px" }}>
      {onBack && (
        <button onClick={onBack} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 12,
          background: "rgba(242,228,201,.08)", border: "1px solid rgba(242,228,201,.12)",
          color: "#E9DEC6", fontSize: 18, cursor: "pointer", display: "grid", placeItems: "center" }}>‹</button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle && <Eyebrow color="#9B6BFF">{subtitle}</Eyebrow>}
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 21, color: "#FBF7EE",
          lineHeight: 1.1, marginTop: subtitle ? 3 : 0, textWrap: "balance" }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// Versus row — two flags + names with optional center
export function VersusRow({ a, b, center }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <Flag code={a} />
        <span style={{ fontWeight: 700, fontSize: 15, color: "#FBF7EE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teamName(a)}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#8a7d63" }}>{center || "vs"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, justifyContent: "flex-end" }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#FBF7EE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teamName(b)}</span>
        <Flag code={b} />
      </div>
    </div>
  );
}

// Countdown mm:ss — ticks every second toward `endsAt` (ms epoch)
export function Countdown({ endsAt, size = 22, color = "#FFB36B", onZero }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, (endsAt || 0) - now);
  useEffect(() => { if (endsAt && remaining === 0 && onZero) onZero(); }, [remaining === 0]);
  const total = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: size, color,
      fontVariantNumeric: "tabular-nums", letterSpacing: ".02em" }}>{mm}:{ss}</span>
  );
}

// Notification bell with unread badge
export function Bell({ count = 0, onClick, color = "#E9DEC6" }) {
  return (
    <button onClick={onClick} aria-label="Notificações" style={{ position: "relative", width: 40, height: 40,
      borderRadius: 12, background: "rgba(242,228,201,.08)", border: "1px solid rgba(242,228,201,.14)",
      color, fontSize: 18, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
      <span>◔</span>
      {count > 0 && (
        <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 4px",
          borderRadius: 999, background: "#FF4D4D", color: "#fff", fontSize: 10.5, fontWeight: 800,
          display: "grid", placeItems: "center", fontFamily: "'Archivo',sans-serif" }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

// Error boundary — impede que um único erro de render (ex.: dado obsoleto do
// Supabase referenciando uma equipe removida) deixe o app inteiro em tela
// branca. Mostra um aviso amigável com opções de recuperação.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Erro na aplicação:", error, info);
  }
  hardReset() {
    // Remove o estado local que pode estar corrompido/obsoleto e recarrega.
    try {
      localStorage.removeItem("copa-beach-tennis-state-v3");
      localStorage.removeItem("copa-captain-team");
    } catch { /* ignore */ }
    window.location.reload();
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: "#0E0518", display: "grid", placeItems: "center",
        padding: 24, fontFamily: "'Archivo', sans-serif" }}>
        <div style={{ maxWidth: 360, width: "100%", textAlign: "center",
          background: "linear-gradient(160deg, #2a1257 0%, #1B0B44 100%)",
          border: "1px solid rgba(255,90,78,.3)", borderRadius: 20, padding: "32px 26px",
          boxShadow: "0 24px 80px -16px rgba(0,0,0,.8)" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 19, color: "#FBF7EE", marginBottom: 8 }}>
            Algo deu errado
          </div>
          <div style={{ fontSize: 13, color: "#C9BBA0", lineHeight: 1.5, marginBottom: 22 }}>
            Não foi possível exibir esta tela. Os dados podem estar desatualizados.
            Tente recarregar — se persistir, restaure os dados.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => window.location.reload()} style={{ padding: "13px 0", borderRadius: 13, border: "none",
              cursor: "pointer", background: "#FF5A4E", color: "#160938",
              fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 14 }}>
              Recarregar
            </button>
            <button onClick={() => this.hardReset()} style={{ padding: "12px 0", borderRadius: 13,
              border: "1.5px solid rgba(242,228,201,.22)", cursor: "pointer", background: "transparent",
              color: "#E9DEC6", fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13 }}>
              Restaurar dados
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// Toast / banner
export function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [msg]);
  if (!msg) return null;
  return (
    <div style={{ position: "absolute", left: 16, right: 16, bottom: 92, zIndex: 50,
      background: "#6B2FD9", color: "#FBF7EE", borderRadius: 14, padding: "13px 16px",
      fontSize: 13.5, fontWeight: 600, boxShadow: "0 16px 40px -12px rgba(0,0,0,.6)",
      display: "flex", alignItems: "center", gap: 10, animation: "slideUp .3s ease" }}>
      <span style={{ fontSize: 16 }}>✓</span>{msg}
    </div>
  );
}
