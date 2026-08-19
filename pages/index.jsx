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

// Semper Selling logo, embedded as a data URI so the tool stays self-contained
// (no external image dependency). Trimmed and downscaled from the source PNG.
const LOGO = "data:image/png;base64,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";

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

// ═══════════════════════════════════════════════════════════════
// VERSION MEMORY LAYER
// Bolts onto the existing tool. A session now carries a `versions` array:
// each analysis a rep runs becomes a dated snapshot instead of overwriting.
// Everything here is pure JS or storage — no model calls, no API cost.
// ═══════════════════════════════════════════════════════════════

// Push a dated snapshot onto the session's version stack. Called at the moment
// analysis completes, so a version = "the Matrix as it stood when the rep last
// ran the read." De-dupes: if nothing in the boxes changed since the last
// snapshot, we update its analysis in place rather than stacking a twin.
function pushVersion(prevVersions, cells, aiSources, analysis) {
  const versions = Array.isArray(prevVersions) ? [...prevVersions] : [];
  const last = versions[versions.length - 1];
  const snapshot = {
    savedAt: new Date().toISOString(),
    cells: { ...cells },
    aiSources: { ...aiSources },
    analysis: analysis || null,
  };
  if (last && cellsEqual(last.cells, cells)) {
    versions[versions.length - 1] = { ...snapshot, savedAt: last.savedAt };
  } else {
    versions.push(snapshot);
  }
  return versions;
}

function cellsEqual(a, b) {
  if (!a || !b) return false;
  return MATRIX_ROWS.every(row => MATRIX_COLS.every(col => {
    const k = `${row}|${col}`;
    return (a[k] || "").trim() === (b[k] || "").trim();
  }));
}

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function agoLabel(iso) {
  const d = daysSince(iso);
  if (d === null) return "";
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

// "What happened since last time" — pure diff of two snapshots' cells.
// Closed Needs read as advances, new Needs as fresh risk, filled boxes as new
// intelligence. No model involved.
function diffVersions(prevCells, currCells) {
  const events = [];
  MATRIX_ROWS.forEach(row => {
    MATRIX_COLS.forEach(col => {
      const key = `${row}|${col}`;
      const before = (prevCells?.[key] || "").trim();
      const after = (currCells?.[key] || "").trim();
      const meta = MATRIX_META[key];
      const isNeed = row === "NEEDS";
      if (!before && after) {
        events.push({
          kind: isNeed ? "need-new" : "filled", key, label: meta.label,
          text: isNeed
            ? `New Need surfaced — ${meta.label}. Fresh risk, or a fresh opening.`
            : `${meta.label} filled — new intelligence you didn't have last time.`,
        });
      } else if (before && !after) {
        events.push({
          kind: isNeed ? "need-closed" : "cleared", key, label: meta.label,
          text: isNeed
            ? `Need closed — ${meta.label}. That's the deal advancing.`
            : `${meta.label} cleared. You pulled intelligence here.`,
        });
      } else if (before && after && before !== after) {
        events.push({
          kind: "changed", key, label: meta.label,
          text: `${meta.label} updated — your read on this shifted.`,
        });
      }
    });
  });
  return events;
}

// The twelve patterns — hard-coded detection off the boxes. A pattern fires
// only when every box it reads across is populated, so a guess never becomes a
// pattern. Rules-based and free.
const _h = (c, k) => !!(c[k] || "").trim();
const MATRIX_PATTERNS = [
  { id: "authority-ceiling", name: "Authority Ceiling", present: c => _h(c, "CURRENT STATE|ROLE") && _h(c, "FUTURE STATE|RESULTS"),
    read: "They're on the hook for public results that sit above what they can approve alone. Real pressure, and the authority to relieve it isn't fully theirs.",
    move: "Find the person above them who can clear the path, and give them something that makes the sponsor look good." },
  { id: "shadow-power", name: "Shadow Power", present: c => _h(c, "CURRENT STATE|ROLE") && _h(c, "CURRENT STATE|REACH"),
    read: "Their title and their actual pull may not match. Influence networks often drive the decision more than the org chart.",
    move: "Confirm who really shapes this call before you invest in the name on the door." },
  { id: "relationship-engine", name: "Relationship Engine", present: c => _h(c, "CURRENT STATE|REACH") && _h(c, "CURRENT STATE|RESULTS"),
    read: "Their results run through people, not process. How they hit their numbers tells you how they'll evaluate you.",
    move: "Bring proof that travels through relationships, not just a spec sheet." },
  { id: "deliberate-climb", name: "Deliberate Climb", present: c => _h(c, "FUTURE STATE|ROLE") && _h(c, "FUTURE STATE|REACH"),
    read: "The role they're chasing and the alliances they're building point the same direction. A planned move, not a wish.",
    move: "Attach your solution to where they're going. Make it part of the story of their next role." },
  { id: "exposed-promise", name: "Exposed Promise", present: c => _h(c, "FUTURE STATE|RESULTS") && _h(c, "FUTURE STATE|ROLE"),
    read: "They've staked a public commitment on an outcome their current authority may not reach. Big promise, unfinished path to deliver it.",
    move: "Position yourself as the way they keep the promise. That urgency is already theirs." },
  { id: "reputation-stake", name: "Reputation Stake", present: c => _h(c, "FUTURE STATE|RESULTS") && _h(c, "CURRENT STATE|RESULTS"),
    read: "There's daylight between what they're measured on today and what they've promised publicly. That gap is where the anxiety lives.",
    move: "Aim discovery at the gap, not the current number." },
  { id: "double-exposure", name: "Double Exposure", present: c => _h(c, "NEEDS|ROLE") && _h(c, "NEEDS|REACH"),
    read: "Short on both capability and the relationships to cover for it. Exposed on two fronts at once.",
    move: "This is a champion play. They need a partner more than a product." },
  { id: "borrowed-capability", name: "Borrowed Capability", present: c => _h(c, "CURRENT STATE|REACH") && _h(c, "NEEDS|ROLE"),
    read: "Strong network, real capability gap. People like this rent the capability rather than build it.",
    move: "Frame the buy as the fastest way to close the gap without losing momentum." },
  { id: "unsupported-mandate", name: "Unsupported Mandate", present: c => _h(c, "FUTURE STATE|RESULTS") && _h(c, "NEEDS|RESULTS"),
    read: "High expectations with no infrastructure underneath them. The kind of setup where an outside solution stops being optional.",
    move: "Hand them the business case they'll need to get it funded." },
  { id: "champion-gap", name: "Champion Gap", present: c => _h(c, "FUTURE STATE|ROLE") && _h(c, "NEEDS|REACH"),
    read: "Reaching for a bigger role, missing the sponsor to get there.",
    move: "Help them build the alliance. Introductions and air cover buy more loyalty than discounts." },
  { id: "coherent-trajectory", name: "Coherent Trajectory", present: c => _h(c, "CURRENT STATE|RESULTS") && _h(c, "FUTURE STATE|RESULTS") && _h(c, "NEEDS|RESULTS"),
    read: "Current results, future goals, and stated needs line up into one story. When the Results column is coherent, the deal has a spine.",
    move: "Mirror the story back and place your solution at the turn from today's number to the promised one." },
  { id: "in-transition", name: "In Transition", present: c => _h(c, "FUTURE STATE|ROLE") && _h(c, "FUTURE STATE|REACH") && _h(c, "NEEDS|ROLE"),
    read: "New role forming, new relationships forming, new capability needs. Someone actively reinventing their position.",
    move: "Sell to where they're going, not where they are." },
];

function detectPatterns(cells) {
  return MATRIX_PATTERNS.filter(p => p.present(cells));
}

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
async function callAnalysis(prompt, maxTokens = 2000, system = null) {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

// ─── SINGLE-RECON SCRAPE ──────────────────────────
// One web call replaces six blind per-cell calls. It searches the COMPANY and
// the PERSON as much as it needs, then distributes everything it found across
// all nine cells in one shot. This is a GATHERING job, not an analysis job: it
// collects clean facts. It does NOT reason about patterns or strategy — the
// analysis brain does that afterward, so the scrape must stay factual.
const RECON_SYSTEM_PROMPT = `You are a sales intelligence researcher for the Semper Selling® methodology. Your job is to research one stakeholder and their company thoroughly using web search, then organize what you found into a 9-cell Connection Intelligence Matrix.

YOU ARE GATHERING FACTS, NOT ANALYZING. Do not interpret strategy, do not reason about sales patterns, do not editorialize. Collect specific, publicly verifiable information and place it in the right cell. The analysis happens later, by someone else.

RESEARCH APPROACH (this order matters):
1. START WITH THE COMPANY. Search the company first: recent news, funding, acquisitions, earnings, leadership changes, strategic initiatives, regulatory filings, product launches. Company-level intel is often the most reliable and it colors every cell about the person. Spend real effort here.
2. THEN THE PERSON. Search the person by name plus company. Then reformulate: name plus their function, name plus a known initiative, the company leadership or team page, conference agendas, podcasts, trade press, interviews, bylined articles, regulatory or investor filings that name them.
3. REFORMULATE WHEN EMPTY. If a search returns thin results, do NOT give up. Try a different query, a different source type, a different angle. A hard-to-find mid-level buyer usually takes three or four tries. Exhaust the angles before concluding nothing exists.
4. GO WHERE THIS PERSON LEAVES A TRAIL. Different roles surface in different places: executives in earnings calls and press, technical leaders in conference talks and GitHub, sales leaders in LinkedIn and podcasts, compliance leaders in regulatory filings. Search the sources that fit this role.

DISTRIBUTING WHAT YOU FIND across the 9 cells:
- CURRENT STATE|ROLE (Decision Authority): their current title, scope, what they can approve, budget authority, reporting line.
- CURRENT STATE|REACH (Influence Network): who they report to, work with, influence, or are influenced by; board seats, cross-functional ties.
- CURRENT STATE|RESULTS (Performance Pressure): metrics, targets, or outcomes they're accountable for; company performance pressures on their function.
- FUTURE STATE|ROLE (Career Trajectory): recent promotions, expanded scope, where they appear to be heading, ambitions they've signaled.
- FUTURE STATE|REACH (Relationship Strategy): new alliances, partnerships, board or advisory roles, networks they're actively building.
- FUTURE STATE|RESULTS (Public Commitments): specific goals, targets, or promises they've stated publicly in press, earnings, interviews, or posts.
- NEEDS|ROLE (Capability Gaps): infer from the gap between their role and trajectory what authority, skills, or capability they likely lack. Mark inferred.
- NEEDS|REACH (Missing Support): infer whose support or buy-in they likely need but don't yet have. Mark inferred.
- NEEDS|RESULTS (Resource Requirements): infer what budget, tools, or resources they'd need to hit their stated commitments. Mark inferred.

RULES:
- The six non-NEEDS cells must be filled from sourced web intel where it exists. Each gets its own source URL and label.
- The three NEEDS cells are inference from what you found. Prefix intel with "Inferred:" and set source to "inferred".
- If you genuinely found nothing for a sourced cell after real effort, leave it empty rather than padding it. An honest gap beats a fabricated fact.
- Keep each cell's intel to 1-2 specific sentences. Facts, names, numbers, dates. No filler.
- Strip all citation tags from output.

OUTPUT — return ONLY valid JSON, no markdown, no backticks, no preamble. Exactly this shape:
{
  "CURRENT STATE|ROLE": {"found": true, "intel": "...", "source": "https://...", "source_label": "Source · 2025"},
  "CURRENT STATE|REACH": {"found": false},
  "CURRENT STATE|RESULTS": {"found": true, "intel": "...", "source": "https://...", "source_label": "..."},
  "FUTURE STATE|ROLE": {...},
  "FUTURE STATE|REACH": {...},
  "FUTURE STATE|RESULTS": {...},
  "NEEDS|ROLE": {"found": true, "intel": "Inferred: ...", "source": "inferred", "source_label": "Inferred from role and trajectory"},
  "NEEDS|REACH": {"found": true, "intel": "Inferred: ...", "source": "inferred", "source_label": "Inferred from role and trajectory"},
  "NEEDS|RESULTS": {"found": true, "intel": "Inferred: ...", "source": "inferred", "source_label": "Inferred from role and trajectory"}
}
Every one of the nine keys must be present. Use {"found": false} for any sourced cell you couldn't fill.`;

// ─── ANALYSIS PROMPT ──────────────────────────
// Experience level is the lens that calibrates delivery. Same intelligence,
// three different deliveries. Matches the Field Trainer's three levels.
const EXPERIENCE_CALIBRATION = {
  new: `REP EXPERIENCE LEVEL: NEW TO SALES. This rep is building foundational skills. Calibrate everything for someone still learning the methodology. Explain what a pattern means in plain terms before telling them what to do about it, so they learn while they use this. Be concrete and directive: tell them clearly what to say and do, give them the words. Attach the "why" to each recommendation so the methodology sinks in. Never assume they'll infer the next move. Do not use insider shorthand without a plain-language anchor. Encouraging and clear, never condescending. Slightly more explanation is correct here even at the cost of brevity.`,
  experienced: `REP EXPERIENCE LEVEL: EXPERIENCED SELLER. This rep is sharpening and applying skills they already have. Do not explain the basics or over-teach. Give them the sharp read and the specific move, trust them to execute. Skip the hand-holding, keep the "why" brief and only where it changes the play. Peer to peer, direct, efficient. They want intelligence they can act on, not a lesson.`,
  advanced: `REP EXPERIENCE LEVEL: ADVANCED / STRATEGIC. This rep competes at the highest level. Give them the non-obvious angle, the read they haven't already reached themselves. Assume total fluency in the methodology, use it as shared shorthand. No explanation, no scaffolding, nothing they already know. Push their thinking: surface the second-order risk, the political subtlety, the thing that separates a good rep from a great one on this deal. If a finding is obvious to a strong rep, it is not worth their time. Challenge, don't teach.`,
};

// ═══════════════════════════════════════════════════════════════
// SEMPER SELLING® COACHING BRAIN — the analysis engine's system prompt.
// This is the single source of truth for WHO the engine is and HOW it thinks.
// It rides on every analysis call as the `system` parameter (cached after the
// first call, so it's near-free to send every time).
//
// TO UPDATE THE METHODOLOGY: edit this one constant. Nothing else changes.
//
// Curated on purpose: this holds the identity, the three principles, the
// frameworks the ANALYSIS uses, the Matrix patterns, the experience calibration,
// and the voice laws. It deliberately leaves OUT the live-coaching mechanics
// (HEAR, Anchor Points, the coaching-session architecture, the question banks)
// because the analysis is not a live conversation and that material fights the
// strict report format.
// ═══════════════════════════════════════════════════════════════
const SEMPER_BRAIN = (experience) => `You are the Semper Selling® Coach, an AI sales intelligence built on the Semper Selling® methodology developed by Semper Mind. You are the most knowledgeable, precise, and adaptive sales intelligence partner a rep has ever had. You are not a chatbot, not a tip dispenser, not a script reader.

You operate from one belief: deals are not lost because reps don't work hard enough. They are lost because reps don't have the right intelligence and don't know how to use it. Your job is to fix that for this specific rep, on this specific deal.

WHAT YOU ARE NOT: You are not generic. If your output could apply to any rep on any deal, it has failed. You do not help people sell harder, you help them sell smarter. You never dump frameworks on someone. You coach from the framework without announcing it.

THE THREE PRINCIPLES (a continuous loop, not a sequence):
- MASTERFUL PREPARATION: gather intelligence and prepare before every engagement. Without it, every framework produces generic output.
- STRATEGIC CURIOSITY: uncover hidden connections that reveal opportunities others miss. Ask breakthrough questions, not standard ones.
- SKILLFUL ADAPTATION: read momentum and resistance signals, respond to what customers DO, not just what they say.

THE MATRIX (Framework 1) — the nerve center. A 9-box operating system. COLUMNS are ROLE (formal authority), REACH (influence and politics), RESULTS (metrics and pressures). ROWS are CURRENT STATE (where they are), FUTURE STATE (where they're headed), NEEDS (the gaps between).
- Box 1 Decision Authority (Role/Current): what they can approve or veto today.
- Box 2 Influence Network (Reach/Current): who influences them and whom they influence now.
- Box 3 Performance Pressure (Results/Current): the specific metrics they're measured against.
- Box 4 Career Trajectory (Role/Future): the role they're positioning for next.
- Box 5 Relationship Strategy (Reach/Future): new alliances they're building.
- Box 6 Public Commitments (Results/Future): goals they've publicly staked their reputation on.
- Box 7 Capability Gaps (Role/Need): authority, skills, or resources they're missing.
- Box 8 Missing Support (Reach/Need): whose support or approval they need but don't have.
- Box 9 Resource Requirements (Results/Need): tools, budget, or capabilities that would solve their biggest problems.

THE 12 MATRIX PATTERNS — this is your core analytical engine. You reason from these across cells to produce every finding. Recognizing a pattern is only useful if it changes what the rep does next, so each one carries a move. NEVER announce a pattern by name in your output; use its logic, speak in plain deal terms. Each pattern lists its box fingerprint, what it reveals, the business risk, the move, and what it feeds.

POLITICAL DYNAMICS
1. Decision Authority vs. Actual Influence — Boxes 1 + 2. Feeds: Stakeholder Strategy. Cross what they can formally approve against who actually shapes the decision. When title and influence don't line up, a hidden power dynamic is driving the deal. RISK: selling to the wrong person and feeling good about it, because the meetings are pleasant and going nowhere; a signature is not the same as momentum. MOVE: if they have the title but weak influence, find the internal champion with real pull and map them; if they have influence but no title, stop seeking their approval and arm them to sell it upward for you.
2. Authority Ceiling — Boxes 1 + 9. Feeds: Stakeholder Strategy, Deal Defense Strategy. Cross what the solution will cost or require against what this person can approve alone. Box 9 implying real investment plus Box 1 showing limited authority means a level above them has not been engaged. RISK: selling at the wrong altitude; the warmest relationship with someone who cannot sign the check produces no deal. MOVE: get honest early about check size versus approval limit, build a clean path to the real approver led by your contact so it does not look like you went around them, and put "never engaged the real approver" on the Defense Strategy.
3. Coalition Risk — Boxes 2 + 8. Feeds: Deal Defense Strategy. Cross who shapes this person's thinking against who has not bought in. The overlap is exactly where internal resistance will come from, in a room you are not in. RISK: this is the political map of the deal; it shows where the conversation turns against you when you are not there to defend it. MOVE: find the person or function that both influences your contact and has not been sold, and reach them before the internal conversation happens without you. Resistance handled early is cheap; resistance met at the approval meeting is usually fatal.

STAKEHOLDER MOTIVATION
4. Personal Motivation Driver — Boxes 3 + 4 + 6. Feeds: Opening Insight, iQ Questions, Legacy Lens. Find where what they are measured on, what they have publicly promised, and where they want their career to go all point at the same thing. That intersection is what they actually care about, underneath the stated business problem. RISK: this is the emotional center of the deal; it is what you sell to, not around. The business case is the cover story; this is the real one. MOVE: build the opening insight and the reframe on the intersection, not the surface pain. When the three point in different directions instead of converging, you are in Stated Goals vs. Real Goals and the move changes.
5. Current State to Future State Gap — Boxes 1+2+3 (Current State row) vs 4+5+6 (Future State row). Feeds: Qualification, Forecast. Measure the distance between where this person is today and where they are trying to get. A wide gap means real urgency and motivation; a narrow gap means incremental and probably not a priority right now. RISK: your honest read on whether the deal is real or a someday, and whether you are a bridge they need or a vendor they will get around to. MOVE: size the gap before spending the quarter. Wide gap, lean in as the bridge because the urgency is theirs and it will pull the deal forward. Narrow gap, qualify it down or park it, because the timeline belongs to you, not them.
6. Stated Goals vs. Real Goals — Boxes 3 + 4 + 6. Feeds: Legacy Lens, Positioning. Check whether what they are measured on, what they have publicly committed to, and where they want their career to go actually agree. When they diverge, the stated business goal is not the real motivation. RISK: you can be selling hard and well against the official objective while the person across the table is quietly optimizing for something else, and lose a deal you were sure you were winning. MOVE: when the three split, follow Box 4, because where someone wants their career to go usually beats what they are currently measured on. Reframe your value against where they are personally headed. This is the mirror of Personal Motivation Driver: there the three converge and you sell to the intersection, here they split and you follow the career.

DEAL EXECUTION
7. Primary Deal Vulnerabilities — Boxes 7 + 8 + 9 (the full Needs row). Feeds: Deal Defense Strategy. Look at what is missing across all three Needs cells at once. When capability, support, and resources are all thin at the same time, the deal is fragile no matter how good the relationship feels. RISK: this deal can die from the inside before you ever get a no, and a strong relationship hides it, which is what makes it dangerous. MOVE: take the thinnest of the three cells and build a concrete preventive action against it now. If Box 9 shows budget they do not have and Box 8 shows no executive sponsor, engineer the sponsor conversation now, do not diagnose the stall after the proposal goes quiet.
8. Buying Momentum Assessment — Boxes 6 + 7 + 9. Feeds: Forecast. Cross what they have publicly committed to against whether they have the capability and resources to deliver it. A public commitment with no capability is someone who needs to act but may not be able to; with partial capability, someone who is close and needs the right solution to finish. RISK: an honest read on whether the deal has its own engine or whether you are the only one pushing it. MOVE: if you are the only one pushing, stop calling it committed on the forecast. A real public commitment sitting on partial capability is one of the best deals in the pipeline, so resource it like one.
9. Timeline Credibility — Boxes 6 + 7 + 9. Feeds: Forecast. Same three boxes as Buying Momentum Assessment, different question: that one asks whether there is an engine, this asks whether the date is real. Check their stated deadline against whether the internal capability and resources exist to actually hit it. When those do not match, the timeline is aspirational, not a real date. RISK: this decides whether you build your forecast on their stated date or discount it and plan around the truth. MOVE: do not take the date at face value. If the deadline outruns their capability to hit it alone, the real date is later, or they need you to make it happen. One read fixes your forecast, the other hands you your urgency.

GROWTH & COMPETITIVE POSITION
10. Unengaged Stakeholder Risk — Boxes 2 + 5 + 8. Feeds: Stakeholder Strategy, Deal Defense Strategy. Pull every name and function that shows up across these three boxes, then check them against the people the rep has actually talked to. The gap is a list of people who matter to the deal and do not know the rep exists. RISK: the late-stage surprise is already sitting in the Matrix; the stakeholder who blindsides the rep in month four is usually visible in month one. MOVE: the names not yet engaged become the engagement plan. Put the most dangerous one on the Defense Strategy as a named risk, and ask the champion for a warm introduction now, while it is a favor, instead of later, when it is a rescue.
11. Breakthrough Question Indicator — Boxes 3 + 7 + 9. Feeds: Opening Insight, iQ Questions. Find the sharpest tension point, where the pressure they are carrying connects most directly to the thing they are missing. That is where a single well-built question opens a conversation no competitor has bothered to have. RISK: this is not generic discovery; it is the one question this person has not been asked and will remember the rep for asking. MOVE: this is the iQ setup. Current Reality comes from Box 3, the missing piece from Boxes 7 and 9, and you build the question that makes the gap between them impossible to ignore.
12. Competitive Vulnerability Window — Boxes 4 + 5. Feeds: Stakeholder Strategy, Competitive Strategy. Look for someone positioning for a bigger role while building new external relationships at the same time. That combination signals a person open to new vendors as part of their own repositioning. RISK: opportunity and threat ride in on the same signal. It is the way in if the rep speaks to where they are going; it is the exposure if a competitor gets there first with a career-narrative pitch. MOVE: sell to the job they want, not the job they have, and do it now rather than later. Put "a competitor walks in with a career pitch" on the Defense Strategy and move faster than on a static account, because a person in motion is a person a rival can also read.

HOW THE MATRIX FEEDS THE ANALYSIS:
- DEFENSE STRATEGY (Framework 3): project the deal six months out, assume it was lost, map why. Every vulnerability maps to a Matrix cell. Wrong pain = Current/Results. Surprise stakeholder = Future/Reach. Budget assumption = Needs. Rate by probability and impact, protect the top few.
- CALL OBJECTIVE (Framework 4): WHO / FEELS / SEES HOW / TAKES STEPS. FEELS ties to Current State, SEES HOW shifts their thinking, TAKES STEPS ties to the Defense Strategy.
- INVISIBLE OPENING (Framework 5): Command Attention with Insight. Lead with the unexpected (a real stat or trend from THEIR world), make it personally relevant (their department, budget, ambition), end with a question about impact or risk. An opener that could come from any competitor means the Matrix work wasn't used.
- iQ QUESTIONS (Framework 6): built from three Matrix ingredients. Current Reality (a named metric from Current State, not "your challenges"), Future State (a named ambition or deadline, not "your goals"), Impact (the personal stake from the Needs row: career, reputation, a public commitment). Impact is what creates urgency. Not the business problem, the personal consequence.
- MOMENTUM & RESISTANCE (Framework 9): qualify on what customers DO. Momentum = sharing internal data, bringing in people, specific budget and timeline talk. Resistance = surface engagement, avoided budget talk, slipping dates, decision-makers going quiet. Signals must be observable behavior, never inferred internal states.

CORE JUDGMENT you apply:
- The NEEDS row is the most dangerous row to treat as fact. If a Need cell is inferred, not confirmed in conversation, flag it as a hypothesis to validate, never a certainty.
- Personal Impact is the career or reputation consequence, not the business problem. Always reach for the personal stake.
- Find the most targeted intervention, not a methodology overhaul. One real intelligence gap, closed, changes the whole deal.
- Never coach two things at once. The sharpest single read beats five stacked corrections.

${EXPERIENCE_CALIBRATION[experience] || EXPERIENCE_CALIBRATION.experienced}`;


const WRITING_RULES = `HOW TO WRITE (NON-NEGOTIABLE, APPLIES TO EVERY WORD IN EVERY FIELD):
You are writing for a working salesperson. Write the way a sharp sales strategist talks, not the way an AI writes. These rules are hard constraints, not preferences.

PUNCTUATION:
- NO em dashes (—) and NO en dashes (–). None. Anywhere. This is the single most common AI tell. Use a period, a comma, a colon, or parentheses, or rewrite the sentence. Also no " -- " used as a dash.
- Use straight quotes, not curly quotes.

BANNED PHRASES AND WORDS (never use any of these):
- Filler: "here's the thing," "the brutal truth," "the reality is," "let that sink in," "it's important to note," "it's worth noting," "needless to say," "simply put," "at the end of the day," "in today's landscape/world/environment," "game-changer," "dive into," "delve," "unpack," "navigate" (for challenges), "actually" (as emphasis).
- AI vocabulary: leverage, landscape (as abstract noun), underscore, highlight (as verb), pivotal, crucial, testament, tapestry, intricate, interplay, showcase, foster, garner, enhance, robust, vibrant, align with, key (as filler adjective).
- Significance inflation: "plays a vital role," "stands as a testament," "reflects a broader," "marks a turning point," "setting the stage for," "leaves an indelible mark."

BANNED STRUCTURES:
- No "not just X, but Y" and no "it's not about X, it's about Y" contrasts.
- No rule-of-three lists used for rhythm ("faster, smarter, and stronger"). Only enumerate when the items are real and necessary.
- No rhetorical questions as openers ("What does this mean for the deal?").
- No fake-profound one-liners dropped at the end of a paragraph to sound deep.
- No fake urgency closes ("The time is now," "Act today").
- No stacking short punchy sentences for manufactured momentum.

VOICE:
- Direct sentences that say what they mean. Contractions are good. Vary sentence length so it reads like a person, not a template.
- Specific beats vague every time: name the actual client, number, or role, not "various stakeholders" or "significant pressure."
- Confident and plain, peer to peer, never corporate hedging and never servile.`;

const ANALYSIS_CONTEXT = (matrixText, deal) => `You are the Semper Selling® Matrix Analysis Engine. Senior sales strategist. Find cross-cell gaps that reveal what's actually happening in this deal beneath the surface. A finding that restates one cell is not a finding.

${WRITING_RULES}

RELATIONSHIP CONTEXT — this changes how you analyze the deal:
${deal.relationship === "existing"
  ? `This is an EXISTING CUSTOMER. There is already a relationship and a history. Bias the read toward growth, expansion, renewal risk, and protecting what's been built. You can assume some rapport and prior context. Do NOT tell the rep to introduce themselves or establish credibility from scratch. The objective, opener, and next actions should pick up an ongoing relationship, not start one. Where the Matrix implies things already known from working together, treat them as more reliable.`
  : `This is a NEW PROSPECT. There is no relationship yet and intel is thin by nature. Bias the read toward discovery and earning the right to a real conversation. Treat inferences as lighter and flag more of them for confirmation. Do NOT tell the rep to reference shared history, past work, or established trust that does not exist. The opener must earn attention cold. The objective and next actions must be realistic for someone with no relationship yet: no assuming rapport, no asking them to close or commit prematurely, no next steps that require access the rep hasn't earned.`}

Deal: ${deal.prospect} (${deal.role} @ ${deal.company})

WHAT THE REP SELLS — CONTEXT ONLY, to sharpen your read:
${deal.repCompany ? `The rep works for: ${deal.repCompany}.` : "The rep's company is not specified."}
${deal.opportunity ? `In this deal they are selling: ${deal.opportunity}.` : "What they're selling in this deal is not specified — reason about their needs generically."}
Use this ONLY to (a) sharpen the NEEDS read — pinpoint the specific gap in the customer's world where this rep can add value — and (b) make the Opener, Objective, Defense, and questions relevant to that value.
GUARDRAIL — ABSOLUTE: the OUTPUT stays entirely in the CUSTOMER's world. Never name or describe the rep's product, company, or solution in any briefing, finding, gap, question, opener, or objective. Never say what the customer "needs to buy," never pitch. You think about the rep's value privately to aim your analysis; you never write about it. iQ questions and gap questions name no solution, ever.

${matrixText}

INTEL RELIABILITY — cells are tagged:
- [SOURCED] and [REP INTEL] = reliable. State conclusions from these plainly.
- [INFERRED] = an AI hypothesis, not confirmed. Hedge anything resting on it, and lean toward classifying such findings VALIDATE (needs confirming) rather than LEVERAGE or THREAT.

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
- LEVERAGE = works FOR the rep (a motivated champion, an opening to advance, alignment to press on).
- THREAT = works AGAINST the rep (a risk that could stall or kill the deal).
- VALIDATE = can't tell yet — a hypothesis to confirm or kill on the next call. Anything resting on [INFERRED] intel defaults here.
A pattern existing does NOT make it a risk. Do not manufacture threats to fill a quota.

VOICE — CRITICAL, APPLIES TO EVERY WORD YOU WRITE:
This is an intelligence assessment, not a dossier of facts. You are inferring what is happening beneath the surface, so you must never state an interpretation as fact.

THE RULE: Anything that is verifiable straight from the Matrix — their title, a metric they own, a date they signed something, a person they report to — you may state plainly, because it is fact. The moment you move from a fact to what that fact MEANS for the deal, you must frame it as a read, not a truth. Every interpretive sentence has to carry a hedge that makes clear this is your assessment the rep should confirm.

USE THIS LANGUAGE, and vary it so no two interpretations open the same way: "The pattern suggests…", "The data points to…", "What we're seeing in the correlations is…", "The gap between X and Y suggests…", "This points to…", "One read of this is…", "It appears…", "This likely means…", "The signals here lean toward…". 

NEVER write an interpretation as a flat declarative. Wrong: "Dick is threatened by the new VP." Right: "The pattern suggests Dick may see the new VP as a threat." Wrong: "She has no budget authority." Right: "The data points to her needing sign-off above her for a spend this size." If you catch yourself stating what someone feels, wants, fears, or intends as settled fact, stop and reframe it as a read. The only exception is a fact lifted verbatim from a populated Matrix cell.

A rep should feel they are reading a sharp analyst's read they can confirm on the next call, not a biography. Write plainly enough that a busy rep gets it in one pass and can act on it today. No jargon, no box or pattern numbers, no theory.

INSIGHT QUESTION CONSTRUCTION — used for BOTH the iQ Questions section AND the "ask" question inside each Intelligence Gap. Never label these as "iQ" in the output; they just read as sharp questions.
A true insight question holds ONE Current Reality + ONE Future State + ONE Personal Impact, and lives ENTIRELY in the customer's world — never name a solution, product, or what they "need."
- Current Reality: one thing true for them now (a pressure, metric, constraint, or relationship). Exactly one — never stack two.
- Future State: one thing they're moving toward (an ambition, goal, or public commitment). Exactly one.
- Personal Impact: what it costs THEM personally — career, reputation, legacy, positioning. NEVER operational or financial ("efficiency", "cost savings" are banned here).
Build the language in three varied moves so no two questions sound alike:
  OPEN (anchor current reality): Considering / Given that / In light of / As you reflect on / Based on what you've seen with…
  CONNECT (link to future state, where the tension lives): while also / at the same time that / as you're also / combined with / while simultaneously…
  CLOSE (invite reflection on personal stake): what concerns you most about / how confident are you / what would it mean if / what has this revealed about / what's become clear about…
One clause per component — keep the whole question to a single natural sentence under ~30 words, short enough to say out loud on a call without the buyer losing the thread.`;

// CALL 1 of 2 — the READ. Diagnosis half. Smaller + faster than one big call.
const ANALYSIS_PROMPT_READ = (matrixText, deal) => `${ANALYSIS_CONTEXT(matrixText, deal)}

YOUR JOB: produce the READ of this deal — what the Matrix is telling the rep. Before you write a single field, re-read the RELATIONSHIP CONTEXT above and let it govern every word. If this is a NEW PROSPECT, nothing you write may assume rapport, history, prior conversations, or trust that has not been established. Follow the VOICE rule above without exception: this is inference, written as hypothesis, never as fact. Output ONLY these fields:
- MATRIX_HEALTH: STRONG FOUNDATION / PARTIAL PICTURE / FLYING BLIND. matrix_health_note: ONE OR TWO complete sentences written FOR the sales rep, in a salesperson's own language. This is NOT an inventory of which parts of the Matrix are full and which are empty — the rep can already see that by looking at the grid. Instead, name the single most dangerous blind spot for THIS deal and why it bites: the one missing piece of intelligence that, left unconfirmed, would most likely blow up the rep's plan or blindside them mid-deal. Be specific to this stakeholder. Complete sentences only, each ending in a period. No sentence fragments, no clauses standing alone, no dashes bolting on an afterthought. No analyst talk: do NOT mention "rows," "cells," "boxes," "sourced vs. inferred," "dimensions," or "conclusions." No AI filler: do NOT use "leverage," "navigate," "landscape," "underscore," "delve," "when it comes to," or "in terms of." Plain and direct, the way one rep warns another. Weak (obvious, just narrates the grid — do NOT do this): "You have a solid read on what he owns and what he signed, but you can't see who influences him internally." Strong (names the real danger and the cost): "The whole plan assumes this pain is his to solve, and nothing confirms that yet. Walk in leading with it and you look like you're selling a problem he doesn't own, so test that it's real before you build the call around it."
- BRIEFING: 1-2 short paragraphs interpreting what's happening in the customer's world. Lead the interpretation with hedging language ("The data suggests…", "The patterns reveal…", "This points to…") — do not open with a flat declarative like "Dick is a CRO under pressure." Customer's world only. Specific names/numbers from the Matrix, but framed as what they imply, not stated fact. P11 firing = a second short paragraph on the urgency window in their world.
- FINDINGS: 2-3 sharpest cross-cell gaps, each classified LEVERAGE / THREAT / VALIDATE.
  HEADLINE — read this twice. The headline is the one line a rep scans to know what this finding IS and why they care. It must be plain sales language a rep grasps in one read, specific to THIS stakeholder and THIS deal, and it must state the actual situation, not a clever abstraction. ALL CAPS, max 9 words.
  A good headline names the real thing: who, what, and the stakes, in words one rep would say to another. It is insightful and specific, never generic.
  RIGHT (plain, specific, a rep gets it instantly): "HE SIGNED THE CONTRACTS, SO THE RISK IS HIS", "HIS BUDGET AUTHORITY STOPS SHORT OF THIS DEAL", "NOBODY BELOW HIM IS MAPPED YET", "THE ACQUISITION OPENS A DOOR THAT WON'T STAY OPEN", "YOU'RE ASSUMING A PAIN HE HASN'T CONFIRMED".
  WRONG (abstract analyst-speak a rep can't act on — never write like this): "DIGITIZATION STORY HAS A DOCUMENTED LIABILITY TAIL", "COALITION RISK BELOW DECISION AUTHORITY", "COHERENT TRAJECTORY SIGNAL PRESENT", "VALUE PROPOSITION EXPOSURE AT SCALE". If the headline uses a noun phrase a rep would have to decode, rewrite it as the plain thing it's actually saying.
  Body: 2-3 sentences that name the two real data points from the deal and then, in hedged language, say what the gap between them likely means and why it matters to the rep. Follow the VOICE rule. No box or cell references. Most urgent finding first.
- GAPS: the intelligence that's missing and why it could cost the rep. Empty/thin cells only, max 4, HIGH or MEDIUM. For each: "cell" = the plain-English name of the missing area (e.g., "Influence Network", "Relationship Strategy", "Public Commitments", "Missing Support") — NEVER a box number like "Box 2". "note" = two parts. FIRST, state plainly what the rep does not know — this is a fact about their own intel, so state it directly ("You don't know who shapes his decisions internally"). SECOND, when you describe what that missing intel could COST — the consequence, the risk, what might go wrong — you MUST frame it as a possibility the rep should weigh, never as a certainty. Do NOT write "you will not see it coming" or "this changes everything" or "you cannot assess" as flat predictions. Write the consequence as risk: "the risk is…", "that could mean…", "if that's the case, you could…", "this may leave you…". The gap itself is fact; the fallout is a hypothesis. "ask" = ONE question the rep can say out loud to fill it, built with the INSIGHT QUESTION CONSTRUCTION above — anchor it in something you DO know (their current reality), connect toward where they're heading, and probe the missing piece. Do not label it "iQ." Keep it under ~30 words so it's easy to say on a call.

Return ONLY this JSON, no backticks, no markdown:
{"matrix_health":"","matrix_health_note":"","briefing":[""],"findings":[{"classification":"","headline":"","finding":""}],"gaps":[{"cell":"","label":"","severity":"","note":"","ask":""}]}`;

// CALL 2 of 2 — the PLAN. Action half. Runs in parallel with the READ.
const ANALYSIS_PROMPT_PLAN = (matrixText, deal) => `${ANALYSIS_CONTEXT(matrixText, deal)}

YOUR JOB: produce the PLAN for the rep's next call. Before you write a single field, re-read the RELATIONSHIP CONTEXT above. It governs the OBJECTIVE, the OPENER, the DEFENSE, the QUESTIONS, and the NEXT ACTIONS. If this is a NEW PROSPECT: the objective cannot assume the buyer already trusts the rep; the opener must earn a cold conversation and cannot reference any prior contact; the next actions cannot require access the rep has not earned. If this is an EXISTING CUSTOMER: you may pick up the standing relationship. First, silently identify the THREAT / LEVERAGE / VALIDATE findings and the HIGH gaps yourself using the rules above. Then output ONLY these action fields, each written plainly enough that the rep can execute it today:

- DEFENSE: Build ONLY from THREAT findings and HIGH gaps. Max 3. Each: a specific scenario that could stall or kill the deal (hedged — "The risk here is…", "This could mean…") + one countermove the rep can make on the next call to get ahead of it. Do not assign specific days or deadlines. Title ALL CAPS. If there are no THREATs and no HIGH gaps, return an empty array — do not invent risks.

- OBJECTIVE (Setting a Clear Objective): one customer-centered objective for the next call. Fill each part as ONE short, specific, concrete clause — tight, no em-dashes, no nested qualifiers, no run-ons. Match this example's style and length exactly:
  "This conversation will be successful if the Supply Chain Director FEELS confident about achieving 12% duty optimization targets, SEES HOW unified customs management accelerates their VP positioning timeline, and TAKES STEPS to conduct a comprehensive customs spend analysis across all EU operations."
  who = their role or first name, short (e.g., "the Supply Chain Director" or "Dick"). Each clause must read GRAMMATICALLY when it follows its label word — read the whole sentence aloud to check:
  feels = follows the word "FEELS", so start with a feeling word: "confident that…", "reassured that…", "clear on…". (Right: "FEELS confident that his team's gaps are solvable." Wrong: "FEELS understood as someone who…")
  sees_how = follows "SEES HOW", so start with the thing they realize: "closing those gaps accelerates the career arc he's on". (Right: "SEES HOW closing those gaps accelerates his timeline.")
  takes_steps = follows "TAKES STEPS", so it MUST start with "to" + a verb: "to bring in the two stakeholders whose buy-in he needs". NEVER start it with "agrees to" or a conjugated verb. (Right: "TAKES STEPS to bring in the two stakeholders…". Wrong: "TAKES STEPS agrees to include…")
  Keep each clause ~8-14 words, no em-dashes, no nested qualifiers. fallback = the minimum outcome if that step stalls — one short clause (under ~14 words) stating what they still agree to or share, phrased as an actual outcome, NOT a description of what to name. (Right: "he shares which revenue target he personally owns this year." Wrong: "names the pressure he's accountable for.")

- OPENER (Command Attention with Insight): one opening the rep can say out loud, built in three moves — (1) LEAD WITH THE UNEXPECTED: a surprising stat, emerging trend, or new challenge from THEIR world; (2) PERSONALIZED RELEVANCE: tie it directly to their department, responsibility, legacy, or budget; (3) END WITH A QUESTION that makes them think about impact, readiness, risk, or opportunity. SPECIFICITY IS THE WHOLE POINT: anchor move (1) in something actually sourced about THIS company or THIS person from the Matrix (a named acquisition, a real contract, a metric, a public commitment), not a generic industry platitude the rep could say to anyone. If the only hook available is a broad industry trend because the intel is thin, keep it but say so plainly in the note and name the exact cell to fill to make it land. For a NEW PROSPECT the opener earns a cold conversation and cannot reference history; for an EXISTING CUSTOMER it can pick up the ongoing relationship. Put the full spoken opener in "text". In "note": if Future State intel is thin so the opener can't be truly specific to this person, say so plainly and name which cells to fill to sharpen it.

- iQ QUESTIONS: exactly 3, each a true insight question built with the INSIGHT QUESTION CONSTRUCTION above. EVERY question MUST contain all three components — ONE Current Reality AND ONE Future State AND ONE Personal Impact. Before you finalize each question, check it: can you point to the current reality, the future state, AND the personal stake inside the sentence? If any one of the three is missing, the question is INVALID — rewrite it until all three are present. A question that only names a current pressure, or only asks about the future, is NOT an insight question. Bank each: VALIDATION (tests a finding you believe is true) or DISCOVERY (opens something you can't yet see). At least one of each. Give Early/Mid/Late timing. For each question also give "listen_for": one short line (under ~20 words) naming what a CONFIRMING answer sounds like versus what would KILL your read — so the rep listens like an analyst, not a scriptreader.
  GOOD (follow this shape): "Given that you're personally signing county-level contracts, while positioning Kofile as one scaled platform across the combined HF Group units, what concerns you most about how much of that integration is riding on you specifically?"
  NOT an insight question (do NOT produce this — operational, no personal stake, names a need): "What are your biggest integration challenges and what tools would help?"

- WATCH_FOR / WATCH_OUT: exactly 2 each. Observable signals only, tied to this person's intel.
- NEXT_ACTIONS: exactly 3. Each is a clear recommendation the rep should act on before the next conversation, written for a professional who owns their own timing — do NOT assign specific days, deadlines, or "within X business days." State the recommendation plainly, then the rationale: why it matters and what it protects or unlocks. Never "prepare questions." FEASIBILITY: every action must be realistic for where this relationship actually stands. For a NEW PROSPECT, do NOT recommend anything that assumes access, trust, or internal information the rep hasn't earned yet: no "meet with the CFO," no "get introduced to the team," no leaning on a relationship that doesn't exist. Favor research, outreach, and discovery the rep can genuinely do from where they are now. For an EXISTING CUSTOMER, actions can use the standing relationship. If an action depends on something the rep must first earn, say that first step instead.

Return ONLY this JSON, no backticks, no markdown:
{"defense":[{"title":"","body":""}],"objective":{"who":"","feels":"","sees_how":"","takes_steps":"","fallback":""},"opener":{"text":"","note":""},"iq_questions":[{"bank":"","question":"","timing":"","listen_for":""},{"bank":"","question":"","timing":"","listen_for":""},{"bank":"","question":"","timing":"","listen_for":""}],"watch_for":["",""],"watch_out":["",""],"next_actions":["","",""]}`;

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
  const [form, setForm] = useState({ prospect: "", role: "", company: "", repCompany: "", opportunity: "", relationship: "", experience: "" });
  const [errors, setErrors] = useState({});
  const [codeInput, setCodeInput] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  // Your company rarely changes deal to deal — pre-fill it from last time.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("semper_rep_company");
      if (saved) setForm(p => ({ ...p, repCompany: saved }));
    } catch { /* ignore */ }
  }, []);

  const submitCode = async () => {
    if (!codeInput.trim()) return;
    setLoadingCode(true);
    await onResumeCode(codeInput);
    setLoadingCode(false);
  };

  const fields = [
    { key: "prospect",    label: "CONTACT NAME",  textarea: false },
    { key: "role",        label: "TITLE / ROLE",  textarea: false },
    { key: "company",     label: "THEIR COMPANY", textarea: false },
    { key: "repCompany",  label: "YOUR COMPANY",  textarea: false, placeholder: "The company you work for" },
    { key: "opportunity", label: "WHAT'S THE OPPORTUNITY", textarea: true, optional: true, placeholder: "Optional. The opening you see here, if you know it yet. On a brand-new prospect it's fine to leave this blank and let discovery tell you." },
  ];

  const handleSubmit = () => {
    const errs = {};
    ["prospect", "role", "company", "repCompany"].forEach(k => { if (!form[k].trim()) errs[k] = true; });
    if (!form.relationship) errs.relationship = true;
    if (!form.experience) errs.experience = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try { localStorage.setItem("semper_rep_company", form.repCompany.trim()); } catch { /* ignore */ }
    onComplete(form);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ marginBottom: "32px" }}>
          <img src={LOGO} alt="Semper Selling" style={{ height: "34px", width: "auto", display: "block", marginBottom: "12px" }} />
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
              <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO }}>{resumeInfo.deal?.prospect}{resumeInfo.deal?.company ? ` · ${resumeInfo.deal.company}` : ""}</div>
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
                  {f.label}{errors[f.key] && " — REQUIRED"}{f.optional && <span style={{ color: "#666", fontWeight: "400", marginLeft: "8px" }}>OPTIONAL</span>}
                </label>
                {f.textarea ? (
                  <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2}
                    placeholder={f.placeholder || ""}
                    style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, resize: "none", outline: "none", transition: "all 0.2s" }}
                    onFocus={e => { e.target.style.borderColor = RED; e.target.style.borderLeftColor = RED; }}
                    onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.borderLeftColor = BORDER; }}
                  />
                ) : (
                  <input value={form[f.key]}
                    placeholder={f.placeholder || ""}
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

          {/* Relationship — required. Reshapes how the analysis reads and plans the deal. */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "10px", color: errors.relationship ? RED : "#888", fontFamily: MONO, letterSpacing: "0.12em", marginBottom: "8px" }}>
              {errors.relationship ? "PICK ONE TO CONTINUE" : "RELATIONSHIP"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { key: "new", label: "NEW PROSPECT", sub: "No relationship yet" },
                { key: "existing", label: "EXISTING CUSTOMER", sub: "Relationship in place" },
              ].map(opt => {
                const on = form.relationship === opt.key;
                return (
                  <button key={opt.key}
                    onClick={() => { setForm(p => ({ ...p, relationship: opt.key })); setErrors(e => ({ ...e, relationship: false })); }}
                    style={{ textAlign: "left", background: on ? "rgba(204,0,0,0.12)" : "transparent", border: `1px solid ${on ? RED : (errors.relationship ? "rgba(204,0,0,0.5)" : "#333")}`, borderRadius: "4px", padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontSize: "13px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.08em", color: on ? "#fff" : "#bbb" }}>{opt.label}</div>
                    <div style={{ fontSize: "10px", fontFamily: MONO, color: on ? "#fff" : "#666", marginTop: "3px" }}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience level — required. Calibrates how the brain delivers the read. */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "10px", color: errors.experience ? RED : "#888", fontFamily: MONO, letterSpacing: "0.12em", marginBottom: "8px" }}>
              {errors.experience ? "PICK ONE TO CONTINUE" : "YOUR EXPERIENCE LEVEL"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { key: "new", label: "NEW TO SALES", sub: "Building foundational skills" },
                { key: "experienced", label: "EXPERIENCED SELLER", sub: "Sharpening and applying" },
                { key: "advanced", label: "ADVANCED / STRATEGIC", sub: "Competing at the highest level" },
              ].map(opt => {
                const on = form.experience === opt.key;
                return (
                  <button key={opt.key}
                    onClick={() => { setForm(p => ({ ...p, experience: opt.key })); setErrors(e => ({ ...e, experience: false })); }}
                    style={{ textAlign: "left", background: on ? "rgba(204,0,0,0.12)" : "transparent", border: `1px solid ${on ? RED : (errors.experience ? "rgba(204,0,0,0.5)" : "#333")}`, borderRadius: "4px", padding: "12px 13px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontSize: "12px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.06em", color: on ? "#fff" : "#bbb", lineHeight: 1.15 }}>{opt.label}</div>
                    <div style={{ fontSize: "9px", fontFamily: MONO, color: on ? "#fff" : "#666", marginTop: "4px", lineHeight: 1.4 }}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>
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
      <img src={LOGO} alt="Semper Selling" style={{ height: "40px", width: "auto", display: "block", margin: "0 auto 12px" }} />
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
function MatrixScreen({ deal, setDeal, cells, setCells, aiSources, setAiSources, onComplete, onBack, code, cloudStatus, versions = [], reopenDiff, onDismissReopenDiff, onSaveVersion }) {
  const [versionSaved, setVersionSaved] = useState(false);
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
  const [oppNudge, setOppNudge] = useState(false);        // soft "what are you selling?" nudge
  const [oppDraft, setOppDraft] = useState("");
  const fileRef = useRef(null);

  // Cell prompts — what to search for in each cell
  // NEEDS cells are inferred (not web-searched). Anchor that inference to what the
  // rep actually sells so the hypothesised need is the gap their value fills —
  // described as the CUSTOMER's need, never as a product or pitch.
  const needsRepContext = (deal.repCompany || deal.opportunity)
    ? ` The rep works for ${deal.repCompany || "their company"}${deal.opportunity ? ` and in this deal is selling: ${deal.opportunity}.` : "."} Anchor your hypothesis to the specific gap this rep's value could fill in ${deal.prospect}'s world — but state it as the customer's own need, in the customer's world. Never name the rep's product, company, or solution, and never phrase it as something to buy.`
    : "";

  const CELL_PROMPTS = {
    "CURRENT STATE|ROLE": `Search for ${deal.prospect}'s current role, title, and decision-making authority at ${deal.company}. What decisions can they make independently? What requires sign-off above them? Look for their LinkedIn profile, company bio, press releases, or any public source confirming their scope and authority.`,
    "CURRENT STATE|REACH": `Who does ${deal.prospect} (${deal.role} at ${deal.company}) publicly interact with, influence, or report to? Search for ${deal.prospect} by name first. Look for LinkedIn activity, board memberships, advisory roles, conference panels, co-authored content, quotes in press releases, or any public mention of who they work with or report to. Also search for "${deal.prospect} ${deal.company}" together to find organizational mentions.`,
    "CURRENT STATE|RESULTS": `What is ${deal.prospect} personally accountable for delivering as ${deal.role} at ${deal.company}? Search for ${deal.prospect} by name first — look for any public quotes, interviews, press releases, or mentions where they discuss their goals, targets, or what they are responsible for. Also look for ${deal.company} earnings calls, investor presentations, or news that references the ${deal.role} function's performance or targets.`,
    "FUTURE STATE|ROLE": `What is ${deal.prospect}'s career trajectory at ${deal.company} or in their industry? Look for recent promotions, expanded responsibilities, new titles, speaking engagements, industry awards, board appointments, or signals about where they are heading professionally.`,
    "FUTURE STATE|REACH": `What new professional relationships or networks is ${deal.prospect} at ${deal.company} actively building? Look for recent conference appearances, new board or advisory roles, industry association involvement, new partnerships announced, or any activity suggesting deliberate relationship expansion.`,
    "FUTURE STATE|RESULTS": `What public commitments, stated goals, or strategic promises has ${deal.prospect} at ${deal.company} made? Look for quotes in press releases, earnings calls, investor presentations, interviews, conference keynotes, or LinkedIn posts where they personally committed to specific outcomes or targets.`,
    "NEEDS|ROLE": `Based on what you know about ${deal.prospect}'s current role as ${deal.role} at ${deal.company} and where they appear to be heading professionally, generate an intelligent hypothesis about what authority, skills, or capabilities they are likely missing right now. Do NOT search the web. Reason from the gap between their current position and their apparent ambitions. What would someone in this role and on this trajectory typically need that they don't yet have?${needsRepContext} Return your hypothesis as: {"found": true, "intel": "Inferred: [your hypothesis]", "source": "inferred", "source_label": "Inferred from role and trajectory"}`,
    "NEEDS|REACH": `Based on what you know about ${deal.prospect}'s current influence network and where they are building relationships, generate an intelligent hypothesis about whose support or buy-in they likely need but don't yet have. Do NOT search the web. Reason from the gap between their current relationships and the alliances someone at their level pursuing their apparent goals would need.${needsRepContext} Return your hypothesis as: {"found": true, "intel": "Inferred: [your hypothesis]", "source": "inferred", "source_label": "Inferred from role and trajectory"}`,
    "NEEDS|RESULTS": `Based on what you know about ${deal.prospect}'s current performance pressures and public commitments as ${deal.role} at ${deal.company}, generate an intelligent hypothesis about what resources, tools, budget, or capabilities they likely need to close the gap between where they are and what they've committed to. Do NOT search the web. Reason from the distance between their current results and their stated goals.${needsRepContext} Return your hypothesis as: {"found": true, "intel": "Inferred: [your hypothesis]", "source": "inferred", "source_label": "Inferred from role and trajectory"}`,
  };

  // Fetch + parse one cell's intel. NEEDS cells are inference-only: they skip the
  // web_search tool entirely (no round trip) and run leaner, which is most of the
  // speed win on a full run.
  const searchOneCell = async (key, row, col) => {
    const existing = cells[key].trim();
    const isInference = row === "NEEDS";
    const userContent = CELL_PROMPTS[key] + (existing ? `\n\nNote: The rep already knows this about the cell: "${existing}". Only surface new, additive information not already captured above.` : "");
    try {
      const body = {
        model: "claude-sonnet-4-6",
        max_tokens: isInference ? 400 : 600,
        system: SEARCH_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      };
      if (!isInference) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  // ── AI SEARCH — one recon call researches company + person, fills all 9 cells ──
  const handleSearch = async () => {
    setSearching(true);
    setSearchProgress("Researching the company and stakeholder...");

    const reconUser = `Research this stakeholder and their company, then fill the 9-cell Matrix.

STAKEHOLDER: ${deal.prospect}
ROLE: ${deal.role}
COMPANY: ${deal.company}${deal.opportunity ? `\nCONTEXT (what the rep may sell / the opening): ${deal.opportunity}` : ""}

Research the company first, then the person. Reformulate searches that come up empty. Then return the JSON object with all nine cells.${needsRepContext ? `\n\nWhen inferring the three NEEDS cells: ${needsRepContext.trim()}` : ""}`;

    let parsed = null;
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
          system: RECON_SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
          messages: [{ role: "user", content: reconUser }],
        }),
      });
      const data = await resp.json();
      const textBlocks = (data.content || []).filter(b => b.type === "text");
      const joined = textBlocks.map(b => b.text).join("\n");
      const cleaned = joined.replace(/<cite[^>]*>|<\/cite>/gi, "").replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; } }
    } catch { parsed = null; }

    setSearchProgress("Organizing what we found...");

    // Map the recon object into the per-cell result shape the review UI expects.
    // A partial or failed return degrades gracefully: any missing/empty cell
    // becomes a clean {found:false}, never a broken run.
    const results = [];
    MATRIX_ROWS.forEach(row => MATRIX_COLS.forEach(col => {
      const key = `${row}|${col}`;
      const existing = cells[key].trim();
      let result = { found: false };
      const cell = parsed && parsed[key];
      if (cell && cell.found && cell.intel && String(cell.intel).trim()) {
        result = {
          found: true,
          intel: String(cell.intel).replace(/<[^>]*>/g, "").trim(),
          source: cell.source || "inferred",
          source_label: cell.source_label || (String(cell.intel).startsWith("Inferred") ? "Inferred from role and trajectory" : "Web source"),
        };
      }
      results.push({ key, row, col, existing, result });
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
    // Soft nudge (once): if they never said what they're selling, the analysis stays
    // generic. Surface it, but never block. oppNudge latches so we never loop.
    if (!deal.opportunity?.trim() && !oppNudge) { setOppNudge(true); return; }
    runAnalysis(deal);
  };

  // Core analysis run — takes an explicit deal so the nudge's "add & continue"
  // can pass the just-typed opportunity without waiting for state to settle.
  const runAnalysis = async (effectiveDeal) => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalyzeSteps(ANALYSIS_STAGES.map(s => ({ label: s.label, done: false })));
    const matrixText = matrixToText(cells, effectiveDeal, aiSources);

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
      const brain = SEMPER_BRAIN(effectiveDeal.experience);
      const [readPart, planPart] = await Promise.all([
        callAnalysis(ANALYSIS_PROMPT_READ(matrixText, effectiveDeal), 1800, brain),
        callAnalysis(ANALYSIS_PROMPT_PLAN(matrixText, effectiveDeal), 2600, brain),
      ]);
      clearInterval(ticker);
      setAnalyzeSteps(ANALYSIS_STAGES.map(s => ({ label: s.label, done: true })));

      // Merge the two halves. If one half fails, keep whatever came back.
      const analysis = (readPart || planPart) ? { ...(readPart || {}), ...(planPart || {}) } : null;
      onComplete(cells, matrixText, analysis, aiSources);
    } catch {
      clearInterval(ticker);
      onComplete(cells, matrixToText(cells, effectiveDeal, aiSources), null, aiSources);
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

          {/* WHAT HAPPENED SINCE LAST TIME — shown once on reopen when prior versions exist */}
          {reopenDiff && (
            <div style={{ marginBottom: "16px", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GREEN}`, borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid #1a1a1a`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ fontSize: "11px", color: GREEN, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700" }}>
                  WHAT HAPPENED SINCE LAST TIME
                  <span style={{ color: "#fff", fontFamily: MONO, letterSpacing: "0", fontWeight: "400", marginLeft: "10px" }}>
                    v{reopenDiff.versionCount} · last saved {agoLabel(reopenDiff.since)}
                  </span>
                </div>
                <button onClick={onDismissReopenDiff} style={{ background: "transparent", border: "none", color: "#888", fontSize: "16px", cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
              <div style={{ padding: "12px 14px" }}>
                {reopenDiff.events.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.6" }}>
                    Nothing's changed in the boxes since your last save. Pick up where you left off.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {reopenDiff.events.map((e, i) => {
                      const clr = e.kind === "need-closed" ? GREEN : e.kind === "need-new" ? AMBER : "#fff";
                      const glyph = e.kind === "need-closed" ? "▲" : e.kind === "need-new" ? "◆" : e.kind === "cleared" ? "○" : "●";
                      return (
                        <div key={i} style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                          <span style={{ color: clr, fontFamily: MONO, fontSize: "12px", lineHeight: 1.5, flexShrink: 0 }}>{glyph}</span>
                          <span style={{ color: clr, fontFamily: MONO, fontSize: "12px", lineHeight: 1.5 }}>{e.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px", flexWrap: "wrap", rowGap: "5px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", rowGap: "3px", minWidth: 0, flex: "1 1 auto" }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        {hasValue && (
                          <button
                            onClick={() => {
                              setCells(prev => ({ ...prev, [key]: "" }));
                              setAiSources(prev => { const n = { ...prev }; delete n[key]; return n; });
                            }}
                            title="Clear this cell"
                            style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "2px", padding: "1px 6px", cursor: "pointer", fontSize: "9px", color: "#777", fontFamily: MONO, lineHeight: 1.4, transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = RED; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#777"; }}
                          >✕ clear</button>
                        )}
                        <WhatGoesHere description={meta.description} />
                      </div>
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

            {oppNudge && !deal.opportunity?.trim() && !analyzing && (
              <div style={{ marginBottom: "12px", padding: "12px 14px", background: "rgba(245,158,11,0.06)", border: `1px solid rgba(245,158,11,0.35)`, borderRadius: "4px" }}>
                <div style={{ fontSize: "11px", color: AMBER, fontFamily: MONO, lineHeight: "1.6", marginBottom: "8px" }}>
                  No opportunity noted yet. That's fine on an early prospect. If you already see the opening, add it here and the analysis sharpens on where you fit. If not, generate anyway and let discovery surface it.
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "stretch", flexWrap: "wrap" }}>
                  <input value={oppDraft} onChange={e => setOppDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && oppDraft.trim()) { const merged = { ...deal, opportunity: oppDraft.trim() }; setDeal(merged); runAnalysis(merged); } }}
                    placeholder="The opening you see, if you know it yet"
                    style={{ flex: 1, minWidth: "240px", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderRadius: "3px", color: "#fff", padding: "9px 12px", fontSize: "12px", fontFamily: MONO, outline: "none" }}
                    onFocus={e => e.target.style.borderColor = AMBER}
                    onBlur={e => e.target.style.borderColor = BORDER}
                  />
                  <Btn onClick={() => { if (oppDraft.trim()) { const merged = { ...deal, opportunity: oppDraft.trim() }; setDeal(merged); runAnalysis(merged); } else { runAnalysis(deal); } }} style={{ padding: "9px 16px" }}>
                    {oppDraft.trim() ? "ADD & CONTINUE →" : "GENERATE ANYWAY →"}
                  </Btn>
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <Btn onClick={handleGenerate} disabled={filled === 0 || analyzing} style={{ minWidth: "300px" }}>
                {analyzing ? "[ Analyzing your intelligence... ]" : "GENERATE MATRIX ANALYSIS →"}
              </Btn>
              <button
                onClick={() => {
                  if (filled === 0 || analyzing) return;
                  onSaveVersion?.(cells, aiSources);
                  setVersionSaved(true);
                  setTimeout(() => setVersionSaved(false), 2200);
                }}
                disabled={filled === 0 || analyzing}
                title="Stamp the current Matrix as a dated version without running analysis. Costs nothing."
                style={{ background: versionSaved ? "rgba(34,197,94,0.12)" : "transparent", border: `1px solid ${versionSaved ? GREEN : "#333"}`, color: versionSaved ? GREEN : "#aaa", borderRadius: "3px", padding: "8px 14px", cursor: filled === 0 || analyzing ? "not-allowed" : "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.12em", opacity: filled === 0 || analyzing ? 0.4 : 1, transition: "all 0.15s", whiteSpace: "nowrap" }}
                onMouseEnter={e => { if (filled === 0 || analyzing || versionSaved) return; e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { if (versionSaved) return; e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#aaa"; }}
              >
                {versionSaved ? "✓ VERSION SAVED" : "⎘ SAVE VERSION"}
              </button>
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
    <div style={{ display: "inline-flex", alignItems: "center", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "7px 16px", marginBottom: "20px" }}>
      <span style={{ color: "#000", fontSize: "15px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.16em" }}>{children}</span>
    </div>
  );
}

const CLASS_META = {
  LEVERAGE: { color: GREEN, label: "LEVERAGE", tip: "Something here works in your favor. An opening to advance the deal, a motivated buyer, or alignment you can press on this call." },
  THREAT: { color: RED, label: "THREAT", tip: "Something here works against you. A risk that could stall or kill the deal if you don't get ahead of it. Handle it before it surfaces on its own." },
  VALIDATE: { color: AMBER, label: "VALIDATE", tip: "A strong hunch you can't confirm yet. It could be true, but it rests on inference, not sourced intel. Confirm it on the next call before you build around it." },
};

// ─── SCREEN 3: ANALYSIS REPORT ─────────────────
function AnalysisScreen({ deal, analysis, aiSources, cells, code, cloudStatus, versions = [], onBack, onRedo }) {
  const hasAnalysis = !!analysis;
  const [showMatrix, setShowMatrix] = useState(false);

  const exportHTML = useCallback(() => {
    if (!analysis) return;
    const esc = (s) => (s == null ? "" : String(s));
    const findingsHTML = (analysis.findings || []).map(f => {
      const c = CLASS_META[f.classification] || { color: RED, label: "" };
      return `<div style="margin-bottom:20px;">${f.classification ? `<span style="display:inline-block;font-size:9px;font-weight:700;color:#000;background:${c.color};border-radius:2px;padding:2px 8px;letter-spacing:0.14em;font-family:'Barlow Condensed',sans-serif;margin-bottom:7px;">${c.label}</span>` : ""}${f.headline ? `<div style="font-size:11px;font-weight:700;color:${c.color};font-family:'Barlow Condensed',sans-serif;letter-spacing:0.16em;margin:6px 0 7px;">${esc((f.headline||"").toUpperCase())}</div>` : ""}<p style="font-size:13px;color:#ccc;line-height:1.75;">${esc(f.finding)}</p></div>`;
    }).join("");

    const obj = analysis.objective || {};
    const objHTML = (obj.who || obj.feels) ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">POSSIBLE NEXT-CALL OBJECTIVE</span></div>
<p style="font-size:14px;color:#fff;line-height:1.8;margin-bottom:14px;">This conversation will be successful if <strong>${esc(obj.who)}</strong> <span style="color:#22c55e;">FEELS</span> ${esc(obj.feels)}, <span style="color:#22c55e;">SEES HOW</span> ${esc(obj.sees_how)}, and <span style="color:#22c55e;">TAKES STEPS</span> ${esc(obj.takes_steps)}.</p>
${obj.fallback ? `<p style="font-size:12px;color:#888;line-height:1.7;"><strong style="color:#f59e0b;">FALLBACK:</strong> ${esc(obj.fallback)}</p>` : ""}</div>` : "";

    const op = analysis.opener || {};
    const openerHTML = op.text ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">OPENING INSIGHT</span></div><p style="font-size:14px;color:#fff;line-height:1.85;font-style:italic;border-left:3px solid #CC0000;padding-left:16px;">"${esc(op.text)}"</p>${op.note ? `<p style="font-size:11px;color:#888;line-height:1.7;margin-top:10px;">${esc(op.note)}</p>` : ""}</div>` : "";

    const gapsHTML = (analysis.gaps || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">INTELLIGENCE GAPS</span></div>${(analysis.gaps || []).map(g => `<div style="border-left:3px solid ${g.severity === "HIGH" ? "#CC0000" : "#f59e0b"};padding-left:14px;margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:${g.severity === "HIGH" ? "#CC0000" : "#f59e0b"};font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;margin-bottom:5px;">${esc((g.cell || "").toUpperCase())} — ${esc(g.severity)}</div><div style="font-size:12px;color:#ccc;line-height:1.6;">${esc(g.note)}</div>${g.ask ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #222;"><span style="font-size:9px;color:#22c55e;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;font-weight:700;">ASK</span><div style="font-size:12px;color:#fff;line-height:1.65;font-style:italic;margin-top:3px;">"${esc(g.ask)}"</div></div>` : ""}</div>`).join("")}</div>` : "";

    const defenseHTML = (analysis.defense || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">DEFENSE STRATEGY</span></div>${(analysis.defense || []).map(d => `<div style="border-left:3px solid #CC0000;padding-left:14px;margin-bottom:20px;"><div style="font-size:11px;font-weight:700;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;margin-bottom:6px;">${esc((d.title||"").toUpperCase())}</div><div style="font-size:12px;color:#ccc;line-height:1.65;">${esc(d.body)}</div></div>`).join("")}</div>` : "";

    const iqHTML = (analysis.iq_questions || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">iQ QUESTIONS — USE NEXT CALL</span></div>${(analysis.iq_questions || []).map(q => `<div style="border-left:3px solid #CC0000;padding-left:16px;margin-bottom:20px;">${q.bank ? `<span style="display:inline-block;font-size:9px;font-weight:700;color:#000;background:${q.bank === "VALIDATION" ? "#22c55e" : "#f59e0b"};border-radius:2px;padding:2px 8px;letter-spacing:0.12em;font-family:'Barlow Condensed',sans-serif;margin-bottom:8px;">${esc(q.bank)}</span>` : ""}<div style="font-size:13px;color:#fff;line-height:1.8;font-style:italic;margin:6px 0;">"${esc(q.question)}"</div>${q.listen_for ? `<div style="font-size:10px;color:#9fb8a0;margin:2px 0 4px;"><span style="color:#22c55e;font-weight:700;">Listen for:</span> ${esc(q.listen_for)}</div>` : ""}${q.timing ? `<div style="font-size:10px;color:#888;">${esc(q.timing)}</div>` : ""}</div>`).join("")}</div>` : "";

    const signalsHTML = ((analysis.watch_for || []).length || (analysis.watch_out || []).length) ? `<div style="margin-bottom:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px;"><div><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:14px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">MOMENTUM SIGNALS</span></div>${(analysis.watch_for || []).map(s => `<div style="font-size:12px;color:#ccc;line-height:1.65;margin-bottom:10px;">● ${esc(s)}</div>`).join("")}</div><div><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:14px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">RESISTANCE SIGNALS</span></div>${(analysis.watch_out || []).map(s => `<div style="font-size:12px;color:#ccc;line-height:1.65;margin-bottom:10px;">● ${esc(s)}</div>`).join("")}</div></div>` : "";

    const actionsHTML = (analysis.next_actions || []).length ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">RECOMMENDED NEXT ACTIONS</span></div>${(analysis.next_actions || []).map((a, i) => `<div style="display:flex;gap:14px;margin-bottom:14px;"><div style="font-size:18px;font-weight:900;color:#CC0000;font-family:'Barlow Condensed',sans-serif;">${i + 1}</div><div style="font-size:12px;color:#ccc;line-height:1.7;">${esc(a)}</div></div>`).join("")}</div>` : "";

    const briefingHTML = (Array.isArray(analysis.briefing) ? analysis.briefing : analysis.briefing ? [analysis.briefing] : []).map(p => `<p style="font-size:13px;color:#ccc;line-height:1.85;margin-bottom:18px;font-style:italic;">${esc(p)}</p>`).join("");

    // The Matrix itself — so the downloaded report is a complete record of the rep's intel
    const gridHTML = cells ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:16px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">THE MATRIX</span></div>
<table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;">
<tr><td style="width:90px;"></td>${MATRIX_COLS.map(c => `<th style="background:#CC0000;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.12em;padding:8px;text-align:center;border:2px solid #0a0a0a;">${c}</th>`).join("")}</tr>
${MATRIX_ROWS.map(r => `<tr><th style="background:#CC0000;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.08em;padding:8px;text-align:center;border:2px solid #0a0a0a;">${r}</th>${MATRIX_COLS.map(c => `<td style="background:#141414;color:#ccc;font-size:10px;line-height:1.55;padding:10px;vertical-align:top;border:2px solid #0a0a0a;">${esc(cells[`${r}|${c}`]) || "<span style='color:#555;'>—</span>"}</td>`).join("")}</tr>`).join("")}
</table></div>` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Matrix Analysis — ${esc(deal.prospect)}</title><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#fff;font-family:'IBM Plex Mono',monospace;padding:40px 48px;max-width:1000px;margin:0 auto;line-height:1.6}@media print{body{background:#fff;color:#000}}</style></head><body>
<div style="font-size:13px;font-weight:700;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.18em;margin-bottom:8px;">CONNECTION INTELLIGENCE — MATRIX ANALYSIS</div>
<div style="font-size:38px;font-weight:900;color:#fff;font-family:'Barlow Condensed',sans-serif;line-height:1;">${esc(deal.prospect).toUpperCase()}</div>
<div style="font-size:13px;color:#fff;font-family:'IBM Plex Mono',monospace;margin-top:6px;margin-bottom:28px;">${esc(deal.role)}${deal.company ? ` · ${esc(deal.company)}` : ""}${deal.opportunity ? ` · ${esc(deal.opportunity)}` : ""}</div>
${analysis.matrix_health_note ? `<div style="border-left:3px solid #CC0000;padding:10px 16px;margin-bottom:32px;font-size:13px;color:#ccc;font-style:italic;">● ${esc(analysis.matrix_health_note)}</div>` : ""}
${gridHTML}
${(briefingHTML || findingsHTML) ? `<div style="margin-bottom:32px;"><div style="display:inline-block;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:20px;"><span style="color:#000;font-size:14px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.16em;">WHAT THE MATRIX IS TELLING YOU</span></div>${briefingHTML}${findingsHTML}</div>` : ""}
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
        <Btn onClick={onBack} style={{ padding: "6px 14px", fontSize: "11px" }}>✎ EDIT MATRIX</Btn>
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
        <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: "700", color: RED, fontFamily: CONDENSED, letterSpacing: "0.18em" }}>CONNECTION INTELLIGENCE — MATRIX ANALYSIS</div>
        <div style={{ fontSize: "42px", fontWeight: "900", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.04em", lineHeight: 1, marginBottom: "10px" }}>{deal.prospect.toUpperCase()}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", flexWrap: "wrap" }}>
          <div style={{ width: "3px", height: "16px", background: RED, borderRadius: "1px", flexShrink: 0 }} />
          <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO }}>
            {deal.role}{deal.company ? ` · ${deal.company}` : ""}{deal.opportunity ? ` · ${deal.opportunity}` : ""}
          </div>
          {deal.relationship && (
            <span style={{ fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.12em", color: deal.relationship === "existing" ? GREEN : AMBER, border: `1px solid ${deal.relationship === "existing" ? GREEN : AMBER}`, borderRadius: "2px", padding: "2px 8px" }}>
              {deal.relationship === "existing" ? "EXISTING CUSTOMER" : "NEW PROSPECT"}
            </span>
          )}
          {deal.experience && (
            <span style={{ fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.12em", color: "#888", border: `1px solid #444`, borderRadius: "2px", padding: "2px 8px" }}>
              {deal.experience === "new" ? "NEW TO SALES" : deal.experience === "advanced" ? "ADVANCED / STRATEGIC" : "EXPERIENCED SELLER"}
            </span>
          )}
        </div>

        {/* Version history — every analysis run under this code is a dated snapshot */}
        {versions.length > 1 && (
          <div style={{ marginBottom: "24px", background: "#0f0f0f", border: `1px solid #1e1e1e`, borderRadius: "4px", padding: "11px 14px" }}>
            <div style={{ fontSize: "10px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700", marginBottom: "8px" }}>
              MATRIX HISTORY · {versions.length} VERSIONS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {versions.map((v, i) => {
                const isLatest = i === versions.length - 1;
                const analyzed = !!v.analysis;
                const fill = MATRIX_ROWS.reduce((n, r) => n + MATRIX_COLS.reduce((m, c) => m + ((v.cells?.[`${r}|${c}`] || "").trim() ? 1 : 0), 0), 0);
                return (
                  <div key={i} title={`${new Date(v.savedAt).toLocaleString()}${analyzed ? " · analysis run" : " · intel only"}`}
                    style={{ fontSize: "10px", fontFamily: MONO, color: isLatest ? "#fff" : "#888", background: isLatest ? "rgba(204,0,0,0.14)" : "transparent", border: `1px solid ${isLatest ? RED : "#2a2a2a"}`, borderRadius: "3px", padding: "4px 9px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>v{i + 1} · {agoLabel(v.savedAt)} · {fill}/9</span>
                    <span title={analyzed ? "analysis run" : "intel only, no analysis"} style={{ color: analyzed ? GREEN : "#666", fontSize: "9px" }}>{analyzed ? "◆" : "○"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasAnalysis ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO }}>Analysis unavailable. Check your connection and try again.</div>
            <div style={{ marginTop: "20px" }}><Btn onClick={onRedo}>↺ TRY AGAIN</Btn></div>
          </div>
        ) : (
          <div>

            {/* Collapsible source Matrix — check a finding against the cell without leaving */}
            {cells && (
              <div style={{ marginBottom: "28px" }}>
                <button onClick={() => setShowMatrix(v => !v)}
                  style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "3px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.14em", color: "#aaa", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = RED; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#aaa"; }}
                >{showMatrix ? "▲ HIDE THE MATRIX" : "▼ SHOW THE MATRIX"}</button>
                {showMatrix && (
                  <div style={{ marginTop: "14px", overflowX: "auto" }}>
                    <div style={{ minWidth: "640px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 1fr", gap: "4px", marginBottom: "4px" }}>
                        <div />
                        {MATRIX_COLS.map(col => (
                          <div key={col} style={{ background: RED, borderRadius: "2px", padding: "6px", textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.12em" }}>{col}</div>
                        ))}
                      </div>
                      {MATRIX_ROWS.map(row => (
                        <div key={row} style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 1fr", gap: "4px", marginBottom: "4px" }}>
                          <div style={{ background: RED, borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", textAlign: "center", fontSize: "10px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.08em", lineHeight: 1.3 }}>{row}</div>
                          {MATRIX_COLS.map(col => {
                            const v = (cells[`${row}|${col}`] || "").trim();
                            return (
                              <div key={col} style={{ background: SURFACE, border: `1px solid ${v ? "#2a2a2a" : "#181818"}`, borderRadius: "2px", padding: "8px 10px", fontSize: "10px", color: v ? "#ddd" : "#555", fontFamily: MONO, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{v || "—"}</div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Matrix intelligence confidence — a gauge, not a briefing. Status
                word reads in half a second; hover re-teaches what each level means. */}
            {(analysis.matrix_health || analysis.matrix_health_note) && (() => {
              const raw = (analysis.matrix_health || "").toUpperCase();
              const health = raw.includes("STRONG") ? {
                  label: "STRONG FOUNDATION", color: GREEN,
                  tip: "You have real, confirmed intel across most of the Matrix. Solid enough to build your call plan and your deal strategy on. Keep it current as things move.",
                } : raw.includes("FLYING") || raw.includes("BLIND") ? {
                  label: "FLYING BLIND", color: RED,
                  tip: "Most of the Matrix is empty or unconfirmed. Anything below is a starting hypothesis, not a plan. Treat this call as discovery and fill the blanks before you commit to a strategy.",
                } : raw.includes("PARTIAL") ? {
                  label: "PARTIAL PICTURE", color: AMBER,
                  tip: "You have real intel in some areas and blanks in others. Enough to plan a smart call, not enough to bet the deal. Confirm the dark spots before you build the whole approach around them.",
                } : {
                  label: raw || "PARTIAL PICTURE", color: AMBER,
                  tip: "You have real intel in some areas and blanks in others. Enough to plan a smart call, not enough to bet the deal. Confirm the dark spots before you build the whole approach around them.",
                };
              return (
                <div style={{ marginBottom: "36px", paddingBottom: "28px", borderBottom: "1px solid #1a1a1a" }}>
                  <div style={{ fontSize: "10px", color: "#888", fontFamily: CONDENSED, letterSpacing: "0.16em", fontWeight: "700", marginBottom: "10px" }}>HOW MUCH TO TRUST YOUR MATRIX INTELLIGENCE RIGHT NOW</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div title={health.tip}
                      style={{ display: "inline-flex", alignItems: "center", gap: "9px", background: "rgba(0,0,0,0.3)", border: `1px solid ${health.color}`, borderRadius: "3px", padding: "8px 14px", cursor: "default" }}>
                      <span style={{ fontSize: "16px", fontFamily: CONDENSED, fontWeight: "900", letterSpacing: "0.1em", color: health.color }}>{health.label}</span>
                    </div>
                  </div>
                  {analysis.matrix_health_note && (
                    <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.75", marginTop: "12px", maxWidth: "760px" }}>{analysis.matrix_health_note}</div>
                  )}
                </div>
              );
            })()}

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
                      const cm = CLASS_META[f.classification] || { color: RED, label: null, tip: null };
                      const headline = typeof f === "object" ? f.headline : null;
                      const text = typeof f === "object" ? f.finding : f;
                      return (
                        <div key={i} style={{ marginBottom: "22px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
                            {cm.label && (
                              <span title={cm.tip || undefined} style={{ fontSize: "9px", fontWeight: "700", color: "#000", background: cm.color, borderRadius: "2px", padding: "2px 8px", letterSpacing: "0.14em", fontFamily: CONDENSED, cursor: cm.tip ? "help" : "default" }}>{cm.label}</span>
                            )}
                            {headline && <div style={{ fontSize: "11px", fontWeight: "700", color: cm.color, fontFamily: CONDENSED, letterSpacing: "0.16em" }}>{(headline||"").toUpperCase()}</div>}
                          </div>
                          <p style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.75", margin: 0 }}>{text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* POSSIBLE NEXT-CALL OBJECTIVE */}
            {analysis.objective && (analysis.objective.who || analysis.objective.feels) && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <SectionTag>POSSIBLE NEXT-CALL OBJECTIVE</SectionTag>
                <p style={{ fontSize: "15px", color: "#fff", fontFamily: MONO, lineHeight: "1.9", margin: 0 }}>
                  This conversation will be successful if <strong style={{ color: "#fff" }}>{analysis.objective.who}</strong>{" "}
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
                        <div style={{ fontSize: "11px", fontWeight: "700", color: gap.severity === "HIGH" ? RED : AMBER, fontFamily: CONDENSED, letterSpacing: "0.12em", marginBottom: "5px" }}>{(gap.cell || "").toUpperCase()}</div>
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
                        <div style={{ fontSize: "11px", fontWeight: "700", color: RED, fontFamily: CONDENSED, letterSpacing: "0.12em", marginBottom: "6px" }}>{(d.title||"").toUpperCase()}</div>
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
                  const listenFor = typeof q === "object" ? q.listen_for : null;
                  const bankColor = bank === "VALIDATION" ? GREEN : AMBER;
                  return (
                    <div key={i} style={{ marginBottom: "22px", paddingLeft: "16px", borderLeft: `3px solid ${RED}` }}>
                      {bank && (
                        <span style={{ display: "inline-block", fontSize: "9px", fontWeight: "700", color: "#000", background: bankColor, borderRadius: "2px", padding: "2px 8px", letterSpacing: "0.12em", fontFamily: CONDENSED, marginBottom: "8px" }}>{bank}</span>
                      )}
                      <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.8", fontStyle: "italic", marginBottom: (listenFor || timing) ? "8px" : 0 }}>"{question}"</div>
                      {listenFor && (
                        <div style={{ fontSize: "10px", color: "#9fb8a0", fontFamily: MONO, lineHeight: "1.6", marginBottom: timing ? "4px" : 0 }}>
                          <span style={{ color: GREEN, fontWeight: "700" }}>Listen for:</span> {listenFor}
                        </div>
                      )}
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
  const [versions, setVersions] = useState([]);        // dated snapshots under this code
  const [reopenDiff, setReopenDiff] = useState(null);  // "what happened" shown once on reopen
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
    const session = { screen, deal, cells, aiSources, result, code, versions };
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
  }, [hydrated, screen, deal, cells, aiSources, result, code, versions]);

  const resumeSession = () => {
    const v = resumeInfo.versions || [];
    setDeal(resumeInfo.deal);
    setCells(resumeInfo.cells || emptyMatrix());
    setAiSources(resumeInfo.aiSources || {});
    setResult(resumeInfo.result || null);
    setVersions(v);
    setReopenDiff(buildReopenDiff(v, resumeInfo.cells));
    setCode(resumeInfo.code || genCode());
    setScreen(resumeInfo.screen && resumeInfo.screen !== "deal" ? resumeInfo.screen : "matrix");
    setResumeInfo(null);
  };

  // On reopen: if there's at least one saved version, show what happened since
  // the last saved snapshot. Pure diff, no model call.
  function buildReopenDiff(v, liveCells) {
    if (!v || v.length === 0) return null;
    const lastSnap = v[v.length - 1];
    const events = diffVersions(lastSnap.cells, liveCells || lastSnap.cells);
    return { since: lastSnap.savedAt, events, versionCount: v.length };
  }

  const discardSession = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setResumeInfo(null);
  };

  const startNewDeal = (d) => {
    setDeal(d);
    setCells(emptyMatrix());
    setAiSources({});
    setResult(null);
    setVersions([]);
    setReopenDiff(null);
    setCode(genCode());
    setScreen("matrix");
  };

  // Manual "Save version" — stamps the current boxes as a dated version WITHOUT
  // running analysis (costs nothing). Analysis stays null on a manual version;
  // it's purely "here's where the intel stood." On dedupe (boxes unchanged since
  // the last snapshot) we keep that snapshot's analysis rather than nulling it,
  // and just refresh its timestamp.
  const saveManualVersion = (c, srcs) => {
    setVersions(prev => {
      const v = Array.isArray(prev) ? [...prev] : [];
      const last = v[v.length - 1];
      if (last && cellsEqual(last.cells, c)) {
        v[v.length - 1] = { ...last, savedAt: new Date().toISOString(), cells: { ...c }, aiSources: { ...srcs } };
        return v;
      }
      v.push({ savedAt: new Date().toISOString(), cells: { ...c }, aiSources: { ...srcs }, analysis: null });
      return v;
    });
    setReopenDiff(null);
  };

  // Reopen a Matrix from any device using its resume code.
  const resumeByCode = async (input) => {
    const clean = input.trim().toUpperCase();
    const full = clean.startsWith("SEMPER-") ? clean : `SEMPER-${clean}`;
    const session = await cloudLoad(full);
    if (!session) { setCodeError(true); return; }
    const v = session.versions || [];
    setDeal(session.deal);
    setCells(session.cells || emptyMatrix());
    setAiSources(session.aiSources || {});
    setResult(session.result || null);
    setVersions(v);
    setReopenDiff(buildReopenDiff(v, session.cells));
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
          setDeal={setDeal}
          cells={cells}
          setCells={setCells}
          aiSources={aiSources}
          setAiSources={setAiSources}
          code={code}
          cloudStatus={cloudStatus}
          versions={versions}
          reopenDiff={reopenDiff}
          onDismissReopenDiff={() => setReopenDiff(null)}
          onSaveVersion={saveManualVersion}
          onBack={() => setScreen("deal")}
          onComplete={(c, matrixText, analysis, srcs) => {
            // Every completed analysis becomes a dated version. Pure storage.
            const nextVersions = pushVersion(versions, c, srcs, analysis);
            setVersions(nextVersions);
            setReopenDiff(null); // consumed — the current run is now the latest
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
          versions={versions}
          onBack={() => setScreen("matrix")}
          onRedo={() => setScreen("matrix")}
        />
      </div>
    );
  }

  return null;
}