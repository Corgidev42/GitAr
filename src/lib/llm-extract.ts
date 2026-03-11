import type { GuitarLesson, ChordProgression, TechniqueDetail } from '../types';

/**
 * Sends extracted PDF text to an LLM API and returns structured lesson data.
 *
 * Configure in .env.local:
 *   GEMINI_API_KEY=AIza...
 *   GEMINI_MODEL=gemini-2.0-flash  (optional, default: gemini-2.0-flash)
 *
 * Falls back to a regex-based parser if no GEMINI_API_KEY is configured.
 */
export async function extractLessonFromText(
  text: string,
  fileName: string
): Promise<Omit<GuitarLesson, 'status' | 'assets' | 'checklist'>> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (apiKey) {
    try {
      return await extractWithGemini(text, apiKey, model, fileName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.log('⚠ Gemini quota exceeded — falling back to regex parser.');
      } else {
        console.log(`⚠ Gemini error: ${msg} — falling back to regex parser.`);
      }
      return fallbackParser(text, fileName);
    }
  }

  console.log('⚠ No GEMINI_API_KEY set — using fallback parser.');
  return fallbackParser(text, fileName);
}

async function extractWithGemini(
  text: string,
  apiKey: string,
  model: string,
  fileName: string
): Promise<Omit<GuitarLesson, 'status' | 'assets' | 'checklist'>> {
  const prompt = `Tu es un assistant spécialisé en pédagogie musicale pour la guitare.
À partir du texte d'un guide/synthèse de leçon, extrais les informations suivantes au format JSON strict :
{
  "id": "string (ex: D101 — D=Débutant/I=Intermédiaire, 101=numéro)",
  "title": "string (titre de la leçon)",
  "level": "debutant | intermediaire",
  "isSong": "boolean (true si le document est principalement une chanson/paroles + grille d'accords)",
  "knowledge": {
    "chords": ["string (TOUS les accords mentionnés, ex: Em, G, Am7, Dsus2)"],
    "techniques": ["string (UNIQUEMENT les vraies techniques guitaristiques nommées)"],
    "rhythms": ["string (UNIQUEMENT les valeurs de notes et signatures : noire, croche, syncope, 4/4, 6/8...)"],
    "strums": ["string (UNIQUEMENT les rythmiques/rythmes de guitare nommés ou formules, ex: \"rythme feu de camp\", \"Bas Bas Haut Haut Bas\")"]
  },
  "progressions": [
    {
      "name": "string (nom court, ex: Suite #1)",
      "chords": ["string (suite d'accords, ex: D, A, Bm, G)"],
      "notes": "string (optionnel : contexte / conseil pratique)"
    }
  ],
  "techniqueDetails": {
    "nom de technique": {
      "summary": "string (1-3 phrases utiles et concrètes)",
      "steps": ["string (0-5 étapes / conseils)"]
    }
  }
}

RÈGLES STRICTES :
- "chords" : liste TOUS les accords en notation anglo-saxonne COURTE (Em, G, Cadd9, Dsus2…). JAMAIS écrire "D majeur" ou "ré mineur" — utilise "D" et "Dm". Un accord sans précision (D, C, G…) est TOUJOURS majeur. Sois exhaustif.
- "techniques" : UNIQUEMENT les techniques guitaristiques réelles et nommées comme concept (ex: "arpège", "hammer-on", "pull-off", "bend", "slide", "embellissement autour du D", "palm mute", "fingerpicking"). Utilise la notation courte pour les accords dans les noms de technique ("embellissement autour du D", PAS "embellissement autour du D majeur"). NE PAS inclure les descriptions d'exercices ("Jouer les accords", "Taper les temps avec le pied", "Mouvement aller"), ni les objectifs pédagogiques ("Dextérité-Coordination-Vitesse"), ni les consignes ("enchaîner les accords", "jouer la rythmique"). Une technique a un NOM propre, ce n'est pas une phrase d'action.
- "techniques" : EXCLURE : "capo", et les éléments de rythmique (noms de rythmiques comme "rythme feu de camp" + formules bas/haut) qui vont dans "strums". En revanche, si le document parle d'une technique de chant/coordination (ex: "s'accompagner en chantant"), AJOUTE-LA dans "techniques".
- "rhythms" : UNIQUEMENT les concepts rythmiques et valeurs/signatures (noire, croche, syncope, contretemps, 4/4...). NE PAS inclure les formules bas/haut, ni les noms de rythmiques de guitare.
- "strums" : UNIQUEMENT les rythmiques/strums de guitare (noms + formules) (ex: "rythme feu de camp", "Bas Bas Haut Haut Bas"). Pas de "syncope" ici.
- "progressions" : propose 0 à 5 suites d'accords trouvées dans le document. Si aucune suite claire n'est écrite, propose 0.
- "techniqueDetails" : inclure 0 à N entrées. Les clés DOIVENT être exactement les chaînes présentes dans "knowledge.techniques" quand c'est possible. Si tu n'es pas sûr, ne crée pas d'entrée.

Réponds UNIQUEMENT avec le JSON, sans markdown ni explication.

Texte du document (fichier: ${fileName}):
${text.slice(0, 15000)}`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      // Retry once after the delay suggested by the API
      const retryDelay = 5000;
      console.log(`  ⏳ Rate limited — retrying in ${retryDelay / 1000}s...`);
      await new Promise((r) => setTimeout(r, retryDelay));
      const retry = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      });
      if (!retry.ok) {
        throw new Error(`Gemini API error: ${retry.status} — RESOURCE_EXHAUSTED after retry`);
      }
      const retryData = await retry.json();
      let retryContent: string = retryData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      retryContent = retryContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return normalizeKnowledge(JSON.parse(retryContent));
    }
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  let content: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown fences if Gemini wraps the response
  content = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  return normalizeKnowledge(JSON.parse(content));
}

/** Normalize chord names and deduplicate knowledge entries */
function normalizeKnowledge(
  data: Omit<GuitarLesson, 'status' | 'assets' | 'checklist'>
): Omit<GuitarLesson, 'status' | 'assets' | 'checklist'> {
  // Map of French/verbose names → short notation
  const chordNormMap: Record<string, string> = {
    'do': 'C', 'ré': 'D', 're': 'D', 'mi': 'E', 'fa': 'F', 'sol': 'G', 'la': 'A', 'si': 'B',
  };

  function normalizeChord(raw: string): string {
    let s = raw.trim();
    // "D majeur" → "D", "D mineur" → "Dm", "Ré mineur" → "Dm"
    s = s.replace(/\s*(majeur|major)$/i, '');
    s = s.replace(/\s*(mineur|minor)$/i, 'm');
    // French note names
    const lower = s.toLowerCase();
    for (const [fr, en] of Object.entries(chordNormMap)) {
      if (lower === fr) return en;
      if (lower.startsWith(fr + ' ') || lower.startsWith(fr + 'm')) {
        return en + s.slice(fr.length);
      }
    }
    return s;
  }

  function normalizeTechnique(raw: string): string {
    let s = raw.trim();
    s = s.replace(/[’]/g, "'");
    // Normalize chord names inside technique descriptions
    s = s.replace(/\b([A-G][#b]?)\s*(majeur|major)\b/gi, '$1');
    s = s.replace(/\b([A-G][#b]?)\s*(mineur|minor)\b/gi, '$1m');
    // Fix common typos
    s = s.replace(/embellisements?/gi, 'embellissement');
    const lower = s.toLowerCase();
    if (
      (lower.includes('s\'accompagner') && (lower.includes('chant') || lower.includes('chanter'))) ||
      lower.includes('s’accompagner en chantant') ||
      lower.includes('apprendre a s\'accompagner en chantant') ||
      lower.includes('apprendre à s\'accompagner en chantant')
    ) {
      return "s'accompagner en chantant";
    }
    return s;
  }

  function normalizeForKey(raw: string): string {
    return raw
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function normalizeStrum(raw: string): string {
    let s = raw.trim();
    s = s.replace(/[’]/g, "'");
    s = s.replace(/[-–—]+/g, ' ');
    s = s.replace(/\s+/g, ' ');

    const tokens = s
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const expanded = tokens.map((t) => {
      const lower = t.toLowerCase();
      if (lower === 'b') return 'bas';
      if (lower === 'h') return 'haut';
      return lower;
    });

    const isFormula = expanded.every((t) => t === 'bas' || t === 'haut') && expanded.length >= 4;
    if (isFormula) {
      return expanded.map((t) => (t === 'bas' ? 'Bas' : 'Haut')).join(' ');
    }

    const lower = s.toLowerCase();
    if (lower.includes('feu de camp')) return 'rythme feu de camp';
    if (lower.startsWith('rythmique ')) return lower;
    if (lower.startsWith('rythme ')) return lower;
    return s;
  }

  function isStrumFormula(s: string): boolean {
    const lower = normalizeStrum(s).toLowerCase();
    const tokens = lower.split(/\s+/).filter(Boolean);
    const bhCount = tokens.filter((t) => t === 'bas' || t === 'haut').length;
    return bhCount >= 4 && bhCount === tokens.length;
  }

  function isStrumName(s: string): boolean {
    const lower = s.toLowerCase();
    return lower.startsWith('rythme ') || lower.startsWith('rythmique ') || lower.includes('feu de camp');
  }

  function isValidStrumName(s: string): boolean {
    const lower = s.toLowerCase();
    const normalized = normalizeForKey(s);
    if (!(lower.startsWith('rythme ') || lower.startsWith('rythmique '))) {
      return lower.includes('feu de camp');
    }
    const rest = normalized.replace(/^(rythme|rythmique)\s+/, '');
    const tokens = rest.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    if (tokens.length > 4) return false;
    const stop = new Set(['est', 'objectifs', 'objectif', 'technique', 'qui', 'dans', 'et', 'ca', 'ça', 'permet', 'module']);
    if (stop.has(tokens[0])) return false;
    return true;
  }

  const chords = [...new Set(data.knowledge.chords.map(normalizeChord))];
  const rawTechniques = data.knowledge.techniques.map(normalizeTechnique);
  const rawStrums = (data.knowledge.strums || []).map(normalizeStrum);

  const techniques: string[] = [];
  const strums: string[] = [];

  for (const t of rawTechniques) {
    const lower = t.toLowerCase();
    if (lower.includes('capo') || lower.includes('paroles')) {
      continue;
    }
    const techKey = normalizeForKey(t);
    if (techKey === 'gratte' || techKey.startsWith('gratt')) {
      continue;
    }
    if (isStrumFormula(t) || isStrumName(t)) {
      if (isStrumFormula(t) || isValidStrumName(t)) {
        strums.push(t);
      }
      continue;
    }
    techniques.push(t);
  }

  for (const s of rawStrums) {
    if (!s) continue;
    if (isStrumFormula(s) || isValidStrumName(s)) {
      strums.push(s);
    }
  }

  const techniquesUniq = [...new Map(techniques.map((t) => [normalizeForKey(t), t])).values()];
  const strumsUniqRaw = [...new Map(strums.map((s) => [normalizeForKey(s), s])).values()];

  const strumsUniq = (() => {
    const names: string[] = [];
    const formulas: string[] = [];
    for (const s of strumsUniqRaw) {
      if (isStrumFormula(s)) formulas.push(s);
      else names.push(s);
    }

    const formulaKeys = formulas.map((f) => normalizeForKey(f));
    const keep = formulas.filter((f, i) => {
      const key = formulaKeys[i];
      for (let j = 0; j < formulaKeys.length; j++) {
        if (i === j) continue;
        const other = formulaKeys[j];
        if (other.length > key.length && other.includes(key)) return false;
      }
      return true;
    });

    return [...names, ...keep];
  })();

  const rhythms = [...new Set(data.knowledge.rhythms.map((r) => {
    let s = r.trim().toLowerCase();
    // Normalize plurals → singular (croches→croche, noires→noire, blanches→blanche, etc.)
    s = s.replace(/s$/, '');
    return s;
  }))];

  const progressions: ChordProgression[] = (data.progressions || []).map((p) => ({
    name: p.name?.trim() || 'Suite',
    chords: [...new Set((p.chords || []).map(normalizeChord))].filter(Boolean),
    notes: p.notes?.trim() || undefined,
  })).filter((p) => p.chords.length >= 3);

  const techniqueDetails: Record<string, TechniqueDetail> | undefined = data.techniqueDetails
    ? Object.fromEntries(
        Object.entries(data.techniqueDetails).map(([k, v]) => [
          normalizeTechnique(k).toLowerCase(),
          {
            title: v.title?.trim() || undefined,
            summary: (v.summary || '').trim(),
            steps: (v.steps || []).map((s) => s.trim()).filter(Boolean),
          },
        ])
      )
    : undefined;

  const isSong = typeof (data as { isSong?: unknown }).isSong === 'boolean' ? (data as { isSong?: boolean }).isSong : undefined;

  return { ...data, isSong, knowledge: { chords, techniques: techniquesUniq, rhythms, strums: strumsUniq }, progressions, techniqueDetails };
}

function fallbackParser(
  text: string,
  fileName: string
): Omit<GuitarLesson, 'status' | 'assets' | 'checklist'> {
  // Try to extract lesson ID from filename like "D1L05 - Titre.pdf" or "PAC_D101 - Guide - Titre.pdf"
  const idMatch = fileName.match(/(?:PAC_)?([DI]\d+(?:L\d+)?)/i);
  const id = idMatch ? idMatch[1].toUpperCase() : `UNKNOWN_${Date.now()}`;

  const level = id.startsWith('I') ? 'intermediaire' : 'debutant';

  // Extract title from filename (handle "PAC_D101 - Guide - Titre.pdf" or "D1L05 - Titre.pdf")
  const titleMatch = fileName.match(
    /(?:PAC_)?[DI]\d+(?:L\d+)?\s*[-–]\s*(?:(?:Guide|Synthèse|Fiche[^-]*|Tab)\s*[-–]\s*)?(.+?)\.pdf/i
  );
  const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.pdf', '');

  // Simple chord detection (common patterns like Am, G, Cmaj7, F#m, etc.)
  const chordRegex = /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus[24]?|add)?[2-9]?(?:\/[A-G][#b]?)?)\b/g;
  const chords = [...new Set(text.match(chordRegex) || [])];

  // Technique detection — includes informal descriptions
  const techniques: string[] = [];
  const techKeywords = [
    'arpège', 'arpege', 'hammer-on', 'pull-off', 'bend', 'slide',
    'vibrato', 'palm mute', 'strumming', 'fingerpicking', 'legato',
    'alternate picking', 'sweep', 'tapping', 'harmonique', 'barre',
    'embellissement', 'transition', 'enchaînement', 'enchainement',
    'liaison', 'dead note', 'ghost note', 'mute', 'slap',
    'finger picking', 'picking',
  ];
  for (const kw of techKeywords) {
    if (text.toLowerCase().includes(kw)) techniques.push(kw);
  }

  // Detect "embellissement autour du X" patterns
  const embellishmentRegex = /embellissement[s]?\s+(?:autour\s+)?(?:du|de|des|d')\s+([A-G][#b]?\s*(?:majeur|mineur|m|maj|min)?)/gi;
  let embMatch;
  while ((embMatch = embellishmentRegex.exec(text)) !== null) {
    const desc = `embellissement ${embMatch[0].replace(/embellissement[s]?\s*/i, '').trim()}`;
    if (!techniques.includes(desc)) techniques.push(desc);
  }

  if (extractSingingTechnique(text)) {
    techniques.push("s'accompagner en chantant");
  }

  const strums = extractStrums(text);

  // Simple rhythm detection
  const rhythms: string[] = [];
  const rhythmPatterns = [
    '4/4', '3/4', '6/8', '2/4', 'shuffle', 'swing', 'binaire', 'ternaire',
    'syncope', 'contretemps', 'double croche', 'croche',
  ];
  for (const rp of rhythmPatterns) {
    if (text.toLowerCase().includes(rp.toLowerCase())) rhythms.push(rp);
  }

  const progressions = extractProgressions(text);
  const techniqueDetails = buildTechniqueDetails(techniques);
  const isSong = inferIsSong(text);

  return normalizeKnowledge({ id, title, level, isSong, knowledge: { chords, techniques, rhythms, strums }, progressions, techniqueDetails });
}

function extractSingingTechnique(text: string): boolean {
  const lower = text.toLowerCase().replace(/[’]/g, "'");
  if (lower.includes("s'accompagner") && (lower.includes('chant') || lower.includes('chanter'))) return true;
  if (lower.includes('accompagnement au chant') || lower.includes('accompagner en chantant')) return true;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isHeader = (l: string) => /^(accords?|rythmes?|rythmiques?|progressions?|suites?|paroles|refrain|couplet|pont)\b/i.test(l);
  for (let i = 0; i < lines.length; i++) {
    if (/^techniques?\b/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(lines.length, i + 20); j++) {
        const line = lines[j];
        if (isHeader(line)) break;
        const l = line.toLowerCase().replace(/[’]/g, "'");
        if (l.includes('chant') || l.includes('chanter') || l.includes("s'accompagner")) return true;
      }
    }
  }
  return false;
}

function extractProgressions(text: string): ChordProgression[] {
  const chordRegex = /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus[24]?|add)?[2-9]?(?:\/[A-G][#b]?)?)\b/g;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const candidates: { chords: string[]; notes: string }[] = [];
  for (const line of lines) {
    const matches = line.match(chordRegex) || [];
    const uniq: string[] = [];
    for (const m of matches) {
      const last = uniq[uniq.length - 1];
      if (m !== last) uniq.push(m);
    }
    if (uniq.length < 3) continue;
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length > Math.max(uniq.length * 3, 18)) continue;
    candidates.push({ chords: uniq, notes: line.slice(0, 120) });
  }

  const out: ChordProgression[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = c.chords.join('>');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: `Suite #${out.length + 1}`, chords: c.chords, notes: c.notes });
    if (out.length >= 5) break;
  }
  return out;
}

function extractStrums(text: string): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase().replace(/[’]/g, "'");
  const stop = new Set(['est', 'objectifs', 'objectif', 'technique', 'qui', 'dans', 'et', 'ca', 'ça', 'permet', 'module']);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const l = line.replace(/[’]/g, "'").trim();
    const lowerLine = l.toLowerCase();
    if (!(lowerLine.startsWith('rythme ') || lowerLine.startsWith('rythmique '))) continue;
    if (lowerLine.includes('feu de camp')) {
      out.push('rythme feu de camp');
      continue;
    }
    const rest = lowerLine.replace(/^(rythme|rythmique)\s+/, '');
    const restTokens = rest.split(/\s+/).filter(Boolean);
    if (restTokens.length === 0) continue;
    if (stop.has(restTokens[0])) continue;
    const limited = restTokens.slice(0, 4).join(' ');
    if (limited.length < 3) continue;
    out.push(`${restTokens.length > 0 ? lowerLine.startsWith('rythmique ') ? 'rythmique ' : 'rythme ' : ''}${limited}`);
  }

  const formulaRegex = /\b(?:bas|haut)(?:\s+(?:bas|haut)){3,}\b/gi;
  const formulas = text.match(formulaRegex) || [];
  for (const f of formulas) {
    const cleaned = f.trim().replace(/\s+/g, ' ');
    const title = cleaned
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    out.push(title);
  }

  if (lower.includes('feu de camp')) out.push('rythme feu de camp');

  return [...new Set(out)];
}

function inferIsSong(text: string): boolean {
  const lower = text.toLowerCase();
  const hasSections = /(?:\b(refrain|couplet|pont|intro|outro)\b)/i.test(lower);
  const hasManyLyricsLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0 && l.trim().length < 60).length > 25;
  return hasSections && hasManyLyricsLines;
}

function buildTechniqueDetails(techniques: string[]): Record<string, TechniqueDetail> {
  const out: Record<string, TechniqueDetail> = {};
  for (const t of techniques) {
    const key = t.trim().toLowerCase();
    if (!key) continue;
    if (key.startsWith('embellissement')) {
      out[key] = {
        title: t,
        summary: 'Petites variations autour d’un accord (sus, notes de passage, hammer-on/pull-off) pour enrichir l’harmonie.',
        steps: ['Alterner la forme de base et une suspension', 'Ajouter/retirer une note de passage rapidement', 'Rester musical et régulier au tempo'],
      };
    }
  }
  return out;
}
