// Tiny Gemini REST client. No SDK needed, just fetch (built into Node 18+).
// Docs: https://ai.google.dev/api/generate-content
//
// MODEL ROUTER
// Google's free tier gives every model its own daily quota, and it retires old models
// a few times a year. So FarmerMate never depends on one model: each kind of task has
// an ordered list, and when a model is out of quota, busy or retired we move to the next.
//
//   chat   -> Flash-Lite first (about 500 free requests a day each), bigger Flash as backup
//   vision -> the strongest Flash first (best at reading leaf photos, but only about
//             20 free requests a day), then Flash-Lite
//
// Check https://ai.google.dev/gemini-api/docs/models when Google launches new models
// and add them to the front of these lists.

const BASE_URL = () => process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

export const MODEL_CHAINS = {
  chat: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'],
  vision: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'],
};

const RETRY_DELAY_MS = () => Number(process.env.GEMINI_RETRY_DELAY_MS ?? 800);
const CALL_TIMEOUT_MS = () => Number(process.env.GEMINI_TIMEOUT_MS ?? 25000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class GeminiError extends Error {
  constructor(message, status, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

/** The models to try for a task, in order. GEMINI_MODEL (optional) always goes first. */
export function chainFor(task = 'chat') {
  const chain = MODEL_CHAINS[task] || MODEL_CHAINS.chat;
  const preferred = (process.env.GEMINI_MODEL || '').trim();
  return preferred ? [preferred, ...chain.filter((m) => m !== preferred)] : [...chain];
}

// Models that just failed are skipped for a while, so we don't waste seconds asking them again.
// (Kept in memory: on Vercel this lasts as long as the server instance stays warm.)
const cooldown = new Map(); // model -> timestamp (ms) when it may be tried again
export const resetCooldowns = () => cooldown.clear();

function readQuota(data) {
  // Google explains a 429 in error.details: which quota was hit and how long to wait.
  let daily = false;
  let retryMs = 0;
  for (const d of data?.error?.details || []) {
    for (const v of d?.violations || []) {
      if (/PerDay/i.test(`${v.quotaId || ''} ${v.quotaMetric || ''}`)) daily = true;
    }
    const m = typeof d?.retryDelay === 'string' && d.retryDelay.match(/^([\d.]+)s$/);
    if (m) retryMs = Math.round(Number(m[1]) * 1000);
  }
  if (/per ?day|daily/i.test(data?.error?.message || '')) daily = true;
  return { daily, retryMs };
}

async function callModel(model, body, apiKey) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS());
  let res;
  try {
    res = await fetch(`${BASE_URL()}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new GeminiError(err.name === 'AbortError' ? `${model} took too long to answer` : `Could not reach Gemini (${err.message})`, 503);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini request failed (${res.status})`;
    // A blocked, leaked or wrong key fails the same way on every model, so say so clearly.
    if ((res.status === 403 || res.status === 400 || res.status === 401) && /api[ _]?key|leaked|credential/i.test(msg)) {
      throw new GeminiError(
        'Google rejected the Gemini API key (it may be wrong, deleted, or blocked after being exposed). Create a new key at aistudio.google.com/app/apikey and update GEMINI_API_KEY.',
        500,
        { keyProblem: true, detail: msg }
      );
    }
    throw new GeminiError(msg, res.status, res.status === 429 ? readQuota(data) : {});
  }
  const candidate = data?.candidates?.[0];
  // Newer models can return their private "thinking" as extra parts; only keep the answer.
  const text = (candidate?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
  if (!text) {
    const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || 'empty response';
    throw new GeminiError(`Gemini returned no answer (${reason})`, 502);
  }
  return text;
}

const isBusy = (s) => s === 503 || s === 500 || s === 502 || s === 504;
// 403 covers "this model is only for existing users". Key problems are caught earlier.
const isGone = (s) => s === 404 || s === 403;

/**
 * Ask Gemini something and also report which model answered.
 * @param {object} opts
 * @param {string} opts.system   - hidden instructions (the "agronomist" persona + context)
 * @param {Array}  opts.contents - Gemini-format turns: [{role:'user'|'model', parts:[...]}]
 * @param {object} [opts.json]   - JSON schema; when set, Gemini must reply with JSON matching it
 * @param {'chat'|'vision'} [opts.task] - picks the model list (see MODEL_CHAINS)
 * @param {string[]} [opts.models] - try exactly these models instead (used by /api/health)
 * @returns {Promise<{text:string, model:string, tried:Array<{model:string,status:number}>}>}
 */
export async function generateDetailed({ system, contents, json, temperature = 0.4, task = 'chat', models: only }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError('No GEMINI_API_KEY set. Add it to your .env file (local) or Vercel environment variables.', 500);
  }
  const body = { contents, generationConfig: { temperature } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (json) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = json;
  }

  const chain = only?.length ? only : chainFor(task);
  const now = Date.now();
  const rested = chain.filter((m) => (cooldown.get(m) || 0) <= now);
  // If every model is cooling down, try them all anyway rather than failing without asking.
  const models = rested.length ? rested : chain;

  const tried = [];
  let lastErr;
  for (const model of models) {
    // A busy model gets one quick retry before we move to the next one.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callModel(model, body, apiKey);
        cooldown.delete(model);
        return { text, model, tried };
      } catch (err) {
        tried.push({ model, status: err.status });
        if (err.keyProblem) throw Object.assign(err, { tried });
        lastErr = err;
        if (isBusy(err.status) && attempt === 0) {
          await sleep(RETRY_DELAY_MS());
          continue;
        }
        if (err.status === 429) cooldown.set(model, Date.now() + (err.daily ? 15 * 60_000 : Math.max(err.retryMs, 30_000)));
        else if (isGone(err.status)) cooldown.set(model, Date.now() + 6 * 3_600_000);
        if (isBusy(err.status) || err.status === 429 || isGone(err.status)) break; // next model
        throw err; // e.g. bad API key or bad request: other models would fail the same way
      }
    }
  }

  const statuses = tried.map((t) => t.status);
  console.error('[FarmerMate] every Gemini model failed:', tried.map((t) => `${t.model}=${t.status}`).join(', '), '|', lastErr?.message);
  if (statuses.includes(429)) {
    const daily = lastErr?.daily || false;
    throw new GeminiError(
      daily
        ? 'FarmerMate has used up its free AI quota for today. It resets every day at midnight Pacific time (around midday in India and the UAE).'
        : 'Too many requests to the free AI tier right now. Wait a minute and try again.',
      429,
      { daily, tried, detail: lastErr?.message }
    );
  }
  if (statuses.some(isBusy)) throw new GeminiError('The AI is very busy right now. Please wait a few seconds and try again.', 503, { tried, detail: lastErr?.message });
  throw new GeminiError(
    'None of the Gemini models FarmerMate knows are available to this API key. Update MODEL_CHAINS in lib/gemini.js.',
    502,
    { tried, detail: lastErr?.message }
  );
}

/** Ask Gemini something; returns just the answer text. */
export async function generate(opts) {
  return (await generateDetailed(opts)).text;
}
