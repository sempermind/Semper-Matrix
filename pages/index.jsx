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

// ─── TWO-PHASE SEARCH ──────────────────────────

// ─── FOUR-PHASE SEARCH ARCHITECTURE ───────────

const QUERY_BUILDER_PROMPT = (name, role, company, existingMatrix) => `You are an elite B2B sales intelligence researcher. Your mission is to find everything publicly available about a specific individual — ${name}, ${role} at ${company}. Person-level intelligence is the priority. Company intel fills gaps only when person searches come up short.

Contact: ${name}
Role: ${role}
Company: ${company}
Current date: June 2026 — only surface intel from 2025 or 2026
What the rep already knows:
${existingMatrix}

STEP 1 — ASSESS THE PERSON
Before constructing queries, determine what type of person this is based on their role and company. This determines which sources are most likely to contain meaningful intelligence about them specifically.

ROLE TYPE ROUTING — match the role to the highest-yield person-level sources:

EXECUTIVE / C-SUITE (CEO, CFO, CRO, COO, CMO, CTO, CHRO, President, EVP, SVP):
- Earnings calls and investor presentations where they spoke
- Major business press: Forbes, Fortune, Bloomberg, WSJ, FT, Reuters
- Conference keynotes: their industry's flagship events
- Podcast appearances on leadership, business, or industry shows
- LinkedIn thought leadership posts and articles
- Board memberships and advisory roles
- Company press releases announcing their appointments or statements

COMMERCIAL LEADER (VP Sales, VP Marketing, VP Revenue, Director of Sales, Head of Growth):
- Sales and marketing conference appearances: Salesforce Dreamforce, HubSpot INBOUND, Gartner CSO&SCO, SaaStr
- Revenue leadership podcast appearances
- LinkedIn activity — they tend to be active
- Published articles on sales, revenue, go-to-market topics
- Awards: Sales leader of the year, top revenue leader lists
- Company announcements about their go-to-market changes

TECHNICAL LEADER (CTO, VP Engineering, Chief Architect, Director of Engineering, Head of Technology):
- GitHub profile and open source contributions
- Technical conference appearances: re:Invent, KubeCon, QCon, DockerCon, industry-specific tech events
- Engineering blog posts on company tech blog
- Stack Overflow, dev.to, Medium technical articles
- Patents filed under their name: site:patents.google.com
- Tech podcast appearances

OPERATIONS / SUPPLY CHAIN / PROCUREMENT (COO, VP Operations, VP Supply Chain, CPO, Director of Procurement):
- Industry association involvement: ASCM, ISM, CSCMP, APICS conference appearances
- Supply chain and operations trade press: Supply Chain Dive, Logistics Management, DC Velocity
- Procurement publications: Spend Matters, Procurement Leaders
- LinkedIn — procurement leaders are often active
- Company operational announcements they're associated with

FINANCE LEADER (CFO, VP Finance, Controller, Treasurer, Director of FP&A):
- CFO conference appearances: Gartner CFO & Finance Executive Summit, CFO Leadership Council
- Finance publications: CFO Magazine, CFO.com, Finance & Commerce
- Earnings call transcripts where they spoke
- SEC filings that mention them by name
- LinkedIn and finance community content

HR / TALENT / L&D (CHRO, VP People, VP HR, CLO, Chief People Officer, Director of Learning):
- HR conference appearances: SHRM Annual, ATD International, HR Tech
- HR trade press: HR Executive, People Management, SHRM publications, Training Magazine
- LinkedIn — HR leaders are frequently active
- Talent and culture podcast appearances
- Published articles on people, culture, learning topics

TECHNICAL / RESEARCH PROFESSIONAL (Engineer, Scientist, Researcher, Technical Director, Principal Engineer):
- Published papers: site:scholar.google.com OR site:researchgate.net OR site:osti.gov OR site:dtic.mil
- Conference proceedings: IEEE, AIAA, SAE, SPIE, ACM, industry-specific technical conferences
- Patents: site:patents.google.com
- University alumni profiles or faculty pages
- Technical association memberships: IEEE, ASME, AIAA member listings
- Government contract databases if defense/government adjacent: site:usaspending.gov

HEALTHCARE / CLINICAL (CMO, CNO, VP Clinical, Medical Director, Chief of Staff):
- Clinical publication databases: PubMed, medical journal articles
- Healthcare conference appearances: HIMSS, HLTH, MGMA, ACHE Congress
- Healthcare trade press: Modern Healthcare, Becker's Hospital Review, Health Affairs
- Hospital or health system press releases mentioning them
- Medicare/Medicaid quality reporting where relevant

STEP 2 — CONSTRUCT 8 PERSON-LEVEL QUERIES FIRST
Based on the role type routing above, construct 8 queries specifically targeting this individual using the highest-yield sources for their role type. Every query must include ${name} and hunt for something specific about them personally — not their company generically.

Person query types to cover:
1. Their professional profile and current role verification
2. Their public statements, interviews, or authored content
3. Their conference appearances or speaking engagements
4. Their career history and any recent moves or promotions
5. Their published work, patents, or technical contributions (if applicable)
6. Their industry recognition, awards, or association roles
7. Their LinkedIn presence and thought leadership
8. Any press mentions, quotes, or third-party references to them

STEP 3 — CONSTRUCT 2 COMPANY GAP-FILL QUERIES
Only after the 8 person queries are constructed, add 2 company-level queries that target the specific Matrix cells most likely to still be empty after person searches. Do not add generic company news queries — add targeted queries for what person searches are unlikely to find:
1. The company's most recent strategic commitments or public goals relevant to ${role}'s function — what has this company publicly promised that creates pressure on someone in this role?
2. The company's current capability gaps or hiring signals in ${role}'s functional area — what are they missing that someone in this role would be responsible for?

RULES:
- Each query 4-10 words, immediately searchable
- Every person query includes ${name} by name
- Use site: operators wherever they improve precision
- 2025 OR 2026 in queries where recency matters
- Company queries fill gaps only — do not duplicate what person queries will find
- Never construct a generic "company news" query as a company gap-fill

Return ONLY valid JSON, no markdown, no backticks:
{
  "role_type": "the role type category you identified from the routing above",
  "person_sources": "the 2-3 highest-yield source types for this specific person based on their role",
  "queries": [
    {"query": "exact search string", "type": "person", "target": "specific intel this query hunts for this individual"},
    {"query": "exact search string", "type": "company", "target": "specific gap this fills that person searches won't cover"}
  ]
}`;

const SYNTHESIS_PROMPT = (name, role, company, rawResults, existingCells, fullMatrix) => `You are a sales intelligence analyst for the Semper Selling® methodology. You have been given structured web search results about ${name} (${role} at ${company}). Results are labeled PERSON (about the individual specifically) or COMPANY (organizational context). 

CRITICAL PRIORITY ORDER:
1. Person-level intel populates cells first — always. If a search result is about ${name} specifically, it goes into the Matrix before any company-level result.
2. Company-level intel fills gaps only — cells that person searches could not populate.
3. Organizational inference fills anything remaining — clearly labeled as inferred, never as fact.

RAW SEARCH RESULTS:
${rawResults}

WHAT THE REP ALREADY KNOWS (highest priority — never overwrite or contradict):
${existingCells}

FULL MATRIX CONTEXT:
${fullMatrix}

PERSON-FIRST CELL MAPPING:

CURRENT STATE|ROLE — Decision Authority
Draw exclusively from PERSON results. What does ${name} specifically do, decide, approve, or own? What is their formal scope? What can they authorize independently? If no person-level result addresses this, leave sourced field empty and use organizational inference only as last resort.

CURRENT STATE|REACH — Influence Network  
Draw exclusively from PERSON results. Who has ${name} mentioned, quoted, thanked, or appeared alongside? Who references them? What communities, associations, or networks do they belong to? Who influences their thinking publicly? Company-level results are not a substitute here.

CURRENT STATE|RESULTS — Performance Pressure
Draw from PERSON results first — any statement ${name} has made about their pressures, metrics, or challenges. Then supplement with COMPANY results for organizational context. Never use company-level results to populate this cell if person-level results exist.

FUTURE STATE|ROLE — Career Trajectory
Draw exclusively from PERSON results. What has ${name} said about where they are heading? Any promotion, role expansion, or new responsibilities announced? What does their public content reveal about their professional ambitions? Do not infer career trajectory from company strategy.

FUTURE STATE|REACH — Relationship Strategy
Draw from PERSON results first — new relationships ${name} is building, communities they are joining, people they are connecting with publicly. Supplement with COMPANY results only for organizational partnerships that would directly affect someone in their role.

FUTURE STATE|RESULTS — Public Commitments
Draw from PERSON results first — specific statements ${name} has made about goals, targets, or commitments. Then company-level announcements that create pressure on someone in their role. Clearly attribute which is personal and which is organizational.

NEEDS ROW — INFERRED LAST, AFTER ALL SOURCED CELLS ARE POPULATED:
Only infer Needs cells after mapping everything from person and company searches. Use the gap between Current State and Future State to infer what type of capability, support, or resource is missing. Written as inference always — "The data suggests...", "The patterns point to...", "Based on the gap between X and Y...". Never name a vendor or product. Only infer if both corresponding Current State AND Future State cells have meaningful content.

NEEDS|ROLE — Capability Gaps: what type of authority, expertise, or organizational capacity is missing between their current position and their stated trajectory? Name the type of gap precisely.

NEEDS|REACH — Missing Support: what type of relationship, alliance, or stakeholder alignment is conspicuously absent between their current network and where they are building toward? Name the specific nature of the absence.

NEEDS|RESULTS — Resource Requirements: what type of resource, capability, or investment would close the gap between their current pressures and their stated commitments? Name the nature of what is required with commercial precision.

THIN FOOTPRINT PROTOCOL:
If person-level results are sparse, do not substitute company intel into person-level cells. Instead use organizational inference — clearly labeled — for the person cells that searches could not populate. "In organizations like ${company}, someone in the role of ${role} typically..." This is more honest and more useful than filling person cells with company content.

SOURCE ATTRIBUTION:
- Person findings: source_label identifies the specific source — "LinkedIn", "Forbes Interview · 2025", "IEEE Conference Paper · 2026", "Patent Filing"
- Company findings: source_label identifies — "Press Release · 2025", "Earnings Call · Q1 2026", "Job Posting · June 2026"  
- Inferred: source "inferred", source_label "Inferred from organizational context" or "Inferred from Current/Future State gap"

RECENCY: Current date is June 2026. Discard anything from 2024 or earlier. If date cannot be determined, exclude it.

Return ONLY valid JSON, no markdown, no backticks:
{"findings": [
  {"cell": "CURRENT STATE|ROLE", "intel": "1-2 sentences about ${name} specifically", "source": "https://url.com", "source_label": "Source · Date"},
  {"cell": "NEEDS|ROLE", "intel": "Inferred gap language", "source": "inferred", "source_label": "Inferred from organizational context"}
]}

IMPORTANT: Never return {"findings": []}. If no sourced intel was found, still return inferred findings for as many cells as possible based on the role type and organizational context. Inferred findings are more useful than empty cells — they give the rep hypotheses to test. Use source "inferred" and source_label "Inferred from organizational context" for these.`;

const ANALYSIS_PROMPT = (matrixText, deal) => `You are the Semper Selling® Matrix Analysis Engine — a senior sales strategist who has spent 20 years coaching enterprise reps on complex deals. You are not summarizing data. You are doing the analytical work a rep would never do sitting alone with their notes — finding the tensions, contradictions, and hidden connections between Matrix cells that reveal what is actually happening in this deal beneath the surface.

Deal: ${deal.prospect} (${deal.role} @ ${deal.company})${deal.opportunity ? `\nOpportunity: ${deal.opportunity}` : ""}

Matrix:
${matrixText}

═══════════════════════════════
YOUR ANALYTICAL MISSION
═══════════════════════════════

Run all 14 patterns below. For each, look for gaps where two or more cells reveal something together that neither reveals alone. A finding that restates one cell is not a finding. Surface only patterns where genuine cross-cell gaps exist in the data. Skip patterns where the relevant boxes are empty or too thin to analyze.

PATTERN 1 — DECISION AUTHORITY VS. INFLUENCE (Box 1 + Box 2)
Gap between formal authority and who actually moves decisions. High authority + thin network = can approve but can't mobilize support. Limited authority + strong network = more powerful than their title suggests. Name the commercial implication of whichever gap is present.

PATTERN 2 — UNENGAGED STAKEHOLDER RISK (Box 2 + Box 5 + Box 8)
Find the specific person or function present in Box 2 or Box 5 but absent from Box 8. That specific gap will surface as a late-stage surprise. Only fire if data names or implies a specific person or function — not a generic stakeholder risk.

PATTERN 3 — PERSONAL MOTIVATION DRIVER (Box 3 + Box 4 + Box 6) — fires on ALIGNMENT ONLY
Run only when Box 3, Box 4, and Box 6 point in the same direction. The intersection is what this person is optimizing for — name it precisely. This is what they are selling to their own organization. Note: P3 and P9 are mutually exclusive — run only the one that matches the data.

PATTERN 4 — CURRENT TO FUTURE STATE GAP (Boxes 1+2+3 vs 4+5+6)
Read the full distance across all three dimensions. Large gap everywhere = high urgency. Gap concentrated in one dimension = where the pressure is. Small gap everywhere = maintenance mode, low urgency — flag as a deal risk.

PATTERN 5 — PRIMARY DEAL VULNERABILITIES (Box 7 + Box 8 + Box 9)
Read the Needs row as a complete picture. When all three point to the same problem area, the deal is fragile from the inside. Name the specific internal condition most likely to kill this deal before you get a no.

PATTERN 6 — BREAKTHROUGH QUESTION INDICATOR (Box 3 + Box 7 + Box 9)
Find the sharpest gap between current performance pressure, missing capability, and resource needs. This gap is the setup for the iQ question nobody else will ask. Feed directly into iQ question construction.

PATTERN 7 — COMMITMENT CREDIBILITY (Box 6 + Box 7 + Box 9)
Two questions in sequence: Do the public commitments create real urgency to act? Is the timeline actually executable given the capability and resource gaps? If a deadline in Box 6 conflicts with material gaps in Box 7 and Box 9, the timeline is aspirational not executable — name it directly.

PATTERN 8 — AUTHORITY CEILING (Box 1 + Box 9)
Does the investment implied by Box 9 exceed what Box 1 says this person can approve? If yes — you are selling to the wrong altitude. If aligned, skip this pattern.

PATTERN 9 — STATED GOALS VS. REAL GOALS (Box 3 + Box 4 + Box 6) — fires on CONTRADICTION ONLY
Run only when Box 3, Box 4, and Box 6 conflict with each other. The real motivation is hiding in the gap between them — name precisely what they say versus what the data suggests they are actually optimizing for. Note: mutually exclusive with P3.

PATTERN 10 — COALITION RISK (Box 2 + Box 8)
Find the specific person or function that appears in Box 2 as an influencer but is absent in Box 8. That is precisely where internal resistance will come from. Name the specific relationship gap — not a generic political risk.

PATTERN 11 — COMPETITIVE VULNERABILITY WINDOW (Box 4 + Box 5)
Is this person simultaneously positioning for a bigger role AND actively building new external relationships? If yes, this is the most commercially urgent pattern — they are open to new partners as part of their own repositioning right now. This finding goes FIRST in the report. A competitor with a career-narrative pitch could get a meeting you have not earned yet.

PATTERN 12 — EXECUTION CREDIBILITY (Box 1 + Box 4 + Box 7)
Read the full ROLE column: current authority + career trajectory + capability gaps. Does this person have what it takes to deliver on their own ambition? Limited authority + ambitious trajectory + missing capability = someone who needs a win on this program more than they are letting on. The most personally precise read in the Matrix.

PATTERN 13 — CURRENT STATE ENTRENCHMENT (Box 1 + Box 2 + Box 3)
Read the full CURRENT STATE row together. High authority + strong network + strong performance = comfortable, low urgency to change. Low authority + thin network + performance pressure = someone who needs a win now. This sets the context for how every other pattern should be weighted — a comfortable person requires a fundamentally different approach than a pressured one.

PATTERN 14 — RESULTS COMMERCIAL STORY (Box 3 + Box 6 + Box 9)
Read the full RESULTS column: what they are measured on today + what they have publicly committed to achieving + what resources are required to close that gap. When all three are populated this is the clearest commercial picture in the deal — current pressure to future commitment to cost of execution in one read.

═══════════════════════════════
OUTPUT RULES
═══════════════════════════════

BRIEFING (1-2 paragraphs):
Read like a senior strategist briefing a sales professional before a high-stakes call. Interpret what the data reveals about the customer's world — not a cell summary, not rep advice. Every sentence framed as inference: "The data suggests...", "The patterns point to...", "Based on what's here...", "The gap between X and Y suggests..." — never stated as fact. Never say "you should", "a partner who", "the rep who" — that's advice, it goes in Next Actions. Never reference box numbers, pattern numbers, or methodology terms. Never use "tension" — use gap, disconnect, exposure, pressure point. Specific numbers, names, timelines from the Matrix. One paragraph if thin, two if rich. If Pattern 11 fired, second paragraph addresses that urgency — describing what's happening in their world, not telling the rep what to do.

FINDINGS (2-3 sharpest gaps):
Each has a headline and body. Headline: ALL CAPS, max 8 words, sharp commercial label, specific to this deal — never "KEY INSIGHT" or "IMPORTANT FINDING". Body: name the first data point, name the second, state what their gap reveals that neither reveals alone. 2-3 sentences, no box references, no pattern numbers, no generic observations. Most urgent first.

DEFENSE (max 3): Each answers: what could happen before close that you haven't prevented yet? Specific scenario + one protective action executable in 5 business days. Title ALL CAPS.

NEXT ACTIONS (exactly 3): What to do, to whom, by when + commercial consequence of not doing it. Never "prepare questions" — always a specific executable move with a specific cost of inaction.

SIGNALS (2 each): Observable behaviors only — something you can see or hear. Never internal states. Tied to this person's specific intel.

iQ QUESTIONS (exactly 2): Target the highest personal stakes gap. CURRENT REALITY (specific named constraint from Current State) + FUTURE STATE (specific named commitment) + IMPACT (what the gap has already cost them — career, reputation, public promise, key relationship — never operational). One natural sentence the rep can say out loud. Second question uses completely different data points.

LANGUAGE: Second person throughout ("you" not "the rep"). Direct, commercial. Never "actually", "real", "really", "tension", "pattern", box numbers. Every sentence references THIS specific person's specific intel.

MATRIX HEALTH: "STRONG FOUNDATION" = rich intel, confident analysis. "PARTIAL PICTURE" = meaningful but gaps create blind spots. "FLYING BLIND" = too thin, next conversation must be discovery.

═══════════════════════════════
RETURN FORMAT — PURE JSON ONLY
═══════════════════════════════

{
  "matrix_health": "STRONG FOUNDATION or PARTIAL PICTURE or FLYING BLIND",
  "matrix_health_note": "One direct sentence — what this Matrix gives you and what it is missing.",
  "briefing": [
    "Paragraph 1 — inference only, customer's world only, specific intel from Matrix, no advice, no box/pattern references, no 'tension'.",
    "Paragraph 2 — urgency layer only if Matrix is rich or Pattern 11 fired. Omit if not warranted."
  ],
  "findings": [
    {"headline": "SHARP LABEL IN ALL CAPS — 8 words max", "finding": "First data point. Second data point. What their gap reveals. 2-3 sentences. No box references."}
  ],
  "gaps": [
    {"cell": "ROW / COLUMN", "label": "Cell label", "severity": "HIGH or MEDIUM", "note": "Why this blind spot matters for this deal. For empty NEEDS cells, name the specific discovery question to ask next conversation."}
  ],
  "defense": [
    {"title": "SPECIFIC RISK IN ALL CAPS", "body": "Specific scenario and commercial consequence. One protective action in next 5 business days."}
  ],
  "iq_questions": [
    {"question": "CURRENT REALITY + FUTURE STATE + IMPACT (highest personal stakes gap, one natural sentence out loud)", "timing": "early/mid/late — what this forces them to confront."},
    {"question": "Second question, different data points, second highest personal stakes.", "timing": "timing and what it surfaces."}
  ],
  "watch_for": ["Observable momentum behavior tied to this person's intel.", "Second observable momentum behavior."],
  "watch_out": ["Observable resistance behavior tied to this deal's vulnerabilities.", "Second observable resistance behavior."],
  "next_actions": ["What, to whom, by when — consequence of inaction.", "Second action same standard.", "Third action same standard."]
}
- findings: 2-3, headline + finding keys
- gaps: HIGH/MEDIUM only, max 4, only if they affected briefing or findings
- defense: max 3
- iq_questions: exactly 2
- watch_for/watch_out: exactly 2 each
- next_actions: exactly 3
Return pure JSON only. No backticks, no markdown, no explanation.`;


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
        style={{ background: open ? "rgba(204,0,0,0.08)" : "transparent", border: `1px solid ${open ? RED : RED}`, borderRadius: "2px", padding: "2px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s", lineHeight: 1 }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        <span style={{ fontSize: "8px", color: open ? RED : "#fff", fontFamily: MONO, letterSpacing: "0.08em", whiteSpace: "nowrap", fontWeight: "700" }}>WHAT GOES HERE</span>
        <span style={{ fontSize: "7px", color: open ? RED : "#fff", fontFamily: MONO }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, width: "244px", background: "#1c1c1c", border: `1px solid ${BORDER}`, borderTop: `2px solid ${RED}`, borderRadius: "0 0 4px 4px", padding: "12px 14px", zIndex: 200, boxShadow: "0 8px 28px rgba(0,0,0,0.8)", animation: "fadeSlideIn 0.15s ease" }}>
          <div style={{ fontSize: "9px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700", marginBottom: "8px" }}>WHAT GOES HERE</div>
          <div style={{ fontSize: "11px", color: "#fff", fontFamily: MONO, lineHeight: "1.7" }}>{description}</div>
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
          <div style={{ fontSize: "11px", color: "#fff", fontFamily: MONO, lineHeight: "1.7", marginBottom: "20px" }}>
            No public intel found for this contact. This person has a thin online footprint — add what you know from your own conversations and relationship to fill the Matrix before generating your analysis.
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
          <div style={{ fontSize: "11px", color: "#fff", fontFamily: MONO, marginTop: "4px" }}>
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

                {/* Cell label + accept/reject */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: RED, fontFamily: CONDENSED, letterSpacing: "0.14em", fontWeight: "700" }}>
                      {r.row} / {r.col}
                    </span>
                    <span style={{ fontSize: "9px", color: "#fff", fontFamily: MONO, marginLeft: "8px" }}>— {meta && meta.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => setAccepted(a => ({ ...a, [r.key]: true }))}
                      style={{ background: isAccepted ? "rgba(34,197,94,0.15)" : "transparent", border: `1px solid ${isAccepted ? "#22c55e" : "#333"}`, borderRadius: "3px", padding: "4px 12px", cursor: "pointer", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", color: isAccepted ? "#22c55e" : "#555", transition: "all 0.15s" }}
                    >✓ ACCEPT</button>
                    <button
                      onClick={() => setAccepted(a => ({ ...a, [r.key]: false }))}
                      style={{ background: !isAccepted ? "rgba(204,0,0,0.15)" : "transparent", border: `1px solid ${!isAccepted ? RED : "#333"}`, borderRadius: "3px", padding: "4px 12px", cursor: "pointer", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", color: !isAccepted ? RED : "#555", transition: "all 0.15s" }}
                    >✕ REJECT</button>
                  </div>
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
                  {r.result.source === "inferred" ? (
                    <span style={{ fontSize: "10px", color: "#aaa", fontFamily: MONO, fontStyle: "italic" }}>Inferred from search intel — no direct source</span>
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

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: "10px", alignItems: "center" }}>
          <Btn onClick={handleConfirm} disabled={acceptedCount === 0} style={{ minWidth: "200px" }}>
            ADD {acceptedCount} {acceptedCount === 1 ? "FINDING" : "FINDINGS"} TO MATRIX →
          </Btn>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "12px 20px" }}>SKIP ALL</Btn>
          <span style={{ fontSize: "10px", color: "#fff", fontFamily: MONO, marginLeft: "4px" }}>
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
    { key: "prospect",    label: "CONTACT NAME",           placeholder: "" },
    { key: "role",        label: "TITLE / ROLE",           placeholder: "" },
    { key: "company",     label: "COMPANY",                placeholder: "" },
    { key: "opportunity", label: "OPPORTUNITY (optional)", placeholder: "", textarea: true },
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
                  <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={2}
                    style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, resize: "none", outline: "none", transition: "all 0.2s" }}
                    onFocus={e => { e.target.style.borderColor = RED; e.target.style.borderLeftColor = RED; }} onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.borderLeftColor = BORDER; }}
                  />
                ) : (
                  <input value={form[f.key]}
                    onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setErrors(p => ({ ...p, [f.key]: false })); }}
                    placeholder={f.placeholder} onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${errors[f.key] ? "#ff6666" : BORDER}`, borderLeft: `3px solid ${errors[f.key] ? "#ff6666" : BORDER}`, borderRadius: "3px", color: "#fff", padding: "10px 12px", fontSize: "12px", fontFamily: MONO, outline: "none", transition: "all 0.2s" }}
                    onFocus={e => { e.target.style.borderColor = RED; e.target.style.borderLeftColor = RED; }} onBlur={e => { e.target.style.borderColor = errors[f.key] ? "#ff6666" : BORDER; e.target.style.borderLeftColor = errors[f.key] ? "#ff6666" : BORDER; }}
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

// ─── ANALYSIS LOADER ───────────────────────────

function AnalysisLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,10,10,0.96)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 500
    }}>
      <style>{`
        @keyframes bar1 {
          0%, 100% { height: 24px; }
          50% { height: 56px; }
        }
        @keyframes bar2 {
          0%, 100% { height: 40px; }
          50% { height: 80px; }
        }
        @keyframes bar3 {
          0%, 100% { height: 56px; }
          50% { height: 108px; }
        }
      `}</style>

      {/* Bar graph */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "120px", marginBottom: "32px" }}>
        <div style={{
          width: "22px", background: "linear-gradient(to top, #880000, #FF2222)", borderRadius: "2px 2px 0 0",
          animation: "bar1 1.1s ease-in-out infinite",
          animationDelay: "0s"
        }} />
        <div style={{
          width: "22px", background: "linear-gradient(to top, #880000, #FF2222)", borderRadius: "2px 2px 0 0",
          animation: "bar2 1.1s ease-in-out infinite",
          animationDelay: "0.18s"
        }} />
        <div style={{
          width: "22px", background: "linear-gradient(to top, #880000, #FF2222)", borderRadius: "2px 2px 0 0",
          animation: "bar3 1.1s ease-in-out infinite",
          animationDelay: "0.36s"
        }} />
      </div>

      <div style={{ fontSize: "11px", color: RED, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.22em", marginBottom: "10px" }}>
        SEMPER SELLING®
      </div>
      <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, letterSpacing: "0.06em" }}>
        Analyzing your intelligence...
      </div>
    </div>
  );
}

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

  // ── AI SEARCH ──────────────────────────────
  const handleSearch = async () => {
    setSearching(true);
    setSearchProgress("Building search strategy...");

    try {
      // ── PHASE 0: Dynamic query construction ──
      const existingMatrixSummary = Object.entries(cells)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n") || "Nothing entered yet";

      const queryBuilderResp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{ role: "user", content: QUERY_BUILDER_PROMPT(deal.prospect, deal.role, deal.company, existingMatrixSummary) }]
        })
      });

      const queryBuilderData = await queryBuilderResp.json();
      const queryText = queryBuilderData.content?.find(b => b.type === "text")?.text || "";
      const queryRaw = queryText.replace(/```json|```/g, "").trim();

      let queries = [];
      try {
        const parsed = JSON.parse(queryRaw);
        queries = parsed.queries || [];
      } catch {
        // Fallback to basic queries if builder fails
        queries = [
          { query: `${deal.prospect} ${deal.company} LinkedIn`, type: "person", target: "Profile" },
          { query: `${deal.prospect} interview OR keynote 2025 2026`, type: "person", target: "Statements" },
          { query: `${deal.prospect} ${deal.company} speaker OR article`, type: "person", target: "Thought leadership" },
          { query: `${deal.prospect} ${deal.company} appointed OR promoted`, type: "person", target: "Career moves" },
          { query: `${deal.company} strategy goals 2025 2026`, type: "company", target: "Strategic commitments" },
          { query: `${deal.company} ${deal.role} hiring OR jobs`, type: "company", target: "Capability gaps" },
        ];
      }

      // ── PHASE 1: Fire targeted web searches in parallel ──
      setSearchProgress(`Searching ${queries.length} targeted sources...`);

      const searchPromises = queries.map(q =>
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [{ role: "user", content: `Search for: ${q.query}\n\nReturn only factual findings — exact quotes, titles, URLs, dates, numbers. Do not analyze or interpret. Report what you found verbatim.` }]
          })
        }).then(r => r.json()).catch(() => null)
      );

      setSearchProgress("Gathering intelligence...");
      const searchResponses = await Promise.all(searchPromises);

      // ── Extract URLs from search results and fetch the best ones ──
      // Collect all URLs found, prioritizing person-level results
      const urlsFound = [];
      searchResponses.forEach((data, i) => {
        if (!data) return;
        const q = queries[i];
        // Extract URLs from text content
        const allText = (data.content || [])
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join(" ");
        const urlMatches = allText.match(/https?:\/\/[^\s"<>]+/g) || [];
        urlMatches.forEach(url => {
          // Skip LinkedIn login walls, PDFs, and social media noise
          if (url.includes("linkedin.com/in/") || url.includes(".pdf") || url.includes("twitter.com") || url.includes("facebook.com") || url.includes("instagram.com")) return;
          // Prioritize press releases, news, company sites, business publications
          const priority = (url.includes("prnewswire") || url.includes("businesswire") || url.includes("globenewswire") || url.includes("reuters") || url.includes("bloomberg") || url.includes("wsj.com") || url.includes("ft.com") || url.includes("forbes") || url.includes("linkedin.com/pulse")) ? 1 : 2;
          urlsFound.push({ url, type: q.type, priority });
        });
      });

      // Deduplicate and take top 3 highest-priority URLs
      const seen = new Set();
      const topUrls = urlsFound
        .filter(u => { if (seen.has(u.url)) return false; seen.add(u.url); return true; })
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3);

      // Fetch full content from top URLs
      let fetchedContent = "";
      if (topUrls.length > 0) {
        setSearchProgress("Reading full articles...");
        const fetchPromises = topUrls.map(u =>
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 400,
              messages: [{ role: "user", content: `Fetch this URL and return only the key facts, quotes, dates, and numbers relevant to a B2B sales rep researching a stakeholder. URL: ${u.url}\n\nReturn only the most relevant factual content. 3-4 sentences max.` }]
            })
          }).then(r => r.json()).catch(() => null)
        );
        const fetchResponses = await Promise.all(fetchPromises);
        fetchedContent = fetchResponses.map((data, i) => {
          if (!data) return "";
          const text = (data.content || []).filter(b => b.type === "text").map(b => b.text.replace(/<[^>]*>/g, "").trim()).join(" ");
          return text ? `[FULL ARTICLE: ${topUrls[i].url}]\n${text}` : "";
        }).filter(Boolean).join("\n\n---\n\n");
      }

      // ── Build structured raw results with source labels ──
      // Label each block with query, type (person/company), and target
      // This gives synthesis the context to attribute correctly
      const searchRawResults = searchResponses.map((data, i) => {
        if (!data) return "";
        const q = queries[i];
        const textBlocks = (data.content || [])
          .filter(b => b.type === "text")
          .map(b => b.text.replace(/<[^>]*>/g, "").trim())
          .filter(Boolean)
          .join(" ");

        // Also extract any URLs from tool_use blocks for better sourcing
        const toolResults = (data.content || [])
          .filter(b => b.type === "tool_result" || b.type === "mcp_tool_result")
          .map(b => b.content?.[0]?.text || "")
          .join(" ");

        const combined = [textBlocks, toolResults].filter(Boolean).join(" ").trim();
        if (!combined) return "";

        return `[TYPE: ${q.type?.toUpperCase() || "SEARCH"} | TARGET: ${q.target} | QUERY: "${q.query}"]\n${combined}`;
      }).filter(Boolean).join("\n\n---\n\n");

      // Combine search snippets with full article fetches
      const rawResults = [searchRawResults, fetchedContent].filter(Boolean).join("\n\n═══ FULL ARTICLE CONTENT ═══\n\n");

      if (!rawResults.trim()) {
        // Even with no search results, run synthesis for organizational inference
        setSearchProgress("Building intelligence from role context...");
      }

      // ── PHASE 2: Synthesize into Matrix cells ──
      setSearchProgress("Analyzing findings...");

      const fullMatrixContent = Object.entries(cells)
        .map(([k, v]) => `${k}: ${v.trim() || "[empty]"}`)
        .join("\n");

      const existingCells = Object.entries(cells)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n") || "None";

      const synthResp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: SYNTHESIS_PROMPT(deal.prospect, deal.role, deal.company, rawResults, existingCells, fullMatrixContent) }]
        })
      });

      const synthData = await synthResp.json();
      const textBlock = synthData.content?.find(b => b.type === "text");

      if (!textBlock) {
        // Synthesis failed entirely - show empty state with helpful message
        setSearching(false);
        setSearchProgress(null);
        setSearchResults([]);
        return;
      }

      let parsed = { findings: [] };
      try {
        const raw = textBlock.text.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(raw);
      } catch {
        // JSON parse failed - still show empty state gracefully
        setSearching(false);
        setSearchProgress(null);
        setSearchResults([]);
        return;
      }
      const findings = parsed.findings || [];

      const results = findings.map(f => {
        const [row, col] = f.cell.split("|");
        return {
          key: f.cell,
          row: row || f.cell,
          col: col || "",
          existing: cells[f.cell]?.trim() || "",
          result: {
            found: true,
            intel: f.intel.replace(/<[^>]*>/g, "").trim(),
            source: f.source,
            source_label: f.source_label
          }
        };
      });

      setSearching(false);
      setSearchProgress(null);
      setSearchResults(results);

    } catch (err) {
      console.error("Search failed:", err);
      setSearching(false);
      setSearchProgress(null);
      setSearchResults([]);
    }
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
  const filled = Object.values(cells).filter(v => v.trim().length > 0).length;

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
      let analysis = {};
      try {
        analysis = JSON.parse(raw);
      } catch {
        analysis = null;
      }
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

      {/* Analysis Loader */}
      {analyzing && <AnalysisLoader />}



      {/* Search Review Modal */}
      {searchResults !== null && (
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
                            title={`AI source: ${aiSources[key].source_label || aiSources[key].source}`}
                            style={{ fontSize: "8px", color: "#4a9eff", fontFamily: MONO, textDecoration: "none", paddingTop: "2px", whiteSpace: "nowrap" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >↗ source</a>
                        )}
                        {hasAiSource && aiSources[key].source === "inferred" && (
                          <span title="Inferred from search intel" style={{ fontSize: "8px", color: "#aaa", fontFamily: MONO, paddingTop: "2px", whiteSpace: "nowrap", fontStyle: "italic" }}>~ inferred</span>
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

                    {/* Guided rep prompt — shows after search has run on empty cells only */}
                    {searchResults !== null && !cells[key]?.trim() && !hasAiSource && meta.repPrompt && (
                      <div style={{ marginTop: "6px", padding: "7px 10px", background: "rgba(204,0,0,0.05)", border: `1px solid rgba(204,0,0,0.2)`, borderRadius: "2px" }}>
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

            {/* Search bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", padding: "14px 16px", background: "#0f0f0f", border: `1px solid #1e1e1e`, borderRadius: "4px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", marginBottom: "2px" }}>AI INTELLIGENCE SEARCH</div>
                <div style={{ fontSize: "10px", color: "#fff", fontFamily: MONO }}>
                  Searches public sources for {deal.prospect} at {deal.company} — adds only verified, sourced intel
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{ background: searching ? "rgba(74,158,255,0.08)" : "#1a1a1a", border: `1px solid ${searching ? "#4a9eff" : "#4a9eff"}`, color: "#4a9eff", borderRadius: "3px", padding: "9px 18px", cursor: searching ? "not-allowed" : "pointer", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.1em", whiteSpace: "nowrap", transition: "all 0.3s", minWidth: "200px" }}
                onMouseEnter={e => { if (!searching) { e.currentTarget.style.background = "rgba(74,158,255,0.1)"; } }}
                onMouseLeave={e => { if (!searching) e.currentTarget.style.background = "#1a1a1a"; }}
              >
                {searching
                  ? <span style={{ animation: "readingPulse 1s ease-in-out infinite", display: "inline-block" }}>● {searchProgress || "SEARCHING..."}</span>
                  : "◈ SEARCH THE WEB"}
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

  // ── SECTION BADGE (matches screenshot red outlined pill with diamond icon) ──
  const SectionBadge = ({ icon = "◆", label }) => (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
      <span style={{ color: RED, fontSize: "9px" }}>{icon}</span>
      <span style={{ color: "#fff", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>{label}</span>
    </div>
  );

  const exportHTML = useCallback(() => {
    if (!analysis) return;
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Matrix Analysis — ${deal.prospect}</title><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;color:#fff;font-family:'IBM Plex Mono',monospace;padding:40px 48px;max-width:1000px;margin:0 auto;line-height:1.6}@media print{body{background:#fff;color:#000}}</style></head><body>
<div style="margin-bottom:8px;font-size:10px;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.18em;">◆ CONNECTION INTELLIGENCE — MATRIX ANALYSIS</div>
<div style="font-size:38px;font-weight:900;color:#fff;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.04em;line-height:1;">${deal.prospect.toUpperCase()}</div>
<div style="font-size:13px;color:#fff;font-family:'IBM Plex Mono',monospace;margin-top:6px;margin-bottom:24px;">${deal.role}${deal.company ? ` · ${deal.company}` : ""}${deal.opportunity ? ` · ${deal.opportunity}` : ""}</div>
${analysis.matrix_health_note ? `<div style="border-left:3px solid #CC0000;padding:10px 16px;margin-bottom:32px;font-size:13px;color:#ccc;font-style:italic;line-height:1.7;">● ${analysis.matrix_health_note}</div>` : ""}
${((analysis.briefing||[]).length||(analysis.findings||[]).length) ? `<div style="margin-bottom:32px;"><div style="display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid #CC0000;border-radius:3px;padding:5px 14px;margin-bottom:20px;"><span style="color:#000;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">WHAT THE MATRIX IS TELLING YOU</span></div>${(analysis.briefing||[]).map(p=>`<p style="font-size:13px;color:#ccc;line-height:1.85;margin:0 0 18px 0;font-style:italic;">${p}</p>`).join("")}${(analysis.findings||[]).length?`<div style="margin-top:${(analysis.briefing||[]).length?'24px':'0'};padding-top:${(analysis.briefing||[]).length?'20px':'0'};border-top:${(analysis.briefing||[]).length?'1px solid #1e1e1e':'none'};">${(analysis.findings||[]).map(f=>{const headline=typeof f==="object"?f.headline:null;const text=typeof f==="object"?f.finding:f;return `<div style="margin-bottom:20px;">${headline?`<div style="font-size:11px;font-weight:700;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.16em;margin-bottom:7px;">${headline}</div>`:""}<p style="font-size:13px;color:#ccc;line-height:1.75;margin:0;">${text}</p></div>`;}).join("")}</div>`:""}</div>` : ""}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px;">
<div>${(analysis.gaps||[]).length ? `<div style="display:inline-flex;align-items:center;gap:7px;border:1px solid #CC0000;border-radius:3px;padding:5px 12px;margin-bottom:12px;"><span style="color:#CC0000;font-size:9px;">▣</span><span style="color:#fff;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">INTELLIGENCE GAPS</span></div><div style="font-size:10px;color:#666;font-family:'IBM Plex Mono',monospace;margin-bottom:12px;">HIGH — critical to close &nbsp;|&nbsp; MEDIUM — worth exploring</div>${(analysis.gaps||[]).map(g=>`<div style="border-left:3px solid ${g.severity==='HIGH'?'#CC0000':'#f59e0b'};padding:8px 14px;margin-bottom:10px;"><div style="font-size:10px;font-weight:700;color:${g.severity==='HIGH'?'#CC0000':'#f59e0b'};font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;margin-bottom:4px;">${g.cell}</div><div style="font-size:12px;color:#ccc;line-height:1.55;">${g.note}</div></div>`).join("")}` : ""}</div>
<div>${(analysis.defense||[]).length ? `<div style="display:inline-flex;align-items:center;gap:7px;border:1px solid #CC0000;border-radius:3px;padding:5px 12px;margin-bottom:12px;"><span style="color:#CC0000;font-size:9px;">◎</span><span style="color:#fff;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">DEFENSE STRATEGY</span></div>${(analysis.defense||[]).map(r=>`<div style="margin-bottom:14px;"><div style="font-size:11px;font-weight:700;color:#CC0000;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.12em;margin-bottom:5px;">${r.title}</div><div style="font-size:12px;color:#ccc;line-height:1.6;">${r.body}</div></div>`).join("")}` : ""}</div>
</div>
${(analysis.iq_questions||[]).length ? `<div style="margin-bottom:32px;"><div style="display:inline-flex;align-items:center;gap:7px;border:1px solid #CC0000;border-radius:3px;padding:5px 12px;margin-bottom:16px;"><span style="color:#CC0000;font-size:9px;">◉</span><span style="color:#fff;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">iQ QUESTIONS — USE NEXT CALL</span></div>${(analysis.iq_questions||[]).map(q=>`<div style="margin-bottom:18px;padding-left:16px;border-left:2px solid #333;"><div style="font-size:13px;color:#fff;font-style:italic;line-height:1.75;margin-bottom:6px;">"${q.question}"</div><div style="font-size:11px;color:#666;">${q.timing}</div></div>`).join("")}</div>` : ""}
${(analysis.watch_for||analysis.watch_out) ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px;">
<div><div style="display:inline-flex;align-items:center;gap:7px;border:1px solid #CC0000;border-radius:3px;padding:5px 12px;margin-bottom:16px;"><span style="color:#CC0000;font-size:9px;">◆</span><span style="color:#fff;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">MOMENTUM SIGNALS — WATCH FOR</span></div>${(analysis.watch_for||[]).map(s=>`<div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;"><div style="flex-shrink:0;border:1px solid #22c55e;border-radius:2px;padding:2px 8px;font-size:9px;font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#22c55e;letter-spacing:0.1em;margin-top:2px;">WATCH FOR</div><div style="font-size:12px;color:#ccc;line-height:1.6;">${s}</div></div>`).join("")}</div>
<div><div style="display:inline-flex;align-items:center;gap:7px;border:1px solid #CC0000;border-radius:3px;padding:5px 12px;margin-bottom:16px;"><span style="color:#CC0000;font-size:9px;">◆</span><span style="color:#fff;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">RESISTANCE SIGNALS — WATCH OUT</span></div>${(analysis.watch_out||[]).map(s=>`<div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;"><div style="flex-shrink:0;border:1px solid #CC0000;border-radius:2px;padding:2px 8px;font-size:9px;font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#CC0000;letter-spacing:0.1em;margin-top:2px;">WATCH OUT</div><div style="font-size:12px;color:#ccc;line-height:1.6;">${s}</div></div>`).join("")}</div>
</div>` : ""}
${(analysis.next_actions||[]).length ? `<div style="margin-bottom:32px;"><div style="display:inline-flex;align-items:center;gap:7px;border:1px solid #CC0000;border-radius:3px;padding:5px 12px;margin-bottom:16px;"><span style="color:#CC0000;font-size:9px;">◆</span><span style="color:#fff;font-size:11px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.18em;">RECOMMENDED NEXT ACTIONS</span></div>${(analysis.next_actions||[]).map((a,i)=>`<div style="display:flex;gap:16px;margin-bottom:14px;"><div style="color:#CC0000;font-size:13px;font-weight:700;font-family:'Barlow Condensed',sans-serif;flex-shrink:0;padding-top:1px;">${i+1}.</div><div style="font-size:13px;color:#ccc;line-height:1.7;">${a}</div></div>`).join("")}</div>` : ""}
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #1e1e1e;font-size:10px;color:#444;">SEMPER MIND © 2026 — SEMPERMIND.COM · ${now}</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `matrix_analysis_${deal.prospect.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }, [analysis, deal]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>

      {/* Header bar */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid #1a1a1a`, background: "#0d0d0d", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={onBack} style={{ padding: "6px 12px", fontSize: "11px" }}>← EDIT MATRIX</Btn>
        <div style={{ width: "1px", height: "24px", background: "#222" }} />
        <span style={{ color: RED, fontSize: "11px", fontFamily: MONO, letterSpacing: "0.14em" }}>CONNECTION INTELLIGENCE — MATRIX ANALYSIS</span>
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

        {/* Deal header — matches screenshot large name treatment */}
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
                <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, fontStyle: "italic", lineHeight: "1.75" }}>
                  {analysis.matrix_health_note}
                </div>
              </div>
            )}

            {/* WHAT THE MATRIX IS TELLING YOU — briefing + labeled findings */}
            {((Array.isArray(analysis.briefing) ? analysis.briefing.length > 0 : !!analysis.briefing) || (analysis.findings || []).length > 0) && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "24px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>WHAT THE MATRIX IS TELLING YOU</span>
                </div>

                {/* Briefing paragraphs — continuous read */}
                {(Array.isArray(analysis.briefing) ? analysis.briefing : analysis.briefing ? [analysis.briefing] : []).map((para, i) => (
                  <p key={i} style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.85", margin: 0, marginBottom: "18px", fontStyle: "italic" }}>{para}</p>
                ))}

                {/* Labeled findings — sharpest specific gaps */}
                {(analysis.findings || []).length > 0 && (
                  <div style={{ marginTop: (analysis.briefing || []).length > 0 ? "28px" : "0", paddingTop: (analysis.briefing || []).length > 0 ? "24px" : "0", borderTop: (analysis.briefing || []).length > 0 ? "1px solid #1e1e1e" : "none" }}>
                    {(analysis.findings || []).map((f, i) => {
                      const headline = typeof f === "object" ? f.headline : null;
                      const text = typeof f === "object" ? f.finding : f;
                      return (
                        <div key={i} style={{ marginBottom: "22px" }}>
                          {headline && (
                            <div style={{ fontSize: "11px", fontWeight: "700", color: RED, fontFamily: CONDENSED, letterSpacing: "0.16em", marginBottom: "7px" }}>{headline}</div>
                          )}
                          <p style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.75", margin: 0 }}>{text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* INTELLIGENCE GAPS + DEFENSE STRATEGY — two column */}
            {((analysis.gaps || []).length > 0 || (analysis.defense || []).length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>

                {/* GAPS */}
                {(analysis.gaps || []).length > 0 && (
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "12px" }}>
                      <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>INTELLIGENCE GAPS</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#fff", fontFamily: MONO, marginBottom: "14px" }}>
                      <span style={{ borderLeft: `2px solid ${RED}`, paddingLeft: "6px", marginRight: "12px" }}>HIGH — critical to close</span>
                      <span style={{ borderLeft: "2px solid #f59e0b", paddingLeft: "6px" }}>MEDIUM — worth exploring</span>
                    </div>
                    {(analysis.gaps || []).map((gap, i) => (
                      <div key={i} style={{ borderLeft: `3px solid ${gap.severity === "HIGH" ? RED : "#f59e0b"}`, paddingLeft: "14px", marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: gap.severity === "HIGH" ? RED : "#f59e0b", fontFamily: CONDENSED, letterSpacing: "0.12em", marginBottom: "5px" }}>{gap.cell}</div>
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.6" }}>{gap.note}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* DEFENSE */}
                {(analysis.defense || []).length > 0 && (
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                      <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>DEFENSE STRATEGY</span>
                    </div>
                    {(analysis.defense || []).map((risk, i) => (
                      <div key={i} style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: RED, fontFamily: CONDENSED, letterSpacing: "0.12em", marginBottom: "6px" }}>{risk.title}</div>
                        <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65" }}>{risk.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* iQ QUESTIONS */}
            {(analysis.iq_questions || []).length > 0 && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>iQ QUESTIONS — USE NEXT CALL</span>
                </div>
                {(analysis.iq_questions || []).map((q, i) => (
                  <div key={i} style={{ marginBottom: "22px", paddingLeft: "16px", borderLeft: "2px solid #222" }}>
                    <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, fontStyle: "italic", lineHeight: "1.75", marginBottom: "8px" }}>"{q.question}"</div>
                    <div style={{ fontSize: "11px", color: "#aaa", fontFamily: MONO }}>{q.timing}</div>
                  </div>
                ))}
              </div>
            )}

            {/* MOMENTUM + RESISTANCE — two column */}
            {((analysis.watch_for || []).length > 0 || (analysis.watch_out || []).length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>

                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                    <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>MOMENTUM SIGNALS</span>
                  </div>
                  {(analysis.watch_for || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, border: "1px solid #22c55e", borderRadius: "2px", padding: "2px 8px", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", color: "#22c55e", letterSpacing: "0.1em", marginTop: "2px" }}>WATCH FOR</div>
                      <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65" }}>{s}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                    <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>RESISTANCE SIGNALS</span>
                  </div>
                  {(analysis.watch_out || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, border: `1px solid ${RED}`, borderRadius: "2px", padding: "2px 8px", fontSize: "9px", fontFamily: CONDENSED, fontWeight: "700", color: RED, letterSpacing: "0.1em", marginTop: "2px" }}>WATCH OUT</div>
                      <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, lineHeight: "1.65" }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECOMMENDED NEXT ACTIONS */}
            {(analysis.next_actions || []).length > 0 && (
              <div style={{ marginBottom: "40px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "20px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em", color: "#000" }}>RECOMMENDED NEXT ACTIONS</span>
                </div>
                {(analysis.next_actions || []).map((action, i) => (
                  <div key={i} style={{ display: "flex", gap: "16px", marginBottom: "16px", alignItems: "flex-start" }}>
                    <div style={{ color: RED, fontSize: "14px", fontWeight: "700", fontFamily: CONDENSED, flexShrink: 0, paddingTop: "1px", minWidth: "16px" }}>{i + 1}.</div>
                    <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, lineHeight: "1.75" }}>{action}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ paddingTop: "20px", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#333", fontFamily: MONO }}>SEMPER MIND © 2026 — SEMPERMIND.COM</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {hasAnalysis && <Btn variant="ghost" onClick={exportHTML} style={{ fontSize: "10px", padding: "7px 14px" }}>↓ EXPORT</Btn>}
                <Btn variant="ghost" onClick={onRedo} style={{ fontSize: "10px", padding: "7px 14px" }}>↺ RE-ANALYZE</Btn>
              </div>
            </div>

          </div>
        )}
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
        @keyframes readingPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          button, [data-noprint] { display: none !important; }
        }
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
