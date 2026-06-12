import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ─── COSTANTI ────────────────────────────────────────────────────────────────
// Gironi ufficiali FIFA Mondiale 2026 (sorteggio dicembre 2025 + playoff marzo 2026)
const GIRONI_SQUADRE = {
  A: ["Messico", "Sud Africa", "Corea del Sud", "Rep. Ceca"],
  B: ["Canada", "Svizzera", "Qatar", "Bosnia-Erzegovina"],
  C: ["Brasile", "Marocco", "Haiti", "Scozia"],
  D: ["USA", "Paraguay", "Australia", "Turchia"],
  E: ["Germania", "Curaçao", "Costa d'Avorio", "Ecuador"],
  F: ["Paesi Bassi", "Giappone", "Svezia", "Tunisia"],
  G: ["Belgio", "Egitto", "Iran", "Nuova Zelanda"],
  H: ["Spagna", "Cabo Verde", "Arabia Saudita", "Uruguay"],
  I: ["Francia", "Senegal", "Norvegia", "Iraq"],
  J: ["Argentina", "Algeria", "Austria", "Giordania"],
  K: ["Portogallo", "RD Congo", "Uzbekistan", "Colombia"],
  L: ["Inghilterra", "Croazia", "Ghana", "Panama"],
};

const GIRONI = Object.keys(GIRONI_SQUADRE);
const SQUADRE_MONDIALE = [...new Set(Object.values(GIRONI_SQUADRE).flat())].sort();

const REGOLAMENTO = {
  preTorneo: [
    { id: "vincitore", label: "Vincitore Mondiale", emoji: "🏆", pts: 30, pen: -10 },
    { id: "girone", label: "1° classificato girone", emoji: "🥇", pts: 15, pen: -5 },
  ],
  partita: [
    { id: "1x2", label: "1X2", emoji: "⚽", pts: 3, pen: -2, desc: "Risultato al 90'" },
    { id: "ou", label: "Over/Under 2.5", emoji: "🎯", pts: 4, pen: -2, desc: "Gol totali al 90'" },
    {
      id: "quando", label: "Quando si segna", emoji: "⏱️", desc: "Fasce temporali + 0-0",
      opzioni: [
        { val: "0-30", label: "0–30'", pts: 5, pen: -2 },
        { val: "31-60", label: "31–60'", pts: 5, pen: -2 },
        { val: "61-90", label: "61–90'", pts: 5, pen: -2 },
        { val: "0-0", label: "0–0 ⚡", pts: 8, pen: -2 },
      ],
    },
    { id: "cleansheet", label: "Clean Sheet", emoji: "🧤", pts: 5, pen: -2, desc: "Una squadra non subisce gol" },
    { id: "cartellini", label: "Cartellini", emoji: "🟨", pts: 5, pen: -2, desc: "Over/Under totale cartellini" },
    { id: "risultato", label: "Risultato Esatto", emoji: "🔢", pts: 10, pen: -3, desc: "Punteggio preciso al 90'" },
    { id: "marcatore", label: "Marcatore 1° gol", emoji: "👟", pts: 15, pen: -3, desc: "Chi segna il primo gol" },
  ],
  regole: [
    "Supplementari/Rigori: tutte le scommesse valgono al 90'. I rigori non contano.",
    "Partita sospesa: tutte le scommesse annullate, nessun punto assegnato.",
    "Deadline: scommesse chiuse al calcio d'inizio. Nessuna eccezione.",
    "Punteggio minimo: 0 punti. Non si va mai sotto zero.",
    "Ogni scommessa è indipendente.",
    "Classifica aggiornata entro 30 minuti dal fischio finale.",
  ],
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const esitoColor = (e) => e === "ok" ? "#22c55e" : e === "ko" ? "#ef4444" : "#94a3b8";
const trendColor = (t) => t > 0 ? "#22c55e" : t < 0 ? "#ef4444" : "#94a3b8";
const trendStr = (t) => t > 0 ? `↑ +${t}` : t < 0 ? `↓ ${t}` : "—";
function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

function formatKickoff(ts) {
  const d = new Date(ts);
  return d.toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── STYLE TOKENS ────────────────────────────────────────────────────────────
const S = {
  bg: "#0d1f16",
  input: {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, color: "#e8f5e3", fontSize: 15, outline: "none",
    boxSizing: "border-box", fontFamily: "system-ui, sans-serif",
  },
  primaryBtn: {
    width: "100%", padding: "13px",
    background: "linear-gradient(135deg, #1a6b35, #2d8a4e)",
    color: "#e8f5e3", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: "pointer",
  },
  ghostBtn: {
    width: "100%", padding: "12px", background: "transparent",
    color: "#9fc89a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, fontSize: 14, cursor: "pointer",
  },
};

// ─── COMPONENTI CONDIVISI ────────────────────────────────────────────────────
function AuthShell({ children, title, subtitle }) {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto", background: S.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#e8f5e3", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg, #0f2419 0%, #1a3a2a 60%, #0d3320 100%)", padding: "40px 24px 32px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚽</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#e8f5e3", fontFamily: "'Georgia', serif", letterSpacing: "-0.5px" }}>FantaMondiale 2026</div>
        {title && <div style={{ fontSize: 14, color: "#6dab80", marginTop: 6 }}>{title}</div>}
        {subtitle && <div style={{ fontSize: 12, color: "#557a62", marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ flex: 1, padding: "28px 20px" }}>{children}</div>
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, autoCapitalize }) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#6dab80", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isPassword ? (showPwd ? "text" : "password") : type}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoCapitalize={autoCapitalize || "none"}
          style={{ ...S.input, paddingRight: isPassword ? 44 : 14 }}
        />
        {isPassword && (
          <button onClick={() => setShowPwd(v => !v)} type="button" style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#557a62", fontSize: 16, padding: 0,
          }}>
            {showPwd ? "🙈" : "👁️"}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, fontSize: 13, color: "#fca5a5", marginBottom: 14 }}>{msg}</div>;
}

function SuccessMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, fontSize: 13, color: "#86efac", marginBottom: 14 }}>{msg}</div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin, onGoRegister }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Compila tutti i campi."); return; }
    setLoading(true);
    try {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError(e.message.includes("Invalid") ? "Email o password errati." : e.message); return; }
      const { data: profile } = await supabase.from("profiles").select("nome").eq("id", data.user.id).single();
      onLogin({ id: data.user.id, email: data.user.email, nome: profile?.nome || email.split("@")[0] });
    } catch { setError("Errore di connessione."); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Accedi al tuo account">
      <ErrorMsg msg={error} />
      <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="nome@email.com" />
      <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      <div style={{ textAlign: "right", marginBottom: 20, marginTop: -6 }}>
        <button style={{ background: "none", border: "none", color: "#557a62", fontSize: 12, cursor: "pointer" }}>Password dimenticata?</button>
      </div>
      <button onClick={handleLogin} disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }}>{loading ? "Accesso…" : "Accedi"}</button>
      <div style={{ textAlign: "center", margin: "20px 0", color: "#557a62", fontSize: 13 }}>oppure</div>
      <button onClick={onGoRegister} style={S.ghostBtn}>Crea un nuovo account</button>
    </AuthShell>
  );
}

// ─── REGISTRAZIONE ────────────────────────────────────────────────────────────
function Register({ onRegister, onGoLogin }) {
  const [nome, setNome] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [password2, setPassword2] = useState("");
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(""); setSuccess("");
    if (!nome || !email || !password || !password2) { setError("Compila tutti i campi."); return; }
    if (!email.includes("@")) { setError("Email non valida."); return; }
    if (password.length < 6) { setError("Password minimo 6 caratteri."); return; }
    if (password !== password2) { setError("Le password non coincidono."); return; }
    setLoading(true);
    try {
      const { data, error: e } = await supabase.auth.signUp({ email, password, options: { data: { nome } } });
      if (e) { setError(e.message.includes("already") ? "Email già registrata." : e.message); return; }
      if (data.user && !data.session) { setSuccess("✅ Controlla la tua email per confermare l'account, poi accedi."); return; }
      onRegister({ id: data.user.id, email: data.user.email, nome });
    } catch { setError("Errore di connessione."); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Crea il tuo account" subtitle="È gratis, ci vuole un minuto">
      <ErrorMsg msg={error} /><SuccessMsg msg={success} />
      {!success && <>
        <InputField label="Nome" value={nome} onChange={setNome} placeholder="Come ti chiami?" autoCapitalize="words" />
        <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="nome@email.com" />
        <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimo 6 caratteri" />
        <InputField label="Ripeti password" type="password" value={password2} onChange={setPassword2} placeholder="••••••••" />
        <div style={{ marginBottom: 20 }} />
        <button onClick={handleRegister} disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }}>{loading ? "Registrazione…" : "Crea account"}</button>
        <div style={{ textAlign: "center", margin: "20px 0", color: "#557a62", fontSize: 13 }}>oppure</div>
      </>}
      <button onClick={onGoLogin} style={S.ghostBtn}>Hai già un account? Accedi</button>
    </AuthShell>
  );
}

// ─── LEAGUE HUB ───────────────────────────────────────────────────────────────
function LeagueHub({ user, onJoinLeague, onCreateLeague, onLogout }) {
  const [mode, setMode] = useState(null);
  const [codice, setCodice] = useState(""); const [nomeLega, setNomeLega] = useState("");
  const [maxP, setMaxP] = useState("10"); const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); const [created, setCreated] = useState(null);

  const handleJoin = async () => {
    setError("");
    if (!codice.trim()) { setError("Inserisci il codice."); return; }
    setLoading(true);
    try {
      const { data: lega } = await supabase.from("leghe").select("id,nome,codice,max_partecipanti").eq("codice", codice.toUpperCase()).single();
      if (!lega) { setError("Codice non trovato."); return; }
      const { data: gia } = await supabase.from("partecipanti").select("id").eq("lega_id", lega.id).eq("user_id", user.id).single();
      if (!gia) {
        const { count } = await supabase.from("partecipanti").select("*", { count: "exact", head: true }).eq("lega_id", lega.id);
        if (lega.max_partecipanti && count >= lega.max_partecipanti) { setError("Lega al completo."); return; }
        await supabase.from("partecipanti").insert({ lega_id: lega.id, user_id: user.id, punti: 100 });
      }
      onJoinLeague({ id: lega.id, nome: lega.nome, codice: lega.codice });
    } catch { setError("Errore di connessione."); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setError("");
    if (!nomeLega.trim()) { setError("Dai un nome alla lega."); return; }
    setLoading(true);
    try {
      const codiceGen = generateCode();
      const { data: lega } = await supabase.from("leghe").insert({ nome: nomeLega, codice: codiceGen, creatore_id: user.id, max_partecipanti: maxP === "∞" ? null : parseInt(maxP) }).select().single();
      await supabase.from("partecipanti").insert({ lega_id: lega.id, user_id: user.id, punti: 100 });
      setCreated({ id: lega.id, codice: codiceGen, nome: nomeLega });
    } catch { setError("Errore di connessione."); }
    finally { setLoading(false); }
  };

  const initials = user.nome.slice(0, 2).toUpperCase();
  return (
    <AuthShell>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(45,138,78,0.2)", border: "1.5px solid #2d6b44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#b8f0c8" }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e8f5e3" }}>Ciao, {user.nome}! 👋</div>
          <div style={{ fontSize: 12, color: "#557a62" }}>Unisciti o crea una lega</div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: "#557a62", fontSize: 12, cursor: "pointer" }}>Esci</button>
      </div>
      {created && (
        <div style={{ background: "rgba(26,107,53,0.15)", border: "1px solid #2d6b44", borderRadius: 14, padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#6dab80", marginBottom: 8 }}>✅ Lega creata!</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8f5e3", marginBottom: 4 }}>{created.nome}</div>
          <div style={{ fontSize: 12, color: "#557a62", marginBottom: 12 }}>Codice da condividere:</div>
          <div style={{ background: "#0f2419", border: "1px dashed #2d8a4e", borderRadius: 10, padding: 14, fontSize: 28, fontWeight: 800, color: "#b8f0c8", letterSpacing: "6px", fontFamily: "monospace" }}>{created.codice}</div>
          <button onClick={() => onCreateLeague(created)} style={{ ...S.primaryBtn, marginTop: 16 }}>Entra nella lega →</button>
        </div>
      )}
      {!created && <>
        <ErrorMsg msg={error} />
        {!mode && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => setMode("join")} style={{ padding: "18px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, cursor: "pointer", textAlign: "left", color: "#e8f5e3" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🔗</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Unisciti a una lega</div>
            <div style={{ fontSize: 12, color: "#557a62" }}>Hai un codice invito?</div>
          </button>
          <button onClick={() => setMode("create")} style={{ padding: "18px 20px", background: "rgba(26,107,53,0.12)", border: "1px solid #2d6b44", borderRadius: 14, cursor: "pointer", textAlign: "left", color: "#e8f5e3" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Crea una nuova lega</div>
            <div style={{ fontSize: 12, color: "#557a62" }}>Organizza il torneo tra amici</div>
          </button>
        </div>}
        {mode === "join" && <div>
          <button onClick={() => { setMode(null); setError(""); }} style={{ background: "none", border: "none", color: "#557a62", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Indietro</button>
          <InputField label="Codice lega" value={codice} onChange={v => setCodice(v.toUpperCase())} placeholder="Es. AB12CD" />
          <button onClick={handleJoin} disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }}>{loading ? "Verifica…" : "Unisciti"}</button>
        </div>}
        {mode === "create" && <div>
          <button onClick={() => { setMode(null); setError(""); }} style={{ background: "none", border: "none", color: "#557a62", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Indietro</button>
          <InputField label="Nome della lega" value={nomeLega} onChange={setNomeLega} placeholder="Es. Mondiali dello Zio Gino" autoCapitalize="words" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6dab80", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Max partecipanti</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["5","10","15","20","∞"].map(n => (
                <button key={n} onClick={() => setMaxP(n)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: maxP === n ? "linear-gradient(135deg, #1a6b35, #2d8a4e)" : "rgba(255,255,255,0.05)", color: maxP === n ? "#e8f5e3" : "#557a62" }}>{n}</button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.7 : 1 }}>{loading ? "Creazione…" : "Crea lega e genera codice"}</button>
        </div>}
      </>}
    </AuthShell>
  );
}

// ─── CUSTOM DROPDOWN ─────────────────────────────────────────────────────────
function SquadraDropdown({ value, onChange, placeholder, squadre }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const lista = squadre || SQUADRE_MONDIALE;
  const filtered = lista.filter(s => s.toLowerCase().includes(search.toLowerCase())).sort();

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)",
        border: `1px solid ${open ? "#2d8a4e" : "rgba(255,255,255,0.12)"}`,
        borderRadius: open ? "10px 10px 0 0" : 10, color: value ? "#e8f5e3" : "#557a62",
        fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{value || placeholder || "-- Seleziona --"}</span>
        <span style={{ fontSize: 10, color: "#557a62" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#0f2419", border: "1px solid #2d8a4e", borderTop: "none", borderRadius: "0 0 10px 10px", zIndex: 100, maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca squadra…"
            style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#e8f5e3", fontSize: 13, outline: "none" }} />
          <div style={{ overflowY: "auto", maxHeight: 170 }}>
            {value && <button onClick={() => { onChange(""); setOpen(false); setSearch(""); }} style={{ width: "100%", padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#fca5a5", fontSize: 13, cursor: "pointer", textAlign: "left" }}>✕ Rimuovi selezione</button>}
            {filtered.map(s => (
              <button key={s} onClick={() => { onChange(s); setOpen(false); setSearch(""); }} style={{ width: "100%", padding: "8px 12px", background: s === value ? "rgba(45,138,78,0.25)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", color: s === value ? "#b8f0c8" : "#e8f5e3", fontSize: 13, cursor: "pointer", textAlign: "left" }}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SELEZIONE LEGA ───────────────────────────────────────────────────────────
function SelectLega({ user, onSelectLega, onNewLega, onLogout }) {
  const [leghe, setLeghe] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("partecipanti").select("lega_id, leghe(id, nome, codice, creatore_id)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setLeghe(data?.map(p => p.leghe).filter(Boolean) || []);
        setLoading(false);
      });
  }, [user.id]);

  if (loading) return (
    <div style={{ maxWidth: 400, margin: "0 auto", background: "#0d1f16", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", color: "#557a62" }}><div style={{ fontSize: 40, marginBottom: 16 }}>⚽</div><div>Caricamento…</div></div>
    </div>
  );

  return (
    <AuthShell title={`Ciao, ${user.nome}! 👋`} subtitle="Scegli una lega o creane una nuova">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {leghe.map(l => (
          <button key={l.id} onClick={() => onSelectLega(l)} style={{
            padding: "16px 18px", background: "rgba(26,107,53,0.12)", border: "1px solid #2d6b44",
            borderRadius: 14, cursor: "pointer", textAlign: "left", color: "#e8f5e3",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🏆 {l.nome}</div>
                <div style={{ fontSize: 12, color: "#557a62" }}>Codice: <span style={{ fontFamily: "monospace", color: "#6dab80", letterSpacing: 2 }}>{l.codice}</span></div>
              </div>
              {l.creatore_id === user.id && <span style={{ fontSize: 10, padding: "3px 8px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, color: "#fbbf24" }}>Admin</span>}
            </div>
          </button>
        ))}
      </div>
      <button onClick={onNewLega} style={S.ghostBtn}>+ Crea o unisciti a una nuova lega</button>
      <button onClick={onLogout} style={{ ...S.ghostBtn, marginTop: 8, color: "#557a62", borderColor: "transparent" }}>Esci dall'account</button>
    </AuthShell>
  );
}

// ─── SCOMMESSE PRE-MONDIALE ───────────────────────────────────────────────────
function PreTorneo({ user, lega }) {
  const [vincitore, setVincitore] = useState("");
  const [gironeScelte, setGironeScelte] = useState({}); // { A: "Brasile", B: "Francia", ... }
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    // Carica scommesse pre-torneo già piazzate
    supabase.from("scommesse")
      .select("tipo,scelta")
      .eq("user_id", user.id)
      .eq("lega_id", lega.id)
      .is("partita_id", null)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const v = data.find(s => s.tipo === "vincitore");
          const gironi = {};
          data.filter(s => s.tipo.startsWith("girone_")).forEach(s => { gironi[s.tipo.replace("girone_", "")] = s.scelta; });
          if (v) setVincitore(v.scelta);
          setGironeScelte(gironi);
          setExisting(data);
        }
        setLoadingExisting(false);
      });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Cancella le esistenti e reinserisci
      await supabase.from("scommesse").delete().eq("user_id", user.id).eq("lega_id", lega.id).is("partita_id", null);
      const toInsert = [];
      if (vincitore) toInsert.push({ user_id: user.id, lega_id: lega.id, partita_id: null, tipo: "vincitore", scelta: vincitore, punti_potenziali: 30, penalita: -10, esito: "wait" });
      Object.entries(gironeScelte).forEach(([g, squadra]) => {
        if (squadra) toInsert.push({ user_id: user.id, lega_id: lega.id, partita_id: null, tipo: `girone_${g}`, scelta: squadra, punti_potenziali: 15, penalita: -5, esito: "wait" });
      });
      if (toInsert.length > 0) await supabase.from("scommesse").insert(toInsert);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loadingExisting) return <div style={{ padding: 20, color: "#557a62", textAlign: "center" }}>Caricamento…</div>;

  const totScommesse = (vincitore ? 1 : 0) + Object.values(gironeScelte).filter(Boolean).length;

  return (
    <div style={{ padding: "14px 12px" }}>
      {existing && existing.length > 0 && (
        <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, fontSize: 13, color: "#fbbf24", marginBottom: 14 }}>
          ⚠️ Hai già piazzato scommesse pre-torneo. Modificarle sovrascrive quelle precedenti.
        </div>
      )}

      {/* Vincitore Mondiale */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e8f5e3" }}>🏆 Vincitore Mondiale</div>
            <div style={{ fontSize: 12, color: "#557a62", marginTop: 2 }}>+30 pt se corretto · -10 pt se sbagliato</div>
          </div>
          {vincitore && <div style={{ fontSize: 12, padding: "4px 10px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20, color: "#86efac" }}>{vincitore}</div>}
        </div>
        <SquadraDropdown value={vincitore} onChange={setVincitore} placeholder="-- Seleziona la squadra --" />
      </div>

      {/* 1° classificato per girone */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#e8f5e3", marginBottom: 4 }}>🥇 1° Classificato per Girone</div>
        <div style={{ fontSize: 12, color: "#557a62", marginBottom: 12 }}>+15 pt se corretto · -5 pt se sbagliato · (una per girone)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {GIRONI.map(g => (
            <div key={g}>
              <label style={{ fontSize: 11, color: "#6dab80", display: "block", marginBottom: 4, fontWeight: 600 }}>GIRONE {g}</label>
              <SquadraDropdown value={gironeScelte[g] || ""} onChange={v => setGironeScelte(prev => ({ ...prev, [g]: v }))} placeholder="--" squadre={GIRONI_SQUADRE[g]} />
            </div>
          ))}
        </div>
      </div>

      {saved && <SuccessMsg msg={`✅ Scommesse salvate! (${totScommesse} piazzate)`} />}

      <button onClick={handleSave} disabled={loading || totScommesse === 0} style={{ ...S.primaryBtn, opacity: (loading || totScommesse === 0) ? 0.6 : 1 }}>
        {loading ? "Salvataggio…" : `Salva scommesse (${totScommesse} piazzate)`}
      </button>

      <div style={{ fontSize: 11, color: "#557a62", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
        Le scommesse pre-torneo si chiudono al calcio d'inizio della prima partita.
      </div>
    </div>
  );
}

// ─── CLASSIFICA ───────────────────────────────────────────────────────────────
function Classifica({ lega, user }) {
  const [partecipanti, setPartecipanti] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lega?.id) return;
    supabase.from("partecipanti").select("punti, user_id, profiles(nome)").eq("lega_id", lega.id).order("punti", { ascending: false })
      .then(({ data }) => { setPartecipanti(data || []); setLoading(false); });
  }, [lega?.id]);

  const colori = ["#fbbf24", "#94a3b8", "#c97c3a"];
  if (loading) return <div style={{ padding: 20, color: "#557a62", textAlign: "center" }}>Caricamento classifica…</div>;
  if (partecipanti.length === 0) return (
    <div style={{ padding: 24, textAlign: "center", color: "#557a62" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
      <div style={{ fontSize: 14, color: "#9fc89a", marginBottom: 8 }}>Nessun partecipante ancora.</div>
      <div style={{ fontSize: 12 }}>Condividi il codice lega con i tuoi amici!</div>
    </div>
  );

  return (
    <div style={{ padding: "14px 12px" }}>
      {partecipanti.map((p, i) => {
        const nome = p.profiles?.nome || "Utente";
        const isMe = p.user_id === user?.id;
        return (
          <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isMe ? "rgba(26,58,42,0.5)" : "rgba(255,255,255,0.03)", border: `1px solid ${isMe ? "#2d6b44" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colori[i] || "#557a62", minWidth: 20 }}>{i + 1}</span>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(45,138,78,0.15)", border: "1.5px solid rgba(45,107,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#9fc89a", flexShrink: 0 }}>
              {nome.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: "#e8f5e3" }}>{nome}{isMe ? " (tu)" : ""}</div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#b8f0c8" }}>{p.punti} pt</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── BET ROW ─────────────────────────────────────────────────────────────────
function BetRow({ tipo, val, onChange }) {
  if (tipo.opzioni) {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: "#9fc89a" }}>{tipo.emoji} {tipo.label}</span>
          <span style={{ fontSize: 11, color: "#557a62" }}>{tipo.desc}</span>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {tipo.opzioni.map(o => (
            <button key={o.val} onClick={() => onChange(val === o.val ? null : o.val)} style={{ padding: "5px 11px", fontSize: 12, borderRadius: 20, cursor: "pointer", border: "none", background: val === o.val ? "linear-gradient(135deg, #1a6b35, #2d8a4e)" : "rgba(255,255,255,0.06)", color: val === o.val ? "#e8f5e3" : "#9fc89a", fontWeight: val === o.val ? 600 : 400 }}>
              {o.label}<span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>+{o.pts}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  const optsMap = {
    "1x2": [{ val: "home", label: "1" }, { val: "x", label: "X" }, { val: "away", label: "2" }],
    "ou": [{ val: "under", label: "Under 2.5" }, { val: "over", label: "Over 2.5" }],
    "cleansheet": [{ val: "home", label: "Sì Casa" }, { val: "away", label: "Sì Ospite" }, { val: "no", label: "No" }],
    "cartellini": [{ val: "under", label: "Under 3.5" }, { val: "over", label: "Over 3.5" }],
    "risultato": [{ val: "1-0", label: "1-0" }, { val: "0-0", label: "0-0" }, { val: "1-1", label: "1-1" }, { val: "2-0", label: "2-0" }, { val: "2-1", label: "2-1" }, { val: "0-1", label: "0-1" }, { val: "0-2", label: "0-2" }, { val: "1-2", label: "1-2" }, { val: "altro", label: "Altro" }],
    "marcatore": [{ val: "primo", label: "Primo gol" }],
  };
  const opts = optsMap[tipo.id] || [];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#9fc89a" }}>{tipo.emoji} {tipo.label}</span>
        <span style={{ fontSize: 11, color: "#557a62" }}>+{tipo.pts} pt / {tipo.pen} se errore</span>
      </div>
      {tipo.id === "marcatore" ? (
        <input type="text" value={val || ""} onChange={e => onChange(e.target.value || null)} placeholder="Nome giocatore…" style={{ ...S.input, padding: "7px 12px", fontSize: 13 }} />
      ) : (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {opts.map(o => (
            <button key={o.val} onClick={() => onChange(val === o.val ? null : o.val)} style={{ padding: "5px 11px", fontSize: 12, borderRadius: 20, cursor: "pointer", border: "none", background: val === o.val ? "linear-gradient(135deg, #1a6b35, #2d8a4e)" : "rgba(255,255,255,0.06)", color: val === o.val ? "#e8f5e3" : "#9fc89a", fontWeight: val === o.val ? 600 : 400 }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MATCH CARD ───────────────────────────────────────────────────────────────
function MatchCard({ p, user, lega }) {
  const [bets, setBets] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myScommesse, setMyScommesse] = useState(null);

  useEffect(() => {
    if (!user || !lega) return;
    supabase.from("scommesse").select("tipo,scelta,esito,punti_assegnati,punti_potenziali")
      .eq("partita_id", p.id).eq("user_id", user.id).eq("lega_id", lega.id)
      .then(({ data }) => { if (data && data.length > 0) { setMyScommesse(data); setConfirmed(true); } });
  }, [p.id]);

  const statusLabel = { open: "Aperte", live: "In corso", closed: "Chiuse" }[p.status] || p.status;
  const statusColor = { open: "#22c55e", live: "#f59e0b", closed: "#557a62" }[p.status] || "#557a62";

  const setBet = (tipo, val) => setBets(b => val ? { ...b, [tipo]: val } : Object.fromEntries(Object.entries(b).filter(([k]) => k !== tipo)));

  const totPts = Object.keys(bets).reduce((acc, k) => {
    const t = REGOLAMENTO.partita.find(r => r.id === k);
    if (!t) return acc;
    if (t.opzioni) { const o = t.opzioni.find(o => o.val === bets[k]); return acc + (o ? o.pts : 0); }
    return acc + t.pts;
  }, 0);

  const handleConfirm = async () => {
    if (Object.keys(bets).length === 0) return;
    setSaving(true);
    try {
      const toInsert = Object.entries(bets).map(([tipo, scelta]) => {
        const t = REGOLAMENTO.partita.find(r => r.id === tipo);
        let pts = t?.pts || 0; let pen = t?.pen || 0;
        if (t?.opzioni) { const o = t.opzioni.find(o => o.val === scelta); pts = o?.pts || 0; pen = o?.pen || 0; }
        return { partita_id: p.id, user_id: user.id, lega_id: lega.id, tipo, scelta, punti_potenziali: pts, penalita: pen, esito: "wait" };
      });
      await supabase.from("scommesse").upsert(toInsert, { onConflict: "partita_id,user_id,tipo" });
      setMyScommesse(toInsert);
      setConfirmed(true);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const now = new Date();
  const kickoff = new Date(p.kickoff);
  const isPast = now > kickoff;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 11, color: "#557a62" }}>{formatKickoff(p.kickoff)} · Girone {p.girone}</span>
        <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>● {statusLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 32 }}>{p.home_flag}</div>
          <div style={{ fontSize: 12, color: "#9fc89a", marginTop: 4 }}>{p.home_nome}</div>
        </div>
        {(p.status === "live" || p.status === "closed") && p.score_home_90 !== null ? (
          <div style={{ fontSize: 24, fontWeight: 700, color: "#e8f5e3", padding: "0 8px" }}>{p.score_home_90} – {p.score_away_90}</div>
        ) : (
          <div style={{ fontSize: 16, color: "#557a62", padding: "0 8px" }}>vs</div>
        )}
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 32 }}>{p.away_flag}</div>
          <div style={{ fontSize: 12, color: "#9fc89a", marginTop: 4 }}>{p.away_nome}</div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 14px" }}>
        {p.status === "open" && !isPast && !confirmed && (
          <>
            {REGOLAMENTO.partita.map(tipo => (
              <BetRow key={tipo.id} tipo={tipo} val={bets[tipo.id]} onChange={v => setBet(tipo.id, v)} />
            ))}
            <button onClick={handleConfirm} disabled={saving || Object.keys(bets).length === 0} style={{ width: "100%", padding: "10px", marginTop: 6, background: Object.keys(bets).length > 0 ? "linear-gradient(135deg, #1a6b35, #2d8a4e)" : "rgba(255,255,255,0.05)", color: Object.keys(bets).length > 0 ? "#e8f5e3" : "#557a62", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Salvataggio…" : Object.keys(bets).length > 0 ? `Conferma scommesse (+${totPts} pt potenziali)` : "Seleziona almeno una scommessa"}
            </button>
          </>
        )}
        {confirmed && myScommesse && (
          <>
            <div style={{ fontSize: 11, color: "#557a62", marginBottom: 8 }}>Le tue scommesse:</div>
            {myScommesse.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: "#9fc89a", minWidth: 90 }}>{s.tipo}</span>
                <span style={{ padding: "3px 10px", fontSize: 12, borderRadius: 20, background: s.esito === "ok" ? "rgba(34,197,94,0.15)" : s.esito === "ko" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)", color: esitoColor(s.esito), border: `1px solid ${esitoColor(s.esito)}44` }}>
                  {s.esito === "ok" ? "✓ " : s.esito === "ko" ? "✗ " : ""}{s.scelta}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: esitoColor(s.esito) }}>
                  {s.esito === "wait" ? `+${s.punti_potenziali}?` : s.punti_assegnati > 0 ? `+${s.punti_assegnati}` : s.punti_assegnati}
                </span>
              </div>
            ))}
          </>
        )}
        {p.status === "open" && isPast && !confirmed && (
          <div style={{ textAlign: "center", color: "#557a62", fontSize: 13, padding: "8px 0" }}>🔒 Scommesse chiuse — partita iniziata</div>
        )}
      </div>
    </div>
  );
}

// ─── PARTITE ─────────────────────────────────────────────────────────────────
// Versione compatta per partite chiuse
function MatchCardClosed({ p }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 8,
      opacity: 0.55,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <span style={{ fontSize: 11, color: "#557a62", minWidth: 16 }}>{p.girone}</span>
        <span style={{ fontSize: 18 }}>{p.home_flag}</span>
        <span style={{ fontSize: 12, color: "#9fc89a" }}>{p.home_nome}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#557a62", padding: "0 10px" }}>
        {p.score_home_90 ?? "–"}–{p.score_away_90 ?? "–"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 12, color: "#9fc89a" }}>{p.away_nome}</span>
        <span style={{ fontSize: 18 }}>{p.away_flag}</span>
      </div>
    </div>
  );
}

function Partite({ user, lega }) {
  const [partite, setPartite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("prossime"); // "prossime" | "girone"
  const [gironeSelezionato, setGironeSelezionato] = useState("A");

  useEffect(() => {
    if (!lega?.id) return;
    supabase.from("partite").select("*").eq("lega_id", lega.id).order("kickoff", { ascending: true })
      .then(({ data }) => { setPartite(data || []); setLoading(false); });
  }, [lega?.id]);

  if (loading) return <div style={{ padding: 20, color: "#557a62", textAlign: "center" }}>Caricamento partite…</div>;

  const now = new Date();

  // Vista prossime: 5 partite più vicine non ancora chiuse, poi le chiuse recenti
  const prossime = partite
    .filter(p => p.status !== "closed")
    .slice(0, 5);
  const chiuseRecenti = partite
    .filter(p => p.status === "closed")
    .slice(-3); // ultime 3 chiuse

  // Vista per girone
  const perGirone = partite.filter(p => p.girone === gironeSelezionato);

  return (
    <div style={{ padding: "14px 12px" }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["prossime","⏰ Prossime"],["girone","🗂️ Per girone"]].map(([val, lbl]) => (
          <button key={val} onClick={() => setVista(val)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: vista === val ? 700 : 400,
            background: vista === val ? "linear-gradient(135deg, #1a6b35, #2d8a4e)" : "rgba(255,255,255,0.04)",
            color: vista === val ? "#e8f5e3" : "#557a62",
          }}>{lbl}</button>
        ))}
      </div>

      {/* VISTA PROSSIME */}
      {vista === "prossime" && <>
        {chiuseRecenti.length > 0 && <>
          <div style={{ fontSize: 11, color: "#557a62", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Ultimi risultati</div>
          {chiuseRecenti.map(p => <MatchCardClosed key={p.id} p={p} />)}
          <div style={{ height: 12 }} />
        </>}

        <div style={{ fontSize: 11, color: "#557a62", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
          Prossime partite
        </div>
        {prossime.length === 0
          ? <div style={{ textAlign: "center", color: "#557a62", padding: 20 }}>Nessuna partita in programma.</div>
          : prossime.map(p => <MatchCard key={p.id} p={p} user={user} lega={lega} />)
        }

        {partite.filter(p => p.status !== "closed").length > 5 && (
          <button onClick={() => setVista("girone")} style={{ ...S.ghostBtn, marginTop: 8, fontSize: 13 }}>
            Vedi tutte le partite per girone →
          </button>
        )}
      </>}

      {/* VISTA PER GIRONE */}
      {vista === "girone" && <>
        {/* Selettore girone */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {GIRONI.map(g => (
            <button key={g} onClick={() => setGironeSelezionato(g)} style={{
              width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: gironeSelezionato === g ? 700 : 400,
              background: gironeSelezionato === g ? "linear-gradient(135deg, #1a6b35, #2d8a4e)" : "rgba(255,255,255,0.05)",
              color: gironeSelezionato === g ? "#e8f5e3" : "#557a62",
            }}>{g}</button>
          ))}
        </div>

        {/* Squadre del girone */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {(GIRONI_SQUADRE[gironeSelezionato] || []).map(s => (
            <span key={s} style={{ fontSize: 11, padding: "3px 8px", background: "rgba(45,138,78,0.15)", border: "1px solid rgba(45,138,78,0.3)", borderRadius: 20, color: "#6dab80" }}>{s}</span>
          ))}
        </div>

        {perGirone.length === 0
          ? <div style={{ textAlign: "center", color: "#557a62", padding: 20 }}>Nessuna partita per questo girone.</div>
          : perGirone.map(p =>
              p.status === "closed"
                ? <MatchCardClosed key={p.id} p={p} />
                : <MatchCard key={p.id} p={p} user={user} lega={lega} />
            )
        }
      </>}
    </div>
  );
}

// ─── REGOLAMENTO ─────────────────────────────────────────────────────────────
function Regolamento() {
  const [open, setOpen] = useState(null);
  const sections = [
    { id: "pretorneo", label: "Scommesse Pre-Torneo", emoji: "🏆" },
    { id: "partita", label: "Scommesse per Partita", emoji: "⚽" },
    { id: "quando", label: "Quando si segna", emoji: "⏱️" },
    { id: "regole", label: "Regole Speciali", emoji: "📌" },
  ];
  return (
    <div style={{ padding: "14px 12px" }}>
      <div style={{ fontSize: 13, color: "#557a62", marginBottom: 14, lineHeight: 1.5 }}>Regolamento ufficiale. Leggi prima di scommettere!</div>
      {sections.map(s => (
        <div key={s.id} style={{ marginBottom: 8 }}>
          <button onClick={() => setOpen(open === s.id ? null : s.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: open === s.id ? "rgba(26,107,53,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${open === s.id ? "#2d6b44" : "rgba(255,255,255,0.08)"}`, borderRadius: open === s.id ? "12px 12px 0 0" : 12, cursor: "pointer" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#e8f5e3" }}>{s.emoji} {s.label}</span>
            <span style={{ color: "#557a62" }}>{open === s.id ? "▲" : "▼"}</span>
          </button>
          {open === s.id && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #2d6b44", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px" }}>
              {s.id === "pretorneo" && REGOLAMENTO.preTorneo.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 13, color: "#e8f5e3" }}>{r.emoji} {r.label}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700 }}>+{r.pts} pt</div>
                    <div style={{ fontSize: 11, color: "#ef4444" }}>{r.pen} se sbagliata</div>
                  </div>
                </div>
              ))}
              {s.id === "partita" && REGOLAMENTO.partita.filter(r => r.id !== "quando").map(r => (
                <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, color: "#e8f5e3" }}>{r.emoji} {r.label}</div>
                    <div><span style={{ color: "#22c55e", fontWeight: 700 }}>+{r.pts}</span><span style={{ color: "#ef4444", marginLeft: 8 }}>{r.pen}</span></div>
                  </div>
                  <div style={{ fontSize: 11, color: "#557a62", marginTop: 2 }}>{r.desc}</div>
                </div>
              ))}
              {s.id === "quando" && <>
                <div style={{ fontSize: 12, color: "#9fc89a", marginBottom: 10 }}>4 opzioni. Scommetti su quando verrà segnato il primo gol.</div>
                {REGOLAMENTO.partita.find(r => r.id === "quando").opzioni.map(o => (
                  <div key={o.val} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: 13, color: "#e8f5e3" }}>{o.label}</span>
                    <div><span style={{ color: "#22c55e", fontWeight: 700 }}>+{o.pts} pt</span><span style={{ color: "#ef4444", marginLeft: 8 }}>{o.pen}</span></div>
                  </div>
                ))}
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(245,158,11,0.1)", borderRadius: 8, fontSize: 12, color: "#fbbf24" }}>⚡ "0–0" vale +8 pt invece di +5</div>
              </>}
              {s.id === "regole" && REGOLAMENTO.regole.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "#2d8a4e" }}>→</span>
                  <span style={{ fontSize: 13, color: "#9fc89a", lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function Stats({ user, lega }) {
  const [scommesse, setScommesse] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !lega) return;
    supabase.from("scommesse").select("tipo,scelta,esito,punti_assegnati,punti_potenziali,partite(home_nome,away_nome)")
      .eq("user_id", user.id).eq("lega_id", lega.id).not("partita_id", "is", null)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { setScommesse(data || []); setLoading(false); });
  }, [user?.id, lega?.id]);

  const ok = scommesse.filter(s => s.esito === "ok");
  const ko = scommesse.filter(s => s.esito === "ko");
  const totPos = ok.reduce((a, s) => a + (s.punti_assegnati || 0), 0);
  const totNeg = ko.reduce((a, s) => a + (s.punti_assegnati || 0), 0);
  const perc = scommesse.filter(s => s.esito !== "wait").length > 0 ? Math.round(ok.length / scommesse.filter(s => s.esito !== "wait").length * 100) : 0;

  if (loading) return <div style={{ padding: 20, color: "#557a62", textAlign: "center" }}>Caricamento stats…</div>;

  return (
    <div style={{ padding: "14px 12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { val: `${totPos + totNeg}`, lbl: "Punti totali", color: "#b8f0c8" },
          { val: `${perc}%`, lbl: "% successo", color: "#fbbf24" },
          { val: `+${totPos}`, lbl: "Guadagnati", color: "#22c55e" },
          { val: `${totNeg}`, lbl: "Persi", color: "#ef4444" },
        ].map(s => (
          <div key={s.lbl} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "#557a62", marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>
      {scommesse.length === 0 ? (
        <div style={{ textAlign: "center", color: "#557a62", padding: 20 }}>Nessuna scommessa ancora.</div>
      ) : <>
        <div style={{ fontSize: 12, color: "#557a62", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Ultime scommesse</div>
        {scommesse.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: s.esito === "ok" ? "rgba(34,197,94,0.15)" : s.esito === "ko" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)", fontSize: 14 }}>
              {s.esito === "ok" ? "✓" : s.esito === "ko" ? "✗" : "·"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#e8f5e3" }}>{s.partite?.home_nome} vs {s.partite?.away_nome}</div>
              <div style={{ fontSize: 11, color: "#557a62" }}>{s.tipo} · {s.scelta}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: esitoColor(s.esito) }}>
              {s.esito === "wait" ? `+${s.punti_potenziali}?` : s.punti_assegnati > 0 ? `+${s.punti_assegnati}` : s.punti_assegnati}
            </div>
          </div>
        ))}
      </>}
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
function AdminPanel({ lega, user }) {
  const [partite, setPartite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [scoreH, setScoreH] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("partite").select("*").eq("lega_id", lega.id).order("kickoff", { ascending: true })
      .then(({ data }) => { setPartite(data || []); setLoading(false); });
  }, [lega?.id]);

  const handleSelect = (p) => {
    setSelected(p);
    setScoreH(p.score_home_90 !== null ? String(p.score_home_90) : "");
    setScoreA(p.score_away_90 !== null ? String(p.score_away_90) : "");
    setMsg("");
  };

  const handleSave = async () => {
    if (!selected) return;
    if (scoreH === "" || scoreA === "") { setMsg("Inserisci entrambi i punteggi."); return; }
    const h = parseInt(scoreH); const a = parseInt(scoreA);
    if (isNaN(h) || isNaN(a)) { setMsg("Punteggi non validi."); return; }
    setSaving(true);
    try {
      // Aggiorna il risultato
      await supabase.from("partite").update({ score_home_90: h, score_away_90: a, status: "closed" }).eq("id", selected.id);

      // Calcola e aggiorna le scommesse
      const { data: scommesse } = await supabase.from("scommesse").select("*").eq("partita_id", selected.id);
      if (scommesse && scommesse.length > 0) {
        for (const s of scommesse) {
          let esito = "ko"; let puntiAssegnati = s.penalita;
          const totGol = h + a;

          if (s.tipo === "1x2") {
            const ris = h > a ? "home" : h < a ? "away" : "x";
            if (s.scelta === ris) { esito = "ok"; puntiAssegnati = s.punti_potenziali; }
          } else if (s.tipo === "ou") {
            const ris = totGol > 2 ? "over" : "under";
            if (s.scelta === ris) { esito = "ok"; puntiAssegnati = s.punti_potenziali; }
          } else if (s.tipo === "quando") {
            if (h === 0 && a === 0 && s.scelta === "0-0") { esito = "ok"; puntiAssegnati = s.punti_potenziali; }
            // Per le fasce temporali non abbiamo i dati del minuto — mantieni "wait"
            else if (s.scelta !== "0-0") { esito = "wait"; puntiAssegnati = null; }
          } else if (s.tipo === "cleansheet") {
            if (s.scelta === "home" && a === 0) { esito = "ok"; puntiAssegnati = s.punti_potenziali; }
            else if (s.scelta === "away" && h === 0) { esito = "ok"; puntiAssegnati = s.punti_potenziali; }
            else if (s.scelta === "no" && h > 0 && a > 0) { esito = "ok"; puntiAssegnati = s.punti_potenziali; }
          } else if (s.tipo === "cartellini") {
            // Senza dati cartellini mantieni wait
            esito = "wait"; puntiAssegnati = null;
          } else if (s.tipo === "risultato") {
            const ris = `${h}-${a}`;
            if (s.scelta === ris) { esito = "ok"; puntiAssegnati = s.punti_potenziali; }
          } else if (s.tipo === "marcatore") {
            // Senza dati marcatore mantieni wait
            esito = "wait"; puntiAssegnati = null;
          }

          await supabase.from("scommesse").update({ esito, punti_assegnati: puntiAssegnati }).eq("id", s.id);

          // Aggiorna punti partecipante se esito definitivo
          if (esito !== "wait" && puntiAssegnati !== null) {
            await supabase.rpc("increment_punti", { p_user_id: s.user_id, p_lega_id: s.lega_id, p_delta: puntiAssegnati });
          }
        }
      }

      setMsg(`✅ Risultato salvato: ${selected.home_nome} ${h}–${a} ${selected.away_nome}`);
      setPartite(prev => prev.map(p => p.id === selected.id ? { ...p, score_home_90: h, score_away_90: a, status: "closed" } : p));
      setSelected(null);
    } catch (e) { setMsg("❌ Errore nel salvataggio."); console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 20, color: "#557a62", textAlign: "center" }}>Caricamento…</div>;

  return (
    <div style={{ padding: "14px 12px" }}>
      <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#fca5a5", marginBottom: 16 }}>
        🔐 Pannello Admin — solo tu puoi vedere questa sezione
      </div>

      {msg && <div style={{ padding: "10px 14px", background: msg.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.startsWith("✅") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 10, fontSize: 13, color: msg.startsWith("✅") ? "#86efac" : "#fca5a5", marginBottom: 14 }}>{msg}</div>}

      {selected && (
        <div style={{ background: "rgba(26,107,53,0.15)", border: "1px solid #2d6b44", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f5e3", marginBottom: 12, textAlign: "center" }}>
            {selected.home_flag} {selected.home_nome} vs {selected.away_nome} {selected.away_flag}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "#6dab80", display: "block", marginBottom: 4, fontWeight: 600 }}>GOL {selected.home_nome.toUpperCase()}</label>
              <input type="number" min="0" max="20" value={scoreH} onChange={e => setScoreH(e.target.value)} style={{ ...S.input, fontSize: 24, fontWeight: 700, textAlign: "center", padding: "12px 8px" }} />
            </div>
            <div style={{ fontSize: 20, color: "#557a62", marginTop: 16 }}>–</div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: "#6dab80", display: "block", marginBottom: 4, fontWeight: 600 }}>GOL {selected.away_nome.toUpperCase()}</label>
              <input type="number" min="0" max="20" value={scoreA} onChange={e => setScoreA(e.target.value)} style={{ ...S.input, fontSize: 24, fontWeight: 700, textAlign: "center", padding: "12px 8px" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSelected(null)} style={{ ...S.ghostBtn, flex: 1 }}>Annulla</button>
            <button onClick={handleSave} disabled={saving} style={{ ...S.primaryBtn, flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? "Salvataggio…" : "Salva risultato"}</button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#557a62", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Seleziona partita da aggiornare</div>
      {partite.filter(p => p.status !== "closed").map(p => (
        <button key={p.id} onClick={() => handleSelect(p)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: selected?.id === p.id ? "rgba(26,107,53,0.2)" : "rgba(255,255,255,0.03)", border: `1px solid ${selected?.id === p.id ? "#2d6b44" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, marginBottom: 6, cursor: "pointer", color: "#e8f5e3" }}>
          <span style={{ fontSize: 13 }}>{p.home_flag} {p.home_nome} vs {p.away_nome} {p.away_flag}</span>
          <span style={{ fontSize: 11, color: "#557a62" }}>G{p.girone}</span>
        </button>
      ))}

      {partite.filter(p => p.status === "closed").length > 0 && <>
        <div style={{ fontSize: 12, color: "#557a62", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, marginTop: 16 }}>Risultati inseriti</div>
        {partite.filter(p => p.status === "closed").map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#9fc89a" }}>{p.home_flag} {p.home_nome} vs {p.away_nome} {p.away_flag}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#b8f0c8" }}>{p.score_home_90}–{p.score_away_90}</span>
          </div>
        ))}
      </>}
    </div>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
function TopBar({ pts, user, lega, onLogout, onCambiaLega }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0f2419 0%, #1a3a2a 60%, #0d3320 100%)", padding: "16px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e8f5e3", fontFamily: "'Georgia', serif", letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>⚽ {lega?.nome || "FantaMondiale 2026"}</div>
        <div style={{ fontSize: 11, color: "#6dab80", marginTop: 2 }}>{user?.nome} · <button onClick={onCambiaLega} style={{ background: "none", border: "none", color: "#2d8a4e", fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}>cambia lega</button></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ background: "rgba(45,107,68,0.6)", border: "1px solid #2d6b44", color: "#b8f0c8", fontSize: 15, fontWeight: 700, padding: "6px 14px", borderRadius: 20 }}>{pts} pt</div>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: "#557a62", fontSize: 11, cursor: "pointer" }}>esci</button>
      </div>
    </div>
  );
}

// ─── NAV BAR ─────────────────────────────────────────────────────────────────
function NavBar({ tab, setTab, isAdmin, onCambiaLega }) {
  const tabs = [
    { id: "classifica", label: "Classifica", emoji: "🏅" },
    { id: "pretorneo", label: "Pre-Torneo", emoji: "🎯" },
    { id: "partite", label: "Partite", emoji: "🎮" },
    { id: "regolamento", label: "Regole", emoji: "📋" },
    { id: "stats", label: "Stats", emoji: "📊" },
    ...(isAdmin ? [{ id: "admin", label: "Admin", emoji: "🔐" }] : []),
  ];
  return (
    <div style={{ display: "flex", background: "#0f1f16", borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: "0 0 auto", padding: "10px 10px 9px", background: "transparent", border: "none", cursor: "pointer", fontSize: 10, color: tab === t.id ? "#b8f0c8" : "#557a62", fontWeight: tab === t.id ? 600 : 400, borderBottom: tab === t.id ? "2px solid #2d8a4e" : "2px solid transparent", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 15, marginBottom: 2 }}>{t.emoji}</div>{t.label}
        </button>
      ))}
      <button onClick={onCambiaLega} style={{ flex: "0 0 auto", padding: "10px 10px 9px", background: "transparent", border: "none", cursor: "pointer", fontSize: 10, color: "#3a5c46", borderBottom: "2px solid transparent", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 15, marginBottom: 2 }}>🔀</div>Leghe
      </button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function MainApp({ user, lega, onLogout, onCambiaLega }) {
  const [tab, setTab] = useState("classifica");
  const [myPts, setMyPts] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user || !lega) return;
    supabase.from("partecipanti").select("punti").eq("user_id", user.id).eq("lega_id", lega.id).single()
      .then(({ data }) => { if (data) setMyPts(data.punti); });
    supabase.from("leghe").select("creatore_id").eq("id", lega.id).single()
      .then(({ data }) => { if (data) setIsAdmin(data.creatore_id === user.id); });
  }, [user?.id, lega?.id]);

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", background: "#0d1f16", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#e8f5e3" }}>
      <TopBar pts={myPts} user={user} lega={lega} onLogout={onLogout} onCambiaLega={onCambiaLega} />
      <NavBar tab={tab} setTab={setTab} isAdmin={isAdmin} onCambiaLega={onCambiaLega} />
      {tab === "classifica" && <Classifica lega={lega} user={user} />}
      {tab === "pretorneo" && <PreTorneo user={user} lega={lega} />}
      {tab === "partite" && <Partite user={user} lega={lega} />}
      {tab === "regolamento" && <Regolamento />}
      {tab === "stats" && <Stats user={user} lega={lega} />}
      {tab === "admin" && isAdmin && <AdminPanel lega={lega} user={user} />}
    </div>
  );
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [lega, setLega] = useState(null);

  const loadUser = async (session) => {
    const { data: profile } = await supabase.from("profiles").select("nome").eq("id", session.user.id).single();
    const u = { id: session.user.id, email: session.user.email, nome: profile?.nome || session.user.email.split("@")[0] };
    setUser(u);
    // Controlla quante leghe ha l'utente
    const { data: partecipazioni } = await supabase.from("partecipanti").select("lega_id").eq("user_id", session.user.id);
    const n = partecipazioni?.length || 0;
    if (n === 0) setScreen("league");        // nessuna lega → crea/unisciti
    else if (n === 1) {                       // una lega → entra direttamente
      const { data: l } = await supabase.from("leghe").select("id,nome,codice").eq("id", partecipazioni[0].lega_id).single();
      if (l) { setLega(l); setScreen("app"); }
      else setScreen("league");
    } else setScreen("select");              // più leghe → schermata selezione
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await loadUser(session);
      else setScreen("login");
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setLega(null); setScreen("login");
  };

  const Loading = () => (
    <div style={{ maxWidth: 400, margin: "0 auto", background: "#0d1f16", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", color: "#557a62" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚽</div>
        <div style={{ fontSize: 14 }}>Caricamento…</div>
      </div>
    </div>
  );

  if (screen === "loading") return <Loading />;
  if (screen === "login") return <Login onLogin={async (u) => { setUser(u); const { data: p } = await supabase.from("partecipanti").select("lega_id").eq("user_id", u.id); if (!p?.length) setScreen("league"); else if (p.length === 1) { const { data: l } = await supabase.from("leghe").select("id,nome,codice").eq("id", p[0].lega_id).single(); setLega(l); setScreen("app"); } else setScreen("select"); }} onGoRegister={() => setScreen("register")} />;
  if (screen === "register") return <Register onRegister={(u) => { setUser(u); setScreen("league"); }} onGoLogin={() => setScreen("login")} />;
  if (screen === "select") return <SelectLega user={user} onSelectLega={(l) => { setLega(l); setScreen("app"); }} onNewLega={() => setScreen("league")} onLogout={handleLogout} />;
  if (screen === "league") return <LeagueHub user={user} onJoinLeague={(l) => { setLega(l); setScreen("app"); }} onCreateLeague={(l) => { setLega(l); setScreen("app"); }} onLogout={handleLogout} />;
  return <MainApp user={user} lega={lega} onLogout={handleLogout} onCambiaLega={() => setScreen("select")} />;
}
