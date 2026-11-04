// Builds the hidden "system prompt" that turns Gemini into FarmerMate, the agronomist.

const LANG_RULES = {
  en: 'Reply in simple, clear English that a farmer with little schooling can follow.',
  hi: 'Reply in simple Hindi written in Devanagari script (आसान हिंदी). Keep common product names (like mancozeb, neem oil) in their usual form.',
};

export function weatherToText(weather) {
  if (!weather || typeof weather !== 'object') return 'Weather data not available.';
  const lines = [];
  const c = weather.current || {};
  if (c.temp != null) {
    lines.push(
      `Now: ${c.temp}°C, ${c.condition || 'unknown sky'}, humidity ${c.humidity ?? '?'}%, wind ${c.wind ?? '?'} km/h.`
    );
  }
  for (const d of (weather.daily || []).slice(0, 7)) {
    lines.push(
      `${d.date}: ${d.min}–${d.max}°C, ${d.condition || ''}, rain ${d.rainMm ?? 0} mm (chance ${d.rainChance ?? '?'}%), max wind ${d.wind ?? '?'} km/h.`
    );
  }
  return lines.length ? lines.join('\n') : 'Weather data not available.';
}

export function buildSystemPrompt({ profile = {}, weather, guides = [], mode = 'chat' }) {
  const lang = profile.lang === 'hi' ? 'hi' : 'en';
  const crops = (profile.crops || []).join(', ') || 'not specified';
  const today = new Date().toISOString().slice(0, 10);

  const refs = guides.length
    ? guides.map((g, i) => `[${i + 1}] ${g.title}\n${g.text}`).join('\n\n')
    : 'No matching guide found for this question.';

  return `You are FarmerMate, a friendly, practical AI agronomist helping small farmers, mainly in India.

FARM CONTEXT
- Today: ${today}
- Location: ${profile.location || 'not specified'}
- Crops grown: ${crops}
- Local weather forecast for this farm:
${weatherToText(weather)}

REFERENCE GUIDES (trusted notes, use these first)
${refs}

HOW TO ANSWER
- ${LANG_RULES[lang]}
- Base your advice on the reference guides when they are relevant. When you use one, mention its title at the end like: "Source: <guide title>". If they do not cover the question, use well-established agronomy knowledge and say it is general advice.
- Use the weather forecast actively: warn about rain before spraying or irrigating, heat, wind, humidity-driven disease risk.
- Be specific and practical: short steps the farmer can do today. ${mode === 'chat' ? 'Keep answers under about 150 words unless asked for more. Use short numbered steps for actions.' : ''}
- For pesticides and fungicides, name the type or active ingredient but tell the farmer to follow the label dose and pre-harvest interval. Never invent exact doses.
- Remind about safety gear only when recommending chemical sprays.
- If a diagnosis is uncertain, say so, ask for a clear photo or more details, and suggest the Kisan Call Centre (1800-180-1551) or the local KVK for serious or spreading problems.
- Only answer farming, crops, livestock, soil, weather and rural-livelihood questions. Politely steer other topics back to farming.
- Plain text only. No markdown headings, no tables, no bold markers.`;
}

export const SCAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isPlant: { type: 'BOOLEAN', description: 'false if the photo does not show a plant or crop' },
    plant: { type: 'STRING', description: 'crop or plant name' },
    issue: { type: 'STRING', description: 'name of the disease, pest or deficiency, or "Healthy"' },
    scientificName: { type: 'STRING', description: 'pathogen or pest scientific name, empty if none' },
    category: { type: 'STRING', enum: ['fungus', 'bacteria', 'virus', 'pest', 'nutrient', 'water or heat stress', 'healthy', 'unknown'] },
    severity: { type: 'STRING', enum: ['healthy', 'watch', 'action'] },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    description: { type: 'STRING', description: '2 sentences: what you see and how it spreads' },
    steps: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 to 5 short treatment steps' },
    prevention: { type: 'STRING', description: 'one sentence on preventing it next time' },
    weatherNote: { type: 'STRING', description: 'one sentence linking the forecast to this problem, empty if none' },
  },
  required: ['isPlant', 'plant', 'issue', 'category', 'severity', 'confidence', 'description', 'steps', 'prevention'],
};

export function buildScanInstruction(crop) {
  return `Look carefully at this photo${crop ? ` of a ${crop} plant` : ''}. Diagnose the most likely disease, pest, nutrient deficiency or stress, or say it looks healthy. Use the reference guides when they match. Be honest about confidence: use "low" if the photo is blurry, too far away, or symptoms are ambiguous. Fill every field.`;
}
