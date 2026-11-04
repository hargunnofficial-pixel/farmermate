// POST /api/chat  ->  { reply, sources }
// Body: { messages: [{role:'user'|'assistant', text, image?}], profile, weather }

import { generate } from '../lib/gemini.js';
import { retrieve } from '../lib/rag.js';
import { buildSystemPrompt } from '../lib/prompt.js';
import { cleanMessages, cleanProfile } from '../lib/validate.js';
import { sendJson, getBody, handleError } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  try {
    requireAuth(req);
    const body = getBody(req);
    const messages = cleanMessages(body.messages);
    const profile = cleanProfile(body.profile);

    // RAG step: search the knowledge base with the latest question
    // (plus the one before it, so follow-ups like "what about organic?" keep context).
    const userTurns = messages.filter((m) => m.role === 'user').map((m) => m.text);
    const query = userTurns.slice(-2).join(' ');
    const guides = retrieve(query, { crops: profile.crops, k: 3 });

    const system = buildSystemPrompt({ profile, weather: body.weather, guides, mode: 'chat' });
    const contents = messages.map((m) => {
      const parts = [];
      if (m.image) parts.push({ inline_data: { mime_type: m.image.mimeType, data: m.image.data } });
      parts.push({ text: m.text || 'What is wrong with this plant and what should I do?' });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const reply = await generate({ system, contents });
    sendJson(res, 200, { reply, sources: guides.map((g) => ({ id: g.id, title: g.title })) });
  } catch (err) {
    handleError(res, err);
  }
}
