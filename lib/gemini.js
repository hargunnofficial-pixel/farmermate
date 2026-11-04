// Tiny Gemini REST client. No SDK needed, just fetch (built into Node 18+).
// Docs: https://ai.google.dev/api/generate-content

const BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
// Backups, tried in order when a model is busy, rate-limited or retired.
const BACKUP_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS ?? 1000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function callModel(model, body, apiKey) {
  const res = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini request failed (${res.status})`;
    throw new GeminiError(msg, res.status);
  }
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!text) {
    const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || 'empty response';
    throw new GeminiError(`Gemini returned no answer (${reason})`, 502);
  }
  return text;
}

/**
 * Ask Gemini something.
 * @param {object} opts
 * @param {string} opts.system   - hidden instructions (the "agronomist" persona + context)
 * @param {Array}  opts.contents - Gemini-format turns: [{role:'user'|'model', parts:[...]}]
 * @param {object} [opts.json]   - JSON schema; when set, Gemini must reply with JSON matching it
 */
export async function generate({ system, contents, json, temperature = 0.4 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError('No GEMINI_API_KEY set. Add it to your .env file (local) or Vercel environment variables.', 500);
  }
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature },
  };
  if (json) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = json;
  }
  const models = [PRIMARY_MODEL, ...BACKUP_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  let lastErr;
  for (const model of models) {
    // A busy model (503/500) gets one quick retry before we move to the next one.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callModel(model, body, apiKey);
      } catch (err) {
        lastErr = err;
        const busy = err.status === 503 || err.status === 500;
        if (busy && attempt === 0) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        // Busy, out of free quota (429) or model gone (404): try the next model.
        if (busy || err.status === 429 || err.status === 404) break;
        throw err; // e.g. bad API key: no point trying other models
      }
    }
  }
  if (lastErr?.status === 503 || lastErr?.status === 500) {
    throw new GeminiError('The AI is very busy right now. Please wait a few seconds and try again.', 503);
  }
  throw lastErr;
}
