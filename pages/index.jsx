import { useState, useRef, useCallback } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');`;

const RED = "#CC0000";
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
    repPrompt: "What have you personally observed about how they make decisions? Have they mentioned needing approval from above? Referenced a budget limit? Deferred to someone else on a topic?"
  },
  "CURRENT STATE|REACH": {
    label: "Influence Network",
    hint: "Who influences them and who do they influence?",
    description: "Who are the key relationships shaping this person's thinking right now? Who do they go to for advice? Who listens when they speak? Map both directions — who pulls them and who they pull. This is where actual power lives, often separate from the org chart.",
    repPrompt: "Who has come up in your conversations with them? Whose opinion do they reference? Who do they mention when talking about decisions being made? Any names that have come up more than once?"
  },
  "CURRENT STATE|RESULTS": {
    label: "Performance Pressure",
    hint: "What metrics are they measured against right now?",
    description: "What does success look like for this person today? What KPIs, targets, or outcomes is their boss watching? What's the gap between where they are and where they need to be — and how visible is that gap? Numbers and specifics beat vague descriptions every time.",
    repPrompt: "What have they told you they're being measured on? What pressures have they mentioned? Any specific targets, numbers, or deadlines that came up? What did they sound most concerned about?"
  },
  "FUTURE STATE|ROLE": {
    label: "Career Trajectory",
    hint: "What role are they positioning for next?",
    description: "Where is this person trying to go professionally? Are they building toward a promotion, a lateral move, or a bigger platform? What title or scope represents their ambition? The answer shapes every conversation — people make decisions that serve their future, not just their present.",
    repPrompt: "Have they mentioned anything about their career direction? A next step they're working toward? A responsibility they're taking on? Something they want to be known for? Even indirect signals count."
  },
  "FUTURE STATE|REACH": {
    label: "Relationship Strategy",
    hint: "What new alliances are they building?",
    description: "What new relationships is this person actively cultivating? Are they expanding into new functions, new executive levels, or new external networks? Relationship building at this level is intentional — it reveals exactly where they're trying to go and who they need on their side to get there.",
    repPrompt: "Have they mentioned new initiatives they're involved in, committees they've joined, or people they're working with that are new? Any signals of deliberate relationship building outside their current lane?"
  },
  "FUTURE STATE|RESULTS": {
    label: "Public Commitments",
    hint: "What goals have they staked their reputation on?",
    description: "What has this person said out loud — in a meeting, a presentation, a company communication — that they're committed to delivering? Public commitments are different from private goals. They've staked professional credibility on these outcomes. That makes them personal.",
    repPrompt: "What have they committed to out loud in your presence? What did they say they're trying to achieve this year? Any goals, targets, or timelines they've mentioned directly to you or that you've heard them mention to others?"
  },
  "NEEDS|ROLE": {
    label: "Capability Gaps",
    hint: "What authority, skills, or resources are they missing?",
    description: "What is this person missing to do their job at the level they're being held to — or the level they're trying to reach? Think authority they don't yet have, skills they haven't built, tools they're working around. Gaps between Current State and Future State in the Role column are often your most direct path to relevance.",
    repPrompt: "What have they complained about not having? Where do they seem to be working around something — process, tool, authority, headcount? Any frustration they've expressed about what they can't get done?"
  },
  "NEEDS|REACH": {
    label: "Missing Support",
    hint: "Whose support do they need but don't have?",
    description: "What relationships or alliances are conspicuously absent? Who should be in their corner but isn't? What political capital do they need to build? When someone is missing both capability and support in the same area, they're exposed — and they know it, even if they don't say it.",
    repPrompt: "Have they mentioned anyone they're having trouble getting alignment with? A function that isn't cooperating? A stakeholder they need but can't get time with? Political friction anywhere in the organization?"
  },
  "NEEDS|RESULTS": {
    label: "Resource Requirements",
    hint: "What tools or budget would solve their biggest problems?",
    description: "What would this person need — budget, tools, technology, people, process — to actually hit their targets? Not a wish list. The specific gap between what they have and what they need to deliver on their Public Commitments. This is where your solution either earns its seat at the table or doesn't.",
    repPrompt: "What have they said they don't have enough of? Budget constraints they've mentioned? Technology gaps? Headcount shortfalls? Any specific resource they've pointed to as the thing standing between them and their goal?"
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

// ─── SEARCH SYSTEM PROMPT ─────────────────────
const SEARCH_SYSTEM_PROMPT = `You are a sales intelligence researcher for the Semper Selling® methodology. Your job is to search the web and find publicly verifiable information about a specific person to populate one cell of a Connection Intelligence Matrix.

PRIORITY ORDER:
1. Person-level intel first — search for the individual by name. What have they said, done, committed to, or been recognized for publicly?
2. Company-level intel second — only if person-level searches come up short, use organizational context to fill the gap.
3. Organizational inference last — if no public sources exist, infer from the role type and company context. Label clearly as inferred.

SEARCH BEHAVIOR:
- Always search for the person by name first
- Use the web_search tool to find current, relevant public information
- Look for LinkedIn profiles, press releases, news articles, earnings calls, conference appearances, published papers, awards, interviews, and company announcements
- Prioritize recent information but use any credible source — do not discard results based on date
- Strip all citation tags like <cite> from your output

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no backticks, no explanation:

When you find sourced information:
{"found": true, "intel": "1-2 sentences of specific, factual intelligence", "source": "https://actual-url.com", "source_label": "Source Name · 2025"}

When you find nothing but can infer from role/company context:
{"found": true, "intel": "Inferred: 1-2 sentences based on role type and organizational context", "source": "inferred", "source_label": "Inferred from organizational context"}

When you find nothing at all:
{"found": false}`;

// ─── ANALYSIS PROMPT ──────────────────────────
const ANALYSIS_PROMPT = (matrixText, deal) => `You are the Semper Selling® Matrix Analysis Engine. Senior sales strategist. Find cross-cell gaps that reveal what's actually happening in this deal beneath the surface. A finding that restates one cell is not a finding.

Deal: ${deal.prospect} (${deal.role} @ ${deal.company})${deal.opportunity ? ` | Offering: ${deal.opportunity}` : ""}

${matrixText}

PATTERNS — run each, skip if relevant boxes are empty or thin:
P1 Box1+2: Authority vs influence gap. High authority+thin network=can't mobilize. Low authority+strong network=more powerful than title.
P2 Box2+5+8: Specific person/function in Box2 or Box5 absent from Box8 = late-stage surprise. Skip if no specific name/function implied.
P3 Box3+4+6 ALIGNMENT ONLY: When all three point same direction — name precisely what they're optimizing for. Mutually exclusive with P9.
P4 Box1-3 vs 4-6: Full gap across all dimensions. Small gap everywhere = low urgency = deal risk.
P5 Box7+8+9: Needs row as one picture. Same problem area across all three = fragile from inside.
P6 Box3+7+9: Sharpest gap between pressure, missing capability, resource need = iQ question setup.
P7 Box6+7+9: Do public commitments create real urgency? Does timeline hold given gaps in 7+9?
P8 Box1+9: Investment implied by Box9 exceed Box1 approval authority? If yes = wrong altitude.
P9 Box3+4+6 CONTRADICTION ONLY: When all three conflict — what they say vs what they're optimizing for. Mutually exclusive with P3.
P10 Box2+8: Specific influencer in Box2 absent from Box8 = coalition risk. Name them.
P11 Box4+5: Bigger role + new external relationships simultaneously = open to new partners NOW. Goes FIRST if fires.
P12 Box1+4+7: Full ROLE column — can they actually deliver on their own ambition?
P13 Box1+2+3: Full CURRENT STATE row — comfortable+entrenched vs pressured+needs a win. Colors everything.
P14 Box3+6+9: Full RESULTS column — current pressure → committed future → execution cost. Clearest commercial picture.

POSITIONING ASSESSMENT — only run if an offering was provided:
The NEEDS row represents educated hypotheses about the gaps between this stakeholder's current state and future state — not a product spec. Using those hypotheses and the cross-cell patterns above, assess how well the offering connects to what this stakeholder is actually missing.
- STRONG FIT: The offering directly addresses one or more NEEDS row hypotheses and aligns with the stakeholder's performance pressure or public commitments.
- PARTIAL FIT: The offering connects to some gaps but misses others, or is positioned at the wrong altitude for this stakeholder's authority level.
- WEAK FIT: The offering does not connect to the identified gaps, or the stakeholder lacks the authority, urgency, or resources to act on it.
- REFRAME NEEDED: The offering could be relevant but is currently framed in a way that won't land with this stakeholder based on what the Matrix reveals about their world.
Be specific — name which NEEDS hypotheses connect and which don't. Name the gap between how the offering is likely being positioned and how it should be positioned based on this stakeholder's world. If no offering was provided, return null for positioning_assessment.

OUTPUT RULES:
- BRIEFING: 1-2 paragraphs. Inference only ("The data suggests...", "The gap between X and Y points to..."). Customer's world only. No advice, no "you should", no box/pattern numbers, never "tension". Specific names/numbers from Matrix. P11 firing = second paragraph on urgency in their world.
- FINDINGS: 2-3 sharpest cross-cell gaps. Headline ALL CAPS max 8 words specific to this deal. Body: data point 1, data point 2, what gap reveals. 2-3 sentences, no box refs. Most urgent first.
- GAPS: Empty/thin cells only. HIGH or MEDIUM. Max 4. NEEDS cells: name the discovery question.
- DEFENSE: Max 3. Specific scenario that kills deal + one action in 5 business days. Title ALL CAPS.
- iQ QUESTIONS: Exactly 2. Current Reality (named constraint) + Future State (named commitment) + Impact (career/reputation/promise — never operational). One natural sentence. Different data per question.
- POSITIONING ASSESSMENT: verdict (STRONG FIT / PARTIAL FIT / WEAK FIT / REFRAME NEEDED), one sentence on what connects, one sentence on what doesn't or what needs to shift. Specific to this stakeholder's Matrix — never generic. Null if no offering provided.
- WATCH_FOR/OUT: Exactly 2 each. Observable only. Tied to this person's intel.
- NEXT_ACTIONS: Exactly 3. What, to whom, by when + cost of inaction. Never "prepare questions."
- MATRIX_HEALTH: STRONG FOUNDATION / PARTIAL PICTURE / FLYING BLIND

Return ONLY this JSON, no backticks, no markdown:
{"matrix_health":"","matrix_health_note":"","briefing":[""],"findings":[{"headline":"","finding":""}],"gaps":[{"cell":"","label":"","severity":"","note":""}],"defense":[{"title":"","body":""}],"iq_questions":[{"question":"","timing":""},{"question":"","timing":""}],"positioning_assessment":{"verdict":"","connects":"","gap":""},"watch_for":["",""],"watch_out":["",""],"next_actions":["","",""]}`;

// ─── SHARED BUTTON ─────────────────────────────
function Btn({ children, onClick, disabled, variant, style = {} }) {
  const base = {
    fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.12em",
    fontSize: "12px", borderRadius: "3px", padding: "11px 22px",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
    border: "none", outline: "none",
  };
  const styles = variant === "ghost"
    ? { ...base, background: "transparent", border: `1px solid #333`, color: "#888", ...style }
    : { ...base, background: disabled ? "#333" : RED, color: "#fff", opacity: disabled ? 0.5 : 1, ...style };
  return <button onClick={disabled ? undefined : onClick} style={styles}>{children}</button>;
}

// ─── WHAT GOES HERE DROPDOWN ───────────────────
function WhatGoesHere({ description }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: open ? "rgba(204,0,0,0.08)" : "transparent", border: `1px solid ${RED}`, borderRadius: "2px", padding: "2px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s", lineHeight: 1 }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        <span style={{ fontSize: "8px", color: open ? RED : "#fff", fontFamily: MONO, letterSpacing: "0.08em", whiteSpace: "nowrap", fontWeight: "700" }}>WHAT GOES HERE</span>
        <span style={{ fontSize: "7px", color: open ? RED : "#fff", fontFamily: MONO }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, width: "244px", background: "#1c1c1c", border: `1px solid ${BORDER}`, borderTop: `2px solid ${RED}`, borderRadius: "0 0 4px 4px", padding: "12px 14px", zIndex: 200, boxShadow: "0 8px 28px rgba(0,0,0,0.8)" }}>
          <div style={{ fontSize: "9px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700", marginBottom: "8px" }}>WHAT GOES HERE</div>
          <div style={{ fontSize: "11px", color: "#fff", fontFamily: MONO, lineHeight: "1.7" }}>{description}</div>
        </div>
      )}
    </div>
  );
}

// ─── SEARCH REVIEW MODAL ───────────────────────
function SearchReviewModal({ results, onAccept, onClose }) {
  const found = results.filter(r => r.result?.found);
  const [accepted, setAccepted] = useState(() => {
    const a = {};
    found.forEach(r => { a[r.key] = true; });
    return a;
  });
  const [edited, setEdited] = useState(() => {
    const e = {};
    found.forEach(r => { e[r.key] = r.result.intel; });
    return e;
  });

  if (found.length === 0) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "32px", maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", marginBottom: "12px" }}>SEARCH COMPLETE</div>
          <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.8", marginBottom: "24px" }}>
            No public intel found for this contact. This person has a thin online footprint — add what you know from your own conversations to fill the Matrix before generating your analysis.
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
    onAccept(updates, found.reduce((acc, r) => {
      if (accepted[r.key]) acc[r.key] = r.result;
      return acc;
    }, {}));
  };

  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "20px", overflowY: "auto" }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "6px", width: "100%", maxWidth: "680px", marginTop: "20px", marginBottom: "20px" }}>

        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: "11px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", marginBottom: "4px" }}>AI INTELLIGENCE SEARCH</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.06em" }}>
            {found.length} {found.length === 1 ? "finding" : "findings"} discovered
          </div>
          <div style={{ fontSize: "11px", color: "#fff", fontFamily: MONO, marginTop: "4px" }}>
            Review each finding. Accept what's useful, skip what isn't. Only accepted intel gets added to your Matrix.
          </div>
        </div>

        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {found.map(r => {
            const meta = MATRIX_META[r.key];
            const isAccepted = accepted[r.key];
            return (
              <div key={r.key} style={{ border: `1px solid ${isAccepted ? "#383838" : "#1e1e1e"}`, borderRadius: "4px", padding: "14px 16px", opacity: isAccepted ? 1 : 0.45, transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700" }}>{r.row} / {r.col}</span>
                    <span style={{ fontSize: "9px", color: "#fff", fontFamily: MONO, marginLeft: "8px" }}>— {meta?.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => setAccepted(a => ({ ...a, [r.key]: true }))}
                      style={{ background: isAccepted ? "rgba(34,197,94,0.15)" : "transparent", border: `1px solid ${isAccepted ? "#22c55e" : "#333"}`, borderRadius: "3px", padding: "4px 12px", cursor: "pointer", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", color: isAccepted ? "#22c55e" : "#555" }}>
                      ✓ ACCEPT
                    </button>
                    <button onClick={() => setAccepted(a => ({ ...a, [r.key]: false }))}
                      style={{ background: !isAccepted ? "rgba(204,0,0,0.15)" : "transparent", border: `1px solid ${!isAccepted ? RED : "#333"}`, borderRadius: "3px", padding: "4px 12px", cursor: "pointer", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", color: !isAccepted ? RED : "#555" }}>
                      ✕ REJECT
                    </button>
                  </div>
                </div>

                {r.existing && (
                  <div style={{ fontSize: "11px", color: "#555", fontFamily: MONO, lineHeight: "1.5", marginBottom: "8px", paddingBottom: "8px", borderBottom: `1px solid #1e1e1e` }}>
                    <span style={{ fontSize: "9px", color: "#444", fontFamily: CONDENSED, letterSpacing: "0.1em", display: "block", marginBottom: "3px" }}>YOUR INTEL</span>
                    {r.existing}
                  </div>
                )}

                <div>
                  <span style={{ fontSize: "9px", color: isAccepted ? "#22c55e" : "#555", fontFamily: CONDENSED, letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>AI FOUND</span>
                  <textarea className="matrix-cell" defaultValue={r.result.intel}
                    onChange={e => setEdited(ed => ({ ...ed, [r.key]: e.target.value }))}
                    style={{ minHeight: "56px", opacity: isAccepted ? 1 : 0.5 }}
                  />
                </div>

                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid #1e1e1e`, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", color: "#444", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>SOURCE</span>
                  {r.result.source === "inferred" ? (
                    <span style={{ fontSize: "10px", color: "#aaa", fontFamily: MONO, fontStyle: "italic" }}>~ inferred from organizational context</span>
                  ) : (
                    <a href={r.result.source} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "10px", color: "#4a9eff", fontFamily: MONO, textDecoration: "none", wordBreak: "break-all" }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                    >{r.result.source_label || r.result.source}</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: "10px", alignItems: "center" }}>
          <Btn onClick={handleConfirm} disabled={acceptedCount === 0} style={{ minWidth: "200px" }}>
            ADD {acceptedCount} {acceptedCount === 1 ? "FINDING" : "FINDINGS"} TO MATRIX →
          </Btn>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "12px 20px" }}>SKIP ALL</Btn>
          <span style={{ fontSize: "10px", color: "#fff", fontFamily: MONO, marginLeft: "4px" }}>{acceptedCount} of {found.length} accepted</span>
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
    { key: "prospect",    label: "CONTACT NAME",           textarea: false },
    { key: "role",        label: "TITLE / ROLE",           textarea: false },
    { key: "company",     label: "COMPANY",                textarea: false },
    { key: "opportunity", label: "WHAT PRODUCT, SERVICE OR SOLUTION ARE YOU OFFERING? (optional)", textarea: true  },
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
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ fontSize: "36px", fontWeight: "900", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.06em", lineHeight: 1.1 }}>CONNECTION INTELLIGENCE<br />MATRIX</div>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px", opacity: 0.9 }}>
              {[0,1,2].map(row => [0,1,2].map(col => (
                <rect key={`${row}-${col}`} x={col * 24 + 2} y={row * 24 + 2} width="20" height="20" rx="2" fill="none" stroke="white" strokeWidth="1.5"/>
              )))}
            </svg>
          </div>
          <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, marginTop: "10px", lineHeight: 1.6 }}>Build your intel. Walk in masterfully prepared.</div>
        </div>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "4px", padding: "32px 28px" }}>
          <div style={{ fontSize: "14px", color: RED, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.14em", marginBottom: "20px" }}>DEAL CONTEXT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "14px", color: errors[f.key] ? "#ff6666" : "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", fontWeight: "700", marginBottom: "6px" }}>
                  {f.label}{errors[f.key] && " — REQUIRED"}
                </label>
                {f.textarea ? (
                  <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2}
                    style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, resize: "none", outline: "none", transition: "all 0.2s" }}
                    onFocus={e => { e.target.style.borderColor = RED; e.target.style.borderLeftColor = RED; }}
                    onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.borderLeftColor = BORDER; }}
                  />
                ) : (
                  <input value={form[f.key]}
                    onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setErrors(p => ({ ...p, [f.key]: false })); }}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${errors[f.key] ? "#ff6666" : BORDER}`, borderLeft: `3px solid ${errors[f.key] ? "#ff6666" : BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, outline: "none", transition: "all 0.2s" }}
                    onFocus={e => { e.target.style.borderColor = RED; e.target.style.borderLeftColor = RED; }}
                    onBlur={e => { e.target.style.borderColor = errors[f.key] ? "#ff6666" : BORDER; e.target.style.borderLeftColor = errors[f.key] ? "#ff6666" : BORDER; }}
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

// ─── ANALYSIS LOADER ───────────────────────────
function AnalysisLoader() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <style>{`
        @keyframes bar1 { 0%, 100% { height: 24px; } 50% { height: 56px; } }
        @keyframes bar2 { 0%, 100% { height: 40px; } 50% { height: 80px; } }
        @keyframes bar3 { 0%, 100% { height: 56px; } 50% { height: 108px; } }
      `}</style>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "120px", marginBottom: "32px" }}>
        <div style={{ width: "22px", background: "linear-gradient(to top, #880000, #FF2222)", borderRadius: "2px 2px 0 0", animation: "bar1 1.1s ease-in-out infinite", animationDelay: "0s" }} />
        <div style={{ width: "22px", background: "linear-gradient(to top, #880000, #FF2222)", borderRadius: "2px 2px 0 0", animation: "bar2 1.1s ease-in-out infinite", animationDelay: "0.18s" }} />
        <div style={{ width: "22px", background: "linear-gradient(to top, #880000, #FF2222)", borderRadius: "2px 2px 0 0", animation: "bar3 1.1s ease-in-out infinite", animationDelay: "0.36s" }} />
      </div>
      <div style={{ fontSize: "11px", color: RED, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.22em", marginBottom: "10px" }}>SEMPER SELLING®</div>
      <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, letterSpacing: "0.06em" }}>Analyzing your intelligence...</div>
    </div>
  );
}

// ─── SCREEN 2: MATRIX EDITOR ──────────────────
function MatrixScreen({ deal, onComplete, onBack }) {
  const [cells, setCells] = useState(emptyMatrix());
  const [focused, setFocused] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searchRan, setSearchRan] = useState(false);
  const [aiSources, setAiSources] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = useRef(null);

  // Cell prompts — what to search for in each cell
  const CELL_PROMPTS = {
    "CURRENT STATE|ROLE": `Search for ${deal.prospect}'s current role, title, and decision-making authority at ${deal.company}. What decisions can they make independently? What requires sign-off above them? Look for their LinkedIn profile, company bio, press releases, or any public source confirming their scope and authority.`,
    "CURRENT STATE|REACH": `Who does ${deal.prospect} (${deal.role} at ${deal.company}) publicly interact with, influence, or report to? Search for ${deal.prospect} by name first. Look for LinkedIn activity, board memberships, advisory roles, conference panels, co-authored content, quotes in press releases, or any public mention of who they work with or report to. Also search for "${deal.prospect} ${deal.company}" together to find organizational mentions.`,
    "CURRENT STATE|RESULTS": `What is ${deal.prospect} personally accountable for delivering as ${deal.role} at ${deal.company}? Search for ${deal.prospect} by name first — look for any public quotes, interviews, press releases, or mentions where they discuss their goals, targets, or what they are responsible for. Also look for ${deal.company} earnings calls, investor presentations, or news that references the ${deal.role} function's performance or targets.`,
    "FUTURE STATE|ROLE": `What is ${deal.prospect}'s career trajectory at ${deal.company} or in their industry? Look for recent promotions, expanded responsibilities, new titles, speaking engagements, industry awards, board appointments, or signals about where they are heading professionally.`,
    "FUTURE STATE|REACH": `What new professional relationships or networks is ${deal.prospect} at ${deal.company} actively building? Look for recent conference appearances, new board or advisory roles, industry association involvement, new partnerships announced, or any activity suggesting deliberate relationship expansion.`,
    "FUTURE STATE|RESULTS": `What public commitments, stated goals, or strategic promises has ${deal.prospect} at ${deal.company} made? Look for quotes in press releases, earnings calls, investor presentations, interviews, conference keynotes, or LinkedIn posts where they personally committed to specific outcomes or targets.`,
    "NEEDS|ROLE": `Based on what you know about ${deal.prospect}'s current role as ${deal.role} at ${deal.company} and where they appear to be heading professionally, generate an intelligent hypothesis about what authority, skills, or capabilities they are likely missing right now. Do NOT search the web. Reason from the gap between their current position and their apparent ambitions. What would someone in this role and on this trajectory typically need that they don't yet have? Return your hypothesis as: {"found": true, "intel": "Inferred: [your hypothesis]", "source": "inferred", "source_label": "Inferred from role and trajectory"}`,
    "NEEDS|REACH": `Based on what you know about ${deal.prospect}'s current influence network and where they are building relationships, generate an intelligent hypothesis about whose support or buy-in they likely need but don't yet have. Do NOT search the web. Reason from the gap between their current relationships and the alliances someone at their level pursuing their apparent goals would need. Return your hypothesis as: {"found": true, "intel": "Inferred: [your hypothesis]", "source": "inferred", "source_label": "Inferred from role and trajectory"}`,
    "NEEDS|RESULTS": `Based on what you know about ${deal.prospect}'s current performance pressures and public commitments as ${deal.role} at ${deal.company}, generate an intelligent hypothesis about what resources, tools, budget, or capabilities they likely need to close the gap between where they are and what they've committed to. Do NOT search the web. Reason from the distance between their current results and their stated goals. Return your hypothesis as: {"found": true, "intel": "Inferred: [your hypothesis]", "source": "inferred", "source_label": "Inferred from role and trajectory"}`,
  };

  // ── AI SEARCH ──────────────────────────────────
  const handleSearch = async () => {
    setSearching(true);
    setSearchProgress("Searching public sources...");

    const allKeys = [];
    MATRIX_ROWS.forEach(row => MATRIX_COLS.forEach(col => allKeys.push({ key: `${row}|${col}`, row, col })));

    const results = [];
    let completed = 0;

    await Promise.all(allKeys.map(async ({ key, row, col }) => {
      const existing = cells[key].trim();
      const userContent = CELL_PROMPTS[key] + (existing ? `\n\nNote: The rep already knows this about the cell: "${existing}". Only surface new, additive information not already captured above.` : "");

      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 600,
            system: SEARCH_SYSTEM_PROMPT,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [{ role: "user", content: userContent }],
          }),
        });

        const data = await resp.json();

        // Web search returns multiple content blocks — find the LAST text block
        // which contains the final JSON response after web search tool use
        const textBlocks = (data.content || []).filter(b => b.type === "text");
        const lastText = textBlocks[textBlocks.length - 1];

        if (lastText && lastText.text) {
          // Clean citation tags injected by web search
          const cleaned = lastText.text
            .replace(/]*>|<\/antml:cite>/g, "")
            .replace(/```json|```/g, "")
            .trim();

          // Extract JSON — find the first { } block
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.intel) {
                parsed.intel = parsed.intel.replace(/<[^>]*>/g, "").trim();
              }
              results.push({ key, row, col, existing, result: parsed });
            } catch {
              results.push({ key, row, col, existing, result: { found: false } });
            }
          } else {
            results.push({ key, row, col, existing, result: { found: false } });
          }
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
    setSearchRan(true);
    setSearchResults(results);
  };

  // ── ACCEPT RESULTS ─────────────────────────────
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

  // ── GENERATE ANALYSIS ──────────────────────────
  const filled = Object.values(cells).filter(v => v.trim().length > 0).length;

  const handleGenerate = async () => {
    if (filled === 0 || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    const matrixText = matrixToText(cells, deal);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: "You are a sales intelligence analyst. Respond only with valid JSON. No preamble, no explanation, no markdown.",
          messages: [{ role: "user", content: ANALYSIS_PROMPT(matrixText, deal) }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        setAnalyzeError(`Server error ${resp.status}: ${errText.slice(0, 200)}`);
        setAnalyzing(false);
        return;
      }

      const data = await resp.json();

      if (data.error) {
        setAnalyzeError(`API error: ${JSON.stringify(data.error).slice(0, 200)}`);
        setAnalyzing(false);
        return;
      }

      const textBlocks = (data.content || []).filter(b => b.type === "text");
      const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : "";
      const stripped = rawText.replace(/<[^>]+>/g, "").replace(/```json|```/gi, "").trim();
      const start = stripped.indexOf("{");
      const end = stripped.lastIndexOf("}");
      const raw = (start !== -1 && end > start) ? stripped.slice(start, end + 1) : "";
      let analysis = null;
      try { analysis = JSON.parse(raw); } catch (e) { setAnalyzeError(`Parse error: ${e.message} — raw: ${raw.slice(0, 300)}`); }
      if (analysis) onComplete(cells, matrixText, analysis, aiSources);
    } catch (err) {
      setAnalyzeError(`Request failed: ${err.message}`);
    }
    setAnalyzing(false);
  };

  // ── IMAGE UPLOAD ───────────────────────────────
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
            model: "claude-sonnet-4-6",
            max_tokens: 1200,
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: `This is a Connection Intelligence Matrix — 9-box grid with columns: ROLE, REACH, RESULTS and rows: CURRENT STATE, FUTURE STATE, NEEDS. Extract all cell content. Return ONLY valid JSON:\n{"CURRENT STATE|ROLE":"","CURRENT STATE|REACH":"","CURRENT STATE|RESULTS":"","FUTURE STATE|ROLE":"","FUTURE STATE|REACH":"","FUTURE STATE|RESULTS":"","NEEDS|ROLE":"","NEEDS|REACH":"","NEEDS|RESULTS":""}` }
            ]}],
          }),
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
      <style>{`
        .matrix-cell { width: 100%; background: transparent; border: none; color: #fff; font-family: ${MONO}; font-size: 11px; line-height: 1.65; resize: none; outline: none; min-height: 72px; }
        .matrix-cell::placeholder { color: #444; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes readingPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media print { body { background: #fff !important; color: #000 !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } button, [data-noprint] { display: none !important; } }
      `}</style>

      {analyzing && <AnalysisLoader />}

      {searchResults !== null && (
        <SearchReviewModal results={searchResults} onAccept={handleAcceptResults} onClose={() => setSearchResults(null)} />
      )}

      {/* Header */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "6px 12px", fontSize: "11px" }}>← BACK</Btn>
        <div style={{ width: "1px", height: "24px", background: "#333" }} />
        <span style={{ color: RED, fontSize: "15px", fontWeight: "700", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>CONNECTION INTELLIGENCE MATRIX</span>
        <span style={{ color: "#fff", fontSize: "11px", fontFamily: MONO }}>{deal.prospect} · {deal.company}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: filled === 9 ? "#22c55e" : "#fff", fontFamily: MONO }}>{filled}/9 cells</span>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ background: uploading ? "rgba(204,0,0,0.08)" : "#1a1a1a", border: `1px solid ${uploading ? RED : BORDER}`, color: uploading ? RED : "#fff", borderRadius: "3px", padding: "7px 14px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.3s" }}
            onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; } }}
            onMouseLeave={e => { if (!uploading) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#fff"; } }}
          >{uploading ? <span style={{ animation: "readingPulse 1s ease-in-out infinite" }}>● READING...</span> : "↑ UPLOAD MATRIX IMAGE"}</button>
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
                  <div key={key} style={{ background: SURFACE, border: `1px solid ${isFocused ? RED : hasValue ? "#383838" : "#1e1e1e"}`, borderRadius: "3px", padding: "14px 14px 12px 14px", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "6px", minHeight: "130px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <div style={{ fontSize: "9px", color: isFocused ? RED : "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", fontWeight: "700", transition: "color 0.2s", textTransform: "uppercase", paddingTop: "2px" }}>
                          {meta.label}
                        </div>
                        {hasAiSource && aiSources[key].source !== "inferred" && (
                          <a href={aiSources[key].source} target="_blank" rel="noopener noreferrer"
                            title={`Source: ${aiSources[key].source_label || aiSources[key].source}`}
                            style={{ fontSize: "8px", color: "#4a9eff", fontFamily: MONO, textDecoration: "none", paddingTop: "2px", whiteSpace: "nowrap" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >↗ source</a>
                        )}
                        {hasAiSource && aiSources[key].source === "inferred" && (
                          <span style={{ fontSize: "8px", color: "#aaa", fontFamily: MONO, paddingTop: "2px", fontStyle: "italic" }}>~ inferred</span>
                        )}
                      </div>
                      <WhatGoesHere description={meta.description} />
                    </div>

                    <textarea className="matrix-cell" value={cells[key]}
                      onChange={e => setCells(prev => ({ ...prev, [key]: e.target.value }))}
                      onFocus={() => setFocused(key)}
                      onBlur={() => setFocused(null)}
                      placeholder={meta.hint}
                    />

                    {/* Rep intelligence prompt — shows after search runs on empty cells */}
                    {searchRan && !cells[key]?.trim() && !hasAiSource && (
                      <div style={{ marginTop: "4px", padding: "7px 10px", background: "rgba(204,0,0,0.05)", border: `1px solid rgba(204,0,0,0.2)`, borderRadius: "2px" }}>
                        <div style={{ fontSize: "8px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.12em", fontWeight: "700", marginBottom: "3px" }}>WHAT DO YOU KNOW?</div>
                        <div style={{ fontSize: "10px", color: "#aaa", fontFamily: MONO, lineHeight: "1.6" }}>{meta.repPrompt}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Action bar */}
          <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: "1px solid #1e1e1e" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", padding: "14px 16px", background: "#0f0f0f", border: `1px solid #1e1e1e`, borderRadius: "4px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", marginBottom: "2px" }}>AI INTELLIGENCE SEARCH</div>
                <div style={{ fontSize: "10px", color: "#fff", fontFamily: MONO }}>
                  Searches public sources for {deal.prospect} at {deal.company}
                </div>
              </div>
              <button onClick={handleSearch} disabled={searching}
                style={{ background: searching ? "rgba(74,158,255,0.08)" : "#1a1a1a", border: `1px solid #4a9eff`, color: "#4a9eff", borderRadius: "3px", padding: "9px 18px", cursor: searching ? "not-allowed" : "pointer", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", whiteSpace: "nowrap", transition: "all 0.3s", minWidth: "200px" }}
                onMouseEnter={e => { if (!searching) e.currentTarget.style.background = "rgba(74,158,255,0.1)"; }}
                onMouseLeave={e => { if (!searching) e.currentTarget.style.background = "#1a1a1a"; }}
              >
                {searching
                  ? <span style={{ animation: "readingPulse 1s ease-in-out infinite", display: "inline-block" }}>● {searchProgress || "SEARCHING..."}</span>
                  : "◈ SEARCH THE WEB"}
              </button>
            </div>

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
            {analyzeError && (
              <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.4)", borderRadius: "3px", fontSize: "11px", color: "#ff8080", fontFamily: MONO, lineHeight: "1.6", wordBreak: "break-all" }}>
                <span style={{ color: RED, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>ANALYSIS ERROR — DETAILS:</span>
                {analyzeError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 3: ANALYSIS REPORT ─────────────────
function AnalysisScreen({ deal, analysis, aiSources, onBack, onRedo }) {
  const hasAnalysis = !!analysis;

  const exportHTML = useCallback(() => {
    if (!analysis) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Matrix Analysis — ${deal.prospect}</title><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#fff;font-family:'IBM Plex Mono',monospace;padding:40px 48px;max-width:1000px;margin:0 auto;line-height:1.6}</style></head><body>
<div style="font-size:10px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.18em;margin-bottom:8px;">◆ CONNECTION INTELLIGENCE — MATRIX ANALYSIS</div>
<div style="font-size:38px;font-weight:900;color:#fff;font-family:'Barlow Condensed',sans-serif;line-height:1;">${deal.prospect.toUpperCase()}</div>
<div style="font-size:13px;color:#fff;font-family:'IBM Plex Mono',monospace;margin-top:6px;margin-bottom:28px;">${deal.role}${deal.company ? ` · ${deal.company}` : ""}${deal.opportunity ? ` · ${deal.opportunity}` : ""}</div>
${analysis.matrix_health_note ? `<div style="border-left:3px solid #CC0000;padding:10px 16px;margin-bottom:32px;font-size:13px;color:#ccc;font-style:italic;">● ${analysis.matrix_health_note}</div>` : ""}
${((Array.isArray(analysis.briefing) ? analysis.briefing.length : 0) || (analysis.findings||[]).length) ? `<div style="margin-bottom:32px;"><div style="display:inline-flex;align-items:center;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:20px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">WHAT THE MATRIX IS TELLING YOU</span></div>${(Array.isArray(analysis.briefing)?analysis.briefing:[]).map(p=>`<p style="font-size:13px;color:#ccc;line-height:1.85;margin-bottom:18px;font-style:italic;">${p}</p>`).join("")}${(analysis.findings||[]).map(f=>{const h=typeof f==="object"?f.headline:null;const t=typeof f==="object"?f.finding:f;return `<div style="margin-bottom:20px;">${h?`<div style="font-size:11px;font-weight:700;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.16em;margin-bottom:7px;">${h}</div>`:""}<p style="font-size:13px;color:#ccc;line-height:1.75;">${t}</p></div>`;}).join("")}</div>`:""}
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${deal.prospect.replace(/\s+/g, "_")}_matrix_analysis.html`;
    a.click(); URL.revokeObjectURL(url);
  }, [analysis, deal]);

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "6px 12px", fontSize: "11px" }}>← BACK</Btn>
        <div style={{ width: "1px", height: "24px", background: "#333" }} />
        <span style={{ color: RED, fontSize: "15px", fontWeight: "700", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>MATRIX ANALYSIS</span>
        <span style={{ color: "#fff", fontSize: "11px", fontFamily: MONO }}>{deal.prospect} · {deal.company}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {hasAnalysis && (
            <button onClick={exportHTML}
              style={{ background: "none", border: `1px solid #333`, color: "#888", borderRadius: "3px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.color = "#22c55e"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
            >↓ EXPORT</button>
          )}
          {hasAnalysis && (
            <button onClick={() => window.print()}
              style={{ background: "none", border: `1px solid #333`, color: "#888", borderRadius: "3px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
            >↓ SAVE PDF</button>
          )}
          <button onClick={onRedo}
            style={{ background: "none", border: `1px solid #333`, color: "#888", borderRadius: "3px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
          >↺ RE-ANALYZE</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "40px 48px", overflowY: "auto", maxWidth: "1000px", width: "100%" }}>

        {/* Report header */}
        <div style={{ marginBottom: "8px", fontSize: "10px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.18em" }}>◆ CONNECTION INTELLIGENCE — MATRIX ANALYSIS</div>
        <div style={{ fontSize: "42px", fontWeight: "900", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.04em", lineHeight: 1, marginBottom: "10px" }}>{deal.prospect.toUpperCase()}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
          <div style={{ width: "3px", height: "16px", background: RED, borderRadius: "1px", flexShrink: 0 }} />
          <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO }}>
            {deal.role}{deal.company ? ` · ${deal.company}` : ""}{deal.opportunity ? ` · ${deal.opportunity}` : ""}
          </div>
        </div>

        {!hasAnalysis ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO }}>Analysis unavailable. Check your connection and try again.</div>
            <div style={{ marginTop: "20px" }}><Btn onClick={onRedo}>↺ TRY AGAIN</Btn></div>
          </div>
        ) : (
          <div>

            {/* Matrix Health */}
            {analysis.matrix_health_note && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "36px", paddingBottom: "28px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: RED, flexShrink: 0, marginTop: "5px" }} />
                <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, fontStyle: "italic", lineHeight: "1.75" }}>{analysis.matrix_health_note}</div>
              </div>
            )}

            {/* WHAT THE MATRIX IS TELLING YOU */}
            {((Array.isArray(analysis.briefing) ? analysis.briefing.length > 0 : !!analysis.briefing) || (analysis.findings||[]).length > 0) && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ display: "inline-flex", alignItems: "center", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "24px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>WHAT THE MATRIX IS TELLING YOU</span>
                </div>
                {(Array.isArray(analysis.briefing) ? analysis.briefing : analysis.briefing ? [analysis.briefing] : []).map((para, i) => (
                  <p key={i} style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.85", margin: 0, marginBottom: "18px", fontStyle: "italic" }}>{para}</p>
                ))}
                {(analysis.findings||[]).length > 0 && (
                  <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #1e1e1e" }}>
                            {(analysis.findings||[]).map((f, i) => {
                      const headline = typeof f === "object" ? f.headline : null;
                      const text = typeof f === "object" ? f.finding : f;
                      return (
                        <div key={i} style={{ marginBottom: "22px" }}>
                          {headline && <div style={{ fontSize: "11px", fontWeight: "700", color: RED, fontFamily: CONDENSED, letterSpacing: "0.16em", marginBottom: "7px" }}>{headline}</div>}
                          <p style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.75", margin: 0 }}>{text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* GAPS + DEFENSE */}
            {((analysis.gaps||[]).length > 0 || (analysis.defense||[]).length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                {(analysis.gaps||[]).length > 0 && (
                  <div>
                    <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "16px" }}>
                      <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>INTELLIGENCE GAPS</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#fff", fontFamily: MONO, marginBottom: "14px" }}>
                      <span style={{ borderLeft: `2px solid ${RED}`, paddingLeft: "6px", marginRight: "12px" }}>HIGH — critical to close</span>
                      <span style={{ borderLeft: "2px solid #f59e0b", paddingLeft: "6px" }}>MEDIUM — worth exploring</span>
                    </div>
                    {(analysis.gaps||[]).map((gap, i) => (
                      <div key={i} style={{ borderLeft: `3px solid ${gap.severity === "HIGH" ? RED : "#f59e0b"}`, paddingLeft: "14px", marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: gap.severity === "HIGH" ? RED : "#f59e0b", fontFamily: CONDENSED, letterSpacing: "0.12em", marginBottom: "5px" }}>{gap.cell}</div>
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.6" }}>{gap.note}</div>
                      </div>
                    ))}
                  </div>
                )}
                {(analysis.defense||[]).length > 0 && (
                  <div>
                    <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "16px" }}>
                      <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>DEFENSE STRATEGY</span>
                    </div>
                    {(analysis.defense||[]).map((d, i) => (
                      <div key={i} style={{ borderLeft: `3px solid ${RED}`, paddingLeft: "14px", marginBottom: "20px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: RED, fontFamily: CONDENSED, letterSpacing: "0.12em", marginBottom: "6px" }}>{d.title}</div>
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65" }}>{d.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* iQ QUESTIONS */}
            {(analysis.iq_questions||[]).length > 0 && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>iQ QUESTIONS — USE NEXT CALL</span>
                </div>
                {(analysis.iq_questions||[]).map((q, i) => {
                  const question = typeof q === "object" ? q.question : q;
                  const timing = typeof q === "object" ? q.timing : null;
                  return (
                    <div key={i} style={{ marginBottom: "22px", paddingLeft: "16px", borderLeft: `3px solid ${RED}` }}>
                      <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.8", fontStyle: "italic", marginBottom: timing ? "8px" : 0 }}>"{question}"</div>
                      {timing && <div style={{ fontSize: "10px", color: "#888", fontFamily: MONO, lineHeight: "1.6" }}>{timing}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* POSITIONING ASSESSMENT */}
            {analysis.positioning_assessment && analysis.positioning_assessment.verdict && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>POSITIONING ASSESSMENT</span>
                </div>
                {(() => {
                  const pa = analysis.positioning_assessment;
                  const verdictColors = {
                    "STRONG FIT":      { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)",  text: "#22c55e" },
                    "PARTIAL FIT":     { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" },
                    "WEAK FIT":        { bg: "rgba(204,0,0,0.08)",    border: "rgba(204,0,0,0.3)",    text: RED },
                    "REFRAME NEEDED":  { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.3)", text: "#8b5cf6" },
                  };
                  const colors = verdictColors[pa.verdict] || verdictColors["PARTIAL FIT"];
                  return (
                    <div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "8px 16px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "3px", marginBottom: "18px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.text, flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", fontWeight: "700", color: colors.text, fontFamily: CONDENSED, letterSpacing: "0.14em" }}>{pa.verdict}</span>
                      </div>
                      {pa.connects && (
                        <div style={{ marginBottom: "14px", paddingLeft: "16px", borderLeft: `3px solid ${colors.text}` }}>
                          <div style={{ fontSize: "9px", color: colors.text, fontFamily: CONDENSED, letterSpacing: "0.12em", fontWeight: "700", marginBottom: "5px" }}>WHAT CONNECTS</div>
                          <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.75" }}>{pa.connects}</div>
                        </div>
                      )}
                      {pa.gap && (
                        <div style={{ paddingLeft: "16px", borderLeft: `3px solid #333` }}>
                          <div style={{ fontSize: "9px", color: "#888", fontFamily: CONDENSED, letterSpacing: "0.12em", fontWeight: "700", marginBottom: "5px" }}>WHAT NEEDS TO SHIFT</div>
                          <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.75" }}>{pa.gap}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SIGNALS */}
            {((analysis.watch_for||[]).length > 0 || (analysis.watch_out||[]).length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                {(analysis.watch_for||[]).length > 0 && (
                  <div>
                    <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "16px" }}>
                      <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>MOMENTUM SIGNALS</span>
                    </div>
                    {(analysis.watch_for||[]).map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", flexShrink: 0, marginTop: "5px" }} />
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65" }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
                {(analysis.watch_out||[]).length > 0 && (
                  <div>
                    <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "16px" }}>
                      <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>RESISTANCE SIGNALS</span>
                    </div>
                    {(analysis.watch_out||[]).map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: RED, flexShrink: 0, marginTop: "5px" }} />
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65" }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NEXT ACTIONS */}
            {(analysis.next_actions||[]).length > 0 && (
              <div style={{ marginBottom: "36px" }}>
                <div style={{ display: "inline-flex", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>RECOMMENDED NEXT ACTIONS</span>
                </div>
                {(analysis.next_actions||[]).map((action, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px", marginBottom: "16px", paddingBottom: "16px", borderBottom: i < (analysis.next_actions||[]).length - 1 ? "1px solid #1a1a1a" : "none" }}>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: RED, fontFamily: CONDENSED, flexShrink: 0, lineHeight: 1.2 }}>{i + 1}</div>
                    <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.7" }}>{action}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "10px", color: "#555", fontFamily: MONO }}>Semper Selling® Connection Intelligence Matrix — Semper Mind © 2026</div>
              <div style={{ fontSize: "10px", color: "#555", fontFamily: MONO }}>{deal.prospect} · {deal.company}</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("deal");
  const [deal, setDeal] = useState(null);
  const [result, setResult] = useState(null);

  if (screen === "deal") {
    return (
      <div>
        <style>{FONTS}</style>
        <DealScreen onComplete={d => { setDeal(d); setScreen("matrix"); }} />
      </div>
    );
  }

  if (screen === "matrix") {
    return (
      <div>
        <style>{FONTS}</style>
        <MatrixScreen
          deal={deal}
          onBack={() => setScreen("deal")}
          onComplete={(cells, matrixText, analysis, aiSources) => {
            setResult({ cells, matrixText, analysis, aiSources });
            setScreen("analysis");
          }}
        />
      </div>
    );
  }

  if (screen === "analysis") {
    return (
      <div>
        <style>{FONTS}</style>
        <AnalysisScreen
          deal={deal}
          analysis={result?.analysis}
          aiSources={result?.aiSources}
          onBack={() => setScreen("matrix")}
          onRedo={() => setScreen("matrix")}
        />
      </div>
    );
  }

  return null;
}
