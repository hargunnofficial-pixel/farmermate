// GET /api/health          -> quick status: is the key set, which models are configured
// GET /api/health?deep=1   -> actually asks every model one tiny question and reports which work.
//                             (Uses one free request per model, so only run it when debugging.)
import { chainFor, MODEL_CHAINS, generateDetailed, resetCooldowns } from '../lib/gemini.js';
import { sendJson, handleError } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Use GET' });
  try {
    requireAuth(req);
    const out = { ok: true, keySet: Boolean(process.env.GEMINI_API_KEY), chains: { chat: chainFor('chat'), vision: chainFor('vision') } };
    const deep = new URL(req.url || '/', 'http://x').searchParams.get('deep');
    if (!deep) return sendJson(res, 200, out);

    resetCooldowns();
    const models = [...new Set([...chainFor('chat'), ...MODEL_CHAINS.vision])];
    out.models = [];
    for (const model of models) {
      try {
        await generateDetailed({ models: [model], contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }], temperature: 0 });
        out.models.push({ model, works: true });
      } catch (err) {
        out.models.push({ model, works: false, status: err.tried?.[0]?.status ?? err.status, message: err.detail || err.message });
        if (err.keyProblem) break;
      }
      resetCooldowns();
    }
    out.ok = out.models.some((m) => m.works);
    sendJson(res, 200, out);
  } catch (err) {
    handleError(res, err);
  }
}
