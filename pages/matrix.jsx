import { useState, useRef, useCallback, useEffect } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');`;

const RED = "#CC0000";
const DARK_RED = "#aa0000";
const BG = "#0d0d0d";
const SURFACE = "#141414";
const BORDER = "#2a2a2a";
const MONO = "'IBM Plex Mono', monospace";
const CONDENSED = "'Barlow Condensed', sans-serif";

const MATRIX_COLS = ["ROLE", "REACH", "RESULTS"];
const MATRIX_ROWS = ["CURRENT STATE", "FUTURE STATE", "NEEDS"];

const MATRIX_META = {
  "CURRENT STATE|ROLE": {
    label: "Decision Authority",
    hint: "What can they approve or veto today?",
    description: "What formal authority does this person hold right now? What decisions can they make independently — and where do they need sign-off? Note budget thresholds, approval limits, and any constraints on their current decision-making power.",
    searchPrompt: (name, role, company) => `What is ${name}'s formal decision-making authority as ${role} at ${company}? What decisions can they approve independently, what budget authority do they hold, and what requires sign-off from above them? Look for org chart info, job postings, press releases, LinkedIn.`
  },
  "CURRENT STATE|REACH": {
    label: "Influence Network",
    hint: "Who influences them and who do they influence?",
    description: "Who are the key relationships shaping this person's thinking right now? Who do they go to for advice? Who listens when they speak? Map both directions — who pulls them and who they pull. This is where actual power lives, often separate from the org chart.",
    searchPrompt: (name, role, company) => `Who does ${name} (${role} at ${company}) publicly interact with, collaborate with, or influence? Look for board memberships, advisory roles, conference panels, co-authored content, quoted relationships, LinkedIn connections of note, or any public mention of key professional relationships.`
  },
  "CURRENT STATE|RESULTS": {
    label: "Performance Pressure",
    hint: "What metrics are they measured against right now?",
    description: "What does success look like for this person today? What KPIs, targets, or outcomes is their boss watching? What's the gap between where they are and where they need to be — and how visible is that gap? Numbers and specifics beat vague descriptions every time.",
    searchPrompt: (name, role, company) => `What business pressures, performance targets, or strategic priorities is ${company} facing right now that would directly affect ${name} as ${role}? Look for earnings calls, press releases, industry news, analyst reports, job postings that reveal pain points, and any public statements about company goals or challenges.`
  },
  "FUTURE STATE|ROLE": {
    label: "Career Trajectory",
    hint: "What role are they positioning for next?",
    description: "Where is this person trying to go professionally? Are they building toward a promotion, a lateral move, or a bigger platform? What title or scope represents their ambition? The answer shapes every conversation — people make decisions that serve their future, not just their present.",
    searchPrompt: (name, role, company) => `What is ${name}'s career trajectory at ${company} or in their industry? Look for recent promotions, expanded responsibilities, new titles, speaking engagements that suggest rising profile, industry awards, board appointments, or any signals of where they are positioning professionally in the next 1-3 years.`
  },
  "FUTURE STATE|REACH": {
    label: "Relationship Strategy",
    hint: "What new alliances are they building?",
    description: "What new relationships is this person actively cultivating? Are they expanding into new functions, new executive levels, or new external networks? Relationship building at this level is intentional — it reveals exactly where they're trying to go and who they need on their side to get there.",
    searchPrompt: (name, role, company) => `What new professional relationships or networks is ${name} (${role} at ${company}) publicly building? Look for recent conference appearances, new board or advisory roles, industry association involvement, new partnerships announced, or any public activity that suggests deliberate relationship expansion beyond their current role.`
  },
  "FUTURE STATE|RESULTS": {
    label: "Public Commitments",
    hint: "What goals have they staked their reputation on?",
    description: "What has this person said out loud — in a meeting, a presentation, a company communication — that they're committed to delivering? Public commitments are different from private goals. They've staked professional credibility on these outcomes. That makes them personal.",
    searchPrompt: (name, role, company) => `What public commitments, stated goals, or strategic promises has ${name} (${role} at ${company}) made? Look for quotes in press releases, earnings calls, investor presentations, interviews, conference keynotes, LinkedIn posts, or company announcements where they have personally committed to specific outcomes, metrics, or strategic directions.`
  },
  "NEEDS|ROLE": {
    label: "Capability Gaps",
    hint: "What authority, skills, or resources are they missing?",
    description: "What is this person missing to do their job at the level they're being held to — or the level they're trying to reach? Think authority they don't yet have, skills they haven't built, tools they're working around. Gaps between Current State and Future State in the Role column are often your most direct path to relevance.",
    searchPrompt: (name, role, company) => `What capability, skill, or authority gaps exist for ${company}'s ${role} function right now? Look for job postings that reveal what they're hiring for, technology or process gaps mentioned in industry coverage, any public statements about transformation initiatives, or analyst commentary about where ${company} needs to improve in this area.`
  },
  "NEEDS|REACH": {
    label: "Missing Support",
    hint: "Whose support do they need but don't have?",
    description: "What relationships or alliances are conspicuously absent? Who should be in their corner but isn't? What political capital do they need to build? When someone is missing both capability and support in the same area, they're exposed — and they know it, even if they don't say it.",
    searchPrompt: (name, role, company) => `What organizational or political challenges is ${company} facing that would affect ${name} as ${role}? Look for leadership changes, restructuring announcements, M&A activity, board changes, executive departures, or any public signals of internal tension, strategic pivots, or gaps in executive alignment that would affect this role.`
  },
  "NEEDS|RESULTS": {
    label: "Resource Requirements",
    hint: "What tools or budget would solve their biggest problems?",
    description: "What would this person need — budget, tools, technology, people, process — to actually hit their targets? Not a wish list. The specific gap between what they have and what they need to deliver on their Public Commitments. This is where your solution either earns its seat at the table or doesn't.",
    searchPrompt: (name, role, company) => `What resources, technology, budget, or tools does ${company} appear to need in the ${role} function to hit their stated goals? Look for RFPs, technology partnerships announced, hiring patterns, analyst recommendations, industry benchmarks, or any public signals about investment priorities, budget cycles, or strategic initiatives requiring new resources.`
  },
};

const emptyMatrix = () => {
  const m = {};
  MATRIX_ROWS.forEach(r => MATRIX_COLS.forEach(c => { m[`${r}|${c}`] = ""; }));
  return m;
};

const matrixToText = (cells, deal) => {
  let out = `CONNECTION INTELLIGENCE MATRIX\n${deal.prospect} — ${deal.role} @ ${deal.company}\n${deal.opportunity ? `Deal: ${deal.opportunity}\n` : ""}\n`;
  MATRIX_ROWS.forEach(row => {
    out += `── ${row} ──\n`;
    MATRIX_COLS.forEach(col => {
      const key = `${row}|${col}`;
      out += `  ${MATRIX_META[key].label} (${col}): ${cells[key] || "[EMPTY — discovery gap]"}\n`;
    });
    out += "\n";
  });
  return out;
};

// ─── SEARCH PROMPT BUILDER ─────────────────────

const SEARCH_SYSTEM_PROMPT = `You are a sales intelligence researcher supporting the Semper Selling® methodology. Your job is to find factual, publicly verifiable information about a specific person and company to help fill a Connection Intelligence Matrix cell.

STRICT RULES:
- Only return information you found from a real, citable public source (LinkedIn, company website, press release, news article, earnings call, conference recording, etc.)
- If you cannot find reliable sourced information for this specific cell, return {"found": false}
- Keep the intel to 1-2 sentences maximum — sharp and specific, not verbose
- The source URL must be real and directly relevant to the intel you found
- Never invent, infer, or extrapolate — only report what you actually found
- Return ONLY valid JSON, no markdown, no explanation

Return format:
{"found": true, "intel": "1-2 sentence factual finding specific to this cell", "source": "https://actual-url.com", "source_label": "Short readable label e.g. LinkedIn · April 2025"}
OR
{"found": false}`;

const ANALYSIS_PROMPT = (matrixText, deal) => `You are the Semper Selling® Matrix Analysis Engine. A sales rep has submitted their Connection Intelligence Matrix. Generate a structured Matrix Analysis report.

Deal: ${deal.prospect} (${deal.role} @ ${deal.company})${deal.opportunity ? `\nOpportunity: ${deal.opportunity}` : ""}

Matrix:
${matrixText}

Return ONLY a valid JSON object with NO other text, preamble, or markdown. Use this exact structure:

{
  "intel_strip": {
    "role": "1-sentence summary of their decision authority and formal position",
    "reach": "1-sentence summary of their influence network and relationships",
    "results": "1-sentence summary of their performance pressures and metrics"
  },
  "gaps": [
    {"cell": "ROW / COLUMN", "label": "Cell label name", "severity": "HIGH|MEDIUM|LOW", "note": "Why this gap matters for this deal specifically"}
  ],
  "defense": {
    "risks": [
      {"title": "Risk name", "cell": "FUTURE STATE / REACH", "action": "One specific protective action"},
      {"title": "Risk name", "cell": "CURRENT STATE / RESULTS", "action": "One specific protective action"},
      {"title": "Risk name", "cell": "NEEDS / RESULTS", "action": "One specific protective action"}
    ]
  },
  "iq_questions": [
    {"question": "Full iQ question using formula: opening phrase + current state intel + connecting word + future state intel + impact prompt + personal/career consequence", "timing": "When to use: pre-call / early discovery / mid-cycle"},
    {"question": "Second iQ question", "timing": "When to use: ..."}
  ],
  "momentum_signals": {
    "watch_for": ["Signal 1 specific to this deal", "Signal 2", "Signal 3"],
    "resistance_watch": ["Resistance indicator 1 specific to this deal", "Resistance indicator 2"]
  },
  "human_read": "2-3 sentences: your honest read of this person based on the Matrix patterns you see — what drives them, what they're afraid of, and where your real leverage is. Be specific to the actual intel, not generic."
}

CRITICAL RULES:
- iQ questions must follow the ONE-PIECE RULE: exactly ONE current reality intel + ONE future state intel + personal/career impact. Never operational consequences. Use specific numbers/dates from the Matrix if available.
- Only call out gaps for cells that are actually empty or thin — never manufacture gaps from filled cells.
- Defense risks must map to specific Matrix cells: "CURRENT STATE / ROLE", "FUTURE STATE / REACH", etc.
- Human Read must be specific to this person's Matrix — never generic sales advice.
- Return pure JSON only. No backticks, no markdown, no explanation.`;

// ─── SHARED COMPONENTS ─────────────────────────

function Btn({ children, onClick, variant = "primary", disabled, style = {} }) {
  const base = {
    border: "none", borderRadius: "4px", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em",
    fontSize: "14px", padding: "12px 28px",
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
    opacity: disabled ? 0.4 : 1,
  };
  const variants = {
    primary: { background: RED, color: "#fff" },
    ghost:   { background: "none", border: `1px solid ${BORDER}`, color: "#aaa", fontSize: "12px", fontFamily: MONO },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => {
        if (disabled) return;
        if (variant === "primary") e.currentTarget.style.background = DARK_RED;
        if (variant === "ghost") { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }
      }}
      onMouseLeave={e => {
        if (variant === "primary") e.currentTarget.style.background = RED;
        if (variant === "ghost") { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#aaa"; }
      }}
    >{children}</button>
  );
}

function Tag({ label, color = RED }) {
  return <span style={{ fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.14em", color, border: `1px solid ${color}`, padding: "2px 7px", borderRadius: "2px" }}>{label}</span>;
}

function SectionHeader({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
      <div style={{ width: "3px", height: "16px", background: RED, borderRadius: "1px" }} />
      <span style={{ fontSize: "11px", color: RED, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>{label}</span>
    </div>
  );
}

// ─── WHAT GOES HERE DROPDOWN ───────────────────

function WhatGoesHere({ description }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: "transparent", border: "none", padding: "0", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "opacity 0.15s", lineHeight: 1 }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        <span style={{ fontSize: "8px", color: open ? RED : "#aaa", fontFamily: MONO, letterSpacing: "0.08em", whiteSpace: "nowrap", fontWeight: "700" }}>WHAT GOES HERE</span>
        <span style={{ fontSize: "7px", color: open ? RED : "#aaa", fontFamily: MONO }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, width: "244px", background: "#1c1c1c", border: `1px solid ${BORDER}`, borderTop: `2px solid ${RED}`, borderRadius: "0 0 4px 4px", padding: "12px 14px", zIndex: 200, boxShadow: "0 8px 28px rgba(0,0,0,0.8)", animation: "fadeSlideIn 0.15s ease" }}>
          <div style={{ fontSize: "9px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700", marginBottom: "8px" }}>WHAT GOES HERE</div>
          <div style={{ fontSize: "11px", color: "#bbb", fontFamily: MONO, lineHeight: "1.7" }}>{description}</div>
        </div>
      )}
    </div>
  );
}

// ─── AI SEARCH REVIEW MODAL ────────────────────

function SearchReviewModal({ results, onAccept, onClose }) {
  const found = results.filter(r => r.result?.found);
  const [accepted, setAccepted] = useState(() => {
    const a = {};
    results.forEach(r => { if (r.result?.found) a[r.key] = true; });
    return a;
  });
  const [edited, setEdited] = useState(() => {
    const e = {};
    results.forEach(r => { if (r.result?.found) e[r.key] = r.result.intel; });
    return e;
  });

  if (found.length === 0) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "32px", maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#888", fontFamily: MONO, lineHeight: "1.7", marginBottom: "20px" }}>
            No verifiable public intel found for this contact. All cells need a source URL to be added — nothing without evidence gets in.
          </div>
          <Btn onClick={onClose} variant="ghost" style={{ width: "100%" }}>CLOSE</Btn>
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    const updates = {};
    found.forEach(r => {
      if (accepted[r.key]) updates[r.key] = edited[r.key] || r.result.intel;
    });
    onAccept(updates, results.reduce((acc, r) => { if (r.result?.found) acc[r.key] = r.result; return acc; }, {}));
  };

  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "20px", overflowY: "auto" }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "6px", width: "100%", maxWidth: "680px", marginTop: "20px", marginBottom: "20px" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: "11px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", marginBottom: "4px" }}>AI INTELLIGENCE SEARCH</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.06em" }}>
            {found.length} {found.length === 1 ? "finding" : "findings"} with verified sources
          </div>
          <div style={{ fontSize: "11px", color: "#888", fontFamily: MONO, marginTop: "4px" }}>
            Review each finding. Accept what's useful, skip what isn't. Only accepted intel gets added to your Matrix.
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {found.map(r => {
            const meta = MATRIX_META[r.key];
            const isAccepted = accepted[r.key];
            return (
              <div key={r.key} style={{ border: `1px solid ${isAccepted ? "#383838" : "#1e1e1e"}`, borderRadius: "4px", padding: "14px 16px", opacity: isAccepted ? 1 : 0.45, transition: "all 0.2s" }}>

                {/* Cell label + toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700" }}>
                      {r.row} / {r.col}
                    </span>
                    <span style={{ fontSize: "9px", color: "#666", fontFamily: MONO, marginLeft: "8px" }}>— {meta.label}</span>
                  </div>
                  <button
                    onClick={() => setAccepted(a => ({ ...a, [r.key]: !a[r.key] }))}
                    style={{ background: isAccepted ? RED : "transparent", border: `1px solid ${isAccepted ? RED : "#444"}`, borderRadius: "3px", padding: "4px 12px", cursor: "pointer", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", color: isAccepted ? "#fff" : "#666", transition: "all 0.15s" }}
                  >{isAccepted ? "✓ ACCEPTED" : "SKIPPED"}</button>
                </div>

                {/* Existing cell content if any */}
                {r.existing && (
                  <div style={{ fontSize: "11px", color: "#555", fontFamily: MONO, lineHeight: "1.5", marginBottom: "8px", paddingBottom: "8px", borderBottom: `1px solid #1e1e1e` }}>
                    <span style={{ fontSize: "9px", color: "#444", fontFamily: CONDENSED, letterSpacing: "0.1em", display: "block", marginBottom: "3px" }}>YOUR INTEL</span>
                    {r.existing}
                  </div>
                )}

                {/* AI finding — editable */}
                <div>
                  <span style={{ fontSize: "9px", color: isAccepted ? "#22c55e" : "#555", fontFamily: CONDENSED, letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>AI FOUND</span>
                  <textarea
                    className="matrix-cell"
                    defaultValue={r.result.intel}
                    onChange={e => setEdited(ed => ({ ...ed, [r.key]: e.target.value }))}
                    style={{ minHeight: "56px", opacity: isAccepted ? 1 : 0.5 }}
                  />
                </div>

                {/* Source */}
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid #1e1e1e`, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", color: "#444", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>SOURCE</span>
                  <a href={r.result.source} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "10px", color: "#4a9eff", fontFamily: MONO, textDecoration: "none", wordBreak: "break-all" }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                  >{r.result.source_label || r.result.source}</a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: "10px", alignItems: "center" }}>
          <Btn onClick={handleConfirm} disabled={acceptedCount === 0} style={{ minWidth: "200px" }}>
            ADD {acceptedCount} {acceptedCount === 1 ? "FINDING" : "FINDINGS"} TO MATRIX →
          </Btn>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "12px 20px" }}>SKIP ALL</Btn>
          <span style={{ fontSize: "10px", color: "#555", fontFamily: MONO, marginLeft: "4px" }}>
            {acceptedCount} of {found.length} accepted
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 1: DEAL ENTRY ──────────────────────

function DealScreen({ onComplete }) {
  const [form, setForm] = useState({ prospect: "", role: "", company: "", opportunity: "" });
  const [errors, setErrors] = useState({});

  const fields = [
    { key: "prospect",    label: "CONTACT NAME",           placeholder: "e.g. Sarah Chen" },
    { key: "role",        label: "TITLE / ROLE",           placeholder: "e.g. VP of Operations" },
    { key: "company",     label: "COMPANY",                placeholder: "e.g. Acme Corp" },
    { key: "opportunity", label: "OPPORTUNITY (optional)", placeholder: "e.g. Q3 training rollout — 40 reps", textarea: true },
  ];

  const handleSubmit = () => {
    const errs = {};
    ["prospect", "role", "company"].forEach(k => { if (!form[k].trim()) errs[k] = true; });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onComplete(form);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "11px", color: RED, fontFamily: MONO, letterSpacing: "0.14em", marginBottom: "8px" }}>SEMPER SELLING®</div>
          <div style={{ fontSize: "36px", fontWeight: "900", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.06em", lineHeight: 1.1 }}>CONNECTION INTELLIGENCE<br />MATRIX</div>
          <div style={{ fontSize: "12px", color: "#888", fontFamily: MONO, marginTop: "10px", lineHeight: 1.6 }}>Build your intel. Generate your analysis. Walk in prepared.</div>
        </div>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "4px", padding: "28px 24px" }}>
          <div style={{ fontSize: "12px", color: RED, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.14em", marginBottom: "20px" }}>DEAL CONTEXT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "9px", color: errors[f.key] ? "#ff6666" : "#888", fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700", marginBottom: "5px" }}>
                  {f.label}{errors[f.key] && " — REQUIRED"}
                </label>
                {f.textarea ? (
                  <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={2}
                    style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, resize: "none", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = BORDER}
                  />
                ) : (
                  <input value={form[f.key]}
                    onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setErrors(p => ({ ...p, [f.key]: false })); }}
                    placeholder={f.placeholder} onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${errors[f.key] ? "#ff6666" : BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, outline: "none", transition: "border-color 0.2s" }}
                    onFocus={e => e.target.style.borderColor = RED} onBlur={e => e.target.style.borderColor = errors[f.key] ? "#ff6666" : BORDER}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "22px" }}>
            <Btn onClick={handleSubmit} style={{ width: "100%", padding: "14px" }}>BUILD THE MATRIX →</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 2: MATRIX EDITOR ──────────────────

function MatrixScreen({ deal, onComplete, onBack }) {
  const [cells, setCells] = useState(emptyMatrix());
  const [focused, setFocused] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [aiSources, setAiSources] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = useRef(null);

  const filled = Object.values(cells).filter(v => v.trim()).length;

  // ── AI SEARCH ──────────────────────────────
  const handleSearch = async () => {
    setSearching(true);
    setSearchProgress("Searching public sources across all 9 cells...");

    const allKeys = [];
    MATRIX_ROWS.forEach(row => MATRIX_COLS.forEach(col => allKeys.push({ key: `${row}|${col}`, row, col })));

    const results = [];
    let completed = 0;

    await Promise.all(allKeys.map(async ({ key, row, col }) => {
      const meta = MATRIX_META[key];
      const prompt = meta.searchPrompt(deal.prospect, deal.role, deal.company);
      const existing = cells[key].trim();

      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            system: SEARCH_SYSTEM_PROMPT,
            messages: [{ role: "user", content: prompt + (existing ? `\n\nThe rep already knows: "${existing}". Only surface new, additive information not already captured above.` : "") }]
          })
        });
        const data = await resp.json();
        const textBlock = data.content?.find(b => b.type === "text");
        if (textBlock) {
          const raw = textBlock.text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(raw);
          results.push({ key, row, col, existing, result: parsed });
        } else {
          results.push({ key, row, col, existing, result: { found: false } });
        }
      } catch {
        results.push({ key, row, col, existing, result: { found: false } });
      }

      completed++;
      setSearchProgress(`Searching... ${completed} of 9 complete`);
    }));

    setSearching(false);
    setSearchProgress(null);
    setSearchResults(results);
  };

  // ── ACCEPT SEARCH RESULTS ──────────────────
  const handleAcceptResults = (updates, sources) => {
    setCells(prev => {
      const next = { ...prev };
      Object.entries(updates).forEach(([key, intel]) => {
        const existing = prev[key].trim();
        next[key] = existing ? `${existing}\n\n${intel}` : intel;
      });
      return next;
    });
    setAiSources(prev => ({ ...prev, ...sources }));
    setSearchResults(null);
  };

  // ── GENERATE ANALYSIS ─────────────────────
  const handleGenerate = async () => {
    if (filled === 0 || analyzing) return;
    setAnalyzing(true);
    const matrixText = matrixToText(cells, deal);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: ANALYSIS_PROMPT(matrixText, deal) }]
        })
      });
      const data = await resp.json();
      const raw = (data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
      const analysis = JSON.parse(raw);
      onComplete(cells, matrixText, analysis, aiSources);
    } catch {
      onComplete(cells, matrixToText(cells, deal), null, aiSources);
    }
    setAnalyzing(false);
  };

  // ── IMAGE UPLOAD ──────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1200,
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: `This is a Connection Intelligence Matrix — 9-box grid with columns: ROLE, REACH, RESULTS and rows: CURRENT STATE, FUTURE STATE, NEEDS. Extract all cell content. Return ONLY valid JSON, no markdown, no backticks:\n{"CURRENT STATE|ROLE":"","CURRENT STATE|REACH":"","CURRENT STATE|RESULTS":"","FUTURE STATE|ROLE":"","FUTURE STATE|REACH":"","FUTURE STATE|RESULTS":"","NEEDS|ROLE":"","NEEDS|REACH":"","NEEDS|RESULTS":""}` }
            ]}]
          })
        });
        const data = await resp.json();
        const raw = (data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(raw);
        const newCells = emptyMatrix();
        Object.keys(newCells).forEach(k => { if (parsed[k]) newCells[k] = parsed[k]; });
        setCells(newCells);
        const count = Object.values(parsed).filter(v => v).length;
        setUploadMsg({ ok: true, text: `${count} of 9 cells extracted. Review and edit below.` });
      } catch {
        setUploadMsg({ ok: false, text: "Couldn't read the image. Try a clearer photo or fill in manually." });
      }
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Search Review Modal */}
      {searchResults && (
        <SearchReviewModal
          results={searchResults}
          onAccept={handleAcceptResults}
          onClose={() => setSearchResults(null)}
        />
      )}

      {/* Header */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "6px 12px", fontSize: "11px" }}>← BACK</Btn>
        <div style={{ width: "1px", height: "24px", background: "#333" }} />
        <span style={{ color: RED, fontSize: "15px", fontWeight: "700", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>CONNECTION INTELLIGENCE MATRIX</span>
        <span style={{ color: "#888", fontSize: "11px", fontFamily: MONO }}>{deal.prospect} · {deal.company}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: filled === 9 ? "#22c55e" : "#888", fontFamily: MONO }}>{filled}/9 cells</span>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, color: uploading ? "#666" : "#fff", borderRadius: "3px", padding: "7px 14px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.15s" }}
            onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = uploading ? "#666" : "#fff"; }}
          >{uploading ? "READING..." : "↑ UPLOAD MATRIX IMAGE"}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 28px 32px", overflowX: "auto" }}>
        <div style={{ maxWidth: "1060px" }}>

          {uploadMsg && (
            <div style={{ marginBottom: "14px", padding: "9px 13px", background: uploadMsg.ok ? "rgba(34,197,94,0.08)" : "rgba(204,0,0,0.08)", border: `1px solid ${uploadMsg.ok ? "rgba(34,197,94,0.3)" : "rgba(204,0,0,0.3)"}`, borderRadius: "3px", fontSize: "11px", color: uploadMsg.ok ? "#22c55e" : "#ff6666", fontFamily: MONO }}>
              {uploadMsg.ok ? "✓ " : "✕ "}{uploadMsg.text}
            </div>
          )}

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr", gap: "5px", marginBottom: "5px" }}>
            <div />
            {MATRIX_COLS.map(col => (
              <div key={col} style={{ background: RED, borderRadius: "3px", padding: "10px 14px", textAlign: "center", fontSize: "14px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.14em" }}>{col}</div>
            ))}
          </div>

          {/* Grid rows */}
          {MATRIX_ROWS.map(row => (
            <div key={row} style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr", gap: "5px", marginBottom: "5px" }}>
              <div style={{ background: RED, borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 8px", textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", lineHeight: "1.35" }}>{row}</div>

              {MATRIX_COLS.map(col => {
                const key = `${row}|${col}`;
                const meta = MATRIX_META[key];
                const isFocused = focused === key;
                const hasValue = !!cells[key].trim();
                const hasAiSource = !!aiSources[key];
                return (
                  <div key={key} style={{ background: SURFACE, border: `1px solid ${isFocused ? RED : hasValue ? "#383838" : "#1e1e1e"}`, borderRadius: "3px", padding: "10px 12px", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "6px", minHeight: "120px" }}>

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <div style={{ fontSize: "9px", color: isFocused ? RED : "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", fontWeight: "700", transition: "color 0.2s", textTransform: "uppercase", paddingTop: "2px" }}>
                          {meta.label}
                        </div>
                        {hasAiSource && (
                          <a href={aiSources[key].source} target="_blank" rel="noopener noreferrer"
                            title={`AI source: ${aiSources[key].source_label || aiSources[key].source}`}
                            style={{ fontSize: "8px", color: "#4a9eff", fontFamily: MONO, textDecoration: "none", paddingTop: "2px", whiteSpace: "nowrap" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >↗ source</a>
                        )}
                      </div>
                      <WhatGoesHere description={meta.description} />
                    </div>

                    <textarea
                      className="matrix-cell"
                      value={cells[key]}
                      onChange={e => setCells(prev => ({ ...prev, [key]: e.target.value }))}
                      onFocus={() => setFocused(key)}
                      onBlur={() => setFocused(null)}
                      placeholder={meta.hint}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Action bar */}
          <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: "1px solid #1e1e1e" }}>

            {/* Search bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", padding: "14px 16px", background: "#0f0f0f", border: `1px solid #1e1e1e`, borderRadius: "4px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", marginBottom: "2px" }}>AI INTELLIGENCE SEARCH</div>
                <div style={{ fontSize: "10px", color: "#666", fontFamily: MONO }}>
                  Searches public sources for {deal.prospect} at {deal.company} — adds only verified, sourced intel
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{ background: searching ? "#1a1a1a" : "#1a1a1a", border: `1px solid ${searching ? "#333" : "#4a9eff"}`, color: searching ? "#555" : "#4a9eff", borderRadius: "3px", padding: "9px 18px", cursor: searching ? "not-allowed" : "pointer", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", whiteSpace: "nowrap", transition: "all 0.15s", minWidth: "160px" }}
                onMouseEnter={e => { if (!searching) { e.currentTarget.style.background = "rgba(74,158,255,0.1)"; } }}
                onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; }}
              >
                {searching ? searchProgress || "SEARCHING..." : "◈ SEARCH THE WEB"}
              </button>
            </div>

            {/* Generate bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <Btn onClick={handleGenerate} disabled={filled === 0 || analyzing} style={{ minWidth: "300px" }}>
                {analyzing ? "[ Analyzing your intelligence... ]" : "GENERATE MATRIX ANALYSIS →"}
              </Btn>
              <span style={{ fontSize: "11px", color: "#888", fontFamily: MONO }}>
                {filled === 0 && "Fill in at least one cell to continue"}
                {filled > 0 && filled < 9 && `${9 - filled} empty ${9 - filled === 1 ? "cell" : "cells"} will surface as discovery gaps`}
                {filled === 9 && "All 9 cells complete — strong foundation"}
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 3: ANALYSIS REPORT ─────────────────

const SEVERITY_COLOR = { HIGH: "#ff4444", MEDIUM: "#f59e0b", LOW: "#22c55e" };
const SEVERITY_BG    = { HIGH: "rgba(255,68,68,0.08)", MEDIUM: "rgba(245,158,11,0.08)", LOW: "rgba(34,197,94,0.08)" };

function SeverityBar({ level }) {
  const bars = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const count = bars[level] || 1;
  const color = SEVERITY_COLOR[level];
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: "16px", height: "4px", borderRadius: "1px", background: i <= count ? color : "#2a2a2a" }} />
      ))}
      <span style={{ fontSize: "9px", color, fontFamily: CONDENSED, letterSpacing: "0.1em", fontWeight: "700", marginLeft: "4px" }}>{level}</span>
    </div>
  );
}

function ReportCard({ children, style = {} }) {
  return <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "4px", padding: "20px 22px", ...style }}>{children}</div>;
}

function AnalysisScreen({ deal, analysis, aiSources, onBack, onRedo }) {
  const hasAnalysis = !!analysis;

  const exportHTML = useCallback(() => {
    if (!analysis) return;
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const gapsHTML = (analysis.gaps || []).map(g => `<div style="border-left:3px solid ${SEVERITY_COLOR[g.severity]||RED};padding:10px 14px;background:#181818;border-radius:0 3px 3px 0;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:11px;font-weight:700;color:#fff;font-family:'IBM Plex Mono',monospace;">${g.cell}</span><span style="font-size:9px;font-weight:700;color:${SEVERITY_COLOR[g.severity]||RED};font-family:'Barlow Condensed',sans-serif;letter-spacing:0.1em;">${g.severity}</span></div><div style="font-size:12px;color:#ccc;font-family:'IBM Plex Mono',monospace;line-height:1.5;">${g.note}</div></div>`).join("");
    const risksHTML = (analysis.defense?.risks||[]).map((r,i)=>`<div style="border:1px solid #2a2a2a;border-radius:3px;padding:14px 16px;margin-bottom:8px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;"><span style="font-size:9px;font-weight:700;color:#CC0000;border:1px solid #CC0000;padding:2px 7px;border-radius:2px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.14em;">RISK ${i+1}</span><span style="font-size:12px;font-weight:700;color:#fff;font-family:'Barlow Condensed',sans-serif;">${r.title}</span></div><div style="font-size:10px;color:#555;font-family:'IBM Plex Mono',monospace;margin-bottom:7px;">${r.cell}</div><div style="font-size:12px;color:#ccc;font-family:'IBM Plex Mono',monospace;line-height:1.5;">→ ${r.action}</div></div>`).join("");
    const iqHTML = (analysis.iq_questions||[]).map(q=>`<div style="border:1px solid #2a2a2a;border-radius:3px;padding:14px 16px;margin-bottom:8px;"><div style="font-size:12px;color:#fff;font-family:'IBM Plex Mono',monospace;line-height:1.7;margin-bottom:8px;">"${q.question}"</div><div style="font-size:10px;color:#555;font-family:'IBM Plex Mono',monospace;font-style:italic;">${q.timing}</div></div>`).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Matrix Analysis — ${deal.prospect}</title><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0d0d;color:#fff;font-family:'IBM Plex Mono',monospace;padding:40px 32px;max-width:900px;margin:0 auto}@media print{body{background:#fff;color:#000}}</style></head><body><div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #CC0000;"><div style="font-size:10px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.18em;margin-bottom:6px;">SEMPER SELLING® — MATRIX ANALYSIS</div><div style="font-size:28px;font-weight:900;color:#fff;font-family:'Barlow Condensed',sans-serif;">${deal.prospect}</div><div style="font-size:13px;color:#888;font-family:'IBM Plex Mono',monospace;margin-top:4px;">${deal.role} @ ${deal.company}${deal.opportunity?` · ${deal.opportunity}`:""}</div><div style="font-size:10px;color:#555;margin-top:4px;">${now}</div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;"><div style="background:#141414;border:1px solid #2a2a2a;border-radius:4px;padding:14px 16px;"><div style="font-size:9px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.14em;font-weight:700;margin-bottom:6px;">ROLE</div><div style="font-size:12px;color:#ccc;line-height:1.5;">${analysis.intel_strip?.role||"—"}</div></div><div style="background:#141414;border:1px solid #2a2a2a;border-radius:4px;padding:14px 16px;"><div style="font-size:9px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.14em;font-weight:700;margin-bottom:6px;">REACH</div><div style="font-size:12px;color:#ccc;line-height:1.5;">${analysis.intel_strip?.reach||"—"}</div></div><div style="background:#141414;border:1px solid #2a2a2a;border-radius:4px;padding:14px 16px;"><div style="font-size:9px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.14em;font-weight:700;margin-bottom:6px;">RESULTS</div><div style="font-size:12px;color:#ccc;line-height:1.5;">${analysis.intel_strip?.results||"—"}</div></div></div>${analysis.gaps?.length?`<div style="margin-bottom:28px;"><div style="font-size:11px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;margin-bottom:12px;">INTELLIGENCE GAPS</div>${gapsHTML}</div>`:""}${analysis.defense?.risks?.length?`<div style="margin-bottom:28px;"><div style="font-size:11px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;margin-bottom:12px;">DEFENSE STRATEGY</div>${risksHTML}</div>`:""}${analysis.iq_questions?.length?`<div style="margin-bottom:28px;"><div style="font-size:11px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;margin-bottom:12px;">iQ QUESTIONS</div>${iqHTML}</div>`:""}${analysis.momentum_signals?`<div style="margin-bottom:28px;"><div style="font-size:11px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;margin-bottom:12px;">MOMENTUM SIGNALS</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div style="background:#141414;border:1px solid #1a3a1a;border-radius:4px;padding:14px 16px;"><div style="font-size:9px;color:#22c55e;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;font-weight:700;margin-bottom:8px;">WATCH FOR</div>${(analysis.momentum_signals.watch_for||[]).map(s=>`<div style="font-size:11px;color:#ccc;padding:5px 0;border-bottom:1px solid #1e1e1e;line-height:1.4;">${s}</div>`).join("")}</div><div style="background:#141414;border:1px solid #3a1a1a;border-radius:4px;padding:14px 16px;"><div style="font-size:9px;color:#ff4444;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;font-weight:700;margin-bottom:8px;">RESISTANCE</div>${(analysis.momentum_signals.resistance_watch||[]).map(s=>`<div style="font-size:11px;color:#ccc;padding:5px 0;border-bottom:1px solid #1e1e1e;line-height:1.4;">${s}</div>`).join("")}</div></div></div>`:""}${analysis.human_read?`<div style="background:#141414;border-left:3px solid #CC0000;padding:16px 20px;border-radius:0 4px 4px 0;"><div style="font-size:9px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.14em;font-weight:700;margin-bottom:8px;">HUMAN READ</div><div style="font-size:13px;color:#ccc;line-height:1.7;">${analysis.human_read}</div></div>`:""}<div style="margin-top:40px;padding-top:16px;border-top:1px solid #2a2a2a;font-size:10px;color:#444;">SEMPER MIND © 2026 — SEMPERMIND.COM</div></body></html>`;
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`matrix_analysis_${deal.prospect.replace(/[^a-z0-9]/gi,"_").toLowerCase()}.html`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  }, [analysis, deal]);

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "6px 12px", fontSize: "11px" }}>← EDIT MATRIX</Btn>
        <div style={{ width: "1px", height: "24px", background: "#333" }} />
        <span style={{ color: RED, fontSize: "15px", fontWeight: "700", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>MATRIX ANALYSIS</span>
        <span style={{ color: "#888", fontSize: "11px", fontFamily: MONO }}>{deal.prospect} · {deal.company}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {hasAnalysis && <button onClick={exportHTML} style={{ background: "none", border: `1px solid ${BORDER}`, color: "#888", borderRadius: "3px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.color = "#22c55e"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#888"; }}>↓ EXPORT HTML</button>}
          <button onClick={onRedo} style={{ background: "none", border: `1px solid ${BORDER}`, color: "#888", borderRadius: "3px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }} onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#888"; }}>↺ RE-ANALYZE</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 28px 40px", overflowY: "auto" }}>
        <div style={{ maxWidth: "900px" }}>
          <div style={{ marginBottom: "24px", paddingBottom: "18px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: "26px", fontWeight: "900", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.06em" }}>{deal.prospect}</div>
            <div style={{ fontSize: "12px", color: "#888", fontFamily: MONO, marginTop: "4px" }}>{deal.role} @ {deal.company}{deal.opportunity ? ` · ${deal.opportunity}` : ""}</div>
          </div>

          {!hasAnalysis ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#888", fontFamily: MONO }}>Analysis unavailable. Check your API connection and try again.</div>
              <div style={{ marginTop: "20px" }}><Btn onClick={onRedo}>↺ TRY AGAIN</Btn></div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

              <ReportCard>
                <SectionHeader label="INTEL STRIP" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  {["role", "reach", "results"].map(dim => (
                    <div key={dim} style={{ background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "3px", padding: "12px 14px" }}>
                      <div style={{ fontSize: "9px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700", marginBottom: "6px" }}>{dim.toUpperCase()}</div>
                      <div style={{ fontSize: "12px", color: "#ccc", fontFamily: MONO, lineHeight: "1.55" }}>{analysis.intel_strip?.[dim] || "—"}</div>
                    </div>
                  ))}
                </div>
              </ReportCard>

              {analysis.gaps?.length > 0 && (
                <ReportCard>
                  <SectionHeader label="INTELLIGENCE GAPS" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {analysis.gaps.map((gap, i) => (
                      <div key={i} style={{ borderLeft: `3px solid ${SEVERITY_COLOR[gap.severity] || RED}`, paddingLeft: "14px", paddingTop: "10px", paddingBottom: "10px", background: SEVERITY_BG[gap.severity] || "transparent", borderRadius: "0 3px 3px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                          <div>
                            <span style={{ fontSize: "10px", fontWeight: "700", color: "#fff", fontFamily: MONO }}>{gap.cell}</span>
                            {gap.label && <span style={{ fontSize: "10px", color: "#666", fontFamily: MONO, marginLeft: "8px" }}>— {gap.label}</span>}
                          </div>
                          <SeverityBar level={gap.severity} />
                        </div>
                        <div style={{ fontSize: "12px", color: "#ccc", fontFamily: MONO, lineHeight: "1.55" }}>{gap.note}</div>
                      </div>
                    ))}
                  </div>
                </ReportCard>
              )}

              {analysis.defense?.risks?.length > 0 && (
                <ReportCard>
                  <SectionHeader label="DEFENSE STRATEGY" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {analysis.defense.risks.map((risk, i) => (
                      <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: "3px", padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                          <Tag label={`RISK ${i + 1}`} />
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.06em" }}>{risk.title}</span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#555", fontFamily: MONO, marginBottom: "7px" }}>{risk.cell}</div>
                        <div style={{ fontSize: "12px", color: "#ccc", fontFamily: MONO, lineHeight: "1.55" }}>→ {risk.action}</div>
                      </div>
                    ))}
                  </div>
                </ReportCard>
              )}

              {analysis.iq_questions?.length > 0 && (
                <ReportCard>
                  <SectionHeader label="iQ QUESTIONS" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {analysis.iq_questions.map((q, i) => (
                      <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: "3px", padding: "16px" }}>
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.7", marginBottom: "10px" }}>"{q.question}"</div>
                        <div style={{ fontSize: "10px", color: "#555", fontFamily: MONO, fontStyle: "italic" }}>{q.timing}</div>
                      </div>
                    ))}
                  </div>
                </ReportCard>
              )}

              {analysis.momentum_signals && (
                <ReportCard>
                  <SectionHeader label="MOMENTUM SIGNALS" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    <div style={{ background: "#0d0d0d", border: "1px solid #1a3a1a", borderRadius: "3px", padding: "14px 16px" }}>
                      <div style={{ fontSize: "9px", color: "#22c55e", fontFamily: CONDENSED, letterSpacing: "0.12em", fontWeight: "700", marginBottom: "10px" }}>WATCH FOR — MOMENTUM</div>
                      {(analysis.momentum_signals.watch_for || []).map((s, i) => (
                        <div key={i} style={{ fontSize: "11px", color: "#ccc", fontFamily: MONO, padding: "5px 0", borderBottom: "1px solid #1e1e1e", lineHeight: "1.45" }}>{s}</div>
                      ))}
                    </div>
                    <div style={{ background: "#0d0d0d", border: "1px solid #3a1a1a", borderRadius: "3px", padding: "14px 16px" }}>
                      <div style={{ fontSize: "9px", color: "#ff4444", fontFamily: CONDENSED, letterSpacing: "0.12em", fontWeight: "700", marginBottom: "10px" }}>RESISTANCE WATCH</div>
                      {(analysis.momentum_signals.resistance_watch || []).map((s, i) => (
                        <div key={i} style={{ fontSize: "11px", color: "#ccc", fontFamily: MONO, padding: "5px 0", borderBottom: "1px solid #1e1e1e", lineHeight: "1.45" }}>{s}</div>
                      ))}
                    </div>
                  </div>
                </ReportCard>
              )}

              {analysis.human_read && (
                <div style={{ background: SURFACE, borderLeft: `3px solid ${RED}`, borderRadius: "0 4px 4px 0", padding: "18px 22px" }}>
                  <SectionHeader label="HUMAN READ" />
                  <div style={{ fontSize: "13px", color: "#ccc", fontFamily: MONO, lineHeight: "1.8" }}>{analysis.human_read}</div>
                </div>
              )}

              <div style={{ paddingTop: "16px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "#444", fontFamily: MONO }}>SEMPER MIND © 2026 — SEMPERMIND.COM</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {hasAnalysis && <Btn variant="ghost" onClick={exportHTML} style={{ fontSize: "10px", padding: "7px 14px" }}>↓ EXPORT HTML</Btn>}
                  <Btn variant="ghost" onClick={onRedo} style={{ fontSize: "10px", padding: "7px 14px" }}>↺ RE-ANALYZE</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("deal");
  const [deal, setDeal] = useState(null);
  const [cells, setCells] = useState(null);
  const [matrixText, setMatrixText] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [aiSources, setAiSources] = useState({});

  return (
    <>
      <style>{FONTS}{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; color: #fff; }
        ::placeholder { color: #444 !important; opacity: 1; }
        input, textarea { color-scheme: dark; }
        textarea.matrix-cell {
          display: block;
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-appearance: none !important;
          appearance: none !important;
          resize: none !important;
          color: #ffffff;
          font-size: 12px;
          line-height: 1.55;
          width: 100%;
          min-height: 72px;
          flex: 1;
          padding: 0;
          margin: 0;
          font-family: 'IBM Plex Mono', monospace;
        }
        textarea.matrix-cell:focus { outline: none !important; box-shadow: none !important; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d0d0d; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #CC0000; }
      `}</style>

      {screen === "deal" && (
        <DealScreen onComplete={d => { setDeal(d); setScreen("matrix"); }} />
      )}
      {screen === "matrix" && deal && (
        <MatrixScreen
          deal={deal}
          onComplete={(c, txt, a, sources) => { setCells(c); setMatrixText(txt); setAnalysis(a); setAiSources(sources || {}); setScreen("report"); }}
          onBack={() => setScreen("deal")}
        />
      )}
      {screen === "report" && deal && (
        <AnalysisScreen
          deal={deal}
          cells={cells}
          analysis={analysis}
          aiSources={aiSources}
          onBack={() => setScreen("matrix")}
          onRedo={() => setScreen("matrix")}
        />
      )}
    </>
  );
}
