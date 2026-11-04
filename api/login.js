// POST /api/login  { password }  -> sets the access cookie
// GET  /api/login                 -> { required, authed }
import { checkPassword, isAuthed, passwordRequired, setAuthCookie } from '../lib/auth.js';
import { sendJson, getBody } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return sendJson(res, 200, { required: passwordRequired(), authed: isAuthed(req) });
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  const { password } = getBody(req);
  if (!passwordRequired() || checkPassword(password)) {
    if (passwordRequired()) setAuthCookie(req, res);
    return sendJson(res, 200, { ok: true });
  }
  // Slow down password guessing a little.
  await new Promise((r) => setTimeout(r, 800));
  sendJson(res, 401, { error: 'Wrong password.' });
}
