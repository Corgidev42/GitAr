import type { GuitarLesson } from '../types';

/**
 * Sends extracted PDF text to an LLM API and returns structured lesson data.
 *
 * Configure LLM_API_URL and LLM_API_KEY in your .env.local:
 *   LLM_API_URL=https://api.openai.com/v1/chat/completions
 *   LLM_API_KEY=sk-...
 *   LLM_MODEL=gpt-4
 *
 * Falls back to a naive regex-based parser if no LLM API is configured.
 */
export async function extractLessonFromText(
  text: string,
  fileName: string
): Promise<Omit<GuitarLesson, 'status' | 'assets' | 'checklist'>> {
  const apiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4';

  if (apiUrl && apiKey) {
    return extractWithLLM(text, apiUrl, apiKey, model);
  }

  console.log('⚠ No LLM_API_URL/LLM_API_KEY set — using fallback parser.');
  return fallbackParser(text, fileName);
}

async function extractWithLLM(
  text: string,
  apiUrl: string,
  apiKey: string,
  model: string
): Promise<Omit<GuitarLesson, 'status' | 'assets' | 'checklist'>> {
  const systemPrompt = `Tu es un assistant spécialisé en pédagogie musicale pour la guitare.
À partir du texte d'un guide/synthèse de leçon, extrais les informations suivantes au format JSON strict :
{
  "id": "string (ex: D1L05 — D=Débutant/I=Intermédiaire, 1=module, L05=leçon)",
  "title": "string (titre de la leçon)",
  "level": "debutant | intermediaire",
  "knowledge": {
    "chords": ["string (noms des accords mentionnés, ex: Em, G, Am7)"],
    "techniques": ["string (techniques mentionnées, ex: arpège, hammer-on)"],
    "rhythms": ["string (patterns rythmiques, ex: 4/4, shuffle)"]
  }
}
Réponds UNIQUEMENT avec le JSON, sans markdown ni explication.`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text.slice(0, 12000) },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  return JSON.parse(content);
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

  // Simple technique detection
  const techniques: string[] = [];
  const techKeywords = [
    'arpège', 'arpege', 'hammer-on', 'pull-off', 'bend', 'slide',
    'vibrato', 'palm mute', 'strumming', 'fingerpicking', 'legato',
    'alternate picking', 'sweep', 'tapping', 'harmonique', 'barre',
  ];
  for (const kw of techKeywords) {
    if (text.toLowerCase().includes(kw)) techniques.push(kw);
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

  return { id, title, level, knowledge: { chords, techniques, rhythms } };
}
