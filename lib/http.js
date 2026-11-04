// Small helpers shared by the API routes (work on Vercel and the local server).

export function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export function getBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return {};
}

export function handleError(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error('[FarmerMate]', err);
  let message = err.message || 'Something went wrong.';
  if (status === 429) message = 'Too many requests to the free AI tier right now. Wait a minute and try again.';
  if (status === 400 && /API key/i.test(message)) message = 'The Gemini API key is not valid. Check GEMINI_API_KEY.';
  sendJson(res, [400, 401, 429, 500, 503].includes(status) ? status : 502, { error: message, ...(status === 401 ? { needLogin: true } : {}) });
}
