import { useState, useRef, useCallback, useEffect } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');`;

const RED = "#CC0000";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const BG = "#0d0d0d";
const SURFACE = "#141414";
const BORDER = "#2a2a2a";
const MONO = "'IBM Plex Mono', monospace";
const CONDENSED = "'Barlow Condensed', sans-serif";

const STORAGE_KEY = "semper_matrix_session_v1";

// ─── RESUME CODE + CLOUD SAVE ──────────────────
// A short human-writable code is the portable key to a rep's Matrix.
// No login. Enter the code on any device to reopen and keep editing.
// Cloud save talks to /api/session (Upstash Redis via Vercel). If the KV
// store isn't provisioned yet, saves fall back to this-device localStorage
// and the UI says so honestly — nothing breaks.
const genCode = () => {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1 — unambiguous when written by hand
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `SEMPER-${s}`;
};

const cloudSave = async (code, session) => {
  try {
    const r = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, session }),
    });
    return r.ok;
  } catch { return false; }
};

const cloudLoad = async (code) => {
  try {
    const r = await fetch(`/api/session?code=${encodeURIComponent(code)}`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.session || null;
  } catch { return null; }
};

// ─── ANALYSIS PROGRESS STAGES ──────────────────
// The analysis runs as two smaller calls in parallel (a READ and a PLAN), so
// neither can hit the function timeout. These stages drive the loader's ticks.
const ANALYSIS_STAGES = [
  { label: "Reading the terrain" },
  { label: "Interpreting the intel" },
  { label: "Finding cross-cell patterns" },
  { label: "Flagging intelligence gaps" },
  { label: "Building defense strategy" },
  { label: "Drafting your call objective" },
  { label: "Writing your opener" },
  { label: "Loading iQ questions" },
  { label: "Setting next actions" },
];

// One /api/chat call that returns parsed JSON. Works with a plain, non-streaming
// chat route — no streaming, no maxDuration changes, no route format to match.
async function callAnalysis(prompt, maxTokens = 2000) {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await resp.json();
  const blocks = (data.content || []).filter(b => b.type === "text");
  const txt = blocks.length ? blocks[blocks.length - 1].text : "";
  const stripped = txt.replace(/<[^>]+>/g, "").replace(/```json|```/gi, "").trim();
  const a = stripped.indexOf("{");
  const b = stripped.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(stripped.slice(a, b + 1)); } catch { return null; }
}

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

// Tag each cell by intel source so the analysis engine can weight it:
// [SOURCED] verified public source · [INFERRED] AI hypothesis · [REP INTEL] rep's own knowledge
const matrixToText = (cells, deal, aiSources = {}) => {
  let out = `CONNECTION INTELLIGENCE MATRIX\n${deal.prospect} — ${deal.role} @ ${deal.company}\n${deal.opportunity ? `Deal: ${deal.opportunity}\n` : ""}\n`;
  MATRIX_ROWS.forEach(row => {
    out += `── ${row} ──\n`;
    MATRIX_COLS.forEach(col => {
      const key = `${row}|${col}`;
      const val = cells[key] || "";
      let tag = "";
      if (val.trim()) {
        const src = aiSources[key];
        if (src && src.source === "inferred") tag = " [INFERRED]";
        else if (src) tag = " [SOURCED]";
        else tag = " [REP INTEL]";
      }
      out += `  ${MATRIX_META[key].label} (${col}): ${val.trim() ? val + tag : "[EMPTY — discovery gap]"}\n`;
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
// Shared context both halves of the analysis need: the intel, the pattern
// library, and the classification rule. Sent with each of the two parallel calls.
const ANALYSIS_CONTEXT = (matrixText, deal) => `You are the Semper Selling® Matrix Analysis Engine. Senior sales strategist. Find cross-cell gaps that reveal what's actually happening in this deal beneath the surface. A finding that restates one cell is not a finding.

Deal: ${deal.prospect} (${deal.role} @ ${deal.company})${deal.opportunity ? ` | ${deal.opportunity}` : ""}

${matrixText}

INTEL RELIABILITY — cells are tagged:
- [SOURCED] and [REP INTEL] = reliable. State conclusions from these plainly.
- [INFERRED] = an AI hypothesis, not confirmed. Hedge anything resting on it, and lean toward classifying such findings VALIDATE (needs confirming) rather than OPENING or THREAT.

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

CLASSIFY EVERY FINDING before anything feeds downstream — this is the core logic:
- OPENING = works FOR the rep (a motivated champion, an opening to advance, alignment to exploit).
- THREAT = works AGAINST the rep (a risk that could stall or kill the deal).
- VALIDATE = can't tell yet — a hypothesis to confirm or kill on the next call. Anything resting on [INFERRED] intel defaults here.
A pattern existing does NOT make it a risk. Do not manufacture threats to fill a quota.

VOICE — CRITICAL, APPLIES TO EVERY WORD YOU WRITE:
This is an intelligence assessment, not a dossier of facts. You are inferring what's happening beneath the surface — so never state your interpretation as fact. Verifiable items pulled straight from the Matrix (their title, a number, a date they signed something) can be stated plainly. But the moment you interpret what those facts MEAN, hedge it — and vary the hedge so it never sounds like a template: "The data suggests…", "The patterns reveal…", "This points to…", "It appears…", "One read of this is…", "The gap between X and Y suggests…", "This likely means…". A rep should feel they're reading a sharp analyst's read they can confirm, not a biography. Write plainly enough that a busy sales rep gets it in one pass and can act on it today — no jargon, no box/pattern numbers, no theory.`;

// CALL 1 of 2 — the READ. Diagnosis half. Smaller + faster than one big call.
const ANALYSIS_PROMPT_READ = (matrixText, deal) => `${ANALYSIS_CONTEXT(matrixText, deal)}

YOUR JOB: produce the READ of this deal — what the Matrix is telling the rep. Follow the VOICE rule above without exception: this is inference, written as hypothesis, never as fact. Output ONLY these fields:
- MATRIX_HEALTH: STRONG FOUNDATION / PARTIAL PICTURE / FLYING BLIND. matrix_health_note: one honest sentence on how much weight this read can bear given what's sourced vs. inferred.
- BRIEFING: 1-2 short paragraphs interpreting what's happening in the customer's world. Lead the interpretation with hedging language ("The data suggests…", "The patterns reveal…", "This points to…") — do not open with a flat declarative like "Dick is a CRO under pressure." Customer's world only. Specific names/numbers from the Matrix, but framed as what they imply, not stated fact. P11 firing = a second short paragraph on the urgency window in their world.
- FINDINGS: 2-3 sharpest cross-cell gaps, each classified OPENING / THREAT / VALIDATE. Headline ALL CAPS, max 8 words, specific to this deal. Body: 2-3 sentences that name the two data points and then hedge what the gap between them reveals ("This suggests…", "The pattern points to…"). No box refs. Most urgent first.
- GAPS: the intelligence that's missing and why it costs the rep. Empty/thin cells only, max 4, HIGH or MEDIUM. For each: "note" = plain-language statement of what you don't know and why it matters to the deal. "ask" = ONE question the rep can ask to fill it, built in the iQ style — anchor it in something you DO know from the Matrix, reach toward the missing piece, and where possible touch what's personally at stake for them. Written so the rep can say it out loud as-is.

Return ONLY this JSON, no backticks, no markdown:
{"matrix_health":"","matrix_health_note":"","briefing":[""],"findings":[{"classification":"","headline":"","finding":""}],"gaps":[{"cell":"","label":"","severity":"","note":"","ask":""}]}`;

// CALL 2 of 2 — the PLAN. Action half. Runs in parallel with the READ.
const ANALYSIS_PROMPT_PLAN = (matrixText, deal) => `${ANALYSIS_CONTEXT(matrixText, deal)}

YOUR JOB: produce the PLAN for the rep's next call. First, silently identify the THREAT / OPENING / VALIDATE findings and the HIGH gaps yourself using the rules above. Then output ONLY these action fields, each written plainly enough that the rep can execute it today:

- DEFENSE: Build ONLY from THREAT findings and HIGH gaps. Max 3. Each: a specific scenario that could stall or kill the deal (hedged — "The risk here is…", "This could mean…") + one countermove the rep can take in the next 5 business days. Title ALL CAPS. If there are no THREATs and no HIGH gaps, return an empty array — do not invent risks.

- OBJECTIVE (Setting a Clear Objective): one customer-centered objective for the next call, in this exact shape. who = the person. feels = what they should FEEL by the end (drawn from a Current State reality — make them feel understood). sees_how = the shift in how they SEE their situation (from the sharpest finding). takes_steps = the concrete STEP they agree to (the countermove from the top THREAT, or if no threats, the move that presses the top OPENING). fallback = the minimum viable win if that step stalls mid-call.

- OPENER (Command Attention with Insight): one opening the rep can say out loud, built in three moves — (1) LEAD WITH THE UNEXPECTED: a surprising stat, emerging trend, or new challenge from THEIR world; (2) PERSONALIZED RELEVANCE: tie it directly to their department, responsibility, legacy, or budget; (3) END WITH A QUESTION that makes them think about impact, readiness, risk, or opportunity. Put the full spoken opener in "text". In "note": if Future State intel is thin so the opener can't be truly specific to this person, say so plainly and name which cells to fill to sharpen it.

- iQ QUESTIONS: exactly 3, each a TRUE Insight Question built with the iQ Formula — ONE Current Reality + ONE Future State + ONE Personal Impact. Rules, non-negotiable:
  • Current Reality = one thing true for them NOW (a pressure, metric, constraint, or relationship from the Current State row). Exactly one — never stack two.
  • Future State = one thing they're moving TOWARD (an ambition, goal, or public commitment from the Future State row). Exactly one.
  • Personal Impact = what it costs THEM personally if the gap doesn't close — career, reputation, legacy, positioning. NEVER operational or financial ("efficiency", "cost savings" are banned here).
  • The question lives ENTIRELY in the customer's world. Never name a solution, product, or what they "need." If a solution assumption sneaks in, it's not an iQ question — rewrite it.
  • Build the language in three varied moves so no two questions sound alike: OPEN (anchor current reality): Considering / Given that / In light of / As you reflect on / Based on what you've seen with… → CONNECT (link to future state, where the tension lives): while also / at the same time that / as you're also / combined with / while simultaneously… → CLOSE (invite reflection on personal stake): what concerns you most about / how confident are you / what would it mean if / what has this revealed about / what's become clear about…
  • Bank each: VALIDATION (tests a finding you believe is true) or DISCOVERY (opens something you can't yet see). At least one of each. Give Early/Mid/Late timing.
  GOOD (follow this shape): "Given that you're personally signing county-level contracts, while positioning Kofile as one scaled platform across the combined HF Group units, what concerns you most about how much of that integration is riding on you specifically?"
  NOT an iQ (do NOT produce this — operational, no personal stake, names a need): "What are your biggest integration challenges and what tools would help?"

- WATCH_FOR / WATCH_OUT: exactly 2 each. Observable signals only, tied to this person's intel.
- NEXT_ACTIONS: exactly 3. What, to whom, by when + the cost of not doing it. Never "prepare questions."

Return ONLY this JSON, no backticks, no markdown:
{"defense":[{"title":"","body":""}],"objective":{"who":"","feels":"","sees_how":"","takes_steps":"","fallback":""},"opener":{"text":"","note":""},"iq_questions":[{"bank":"","question":"","timing":""},{"bank":"","question":"","timing":""},{"bank":"","question":"","timing":""}],"watch_for":["",""],"watch_out":["",""],"next_actions":["","",""]}`;

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

// ─── RESUME CODE CHIP (header) ─────────────────
function CodeChip({ code, status }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const statusText = status === "saving" ? "saving…"
    : status === "cloud" ? "saved · reopen with code"
    : status === "local" ? "saved on this device"
    : "";
  const statusColor = status === "cloud" ? GREEN : status === "saving" ? "#888" : AMBER;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <button
        onClick={() => { try { navigator.clipboard?.writeText(code); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        title="Copy your resume code — reopen your Matrix on any device"
        style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: "3px", padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = RED; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}
      >
        <span style={{ fontSize: "8px", color: "#888", fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700" }}>CODE</span>
        <span style={{ fontSize: "11px", color: "#fff", fontFamily: MONO, fontWeight: "700", letterSpacing: "0.04em" }}>{code}</span>
        <span style={{ fontSize: "10px", color: copied ? GREEN : "#666", fontFamily: MONO }}>{copied ? "✓ copied" : "⧉"}</span>
      </button>
      {statusText && (
        <span style={{ fontSize: "9px", color: statusColor, fontFamily: MONO, whiteSpace: "nowrap" }}>
          {status === "cloud" ? "☁ " : status === "saving" ? "" : "● "}{statusText}
        </span>
      )}
    </div>
  );
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
                      style={{ background: isAccepted ? "rgba(34,197,94,0.15)" : "transparent", border: `1px solid ${isAccepted ? GREEN : "#333"}`, borderRadius: "3px", padding: "4px 12px", cursor: "pointer", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", color: isAccepted ? GREEN : "#555" }}>
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
                  <span style={{ fontSize: "9px", color: isAccepted ? GREEN : "#555", fontFamily: CONDENSED, letterSpacing: "0.1em", display: "block", marginBottom: "4px" }}>AI FOUND</span>
                  <textarea className="matrix-cell" defaultValue={r.result.intel}
                    onChange={e => setEdited(ed => ({ ...ed, [r.key]: e.target.value }))}
                    style={{ minHeight: "56px", opacity: isAccepted ? 1 : 0.5 }}
                  />
                </div>

                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid #1e1e1e`, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", color: "#444", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>SOURCE</span>
                  {r.result.source === "inferred" ? (
                    <span style={{ fontSize: "10px", color: AMBER, fontFamily: MONO, fontStyle: "italic" }}>~ inferred from organizational context</span>
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
function DealScreen({ onComplete, resumeInfo, onResume, onDiscard, onResumeCode, codeError, clearCodeError }) {
  const [form, setForm] = useState({ prospect: "", role: "", company: "", opportunity: "" });
  const [errors, setErrors] = useState({});
  const [codeInput, setCodeInput] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  const submitCode = async () => {
    if (!codeInput.trim()) return;
    setLoadingCode(true);
    await onResumeCode(codeInput);
    setLoadingCode(false);
  };

  const fields = [
    { key: "prospect",    label: "CONTACT NAME",           textarea: false },
    { key: "role",        label: "TITLE / ROLE",           textarea: false },
    { key: "company",     label: "COMPANY",                textarea: false },
    { key: "opportunity", label: "OPPORTUNITY (optional)", textarea: true  },
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

        {resumeInfo && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GREEN}`, borderRadius: "4px", padding: "16px 18px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontSize: "10px", color: GREEN, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700", marginBottom: "3px" }}>● SAVED MATRIX FOUND</div>
              <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO }}>{resumeInfo.prospect} · {resumeInfo.company}</div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={onResume} style={{ padding: "9px 18px" }}>RESUME →</Btn>
              <Btn variant="ghost" onClick={onDiscard} style={{ padding: "9px 14px" }}>DISCARD</Btn>
            </div>
          </div>
        )}

        {/* Reopen on any device with a resume code */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "4px", padding: "16px 18px", marginBottom: "18px" }}>
          <div style={{ fontSize: "11px", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.12em", fontWeight: "700", marginBottom: "8px" }}>HAVE A CODE? REOPEN YOUR MATRIX</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
            <input
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); if (codeError) clearCodeError(); }}
              onKeyDown={e => e.key === "Enter" && submitCode()}
              placeholder="SEMPER-XXXXX"
              style={{ flex: 1, background: "#0d0d0d", border: `1px solid ${codeError ? "#ff6666" : BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, letterSpacing: "0.06em", outline: "none" }}
              onFocus={e => { e.target.style.borderColor = RED; }}
              onBlur={e => { e.target.style.borderColor = codeError ? "#ff6666" : BORDER; }}
            />
            <Btn onClick={submitCode} disabled={loadingCode || !codeInput.trim()} style={{ padding: "10px 18px" }}>
              {loadingCode ? "LOADING…" : "REOPEN →"}
            </Btn>
          </div>
          {codeError && (
            <div style={{ fontSize: "10px", color: "#ff6666", fontFamily: MONO, marginTop: "8px" }}>
              No Matrix found for that code. Check the code, or start a new one below.
            </div>
          )}
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
function AnalysisLoader({ steps }) {
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

      {steps && steps.length > 0 && (
        <div style={{ marginTop: "30px", display: "flex", flexDirection: "column", gap: "9px", minWidth: "260px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "11px", opacity: s.done ? 1 : 0.35, transition: "opacity 0.4s" }}>
              <span style={{ width: "13px", color: s.done ? GREEN : "#555", fontFamily: MONO, fontSize: "11px", textAlign: "center" }}>{s.done ? "✓" : "○"}</span>
              <span style={{ fontSize: "11px", color: s.done ? "#fff" : "#888", fontFamily: MONO, letterSpacing: "0.03em" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 2: MATRIX EDITOR ──────────────────
function MatrixScreen({ deal, cells, setCells, aiSources, setAiSources, onComplete, onBack, code, cloudStatus }) {
  const [focused, setFocused] = useState(null);
  const [showCodeNote, setShowCodeNote] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeSteps, setAnalyzeSteps] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searchRan, setSearchRan] = useState(false);
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

  // Fetch + parse one cell's intel
  const searchOneCell = async (key, row, col) => {
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
      const textBlocks = (data.content || []).filter(b => b.type === "text");
      const lastText = textBlocks[textBlocks.length - 1];
      if (lastText && lastText.text) {
        const cleaned = lastText.text
          .replace(/]*>|<\/antml:cite>/g, "")
          .replace(/```json|```/g, "")
          .trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.intel) parsed.intel = parsed.intel.replace(/<[^>]*>/g, "").trim();
            return { key, row, col, existing, result: parsed };
          } catch { return { key, row, col, existing, result: { found: false } }; }
        }
      }
      return { key, row, col, existing, result: { found: false } };
    } catch {
      return { key, row, col, existing, result: { found: false } };
    }
  };

  // ── AI SEARCH — batched 3 at a time so a full room doesn't hit rate limits ──
  const handleSearch = async () => {
    setSearching(true);
    setSearchProgress("Searching public sources...");

    const allKeys = [];
    MATRIX_ROWS.forEach(row => MATRIX_COLS.forEach(col => allKeys.push({ key: `${row}|${col}`, row, col })));

    const results = [];
    let completed = 0;
    const BATCH = 3;

    for (let i = 0; i < allKeys.length; i += BATCH) {
      const batch = allKeys.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(({ key, row, col }) => searchOneCell(key, row, col)));
      results.push(...batchResults);
      completed += batch.length;
      setSearchProgress(`Searching... ${completed} of 9 complete`);
    }

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
    setAnalyzeSteps(ANALYSIS_STAGES.map(s => ({ label: s.label, done: false })));
    const matrixText = matrixToText(cells, deal, aiSources);

    // Gentle timed progress so the bars always feel alive. Advances up to the
    // second-to-last stage; the real completions finish the rest.
    let idx = 0;
    const ticker = setInterval(() => {
      idx = Math.min(idx + 1, ANALYSIS_STAGES.length - 1);
      setAnalyzeSteps(ANALYSIS_STAGES.map((s, i) => ({ label: s.label, done: i < idx })));
    }, 2000);

    try {
      // Two smaller calls, in parallel. Wall time ≈ the slower half, not the sum
      // — and neither half is big enough to approach the timeout.
      const [readPart, planPart] = await Promise.all([
        callAnalysis(ANALYSIS_PROMPT_READ(matrixText, deal), 1800),
        callAnalysis(ANALYSIS_PROMPT_PLAN(matrixText, deal), 2600),
      ]);
      clearInterval(ticker);
      setAnalyzeSteps(ANALYSIS_STAGES.map(s => ({ label: s.label, done: true })));

      // Merge the two halves. If one half fails, keep whatever came back.
      const analysis = (readPart || planPart) ? { ...(readPart || {}), ...(planPart || {}) } : null;
      onComplete(cells, matrixText, analysis, aiSources);
    } catch {
      clearInterval(ticker);
      onComplete(cells, matrixToText(cells, deal, aiSources), null, aiSources);
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

      {analyzing && <AnalysisLoader steps={analyzeSteps} />}

      {searchResults !== null && (
        <SearchReviewModal results={searchResults} onAccept={handleAcceptResults} onClose={() => setSearchResults(null)} />
      )}

      {/* Header */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "6px 12px", fontSize: "11px" }}>← BACK</Btn>
        <div style={{ width: "1px", height: "24px", background: "#333" }} />
        <span style={{ color: RED, fontSize: "15px", fontWeight: "700", fontFamily: CONDENSED, letterSpacing: "0.1em" }}>CONNECTION INTELLIGENCE MATRIX</span>
        <span style={{ color: "#fff", fontSize: "11px", fontFamily: MONO }}>{deal.prospect} · {deal.company}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "center" }}>
          <CodeChip code={code} status={cloudStatus} />
          <div style={{ width: "1px", height: "20px", background: "#333" }} />
          <span style={{ fontSize: "10px", color: filled === 9 ? GREEN : "#fff", fontFamily: MONO }}>{filled}/9 cells</span>
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
            <div style={{ marginBottom: "14px", padding: "9px 13px", background: uploadMsg.ok ? "rgba(34,197,94,0.08)" : "rgba(204,0,0,0.08)", border: `1px solid ${uploadMsg.ok ? "rgba(34,197,94,0.3)" : "rgba(204,0,0,0.3)"}`, borderRadius: "3px", fontSize: "11px", color: uploadMsg.ok ? GREEN : "#ff6666", fontFamily: MONO }}>
              {uploadMsg.ok ? "✓ " : "✕ "}{uploadMsg.text}
            </div>
          )}

          {showCodeNote && code && (
            <div style={{ marginBottom: "14px", padding: "10px 14px", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${RED}`, borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ fontSize: "11px", color: "#fff", fontFamily: MONO, lineHeight: "1.6" }}>
                Your work saves automatically. Write down your code <strong style={{ color: RED }}>{code}</strong> to reopen this Matrix on your phone or laptop anytime.
              </div>
              <button onClick={() => setShowCodeNote(false)} style={{ background: "transparent", border: "none", color: "#666", fontSize: "16px", cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
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
                const isInferred = hasAiSource && aiSources[key].source === "inferred";
                // Inferred cells get a loud amber left border so a guess never reads as a fact.
                const leftBorder = isInferred ? AMBER : (isFocused ? RED : hasValue ? "#383838" : "#1e1e1e");
                return (
                  <div key={key} style={{ background: SURFACE, border: `1px solid ${isFocused ? RED : hasValue ? "#383838" : "#1e1e1e"}`, borderLeft: `3px solid ${leftBorder}`, borderRadius: "3px", padding: "14px 14px 12px 14px", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "6px", minHeight: "130px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <div style={{ fontSize: "9px", color: isFocused ? RED : "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", fontWeight: "700", transition: "color 0.2s", textTransform: "uppercase", paddingTop: "2px" }}>
                          {meta.label}
                        </div>
                        {hasAiSource && !isInferred && (
                          <a href={aiSources[key].source} target="_blank" rel="noopener noreferrer"
                            title={`Source: ${aiSources[key].source_label || aiSources[key].source}`}
                            style={{ fontSize: "8px", color: "#4a9eff", fontFamily: MONO, textDecoration: "none", paddingTop: "2px", whiteSpace: "nowrap" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >↗ source</a>
                        )}
                        {isInferred && (
                          <span style={{ fontSize: "8px", color: AMBER, fontFamily: MONO, paddingTop: "2px", fontWeight: "700", letterSpacing: "0.06em" }}>~ INFERRED · CONFIRM</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION HEADER (shared) ───────────────────
function SectionTag({ children }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
      <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>{children}</span>
    </div>
  );
}

const CLASS_META = {
  OPENING: { color: GREEN, label: "OPENING" },
  THREAT: { color: RED, label: "THREAT" },
  VALIDATE: { color: AMBER, label: "VALIDATE" },
};

// ─── SCREEN 3: ANALYSIS REPORT ─────────────────
function AnalysisScreen({ deal, analysis, aiSources, cells, code, cloudStatus, onBack, onRedo }) {
  const hasAnalysis = !!analysis;

  const exportHTML = useCallback(() => {
    if (!analysis) return;
    const esc = (s) => (s == null ? "" : String(s));
    const findingsHTML = (analysis.findings || []).map(f => {
      const c = CLASS_META[f.classification] || { color: RED, label: "" };
      return `<div style="margin-bottom:20px;">${f.classification ? `<span style="display:inline-block;font-size:9px;font-weight:700;color:#000;background:${c.color};border-radius:2px;padding:2px 8px;letter-spacing:0.14em;font-family:'Barlow Condensed',sans-serif;margin-bottom:7px;">${c.label}</span>` : ""}${f.headline ? `<div style="font-size:11px;font-weight:700;color:${c.color};font-family:'Barlow Condensed',sans-serif;letter-spacing:0.16em;margin:6px 0 7px;">${esc(f.headline)}</div>` : ""}<p style="font-size:13px;color:#ccc;line-height:1.75;">${esc(f.finding)}</p></div>`;
    }).join("");

    const obj = analysis.objective || {};
    const objHTML = (obj.who || obj.feels) ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">YOUR NEXT-CALL OBJECTIVE</span></div>
<p style="font-size:14px;color:#fff;line-height:1.8;margin-bottom:14px;">This conversation succeeds if <strong>${esc(obj.who)}</strong> <span style="color:#22c55e;">FEELS</span> ${esc(obj.feels)}, <span style="color:#22c55e;">SEES HOW</span> ${esc(obj.sees_how)}, and <span style="color:#22c55e;">TAKES STEPS</span> ${esc(obj.takes_steps)}.</p>
${obj.fallback ? `<p style="font-size:12px;color:#888;line-height:1.7;"><strong style="color:#f59e0b;">FALLBACK:</strong> ${esc(obj.fallback)}</p>` : ""}</div>` : "";

    const op = analysis.opener || {};
    const openerHTML = op.text ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">OPENING INSIGHT</span></div><p style="font-size:14px;color:#fff;line-height:1.85;font-style:italic;border-left:3px solid #CC0000;padding-left:16px;">"${esc(op.text)}"</p>${op.note ? `<p style="font-size:11px;color:#888;line-height:1.7;margin-top:10px;">${esc(op.note)}</p>` : ""}</div>` : "";

    const gapsHTML = (analysis.gaps || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">INTELLIGENCE GAPS</span></div>${(analysis.gaps || []).map(g => `<div style="border-left:3px solid ${g.severity === "HIGH" ? "#CC0000" : "#f59e0b"};padding-left:14px;margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:${g.severity === "HIGH" ? "#CC0000" : "#f59e0b"};font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;margin-bottom:5px;">${esc(g.cell)} — ${esc(g.severity)}</div><div style="font-size:12px;color:#ccc;line-height:1.6;">${esc(g.note)}</div>${g.ask ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #222;"><span style="font-size:9px;color:#22c55e;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;font-weight:700;">ASK</span><div style="font-size:12px;color:#fff;line-height:1.65;font-style:italic;margin-top:3px;">"${esc(g.ask)}"</div></div>` : ""}</div>`).join("")}</div>` : "";

    const defenseHTML = (analysis.defense || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">DEFENSE STRATEGY</span></div>${(analysis.defense || []).map(d => `<div style="border-left:3px solid #CC0000;padding-left:14px;margin-bottom:20px;"><div style="font-size:11px;font-weight:700;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;margin-bottom:6px;">${esc(d.title)}</div><div style="font-size:12px;color:#ccc;line-height:1.65;">${esc(d.body)}</div></div>`).join("")}</div>` : "";

    const iqHTML = (analysis.iq_questions || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">iQ QUESTIONS — USE NEXT CALL</span></div>${(analysis.iq_questions || []).map(q => `<div style="border-left:3px solid #CC0000;padding-left:16px;margin-bottom:20px;">${q.bank ? `<span style="display:inline-block;font-size:9px;font-weight:700;color:#000;background:${q.bank === "VALIDATION" ? "#22c55e" : "#f59e0b"};border-radius:2px;padding:2px 8px;letter-spacing:0.12em;font-family:'Barlow Condensed',sans-serif;margin-bottom:8px;">${esc(q.bank)}</span>` : ""}<div style="font-size:13px;color:#fff;line-height:1.8;font-style:italic;margin:6px 0;">"${esc(q.question)}"</div>${q.timing ? `<div style="font-size:10px;color:#888;">${esc(q.timing)}</div>` : ""}</div>`).join("")}</div>` : "";

    const signalsHTML = ((analysis.watch_for || []).length || (analysis.watch_out || []).length) ? `<div style="margin-bottom:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px;"><div><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:14px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">MOMENTUM SIGNALS</span></div>${(analysis.watch_for || []).map(s => `<div style="font-size:12px;color:#ccc;line-height:1.65;margin-bottom:10px;">● ${esc(s)}</div>`).join("")}</div><div><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:14px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">RESISTANCE SIGNALS</span></div>${(analysis.watch_out || []).map(s => `<div style="font-size:12px;color:#ccc;line-height:1.65;margin-bottom:10px;">● ${esc(s)}</div>`).join("")}</div></div>` : "";

    const actionsHTML = (analysis.next_actions || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">RECOMMENDED NEXT ACTIONS</span></div>${(analysis.next_actions || []).map((a, i) => `<div style="display:flex;gap:14px;margin-bottom:14px;"><div style="font-size:18px;font-weight:900;color:#CC0000;font-family:'Barlow Condensed',sans-serif;">${i + 1}</div><div style="font-size:12px;color:#ccc;line-height:1.7;">${esc(a)}</div></div>`).join("")}</div>` : "";

    const briefingHTML = (Array.isArray(analysis.briefing) ? analysis.briefing : analysis.briefing ? [analysis.briefing] : []).map(p => `<p style="font-size:13px;color:#ccc;line-height:1.85;margin-bottom:18px;font-style:italic;">${esc(p)}</p>`).join("");

    // The Matrix itself — so the downloaded report is a complete record of the rep's intel
    const gridHTML = cells ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">THE MATRIX</span></div>
<table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;">
<tr><td style="width:90px;"></td>${MATRIX_COLS.map(c => `<th style="background:#CC0000;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.12em;padding:8px;text-align:center;border:2px solid #0a0a0a;">${c}</th>`).join("")}</tr>
${MATRIX_ROWS.map(r => `<tr><th style="background:#CC0000;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.08em;padding:8px;text-align:center;border:2px solid #0a0a0a;">${r}</th>${MATRIX_COLS.map(c => `<td style="background:#141414;color:#ccc;font-size:10px;line-height:1.55;padding:10px;vertical-align:top;border:2px solid #0a0a0a;">${esc(cells[`${r}|${c}`]) || "<span style='color:#555;'>—</span>"}</td>`).join("")}</tr>`).join("")}
</table></div>` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Matrix Analysis — ${esc(deal.prospect)}</title><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#fff;font-family:'IBM Plex Mono',monospace;padding:40px 48px;max-width:1000px;margin:0 auto;line-height:1.6}@media print{body{background:#fff;color:#000}}</style></head><body>
<div style="font-size:10px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.18em;margin-bottom:8px;">◆ CONNECTION INTELLIGENCE — MATRIX ANALYSIS</div>
<div style="font-size:38px;font-weight:900;color:#fff;font-family:'Barlow Condensed',sans-serif;line-height:1;">${esc(deal.prospect).toUpperCase()}</div>
<div style="font-size:13px;color:#fff;font-family:'IBM Plex Mono',monospace;margin-top:6px;margin-bottom:28px;">${esc(deal.role)}${deal.company ? ` · ${esc(deal.company)}` : ""}${deal.opportunity ? ` · ${esc(deal.opportunity)}` : ""}</div>
${analysis.matrix_health_note ? `<div style="border-left:3px solid #CC0000;padding:10px 16px;margin-bottom:32px;font-size:13px;color:#ccc;font-style:italic;">● ${esc(analysis.matrix_health_note)}</div>` : ""}
${gridHTML}
${(briefingHTML || findingsHTML) ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:20px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">WHAT THE MATRIX IS TELLING YOU</span></div>${briefingHTML}${findingsHTML}</div>` : ""}
${objHTML}
${openerHTML}
${gapsHTML}
${defenseHTML}
${iqHTML}
${signalsHTML}
${actionsHTML}
<div style="border-top:1px solid #333;padding-top:20px;font-size:10px;color:#666;">Semper Selling® Connection Intelligence Matrix — Semper Mind © 2026 · ${esc(deal.prospect)} · ${esc(deal.company)}</div>
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
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
          <CodeChip code={code} status={cloudStatus} />
          <div style={{ width: "1px", height: "20px", background: "#333" }} />
          {hasAnalysis && (
            <button onClick={exportHTML}
              style={{ background: "none", border: `1px solid #333`, color: "#888", borderRadius: "3px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.color = GREEN; }}
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
                <SectionTag>WHAT THE MATRIX IS TELLING YOU</SectionTag>
                {(Array.isArray(analysis.briefing) ? analysis.briefing : analysis.briefing ? [analysis.briefing] : []).map((para, i) => (
                  <p key={i} style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.85", margin: 0, marginBottom: "18px", fontStyle: "italic" }}>{para}</p>
                ))}
                {(analysis.findings||[]).length > 0 && (
                  <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid #1e1e1e" }}>
                    {(analysis.findings||[]).map((f, i) => {
                      const cm = CLASS_META[f.classification] || { color: RED, label: null };
                      const headline = typeof f === "object" ? f.headline : null;
                      const text = typeof f === "object" ? f.finding : f;
                      return (
                        <div key={i} style={{ marginBottom: "22px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
                            {cm.label && (
                              <span style={{ fontSize: "9px", fontWeight: "700", color: "#000", background: cm.color, borderRadius: "2px", padding: "2px 8px", letterSpacing: "0.14em", fontFamily: CONDENSED }}>{cm.label}</span>
                            )}
                            {headline && <div style={{ fontSize: "11px", fontWeight: "700", color: cm.color, fontFamily: CONDENSED, letterSpacing: "0.16em" }}>{headline}</div>}
                          </div>
                          <p style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.75", margin: 0 }}>{text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* YOUR NEXT-CALL OBJECTIVE */}
            {analysis.objective && (analysis.objective.who || analysis.objective.feels) && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <SectionTag>YOUR NEXT-CALL OBJECTIVE</SectionTag>
                <p style={{ fontSize: "15px", color: "#fff", fontFamily: MONO, lineHeight: "1.9", margin: 0 }}>
                  This conversation succeeds if <strong style={{ color: "#fff" }}>{analysis.objective.who}</strong>{" "}
                  <span style={{ color: GREEN, fontWeight: "700" }}>FEELS</span> {analysis.objective.feels},{" "}
                  <span style={{ color: GREEN, fontWeight: "700" }}>SEES HOW</span> {analysis.objective.sees_how}, and{" "}
                  <span style={{ color: GREEN, fontWeight: "700" }}>TAKES STEPS</span> {analysis.objective.takes_steps}.
                </p>
                {analysis.objective.fallback && (
                  <div style={{ marginTop: "16px", paddingLeft: "14px", borderLeft: `3px solid ${AMBER}` }}>
                    <span style={{ fontSize: "10px", color: AMBER, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.14em" }}>FALLBACK — IF PLAN A STALLS</span>
                    <p style={{ fontSize: "12px", color: "#aaa", fontFamily: MONO, lineHeight: "1.7", marginTop: "6px" }}>{analysis.objective.fallback}</p>
                  </div>
                )}
              </div>
            )}

            {/* OPENING INSIGHT */}
            {analysis.opener && analysis.opener.text && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <SectionTag>OPENING INSIGHT</SectionTag>
                <p style={{ fontSize: "14px", color: "#fff", fontFamily: MONO, lineHeight: "1.9", fontStyle: "italic", paddingLeft: "16px", borderLeft: `3px solid ${RED}`, margin: 0 }}>"{analysis.opener.text}"</p>
                {analysis.opener.note && (
                  <p style={{ fontSize: "11px", color: "#888", fontFamily: MONO, lineHeight: "1.7", marginTop: "12px" }}>{analysis.opener.note}</p>
                )}
              </div>
            )}

            {/* GAPS + DEFENSE */}
            {((analysis.gaps||[]).length > 0 || (analysis.defense||[]).length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                {(analysis.gaps||[]).length > 0 && (
                  <div>
                    <SectionTag>INTELLIGENCE GAPS</SectionTag>
                    <div style={{ fontSize: "10px", color: "#fff", fontFamily: MONO, marginBottom: "14px" }}>
                      <span style={{ borderLeft: `2px solid ${RED}`, paddingLeft: "6px", marginRight: "12px" }}>HIGH — critical to close</span>
                      <span style={{ borderLeft: `2px solid ${AMBER}`, paddingLeft: "6px" }}>MEDIUM — worth exploring</span>
                    </div>
                    {(analysis.gaps||[]).map((gap, i) => (
                      <div key={i} style={{ borderLeft: `3px solid ${gap.severity === "HIGH" ? RED : AMBER}`, paddingLeft: "14px", marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: gap.severity === "HIGH" ? RED : AMBER, fontFamily: CONDENSED, letterSpacing: "0.12em", marginBottom: "5px" }}>{gap.cell}</div>
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.6" }}>{gap.note}</div>
                        {gap.ask && (
                          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #1e1e1e" }}>
                            <span style={{ fontSize: "9px", color: GREEN, fontFamily: CONDENSED, letterSpacing: "0.12em", fontWeight: "700", display: "block", marginBottom: "3px" }}>ASK</span>
                            <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65", fontStyle: "italic" }}>"{gap.ask}"</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {(analysis.defense||[]).length > 0 && (
                  <div>
                    <SectionTag>DEFENSE STRATEGY</SectionTag>
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
                <SectionTag>iQ QUESTIONS — USE NEXT CALL</SectionTag>
                {(analysis.iq_questions||[]).map((q, i) => {
                  const question = typeof q === "object" ? q.question : q;
                  const timing = typeof q === "object" ? q.timing : null;
                  const bank = typeof q === "object" ? q.bank : null;
                  const bankColor = bank === "VALIDATION" ? GREEN : AMBER;
                  return (
                    <div key={i} style={{ marginBottom: "22px", paddingLeft: "16px", borderLeft: `3px solid ${RED}` }}>
                      {bank && (
                        <span style={{ display: "inline-block", fontSize: "9px", fontWeight: "700", color: "#000", background: bankColor, borderRadius: "2px", padding: "2px 8px", letterSpacing: "0.12em", fontFamily: CONDENSED, marginBottom: "8px" }}>{bank}</span>
                      )}
                      <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.8", fontStyle: "italic", marginBottom: timing ? "8px" : 0 }}>"{question}"</div>
                      {timing && <div style={{ fontSize: "10px", color: "#888", fontFamily: MONO, lineHeight: "1.6" }}>{timing}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SIGNALS */}
            {((analysis.watch_for||[]).length > 0 || (analysis.watch_out||[]).length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                {(analysis.watch_for||[]).length > 0 && (
                  <div>
                    <SectionTag>MOMENTUM SIGNALS</SectionTag>
                    {(analysis.watch_for||[]).map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: GREEN, flexShrink: 0, marginTop: "5px" }} />
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65" }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
                {(analysis.watch_out||[]).length > 0 && (
                  <div>
                    <SectionTag>RESISTANCE SIGNALS</SectionTag>
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
                <SectionTag>RECOMMENDED NEXT ACTIONS</SectionTag>
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
  const [cells, setCells] = useState(emptyMatrix);
  const [aiSources, setAiSources] = useState({});
  const [result, setResult] = useState(null);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [code, setCode] = useState(null);
  const [cloudStatus, setCloudStatus] = useState("idle"); // idle | saving | cloud | local
  const [codeError, setCodeError] = useState(false);
  const saveTimer = useRef(null);

  // On load: check for a saved session and offer to resume.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.deal) setResumeInfo(parsed);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Autosave: instant local save every change, plus a debounced cloud save
  // under the resume code so the Matrix reopens on any device.
  useEffect(() => {
    if (!hydrated || !deal || !code) return;
    const session = { screen, deal, cells, aiSources, result, code };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch { /* storage full or unavailable — fail quietly */ }

    setCloudStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await cloudSave(code, session);
      // "cloud" = reopens anywhere · "local" = KV not provisioned yet, this device only
      setCloudStatus(ok ? "cloud" : "local");
    }, 1200);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, screen, deal, cells, aiSources, result, code]);

  const resumeSession = () => {
    setDeal(resumeInfo.deal);
    setCells(resumeInfo.cells || emptyMatrix());
    setAiSources(resumeInfo.aiSources || {});
    setResult(resumeInfo.result || null);
    setCode(resumeInfo.code || genCode());
    setScreen(resumeInfo.screen && resumeInfo.screen !== "deal" ? resumeInfo.screen : "matrix");
    setResumeInfo(null);
  };

  const discardSession = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setResumeInfo(null);
  };

  const startNewDeal = (d) => {
    setDeal(d);
    setCells(emptyMatrix());
    setAiSources({});
    setResult(null);
    setCode(genCode());
    setScreen("matrix");
  };

  // Reopen a Matrix from any device using its resume code.
  const resumeByCode = async (input) => {
    const clean = input.trim().toUpperCase();
    const full = clean.startsWith("SEMPER-") ? clean : `SEMPER-${clean}`;
    const session = await cloudLoad(full);
    if (!session) { setCodeError(true); return; }
    setDeal(session.deal);
    setCells(session.cells || emptyMatrix());
    setAiSources(session.aiSources || {});
    setResult(session.result || null);
    setCode(session.code || full);
    setResumeInfo(null);
    setScreen(session.screen && session.screen !== "deal" ? session.screen : "matrix");
  };

  if (screen === "deal") {
    return (
      <div>
        <style>{FONTS}</style>
        <DealScreen
          onComplete={startNewDeal}
          resumeInfo={resumeInfo}
          onResume={resumeSession}
          onDiscard={discardSession}
          onResumeCode={resumeByCode}
          codeError={codeError}
          clearCodeError={() => setCodeError(false)}
        />
      </div>
    );
  }

  if (screen === "matrix") {
    return (
      <div>
        <style>{FONTS}</style>
        <MatrixScreen
          deal={deal}
          cells={cells}
          setCells={setCells}
          aiSources={aiSources}
          setAiSources={setAiSources}
          code={code}
          cloudStatus={cloudStatus}
          onBack={() => setScreen("deal")}
          onComplete={(c, matrixText, analysis, srcs) => {
            setResult({ cells: c, matrixText, analysis, aiSources: srcs });
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
          cells={result?.cells}
          code={code}
          cloudStatus={cloudStatus}
          onBack={() => setScreen("matrix")}
          onRedo={() => setScreen("matrix")}
        />
      </div>
    );
  }

  return null;
}