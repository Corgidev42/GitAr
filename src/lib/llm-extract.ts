import type { GuitarLesson } from '../types';

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
    return extractWithGemini(text, apiKey, model, fileName);
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
À partir du texte d'un guide/synthèse/tablature de leçon, extrais les informations suivantes au format JSON strict :
{
  "id": "string (ex: D101 — D=Débutant/I=Intermédiaire, 101=numéro)",
  "title": "string (titre de la leçon)",
  "level": "debutant | intermediaire",
  "knowledge": {
    "chords": ["string (TOUS les accords mentionnés, y compris dans les tablatures/diagrammes, ex: Em, G, Am7, Dsus2)"],
    "techniques": ["string (TOUTES les techniques mentionnées, y compris embellissements, transitions, ex: arpège, hammer-on, embellissement autour du D majeur)"],
    "rhythms": ["string (patterns rythmiques, ex: 4/4, shuffle, croche)"]
  }
}
IMPORTANT: Sois exhaustif. Si tu vois des noms d'accords dans des diagrammes ou des tablatures, inclus-les. Si tu vois des descriptions de techniques même informelles ("embellissement", "transition", "enchaînement"), inclus-les.
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
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  let content: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown fences if Gemini wraps the response
  content = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

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

  return { id, title, level, knowledge: { chords, techniques, rhythms } };
}
