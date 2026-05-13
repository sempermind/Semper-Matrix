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

// ─── TWO-PHASE SEARCH ──────────────────────────

const QUERY_BUILDER_PROMPT = (name, role, company, existingMatrix) => `You are an elite B2B sales intelligence researcher with deep expertise in finding hard-to-surface professional intel. Your job is to construct 10 laser-targeted web search queries that go after the highest-value public sources — not generic web searches but source-targeted queries that hunt specific databases, publications, and platforms known to contain rich stakeholder intelligence.

Contact: ${name}
Role: ${role}
Company: ${company}
Current date: May 2026 — only surface intel from 2025 or 2026
What you already know:
${existingMatrix}

SOURCE TARGETING STRATEGY:
You must build queries that target SPECIFIC high-value sources, not generic web searches. Use site: operators, publication names, and source-specific terminology to maximize result quality.

HIGH-VALUE SOURCES BY INTEL TYPE:
- Press releases & announcements: site:businesswire.com OR site:prnewswire.com OR site:globenewswire.com
- Financial commitments & targets: "investor relations" OR "earnings call" OR "annual report" OR site:sec.gov (for public companies) OR "investor day"
- Person interviews & statements: podcast OR interview OR keynote OR "fireside chat" OR "in conversation with" OR "Q&A"
- LinkedIn profile & posts: site:linkedin.com "${name}" (for profile) — "${name}" linkedin post OR article (for thought leadership)
- Job postings (reveals capability gaps): site:linkedin.com/jobs OR "we are hiring" OR "job opening" OR careers — use the functional area relevant to ${role}
- Industry & trade press: use industry publication names relevant to the sector (e.g. for finance: CFO.com OR "CFO Magazine", for supply chain: SupplyChainDive OR "Supply Chain Management Review", for sales: "Sales & Marketing Management" OR "Harvard Business Review")
- Local business journals: site:bizjournals.com OR "[city] business journal" — especially valuable for private company executives
- Conference appearances: site:conference OR speaker OR "keynote speaker" OR "panel discussion" — reveals thought leadership and network
- Company blog & newsroom: site:[company domain] news OR blog OR insights OR leadership
- Analyst & market coverage: Gartner OR Forrester OR IDC OR "analyst report" combined with company name

CONSTRUCT EXACTLY 10 QUERIES:

PERSON-LEVEL QUERIES (4) — hunt for this specific individual:
1. LinkedIn profile: use site:linkedin.com with their exact name and company
2. Public statements: target podcasts, interviews, keynotes, or authored articles from 2025-2026 — use "podcast" OR "interview" OR "keynote" with their name
3. Career moves & recognition: target press releases announcing their appointment, promotion, or award — use site:businesswire.com OR site:prnewswire.com with their name
4. Thought leadership: target LinkedIn posts, articles, or conference appearances that reveal their professional priorities — use their name with "speaker" OR "article" OR "post" OR "linkedin"

COMPANY-LEVEL QUERIES (6) — hunt for organizational intel relevant to the ${role} function:
1. Financial commitments: target earnings calls, investor presentations, or annual reports with specific metrics relevant to ${role}'s function — use "earnings" OR "investor" OR "annual report" with company name and 2025 OR 2026
2. Strategic announcements: target press releases about initiatives, transformations, or investments relevant to ${role} — use site:businesswire.com OR site:prnewswire.com with company name and relevant strategic terms
3. Leadership statements: target CEO or senior leadership quotes about priorities relevant to ${role}'s domain — use "CEO" OR "leadership" with company name and relevant domain terms
4. Partnerships & technology: target partnership announcements, vendor selections, or technology investments relevant to ${role}'s function — use company name with partner names, technology terms, and 2025 OR 2026
5. Hiring & capability gaps: target current job postings in ${role}'s functional area — this reveals what the company is investing in and where their gaps are — use site:linkedin.com/jobs OR company name with "hiring" OR "job" and relevant function
6. Competitive & market pressures: target industry analyst coverage, trade press, or market reports about challenges facing companies like ${company} in ${role}'s domain — use relevant industry publication names or "analyst" with specific challenge terms

RULES:
- Each query must be 4-10 words and immediately searchable
- Use site: operators wherever they improve precision
- Include 2025 OR 2026 in queries where recency matters
- Make every query role-aware — the intel it hunts must be relevant to someone in the role of ${role}
- If the company appears to be publicly traded, include SEC/investor relations queries
- If the company appears to be private or mid-market, use bizjournals.com and local press queries instead

Return ONLY valid JSON, no markdown, no backticks:
{
  "queries": [
    {"query": "exact search string with site: operators where appropriate", "type": "person", "target": "specific intel this query is hunting for"},
    {"query": "exact search string", "type": "company", "target": "specific intel this query is hunting for"}
  ]
}`;

const SYNTHESIS_PROMPT = (name, role, company, rawResults, existingCells, fullMatrix) => `You are a sales intelligence analyst for the Semper Selling® methodology. You have been given structured web search results about ${name} (${role} at ${company}). Each search block is labeled with TYPE (PERSON or COMPANY), TARGET (what it was hunting for), and QUERY (the exact search used). Use these labels to correctly attribute findings to the right Matrix cells and source types.

RAW SEARCH RESULTS — STRUCTURED BY TYPE AND TARGET:
${rawResults}

FULL MATRIX — WHAT YOU ALREADY KNOW (use this to infer Needs, do not duplicate in sourced cells):
${fullMatrix}

EXISTING CELL CONTENT TO AVOID DUPLICATING:
${existingCells}

THE NINE MATRIX CELLS:

ROWS 1-6 — SOURCED INTEL ONLY (person-level or company-level):
- CURRENT STATE|ROLE: Decision Authority — ${name}'s formal position, budget approval, what they can decide independently. Draw from person-level search results.
- CURRENT STATE|REACH: Influence Network — who influences ${name}, who they influence, key relationships. Draw from person-level search results.
- CURRENT STATE|RESULTS: Performance Pressure — what ${company} is being measured on, current business challenges, market pressures, recent performance issues. Draw from company-level search results.
- FUTURE STATE|ROLE: Career Trajectory — ${name}'s next role, promotion path, expanding responsibilities. Draw from person-level search results.
- FUTURE STATE|REACH: Relationship Strategy — new alliances, partnerships, networks ${company} is building. Draw from company-level search results.
- FUTURE STATE|RESULTS: Public Commitments — stated goals, strategic targets, public promises made by ${name} or announced by ${company}. Draw from both person and company results.

ROWS 7-9 — INFERRED FROM THE COMPLETE MATRIX PICTURE:
Use BOTH the rep's manually entered intel AND the search findings above to infer the Needs row. Do not limit yourself to only what the search found. Your job is to surface what this person or organization requires to close the gap — described in terms of the TYPE of capability, expertise, speed, or partnership needed, not a generic observation. Write with commercial precision. A rep reading this should immediately understand what kind of solution, capability, or partner closes the gap — without you naming any specific vendor or product.

- NEEDS|ROLE: Capability Gaps — given everything you know about ${name}'s current authority and future trajectory, what specific type of capability, organizational competency, or decision-making authority is missing between where they are and where they are trying to go? Be precise about the nature of the gap: is it technical expertise, execution capacity, organizational credibility, cross-functional authority, or something else? Infer from the tension between CURRENT STATE|ROLE and FUTURE STATE|ROLE. Frame as inference: "The data suggests they need...", "The patterns point to a requirement for...", "Based on the gap between X and Y, the missing capability appears to be...". Never state as fact. Never name a specific vendor or product.

- NEEDS|REACH: Missing Support — given their current influence network and the relationships they are building, what specific type of partnership, alliance, or stakeholder alignment is conspicuously absent? Be precise: is it executive sponsorship at a specific level, a technical credibility validator, a peer reference in their industry, internal cross-functional alignment, or an external ecosystem relationship? Infer from the tension between CURRENT STATE|REACH and FUTURE STATE|REACH. Frame as inference: "The patterns suggest...", "This intel points to a need for...", "The gap here indicates...". Never state as fact. Never name a specific vendor or product.

- NEEDS|RESULTS: Resource Requirements — given the gap between their current performance pressures and their stated future commitments, what specific type of resource, investment, technology capability, or process change would close that gap? Be precise about the nature of what's required: is it speed of deployment, depth of technical expertise, proven performance in comparable situations, budget justification support, or ongoing responsiveness after implementation? Infer from the tension between CURRENT STATE|RESULTS and FUTURE STATE|RESULTS. Frame as inference: "The data suggests...", "If this read is right, they require...", "The gap here points to a need for...". Never state as fact. Never name a specific vendor or product.

- Only infer a NEEDS cell if there is meaningful content in BOTH the corresponding Current State AND Future State cells — from any source (rep entry or search). If either is empty or too thin to infer from, skip that NEEDS cell entirely.

SOURCE ATTRIBUTION RULES:
- Person-level findings: source_label should identify the actual source type e.g. "LinkedIn", "Forbes Interview · May 2025", "Company Blog · January 2026"
- Company-level findings: source_label should identify the source type e.g. "Press Release · 2026", "Earnings Call · Q1 2026", "Industry News · March 2026"
- Inferred NEEDS cells: source "inferred", source_label "Inferred from search intel"
- Only infer a NEEDS cell if you found meaningful content in both the corresponding Current State AND Future State cells
- Each finding 1-2 sharp sentences maximum
- Strip all XML tags, citation markers, and formatting artifacts
- Return ONLY valid JSON, no markdown, no backticks

RECENCY RULES — CRITICAL:
- The current date is May 2026. Only include findings from 2025 or 2026.
- If a search result is from 2024 or earlier, discard it entirely — do not include it in any cell.
- If you cannot determine the date of a finding, err on the side of excluding it.
- If all results for a cell are older than 2025, leave that cell empty rather than surfacing stale intel.

{"findings": [
  {"cell": "CURRENT STATE|ROLE", "intel": "1-2 sentence finding about the person", "source": "https://linkedin.com/...", "source_label": "LinkedIn"},
  {"cell": "CURRENT STATE|RESULTS", "intel": "1-2 sentence finding about company pressures", "source": "https://news.com/...", "source_label": "Reuters · January 2025"},
  {"cell": "NEEDS|RESULTS", "intel": "1-2 sentence inferred gap", "source": "inferred", "source_label": "Inferred from search intel"}
]}

If nothing credible was found, return: {"findings": []}`;

const ANALYSIS_PROMPT = (matrixText, deal) => `You are the Semper Selling® Matrix Analysis Engine — a senior sales strategist who has spent 20 years coaching enterprise reps on complex deals. You are not summarizing data. You are doing the analytical work a rep would never do sitting alone with their notes — finding the tensions, contradictions, and hidden connections between Matrix cells that reveal what is actually happening in this deal beneath the surface.

Deal: ${deal.prospect} (${deal.role} @ ${deal.company})${deal.opportunity ? `\nOpportunity: ${deal.opportunity}` : ""}

Matrix:
${matrixText}

═══════════════════════════════
YOUR ANALYTICAL MISSION
═══════════════════════════════

Run all 12 patterns below against the Matrix data. For each pattern, you are looking for TENSION — places where two or more cells contradict each other, create an unresolved gap, or reveal something about this person's situation that neither cell reveals on its own. A finding that simply restates what is in one cell is not a finding. A finding that shows what happens when two cells collide is.

PATTERN 1 — DECISION AUTHORITY VS. INFLUENCE (Box 1 + Box 2)
Look for the gap between formal authority and who actually moves decisions. If Box 1 shows limited approval power but Box 2 shows strong internal relationships, this person is more powerful than their title suggests — underselling is the risk. If Box 1 shows high authority but Box 2 shows a thin network, they can approve but may not be able to mobilize support — a different problem entirely. Surface whichever gap creates the most commercial implication for you.

PATTERN 2 — UNENGAGED STAKEHOLDER RISK (Box 2 + Box 5 + Box 8)
Look for a specific person or function that appears in Box 2 (who influences them) or Box 5 (relationships they are building) but is conspicuously absent from Box 8 (whose support they are missing). This is not a generic "engage more stakeholders" finding — it is a specific relationship gap that will become a late-stage surprise if not addressed now. Only surface this if the data actually names or implies a specific person or function.

PATTERN 3 — PERSONAL MOTIVATION DRIVER (Box 3 + Box 4 + Box 6)
Look for the intersection point where performance pressure, career trajectory, and public commitments all converge. This intersection — not the stated business problem — is what this person is optimizing for. The more specific the data in these three boxes, the sharper this finding will be. If all three point in the same direction, the motivation is clear. If they point in different directions, the contradiction itself is the finding — they are being pulled in competing directions and you — the rep who acknowledges that tension — will stand out.

PATTERN 4 — CURRENT TO FUTURE STATE GAP (Boxes 1+2+3 vs 4+5+6)
Look at the full distance between where this person is today and where they are trying to get across all three dimensions — Role, Reach, Results. A large gap across all three means high motivation and genuine urgency to change. A large gap in one dimension but not others reveals where the pressure is concentrated. A small gap everywhere suggests this person is in maintenance mode and not actively motivated to disrupt the status quo — which is a deal risk you need to know.

PATTERN 5 — PRIMARY DEAL VULNERABILITIES (Box 7 + Box 8 + Box 9)
Look at the Needs row as a complete picture. When capability gaps (Box 7), missing support (Box 8), and resource requirements (Box 9) all point to the same problem area, the deal is fragile from the inside regardless of how well your relationship is developing. Identify the specific internal condition that is most likely to kill this deal before you get a no — and name it directly.

PATTERN 6 — BREAKTHROUGH QUESTION INDICATOR (Box 3 + Box 7 + Box 9)
Look for the sharpest tension point between what this person is being measured on (Box 3), what they are missing capability-wise (Box 7), and what resources they need (Box 9). This tension point is the setup for the iQ question that nobody else will ask — the question that surfaces a connection between their current pressure and their internal gaps that they have probably not articulated out loud yet. This pattern feeds directly into the iQ question construction.

PATTERN 7 — BUYING MOMENTUM ASSESSMENT (Box 6 + Box 7 + Box 9)
Look at whether the commitments this person has made publicly (Box 6) create enough internal pressure to actually drive a buying decision given what they are missing (Box 7 + Box 9). Public commitments with no capability or resources to back them = someone who needs to act but cannot on their own — high urgency, needs external help. Public commitments with partial capability = someone close to being able to act who needs the right solution. No public commitments and thin needs = low urgency, deal is at risk of stalling.

PATTERN 8 — TIMELINE CREDIBILITY (Box 6 + Box 7 + Box 9)
Look for a specific deadline or timeline in Box 6 (public commitments) and cross-reference it against the capability and resource gaps in Box 7 and Box 9. If a Q3 deadline exists in Box 6 but Box 7 shows capability gaps and Box 9 shows resource shortfalls, that timeline is aspirational, not executable. This is one of the most valuable findings a rep can have — knowing the stated timeline is fiction before the first call means they can ask the question that restructures the entire conversation.

PATTERN 9 — AUTHORITY CEILING (Box 1 + Box 9)
Look at whether the scope or investment implied by Box 9 (resource requirements) exceeds what Box 1 says this person can approve. If yes, there is a level above this person who has not been engaged and who will ultimately control the decision. Name the implication directly: you are selling to the wrong altitude. If the authority and resource requirement are aligned, the ceiling is not a problem — skip this pattern.

PATTERN 10 — STATED GOALS VS. REAL GOALS (Box 3 + Box 4 + Box 6)
Look for contradictions between what this person is measured on (Box 3), what they have publicly committed to (Box 6), and where their career is headed (Box 4). When these three align perfectly, the stated goal is the real goal — straightforward. When they conflict — for example, measured on cost reduction but publicly committed to expansion while positioning for a P&L role — the real motivation is hiding in the gap between them. If you sell to the stated goal while missing the real one, you will lose to the competitor who sells to the gap.

PATTERN 11 — COALITION RISK (Box 2 + Box 8)
Look for the specific overlap between who influences this person (Box 2) and whose support they are currently missing (Box 8). The person or function that appears in Box 2 as an influencer but shows up in Box 8 as absent is precisely where internal resistance will come from. This is not a generic political risk — it is a specific relationship gap that the rep needs to address before the internal conversation happens without them in the room.

PATTERN 12 — COMPETITIVE VULNERABILITY WINDOW (Box 4 + Box 5)
Look at whether this person is simultaneously positioning for a bigger role (Box 4) AND actively building new external relationships (Box 5). This combination is the most commercially urgent signal in the entire Matrix — it means someone who is open to new vendors as part of their own professional repositioning, right now. A competitor with a career-narrative pitch could get a meeting you have not earned yet. If both boxes show active movement, this pattern fires and must be treated as front-line urgency, not background risk. The finding goes first in the report. The question is not whether a competitor can walk in — it is whether you have already positioned yourself as the partner for where this person is going, not just where they are.

═══════════════════════════════
OUTPUT CONSTRUCTION RULES
═══════════════════════════════

THE BRIEFING — THE OVERALL READ:
Write one or two paragraphs that read like a senior strategist briefing a sales professional before a high-stakes call. This is an interpretation of what the data reveals about the customer's world — not a summary of cells, not advice to the rep, not a coaching statement.

WHAT THE BRIEFING IS:
A read on who this person is, what is driving them, what the gaps reveal about the pressures and disconnects in their situation. Written about the customer, for the sales professional. Every sentence describes something happening in the customer's world.

WHAT THE BRIEFING IS NOT:
- Not advice. Never tell the rep what to do, what to say, or how to position. That belongs in Next Actions. The moment a sentence says "you should", "a partner who", "the rep who", or "someone with" — it has crossed into advice and must be cut.
- Not fact. Never state inferred observations as established truth. Every sentence must be framed as inference.
- Not a summary. Do not restate what is in individual cells. Surface what the gaps between cells reveal.

INFERENCE LANGUAGE — REQUIRED IN EVERY SENTENCE:
"The data suggests...", "The patterns point to...", "Based on what's here...", "If this read is right...", "The intel indicates...", "The gap between X and Y suggests...", "The disconnect here points to..."
Every sentence must carry one of these framings or a close equivalent. A sentence without hedged framing is a fact claim. Delete it or reframe it.

URGENCY LAYER:
If the Competitive Vulnerability Window fired — this person is simultaneously repositioning AND building new external relationships — the second paragraph must address the urgency of that gap specifically. Describe what is happening in their world that makes this window time-limited. Do not tell the rep to act on it — that is in Next Actions.

One paragraph if the Matrix is thin. Two if it is rich. Never more than two. Use specific numbers, names, timelines, and relationships from the Matrix. Never reference box numbers, pattern numbers, or methodology terms. Never use the word "tension" — use gap, disconnect, exposure, or pressure point.

THE FINDINGS — THE THREE SHARPEST GAPS:
After the briefing, surface the two or three sharpest specific gaps as individually labeled findings. Each finding has a headline and a body. The headline is a sharp commercial label — what the rep is about to read, in plain sales language, in ALL CAPS. The body shows the specific gap: name what the first cell says, name what the second cell says, then state what the gap between them reveals that neither cell reveals alone. 2-3 sentences. Specific to this deal. No pattern numbers. No box references. No generic observations. No sentence that could apply to any deal. Order findings by commercial impact — most urgent first.

DEFENSE STRATEGY — THE PREVENTION STANDARD:
Each defense risk must answer one specific question: what is the one thing that could happen between now and close that you have not yet done anything to prevent? A specific scenario tied to a specific gap in this Matrix, with a specific protective action the rep can take in the next 5 business days. If it cannot be prevented by a specific action in 5 business days, it is not a defense risk — it is a worry. Worries do not belong in the report.

NEXT ACTIONS — THE CONSEQUENCE STANDARD:
Each next action must name exactly what to do, to whom, by when, and state the commercial consequence of not doing it. "If you wait until after [specific event], you lose [specific advantage]" is the required format. "Prepare discovery questions" is not a next action.

MOMENTUM AND RESISTANCE SIGNALS — THE OBSERVABLE STANDARD:
Every signal must describe a specific observable behavior — something the rep can see or hear in a conversation — not an internal state. "They seem more engaged" is an internal state. "They reference your previous conversation unprompted at the start of the next call" is an observable behavior. Each signal must be tied to something specific in this person's Matrix.

iQ QUESTIONS — THE HIGHEST STAKES STANDARD:
Find the gap with the highest personal stakes across all nine boxes — where their career, reputation, a public commitment, or a key relationship is most directly on the line. Build the question around that gap. The best iQ question makes them stop and think about something they have not yet said out loud to anyone. Never reference gap numbers or pattern names. Must flow as one natural sentence the rep can say out loud.

LANGUAGE RULES — NON-NEGOTIABLE:
- Write in SECOND PERSON throughout — "you" not "the rep"
- Write for an experienced field sales professional — direct, commercial, no softness
- Never use "actually", "real", "really", "tension", "pattern", or "box number"
- Never use passive voice
- No therapy language
- Hedged but direct: "The data suggests...", "The patterns indicate...", "Based on what's here...", "The Matrix points to...", "If this read is right..."
- When data is thin: "With limited intel here, the picture is harder to read — but..."
- Every sentence must reference THIS specific person's specific intel
- Name specific numbers, dates, titles, and relationships from the Matrix whenever they exist

MATRIX HEALTH:
- "STRONG FOUNDATION" — rich intel across all three rows, confident analysis
- "PARTIAL PICTURE" — meaningful findings possible but specific gaps create blind spots
- "FLYING BLIND" — too little intel for reliable analysis; next conversation must be pure discovery

═══════════════════════════════
RETURN FORMAT — PURE JSON ONLY
═══════════════════════════════

HEADLINE RULES — applied to every finding headline:
- Written in ALL CAPS, maximum 8 words
- Sharp, commercial, specific to this deal
- Tells the rep exactly what the finding is about before they read it
- No filler, no hedging, no corporate language, no methodology terms
- Never use "actually", "real", "really", "tension", or "pattern"
- Strong examples: "HIS BUDGET AUTHORITY DOES NOT MATCH THIS PROBLEM", "THE TIMELINE HE COMMITTED TO IS NOT EXECUTABLE", "THE PERSON WHO CAN KILL THIS DEAL IS UNENGAGED", "YOUR WINDOW IS CLOSING FASTER THAN THE DEAL TIMELINE"
- Weak examples NOT acceptable: "KEY INSIGHT", "IMPORTANT FINDING", "WHAT THE MATRIX SHOWS", "PATTERN 9 IS FIRING"

{
  "matrix_health": "STRONG FOUNDATION or PARTIAL PICTURE or FLYING BLIND",
  "matrix_health_note": "One direct sentence — what this Matrix gives you and what it is missing. A briefing statement, not a grade.",
  "briefing": [
    "Paragraph 1 — what the data reveals about this person's world: what is driving them, what the gaps between their current situation and their stated commitments suggest about the pressures they are operating under. EVERY sentence must be framed as inference — 'The data suggests...', 'The patterns point to...', 'Based on what's here...', 'The gap between X and Y suggests...'. No sentence stated as fact. No advice to the rep. No 'you should' or 'a partner who' or 'someone with'. Specific numbers, names, timelines from the Matrix. No box references. No pattern numbers. No methodology terms. No 'tension' — use gap, disconnect, exposure, or pressure point.",
    "Paragraph 2 — urgency layer: only include if the Matrix is rich enough OR if the Competitive Vulnerability Window fired. If included, every sentence must be framed as inference and must describe something happening in the customer's world — not what the rep should do about it. If nothing urgent warrants a second paragraph, omit this entirely and return only one string in the array."
  ],
  "findings": [
    {
      "headline": "SHARP COMMERCIAL LABEL IN ALL CAPS — 8 words max — what this finding is about",
      "finding": "Name what the first data point says. Name what the second data point says. State what the gap between them reveals that neither reveals alone. 2-3 sentences. Specific to this deal. No box references. No pattern numbers. No generic observations."
    }
  ],
  "gaps": [
    {"cell": "ROW / COLUMN e.g. FUTURE STATE / ROLE", "label": "Cell label name", "severity": "HIGH or MEDIUM only — no LOW", "note": "One sentence — why this missing intel creates a blind spot in this deal. For any empty NEEDS cell, name the specific question to ask in the next conversation to fill it — tied to what was found in the corresponding Current and Future State cells."}
  ],
  "defense": [
    {"title": "SPECIFIC RISK IN ALL CAPS — the exact thing that could go wrong", "body": "Sentence 1: the specific scenario — what happens, when, the commercial consequence. Sentence 2: the one specific protective action you can take in the next 5 business days — name exactly what to do and to whom."}
  ],
  "iq_questions": [
    {"question": "iQ Formula targeting the HIGHEST PERSONAL STAKES gap: CURRENT REALITY (one specific named constraint or pressure from Current State row) + and/as + FUTURE STATE (one specific named ambition or commitment) + IMPACT (what the gap between them has already cost them or is doing to their career, reputation, a public commitment, or a key relationship — the most personally consequential gap you can find. Never operational. One natural sentence the rep can say out loud.)", "timing": "Use [early/mid/late in conversation] — one sentence on what this forces them to confront out loud for the first time."},
    {"question": "Second iQ question — completely different data points than the first, second highest personal stakes gap, one natural sentence.", "timing": "Use [timing] — one sentence on what this surfaces."}
  ],
  "watch_for": [
    "Specific observable behavior — something you can see or hear — tied to this person's specific motivation or political situation. Not an internal state.",
    "Second specific observable momentum behavior — different data point from the first."
  ],
  "watch_out": [
    "Specific observable resistance behavior — something you can see or hear — tied to a specific vulnerability in this deal. Not an internal state.",
    "Second specific resistance behavior — different vulnerability from the first."
  ],
  "next_actions": [
    "Exactly what to do, to whom, by when — and the commercial consequence of not doing it: 'If you wait until after [specific event], you lose [specific advantage]'.",
    "Second action — same standard.",
    "Third action — same standard."
  ]
}

FINAL QUALITY CHECK BEFORE RETURNING JSON:
1. Does every sentence in the briefing carry hedged inference language — "the data suggests", "the patterns point to", "based on what's here"? If any sentence states something as fact, reframe it.
2. Does the briefing contain any advice to the rep — "you should", "a partner who", "someone with", "the rep who"? If yes, cut it. Advice goes in Next Actions.
3. Does the briefing describe the customer's world — not what the rep should do about it?
4. Does every finding name two specific data points and show what their gap reveals?
5. If the Competitive Vulnerability Window fired, is it addressed in the briefing's second paragraph as a description of the customer's situation — not as advice?
6. Does every iQ question target the highest personal stakes gap — not just any valid combination?
7. Does every signal describe something observable — a behavior you can see or hear?
8. Does every next action name what to do, to whom, by when, and what you lose if you don't?
9. Does any sentence apply to any deal rather than this specific deal? If yes, delete it.
10. Do any outputs use "actually", "real", "really", "tension", "pattern", box numbers, or methodology terms? If yes, replace them.
- briefing: 1-2 paragraphs, array of strings, never more than 2
- findings: minimum 2, maximum 3 — sharpest gaps only, each with "headline" and "finding" keys
- gaps: HIGH and MEDIUM only, maximum 4, only gaps that affected briefing or findings
- defense: maximum 3, each preventable in 5 business days
- iq_questions: exactly 2, highest personal stakes gaps
- watch_for and watch_out: exactly 2 each, observable behaviors only
- next_actions: exactly 3, each with consequence of inaction
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
          <div style={{ fontSize: "36px", fontWeight: "900", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.06em", lineHeight: 1.1 }}>CONNECTION INTELLIGENCE<br />MATRIX</div>
          <div style={{ fontSize: "12px", color: "#fff", fontFamily: MONO, marginTop: "10px", lineHeight: 1.6 }}>Build your intel. Walk in masterfully prepared.</div>
        </div>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "4px", padding: "28px 24px" }}>
          <div style={{ fontSize: "14px", color: RED, fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.14em", marginBottom: "20px" }}>DEAL CONTEXT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: "14px", color: errors[f.key] ? "#ff6666" : "#fff", fontFamily: CONDENSED, letterSpacing: "0.1em", fontWeight: "700", marginBottom: "6px" }}>
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
          width: "22px", background: "#CC0000", borderRadius: "2px 2px 0 0",
          animation: "bar1 1.1s ease-in-out infinite",
          animationDelay: "0s"
        }} />
        <div style={{
          width: "22px", background: "#CC0000", borderRadius: "2px 2px 0 0",
          animation: "bar2 1.1s ease-in-out infinite",
          animationDelay: "0.18s"
        }} />
        <div style={{
          width: "22px", background: "#CC0000", borderRadius: "2px 2px 0 0",
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

  const filled = Object.values(cells).filter(v => v.trim()).length;

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
          max_tokens: 800,
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
          { query: `${deal.prospect} ${deal.company} interview OR keynote`, type: "person", target: "Statements" },
          { query: `${deal.company} news 2025`, type: "company", target: "Company news" },
          { query: `${deal.company} strategy initiative 2025`, type: "company", target: "Strategy" },
          { query: `${deal.company} challenges performance results`, type: "company", target: "Performance" },
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
        setSearching(false);
        setSearchProgress(null);
        setSearchResults([]);
        return;
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
        setSearching(false);
        setSearchProgress(null);
        setSearchResults([]);
        return;
      }

      const raw = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
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
          max_tokens: 3000,
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
                  <div key={key} style={{ background: SURFACE, border: `1px solid ${isFocused ? RED : hasValue ? "#383838" : "#1e1e1e"}`, borderRadius: "3px", padding: "10px 12px", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "6px", minHeight: "120px" }}>

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
        <div style={{ fontSize: "42px", fontWeight: "900", color: "#fff", fontFamily: CONDENSED, letterSpacing: "0.04em", lineHeight: 1, marginBottom: "8px" }}>{deal.prospect.toUpperCase()}</div>
        <div style={{ fontSize: "13px", color: "#fff", fontFamily: MONO, marginBottom: "28px" }}>
          {deal.role}{deal.company ? ` · ${deal.company}` : ""}{deal.opportunity ? ` · ${deal.opportunity}` : ""}
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
            {((analysis.briefing || []).length > 0 || (analysis.findings || []).length > 0) && (
              <div style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: "1px solid #1a1a1a" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#fff", border: `1px solid ${RED}`, borderRadius: "3px", padding: "5px 14px", marginBottom: "24px" }}>
                  <span style={{ color: "#000", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em" }}>WHAT THE MATRIX IS TELLING YOU</span>
                </div>

                {/* Briefing paragraphs — continuous read */}
                {(analysis.briefing || []).map((para, i) => (
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
                      <span style={{ color: "#fff", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em", color: "#000" }}>INTELLIGENCE GAPS</span>
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
                      <span style={{ color: "#fff", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em", color: "#000" }}>DEFENSE STRATEGY</span>
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
                  <span style={{ color: "#fff", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em", color: "#000" }}>iQ QUESTIONS — USE NEXT CALL</span>
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
                    <span style={{ color: "#fff", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em", color: "#000" }}>MOMENTUM SIGNALS</span>
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
                    <span style={{ color: "#fff", fontSize: "11px", fontFamily: CONDENSED, fontWeight: "700", letterSpacing: "0.18em", color: "#000" }}>RESISTANCE SIGNALS</span>
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
