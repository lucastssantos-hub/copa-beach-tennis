// ============ Shared UI primitives ============
import { useEffect } from "react";
import { TEAMS, STATUS_META } from "./data.js";

// Status pill — reads tone from STATUS_META
export function StatusPill({ status, size = "md" }) {
  const meta = STATUS_META[status] || { label: status, tone: "muted" };
  const tones = {
    muted:  { bg: "rgba(242,228,201,.14)", fg: "#C9BBA0", dot: "#8a7d63" },
    warn:   { bg: "rgba(255,176,46,.16)",  fg: "#FFC766", dot: "#FFB02E" },
    go:     { bg: "rgba(120,200,140,.16)", fg: "#8FE0A6", dot: "#5FC97E" },
    live:   { bg: "rgba(107,47,217,.28)",  fg: "#C9A9FF", dot: "#9B6BFF" },
    coral:  { bg: "rgba(255,90,78,.18)",   fg: "#FF8478", dot: "#FF5A4E" },
    done:   { bg: "rgba(120,200,140,.12)", fg: "#7FCF97", dot: "#5FC97E" },
  };
  const t = tones[meta.tone] || tones.muted;
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
        boxShadow: meta.tone === "live" ? `0 0 0 3px ${t.bg}` : "none",
        animation: meta.tone === "live" ? "pulse 1.4s infinite" : "none" }} />
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
      border: "1px solid rgba(242,228,201,.1)",
      borderRadius: 18, padding: 16,
      cursor: onClick ? "pointer" : "default",
      transition: "border-color .15s ease, transform .12s ease",
      ...(accent ? { borderColor: "rgba(255,90,78,.3)" } : {}),
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
  const TA = TEAMS[a], TB = TEAMS[b];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <Flag code={a} />
        <span style={{ fontWeight: 700, fontSize: 15, color: "#FBF7EE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TA.name}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#8a7d63" }}>{center || "vs"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, justifyContent: "flex-end" }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#FBF7EE", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TB.name}</span>
        <Flag code={b} />
      </div>
    </div>
  );
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
