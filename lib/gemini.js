// Tiny Gemini REST client. No SDK needed, just fetch (built into Node 18+).
// Docs: https://ai.google.dev/api/generate-content

const BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const FALLBACK_MODEL = 'gemini-2.5-flash';

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
  try {
    return await callModel(PRIMARY_MODEL, body, apiKey);
  } catch (err) {
    // If the model name ever gets retired, fall back to a known one instead of breaking.
    if (err.status === 404 && PRIMARY_MODEL !== FALLBACK_MODEL) {
      return await callModel(FALLBACK_MODEL, body, apiKey);
    }
    throw err;
  }
}
