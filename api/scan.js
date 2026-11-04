// POST /api/scan  ->  structured diagnosis of a leaf/plant photo
// Body: { image: {mimeType, data}, crop?, profile, weather }

import { generate, GeminiError } from '../lib/gemini.js';
import { retrieve } from '../lib/rag.js';
import { buildSystemPrompt, buildScanInstruction, SCAN_SCHEMA } from '../lib/prompt.js';
import { cleanImage, cleanProfile, BadRequest } from '../lib/validate.js';
import { sendJson, getBody, handleError } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  try {
    requireAuth(req);
    const body = getBody(req);
    const image = cleanImage(body.image);
    if (!image) throw new BadRequest('Please add a photo.');
    const profile = cleanProfile(body.profile);
    const crop = typeof body.crop === 'string' ? body.crop.slice(0, 40) : '';

    // Give the model the disease guides for this crop as reference.
    const guides = retrieve(`${crop} leaf disease pest spots yellow blight`, {
      crops: crop ? [crop.toLowerCase()] : profile.crops,
      k: 4,
      minScore: 0.5,
    });

    const system = buildSystemPrompt({ profile, weather: body.weather, guides, mode: 'scan' });
    const text = await generate({
      system,
      json: SCAN_SCHEMA,
      temperature: 0.2,
      contents: [
        {
          role: 'user',
          parts: [{ inline_data: { mime_type: image.mimeType, data: image.data } }, { text: buildScanInstruction(crop) }],
        },
      ],
    });

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new GeminiError('The AI gave an unreadable answer. Please try again.', 502);
    }
    if (!Array.isArray(result.steps)) result.steps = [];

    // Show the guide that matches the diagnosis as the source, if there is one.
    const match = result.isPlant ? retrieve(`${result.plant} ${result.issue}`, { k: 1, minScore: 2 })[0] : null;
    sendJson(res, 200, { result, source: match ? { id: match.id, title: match.title } : null });
  } catch (err) {
    handleError(res, err);
  }
}
