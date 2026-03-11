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
  "knowledge": {
    "chords": ["string (TOUS les accords mentionnés, ex: Em, G, Am7, Dsus2)"],
    "techniques": ["string (UNIQUEMENT les vraies techniques guitaristiques nommées)"],
    "rhythms": ["string (UNIQUEMENT les valeurs de notes : noire, blanche, croche, double croche, ronde, etc.)"]
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
- "rhythms" : UNIQUEMENT les valeurs de notes musicales (noire, blanche, croche, double croche, ronde, triolet, etc.) et les signatures rythmiques (4/4, 3/4, 6/8). NE PAS inclure "rythmique", "temps", ni de descriptions vagues.
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
    // Normalize chord names inside technique descriptions
    s = s.replace(/\b([A-G][#b]?)\s*(majeur|major)\b/gi, '$1');
    s = s.replace(/\b([A-G][#b]?)\s*(mineur|minor)\b/gi, '$1m');
    // Fix common typos
    s = s.replace(/embellisements?/gi, 'embellissement');
    return s;
  }

  const chords = [...new Set(data.knowledge.chords.map(normalizeChord))];
  const techniques = [...new Set(data.knowledge.techniques.map(normalizeTechnique))];
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

  return { ...data, knowledge: { chords, techniques, rhythms }, progressions, techniqueDetails };
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
    'finger picking', 'picking', 'gratte', 'battement',
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

  return normalizeKnowledge({ id, title, level, knowledge: { chords, techniques, rhythms }, progressions, techniqueDetails });
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
